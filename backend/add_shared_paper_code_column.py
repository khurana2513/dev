"""Migration: add shared_paper_code column to paper_attempts.

Run this once on any environment where the column does not yet exist:

    python add_shared_paper_code_column.py

Idempotent – safe to run multiple times (uses IF NOT EXISTS).
"""

import os
import sys
import logging

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


def run():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("DATABASE_URL environment variable is not set.")
        sys.exit(1)

    # SQLAlchemy requires postgresql:// not postgres://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(database_url)

    with engine.begin() as conn:
        # Add shared_paper_code column (VARCHAR 8, nullable, indexed)
        conn.execute(text(
            "ALTER TABLE paper_attempts "
            "ADD COLUMN IF NOT EXISTS shared_paper_code VARCHAR(8) DEFAULT NULL"
        ))
        log.info("Column 'shared_paper_code' ensured on 'paper_attempts'.")

        # Create index if it doesn't already exist
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_paper_attempts_shared_paper_code "
            "ON paper_attempts (shared_paper_code)"
        ))
        log.info("Index 'ix_paper_attempts_shared_paper_code' ensured.")

    log.info("Migration complete.")


if __name__ == "__main__":
    run()
