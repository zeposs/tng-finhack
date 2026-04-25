import os
import json
import time
import base64
import shutil
import tempfile
import subprocess
import threading
import urllib.request
import urllib.error
import dashscope
from dashscope.audio.asr import Recognition, RecognitionCallback, RecognitionResult
from dotenv import load_dotenv

load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")
STT_CALLBACK_TIMEOUT_SECONDS = int(os.getenv("STT_CALLBACK_TIMEOUT_SECONDS", "18"))
STT_DEBUG_LOG = os.getenv("STT_DEBUG_LOG", "1").lower() in ("1", "true", "yes", "on")
STT_MODEL = os.getenv("STT_MODEL", "paraformer-realtime-v2")
STT_AUDIO_FORMAT = os.getenv("STT_AUDIO_FORMAT", "webm")
STT_SAMPLE_RATE = int(os.getenv("STT_SAMPLE_RATE", "16000"))
STT_MODE = os.getenv("STT_MODE", "auto").lower()
STT_CHUNK = int(os.getenv("STT_CHUNK", "3200"))
STT_WEBSOCKET_TIMEOUT_SECONDS = int(os.getenv("STT_WEBSOCKET_TIMEOUT_SECONDS", "25"))
STT_FALLBACK_FILE_MODEL = os.getenv("STT_FALLBACK_FILE_MODEL", "paraformer-realtime-v2")
STT_REALTIME_URL = os.getenv(
    "STT_REALTIME_URL",
    f"wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model={STT_MODEL}",
)
STT_HTTP_ENABLE = os.getenv("STT_HTTP_ENABLE", "1").lower() in ("1", "true", "yes", "on")
STT_HTTP_MODEL = os.getenv("STT_HTTP_MODEL", "qwen3-asr-flash")
STT_HTTP_BASE_URL = os.getenv("QWEN_BASE_URL", "auto")
STT_HTTP_TIMEOUT_SECONDS = int(os.getenv("STT_HTTP_TIMEOUT_SECONDS", "20"))

_LAST_STT_STATUS_LOCK = threading.Lock()
_LAST_STT_STATUS = {
    "configured_mode": STT_MODE,
    "configured_model": STT_MODEL,
    "fallback_model": STT_FALLBACK_FILE_MODEL,
    "last_mode_used": None,
    "last_model_used": None,
    "fallback_used": False,
    "last_language": None,
    "last_audio_bytes": 0,
    "last_duration_ms": None,
    "last_transcript_preview": "",
    "last_error": None,
    "last_updated_unix": None,
}


def _update_stt_status(**kwargs):
    with _LAST_STT_STATUS_LOCK:
        _LAST_STT_STATUS.update(kwargs)


def get_stt_runtime_status() -> dict:
    with _LAST_STT_STATUS_LOCK:
        return dict(_LAST_STT_STATUS)


def _stt_debug(message: str):
    if STT_DEBUG_LOG:
        print(f"[STT DEBUG] {message}")


class _SyncCallback(RecognitionCallback):
    """Callback that collects results for synchronous use."""

    def __init__(self):
        self.sentences = []
        self.error = None
        self.done = threading.Event()

    def on_event(self, result: RecognitionResult):
        sentence = result.get_sentence()
        if sentence and sentence.get("text"):
            # Only capture final (complete) sentences
            if sentence.get("end_time") is not None or sentence.get("stash", {}).get("sentence_end", False):
                self.sentences.append(sentence["text"])
                _stt_debug(f"callback sentence: {sentence['text']}")

    def on_complete(self):
        self.done.set()

    def on_error(self, result: RecognitionResult):
        self.error = str(result)
        self.done.set()

    def on_close(self):
        self.done.set()


