#!/usr/bin/env bash
# =============================================================================
# local-dev.sh — Start backend locally on Mac Mini OR MacBook
# Use this when you want to run the backend on your current machine
# (not Mac Mini server mode, but a local dev session).
# Port 5000 only; NOT exposed publicly.
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
VENV_DIR="$REPO_DIR/.venv"

cd "$REPO_DIR"

# ── Venv ─────────────────────────────────────────────────────────────────────
if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating Python venv..."
  python3.12 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# ── Deps ─────────────────────────────────────────────────────────────────────
pip install -q -r "$BACKEND_DIR/requirements.txt"

# ── Check .env ───────────────────────────────────────────────────────────────
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "❌ $BACKEND_DIR/.env not found. Copy from backend/.env.example and fill in."
  exit 1
fi

# ── Start with hot-reload ────────────────────────────────────────────────────
echo "🚀 Starting backend at http://localhost:5000 (hot-reload ON)"
echo "   Press Ctrl+C to stop."
cd "$BACKEND_DIR"
uvicorn main:app --host 127.0.0.1 --port 5000 --reload
