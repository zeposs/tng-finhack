"""Tool functions exposed to the LangChain agent.

Each tool returns a JSON-serialisable dict so the agent reasoning step
and the final API payload share the same structure.
"""
from __future__ import annotations

from app.db import (
    DEFAULT_USER_ID,
    add_history,
    get_balance,
    set_balance,
)


def tool_check_balance() -> dict:
    """Return the current wallet balance for the demo user."""
    bal = get_balance()
    return {
        "tool": "check_balance",
        "balance": bal,
        "speech": f"Your current balance is RM {bal:.2f}.",
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
            "speech": "I'm sorry, that payment amount is not valid.",
            "requires_verification": False,
        }
    if amount > bal:
        return {
            "tool": "make_payment",
            "ok": False,
            "balance": bal,
            "amount": amount,
            "merchant": merchant,
            "speech": (
                f"You only have RM {bal:.2f} in your wallet, "
                f"which is not enough to pay RM {amount:.2f}. "
                "Please top up first."
            ),
            "requires_verification": False,
            "next_screen": "home",
        }
    return {
        "tool": "make_payment",
        "ok": True,
        "amount": round(float(amount), 2),
        "merchant": merchant,
        "balance_before": bal,
        "speech": (
            f"Sure. Let's scan the merchant QR to pay RM {amount:.2f}."
        ),
        # Verification remains required, but the UI should first navigate to
        # camera scanning so seniors can complete a familiar scan-and-pay flow.
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
            "speech": "I'm sorry, that top-up amount is not valid.",
            "requires_verification": False,
        }
    return {
        "tool": "top_up_wallet",
        "ok": True,
        "amount": round(float(amount), 2),
        "balance_before": bal,
        "speech": (
            f"You want to top up RM {amount:.2f}. "
            "Please verify with your thumbprint to confirm."
        ),
        "requires_verification": True,
    }


def tool_verify_identity() -> dict:
    """Ask the UI to show the thumbprint overlay."""
    return {
        "tool": "verify_identity",
        "speech": "Please place your thumb on the sensor to verify.",
        "requires_verification": True,
    }


def commit_payment(amount: float, merchant: str) -> dict:
    """Apply a verified payment to the SQLite balance."""
    bal_before = get_balance()
    new_bal = set_balance(bal_before - amount)
    record = add_history("payment", -amount, counterparty=merchant)
    return {
        "ok": True,
        "amount": round(float(amount), 2),
        "merchant": merchant,
        "balance_before": bal_before,
        "balance_after": new_bal,
        "speech": (
            f"Payment of RM {amount:.2f} to {merchant} successful. "
            f"Your new balance is RM {new_bal:.2f}."
        ),
        "history": record,
    }


def commit_topup(amount: float) -> dict:
    """Apply a verified top-up to the SQLite balance."""
    bal_before = get_balance()
    new_bal = set_balance(bal_before + amount)
    record = add_history("topup", amount, counterparty="Reload")
    return {
        "ok": True,
        "amount": round(float(amount), 2),
        "balance_before": bal_before,
        "balance_after": new_bal,
        "speech": (
            f"Top up of RM {amount:.2f} successful. "
            f"Your new balance is RM {new_bal:.2f}."
        ),
        "history": record,
    }
