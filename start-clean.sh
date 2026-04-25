#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

kill_port_if_used() {
    local port="$1"
    if python3 - "$port" <<'PY'
import socket
import sys
port = int(sys.argv[1])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(0.2)
in_use = sock.connect_ex(("127.0.0.1", port)) == 0
sock.close()
sys.exit(0 if in_use else 1)
PY
    then
        echo "[CLEAN] Port ${port} is in use, terminating process(es)..."
        fuser -k "${port}/tcp" 2>/dev/null || true
        sleep 1
    else
        echo "[CLEAN] Port ${port} is free."
    fi
}

echo "=========================================="
echo "  Talk 'n Go eWallet - Clean Start"
echo "=========================================="

echo "[1/2] Freeing required ports..."
kill_port_if_used 5000
kill_port_if_used 5173

echo "[2/2] Starting app..."
exec bash start.sh
