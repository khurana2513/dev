"""Pydantic schemas for user-related models."""
from pydantic import BaseModel, EmailStr, field_serializer, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from timezone_utils import utc_to_ist, IST_TIMEZONE


class UserBase(BaseModel):
    email: Optional[str] = None       # Optional: admin-created accounts may not have email
    name: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    google_id: str
    role: str = "student"


class UserResponse(UserBase):
    id: int
    role: str
    total_points: int
    current_streak: int
    longest_streak: int
    is_archived: bool = False
    created_at: datetime
    public_id: Optional[str] = None  # Student public ID (TH-0001 format)
    
    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO string with IST timezone."""
        if dt.tzinfo == IST_TIMEZONE:
            # Already IST, return as-is
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive - assume UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone, assume it's UTC and convert
            ist_dt = utc_to_ist(dt)
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    credential: Optional[str] = None
    token: Optional[str] = None

    def get_token(self) -> str:
        if self.credential:
            return self.credential.strip()
        if self.token:
            return self.token.strip()
        raise ValueError("Missing Google OAuth token")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"



class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class PracticeSessionCreate(BaseModel):
    operation_type: str
    difficulty_mode: str
    total_questions: int
    correct_answers: int
    wrong_answers: int
    accuracy: float
    score: int
    time_taken: float
    points_earned: int
    attempts: List[dict]  # List of attempt data


class AttemptResponse(BaseModel):
    id: int
    question_data: dict
    user_answer: Optional[float]
    correct_answer: float
    is_correct: bool
    time_taken: float
    question_number: int
    created_at: datetime
    
    model_config = {"from_attributes": True}


class PracticeSessionResponse(BaseModel):
    id: int
    operation_type: str
    difficulty_mode: str
    total_questions: int
    correct_answers: int
    wrong_answers: int
    accuracy: float
    score: int
    time_taken: float
    points_earned: int
    started_at: datetime
    completed_at: Optional[datetime]
    
    @field_serializer('started_at', 'completed_at')
    def serialize_datetime(self, dt: Optional[datetime], _info) -> Optional[str]:
        """Serialize datetime to ISO string with IST timezone for API response."""
        if dt is None:
            return None
        
        # Handle different timezone scenarios:
        # 1. Timezone=IST: Old data stored as IST, return as-is (already IST)
        # 2. Timezone=None: New UTC data stored as naive, convert UTC→IST
        # 3. Timezone=UTC: New UTC data stored with tzinfo, convert UTC→IST
        # 4. Other timezone: Treat as UTC and convert UTC→IST
        
        if dt.tzinfo == IST_TIMEZONE:
            # Old IST data (or correctly stored IST), return as-is
            # Already has +05:30 offset, which is correct for IST
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive datetime - assume it's UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone info like UTC or something else
            # Treat as starting point for UTC to IST conversion
            ist_dt = utc_to_ist(dt) if dt.tzinfo != IST_TIMEZONE else dt
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


class PracticeSessionDetailResponse(PracticeSessionResponse):
    attempts: List[AttemptResponse]


class StudentStats(BaseModel):
    total_sessions: int  # Mental math sessions + practice paper attempts
    total_questions: int
    total_correct: int
    total_wrong: int
    overall_accuracy: float
    total_points: int
    current_streak: int
    longest_streak: int
    badges: List[str]
    recent_sessions: List[PracticeSessionResponse]
    recent_paper_attempts: List["PaperAttemptResponse"] = Field(default_factory=list)
    # Practice paper metrics
    total_paper_attempts: int = 0
    paper_total_questions: int = 0
    paper_total_correct: int = 0
    paper_total_wrong: int = 0
    paper_overall_accuracy: float = 0.0


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    avatar_url: Optional[str]
    total_points: int
    weekly_points: int
    # Student profile fields (None for users without a profile)
    public_id: Optional[str] = None
    level: Optional[str] = None
    course: Optional[str] = None
    branch: Optional[str] = None


class AdminStats(BaseModel):
    total_students: int
    total_sessions: int
    total_questions: int
    average_accuracy: float
    active_students_today: int
    top_students: List[LeaderboardEntry]


class PaperAttemptCreate(BaseModel):
    paper_title: str
    paper_level: str
    paper_config: dict
    generated_blocks: List[dict]
    seed: int
    answers: Optional[dict] = None  # {question_id: answer}
    time_taken: Optional[float] = None


class PaperAttemptResponse(BaseModel):
    id: int
    paper_title: str
    paper_level: str
    total_questions: int
    correct_answers: int
    wrong_answers: int
    accuracy: float
    score: int
    time_taken: Optional[float]
    points_earned: int
    started_at: datetime
    completed_at: Optional[datetime]
    seed: int  # Seed used for paper generation (needed for re-attempt limit checking)
    
    @field_serializer('started_at', 'completed_at')
    def serialize_datetime(self, dt: Optional[datetime], _info) -> Optional[str]:
        """Serialize datetime to ISO string with IST timezone for API response."""
        if dt is None:
            return None
        
        # Handle different timezone scenarios:
        # 1. Timezone=IST: Old data stored as IST, return as-is (already IST)
        # 2. Timezone=None: New UTC data stored as naive, convert UTC→IST
        # 3. Timezone=UTC: New UTC data stored with tzinfo, convert UTC→IST
        # 4. Other timezone: Treat as UTC and convert UTC→IST
        
        if dt.tzinfo == IST_TIMEZONE:
            # Old IST data (or correctly stored IST), return as-is
            # Already has +05:30 offset, which is correct for IST
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive datetime - assume it's UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone info like UTC or something else
            # Treat as starting point for UTC to IST conversion
            ist_dt = utc_to_ist(dt) if dt.tzinfo != IST_TIMEZONE else dt
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


class PaperAttemptDetailResponse(PaperAttemptResponse):
    paper_config: dict
    generated_blocks: List[dict]
    seed: int
    answers: Optional[dict]


class PaperAttemptSubmit(BaseModel):
    answers: dict
    time_taken: float


# Student Profile Schemas
class StudentProfileBase(BaseModel):
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    class_name: Optional[str] = None
    course: Optional[str] = None  # "Abacus", "Vedic Maths", "Handwriting"
    level_type: Optional[str] = None  # "Regular" or "Junior"
    level: Optional[str] = None
    branch: Optional[str] = None  # "Rohini-16", "Rohini-11", "Gurgaon", "Online"
    status: Optional[str] = None  # "active", "inactive", "closed" - Optional so students can update without it
    join_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    parent_contact_number: Optional[str] = None


class StudentProfileCreate(StudentProfileBase):
    pass


class StudentProfileUpdate(StudentProfileBase):
    pass


# ─── Admin Student Creation ────────────────────────────────────────────────────

class AdminCreateStudentRequest(BaseModel):
    """Request body for admin creating a student manually (no OAuth required)."""
    name: str
    email: Optional[str] = None          # Optional – student may not have a Google account yet
    display_name: Optional[str] = None
    class_name: Optional[str] = None
    course: Optional[str] = None          # "Abacus", "Vedic Maths", "Handwriting"
    level_type: Optional[str] = None      # "Regular", "Junior"
    level: Optional[str] = None
    branch: Optional[str] = None          # "Rohini-16", "Rohini-11", "Gurgaon", "Online"
    status: Optional[str] = "active"      # "active", "inactive", "closed"
    join_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    parent_contact_number: Optional[str] = None


class AdminUpdateStudentRequest(BaseModel):
    """Request body for admin updating a student's basic info + profile."""
    name: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    class_name: Optional[str] = None
    course: Optional[str] = None
    level_type: Optional[str] = None
    level: Optional[str] = None
    branch: Optional[str] = None
    status: Optional[str] = None
    join_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    parent_contact_number: Optional[str] = None


