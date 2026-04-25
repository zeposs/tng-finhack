# AGENTS.md — TnG Quick Mode (Voice AI Hackathon MVP)

## Server environment

- **Host**: Alibaba Cloud ECS, Alibaba Cloud Linux 8 (CentOS 8 base)
- **User**: `hackgpt` (uid 1002, in `wheel` and `docker` groups)
- **Project root**: `/var/www/html/tng-finhack`

## Python — critical gotcha

- **System `python3` is 3.6.8** — too old for this project.
- **Always use the conda env `tng-finhack`** (Python 3.11):
  ```bash
  CONDA_PYTHON=/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11
  CONDA_PIP=/home/hackgpt/.conda/envs/tng-finhack/bin/pip
  CONDA_GUNICORN=/home/hackgpt/.conda/envs/tng-finhack/bin/gunicorn
  ```
- All backend dependencies are already installed in this conda env. Do **not** create a separate venv unless you have a specific reason.

## Node.js

- Installed via nvm under `~/.nvm`. Default: **v18.20.8**. v20.20.2 also available.
- nvm is auto-loaded in `~/.bashrc`.

## Project structure

```
backend/          Flask app (Python 3.11 via conda)
  app/
    main.py       Entry point — create_app() factory
    config.py     Settings from .env (load_dotenv with override=True)
    routes.py     All /api/* endpoints
    agent/        LangChain/LangGraph agent + tools
    services/     DashScope STT, TTS clients
    db/           SQLite (quickmode.db) init + queries
  .env            Live env file (gitignored)
  .env.example    Template
  smoke_test_full.py  E2E test: STT → agent → TTS pipeline
frontend/         React + Vite + Tailwind SPA
  vite.config.js  Dev server on :5173, proxies /api → localhost:5000
  dist/           Production build (served by nginx)
```

## Commands

### Backend (dev)
```bash
cd /var/www/html/tng-finhack/backend
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 -m app.main
# Runs on 0.0.0.0:5000 with FLASK_DEBUG=1
```

### Backend (production via gunicorn)
```bash
cd /var/www/html/tng-finhack/backend
/home/hackgpt/.conda/envs/tng-finhack/bin/gunicorn -w 2 -b 0.0.0.0:5000 "app.main:create_app()"
```

### Frontend (dev)
```bash
cd /var/www/html/tng-finhack/frontend
source ~/.nvm/nvm.sh && nvm use 18
npm run dev   # :5173, proxies /api to :5000
```

### Frontend (production build)
```bash
cd /var/www/html/tng-finhack/frontend
source ~/.nvm/nvm.sh && nvm use 18
npm run build   # outputs to frontend/dist/
```

### Smoke test (verify full STT→agent→TTS pipeline)
```bash
cd /var/www/html/tng-finhack/backend
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 smoke_test_full.py
```

### Health check
```bash
curl http://localhost:5000/api/health
```

## Nginx (production)

- Config: `/etc/nginx/sites-enabled/syok.ai.conf`
- Serves `frontend/dist/` as static files
- Proxies `/api` → `http://127.0.0.1:5000`
- Server name: `syok.ai`
- Reload after config changes: `sudo nginx -t && sudo nginx -s reload`

## No systemd service for backend

- The Flask/Gunicorn backend has **no systemd unit**. It must be started manually or via a process manager.
- Nginx is managed by systemd (`systemctl status nginx`) and is enabled on boot.

## Env configuration (`backend/.env`)

- `DASHSCOPE_API_KEY` — if empty, auto-falls into mock mode
- `MOCK_MODE=1` — force canned responses (no DashScope calls)
- `DASHSCOPE_REGION=intl` (Singapore, default) or `china`
- `FLASK_DEBUG=1` in dev; set to `0` for production
- `CORS_ORIGINS=*` for hackathon; restrict for production
- Config reloads on app restart (loaded at import time via `load_dotenv(override=True)`)

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness + config info |
| GET | `/api/balance` | Mock wallet balance (MYR) |
| GET | `/api/history` | Transaction history (last 20) |
| GET | `/api/promotions` | 3 hardcoded promo cards |
| POST | `/api/voice` | Audio → STT → agent → response |
| POST | `/api/agent` | Text → agent → response |
| POST | `/api/payment` | Commit payment (after thumbprint confirm) |
| POST | `/api/topup` | Commit top-up (after thumbprint confirm) |
| POST | `/api/tts` | Text → base64 MP3 audio |

## Database

- SQLite at `backend/quickmode.db` (gitignored)
- Auto-created on first app start via `init_db()`
- Stores balance and transaction history

## Common pitfalls

1. **Never run `python3` directly** — it resolves to 3.6.8. Always use the conda env python path.
2. **Config is loaded at import time** — changing `.env` requires restarting the app.
3. **Frontend dev proxy** only works when running `npm run dev`. Production relies on nginx.
4. **Mock mode triggers** if `DASHSCOPE_API_KEY` is empty OR `MOCK_MODE=1`.
5. **No CI/CD pipeline** — this is a hackathon MVP. Deploy is manual.
