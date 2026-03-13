"""
Admin Reward Routes — admin-only API endpoints for the reward system.

Provides:
  - POST /admin/rewards/adjust-points     — manual point add/deduct
  - POST /admin/rewards/grant-badge       — manually award a badge
  - POST /admin/rewards/revoke-badge      — soft-revoke a badge
  - POST /admin/rewards/void-event        — void a reward event
  - POST /admin/rewards/run-snapshot      — trigger monthly snapshot
  - POST /admin/rewards/simulate-month    — dry-run month end
  - POST /admin/rewards/rebuild-cache     — recalculate user points from ledger
  - GET  /admin/rewards/audit-log         — admin action audit trail
  - GET  /admin/rewards/student/{id}/summary — single student full summary
  - CRUD /admin/rewards/badges            — badge definition management
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from models import User, StudentProfile, get_db
from auth import get_current_admin
from reward_models import (
    RewardEvent,
    BadgeDefinition,
    StudentBadgeAward,
    RewardAuditLog,
    MonthlyLeaderboardSnapshot,
)
from reward_schemas import (
    AdminPointsAdjustmentIn,
    AdminBadgeGrantIn,
    AdminBadgeRevokeIn,
    AdminVoidEventIn,
    AdminSimulateMonthEndIn,
    AdminCacheRebuildOut,
    AdminBadgeCreateIn,
    AdminBadgeUpdateIn,
    AuditLogEntryOut,
    SimulationResponse,
    SimulationResultEntry,
    BadgeDefinitionOut,
    RewardsSummaryOut,
    StudentBadgesResponse,
    BadgeStatusOut,
    NextMilestoneOut,
)
from timezone_utils import get_utc_now, utc_to_ist

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/rewards", tags=["admin-rewards"])


# ──────────────────────────────────────────────────────────────────────────────
# Points Management
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/adjust-points")
def adjust_points(
    data: AdminPointsAdjustmentIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin manually add or deduct points from a student."""
    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    from reward_engine import reward_engine

    old_total = student.total_points or 0
    result = reward_engine.admin_adjust_points(
        db=db,
        student_id=data.student_id,
        adjustment=data.adjustment,
        reason=data.reason,
        admin_id=admin.id,
    )

    # Audit log
    _log_audit(db, admin.id, "adjust_points", data.student_id,
               {"total_points": old_total},
               {"total_points": old_total + data.adjustment},
               data.reason)
    db.commit()

    return {
        "success": True,
        "old_total": old_total,
        "adjustment": data.adjustment,
        "new_total": old_total + data.adjustment,
        "event_id": result.event_id,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Badge Management
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/grant-badge")
def grant_badge(
    data: AdminBadgeGrantIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Manually award a badge to a student."""
    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    from badge_evaluator import badge_evaluator

    result = badge_evaluator.admin_grant_badge(
        db=db,
        student_id=data.student_id,
        badge_key=data.badge_key,
        admin_id=admin.id,
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Badge not found or already awarded to this student",
        )

    _log_audit(db, admin.id, "grant_badge", data.student_id,
               {}, {"badge_key": data.badge_key}, data.reason or "Admin granted badge")
    db.commit()

    return {"success": True, "badge": result}


@router.post("/revoke-badge")
def revoke_badge(
    data: AdminBadgeRevokeIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Soft-revoke a badge from a student."""
    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    from badge_evaluator import badge_evaluator

    success = badge_evaluator.admin_revoke_badge(
        db=db,
        student_id=data.student_id,
        badge_key=data.badge_key,
        admin_id=admin.id,
        reason=data.reason,
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Badge not found or not currently awarded to this student",
        )

    _log_audit(db, admin.id, "revoke_badge", data.student_id,
               {"badge_key": data.badge_key, "active": True},
               {"badge_key": data.badge_key, "active": False},
               data.reason)
    db.commit()

    return {"success": True, "message": f"Badge '{data.badge_key}' revoked"}


# ──────────────────────────────────────────────────────────────────────────────
# Event Voiding
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/void-event")
def void_event(
    data: AdminVoidEventIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Void a reward event (reversible soft-delete)."""
    event = db.query(RewardEvent).filter(RewardEvent.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.is_voided:
        raise HTTPException(status_code=400, detail="Event is already voided")

    # Reverse the points
    from sqlalchemy import update as sa_update
    if event.points_delta != 0:
        db.execute(
            sa_update(User)
            .where(User.id == event.student_id)
            .values(total_points=User.total_points - event.points_delta)
        )

    # Mark event as voided
    event.is_voided = True
    event.voided_by = admin.id
    event.voided_at = get_utc_now()
    event.void_reason = data.reason

    _log_audit(db, admin.id, "void_event", event.student_id,
               {"event_id": data.event_id, "points_delta": event.points_delta, "voided": False},
               {"event_id": data.event_id, "points_delta": 0, "voided": True},
               data.reason)
    db.commit()

    return {
        "success": True,
        "event_id": data.event_id,
        "points_reversed": event.points_delta,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Monthly Snapshot
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/run-snapshot")
def run_snapshot(
    data: AdminSimulateMonthEndIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Trigger monthly leaderboard snapshot for a specific month."""
    from reward_scheduler import run_monthly_leaderboard_snapshot

    result = run_monthly_leaderboard_snapshot(
        db=db,
        month=data.month,
        year=data.year,
        admin_id=admin.id,
    )

    _log_audit(db, admin.id, "run_snapshot", None,
               {}, {"month": data.month, "year": data.year, **result},
               f"Admin triggered snapshot for {data.month}/{data.year}")

    return {"success": True, **result}


@router.post("/simulate-month", response_model=SimulationResponse)
def simulate_month(
    data: AdminSimulateMonthEndIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Dry-run: preview what monthly snapshot would produce."""
    from reward_scheduler import simulate_month_end

    preview = simulate_month_end(db, data.month, data.year)

    entries = [
        SimulationResultEntry(
            student_id=e.get("student_id", 0),
            student_name=e.get("student_name", ""),
            branch=e.get("branch", ""),
            monthly_points=e.get("monthly_points", 0),
            projected_rank=e.get("projected_rank", 0),
            projected_bonus=e.get("projected_bonus", 0),
        )
        for e in preview
    ]

    return SimulationResponse(
        month=data.month,
        year=data.year,
        entries=entries,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Cache Rebuild
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/rebuild-cache", response_model=AdminCacheRebuildOut)
def rebuild_cache(
    student_id: int = Query(..., description="Student ID to rebuild"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Recompute User.total_points from the event ledger."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    from reward_engine import reward_engine

    result = reward_engine.rebuild_user_points(db, student_id)

    _log_audit(db, admin.id, "rebuild_cache", student_id,
               {"total_points": result["old_total"]},
               {"total_points": result["new_total"]},
               f"Cache rebuild: {result['events_processed']} events processed")
    db.commit()

    return AdminCacheRebuildOut(
        student_id=student_id,
        old_total=result["old_total"],
        new_total=result["new_total"],
        events_processed=result["events_processed"],
    )


# ──────────────────────────────────────────────────────────────────────────────
# Audit Log
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/audit-log")
def get_audit_log(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    student_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Paginated admin audit log."""
    query = db.query(RewardAuditLog).order_by(desc(RewardAuditLog.performed_at))

    if student_id:
        query = query.filter(RewardAuditLog.target_student_id == student_id)

    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for log in logs:
        admin_user = db.query(User).filter(User.id == log.admin_id).first()
        items.append(AuditLogEntryOut(
            id=log.id,
            admin_id=log.admin_id,
            admin_name=admin_user.name if admin_user else "Unknown",
            action=log.action,
            target_student_id=log.target_student_id,
            old_values=log.old_values or {},
            new_values=log.new_values or {},
            reason=log.reason or "",
            created_at=utc_to_ist(log.performed_at).isoformat() if log.performed_at else None,
        ))

    return {
        "logs": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": (page * per_page) < total,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Student Summary (Admin View)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/student/{student_id}/summary")
def get_student_reward_summary(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Full reward summary for a specific student (admin view)."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Badges
    awards = (
        db.query(StudentBadgeAward, BadgeDefinition)
        .join(BadgeDefinition, StudentBadgeAward.badge_id == BadgeDefinition.id)
        .filter(StudentBadgeAward.student_id == student_id)
        .all()
    )
    badges = []
    for award, defn in awards:
        badges.append({
            "badge_key": defn.badge_key,
            "name": defn.name,
            "tier": defn.tier,
            "is_active": award.is_active,
            "awarded_at": utc_to_ist(award.awarded_at).isoformat() if award.awarded_at else None,
            "awarded_by": award.awarded_by,
        })

    # Recent events
    recent_events = (
        db.query(RewardEvent)
        .filter(RewardEvent.student_id == student_id)
        .order_by(desc(RewardEvent.event_timestamp))
        .limit(20)
        .all()
    )
    events = []
    for e in recent_events:
        events.append({
            "id": e.id,
            "event_type": e.event_type,
            "source_tool": e.source_tool,
            "points_delta": e.points_delta,
            "is_voided": e.is_voided,
            "event_timestamp": utc_to_ist(e.event_timestamp).isoformat() if e.event_timestamp else None,
            "event_metadata": e.event_metadata or {},
        })

    # Monthly snapshots
    snapshots = (
        db.query(MonthlyLeaderboardSnapshot)
        .filter(MonthlyLeaderboardSnapshot.student_id == student_id)
        .order_by(
            desc(MonthlyLeaderboardSnapshot.snapshot_year),
            desc(MonthlyLeaderboardSnapshot.snapshot_month),
        )
        .limit(6)
        .all()
    )
    snapshot_data = []
    for s in snapshots:
        snapshot_data.append({
            "month": s.snapshot_month,
            "year": s.snapshot_year,
            "monthly_points": s.monthly_points,
            "global_rank": s.global_rank,
            "branch_rank": s.branch_rank,
        })

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()

    return {
        "student_id": student_id,
        "student_name": student.name,
        "branch": profile.branch if profile else None,
        "total_points": student.total_points or 0,
        "current_streak": student.current_streak or 0,
        "longest_streak": student.longest_streak or 0,
        "badges": badges,
        "recent_events": events,
        "monthly_snapshots": snapshot_data,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Badge Definition CRUD
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/badges")
def list_badge_definitions(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all badge definitions."""
    definitions = (
        db.query(BadgeDefinition)
        .order_by(BadgeDefinition.display_order)
        .all()
    )
    return [
        BadgeDefinitionOut(
            id=d.id,
            badge_key=d.badge_key,
            name=d.name,
            description=d.description or "",
            tier=d.tier,
            category=d.category,
            icon_emoji=d.icon_emoji or "",
            evaluation_rule=d.evaluation_rule or {},
            is_active=d.is_active,
            is_secret=d.is_secret,
            display_order=d.display_order,
        )
        for d in definitions
    ]


@router.post("/badges", status_code=status.HTTP_201_CREATED)
def create_badge_definition(
    data: AdminBadgeCreateIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new badge definition."""
    existing = db.query(BadgeDefinition).filter(
        BadgeDefinition.badge_key == data.badge_key
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Badge key already exists")

    badge = BadgeDefinition(
        badge_key=data.badge_key,
        name=data.name,
        description=data.description,
        tier=data.tier,
        category=data.category,
        icon_emoji=data.icon_emoji,
        evaluation_rule=data.evaluation_rule or {},
        is_active=data.is_active,
        is_secret=data.is_secret,
        display_order=data.display_order,
    )
    db.add(badge)

    # Invalidate badge evaluator cache
    from badge_evaluator import badge_evaluator
    badge_evaluator.invalidate_cache()

    _log_audit(db, admin.id, "create_badge", None,
               {}, {"badge_key": data.badge_key, "name": data.name},
               f"Created badge definition: {data.badge_key}")
    db.commit()

    return {"success": True, "badge_key": data.badge_key, "id": badge.id}


@router.put("/badges/{badge_key}")
def update_badge_definition(
    badge_key: str,
    data: AdminBadgeUpdateIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a badge definition."""
    badge = db.query(BadgeDefinition).filter(
        BadgeDefinition.badge_key == badge_key
    ).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")

    old_values = {
        "name": badge.name,
        "description": badge.description,
        "is_active": badge.is_active,
    }

    if data.name is not None:
        badge.name = data.name
    if data.description is not None:
        badge.description = data.description
    if data.tier is not None:
        badge.tier = data.tier
    if data.category is not None:
        badge.category = data.category
    if data.icon_emoji is not None:
        badge.icon_emoji = data.icon_emoji
    if data.evaluation_rule is not None:
        badge.evaluation_rule = data.evaluation_rule
    if data.is_active is not None:
        badge.is_active = data.is_active
    if data.is_secret is not None:
        badge.is_secret = data.is_secret
    if data.display_order is not None:
        badge.display_order = data.display_order

    from badge_evaluator import badge_evaluator
    badge_evaluator.invalidate_cache()

    _log_audit(db, admin.id, "update_badge", None,
               old_values,
               {"name": badge.name, "description": badge.description, "is_active": badge.is_active},
               f"Updated badge: {badge_key}")
    db.commit()

    return {"success": True, "badge_key": badge_key}


# ──────────────────────────────────────────────────────────────────────────────
# Nightly Streak Reset (manual trigger)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/run-streak-reset")
def run_streak_reset(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Manually trigger nightly streak reset job."""
    from reward_scheduler import run_nightly_streak_reset

    result = run_nightly_streak_reset(db)

    _log_audit(db, admin.id, "run_streak_reset", None,
               {}, result, "Admin triggered streak reset")

    return {"success": True, **result}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _log_audit(
    db: Session,
    admin_id: int,
    action: str,
    target_student_id: Optional[int],
    old_values: dict,
    new_values: dict,
    reason: str,
):
    """Write a row to the reward_audit_log table."""
    log = RewardAuditLog(
        admin_id=admin_id,
        action=action,
        target_student_id=target_student_id,
        old_values=old_values,
        new_values=new_values,
        reason=reason,
    )
    db.add(log)
