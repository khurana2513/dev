"""
Reward Engine — core service for writing reward events and updating caches.

Integration strategy:
  • The existing code in user_routes.py and main.py already handles per-question
    point resolution (PointRuleEngine) and atomic User.total_points increment.
  • This engine writes events to `reward_events` as a PARALLEL LEDGER:
      – `record_session_completed()`: writes ONE event per session with the total
        points_delta.  Does NOT increment User.total_points (caller already did).
      – `record_event()`: writes events for BONUS points (daily login, burst
        completion, streak milestones, monthly rank) and DOES increment
        User.total_points.
  • Rebuild: SUM(all non-voided events) == User.total_points.  This works because
    session events carry the exact points the caller already added, and bonus
    events carry the points this engine adds.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from datetime import datetime, date

from sqlalchemy.orm import Session
from sqlalchemy import update as sa_update, func

from models import User
from reward_models import RewardRule, RewardEvent
from timezone_utils import get_utc_now, get_ist_now

logger = logging.getLogger(__name__)


@dataclass
class RecordEventResult:
    """Result of recording a reward event."""
    points_awarded: int = 0
    badges_unlocked: List[dict] = field(default_factory=list)
    streak_updated: bool = False
    event_id: Optional[int] = None


class RewardEngine:
    """
    Core event-writing engine.

    Usage patterns:
      1. record_session_completed()  — after existing code awards points
      2. record_event()              — login, burst bonus, streak milestones
      3. admin_adjust_points()       — admin manual add/deduct
    """

    def __init__(self) -> None:
        self._streak_service = None
        self._badge_evaluator = None

    @property
    def streak_service(self):
        if self._streak_service is None:
            from streak_service import streak_service
            self._streak_service = streak_service
        return self._streak_service

    @property
    def badge_evaluator(self):
        if self._badge_evaluator is None:
            from badge_evaluator import badge_evaluator
            self._badge_evaluator = badge_evaluator
        return self._badge_evaluator

    # ──────────────────────────────────────────────────────────────────────────
    # Session completed — single event per session / paper
    # ──────────────────────────────────────────────────────────────────────────

    def record_session_completed(
        self,
        db: Session,
        student_id: int,
        source_tool: str,
        points_earned: int,
        correct_answers: int,
        metadata: Optional[Dict] = None,
    ) -> RecordEventResult:
        """
        Write ONE event for the entire session/paper.
        Does NOT increment User.total_points — the caller already did that.

        SKIP ENTIRELY if config_mode == 'custom'.
        Tables (1×1) writes event with points_delta=0.

        Returns badges newly unlocked (for frontend cinematic).
        """
        meta = metadata or {}

        # Custom config → no reward events at all
        if meta.get("config_mode") == "custom":
            return RecordEventResult(points_awarded=0)

        event = RewardEvent(
            student_id=student_id,
            event_type="session_completed",
            source_tool=source_tool,
            rule_key=None,
            points_delta=points_earned,
            event_metadata={
                **meta,
                "correct_answers": correct_answers,
            },
        )
        db.add(event)
        db.flush()

        # Check streak (will increment once per IST day when threshold met).
        # Returns (updated: bool, milestone_badges: List[dict]) — milestone badges
        # are awarded inside check_and_update and must be merged here so they
        # reach the caller; a second evaluate() call below would find them already
        # in the awarded-set and not return them again.
        streak_updated, milestone_badges = self.streak_service.check_and_update(db, student_id)

        # Evaluate session-level badges (cumulative_correct, multi_tool_same_day, etc.)
        session_badges = self.badge_evaluator.evaluate(db, student_id)

        # Deduplicate: milestone_badges take priority, skip any overlap from session_badges
        awarded_keys = {b["badge_key"] for b in milestone_badges}
        unique_session_badges = [b for b in session_badges if b["badge_key"] not in awarded_keys]
        badges_unlocked = milestone_badges + unique_session_badges

        return RecordEventResult(
            points_awarded=points_earned,
            badges_unlocked=badges_unlocked,
            streak_updated=streak_updated,
            event_id=event.id,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Bonus event recording (login, burst bonus, streak milestones)
    # These DO increment User.total_points.
    # ──────────────────────────────────────────────────────────────────────────

    def record_event(
        self,
        db: Session,
        student_id: int,
        event_type: str,
        source_tool: str,
        rule_key: Optional[str],
        metadata: Optional[Dict] = None,
        points_override: Optional[int] = None,
    ) -> RecordEventResult:
        """
        For bonus events: login, burst completion, streak milestones.
        Looks up points from reward_rules by rule_key, or uses points_override.
        DOES increment User.total_points.
        """
        points = 0
        if points_override is not None:
            points = points_override
        elif rule_key:
            rule = self._get_rule(db, rule_key)
            points = rule.points_awarded if rule else 0

        event = RewardEvent(
            student_id=student_id,
            event_type=event_type,
            source_tool=source_tool,
            rule_key=rule_key,
            points_delta=points,
            event_metadata=metadata or {},
        )
        db.add(event)

        # Atomic point increment (bonus events add their own points)
        if points != 0:
            db.execute(
                sa_update(User)
                .where(User.id == student_id)
                .values(total_points=User.total_points + points)
            )

        db.flush()

        # Evaluate badges (skip for streak_reset and snapshot events)
        badges_unlocked: List[dict] = []
        if event_type not in ("streak_reset", "monthly_snapshot_created"):
            badges_unlocked = self.badge_evaluator.evaluate(db, student_id)

        return RecordEventResult(
            points_awarded=points,
            badges_unlocked=badges_unlocked,
            event_id=event.id,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Admin adjustments — increments User.total_points
    # ──────────────────────────────────────────────────────────────────────────

    def admin_adjust_points(
        self,
        db: Session,
        student_id: int,
        adjustment: int,
        reason: str,
        admin_id: int,
    ) -> RecordEventResult:
        """Admin manual add/deduct — always logged."""
        admin = db.query(User).filter(User.id == admin_id).first()
        admin_name = admin.name if admin else f"admin:{admin_id}"

        event = RewardEvent(
            student_id=student_id,
            event_type="admin_points_adjustment",
            source_tool="admin",
            rule_key=None,
            points_delta=adjustment,
            event_metadata={
                "reason": reason,
                "admin_id": admin_id,
                "admin_name": admin_name,
            },
            created_by=admin_id,
        )
        db.add(event)

        db.execute(
            sa_update(User)
            .where(User.id == student_id)
            .values(total_points=User.total_points + adjustment)
        )
        db.flush()

        return RecordEventResult(
            points_awarded=adjustment,
            event_id=event.id,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Cache rebuild
    # ──────────────────────────────────────────────────────────────────────────

    def rebuild_user_points(self, db: Session, student_id: int) -> dict:
        """
        Recompute User.total_points from the event ledger.
        Returns { old_total, new_total, events_processed }.
        """
        user = db.query(User).filter(User.id == student_id).first()
        if not user:
            return {"old_total": 0, "new_total": 0, "events_processed": 0}

        old_total = user.total_points

        result = db.query(
            func.sum(RewardEvent.points_delta),
            func.count(RewardEvent.id),
        ).filter(
            RewardEvent.student_id == student_id,
            RewardEvent.is_voided == False,
        ).first()

        new_total = result[0] or 0
        events_processed = result[1] or 0

        db.execute(
            sa_update(User)
            .where(User.id == student_id)
            .values(total_points=new_total)
        )
        db.flush()

        logger.info(
            "[REBUILD] student_id=%s old=%s new=%s events=%s",
            student_id, old_total, new_total, events_processed,
        )
        return {
            "old_total": old_total,
            "new_total": new_total,
            "events_processed": events_processed,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Daily login bonus
    # ──────────────────────────────────────────────────────────────────────────

    def record_daily_login(self, db: Session, student_id: int) -> RecordEventResult:
        """
        Award daily login bonus if not already awarded today.
        Uses User.last_daily_login_bonus_date to de-duplicate.
        """
        user = db.query(User).filter(User.id == student_id).first()
        if not user:
            return RecordEventResult(points_awarded=0)

        today_ist = get_ist_now().date()

        if user.last_daily_login_bonus_date == today_ist:
            return RecordEventResult(points_awarded=0)  # Already awarded

        # Update last_daily_login_bonus_date
        db.execute(
            sa_update(User)
            .where(User.id == student_id)
            .values(last_daily_login_bonus_date=today_ist)
        )

        result = self.record_event(
            db=db,
            student_id=student_id,
            event_type="daily_login",
            source_tool="system",
            rule_key="daily_login",
            metadata={"date": str(today_ist)},
        )

        logger.info("[DAILY_LOGIN] student_id=%s points=%s", student_id, result.points_awarded)
        return result

    # ──────────────────────────────────────────────────────────────────────────
    # Burst Mode session completion bonus
    # ──────────────────────────────────────────────────────────────────────────

    def record_burst_completion(
        self,
        db: Session,
        student_id: int,
        score: int,
        session_id: int,
    ) -> RecordEventResult:
        """
        +15 on session completion regardless of score, even score=0.
        """
        result = self.record_event(
            db=db,
            student_id=student_id,
            event_type="burst_mode_completed",
            source_tool="burst_mode",
            rule_key="burst_mode_completed",
            metadata={"score": score, "session_id": session_id},
        )
        logger.info(
            "[BURST_COMPLETE] student_id=%s score=%s points=%s",
            student_id, score, result.points_awarded,
        )
        return result

    # ──────────────────────────────────────────────────────────────────────────
    # Internals
    # ──────────────────────────────────────────────────────────────────────────

    def _get_rule(self, db: Session, rule_key: str) -> Optional[RewardRule]:
        return db.query(RewardRule).filter(
            RewardRule.rule_key == rule_key,
            RewardRule.is_active == True,
        ).first()


# Singleton
reward_engine = RewardEngine()
