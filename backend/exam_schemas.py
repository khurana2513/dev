"""
Pydantic schemas for the exam system.

Naming convention mirrors the rest of the codebase (user_schemas.py, schemas.py).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── helpers ──────────────────────────────────────────────────────────────────

def _parse_numeric_answer(raw: str) -> Optional[float]:
    """
    Parse a student's raw answer string into a float.

    Valid characters: 0-9, '.', '-'
    Returns None if empty or not parseable.
    """
    s = raw.strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


# ── Admin: create / update exam ───────────────────────────────────────────────

class ExamPaperCreate(BaseModel):
    """Admin creates a new scheduled exam from an existing saved Paper."""
    title: str = Field(min_length=1, max_length=200)
    paper_id: int
    exam_code: Optional[str] = Field(default=None, min_length=None, max_length=12, description="Unique join code, e.g. EAB3KF; auto-generated if omitted")
    scheduled_start_at: datetime       # UTC
    scheduled_end_at: datetime         # UTC
    duration_seconds: int = Field(ge=60, le=10800)  # 1 min – 3 hours
    late_join_cutoff_minutes: int = Field(default=5, ge=0, le=60)
    shuffle_questions: bool = True
    allow_back_navigation: bool = True
    auto_submit_on_expiry: bool = True
    grace_window_seconds: int = Field(default=10, ge=0, le=60)
    org_id: Optional[str] = None
    is_open: bool = False
    results_release_mode: str = "manual"

    @field_validator("exam_code")
    @classmethod
    def normalize_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip().upper()
        return stripped if stripped else None

    @field_validator("scheduled_end_at")
    @classmethod
    def end_after_start(cls, v: datetime, info: Any) -> datetime:
        start = info.data.get("scheduled_start_at")
        if start and v <= start:
            raise ValueError("scheduled_end_at must be after scheduled_start_at")
        return v


class ExamPaperUpdate(BaseModel):
    """Admin partial update — all fields optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    scheduled_start_at: Optional[datetime] = None
    scheduled_end_at: Optional[datetime] = None
    duration_seconds: Optional[int] = Field(default=None, ge=60, le=10800)
    late_join_cutoff_minutes: Optional[int] = Field(default=None, ge=0, le=60)
    shuffle_questions: Optional[bool] = None
    allow_back_navigation: Optional[bool] = None
    auto_submit_on_expiry: Optional[bool] = None
    grace_window_seconds: Optional[int] = Field(default=None, ge=0, le=60)
    is_open: Optional[bool] = None
    is_published: Optional[bool] = None
    results_release_mode: Optional[str] = None
    show_answers_to_students: Optional[bool] = None


class ExamPaperResponse(BaseModel):
    """Returned to admin on create/list/get."""
    model_config = {"from_attributes": True}

    id: int
    exam_code: str
    title: str
    paper_id: int
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    duration_seconds: int
    late_join_cutoff_minutes: int
    shuffle_questions: bool
    allow_back_navigation: bool
    auto_submit_on_expiry: bool
    grace_window_seconds: int
    org_id: Optional[str] = None
    is_open: bool
    is_published: bool
    status: str
    results_release_mode: str
    results_released_at: Optional[datetime] = None
    show_answers_to_students: bool
    created_at: datetime
    # Derived counts — populated server-side before returning
    total_joined: int = 0
    total_submitted: int = 0
    total_active: int = 0


# ── Student: join ─────────────────────────────────────────────────────────────

class StudentJoinRequest(BaseModel):
    """Student submits this to enter a waiting room."""
    exam_code: str
    # device_fingerprint from client (optional, used for multi-device detection only)
    device_fingerprint: Optional[str] = Field(default=None, max_length=64)

    @field_validator("exam_code")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.strip().upper()


class JoinResponse(BaseModel):
    """Returned immediately after successful join."""
    session_id: int
    exam_title: str
    exam_code: str
    duration_seconds: int
    allow_back_navigation: bool
    scheduled_start_at: datetime
    server_time_utc: datetime          # client uses this to calibrate its clock
    status: str                        # "waiting" | "active"
    # Included only when status == "active" (exam already started):
    seconds_elapsed: Optional[float] = None


# ── Exam Questions (delivered at start) ───────────────────────────────────────

