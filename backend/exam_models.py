"""
Exam system database models.

Design principles:
- ExamPaper: The scheduled exam event (links to a saved Paper template)
- ExamSession: One row per student per exam (created when student joins)
- ExamAnswer: One row per question per student; upserted on every save
- ExamEvent: Audit log of critical state transitions (joined, submitted, tab_switch, etc.)

Answer durability contract:
  - Client writes to localStorage on every keystroke (no network needed)
  - Client POSTs to /exam/{code}/answer every time an answer changes (debounced 1.5s)
  - Server upserts ExamAnswer — idempotent; safe to call many times with same data
  - On server auto-submit (timer expiry): all ExamAnswers already present are scored
  - On reconnect after crash: client syncs localStorage answers back to server
  This means we NEVER lose an answer as long as at least ONE of the two paths worked.
"""
from sqlalchemy import (
    Column, Integer, String, JSON, DateTime, Float,
    Boolean, ForeignKey, Text, Index, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from models import Base
from timezone_utils import get_utc_now


class ExamPaper(Base):
    """
    A scheduled examination event.
    Wraps a saved Paper (paper_id) with scheduling, access and grading settings.
    """
    __tablename__ = "exam_papers"

    id = Column(Integer, primary_key=True, index=True)

    # Human-readable 8-char join code, e.g. "ABAC-2025"
    exam_code = Column(String(12), unique=True, nullable=False, index=True)

    title = Column(String(200), nullable=False)

    # Links to the existing Paper model — questions come from there
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="RESTRICT"), nullable=False, index=True)

    created_by_admin_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ── Timing ──────────────────────────────────────
    # All stored as UTC naive datetimes (consistent with rest of codebase)
    scheduled_start_at = Column(DateTime, nullable=False)
    scheduled_end_at = Column(DateTime, nullable=False)        # hard wall-clock end
    duration_seconds = Column(Integer, nullable=False)         # each student's personal timer
    # How many minutes after scheduled_start_at a student can still join
    late_join_cutoff_minutes = Column(Integer, default=5, nullable=False)

    # ── Paper/question settings ──────────────────────
    # Seed used to generate questions; if null, a fresh seed is used at exam start
    fixed_seed = Column(Integer, nullable=True)
    # Each student gets their own question order (shuffled from fixed_seed + student_id)
    shuffle_questions = Column(Boolean, default=True, nullable=False)

    # ── Exam behaviour ────────────────────────────────
    allow_back_navigation = Column(Boolean, default=True, nullable=False)
    auto_submit_on_expiry = Column(Boolean, default=True, nullable=False)
    # How many seconds after expiry the server accepts a late-flying POST answer
    grace_window_seconds = Column(Integer, default=10, nullable=False)

    # ── Access control ────────────────────────────────
    # If set, only students in this org can join
    org_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # If True, any student with the code can join (across orgs)
    is_open = Column(Boolean, default=False, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)

    # ── Status ────────────────────────────────────────
    # draft | published | live | ended | graded | results_released
    status = Column(String(20), default="draft", nullable=False, index=True)

    # ── Result release ────────────────────────────────
    # manual | auto — manual means admin explicitly releases
    results_release_mode = Column(String(10), default="manual", nullable=False)
    results_released_at = Column(DateTime, nullable=True)
    show_answers_to_students = Column(Boolean, default=False, nullable=False)

    # ── Actual timing (set when admin/scheduler actually starts/ends) ─────────
    actual_started_at = Column(DateTime, nullable=True)   # when exam truly went live
    actual_ended_at = Column(DateTime, nullable=True)     # when exam truly ended

    # ── Meta ──────────────────────────────────────────
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    sessions = relationship(
        "ExamSession", back_populates="exam_paper", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_exam_paper_code", "exam_code"),
        Index("idx_exam_paper_status", "status"),
        Index("idx_exam_paper_start", "scheduled_start_at"),
    )


