"""
Reward Scheduler — background jobs for the gamification system.

Jobs:
  1. Nightly streak reset (IST midnight) — reset streaks for students
     who did not meet the daily threshold.
  2. Monthly leaderboard snapshot (1st of each month) — freeze rankings
     and award rank bonus points.

Integration:
  These functions are designed to be called by an external scheduler
  (e.g., APScheduler, cron, Railway scheduled tasks).  The main.py
  startup registers them via BackgroundScheduler if available.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func, update as sa_update

from models import User, Base
from reward_models import (
    RewardEvent,
    MonthlyLeaderboardSnapshot,
    StudentBadgeAward,
    BadgeDefinition,
    RewardAuditLog,
)
from timezone_utils import get_ist_now, get_utc_now

logger = logging.getLogger(__name__)


def run_nightly_streak_reset(db: Session) -> dict:
    """
    Reset streaks for students who did not meet today's threshold.
    Should run near IST midnight (e.g., 00:05 IST → 18:35 UTC previous day).

    Returns { reset_count, skipped_count }.
    """
    from streak_service import streak_service
    result = streak_service.handle_day_end_reset(db)
    db.commit()
    logger.info(
        "[NIGHTLY_RESET] reset=%s skipped=%s",
        result["reset_count"],
        result["skipped_count"],
    )
    return result


def run_monthly_leaderboard_snapshot(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None,
    admin_id: Optional[int] = None,
) -> dict:
    """
    Take a snapshot of the monthly leaderboard.

    - Sums points_delta from reward_events for the specified month
    - Computes global and branch ranks
    - Awards rank bonus (1st: +500, 2nd: +300, 3rd: +200) via RewardEngine
    - Writes snapshot rows to monthly_leaderboard_snapshots

    Can be called manually by admin (with month/year) or by the scheduler
    on the 1st of each month (for previous month).

    Returns { month, year, students_ranked, snapshots_created, bonuses_awarded }.
    """
    now_ist = get_ist_now()

    if month is None or year is None:
        # Default: snapshot the PREVIOUS month
        if now_ist.month == 1:
            month = 12
            year = now_ist.year - 1
        else:
            month = now_ist.month - 1
            year = now_ist.year

    # Check if snapshot already exists for this month
    existing = (
        db.query(MonthlyLeaderboardSnapshot)
        .filter(
            MonthlyLeaderboardSnapshot.snapshot_month == month,
            MonthlyLeaderboardSnapshot.snapshot_year == year,
        )
        .first()
    )
    if existing:
        logger.warning("[SNAPSHOT] Already exists for %s/%s — skipping", month, year)
        return {
            "month": month,
            "year": year,
            "students_ranked": 0,
            "snapshots_created": 0,
            "bonuses_awarded": 0,
            "already_exists": True,
        }

    # Calculate monthly points from reward_events
    # Get the UTC date range for this month in IST
    from datetime import timedelta, time as dt_time
    from timezone_utils import IST_TIMEZONE, ist_to_utc

    ist_month_start = datetime(year, month, 1, tzinfo=IST_TIMEZONE)
    if month == 12:
        ist_month_end = datetime(year + 1, 1, 1, tzinfo=IST_TIMEZONE)
    else:
        ist_month_end = datetime(year, month + 1, 1, tzinfo=IST_TIMEZONE)

    utc_start = ist_to_utc(ist_month_start)
    utc_end = ist_to_utc(ist_month_end)

    # Sum points per student for the month
    monthly_data = (
        db.query(
            RewardEvent.student_id,
            func.sum(RewardEvent.points_delta).label("monthly_points"),
        )
        .filter(
            RewardEvent.is_voided == False,
            RewardEvent.event_timestamp >= utc_start,
            RewardEvent.event_timestamp < utc_end,
        )
        .group_by(RewardEvent.student_id)
        .having(func.sum(RewardEvent.points_delta) > 0)
        .order_by(func.sum(RewardEvent.points_delta).desc())
        .all()
    )

    if not monthly_data:
        logger.info("[SNAPSHOT] No students with points for %s/%s", month, year)
        return {
            "month": month,
            "year": year,
            "students_ranked": 0,
            "snapshots_created": 0,
            "bonuses_awarded": 0,
        }

    # Get branch info for each student
    from models import StudentProfile

    student_branches = {}
    student_ids = [row.student_id for row in monthly_data]
    profiles = (
        db.query(StudentProfile.user_id, StudentProfile.branch)
        .filter(StudentProfile.user_id.in_(student_ids))
        .all()
    )
    for p in profiles:
        student_branches[p.user_id] = p.branch or "unknown"

    # Compute global ranks (simple dense ranking by points)
    global_ranked = []
    for rank, row in enumerate(monthly_data, start=1):
        global_ranked.append({
            "student_id": row.student_id,
            "monthly_points": row.monthly_points,
            "branch": student_branches.get(row.student_id, "unknown"),
            "global_rank": rank,
        })

    # Compute branch ranks
    branch_groups = {}
    for entry in global_ranked:
        branch = entry["branch"]
        if branch not in branch_groups:
            branch_groups[branch] = []
        branch_groups[branch].append(entry)

    for branch, entries in branch_groups.items():
        entries.sort(key=lambda e: e["monthly_points"], reverse=True)
        for i, entry in enumerate(entries, start=1):
            entry["branch_rank"] = i

    # Write snapshot rows
    snapshots_created = 0
    for entry in global_ranked:
        snapshot = MonthlyLeaderboardSnapshot(
            snapshot_month=month,
            snapshot_year=year,
            student_id=entry["student_id"],
            branch=entry["branch"],
            monthly_points=entry["monthly_points"],
            global_rank=entry["global_rank"],
            branch_rank=entry.get("branch_rank", 0),
        )
        db.add(snapshot)
        snapshots_created += 1

    db.flush()

    # Award top-3 global rank bonuses
    bonuses_awarded = 0
    rank_rules = {
        1: "monthly_rank_1",
        2: "monthly_rank_2",
        3: "monthly_rank_3",
    }

    from reward_engine import reward_engine

    for entry in global_ranked[:3]:
        rule_key = rank_rules.get(entry["global_rank"])
        if rule_key:
            reward_engine.record_event(
                db=db,
                student_id=entry["student_id"],
                event_type="monthly_leaderboard_reward",
                source_tool="system",
                rule_key=rule_key,
                metadata={
                    "month": month,
                    "year": year,
                    "global_rank": entry["global_rank"],
                    "monthly_points": entry["monthly_points"],
                },
            )
            bonuses_awarded += 1

    # Record snapshot event
    event = RewardEvent(
        student_id=global_ranked[0]["student_id"],  # Attribute to top student
        event_type="monthly_snapshot_created",
        source_tool="system",
        rule_key=None,
        points_delta=0,
        event_metadata={
            "month": month,
            "year": year,
            "total_students": len(global_ranked),
            "triggered_by": admin_id or "scheduler",
        },
        created_by=admin_id,
    )
    db.add(event)

    db.commit()

    result = {
        "month": month,
        "year": year,
        "students_ranked": len(global_ranked),
        "snapshots_created": snapshots_created,
        "bonuses_awarded": bonuses_awarded,
    }
    logger.info("[SNAPSHOT] %s", result)
    return result


def simulate_month_end(
    db: Session,
    month: int,
    year: int,
) -> list:
    """
    Dry-run simulation of what monthly snapshot would produce.
    Does NOT write any data.  Returns projected rankings.
    """
    from timezone_utils import IST_TIMEZONE, ist_to_utc

    ist_month_start = datetime(year, month, 1, tzinfo=IST_TIMEZONE)
    if month == 12:
        ist_month_end = datetime(year + 1, 1, 1, tzinfo=IST_TIMEZONE)
    else:
        ist_month_end = datetime(year, month + 1, 1, tzinfo=IST_TIMEZONE)

    utc_start = ist_to_utc(ist_month_start)
    utc_end = ist_to_utc(ist_month_end)

    monthly_data = (
        db.query(
            RewardEvent.student_id,
            func.sum(RewardEvent.points_delta).label("monthly_points"),
        )
        .filter(
            RewardEvent.is_voided == False,
            RewardEvent.event_timestamp >= utc_start,
            RewardEvent.event_timestamp < utc_end,
        )
        .group_by(RewardEvent.student_id)
        .having(func.sum(RewardEvent.points_delta) > 0)
        .order_by(func.sum(RewardEvent.points_delta).desc())
        .all()
    )

    from models import StudentProfile

    result = []
    for rank, row in enumerate(monthly_data, start=1):
        profile = (
            db.query(StudentProfile)
            .filter(StudentProfile.user_id == row.student_id)
            .first()
        )
        user = db.query(User).filter(User.id == row.student_id).first()

        result.append({
            "student_id": row.student_id,
            "student_name": user.name if user else "Unknown",
            "branch": profile.branch if profile else "unknown",
            "monthly_points": row.monthly_points,
            "projected_rank": rank,
            "projected_bonus": {1: 500, 2: 300, 3: 200}.get(rank, 0),
        })

    return result
