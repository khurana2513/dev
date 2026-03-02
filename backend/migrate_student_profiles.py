"""
Migration script to create student profiles for existing users and generate public IDs.

Run this script once to:
1. Create StudentProfile records for all existing students
2. Auto-generate public IDs (TH-0001, TH-0002, etc.) for all students
3. Create profiles for new students automatically going forward

Usage:
    python backend/migrate_student_profiles.py
"""
import sys
import os
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, StudentProfile, get_db, init_db
from student_profile_utils import generate_public_id
from sqlalchemy.orm import Session

def migrate_student_profiles():
    """Create student profiles for all existing students."""
    db: Session = next(get_db())
    
    try:
        # Get all students without profiles
        students = db.query(User).filter(User.role == "student").all()
        
        print(f"Found {len(students)} students to migrate...")
        
        migrated_count = 0
        skipped_count = 0
        
        for student in students:
            # Check if profile already exists
            existing_profile = db.query(StudentProfile).filter(
                StudentProfile.user_id == student.id
            ).first()
            
            if existing_profile:
                # Profile exists, but check if it has a public_id
                if not existing_profile.public_id:
                    print(f"  Generating public_id for existing profile (user_id: {student.id})...")
                    existing_profile.public_id = generate_public_id(db)
                    db.commit()
                    migrated_count += 1
                else:
                    print(f"  Profile already exists with public_id {existing_profile.public_id} (user_id: {student.id})")
                    skipped_count += 1
            else:
                # Create new profile
                print(f"  Creating profile for student: {student.name} (user_id: {student.id})...")
                profile = StudentProfile(
                    user_id=student.id,
                    internal_uuid=str(uuid.uuid4())
                )
                profile.public_id = generate_public_id(db)
                db.add(profile)
                db.commit()
                migrated_count += 1
                print(f"    ✓ Created profile with public_id: {profile.public_id}")
        
        print(f"\n✅ Migration complete!")
        print(f"   - Migrated: {migrated_count} profiles")
        print(f"   - Skipped: {skipped_count} profiles (already exist)")
        
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting student profile migration...")
    print("=" * 50)
    migrate_student_profiles()
    print("=" * 50)
    print("✅ Migration script completed!")
