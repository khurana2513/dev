"""
Reward Routes — Student-facing API endpoints.

Provides:
  - GET  /rewards/summary          — full rewards dashboard summary
  - GET  /rewards/badges           — all badge statuses (earned + locked)
  - GET  /rewards/points/history   — paginated point events
  - GET  /rewards/streak           — current streak info
  - GET  /rewards/streak/calendar  — monthly streak calendar (qualifying days)
  - GET  /rewards/leaderboard      — live leaderboard (all_time | weekly)
  - GET  /rewards/weekly-summary   — weekly points breakdown
  - GET  /rewards/super-journey    — SUPER badge journey progress
"""

import logging
import calendar as _calendar
from typing import Optional, List
from datetime import datetime, timedelta, time as dt_time, date as _date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from models import User, StudentProfile, Organization, get_db, PointsLog, Attempt, PracticeSession, PaperAttempt
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
    StreakCalendarDay,
    StreakCalendarResponse,
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
# GET /rewards/streak/calendar  (registered BEFORE /streak — more specific first)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/streak/calendar", response_model=StreakCalendarResponse)
def get_streak_calendar(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Monthly qualifying-day calendar.
    Uses exactly 2 DB queries for the whole month (never N queries).
    Logic mirrors StreakService.count_qualifying_today exactly.
    """
    from streak_service import STREAK_THRESHOLD, VEDIC_MATH_LEVEL_PREFIX
    from collections import defaultdict

    IST_OFFSET = timedelta(hours=5, minutes=30)
    student_id = current_user.id
    today_ist = get_ist_now().date()
    _, days_in_month = _calendar.monthrange(year, month)

    # Month boundaries (IST → timezone-aware UTC)
    month_first_ist = datetime.combine(_date(year, month, 1), dt_time.min).replace(tzinfo=IST_TIMEZONE)
    if month == 12:
        month_next_ist = datetime.combine(_date(year + 1, 1, 1), dt_time.min).replace(tzinfo=IST_TIMEZONE)
    else:
        month_next_ist = datetime.combine(_date(year, month + 1, 1), dt_time.min).replace(tzinfo=IST_TIMEZONE)

    month_utc_start = ist_to_utc(month_first_ist)
    month_utc_end   = ist_to_utc(month_next_ist)

    # --- Batch query 1: Mental Math + Burst Mode ----------------------------
    # Attempt.created_at is Column(DateTime) — naive UTC stored in DB.
    # We compare with timezone-aware UTC (same as streak_service does, and it works).
    attempt_timestamps = (
        db.query(Attempt.created_at)
        .join(PracticeSession, Attempt.session_id == PracticeSession.id)
        .filter(
            PracticeSession.user_id == student_id,
            PracticeSession.difficulty_mode != "custom",
            Attempt.created_at >= month_utc_start,
            Attempt.created_at < month_utc_end,
        )
        .all()
    )

    # --- Batch query 2: Vedic Math papers -----------------------------------
    # PaperAttempt.completed_at is Column(DateTime(timezone=True)) — aware UTC.
    paper_rows = (
        db.query(
            PaperAttempt.completed_at,
            (PaperAttempt.correct_answers + PaperAttempt.wrong_answers).label("total"),
        )
        .filter(
            PaperAttempt.user_id == student_id,
            PaperAttempt.completed_at.isnot(None),
            PaperAttempt.completed_at >= month_utc_start,
            PaperAttempt.completed_at < month_utc_end,
            PaperAttempt.paper_level.like(VEDIC_MATH_LEVEL_PREFIX + "%"),
        )
        .all()
    )

    # --- Aggregate by IST calendar day in Python ----------------------------
    day_counts: dict = defaultdict(int)

    for (ts,) in attempt_timestamps:
        if ts is None:
            continue
        # Naive UTC → IST: fixed +5:30 offset
        ist_day = (ts + IST_OFFSET).date()
        day_counts[ist_day] += 1

    for (ts, total) in paper_rows:
        if ts is None:
            continue
        # Aware UTC → IST via helper
        ist_day = utc_to_ist(ts).date() if (ts.tzinfo is not None) else (ts + IST_OFFSET).date()
        day_counts[ist_day] += (total or 0)

    # --- Build per-day response ---------------------------------------------
    days_out: List[StreakCalendarDay] = []
    qualified_count = 0
    elapsed = 0

    for day_num in range(1, days_in_month + 1):
        ist_date = _date(year, month, day_num)
        if ist_date > today_ist:
            days_out.append(StreakCalendarDay(date=ist_date.isoformat(), qualified=False, count=0))
            continue
        elapsed += 1
        count = day_counts.get(ist_date, 0)
        qualified = count >= STREAK_THRESHOLD
        if qualified:
            qualified_count += 1
        days_out.append(StreakCalendarDay(date=ist_date.isoformat(), qualified=qualified, count=count))

    return StreakCalendarResponse(
        year=year,
        month=month,
        days=days_out,
        qualified_count=qualified_count,
        total_days=elapsed,
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
# GET /rewards/leaderboard/public  — No auth, used on public Home page
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/leaderboard/public")
def get_public_leaderboard(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Public top-N all-time leaderboard for the home page.
    No authentication required. Returns only non-sensitive fields.
    """
    rows = (
        db.query(
            User.id,
            User.name,
            User.total_points.label("total_points"),
            User.avatar_url,
            StudentProfile.branch,
            StudentProfile.course,
            StudentProfile.level,
            Organization.name.label("org_name"),
        )
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .outerjoin(Organization, Organization.id == StudentProfile.org_id)
        .filter(
            User.role == "student",
            User.is_archived == False,
            User.total_points > 0,
        )
        .order_by(desc(User.total_points))
        .limit(limit)
        .all()
    )

    entries = [
        {
            "rank": i + 1,
            "student_name": row.name or "—",
            "branch": row.branch or "",
            "course": row.course or "",
            "level": row.level or "",
            "total_points": row.total_points or 0,
            "avatar_url": row.avatar_url,
            "org_name": row.org_name or "",
        }
        for i, row in enumerate(rows)
    ]
    return {"entries": entries, "total": len(entries)}


# ──────────────────────────────────────────────────────────────────────────────
# GET /rewards/leaderboard
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    period: str = Query("all_time", description="all_time or weekly"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Live leaderboard — ranks by all-time or weekly points.
    """
    if period == "weekly":
        # Sum PointsLog for the rolling 7-day window (IST)
        now_ist = get_ist_now()
        week_start_ist = (now_ist - timedelta(days=7)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_start_utc = ist_to_utc(week_start_ist)

        points_subq = (
            db.query(
                PointsLog.user_id,
                func.coalesce(func.sum(PointsLog.points), 0).label("weekly_points"),
            )
            .filter(PointsLog.created_at >= week_start_utc)
            .group_by(PointsLog.user_id)
            .subquery()
        )

        rows = (
            db.query(
                User.id,
                User.name,
                func.coalesce(points_subq.c.weekly_points, 0).label("display_points"),
                User.avatar_url,
                StudentProfile.branch,
                StudentProfile.course,
                StudentProfile.level,
            )
            .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
            .outerjoin(points_subq, points_subq.c.user_id == User.id)
            .filter(
                User.role == "student",
                User.is_archived == False,
                func.coalesce(points_subq.c.weekly_points, 0) > 0,
            )
            .order_by(desc(func.coalesce(points_subq.c.weekly_points, 0)))
            .limit(limit)
            .all()
        )
    else:
        # All time
        rows = (
            db.query(
                User.id,
                User.name,
                User.total_points.label("display_points"),
                User.avatar_url,
                StudentProfile.branch,
                StudentProfile.course,
                StudentProfile.level,
            )
            .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
            .filter(
                User.role == "student",
                User.is_archived == False,
            )
            .order_by(desc(User.total_points))
            .limit(limit)
            .all()
        )

    entries = []
    for rank, row in enumerate(rows, start=1):
        entries.append(LeaderboardEntryOut(
            rank=rank,
            student_id=row.id,
            student_name=row.name or "Unknown",
            branch=row.branch or "",
            course=row.course or "",
            level=row.level or "",
            total_points=row.display_points or 0,
            avatar_url=row.avatar_url,
            is_current_user=(row.id == current_user.id),
        ))

    # Total eligible students
    total_students = (
        db.query(func.count(User.id))
        .filter(User.role == "student", User.is_archived == False)
        .scalar()
    ) or 0

    # Current user's rank
    current_user_rank = None
    for e in entries:
        if e.is_current_user:
            current_user_rank = e.rank
            break
    if current_user_rank is None:
        current_user_rank = _compute_live_rank(db, current_user.id)

    return LeaderboardResponse(
        entries=entries,
        current_user_rank=current_user_rank,
        total_participants=total_students,
        available_branches=[],  # branch filter removed
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
    today_ist = now_ist.date()

    # Build the 7-day window boundaries in UTC (single DB round trip)
    week_start_ist = datetime.combine(
        today_ist - timedelta(days=6), dt_time.min
    ).replace(tzinfo=IST_TIMEZONE)
    week_end_ist = datetime.combine(
        today_ist + timedelta(days=1), dt_time.min
    ).replace(tzinfo=IST_TIMEZONE)
    week_start_utc = ist_to_utc(week_start_ist)
    week_end_utc = ist_to_utc(week_end_ist)

    # Single query: fetch all qualifying events in the 7-day window
    rows = (
        db.query(RewardEvent.event_timestamp, RewardEvent.points_delta)
        .filter(
            RewardEvent.student_id == student_id,
            RewardEvent.is_voided == False,
            RewardEvent.event_timestamp >= week_start_utc,
            RewardEvent.event_timestamp < week_end_utc,
        )
        .all()
    )

    # Aggregate in Python per IST calendar day
    day_totals: dict = {}
    for ts, pts in rows:
        # Convert UTC timestamp to IST date
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=IST_TIMEZONE)
        ist_date = ts.astimezone(IST_TIMEZONE).date()
        day_totals[ist_date] = day_totals.get(ist_date, 0) + (pts or 0)

    daily_points = []
    total_week = 0
    for days_ago in range(6, -1, -1):  # 6 days ago → today
        day = today_ist - timedelta(days=days_ago)
        day_total = day_totals.get(day, 0)
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
        # Unlock is driven purely by the student's point total, NOT by whether
        # the badge was formally inserted into StudentBadgeAward.  The badge
        # award row may be missing (e.g. if the evaluator was never triggered
        # or the badge_definition row has wrong evaluation_rule), but the user
        # has legitimately crossed the threshold, so we show it as unlocked.
        unlocked = total_points >= m["points"]
        # separately track whether the physical badge object was awarded (used
        # by the frontend to render the badge art vs a generic icon).
        badge_awarded = m["badge_key"] in awarded_keys
        milestones.append({
            **m,
            "unlocked": unlocked,
            "badge_awarded": badge_awarded,
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
