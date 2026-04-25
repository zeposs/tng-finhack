# Quick Run

Fast setup and run instructions for the hackathon demo.

## Prerequisites

- Python 3.10+
- Node.js 18+
- DashScope API key (optional if using mock mode)

## 1) Run Backend (Terminal 1)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:
- Set `DASHSCOPE_API_KEY=your_key` for real AI
- Or keep API key empty / set `MOCK_MODE=1` for mock demo mode

Start backend:

```powershell
python -m app.main
```

Backend URL: `http://localhost:5000`

## 2) Run Frontend (Terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL (usually): `http://localhost:5173`

## 3) Optional Frontend API Override

If backend is not on localhost:5000, create `frontend/.env.local`:

```env
VITE_API_BASE=http://your-host:5000
```

## Quick Checks

- Backend health: open `http://localhost:5000/api/health`
- Frontend loads and can access voice flow
- If AI calls fail, switch to `MOCK_MODE=1` and retry

## macOS/Linux command differences

- Activate venv: `source .venv/bin/activate`
- Copy env file: `cp .env.example .env`
