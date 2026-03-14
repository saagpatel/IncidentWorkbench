#!/bin/bash
set -euo pipefail

echo "🔍 Incident Workbench - Installation Verification"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_passed() {
    echo -e "${GREEN}✓${NC} $1"
}

check_failed() {
    echo -e "${RED}✗${NC} $1"
    FAILED=1
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

FAILED=0

echo "Checking dependencies..."
echo ""

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_passed "Node.js $NODE_VERSION installed"
else
    check_failed "Node.js not found (required: 18+)"
fi

# Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    check_passed "Python $PYTHON_VERSION installed"
else
    check_failed "Python 3 not found (required: 3.12+)"
fi

# Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    check_passed "Rust $RUST_VERSION installed"
else
    check_failed "Rust not found (required for Tauri)"
fi

# Ollama
if command -v ollama &> /dev/null; then
    check_passed "Ollama CLI installed"

    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        check_passed "Ollama server is running"

        # Check for required models
        MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")

        if echo "$MODELS" | grep -q "nomic-embed-text"; then
            check_passed "Model nomic-embed-text is pulled"
        else
            check_failed "Model nomic-embed-text not found. Run: ollama pull nomic-embed-text"
        fi

        if echo "$MODELS" | grep -q "llama3.2"; then
            check_passed "Model llama3.2 is pulled"
        else
            check_failed "Model llama3.2 not found. Run: ollama pull llama3.2"
        fi
    else
        check_failed "Ollama server not running. Start with: ollama serve"
    fi
else
    check_failed "Ollama not found. Install from https://ollama.ai"
fi

echo ""
echo "Checking project structure..."
echo ""

# Check critical directories
for dir in src backend src-tauri scripts; do
    if [ -d "$dir" ]; then
        check_passed "Directory $dir exists"
    else
        check_failed "Directory $dir missing"
    fi
done

# Check package.json
if [ -f "package.json" ]; then
    check_passed "package.json exists"

    if npm ci --ignore-scripts --dry-run &> /tmp/incident-workbench-npm-ci.log; then
        check_passed "package-lock.json is in sync with package.json"
    else
        check_failed "npm ci would fail. Sync package-lock.json with package.json. See /tmp/incident-workbench-npm-ci.log"
    fi

    if [ -d "node_modules" ]; then
        check_passed "Node modules installed"
    else
        check_failed "Node modules not installed. Run: npm ci"
    fi
else
    check_failed "package.json missing"
fi

# Check backend setup
if [ -f "backend/pyproject.toml" ]; then
    check_passed "backend/pyproject.toml exists"

    if [ -d "backend/.venv" ]; then
        check_passed "Backend Python virtual environment exists"
    else
        check_failed "Backend Python venv not created. Run: python3 -m venv backend/.venv && backend/.venv/bin/pip install -e \"backend/.[dev]\""
    fi
else
    check_failed "backend/pyproject.toml missing"
fi

# Check migrations
if [ -f "backend/migrations/001_initial_schema.sql" ]; then
    check_passed "Database migrations present"
else
    check_failed "Database migrations missing"
fi

echo ""
echo "Testing builds..."
echo ""

# Test backend can import
if [ -d "backend/.venv" ]; then
    if backend/.venv/bin/python -c "import sys; sys.path.insert(0, 'backend'); from main import app" 2>/dev/null; then
        check_passed "Backend imports successfully"
    else
        check_failed "Backend import failed (dependencies issue?)"
    fi
fi

# Test frontend build (if node_modules exists)
if [ -d "node_modules" ]; then
    if npm run build &> /tmp/build.log; then
        check_passed "Frontend builds successfully"
    else
        check_failed "Frontend build failed. Check /tmp/build.log"
    fi
fi

echo ""
echo "Summary"
echo "======="
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to run:"
    echo "  bash scripts/dev.sh        # Development mode"
    echo "  npm run tauri dev          # Frontend only"
    echo "  cd backend && .venv/bin/python test_phase0.py  # Backend tests"
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Please fix the issues above before running the app."
fi

echo ""