class AdminStudentResponse(BaseModel):
    """Response schema for admin-created/managed students — includes all profile fields."""
    # ── User fields ────────────────────────────────────────────────────────────
    id: int
    email: Optional[str] = None
    name: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    total_points: int
    current_streak: int
    longest_streak: int
    is_archived: bool = False
    created_at: datetime
    public_id: Optional[str] = None
    # ── Profile fields ─────────────────────────────────────────────────────────
    class_name: Optional[str] = None
    course: Optional[str] = None
    level_type: Optional[str] = None
    level: Optional[str] = None
    branch: Optional[str] = None
    status: str = "active"
    join_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    parent_contact_number: Optional[str] = None

    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info) -> str:
        if dt.tzinfo == IST_TIMEZONE:
            return dt.isoformat()
        elif dt.tzinfo is None:
            utc_dt = dt.replace(tzinfo=timezone.utc)
            return utc_to_ist(utc_dt).isoformat()
        else:
            return utc_to_ist(dt).isoformat()

    @field_serializer('join_date', 'finish_date')
    def serialize_opt_datetime(self, dt: Optional[datetime], _info) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo == IST_TIMEZONE:
            return dt.isoformat()
        elif dt.tzinfo is None:
            return utc_to_ist(dt.replace(tzinfo=timezone.utc)).isoformat()
        else:
            return utc_to_ist(dt).isoformat()

    model_config = {"from_attributes": True}


