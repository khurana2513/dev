#!/usr/bin/env bash
# =============================================================================
# setup-new-machine.sh
# Run ONCE on a fresh Mac Mini or MacBook to set up the dev environment.
# Prerequisites: Homebrew must be installed (https://brew.sh)
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== TalentHub Dev Environment Setup ==="
echo "Repo: $REPO_DIR"
echo ""

# ── 1. Homebrew dependencies ─────────────────────────────────────────────────
echo "--- Installing system dependencies via Homebrew ---"
brew install python@3.12 node git postgresql@17 || true
brew services start postgresql@17 || true

# ── 2. Python venv ───────────────────────────────────────────────────────────
echo "--- Creating Python virtual environment ---"
python3.12 -m venv "$REPO_DIR/.venv"
source "$REPO_DIR/.venv/bin/activate"
pip install --upgrade pip
pip install -r "$REPO_DIR/backend/requirements.txt"

# ── 3. Playwright browsers (for PDF generation) ──────────────────────────────
echo "--- Installing Playwright browsers ---"
playwright install chromium 2>/dev/null || python3.12 -m playwright install chromium || true

# ── 4. Frontend dependencies ─────────────────────────────────────────────────
echo "--- Installing frontend dependencies ---"
cd "$REPO_DIR/frontend"
npm install
cd "$REPO_DIR"

# ── 5. Create .env from example if not exists ────────────────────────────────
echo "--- Checking .env files ---"
if [[ ! -f "$REPO_DIR/backend/.env" ]]; then
  cp "$REPO_DIR/backend/.env.example" "$REPO_DIR/backend/.env"
  echo "⚠️  Created backend/.env from template. FILL IN THE VALUES BEFORE STARTING."
else
  echo "   backend/.env already exists."
fi

if [[ ! -f "$REPO_DIR/frontend/.env.local" ]]; then
  cp "$REPO_DIR/frontend/.env.example" "$REPO_DIR/frontend/.env.local"
  echo "⚠️  Created frontend/.env.local from template. FILL IN THE VALUES BEFORE STARTING."
else
  echo "   frontend/.env.local already exists."
fi

# ── 6. Make scripts executable ───────────────────────────────────────────────
chmod +x "$REPO_DIR/scripts/"*.sh
echo "   Scripts are executable."

# ── 7. (Mac Mini only) Install cloudflared for tunnel ────────────────────────
if command -v cloudflared &>/dev/null; then
  echo "   cloudflared already installed."
else
  echo "--- Installing cloudflared ---"
  brew install cloudflared || true
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your Neon DB URL and other values"
echo "  2. Edit frontend/.env.local with VITE_API_BASE and VITE_GOOGLE_CLIENT_ID"
echo "  3. Run:  ./scripts/local-dev.sh       (to start backend locally)"
echo "  4. Run:  cd frontend && npm run dev   (to start frontend locally)"
echo ""
echo "For Mac Mini server mode (always-on), see DEV_SETUP.md → Section 5."
