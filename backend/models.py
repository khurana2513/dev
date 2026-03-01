"""Database models for the application."""
from sqlalchemy import Column, Integer, String, JSON, DateTime, Date, Float, Boolean, ForeignKey, Text, create_engine, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import os
import uuid
from dotenv import load_dotenv
from timezone_utils import get_ist_now, get_utc_now

load_dotenv()

Base = declarative_base()


class Paper(Base):
    """Paper model to store paper configurations."""
    __tablename__ = "papers"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    level = Column(String, nullable=False)
    config = Column(JSON, nullable=False)  # Stores the full paper configuration
    created_at = Column(DateTime, default=get_utc_now)


class User(Base):
    """User model for students and admins."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)  # Custom display name for practice sessions
    avatar_url = Column(String, nullable=True)
    role = Column(String, default="student", nullable=False)  # "student" or "admin"
    total_points = Column(Integer, default=0, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_practice_date = Column(DateTime, nullable=True)
    total_questions_attempted = Column(Integer, default=0, nullable=False)  # For lifetime badges
    last_grace_skip_date = Column(DateTime, nullable=True)  # Last time grace skip was used
    grace_skip_week_start = Column(DateTime, nullable=True)  # Week start for grace skip tracking
    last_daily_login_bonus_date = Column(Date, nullable=True)  # Last date daily login bonus was given
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    practice_sessions = relationship("PracticeSession", back_populates="user", cascade="all, delete-orphan")
    paper_attempts = relationship("PaperAttempt", back_populates="user", cascade="all, delete-orphan")
    rewards = relationship("Reward", back_populates="user", cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    points_logs = relationship("PointsLog", back_populates="user", cascade="all, delete-orphan")


class PracticeSession(Base):
    """Practice session model to track each practice attempt."""
    __tablename__ = "practice_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type = Column(String, nullable=False, index=True)  # e.g., "add_sub", "multiplication" - indexed for analytics
    difficulty_mode = Column(String, nullable=False)  # "custom", "easy", "medium", "hard"
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, default=0, nullable=False)
    wrong_answers = Column(Integer, default=0, nullable=False)
    accuracy = Column(Float, default=0.0, nullable=False)  # Percentage
    score = Column(Integer, default=0, nullable=False)
    time_taken = Column(Float, nullable=False)  # in seconds
    points_earned = Column(Integer, default=0, nullable=False)
    # Store all datetimes in UTC for database consistency
    # Conversion to IST happens in API response serializers
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.utcnow().replace(tzinfo=timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="practice_sessions")
    attempts = relationship("Attempt", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_created', 'user_id', 'started_at'),
    )


class Attempt(Base):
    """Individual question attempt within a practice session."""
    __tablename__ = "attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_data = Column(JSON, nullable=False)  # Stores question details
    user_answer = Column(Float, nullable=True)
    correct_answer = Column(Float, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    time_taken = Column(Float, nullable=False)  # Time to answer in seconds
    question_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    
    # Relationships
    session = relationship("PracticeSession", back_populates="attempts")


class Reward(Base):
    """Rewards and badges earned by users."""
    __tablename__ = "rewards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_type = Column(String, nullable=False)  # e.g., "accuracy_ace", "perfect_precision", "monthly_streak"
    badge_name = Column(String, nullable=False)
    badge_category = Column(String, default="general", nullable=False)  # "monthly", "lifetime", "super", "attendance", "leaderboard"
    is_lifetime = Column(Boolean, default=False, nullable=False)  # True for lifetime badges
    month_earned = Column(String, nullable=True, index=True)  # "YYYY-MM" format for monthly badges - indexed for performance
    earned_at = Column(DateTime, default=get_utc_now)
    
    # Relationships
    user = relationship("User", back_populates="rewards")
    
    __table_args__ = (
        Index('idx_user_badge', 'user_id', 'badge_type'),
    )


class PaperAttempt(Base):
    """Paper attempt model to track attempts on custom generated papers."""
    __tablename__ = "paper_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    paper_title = Column(String, nullable=False)
    paper_level = Column(String, nullable=False, index=True)  # Indexed for filtering by level
    paper_config = Column(JSON, nullable=False)  # Stores the full paper configuration
    generated_blocks = Column(JSON, nullable=False)  # Stores the generated questions
    seed = Column(Integer, nullable=False)  # Seed used for generation
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, default=0, nullable=False)
    wrong_answers = Column(Integer, default=0, nullable=False)
    accuracy = Column(Float, default=0.0, nullable=False)  # Percentage
    score = Column(Integer, default=0, nullable=False)
    time_taken = Column(Float, nullable=True)  # in seconds, null if not completed
    points_earned = Column(Integer, default=0, nullable=False)
    answers = Column(JSON, nullable=True)  # Stores user answers: {question_id: answer}
    # Store all datetimes in UTC for database consistency
    # Conversion to IST happens in API response serializers
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.utcnow().replace(tzinfo=timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="paper_attempts")
    
    __table_args__ = (
        Index('idx_paper_user_created', 'user_id', 'started_at'),
    )


class Leaderboard(Base):
    """Leaderboard entries for ranking users."""
    __tablename__ = "leaderboard"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    total_points = Column(Integer, default=0, nullable=False)
    rank = Column(Integer, nullable=True)  # Updated periodically
    weekly_points = Column(Integer, default=0, nullable=False)
    weekly_rank = Column(Integer, nullable=True)
    last_updated = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        Index('idx_points_rank', 'total_points', 'rank'),
        Index('idx_weekly_points', 'weekly_points', 'weekly_rank'),
    )


class PointsLog(Base):
    """Points transaction log - tracks all point changes for audit and checksum."""
    __tablename__ = "points_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Transaction details
    points = Column(Integer, nullable=False)  # Can be positive (earned) or negative (spent)
    source_type = Column(String, nullable=False, index=True)  # e.g., "daily_login", "mental_math", "paper_attempt", "streak_bonus", "admin_adjustment", "grace_skip"
    source_id = Column(Integer, nullable=True)  # ID of related record (session_id, attempt_id, etc.)
    description = Column(String, nullable=False)  # Human-readable description
    
    # Additional metadata
    extra_data = Column(JSON, nullable=True)  # Store additional context (e.g., operation_type, difficulty, streak_days)
    
    # Timestamps
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="points_logs")
    
    __table_args__ = (
        Index('idx_user_created', 'user_id', 'created_at'),
        Index('idx_source', 'source_type', 'source_id'),
    )


class StudentProfile(Base):
    """Student profile model with comprehensive student information."""
    __tablename__ = "student_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Public ID (TH-0001, TH-0002, etc.) and UUID
    public_id = Column(String, unique=True, nullable=True, index=True)  # TH-0001 format
    internal_uuid = Column(String, unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4()))
    
    # Basic Information
    full_name = Column(String, nullable=True)
    display_name = Column(String, nullable=True)  # Display name shown throughout the site
    class_name = Column(String, nullable=True)  # Student's class/grade
    
    # Course Information
    course = Column(String, nullable=True)  # "Abacus", "Vedic Maths", "Handwriting"
    level_type = Column(String, nullable=True)  # "Regular" or "Junior"
    level = Column(String, nullable=True)  # Dynamic based on course and level_type
    
    # Branch Information
    branch = Column(String, nullable=True)  # "Rohini-16", "Rohini-11", "Gurgaon", "Online"
    
    # Status and Dates
    status = Column(String, default="active", nullable=False)  # "active", "inactive", "closed"
    join_date = Column(DateTime, nullable=True)
    finish_date = Column(DateTime, nullable=True)
    
    # Parent Contact
    parent_contact_number = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    user = relationship("User", back_populates="student_profile")
    audit_logs = relationship("ProfileAuditLog", back_populates="profile", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student_profile", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="student_profile", cascade="all, delete-orphan")
    fee_assignments = relationship("FeeAssignment", back_populates="student_profile", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_public_id', 'public_id'),
        Index('idx_status', 'status'),
        Index('idx_course_branch', 'course', 'branch'),
    )


class ProfileAuditLog(Base):
    """Audit log for tracking changes to student profiles."""
    __tablename__ = "profile_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Change details
    field_name = Column(String, nullable=False)  # Field that was changed
    old_value = Column(Text, nullable=True)  # Previous value (as string)
    new_value = Column(Text, nullable=True)  # New value (as string)
    
    # Metadata
    change_reason = Column(Text, nullable=True)  # Optional reason for change
    created_at = Column(DateTime, default=get_utc_now)
    
    # Relationships
    profile = relationship("StudentProfile", back_populates="audit_logs")
    changed_by = relationship("User")
    
    __table_args__ = (
        Index('idx_profile_created', 'profile_id', 'created_at'),
        Index('idx_changed_by', 'changed_by_user_id'),
    )


class ClassSchedule(Base):
    """Class schedule configuration - defines which days classes are held."""
    __tablename__ = "class_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    branch = Column(String, nullable=False, index=True)  # "Rohini-16", "Rohini-11", "Gurgaon", "Online"
    course = Column(String, nullable=True, index=True)  # "Abacus", "Vedic Maths", "Handwriting" (null = all courses)
    level = Column(String, nullable=True)  # Specific level or null for all levels
    batch_name = Column(String, nullable=True)  # Optional batch identifier
    
    # Schedule days (stored as JSON: [0, 6] for Sunday, Saturday)
    # 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    schedule_days = Column(JSON, nullable=False)  # e.g., [5, 6] for Saturday, Sunday
    
    # Time slots (optional, stored as JSON)
    time_slots = Column(JSON, nullable=True)  # e.g., [{"start": "10:00", "end": "11:00"}]
    
    # Active status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    created_by = relationship("User")
    sessions = relationship("ClassSession", back_populates="schedule", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_branch_course', 'branch', 'course'),
    )


class ClassSession(Base):
    """Individual class session - represents a single class on a specific date."""
    __tablename__ = "class_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("class_schedules.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Session details
    session_date = Column(DateTime, nullable=False, index=True)  # Date of the class
    branch = Column(String, nullable=False, index=True)
    course = Column(String, nullable=True)
    level = Column(String, nullable=True)
    batch_name = Column(String, nullable=True)
    
    # Session metadata
    topic = Column(String, nullable=True)  # Optional topic/lesson name
    teacher_remarks = Column(Text, nullable=True)  # General remarks for the session
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Status
    is_completed = Column(Boolean, default=False, nullable=False)  # Whether attendance was taken
    
    # Timestamps
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    schedule = relationship("ClassSchedule", back_populates="sessions")
    created_by = relationship("User")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_session_date_branch', 'session_date', 'branch'),
        Index('idx_session_date', 'session_date'),
    )


class AttendanceRecord(Base):
    """Attendance record for a student in a specific class session."""
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Attendance status: "present", "absent", "on_break", "leave"
    status = Column(String, nullable=False, default="present", index=True)
    
    # T-shirt star tracking (culture reward)
    t_shirt_worn = Column(Boolean, default=False, nullable=False)
    
    # Optional remarks for this specific student
    remarks = Column(Text, nullable=True)
    
    # Marked by
    marked_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    session = relationship("ClassSession", back_populates="attendance_records")
    student_profile = relationship("StudentProfile", back_populates="attendance_records")
    marked_by = relationship("User")
    
    __table_args__ = (
        Index('idx_student_session', 'student_profile_id', 'session_id', unique=True),
        Index('idx_student_date', 'student_profile_id', 'created_at'),
        Index('idx_attendance_status', 'status'),
    )


class Certificate(Base):
    """Certificates issued to students."""
    __tablename__ = "certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Certificate details
    title = Column(String, nullable=False)  # e.g., "Level 1 Completion", "Best Performer"
    marks = Column(Float, nullable=True)  # Optional marks/score
    date_issued = Column(DateTime, nullable=False, index=True)
    
    # Additional details
    description = Column(Text, nullable=True)
    issued_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # File reference (if certificate PDF is stored)
    certificate_file_url = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=get_utc_now)
    
    # Relationships
    student_profile = relationship("StudentProfile", back_populates="certificates")
    issued_by = relationship("User")
    
    __table_args__ = (
        Index('idx_student_issued', 'student_profile_id', 'date_issued'),
    )


class VacantId(Base):
    """Track vacant student IDs from deleted accounts - available for admin to reassign."""
    __tablename__ = "vacant_ids"
    
    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, nullable=False, index=True)  # The vacant ID (e.g., TH-0001)
    
    # Metadata about when it became vacant
    original_student_name = Column(String, nullable=True)  # Name of student whose account was deleted
    deleted_at = Column(DateTime, nullable=False, default=get_utc_now, index=True)  # When account was deleted
    deleted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Admin who deleted the account
    
    # Timestamps
    created_at = Column(DateTime, default=get_utc_now)
    
    # Relationships
    deleted_by = relationship("User")
    
    __table_args__ = (
        Index('idx_vacant_id_public_id', 'public_id'),
        Index('idx_vacant_id_deleted_at', 'deleted_at'),
    )


# Fee Management Models
class FeePlan(Base):
    """Fee plan template - defines fee structure for branches/courses/students."""
    __tablename__ = "fee_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)  # Plan name
    description = Column(Text, nullable=True)
    
    # Applicability - NULL means applicable to all
    branch = Column(String, nullable=True, index=True)  # NULL = all branches
    course = Column(String, nullable=True, index=True)  # NULL = all courses
    level = Column(String, nullable=True)  # NULL = all levels
    
    # Fee details
    fee_amount = Column(Float, nullable=False)  # Base fee amount
    fee_duration_days = Column(Integer, nullable=False)  # Duration in days (e.g., 30 for monthly)
    currency = Column(String, default="INR", nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Metadata
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    created_by = relationship("User")
    assignments = relationship("FeeAssignment", back_populates="fee_plan", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_fee_plan_branch_course', 'branch', 'course'),
        Index('idx_fee_plan_active', 'is_active'),
    )


class FeeAssignment(Base):
    """Fee assignment - links a student to a fee plan with customization."""
    __tablename__ = "fee_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_plan_id = Column(Integer, ForeignKey("fee_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Customized fee amount (overrides plan amount if set)
    custom_fee_amount = Column(Float, nullable=True)
    
    # Discount
    discount_amount = Column(Float, default=0.0, nullable=False)  # Fixed discount
    discount_percentage = Column(Float, default=0.0, nullable=False)  # Percentage discount
    
    # Effective fee (calculated: (custom_fee_amount or plan.fee_amount) - discount)
    effective_fee_amount = Column(Float, nullable=False)
    
    # Assignment dates
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=True, index=True)  # NULL = ongoing
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Metadata
    assigned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    student_profile = relationship("StudentProfile", back_populates="fee_assignments")
    fee_plan = relationship("FeePlan", back_populates="assignments")
    assigned_by = relationship("User")
    transactions = relationship("FeeTransaction", back_populates="assignment", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_student_plan', 'student_profile_id', 'fee_plan_id'),
        Index('idx_active_dates', 'is_active', 'start_date', 'end_date'),
    )


class FeeTransaction(Base):
    """Fee transaction - records individual payments and adjustments."""
    __tablename__ = "fee_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("fee_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Transaction details
    transaction_type = Column(String, nullable=False, index=True)  # "payment", "adjustment", "refund"
    amount = Column(Float, nullable=False)  # Positive for payment, negative for refund/adjustment
    
    # Payment details
    payment_date = Column(DateTime, nullable=False, index=True)
    payment_mode = Column(String, nullable=False, index=True)  # "cash", "online", "cheque", "bank_transfer"
    reference_number = Column(String, nullable=True)  # Transaction reference/cheque number
    
    # Balance tracking
    balance_before = Column(Float, nullable=False)  # Balance before this transaction
    balance_after = Column(Float, nullable=False)  # Balance after this transaction
    
    # Additional details
    remarks = Column(Text, nullable=True)
    is_partial = Column(Boolean, default=False, nullable=False)  # True for partial payments
    
    # Metadata
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, index=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    assignment = relationship("FeeAssignment", back_populates="transactions")
    created_by = relationship("User")
    
    __table_args__ = (
        Index('idx_assignment_date', 'assignment_id', 'payment_date'),
        Index('idx_type_date', 'transaction_type', 'payment_date'),
        Index('idx_payment_mode', 'payment_mode'),
    )


# Add relationships to StudentProfile
# Note: We need to update the StudentProfile model to include these relationships
# This will be done by adding the relationships after the Certificate model definition
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to SQLite if DATABASE_URL is not set
    DATABASE_URL = "sqlite:///./abacus_replitt.db"

# Handle Railway/PostgreSQL connection strings
# Railway provides PostgreSQL with connection strings that may need SSL
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    # Check if SSL parameters are already in the URL
    if "?" not in DATABASE_URL:
        # Add SSL mode for Railway/cloud PostgreSQL
        DATABASE_URL += "?sslmode=require"
    elif "sslmode" not in DATABASE_URL:
        # Add SSL mode if other parameters exist
        DATABASE_URL += "&sslmode=require"
    
    # Create engine with connection pooling for PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,  # Increased from 5 for production load
        max_overflow=30,  # Increased from 10 for burst traffic
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,  # Recycle connections after 1 hour to prevent stale connections
        pool_timeout=30,  # Timeout for getting connection from pool
        echo=False  # Set to True for SQL query logging
    )
else:
    # SQLite doesn't need special configuration
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables."""
    # Ensure fee models are imported (they should be, but just in case)
    try:
        # Import fee models to ensure they're registered with Base.metadata
        from models import FeePlan, FeeAssignment, FeeTransaction  # noqa: F401
    except ImportError:
        pass  # Models might already be imported
    
    print(f"🟡 [INIT_DB] Creating tables... Total models in metadata: {len(Base.metadata.tables)}")
    fee_tables = [t for t in Base.metadata.tables.keys() if 'fee' in t.lower()]
    print(f"🟡 [INIT_DB] Fee-related tables in metadata: {fee_tables}")
    
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except Exception as e:
        # If there are index conflicts, try creating tables individually
        # This can happen if indexes exist but tables don't
        print(f"⚠️ [INIT_DB] Error during create_all: {str(e)}")
        print(f"🟡 [INIT_DB] Attempting to create tables individually...")
        
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        # Create fee tables individually if they don't exist
        fee_tables_needed = {"fee_plans", "fee_assignments", "fee_transactions"}
        for table_name in fee_tables_needed:
            if table_name not in existing_tables:
                try:
                    table = Base.metadata.tables[table_name]
                    table.create(bind=engine, checkfirst=True)
                    print(f"✅ [INIT_DB] Created table: {table_name}")
                except Exception as table_error:
                    print(f"⚠️ [INIT_DB] Could not create {table_name}: {str(table_error)}")
    
    # Verify tables were created
    from sqlalchemy import inspect
    inspector = inspect(engine)
    created_tables = inspector.get_table_names()
    fee_tables_created = [t for t in created_tables if 'fee' in t.lower()]
    print(f"✅ [INIT_DB] Tables verified. Fee tables: {fee_tables_created}")


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