class StudentProfileResponse(StudentProfileBase):
    id: int
    user_id: int
    public_id: Optional[str]
    internal_uuid: str
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('created_at', 'updated_at', 'join_date', 'finish_date')
    def serialize_datetime(self, dt: Optional[datetime], _info) -> Optional[str]:
        """Serialize datetime to ISO string with IST timezone."""
        if dt is None:
            return None
        if dt.tzinfo == IST_TIMEZONE:
            # Already IST, return as-is
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive - assume UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone, assume it's UTC and convert
            ist_dt = utc_to_ist(dt)
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


class ProfileAuditLogResponse(BaseModel):
    id: int
    profile_id: int
    changed_by_user_id: int
    changed_by_name: Optional[str] = None
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    change_reason: Optional[str]
    created_at: datetime
    
    model_config = {"from_attributes": True}


# Attendance System Schemas
class ClassScheduleCreate(BaseModel):
    branch: str
    course: Optional[str] = None
    level: Optional[str] = None
    batch_name: Optional[str] = None
    schedule_days: List[int]  # [0-6] for Monday-Sunday
    time_slots: Optional[List[Dict[str, Any]]] = None
    is_active: bool = True


class ClassScheduleResponse(BaseModel):
    id: int
    branch: str
    course: Optional[str]
    level: Optional[str]
    batch_name: Optional[str]
    schedule_days: List[int]
    time_slots: Optional[List[Dict[str, Any]]]
    is_active: bool
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class ClassSessionCreate(BaseModel):
    session_date: datetime
    branch: str
    course: Optional[str] = None
    level: Optional[str] = None
    batch_name: Optional[str] = None
    topic: Optional[str] = None
    teacher_remarks: Optional[str] = None
    schedule_id: Optional[int] = None


