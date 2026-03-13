"""
Nightly streak reset scheduler.
Schedule: Every day at 00:05 IST.
Resets current_streak to 0 for any student who did NOT meet the daily
qualifying-question threshold on the day that just ended.
Idempotent: safe to re-run multiple times.
"""

import logging
import threading
import time as time_module
from datetime import timedelta

from models import SessionLocal
from timezone_utils import get_ist_now

logger = logging.getLogger(__name__)

_scheduler_thread: threading.Thread | None = None

# Fire at 00:05 IST — 5 minutes after IST midnight so the day has fully turned.
TARGET_HOUR = 0
TARGET_MINUTE = 5


def run_streak_reset() -> None:
    """Run the nightly streak reset in its own DB session."""
    logger.info("[STREAK-SCHEDULER] Running nightly streak reset")
    db = SessionLocal()
    try:
        from reward_scheduler import run_nightly_streak_reset
        result = run_nightly_streak_reset(db)
        logger.info(
            "[STREAK-SCHEDULER] Done: reset=%d skipped=%d",
            result.get("reset_count", 0),
            result.get("skipped_count", 0),
        )
    except Exception as e:
        logger.exception("[STREAK-SCHEDULER] Error during streak reset: %s", e)
    finally:
        db.close()


def _scheduler_loop() -> None:
    """Background thread: sleeps until 00:05 IST then fires, then repeats."""
    while True:
        try:
            now_ist = get_ist_now()
            target_today = now_ist.replace(
                hour=TARGET_HOUR, minute=TARGET_MINUTE, second=0, microsecond=0
            )

            if now_ist >= target_today:
                # Already past today's window — aim for tomorrow
                target_today += timedelta(days=1)

            sleep_seconds = (target_today - now_ist).total_seconds()
            logger.info(
                "[STREAK-SCHEDULER] Next run in %.0fs (%s IST)",
                sleep_seconds,
                target_today.strftime("%Y-%m-%d %H:%M"),
            )
            time_module.sleep(max(sleep_seconds, 1))

            run_streak_reset()

        except Exception as e:
            logger.exception("[STREAK-SCHEDULER] Unexpected error: %s", e)
            time_module.sleep(60)  # back off and retry


def start_streak_scheduler() -> None:
    """Start the background streak-reset scheduler thread (call once on startup)."""
    global _scheduler_thread
    if _scheduler_thread and _scheduler_thread.is_alive():
        logger.info("[STREAK-SCHEDULER] Already running")
        return

    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        name="streak-nightly-reset-scheduler",
        daemon=True,  # dies when main process exits
    )
    _scheduler_thread.start()
    logger.info("[STREAK-SCHEDULER] Started (fires daily at %02d:%02d IST)", TARGET_HOUR, TARGET_MINUTE)
