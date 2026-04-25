"""LangChain agent + fallback rule-based intent dispatcher."""
from .quickmode_agent import phrase_user_visible_reply, run_agent, QuickModeAgentResult

__all__ = ["phrase_user_visible_reply", "run_agent", "QuickModeAgentResult"]
