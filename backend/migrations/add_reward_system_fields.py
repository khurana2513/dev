"""
Migration script to add reward system fields.
Run this to add T-shirt star tracking and grace skip fields.
"""
import sys
import os

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

# Change to parent directory for imports
os.chdir(parent_dir)

from sqlalchemy import text, inspect
from models import get_db, Base, engine

def add_reward_system_fields():
    """Add new fields for reward system."""
    db = next(get_db())
    try:
        inspector = inspect(engine)
        
        # Check if attendance_records table exists
        if 'attendance_records' in inspector.get_table_names():
            existing_columns = {col['name'] for col in inspector.get_columns('attendance_records')}
            
            # Add t_shirt_worn field to attendance_records
            if 't_shirt_worn' not in existing_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE attendance_records 
                        ADD COLUMN t_shirt_worn BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added t_shirt_worn to attendance_records")
                except Exception as e:
                    if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                        print("ℹ️  t_shirt_worn column already exists")
                    else:
                        raise
            else:
                print("ℹ️  t_shirt_worn column already exists")
        
        # Check users table columns
        existing_user_columns = {col['name'] for col in inspector.get_columns('users')}
        
        # Add grace_skip fields to users table
        if 'last_grace_skip_date' not in existing_user_columns:
            try:
                # Use TIMESTAMP for PostgreSQL compatibility
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN last_grace_skip_date TIMESTAMP
                """))
                print("✅ Added last_grace_skip_date to users")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("ℹ️  last_grace_skip_date column already exists")
                else:
                    raise
        else:
            print("ℹ️  last_grace_skip_date column already exists")
        
        if 'grace_skip_week_start' not in existing_user_columns:
            try:
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN grace_skip_week_start TIMESTAMP
                """))
                print("✅ Added grace_skip_week_start to users")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("ℹ️  grace_skip_week_start column already exists")
                else:
                    raise
        else:
            print("ℹ️  grace_skip_week_start column already exists")
        
        # Check rewards table columns
        if 'rewards' in inspector.get_table_names():
            existing_rewards_columns = {col['name'] for col in inspector.get_columns('rewards')}
            
            # Add badge metadata to rewards table
            if 'badge_category' not in existing_rewards_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE rewards 
                        ADD COLUMN badge_category VARCHAR(50) DEFAULT 'general'
                    """))
                    print("✅ Added badge_category to rewards")
                except Exception as e:
                    if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                        print("ℹ️  badge_category column already exists")
                    else:
                        raise
            else:
                print("ℹ️  badge_category column already exists")
            
            if 'is_lifetime' not in existing_rewards_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE rewards 
                        ADD COLUMN is_lifetime BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added is_lifetime to rewards")
                except Exception as e:
                    if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                        print("ℹ️  is_lifetime column already exists")
                    else:
                        raise
            else:
                print("ℹ️  is_lifetime column already exists")
            
            if 'month_earned' not in existing_rewards_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE rewards 
                        ADD COLUMN month_earned VARCHAR(7)
                    """))
                    print("✅ Added month_earned to rewards")
                except Exception as e:
                    if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                        print("ℹ️  month_earned column already exists")
                    else:
                        raise
            else:
                print("ℹ️  month_earned column already exists")
        
        # Add total_questions_attempted to users for lifetime badges
        if 'total_questions_attempted' not in existing_user_columns:
            try:
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN total_questions_attempted INTEGER DEFAULT 0
                """))
                print("✅ Added total_questions_attempted to users")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("ℹ️  total_questions_attempted column already exists")
                else:
                    raise
        else:
            print("ℹ️  total_questions_attempted column already exists")
        
        # Add last_daily_login_bonus_date to users table
        if 'last_daily_login_bonus_date' not in existing_user_columns:
            try:
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN last_daily_login_bonus_date TIMESTAMP
                """))
                print("✅ Added last_daily_login_bonus_date to users")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("ℹ️  last_daily_login_bonus_date column already exists")
                else:
                    raise
        else:
            print("ℹ️  last_daily_login_bonus_date column already exists")
        
        db.commit()
        print("✅ Migration completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_reward_system_fields()
