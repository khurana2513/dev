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
    # Multi-tenant fields (Phase 1)
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_public = Column(Boolean, default=False, nullable=True)
    share_code = Column(String(12), unique=True, nullable=True, index=True)
    # Exam paper fields — set when saving after preview (locks question generation seed)
    fixed_seed = Column(Integer, nullable=True)       # if set, always generates the same questions
    is_exam_paper = Column(Boolean, default=False, nullable=True, index=True)  # saved via exam flow


class User(Base):
    """User model for students and admins."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=True)   # nullable for admin-pre-created accounts
    email = Column(String, unique=True, index=True, nullable=True)        # nullable for accounts without email
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)  # Custom display name for practice sessions
    avatar_url = Column(String, nullable=True)
    role = Column(String, default="student", nullable=False)  # "student" or "admin"
    system_role = Column(String, default="user", nullable=True)  # "user" | "platform_admin" — set on login via ADMIN_EMAILS
    total_points = Column(Integer, default=0, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_practice_date = Column(DateTime, nullable=True)
    total_questions_attempted = Column(Integer, default=0, nullable=False)  # For lifetime badges
    last_grace_skip_date = Column(DateTime, nullable=True)  # Last time grace skip was used
    grace_skip_week_start = Column(DateTime, nullable=True)  # Week start for grace skip tracking
    last_daily_login_bonus_date = Column(Date, nullable=True)  # Last date daily login bonus was given
    is_archived = Column(Boolean, default=False, nullable=False)  # Soft delete flag
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    practice_sessions = relationship("PracticeSession", back_populates="user", cascade="all, delete-orphan")
    paper_attempts = relationship("PaperAttempt", back_populates="user", cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    points_logs = relationship("PointsLog", back_populates="user", cascade="all, delete-orphan")
    paper_templates = relationship("UserPaperTemplate", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        # Covers leaderboard and live-rank scans over active students ordered by points.
        Index('idx_user_role_archived_points', 'role', 'is_archived', 'total_points'),
    )


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
    # Preset key for point rule resolution (e.g. '2x1', '3d2', 'rows_6_9')
    preset_key = Column(String(50), nullable=True)
    # Row count for add_sub-family operations (used by PointRuleEngine)
    row_count = Column(Integer, nullable=True)
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
    # Points awarded for this specific answer (from PointRuleEngine)
    points_awarded = Column(Integer, nullable=True)
    # FK to the point_rule that was applied (nullable for legacy data)
    point_rule_id = Column(Integer, ForeignKey("point_rules.id", ondelete="SET NULL"), nullable=True)
    # Index on created_at alone for streak calendar month-range queries
    created_at = Column(DateTime, default=get_utc_now, index=True)
    
    # Relationships
    session = relationship("PracticeSession", back_populates="attempts")


# NOTE: Old Reward and Leaderboard models have been removed.
# The new reward system lives in reward_models.py:
#   - RewardRule, RewardEvent, BadgeDefinition, StudentBadgeAward,
#     MonthlyLeaderboardSnapshot, RewardAuditLog


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
    
    # Tracks which SharedPaper (by code) triggered this attempt, if any.
    # NULL for direct practice attempts; set for attempts started from a share link.
    shared_paper_code = Column(String(8), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="paper_attempts")
    
    __table_args__ = (
        Index('idx_paper_user_created', 'user_id', 'started_at'),
        # Covers streak vedic-paper count: WHERE completed_at IS NOT NULL AND paper_level=...
        Index('idx_paper_completed_level', 'completed_at', 'paper_level'),
        # Covers per-user paper count grouping in dashboard attempt_counts query
        Index('idx_paper_user_seed_title', 'user_id', 'seed', 'paper_title'),
    )


class SharedPaper(Base):
    """A frozen snapshot of a generated paper, shareable via a short code.

    Anyone with the code can view / attempt the paper within a 24-hour window.
    """
    __tablename__ = "shared_papers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(8), unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    paper_title = Column(String, nullable=False)
    paper_level = Column(String, nullable=False)
    paper_config = Column(JSON, nullable=False)       # Full PaperConfig dict
    generated_blocks = Column(JSON, nullable=False)    # Frozen GeneratedBlock[] list
    seed = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.utcnow().replace(tzinfo=timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    attempt_count = Column(Integer, default=0, nullable=False)

    creator = relationship("User", foreign_keys=[created_by])


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
    # ⚠️  Must be DateTime(timezone=True) → stores as TIMESTAMPTZ in PostgreSQL.
    # Using plain DateTime (TIMESTAMP WITHOUT TIME ZONE) caused psycopg2 to return
    # Python `date` objects when the column was accidentally created as DATE,
    # which Pydantic converts to midnight, which always showed as 05:30 IST.
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="points_logs")
    
    __table_args__ = (
        Index('idx_user_created', 'user_id', 'created_at'),
        Index('idx_source', 'source_type', 'source_id'),
        # Covers weekly leaderboard: WHERE created_at >= week_start GROUP BY user_id
        Index('idx_points_log_created_at', 'created_at'),
    )


class Organization(Base):
    """Organization (tenant) — one per school / coaching institute."""
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)          # URL-safe identifier
    id_prefix = Column(String(3), unique=True, nullable=False, index=True)  # e.g. "TH", "SM"
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)

    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    subscription_tier = Column(String, default="free", nullable=False)
    max_students = Column(Integer, default=10, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    onboarding_complete = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_user_id])
    invite_links = relationship("OrgInviteLink", back_populates="org", cascade="all, delete-orphan")


class OrgInviteLink(Base):
    """Invite link that allows students to join an organization."""
    __tablename__ = "org_invite_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(12), unique=True, nullable=False, index=True)
    role = Column(String, default="student", nullable=False)
    max_uses = Column(Integer, default=100, nullable=False)
    uses_count = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    # Relationships
    org = relationship("Organization", back_populates="invite_links")
    created_by = relationship("User")


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
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

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
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

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
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

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
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

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
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

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


class UserPaperTemplate(Base):
    """User-saved paper templates — max 5 per account."""
    __tablename__ = "user_paper_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(60), nullable=False)
    # Store the paper level (e.g. "AB-1", "Vedic-Level-2", "Custom") or null for custom
    level = Column(String(30), nullable=True)
    # Full serialised list of BlockConfig dicts
    blocks = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    user = relationship("User", back_populates="paper_templates")

    __table_args__ = (
        Index("idx_upt_user_name", "user_id", "name", unique=True),
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
        # Railway Hobby Postgres allows ~25 total connections.
        # pool_size=5 + max_overflow=10 = 15 max checked-out connections per process.
        # Keeps headroom for admin tools, migrations, PgBouncer, and Railway internals.
        # On Pro plan (100 connections) you can raise to pool_size=20, max_overflow=40.
        pool_size=5,
        max_overflow=10,
        # pool_pre_ping validates connections on checkout; avoids stale-connection errors
        # after Railway's idle timeout. Cost is negligible (1 round trip on checkout only).
        pool_pre_ping=True,
        pool_recycle=300,   # 5 minutes: hard recycle regardless of health
        pool_timeout=10,    # Fail fast instead of blocking requests for 30s
        connect_args={
            "keepalives": 1,           # Enable TCP keepalives
            "keepalives_idle": 30,     # Send keepalive after 30s idle
            "keepalives_interval": 5,  # Retry every 5s
            "keepalives_count": 5,     # Drop after 5 failures
            "connect_timeout": 10,     # Fail fast on new connection (not 30s default)
        },
        echo=False
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

