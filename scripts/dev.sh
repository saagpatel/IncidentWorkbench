#!/bin/bash
set -euo pipefail

find_available_port() {
    local start_port="$1"
    local port="$start_port"
    while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo "$port"
}

echo "Starting Incident Workbench in development mode..."

DEFAULT_BACKEND_PORT="${WORKBENCH_BACKEND_PORT:-8765}"
DEFAULT_FRONTEND_PORT="${VITE_DEV_SERVER_PORT:-1420}"

BACKEND_PORT="$(find_available_port "$DEFAULT_BACKEND_PORT")"
FRONTEND_PORT="$(find_available_port "$DEFAULT_FRONTEND_PORT")"
HMR_PORT="$(find_available_port "$((FRONTEND_PORT + 1))")"

if [ "$BACKEND_PORT" != "$DEFAULT_BACKEND_PORT" ]; then
    echo "Backend port $DEFAULT_BACKEND_PORT is busy; using $BACKEND_PORT instead."
fi

if [ "$FRONTEND_PORT" != "$DEFAULT_FRONTEND_PORT" ]; then
    echo "Frontend port $DEFAULT_FRONTEND_PORT is busy; using $FRONTEND_PORT instead."
fi

echo "Using backend port: $BACKEND_PORT"
echo "Using frontend port: $FRONTEND_PORT"

TARGET_TRIPLE="$(rustc --print host-tuple 2>/dev/null || echo "aarch64-apple-darwin")"
SIDECAR_PATH="$(cd "$(dirname "$0")/../src-tauri" && pwd)/binaries/incident-workbench-api-${TARGET_TRIPLE}"

if [ ! -x "$SIDECAR_PATH" ]; then
    echo "Tauri sidecar is missing; building it first..."
    "$(dirname "$0")/build-sidecar.sh"
fi

# Start backend in dev mode (no PyInstaller, direct uvicorn)
cd "$(dirname "$0")/../backend"

# Create venv if needed
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -e .

# Start backend
echo "Starting FastAPI backend on port $BACKEND_PORT..."
export DEV_MODE=1
export WORKBENCH_BACKEND_PORT="$BACKEND_PORT"
export WORKBENCH_TRUSTED_ORIGINS="http://localhost:${FRONTEND_PORT},tauri://localhost"
uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start Tauri dev (frontend + webview)
cd ..
echo "Starting Tauri frontend..."
export VITE_BACKEND_URL="http://localhost:${BACKEND_PORT}"
export VITE_DEV_SERVER_PORT="$FRONTEND_PORT"
export VITE_HMR_PORT="$HMR_PORT"
export TAURI_CONFIG="$(printf '{"build":{"devUrl":"http://localhost:%s"}}' "$FRONTEND_PORT")"
npm run tauri dev &
TAURI_PID=$!

# Cleanup on exit
trap "kill $BACKEND_PID $TAURI_PID 2>/dev/null; exit" INT TERM

wait