class ClassSessionResponse(BaseModel):
    id: int
    schedule_id: Optional[int]
    session_date: datetime
    branch: str
    course: Optional[str]
    level: Optional[str]
    batch_name: Optional[str]
    topic: Optional[str]
    teacher_remarks: Optional[str]
    is_completed: bool
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('session_date', 'created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO string with IST timezone."""
        if dt.tzinfo == IST_TIMEZONE:
            # Already IST, return as-is
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive - assume UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone, assume it's UTC and convert
            ist_dt = utc_to_ist(dt)
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


class AttendanceRecordCreate(BaseModel):
    session_id: int
    student_profile_id: int
    status: str  # "present", "absent", "on_break", "leave"
    t_shirt_worn: Optional[bool] = False  # T-shirt star tracking
    remarks: Optional[str] = None


class AttendanceRecordUpdate(BaseModel):
    status: Optional[str] = None
    t_shirt_worn: Optional[bool] = None
    remarks: Optional[str] = None


class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    student_profile_id: int
    status: str
    t_shirt_worn: bool
    remarks: Optional[str]
    marked_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    # Related data
    session: Optional[ClassSessionResponse] = None
    student_name: Optional[str] = None
    student_public_id: Optional[str] = None
    
    model_config = {"from_attributes": True}


class BulkAttendanceCreate(BaseModel):
    session_id: int
    attendance_data: List[AttendanceRecordCreate]  # List of attendance records


class AttendanceStats(BaseModel):
    total_sessions: int
    present_count: int
    absent_count: int
    on_break_count: int
    leave_count: int
    attendance_percentage: float
    monthly_stats: Optional[Dict[str, Any]] = None  # Month-wise breakdown


class CertificateCreate(BaseModel):
    student_profile_id: int
    title: str
    marks: Optional[float] = None
    date_issued: datetime
    description: Optional[str] = None
    certificate_file_url: Optional[str] = None


class CertificateResponse(BaseModel):
    id: int
    student_profile_id: int
    title: str
    marks: Optional[float]
    date_issued: datetime
    description: Optional[str]
    certificate_file_url: Optional[str]
    issued_by_user_id: int
    created_at: datetime
    
    # Related data
    student_name: Optional[str] = None
    student_public_id: Optional[str] = None
    
    model_config = {"from_attributes": True}


# Student ID Management Schemas
class StudentIDInfo(BaseModel):
    user_id: int
    current_public_id: Optional[str] = None
    student_name: str
    email: str


class UpdateStudentIDRequest(BaseModel):
    new_public_id: str

    model_config = {"from_attributes": True}


class UpdateStudentIDResponse(BaseModel):
    success: bool
    message: str
    old_public_id: Optional[str] = None
    new_public_id: str
    student_name: str

    model_config = {"from_attributes": True}


# Reward System Schemas
class BadgeResponse(BaseModel):
    id: int
    badge_type: str
    badge_name: str
    badge_category: str
    is_lifetime: bool
    month_earned: Optional[str] = None
    earned_at: datetime
    
    @field_serializer('earned_at')
    def serialize_earned_at(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO string with IST timezone."""
        if dt.tzinfo == IST_TIMEZONE:
            # Already IST, return as-is
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive - assume UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone, assume it's UTC and convert
            ist_dt = utc_to_ist(dt)
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


class PointsLogResponse(BaseModel):
    """Points log entry response."""
    id: int
    points: int
    source_type: str
    description: str
    source_id: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None   # column name in DB is extra_data (NOT metadata)
    created_at: datetime
    
    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO string with IST timezone."""
        if dt.tzinfo == IST_TIMEZONE:
            # Already IST, return as-is
            return dt.isoformat()
        elif dt.tzinfo is None:
            # Naive - assume UTC (new data after fix)
            utc_dt = dt.replace(tzinfo=timezone.utc)
            ist_dt = utc_to_ist(utc_dt)
            return ist_dt.isoformat()
        else:
            # Has timezone, assume it's UTC and convert
            ist_dt = utc_to_ist(dt)
            return ist_dt.isoformat()
    
    model_config = {"from_attributes": True}


class PointsSummaryResponse(BaseModel):
    """Points summary with checksum."""
    total_points_from_logs: int
    total_points_from_user: int
    match: bool
    logs: List[PointsLogResponse]
    total_entries: int


class SuperProgress(BaseModel):
    current_letter: Optional[str] = None  # S, U, P, E, R
    current_points: int
    next_milestone: int
    next_milestone_type: str  # "chocolate", "letter", "special"
    progress_percentage: float
    unlocked_rewards: List[str]  # List of reward names unlocked


class RewardSummaryResponse(BaseModel):
    total_points: int
    current_streak: int
    longest_streak: int
    attendance_percentage: float
    total_questions_attempted: int
    super_progress: SuperProgress
    current_badges: List[BadgeResponse]  # Current month badges + lifetime badges
    lifetime_badges: List[BadgeResponse]
    monthly_badges: List[BadgeResponse]  # Current month only
    can_use_grace_skip: bool
    grace_skip_reason: Optional[str] = None


class GraceSkipResponse(BaseModel):
    success: bool
    message: str
    points_remaining: int
    streak_preserved: bool


# ─── Combined Dashboard Response Schemas ────────────────────────────────────────
# These aggregate multiple data sources into a single response to eliminate
# chatty API architecture (9-12 calls → 1-2 calls per dashboard load)

class StudentDashboardData(BaseModel):
    """Combined student dashboard data."""
    stats: StudentStats
    profile: Optional[StudentProfileResponse] = None
    paper_attempts: List[PaperAttemptResponse] = Field(default_factory=list)


class AdminDashboardData(BaseModel):
    """Combined admin dashboard data - replaces 3+ separate API calls."""
    stats: AdminStats
    students: List[AdminStudentResponse]
    database_stats: "DatabaseStatsSchema"


class DatabaseStatsSchema(BaseModel):
    """Database statistics for admin dashboard (used in combined endpoint)."""
    total_users: int
    total_students: int
    total_admins: int
    total_sessions: int
    total_paper_attempts: int
    total_rewards: int
    total_papers: int
    database_size_mb: float


StudentStats.model_rebuild()
AdminDashboardData.model_rebuild()
