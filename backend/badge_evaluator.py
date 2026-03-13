"""
Badge Evaluator — evaluates badge eligibility after every reward event.

Badge evaluation_rule JSON format (stored in badge_definitions):
  {
    "type": "<evaluator_type>",
    "threshold": <int>,
    ...extra params
  }

Supported evaluator types:
  • cumulative_correct_count — total correct answers across all tools
  • streak_milestone         — User.current_streak ≥ threshold
  • multi_tool_same_day      — used ≥N distinct source_tools in the same IST day
  • manual_only              — only awarded via admin (attendance, etc.)
"""

import logging
from datetime import timedelta, datetime, time
from typing import List, Dict, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import User, Attempt, PracticeSession, PaperAttempt
from reward_models import (
    BadgeDefinition,
    StudentBadgeAward,
    RewardEvent,
)
from timezone_utils import get_ist_now, IST_TIMEZONE, ist_to_utc

logger = logging.getLogger(__name__)


class BadgeEvaluator:
    """Evaluates and auto-awards badges after each reward event."""

    # Cache of badge definitions (refreshed periodically or on admin changes)
    _cache: Optional[List[BadgeDefinition]] = None
    _cache_ts: Optional[datetime] = None
    _CACHE_TTL_SECONDS = 300  # 5 minutes

    def evaluate(self, db: Session, student_id: int) -> List[dict]:
        """
        Evaluate all active, non-secret, non-manual badges for a student.
        Returns list of newly-awarded badge dicts (for frontend cinematic):
          [{"badge_key": "...", "name": "...", "tier": "...", "icon_emoji": "...", "description": "..."}]
        """
        definitions = self._get_definitions(db)
        already_awarded = self._get_awarded_keys(db, student_id)

        newly_awarded: List[dict] = []

        for badge_def in definitions:
            # Skip already-awarded, inactive, manual-only
            if badge_def.badge_key in already_awarded:
                continue
            if not badge_def.is_active:
                continue

            rule = badge_def.evaluation_rule or {}
            rule_type = rule.get("type", "manual_only")

            if rule_type == "manual_only":
                continue  # Only admin can award

            # streak_milestone uses == comparison (not >=) so only fires on the
            # exact day the milestone is reached. No mass-award risk.

            handler = self._EVALUATORS.get(rule_type)
            if not handler:
                logger.warning("Unknown evaluator type: %s for badge %s", rule_type, badge_def.badge_key)
                continue

            if handler(self, db, student_id, rule):
                # Award the badge
                self._award_badge(db, student_id, badge_def)
                newly_awarded.append({
                    "badge_key": badge_def.badge_key,
                    "name": badge_def.name,
                    "tier": badge_def.tier,
                    "icon_emoji": badge_def.icon_emoji or "",
                    "description": badge_def.description or "",
                })
                logger.info(
                    "[BADGE_AWARDED] student_id=%s badge=%s tier=%s",
                    student_id, badge_def.badge_key, badge_def.tier,
                )

        return newly_awarded

    # ──────────────────────────────────────────────────────────────────────────
    # Individual evaluator methods
    # ──────────────────────────────────────────────────────────────────────────

    def _eval_cumulative_correct(
        self, db: Session, student_id: int, rule: dict
    ) -> bool:
        """
        Award when total correct answers across ALL tools ≥ threshold.
        Counts from:
          1. attempts table (Mental Math + Burst Mode): is_correct = true
          2. paper_attempts (Practice Paper): SUM(correct_answers)
        """
        threshold = rule.get("threshold", 0)

        # Count correct from individual attempts (Mental Math + Burst Mode)
        attempt_correct = (
            db.query(func.count(Attempt.id))
            .join(PracticeSession, Attempt.session_id == PracticeSession.id)
            .filter(
                PracticeSession.user_id == student_id,
                Attempt.is_correct == True,
            )
            .scalar()
        ) or 0

        # Count correct from paper attempts (aggregate per paper)
        paper_correct = (
            db.query(func.coalesce(func.sum(PaperAttempt.correct_answers), 0))
            .filter(
                PaperAttempt.user_id == student_id,
                PaperAttempt.completed_at.isnot(None),
            )
            .scalar()
        ) or 0

        total = attempt_correct + paper_correct
        return total >= threshold

    def _eval_streak_milestone(
        self, db: Session, student_id: int, rule: dict
    ) -> bool:
        """Award exactly when User.current_streak == threshold (exact milestone match).

        Uses populate_existing() to bypass SQLAlchemy's identity-map cache, which
        would otherwise return the pre-UPDATE stale value when streak_service uses
        a Core sa_update that doesn't expire the ORM object.

        Using == instead of >= prevents all lower-milestone badges from firing at
        once when a high streak is first evaluated after the reward system was added.

        NOTE: badge_definitions stores the day count under the key "streak_days"
        (not "threshold"), so we check both keys for forward/backward compatibility.
        """
        # "streak_days" is the actual key in badge_definitions.evaluation_rule.
        # "threshold" is kept as a fallback for any legacy or hand-crafted rules.
        threshold = rule.get("streak_days") or rule.get("threshold", 0)
        if not threshold:
            logger.warning("streak_milestone rule has no streak_days/threshold: %s", rule)
            return False
        # populate_existing() forces a fresh SELECT from the DB,
        # bypassing the SQLAlchemy identity map cache.
        user = (
            db.query(User)
            .populate_existing()
            .filter(User.id == student_id)
            .first()
        )
        if not user:
            return False
        return user.current_streak == threshold

    def _eval_multi_tool_same_day(
        self, db: Session, student_id: int, rule: dict
    ) -> bool:
        """
        Award when student used ≥N distinct source_tools on the same IST day.
        Checks today's reward events.
        """
        threshold = rule.get("threshold", 2)
        today_ist = get_ist_now().date()
        ist_start = datetime.combine(today_ist, time.min).replace(tzinfo=IST_TIMEZONE)
        ist_end = datetime.combine(today_ist + timedelta(days=1), time.min).replace(tzinfo=IST_TIMEZONE)
        utc_start = ist_to_utc(ist_start)
        utc_end = ist_to_utc(ist_end)

        distinct_tools = (
            db.query(func.count(func.distinct(RewardEvent.source_tool)))
            .filter(
                RewardEvent.student_id == student_id,
                RewardEvent.event_type == "session_completed",
                RewardEvent.is_voided == False,
                RewardEvent.event_timestamp >= utc_start,
                RewardEvent.event_timestamp < utc_end,
            )
            .scalar()
        ) or 0

        return distinct_tools >= threshold

    # ──────────────────────────────────────────────────────────────────────────
    # Admin-triggered badge management
    # ──────────────────────────────────────────────────────────────────────────

    def admin_grant_badge(
        self,
        db: Session,
        student_id: int,
        badge_key: str,
        admin_id: int,
    ) -> Optional[dict]:
        """
        Admin manually grants a badge.  Works for both manual_only and
        auto-evaluated badges.  Returns badge dict or None if already awarded.
        """
        badge_def = (
            db.query(BadgeDefinition)
            .filter(BadgeDefinition.badge_key == badge_key)
            .first()
        )
        if not badge_def:
            return None

        already = self._get_awarded_keys(db, student_id)
        if badge_key in already:
            return None

        self._award_badge(db, student_id, badge_def, awarded_by=admin_id)

        # Record event
        event = RewardEvent(
            student_id=student_id,
            event_type="admin_badge_granted",
            source_tool="admin",
            rule_key=None,
            points_delta=0,
            event_metadata={
                "badge_key": badge_key,
                "admin_id": admin_id,
            },
            created_by=admin_id,
        )
        db.add(event)
        db.flush()

        return {
            "badge_key": badge_def.badge_key,
            "name": badge_def.name,
            "tier": badge_def.tier,
            "icon_emoji": badge_def.icon_emoji or "",
            "description": badge_def.description or "",
        }

    def admin_revoke_badge(
        self,
        db: Session,
        student_id: int,
        badge_key: str,
        admin_id: int,
        reason: str,
    ) -> bool:
        """
        Soft-revoke a badge (set is_active=False).
        Returns True if badge was found and revoked.
        """
        from timezone_utils import get_utc_now

        badge_def = (
            db.query(BadgeDefinition)
            .filter(BadgeDefinition.badge_key == badge_key)
            .first()
        )
        if not badge_def:
            return False

        award = (
            db.query(StudentBadgeAward)
            .filter(
                StudentBadgeAward.student_id == student_id,
                StudentBadgeAward.badge_id == badge_def.id,
                StudentBadgeAward.is_active == True,
            )
            .first()
        )
        if not award:
            return False

        award.is_active = False
        award.revoked_by = admin_id
        award.revoked_at = get_utc_now()
        award.revoke_reason = reason

        # Record event
        event = RewardEvent(
            student_id=student_id,
            event_type="admin_badge_revoked",
            source_tool="admin",
            rule_key=None,
            points_delta=0,
            event_metadata={
                "badge_key": badge_key,
                "admin_id": admin_id,
                "reason": reason,
            },
            created_by=admin_id,
        )
        db.add(event)
        db.flush()

        logger.info(
            "[BADGE_REVOKED] student_id=%s badge=%s admin=%s reason=%s",
            student_id, badge_key, admin_id, reason,
        )
        return True

    # ──────────────────────────────────────────────────────────────────────────
    # Cache
    # ──────────────────────────────────────────────────────────────────────────

    def invalidate_cache(self):
        """Call after admin creates/updates badge definitions."""
        self._cache = None
        self._cache_ts = None

    def _get_definitions(self, db: Session) -> List[BadgeDefinition]:
        """Get all active badge definitions (cached, session-detached).

        ORM instances are expunged from the originating session immediately
        after loading so that their column attributes remain accessible after
        the session is committed/closed.  Without expunge(), SQLAlchemy
        expires all attributes on commit and later access raises
        DetachedInstanceError.
        """
        now = datetime.utcnow()
        if (
            self._cache is not None
            and self._cache_ts is not None
            and (now - self._cache_ts).total_seconds() < self._CACHE_TTL_SECONDS
        ):
            return self._cache

        rows = (
            db.query(BadgeDefinition)
            .filter(BadgeDefinition.is_active == True)
            .order_by(BadgeDefinition.display_order)
            .all()
        )
        # Detach from session while data is still loaded (not expired).
        # This prevents DetachedInstanceError on subsequent requests that use
        # a different session.
        for r in rows:
            db.expunge(r)
        self._cache = rows
        self._cache_ts = now
        return self._cache

    def _get_awarded_keys(self, db: Session, student_id: int) -> set:
        """Return set of badge_keys already awarded (active) to this student."""
        rows = (
            db.query(BadgeDefinition.badge_key)
            .join(StudentBadgeAward, StudentBadgeAward.badge_id == BadgeDefinition.id)
            .filter(
                StudentBadgeAward.student_id == student_id,
                StudentBadgeAward.is_active == True,
            )
            .all()
        )
        return {r[0] for r in rows}

    def _award_badge(
        self,
        db: Session,
        student_id: int,
        badge_def: BadgeDefinition,
        awarded_by: Optional[int] = None,
    ):
        """Insert a StudentBadgeAward row."""
        from timezone_utils import get_utc_now

        # Column is String(50), NOT NULL — convert int/None to proper string
        awarded_by_str = "system" if awarded_by is None else f"admin:{awarded_by}"

        award = StudentBadgeAward(
            student_id=student_id,
            badge_id=badge_def.id,
            awarded_at=get_utc_now(),
            awarded_by=awarded_by_str,
            is_active=True,
        )
        db.add(award)

        # Record badge_earned event (0 points, for history)
        event = RewardEvent(
            student_id=student_id,
            event_type="badge_earned",
            source_tool="system" if awarded_by is None else "admin",
            rule_key=None,
            points_delta=0,
            event_metadata={
                "badge_key": badge_def.badge_key,
                "badge_name": badge_def.name,
                "tier": badge_def.tier,
                "awarded_by": awarded_by,
            },
        )
        db.add(event)
        db.flush()

    # ──────────────────────────────────────────────────────────────────────────
    # Evaluator registry
    # ──────────────────────────────────────────────────────────────────────────

    def _eval_cumulative_points(
        self, db: Session, student_id: int, rule: dict
    ) -> bool:
        """
        Award when User.total_points >= threshold.
        Used for the SUPER Journey milestones (chocolate, letters, mystery gift, party).
        """
        threshold = rule.get("threshold", 0)
        if not threshold:
            return False
        user = (
            db.query(User)
            .populate_existing()
            .filter(User.id == student_id)
            .first()
        )
        if not user:
            return False
        return (user.total_points or 0) >= threshold

    _EVALUATORS = {
        "cumulative_correct_count": _eval_cumulative_correct,
        "streak_milestone": _eval_streak_milestone,
        "multi_tool_same_day": _eval_multi_tool_same_day,
        "cumulative_points": _eval_cumulative_points,
    }


# Singleton
badge_evaluator = BadgeEvaluator()
