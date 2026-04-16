"""
Exam Scheduler — background thread that handles automatic exam lifecycle transitions.

Jobs (run every 30 seconds):
  1. Auto-publish:  Draft exams whose scheduled_start_at is ≤ 5 minutes away
                    → status: draft   → published
  2. Auto-start:    Published/Draft exams whose scheduled_start_at has passed
                    → status: published → live  (same logic as POST /exam/{code}/admin/start)
  3. Auto-end:      Live exams whose scheduled_end_at has passed
                    → status: live    → ended  (force-submits all active sessions)

Design:
  - Uses the same advisory-lock pattern as streak_scheduler to ensure only one
    app instance runs the job at a time (safe on Railway multi-instance deploys).
  - Operates in its own DB session; commits each exam independently so a failure
    on one exam does not roll back the others.
  - All times are UTC naive (consistent with the rest of the exam system).
"""
import asyncio
import logging
import threading
import time as time_module
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from models import SessionLocal
from timezone_utils import get_utc_now

logger = logging.getLogger(__name__)

_scheduler_thread: threading.Thread | None = None
_ADVISORY_LOCK_ID = 920001   # unique integer for this scheduler
POLL_INTERVAL_SECONDS = 30
AUTO_PUBLISH_LEAD_MINUTES = 5   # publish this many minutes before scheduled start


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _acquire_lock(db) -> bool:
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return True
    return bool(
        db.execute(
            text("SELECT pg_try_advisory_lock(:id)"), {"id": _ADVISORY_LOCK_ID}
        ).scalar()
    )


def _release_lock(db) -> None:
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    db.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": _ADVISORY_LOCK_ID})
    db.commit()


# ── helpers ────────────────────────────────────────────────────────────────────

def _publish_exam(exam, db: Session, now: datetime) -> None:
    """Transition draft → published."""
    exam.status = "published"
    exam.is_published = True
    db.commit()
    logger.info("[EXAM-SCHED] auto-published code=%s", exam.exam_code)


def _start_exam(exam, db: Session, now: datetime) -> None:
    """Transition (draft|published) → live, activating all waiting sessions."""
    from exam_models import ExamSession

    deadline = datetime.fromtimestamp(
        now.timestamp() + exam.duration_seconds, tz=timezone.utc
    ).replace(tzinfo=None)

    waiting = (
        db.query(ExamSession)
        .filter(
            ExamSession.exam_paper_id == exam.id,
            ExamSession.status == "waiting",
        )
        .all()
    )
    for sess in waiting:
        sess.status = "active"
        sess.exam_started_at = now
        sess.server_deadline = deadline

    exam.status = "live"
    exam.is_published = True
    exam.actual_started_at = now
    # Keep scheduled_start_at in sync so grading seed and records remain consistent
    exam.scheduled_start_at = now
    db.commit()

    # Fire SSE event on the running event-loop (if available)
    try:
        from exam_routes import _broadcast
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(
                _broadcast(exam.exam_code, {
                    "type": "exam_started",
                    "server_time_utc": now.isoformat(),
                    "deadline_utc": deadline.isoformat(),
                    "auto_started": True,
                }),
                loop,
            )
    except Exception as exc:
        logger.warning("[EXAM-SCHED] Could not broadcast exam_started for %s: %s", exam.exam_code, exc)

    logger.info(
        "[EXAM-SCHED] auto-started code=%s sessions_activated=%s",
        exam.exam_code, len(waiting),
    )


