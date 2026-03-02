"""
Script to run the reward system migration.
This adds the missing columns to the database.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text, inspect
from models import get_db, engine

def run_migration():
    """Run the reward system migration."""
    db = next(get_db())
    try:
        inspector = inspect(engine)
        existing_columns = {col['name'] for col in inspector.get_columns('users')}
        
        print("🟡 [MIGRATION] Checking users table columns...")
        print(f"   Existing columns: {sorted(existing_columns)}")
        
        # Add total_questions_attempted
        if 'total_questions_attempted' not in existing_columns:
            try:
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN total_questions_attempted INTEGER DEFAULT 0
                """))
                print("✅ Added total_questions_attempted to users")
            except Exception as e:
                print(f"⚠️  Error adding total_questions_attempted: {e}")
        else:
            print("ℹ️  total_questions_attempted already exists")
        
        # Add last_grace_skip_date
        if 'last_grace_skip_date' not in existing_columns:
            try:
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN last_grace_skip_date TIMESTAMP
                """))
                print("✅ Added last_grace_skip_date to users")
            except Exception as e:
                print(f"⚠️  Error adding last_grace_skip_date: {e}")
        else:
            print("ℹ️  last_grace_skip_date already exists")
        
        # Add grace_skip_week_start
        if 'grace_skip_week_start' not in existing_columns:
            try:
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN grace_skip_week_start TIMESTAMP
                """))
                print("✅ Added grace_skip_week_start to users")
            except Exception as e:
                print(f"⚠️  Error adding grace_skip_week_start: {e}")
        else:
            print("ℹ️  grace_skip_week_start already exists")
        
        # Check attendance_records table
        if 'attendance_records' in inspector.get_table_names():
            existing_attendance_columns = {col['name'] for col in inspector.get_columns('attendance_records')}
            
            if 't_shirt_worn' not in existing_attendance_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE attendance_records 
                        ADD COLUMN t_shirt_worn BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added t_shirt_worn to attendance_records")
                except Exception as e:
                    print(f"⚠️  Error adding t_shirt_worn: {e}")
            else:
                print("ℹ️  t_shirt_worn already exists")
        
        # Check rewards table
        if 'rewards' in inspector.get_table_names():
            existing_rewards_columns = {col['name'] for col in inspector.get_columns('rewards')}
            
            if 'badge_category' not in existing_rewards_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE rewards 
                        ADD COLUMN badge_category VARCHAR(50) DEFAULT 'general'
                    """))
                    print("✅ Added badge_category to rewards")
                except Exception as e:
                    print(f"⚠️  Error adding badge_category: {e}")
            else:
                print("ℹ️  badge_category already exists")
            
            if 'is_lifetime' not in existing_rewards_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE rewards 
                        ADD COLUMN is_lifetime BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added is_lifetime to rewards")
                except Exception as e:
                    print(f"⚠️  Error adding is_lifetime: {e}")
            else:
                print("ℹ️  is_lifetime already exists")
            
            if 'month_earned' not in existing_rewards_columns:
                try:
                    db.execute(text("""
                        ALTER TABLE rewards 
                        ADD COLUMN month_earned VARCHAR(7)
                    """))
                    print("✅ Added month_earned to rewards")
                except Exception as e:
                    print(f"⚠️  Error adding month_earned: {e}")
            else:
                print("ℹ️  month_earned already exists")
        
        db.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        import traceback
        print(traceback.format_exc())
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
