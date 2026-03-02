#!/usr/bin/env python3
"""
Script to drop orphaned index and create missing tables.
Run this to fix the idx_branch_course index conflict.
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def main():
    try:
        from models import Base, engine, ClassSchedule, ClassSession, AttendanceRecord
        from sqlalchemy import inspect, text
        from sqlalchemy.exc import ProgrammingError
        
        print("[FIX] Starting fix for orphaned index...")
        
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        # Check for orphaned index
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT indexname FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = 'idx_branch_course'
            """))
            index_exists = result.fetchone() is not None
        
        print(f"[FIX] Index idx_branch_course exists: {index_exists}")
        print(f"[FIX] class_schedules table exists: {'class_schedules' in existing_tables}")
        
        # Drop orphaned indexes if tables don't exist
        orphaned_indexes = []
        
        if index_exists and "class_schedules" not in existing_tables:
            orphaned_indexes.append("idx_branch_course")
        
        # Check for idx_status index
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT indexname FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = 'idx_status'
            """))
            status_index_exists = result.fetchone() is not None
        
        if status_index_exists and "attendance_records" not in existing_tables:
            orphaned_indexes.append("idx_status")
        
        # Drop all orphaned indexes
        if orphaned_indexes:
            print(f"[FIX] Dropping orphaned indexes: {orphaned_indexes}")
            try:
                with engine.begin() as conn:
                    for idx in orphaned_indexes:
                        conn.execute(text(f"DROP INDEX IF EXISTS {idx}"))
                print("[FIX] Dropped orphaned indexes successfully")
            except Exception as e:
                print(f"[FIX] Error dropping indexes: {str(e)[:150]}")
                return
        
        # Now create missing tables
        missing = {"class_schedules", "class_sessions", "attendance_records"} - existing_tables
        print(f"[FIX] Missing tables: {sorted(missing)}")
        
        if not missing:
            print("[FIX] All tables exist!")
            return
        
        # Create tables in order
        if "class_schedules" in missing:
            try:
                print("[FIX] Creating class_schedules...")
                ClassSchedule.__table__.create(bind=engine, checkfirst=True)
                print("[FIX] Created class_schedules")
            except Exception as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                print(f"[FIX] Error: {error_str[:150]}")
        
        if "class_sessions" in missing:
            try:
                print("[FIX] Creating class_sessions...")
                ClassSession.__table__.create(bind=engine, checkfirst=True)
                print("[FIX] Created class_sessions")
            except Exception as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                print(f"[FIX] Error: {error_str[:150]}")
        
        if "attendance_records" in missing:
            try:
                print("[FIX] Creating attendance_records...")
                AttendanceRecord.__table__.create(bind=engine, checkfirst=True)
                print("[FIX] Created attendance_records")
            except Exception as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                print(f"[FIX] Error: {error_str[:150]}")
        
        # Verify
        inspector = inspect(engine)
        final = set(inspector.get_table_names())
        created = {"class_schedules", "class_sessions", "attendance_records"} & final
        
        print(f"\n[FIX] Final status:")
        print(f"  Created tables: {sorted(created)}")
        
        if len(created) == 3:
            print("[FIX] All tables created successfully!")
        else:
            still_missing = {"class_schedules", "class_sessions", "attendance_records"} - created
            print(f"[FIX] Still missing: {sorted(still_missing)}")
            
    except Exception as e:
        import traceback
        print(f"[FIX] Error: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
