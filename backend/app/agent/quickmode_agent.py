"""LangChain agent that routes user voice commands to Quick Mode tools.

Strategy:
1. Try the real LangChain ``AgentExecutor`` with Qwen (DashScope).
2. If that fails, OR mock mode is on, OR the LLM does not pick a tool,
   fall back to a deterministic regex router. The frontend never sees a
   crash; the demo always produces a sensible answer.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field, asdict
from typing import Any

from app.config import settings
from app.agent.tools import (
    tool_best_deal,
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


def _extract_amount(text: str) -> float | None:
    match = _AMOUNT_RE.search(text.replace(",", ""))
    if not match:
        return _extract_spoken_amount(text)
    try:
        return float(match.group(1))
    except ValueError:
        return _extract_spoken_amount(text)


def _parse_word_number(token: str) -> int | None:
    token = token.strip().lower()
    if token in _NUM_WORDS:
        return _NUM_WORDS[token]
    if "-" in token:
        left, right = token.split("-", 1)
        if left in _NUM_WORDS and right in _NUM_WORDS:
            return _NUM_WORDS[left] + _NUM_WORDS[right]
    return None


def _extract_spoken_amount(text: str) -> float | None:
    lower = text.lower()
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


def _extract_merchant(text: str) -> str | None:
    match = _MERCHANT_RE.search(text)
    if not match:
        return None
    return match.group(1).strip().rstrip(".").strip()


def _text_from_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text" and block.get("text"):
                parts.append(str(block["text"]))
        return "".join(parts).strip()
    if content is None:
        return ""
    return str(content).strip()


def _last_assistant_text(messages: list[Any] | None) -> str | None:
    """Final natural-language reply from the LangGraph agent (after tools)."""
    for msg in reversed(messages or []):
        if getattr(msg, "type", None) != "ai":
            continue
        t = _text_from_message_content(getattr(msg, "content", None))
        if t:
            return t
    return None


def phrase_user_visible_reply(user_text: str, language: str, payload: dict[str, Any]) -> str | None:
    """One-shot Qwen: turn tool JSON into a short voice-style line (no agent graph)."""
    if settings.is_mock or not (settings.dashscope_api_key or "").strip():
        return None
    try:
        from app.services.dashscope_client import configure_dashscope
        configure_dashscope()
        from langchain_community.chat_models import ChatTongyi
        from langchain_core.messages import HumanMessage, SystemMessage

        safe_payload = {k: v for k, v in payload.items() if k != "speech"}
        llm = ChatTongyi(
            model_name=settings.qwen_llm_model,
            dashscope_api_key=settings.dashscope_api_key,
            streaming=False,
        )
        system = (
            "You are Touch 'n Go eWallet Quick Mode. The listener is often a senior citizen.\n"
            "Write ONLY the assistant's spoken reply: 2-4 very short, simple sentences.\n"
            "Language: English if user_language is en; Bahasa Malaysia if ms or bm; "
            "Simplified Chinese if zh.\n"
            "Use ONLY facts from assistant_tool_json. Never invent merchants, amounts, balances, "
            "or offers.\n"
            "\n"
            "By tool / outcome:\n"
            "- check_balance: say wallet balance in RM using the balance field.\n"
            "- make_payment ok true: amount, merchant; if requires_verification, say they will scan "
            "QR next and confirm with thumbprint.\n"
            "- make_payment ok false + reason invalid_amount: amount is not valid for payment.\n"
            "- make_payment ok false + reason insufficient_balance: use balance and amount fields; "
            "suggest topping up.\n"
            "- top_up_wallet ok true: amount; if requires_verification mention thumbprint confirmation.\n"
            "- top_up_wallet ok false + reason invalid_amount: top-up amount not valid.\n"
            "- verify_identity: calmly ask for thumb on sensor to verify.\n"
            "- best_deal ok true: describe the strongest promotion in natural, varied wording using "
            "only merchant, title, save_amount, promotions_count from the JSON. Do not follow a "
            "rigid template or always open the same way; sound like a real assistant.\n"
            "- best_deal ok false + reason no_promotions: briefly explain there are no partner promos "
            "in the list yet; be helpful without stock filler.\n"
            "- unknown ok false + reason payment_amount_missing: user wants to pay but amount unclear; "
            "ask them to say an amount like pay RM 3.50.\n"
            "- unknown ok false + reason no_intent_match: gently say you did not understand; suggest "
            "balance, pay, top up, or best deal — one short suggestion.\n"
            "- transaction_result outcome payment_success: congratulate briefly; amount, merchant, "
            "balance_after in RM.\n"
            "- transaction_result outcome topup_success: confirm reload amount and balance_after.\n"
            "- welcome_hint: greet the user warmly by name of the app (TalknGo). "
            "Tell them in 2–3 short sentences: (1) they can hold the voice button to speak, "
            "(2) they can ask for their balance, make a payment, reload, or check deals, "
            "(3) invite them to try now. Keep it friendly and simple for seniors.\n"
            "- unknown + reason assistant_unreachable: say the assistant could not be reached; ask to try again.\n"
            "\n"
            "Do not output JSON, bullet lists, or role labels — only words the user should hear."
        )
        human = (
            f"user_language={language}\n"
            f"user_words={user_text!r}\n"
            f"assistant_tool_json={json.dumps(safe_payload, ensure_ascii=False)}"
        )
        out = llm.invoke([SystemMessage(content=system), HumanMessage(content=human)])
        return _text_from_message_content(getattr(out, "content", None)) or None
    except Exception as exc:  # pragma: no cover
        log.warning("Qwen phrasing call failed (%s)", exc)
        return None


def _merge_payload_speech(
    user_text: str,
    language: str,
    observation: dict[str, Any] | None,
    messages: list[Any] | None,
) -> dict[str, Any]:
    if isinstance(observation, dict):
        payload = {k: v for k, v in observation.items() if k != "speech"}
    else:
        payload = {"tool": "unknown", "reason": "non_dict_observation", "detail": str(observation)}

    voice = _last_assistant_text(messages)
    if voice:
        payload["speech"] = voice.strip()
        return payload

    fixed = phrase_user_visible_reply(user_text, language, payload)
    if fixed:
        payload["speech"] = fixed.strip()
    return payload


def _fallback_router(text: str, language: str) -> QuickModeAgentResult:
    """Deterministic intent router used when the LangChain graph is unavailable."""
    lower = text.lower().strip()

    if any(w in lower for w in ("balance", "baki", "余额", "余", "saldo")):
        raw = tool_check_balance()
        payload = _merge_payload_speech(text, language, raw, None)
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
        raw = tool_top_up_wallet(amount=amount)
        payload = _merge_payload_speech(text, language, raw, None)
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="top_up_wallet",
            tool_args={"amount": amount},
            payload=payload,
            used_llm=False,
        )

    if any(w in lower for w in ("pay", "bayar", "付", "支付", "transfer")):
        amount = _extract_amount(lower)
        if amount is None:
            raw: dict[str, Any] = {
                "tool": "unknown",
                "ok": False,
                "reason": "payment_amount_missing",
                "requires_verification": False,
            }
            payload = _merge_payload_speech(text, language, raw, None)
            return QuickModeAgentResult(
                text=text,
                language=language,
                tool="unknown",
                tool_args={},
                payload=payload,
                used_llm=False,
            )
        merchant = _extract_merchant(text) or "Merchant"
        raw = tool_make_payment(amount=amount, merchant=merchant)
        payload = _merge_payload_speech(text, language, raw, None)
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="make_payment",
            tool_args={"amount": amount, "merchant": merchant},
            payload=payload,
            used_llm=False,
        )

    if any(w in lower for w in ("verify", "thumb", "fingerprint", "sahkan")):
        raw = tool_verify_identity()
        payload = _merge_payload_speech(text, language, raw, None)
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="verify_identity",
            tool_args={},
            payload=payload,
            used_llm=False,
        )

    _deal_en_bm = re.search(
        r"\b(deals?|promos?|promotions?|discounts?|offers?|vouchers?|cashbacks?|"
        r"save money|best deal|best offer|cheapest|tawaran|diskaun|murah)\b",
        lower,
    )
    _deal_zh = any(z in text for z in ("优惠", "打折", "促销"))
    if _deal_en_bm or _deal_zh:
        raw = tool_best_deal()
        payload = _merge_payload_speech(text, language, raw, None)
        return QuickModeAgentResult(
            text=text,
            language=language,
            tool="best_deal",
            tool_args={},
            payload=payload,
            used_llm=False,
        )

    raw = {"tool": "unknown", "ok": False, "reason": "no_intent_match", "requires_verification": False}
    payload = _merge_payload_speech(text, language, raw, None)
    return QuickModeAgentResult(
        text=text,
        language=language,
        tool="unknown",
        tool_args={},
        payload=payload,
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
        """Return JSON facts: wallet balance in MYR (no canned speech). You must explain in your reply."""
        return tool_check_balance()

    @tool
    def make_payment(amount: float, merchant: str = "Merchant") -> dict:
        """Initiate a payment; returns JSON facts only (no canned speech). You must explain next steps.

        Args:
            amount: amount in MYR (Ringgit).
            merchant: name of the recipient or shop.
        """
        return tool_make_payment(amount=amount, merchant=merchant)

    @tool
    def top_up_wallet(amount: float) -> dict:
        """Top up wallet; returns JSON facts only (no canned speech). You must explain in your reply."""
        return tool_top_up_wallet(amount=amount)

    @tool
    def verify_identity() -> dict:
        """Returns JSON to show thumbprint UI (no canned speech). You must ask for verification in words."""
        return tool_verify_identity()

    @tool
    def get_best_deal() -> dict:
        """Return JSON facts for the strongest in-wallet promotion (highest save_amount).

        The return value has no user-facing prose. After calling this tool you MUST reply
        in your own words using only merchant, title, save_amount, and promotions_count
        from the JSON. Never invent shops or savings.
        """
        return tool_best_deal()

    tools = [check_balance, make_payment, top_up_wallet, verify_identity, get_best_deal]

    system_prompt = (
        "You are a warm, patient Touch 'n Go eWallet Quick Mode assistant for "
        "elderly Malaysian users.\n"
        "\n"
        "PRIMARY GOALS:\n"
        "1) Be easy to understand.\n"
        "2) Be reassuring and polite.\n"
        "3) Help users complete one step at a time safely.\n"
        "\n"
        "STYLE RULES:\n"
        "- Use very simple language with short sentences.\n"
        "- Avoid jargon and technical terms.\n"
        "- Be respectful, calm, and encouraging.\n"
        "- Keep replies concise unless user asks for more detail.\n"
        "- Use the user's language.\n"
        "\n"
        "INTERACTION RULES:\n"
        "- Ask only one question at a time.\n"
        "- Give clear next actions.\n"
        "- Repeat important details clearly (amount, merchant, balance).\n"
        "- Confirm intent before payment or top-up actions.\n"
        "- If unclear, ask for clarification instead of guessing.\n"
        "\n"
        "SAFETY RULES:\n"
        "- Never guess transaction details.\n"
        "- Always be clear before final confirmation.\n"
        "- Protect user privacy; do not request unnecessary personal data.\n"
        "\n"
        "TOOL POLICY — VERY IMPORTANT:\n"
        "- Call EXACTLY ONE tool per user request, then STOP. Do not chain.\n"
        "- For balance intent → call check_balance.\n"
        "- For payment intent → call make_payment(amount, merchant).\n"
        "- For top up intent → call top_up_wallet(amount).\n"
        "- For promotions, discounts, deals, offers, or \"best deal\" questions → call get_best_deal.\n"
        "- DO NOT call verify_identity yourself; UI handles verification.\n"
        "- Currency is always Malaysian Ringgit (RM).\n"
        "- If merchant is missing, use 'Merchant'.\n"
        "- If top up amount is missing, use 100.\n"
        "\n"
        "REPLY AFTER TOOLS — REQUIRED:\n"
        "- After your tool call is done, you MUST send a normal assistant message in plain "
        "language for the user (what they would hear from text-to-speech). Never stop with "
        "only a tool call and no words.\n"
        "- Tool outputs are facts (numbers, names, flags). You turn them into a short, "
        "friendly explanation. For get_best_deal, the tool JSON has no canned speech — "
        "you explain the best offer yourself from the fields in natural, varied wording; "
        "avoid sounding like a repeated script.\n"
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


_PRIMARY_TOOLS = {"check_balance", "make_payment", "top_up_wallet", "get_best_deal"}


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

        if tool_name == "get_best_deal":
            tool_name = "best_deal"

        payload = _merge_payload_speech(text, language, observation, messages)

        return QuickModeAgentResult(
            text=text,
            language=language,
            tool=tool_name,
            tool_args=tool_args,
            payload=payload,
            used_llm=True,
        )

    except Exception as exc:  # pragma: no cover - safety net for demo
        log.exception("LangChain agent failed (%s); using fallback router.", exc)
        return _fallback_router(text, language)
