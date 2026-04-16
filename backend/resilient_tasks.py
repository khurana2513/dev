"""Resilient background task execution with retries and error recovery.

✓ OPTIMIZED: Tasks run in daemon threads (non-blocking) instead of synchronously.
✓ Previous behavior: enqueue_task() blocked the HTTP response for 5-35+ seconds.
✓ New behavior: enqueue_task() returns immediately, task runs in background thread.
"""

from typing import Callable, Any, Optional, Dict
from datetime import datetime, timedelta
from enum import Enum
import logging
import json
import time
import threading
from uuid import uuid4

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Background task status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


class BackgroundTask:
    """Resilient background task with retry logic."""
    
    def __init__(
        self,
        func: Callable,
        task_id: Optional[str] = None,
        max_retries: int = 2,
        retry_delay_seconds: int = 2,
        timeout_seconds: int = 60,
        exp_backoff: bool = True
    ):
        self.func = func
        self.task_id = task_id or str(uuid4())
        self.max_retries = max_retries
        self.retry_delay_seconds = retry_delay_seconds
        self.timeout_seconds = timeout_seconds
        self.exp_backoff = exp_backoff
        
        self.status = TaskStatus.PENDING
        self.attempt = 0
        self.last_error = None
        self.created_at = datetime.utcnow()
        self.started_at = None
        self.completed_at = None
        self.result = None
    
    def execute(self, *args, **kwargs) -> bool:
        """Execute task with automatic retries on failure."""
        while self.attempt <= self.max_retries:
            try:
                self.status = TaskStatus.RUNNING
                self.started_at = datetime.utcnow()
                
                logger.info(
                    f"🔄 [TASK] {self.task_id}: Starting (attempt {self.attempt + 1}/{self.max_retries + 1})"
                )
                
                self.result = self.func(*args, **kwargs)
                
                self.status = TaskStatus.SUCCESS
                self.completed_at = datetime.utcnow()
                elapsed = (self.completed_at - self.started_at).total_seconds()
                logger.info(f"✅ [TASK] {self.task_id}: Completed in {elapsed:.2f}s")
                return True
                
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"❌ [TASK] {self.task_id}: Error - {str(e)}")
                
                if self.attempt < self.max_retries:
                    self.attempt += 1
                    self.status = TaskStatus.RETRYING
                    
                    if self.exp_backoff:
                        delay = self.retry_delay_seconds * (2 ** (self.attempt - 1))
                    else:
                        delay = self.retry_delay_seconds
                    
                    # Cap delay at 10s to avoid long blocks
                    delay = min(delay, 10)
                    
                    logger.warning(
                        f"⚠️  [TASK] {self.task_id}: Retrying in {delay}s "
                        f"(attempt {self.attempt + 1}/{self.max_retries + 1})"
                    )
                    time.sleep(delay)
                else:
                    self.status = TaskStatus.FAILED
                    self.completed_at = datetime.utcnow()
                    logger.error(
                        f"🔴 [TASK] {self.task_id}: Failed after {self.max_retries + 1} attempts"
                    )
                    return False
        
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary for logging/monitoring."""
        duration = None
        if self.started_at and self.completed_at:
            duration = (self.completed_at - self.started_at).total_seconds()
        
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "attempt": self.attempt,
            "max_retries": self.max_retries,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": duration,
            "last_error": self.last_error,
            "result": str(self.result) if self.result else None
        }


class TaskQueue:
    """Thread-safe task queue that runs tasks in background threads."""
    
    def __init__(self):
        self.tasks: Dict[str, BackgroundTask] = {}
        self._lock = threading.Lock()
    
    def enqueue(
        self,
        func: Callable,
        *args,
        max_retries: int = 2,
        retry_delay: int = 2,
        **kwargs
    ) -> str:
        """Enqueue a background task — runs in a daemon thread (non-blocking).
        
        ✓ FIXED: Previously called task.execute() synchronously, blocking the HTTP response.
        ✓ Now spawns a daemon thread so the caller returns immediately.
        ✓ Auto-cleans completed tasks older than 5 minutes to prevent unbounded memory growth.
        """
        task = BackgroundTask(
            func=func,
            max_retries=max_retries,
            retry_delay_seconds=retry_delay
        )
        
        with self._lock:
            self.tasks[task.task_id] = task
            # Opportunistic cleanup — remove completed tasks older than 5 minutes
            # so the dict never grows unbounded over days of uptime.
            cutoff = datetime.utcnow() - timedelta(minutes=5)
            stale = [
                tid for tid, t in self.tasks.items()
                if t.completed_at and t.completed_at < cutoff
            ]
            for tid in stale:
                del self.tasks[tid]
        
        # Run in background thread (non-blocking)
        thread = threading.Thread(
            target=self._run_task,
            args=(task, args, kwargs),
            daemon=True,
            name=f"task-{task.task_id[:8]}"
        )
        thread.start()
        
        logger.info(f"📋 [QUEUE] Enqueued task {task.task_id[:8]} → background thread")
        return task.task_id
    
    def _run_task(self, task: BackgroundTask, args: tuple, kwargs: dict) -> None:
        """Execute task in background thread with error handling."""
        try:
            task.execute(*args, **kwargs)
        except Exception as e:
            logger.error(f"Unhandled error in task {task.task_id}: {e}")
            task.status = TaskStatus.FAILED
            task.last_error = str(e)
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task status.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task status dictionary or None if not found
        """
        task = self.tasks.get(task_id)
        return task.to_dict() if task else None
    
    def cleanup_completed(self, older_than_hours: int = 24) -> int:
        """Remove completed tasks older than specified time.
        
        Args:
            older_than_hours: Remove tasks older than this many hours
            
        Returns:
            Number of tasks removed
        """
        cutoff = datetime.utcnow() - timedelta(hours=older_than_hours)
        to_remove = [
            task_id for task_id, task in self.tasks.items()
            if task.completed_at and task.completed_at < cutoff
        ]
        
        for task_id in to_remove:
            del self.tasks[task_id]
        
        if to_remove:
            logger.info(f"🧹 [TASK] Cleaned up {len(to_remove)} completed tasks")
        
        return len(to_remove)


