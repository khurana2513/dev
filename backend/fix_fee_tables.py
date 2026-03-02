#!/usr/bin/env python3
"""
Script to manually create fee tables, handling index conflicts.
Run this if init_db() fails due to duplicate index errors.
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def main():
    try:
        from models import Base, FeePlan, FeeAssignment, FeeTransaction, engine
        from sqlalchemy import inspect, text
        from sqlalchemy.exc import ProgrammingError
        
        print("🔵 [FIX] Starting fee table creation...")
        
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        fee_tables_needed = {"fee_plans", "fee_assignments", "fee_transactions"}
        tables_to_create = fee_tables_needed - existing_tables
        
        if not tables_to_create:
            print("✅ [FIX] All fee tables already exist!")
            return
        
        print(f"🟡 [FIX] Need to create: {tables_to_create}")
        
        # Create tables one by one, handling index errors
        for table_name in tables_to_create:
            try:
                table = Base.metadata.tables[table_name]
                print(f"🟡 [FIX] Creating {table_name}...")
                table.create(bind=engine, checkfirst=True)
                print(f"✅ [FIX] Created {table_name}")
            except ProgrammingError as e:
                error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
                if 'already exists' in error_str or 'duplicate' in error_str.lower():
                    print(f"⚠️ [FIX] Index conflict for {table_name}, but table may exist")
                    # Check if table actually exists
                    inspector = inspect(engine)
                    if table_name in inspector.get_table_names():
                        print(f"✅ [FIX] {table_name} exists (index conflict ignored)")
                    else:
                        print(f"❌ [FIX] {table_name} does not exist despite index error")
                else:
                    print(f"❌ [FIX] Error creating {table_name}: {error_str[:100]}")
        
        # Final verification
        inspector = inspect(engine)
        final_tables = set(inspector.get_table_names())
        created = fee_tables_needed & final_tables
        
        if created == fee_tables_needed:
            print("✅ [FIX] All fee tables created successfully!")
        else:
            missing = fee_tables_needed - created
            print(f"❌ [FIX] Missing tables: {missing}")
            
    except Exception as e:
        import traceback
        print(f"❌ [FIX] Error: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
