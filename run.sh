#!/usr/bin/env bash
# Start script for TnG eWallet Quick Mode

# Function to kill child processes on exit
cleanup() {
    echo "Stopping servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Backend and Frontend..."

# 1. Start Backend
cd backend
source .venv/bin/activate
python3 -m app.main &
BACKEND_PID=$!
cd ..

# 2. Start Frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers."

# Wait for processes
wait
