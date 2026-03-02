"""
Migration: Admin Student Creation Support
- Makes users.google_id nullable (admin-created accounts don't need Google OAuth)
- Makes users.email nullable  (admin-created accounts may not have email)
- Adds users.is_archived boolean column for soft deletes

Run with:  python backend/migrations/admin_student_creation.py
"""

import os
import sys

# Ensure we can import from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)

migrations = [
    # Drop NOT NULL on google_id
    "ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL",
    # Drop NOT NULL on email
    "ALTER TABLE users ALTER COLUMN email DROP NOT NULL",
    # Add is_archived column (idempotent via IF NOT EXISTS)
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE",
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            print(f"✅  {sql}")
        except Exception as e:
            print(f"⚠️  Skipped (already done?): {sql}\n    Reason: {e}")
    conn.commit()

print("\n✅ Migration complete.")
