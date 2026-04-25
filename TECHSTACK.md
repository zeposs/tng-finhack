# Tech Stack — Touch 'n Go eWallet "Quick Mode"

## Overview

This document defines the complete technology stack for the **Quick Mode** MVP — a voice-first, simplified interface layer for TnG eWallet powered by an AI agent.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  Voice Button → Microphone → Audio Stream                   │
│  Language Toggle (BM / 中文 / EN)   *Default: EN            │
│  LangGraph Visual Pipeline Animation                        │
│  Thumbprint UI → QR Code Display                            │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTP (audio blob / text)
┌───────────────▼─────────────────────────────────────────────┐
│                  FLASK BACKEND (Python)                     │
│  /api/voice  → STT → Intent Extraction → LangChain Agent   │
│  /api/action → Execute action → Response generation        │
│  /api/tts    → Text-to-Speech → Audio response             │
└──────┬────────────────┬────────────────────────────────────-┘
       │                │
┌──────▼──────┐  ┌──────▼──────────────────────────────────┐
│   SQLite    │  │       LangChain Agent (Python)           │
│  (mock DB)  │  │  Tools: check_balance, make_payment,    │
│  balance    │  │          top_up, verify_identity        │
│  history    │  │  LLM: Qwen (via Alibaba Cloud DashScope)│
│  promos     │  │  Memory: ConversationBufferMemory        │
└─────────────┘  └──────────────────────────────────────────┘
```

---

## Tech Stack Table

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Frontend** | React + Tailwind CSS | Latest | Component-based, fast to build, responsive |
| **Backend** | Python + Flask | Python 3.10+, Flask 3.x | Simple REST API, easy Alibaba Cloud ECS deployment |
| **STT** | Qwen Audio / Paraformer (DashScope API) | — | Best multilingual support for MY/ZH/EN, no Whisper dependency |
| **LLM** | Qwen (via DashScope API) | Qwen-turbo (recommended) | Strong multilingual LLM, same Alibaba ecosystem |
| **Agent Framework** | LangChain (AgentExecutor) | Latest | Industry standard, impressive to judges |
| **Visual Graph** | CSS animation (fake LangGraph) | — | Maximum visual impact, zero build risk |
| **TTS** | Qwen / CosyVoice (DashScope API) | — | Natural voice synthesis, same Alibaba ecosystem |
| **Database** | SQLite | 3.x | Zero setup, sufficient for demo |
| **Deployment** | Alibaba Cloud ECS | — | Accessible demo URL for judges |
| **Web Server** | Gunicorn + Nginx | — | Production-like setup for ECS |

---

## Key Dependencies

### Backend (Python)

```txt
flask>=3.0
flask-cors>=4.0
dashscope>=1.14
langchain>=0.2.0
langchain-community>=0.2.0
python-dotenv>=1.0
gunicorn>=21.2
```

### Frontend (React)

```txt
react>=18.2
react-dom>=18.2
axios>=1.6
tailwindcss>=3.4
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/voice` | Accepts audio blob, returns transcription + intent |
| POST | `/api/agent` | Accepts intent JSON, returns agent action result |
| GET | `/api/balance` | Returns mock wallet balance |
| POST | `/api/payment` | Processes mock payment, returns confirmation |
| POST | `/api/topup` | Processes mock top-up, updates SQLite balance |
| GET | `/api/promotions` | Returns hardcoded promo cards JSON |
| POST | `/api/tts` | Accepts text + language, returns audio blob |

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DASHSCOPE_API_KEY` | Alibaba Cloud DashScope API key for Qwen STT/LLM/TTS | Yes |
| `FLASK_ENV` | Flask environment (`development` or `production`) | No |
| `FLASK_PORT` | Port for Flask server (default: 5000) | No |

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Alibaba Cloud DashScope API key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Add your DASHSCOPE_API_KEY
flask run
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Deployment (Alibaba Cloud ECS)

1. Provision an ECS instance (Ubuntu 22.04, 2 vCPU, 4GB RAM minimum)
2. Install Python 3.10+, Node.js 18+, Nginx
3. Clone repo and install dependencies
4. Configure Gunicorn + Nginx as reverse proxy
5. Set `DASHSCOPE_API_KEY` in `.env`
6. Start services and verify accessibility

---

## LangChain Agent Tools

| Tool | Description | Parameters |
|---|---|---|
| `check_balance` | Check the current wallet balance | `user_id: str` |
| `make_payment` | Make a payment from the wallet | `amount: float`, `merchant: str` |
| `top_up_wallet` | Top up the wallet | `amount: float` |
| `verify_identity` | Request thumbprint verification | — |

---

## UI States (Single-Page State Machine)

| State | Description |
|---|---|
| `HOME` | Quick Mode landing (large buttons) |
| `LISTENING` | Mic open, recording audio |
| `THINKING` | LangGraph pipeline animation, API call in progress |
| `RESULT` | Shows balance / payment confirmation / top-up confirmation |
| `VERIFYING` | Thumbprint overlay |
| `SUCCESS` | Green checkmark + QR code (payment) or updated balance (top-up) |
| `PROMOTIONS` | Deal cards panel |
| `BALANCE` | Balance display |
| `HELPER` | Fake call screen |

---

## Build Order (Recommended)

```
Day 1: Flask backend + SQLite + 4 LangChain tools + Qwen STT integration (DashScope) — English only
Day 2: React frontend Quick Mode (single-page state machine) + Voice recording + API connection
Day 3: Thumbprint UI + QR display + TTS playback + LangGraph animation
Day 4: Promotions page + Alibaba Cloud ECS deployment + fallback hardcoding
Day 5: Full demo rehearsal + bug fixes + (stretch) BM/Mandarin language toggle
```

---

*Document prepared for hackathon MVP development. All wallet data, transactions, and biometric verification in this build are simulated.*
