"""
Seed the point_rules table with all point values.

Run once after creating the table:
    python3 seed_point_rules.py

Idempotent: uses INSERT ... ON CONFLICT DO UPDATE so it can be re-run safely.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import SessionLocal, Base, engine
from point_rule_engine import PointRule


# ---------------------------------------------------------------------------
# Helper to build rule dicts
# ---------------------------------------------------------------------------

def R(tool, operation, mode, preset_key, pts, label, tier, order):
    return dict(
        tool=tool,
        operation=operation,
        mode=mode,
        preset_key=preset_key,
        points_correct=pts,
        display_label=label,
        tier=tier,
        display_order=order,
        is_active=True,
    )


def _mm_and_burst(op, preset_key, pts, label, tier, order):
    """Shortcut: same rule for both mental_math and burst_mode."""
    return [
        R("mental_math", op, "preset", preset_key, pts, label, tier, order),
        R("burst_mode",  op, "preset", preset_key, pts, label, tier, order),
    ]


# ---------------------------------------------------------------------------
# All seed rules
# ---------------------------------------------------------------------------

RULES = []

# ================================================================
# PRACTICE PAPER — flat +3 for every operation type
# ================================================================
_paper_ops = [
    "add_sub", "integer_add_sub", "multiply", "divide",
    "decimal_multiply", "decimal_divide", "lcm", "gcd",
    "square_root", "cube_root", "percentage", "tables",
    # Vedic operations — all get +3 in practice paper
    "vedic_multiply_by_11", "vedic_multiply_by_101",
    "vedic_multiply_by_12_19", "vedic_multiply_by_21_91",
    "vedic_multiply_by_2", "vedic_multiply_by_4", "vedic_multiply_by_6",
    "vedic_multiply_by_1001", "vedic_multiply_by_5_25_125",
    "vedic_multiply_by_5_50_500",
    "vedic_divide_by_2", "vedic_divide_by_4",
    "vedic_divide_single_digit", "vedic_divide_by_11",
    "vedic_divide_by_5_25_125", "vedic_divide_by_5_50_500",
    "vedic_divide_with_remainder", "vedic_divide_by_7",
    "vedic_divide_by_9s_repetition_equal",
    "vedic_divide_by_9s_repetition_less_than",
    "vedic_divide_by_11s_repetition_equal",
    "vedic_divide_by_11s_repetition_less_than",
    "vedic_subtraction_complement", "vedic_subtraction_powers_of_10",
    "vedic_special_products_base_100", "vedic_special_products_base_50",
    "vedic_special_products_base_1000",
    "vedic_special_products_cross_multiply",
    "vedic_special_products_cross_base",
    "vedic_special_products_cross_base_50",
    "vedic_addition",
    "vedic_squares_base_10", "vedic_squares_base_100", "vedic_squares_base_1000",
    "vedic_squares_duplex", "vedic_duplex",
    "vedic_tables", "vedic_tables_large",
    "vedic_dropping_10_method",
    "vedic_fun_with_9_equal", "vedic_fun_with_9_less_than",
    "vedic_fun_with_9_greater_than",
    "vedic_fun_with_5", "vedic_fun_with_10",
    # Abacus add/sub variants
    "direct_add_sub", "small_friends_add_sub",
    "big_friends_add_sub", "decimal_add_sub",
    # Decimal variants (practice paper uses different naming)
    "decimal_multiplication", "decimal_division",
    "multiplication", "division",
]
for op in _paper_ops:
    RULES.append(R("practice_paper", op, "preset", "all", 3, "All configs", "+3", 1))


# ================================================================
# TABLES (Mental Math + Burst Mode) — 0 points
# ================================================================
RULES += _mm_and_burst("tables", "1x1", 0, "1 × 1", "no_points", 1)


# ================================================================
# MULTIPLY (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("multiply", "2x1", 3, "2 × 1", "+3", 1)
RULES += _mm_and_burst("multiply", "3x1", 3, "3 × 1", "+3", 2)
RULES += _mm_and_burst("multiply", "4x1", 5, "4 × 1", "+5", 3)
RULES += _mm_and_burst("multiply", "2x2", 5, "2 × 2", "+5", 4)
RULES += _mm_and_burst("multiply", "3x2", 8, "3 × 2", "+8", 5)
RULES += _mm_and_burst("multiply", "4x2", 8, "4 × 2", "+8", 6)


# ================================================================
# DIVIDE (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("divide", "2d1", 3, "2 ÷ 1", "+3", 1)
RULES += _mm_and_burst("divide", "3d1", 3, "3 ÷ 1", "+3", 2)
RULES += _mm_and_burst("divide", "4d1", 5, "4 ÷ 1", "+5", 3)
RULES += _mm_and_burst("divide", "3d2", 5, "3 ÷ 2", "+5", 4)
RULES += _mm_and_burst("divide", "4d2", 8, "4 ÷ 2", "+8", 5)
RULES += _mm_and_burst("divide", "4d3", 8, "4 ÷ 3", "+8", 6)


# ================================================================
# DECIMAL MULTIPLY (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("decimal_multiply", "1x0", 3, "1 × 0", "+3", 1)
RULES += _mm_and_burst("decimal_multiply", "1x1", 3, "1 × 1", "+3", 2)
RULES += _mm_and_burst("decimal_multiply", "2x1", 5, "2 × 1", "+5", 3)
RULES += _mm_and_burst("decimal_multiply", "3x1", 5, "3 × 1", "+5", 4)
RULES += _mm_and_burst("decimal_multiply", "2x2", 8, "2 × 2", "+8", 5)
RULES += _mm_and_burst("decimal_multiply", "3x2", 8, "3 × 2", "+8", 6)


# ================================================================
# DECIMAL DIVIDE (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("decimal_divide", "2d1", 3, "2 ÷ 1", "+3", 1)
RULES += _mm_and_burst("decimal_divide", "3d1", 3, "3 ÷ 1", "+3", 2)
RULES += _mm_and_burst("decimal_divide", "4d1", 5, "4 ÷ 1", "+5", 3)
RULES += _mm_and_burst("decimal_divide", "3d2", 5, "3 ÷ 2", "+5", 4)
RULES += _mm_and_burst("decimal_divide", "4d2", 8, "4 ÷ 2", "+8", 5)
RULES += _mm_and_burst("decimal_divide", "4d3", 8, "4 ÷ 3", "+8", 6)


# ================================================================
# LCM (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("lcm", "1_1", 3, "(1, 1)", "+3", 1)
RULES += _mm_and_burst("lcm", "2_1", 3, "(2, 1)", "+3", 2)
RULES += _mm_and_burst("lcm", "2_2", 5, "(2, 2)", "+5", 3)
RULES += _mm_and_burst("lcm", "3_2", 5, "(3, 2)", "+5", 4)


# ================================================================
# GCD (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("gcd", "1_1", 3, "(1, 1)", "+3", 1)
RULES += _mm_and_burst("gcd", "2_1", 3, "(2, 1)", "+3", 2)
RULES += _mm_and_burst("gcd", "2_2", 5, "(2, 2)", "+5", 3)
RULES += _mm_and_burst("gcd", "3_2", 5, "(3, 2)", "+5", 4)


# ================================================================
# SQUARE ROOT (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("square_root", "2d", 3, "2 Digits", "+3", 1)
RULES += _mm_and_burst("square_root", "3d", 3, "3 Digits", "+3", 2)
RULES += _mm_and_burst("square_root", "4d", 5, "4 Digits", "+5", 3)
RULES += _mm_and_burst("square_root", "5d", 5, "5 Digits", "+5", 4)
RULES += _mm_and_burst("square_root", "6d", 8, "6 Digits", "+8", 5)
RULES += _mm_and_burst("square_root", "7d", 8, "7 Digits", "+8", 6)
RULES += _mm_and_burst("square_root", "8d", 8, "8 Digits", "+8", 7)


# ================================================================
# CUBE ROOT (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("cube_root", "3d", 3, "3 Digits", "+3", 1)
RULES += _mm_and_burst("cube_root", "4d", 3, "4 Digits", "+3", 2)
RULES += _mm_and_burst("cube_root", "5d", 5, "5 Digits", "+5", 3)
RULES += _mm_and_burst("cube_root", "6d", 5, "6 Digits", "+5", 4)
RULES += _mm_and_burst("cube_root", "7d", 8, "7 Digits", "+8", 5)
RULES += _mm_and_burst("cube_root", "8d", 8, "8 Digits", "+8", 6)


# ================================================================
# PERCENTAGE (Mental Math + Burst Mode)
# ================================================================
RULES += _mm_and_burst("percentage", "2d", 3, "2-Digit Number", "+3", 1)
RULES += _mm_and_burst("percentage", "3d", 3, "3-Digit Number", "+3", 2)
RULES += _mm_and_burst("percentage", "4d", 5, "4-Digit Number", "+5", 3)
RULES += _mm_and_burst("percentage", "5d", 5, "5-Digit Number", "+5", 4)
RULES += _mm_and_burst("percentage", "6d", 8, "6-Digit Number", "+8", 5)
RULES += _mm_and_burst("percentage", "7d", 8, "7-Digit Number", "+8", 6)


# ================================================================
# ADD/SUB — Mental Math only (row-based tiers)
# ================================================================
RULES.append(R("mental_math", "add_sub", "preset", "rows_3_5",  3, "3–5 Rows",  "+3", 1))
RULES.append(R("mental_math", "add_sub", "preset", "rows_6_9",  5, "6–9 Rows",  "+5", 2))
RULES.append(R("mental_math", "add_sub", "preset", "rows_10_up", 8, "10+ Rows", "+8", 3))


# ================================================================
# INTEGER ADD/SUB — Mental Math only (same tiers)
# ================================================================
RULES.append(R("mental_math", "integer_add_sub", "preset", "rows_3_5",  3, "3–5 Rows",  "+3", 1))
RULES.append(R("mental_math", "integer_add_sub", "preset", "rows_6_9",  5, "6–9 Rows",  "+5", 2))
RULES.append(R("mental_math", "integer_add_sub", "preset", "rows_10_up", 8, "10+ Rows", "+8", 3))


# ================================================================
# INTL ADD/SUB — Mental Math only (same tiers as add_sub)
# ================================================================
RULES.append(R("mental_math", "intl_add_sub", "preset", "rows_3_5",  3, "3–5 Rows",  "+3", 1))
RULES.append(R("mental_math", "intl_add_sub", "preset", "rows_6_9",  5, "6–9 Rows",  "+5", 2))
RULES.append(R("mental_math", "intl_add_sub", "preset", "rows_10_up", 8, "10+ Rows", "+8", 3))


# ================================================================
# CUSTOM CONFIG MODE — 0 points always
# ================================================================
_custom_ops = [
    "add_sub", "integer_add_sub", "multiply", "divide",
    "decimal_multiply", "decimal_divide", "lcm", "gcd",
    "square_root", "cube_root", "percentage", "tables",
]
for op in _custom_ops:
    RULES.append(R("mental_math", op, "custom", None, 0, "Custom Config", "no_points", 1))


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed():
    """Insert all rules into the database (upsert on conflict)."""
    # Create table if needed
    PointRule.__table__.create(bind=engine, checkfirst=True)

    db = SessionLocal()
    try:
        inserted = 0
        updated = 0
        for r in RULES:
            existing = db.query(PointRule).filter(
                PointRule.tool == r["tool"],
                PointRule.operation == r["operation"],
                PointRule.mode == r["mode"],
                (PointRule.preset_key == r["preset_key"]) if r["preset_key"] is not None
                else PointRule.preset_key.is_(None),
            ).first()

            if existing:
                existing.points_correct = r["points_correct"]
                existing.display_label = r["display_label"]
                existing.tier = r["tier"]
                existing.display_order = r["display_order"]
                existing.is_active = r["is_active"]
                updated += 1
            else:
                db.add(PointRule(**r))
                inserted += 1

        db.commit()
        print(f"✅ [SEED] point_rules: {inserted} inserted, {updated} updated, {len(RULES)} total rules")
    except Exception as e:
        db.rollback()
        print(f"❌ [SEED] Failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
