# Project Submission

## Project Name

**Touch 'n Go eWallet Quick Mode — Voice AI for Seniors**

---

## Project Description

Quick Mode is a voice-first, simplified interface layer for Touch 'n Go eWallet, specifically designed for Malaysian senior citizens (60+). It solves the critical problem of digital exclusion faced by elderly users who struggle with complex multi-tap interfaces, small fonts, and intimidating transaction flows.

### Key Features

- **Voice Commands**: Users can check balance, make payments, and top up their wallet entirely by speaking natural language commands in English, Bahasa Malaysia, or Mandarin
- **LangGraph Pipeline Visualization**: Real-time animated display showing AI processing stages (Voice Input → Intent Detection → Action Execution → Confirmation)
- **Elder-Friendly UI**: Large touch targets (80x80px minimum), high contrast design, and simple language
- **Thumbprint Verification**: Safe, intuitive confirmation step before any transaction
- **Safe Promotions Panel**: View-only deal cards from partner merchants with no risk of accidental spending
- **Multilingual Support**: English (primary), Bahasa Malaysia, and Mandarin support via Alibaba DashScope

### Problem Solved

Over 16 million Malaysians use TnG eWallet, but senior citizens face significant barriers:
- Complex navigation with too many small buttons
- Financial jargon that causes confusion
- Fear of making mistakes or being scammed
- Reduced eyesight making standard UIs difficult to use

Quick Mode reduces transaction completion time by ~70% for elderly users by replacing multi-tap navigation with a single spoken command.

---

## Project Technical Details

### Architecture

```
Frontend (React + Vite + Tailwind)
    ↓ HTTP multipart/form-data
Backend (Flask + Python 3.11)
    ↓
LangChain Agent + Tools
    ↓
Alibaba DashScope (Qwen LLM, Paraformer STT, CosyVoice TTS)
    ↓
SQLite (mock wallet data)
```

### Technologies & Tools

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + Tailwind CSS | Single-page state machine UI |
| **Backend** | Python 3.11 + Flask + Gunicorn | REST API server |
| **STT** | Paraformer via DashScope API | Speech-to-text (multilingual) |
| **LLM** | Qwen-Turbo via DashScope API | Intent extraction & response generation |
| **TTS** | CosyVoice via DashScope API | Natural voice synthesis |
| **Agent Framework** | LangChain | Tool routing and agentic behavior |
| **Database** | SQLite | Mock wallet balance & transaction history |
| **Deployment** | Alibaba Cloud ECS + Nginx | Production hosting |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice` | Audio → STT → Agent → Response |
| POST | `/api/agent` | Text → Agent → Response |
| GET | `/api/balance` | Current wallet balance (MYR) |
| POST | `/api/payment` | Commit payment after verification |
| POST | `/api/topup` | Commit top-up after verification |
| GET | `/api/promotions` | Partner promotion cards |
| POST | `/api/tts` | Text → Base64 MP3 audio |
| GET | `/api/health` | Liveness & configuration check |

### LangChain Agent Tools

1. **check_balance**: Returns current wallet balance
2. **make_payment**: Initiates payment with amount and merchant
3. **top_up_wallet**: Initiates wallet top-up
4. **verify_identity**: Triggers thumbprint verification UI
5. **get_best_deal**: Returns strongest promotion from wallet

### Fallback Strategy

When DashScope is unavailable or in mock mode:
- Regex-based intent router handles core commands
- Pre-defined responses ensure demo continuity
- No crashes, graceful degradation

---

## Project Inspiration & Problem Statement

### Inspiration

This project was inspired by observing elderly Malaysians struggle with everyday digital payment tasks. Many seniors rely on family members to perform simple transactions like checking their balance or making payments, leading to a loss of financial independence. In a country where eWallet adoption is rapidly increasing, leaving seniors behind creates a real digital divide.

### Problem Statement

Malaysia's aging population faces exclusion from the digital economy:

1. **Interface Complexity**: Standard eWallet apps require 5-7 taps to complete a simple payment, with small fonts and dense navigation that elderly eyes struggle to read

2. **Fear of Mistakes**: Seniors often avoid using digital wallets entirely because they fear accidentally sending money to the wrong person or triggering unwanted transactions

3. **Scam Vulnerability**: Complex interfaces make it harder for seniors to identify suspicious activities, increasing their vulnerability to financial scams

4. **Language Barriers**: Most fintech interfaces are designed for tech-savvy, English-speaking users, excluding those more comfortable in Bahasa Malaysia or Mandarin

5. **Loss of Independence**: Many seniors depend on family members for basic financial tasks, eroding their sense of autonomy

### Solution Approach

Quick Mode addresses these issues by:
- Replacing multi-step navigation with natural voice commands
- Providing large, clearly labeled touch targets
- Including a mandatory thumbprint confirmation before any transaction
- Supporting English, Bahasa Malaysia, and Mandarin
- Creating a "safe zone" for discovering deals without risk of accidental purchases

---

## Project Live Deployment URL

**https://syok.ai**

The application is deployed on Alibaba Cloud ECS with:
- Nginx serving the React frontend
- Gunicorn running the Flask backend
- Full DashScope integration for STT/LLM/TTS

### Demo Credentials

No login required — the app uses mock wallet data for demonstration purposes.

### Supported Voice Commands

- "What is my balance?" / "Berapa baki saya?" / "余额多少"
- "Pay RM50 to [merchant]" / "Bayar RM50" / "付50块"
- "Top up RM100" / "Tambah RM100" / "充值100"
- "Show me deals" / "Promo apa ada?" / "有什么优惠"