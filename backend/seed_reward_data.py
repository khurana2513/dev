"""
Seed data for the Reward System.

Run once at startup (idempotent — skips existing rows).
Seeds:
  1. reward_rules   – fixed-value bonus rules
  2. badge_definitions – all badge templates
"""

import logging
from sqlalchemy.orm import Session
from reward_models import RewardRule, BadgeDefinition

logger = logging.getLogger(__name__)


# ─── Reward Rules seed data ──────────────────────────────────────────────────

REWARD_RULES_SEED = [
    {
        "rule_key": "daily_login",
        "source_tool": "system",
        "description": "First login of the day",
        "points_awarded": 10,
    },
    {
        "rule_key": "burst_mode_completed",
        "source_tool": "burst_mode",
        "description": "Completed any burst mode session",
        "points_awarded": 15,
    },
    {
        "rule_key": "streak_milestone_3",
        "source_tool": "system",
        "description": "3-day streak milestone bonus",
        "points_awarded": 30,
    },
    {
        "rule_key": "streak_milestone_7",
        "source_tool": "system",
        "description": "7-day streak milestone bonus",
        "points_awarded": 75,
    },
    {
        "rule_key": "streak_milestone_14",
        "source_tool": "system",
        "description": "14-day streak milestone bonus",
        "points_awarded": 175,
    },
    {
        "rule_key": "streak_milestone_30",
        "source_tool": "system",
        "description": "30-day streak milestone bonus",
        "points_awarded": 500,
    },
    {
        "rule_key": "streak_milestone_60",
        "source_tool": "system",
        "description": "60-day streak milestone bonus",
        "points_awarded": 1200,
    },
    {
        "rule_key": "streak_milestone_100",
        "source_tool": "system",
        "description": "100-day streak milestone bonus",
        "points_awarded": 2500,
    },
    # Leaderboard rank rewards (used by monthly snapshot job)
    {
        "rule_key": "monthly_rank_1",
        "source_tool": "system",
        "description": "Monthly leaderboard rank #1 bonus",
        "points_awarded": 500,
    },
    {
        "rule_key": "monthly_rank_2",
        "source_tool": "system",
        "description": "Monthly leaderboard rank #2 bonus",
        "points_awarded": 300,
    },
    {
        "rule_key": "monthly_rank_3",
        "source_tool": "system",
        "description": "Monthly leaderboard rank #3 bonus",
        "points_awarded": 200,
    },
]


# ─── Badge Definitions seed data ─────────────────────────────────────────────

