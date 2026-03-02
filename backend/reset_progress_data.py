"""
Database Reset Script - Resets all user progress data
This script will:
- Reset all user points, streaks, and stats to 0
- Delete all practice sessions and attempts
- Delete all paper attempts
- Delete all badges/rewards
- Reset leaderboard entries

It will NOT delete:
- User accounts
- Student profiles
- Attendance records
- Class sessions
- Fee data
- Certificates
"""

import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session
from models import (
    User, PracticeSession, Attempt, PaperAttempt, Reward, Leaderboard,
    SessionLocal, engine
)
from dotenv import load_dotenv

load_dotenv()


def reset_all_progress_data():
    """Reset all progress data from the database."""
    db: Session = SessionLocal()
    
    try:
        print("🔄 Starting database reset...")
        print("=" * 60)
        
        # 1. Delete all attempts first (child table)
        print("\n1️⃣ Deleting all attempts...")
        deleted_attempts = db.query(Attempt).delete()
        print(f"   ✅ Deleted {deleted_attempts} attempts")
        
        # 2. Delete all practice sessions (parent table)
        print("\n2️⃣ Deleting all practice sessions...")
        deleted_sessions = db.query(PracticeSession).delete()
        print(f"   ✅ Deleted {deleted_sessions} practice sessions")
        
        # 3. Delete all paper attempts
        print("\n3️⃣ Deleting all paper attempts...")
        deleted_papers = db.query(PaperAttempt).delete()
        print(f"   ✅ Deleted {deleted_papers} paper attempts")
        
        # 4. Delete all rewards/badges
        print("\n4️⃣ Deleting all badges and rewards...")
        deleted_rewards = db.query(Reward).delete()
        print(f"   ✅ Deleted {deleted_rewards} rewards/badges")
        
        # 5. Reset all user stats
        print("\n5️⃣ Resetting all user statistics...")
        users_updated = db.query(User).update({
            User.total_points: 0,
            User.current_streak: 0,
            User.longest_streak: 0,
            User.last_practice_date: None,
            User.total_questions_attempted: 0,
            User.last_grace_skip_date: None,
            User.grace_skip_week_start: None,
            User.last_daily_login_bonus_date: None,
        })
        print(f"   ✅ Reset stats for {users_updated} users")
        
        # 6. Reset leaderboard
        print("\n6️⃣ Resetting leaderboard...")
        leaderboard_updated = db.query(Leaderboard).update({
            Leaderboard.total_points: 0,
            Leaderboard.weekly_points: 0,
            Leaderboard.rank: None,
            Leaderboard.weekly_rank: None,
        })
        print(f"   ✅ Reset {leaderboard_updated} leaderboard entries")
        
        # Commit all changes
        print("\n💾 Committing changes to database...")
        db.commit()
        print("   ✅ All changes committed successfully!")
        
        print("\n" + "=" * 60)
        print("✅ Database reset completed successfully!")
        print("=" * 60)
        print("\nSummary:")
        print(f"   - Deleted {deleted_attempts} attempts")
        print(f"   - Deleted {deleted_sessions} practice sessions")
        print(f"   - Deleted {deleted_papers} paper attempts")
        print(f"   - Deleted {deleted_rewards} rewards/badges")
        print(f"   - Reset stats for {users_updated} users")
        print(f"   - Reset {leaderboard_updated} leaderboard entries")
        print("\n⚠️  Note: User accounts, student profiles, attendance records,")
        print("   class sessions, fee data, and certificates were NOT deleted.")
        
    except Exception as e:
        print(f"\n❌ Error during reset: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def confirm_reset():
    """Ask for confirmation before resetting."""
    print("=" * 60)
    print("⚠️  WARNING: DATABASE RESET")
    print("=" * 60)
    print("\nThis will DELETE ALL progress data:")
    print("   • All practice sessions and attempts")
    print("   • All paper attempts")
    print("   • All badges and rewards")
    print("   • All user points, streaks, and stats")
    print("   • All leaderboard data")
    print("\nThis will NOT delete:")
    print("   • User accounts")
    print("   • Student profiles")
    print("   • Attendance records")
    print("   • Class sessions")
    print("   • Fee data")
    print("   • Certificates")
    print("\n" + "=" * 60)
    
    response = input("\nType 'RESET' to confirm: ")
    
    if response != "RESET":
        print("\n❌ Reset cancelled. No changes made.")
        return False
    
    return True


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("DATABASE PROGRESS RESET SCRIPT")
    print("=" * 60)
    
    if not confirm_reset():
        sys.exit(0)
    
    try:
        reset_all_progress_data()
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(1)
