# TalknGo

> **Live Demo:** [https://syok.ai](https://syok.ai)
>
> A voice-first, elder-friendly eWallet experience built on top of Touch 'n Go eWallet concepts — powered by Alibaba DashScope (Qwen STT / LLM / TTS) and LangChain agents.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [AI Agent Pipeline](#ai-agent-pipeline)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Setup & Installation](#setup--installation)
8. [Configuration](#configuration)
9. [Running the App](#running-the-app)
10. [API Reference](#api-reference)
11. [Demo Flow](#demo-flow)
12. [Alibaba Cloud Services](#alibaba-cloud-services)
13. [Deployment (Alibaba Cloud ECS)](#deployment-alibaba-cloud-ecs)

---

## Overview

**TalknGo** is an AI-powered simplified interface designed for Malaysian senior citizens (60+) who struggle with complex digital payment flows. Users can check their balance, make payments, and top up their wallet entirely by voice — with a thumbprint confirmation step keeping every transaction safe.

### Problem Statement

Over 16 million Malaysians use TnG eWallet, yet a significant portion — particularly seniors — face digital exclusion:

- Standard apps require 5–7 taps for a simple payment, with small fonts
- Fear of mistakes or scams discourages independent use
- Loss of financial autonomy for the elderly

### Solution

Replace multi-step navigation with a **single spoken command**:

- Speak → AI understands intent → Confirms by voice → Thumbprint → Done
- Reduces transaction time by ~70%
- Large touch targets, high-contrast design, simple language
- Supports English (primary), Bahasa Malaysia, and Mandarin (stretch goals)

---

## Features

| Feature | Description |
| --- | --- |
| 🎙️ **Voice Commands** | Speak to check balance, pay, or top up |
| 🧠 **LangChain Agent** | Real agentic AI with tool routing (not just keyword matching) |
| 📊 **Pipeline Visualization** | Animated 4-node LangGraph-style diagram during AI processing |
| 👆 **Thumbprint Confirmation** | Safe transaction verification UI |
| 📱 **QR Code Display** | Post-payment QR code (mock) shown after verification |
| 🏷️ **Safe Promotions Panel** | View-only deal cards — no accidental spending |
| 🔇 **Mock / Offline Mode** | Full demo works without any API keys |
| 🌐 **Multilingual** | English default; BM and Mandarin via DashScope STT |

### Supported Voice Commands

| Intent | English | Bahasa Malaysia | Mandarin |
| --- | --- | --- | --- |
| Check Balance | "What is my balance?" | "Berapa baki saya?" | "余额多少" |
| Make Payment | "Pay RM50 to merchant" | "Bayar RM50" | "付50块" |
| Top Up | "Top up RM100" | "Tambah RM100" | "充值100" |
| Show Deals | "Show me deals" | "Promo apa ada?" | "有什么优惠" |

---

## Architecture

### System Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                    │
│                                                             │
│  [ HOME ] → [ LISTENING ] → [ THINKING ] → [ RESULT ]      │
│                                  ↓                          │
│         LangGraph Pipeline Animation (4-node visual)        │
│                                  ↓                          │
│              [ VERIFYING ] → [ SUCCESS ]                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP (audio blob / JSON)
┌───────────────────────▼─────────────────────────────────────┐
│                 FLASK BACKEND (Python 3.11)                 │
│                                                             │
│  /api/voice  → STT → LangChain Agent → TTS → Response      │
│  /api/agent  → LangChain Agent → Response                   │
│  /api/tts    → CosyVoice synthesis → Base64 MP3             │
└──────────┬────────────────────┬────────────────────────────-┘
           │                    │
  ┌────────▼──────┐   ┌─────────▼──────────────────────────┐
  │    SQLite     │   │     Alibaba DashScope APIs          │
  │  (mock data)  │   │                                     │
  │  - balance    │   │  STT:  Paraformer / fun-asr         │
  │  - history    │   │  LLM:  Qwen-Turbo                   │
  │  - promos     │   │  TTS:  CosyVoice                    │
  └───────────────┘   └─────────────────────────────────────┘
```

### Frontend State Machine

The UI is a single-page React app with **no client-side router**. Navigation is driven by a state machine:

```text
HOME
 ├── PAY → SCANNER → AMOUNT_VOICE → LISTENING → THINKING → RESULT → VERIFYING → SUCCESS → HOME
 ├── VOICE → LISTENING → THINKING → RESULT → VERIFYING → SUCCESS → HOME
 ├── BALANCE
 ├── PROMOTIONS
 └── FAMILY
```

---

## AI Agent Pipeline

Every voice command flows through a 4-stage pipeline (visualised live in the UI):

```text
[ 🎙️ Voice Input ]
       ↓
  DashScope Paraformer STT
  Audio → Transcript
       ↓
[ 🧠 Intent Detection ]
       ↓
  LangChain AgentExecutor (Qwen-Turbo)
  Transcript → Tool selection + parameters
       ↓
[ ⚙️ Action Execution ]
       ↓
  Tool runs against SQLite mock DB:
  check_balance | make_payment | top_up_wallet
  | verify_identity | get_best_deal
       ↓
[ ✅ Confirmation ]
       ↓
  CosyVoice TTS → MP3 audio reply
  UI updates (balance / QR code / thumbprint)
```

### Fallback Strategy

When DashScope is unavailable or `MOCK_MODE=1`:

- A deterministic **regex router** handles the 4 core intents
- Canned responses play automatically — the demo **never crashes**

### LangChain Tools

| Tool | Description |
| --- | --- |
| `check_balance` | Returns current wallet balance from SQLite |
| `make_payment` | Initiates payment with amount & merchant |
| `top_up_wallet` | Initiates wallet top-up |
| `verify_identity` | Triggers thumbprint verification UI |
| `get_best_deal` | Returns strongest active promotion |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python 3.11 + Flask + Gunicorn |
| Agent Framework | LangChain (AgentExecutor) |
| STT | Paraformer via Alibaba DashScope |
| LLM | Qwen-Turbo via Alibaba DashScope |
| TTS | CosyVoice via Alibaba DashScope |
| Database | SQLite (mock wallet data) |
| Deployment | Alibaba Cloud ECS + Nginx |

---

## Project Structure

```text
tng-finhack/
├── backend/
│   ├── app/
│   │   ├── main.py           # Flask app factory (create_app)
│   │   ├── config.py         # Settings from .env
│   │   ├── routes.py         # All /api/* endpoints
│   │   ├── agent/
│   │   │   ├── quickmode_agent.py   # LangChain AgentExecutor + regex fallback
│   │   │   └── tools.py             # 5 LangChain tools
│   │   ├── db/
│   │   │   └── database.py          # SQLite init + queries
│   │   └── services/
│   │       ├── stt.py               # DashScope STT client
│   │       └── tts.py               # DashScope TTS client
│   ├── .env.example          # Environment variable template
│   ├── requirements.txt
│   └── smoke_test_full.py    # End-to-end pipeline test
└── frontend/
    ├── src/
    │   ├── App.jsx            # Root state machine
    │   ├── components/        # One file per UI state
    │   ├── hooks/             # useVoiceRecorder, useAudioPlayer
    │   └── state/
    │       ├── api.js         # All fetch calls to backend
    │       └── strings.js     # UI copy strings
    ├── vite.config.js         # Dev server (:5173) proxies /api → :5000
    └── package.json
```

---

## Setup & Installation

### Prerequisites

- **Python 3.10+** (3.11 recommended)
- **Node.js 18+**
- A **DashScope API key** (optional — app runs in mock mode without one)
  - International / Singapore: [dashscope-intl.console.aliyun.com](https://dashscope-intl.console.aliyun.com/)
  - China / Beijing: [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/)
  > The two regions issue **separate keys** and use **different model names**. Defaults target the Singapore region. Switch via `DASHSCOPE_REGION=china`.

### 1. Clone the repository

```bash
git clone https://github.com/zeposs/tng-finhack.git
cd tng-finhack
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env          # macOS/Linux
# copy .env.example .env      # Windows CMD
```

Edit `.env` and set your `DASHSCOPE_API_KEY`. Leave it empty to run in **mock mode**.

### 3. Frontend setup

```bash
cd frontend
npm install
```

---

## Configuration

All backend configuration lives in `backend/.env`. Key variables:

| Variable | Default | Description |
| --- | --- | --- |
| `DASHSCOPE_API_KEY` | *(empty)* | DashScope API key. Empty = mock mode |
| `MOCK_MODE` | `0` | Set to `1` to force mock mode regardless of key |
| `DASHSCOPE_REGION` | `intl` | `intl` (Singapore) or `china` (Beijing) |
| `FLASK_DEBUG` | `1` | Set to `0` for production |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

If the backend runs somewhere other than `http://localhost:5000`, create `frontend/.env.local`:

```text
VITE_API_BASE=http://your-host:5000
```

---

## Running the App

### Development

**Terminal 1 — Backend:**

```bash
cd backend
source .venv/bin/activate   # or .venv\Scripts\Activate.ps1 on Windows
python -m app.main
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
# Runs on http://localhost:5173 (proxies /api → :5000)
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Verify the backend is running

```bash
curl http://localhost:5000/api/health
```

### Run the end-to-end smoke test

```bash
cd backend
python smoke_test_full.py
# Tests the full STT → Agent → TTS pipeline
```

### Mock mode

If `DASHSCOPE_API_KEY` is empty or `MOCK_MODE=1`, the backend uses canned responses. The entire demo works with no API keys — ideal for offline demos.

---

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness check + config info |
| GET | `/api/balance` | Current wallet balance (MYR) |
| GET | `/api/history` | Transaction history (last 20) |
| GET | `/api/promotions` | 3 partner promotion cards |
| POST | `/api/voice` | Audio blob → STT → Agent → TTS response |
| POST | `/api/agent` | Text → Agent → response |
| POST | `/api/tts` | Text → Base64 MP3 audio |
| POST | `/api/payment` | Commit payment after thumbprint |
| POST | `/api/topup` | Commit top-up after thumbprint |

### `POST /api/voice`

```text
Content-Type: multipart/form-data
Fields:
  audio    — audio blob (webm / wav / mp3)
  language — "en" | "bm" | "zh" (default: "en")
```

### `POST /api/agent`

```json
{ "text": "Pay RM50 to KFC", "language": "en" }
```

---

## Demo Flow

1. Open the app — you land on the **TalknGo home screen**
2. Tap **VOICE** and speak one of these commands:
   - *"What is my balance?"*
   - *"Pay RM50 to merchant"*
   - *"Top up RM100"*
3. Watch the **4-node pipeline animation** while the AI processes
4. The AI replies **by voice** (TTS)
5. For payments and top-ups, a **thumbprint overlay** appears — tap to confirm
6. See the updated balance or a mock **QR code**
7. Tap **DEALS** for the safe promotions panel

---

## Alibaba Cloud Services

TalknGo is built entirely on the Alibaba Cloud ecosystem. Below is a full list of services in use:

| Service | Product | Purpose |
| --- | --- | --- |
| **Alibaba Cloud ECS** | Elastic Compute Service | Hosts both the Flask backend (Gunicorn) and Nginx web server |
| **DashScope — STT** | Paraformer / `fun-asr-realtime` | Converts user voice (audio blob) to text transcript |
| **DashScope — LLM** | Qwen-Turbo (`qwen-turbo`) | Intent extraction, tool selection, and natural language response generation |
| **DashScope — TTS** | CosyVoice (`cosyvoice-v3-flash`) | Converts agent text replies back to spoken MP3 audio |
| **Alibaba Cloud DNS** | Domains & Hosting | Resolves `syok.ai` to the ECS instance public IP |

> **Region:** All DashScope API calls target the **Singapore (International)** endpoint by default (`DASHSCOPE_REGION=intl`). Switch to `china` for the Beijing endpoint — note that each region issues separate API keys and uses different model name aliases.

---

## Deployment (Alibaba Cloud ECS)

The live deployment runs on **Alibaba Cloud ECS (Linux)** with Nginx serving the React frontend and Gunicorn running the Flask backend.

### Build & start the backend

```bash
cd /var/www/html/tng-finhack/backend

# Using the conda env (Python 3.11) — do NOT use system python3
/home/hackgpt/.conda/envs/tng-finhack/bin/gunicorn \
  -w 2 -b 0.0.0.0:5000 "app.main:create_app()"
```

### Build the frontend

```bash
cd /var/www/html/tng-finhack/frontend
source ~/.nvm/nvm.sh && nvm use 18
npm run build   # outputs to frontend/dist/
```

### Nginx configuration

Nginx serves `frontend/dist/` as static files and proxies `/api` to Gunicorn:

```nginx
server {
    listen 80;
    server_name syok.ai;

    root /var/www/html/tng-finhack/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Reload after config changes:

```bash
sudo nginx -t && sudo nginx -s reload
```

> **Note:** There is no systemd unit for the backend — start Gunicorn manually or via a process manager (e.g., `screen`, `tmux`, or `supervisor`).

---

## License

Built for hackathon demonstration purposes. All wallet data is simulated — no real financial transactions are processed.