BADGE_DEFINITIONS_SEED = [
    # ── Practice & Accuracy ─────────────────────────────────────────────────
    {
        "badge_key": "century_club",
        "name": "Century Club",
        "description": "Answer 500 questions correctly across all tools",
        "tier": "bronze",
        "category": "practice",
        "icon_emoji": "💯",
        "evaluation_rule": {"type": "cumulative_correct_count", "threshold": 500},
        "display_order": 1,
    },
    {
        "badge_key": "sharp_mind",
        "name": "Sharp Mind",
        "description": "Answer 1,000 questions correctly across all tools",
        "tier": "silver",
        "category": "practice",
        "icon_emoji": "🧠",
        "evaluation_rule": {"type": "cumulative_correct_count", "threshold": 1000},
        "display_order": 2,
    },
    {
        "badge_key": "thousand_strong",
        "name": "Thousand Strong",
        "description": "Answer 3,000 questions correctly across all tools",
        "tier": "gold",
        "category": "practice",
        "icon_emoji": "⚔️",
        "evaluation_rule": {"type": "cumulative_correct_count", "threshold": 3000},
        "display_order": 3,
    },
    {
        "badge_key": "ten_thousand",
        "name": "Ten Thousand",
        "description": "Answer 5,000 questions correctly across all tools",
        "tier": "platinum",
        "category": "practice",
        "icon_emoji": "🏔️",
        "evaluation_rule": {"type": "cumulative_correct_count", "threshold": 5000},
        "display_order": 4,
    },

    # ── Streak ──────────────────────────────────────────────────────────────
    {
        "badge_key": "warming_up",
        "name": "Warming Up",
        "description": "Reach a 3-day practice streak",
        "tier": "bronze",
        "category": "streak",
        "icon_emoji": "🔥",
        "evaluation_rule": {"type": "streak_milestone", "threshold": 3},
        "display_order": 10,
    },
    {
        "badge_key": "on_fire",
        "name": "On Fire",
        "description": "Reach a 7-day practice streak",
        "tier": "silver",
        "category": "streak",
        "icon_emoji": "🔥",
        "evaluation_rule": {"type": "streak_milestone", "threshold": 7},
        "display_order": 11,
    },
    {
        "badge_key": "unstoppable",
        "name": "Unstoppable",
        "description": "Reach a 14-day practice streak",
        "tier": "gold",
        "category": "streak",
        "icon_emoji": "⚡",
        "evaluation_rule": {"type": "streak_milestone", "threshold": 14},
        "display_order": 12,
    },
    {
        "badge_key": "legend",
        "name": "Legend",
        "description": "Reach a 30-day practice streak",
        "tier": "platinum",
        "category": "streak",
        "icon_emoji": "👑",
        "evaluation_rule": {"type": "streak_milestone", "threshold": 30},
        "display_order": 13,
    },
    {
        "badge_key": "mythic",
        "name": "Mythic",
        "description": "Reach a 60-day practice streak",
        "tier": "platinum",
        "category": "streak",
        "icon_emoji": "🌟",
        "evaluation_rule": {"type": "streak_milestone", "threshold": 60},
        "display_order": 14,
    },
    {
        "badge_key": "eternal",
        "name": "Eternal",
        "description": "Reach a 100-day practice streak",
        "tier": "special",
        "category": "streak",
        "icon_emoji": "🏆",
        "evaluation_rule": {"type": "streak_milestone", "threshold": 100},
        "display_order": 15,
    },

    # ── Attendance (manual_only — triggered by attendance system) ───────────
    {
        "badge_key": "always_there",
        "name": "Always There",
        "description": "100% attendance in a single month",
        "tier": "silver",
        "category": "attendance",
        "icon_emoji": "📅",
        "evaluation_rule": {"type": "manual_only"},
        "display_order": 20,
    },
    {
        "badge_key": "dedicated",
        "name": "Dedicated",
        "description": "100% attendance for 3 consecutive months",
        "tier": "gold",
        "category": "attendance",
        "icon_emoji": "🏅",
        "evaluation_rule": {"type": "manual_only"},
        "display_order": 21,
    },
    {
        "badge_key": "tshirt_loyalist",
        "name": "T-Shirt Loyalist",
        "description": "Wore t-shirt every present day in a month",
        "tier": "bronze",
        "category": "attendance",
        "icon_emoji": "👕",
        "evaluation_rule": {"type": "manual_only"},
        "display_order": 22,
    },
    {
        "badge_key": "brand_ambassador",
        "name": "Brand Ambassador",
        "description": "T-shirt every present day for 3 months straight",
        "tier": "gold",
        "category": "attendance",
        "icon_emoji": "🌟",
        "evaluation_rule": {"type": "manual_only"},
        "display_order": 23,
    },

    # ── Special ─────────────────────────────────────────────────────────────
    {
        "badge_key": "all_rounder",
        "name": "All-Rounder",
        "description": "Use all 3 tools (Practice Paper + Mental Math + Burst Mode) in a single day",
        "tier": "special",
        "category": "special",
        "icon_emoji": "🎪",
        "evaluation_rule": {
            "type": "multi_tool_same_day",
            "tools": ["practice_paper", "mental_math", "burst_mode"],
            "threshold": 3,
        },
        "display_order": 30,
    },
]


def seed_reward_rules(db: Session) -> int:
    """Insert reward rules if they don't already exist.  Returns count of newly inserted."""
    inserted = 0
    for rule_data in REWARD_RULES_SEED:
        exists = db.query(RewardRule).filter(
            RewardRule.rule_key == rule_data["rule_key"]
        ).first()
        if not exists:
            db.add(RewardRule(**rule_data))
            inserted += 1
    if inserted:
        db.commit()
    logger.info("[SEED] reward_rules: %d new, %d already existed", inserted, len(REWARD_RULES_SEED) - inserted)
    return inserted


def seed_badge_definitions(db: Session) -> int:
    """Insert badge definitions if they don't already exist.  Returns count of newly inserted."""
    inserted = 0
    for badge_data in BADGE_DEFINITIONS_SEED:
        exists = db.query(BadgeDefinition).filter(
            BadgeDefinition.badge_key == badge_data["badge_key"]
        ).first()
        if not exists:
            db.add(BadgeDefinition(**badge_data))
            inserted += 1
    if inserted:
        db.commit()
    logger.info("[SEED] badge_definitions: %d new, %d already existed", inserted, len(BADGE_DEFINITIONS_SEED) - inserted)
    return inserted


def seed_all_reward_data(db: Session) -> None:
    """Master seeder — idempotent."""
    seed_reward_rules(db)
    seed_badge_definitions(db)
    logger.info("[SEED] Reward system seed complete")
