"""
Points Balance Carry-Forward Migration
=======================================
Run once to reconcile every user's PointsLog history with their current
total_points so that sum(logs) == user.total_points for all users.

HOW IT WORKS
------------
For each student user:
  1. Sum all existing points_log entries  → existing_sum
  2. gap = user.total_points − existing_sum
  3. If gap != 0, insert ONE "balance_carryforward" log entry with:
       points       = gap
       source_type  = "balance_carryforward"
       description  = descriptive text (see below)
       extra_data   = {user_total_points, existing_log_sum, gap, ...}
     This single entry bridges pre-migration history so the checksum
     passes cleanly.  All future transactions are logged individually.
  4. If gap == 0 the user is already balanced — nothing is inserted.

SAFETY
------
* Never touches user.total_points — users keep every point they have.
* Idempotent: re-running after a successful run does nothing (the
  carry-forward entry itself is included in the sum, so gap becomes 0).
* Runs in a single transaction per user; rolls back that user on error
  and continues with the rest.

USAGE
-----
  python3 migrations/carryforward_points_balance.py

Or from the backend/ directory:
  python3 -c "
  import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath('.')))
  from migrations.carryforward_points_balance import run
  run()
  "
"""
import sys
import os

# ── path setup ──────────────────────────────────────────────────────────────
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)
os.chdir(parent_dir)

from sqlalchemy import func
from models import User, PointsLog, get_db
from timezone_utils import get_utc_now


def run():
    db = next(get_db())

    # ── collect all student users ────────────────────────────────────────────
    students = db.query(User).filter(User.role == "student").all()
    print(f"\n{'=' * 60}")
    print(f"  Points Balance Carry-Forward Migration")
    print(f"  Users to process: {len(students)}")
    print(f"{'=' * 60}\n")

    already_balanced = 0
    newly_balanced   = 0
    errors           = 0

    for user in students:
        try:
            # Sum of all existing log entries for this user
            existing_sum = db.query(func.sum(PointsLog.points)).filter(
                PointsLog.user_id == user.id
            ).scalar() or 0

            gap = user.total_points - existing_sum

            display_name = user.display_name or user.name or f"user#{user.id}"

            if gap == 0:
                print(f"  ✓  {display_name:<30}  total={user.total_points:>6}  already balanced")
                already_balanced += 1
                continue

            # Determine description
            if existing_sum == 0:
                description = (
                    f"Opening balance ({user.total_points} pts) — "
                    f"earned before points logging was introduced"
                )
            elif gap > 0:
                description = (
                    f"Balance carry-forward: +{gap} pts to reconcile "
                    f"pre-migration history (logged={existing_sum}, actual={user.total_points})"
                )
            else:
                # gap < 0 — logs over-counted somehow
                description = (
                    f"Balance carry-forward: {gap} pts adjustment to reconcile "
                    f"pre-migration history (logged={existing_sum}, actual={user.total_points})"
                )

            entry = PointsLog(
                user_id=user.id,
                points=gap,
                source_type="balance_carryforward",
                source_id=None,
                description=description,
                extra_data={
                    "user_total_points": user.total_points,
                    "existing_log_sum":  int(existing_sum),
                    "gap":               gap,
                    "migration":         "carryforward_points_balance",
                    "balance_before":    int(existing_sum),
                    "balance_after":     user.total_points,
                },
                created_at=get_utc_now(),
            )
            db.add(entry)
            db.commit()

            sign = "+" if gap > 0 else ""
            print(
                f"  ✅ {display_name:<30}  total={user.total_points:>6}  "
                f"log_sum={existing_sum:>6}  gap={sign}{gap}"
            )
            newly_balanced += 1

        except Exception as exc:
            db.rollback()
            print(f"  ❌ user#{user.id}  ERROR: {exc}")
            errors += 1

    print(f"\n{'=' * 60}")
    print(f"  Already balanced : {already_balanced}")
    print(f"  Newly balanced   : {newly_balanced}")
    print(f"  Errors           : {errors}")
    print(f"{'=' * 60}\n")

    if errors == 0:
        print("  ✅  Migration complete — all users are now balanced.")
    else:
        print(f"  ⚠️  Migration finished with {errors} error(s). "
              f"Re-run to retry failed users.")


if __name__ == "__main__":
    run()
