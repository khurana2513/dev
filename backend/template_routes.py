"""User paper template CRUD routes.

Each signed-in user can save up to 5 custom paper templates.
A valid template must have at least 1 block and 10 total questions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

from models import UserPaperTemplate, User, get_db
from schemas import BlockConfig
from auth import get_current_user
from timezone_utils import get_utc_now

router = APIRouter(prefix="/paper-templates", tags=["paper-templates"])

MAX_TEMPLATES_PER_USER = 5
MIN_BLOCKS = 1
MIN_TOTAL_QUESTIONS = 10
MAX_NAME_LENGTH = 60


# ── Schemas ──────────────────────────────────────────────────────────────────

class UserPaperTemplateCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    level: Optional[str] = None   # e.g. "AB-1", "Vedic-Level-2", or null for Custom
    blocks: List[BlockConfig]


class UserPaperTemplateUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(default=None, min_length=1, max_length=MAX_NAME_LENGTH)
    level: Optional[str] = None
    blocks: Optional[List[BlockConfig]] = None


class UserPaperTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    level: Optional[str]
    blocks: list          # raw JSON — serialised BlockConfig dicts
    created_at: datetime
    updated_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_blocks(blocks: List[BlockConfig]) -> None:
    """Raise HTTP 422 if block list does not meet minimum requirements."""
    if len(blocks) < MIN_BLOCKS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A template must have at least {MIN_BLOCKS} block.",
        )
    total_questions = sum(b.count for b in blocks)
    if total_questions < MIN_TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A template must have at least {MIN_TOTAL_QUESTIONS} questions in total (currently {total_questions}).",
        )


def _check_name_unique(
    db: Session,
    user_id: int,
    name: str,
    exclude_id: Optional[int] = None,
) -> None:
    """Raise HTTP 409 if the user already has a template with this name."""
    q = db.query(UserPaperTemplate).filter(
        UserPaperTemplate.user_id == user_id,
        func.lower(UserPaperTemplate.name) == name.strip().lower(),
    )
    if exclude_id is not None:
        q = q.filter(UserPaperTemplate.id != exclude_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a template with this name. Please choose a different name.",
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[UserPaperTemplateOut])
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    """Return all templates for the current user, ordered by creation time."""
    return (
        db.query(UserPaperTemplate)
        .filter(UserPaperTemplate.user_id == current_user.id)
        .order_by(UserPaperTemplate.created_at)
        .all()
    )


@router.post("", response_model=UserPaperTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    data: UserPaperTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPaperTemplate:
    """Create a new template for the current user (max 5 per account)."""
    # Enforce per-user cap
    count = (
        db.query(func.count(UserPaperTemplate.id))
        .filter(UserPaperTemplate.user_id == current_user.id)
        .scalar()
    )
    if count >= MAX_TEMPLATES_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"You have reached the maximum of {MAX_TEMPLATES_PER_USER} templates. "
                "Please delete an existing template before creating a new one."
            ),
        )

    _validate_blocks(data.blocks)
    _check_name_unique(db, current_user.id, data.name)

    tpl = UserPaperTemplate(
        user_id=current_user.id,
        name=data.name.strip(),
        level=data.level or None,
        blocks=[b.model_dump() for b in data.blocks],
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.put("/{template_id}", response_model=UserPaperTemplateOut)
def update_template(
    template_id: int,
    data: UserPaperTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPaperTemplate:
    """Update name, level, and/or blocks of an existing template owned by the current user."""
    tpl = (
        db.query(UserPaperTemplate)
        .filter(
            UserPaperTemplate.id == template_id,
            UserPaperTemplate.user_id == current_user.id,
        )
        .first()
    )
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")

    if data.name is not None:
        _check_name_unique(db, current_user.id, data.name, exclude_id=template_id)
        tpl.name = data.name.strip()

    if data.blocks is not None:
        _validate_blocks(data.blocks)
        tpl.blocks = [b.model_dump() for b in data.blocks]

    if data.level is not None:
        tpl.level = data.level or None

    tpl.updated_at = get_utc_now()
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a template owned by the current user."""
    tpl = (
        db.query(UserPaperTemplate)
        .filter(
            UserPaperTemplate.id == template_id,
            UserPaperTemplate.user_id == current_user.id,
        )
        .first()
    )
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")

    db.delete(tpl)
    db.commit()
