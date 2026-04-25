"""LangChain agent that routes user voice commands to one of 4 tools.

Strategy:
1. Try the real LangChain ``AgentExecutor`` with Qwen (DashScope).
2. If that fails, OR mock mode is on, OR the LLM does not pick a tool,
   fall back to a deterministic regex router. The frontend never sees a
   crash; the demo always produces a sensible answer.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field, asdict
from typing import Any

from app.config import settings
from app.agent.tools import (
    tool_check_balance,
    tool_make_payment,
    tool_top_up_wallet,
    tool_verify_identity,
)

log = logging.getLogger(__name__)

# Pipeline visualisation order, mirrors the LangGraph 4-node visual on the frontend.
PIPELINE_NODES = [
    {"id": "voice_input", "label": "Voice Input", "icon": "🎙️"},
    {"id": "intent_detection", "label": "Intent Detection", "icon": "🧠"},
    {"id": "action_execution", "label": "Action Execution", "icon": "⚙️"},
    {"id": "confirmation", "label": "Confirmation", "icon": "✅"},
]


@dataclass
class QuickModeAgentResult:
    text: str
    language: str
    tool: str
    tool_args: dict[str, Any]
    payload: dict[str, Any]
    used_llm: bool = False
    pipeline: list[dict] = field(default_factory=lambda: list(PIPELINE_NODES))

    def to_dict(self) -> dict:
        return asdict(self)


_AMOUNT_RE = re.compile(r"(?:rm|myr|\$)?\s*(\d+(?:\.\d{1,2})?)", re.IGNORECASE)
_MERCHANT_RE = re.compile(
    r"to\s+([A-Za-z0-9 '&.\-]{2,40})", re.IGNORECASE
)


def _extract_amount(text: str) -> float | None:
    match = _AMOUNT_RE.search(text.replace(",", ""))
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _extract_merchant(text: str) -> str | None:
    match = _MERCHANT_RE.search(text)
    if not match:
        return None
    return match.group(1).strip().rstrip(".").strip()


def _fallback_router(text: str, language: str) -> QuickModeAgentResult:
    """Deterministic intent router used when the LLM is unavailable."""
    lower = text.lower().strip()

    if any(w in lower for w in ("balance", "baki", "余额", "余", "saldo")):
        payload = tool_check_balance()
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="check_balance",
            tool_args={},
            payload=payload,
            used_llm=False,
        )

    if any(w in lower for w in ("top up", "topup", "tambah", "充值", "充", "reload")):
        amount = _extract_amount(lower) or 100.0
        payload = tool_top_up_wallet(amount=amount)
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="top_up_wallet",
            tool_args={"amount": amount},
            payload=payload,
            used_llm=False,
        )

    if any(w in lower for w in ("pay", "bayar", "付", "支付", "transfer")):
        amount = _extract_amount(lower) or 50.0
        merchant = _extract_merchant(text) or "Merchant"
        payload = tool_make_payment(amount=amount, merchant=merchant)
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="make_payment",
            tool_args={"amount": amount, "merchant": merchant},
            payload=payload,
            used_llm=False,
        )

    if any(w in lower for w in ("verify", "thumb", "fingerprint", "sahkan")):
        payload = tool_verify_identity()
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="verify_identity",
            tool_args={},
            payload=payload,
            used_llm=False,
        )

    fallback_msg = {
        "en": "I didn't quite catch that. You can ask me to check balance, pay, or top up.",
        "ms": "Maaf, saya tidak faham. Anda boleh minta saya semak baki, bayar, atau tambah nilai.",
        "zh": "抱歉，我没听清楚。您可以让我查余额、付款或充值。",
    }.get(language, "I didn't quite catch that. You can ask me to check balance, pay, or top up.")

    return QuickModeAgentResult(
        text=text,
        language=language,
        tool="unknown",
        tool_args={},
        payload={
            "tool": "unknown",
            "ok": False,
            "speech": fallback_msg,
            "requires_verification": False,
        },
        used_llm=False,
    )


def _build_langchain_agent():
    """Construct the LangChain agent lazily (LangChain 1.x ``create_agent`` API).

    ``create_agent`` returns a compiled LangGraph state graph that loops the
    LLM with its tools until completion. Returns ``None`` if the agent cannot
    be built (no API key, import error, or DashScope unreachable).
    """
    if settings.is_mock:
        return None
    try:
        from app.services.dashscope_client import configure_dashscope
        configure_dashscope()
        from langchain.agents import create_agent
        from langchain_core.tools import tool
        from langchain_community.chat_models import ChatTongyi
    except Exception as exc:  # pragma: no cover
        log.warning("LangChain imports failed (%s); using fallback router only.", exc)
        return None

    @tool
    def check_balance() -> dict:
        """Return the user's current TnG eWallet balance in Malaysian Ringgit."""
        return tool_check_balance()

    @tool
    def make_payment(amount: float, merchant: str = "Merchant") -> dict:
        """Initiate a payment from the wallet to a merchant.

        Args:
            amount: amount in MYR (Ringgit).
            merchant: name of the recipient or shop.
        """
        return tool_make_payment(amount=amount, merchant=merchant)

    @tool
    def top_up_wallet(amount: float) -> dict:
        """Top up the user's wallet by the given amount in MYR (Ringgit)."""
        return tool_top_up_wallet(amount=amount)

    @tool
    def verify_identity() -> dict:
        """Ask the user to verify their identity with their thumbprint."""
        return tool_verify_identity()

    tools = [check_balance, make_payment, top_up_wallet, verify_identity]

    system_prompt = (
        "You are the Touch 'n Go eWallet Quick Mode voice assistant for "
        "senior Malaysian users.\n"
        "\n"
        "TOOL POLICY — VERY IMPORTANT:\n"
        "- Call EXACTLY ONE tool per user request, then STOP. Do not chain.\n"
        "- For 'balance', 'baki', '余额'  → call check_balance.\n"
        "- For 'pay', 'bayar', '付'        → call make_payment(amount, merchant).\n"
        "- For 'top up', 'tambah', '充值' → call top_up_wallet(amount).\n"
        "- DO NOT call verify_identity yourself — the UI handles that step "
        "  automatically after make_payment or top_up_wallet.\n"
        "- Currency is always Malaysian Ringgit (RM). If no merchant is given, "
        "  use 'Merchant'. If no amount is given for top up, use 100.\n"
        "- Reply briefly and kindly, in the user's language."
    )

    try:
        llm = ChatTongyi(
            model_name=settings.qwen_llm_model,
            dashscope_api_key=settings.dashscope_api_key,
            streaming=False,
        )
        return create_agent(model=llm, tools=tools, system_prompt=system_prompt)
    except Exception as exc:  # pragma: no cover
        log.warning("Failed to build LangChain agent (%s); using fallback router.", exc)
        return None


