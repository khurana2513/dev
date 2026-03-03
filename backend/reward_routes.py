"""
Reward Routes — Student-facing API endpoints.

Provides:
  - GET  /rewards/summary          — full rewards dashboard summary
  - GET  /rewards/badges           — all badge statuses (earned + locked)
  - GET  /rewards/points/history   — paginated point events
  - GET  /rewards/streak           — current streak info
  - GET  /rewards/leaderboard      — live leaderboard (+ optional branch filter)
  - GET  /rewards/weekly-summary   — weekly points breakdown
  - GET  /rewards/super-journey    — SUPER badge journey progress
"""

import logging
from typing import Optional
from datetime import datetime, timedelta, time as dt_time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from models import User, StudentProfile, get_db
from auth import get_current_user
from reward_models import (
    RewardEvent,
    BadgeDefinition,
    StudentBadgeAward,
    MonthlyLeaderboardSnapshot,
)
from reward_schemas import (
    RewardsSummaryOut,
    StudentBadgesResponse,
    BadgeStatusOut,
    PointsHistoryResponse,
    RewardEventOut,
    StreakResponse,
    LeaderboardResponse,
    LeaderboardEntryOut,
    WeeklySummaryOut,
    NextMilestoneOut,
)
from timezone_utils import get_ist_now, IST_TIMEZONE, ist_to_utc, utc_to_ist

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rewards", tags=["rewards"])


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/summary
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=RewardsSummaryOut)
def get_rewards_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full rewards dashboard: points, badges, streak, next milestone."""
    student_id = current_user.id

    # Points
    total_points = current_user.total_points or 0

    # Badges
    badge_count = (
        db.query(func.count(StudentBadgeAward.id))
        .filter(
            StudentBadgeAward.student_id == student_id,
            StudentBadgeAward.is_active == True,
        )
        .scalar()
    ) or 0

    total_badges = (
        db.query(func.count(BadgeDefinition.id))
        .filter(BadgeDefinition.is_active == True)
        .scalar()
    ) or 0

    # Streak
    current_streak = current_user.current_streak or 0
    longest_streak = current_user.longest_streak or 0

    # Next milestone
    next_milestone = _compute_next_milestone(current_streak)

    # Leaderboard rank (live)
    rank = _compute_live_rank(db, student_id)

    return RewardsSummaryOut(
        total_points=total_points,
        badges_earned=badge_count,
        total_badges=total_badges,
        current_streak=current_streak,
        longest_streak=longest_streak,
        leaderboard_rank=rank,
        next_milestone=next_milestone,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/badges
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/badges", response_model=StudentBadgesResponse)
def get_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All badges: earned (with timestamp) + locked (with progress)."""
    student_id = current_user.id

    definitions = (
        db.query(BadgeDefinition)
        .filter(BadgeDefinition.is_active == True)
        .order_by(BadgeDefinition.display_order)
        .all()
    )

    awards = (
        db.query(StudentBadgeAward)
        .filter(
            StudentBadgeAward.student_id == student_id,
            StudentBadgeAward.is_active == True,
        )
        .all()
    )
    award_map = {a.badge_id: a for a in awards}

    statuses = []
    for defn in definitions:
        if defn.is_secret and defn.id not in award_map:
            continue  # Hide secret badges that aren't earned

        earned = defn.id in award_map
        awarded_at = None
        if earned:
            awarded_at = utc_to_ist(award_map[defn.id].awarded_at).isoformat() if award_map[defn.id].awarded_at else None

        # Compute progress for locked badges
        progress = None
        progress_pct = None
        if not earned:
            progress, progress_pct = _compute_badge_progress(db, student_id, defn)

        statuses.append(BadgeStatusOut(
            badge_key=defn.badge_key,
            name=defn.name,
            description=defn.description or "",
            tier=defn.tier,
            category=defn.category,
            icon_emoji=defn.icon_emoji or "",
            is_earned=earned,
            earned_at=awarded_at,
            progress=progress,
            progress_pct=progress_pct,
            is_secret=defn.is_secret,
        ))

    earned_count = sum(1 for s in statuses if s.is_earned)

    return StudentBadgesResponse(
        badges=statuses,
        earned_count=earned_count,
        total_count=len(statuses),
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/points/history
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/points/history", response_model=PointsHistoryResponse)
def get_points_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Paginated point event history."""
    student_id = current_user.id

    total = (
        db.query(func.count(RewardEvent.id))
        .filter(
            RewardEvent.student_id == student_id,
            RewardEvent.is_voided == False,
        )
        .scalar()
    ) or 0

    events = (
        db.query(RewardEvent)
        .filter(
            RewardEvent.student_id == student_id,
            RewardEvent.is_voided == False,
        )
        .order_by(desc(RewardEvent.event_timestamp))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = []
    for e in events:
        items.append(RewardEventOut(
            id=e.id,
            event_type=e.event_type,
            source_tool=e.source_tool,
            rule_key=e.rule_key,
            points_delta=e.points_delta,
            event_metadata=e.event_metadata or {},
            event_timestamp=utc_to_ist(e.event_timestamp).isoformat() if e.event_timestamp else None,
        ))

    return PointsHistoryResponse(
        events=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(page * per_page) < total,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/streak
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakResponse)
def get_streak(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Current streak details + today's progress."""
    from streak_service import streak_service, STREAK_THRESHOLD

    student_id = current_user.id
    today_count = streak_service.count_qualifying_today(db, student_id)

    current_streak = current_user.current_streak or 0
    longest_streak = current_user.longest_streak or 0

    # Determine if today's threshold is met
    streak_active_today = False
    if current_user.last_practice_date:
        last_date = current_user.last_practice_date
        if hasattr(last_date, "date"):
            last_date = last_date.date()
        streak_active_today = last_date == get_ist_now().date()

    next_milestone = _compute_next_milestone(current_streak)

    return StreakResponse(
        current_streak=current_streak,
        longest_streak=longest_streak,
        today_qualifying_count=today_count,
        today_threshold=STREAK_THRESHOLD,
        streak_active_today=streak_active_today,
        next_milestone=next_milestone,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/leaderboard
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Live leaderboard — ranks by User.total_points.
    Optionally filtered by StudentProfile.branch.
    """
    query = (
        db.query(
            User.id,
            User.name,
            User.total_points,
            User.avatar_url,
            StudentProfile.branch,
        )
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .filter(
            User.role == "student",
            User.is_archived == False,
        )
    )

    if branch:
        query = query.filter(StudentProfile.branch == branch)

    query = query.order_by(desc(User.total_points)).limit(limit)
    rows = query.all()

    # Total count of ALL eligible students (not capped by limit)
    total_count = (
        db.query(func.count(User.id))
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .filter(
            User.role == "student",
            User.is_archived == False,
        )
    )
    if branch:
        total_count = total_count.filter(StudentProfile.branch == branch)
    total_students = total_count.scalar() or 0

    entries = []
    for rank, row in enumerate(rows, start=1):
        entries.append(LeaderboardEntryOut(
            rank=rank,
            student_id=row.id,
            student_name=row.name or "Unknown",
            branch=row.branch or "",
            total_points=row.total_points or 0,
            avatar_url=row.avatar_url,
            is_current_user=(row.id == current_user.id),
        ))

    # Determine current user's rank if not in the list
    current_user_rank = None
    for e in entries:
        if e.is_current_user:
            current_user_rank = e.rank
            break

    if current_user_rank is None:
        current_user_rank = _compute_live_rank(db, current_user.id)

    # Get available branches for filter dropdown
    branches = (
        db.query(func.distinct(StudentProfile.branch))
        .filter(StudentProfile.branch.isnot(None))
        .all()
    )
    available_branches = sorted([b[0] for b in branches if b[0]])

    return LeaderboardResponse(
        entries=entries,
        current_user_rank=current_user_rank,
        total_participants=total_students,
        available_branches=available_branches,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/weekly-summary
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/weekly-summary", response_model=WeeklySummaryOut)
def get_weekly_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Points earned in the last 7 days, broken down by day."""
    student_id = current_user.id
    now_ist = get_ist_now()

    daily_points = []
    total_week = 0

    for days_ago in range(6, -1, -1):  # 6 days ago → today
        day = (now_ist - timedelta(days=days_ago)).date()
        ist_start = datetime.combine(day, dt_time.min).replace(tzinfo=IST_TIMEZONE)
        ist_end = datetime.combine(day + timedelta(days=1), dt_time.min).replace(tzinfo=IST_TIMEZONE)
        utc_start = ist_to_utc(ist_start)
        utc_end = ist_to_utc(ist_end)

        day_total = (
            db.query(func.coalesce(func.sum(RewardEvent.points_delta), 0))
            .filter(
                RewardEvent.student_id == student_id,
                RewardEvent.is_voided == False,
                RewardEvent.event_timestamp >= utc_start,
                RewardEvent.event_timestamp < utc_end,
            )
            .scalar()
        ) or 0

        daily_points.append({
            "date": str(day),
            "points": day_total,
            "is_today": days_ago == 0,
        })
        total_week += day_total

    return WeeklySummaryOut(
        daily_points=daily_points,
        total_week=total_week,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/super-journey
# ──────────────────────────────────────────────────────────────────────────────

# All SUPER journey milestones in order
_SUPER_MILESTONES = [
    {"points": 500,   "badge_key": "super_chocolate_1", "type": "chocolate", "label": "🍫 Chocolate",    "emoji": "🍫"},
    {"points": 1500,  "badge_key": "super_letter_s",    "type": "letter",    "label": "S",               "emoji": "⭐", "letter": "S"},
    {"points": 3000,  "badge_key": "super_chocolate_2", "type": "chocolate", "label": "🍫 Chocolate",    "emoji": "🍫"},
    {"points": 5000,  "badge_key": "super_letter_u",    "type": "letter",    "label": "U",               "emoji": "⭐", "letter": "U"},
    {"points": 7500,  "badge_key": "super_chocolate_3", "type": "chocolate", "label": "🍫 Chocolate",    "emoji": "🍫"},
    {"points": 10000, "badge_key": "super_letter_p",    "type": "letter",    "label": "P",               "emoji": "⭐", "letter": "P"},
    {"points": 13000, "badge_key": "super_chocolate_4", "type": "chocolate", "label": "🍫 Chocolate",    "emoji": "🍫"},
    {"points": 16000, "badge_key": "super_letter_e",    "type": "letter",    "label": "E",               "emoji": "⭐", "letter": "E"},
    {"points": 19000, "badge_key": "super_chocolate_5", "type": "chocolate", "label": "🍫 Chocolate",    "emoji": "🍫"},
    {"points": 22000, "badge_key": "super_letter_r",    "type": "letter",    "label": "R",               "emoji": "⭐", "letter": "R"},
    {"points": 25000, "badge_key": "super_mystery_gift","type": "mystery",   "label": "🎁 Mystery Gift", "emoji": "🎁"},
    {"points": 30000, "badge_key": "super_party",       "type": "party",     "label": "🎉 Party",        "emoji": "🎉"},
]

@router.get("/super-journey")
def get_super_journey(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns SUPER Journey progress — milestones, unlocked status,
    current points, next milestone info, and percentage to next.
    """
    student_id = current_user.id
    total_points = current_user.total_points or 0

    # Get all awarded super badges for this student
    awarded_keys = set(
        row.badge_key
        for row in db.query(BadgeDefinition.badge_key)
        .join(StudentBadgeAward, StudentBadgeAward.badge_id == BadgeDefinition.id)
        .filter(
            StudentBadgeAward.student_id == student_id,
            StudentBadgeAward.is_active == True,
            BadgeDefinition.badge_key.in_([m["badge_key"] for m in _SUPER_MILESTONES]),
        )
        .all()
    )

    milestones = []
    next_milestone = None
    prev_points = 0

    for m in _SUPER_MILESTONES:
        unlocked = m["badge_key"] in awarded_keys
        milestones.append({
            **m,
            "unlocked": unlocked,
        })
        if not unlocked and next_milestone is None:
            next_milestone = {
                **m,
                "points_needed": max(0, m["points"] - total_points),
                "range_start": prev_points,
                "range_end": m["points"],
                "progress_in_range": max(0, total_points - prev_points),
                "range_size": max(1, m["points"] - prev_points),
                "pct": min(100.0, round(
                    max(0, total_points - prev_points) / max(1, m["points"] - prev_points) * 100, 1
                )),
            }
        prev_points = m["points"]

    # How many letters unlocked
    letters_unlocked = [m for m in milestones if m["type"] == "letter" and m["unlocked"]]
    all_letters_done = len(letters_unlocked) == 5

    return {
        "total_points": total_points,
        "milestones": milestones,
        "next_milestone": next_milestone,
        "all_letters_done": all_letters_done,
        "letters_unlocked_count": len(letters_unlocked),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _compute_live_rank(db: Session, student_id: int) -> Optional[int]:
    """Compute live rank by total_points among all active students (including 0-point)."""
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        return None

    my_points = user.total_points or 0

    rank = (
        db.query(func.count(User.id))
        .filter(
            User.role == "student",
            User.is_archived == False,
            User.total_points > my_points,
        )
        .scalar()
    )
    return (rank or 0) + 1


_STREAK_MILESTONES_SORTED = [3, 7, 14, 30, 60, 100]


def _compute_next_milestone(current_streak: int) -> Optional[NextMilestoneOut]:
    """Find next streak milestone and days remaining."""
    for m in _STREAK_MILESTONES_SORTED:
        if current_streak < m:
            return NextMilestoneOut(
                milestone=m,
                days_remaining=m - current_streak,
            )
    return None  # All milestones achieved


def _compute_badge_progress(
    db: Session, student_id: int, badge_def: BadgeDefinition
) -> tuple:
    """
    Compute (progress_text, progress_pct) for a locked badge.
    Returns (None, None) for unknown evaluation types.
    """
    rule = badge_def.evaluation_rule or {}
    rule_type = rule.get("type", "manual_only")
    threshold = rule.get("threshold", 0)

    if rule_type == "cumulative_correct_count" and threshold > 0:
        from badge_evaluator import BadgeEvaluator
        evaluator = BadgeEvaluator()

        # We need total correct — reuse the logic from evaluator
        from models import Attempt, PracticeSession, PaperAttempt
        attempt_correct = (
            db.query(func.count(Attempt.id))
            .join(PracticeSession, Attempt.session_id == PracticeSession.id)
            .filter(PracticeSession.user_id == student_id, Attempt.is_correct == True)
            .scalar()
        ) or 0
        paper_correct = (
            db.query(func.coalesce(func.sum(PaperAttempt.correct_answers), 0))
            .filter(PaperAttempt.user_id == student_id, PaperAttempt.completed_at.isnot(None))
            .scalar()
        ) or 0
        total = attempt_correct + paper_correct
        pct = min(round((total / threshold) * 100, 1), 100.0)
        return f"{total}/{threshold} correct answers", pct

    elif rule_type == "streak_milestone" and threshold > 0:
        user = db.query(User).filter(User.id == student_id).first()
        current = user.current_streak if user else 0
        pct = min(round((current / threshold) * 100, 1), 100.0)
        return f"{current}/{threshold} day streak", pct

    elif rule_type == "multi_tool_same_day":
        return "Use multiple tools in one day", None

    elif rule_type == "cumulative_points" and threshold > 0:
        user = db.query(User).filter(User.id == student_id).first()
        current = user.total_points if user else 0
        pct = min(round(((current or 0) / threshold) * 100, 1), 100.0)
        return f"{current or 0}/{threshold} points", pct

    return None, None
