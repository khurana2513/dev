"""
Legacy Reward System — DEPRECATED.

The old reward system has been replaced by the new gamification engine:
  - reward_models.py      — new SQLAlchemy models
  - reward_engine.py      — core event writing
  - streak_service.py     — streak tracking
  - badge_evaluator.py    — badge evaluation
  - reward_scheduler.py   — nightly/monthly jobs

This file is retained for backward compatibility of any remaining imports.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from models import User, PracticeSession, PaperAttempt, AttendanceRecord, StudentProfile, ClassSession
from datetime import datetime
from timezone_utils import get_ist_now, IST_TIMEZONE
from typing import List, Optional


# ============================================================================
# POINTS ENGINE (EFFORT CURRENCY)
# ============================================================================

def calculate_points_for_attempt(
    total_questions: int,
    correct_answers: int,
    attempted_questions: int,
    is_mental_math: bool = True
) -> int:
    """
    Calculate points according to new system:
    - +1 point for each attempted question (answered, right or wrong)
    - +5 points for each correct answer
    - Total = (attempted * 1) + (correct * 5)
    
    Args:
        total_questions: Total questions in session
        correct_answers: Number of correct answers
        attempted_questions: Number of questions answered (right or wrong)
        is_mental_math: Whether this is mental math or paper attempt
    
    Returns:
        Total points earned
    """
    # Points for attempted questions
    attempted_points = attempted_questions * 1
    
    # Points for correct answers (overlaps with attempted)
    correct_points = correct_answers * 5
    
    # Total points
    total_points = attempted_points + correct_points
    
    return max(0, total_points)  # Ensure no negative points


def update_user_question_count(
    db: Session,
    user: User,
    questions_attempted: int
) -> None:
    """Update total questions attempted for lifetime badges."""
    user.total_questions_attempted = (user.total_questions_attempted or 0) + questions_attempted


# ============================================================================
# BADGE SYSTEM (QUALITY, NOT GRIND)
# ============================================================================

def check_and_award_accuracy_badges(
    db: Session,
    user: User,
    accuracy: float,
    total_questions: int,
    month_str: str
) -> List[str]:
    """
    Check and award accuracy badges (monthly).
    Returns list of awarded badge names.
    """
    awarded = []
    
    # Accuracy Ace - ≥ 90%
    if accuracy >= 90 and total_questions >= 10:
        badge_type = "accuracy_ace"
        existing = db.query(Reward).filter(
            Reward.user_id == user.id,
            Reward.badge_type == badge_type,
            Reward.month_earned == month_str
        ).first()
        
        if not existing:
            reward = Reward(
                user_id=user.id,
                badge_type=badge_type,
                badge_name="Accuracy Ace",
                badge_category="monthly",
                month_earned=month_str,
                is_lifetime=False
            )
            db.add(reward)
            awarded.append("Accuracy Ace")
    
    # Perfect Precision - 100%
    if accuracy == 100 and total_questions >= 5:
        badge_type = "perfect_precision"
        existing = db.query(Reward).filter(
            Reward.user_id == user.id,
            Reward.badge_type == badge_type,
            Reward.month_earned == month_str
        ).first()
        
        if not existing:
            reward = Reward(
                user_id=user.id,
                badge_type=badge_type,
                badge_name="Perfect Precision",
                badge_category="monthly",
                month_earned=month_str,
                is_lifetime=False
            )
            db.add(reward)
            awarded.append("Perfect Precision")
    
    return awarded


def check_and_award_improvement_badge(
    db: Session,
    user: User,
    current_month_accuracy: float,
    previous_month_accuracy: float,
    month_str: str
) -> Optional[str]:
    """
    Check and award Comeback Kid badge.
    Requires ≥ 20% improvement from last month.
    """
    if previous_month_accuracy is None or previous_month_accuracy == 0:
        return None
    
    improvement = current_month_accuracy - previous_month_accuracy
    if improvement >= 20:
        badge_type = "comeback_kid"
        existing = db.query(Reward).filter(
            Reward.user_id == user.id,
            Reward.badge_type == badge_type,
            Reward.month_earned == month_str
        ).first()
        
        if not existing:
            reward = Reward(
                user_id=user.id,
                badge_type=badge_type,
                badge_name="Comeback Kid",
                badge_category="monthly",
                month_earned=month_str,
                is_lifetime=False
            )
            db.add(reward)
            return "Comeback Kid"
    
    return None


def check_and_award_lifetime_badges(
    db: Session,
    user: User
) -> List[str]:
    """
    Check and award lifetime volume badges.
    Returns list of awarded badge names.
    """
    awarded = []
    total_attempted = user.total_questions_attempted or 0
    
    badges = [
        (500, "bronze_mind", "🥉 Bronze Mind"),
        (2000, "silver_mind", "🥈 Silver Mind"),
        (5000, "gold_mind", "🥇 Gold Mind"),
    ]
    
    for threshold, badge_type, badge_name in badges:
        if total_attempted >= threshold:
            existing = db.query(Reward).filter(
                Reward.user_id == user.id,
                Reward.badge_type == badge_type,
                Reward.is_lifetime == True
            ).first()
            
            if not existing:
                reward = Reward(
                    user_id=user.id,
                    badge_type=badge_type,
                    badge_name=badge_name,
                    badge_category="lifetime",
                    is_lifetime=True
                )
                db.add(reward)
                awarded.append(badge_name)
    
    return awarded


# ============================================================================
# ATTENDANCE ENGINE (DISCIPLINE)
# ============================================================================

def evaluate_attendance_badges(db: Session, year: int, month: int) -> None:
    """
    Monthly evaluation for attendance badges.
    Awards Attendance Champion badge for 100% attendance.
    """
    # ClassSession.session_date is DateTime (no tz), so use naive datetimes
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1)
    else:
        month_end = datetime(year, month + 1, 1)
    
    month_str = f"{year}-{month:02d}"
    
    # Get all active students
    students = db.query(StudentProfile).filter(
        StudentProfile.status == "active"
    ).all()
    
    for student in students:
        # Get all sessions for this student's branch/course in the month
        sessions = db.query(ClassSession).filter(
            ClassSession.branch == student.branch,
            ClassSession.session_date >= month_start,
            ClassSession.session_date < month_end
        ).all()
        
        if not sessions:
            continue
        
        # Get attendance records
        session_ids = [s.id for s in sessions]
        attendance_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_profile_id == student.id,
            AttendanceRecord.session_id.in_(session_ids),
            AttendanceRecord.status == "present"
        ).all()
        
        # Check if 100% attendance
        if len(attendance_records) == len(sessions):
            # Award badge
            existing = db.query(Reward).join(User).filter(
                User.id == student.user_id,
                Reward.badge_type == "attendance_champion",
                Reward.month_earned == month_str
            ).first()
            
            if not existing:
                user = db.query(User).filter(User.id == student.user_id).first()
                if user:
                    reward = Reward(
                        user_id=user.id,
                        badge_type="attendance_champion",
                        badge_name="⭐ Attendance Champion",
                        badge_category="attendance",
                        month_earned=month_str,
                        is_lifetime=False
                    )
                    db.add(reward)


# ============================================================================
# T-SHIRT STAR ENGINE (CULTURE)
# ============================================================================

def evaluate_tshirt_star_badges(db: Session, year: int, month: int) -> None:
    """
    Monthly evaluation for T-shirt star badges.
    Awards Gold T-Shirt Star Badge for all classes marked.
    """
    # ClassSession.session_date is DateTime (no tz), so use naive datetimes
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1)
    else:
        month_end = datetime(year, month + 1, 1)
    
    month_str = f"{year}-{month:02d}"
    
    # Get all active students
    students = db.query(StudentProfile).filter(
        StudentProfile.status == "active"
    ).all()
    
    for student in students:
        # Get all sessions for this student's branch/course in the month
        sessions = db.query(ClassSession).filter(
            ClassSession.branch == student.branch,
            ClassSession.session_date >= month_start,
            ClassSession.session_date < month_end
        ).all()
        
        if not sessions:
            continue
        
        # Get attendance records with T-shirt worn
        session_ids = [s.id for s in sessions]
        tshirt_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_profile_id == student.id,
            AttendanceRecord.session_id.in_(session_ids),
            AttendanceRecord.t_shirt_worn == True
        ).all()
        
        # Check if all classes marked
        if len(tshirt_records) == len(sessions):
            # Award gold badge
            existing = db.query(Reward).join(User).filter(
                User.id == student.user_id,
                Reward.badge_type == "gold_tshirt_star",
                Reward.month_earned == month_str
            ).first()
            
            if not existing:
                user = db.query(User).filter(User.id == student.user_id).first()
                if user:
                    reward = Reward(
                        user_id=user.id,
                        badge_type="gold_tshirt_star",
                        badge_name="🌟🌟 Gold T-Shirt Star",
                        badge_category="attendance",
                        month_earned=month_str,
                        is_lifetime=False
                    )
                    db.add(reward)


# ============================================================================
# LEADERBOARD BADGES
# ============================================================================

def award_leaderboard_badges(db: Session, year: int, month: int) -> None:
    """
    Award leaderboard badges to top 3 students for the month.
    """
    # ClassSession.session_date is DateTime (no tz), so use naive datetimes
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1)
    else:
        month_end = datetime(year, month + 1, 1)
    
    month_str = f"{year}-{month:02d}"
    
    # Get top 3 users by points earned this month
    # This is simplified - you may want to track monthly points separately
    top_users = db.query(User).filter(
        User.role == "student"
    ).order_by(User.total_points.desc()).limit(3).all()
    
    badges = [
        (0, "leaderboard_gold", "🥇 Leaderboard Champion"),
        (1, "leaderboard_silver", "🥈 Leaderboard Runner-up"),
        (2, "leaderboard_bronze", "🥉 Leaderboard Third Place"),
    ]
    
    for rank, badge_type, badge_name in badges:
        if rank < len(top_users):
            user = top_users[rank]
            existing = db.query(Reward).filter(
                Reward.user_id == user.id,
                Reward.badge_type == badge_type,
                Reward.month_earned == month_str
            ).first()
            
            if not existing:
                reward = Reward(
                    user_id=user.id,
                    badge_type=badge_type,
                    badge_name=badge_name,
                    badge_category="leaderboard",
                    month_earned=month_str,
                    is_lifetime=False
                )
                db.add(reward)