def _transcribe_file_mode(audio_data: bytes, stt_lang: str, model_name: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=f".{STT_AUDIO_FORMAT}", delete=False) as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name
    _stt_debug(f"temp audio file: {tmp_path}")

    callback = _SyncCallback()

    def _extract_transcript_from_result(result_obj) -> str:
        if result_obj and hasattr(result_obj, "get_sentence"):
            sentence = result_obj.get_sentence()
            if sentence and sentence.get("text"):
                transcript_value = sentence["text"].strip()
                if transcript_value:
                    return transcript_value

        if result_obj and hasattr(result_obj, "output") and result_obj.output:
            if "sentence" in result_obj.output:
                sentences = result_obj.output["sentence"]
                transcript_value = " ".join(
                    s.get("text", "") for s in sentences if s.get("text")
                ).strip()
                if transcript_value:
                    return transcript_value
            if "text" in result_obj.output:
                transcript_value = result_obj.output["text"].strip()
                if transcript_value:
                    return transcript_value

        return ""

    try:
        recognition = Recognition(
            model=model_name,
            callback=callback,
            format=STT_AUDIO_FORMAT,
            sample_rate=STT_SAMPLE_RATE,
            language_hints=[stt_lang],
        )
        _stt_debug(f"calling DashScope file STT model {model_name} (format={STT_AUDIO_FORMAT}, rate={STT_SAMPLE_RATE})")
        result = recognition.call(tmp_path)

        transcript_from_result = _extract_transcript_from_result(result)
        if transcript_from_result:
            _stt_debug(f"final transcript (sync result): {transcript_from_result}")
            return transcript_from_result

        finished = callback.done.wait(timeout=STT_CALLBACK_TIMEOUT_SECONDS)
        if not finished:
            raise TimeoutError(f"STT callback timed out after {STT_CALLBACK_TIMEOUT_SECONDS}s")
        _stt_debug("callback completed")

        if callback.error:
            raise Exception(f"STT error: {callback.error}")

        if callback.sentences:
            transcript = " ".join(callback.sentences).strip()
            _stt_debug(f"final transcript (callback): {transcript}")
            return transcript

        transcript_from_result = _extract_transcript_from_result(result)
        if transcript_from_result:
            _stt_debug(f"final transcript (result after callback): {transcript_from_result}")
            return transcript_from_result

        _stt_debug("no transcript extracted")
        return ""
    finally:
        _stt_debug("cleanup temp audio file")
        os.unlink(tmp_path)


def _convert_audio_to_pcm16le(audio_data: bytes) -> bytes:
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise RuntimeError("ffmpeg is required for realtime websocket STT conversion but was not found in PATH")

    with tempfile.NamedTemporaryFile(suffix=f".{STT_AUDIO_FORMAT}", delete=False) as in_file:
        in_file.write(audio_data)
        in_path = in_file.name

    with tempfile.NamedTemporaryFile(suffix=".pcm", delete=False) as out_file:
        out_path = out_file.name

    try:
        cmd = [
            ffmpeg_path,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            in_path,
            "-ac",
            "1",
            "-ar",
            str(STT_SAMPLE_RATE),
            "-f",
            "s16le",
            out_path,
        ]
        _stt_debug("converting input audio to pcm16le for websocket STT")
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            stderr_text = (proc.stderr or "").strip()
            raise RuntimeError(f"ffmpeg conversion failed: {stderr_text or 'unknown ffmpeg error'}")

        with open(out_path, "rb") as pcm_file:
            pcm_data = pcm_file.read()
        _stt_debug(f"pcm conversion done: {len(pcm_data)} bytes")
        return pcm_data
    finally:
        if os.path.exists(in_path):
            os.unlink(in_path)
        if os.path.exists(out_path):
            os.unlink(out_path)


def _is_ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _transcribe_websocket_mode(audio_data: bytes, stt_lang: str) -> str:
    try:
        import websocket
    except Exception as import_err:
        raise RuntimeError("websocket-client package is required for realtime STT mode") from import_err

    if not dashscope.api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is missing")

    pcm_data = _convert_audio_to_pcm16le(audio_data)
    ws_url = STT_REALTIME_URL or f"wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model={STT_MODEL}"
    ws_headers = [f"Authorization: Bearer {dashscope.api_key}"]
    _stt_debug(f"connecting websocket STT: {ws_url}")

    ws = websocket.create_connection(ws_url, header=ws_headers, timeout=10)
    transcript = ""
    deltas = []

    try:
        session_update = {
            "type": "session.update",
            "session": {
                "input_audio_format": "pcm",
                "input_audio_transcription": {
                    "model": STT_MODEL,
                    "language": stt_lang,
                },
                "turn_detection": {
                    "type": "server_vad",
                    "silence_duration_ms": 500,
                },
            },
        }
        ws.send(json.dumps(session_update))

        for offset in range(0, len(pcm_data), STT_CHUNK):
            chunk = pcm_data[offset: offset + STT_CHUNK]
            ws.send(json.dumps({
                "type": "input_audio_buffer.append",
                "audio": base64.b64encode(chunk).decode("utf-8"),
            }))

        ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
        ws.settimeout(1)

        deadline = time.time() + STT_WEBSOCKET_TIMEOUT_SECONDS
        while time.time() < deadline:
            try:
                raw = ws.recv()
            except Exception:
                continue

            try:
                data = json.loads(raw)
            except Exception:
                _stt_debug(f"non-json websocket message: {str(raw)[:120]}")
                continue

            etype = data.get("type", "")
            if etype == "conversation.item.input_audio_transcription.delta":
                delta_text = data.get("delta", "")
                if delta_text:
                    deltas.append(delta_text)
            elif etype == "conversation.item.input_audio_transcription.completed":
                transcript = (data.get("transcript", "") or "").strip()
                _stt_debug(f"final transcript (websocket completed): {transcript}")
                return transcript
            elif "error" in etype or data.get("error"):
                raise RuntimeError(f"realtime STT server error: {json.dumps(data)}")

        if deltas:
            transcript = "".join(deltas).strip()
            _stt_debug(f"final transcript (websocket delta fallback): {transcript}")
            return transcript

        raise TimeoutError(f"WebSocket STT timed out after {STT_WEBSOCKET_TIMEOUT_SECONDS}s")
    finally:
        try:
            ws.close()
        except Exception:
            pass


