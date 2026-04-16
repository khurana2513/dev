"""
Exam System API Routes.

All endpoints are prefixed with /exam (registered in main.py).

Architecture:
  - Answers are saved via HTTP POST to /exam/{code}/answer (upsert — safe to call many times)
  - localStorage is the primary durability layer on the client
  - On reconnect, client bulk-syncs localStorage → /exam/{code}/answers
  - SSE (/exam/{code}/sse) delivers control events: exam_started, announce, force_submit

Endpoint groups:
  Admin:
    POST  /             create exam
    GET   /admin/all    list all exams
    PATCH /{code}       update exam
    DELETE/{code}       delete exam
    POST  /{code}/admin/publish
    POST  /{code}/admin/start
    POST  /{code}/admin/end
    POST  /{code}/admin/grade
    POST  /{code}/admin/release
    POST  /{code}/admin/announce
    POST  /{code}/admin/force-submit/{session_id}
    GET   /{code}/admin/cockpit
    GET   /{code}/admin/sessions

  Authenticated students:
    GET   /{code}              exam info (for join screen)
    POST  /{code}/join
    GET   /{code}/questions    (only when exam is live)
    POST  /{code}/answer       save one answer (upsert)
    POST  /{code}/answers      bulk save (reconnect sync)
    POST  /{code}/submit
    GET   /{code}/session      current state + existing answers
    GET   /{code}/result       (only after results released)
    GET   /{code}/sse          SSE stream
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import random
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth import get_current_admin, get_current_user
from exam_models import ExamAnswer, ExamEvent, ExamPaper, ExamSession
from exam_schemas import (
    AnswerSaveRequest,
    AnswerSaveResponse,
    BulkAnswerSaveRequest,
    CockpitResponse,
    ExamPaperCreate,
    ExamPaperResponse,
    ExamPaperUpdate,
    ExamQuestion,
    ExamQuestionsResponse,
    ExamSessionSummary,
    GradeExamRequest,
    JoinResponse,
    ReleaseResultsRequest,
    StudentJoinRequest,
    StudentResultResponse,
    SubmitRequest,
    SubmitResponse,
)
from math_generator import generate_block
from models import Paper, User, get_db
from schemas import BlockConfig, PaperConfig

router = APIRouter(prefix="/exam", tags=["exam"])
logger = logging.getLogger(__name__)


# ── SSE registry ──────────────────────────────────────────────────────────────
# Maps exam_code.upper() → list of asyncio.Queue (one per connected SSE client)
_sse_queues: Dict[str, List[asyncio.Queue]] = {}


async def _broadcast(exam_code: str, event: dict) -> None:
    """Push a dict event to every SSE Queue registered for this exam."""
    code = exam_code.upper()
    dead: List[asyncio.Queue] = []
    for q in list(_sse_queues.get(code, [])):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _sse_queues[code].remove(q)
        except ValueError:
            pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_float(raw: str) -> Optional[float]:
    s = raw.strip() if raw else ""
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _generate_questions(paper: Paper, seed: int) -> List[dict]:
    """
    Generate all questions from a Paper using the given seed.
    Returns a list of dicts (serializable) matching Question schema.
    This is deterministic: same paper + same seed → same questions.
    """
    raw_config = paper.config
    if isinstance(raw_config, str):
        raw_config = json.loads(raw_config)
    config = PaperConfig.model_validate(raw_config)

    questions: List[dict] = []
    q_id = 1
    for block in config.blocks:
        gen = generate_block(block, q_id, seed)
        for q in gen.questions:
            questions.append(q.model_dump())
        q_id += len(gen.questions)
    return questions


def _shuffle_for_student(questions: List[dict], shuffle_seed: int) -> List[int]:
    """
    Return ordered list of question IDs for this student.
    Uses shuffle_seed for reproducibility.
    """
    ids = [q["id"] for q in questions]
    rng = random.Random(shuffle_seed)
    rng.shuffle(ids)
    return ids


def _student_name(user: User) -> str:
    return user.display_name or user.name or user.email or f"User {user.id}"


def _get_exam_or_404(code: str, db: Session) -> ExamPaper:
    exam = db.query(ExamPaper).filter(ExamPaper.exam_code == code.upper()).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _get_session_or_404(session_id: int, user_id: int, db: Session) -> ExamSession:
    sess = db.query(ExamSession).filter(
        ExamSession.id == session_id, ExamSession.user_id == user_id
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return sess


def _upsert_answer(
    db: Session,
    session_id: int,
    q_id: int,
    raw: str,
    now: datetime,
) -> None:
    """
    Save or update a single answer. Idempotent.
    Validates: len ≤ 20, only digits / '.' / '-'
    """
    # Validate chars (defence-in-depth beyond Pydantic)
    allowed = set("0123456789.-")
    cleaned = raw.strip() if raw else ""
    if cleaned and not all(c in allowed for c in cleaned):
        return  # silently ignore invalid chars from misbehaving clients

    existing = db.query(ExamAnswer).filter(
        ExamAnswer.session_id == session_id,
        ExamAnswer.question_id == q_id,
    ).first()

    parsed = _parse_float(cleaned)

    if existing:
        existing.raw_answer = cleaned
        existing.parsed_answer = parsed
        existing.last_updated_at = now
    else:
        ans = ExamAnswer(
            session_id=session_id,
            question_id=q_id,
            raw_answer=cleaned,
            parsed_answer=parsed,
            first_answered_at=now if cleaned else None,
            last_updated_at=now,
        )
        db.add(ans)


def _log_event(
    db: Session,
    session_id: int,
    event_type: str,
    payload: Optional[dict] = None,
) -> None:
    ev = ExamEvent(session_id=session_id, event_type=event_type, payload=payload)
    db.add(ev)


def _build_exam_response(exam: ExamPaper, db: Session) -> ExamPaperResponse:
    """Enrich ExamPaper ORM object with live counts."""
    from sqlalchemy import func
    counts = (
        db.query(ExamSession.status, func.count(ExamSession.id))
        .filter(ExamSession.exam_paper_id == exam.id)
        .group_by(ExamSession.status)
        .all()
    )
    count_map = {s: c for s, c in counts}
    total_joined = sum(count_map.values())
    total_submitted = count_map.get("submitted", 0) + count_map.get("auto_submitted", 0)
    total_active = count_map.get("active", 0)

    data = {
        "id": exam.id,
        "exam_code": exam.exam_code,
        "title": exam.title,
        "paper_id": exam.paper_id,
        "scheduled_start_at": exam.scheduled_start_at,
        "scheduled_end_at": exam.scheduled_end_at,
        "duration_seconds": exam.duration_seconds,
        "late_join_cutoff_minutes": exam.late_join_cutoff_minutes,
        "shuffle_questions": exam.shuffle_questions,
        "allow_back_navigation": exam.allow_back_navigation,
        "auto_submit_on_expiry": exam.auto_submit_on_expiry,
        "grace_window_seconds": exam.grace_window_seconds,
        "org_id": exam.org_id,
        "is_open": exam.is_open,
        "is_published": exam.is_published,
        "status": exam.status,
        "results_release_mode": exam.results_release_mode,
        "results_released_at": exam.results_released_at,
        "show_answers_to_students": exam.show_answers_to_students,
        "created_at": exam.created_at,
        "total_joined": total_joined,
        "total_submitted": total_submitted,
        "total_active": total_active,
    }
    return ExamPaperResponse(**data)


# ════════════════════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

# characters that avoid visual ambiguity (no 0/O, 1/I)
_EXAM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generate_exam_code(db: Session, max_tries: int = 20) -> str:
    """Generate a unique E-prefixed exam code that is not in use in the DB."""
    for _ in range(max_tries):
        suffix = "".join(secrets.choice(_EXAM_CODE_CHARS) for _ in range(5))
        code = "E" + suffix
        if not db.query(ExamPaper).filter(ExamPaper.exam_code == code).first():
            return code
    raise RuntimeError("Could not generate a unique exam code after 20 tries")


@router.get("/generate-code")
def get_generate_code(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    """Return a freshly generated unique exam code for the admin UI."""
    return {"exam_code": _generate_exam_code(db)}

@router.post("/", response_model=ExamPaperResponse)
def create_exam(
    body: ExamPaperCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ExamPaperResponse:
    """Admin creates a new scheduled exam from an existing saved Paper."""
    # Ensure paper exists
    paper = db.query(Paper).filter(Paper.id == body.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail=f"Paper {body.paper_id} not found")

    # Auto-generate exam code if not provided
    exam_code = (body.exam_code or "").strip().upper() or _generate_exam_code(db)

    # Ensure code is unique
    if db.query(ExamPaper).filter(ExamPaper.exam_code == exam_code).first():
        raise HTTPException(status_code=409, detail="Exam code already in use")

    # Generate a fixed seed if not provided
    seed = int((time.time() * 1000) % (2**31)) + random.randint(1, 999999)
    seed = seed % (2**31)

    # Warn (but allow) if exam is scheduled in the past
    now = _utc_now()
    start_utc = body.scheduled_start_at.replace(tzinfo=None)
    if start_utc < now:
        logger.warning(
            "[EXAM] creating exam with past start time: code=%s start=%s now=%s",
            body.exam_code, start_utc, now
        )

    try:
        exam = ExamPaper(
            exam_code=exam_code,
            title=body.title,
            paper_id=body.paper_id,
            created_by_admin_id=admin.id,
            scheduled_start_at=body.scheduled_start_at.replace(tzinfo=None),
            scheduled_end_at=body.scheduled_end_at.replace(tzinfo=None),
            duration_seconds=body.duration_seconds,
            late_join_cutoff_minutes=body.late_join_cutoff_minutes,
            fixed_seed=seed,
            shuffle_questions=body.shuffle_questions,
            allow_back_navigation=body.allow_back_navigation,
            auto_submit_on_expiry=body.auto_submit_on_expiry,
            grace_window_seconds=body.grace_window_seconds,
            org_id=body.org_id,
            is_open=body.is_open,
            is_published=False,
            results_release_mode=body.results_release_mode,
            status="draft",
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
    except Exception as exc:
        db.rollback()
        logger.exception("[EXAM] create_exam DB error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=(
                f"Database error creating exam. "
                f"If this is a fresh deployment, ensure exam tables are up to date. "
                f"Error: {type(exc).__name__}: {exc}"
            ),
        ) from exc

    logger.info("[EXAM] created code=%s paper=%s admin=%s", exam.exam_code, paper.id, admin.id)
    return _build_exam_response(exam, db)


@router.get("/admin/all", response_model=List[ExamPaperResponse])
def list_all_exams(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> List[ExamPaperResponse]:
    """Admin lists all exams (newest first)."""
    exams = db.query(ExamPaper).order_by(ExamPaper.created_at.desc()).all()
    return [_build_exam_response(e, db) for e in exams]


@router.patch("/{code}", response_model=ExamPaperResponse)
def update_exam(
    code: str,
    body: ExamPaperUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ExamPaperResponse:
    """Admin updates exam settings (allowed only before exam goes live)."""
    exam = _get_exam_or_404(code, db)
    if exam.status in ("live", "ended", "graded", "results_released"):
        raise HTTPException(status_code=409, detail=f"Cannot update exam in status '{exam.status}'")

    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(exam, field, value)
    exam.updated_at = _utc_now()
    db.commit()
    db.refresh(exam)
    return _build_exam_response(exam, db)


@router.delete("/{code}", status_code=204)
def delete_exam(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> None:
    """Admin deletes an exam (only allowed when status=draft)."""
    exam = _get_exam_or_404(code, db)
    if exam.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft exams can be deleted")
    db.delete(exam)
    db.commit()


@router.post("/{code}/admin/publish", response_model=ExamPaperResponse)
def publish_exam(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ExamPaperResponse:
    """Mark exam as published so students can see it and join the waiting room."""
    exam = _get_exam_or_404(code, db)
    if exam.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft exams can be published")
    exam.status = "published"
    exam.is_published = True
    db.commit()
    db.refresh(exam)
    return _build_exam_response(exam, db)


@router.post("/{code}/admin/start", response_model=ExamPaperResponse)
async def start_exam(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ExamPaperResponse:
    """
    Admin starts the exam.
    - Sets status = "live"
    - Sets all waiting sessions to "active"
    - Broadcasts exam_started event via SSE
    """
    exam = _get_exam_or_404(code, db)
    if exam.status not in ("published", "draft"):
        raise HTTPException(status_code=409, detail=f"Cannot start exam in status '{exam.status}'")

    now = _utc_now()
    deadline = datetime.fromtimestamp(
        now.timestamp() + exam.duration_seconds, tz=timezone.utc
    ).replace(tzinfo=None)

    # Activate all waiting sessions
    waiting = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.status == "waiting",
    ).all()

    for sess in waiting:
        sess.status = "active"
        sess.exam_started_at = now
        sess.server_deadline = deadline

    exam.status = "live"
    exam.is_published = True
    # Track actual start time and keep scheduled_start_at in sync so records are always correct
    exam.actual_started_at = now
    exam.scheduled_start_at = now  # admin manually started — update scheduled time to actual
    db.commit()
    db.refresh(exam)

    # Broadcast to all listening students
    await _broadcast(code, {
        "type": "exam_started",
        "server_time_utc": now.isoformat(),
        "deadline_utc": deadline.isoformat(),
    })

    logger.info("[EXAM] started code=%s sessions_activated=%s", code, len(waiting))
    return _build_exam_response(exam, db)


@router.post("/{code}/admin/end", response_model=ExamPaperResponse)
async def end_exam(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ExamPaperResponse:
    """Admin forcibly ends the exam — all active sessions are auto-submitted."""
    exam = _get_exam_or_404(code, db)
    if exam.status != "live":
        raise HTTPException(status_code=409, detail="Exam is not live")

    now = _utc_now()
    active = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.status == "active",
    ).all()

    for sess in active:
        if sess.exam_started_at:
            sess.time_used_seconds = (now - sess.exam_started_at).total_seconds()
        sess.status = "auto_submitted"
        sess.submitted_at = now
        sess.force_submitted = True
        _log_event(db, sess.id, "force_submitted_by_admin", {"admin_id": admin.id, "reason": "exam_ended"})

    exam.status = "ended"
    exam.actual_ended_at = now
    db.commit()
    db.refresh(exam)

    await _broadcast(code, {"type": "force_submit", "reason": "exam_ended"})
    logger.info("[EXAM] ended code=%s force_submitted=%s", code, len(active))
    return _build_exam_response(exam, db)


@router.post("/{code}/admin/grade", response_model=dict)
def grade_exam(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    """
    Auto-grade all submitted sessions.
    Compares student answers against the Paper's correct answers (regenerated with fixed_seed).
    1 mark per correct answer. Calculates percentage and rank.
    """
    exam = _get_exam_or_404(code, db)
    if exam.status not in ("ended", "graded"):
        raise HTTPException(status_code=409, detail="Exam must be ended before grading")

    paper = db.query(Paper).filter(Paper.id == exam.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper (question source) not found")

    seed = exam.fixed_seed or (paper.fixed_seed if paper.fixed_seed else None) or 42
    try:
        questions = _generate_questions(paper, seed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate questions: {e}")

    # Build question_id → correct_answer map
    correct_map: Dict[int, float] = {q["id"]: q["answer"] for q in questions}
    total_marks = float(len(questions))

    now = _utc_now()
    sessions = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.status.in_(["submitted", "auto_submitted"]),
    ).all()

    scored: List[tuple[int, float]] = []  # (session_id, scored_marks)

    for sess in sessions:
        answers = db.query(ExamAnswer).filter(ExamAnswer.session_id == sess.id).all()
        session_score = 0.0
        for ans in answers:
            correct = correct_map.get(ans.question_id)
            if correct is not None:
                ans.correct_answer = correct
                is_correct = (
                    ans.parsed_answer is not None
                    and abs(ans.parsed_answer - correct) < 1e-9
                )
                ans.is_correct = is_correct
                ans.marks_awarded = 1.0 if is_correct else 0.0
                if is_correct:
                    session_score += 1.0

        sess.total_marks = total_marks
        sess.scored_marks = session_score
        sess.percentage = round((session_score / total_marks) * 100, 2) if total_marks else 0.0
        sess.is_graded = True
        sess.graded_at = now
        scored.append((sess.id, session_score))

    # Compute ranks (higher score = lower rank number)
    scored.sort(key=lambda x: x[1], reverse=True)
    rank_map: Dict[int, int] = {}
    prev_score: Optional[float] = None
    prev_rank = 0
    for i, (sid, sc) in enumerate(scored):
        if sc != prev_score:
            prev_rank = i + 1
        rank_map[sid] = prev_rank
        prev_score = sc

    for sess in sessions:
        sess.rank = rank_map.get(sess.id)
        sess.pass_fail = "pass" if (sess.percentage or 0) >= 50 else "fail"

    exam.status = "graded"
    db.commit()

    logger.info("[EXAM] graded code=%s sessions=%s", code, len(sessions))
    return {"graded": len(sessions), "total_questions": len(questions)}


@router.post("/{code}/admin/release", response_model=ExamPaperResponse)
def release_results(
    code: str,
    body: ReleaseResultsRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ExamPaperResponse:
    """Admin releases results to students."""
    exam = _get_exam_or_404(code, db)
    if exam.status != "graded":
        raise HTTPException(status_code=409, detail="Exam must be graded before releasing results")

    now = _utc_now()
    exam.status = "results_released"
    exam.results_released_at = now
    exam.show_answers_to_students = body.show_answers_to_students

    # Mark all graded sessions as result-released
    db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id, ExamSession.is_graded == True
    ).update({"is_result_released": True})

    db.commit()
    db.refresh(exam)
    logger.info("[EXAM] results released code=%s show_answers=%s", code, body.show_answers_to_students)
    return _build_exam_response(exam, db)


@router.post("/{code}/admin/announce")
async def admin_announce(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    """Push a text message to all connected students via SSE."""
    _get_exam_or_404(code, db)
    body = await request.json()
    message = str(body.get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    await _broadcast(code, {"type": "announce", "message": message})
    return {"sent": True}


@router.post("/{code}/admin/force-submit/{session_id}", response_model=dict)
async def force_submit_session(
    code: str,
    session_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    """Admin force-submits a specific student's session."""
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.exam_paper_id == exam.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.status in ("submitted", "auto_submitted"):
        return {"already_submitted": True}

    now = _utc_now()
    sess.status = "auto_submitted"
    sess.submitted_at = now
    sess.force_submitted = True
    if sess.exam_started_at:
        sess.time_used_seconds = (now - sess.exam_started_at).total_seconds()
    _log_event(db, sess.id, "force_submitted_by_admin", {"admin_id": admin.id})
    db.commit()

    await _broadcast(code, {"type": "force_submit", "session_id": session_id, "reason": "admin_action"})
    return {"force_submitted": True, "session_id": session_id}


