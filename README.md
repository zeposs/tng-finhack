# Touch 'n Go eWallet — Quick Mode (Voice AI)

> Hackathon MVP — a voice-first, elder-friendly layer on top of TnG eWallet.
> See `HackGPT Project PRD1.md` for the full product spec.

## What's inside

| Path | Purpose |
|---|---|
| `backend/` | Python + Flask + LangChain agent + DashScope (Qwen) STT/LLM/TTS + SQLite |
| `frontend/` | React + Vite + Tailwind — single-page state machine UI |
| `assets/` | Logo and reference images |

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** (for the React frontend)
- A **DashScope (Alibaba Cloud) API key**, plus the matching region:
  - **International / Singapore** (recommended for MY) — sign up at
    <https://dashscope-intl.console.aliyun.com/>
  - **China / Beijing** — sign up at <https://dashscope.console.aliyun.com/>

  The two regions issue **separate keys** and **expose different model
  names**. The defaults in `.env.example` target the Singapore region
  (`fun-asr-realtime`, `qwen-turbo`, `cosyvoice-v3-flash`). Switch via
  `DASHSCOPE_REGION=china` or set `DASHSCOPE_BASE_URL` directly.

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
# then edit .env and paste your DASHSCOPE_API_KEY

python -m app.main
```

The backend runs on `http://localhost:5000`.

> **Mock mode:** if `DASHSCOPE_API_KEY` is empty or `MOCK_MODE=1`, the
> backend will use canned responses for STT/LLM/TTS so the demo never crashes.

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (usually <http://localhost:5173>) on your phone or browser.

### 3. Configure backend URL (optional)

If the backend runs somewhere other than `http://localhost:5000`, create
`frontend/.env.local`:

```
VITE_API_BASE=http://your-host:5000
```

## Demo flow (5 minutes)

1. Open Quick Mode (the home screen).
2. Tap the big **VOICE** button and say:
   - "What is my balance?"
   - "Pay RM50 to merchant"
   - "Top up RM100"
3. Watch the LangGraph pipeline animation play.
4. The AI replies by voice; tap the **thumbprint** to confirm.
5. See the QR code (payment) or updated balance (top-up).
6. Tap **DEALS** to view the safe promotions panel.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/voice` | Audio blob → transcription + intent + agent response |
| POST | `/api/agent` | Text command → agent response |
| GET  | `/api/balance` | Current mock wallet balance |
| POST | `/api/payment` | Process mock payment |
| POST | `/api/topup` | Process mock top-up (updates SQLite) |
| GET  | `/api/promotions` | The 3 hardcoded promo cards |
| POST | `/api/tts` | Text → audio blob (MP3) |
| GET  | `/api/health` | Liveness check |

## Deployment notes (Alibaba Cloud ECS)

```bash
# On the ECS instance (Ubuntu)
sudo apt update && sudo apt install -y python3-pip python3-venv nginx nodejs npm
git clone <your-repo>
cd Start\ Program3/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
gunicorn -w 2 -b 0.0.0.0:5000 "app.main:create_app()"
# build the frontend
cd ../frontend && npm install && npm run build
# serve frontend/dist via nginx, proxy /api to localhost:5000
```

A minimal nginx site config:

```nginx
server {
  listen 80;
  root /var/www/quickmode;          # frontend/dist
  index index.html;
  location / { try_files $uri /index.html; }
  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
  }
}
```

## License

Built for hackathon demo purposes only. All wallet data is simulated.
