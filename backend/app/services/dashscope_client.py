"""Single place that configures the DashScope SDK before any call.

Call ``configure_dashscope()`` at the top of every wrapper function.
It is idempotent and cheap.
"""
from __future__ import annotations

import os
from app.config import settings

_configured = False


def _http_to_wss(http_url: str) -> str:
    """Convert e.g. https://dashscope-intl.aliyuncs.com/api/v1
    into     wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference
    matching the DashScope SDK's default URL shape.
    """
    base = http_url.rstrip("/")
    if base.endswith("/api/v1"):
        base = base[: -len("/api/v1")]
    base = base.replace("https://", "wss://").replace("http://", "ws://")
    return base + "/api-ws/v1/inference"


def configure_dashscope() -> None:
    global _configured
    if _configured:
        return
    try:
        import dashscope
        if settings.dashscope_api_key:
            dashscope.api_key = settings.dashscope_api_key
        if settings.dashscope_base_url:
            dashscope.base_http_api_url = settings.dashscope_base_url
            dashscope.base_websocket_api_url = _http_to_wss(settings.dashscope_base_url)
        # Also export as env vars so any sub-libs (LangChain etc.) pick them up.
        os.environ["DASHSCOPE_API_KEY"] = settings.dashscope_api_key
        os.environ["DASHSCOPE_HTTP_BASE_URL"] = settings.dashscope_base_url
        _configured = True
    except Exception:
        pass