def _end_exam(exam, db: Session, now: datetime) -> None:
    """Transition live → ended, force-submitting all active sessions."""
    from exam_models import ExamSession, ExamEvent

    active = (
        db.query(ExamSession)
        .filter(
            ExamSession.exam_paper_id == exam.id,
            ExamSession.status == "active",
        )
        .all()
    )
    for sess in active:
        if sess.exam_started_at:
            sess.time_used_seconds = (now - sess.exam_started_at).total_seconds()
        sess.status = "auto_submitted"
        sess.submitted_at = now
        sess.force_submitted = True
        db.add(
            ExamEvent(
                session_id=sess.id,
                event_type="auto_submitted",
                payload={"reason": "scheduled_end_time_reached"},
                occurred_at=now,
            )
        )

    exam.status = "ended"
    exam.actual_ended_at = now
    db.commit()

    # Broadcast force_submit to any still-connected clients
    try:
        from exam_routes import _broadcast
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(
                _broadcast(exam.exam_code, {
                    "type": "force_submit",
                    "reason": "time_expired",
                }),
                loop,
            )
    except Exception as exc:
        logger.warning("[EXAM-SCHED] Could not broadcast force_submit for %s: %s", exam.exam_code, exc)

    logger.info(
        "[EXAM-SCHED] auto-ended code=%s force_submitted=%s",
        exam.exam_code, len(active),
    )


# ── main job ──────────────────────────────────────────────────────────────────

def run_exam_scheduler_tick() -> None:
    """
    Single tick:  evaluate all exams that need a state transition and apply them.
    Safe to call multiple times (idempotent).
    """
    db: Session = SessionLocal()
    try:
        if not _acquire_lock(db):
            logger.debug("[EXAM-SCHED] lock held by another instance — skipping tick")
            return

        now = _utc_now()
        publish_threshold = now + timedelta(minutes=AUTO_PUBLISH_LEAD_MINUTES)

        from exam_models import ExamPaper

        # 1. Auto-publish drafts that are ≤ AUTO_PUBLISH_LEAD_MINUTES away
        drafts_to_publish = (
            db.query(ExamPaper)
            .filter(
                ExamPaper.status == "draft",
                ExamPaper.scheduled_start_at <= publish_threshold,
            )
            .all()
        )
        for exam in drafts_to_publish:
            try:
                _publish_exam(exam, db, now)
            except Exception:
                logger.exception("[EXAM-SCHED] publish failed for code=%s", exam.exam_code)
                db.rollback()

        # 2. Auto-start exams whose start time has arrived
        to_start = (
            db.query(ExamPaper)
            .filter(
                ExamPaper.status.in_(["draft", "published"]),
                ExamPaper.scheduled_start_at <= now,
            )
            .all()
        )
        for exam in to_start:
            try:
                _start_exam(exam, db, now)
            except Exception:
                logger.exception("[EXAM-SCHED] start failed for code=%s", exam.exam_code)
                db.rollback()

        # 3. Auto-end live exams that have passed their scheduled_end_at
        to_end = (
            db.query(ExamPaper)
            .filter(
                ExamPaper.status == "live",
                ExamPaper.scheduled_end_at <= now,
            )
            .all()
        )
        for exam in to_end:
            try:
                _end_exam(exam, db, now)
            except Exception:
                logger.exception("[EXAM-SCHED] end failed for code=%s", exam.exam_code)
                db.rollback()

    except Exception:
        logger.exception("[EXAM-SCHED] unexpected error in tick")
    finally:
        try:
            _release_lock(db)
        except Exception:
            logger.exception("[EXAM-SCHED] failed to release lock")
        db.close()


# ── background thread ─────────────────────────────────────────────────────────

def _scheduler_loop() -> None:
    """Runs forever, firing run_exam_scheduler_tick every POLL_INTERVAL_SECONDS."""
    logger.info("[EXAM-SCHED] background thread started (interval=%ds)", POLL_INTERVAL_SECONDS)
    while True:
        try:
            run_exam_scheduler_tick()
        except Exception:
            logger.exception("[EXAM-SCHED] error in scheduler loop")
        time_module.sleep(POLL_INTERVAL_SECONDS)


def start_exam_scheduler() -> None:
    """Start the background scheduler thread (call once from main.py startup)."""
    global _scheduler_thread
    if _scheduler_thread and _scheduler_thread.is_alive():
        logger.info("[EXAM-SCHED] already running")
        return
    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        daemon=True,
        name="exam-scheduler",
    )
    _scheduler_thread.start()
    logger.info("[EXAM-SCHED] started")
