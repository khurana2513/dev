#!/usr/bin/env python3
"""
Railway migration script to create fee management tables.
Run this script via Railway CLI or SSH to create the tables.
Usage: python railway_migrate.py
"""
import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def main():
    try:
        print("🔵 [MIGRATE] Starting migration...")
        
        # Import Base and engine first
        from models import Base, engine
        from sqlalchemy import inspect
        
        # Import fee models to register them
        from models import FeePlan, FeeAssignment, FeeTransaction
        
        print("✅ [MIGRATE] Models imported")
        
        # Check existing tables
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        print(f"📊 [MIGRATE] Existing tables: {len(existing_tables)}")
        
        # Tables we need to create
        fee_tables_needed = {"fee_plans", "fee_assignments", "fee_transactions"}
        tables_to_create = fee_tables_needed - existing_tables
        
        if not tables_to_create:
            print("✅ [MIGRATE] All fee tables already exist!")
            from sqlalchemy import text
            with engine.connect() as conn:
                for table in fee_tables_needed:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    print(f"  - {table}: {count} rows")
            return
        
        print(f"🟡 [MIGRATE] Creating tables: {tables_to_create}")
        
        # Create all tables (Base.metadata.create_all only creates missing ones)
        Base.metadata.create_all(bind=engine)
        
        # Verify creation
        inspector = inspect(engine)
        new_tables = set(inspector.get_table_names())
        created = fee_tables_needed & new_tables
        
        if created == fee_tables_needed:
            print("✅ [MIGRATE] All fee tables created successfully!")
            for table in fee_tables_needed:
                print(f"  ✓ {table}")
        else:
            missing = fee_tables_needed - created
            print(f"❌ [MIGRATE] Some tables are still missing: {missing}")
            sys.exit(1)
            
    except Exception as e:
        import traceback
        print(f"❌ [MIGRATE] Error: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
