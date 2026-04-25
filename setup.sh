#!/usr/bin/env bash
# First-time setup script for TnG eWallet Quick Mode

set -e

echo "Starting first-time setup..."

# 1. Backend Setup
echo "--- Setting up Backend ---"
cd backend
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi
echo "Installing backend dependencies..."
source .venv/bin/activate
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "TIP: Edit backend/.env to add your DASHSCOPE_API_KEY."
fi
cd ..

# 2. Frontend Setup
echo "--- Setting up Frontend ---"
cd frontend
echo "Installing frontend dependencies..."
npm install
cd ..

echo "--- Setup Complete! ---"
echo "You can now start the application with ./run.sh"
