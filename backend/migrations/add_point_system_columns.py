"""
Migration: Add point system columns to practice_sessions and attempts tables.

Adds:
  practice_sessions.preset_key  VARCHAR(50) NULL
  practice_sessions.row_count   INTEGER NULL
  attempts.points_awarded       INTEGER NULL
  attempts.point_rule_id        INTEGER NULL FK → point_rules.id

Also creates the point_rules table if it does not exist.

Run:  python3 migrations/add_point_system_columns.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from models import engine, Base


def migrate():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    # ── 1. Create point_rules table via Base.metadata (if not exists) ─────
    from point_rule_engine import PointRule  # noqa: F401 — registers the model
    if "point_rules" not in existing_tables:
        PointRule.__table__.create(bind=engine, checkfirst=True)
        print("✅ Created table: point_rules")
    else:
        print("⏭  Table point_rules already exists")

    # ── 2. Add columns to practice_sessions ──────────────────────────────
    ps_cols = {c["name"] for c in inspector.get_columns("practice_sessions")}
    with engine.begin() as conn:
        if "preset_key" not in ps_cols:
            conn.execute(text(
                "ALTER TABLE practice_sessions ADD COLUMN preset_key VARCHAR(50)"
            ))
            print("✅ Added practice_sessions.preset_key")
        else:
            print("⏭  practice_sessions.preset_key exists")

        if "row_count" not in ps_cols:
            conn.execute(text(
                "ALTER TABLE practice_sessions ADD COLUMN row_count INTEGER"
            ))
            print("✅ Added practice_sessions.row_count")
        else:
            print("⏭  practice_sessions.row_count exists")

    # ── 3. Add columns to attempts ───────────────────────────────────────
    at_cols = {c["name"] for c in inspector.get_columns("attempts")}
    with engine.begin() as conn:
        if "points_awarded" not in at_cols:
            conn.execute(text(
                "ALTER TABLE attempts ADD COLUMN points_awarded INTEGER"
            ))
            print("✅ Added attempts.points_awarded")
        else:
            print("⏭  attempts.points_awarded exists")

        if "point_rule_id" not in at_cols:
            conn.execute(text(
                "ALTER TABLE attempts ADD COLUMN point_rule_id INTEGER "
                "REFERENCES point_rules(id) ON DELETE SET NULL"
            ))
            print("✅ Added attempts.point_rule_id")
        else:
            print("⏭  attempts.point_rule_id exists")

    print("\n✅ Point system migration complete!")


if __name__ == "__main__":
    migrate()