# Global task queue
_task_queue = TaskQueue()


def get_task_queue() -> TaskQueue:
    """Get global task queue."""
    return _task_queue


def enqueue_task(
    func: Callable,
    *args,
    max_retries: int = 3,
    **kwargs
) -> str:
    """Enqueue task in global queue.
    
    Args:
        func: Function to execute
        *args: Function arguments
        max_retries: Maximum retries
        **kwargs: Function keyword arguments
        
    Returns:
        Task ID
    """
    return _task_queue.enqueue(func, *args, max_retries=max_retries, **kwargs)


def wrap_background_task(
    max_retries: int = 3,
    retry_delay: int = 5
):
    """Decorator to make function background task with retries.
    
    Example:
        @wrap_background_task(max_retries=3)
        def update_leaderboard(user_id: int):
            # This will be retried 3 times on failure
            ...
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            return enqueue_task(func, *args, max_retries=max_retries, **kwargs)
        return wrapper
    return decorator


# Pre-configured task handlers

def safe_update_leaderboard(user_id: int) -> bool:
    """Safely update leaderboard with error recovery.
    
    Args:
        user_id: User ID to update
        
    Returns:
        True if successful
    """
    try:
        from leaderboard_service import update_leaderboard
        update_leaderboard(user_id)
        logger.info(f"✅ [LEADERBOARD] Updated for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"❌ [LEADERBOARD] Failed for user {user_id}: {e}")
        raise


def safe_update_weekly_leaderboard(user_id: int) -> bool:
    """Safely update weekly leaderboard with error recovery.
    
    Args:
        user_id: User ID to update
        
    Returns:
        True if successful
    """
    try:
        from leaderboard_service import update_weekly_leaderboard
        update_weekly_leaderboard(user_id)
        logger.info(f"✅ [WEEKLY_LEADERBOARD] Updated for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"❌ [WEEKLY_LEADERBOARD] Failed for user {user_id}: {e}")
        raise
