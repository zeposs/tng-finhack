"""Centralised configuration loaded from environment / .env file."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent
# `override=True` makes .env authoritative — values in the file replace any
# leftover shell environment variables. This avoids subtle bugs where a user
# tested an old config in a long-running terminal and `.env` changes silently
# don't take effect.
load_dotenv(_BACKEND_DIR / ".env", override=True)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_dashscope_base() -> str:
    """Pick the DashScope base URL.

    DashScope has two separate regions with separate API keys:
    - China (default):     https://dashscope.aliyuncs.com/api/v1
    - International (SG):  https://dashscope-intl.aliyuncs.com/api/v1

    Override via DASHSCOPE_BASE_URL or DASHSCOPE_REGION (china|intl).
    """
    explicit = os.getenv("DASHSCOPE_BASE_URL", "").strip()
    if explicit:
        return explicit
    region = os.getenv("DASHSCOPE_REGION", "intl").strip().lower()
    if region in {"china", "cn"}:
        return "https://dashscope.aliyuncs.com/api/v1"
    return "https://dashscope-intl.aliyuncs.com/api/v1"


@dataclass(frozen=True)
class Settings:
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "").strip()
    dashscope_base_url: str = _resolve_dashscope_base()
    qwen_llm_model: str = os.getenv("QWEN_LLM_MODEL", "qwen-turbo").strip()
    qwen_stt_model: str = os.getenv("QWEN_STT_MODEL", "fun-asr-realtime").strip()
    qwen_tts_model: str = os.getenv("QWEN_TTS_MODEL", "cosyvoice-v3-flash").strip()
    qwen_tts_voice: str = os.getenv("QWEN_TTS_VOICE", "longanyang").strip()

    mock_mode: bool = _env_bool("MOCK_MODE", False)

    flask_host: str = os.getenv("FLASK_HOST", "0.0.0.0")
    flask_port: int = int(os.getenv("FLASK_PORT", "5000"))
    flask_debug: bool = _env_bool("FLASK_DEBUG", True)

    cors_origins: str = os.getenv("CORS_ORIGINS", "*")

    backend_dir: Path = _BACKEND_DIR
    db_path: Path = _BACKEND_DIR / "quickmode.db"
    audio_cache_dir: Path = _BACKEND_DIR / "audio_cache"

    @property
    def is_mock(self) -> bool:
        """Mock mode is on if explicitly enabled OR if no API key is configured."""
        return self.mock_mode or not self.dashscope_api_key


settings = Settings()
settings.audio_cache_dir.mkdir(exist_ok=True)