def _qwen_candidate_urls() -> list:
    base = (STT_HTTP_BASE_URL or "auto").strip()
    if base.lower() == "auto":
        return [
            "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        ]
    custom = base.rstrip("/")
    if custom.endswith("/chat/completions"):
        return [custom]
    if custom.endswith("/v1"):
        return [f"{custom}/chat/completions"]
    return [f"{custom}/v1/chat/completions"]


def _extract_qwen_text(response_json: dict) -> str:
    choices = response_json.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                text = part.get("text") or part.get("content")
                if text:
                    return str(text).strip()
    return ""


def _transcribe_http_qwen_mode(audio_data: bytes, stt_lang: str) -> str:
    if not dashscope.api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is missing")

    mime = "audio/webm" if STT_AUDIO_FORMAT.lower() == "webm" else "audio/wav"
    data_uri = f"data:{mime};base64,{base64.b64encode(audio_data).decode('utf-8')}"

    payload = {
        "model": STT_HTTP_MODEL,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": data_uri,
                            "format": STT_AUDIO_FORMAT.lower(),
                        },
                    },
                    {
                        "type": "text",
                        "text": f"Transcribe this audio in {stt_lang}. Return only the transcript text.",
                    },
                ],
            }
        ],
    }

    last_error = None
    for url in _qwen_candidate_urls():
        try:
            _stt_debug(f"calling Qwen HTTP ASR: {url} model={STT_HTTP_MODEL}")
            body = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=body, method="POST")
            req.add_header("Authorization", f"Bearer {dashscope.api_key}")
            req.add_header("Content-Type", "application/json")

            with urllib.request.urlopen(req, timeout=STT_HTTP_TIMEOUT_SECONDS) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                resp_json = json.loads(raw)
                transcript = _extract_qwen_text(resp_json)
                if transcript:
                    _stt_debug(f"final transcript (http qwen): {transcript}")
                    return transcript
                last_error = RuntimeError("empty transcript from Qwen HTTP ASR")
        except urllib.error.HTTPError as http_err:
            try:
                detail = http_err.read().decode("utf-8", errors="replace")
            except Exception:
                detail = ""
            last_error = RuntimeError(f"http {http_err.code} from {url}: {detail[:300]}")
            _stt_debug(f"Qwen HTTP ASR failed: {last_error}")
            if http_err.code != 404:
                break
            continue
        except Exception as err:
            last_error = err
            _stt_debug(f"Qwen HTTP ASR exception: {type(err).__name__}: {err}")
            break

    raise RuntimeError(f"Qwen HTTP ASR failed: {last_error}")


