#!/usr/bin/env python3
"""
Script to fix index conflicts and create missing tables.
Drops conflicting indexes and recreates tables properly.
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def main():
    try:
        from models import Base, engine
        from sqlalchemy import inspect, text
        from sqlalchemy.exc import ProgrammingError
        
        print("🔵 [FIX_INDEX] Starting index conflict fix...")
        
        # Import all models
        from models import (
            ClassSchedule, ClassSession, AttendanceRecord
        )
        
        print("✅ [FIX_INDEX] Models imported")
        
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        existing_indexes = []
        
        # Get all indexes
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT indexname FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname LIKE '%idx_branch_course%'
            """))
            existing_indexes = [row[0] for row in result]
        
        print(f"📊 [FIX_INDEX] Found indexes: {existing_indexes}")
        print(f"📊 [FIX_INDEX] Existing tables: {sorted(existing_tables)}")
        
        missing_tables = {"class_schedules", "class_sessions", "attendance_records"} - existing_tables
        print(f"🟡 [FIX_INDEX] Missing tables: {sorted(missing_tables)}")
        
        if not missing_tables:
            print("✅ [FIX_INDEX] All tables exist!")
            return
        
        # Drop the conflicting index if it exists and table doesn't
        if "idx_branch_course" in existing_indexes and "class_schedules" not in existing_tables:
            print("🟡 [FIX_INDEX] Dropping orphaned index idx_branch_course...")
            try:
                with engine.begin() as conn:
                    conn.execute(text("DROP INDEX IF EXISTS idx_branch_course"))
                print("✅ [FIX_INDEX] Dropped orphaned idx_branch_course index")
            except Exception as e:
                print(f"⚠️ [FIX_INDEX] Could not drop index: {str(e)[:100]}")
        
        # Now create tables in order (respecting foreign key dependencies)
        # Order: class_schedules -> class_sessions -> attendance_records
        
        if "class_schedules" in missing_tables:
            try:
                print("🟡 [FIX_INDEX] Creating class_schedules...")
                ClassSchedule.__table__.create(bind=engine, checkfirst=True)
                print("✅ [FIX_INDEX] Created class_schedules")
            except ProgrammingError as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                if 'already exists' not in error_str.lower():
                    print(f"❌ [FIX_INDEX] Error creating class_schedules: {error_str[:150]}")
                else:
                    # Check if it exists now
                    inspector = inspect(engine)
                    if "class_schedules" in inspector.get_table_names():
                        print("✅ [FIX_INDEX] class_schedules exists")
        
        if "class_sessions" in missing_tables:
            try:
                print("🟡 [FIX_INDEX] Creating class_sessions...")
                ClassSession.__table__.create(bind=engine, checkfirst=True)
                print("✅ [FIX_INDEX] Created class_sessions")
            except Exception as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                print(f"❌ [FIX_INDEX] Error creating class_sessions: {error_str[:150]}")
        
        if "attendance_records" in missing_tables:
            try:
                print("🟡 [FIX_INDEX] Creating attendance_records...")
                AttendanceRecord.__table__.create(bind=engine, checkfirst=True)
                print("✅ [FIX_INDEX] Created attendance_records")
            except Exception as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                print(f"❌ [FIX_INDEX] Error creating attendance_records: {error_str[:150]}")
        
        # Final verification
        inspector = inspect(engine)
        final_tables = set(inspector.get_table_names())
        created = {"class_schedules", "class_sessions", "attendance_records"} & final_tables
        
        print(f"\n📊 [FIX_INDEX] Final status:")
        print(f"   Created tables: {sorted(created)}")
        
        if created == {"class_schedules", "class_sessions", "attendance_records"}:
            print("✅ [FIX_INDEX] All tables created successfully!")
        else:
            missing = {"class_schedules", "class_sessions", "attendance_records"} - created
            print(f"⚠️ [FIX_INDEX] Still missing: {sorted(missing)}")
            
    except Exception as e:
        import traceback
        print(f"❌ [FIX_INDEX] Error: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