@router.get("/{code}/admin/cockpit", response_model=CockpitResponse)
def admin_cockpit(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> CockpitResponse:
    """Live monitoring snapshot for admin dashboard."""
    from sqlalchemy import func
    exam = _get_exam_or_404(code, db)
    now = _utc_now()

    counts = (
        db.query(ExamSession.status, func.count(ExamSession.id))
        .filter(ExamSession.exam_paper_id == exam.id)
        .group_by(ExamSession.status)
        .all()
    )
    count_map = {s: c for s, c in counts}
    total_registered = sum(count_map.values())

    # Recent events (last 20 across exam)
    recent = (
        db.query(ExamEvent)
        .join(ExamSession, ExamEvent.session_id == ExamSession.id)
        .filter(ExamSession.exam_paper_id == exam.id)
        .order_by(ExamEvent.occurred_at.desc())
        .limit(20)
        .all()
    )
    recent_events = [
        {"session_id": e.session_id, "type": e.event_type, "at": e.occurred_at.isoformat(), "payload": e.payload}
        for e in recent
    ]

    seconds_remaining: Optional[float] = None
    if exam.scheduled_end_at:
        diff = (exam.scheduled_end_at - now).total_seconds()
        seconds_remaining = max(0.0, diff)

    return CockpitResponse(
        exam_paper_id=exam.id,
        exam_code=exam.exam_code,
        status=exam.status,
        total_registered=total_registered,
        total_waiting=count_map.get("waiting", 0),
        total_active=count_map.get("active", 0),
        total_submitted=count_map.get("submitted", 0),
        total_auto_submitted=count_map.get("auto_submitted", 0),
        total_not_joined=0,
        server_time_utc=now,
        seconds_remaining=seconds_remaining,
        recent_events=recent_events,
    )


@router.get("/{code}/admin/sessions", response_model=List[ExamSessionSummary])
def list_sessions(
    code: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> List[ExamSessionSummary]:
    """Admin gets all student sessions for an exam."""
    from sqlalchemy import func
    exam = _get_exam_or_404(code, db)

    sessions = (
        db.query(ExamSession)
        .filter(ExamSession.exam_paper_id == exam.id)
        .order_by(ExamSession.joined_at.asc())
        .all()
    )

    if not sessions:
        return []

    session_ids = [s.id for s in sessions]
    user_ids = list({s.user_id for s in sessions})

    # Bulk load users (1 query instead of N)
    users_by_id = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(user_ids)).all()
    }

    # Count answers per session (1 query)
    answer_counts = dict(
        db.query(ExamAnswer.session_id, func.count(ExamAnswer.id))
        .filter(ExamAnswer.session_id.in_(session_ids))
        .group_by(ExamAnswer.session_id)
        .all()
    )

    result = []
    for sess in sessions:
        user = users_by_id.get(sess.user_id)
        result.append(ExamSessionSummary(
            id=sess.id,
            user_id=sess.user_id,
            student_name=_student_name(user) if user else f"User {sess.user_id}",
            public_id=None,
            status=sess.status,
            joined_at=sess.joined_at,
            submitted_at=sess.submitted_at,
            time_used_seconds=sess.time_used_seconds,
            answers_saved=answer_counts.get(sess.id, 0),
            flag_count=sess.flag_count,
            tab_switch_count=sess.tab_switch_count,
            scored_marks=sess.scored_marks,
            percentage=sess.percentage,
            rank=sess.rank,
            pass_fail=sess.pass_fail,
        ))
    return result


