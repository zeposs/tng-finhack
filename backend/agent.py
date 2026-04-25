import os
import dashscope
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_classic.memory import ConversationBufferMemory
from langchain_core.tools import tool
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from dotenv import load_dotenv
from database import get_balance, make_payment, top_up

load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")
dashscope.base_http_api_url = os.getenv(
    "DASHSCOPE_BASE_HTTP_API_URL",
    "https://dashscope-intl.aliyuncs.com/api/v1",
)

AGENT_API_KEY = os.getenv("DASHSCOPE_API_KEY_AGENT") or os.getenv("DASHSCOPE_API_KEY")

USER_ID = "user_001"
AGENT_MODEL = os.getenv("AGENT_MODEL", "qwen-turbo")


@tool
def check_balance(query: str = "") -> str:
    """Check the current wallet balance for the user. Call this when the user asks about their balance, how much money they have, or anything related to checking their wallet amount."""
    balance = get_balance(USER_ID)
    return f"Your current balance is RM {balance:.2f}"


@tool
def make_wallet_payment(amount: float, merchant: str = "merchant") -> str:
    """Make a payment from the wallet. Call this when the user wants to pay someone or make a purchase. Extract the amount and merchant name from the user's request."""
    result = make_payment(USER_ID, amount, merchant)
    if result["success"]:
        return f"Payment of RM {amount:.2f} to {merchant} is ready. Please verify with your thumbprint to confirm."
    else:
        return f"Payment failed: {result['message']}"


@tool
def top_up_wallet(amount: float) -> str:
    """Top up the wallet with a specified amount. Call this when the user wants to add money, reload, or top up their wallet."""
    result = top_up(USER_ID, amount)
    if result["success"]:
        return f"Top up of RM {amount:.2f} is ready. Please verify with your thumbprint to confirm. Your new balance will be RM {result['new_balance']:.2f}"
    else:
        return f"Top up failed: {result['message']}"


@tool
def verify_identity(action: str = "") -> str:
    """Request thumbprint verification from the user. This is triggered after a payment or top-up action."""
    return "Thumbprint verification required. Please place your finger on the sensor to confirm."


tools = [check_balance, make_wallet_payment, top_up_wallet, verify_identity]

SYSTEM_PROMPT = """You are a helpful voice assistant for the Talk 'n Go eWallet Quick Mode.
You help elderly users manage their wallet with simple, clear language.

Rules:
- Keep responses SHORT and CLEAR (1-2 sentences max)
- Use simple words, no financial jargon
- Always mention the amount in RM (Malaysian Ringgit)
- Be warm and reassuring
- If the user wants to pay, extract the amount and merchant from their message
- If the user wants to top up, extract the amount
- If the user asks about balance, check it immediately
- For payments and top-ups, always remind them to verify with thumbprint

You have access to these tools:
- check_balance: Check wallet balance
- make_wallet_payment: Make a payment (needs amount and merchant)
- top_up_wallet: Top up wallet (needs amount)
- verify_identity: Request thumbprint verification
"""

memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)


def get_agent():
    """Create and return the LangChain agent."""
    llm = ChatTongyi(
        model=AGENT_MODEL,
        dashscope_api_key=AGENT_API_KEY,
        temperature=0.3,
        max_tokens=150,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        max_iterations=3,
        handle_parsing_errors=True,
    )
    return agent_executor


def process_command(text: str) -> dict:
    """Process a voice command text through the agent and return structured result."""
    agent = get_agent()

    try:
        result = agent.invoke({"input": text})
        output = result.get("output", "I'm sorry, I didn't understand that. Please try again.")

        # Determine action type from the output
        action_type = "unknown"
        needs_verification = False

        text_lower = text.lower()
        output_lower = output.lower()

        if any(w in text_lower for w in ["balance", "baki", "how much"]):
            action_type = "balance"
        elif any(w in text_lower for w in ["pay", "bayar", "payment"]):
            action_type = "payment"
            needs_verification = True
        elif any(w in text_lower for w in ["top up", "topup", "top-up", "tambah", "reload", "add"]):
            action_type = "topup"
            needs_verification = True

        if "thumbprint" in output_lower or "verify" in output_lower:
            needs_verification = True

        return {
            "success": True,
            "text": output,
            "action": action_type,
            "needs_verification": needs_verification,
        }
    except Exception as e:
        return {
            "success": False,
            "text": f"I'm sorry, something went wrong. Please try again.",
            "action": "error",
            "needs_verification": False,
            "error": str(e),
        }
