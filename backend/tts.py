import os
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer
from dotenv import load_dotenv

load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")
dashscope.base_http_api_url = os.getenv(
    "DASHSCOPE_BASE_HTTP_API_URL",
    "https://dashscope-intl.aliyuncs.com/api/v1",
)
dashscope.base_websocket_api_url = os.getenv(
    "DASHSCOPE_BASE_WEBSOCKET_API_URL",
    "wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference",
)


def _candidate_tts_models() -> list[str]:
    primary_model = os.getenv("TTS_MODEL", "cosyvoice-v2").strip()
    fallback_models_raw = os.getenv("TTS_MODEL_FALLBACKS", "cosyvoice-v1")
    fallback_models = [model.strip() for model in fallback_models_raw.split(",") if model.strip()]

    models = [primary_model, *fallback_models]
    seen = set()
    deduped = []
    for model in models:
        if model and model not in seen:
            deduped.append(model)
            seen.add(model)
    return deduped
dashscope.base_http_api_url = os.getenv(
    "DASHSCOPE_BASE_HTTP_API_URL",
    "https://dashscope-intl.aliyuncs.com/api/v1",
)


def text_to_speech(text: str, language: str = "en") -> bytes:
    """Convert text to speech using DashScope CosyVoice TTS. Returns audio bytes."""
    voice_map = {
        "en": "loongstella",
        "bm": "loongstella",
        "zh": "loongxiang",
    }
    voice = voice_map.get(language, "loongstella")

    last_error = None
    for model_name in _candidate_tts_models():
        try:
            synthesizer = SpeechSynthesizer(
                model=model_name,
                voice=voice,
            )
            audio_data = synthesizer.call(text)

            if isinstance(audio_data, bytes) and len(audio_data) > 0:
                return audio_data
            if hasattr(audio_data, "get_audio_data"):
                blob = audio_data.get_audio_data()
                if blob:
                    return blob

            last_error = RuntimeError(f"empty audio data from model '{model_name}'")
        except Exception as model_error:
            last_error = model_error
            continue

    raise Exception(
        f"TTS failed for all models {_candidate_tts_models()}: {last_error}"
    )
