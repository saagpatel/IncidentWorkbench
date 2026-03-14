#!/bin/bash
set -euo pipefail

echo "Building Python sidecar..."
cd "$(dirname "$0")/../backend"

# Create venv if needed
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# Install dependencies including PyInstaller
echo "Installing dependencies..."
pip install -q -e ".[dev]"

# Build with PyInstaller
echo "Building standalone binary with PyInstaller..."
pyinstaller --onefile --name incident-workbench-api main.py --distpath dist/ --clean --log-level WARN

# Get target triple for Tauri
TARGET_TRIPLE=$(rustc --print host-tuple 2>/dev/null || echo "aarch64-apple-darwin")
DEST="../src-tauri/binaries/incident-workbench-api-${TARGET_TRIPLE}"
mkdir -p "$(dirname "$DEST")"

# Copy binary
cp dist/incident-workbench-api "$DEST"
chmod +x "$DEST"

echo "✓ Sidecar built: $DEST"