def transcribe_audio(audio_data: bytes, language: str = "en") -> str:
    """Transcribe audio bytes to text using file or websocket DashScope STT based on configuration."""

    lang_map = {
        "en": "en",
        "bm": "ms",
        "zh": "zh",
    }
    stt_lang = lang_map.get(language, "en")
    start_ts = time.time()
    _stt_debug(f"start transcribe: bytes={len(audio_data)}, language={language}, mapped={stt_lang}")

    use_websocket = (
        STT_MODE == "websocket"
        or (STT_MODE == "auto" and "qwen3-asr-flash-realtime" in STT_MODEL)
    )

    if use_websocket and STT_MODE == "auto" and not _is_ffmpeg_available():
        _stt_debug("ffmpeg not found; skipping websocket mode in auto and continuing fallback chain")
        use_websocket = False

    use_http_qwen = STT_MODE == "http" or (
        STT_MODE == "auto" and STT_HTTP_ENABLE and "qwen3-asr-flash" in STT_MODEL
    )

    if use_http_qwen:
        _stt_debug("selected http qwen STT mode")
        try:
            transcript = _transcribe_http_qwen_mode(audio_data, stt_lang)
            _update_stt_status(
                last_mode_used="http",
                last_model_used=STT_HTTP_MODEL,
                fallback_used=False,
                last_language=stt_lang,
                last_audio_bytes=len(audio_data),
                last_duration_ms=int((time.time() - start_ts) * 1000),
                last_transcript_preview=transcript[:160],
                last_error=None,
                last_updated_unix=time.time(),
            )
            return transcript
        except Exception as http_err:
            if STT_MODE == "auto":
                _stt_debug(
                    "http qwen mode failed in auto mode, continuing fallback chain: "
                    f"{type(http_err).__name__}: {http_err}"
                )
            else:
                _update_stt_status(
                    last_mode_used="http",
                    last_model_used=STT_HTTP_MODEL,
                    fallback_used=False,
                    last_language=stt_lang,
                    last_audio_bytes=len(audio_data),
                    last_duration_ms=int((time.time() - start_ts) * 1000),
                    last_transcript_preview="",
                    last_error=f"{type(http_err).__name__}: {http_err}",
                    last_updated_unix=time.time(),
                )
                raise

    if use_websocket:
        _stt_debug("selected websocket STT mode")
        try:
            transcript = _transcribe_websocket_mode(audio_data, stt_lang)
            _update_stt_status(
                last_mode_used="websocket",
                last_model_used=STT_MODEL,
                fallback_used=False,
                last_language=stt_lang,
                last_audio_bytes=len(audio_data),
                last_duration_ms=int((time.time() - start_ts) * 1000),
                last_transcript_preview=transcript[:160],
                last_error=None,
                last_updated_unix=time.time(),
            )
            return transcript
        except Exception as ws_err:
            if STT_MODE == "auto":
                _stt_debug(
                    "websocket mode failed in auto mode, falling back to file mode: "
                    f"{type(ws_err).__name__}: {ws_err}"
                )
                try:
                    transcript = _transcribe_file_mode(audio_data, stt_lang, STT_FALLBACK_FILE_MODEL)
                    _update_stt_status(
                        last_mode_used="file",
                        last_model_used=STT_FALLBACK_FILE_MODEL,
                        fallback_used=True,
                        last_language=stt_lang,
                        last_audio_bytes=len(audio_data),
                        last_duration_ms=int((time.time() - start_ts) * 1000),
                        last_transcript_preview=transcript[:160],
                        last_error=f"websocket failed: {type(ws_err).__name__}: {ws_err}",
                        last_updated_unix=time.time(),
                    )
                    return transcript
                except Exception as fallback_err:
                    _update_stt_status(
                        last_mode_used="file",
                        last_model_used=STT_FALLBACK_FILE_MODEL,
                        fallback_used=True,
                        last_language=stt_lang,
                        last_audio_bytes=len(audio_data),
                        last_duration_ms=int((time.time() - start_ts) * 1000),
                        last_transcript_preview="",
                        last_error=(
                            f"websocket failed: {type(ws_err).__name__}: {ws_err}; "
                            f"fallback failed: {type(fallback_err).__name__}: {fallback_err}"
                        ),
                        last_updated_unix=time.time(),
                    )
                    raise
            _update_stt_status(
                last_mode_used="websocket",
                last_model_used=STT_MODEL,
                fallback_used=False,
                last_language=stt_lang,
                last_audio_bytes=len(audio_data),
                last_duration_ms=int((time.time() - start_ts) * 1000),
                last_transcript_preview="",
                last_error=f"{type(ws_err).__name__}: {ws_err}",
                last_updated_unix=time.time(),
            )
            raise

    _stt_debug("selected file STT mode")
    try:
        transcript = _transcribe_file_mode(audio_data, stt_lang, STT_MODEL)
        _update_stt_status(
            last_mode_used="file",
            last_model_used=STT_MODEL,
            fallback_used=False,
            last_language=stt_lang,
            last_audio_bytes=len(audio_data),
            last_duration_ms=int((time.time() - start_ts) * 1000),
            last_transcript_preview=transcript[:160],
            last_error=None,
            last_updated_unix=time.time(),
        )
        return transcript
    except Exception as file_err:
        _update_stt_status(
            last_mode_used="file",
            last_model_used=STT_MODEL,
            fallback_used=False,
            last_language=stt_lang,
            last_audio_bytes=len(audio_data),
            last_duration_ms=int((time.time() - start_ts) * 1000),
            last_transcript_preview="",
            last_error=f"{type(file_err).__name__}: {file_err}",
            last_updated_unix=time.time(),
        )
        raise
