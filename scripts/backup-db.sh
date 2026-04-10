#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/backup-db.sh
#
# Creates a pg_dump snapshot of the production Railway database.
# Run from repo root:   bash scripts/backup-db.sh
#
# Requires:
#   - pg_dump (Homebrew: brew install libpq + brew link --force libpq)
#   - DATABASE_URL set in backend/.env  OR  DATABASE_URL exported in shell
#
# The backup is saved to:  backups/prod_backup_<YYYYMMDD_HHMMSS>.sql
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Resolve repo root (directory containing this script's parent) ──────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${REPO_ROOT}/backups"
mkdir -p "${BACKUP_DIR}"

# ── Load DATABASE_URL from backend/.env if not already in environment ───────
if [[ -z "${DATABASE_URL:-}" ]]; then
  ENV_FILE="${REPO_ROOT}/backend/.env"
  if [[ -f "${ENV_FILE}" ]]; then
    # Safely source only DATABASE_URL from .env
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"
    export DATABASE_URL
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌  DATABASE_URL is not set. Export it or add it to backend/.env"
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/prod_backup_${TIMESTAMP}.sql"

echo "📦  Starting backup → ${OUTPUT_FILE}"
echo "    (host: $(echo "${DATABASE_URL}" | sed 's|.*@||' | cut -d/ -f1))"

pg_dump \
  "${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="${OUTPUT_FILE}"

BYTES="$(wc -c < "${OUTPUT_FILE}")"
echo "✅  Backup complete — $(( BYTES / 1024 )) KB → ${OUTPUT_FILE}"
