#!/usr/bin/env bash
# =============================================================================
# dev-pull-restart.sh
# Pull latest dev branch and restart the backend.
# Meant to be called after `git push origin dev` from any machine.
# Run this manually, or hook it to a cron/watcher on the Mac Mini:
#   crontab -e → */2 * * * * /path/to/scripts/dev-pull-restart.sh
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$REPO_DIR/logs/pull-restart.log"
mkdir -p "$REPO_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for updates on dev branch..." | tee -a "$LOG_FILE"

cd "$REPO_DIR"

# ── Fetch latest ─────────────────────────────────────────────────────────────
git fetch origin dev >> "$LOG_FILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/dev)

if [[ "$LOCAL" == "$REMOTE" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Already up to date. No restart needed." | tee -a "$LOG_FILE"
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] New changes found. Pulling..." | tee -a "$LOG_FILE"
git pull origin dev >> "$LOG_FILE" 2>&1

# ── Reinstall deps if requirements changed ───────────────────────────────────
source "$REPO_DIR/.venv/bin/activate"
pip install -q -r "$REPO_DIR/backend/requirements.txt" >> "$LOG_FILE" 2>&1

# ── Restart backend ──────────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restarting backend..." | tee -a "$LOG_FILE"
"$REPO_DIR/scripts/mac-mini-stop.sh" >> "$LOG_FILE" 2>&1 || true
sleep 1
"$REPO_DIR/scripts/mac-mini-start.sh" >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Done." | tee -a "$LOG_FILE"
