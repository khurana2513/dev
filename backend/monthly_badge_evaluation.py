"""
Monthly Badge Evaluation Script
Run this script monthly (via cron) to evaluate and award monthly badges.

Usage:
    python monthly_badge_evaluation.py [year] [month]
    
If year and month are not provided, evaluates the previous month.
"""
import sys
import os
from datetime import datetime
from timezone_utils import get_ist_now, IST_TIMEZONE
from models import get_db
from reward_system import (
    evaluate_attendance_badges,
    evaluate_tshirt_star_badges,
    award_leaderboard_badges
)


def evaluate_monthly_badges(year: int = None, month: int = None):
    """
    Evaluate and award monthly badges for a specific month.
    
    Args:
        year: Year to evaluate (default: previous month's year)
        month: Month to evaluate (default: previous month)
    """
    ist_now = get_ist_now()
    
    # If not provided, evaluate previous month
    if year is None or month is None:
        if ist_now.month == 1:
            year = ist_now.year - 1
            month = 12
        else:
            year = ist_now.year
            month = ist_now.month - 1
    
    print(f"🏆 [MONTHLY EVALUATION] Evaluating badges for {year}-{month:02d}")
    
    db = next(get_db())
    try:
        # 1. Evaluate attendance badges
        print("📅 [ATTENDANCE] Evaluating attendance badges...")
        evaluate_attendance_badges(db, year, month)
        print("✅ [ATTENDANCE] Attendance badges evaluated")
        
        # 2. Evaluate T-shirt star badges
        print("⭐ [T-SHIRT] Evaluating T-shirt star badges...")
        evaluate_tshirt_star_badges(db, year, month)
        print("✅ [T-SHIRT] T-shirt star badges evaluated")
        
        # 3. Award leaderboard badges
        print("🏅 [LEADERBOARD] Awarding leaderboard badges...")
        award_leaderboard_badges(db, year, month)
        print("✅ [LEADERBOARD] Leaderboard badges awarded")
        
        db.commit()
        print(f"✅ [MONTHLY EVALUATION] Completed evaluation for {year}-{month:02d}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ [MONTHLY EVALUATION] Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    year = None
    month = None
    
    if len(sys.argv) >= 3:
        try:
            year = int(sys.argv[1])
            month = int(sys.argv[2])
            if month < 1 or month > 12:
                raise ValueError("Month must be between 1 and 12")
        except ValueError as e:
            print(f"❌ Invalid arguments: {e}")
            print("Usage: python monthly_badge_evaluation.py [year] [month]")
            sys.exit(1)
    
    evaluate_monthly_badges(year, month)
