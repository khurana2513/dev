"""
Pydantic schemas for the Reward System API.
Strict types — zero `Any`.

Field names match BOTH the route code and the frontend TypeScript types.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime, date


# ─── Shared helpers ──────────────────────────────────────────────────────────

class _TimestampMixin(BaseModel):
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# BADGE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class BadgeDefinitionOut(_TimestampMixin):
    id: int
    badge_key: str
    name: str
    description: str
    tier: str
    category: str
    icon_emoji: Optional[str] = None
    evaluation_rule: Dict[str, object] = {}
    is_active: bool = True
    is_secret: bool = False
    display_order: int = 0


class BadgeStatusOut(BaseModel):
    """Badge with earned/locked status — flat structure for the frontend."""
    badge_key: str
    name: str
    description: str = ""
    tier: str
    category: str
    icon_emoji: str = ""
    is_earned: bool = False
    earned_at: Optional[str] = None
    progress: Optional[str] = None
    progress_pct: Optional[float] = None
    is_secret: bool = False


class StudentBadgesResponse(BaseModel):
    badges: List[BadgeStatusOut] = []
    earned_count: int = 0
    total_count: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# REWARD EVENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class RewardEventOut(BaseModel):
    id: int
    event_type: str
    source_tool: str
    rule_key: Optional[str] = None
    points_delta: int
    event_metadata: Dict[str, object] = {}
    event_timestamp: Optional[str] = None
    is_voided: bool = False
    void_reason: Optional[str] = None


class PointsHistoryResponse(BaseModel):
    events: List[RewardEventOut] = []
    total: int = 0
    page: int = 1
    per_page: int = 20
    has_more: bool = False


# ═══════════════════════════════════════════════════════════════════════════════
# REWARD SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

class NextMilestoneOut(BaseModel):
    milestone: int
    days_remaining: int


class RewardsSummaryOut(BaseModel):
    total_points: int = 0
    badges_earned: int = 0
    total_badges: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    leaderboard_rank: Optional[int] = None
    next_milestone: Optional[NextMilestoneOut] = None


# ═══════════════════════════════════════════════════════════════════════════════
# STREAK SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class StreakResponse(BaseModel):
    current_streak: int = 0
    longest_streak: int = 0
    today_qualifying_count: int = 0
    today_threshold: int = 15
    streak_active_today: bool = False
    next_milestone: Optional[NextMilestoneOut] = None


# ═══════════════════════════════════════════════════════════════════════════════
# WEEKLY SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

class DailyPointOut(BaseModel):
    date: str
    points: int = 0
    is_today: bool = False


class WeeklySummaryOut(BaseModel):
    daily_points: List[DailyPointOut] = []
    total_week: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# LEADERBOARD SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class LeaderboardEntryOut(BaseModel):
    rank: int
    student_id: int
    student_name: str
    branch: str = ""
    course: str = ""
    level: str = ""
    total_points: int = 0
    avatar_url: Optional[str] = None
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntryOut] = []
    current_user_rank: Optional[int] = None
    total_participants: int = 0
    available_branches: List[str] = []


class MonthlySnapshotOut(_TimestampMixin):
    id: int
    snapshot_month: int
    snapshot_year: int
    monthly_points: int
    global_rank: int
    branch_rank: Optional[int] = None
    snapshotted_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class AdminPointsAdjustmentIn(BaseModel):
    student_id: int
    adjustment: int
    reason: str = Field(..., min_length=10)


class AdminBadgeGrantIn(BaseModel):
    student_id: int
    badge_key: str
    reason: Optional[str] = None


class AdminBadgeRevokeIn(BaseModel):
    student_id: int
    badge_key: str
    reason: str = Field(..., min_length=10)


class AdminVoidEventIn(BaseModel):
    event_id: int
    reason: str = Field(..., min_length=10)


class AdminSimulateMonthEndIn(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
    dry_run: bool = True


class AdminCacheRebuildOut(BaseModel):
    student_id: int
    old_total: int
    new_total: int
    events_processed: int


class AdminBadgeCreateIn(BaseModel):
    badge_key: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    tier: str
    category: str
    icon_emoji: Optional[str] = None
    evaluation_rule: Dict[str, object] = {}
    is_active: bool = True
    is_secret: bool = False
    display_order: int = 0

    @field_validator("tier")
    @classmethod
    def validate_tier(cls, v: str) -> str:
        allowed = {"bronze", "silver", "gold", "platinum", "special"}
        if v not in allowed:
            raise ValueError(f"tier must be one of {allowed}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {"practice", "streak", "attendance", "special"}
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v


class AdminBadgeUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tier: Optional[str] = None
    category: Optional[str] = None
    icon_emoji: Optional[str] = None
    evaluation_rule: Optional[Dict[str, object]] = None
    is_active: Optional[bool] = None
    is_secret: Optional[bool] = None
    display_order: Optional[int] = None

    @field_validator("tier")
    @classmethod
    def validate_tier(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"bronze", "silver", "gold", "platinum", "special"}
            if v not in allowed:
                raise ValueError(f"tier must be one of {allowed}")
        return v


class AuditLogEntryOut(BaseModel):
    id: int
    admin_id: int
    admin_name: str = ""
    action: str
    target_student_id: Optional[int] = None
    old_values: Optional[Dict[str, object]] = None
    new_values: Optional[Dict[str, object]] = None
    reason: str = ""
    created_at: Optional[str] = None


class SimulationResultEntry(BaseModel):
    student_id: int
    student_name: str
    branch: str = ""
    monthly_points: int
    projected_rank: int
    projected_bonus: int = 0


class SimulationResponse(BaseModel):
    month: int
    year: int
    entries: List[SimulationResultEntry] = []


# ═══════════════════════════════════════════════════════════════════════════════
# STREAK CALENDAR SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class StreakCalendarDay(BaseModel):
    date: str          # YYYY-MM-DD (IST)
    qualified: bool    # threshold met that day
    count: int         # qualifying questions that day


class StreakCalendarResponse(BaseModel):
    year: int
    month: int
    days: List[StreakCalendarDay]
    qualified_count: int   # days this month with streak
    total_days: int        # days elapsed this month (incl. today)
