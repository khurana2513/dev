#!/usr/bin/env python3
"""Add display_name column to users table."""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv('DATABASE_URL', 'sqlite:////data/abacus_replitt.db')
print(f"Database URL: {db_url}")

engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result]
        
        if 'display_name' in columns:
            print("✅ Column 'display_name' already exists")
        else:
            print("Adding 'display_name' column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN display_name TEXT"))
            conn.commit()
            print("✅ Column 'display_name' added successfully")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()





