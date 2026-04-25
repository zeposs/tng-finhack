#!/bin/bash
# Talk 'n Go eWallet - Quick Mode
# Start both backend and frontend servers

echo "=========================================="
echo "  Talk 'n Go eWallet - Quick Mode"
echo "=========================================="
echo ""

# Check for .env
if [ ! -f backend/.env ]; then
    echo "ERROR: backend/.env not found. Create it with:"
    echo "  DASHSCOPE_API_KEY=your_key_here"
    exit 1
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
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..
sleep 2

# Start frontend
echo "[4/4] Starting React frontend on port 5173..."
cd frontend
npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd ..
sleep 2

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
