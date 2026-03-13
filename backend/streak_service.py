"""
Streak Service — daily streak tracking and milestone detection.

Streak increments once per calendar day (IST) when a student completes
≥15 qualifying questions.  Qualifying questions include:
  • Mental Math/Burst Mode: rows in `attempts` table
        (session.difficulty_mode != 'custom')
  • Practice Paper (Vedic Math only): submitted questions from papers with
        paper_level starting with "Vedic-Level-" (e.g. Vedic-Level-1 … 4).
        Abacus papers (Junior, Advanced, AB-1 … AB-10) do NOT count.

Streak milestones (3, 7, 14, 30, 60, 100 days) award bonus points and
may unlock badges via the BadgeEvaluator.
"""

import logging
from datetime import datetime, time, timedelta, timezone as _utc_tz
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, update as sa_update

from models import User, Attempt, PracticeSession, PaperAttempt
from timezone_utils import (
    get_ist_now,
    IST_TIMEZONE,
    ist_to_utc,
)

logger = logging.getLogger(__name__)

STREAK_THRESHOLD = 15  # Minimum qualifying questions per day


def _to_ist_date(val):
    """
    Normalise a stored last_practice_date value to a plain IST calendar date.

    The column stores naive datetimes.  Two formats exist:
      • Legacy (pre-fix): raw UTC timestamp, e.g. datetime(2026, 3, 3, 21, 54, 8)
      • New (post-fix):   midnight-IST stored naively, e.g. datetime(2026, 3, 4, 0, 0, 0)

    Both are treated as UTC and converted to IST so that .date() always returns
    the correct IST calendar date.  This matters in the 00:00–05:30 IST window
    where UTC date != IST date — without this a session at e.g. 02:00 IST (=
    20:30 UTC previous day) would yield UTC-date = yesterday, causing the
    idempotency guard (last_date == today_ist) to fail and the streak to
    increment on every subsequent session within the same IST day.

    Handles:
      • None                     → None
      • plain date               → returned as-is
      • naive datetime           → treated as UTC, converted to IST → .date()
      • timezone-aware datetime  → converted to IST → .date()
    """
    if val is None:
        return None
    if not hasattr(val, "hour"):
        return val  # already a plain date object
    # Attach UTC tzinfo if naive, then convert to IST
    aware = val if val.tzinfo is not None else val.replace(tzinfo=_utc_tz.utc)
    return aware.astimezone(IST_TIMEZONE).date()

# Only Vedic Math practice papers count toward the streak.
# Abacus papers (Junior, Advanced, AB-1 … AB-10, Custom) are excluded.
VEDIC_MATH_LEVEL_PREFIX = "Vedic-Level-"

STREAK_MILESTONES = frozenset({3, 7, 14, 30, 60, 100})

_MILESTONE_RULE_MAP = {
    3:   "streak_milestone_3",
    7:   "streak_milestone_7",
    14:  "streak_milestone_14",
    30:  "streak_milestone_30",
    60:  "streak_milestone_60",
    100: "streak_milestone_100",
}


def _ist_day_boundaries(ist_date=None) -> Tuple[datetime, datetime]:
    """
    Return (utc_start, utc_end) for a given calendar day in IST.
    Both are timezone-aware UTC datetimes.
    """
    if ist_date is None:
        ist_date = get_ist_now().date()
    ist_start = datetime.combine(ist_date, time.min).replace(tzinfo=IST_TIMEZONE)
    ist_end = datetime.combine(ist_date + timedelta(days=1), time.min).replace(tzinfo=IST_TIMEZONE)
    return ist_to_utc(ist_start), ist_to_utc(ist_end)


