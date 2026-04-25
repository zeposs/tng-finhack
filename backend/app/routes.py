"""Flask blueprint exposing all Quick Mode HTTP endpoints."""
from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from app.agent import phrase_user_visible_reply, run_agent
from app.agent.tools import commit_payment, commit_topup
from app.config import settings
from app.db import (
    get_balance,
    list_history,
    list_promotions,
)
from app.services.stt import transcribe, quick_intent_from_text
from app.services.tts import synthesize

log = logging.getLogger(__name__)

bp = Blueprint("api", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "mock_mode": settings.is_mock,
            "dashscope_base": settings.dashscope_base_url,
            "llm_model": settings.qwen_llm_model,
            "stt_model": settings.qwen_stt_model,
            "tts_model": settings.qwen_tts_model,
        }
    )


@bp.get("/balance")
def balance():
    return jsonify({"balance": get_balance(), "currency": "MYR"})


@bp.get("/history")
def history():
    return jsonify({"history": list_history(limit=20)})


@bp.get("/promotions")
def promotions():
    return jsonify({"promotions": list_promotions()})


@bp.post("/agent")
def agent():
    """Process a typed text command (no audio) through the agent.

    Body: { "text": str, "language": "en" | "bm" | "zh" }
    """
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    language = (data.get("language") or "en").lower()
    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400

    result = run_agent(text, language=language)
    return jsonify(result.to_dict())


@bp.post("/phrase")
def phrase():
    """Turn tool JSON into spoken text using Qwen (same helper as agent merge)."""
    data = request.get_json(silent=True) or {}
    user_text = (data.get("user_text") or "(app)").strip()
    language = (data.get("language") or "en").lower()
    tool_result = data.get("tool_result")
    if not isinstance(tool_result, dict):
        return jsonify({"error": "tool_result must be a JSON object"}), 400
    speech = phrase_user_visible_reply(user_text, language, tool_result)
    return jsonify({"speech": speech})


@bp.post("/voice")
def voice():
    """Accept an audio blob, run STT, then the agent.

    Multipart form fields:
        audio: the audio blob (webm / wav / mp3)
        language: "en" | "bm" | "zh" (optional, defaults to "en")
    """
    if "audio" not in request.files:
        return jsonify({"error": "Missing 'audio' file field"}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()
    if not audio_bytes:
        return jsonify({"error": "Empty audio blob"}), 400

    language = (request.form.get("language") or "en").lower()
    try:
        sample_rate = int(request.form.get("sample_rate") or 16000)
    except (TypeError, ValueError):
        sample_rate = 16000

    suffix = ".wav"
    if audio_file.mimetype:
        if "wav" in audio_file.mimetype:
            suffix = ".wav"
        elif "mp3" in audio_file.mimetype or "mpeg" in audio_file.mimetype:
            suffix = ".mp3"
        elif "ogg" in audio_file.mimetype:
            suffix = ".ogg"
        elif "webm" in audio_file.mimetype:
            suffix = ".webm"

    stt_result = transcribe(
        audio_bytes,
        language=language,
        suffix=suffix,
        sample_rate=sample_rate,
    )
    if stt_result.get("error"):
        return jsonify({"error": stt_result["error"], "stt": stt_result}), 503

    text = stt_result["text"]

    intent_hint = quick_intent_from_text(text)
    agent_result = run_agent(text, language=stt_result["language"])

    return jsonify(
        {
            "stt": stt_result,
            "intent_hint": intent_hint,
            **agent_result.to_dict(),
        }
    )


@bp.post("/payment")
def payment():
    """Apply a verified payment. Frontend calls this AFTER the thumbprint."""
    data = request.get_json(silent=True) or {}
    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount"}), 400
    merchant = (data.get("merchant") or "Merchant").strip() or "Merchant"

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400
    if amount > get_balance():
        return jsonify({"error": "Insufficient balance"}), 400

    result = commit_payment(amount=amount, merchant=merchant)
    lang = (data.get("language") or "en").lower()
    speech = phrase_user_visible_reply(
        user_text=f"Payment of RM {amount:.2f} to {merchant} completed successfully.",
        language=lang,
        payload=dict(result),
    )
    if speech:
        result["speech"] = speech
    return jsonify(result)


@bp.post("/topup")
def topup():
    """Apply a verified top-up. Frontend calls this AFTER the thumbprint."""
    data = request.get_json(silent=True) or {}
    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    result = commit_topup(amount=amount)
    lang = (data.get("language") or "en").lower()
    speech = phrase_user_visible_reply(
        user_text=f"Top up of RM {amount:.2f} completed successfully.",
        language=lang,
        payload=dict(result),
    )
    if speech:
        result["speech"] = speech
    return jsonify(result)


@bp.post("/tts")
def tts():
    """Convert text to speech and return base64-encoded audio."""
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    language = (data.get("language") or "en").lower()
    if not text:
        return jsonify({"error": "Missing 'text'"}), 400

    audio = synthesize(text, language=language)
    return jsonify(audio)
