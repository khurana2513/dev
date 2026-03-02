"""hi
Migration script to delete old badge system badges from database.

Old badges to delete:
- accuracy_king
- perfect_score
- speed_star

These are replaced by the new reward system:
- accuracy_ace (monthly)
- perfect_precision (monthly)
- And other monthly/lifetime badges
"""
import sys
import os

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

# Change to parent directory for imports
os.chdir(parent_dir)

from models import Reward, get_db, init_db
from sqlalchemy.orm import Session


def delete_old_badges():
    """Delete old badge system badges from all users."""
    init_db()  # Ensure tables exist
    
    db: Session = next(get_db())
    
    try:
        # Old badge types to delete
        old_badge_types = ["accuracy_king", "perfect_score", "speed_star"]
        
        # Count badges to delete
        old_badges = db.query(Reward).filter(
            Reward.badge_type.in_(old_badge_types)
        ).all()
        
        count = len(old_badges)
        
        if count == 0:
            print("✅ No old badges found. Database is already clean.")
            return
        
        print(f"🟡 Found {count} old badges to delete:")
        for badge in old_badges:
            print(f"  - User {badge.user_id}: {badge.badge_name} ({badge.badge_type})")
        
        # Delete old badges
        deleted = db.query(Reward).filter(
            Reward.badge_type.in_(old_badge_types)
        ).delete(synchronize_session=False)
        
        db.commit()
        
        print(f"✅ Successfully deleted {deleted} old badges.")
        print("✅ Old badge system has been removed. New reward system is now active.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting old badges: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🧹 Starting migration: Delete old badges...")
    delete_old_badges()
    print("✅ Migration completed!")