class ExamQuestion(BaseModel):
    """One question as delivered to the student."""
    id: int
    display_index: int    # 1-based position in this student's order
    text: str
    # No "answer" field — never sent to client


class ExamQuestionsResponse(BaseModel):
    """Questions payload delivered at exam start."""
    session_id: int
    questions: List[ExamQuestion]
    total: int
    server_time_utc: datetime
    # Student's personal deadline (UTC)
    server_deadline: datetime


# ── Answer save ───────────────────────────────────────────────────────────────

class AnswerSaveRequest(BaseModel):
    """Single answer save. Safe to call repeatedly — server upserts."""
    question_id: int
    # Raw string: digits, '.', '-', max 20 chars; empty string = clear answer
    raw_answer: str = Field(default="", max_length=20)
    # Client timestamp (ISO string) for ordering when offline sync arrives
    client_timestamp: Optional[str] = Field(default=None, max_length=30)

    @field_validator("raw_answer")
    @classmethod
    def validate_answer_chars(cls, v: str) -> str:
        allowed = set("0123456789.-")
        cleaned = v.strip()
        if cleaned and not all(c in allowed for c in cleaned):
            raise ValueError("Answer may only contain digits, '.', and '-'")
        return cleaned


class BulkAnswerSaveRequest(BaseModel):
    """
    Bulk answer sync — used on reconnect or before submit
    to push all locally-stored answers at once.
    Each item is (question_id, raw_answer, client_timestamp).
    """
    answers: List[AnswerSaveRequest]


class AnswerSaveResponse(BaseModel):
    """Returned after each save so client can confirm server received it."""
    question_id: int
    saved: bool
    server_time_utc: datetime


# ── Submit ────────────────────────────────────────────────────────────────────

class SubmitRequest(BaseModel):
    """
    Final submission.
    Client sends all answers one more time as a safety net.
    Server merges: if server already has a more-recent answer for a given
    question_id (from earlier saves), it keeps that one.
    """
    answers: List[AnswerSaveRequest]


class SubmitResponse(BaseModel):
    submission_id: str       # "{session_id}-{exam_code}" — opaque token for student to keep
    submitted_at: datetime
    total_answered: int
    total_questions: int
    message: str


# ── Student result (after release) ────────────────────────────────────────────

class StudentResultResponse(BaseModel):
    model_config = {"from_attributes": True}

    session_id: int
    exam_title: str
    exam_code: str
    submitted_at: Optional[datetime]
    total_marks: Optional[float]
    scored_marks: Optional[float]
    percentage: Optional[float]
    rank: Optional[int]
    pass_fail: Optional[str]
    is_graded: bool
    is_result_released: bool
    show_answers: bool = False
    # Only included when show_answers is True
    answer_detail: Optional[List[dict]] = None


# ── Admin: session list / detail ──────────────────────────────────────────────

class ExamSessionSummary(BaseModel):
    """Lightweight session row for admin list view."""
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    student_name: str
    public_id: Optional[str] = None
    status: str
    joined_at: Optional[datetime]
    submitted_at: Optional[datetime]
    time_used_seconds: Optional[float]
    answers_saved: int = 0
    flag_count: int
    tab_switch_count: int
    scored_marks: Optional[float]
    percentage: Optional[float]
    rank: Optional[int]
    pass_fail: Optional[str]


class ExamSessionDetail(ExamSessionSummary):
    """Full session detail including per-question answers."""
    answer_detail: List[dict] = []
    events: List[dict] = []


# ── Admin: grade / release ────────────────────────────────────────────────────

class GradeExamRequest(BaseModel):
    """Trigger grading for a specific exam."""
    exam_paper_id: int


class ReleaseResultsRequest(BaseModel):
    exam_paper_id: int
    show_answers_to_students: bool = False


# ── Admin cockpit (live monitoring) ──────────────────────────────────────────

class CockpitResponse(BaseModel):
    """Snapshot for admin live cockpit dashboard."""
    exam_paper_id: int
    exam_code: str
    status: str
    total_registered: int    # issued a session row
    total_waiting: int
    total_active: int
    total_submitted: int
    total_auto_submitted: int
    total_not_joined: int    # students in org with no session yet
    server_time_utc: datetime
    seconds_remaining: Optional[float]   # from scheduled_end_at

    # Live events feed (last 20 events across all sessions)
    recent_events: List[dict] = []
