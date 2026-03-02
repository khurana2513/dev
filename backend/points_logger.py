"""
Points logging utility - tracks all point transactions for audit and checksum.
"""
from sqlalchemy.orm import Session
from models import PointsLog, User
from typing import Optional, Dict, Any
from timezone_utils import get_ist_now


def log_points(
    db: Session,
    user: User,
    points: int,
    source_type: str,
    description: str,
    source_id: Optional[int] = None,
    extra_data: Optional[Dict[str, Any]] = None
) -> PointsLog:
    """
    Log a points transaction.
    
    Args:
        db: Database session
        user: User receiving/spending points
        points: Points amount (positive for earned, negative for spent)
        source_type: Type of transaction (e.g., "daily_login", "mental_math", "paper_attempt", "streak_bonus", "admin_adjustment", "grace_skip")
        description: Human-readable description
        source_id: Optional ID of related record (session_id, attempt_id, etc.)
        extra_data: Optional additional context (JSON)
    
    Returns:
        Created PointsLog entry
    """
    points_log = PointsLog(
        user_id=user.id,
        points=points,
        source_type=source_type,
        description=description,
        source_id=source_id,
        extra_data=extra_data or {}
    )
    db.add(points_log)
    return points_log


def get_points_summary(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Get points summary for a user (checksum verification).
    
    Returns:
        Dict with total_points_from_logs and total_points_from_user for comparison
    """
    from sqlalchemy import func
    
    # Sum all points from logs
    total_from_logs = db.query(func.sum(PointsLog.points)).filter(
        PointsLog.user_id == user_id
    ).scalar() or 0
    
    # Get current user points
    user = db.query(User).filter(User.id == user_id).first()
    total_from_user = user.total_points if user else 0
    
    return {
        "total_points_from_logs": int(total_from_logs),
        "total_points_from_user": total_from_user,
        "match": total_from_logs == total_from_user
    }
