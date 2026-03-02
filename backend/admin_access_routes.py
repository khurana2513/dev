"""Admin access control: mode toggle, email allowlist CRUD, subscription overrides."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import math
import logging

from models import User, get_db
from auth import get_current_user
from subscription_models import (
    AccessControlSettings, EmailAllowlist, UserSubscription,
    SubscriptionPlan, SubscriptionAuditLog, PaymentOrder
)
from subscription_schemas import (
    AccessControlSettingsOut, AccessControlSettingsUpdateIn,
    AllowlistEntryIn, AllowlistEntryUpdateIn, AllowlistEntryOut,
    BulkImportIn, BulkImportResultOut, SyncReportOut,
    SubscriptionOverrideIn, UserSubscriptionOut, AuditLogOut,
    PaginatedAllowlistOut,
)
from subscription_service import (
    get_or_create_access_settings, _audit, activate_subscription,
    extend_subscription, suspend_subscription, remove_override,
    get_active_subscription, compute_subscription_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/access", tags=["admin-access"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ---------------------------------------------------------------------------
# Access Mode Settings
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=AccessControlSettingsOut)
def get_access_settings(
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    return get_or_create_access_settings(db)


@router.put("/settings", response_model=AccessControlSettingsOut)
def update_access_settings(
    body: AccessControlSettingsUpdateIn,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    settings = get_or_create_access_settings(db)
    old_mode = settings.mode
    settings.mode = body.mode
    settings.updated_by = admin.id
    settings.note = body.note

    _audit(
        db, user_id=admin.id, action="access_mode_changed",
        performed_by=f"admin:{admin.id}",
        old_values={"mode": old_mode},
        new_values={"mode": body.mode},
        note=body.note,
    )
    db.commit()
    db.refresh(settings)
    logger.info("[ACCESS] Mode changed %s→%s by admin %d: %s", old_mode, body.mode, admin.id, body.note)
    return settings


# ---------------------------------------------------------------------------
# Sync Report
# ---------------------------------------------------------------------------

@router.get("/sync-report", response_model=SyncReportOut)
def get_sync_report(
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    settings = get_or_create_access_settings(db)

    total_allowed = db.query(func.count(EmailAllowlist.id)).filter(
        EmailAllowlist.is_active == True
    ).scalar() or 0

    # Synced: email in allowlist AND exists in users table with any login
    synced = (
        db.query(func.count(EmailAllowlist.id))
        .join(User, User.email == EmailAllowlist.email)
        .filter(EmailAllowlist.is_active == True)
        .scalar() or 0
    )
    pending = total_allowed - synced

    # Users not in list (only meaningful in restricted mode)
    users_not_in_list = 0
    if settings.mode == "restricted":
        allowlisted_emails = (
            db.query(EmailAllowlist.email)
            .filter(EmailAllowlist.is_active == True)
            .subquery()
        )
        users_not_in_list = (
            db.query(func.count(User.id))
            .filter(User.email.notin_(allowlisted_emails), User.is_archived == False)
            .scalar() or 0
        )

    return SyncReportOut(
        total_allowed_emails=total_allowed,
        synced=synced,
        pending=pending,
        users_not_in_list=users_not_in_list,
        access_mode=settings.mode,
    )


# ---------------------------------------------------------------------------
# Allowlist CRUD
# ---------------------------------------------------------------------------

def _build_allowlist_entry_out(entry: EmailAllowlist, db: Session) -> AllowlistEntryOut:
    user = db.query(User).filter(User.email == entry.email).first()
    sync_status = "synced" if user else "pending"
    sub_status = None
    if user:
        sub = get_active_subscription(db, user.id)
        sub_status = compute_subscription_status(sub) if sub else "inactive"

    return AllowlistEntryOut(
        id=entry.id,
        email=entry.email,
        role=entry.role,
        is_active=entry.is_active,
        grant_subscription=entry.grant_subscription,
        subscription_plan_id=entry.subscription_plan_id,
        notes=entry.notes,
        added_at=entry.added_at,
        sync_status=sync_status,
        last_login_at=None,  # users table doesn't track last_login separately
        user_name=user.name if user else None,
        subscription_status=sub_status,
    )


@router.get("/allowlist", response_model=PaginatedAllowlistOut)
def list_allowlist(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,   # 'active' | 'inactive'
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(EmailAllowlist)
    if role in ("student", "teacher"):
        q = q.filter(EmailAllowlist.role == role)
    if status == "active":
        q = q.filter(EmailAllowlist.is_active == True)
    elif status == "inactive":
        q = q.filter(EmailAllowlist.is_active == False)
    if search:
        q = q.filter(EmailAllowlist.email.ilike(f"%{search}%"))

    total = q.count()
    entries = q.order_by(EmailAllowlist.added_at.desc()).offset((page - 1) * limit).limit(limit).all()

    items = [_build_allowlist_entry_out(e, db) for e in entries]
    return PaginatedAllowlistOut(
        items=items, total=total, page=page, limit=limit,
        pages=math.ceil(total / limit),
    )


@router.post("/allowlist", response_model=AllowlistEntryOut)
def add_allowlist_entry(
    body: AllowlistEntryIn,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(EmailAllowlist).filter(EmailAllowlist.email == body.email).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return _build_allowlist_entry_out(existing, db)
        raise HTTPException(status_code=409, detail="Email already in allowlist.")

    entry = EmailAllowlist(
        email=body.email,
        role=body.role,
        grant_subscription=body.grant_subscription,
        subscription_plan_id=body.subscription_plan_id,
        subscription_duration_override_days=body.subscription_duration_override_days,
        added_by=admin.id,
        notes=body.notes,
    )
    db.add(entry)
    _audit(db, user_id=admin.id, action="allowlist_email_added",
           performed_by=f"admin:{admin.id}",
           new_values={"email": body.email, "role": body.role})
    db.commit()
    db.refresh(entry)
    return _build_allowlist_entry_out(entry, db)


@router.post("/allowlist/bulk", response_model=BulkImportResultOut)
def bulk_import_allowlist(
    body: BulkImportIn,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    added, skipped, errors = 0, 0, []
    for item in body.entries:
        try:
            existing = db.query(EmailAllowlist).filter(EmailAllowlist.email == item.email).first()
            if existing:
                skipped += 1
                continue
            entry = EmailAllowlist(
                email=item.email, role=item.role,
                grant_subscription=item.grant_subscription,
                added_by=admin.id,
            )
            db.add(entry)
            added += 1
        except Exception as e:
            errors.append(f"{item.email}: {str(e)}")

    if added:
        _audit(db, user_id=admin.id, action="allowlist_bulk_import",
               performed_by=f"admin:{admin.id}",
               new_values={"added": added})
    db.commit()
    return BulkImportResultOut(added=added, skipped=skipped, errors=errors)


@router.put("/allowlist/{entry_id}", response_model=AllowlistEntryOut)
def update_allowlist_entry(
    entry_id: str,
    body: AllowlistEntryUpdateIn,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(EmailAllowlist).get(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Allowlist entry not found.")

    if body.role is not None:
        entry.role = body.role
    if body.is_active is not None:
        entry.is_active = body.is_active
    if body.grant_subscription is not None:
        entry.grant_subscription = body.grant_subscription
    if body.subscription_plan_id is not None:
        entry.subscription_plan_id = body.subscription_plan_id
    if body.subscription_duration_override_days is not None:
        entry.subscription_duration_override_days = body.subscription_duration_override_days
    if body.notes is not None:
        entry.notes = body.notes

    db.commit()
    db.refresh(entry)
    return _build_allowlist_entry_out(entry, db)


@router.delete("/allowlist/{entry_id}")
def delete_allowlist_entry(
    entry_id: str,
    reason: str = Query(..., min_length=3),
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(EmailAllowlist).get(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Allowlist entry not found.")

    _audit(db, user_id=admin.id, action="allowlist_email_removed",
           performed_by=f"admin:{admin.id}",
           old_values={"email": entry.email},
           note=reason)

    entry.is_active = False  # Soft delete
    db.commit()
    return {"message": f"Allowlist entry for {entry.email} deactivated."}


# ---------------------------------------------------------------------------
# Subscription overrides per user
# ---------------------------------------------------------------------------

@router.post("/users/{user_id}/subscription-override", response_model=UserSubscriptionOut)
def subscription_override(
    user_id: int,
    body: SubscriptionOverrideIn,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    sub = get_active_subscription(db, user_id)

    if body.action == "activate":
        if not body.plan_id:
            raise HTTPException(status_code=400, detail="plan_id required for activate.")
        plan = db.query(SubscriptionPlan).get(body.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found.")
        sub = activate_subscription(
            db, user, plan,
            admin_by=admin.id,
            admin_note=body.note,
            admin_duration_days=body.duration_days,
            admin_override_expires_at=body.override_expires_at,
        )
    elif body.action == "extend":
        if not sub:
            raise HTTPException(status_code=404, detail="No subscription to extend.")
        if not body.duration_days:
            raise HTTPException(status_code=400, detail="duration_days required for extend.")
        sub = extend_subscription(db, sub, body.duration_days, admin.id, body.note)
    elif body.action == "suspend":
        if not sub:
            raise HTTPException(status_code=404, detail="No subscription to suspend.")
        sub = suspend_subscription(db, sub, admin.id, body.note)
    elif body.action == "remove_override":
        if not sub:
            raise HTTPException(status_code=404, detail="No subscription found.")
        sub = remove_override(db, sub, admin.id, body.note)
    else:
        raise HTTPException(status_code=400, detail="Invalid action.")

    return sub


@router.get("/users/{user_id}/subscription-history", response_model=List[AuditLogOut])
def user_subscription_history(
    user_id: int,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(SubscriptionAuditLog)
        .filter(SubscriptionAuditLog.user_id == user_id)
        .order_by(SubscriptionAuditLog.performed_at.desc())
        .limit(50)
        .all()
    )
    return logs
