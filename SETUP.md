# Server Setup — Required Packages

## Environment Setup

This project uses **conda** for Python/Node.js management and **nvm** for Node.js version switching.

### 1. Create Conda Environment

```bash
conda create -n tng-finhack python=3.11 nodejs=18 -y
conda activate tng-finhack
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your DASHSCOPE_API_KEY
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## Pre-installed System Packages

These packages are already available on the server:

| Package | Purpose |
|---|---|
| `git` | Clone/pull repo |
| `curl` | Download scripts |
| `sqlite3` | Database |
| `conda` | Python/Node.js environment manager |

---

## Running the App

### Backend (Flask)

```bash
conda activate tng-finhack
cd backend
export DASHSCOPE_API_KEY=your_key_here
flask run --port 5000
```

### Frontend (Vite + React)

```bash
cd frontend
npm run dev -- --port 5173
```

### Production Build

```bash
cd frontend
npm run build
```

---

## Project Structure

```
tng-finhack/
├── backend/
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── app.py              # Flask app (to be created)
├── frontend/
│   ├── package.json        # Node.js dependencies
│   ├── vite.config.js      # Vite + Tailwind config
│   └── src/                # React source files
├── PRD.md
├── TECHSTACK.md
└── SETUP.md
```
