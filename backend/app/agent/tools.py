"""Tool functions exposed to the LangChain agent.

Each tool returns JSON-serialisable **facts only** (no user-facing ``speech``).
Qwen phrases the reply via ``phrase_user_visible_reply`` / the agent graph.
"""
from __future__ import annotations

from app.db import (
    DEFAULT_USER_ID,
    add_history,
    get_balance,
    list_promotions,
    set_balance,
)


def tool_check_balance() -> dict:
    """Return the current wallet balance for the demo user (facts only)."""
    bal = get_balance()
    return {
        "tool": "check_balance",
        "balance": bal,
        "currency": "MYR",
        "requires_verification": False,
    }


def tool_make_payment(amount: float, merchant: str | None = None) -> dict:
    """Initiate a payment. Awaits thumbprint verification before debiting."""
    merchant = (merchant or "the merchant").strip() or "the merchant"
    bal = get_balance()
    if amount <= 0:
        return {
            "tool": "make_payment",
            "ok": False,
            "reason": "invalid_amount",
            "amount": amount,
            "requires_verification": False,
        }
    if amount > bal:
        return {
            "tool": "make_payment",
            "ok": False,
            "reason": "insufficient_balance",
            "balance": bal,
            "amount": amount,
            "merchant": merchant,
            "requires_verification": False,
            "next_screen": "home",
        }
    return {
        "tool": "make_payment",
        "ok": True,
        "amount": round(float(amount), 2),
        "merchant": merchant,
        "balance_before": bal,
        "requires_verification": True,
        "next_screen": "scanner",
        "prefill": {
            "amount": round(float(amount), 2),
            "merchant": merchant,
        },
    }


def tool_top_up_wallet(amount: float) -> dict:
    """Initiate a top-up. Awaits thumbprint verification before crediting."""
    bal = get_balance()
    if amount <= 0:
        return {
            "tool": "top_up_wallet",
            "ok": False,
            "reason": "invalid_amount",
            "amount": amount,
            "requires_verification": False,
        }
    return {
        "tool": "top_up_wallet",
        "ok": True,
        "amount": round(float(amount), 2),
        "balance_before": bal,
        "requires_verification": True,
    }


def tool_verify_identity() -> dict:
    """Ask the UI to show the thumbprint overlay (facts only)."""
    return {
        "tool": "verify_identity",
        "requires_verification": True,
    }


def tool_best_deal() -> dict:
    """Return promotion facts for the LLM (no user-facing speech)."""
    promos = list_promotions()
    if not promos:
        return {
            "tool": "best_deal",
            "ok": False,
            "reason": "no_promotions",
            "requires_verification": False,
        }

    def _save(p: dict) -> float:
        try:
            return float(p.get("save_amount") or 0)
        except (TypeError, ValueError):
            return 0.0

    best = max(promos, key=_save)
    save = round(_save(best), 2)
    merchant = str(best.get("merchant") or "Partner").strip() or "Partner"
    title = str(best.get("title") or "Special offer").strip() or "Special offer"
    return {
        "tool": "best_deal",
        "ok": True,
        "best_deal": {
            "merchant": merchant,
            "title": title,
            "save_amount": save,
            "label": best.get("label"),
            "accent": best.get("accent"),
        },
        "promotions_count": len(promos),
        "requires_verification": False,
    }


def commit_payment(amount: float, merchant: str) -> dict:
    """Apply a verified payment to the SQLite balance (facts for TTS phrasing)."""
    bal_before = get_balance()
    new_bal = set_balance(bal_before - amount)
    record = add_history("payment", -amount, counterparty=merchant)
    return {
        "tool": "transaction_result",
        "outcome": "payment_success",
        "ok": True,
        "amount": round(float(amount), 2),
        "merchant": merchant,
        "balance_before": bal_before,
        "balance_after": new_bal,
        "history": record,
    }


def commit_topup(amount: float) -> dict:
    """Apply a verified top-up to the SQLite balance (facts for TTS phrasing)."""
    bal_before = get_balance()
    new_bal = set_balance(bal_before + amount)
    record = add_history("topup", amount, counterparty="Reload")
    return {
        "tool": "transaction_result",
        "outcome": "topup_success",
        "ok": True,
        "amount": round(float(amount), 2),
        "balance_before": bal_before,
        "balance_after": new_bal,
        "history": record,
    }
