"""
Simple script to promote users to admin role.
Run this script to update existing users to admin without using SQL.

Usage:
    python promote_to_admin.py
    # Or with specific emails:
    python promote_to_admin.py ayushkhurana47@gmail.com sunitakhurana15061977@gmail.com
"""

import os
import sys
from dotenv import load_dotenv
from models import User, get_db, init_db
from sqlalchemy.orm import Session

load_dotenv()

def promote_to_admin(emails=None):
    """Promote users to admin role."""
    # Get emails from command line args or environment variable
    if emails:
        admin_emails = [email.strip() for email in emails]
    else:
        admin_emails_str = os.getenv("ADMIN_EMAILS", "")
        admin_emails = [email.strip() for email in admin_emails_str.split(",") if email.strip()]
    
    if not admin_emails:
        print("❌ No admin emails found!")
        print("Set ADMIN_EMAILS in .env file or pass emails as arguments")
        return
    
    print(f"📧 Admin emails to promote: {admin_emails}")
    
    # Initialize database
    init_db()
    
    # Get database session
    db = next(get_db())
    
    try:
        updated_count = 0
        for email in admin_emails:
            user = db.query(User).filter(User.email == email).first()
            if user:
                if user.role == "admin":
                    print(f"✅ {email} is already an admin")
                else:
                    user.role = "admin"
                    db.commit()
                    print(f"✅ Promoted {email} to admin")
                    updated_count += 1
            else:
                print(f"⚠️  User {email} not found in database (they need to sign in first)")
        
        if updated_count > 0:
            print(f"\n✅ Successfully promoted {updated_count} user(s) to admin")
        else:
            print("\n✅ All specified users are already admins or don't exist yet")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    # Get emails from command line arguments if provided
    emails = sys.argv[1:] if len(sys.argv) > 1 else None
    promote_to_admin(emails)
