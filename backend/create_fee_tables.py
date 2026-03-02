#!/usr/bin/env python3
"""
Script to create fee management tables in the database.
This ensures the tables exist even if init_db() hasn't run yet.
"""
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

try:
    # Import engine first
    from models import engine, Base
    from sqlalchemy import inspect
    
    print("🔵 [CREATE_TABLES] Importing models...")
    
    # Now import fee models to register them with Base.metadata
    from models import FeePlan, FeeAssignment, FeeTransaction
    
    print(f"✅ [CREATE_TABLES] Models imported successfully")
    
    # Check which tables exist
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    fee_tables_needed = ["fee_plans", "fee_assignments", "fee_transactions"]
    tables_to_create = [t for t in fee_tables_needed if t not in existing_tables]
    
    if not tables_to_create:
        print(f"✅ [CREATE_TABLES] All fee tables already exist!")
        print(f"Existing fee tables: {fee_tables_needed}")
    else:
        print(f"🟡 [CREATE_TABLES] Need to create: {tables_to_create}")
        print(f"🟢 [CREATE_TABLES] Creating fee tables...")
        
        # Create only the fee tables
        Base.metadata.create_all(bind=engine, tables=[
            FeePlan.__table__,
            FeeAssignment.__table__,
            FeeTransaction.__table__
        ])
        
        print(f"✅ [CREATE_TABLES] Fee tables created successfully!")
        
        # Verify tables were created
        inspector = inspect(engine)
        new_tables = inspector.get_table_names()
        created_tables = [t for t in fee_tables_needed if t in new_tables]
        print(f"✅ [CREATE_TABLES] Verified tables exist: {created_tables}")
    
except Exception as e:
    import traceback
    print(f"❌ [CREATE_TABLES] Error: {str(e)}")
    print(traceback.format_exc())
    sys.exit(1)