class StreakService:
    """Manages daily streak logic."""

    def count_qualifying_today(self, db: Session, student_id: int) -> int:
        """
        Count qualifying questions attempted today (IST).
        Combines Mental Math / Burst Mode individual attempts + Practice Paper aggregate counts.
        """
        utc_start, utc_end = _ist_day_boundaries()

        # Mental Math + Burst Mode: individual rows in `attempts` table,
        # where session.difficulty_mode != 'custom'.
        mental_burst_count = (
            db.query(func.count(Attempt.id))
            .join(PracticeSession, Attempt.session_id == PracticeSession.id)
            .filter(
                PracticeSession.user_id == student_id,
                PracticeSession.difficulty_mode != "custom",
                Attempt.created_at >= utc_start,
                Attempt.created_at < utc_end,
            )
            .scalar()
        ) or 0

        # Practice Paper (Vedic Math only): aggregate (correct_answers + wrong_answers)
        # Abacus papers (Junior, Advanced, AB-*) are intentionally excluded.
        paper_counts = (
            db.query(
                func.coalesce(
                    func.sum(PaperAttempt.correct_answers + PaperAttempt.wrong_answers),
                    0,
                )
            )
            .filter(
                PaperAttempt.user_id == student_id,
                PaperAttempt.completed_at.isnot(None),
                PaperAttempt.completed_at >= utc_start,
                PaperAttempt.completed_at < utc_end,
                PaperAttempt.paper_level.like(VEDIC_MATH_LEVEL_PREFIX + "%"),
            )
            .scalar()
        ) or 0

        return mental_burst_count + paper_counts

    def check_and_update(self, db: Session, student_id: int) -> Tuple[bool, List[Dict]]:
        """
        Check if the student has crossed the daily threshold and update streak.

        Called after every session completion (mental math, burst, paper).

        Returns (streak_was_incremented, milestone_badges_unlocked).

        CONCURRENCY SAFETY
        ──────────────────
        Uses an atomic UPDATE … WHERE guard instead of SELECT-then-UPDATE.
        The WHERE clause includes `last_practice_date != <today_midnight>` so
        only ONE request per IST day can successfully update the row.
        If rowcount == 0 the guard prevented a double-increment.

        This is database-agnostic: works on both SQLite (single-writer lock)
        and PostgreSQL (row-level MVCC).  No SELECT FOR UPDATE needed.
        """
        # ── 1. Read current user state ──────────────────────────────────────
        user = (
            db.query(User)
            .populate_existing()
            .filter(User.id == student_id)
            .first()
        )
        if not user:
            return False, []

        today_ist = get_ist_now().date()
        last_date = _to_ist_date(user.last_practice_date)

        # Fast exit: already incremented today (covers 99% of repeat calls)
        if last_date == today_ist:
            return False, []

        # ── 2. Check qualifying question count ──────────────────────────────
        count = self.count_qualifying_today(db, student_id)
        if count < STREAK_THRESHOLD:
            return False, []

        # ── 3. Compute new streak ───────────────────────────────────────────
        yesterday = today_ist - timedelta(days=1)

        if last_date == yesterday:
            new_streak = user.current_streak + 1
        else:
            # Gap of ≥2 days, or very first streak → restart
            new_streak = 1

        new_longest = max(user.longest_streak or 0, new_streak)

        # Naive midnight-IST datetime — what we'll store.
        ist_midnight_naive = datetime.combine(today_ist, time.min)

        # ── 4. Atomic conditional UPDATE ────────────────────────────────────
        #    The WHERE clause ensures exactly ONE thread/request per day wins.
        #    On concurrent requests, both may read the old last_practice_date
        #    from step 1, but only the first UPDATE to commit will match the
        #    WHERE guard; the second will find rowcount == 0 and bail out.
        #    Works on SQLite (single-writer serialization) and PostgreSQL (MVCC).
        result = db.execute(
            sa_update(User)
            .where(User.id == student_id)
            .where(
                # Guard: only succeed if last_practice_date is NOT already today
                (User.last_practice_date == None) |  # noqa: E711 — NULL check
                (User.last_practice_date != ist_midnight_naive)
            )
            .values(
                current_streak=new_streak,
                longest_streak=new_longest,
                last_practice_date=ist_midnight_naive,
            )
        )
        db.flush()

        if result.rowcount == 0:
            # Another request already incremented — idempotent exit
            logger.debug(
                "[STREAK] SKIP duplicate increment student_id=%s (rowcount=0)",
                student_id,
            )
            return False, []

        logger.info(
            "[STREAK] student_id=%s streak=%s→%s longest=%s today_count=%s",
            student_id, user.current_streak, new_streak, new_longest, count,
        )

        # ── 5. Record event + check milestones ──────────────────────────────
        self._record_streak_event(db, student_id, new_streak)

        milestone_badges: List[Dict] = []
        if new_streak in STREAK_MILESTONES:
            milestone_badges = self._award_milestone(db, student_id, new_streak)

        return True, milestone_badges

    def handle_day_end_reset(self, db: Session) -> dict:
        """
        Nightly job: reset streaks for students who did NOT meet the threshold
        today. Called once per day near IST midnight.

        Returns { reset_count, skipped_count }.
        """
        today_ist = get_ist_now().date()
        # The reset job runs at 00:05 IST — the new day has just started.
        # "yesterday" is the day that just ended.  Streaks are safe for any
        # student who practiced yesterday (or today — shouldn't happen at
        # 00:05 but included as a safety net).
        yesterday = today_ist - timedelta(days=1)
        reset_count = 0
        skipped_count = 0

        # Find all active-streak students (current_streak > 0)
        active_users = (
            db.query(User)
            .filter(User.current_streak > 0, User.is_archived == False)
            .all()
        )

        for user in active_users:
            last_date = _to_ist_date(user.last_practice_date)

            if last_date is not None and last_date >= yesterday:
                # Student practiced yesterday (or today) — streak is safe
                skipped_count += 1
                continue

            # Student did NOT practice today → reset streak
            old_streak = user.current_streak
            db.execute(
                sa_update(User)
                .where(User.id == user.id)
                .values(current_streak=0)
            )

            # Optionally record a streak_reset event
            from reward_models import RewardEvent
            event = RewardEvent(
                student_id=user.id,
                event_type="streak_reset",
                source_tool="system",
                rule_key=None,
                points_delta=0,
                event_metadata={
                    "old_streak": old_streak,
                    "reason": "daily_threshold_not_met",
                    "date": str(today_ist),
                },
            )
            db.add(event)
            reset_count += 1

            logger.info(
                "[STREAK_RESET] student_id=%s old_streak=%s",
                user.id, old_streak,
            )

        db.flush()
        return {"reset_count": reset_count, "skipped_count": skipped_count}

    # ───────── Internals ─────────

    def _record_streak_event(self, db, student_id: int, new_streak: int):
        """Write a streak_incremented event (0 points, just for history)."""
        from reward_models import RewardEvent
        event = RewardEvent(
            student_id=student_id,
            event_type="streak_incremented",
            source_tool="system",
            rule_key=None,
            points_delta=0,
            event_metadata={"streak_days": new_streak, "streak": new_streak},
        )
        db.add(event)

    def _award_milestone(self, db, student_id: int, streak: int) -> List[Dict]:
        """Award streak milestone bonus points via the RewardEngine. Returns list of badges unlocked."""
        rule_key = _MILESTONE_RULE_MAP.get(streak)
        if not rule_key:
            return []

        from reward_engine import reward_engine
        result = reward_engine.record_event(
            db=db,
            student_id=student_id,
            event_type="streak_milestone_reached",
            source_tool="system",
            rule_key=rule_key,
            metadata={"milestone": streak},
        )
        logger.info(
            "[STREAK_MILESTONE] student_id=%s milestone=%s rule_key=%s",
            student_id, streak, rule_key,
        )
        return result.badges_unlocked if result else []


# Singleton
streak_service = StreakService()
