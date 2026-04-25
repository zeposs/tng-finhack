#!/bin/bash
# Talk 'n Go eWallet - Quick Mode
# Start both backend and frontend servers

port_in_use() {
    python3 - "$1" <<'PY'
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(0.3)
in_use = sock.connect_ex(("127.0.0.1", port)) == 0
sock.close()
sys.exit(0 if in_use else 1)
PY
}

echo "=========================================="
echo "  Talk 'n Go eWallet - Quick Mode"
echo "=========================================="
echo ""

if [ -x .tools/ffmpeg ]; then
    export PATH="$(pwd)/.tools:$PATH"
fi

# Check for .env
if [ ! -f backend/.env ]; then
    echo "ERROR: backend/.env not found. Create it with:"
    echo "  DASHSCOPE_API_KEY=your_key_here"
    exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "WARNING: ffmpeg not found in PATH. Realtime websocket STT will be unavailable."
fi

# Install backend deps if needed
echo "[1/4] Checking Python dependencies..."
cd backend
pip3 install -r requirements.txt -q 2>/dev/null
cd ..

# Install frontend deps if needed
echo "[2/4] Checking Node dependencies..."
cd frontend
npm install --silent 2>/dev/null
cd ..

# Start backend
echo "[3/4] Starting Flask backend on port 5000..."
if port_in_use 5000; then
    echo "ERROR: Port 5000 is already in use."
    echo "Stop the existing process and rerun start.sh."
    exit 1
fi

cd backend
python3 app.py &
BACKEND_PID=$!
cd ..
sleep 2

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "ERROR: Backend failed to start on port 5000."
    exit 1
fi

# Start frontend
echo "[4/4] Starting React frontend on port 5173..."
if port_in_use 5173; then
    echo "ERROR: Port 5173 is already in use."
    echo "Stop the existing process and rerun start.sh."
    kill "$BACKEND_PID" 2>/dev/null
    exit 1
fi

cd frontend
npx vite --host 0.0.0.0 --port 5173 --strictPort &
FRONTEND_PID=$!
cd ..
sleep 2

if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "ERROR: Frontend failed to start on port 5173."
    kill "$BACKEND_PID" 2>/dev/null
    exit 1
fi

echo ""
echo "=========================================="
echo "  Servers running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
