"""
Reward System Models — Database tables for the gamification engine.

Tables:
  reward_rules           – Fixed-value bonus rules (daily login, burst completion, streak milestones)
  reward_events          – Immutable event ledger — single source of truth for all reward point changes
  badge_definitions      – Admin-managed badge templates with evaluation rules
  student_badge_awards   – Junction table for earned badges (UNIQUE per student×badge)
  monthly_leaderboard_snapshots – Frozen month-end rankings
  reward_audit_log       – Admin action audit trail

Design notes:
  • Integer primary keys — matches every other model in the codebase
  • String columns for "enum-like" values — avoids PostgreSQL ALTER TYPE migrations
  • Sync SQLAlchemy (not async) — matches existing codebase
  • student_id references users.id (Integer)
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Float, Text, JSON,
    ForeignKey, Index, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from models import Base
from timezone_utils import get_utc_now


# ─── Valid string constants (enforced at service layer, not DB enum) ──────────

REWARD_EVENT_TYPES = frozenset([
    "session_completed",
    "question_correct",
    "burst_mode_completed",
    "daily_login",
    "streak_incremented",
    "streak_reset",
    "streak_milestone_reached",
    "badge_earned",
    "badge_revoked",
    "monthly_leaderboard_reward",
    "admin_points_adjustment",
    "admin_badge_granted",
    "admin_badge_revoked",
    "monthly_snapshot_created",
])

BADGE_TIERS = frozenset(["bronze", "silver", "gold", "platinum", "special"])
BADGE_CATEGORIES = frozenset(["practice", "streak", "attendance", "special"])
SOURCE_TOOLS = frozenset([
    "practice_paper", "mental_math", "burst_mode",
    "system", "admin",
])


# ═══════════════════════════════════════════════════════════════════════════════
# REWARD RULES — Fixed-value bonus rules
# (NOT for per-question points — those come from point_rules via PointRuleEngine)
# ═══════════════════════════════════════════════════════════════════════════════

class RewardRule(Base):
    __tablename__ = "reward_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_key = Column(String(100), unique=True, nullable=False, index=True)
    source_tool = Column(String(50), nullable=False)          # 'system', 'burst_mode', etc.
    description = Column(Text, nullable=False)
    points_awarded = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)


# ═══════════════════════════════════════════════════════════════════════════════
# REWARD EVENTS — Immutable ledger  ★ NEVER DELETE ROWS ★
# ═══════════════════════════════════════════════════════════════════════════════

class RewardEvent(Base):
    __tablename__ = "reward_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    event_type = Column(String(60), nullable=False, index=True)
    source_tool = Column(String(50), nullable=False)

    # NULL for question_correct events (resolved by PointRuleEngine, not reward_rules).
    # References reward_rules.rule_key for all other events.
    rule_key = Column(
        String(100),
        ForeignKey("reward_rules.rule_key", ondelete="RESTRICT"),
        nullable=True,
    )

    # Variable for question_correct (+3/+5/+8); fixed for others; negative for admin deductions.
    points_delta = Column(Integer, nullable=False, default=0)

    # Event-specific metadata (JSON).
    event_metadata = Column(JSON, default=dict)

    event_timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        default=get_utc_now,
        index=True,
    )

    # NULL = system-generated.  Populated for admin actions.
    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Voiding (soft-delete analogue).
    is_voided = Column(Boolean, nullable=False, default=False)
    voided_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    void_reason = Column(Text, nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (
        Index("idx_re_student_ts", "student_id", "event_timestamp"),
        Index("idx_re_type", "event_type"),
        Index("idx_re_student_type", "student_id", "event_type"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# BADGE DEFINITIONS — admin-managed badge templates
# ═══════════════════════════════════════════════════════════════════════════════

class BadgeDefinition(Base):
    __tablename__ = "badge_definitions"

    id = Column(Integer, primary_key=True, index=True)
    badge_key = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    tier = Column(String(20), nullable=False)          # bronze | silver | gold | platinum | special
    category = Column(String(20), nullable=False)      # practice | streak | attendance | special
    icon_emoji = Column(String(20), nullable=True)
    icon_svg = Column(Text, nullable=True)

    # JSONB evaluation rule — interpreted by BadgeEvaluator.
    # Examples:
    #   {"type":"cumulative_correct_count","threshold":500}
    #   {"type":"streak_milestone","streak_days":7}
    #   {"type":"multi_tool_same_day","tools":["practice_paper","mental_math","burst_mode"],"min_tools":3}
    #   {"type":"manual_only"}
    evaluation_rule = Column(JSON, nullable=False)

    is_active = Column(Boolean, nullable=False, default=True)
    is_secret = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relationship to awards
    awards = relationship("StudentBadgeAward", back_populates="badge", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════════════════════════════════════
# STUDENT BADGE AWARDS
# ═══════════════════════════════════════════════════════════════════════════════

class StudentBadgeAward(Base):
    __tablename__ = "student_badge_awards"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    badge_id = Column(
        Integer,
        ForeignKey("badge_definitions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    awarded_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    awarded_by = Column(String(50), nullable=False, default="system")  # 'system' or 'admin:{id}'
    award_reason = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    revoke_reason = Column(Text, nullable=True)

    # Relationships
    badge = relationship("BadgeDefinition", back_populates="awards")
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (
        UniqueConstraint("student_id", "badge_id", name="uq_student_badge"),
        Index("idx_sba_student_active", "student_id"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MONTHLY LEADERBOARD SNAPSHOTS
# ═══════════════════════════════════════════════════════════════════════════════

class MonthlyLeaderboardSnapshot(Base):
    __tablename__ = "monthly_leaderboard_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_month = Column(Integer, nullable=False)
    snapshot_year = Column(Integer, nullable=False)
    student_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    branch = Column(String, nullable=True)          # from StudentProfile.branch
    monthly_points = Column(Integer, nullable=False)
    global_rank = Column(Integer, nullable=False)
    branch_rank = Column(Integer, nullable=True)
    snapshotted_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (
        UniqueConstraint("snapshot_month", "snapshot_year", "student_id", name="uq_snapshot_student"),
        Index("idx_snap_period", "snapshot_year", "snapshot_month"),
        Index("idx_snap_student", "student_id"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN AUDIT LOG
# ═══════════════════════════════════════════════════════════════════════════════

class RewardAuditLog(Base):
    __tablename__ = "reward_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    action = Column(String(100), nullable=False)
    target_student_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    target_entity_type = Column(String(50), nullable=True)
    target_entity_id = Column(Integer, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    reason = Column(Text, nullable=False)
    performed_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    admin = relationship("User", foreign_keys=[admin_id])
