#!/usr/bin/env python3
"""
Script to create all missing tables in the database.
This handles index conflicts and creates tables individually if needed.
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def main():
    try:
        from models import Base, engine
        from sqlalchemy import inspect
        from sqlalchemy.exc import ProgrammingError
        
        print("🔵 [CREATE_ALL] Starting table creation...")
        
        # Import all models to register them
        from models import (
            Paper, User, PracticeSession, Attempt, Reward, PaperAttempt, 
            Leaderboard, StudentProfile, ProfileAuditLog, ClassSchedule,
            ClassSession, AttendanceRecord, Certificate,
            FeePlan, FeeAssignment, FeeTransaction
        )
        
        print(f"✅ [CREATE_ALL] Models imported ({len(Base.metadata.tables)} tables in metadata)")
        
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        print(f"📊 [CREATE_ALL] Existing tables: {len(existing_tables)}")
        print(f"   {sorted(existing_tables)}")
        
        # Get all tables from metadata
        all_tables = set(Base.metadata.tables.keys())
        tables_to_create = all_tables - existing_tables
        
        if not tables_to_create:
            print("✅ [CREATE_ALL] All tables already exist!")
            return
        
        print(f"🟡 [CREATE_ALL] Need to create {len(tables_to_create)} tables: {sorted(tables_to_create)}")
        
        # Try create_all first
        try:
            print("🟡 [CREATE_ALL] Attempting create_all()...")
            Base.metadata.create_all(bind=engine, checkfirst=True)
            print("✅ [CREATE_ALL] create_all() succeeded!")
        except ProgrammingError as e:
            error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
            print(f"⚠️ [CREATE_ALL] create_all() failed with index conflict: {error_str[:150]}")
            print(f"🟡 [CREATE_ALL] Creating tables individually...")
            
            # Create tables one by one
            for table_name in sorted(tables_to_create):
                try:
                    table = Base.metadata.tables[table_name]
                    print(f"🟡 [CREATE_ALL] Creating {table_name}...")
                    table.create(bind=engine, checkfirst=True)
                    print(f"✅ [CREATE_ALL] Created {table_name}")
                except ProgrammingError as table_error:
                    error_msg = str(table_error.orig) if hasattr(table_error, 'orig') else str(table_error)
                    if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                        # Check if table actually exists
                        inspector = inspect(engine)
                        if table_name in inspector.get_table_names():
                            print(f"✅ [CREATE_ALL] {table_name} exists (index conflict ignored)")
                        else:
                            print(f"⚠️ [CREATE_ALL] {table_name} index conflict but table missing")
                    else:
                        print(f"❌ [CREATE_ALL] Error creating {table_name}: {error_msg[:100]}")
                except Exception as table_error:
                    print(f"❌ [CREATE_ALL] Unexpected error creating {table_name}: {str(table_error)[:100]}")
        
        # Final verification
        inspector = inspect(engine)
        final_tables = set(inspector.get_table_names())
        created = all_tables & final_tables
        missing = all_tables - final_tables
        
        print(f"\n📊 [CREATE_ALL] Final status:")
        print(f"   Total tables in metadata: {len(all_tables)}")
        print(f"   Tables in database: {len(final_tables)}")
        print(f"   Successfully created: {len(created)}")
        
        if missing:
            print(f"   ⚠️ Missing tables: {sorted(missing)}")
        else:
            print(f"   ✅ All tables created successfully!")
            
    except Exception as e:
        import traceback
        print(f"❌ [CREATE_ALL] Error: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
