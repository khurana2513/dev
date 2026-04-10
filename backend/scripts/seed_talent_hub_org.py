#!/usr/bin/env python3
"""
Seed script — registers Talent Hub as organization #1 and backfills all
existing records with that org's ID.

IDEMPOTENT: safe to run multiple times.  It will skip any step that has
already been applied.

Usage (from repo root, with .venv active):
    cd backend
    python scripts/seed_talent_hub_org.py

Environment variables required (same as the main app):
    DATABASE_URL
    ADMIN_EMAILS
"""
import os
import sys
import uuid
import re

# Allow imports from backend/ when run as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import sqlalchemy as sa
from sqlalchemy.orm import Session

# ── Bootstrap DB connection ───────────────────────────────────────────────────
from models import (
    Organization, OrgInviteLink, User, StudentProfile,
    ClassSchedule, ClassSession, FeePlan, Certificate, engine, SessionLocal,
)
from reward_models import RewardRule, BadgeDefinition

# ── Config ────────────────────────────────────────────────────────────────────
TH_ORG_NAME   = "Talent Hub"
TH_ORG_SLUG   = "talent-hub"
TH_ORG_PREFIX = "TH"
TH_ORG_ID     = "00000000-0000-0000-0000-000000000001"   # stable UUID for TH

ADMIN_EMAILS_RAW = os.getenv("ADMIN_EMAILS", "")
ADMIN_EMAILS = {e.strip().lower() for e in ADMIN_EMAILS_RAW.split(",") if e.strip()}

# ── Helpers ───────────────────────────────────────────────────────────────────

def banner(msg: str) -> None:
    print(f"\n{'─' * 60}\n  {msg}\n{'─' * 60}")


def run_seed() -> None:
    db: Session = SessionLocal()
    try:
        _seed(db)
    finally:
        db.close()


def _seed(db: Session) -> None:
    banner("Step 1 — Ensure platform_admin users have system_role set")

    platform_admin_users = (
        db.query(User)
        .filter(User.email.in_(list(ADMIN_EMAILS)))
        .all()
    )
    for u in platform_admin_users:
        if u.system_role != "platform_admin" or u.role != "admin":
            u.system_role = "platform_admin"
            u.role = "admin"
            print(f"  ✅  {u.email} → system_role=platform_admin, role=admin")
        else:
            print(f"  ⏭   {u.email} already set")

    db.flush()

    # ── Find the primary owner (first in ADMIN_EMAILS list) ──────────────────
    primary_admin = (
        db.query(User)
        .filter(User.email == list(ADMIN_EMAILS)[0])
        .first()
        if ADMIN_EMAILS
        else None
    )
    if not primary_admin:
        raise RuntimeError(
            "No user found for the first ADMIN_EMAIL. Have any admins logged in yet?"
        )
    print(f"\n  Primary admin: {primary_admin.email} (user_id={primary_admin.id})")

    # ── Step 2 — Create Talent Hub org ────────────────────────────────────────
    banner("Step 2 — Create 'Talent Hub' organization (if not exists)")

    existing_org = db.query(Organization).filter(Organization.id == TH_ORG_ID).first()
    if existing_org:
        th_org = existing_org
        print(f"  ⏭   Organization '{th_org.name}' already exists (id={th_org.id})")
    else:
        # Also check by prefix in case the org has a different ID
        existing_prefix = db.query(Organization).filter(Organization.id_prefix == TH_ORG_PREFIX).first()
        if existing_prefix:
            th_org = existing_prefix
            print(f"  ⏭   Org with prefix '{TH_ORG_PREFIX}' already exists (id={th_org.id})")
        else:
            th_org = Organization(
                id=TH_ORG_ID,
                name=TH_ORG_NAME,
                slug=TH_ORG_SLUG,
                id_prefix=TH_ORG_PREFIX,
                owner_user_id=primary_admin.id,
                is_active=True,
                is_verified=True,
                onboarding_complete=True,
                subscription_tier="enterprise",
                max_students=9999,
            )
            db.add(th_org)
            db.flush()
            print(f"  ✅  Created '{TH_ORG_NAME}' org (id={th_org.id})")

    th_id = th_org.id

    # ── Step 3 — Backfill student_profiles ───────────────────────────────────
    banner("Step 3 — Backfill org_id on student_profiles")
    updated = (
        db.query(StudentProfile)
        .filter(StudentProfile.org_id == None)  # noqa: E711
        .update({"org_id": th_id}, synchronize_session=False)
    )
    print(f"  ✅  {updated} student_profiles updated")

    # ── Step 4 — Backfill class_schedules ────────────────────────────────────
    banner("Step 4 — Backfill org_id on class_schedules")
    updated = (
        db.query(ClassSchedule)
        .filter(ClassSchedule.org_id == None)  # noqa: E711
        .update({"org_id": th_id}, synchronize_session=False)
    )
    print(f"  ✅  {updated} class_schedules updated")

    # ── Step 5 — Backfill class_sessions ─────────────────────────────────────
    banner("Step 5 — Backfill org_id on class_sessions")
    updated = (
        db.query(ClassSession)
        .filter(ClassSession.org_id == None)  # noqa: E711
        .update({"org_id": th_id}, synchronize_session=False)
    )
    print(f"  ✅  {updated} class_sessions updated")

    # ── Step 6 — Backfill fee_plans ──────────────────────────────────────────
    banner("Step 6 — Backfill org_id on fee_plans")
    updated = (
        db.query(FeePlan)
        .filter(FeePlan.org_id == None)  # noqa: E711
        .update({"org_id": th_id}, synchronize_session=False)
    )
    print(f"  ✅  {updated} fee_plans updated")

    # ── Step 7 — Backfill certificates ───────────────────────────────────────
    banner("Step 7 — Backfill org_id on certificates")
    updated = (
        db.query(Certificate)
        .filter(Certificate.org_id == None)  # noqa: E711
        .update({"org_id": th_id}, synchronize_session=False)
    )
    print(f"  ✅  {updated} certificates updated")

    # ── Commit all changes ────────────────────────────────────────────────────
    db.commit()
    print("\n\n✅  Seed complete.  Talent Hub is org #1.")


if __name__ == "__main__":
    run_seed()
