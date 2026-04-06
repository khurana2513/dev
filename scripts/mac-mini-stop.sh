#!/usr/bin/env bash
# =============================================================================
# mac-mini-stop.sh — Stops the dev backend
# =============================================================================
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$REPO_DIR/logs/backend-dev.pid"

if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "✅ Backend stopped (PID $PID)"
  else
    echo "Process $PID was not running."
  fi
  rm -f "$PID_FILE"
else
  echo "No PID file found — backend may not be running."
  # Try to kill any uvicorn on port 5000 as fallback
  lsof -ti tcp:5000 | xargs kill -9 2>/dev/null && echo "Killed process on port 5000." || true
fi
