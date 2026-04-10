"""API routes for Organization management (multi-tenant Phase 1)."""
import logging
import re
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_admin, get_current_user
from models import Organization, OrgInviteLink, User, get_db
from org_schemas import (
    InviteLinkCreate,
    InviteLinkResponse,
    OrgCreate,
    OrgResponse,
    OrgUpdate,
    PrefixCheckResponse,
    _make_slug,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orgs", tags=["organizations"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _unique_invite_code(db: Session) -> str:
    """Generate a random 8-char alphanumeric code that is unique in the DB."""
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        if not db.query(OrgInviteLink).filter(OrgInviteLink.code == code).first():
            return code
    raise RuntimeError("Could not generate a unique invite code after 20 tries")


def _get_org_or_404(org_id: str, db: Session) -> Organization:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _require_org_access(org: Organization, current_user: User) -> None:
    """Raise 403 unless user is platform_admin or org owner."""
    is_platform_admin = (
        getattr(current_user, "system_role", None) == "platform_admin"
        or current_user.role == "admin"
    )
    if not is_platform_admin and org.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the admin of this organization",
        )


# ─── Public / utility endpoints ──────────────────────────────────────────────

@router.get("/check-prefix", response_model=PrefixCheckResponse)
def check_prefix_availability(
    prefix: str = Query(..., min_length=2, max_length=3),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Check whether an id_prefix is available."""
    normalized = prefix.upper().strip()
    if not re.match(r"^[A-Z0-9]{2,3}$", normalized):
        raise HTTPException(status_code=400, detail="Prefix must be 2–3 uppercase letters/digits")
    taken = db.query(Organization).filter(Organization.id_prefix == normalized).first()
    return PrefixCheckResponse(prefix=normalized, available=taken is None)


# ─── Create Organization (platform_admin only for now) ───────────────────────

@router.post("", response_model=OrgResponse, status_code=201)
def create_org(
    data: OrgCreate,
    current_user: User = Depends(get_current_admin),  # only platform admins can create orgs
    db: Session = Depends(get_db),
):
    """Create a new organization. Only platform admins can create organizations."""
    slug = _make_slug(data.name)
    # Ensure slug uniqueness
    if db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{slug}-{secrets.token_hex(3)}"

    if db.query(Organization).filter(Organization.id_prefix == data.id_prefix).first():
        raise HTTPException(status_code=400, detail=f"ID prefix '{data.id_prefix}' is already taken")

    org = Organization(
        name=data.name,
        slug=slug,
        id_prefix=data.id_prefix,
        owner_user_id=current_user.id,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        city=data.city,
        address=data.address,
        logo_url=data.logo_url,
        website_url=data.website_url,
        description=data.description,
    )
    db.add(org)
    try:
        db.commit()
        db.refresh(org)
    except Exception as e:
        db.rollback()
        logger.error("Failed to create org: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create organization")
    return OrgResponse.model_validate(org)


# ─── List all orgs (platform admin only) ──────────────────────────────────────

@router.get("", response_model=List[OrgResponse])
def list_orgs(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all organizations. Platform admin only."""
    orgs = db.query(Organization).order_by(Organization.created_at).all()
    return [OrgResponse.model_validate(o) for o in orgs]


# ─── Get my org (org owner) ───────────────────────────────────────────────────

@router.get("/mine", response_model=OrgResponse)
def get_my_org(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the organization owned by the current user."""
    org = db.query(Organization).filter(Organization.owner_user_id == current_user.id).first()
    if not org:
        raise HTTPException(status_code=404, detail="You do not own any organization")
    return OrgResponse.model_validate(org)


# ─── Get single org ───────────────────────────────────────────────────────────

@router.get("/{org_id}", response_model=OrgResponse)
def get_org(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get an organization by ID. Accessible to its owner and platform admins."""
    org = _get_org_or_404(org_id, db)
    _require_org_access(org, current_user)
    return OrgResponse.model_validate(org)


# ─── Update org ───────────────────────────────────────────────────────────────

@router.put("/{org_id}", response_model=OrgResponse)
def update_org(
    org_id: str,
    data: OrgUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update organization details."""
    org = _get_org_or_404(org_id, db)
    _require_org_access(org, current_user)

    if data.name is not None:
        org.name = data.name.strip()
    if data.contact_email is not None:
        org.contact_email = data.contact_email
    if data.contact_phone is not None:
        org.contact_phone = data.contact_phone
    if data.city is not None:
        org.city = data.city
    if data.address is not None:
        org.address = data.address
    if data.logo_url is not None:
        org.logo_url = data.logo_url
    if data.website_url is not None:
        org.website_url = data.website_url
    if data.description is not None:
        org.description = data.description

    try:
        db.commit()
        db.refresh(org)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update organization")
    return OrgResponse.model_validate(org)


# ─── Admin: verify org ────────────────────────────────────────────────────────

@router.post("/{org_id}/verify", response_model=OrgResponse)
def verify_org(
    org_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Mark an organization as verified. Platform admin only."""
    org = _get_org_or_404(org_id, db)
    org.is_verified = True
    org.verified_at = datetime.utcnow()
    org.verified_by_user_id = current_user.id
    db.commit()
    db.refresh(org)
    return OrgResponse.model_validate(org)


# ─── Invite Links ─────────────────────────────────────────────────────────────

@router.post("/{org_id}/invite-links", response_model=InviteLinkResponse, status_code=201)
def create_invite_link(
    org_id: str,
    data: InviteLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an invite link for the organization."""
    org = _get_org_or_404(org_id, db)
    _require_org_access(org, current_user)

    expires_at = None
    if data.expires_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_days)

    link = OrgInviteLink(
        org_id=org_id,
        code=_unique_invite_code(db),
        role=data.role,
        max_uses=data.max_uses,
        expires_at=expires_at,
        created_by_user_id=current_user.id,
    )
    db.add(link)
    try:
        db.commit()
        db.refresh(link)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create invite link")
    return InviteLinkResponse.model_validate(link)


@router.get("/{org_id}/invite-links", response_model=List[InviteLinkResponse])
def list_invite_links(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all invite links for an organization."""
    org = _get_org_or_404(org_id, db)
    _require_org_access(org, current_user)
    links = (
        db.query(OrgInviteLink)
        .filter(OrgInviteLink.org_id == org_id)
        .order_by(OrgInviteLink.created_at.desc())
        .all()
    )
    return [InviteLinkResponse.model_validate(lnk) for lnk in links]


@router.delete("/{org_id}/invite-links/{link_id}", status_code=204)
def deactivate_invite_link(
    org_id: str,
    link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate (soft-delete) an invite link."""
    org = _get_org_or_404(org_id, db)
    _require_org_access(org, current_user)
    link = db.query(OrgInviteLink).filter(
        OrgInviteLink.id == link_id, OrgInviteLink.org_id == org_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Invite link not found")
    link.is_active = False
    db.commit()