class ExamSession(Base):
    """
    One row per (exam, student) pair.
    Created when the student successfully joins (after PIN + code check).
    """
    __tablename__ = "exam_sessions"

    id = Column(Integer, primary_key=True, index=True)
    exam_paper_id = Column(
        Integer, ForeignKey("exam_papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Join metadata ────────────────────────────────
    joined_at = Column(DateTime, nullable=True)       # when student entered waiting room
    exam_started_at = Column(DateTime, nullable=True)  # when student actually started questions

    # ── Submission ────────────────────────────────────
    submitted_at = Column(DateTime, nullable=True)
    # "active" | "waiting" | "submitted" | "auto_submitted" | "terminated"
    status = Column(String(20), default="waiting", nullable=False, index=True)
    force_submitted = Column(Boolean, default=False, nullable=False)

    # ── Question order ────────────────────────────────
    # JSON array of question IDs in the order shown to this student
    question_order = Column(JSON, nullable=True)
    # Seed used for this student's shuffle
    shuffle_seed = Column(Integer, nullable=True)

    # ── Timing ────────────────────────────────────────
    # Server records when student's personal timer started (= exam_started_at)
    # and calculates server_deadline = exam_started_at + duration_seconds
    server_deadline = Column(DateTime, nullable=True)
    time_used_seconds = Column(Float, nullable=True)

    # ── Device / client info ─────────────────────────
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    # Simple fingerprint (screen size + timezone + UA hash) to detect multi-device
    device_fingerprint = Column(String(64), nullable=True)

    # ── Scoring (populated post-grading) ─────────────
    total_marks = Column(Float, nullable=True)
    scored_marks = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    rank = Column(Integer, nullable=True)
    pass_fail = Column(String(4), nullable=True)   # "pass" | "fail"
    is_graded = Column(Boolean, default=False, nullable=False)
    graded_at = Column(DateTime, nullable=True)
    is_result_released = Column(Boolean, default=False, nullable=False)

    # ── Proctoring summary ────────────────────────────
    flag_count = Column(Integer, default=0, nullable=False)
    tab_switch_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    exam_paper = relationship("ExamPaper", back_populates="sessions")
    answers = relationship(
        "ExamAnswer", back_populates="session", cascade="all, delete-orphan"
    )
    events = relationship(
        "ExamEvent", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("exam_paper_id", "user_id", name="uq_exam_session_user"),
        Index("idx_exam_session_exam_user", "exam_paper_id", "user_id"),
        Index("idx_exam_session_status", "exam_paper_id", "status"),
    )


class ExamAnswer(Base):
    """
    One row per (session, question).
    Upserted on every save — this is the durability anchor.

    Raw answer is always stored as a string (up to 20 chars).
    Scoring reads it and converts to float for comparison.

    Valid answer characters: 0-9, '.', '-'  (max 20 chars)
    Empty string = unanswered.
    """
    __tablename__ = "exam_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # question_id as stored in the generated paper's questions list
    question_id = Column(Integer, nullable=False)

    # Raw string answer as typed by student (max 20 chars, digits/./-)
    raw_answer = Column(String(20), nullable=False, default="")
    # Parsed float (null if raw_answer is empty or unparseable)
    parsed_answer = Column(Float, nullable=True)

    # Timestamps
    first_answered_at = Column(DateTime, nullable=True)   # When first non-empty answer was saved
    last_updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Scoring (populated post-grading)
    correct_answer = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)

    # Relationship
    session = relationship("ExamSession", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uq_exam_answer_session_q"),
        Index("idx_exam_answer_session", "session_id"),
    )


class ExamEvent(Base):
    """
    Audit log of events during an exam session.
    Used for proctoring review and dispute resolution.
    Append-only; never updated after insert.
    """
    __tablename__ = "exam_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Event type constants:
    # "joined" | "exam_started" | "answer_saved" | "submitted" | "auto_submitted"
    # "tab_switch" | "window_blur" | "visibility_hidden"
    # "offline_start" | "offline_end" | "reconnected"
    # "fullscreen_exit" | "copy_paste" | "devtools_open"
    # "force_submitted_by_admin" | "terminated_by_admin"
    event_type = Column(String(40), nullable=False, index=True)

    # Free-form JSON payload (e.g. {question_id: 5, answer: "42"} for answer_saved)
    payload = Column(JSON, nullable=True)

    occurred_at = Column(DateTime, default=get_utc_now, nullable=False)

    # Relationship
    session = relationship("ExamSession", back_populates="events")

    __table_args__ = (
        Index("idx_exam_event_session_type", "session_id", "event_type"),
        Index("idx_exam_event_occurred", "session_id", "occurred_at"),
    )
