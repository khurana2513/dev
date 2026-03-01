"""
Comprehensive Reward System Implementation
Implements all reward system rules from reward_system.md
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from models import User, Reward, PracticeSession, PaperAttempt, AttendanceRecord, StudentProfile, ClassSession
from datetime import datetime, timedelta
from timezone_utils import get_ist_now, IST_TIMEZONE
from typing import List, Optional, Dict, Tuple
from calendar import monthrange


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
# STREAK ENGINE (CONSISTENCY)
# ============================================================================

def can_use_grace_skip(db: Session, user: User) -> Tuple[bool, str]:
    """
    Check if user can use grace skip.
    Returns: (can_use, reason)
    """
    ist_now = get_ist_now()
    today = ist_now.date()
    
    # Check if user has enough points
    if user.total_points < 2000:
        return False, "Not enough points (need 2000)"
    
    # Check if grace skip was used this week
    if user.grace_skip_week_start:
        week_start = user.grace_skip_week_start.date()
        week_end = week_start + timedelta(days=7)
        
        if today < week_end:
            # Still in the same week
            if user.last_grace_skip_date:
                last_skip = user.last_grace_skip_date.date()
                if last_skip >= week_start:
                    return False, "Grace skip already used this week"
    
    return True, "Available"


def use_grace_skip(db: Session, user: User) -> bool:
    """
    Use grace skip to preserve streak.
    Deducts 2000 points and preserves streak.
    Returns True if successful, False otherwise.
    """
    can_use, reason = can_use_grace_skip(db, user)
    if not can_use:
        return False
    
    # Deduct points
    balance_before_skip = user.total_points
    user.total_points = max(0, user.total_points - 2000)
    
    # Log points transaction
    from points_logger import log_points
    log_points(
        db=db,
        user=user,
        points=-2000,
        source_type="grace_skip",
        description="Grace skip to preserve streak (2000 points)",
        extra_data={
            "streak_preserved": True,
            "current_streak":   user.current_streak,
            "balance_before":   balance_before_skip,
            "balance_after":    user.total_points,
        }
    )
    
    # Update grace skip tracking
    ist_now = get_ist_now()
    today = ist_now.date()
    
    # Set week start if not set or if new week
    if not user.grace_skip_week_start:
        # Start of current week (Monday)
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        user.grace_skip_week_start = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=IST_TIMEZONE)
    else:
        week_start = user.grace_skip_week_start.date()
        days_since_monday = today.weekday()
        current_week_start = today - timedelta(days=days_since_monday)
        
        if current_week_start > week_start:
            # New week
            user.grace_skip_week_start = datetime.combine(current_week_start, datetime.min.time()).replace(tzinfo=IST_TIMEZONE)
    
    user.last_grace_skip_date = ist_now
    
    return True


def update_streak_with_grace_skip(
    db: Session,
    user: User,
    questions_attempted_today: int,
    is_mental_math: bool = True
) -> Dict[str, any]:
    """
    Update streak with grace skip support.
    Returns dict with streak info and bonus points if any.
    """
    ist_now = get_ist_now()
    today = ist_now.date()
    
    # Check if requirement met (15+ questions)
    met_requirement = questions_attempted_today >= 15
    
    result = {
        "streak_updated": False,
        "new_streak": user.current_streak,
        "bonus_points": 0,
        "streak_broken": False,
        "can_grace_skip": False
    }
    
    if user.last_practice_date:
        last_date = user.last_practice_date.date()
        days_diff = (today - last_date).days
        
        if days_diff == 0:
            # Same day - just maintain if requirement met
            if not met_requirement:
                user.current_streak = 0
                result["streak_broken"] = True
        elif days_diff == 1:
            # Consecutive day
            if met_requirement:
                # Check if yesterday met requirement
                yesterday_start = datetime.combine(last_date, datetime.min.time()).replace(tzinfo=IST_TIMEZONE)
                yesterday_end = datetime.combine(today, datetime.min.time()).replace(tzinfo=IST_TIMEZONE)
                
                # Count yesterday's questions
                yesterday_sessions = db.query(PracticeSession).filter(
                    PracticeSession.user_id == user.id,
                    PracticeSession.completed_at >= yesterday_start,
                    PracticeSession.completed_at < yesterday_end
                ).all()
                
                yesterday_questions = sum(s.total_questions for s in yesterday_sessions)
                yesterday_met = yesterday_questions >= 15
                
                if yesterday_met:
                    user.current_streak += 1
                    result["streak_updated"] = True
                    result["new_streak"] = user.current_streak
                else:
                    # Yesterday didn't meet requirement - check grace skip
                    can_use, _ = can_use_grace_skip(db, user)
                    result["can_grace_skip"] = can_use
                    
                    if can_use:
                        # Don't auto-use, just indicate it's available
                        # User must explicitly redeem it
                        pass
                    else:
                        # Start new streak
                        user.current_streak = 1
                        result["streak_updated"] = True
                        result["new_streak"] = 1
        else:
            # Streak broken (more than 1 day gap)
            if met_requirement:
                user.current_streak = 1
                result["streak_updated"] = True
                result["new_streak"] = 1
            else:
                user.current_streak = 0
                result["streak_broken"] = True
    else:
        # First practice
        if met_requirement:
            user.current_streak = 1
            result["streak_updated"] = True
            result["new_streak"] = 1
        else:
            user.current_streak = 0
    
    # Update longest streak
    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak
    
    # Check for streak bonuses
    if result["streak_updated"]:
        bonus = check_streak_bonuses(db, user)
        result["bonus_points"] = bonus
        if bonus > 0:
            balance_before_bonus = user.total_points
            user.total_points += bonus
            # Log streak bonus points
            from points_logger import log_points
            streak_days = user.current_streak
            if streak_days == 7:
                description = "7-day streak bonus"
            elif streak_days == 14:
                description = "14-day streak bonus"
            elif streak_days == 21:
                description = "21-day streak bonus"
            elif streak_days >= 28:
                description = "Monthly streak bonus (full calendar month)"
            else:
                description = f"{streak_days}-day streak bonus"
            
            log_points(
                db=db,
                user=user,
                points=bonus,
                source_type="streak_bonus",
                description=description,
                extra_data={
                    "streak_days":    streak_days,
                    "bonus_type":     "milestone" if streak_days <= 21 else "monthly",
                    "balance_before": balance_before_bonus,
                    "balance_after":  user.total_points,
                }
            )
    
    user.last_practice_date = ist_now
    
    return result


def check_streak_bonuses(db: Session, user: User) -> int:
    """
    Check and award streak bonus points.
    Returns bonus points awarded.
    """
    streak = user.current_streak
    bonus = 0
    
    # Check for milestone bonuses
    if streak == 7:
        bonus = 50
    elif streak == 14:
        bonus = 100
    elif streak == 21:
        bonus = 200
    
    # Check for monthly streak badge (full calendar month)
    if streak >= 28:  # Approximate month
        # Check if streak spans full calendar month
        ist_now = get_ist_now()
        current_month = ist_now.month
        current_year = ist_now.year
        
        # Count sessions in current month
        month_start = datetime(current_year, current_month, 1).replace(tzinfo=IST_TIMEZONE)
        if current_month == 12:
            month_end = datetime(current_year + 1, 1, 1).replace(tzinfo=IST_TIMEZONE)
        else:
            month_end = datetime(current_year, current_month + 1, 1).replace(tzinfo=IST_TIMEZONE)
        
        sessions_this_month = db.query(PracticeSession).filter(
            PracticeSession.user_id == user.id,
            PracticeSession.completed_at >= month_start,
            PracticeSession.completed_at < month_end
        ).count()
        
        # If sessions every day of month, award monthly badge
        days_in_month = monthrange(current_year, current_month)[1]
        if sessions_this_month >= days_in_month:
            bonus += 500
            # Award monthly streak badge
            award_monthly_streak_badge(db, user, current_year, current_month)
    
    return bonus


def award_monthly_streak_badge(db: Session, user: User, year: int, month: int) -> None:
    """Award monthly streak badge."""
    month_str = f"{year}-{month:02d}"
    badge_type = "monthly_streak"
    
    existing = db.query(Reward).filter(
        Reward.user_id == user.id,
        Reward.badge_type == badge_type,
        Reward.month_earned == month_str
    ).first()
    
    if not existing:
        reward = Reward(
            user_id=user.id,
            badge_type=badge_type,
            badge_name="Monthly Streak Champion",
            badge_category="monthly",
            month_earned=month_str,
            is_lifetime=False
        )
        db.add(reward)


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
# SUPER JOURNEY (MEANINGFUL PROGRESSION)
# ============================================================================

def check_and_award_super_rewards(db: Session, user: User) -> List[str]:
    """
    Check and award SUPER badge rewards and physical rewards.
    Updated with correct milestones from reward_system.md
    """
    awarded_rewards = []
    total_points = user.total_points
    
    # Physical rewards (chocolates)
    chocolate_milestones = [1500, 4500, 7500, 10500, 13500, 16500, 19500]
    for milestone in chocolate_milestones:
        if total_points >= milestone:
            badge_type = f"chocolate_{milestone}"
            existing = db.query(Reward).filter(
                Reward.user_id == user.id,
                Reward.badge_type == badge_type
            ).first()
            
            if not existing:
                reward = Reward(
                    user_id=user.id,
                    badge_type=badge_type,
                    badge_name=f"Chocolate 🍫 ({milestone} pts)",
                    badge_category="super"
                )
                db.add(reward)
                awarded_rewards.append(f"Chocolate 🍫")
    
    # SUPER letters
    super_letters = [
        (3000, "super_s", "SUPER Badge - S", "Started", "You've begun your journey."),
        (6000, "super_u", "SUPER Badge - U", "Understanding", "You're understanding concepts."),
        (9000, "super_p", "SUPER Badge - P", "Practice", "Strong practice habits."),
        (12000, "super_e", "SUPER Badge - E", "Excellence", "Consistency reflects excellence."),
        (15000, "super_r", "SUPER Badge - R", "Ready", "Competition-ready mindset."),
    ]
    
    for threshold, badge_type, badge_name, letter, message in super_letters:
        if total_points >= threshold:
            existing = db.query(Reward).filter(
                Reward.user_id == user.id,
                Reward.badge_type == badge_type
            ).first()
            
            if not existing:
                reward = Reward(
                    user_id=user.id,
                    badge_type=badge_type,
                    badge_name=badge_name,
                    badge_category="super"
                )
                db.add(reward)
                awarded_rewards.append(badge_name)
    
    # Special rewards
    if total_points >= 18000:
        badge_type = "mystery_gift"
        existing = db.query(Reward).filter(
            Reward.user_id == user.id,
            Reward.badge_type == badge_type
        ).first()
        
        if not existing:
            reward = Reward(
                user_id=user.id,
                badge_type=badge_type,
                badge_name="Mystery Gift 🎁",
                badge_category="super"
            )
            db.add(reward)
            awarded_rewards.append("Mystery Gift 🎁")
    
    if total_points >= 21000:
        badge_type = "party"
        existing = db.query(Reward).filter(
            Reward.user_id == user.id,
            Reward.badge_type == badge_type
        ).first()
        
        if not existing:
            reward = Reward(
                user_id=user.id,
                badge_type=badge_type,
                badge_name="Party 🎉",
                badge_category="super"
            )
            db.add(reward)
            awarded_rewards.append("Party 🎉")
    
    return awarded_rewards


# ============================================================================
# ATTENDANCE ENGINE (DISCIPLINE)
# ============================================================================

def evaluate_attendance_badges(db: Session, year: int, month: int) -> None:
    """
    Monthly evaluation for attendance badges.
    Awards Attendance Champion badge for 100% attendance.
    """
    month_start = datetime(year, month, 1).replace(tzinfo=IST_TIMEZONE)
    if month == 12:
        month_end = datetime(year + 1, 1, 1).replace(tzinfo=IST_TIMEZONE)
    else:
        month_end = datetime(year, month + 1, 1).replace(tzinfo=IST_TIMEZONE)
    
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
    month_start = datetime(year, month, 1).replace(tzinfo=IST_TIMEZONE)
    if month == 12:
        month_end = datetime(year + 1, 1, 1).replace(tzinfo=IST_TIMEZONE)
    else:
        month_end = datetime(year, month + 1, 1).replace(tzinfo=IST_TIMEZONE)
    
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
    month_start = datetime(year, month, 1).replace(tzinfo=IST_TIMEZONE)
    if month == 12:
        month_end = datetime(year + 1, 1, 1).replace(tzinfo=IST_TIMEZONE)
    else:
        month_end = datetime(year, month + 1, 1).replace(tzinfo=IST_TIMEZONE)
    
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
