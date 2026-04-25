"""Speech-to-Text wrapper around DashScope (Qwen Audio / Paraformer)."""
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

    Returns ``{"text": str, "language": str, "provider": "qwen_stt"}`` on success.
    Returns ``{"error": str, "language": str, "provider": "qwen_stt"}`` on failure.
    """
    norm_lang = _normalise_lang(language)
    audio_path = _save_audio_to_tempfile(audio_bytes, suffix=suffix)

    if settings.is_mock:
        return {
            "error": "Qwen STT is disabled (mock mode or missing API key).",
            "language": norm_lang,
            "provider": "qwen_stt",
        }

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
            log.warning("DashScope STT returned no text.")
            return {
                "error": "Qwen STT returned no transcription text.",
                "language": norm_lang,
                "provider": "qwen_stt",
            }

        return {
            "text": text.strip(),
            "language": norm_lang,
            "provider": "qwen_stt",
        }

    except Exception as exc:  # pragma: no cover - safety net for demo
        log.exception("DashScope STT failed: %s", exc)
        return {
            "error": str(exc),
            "language": norm_lang,
            "provider": "qwen_stt",
        }
    finally:
        try:
            audio_path.unlink(missing_ok=True)
        except Exception:
            pass


_AMOUNT_RE = re.compile(r"(?:rm|myr|\$)?\s*(\d+(?:\.\d{1,2})?)", re.IGNORECASE)
_NUM_WORDS = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90,
}


def _parse_word_number(token: str) -> int | None:
    token = token.strip().lower()
    if token in _NUM_WORDS:
        return _NUM_WORDS[token]
    if "-" in token:
        left, right = token.split("-", 1)
        if left in _NUM_WORDS and right in _NUM_WORDS:
            return _NUM_WORDS[left] + _NUM_WORDS[right]
    return None


def _extract_spoken_amount(lower: str) -> float | None:
    ringgit_match = re.search(r"\b([a-z-]+)\s+ringgit\s+([a-z-]+)\b", lower)
    if ringgit_match:
        whole = _parse_word_number(ringgit_match.group(1))
        cents = _parse_word_number(ringgit_match.group(2))
        if whole is not None and cents is not None:
            if 0 <= cents < 100:
                return float(f"{whole}.{cents:02d}")
            return float(whole)
    point_match = re.search(r"\b([a-z-]+)\s+point\s+([a-z-]+)\b", lower)
    if point_match:
        whole = _parse_word_number(point_match.group(1))
        frac = _parse_word_number(point_match.group(2))
        if whole is not None and frac is not None:
            if frac < 10:
                return float(f"{whole}.0{frac}")
            if frac < 100:
                return float(f"{whole}.{frac:02d}")
            return float(whole)
    return None


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
    if amount is None:
        amount = _extract_spoken_amount(lower)

    if any(w in lower for w in ("balance", "baki", "余额", "余", "多少钱")):
        return {"action": "check_balance", "amount": None}
    if any(w in lower for w in ("top up", "topup", "tambah", "充值", "充")):
        return {"action": "top_up", "amount": amount}
    if any(w in lower for w in ("pay", "bayar", "付", "支付")):
        return {"action": "make_payment", "amount": amount}
    if re.search(
        r"\b(deals?|promos?|promotions?|discounts?|offers?|best deal|tawaran|diskaun)\b",
        lower,
    ) or any(z in text for z in ("优惠", "促销")):
        return {"action": "best_deal", "amount": None}
    return {"action": "unknown", "amount": amount}
