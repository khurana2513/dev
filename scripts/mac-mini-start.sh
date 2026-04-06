#!/usr/bin/env bash
# =============================================================================
# mac-mini-start.sh
# Starts the TalentHub dev backend on the Mac Mini.
# Run once after boot, or set up as a launchd service (see DEV_SETUP.md).
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
VENV_DIR="$REPO_DIR/.venv"
LOG_FILE="$REPO_DIR/logs/backend-dev.log"
PID_FILE="$REPO_DIR/logs/backend-dev.pid"

mkdir -p "$REPO_DIR/logs"

# ── Kill any previous instance ───────────────────────────────────────────────
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping previous backend (PID $OLD_PID)..."
    kill "$OLD_PID"
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

# ── Ensure on dev branch ─────────────────────────────────────────────────────
cd "$REPO_DIR"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "dev" ]]; then
  echo "⚠️  WARNING: Not on dev branch (on '$CURRENT_BRANCH'). Switch with: git checkout dev"
  echo "   Continuing anyway..."
fi

# ── Activate venv ────────────────────────────────────────────────────────────
if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating Python venv..."
  python3.12 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# ── Install/update dependencies ──────────────────────────────────────────────
echo "Installing backend dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt"

# ── Check .env exists ────────────────────────────────────────────────────────
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "❌ ERROR: $BACKEND_DIR/.env not found."
  echo "   Copy backend/.env.example to backend/.env and fill in values."
  exit 1
fi

# ── Start uvicorn ────────────────────────────────────────────────────────────
echo "Starting backend on port 5000..."
cd "$BACKEND_DIR"

nohup uvicorn main:app --host 0.0.0.0 --port 5000 --reload >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "✅ Backend started (PID $(cat "$PID_FILE"))"
echo "   Logs: $LOG_FILE"
echo "   Stop: $REPO_DIR/scripts/mac-mini-stop.sh"
