"""Speech-to-Text wrapper around DashScope (Qwen Audio / Paraformer).

Falls back to a heuristic mock when ``settings.is_mock`` is True, so the
hackathon demo still flows even without an API key.
"""
from __future__ import annotations

import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Iterable

from app.config import settings

log = logging.getLogger(__name__)

_LANG_HINT_MAP = {
    "en": "en",
    "zh": "zh",
    "bm": "ms",
    "ms": "ms",
}


def _save_audio_to_tempfile(audio_bytes: bytes, suffix: str = ".webm") -> Path:
    fd, path = tempfile.mkstemp(suffix=suffix, dir=settings.audio_cache_dir)
    os.close(fd)
    Path(path).write_bytes(audio_bytes)
    return Path(path)


def _normalise_lang(lang: str | None) -> str:
    if not lang:
        return "en"
    return _LANG_HINT_MAP.get(lang.lower().strip(), "en")


def _mock_transcribe(_path: Path, lang: str) -> str:
    """A deterministic, demo-friendly mock transcription.

    The real demo always supplies a typed-text fallback button so the
    judges never see this output. This is purely a safety net for offline
    development.
    """
    canned = {
        "en": "What is my balance?",
        "ms": "Berapa baki saya?",
        "zh": "我的余额是多少？",
    }
    return canned.get(lang, canned["en"])


def transcribe(
    audio_bytes: bytes,
    language: str | None = "en",
    suffix: str = ".wav",
    sample_rate: int = 16000,
) -> dict:
    """Transcribe an in-memory audio blob.

    The frontend is expected to send 16 kHz mono WAV (it does the AudioContext
    resampling client-side). Other formats are still accepted but the model
    may reject them.

    Returns ``{"text": str, "language": str, "mock": bool}``.
    """
    norm_lang = _normalise_lang(language)
    audio_path = _save_audio_to_tempfile(audio_bytes, suffix=suffix)

    if settings.is_mock:
        text = _mock_transcribe(audio_path, norm_lang)
        return {"text": text, "language": norm_lang, "mock": True}

    try:
        from app.services.dashscope_client import configure_dashscope
        configure_dashscope()
        from dashscope.audio.asr import Recognition

        fmt = suffix.lstrip(".").lower()
        if fmt in ("webm", "ogg", "mp4", "m4a"):
            fmt = "opus"  # best-effort; frontend should send wav

        recognition = Recognition(
            model=settings.qwen_stt_model,
            format=fmt,
            sample_rate=sample_rate,
            language_hints=[norm_lang],
            callback=None,
        )
        result = recognition.call(str(audio_path))

        text_chunks: list[str] = []
        sentences: Iterable = []
        if hasattr(result, "get_sentence"):
            sentences = result.get_sentence() or []
        elif isinstance(result, dict):
            sentences = result.get("sentences", [])

        for sentence in sentences:
            if isinstance(sentence, dict):
                text_chunks.append(sentence.get("text", ""))
            else:
                text_chunks.append(str(sentence))

        text = " ".join(s.strip() for s in text_chunks if s).strip()

        if not text and hasattr(result, "output") and result.output:
            text = (result.output or {}).get("text", "")

        if not text:
            log.warning("DashScope STT returned no text; falling back to mock")
            text = _mock_transcribe(audio_path, norm_lang)
            return {"text": text, "language": norm_lang, "mock": True}

        return {"text": text.strip(), "language": norm_lang, "mock": False}

    except Exception as exc:  # pragma: no cover - safety net for demo
        log.exception("DashScope STT failed: %s", exc)
        text = _mock_transcribe(audio_path, norm_lang)
        return {
            "text": text,
            "language": norm_lang,
            "mock": True,
            "error": str(exc),
        }
    finally:
        try:
            audio_path.unlink(missing_ok=True)
        except Exception:
            pass


_AMOUNT_RE = re.compile(r"(?:rm|myr|\$)?\s*(\d+(?:\.\d{1,2})?)", re.IGNORECASE)


def quick_intent_from_text(text: str) -> dict:
    """A light heuristic intent classifier used as a sanity layer.

    The real intent decision is made by the LangChain agent. This is only
    used by /api/voice as a hint for the frontend pipeline visual.
    """
    lower = text.lower()
    amount: float | None = None
    match = _AMOUNT_RE.search(lower.replace(",", ""))
    if match:
        try:
            amount = float(match.group(1))
        except ValueError:
            amount = None

    if any(w in lower for w in ("balance", "baki", "余额", "余", "多少钱")):
        return {"action": "check_balance", "amount": None}
    if any(w in lower for w in ("top up", "topup", "tambah", "充值", "充")):
        return {"action": "top_up", "amount": amount}
    if any(w in lower for w in ("pay", "bayar", "付", "支付")):
        return {"action": "make_payment", "amount": amount}
    return {"action": "unknown", "amount": amount}
