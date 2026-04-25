"""Text-to-Speech wrapper around DashScope (CosyVoice).

Returns raw MP3 bytes; the frontend plays them in an <audio> element.
"""
from __future__ import annotations

import base64
import logging
import wave
import struct
import math
import io

from app.config import settings

log = logging.getLogger(__name__)


def _mock_audio() -> bytes:
    """Produce a tiny WAV beep so the browser <audio> element does not error.

    Used when MOCK_MODE is on or DashScope is unavailable.
    """
    sample_rate = 16000
    duration_s = 0.3
    freq = 440.0
    n_samples = int(sample_rate * duration_s)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for i in range(n_samples):
            value = int(32767 * 0.3 * math.sin(2 * math.pi * freq * i / sample_rate))
            wav.writeframes(struct.pack("<h", value))
    return buf.getvalue()


def synthesize(text: str, language: str = "en") -> dict:
    """Return ``{"audio_b64": str, "mime": str, "mock": bool}``."""
    if not text:
        return {"audio_b64": "", "mime": "audio/wav", "mock": True}

    if settings.is_mock:
        audio = _mock_audio()
        return {
            "audio_b64": base64.b64encode(audio).decode("ascii"),
            "mime": "audio/wav",
            "mock": True,
        }

    try:
        from app.services.dashscope_client import configure_dashscope
        configure_dashscope()
        from dashscope.audio.tts_v2 import SpeechSynthesizer

        synthesizer = SpeechSynthesizer(
            model=settings.qwen_tts_model,
            voice=settings.qwen_tts_voice,
        )
        audio_bytes = synthesizer.call(text)

        if not audio_bytes:
            log.warning("DashScope TTS returned empty audio; falling back to mock")
            audio_bytes = _mock_audio()
            return {
                "audio_b64": base64.b64encode(audio_bytes).decode("ascii"),
                "mime": "audio/wav",
                "mock": True,
            }

        return {
            "audio_b64": base64.b64encode(audio_bytes).decode("ascii"),
            "mime": "audio/mpeg",
            "mock": False,
        }

    except Exception as exc:  # pragma: no cover - safety net for demo
        log.exception("DashScope TTS failed: %s", exc)
        audio = _mock_audio()
        return {
            "audio_b64": base64.b64encode(audio).decode("ascii"),
            "mime": "audio/wav",
            "mock": True,
            "error": str(exc),
        }
