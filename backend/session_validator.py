"""
Session Validator — enforces minimum-attempt thresholds before awarding points.

Rules:
  - Practice Paper:  minimum 15 questions answered to earn points
  - Mental Math:     minimum 10 questions answered to earn points
  - Burst Mode:      no minimum (time-gated by 60s timer)
  - Add/Sub family:  minimum 3 rows to earn points
"""
from typing import Tuple


class SessionValidator:
    """Validates whether a session meets the requirements for earning points."""

    PAPER_MIN_QUESTIONS = 15
    MENTAL_MIN_QUESTIONS = 10
    ADD_SUB_MIN_ROWS = 3

    ADD_SUB_FAMILY = frozenset([
        "add_sub", "integer_add_sub", "decimal_add_sub",
        "direct_add_sub", "small_friends_add_sub", "big_friends_add_sub",
        "intl_add_sub",
    ])

    def validate_practice_paper(
        self,
        total_questions: int,
        attempted_questions: int,
    ) -> Tuple[bool, str]:
        """
        Returns (is_valid, reason).
        Practice papers must have ≥15 total questions.
        """
        if total_questions < self.PAPER_MIN_QUESTIONS:
            return (
                False,
                f"Paper must have at least {self.PAPER_MIN_QUESTIONS} questions "
                f"(has {total_questions})"
            )
        return (True, "")

    def validate_mental_math(
        self,
        operation: str,
        attempted_questions: int,
        row_count: int | None = None,
    ) -> Tuple[bool, str]:
        """
        Returns (is_valid, reason).
        Mental math needs ≥10 attempted questions.
        Add/Sub family also needs ≥3 rows.
        """
        if attempted_questions < self.MENTAL_MIN_QUESTIONS:
            return (
                False,
                f"Need at least {self.MENTAL_MIN_QUESTIONS} questions "
                f"(attempted {attempted_questions})"
            )
        # Additional row check for add_sub family
        if operation in self.ADD_SUB_FAMILY and row_count is not None:
            if row_count < self.ADD_SUB_MIN_ROWS:
                return (
                    False,
                    f"Add/Sub needs at least {self.ADD_SUB_MIN_ROWS} rows "
                    f"(has {row_count})"
                )
        return (True, "")

    def validate_burst_mode(
        self,
        attempted_questions: int,
    ) -> Tuple[bool, str]:
        """
        Burst mode has no minimum — always valid.
        The 60-second timer is the natural gate.
        """
        return (True, "")


# Singleton
session_validator = SessionValidator()
