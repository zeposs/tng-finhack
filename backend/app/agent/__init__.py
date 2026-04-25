"""LangChain agent + fallback rule-based intent dispatcher."""
from .quickmode_agent import run_agent, QuickModeAgentResult

__all__ = ["run_agent", "QuickModeAgentResult"]
