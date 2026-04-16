"""Shared paper routes – share a generated paper via a short code.

Key design decisions:
  • Code is generated on-demand (not for every paper) to avoid unnecessary DB load.
  • 6-char alphanumeric code — easy to type, share verbally, or paste.
  • Papers expire 24 hours after creation.  Clients check `expires_at`.
  • Anyone can VIEW a shared paper (no auth required).
  • Attempting a shared paper requires auth (to track attempt under user account).
  • A user can share the same paper multiple times → each time a new code is issued.
  • Max 10 active shared papers per user to prevent abuse.
"""

import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List

from models import SharedPaper, User, get_db
from auth import get_current_user

router = APIRouter(prefix="/papers", tags=["shared-papers"])

# ── Constants ────────────────────────────────────────────────────────────────

CODE_LENGTH = 6
SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I — visually unambiguous
CODE_ALPHABET = string.ascii_uppercase + string.digits  # kept for compatibility
EXPIRY_HOURS = 24
MAX_ACTIVE_SHARES_PER_USER = 10


# ── Schemas ──────────────────────────────────────────────────────────────────

class SharePaperRequest(BaseModel):
    paper_title: str = Field(min_length=1, max_length=200)
    paper_level: str = Field(min_length=1, max_length=60)
    paper_config: dict               # Full PaperConfig JSON
    generated_blocks: list           # Frozen GeneratedBlock[] JSON
    seed: int


class SharedPaperOut(BaseModel):
    code: str
    paper_title: str
    paper_level: str
    paper_config: dict
    generated_blocks: list
    seed: int
    total_questions: int
    created_by_name: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    view_count: int
    attempt_count: int


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_code(db: Session, max_attempts: int = 10) -> str:
    """Generate a unique P-prefixed share code: P + 5 safe alphanumeric chars."""
    for _ in range(max_attempts):
        code = "P" + "".join(secrets.choice(SAFE_CHARS) for _ in range(5))
        exists = db.query(SharedPaper.id).filter(SharedPaper.code == code).first()
        if not exists:
            return code
    raise RuntimeError("Unable to generate a unique share code after multiple attempts")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_out(sp: SharedPaper, creator_name: Optional[str] = None) -> SharedPaperOut:
    return SharedPaperOut(
        code=sp.code,
        paper_title=sp.paper_title,
        paper_level=sp.paper_level,
        paper_config=sp.paper_config,
        generated_blocks=sp.generated_blocks,
        seed=sp.seed,
        total_questions=sp.total_questions,
        created_by_name=creator_name,
        created_at=sp.created_at,
        expires_at=sp.expires_at,
        view_count=sp.view_count,
        attempt_count=sp.attempt_count,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/share", response_model=SharedPaperOut, status_code=201)
async def share_paper(
    body: SharePaperRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a shareable snapshot of a generated paper.

    Returns the share code and paper metadata.
    """
    now = _utc_now()

    # Enforce per-user limit on active (non-expired) shares
    active_count = (
        db.query(SharedPaper)
        .filter(SharedPaper.created_by == current_user.id, SharedPaper.expires_at > now)
        .count()
    )
    if active_count >= MAX_ACTIVE_SHARES_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"You already have {MAX_ACTIVE_SHARES_PER_USER} active shared papers. "
                   "Wait for some to expire or share fewer papers.",
        )

    # Compute total questions from generated_blocks
    total_q = 0
    for block in body.generated_blocks:
        questions = block.get("questions") if isinstance(block, dict) else getattr(block, "questions", [])
        total_q += len(questions) if questions else 0

    if total_q == 0:
        raise HTTPException(status_code=422, detail="The paper has no questions to share.")

    if total_q < 15:
        raise HTTPException(
            status_code=422,
            detail=f"A shared paper must have at least 15 questions so it can be attempted. "
                   f"This paper only has {total_q}. Add more questions and try again.",
        )

    # Validate payload size to prevent storing enormous papers
    import json as _json
    try:
        _payload_size = len(_json.dumps(body.paper_config)) + len(_json.dumps(body.generated_blocks))
    except Exception:
        _payload_size = 0
    if _payload_size > 500_000:  # 500 KB upper-bound
        raise HTTPException(status_code=413, detail="Paper data is too large to share (max 500 KB).")

    try:
        code = _generate_code(db)
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Could not generate a unique share code at this time. Please try again.",
        )

    shared = SharedPaper(
        code=code,
        created_by=current_user.id,
        paper_title=body.paper_title,
        paper_level=body.paper_level,
        paper_config=body.paper_config,
        generated_blocks=body.generated_blocks,
        seed=body.seed,
        total_questions=total_q,
        expires_at=now + timedelta(hours=EXPIRY_HOURS),
    )
    db.add(shared)
    db.commit()
    db.refresh(shared)

    return _to_out(shared, creator_name=current_user.display_name or current_user.name)


@router.get("/shared/{code}", response_model=SharedPaperOut)
async def get_shared_paper(
    code: str,
    db: Session = Depends(get_db),
):
    """Retrieve a shared paper by code.  No auth required.

    Returns 404 if code is unknown, 410 if expired.
    """
    code = code.upper().strip()
    sp = db.query(SharedPaper).filter(SharedPaper.code == code).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Paper not found. The code may be invalid.")

    if sp.expires_at < _utc_now():
        raise HTTPException(
            status_code=410,
            detail="This shared paper has expired. Papers are available for 24 hours after sharing.",
        )

    # Bump view count (fire-and-forget, no error on race)
    try:
        sp.view_count = (sp.view_count or 0) + 1
        db.commit()
    except Exception:
        db.rollback()

    creator_name = None
    if sp.creator:
        creator_name = sp.creator.display_name or sp.creator.name

    return _to_out(sp, creator_name=creator_name)


@router.post("/shared/{code}/attempt-started")
async def mark_attempt_started(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Increment the attempt counter for a shared paper.

    Called by the frontend right before starting the attempt flow.
    """
    code = code.upper().strip()
    sp = db.query(SharedPaper).filter(SharedPaper.code == code).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Shared paper not found.")

    if sp.expires_at < _utc_now():
        raise HTTPException(status_code=410, detail="This shared paper has expired.")

    try:
        sp.attempt_count = (sp.attempt_count or 0) + 1
        db.commit()
    except Exception:
        db.rollback()

    return {"ok": True}


@router.get("/my-shares", response_model=List[SharedPaperOut])
async def list_my_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active shared papers for the current user (non-expired, newest first)."""
    now = _utc_now()
    shares = (
        db.query(SharedPaper)
        .filter(SharedPaper.created_by == current_user.id, SharedPaper.expires_at > now)
        .order_by(SharedPaper.created_at.desc())
        .all()
    )
    name = current_user.display_name or current_user.name
    return [_to_out(s, creator_name=name) for s in shares]
