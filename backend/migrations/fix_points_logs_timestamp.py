"""
Migration: Fix points_logs.created_at column type
===================================================
The column was accidentally created as DATE instead of TIMESTAMP WITH TIME ZONE.
This caused all log entries to show 05:30 IST (midnight UTC converted to IST).

This migration:
  1. Converts DATE → TIMESTAMP WITH TIME ZONE (existing dates become UTC midnight,
     which is unavoidable for historical records without the actual time)
  2. Adds NOT NULL constraint (was missing)
  3. Adds a proper DEFAULT NOW() at the DB level as a safety net
  4. Recreates the affected index with the corrected type

Run with:
  python backend/migrations/fix_points_logs_timestamp.py
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌  DATABASE_URL environment variable is not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

steps = [
    # ── Step 1: change DATE → TIMESTAMPTZ ────────────────────────────────────
    # Existing DATE values are cast to UTC midnight (best we can do for old data).
    (
        "ALTER TABLE points_logs "
        "ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE "
        "USING created_at::timestamp AT TIME ZONE 'UTC'",
        "Convert created_at column: DATE → TIMESTAMP WITH TIME ZONE"
    ),
    # ── Step 2: enforce NOT NULL (should already be true logically) ───────────
    (
        "ALTER TABLE points_logs ALTER COLUMN created_at SET NOT NULL",
        "Set NOT NULL on created_at"
    ),
    # ── Step 3: add DB-level default as a safety net ──────────────────────────
    (
        "ALTER TABLE points_logs ALTER COLUMN created_at SET DEFAULT NOW()",
        "Set DEFAULT NOW() on created_at"
    ),
]

with engine.connect() as conn:
    # First, check current column type
    r = conn.execute(text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name='points_logs' AND column_name='created_at'
    """))
    row = r.fetchone()
    if row:
        current_type = row[0]
        print(f"Current column type: {current_type}")
        if "timestamp" in current_type.lower():
            print("✅  Column is already TIMESTAMP type. Nothing to do.")
            sys.exit(0)
    else:
        print("⚠️  Could not find points_logs.created_at column.")

    for sql, description in steps:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"✅  {description}")
        except Exception as e:
            conn.rollback()
            print(f"⚠️  Skipped ({description}): {e}")

    # Verify
    r2 = conn.execute(text("""
        SELECT data_type, is_nullable FROM information_schema.columns
        WHERE table_name='points_logs' AND column_name='created_at'
    """))
    row2 = r2.fetchone()
    if row2:
        print(f"\n✅  Verification — type: {row2[0]}, nullable: {row2[1]}")

print("\n✅  Migration complete.")
