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

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PID=""
TAURI_PID=""
LEAN_TMP_ROOT="${LEAN_TMP_ROOT:-$(mktemp -d "${TMPDIR:-/tmp}/incident-workbench-lean.XXXXXX")}"
CLEANED_UP=0

cleanup() {
  if [[ "$CLEANED_UP" -eq 1 ]]; then
    return
  fi
  CLEANED_UP=1
  set +e
  echo ""
  echo "Stopping lean dev processes and cleaning temporary artifacts..."

  if [[ -n "${TAURI_PID}" ]]; then
    pkill -TERM -P "${TAURI_PID}" 2>/dev/null || true
    kill "${TAURI_PID}" 2>/dev/null || true
    wait "${TAURI_PID}" 2>/dev/null || true
  fi

  if [[ -n "${BACKEND_PID}" ]]; then
    pkill -TERM -P "${BACKEND_PID}" 2>/dev/null || true
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi

  bash "$ROOT_DIR/scripts/clean.sh" --apply >/dev/null 2>&1 || true
  rm -rf "$LEAN_TMP_ROOT" 2>/dev/null || true
  find "${TMPDIR:-/tmp}" -maxdepth 1 -type d -name "incident-workbench-lean.*" -exec rm -rf {} + 2>/dev/null || true
}

handle_signal() {
  trap - INT TERM
  cleanup
  exit 130
}

trap handle_signal INT TERM
trap cleanup EXIT

echo "Starting Incident Workbench in lean development mode..."
echo "Temporary cache root: $LEAN_TMP_ROOT"

export VITE_CACHE_DIR="$LEAN_TMP_ROOT/vite-cache"
export CARGO_TARGET_DIR="$LEAN_TMP_ROOT/cargo-target"
export PYTHONDONTWRITEBYTECODE=1
DEFAULT_BACKEND_PORT="${WORKBENCH_BACKEND_PORT:-8765}"
DEFAULT_FRONTEND_PORT="${VITE_DEV_SERVER_PORT:-1420}"
BACKEND_PORT="$(find_available_port "$DEFAULT_BACKEND_PORT")"
FRONTEND_PORT="$(find_available_port "$DEFAULT_FRONTEND_PORT")"
HMR_PORT="$(find_available_port "$((FRONTEND_PORT + 1))")"

echo "Using backend port: $BACKEND_PORT"
echo "Using frontend port: $FRONTEND_PORT"

TARGET_TRIPLE="$(rustc --print host-tuple 2>/dev/null || echo "aarch64-apple-darwin")"
SIDECAR_PATH="$ROOT_DIR/src-tauri/binaries/incident-workbench-api-${TARGET_TRIPLE}"

if [[ ! -x "$SIDECAR_PATH" ]]; then
  echo "Tauri sidecar is missing; building it first..."
  bash "$ROOT_DIR/scripts/build-sidecar.sh"
fi

cd "$ROOT_DIR/backend"

if [[ ! -d ".venv" ]]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "Installing Python dependencies..."
pip install -q -e .

echo "Starting FastAPI backend on port $BACKEND_PORT..."
export DEV_MODE=1
export WORKBENCH_BACKEND_PORT="$BACKEND_PORT"
export WORKBENCH_TRUSTED_ORIGINS="http://localhost:${FRONTEND_PORT},tauri://localhost"
uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

sleep 2

cd "$ROOT_DIR"
echo "Starting Tauri frontend (lean cache mode)..."
export VITE_BACKEND_URL="http://localhost:${BACKEND_PORT}"
export VITE_DEV_SERVER_PORT="$FRONTEND_PORT"
export VITE_HMR_PORT="$HMR_PORT"
export TAURI_CONFIG="$(printf '{"build":{"devUrl":"http://localhost:%s"}}' "$FRONTEND_PORT")"
npm run tauri dev &
TAURI_PID=$!

wait "$TAURI_PID"
