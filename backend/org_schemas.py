"""Pydantic schemas for Organization and OrgInviteLink."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_slug(name: str) -> str:
    """Convert org name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:60]


# ─── Organization Schemas ─────────────────────────────────────────────────────

class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    id_prefix: str = Field(..., min_length=2, max_length=3)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None

    @field_validator("id_prefix")
    @classmethod
    def validate_prefix(cls, v: str) -> str:
        v = v.upper().strip()
        if not re.match(r"^[A-Z0-9]{2,3}$", v):
            raise ValueError("id_prefix must be 2–3 uppercase letters/digits (e.g. TH, SM)")
        return v

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    id_prefix: str
    owner_user_id: int
    contact_email: Optional[str]
    contact_phone: Optional[str]
    city: Optional[str]
    address: Optional[str]
    logo_url: Optional[str]
    website_url: Optional[str]
    description: Optional[str]
    subscription_tier: str
    max_students: int
    is_active: bool
    is_verified: bool
    onboarding_complete: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ─── Invite Link Schemas ──────────────────────────────────────────────────────

class InviteLinkCreate(BaseModel):
    role: str = "student"
    max_uses: int = Field(default=100, ge=1, le=10000)
    expires_days: Optional[int] = Field(None, ge=1, le=365)


class InviteLinkResponse(BaseModel):
    id: str
    org_id: str
    code: str
    role: str
    max_uses: int
    uses_count: int
    expires_at: Optional[datetime]
    is_active: bool
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ─── Prefix check ─────────────────────────────────────────────────────────────

class PrefixCheckResponse(BaseModel):
    prefix: str
    available: bool