# ════════════════════════════════════════════════════════════════════════════
#  STUDENT / PUBLIC ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/{code}", response_model=dict)
def get_exam_info(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Public exam info for the join screen.
    Returns metadata without questions.
    """
    exam = _get_exam_or_404(code, db)
    if not exam.is_published:
        raise HTTPException(status_code=403, detail="Exam is not yet published")
    return {
        "exam_code": exam.exam_code,
        "title": exam.title,
        "status": exam.status,
        "scheduled_start_at": exam.scheduled_start_at.isoformat() if exam.scheduled_start_at else None,
        "scheduled_end_at": exam.scheduled_end_at.isoformat() if exam.scheduled_end_at else None,
        "duration_seconds": exam.duration_seconds,
        "allow_back_navigation": exam.allow_back_navigation,
        "server_time_utc": _utc_now().isoformat(),
    }


@router.post("/{code}/join", response_model=JoinResponse)
def join_exam(
    code: str,
    body: StudentJoinRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JoinResponse:
    """
    Student joins an exam.
    - Creates ExamSession row (or returns existing one if already joined)
    - If exam is already live, sets session to active immediately
    """
    exam = _get_exam_or_404(code, db)

    if not exam.is_published:
        raise HTTPException(status_code=403, detail="Exam is not yet published")

    if exam.status in ("ended", "graded", "results_released"):
        raise HTTPException(status_code=410, detail="Exam has already ended")

    now = _utc_now()

    # Check late-join window (only relevant when exam is live)
    if exam.status == "live" and exam.scheduled_start_at:
        elapsed = (now - exam.scheduled_start_at).total_seconds() / 60
        if elapsed > exam.late_join_cutoff_minutes:
            raise HTTPException(status_code=403, detail="Late join window has closed")

    # Return existing session if already joined
    existing = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.user_id == current_user.id,
    ).first()

    if existing:
        # Update device info on reconnect
        if body.device_fingerprint:
            existing.device_fingerprint = body.device_fingerprint[:64]
        db.commit()
        seconds_elapsed = None
        if existing.exam_started_at and existing.status == "active":
            seconds_elapsed = (now - existing.exam_started_at).total_seconds()
        return JoinResponse(
            session_id=existing.id,
            exam_title=exam.title,
            exam_code=exam.exam_code,
            duration_seconds=exam.duration_seconds,
            allow_back_navigation=exam.allow_back_navigation,
            scheduled_start_at=exam.scheduled_start_at,
            server_time_utc=now,
            status=existing.status,
            seconds_elapsed=seconds_elapsed,
        )

    # Generate per-student question order
    paper_obj = db.query(Paper).filter(Paper.id == exam.paper_id).first()
    seed = exam.fixed_seed or (paper_obj.fixed_seed if paper_obj and paper_obj.fixed_seed else None) or 42
    try:
        questions = _generate_questions(
            paper_obj, seed
        )
    except Exception as e:
        logger.exception("[EXAM] question generation failed for join code=%s: %s", code, e)
        raise HTTPException(status_code=500, detail="Failed to prepare exam questions")

    shuffle_seed = None
    question_order = [q["id"] for q in questions]  # default: natural order

    if exam.shuffle_questions:
        # Combine exam seed + user id for per-student shuffle
        shuffle_seed = int(hashlib.md5(
            f"{seed}-{current_user.id}".encode()
        ).hexdigest(), 16) % (2**31)
        question_order = _shuffle_for_student(questions, shuffle_seed)

    # Determine initial status
    sess_status = "active" if exam.status == "live" else "waiting"
    deadline = None
    if sess_status == "active":
        deadline = datetime.fromtimestamp(
            now.timestamp() + exam.duration_seconds, tz=timezone.utc
        ).replace(tzinfo=None)

    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    ua = request.headers.get("user-agent", "")[:500]

    sess = ExamSession(
        exam_paper_id=exam.id,
        user_id=current_user.id,
        joined_at=now,
        exam_started_at=now if sess_status == "active" else None,
        status=sess_status,
        question_order=question_order,
        shuffle_seed=shuffle_seed,
        server_deadline=deadline,
        ip_address=ip,
        user_agent=ua,
        device_fingerprint=body.device_fingerprint[:64] if body.device_fingerprint else None,
    )
    db.add(sess)
    try:
        db.flush()
    except IntegrityError:
        # Concurrent join_exam call already inserted a session for this user+exam.
        # Roll back and return the existing session instead.
        db.rollback()
        existing = db.query(ExamSession).filter(
            ExamSession.exam_paper_id == exam.id,
            ExamSession.user_id == current_user.id,
        ).first()
        if existing:
            seconds_elapsed = None
            if existing.exam_started_at and existing.status == "active":
                seconds_elapsed = (now - existing.exam_started_at).total_seconds()
            return JoinResponse(
                session_id=existing.id,
                exam_title=exam.title,
                exam_code=exam.exam_code,
                duration_seconds=exam.duration_seconds,
                allow_back_navigation=exam.allow_back_navigation,
                scheduled_start_at=exam.scheduled_start_at,
                server_time_utc=now,
                status=existing.status,
                seconds_elapsed=seconds_elapsed,
            )
        raise HTTPException(status_code=409, detail="Could not create exam session. Please try again.")
    _log_event(db, sess.id, "joined", {"status": sess_status})
    db.commit()
    db.refresh(sess)

    # Broadcast join event so admin dashboard updates in real-time without polling
    asyncio.get_event_loop().call_soon_threadsafe(
        asyncio.ensure_future,
        _broadcast(code, {
            "type": "student_joined",
            "student_name": _student_name(current_user),
            "session_status": sess_status,
            "total_joined": db.query(ExamSession).filter(
                ExamSession.exam_paper_id == exam.id
            ).count(),
        }),
    )

    seconds_elapsed = None
    if sess_status == "active" and sess.exam_started_at:
        seconds_elapsed = 0.0

    logger.info("[EXAM] join code=%s user=%s status=%s", code, current_user.id, sess_status)
    return JoinResponse(
        session_id=sess.id,
        exam_title=exam.title,
        exam_code=exam.exam_code,
        duration_seconds=exam.duration_seconds,
        allow_back_navigation=exam.allow_back_navigation,
        scheduled_start_at=exam.scheduled_start_at,
        server_time_utc=now,
        status=sess_status,
        seconds_elapsed=seconds_elapsed,
    )


@router.get("/{code}/questions", response_model=ExamQuestionsResponse)
def get_questions(
    code: str,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamQuestionsResponse:
    """
    Returns questions in this student's personal order.
    Answers are NOT included — only question text.
    Only available when session is active.
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == current_user.id,
        ExamSession.exam_paper_id == exam.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    if sess.status not in ("active",):
        raise HTTPException(
            status_code=403,
            detail=f"Questions are not available — session status is '{sess.status}'"
        )

    # Generate questions (deterministic from seed)
    paper = db.query(Paper).filter(Paper.id == exam.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper source not found")
    seed = exam.fixed_seed or (paper.fixed_seed if paper.fixed_seed else None) or 42

    try:
        questions = _generate_questions(paper, seed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {e}")

    # Build a lookup by id
    q_map: Dict[int, dict] = {q["id"]: q for q in questions}

    # Return questions in this student's personal order (from question_order)
    order = sess.question_order or [q["id"] for q in questions]
    result: List[ExamQuestion] = []
    for display_idx, qid in enumerate(order, start=1):
        q = q_map.get(qid)
        if q:
            result.append(ExamQuestion(
                id=q["id"],
                display_index=display_idx,
                text=q["text"],
            ))

    now = _utc_now()
    deadline = sess.server_deadline or datetime.fromtimestamp(
        now.timestamp() + exam.duration_seconds, tz=timezone.utc
    ).replace(tzinfo=None)

    return ExamQuestionsResponse(
        session_id=sess.id,
        questions=result,
        total=len(result),
        server_time_utc=now,
        server_deadline=deadline,
    )


@router.get("/{code}/session", response_model=dict)
def get_session_state(
    code: str,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Returns current session state including all saved answers.
    Critical for crash recovery — client calls this on page reload
    and hydrates localStorage from the response.
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == current_user.id,
        ExamSession.exam_paper_id == exam.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch all saved answers
    answers = db.query(ExamAnswer).filter(ExamAnswer.session_id == sess.id).all()
    answers_map = {a.question_id: a.raw_answer for a in answers}

    now = _utc_now()
    seconds_remaining = None
    if sess.server_deadline:
        seconds_remaining = max(0.0, (sess.server_deadline - now).total_seconds())

    return {
        "session_id": sess.id,
        "exam_code": exam.exam_code,
        "status": sess.status,
        "seconds_remaining": seconds_remaining,
        "server_time_utc": now.isoformat(),
        "question_order": sess.question_order,
        "answers": answers_map,        # {question_id: raw_answer}
        "allow_back_navigation": exam.allow_back_navigation,
        "duration_seconds": exam.duration_seconds,
    }


@router.post("/{code}/answer", response_model=AnswerSaveResponse)
def save_answer(
    code: str,
    body: AnswerSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnswerSaveResponse:
    """
    Save or update a single answer. Idempotent — safe to call many times.
    This is the durability anchor on the server side.
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.user_id == current_user.id,
    ).first()

    if not sess:
        raise HTTPException(status_code=404, detail="No active session found — join the exam first")

    if sess.status in ("submitted", "auto_submitted", "terminated"):
        # Still return 200 so client doesn't keep retrying — answer won't be saved
        return AnswerSaveResponse(
            question_id=body.question_id,
            saved=False,
            server_time_utc=_utc_now(),
        )

    # Check grace window (allow saving slightly after deadline)
    now = _utc_now()
    if sess.server_deadline:
        grace = exam.grace_window_seconds or 10
        hard_deadline = datetime.fromtimestamp(
            sess.server_deadline.timestamp() + grace, tz=timezone.utc
        ).replace(tzinfo=None)
        if now > hard_deadline:
            return AnswerSaveResponse(
                question_id=body.question_id,
                saved=False,
                server_time_utc=now,
            )

    _upsert_answer(db, sess.id, body.question_id, body.raw_answer, now)
    db.commit()

    return AnswerSaveResponse(
        question_id=body.question_id,
        saved=True,
        server_time_utc=now,
    )


@router.post("/{code}/answers", response_model=dict)
def bulk_save_answers(
    code: str,
    body: BulkAnswerSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Bulk answer sync — called on reconnect to push all localStorage answers to server.
    Server merges: for each question_id, updates only if the incoming answer is newer
    (we use last_updated_at comparison; if no existing record, insert).
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.user_id == current_user.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    if sess.status in ("terminated",):
        return {"saved": 0, "skipped": len(body.answers), "reason": "session_terminated"}

    now = _utc_now()
    saved = 0
    # Allow saving even after submission to preserve data (score is already computed from what was saved before)
    for item in body.answers:
        _upsert_answer(db, sess.id, item.question_id, item.raw_answer, now)
        saved += 1

    db.commit()
    return {"saved": saved, "skipped": 0}


@router.post("/{code}/submit", response_model=SubmitResponse)
def submit_exam(
    code: str,
    body: SubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitResponse:
    """
    Student submits the exam.
    1. Bulk-saves any answers from request body (final safety net)
    2. Sets session status = "submitted"
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.user_id == current_user.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    if sess.status in ("submitted", "auto_submitted"):
        # Idempotent — return success even if already submitted
        answer_count = db.query(ExamAnswer).filter(ExamAnswer.session_id == sess.id).count()
        return SubmitResponse(
            submission_id=f"{sess.id}-{exam.exam_code}",
            submitted_at=sess.submitted_at or _utc_now(),
            total_answered=answer_count,
            total_questions=len(sess.question_order or []),
            message="Already submitted",
        )

    now = _utc_now()

    # Save all answers sent in payload (final safety net)
    for item in body.answers:
        _upsert_answer(db, sess.id, item.question_id, item.raw_answer, now)

    # Mark submitted
    if sess.exam_started_at:
        sess.time_used_seconds = (now - sess.exam_started_at).total_seconds()
    sess.status = "submitted"
    sess.submitted_at = now
    _log_event(db, sess.id, "submitted", {"via": "student"})
    db.commit()

    answer_count = db.query(ExamAnswer).filter(ExamAnswer.session_id == sess.id).count()
    total_questions = len(sess.question_order or [])

    logger.info("[EXAM] submitted code=%s user=%s answers=%s/%s", code, current_user.id, answer_count, total_questions)
    return SubmitResponse(
        submission_id=f"{sess.id}-{exam.exam_code}",
        submitted_at=now,
        total_answered=answer_count,
        total_questions=total_questions,
        message="Submission received successfully",
    )


@router.get("/{code}/result", response_model=StudentResultResponse)
def get_result(
    code: str,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentResultResponse:
    """Student views their result — only available after admin releases results."""
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == current_user.id,
        ExamSession.exam_paper_id == exam.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    if not sess.is_result_released:
        raise HTTPException(status_code=403, detail="Results are not yet released")

    answer_detail: Optional[List[dict]] = None
    if exam.show_answers_to_students:
        answers = db.query(ExamAnswer).filter(ExamAnswer.session_id == sess.id).all()
        answer_detail = [
            {
                "question_id": a.question_id,
                "your_answer": a.raw_answer,
                "correct_answer": a.correct_answer,
                "is_correct": a.is_correct,
                "marks_awarded": a.marks_awarded,
            }
            for a in answers
        ]

    return StudentResultResponse(
        session_id=sess.id,
        exam_title=exam.title,
        exam_code=exam.exam_code,
        submitted_at=sess.submitted_at,
        total_marks=sess.total_marks,
        scored_marks=sess.scored_marks,
        percentage=sess.percentage,
        rank=sess.rank,
        pass_fail=sess.pass_fail,
        is_graded=sess.is_graded,
        is_result_released=sess.is_result_released,
        show_answers=exam.show_answers_to_students,
        answer_detail=answer_detail,
    )


@router.get("/{code}/my-result", response_model=StudentResultResponse)
def get_my_result(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentResultResponse:
    """
    Student views their own result by exam code (no session_id needed).
    Accessible after results are released; persists indefinitely in DB.
    Students can bookmark /exam/{code}/result and come back any time.
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.user_id == current_user.id,
        ExamSession.exam_paper_id == exam.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="You have no session for this exam")

    if not sess.is_result_released:
        raise HTTPException(status_code=403, detail="Results are not yet released by the teacher")

    answer_detail: Optional[List[dict]] = None
    if exam.show_answers_to_students:
        answers = db.query(ExamAnswer).filter(ExamAnswer.session_id == sess.id).all()
        answer_detail = [
            {
                "question_id": a.question_id,
                "your_answer": a.raw_answer,
                "correct_answer": a.correct_answer,
                "is_correct": a.is_correct,
                "marks_awarded": a.marks_awarded,
            }
            for a in answers
        ]

    return StudentResultResponse(
        session_id=sess.id,
        exam_title=exam.title,
        exam_code=exam.exam_code,
        submitted_at=sess.submitted_at,
        total_marks=sess.total_marks,
        scored_marks=sess.scored_marks,
        percentage=sess.percentage,
        rank=sess.rank,
        pass_fail=sess.pass_fail,
        is_graded=sess.is_graded,
        is_result_released=sess.is_result_released,
        show_answers=exam.show_answers_to_students,
        answer_detail=answer_detail,
    )



@router.post("/{code}/event", response_model=dict)
def log_client_event(
    code: str,
    request_body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Student client logs a proctoring event (tab_switch, window_blur, etc.)
    Lightweight: just append to ExamEvent and increment counters.
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.exam_paper_id == exam.id,
        ExamSession.user_id == current_user.id,
    ).first()
    if not sess:
        return {"logged": False}

    event_type = str(request_body.get("type", "unknown"))[:40]
    payload = {k: v for k, v in request_body.items() if k != "type"}

    # Update counters for well-known events
    if event_type == "tab_switch":
        sess.tab_switch_count = (sess.tab_switch_count or 0) + 1
    elif event_type in ("window_blur", "visibility_hidden", "fullscreen_exit"):
        sess.flag_count = (sess.flag_count or 0) + 1

    _log_event(db, sess.id, event_type, payload)
    db.commit()
    return {"logged": True}


# ════════════════════════════════════════════════════════════════════════════
#  SSE STREAM
# ════════════════════════════════════════════════════════════════════════════

@router.get("/{code}/sse")
async def exam_sse(
    code: str,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """
    Server-Sent Events stream.
    Student connects here while in waiting room and during exam.
    Server pushes:  exam_started | announce | force_submit | ping (heartbeat every 25s)

    On reconnect the client calls /session to restore state, then reconnects to /sse.
    """
    exam = _get_exam_or_404(code, db)
    sess = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == current_user.id,
        ExamSession.exam_paper_id == exam.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    code_upper = code.upper()
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    if code_upper not in _sse_queues:
        _sse_queues[code_upper] = []
    _sse_queues[code_upper].append(q)

    async def event_generator():
        try:
            # Send initial state as first event
            now = _utc_now()
            yield f"data: {json.dumps({'type': 'connected', 'exam_status': exam.status, 'server_time_utc': now.isoformat()})}\n\n"

            # If exam is already live and session just became active, send started event
            if exam.status == "live" and sess.status == "active" and sess.server_deadline:
                yield f"data: {json.dumps({'type': 'exam_started', 'deadline_utc': sess.server_deadline.isoformat()})}\n\n"

            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'ping', 'server_time_utc': _utc_now().isoformat()})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            try:
                _sse_queues[code_upper].remove(q)
            except (ValueError, KeyError):
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",   # Disable nginx buffering
        },
    )
