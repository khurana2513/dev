"""
Point Rule Engine — single source of truth for resolving point values.

All tools (Practice Paper, Mental Math, Burst Mode) call this engine.
Point values are read from the `point_rules` table — never hardcoded.
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, Tuple, List
from models import Base, Column, Integer, String, Boolean, DateTime, Index, get_db
from datetime import datetime
from timezone_utils import get_utc_now


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class PointRule(Base):
    """Point rule configuration — one row per (tool, operation, mode, preset_key) combo."""
    __tablename__ = "point_rules"

    id = Column(Integer, primary_key=True, index=True)

    # Which tool: 'practice_paper', 'mental_math', 'burst_mode'
    tool = Column(String, nullable=False, index=True)

    # Operation: 'add_sub', 'multiply', 'divide', 'tables', etc.
    operation = Column(String, nullable=False, index=True)

    # 'preset' or 'custom'
    mode = Column(String, nullable=False, default="preset")

    # Human-readable preset identifier, e.g. '2x1', '3d2', 'rows_3_5', 'all'
    # NULL means this rule applies to ALL configs of this operation+tool
    preset_key = Column(String(50), nullable=True)

    # Points awarded for a correct answer under this rule
    points_correct = Column(Integer, nullable=False, default=0)

    # Whether this rule is currently active
    is_active = Column(Boolean, nullable=False, default=True)

    # Display label shown in UI (e.g. '2 × 1', '3–5 Rows', '4 Digits')
    display_label = Column(String(100), nullable=True)

    # Tier label for UI grouping ('+3', '+5', '+8', 'no_points')
    tier = Column(String(20), nullable=True)

    # Display order within operation group
    display_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    __table_args__ = (
        Index("uq_point_rule", "tool", "operation", "mode", "preset_key", unique=True),
    )


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class PointRuleEngine:
    """
    Single source of truth for resolving point values.
    All tools call this engine — never hardcode points elsewhere.

    Resolution order:
    1. config_mode == 'custom'   → always 0 points
    2. tool == 'practice_paper'  → lookup with preset_key='all'
    3. operation in (add_sub, integer_add_sub, decimal_add_sub,
       direct_add_sub, small_friends_add_sub, big_friends_add_sub) → row-tier
    4. Otherwise → exact preset_key lookup
    """

    # Operations that use row-based tier resolution
    ROW_BASED_OPS = frozenset([
        "add_sub", "integer_add_sub", "decimal_add_sub",
        "direct_add_sub", "small_friends_add_sub", "big_friends_add_sub",
    ])

    def resolve_points(
        self,
        db: Session,
        tool: str,
        operation: str,
        config_mode: str,
        preset_key: Optional[str] = None,
        row_count: Optional[int] = None,
    ) -> Tuple[int, Optional[int]]:
        """
        Returns (points_awarded, point_rule_id).

        Parameters
        ----------
        tool        : 'practice_paper', 'mental_math', or 'burst_mode'
        operation   : e.g. 'multiply', 'add_sub', 'vedic_multiply_by_11', ...
        config_mode : 'preset' or 'custom'
        preset_key  : e.g. '2x1', '3d2', '4d' — None for row-based or practice paper
        row_count   : number of rows (only for add_sub / integer_add_sub)
        """
        # Step 1: Custom config → always 0 points
        if config_mode == "custom":
            rule = self._get_rule(db, tool, operation, "custom", None)
            return (0, rule.id if rule else None)

        # Step 2: Practice paper → flat rule (all operations get same points)
        if tool == "practice_paper":
            # Try exact operation match first (e.g. for vedic), fall back to 'all'
            rule = self._get_rule(db, "practice_paper", operation, "preset", "all")
            if not rule:
                # Try the generic catch-all for any operation not explicitly listed
                rule = self._get_rule(db, "practice_paper", "tables", "preset", "all")
            if rule:
                return (rule.points_correct, rule.id)
            # Hardcoded fallback: practice paper = +3 (safety net)
            return (3, None)

        # Step 3: Row-based operations (add_sub, integer_add_sub, etc.)
        if operation in self.ROW_BASED_OPS:
            if row_count is None:
                # If no row_count provided, can't determine tier — 0 points
                return (0, None)
            tier_key = self._resolve_row_tier(row_count)
            # Map operation variants to their base for rule lookup
            lookup_op = operation
            if operation in ("direct_add_sub", "small_friends_add_sub", "big_friends_add_sub", "decimal_add_sub"):
                lookup_op = "add_sub"
            rule = self._get_rule(db, tool, lookup_op, "preset", tier_key)
            if rule:
                return (rule.points_correct, rule.id)
            return (0, None)

        # Step 4: Preset-based operations
        if preset_key is None:
            return (0, None)
        rule = self._get_rule(db, tool, operation, "preset", preset_key)
        if rule:
            return (rule.points_correct, rule.id)
        return (0, None)

    def _resolve_row_tier(self, row_count: int) -> str:
        """
        Maps a row count to its tier preset_key.
          rows < 3   → 'rows_3_5' (minimum, still awards low tier)
          rows 3–5   → 'rows_3_5'   → +3 points
          rows 6–9   → 'rows_6_9'   → +5 points
          rows >= 10 → 'rows_10_up' → +8 points
        """
        if row_count <= 5:
            return "rows_3_5"
        if row_count <= 9:
            return "rows_6_9"
        return "rows_10_up"

    def _get_rule(
        self,
        db: Session,
        tool: str,
        operation: str,
        mode: str,
        preset_key: Optional[str],
    ) -> Optional[PointRule]:
        """Fetch a single active rule matching the given criteria."""
        q = db.query(PointRule).filter(
            PointRule.tool == tool,
            PointRule.operation == operation,
            PointRule.mode == mode,
            PointRule.is_active == True,
        )
        if preset_key is None:
            q = q.filter(PointRule.preset_key.is_(None))
        else:
            q = q.filter(PointRule.preset_key == preset_key)
        return q.first()

    def get_rules_for_tool(
        self,
        db: Session,
        tool: str,
        operation: Optional[str] = None,
    ) -> List[PointRule]:
        """Fetch all active rules for a tool (optionally filtered by operation)."""
        q = db.query(PointRule).filter(
            PointRule.tool == tool,
            PointRule.is_active == True,
        )
        if operation:
            q = q.filter(PointRule.operation == operation)
        return q.order_by(PointRule.operation, PointRule.display_order).all()


# Singleton instance
point_rule_engine = PointRuleEngine()


# ---------------------------------------------------------------------------
# Normalisation helpers — map frontend field names to engine values
# ---------------------------------------------------------------------------

# Frontend operation_type → engine operation
_OP_MAP = {
    # Mental Math names
    "multiplication": "multiply",
    "division": "divide",
    "decimal_multiplication": "decimal_multiply",
    "decimal_division": "decimal_divide",
    # Burst Mode names (strip burst_ prefix via code, these are the base names)
    "multiply": "multiply",
    "divide": "divide",
    "decimal_multiply": "decimal_multiply",
    "decimal_divide": "decimal_divide",
    # Already correct names
    "add_sub": "add_sub",
    "integer_add_sub": "integer_add_sub",
    "lcm": "lcm",
    "gcd": "gcd",
    "square_root": "square_root",
    "cube_root": "cube_root",
    "percentage": "percentage",
    "tables": "tables",
}


def normalize_operation(raw_operation: str) -> str:
    """
    Convert frontend operation_type to engine operation name.
    Strips `burst_` prefix automatically if present.
    """
    op = raw_operation
    if op.startswith("burst_"):
        op = op[6:]  # strip "burst_"
    return _OP_MAP.get(op, op)


def determine_tool(difficulty_mode: str) -> str:
    """Determine the 'tool' from the difficulty_mode field."""
    if difficulty_mode == "burst_mode":
        return "burst_mode"
    return "mental_math"


def determine_config_mode(difficulty_mode: str) -> str:
    """Determine 'preset' or 'custom' from the difficulty_mode field."""
    if difficulty_mode == "custom":
        return "custom"
    return "preset"


def normalize_burst_preset_key(raw_key: str, operation: str) -> str:
    """
    Convert BurstMode selectedOption values to engine preset_key format.
    
    Examples:
      multiply  "2x1"  → "2x1"  (already correct)
      divide    "3/1"  → "3d1"
      lcm       "2,1"  → "2_1"
      sqrt      "4"    → "4d"
      percentage "5"   → "5d"
      tables    "1x1"  → "1x1"
    """
    if not raw_key:
        return raw_key

    # Division uses "/" in frontend, "d" in rules
    if "/" in raw_key:
        return raw_key.replace("/", "d")

    # LCM/GCD uses "," in frontend, "_" in rules
    if "," in raw_key:
        return raw_key.replace(",", "_")

    # Square root, cube root, percentage use bare digits → append "d"
    if operation in ("square_root", "cube_root", "percentage") and raw_key.isdigit():
        return f"{raw_key}d"

    return raw_key


def derive_preset_key_from_digits(operation: str, **kwargs) -> str:
    """
    Build a preset_key from the digit configuration sent by Mental Math.

    kwargs may include:
      multiplicand_digits, multiplier_digits   → "2x1"
      dividend_digits, divisor_digits          → "3d2"
      first_digits, second_digits (lcm/gcd)    → "2_1"
      root_digits (sqrt/cbrt/pct)              → "4d"
    """
    if operation in ("multiply", "decimal_multiply"):
        a = kwargs.get("multiplicand_digits", 0)
        b = kwargs.get("multiplier_digits", 0)
        return f"{a}x{b}" if a and b else ""

    if operation in ("divide", "decimal_divide"):
        a = kwargs.get("dividend_digits", 0)
        b = kwargs.get("divisor_digits", 0)
        return f"{a}d{b}" if a and b else ""

    if operation in ("lcm", "gcd"):
        a = kwargs.get("first_digits", 0)
        b = kwargs.get("second_digits", 0)
        return f"{a}_{b}" if a and b else ""

    if operation in ("square_root", "cube_root", "percentage"):
        d = kwargs.get("root_digits", 0) or kwargs.get("number_digits", 0)
        return f"{d}d" if d else ""

    if operation == "tables":
        return "1x1"

    # add_sub / integer_add_sub — handled via row_count, no preset_key needed
    return ""