_agent_graph = None
_agent_built = False


def _get_agent():
    global _agent_graph, _agent_built
    if _agent_built:
        return _agent_graph
    _agent_graph = _build_langchain_agent()
    _agent_built = True
    return _agent_graph


_PRIMARY_TOOLS = {"check_balance", "make_payment", "top_up_wallet"}


def _parse_observation(content) -> dict | None:
    if isinstance(content, dict):
        return content
    if isinstance(content, str):
        try:
            import json as _json
            parsed = _json.loads(content)
            if isinstance(parsed, dict):
                return parsed
            return {"speech": str(parsed)}
        except Exception:
            return {"speech": content}
    return None


def _extract_tool_call(messages: list) -> tuple[str, dict, dict | None]:
    """Collect every tool call + its ToolMessage observation, then pick the
    most useful one for the demo:

    1. Prefer ``check_balance`` / ``make_payment`` / ``top_up_wallet``
       (the first one chronologically wins).
    2. Otherwise fall back to ``verify_identity`` or whatever the LLM did call.

    Returns ``(tool_name, tool_args, observation_dict_or_None)``.
    """
    obs_by_id: dict[str, dict] = {}
    for msg in messages:
        if getattr(msg, "type", None) == "tool":
            cid = getattr(msg, "tool_call_id", None)
            obs = _parse_observation(getattr(msg, "content", None))
            if cid and obs is not None:
                obs_by_id[cid] = obs

    calls: list[tuple[str, dict, dict | None]] = []
    for msg in messages:
        tool_calls = getattr(msg, "tool_calls", None) or []
        for call in tool_calls:
            if isinstance(call, dict):
                cid = call.get("id")
                cname = call.get("name") or "unknown"
                cargs = call.get("args") or {}
            else:
                cid = getattr(call, "id", None)
                cname = getattr(call, "name", None) or "unknown"
                cargs = getattr(call, "args", None) or {}
            if not isinstance(cargs, dict):
                cargs = {}
            calls.append((cname, cargs, obs_by_id.get(cid) if cid else None))

    if not calls:
        return "unknown", {}, None

    for cname, cargs, obs in calls:
        if cname in _PRIMARY_TOOLS:
            return cname, cargs, obs

    return calls[-1]


def run_agent(text: str, language: str = "en") -> QuickModeAgentResult:
    """Process a transcribed user command through the agent and return a result."""
    if not text or not text.strip():
        return _fallback_router("", language)

    graph = _get_agent()
    if graph is None:
        return _fallback_router(text, language)

    try:
        response = graph.invoke(
            {"messages": [{"role": "user", "content": text}]}
        )
        messages = response.get("messages") if isinstance(response, dict) else None
        if not messages:
            log.info("Agent returned no messages; using fallback.")
            return _fallback_router(text, language)

        tool_name, tool_args, observation = _extract_tool_call(messages)
        if tool_name == "unknown" or observation is None:
            log.info("Agent did not call a tool; using fallback router.")
            return _fallback_router(text, language)

        return QuickModeAgentResult(
            text=text,
            language=language,
            tool=tool_name,
            tool_args=tool_args,
            payload=observation,
            used_llm=True,
        )

    except Exception as exc:  # pragma: no cover - safety net for demo
        log.exception("LangChain agent failed (%s); using fallback router.", exc)
        return _fallback_router(text, language)
