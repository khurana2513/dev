"""
Daily subscription expiry checker.
Schedule: Every day at 00:05 IST.
Moves active → grace and grace → expired subscriptions.
Idempotent: safe to re-run multiple times.
"""
import logging
from datetime import datetime, time as dtime
import threading
import time as time_module

from models import SessionLocal
from subscription_service import process_expirations
from timezone_utils import get_ist_now
from sqlalchemy import text

logger = logging.getLogger(__name__)

_scheduler_thread: threading.Thread | None = None
_ADVISORY_LOCK_ID = 910001


def _acquire_scheduler_lock(db) -> bool:
    """Use Postgres advisory locks so only one app instance runs the job."""
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return True
    return bool(db.execute(text("SELECT pg_try_advisory_lock(:lock_id)"), {"lock_id": _ADVISORY_LOCK_ID}).scalar())


def _release_scheduler_lock(db) -> None:
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    db.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": _ADVISORY_LOCK_ID})
    db.commit()


def run_expiry_check() -> None:
    """Run the expiry check in its own DB session."""
    logger.info("[EXPIRY] Running subscription expiry check")
    db = SessionLocal()
    try:
        if not _acquire_scheduler_lock(db):
            logger.info("[EXPIRY] Skipping run; another instance holds the scheduler lock")
            return
        to_grace, to_expired = process_expirations(db)
        logger.info(
            "[EXPIRY] Done: %d → grace, %d → expired",
            to_grace, to_expired
        )
    except Exception as e:
        logger.exception("[EXPIRY] Error during expiry check: %s", e)
    finally:
        try:
            _release_scheduler_lock(db)
        except Exception:
            logger.exception("[EXPIRY] Failed to release scheduler lock")
        db.close()


def _scheduler_loop() -> None:
    """Background loop that fires at 00:05 IST every day."""
    TARGET_HOUR, TARGET_MINUTE = 0, 5

    while True:
        try:
            now_ist = get_ist_now()
            target_today = now_ist.replace(
                hour=TARGET_HOUR, minute=TARGET_MINUTE, second=0, microsecond=0
            )

            if now_ist >= target_today:
                # Already past today's window — schedule for tomorrow
                from datetime import timedelta
                target_today += timedelta(days=1)

            sleep_seconds = (target_today - now_ist).total_seconds()
            logger.info("[EXPIRY-SCHEDULER] Next run in %.0fs (%s IST)", sleep_seconds, target_today.strftime("%Y-%m-%d %H:%M"))
            time_module.sleep(max(sleep_seconds, 1))

            run_expiry_check()

        except Exception as e:
            logger.exception("[EXPIRY-SCHEDULER] Unexpected error: %s", e)
            time_module.sleep(60)  # Back off and retry


def start_expiry_scheduler() -> None:
    """Start the background expiry scheduler thread (call once on app startup)."""
    global _scheduler_thread
    if _scheduler_thread and _scheduler_thread.is_alive():
        logger.info("[EXPIRY-SCHEDULER] Already running")
        return

    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        name="subscription-expiry-scheduler",
        daemon=True,  # Dies when main process exits
    )
    _scheduler_thread.start()
    logger.info("[EXPIRY-SCHEDULER] Started")
