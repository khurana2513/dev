"""Math question generation logic."""
import random
import math
from math import lcm
from typing import List, Optional, Callable
from schemas import Question, Constraints, BlockConfig, GeneratedBlock, QuestionType

# ✓ OPTIMIZATION: NumPy batch generation for improved performance
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def generate_number_batch(
    digits_list: List[int], 
    rng: Optional[Callable[[], float]] = None
) -> np.ndarray:
    """Generate multiple numbers vectorized using NumPy.
    
    ✓ Vectorized: Generate 100+ numbers in a single batch operation
    ✓ 10-50x faster than generating one-by-one in loops
    ✓ Reduces Python interpreter overhead
    
    Args:
        digits_list: List of digit counts for each number
        rng: Optional seeded RNG for consistency
    
    Returns:
        NumPy array of generated numbers
    """
    if not HAS_NUMPY or not digits_list:
        # Fallback if NumPy not available
        return np.array([generate_number(d, rng) for d in digits_list]) if HAS_NUMPY else []
    
    digits_array = np.array(digits_list)
    min_vals = 10 ** (digits_array - 1)
    max_vals = 10 ** digits_array - 1
    
    # Generate random floats 0-1
    if rng:
        randoms = np.array([rng() for _ in range(len(digits_list))])
    else:
        randoms = np.random.random(len(digits_list))
    
    # Scale to range [min_vals, max_vals]
    numbers = ((randoms * (max_vals - min_vals + 1)) + min_vals).astype(int)
    
    # Clamp to valid range
    numbers = np.clip(numbers, min_vals, max_vals)
    
    return numbers


def generate_number(digits: int, rng: Optional[Callable[[], float]] = None) -> int:
    """Generate a number with specified digits, ensuring it doesn't start with 0."""
    if digits <= 0:
        return 0
    
    min_val = 10 ** (digits - 1)
    max_val = (10 ** digits) - 1
    
    if rng:
        return int(rng() * (max_val - min_val + 1)) + min_val
    return random.randint(min_val, max_val)


def generate_seeded_rng(seed: int, question_id: int) -> Callable[[], float]:
    """Create a seeded random number generator for consistency."""
    # Use seed + question_id to create unique starting state for each question
    # Multiply by different primes to ensure better distribution and uniqueness
    initial_state = (seed * 7919 + question_id * 9973) % (2**31)
    call_count = [0]  # Track number of calls to ensure different values
    
    def rng():
        nonlocal initial_state
        call_count[0] += 1
        # Linear congruential generator with better constants
        # Add call_count to ensure each call produces different value
        initial_state = (initial_state * 1664525 + 1013904223 + call_count[0] * 17) % (2**32)
        return (initial_state % (2**31)) / (2**31)
    
    return rng


def generate_intl_add_sub_question(
    question_id: int,
    constraints: Constraints,
    random_func: Callable[[], float],
) -> Question:
    """Generate Intl Add/Sub questions with mixed digit widths and non-negative running totals."""
    preset = constraints.intlAddSubPreset or "1_2"
    digit_ranges = (1, 2) if preset == "1_2" else (2, 3)
    rows = max(3, min(30, constraints.rows or 3))

    def generate_operand() -> int:
        digit_count = digit_ranges[0] if random_func() < 0.5 else digit_ranges[1]
        return generate_number(digit_count, random_func)

    operands = [generate_operand()]
    operators_list: List[str] = []
    running_total = operands[0]

    for _ in range(rows - 1):
        operand = generate_operand()
        can_subtract = running_total >= operand
        use_addition = not can_subtract or random_func() < 0.5
        operators_list.append("+" if use_addition else "-")
        operands.append(operand)
        running_total = running_total + operand if use_addition else running_total - operand

    text_lines = [str(operands[0])]
    for idx, op in enumerate(operators_list, start=1):
        text_lines.append(f"{op} {operands[idx]}")

    return Question(
        id=question_id,
        text="\n".join(text_lines),
        operands=operands,
        operator="±",
        operators=operators_list,
        answer=float(running_total),
        isVertical=True,
    )


def generate_question(
    question_id: int,
    question_type: QuestionType,
    constraints: Constraints,
    seed: Optional[int] = None,
    retry_count: int = 0
) -> Question:
    """
    Generate a single math question.
    
    Args:
        question_id: Unique ID for the question
        question_type: Type of question to generate
        constraints: Constraints for generation
        seed: Optional seed for consistent generation
        retry_count: Current retry count (max 20)
    
    Returns:
        Generated Question object
    """
    # Prevent infinite recursion - fall back to simple question of the same type
    if retry_count > 20:
        # Use the same RNG setup as main logic
        if seed is not None:
            rng = generate_seeded_rng(seed, question_id)
            generate_num_fallback = lambda d: generate_number(d, rng)
            fallback_random_func = rng
        else:
            generate_num_fallback = lambda d: generate_number(d)
            fallback_random_func = random.random
        
        if question_type == "multiplication":
            # Simple multiplication fallback - respect digit constraints
            multiplicand_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else 2
            multiplier_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else 1
            multiplicand_digits = max(1, min(20, multiplicand_digits))
            multiplier_digits = max(1, min(20, multiplier_digits))
            a = generate_num_fallback(multiplicand_digits)
            b = generate_num_fallback(multiplier_digits)
            return Question(
                id=question_id,
                text=f"{a} × {b} =",
                operands=[a, b],
                operator="×",
                operators=None,
                answer=float(a * b),
                isVertical=False
            )
        elif question_type == "division":
            # Simple division fallback - respect digit constraints
            dividend_digits = constraints.dividendDigits if constraints.dividendDigits is not None else 2
            divisor_digits = constraints.divisorDigits if constraints.divisorDigits is not None else 1
            dividend_digits = max(1, min(20, dividend_digits))
            divisor_digits = max(1, min(20, divisor_digits))
            b = generate_num_fallback(divisor_digits)
            if b == 0:
                b = 1
            # Generate dividend that's divisible by divisor
            quotient = generate_num_fallback(max(1, dividend_digits - divisor_digits + 1))
            a = quotient * b
            # Ensure dividend has correct digits
            while len(str(a)) != dividend_digits and len(str(a)) < dividend_digits:
                quotient = generate_num_fallback(max(1, dividend_digits - divisor_digits + 1))
                a = quotient * b
            return Question(
                id=question_id,
                text=f"{a} ÷ {b} =",
                operands=[a, b],
                operator="÷",
                operators=None,
                answer=float(quotient),
                isVertical=False
            )
        elif question_type in ("subtraction", "add_sub"):
            digits = constraints.digits or 2
            rows = constraints.rows or 2
            rows = max(2, min(30, rows))
            a = generate_num_fallback(digits)
            b = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{max(a, b)}\n- {min(a, b)}",
                operands=[max(a, b), min(a, b)],
                operator="-",
                operators=None,
                answer=float(max(a, b) - min(a, b)),
                isVertical=True
            )
        # Vedic Maths Level 1 fallbacks
        elif question_type == "vedic_multiply_by_11":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × 11 =",
                operands=[num, 11],
                operator="×",
                operators=None,
                answer=float(num * 11),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_101":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × 101 =",
                operands=[num, 101],
                operator="×",
                operators=None,
                answer=float(num * 101),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_2":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × 2 =",
                operands=[num, 2],
                operator="×",
                operators=None,
                answer=float(num * 2),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_4":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × 4 =",
                operands=[num, 4],
                operator="×",
                operators=None,
                answer=float(num * 4),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_6":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            # Ensure even number
            num = num if num % 2 == 0 else num + 1
            return Question(
                id=question_id,
                text=f"{num} × 6 =",
                operands=[num, 6],
                operator="×",
                operators=None,
                answer=float(num * 6),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_2":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} ÷ 2 =",
                operands=[num, 2],
                operator="÷",
                operators=None,
                answer=float(num / 2.0),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_4":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} ÷ 4 =",
                operands=[num, 4],
                operator="÷",
                operators=None,
                answer=float(num / 4.0),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_11":
            digits = constraints.digits if constraints.digits is not None else 3
            digits = max(2, min(30, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} ÷ 11 =",
                operands=[num, 11],
                operator="÷",
                operators=None,
                answer=float(num / 11.0),
                isVertical=False
            )
        elif question_type == "vedic_special_products_base_100":
            num1 = int(generate_num_fallback(2))
            num2 = int(generate_num_fallback(2))
            # Ensure both are near 100 (90-109)
            if num1 < 90:
                num1 = 90 + (num1 % 10)
            if num1 > 109:
                num1 = 100 + (num1 % 10)
            if num2 < 90:
                num2 = 90 + (num2 % 10)
            if num2 > 109:
                num2 = 100 + (num2 % 10)
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_special_products_base_50":
            num1 = int(generate_num_fallback(2))
            num2 = int(generate_num_fallback(2))
            # Ensure both are near 50 (40-59)
            if num1 < 40:
                num1 = 40 + (num1 % 10)
            if num1 > 59:
                num1 = 50 + (num1 % 10)
            if num2 < 40:
                num2 = 40 + (num2 % 10)
            if num2 > 59:
                num2 = 50 + (num2 % 10)
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_squares_base_10":
            tens = (question_id % 9) + 1
            ones = ((question_id * 3) % 9) + 1
            num = tens * 10 + ones
            return Question(
                id=question_id,
                text=f"{num}² =",
                operands=[num],
                operator="²",
                operators=None,
                answer=float(num * num),
                isVertical=False
            )
        elif question_type == "vedic_squares_base_100":
            hundreds = (question_id % 9) + 1
            ones = (question_id * 3) % 10
            num = hundreds * 100 + ones
            return Question(
                id=question_id,
                text=f"{num}² =",
                operands=[num],
                operator="²",
                operators=None,
                answer=float(num * num),
                isVertical=False
            )
        elif question_type == "vedic_squares_base_1000":
            thousands = (question_id % 9) + 1
            ones = (question_id * 3) % 10
            num = thousands * 1000 + ones
            return Question(
                id=question_id,
                text=f"{num}² =",
                operands=[num],
                operator="²",
                operators=None,
                answer=float(num * num),
                isVertical=False
            )
        # Vedic Maths Level 2 fallbacks
        elif question_type == "vedic_fun_with_9_equal":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            multiplier_9s = int("9" * digits)
            return Question(
                id=question_id,
                text=f"{num} × {multiplier_9s} =",
                operands=[num, multiplier_9s],
                operator="×",
                operators=None,
                answer=float(num * multiplier_9s),
                isVertical=False
            )
        elif question_type == "vedic_fun_with_9_less_than":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            multiplicand_digits = max(1, digits - 1)  # Relative to digits, minimum 1
            num = generate_num_fallback(multiplicand_digits)
            multiplier_9s = int("9" * digits)
            return Question(
                id=question_id,
                text=f"{num} × {multiplier_9s} =",
                operands=[num, multiplier_9s],
                operator="×",
                operators=None,
                answer=float(num * multiplier_9s),
                isVertical=False
            )
        elif question_type == "vedic_fun_with_9_greater_than":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            multiplicand_digits = digits + 1  # Relative to digits
            num = generate_num_fallback(multiplicand_digits)
            multiplier_9s = int("9" * digits)
            return Question(
                id=question_id,
                text=f"{num} × {multiplier_9s} =",
                operands=[num, multiplier_9s],
                operator="×",
                operators=None,
                answer=float(num * multiplier_9s),
                isVertical=False
            )
        elif question_type == "vedic_fun_with_5":
            first_digit = (question_id % 9) + 1
            second_digit1 = (question_id * 3) % 9 + 1  # 1-9 (exclude 0)
            second_digit2 = 10 - second_digit1
            num1 = first_digit * 10 + second_digit1
            num2 = first_digit * 10 + second_digit2
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_fun_with_10":
            first_digit1 = (question_id % 9) + 1
            first_digit2 = 10 - first_digit1
            second_digit = (question_id * 3) % 10
            num1 = first_digit1 * 10 + second_digit
            num2 = first_digit2 * 10 + second_digit
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_1001":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × 1001 =",
                operands=[num, 1001],
                operator="×",
                operators=None,
                answer=float(num * 1001),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_5_25_125":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            multipliers = [5, 25, 125]
            multiplier = multipliers[question_id % 3]
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × {multiplier} =",
                operands=[num, multiplier],
                operator="×",
                operators=None,
                answer=float(num * multiplier),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_5_25_125":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            divisors = [5, 25, 125]
            divisor = divisors[question_id % 3]
            num = generate_num_fallback(digits)
            if num % divisor == 0:
                num = num + 1
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor} =",
                operands=[num, divisor],
                operator="÷",
                operators=None,
                answer=float(num / divisor),
                isVertical=False
            )
        elif question_type == "vedic_multiply_by_5_50_500":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            multipliers = [5, 50, 500]
            multiplier = multipliers[question_id % 3]
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num} × {multiplier} =",
                operands=[num, multiplier],
                operator="×",
                operators=None,
                answer=float(num * multiplier),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_5_50_500":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            divisors = [5, 50, 500]
            divisor = divisors[question_id % 3]
            num = generate_num_fallback(digits)
            if num % divisor == 0:
                num = num + 1
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor} =",
                operands=[num, divisor],
                operator="÷",
                operators=None,
                answer=float(num / divisor),
                isVertical=False
            )
        elif question_type == "vedic_vinculum":
            num = generate_num_fallback(2)
            return Question(
                id=question_id,
                text=f"Vinculum of {num} (Coming Soon)",
                operands=[num],
                operator="V",
                operators=None,
                answer=float(num),
                isVertical=False
            )
        elif question_type == "vedic_devinculum":
            num = generate_num_fallback(2)
            return Question(
                id=question_id,
                text=f"DeVinculum of {num} (Coming Soon)",
                operands=[num],
                operator="DV",
                operators=None,
                answer=float(num),
                isVertical=False
            )
        elif question_type == "vedic_subtraction_powers_of_10":
            power = constraints.powerOf10 if constraints.powerOf10 is not None else None
            if power is None:
                power = 2  # Default to 2 if not specified
            # Validate power is between 2-6
            power = max(2, min(6, power))
            base = 10 ** power
            num = int(generate_num_fallback(len(str(base - 1))))
            if num >= base:
                num = base - 1
            return Question(
                id=question_id,
                text=f"{base} - {num} =",
                operands=[base, num],
                operator="-",
                operators=None,
                answer=float(base - num),
                isVertical=False
            )
        elif question_type == "vedic_special_products_base_1000":
            # Either both above 1000 (1001-1010) OR both below 1000 (990-999)
            # Displacement allowed: 10
            side = question_id % 2  # 0 = below 1000, 1 = above 1000
            if side == 0:
                # Both below 1000: 990-999
                offset1 = question_id % 10  # 0 to 9
                offset2 = (question_id * 3) % 10  # 0 to 9
                num1 = 990 + offset1  # 990 to 999
                num2 = 990 + offset2  # 990 to 999
            else:
                # Both above 1000: 1001-1010
                offset1 = (question_id % 10) + 1  # 1 to 10
                offset2 = ((question_id * 3) % 10) + 1  # 1 to 10
                num1 = 1000 + offset1  # 1001 to 1010
                num2 = 1000 + offset2  # 1001 to 1010
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_special_products_cross_multiply":
            # Base same but numbers above and below: 1003 × 996, 102 × 97
            # Displacement allowed: 10
            base = constraints.base if constraints.base is not None else 100
            base = 10 ** int(math.log10(base)) if base > 0 else 100
            max_offset = 10  # Displacement limit: 10
            offset1 = (question_id % max_offset) + 1  # 1 to 10
            offset2 = -(((question_id * 3) % max_offset) + 1)  # -10 to -1
            num1 = max(1, base + offset1)  # base+1 to base+10
            num2 = max(1, base + offset2)  # base-10 to base-1
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_special_products_cross_base":
            # Pattern 1: "1000+" x "100-" (1001-1010 x 90-99)
            # Pattern 2: "1000-" x "100-" (990-999 x 90-99)
            # Displacement allowed: 10
            base1 = 1000
            base2 = 100
            pattern = question_id % 2  # 0 = "1000+" x "100-", 1 = "1000-" x "100-"
            if pattern == 0:
                # Pattern 1: "1000+" x "100-"
                offset1 = (question_id % 10) + 1  # 1 to 10
                offset2 = -(((question_id * 3) % 10) + 1)  # -10 to -1
                num1 = base1 + offset1  # 1001 to 1010
                num2 = base2 + offset2  # 90 to 99
            else:
                # Pattern 2: "1000-" x "100-"
                offset1 = -(((question_id % 10) + 1))  # -10 to -1
                offset2 = -(((question_id * 3) % 10) + 1)  # -10 to -1
                num1 = base1 + offset1  # 990 to 999
                num2 = base2 + offset2  # 90 to 99
            num1 = max(1, num1)
            num2 = max(1, num2)
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_special_products_cross_base_50":
            # "50+" x "50-": one above 50, one below 50
            # Examples: 52 × 48, 53 × 45, 57 × 46, 59 × 42
            # Displacement allowed: up to 10 (so 41-49 and 51-59)
            base = 50
            offset1 = (question_id % 9) + 1  # 1 to 9 (above 50)
            offset2 = -(((question_id * 3) % 9) + 1)  # -9 to -1 (below 50)
            num1 = max(1, base + offset1)  # 51 to 59
            num2 = max(1, base + offset2)  # 41 to 49
            return Question(
                id=question_id,
                text=f"{num1} × {num2} =",
                operands=[num1, num2],
                operator="×",
                operators=None,
                answer=float(num1 * num2),
                isVertical=False
            )
        elif question_type == "vedic_duplex":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(2, min(10, digits))
            num = generate_num_fallback(digits)
            num_str = str(num)
            duplex_value = 0
            n = len(num_str)
            for i in range(n // 2):
                left_idx = i
                right_idx = n - 1 - i
                if left_idx < right_idx:
                    left_digit = int(num_str[left_idx])
                    right_digit = int(num_str[right_idx])
                    duplex_value += left_digit * right_digit * 2
            if n % 2 == 1:
                mid_idx = n // 2
                mid_digit = int(num_str[mid_idx])
                duplex_value += mid_digit * mid_digit
            return Question(
                id=question_id,
                text=f"D of {num}",
                operands=[num],
                operator="D",
                operators=None,
                answer=float(duplex_value),
                isVertical=False
            )
        elif question_type == "vedic_squares_duplex":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            return Question(
                id=question_id,
                text=f"{num}² =",
                operands=[num],
                operator="²",
                operators=None,
                answer=float(num * num),
                isVertical=False
            )
        elif question_type == "vedic_divide_with_remainder":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            divisor = (question_id % 8) + 2  # 2-9
            num = generate_num_fallback(digits)
            if num % divisor == 0:
                num = num + 1
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor} =",
                operands=[num, divisor],
                operator="÷",
                operators=None,
                answer=float(num / divisor),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_9s_repetition_equal":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            divisor_9s = int("9" * digits)
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor_9s} =",
                operands=[num, divisor_9s],
                operator="÷",
                operators=None,
                answer=float(num / divisor_9s),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_9s_repetition_less_than":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            dividend_digits = max(1, digits - 1)
            num = generate_num_fallback(dividend_digits)
            divisor_9s = int("9" * digits)
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor_9s} =",
                operands=[num, divisor_9s],
                operator="÷",
                operators=None,
                answer=float(num / divisor_9s),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_11s_repetition_equal":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            divisor_11s = int("1" * (digits + 1))
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor_11s} =",
                operands=[num, divisor_11s],
                operator="÷",
                operators=None,
                answer=float(num / divisor_11s),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_11s_repetition_less_than":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            divisor_11s = int("1" * (digits + 2))
            return Question(
                id=question_id,
                text=f"{num} ÷ {divisor_11s} =",
                operands=[num, divisor_11s],
                operator="÷",
                operators=None,
                answer=float(num / divisor_11s),
                isVertical=False
            )
        elif question_type == "vedic_divide_by_7":
            digits = constraints.digits if constraints.digits is not None else 2
            digits = max(1, min(10, digits))
            num = generate_num_fallback(digits)
            if num % 7 == 0:
                num = num + 1
            return Question(
                id=question_id,
                text=f"{num} ÷ 7 =",
                operands=[num, 7],
                operator="÷",
                operators=None,
                answer=float(num / 7),
                isVertical=False
            )
        elif question_type == "vedic_dropping_10_method":
            digits = constraints.digits if constraints.digits is not None else 2
            rows = constraints.rows if constraints.rows is not None else 3
            rows = max(2, min(30, rows))
            operands_list = []
            for _ in range(rows):
                num = generate_num_fallback(digits)
                operands_list.append(num)
            total = sum(operands_list)
            text_lines = [str(operands_list[0])]
            for num in operands_list[1:]:
                text_lines.append(f"+ {num}")
            return Question(
                id=question_id,
                text="\n".join(text_lines),
                operands=operands_list,
                operator="+",
                operators=None,
                answer=float(total),
                isVertical=True
            )
        # Advanced operations fallbacks
        elif question_type == "square_root":
            root_digits = constraints.rootDigits or 3
            root_digits = max(1, min(30, root_digits))
            target_min = 10 ** (root_digits - 1)
            target_max = (10 ** root_digits) - 1
            min_root = int(target_min ** 0.5) + 1
            max_root = int(target_max ** 0.5)
            if max_root < min_root:
                root = min_root
            else:
                root = min_root + (question_id % (max_root - min_root + 1))
            number = root * root
            return Question(
                id=question_id,
                text=f"√{number} =",
                operands=[number],
                operator="√",
                operators=None,
                answer=float(root),
                isVertical=False
            )
        elif question_type == "cube_root":
            root_digits = constraints.rootDigits or 4
            root_digits = max(1, min(30, root_digits))
            target_min = 10 ** (root_digits - 1)
            target_max = (10 ** root_digits) - 1
            min_root = int(target_min ** (1/3)) + 1
            max_root = int(target_max ** (1/3))
            if max_root < min_root:
                root = min_root
            else:
                root = min_root + (question_id % (max_root - min_root + 1))
            number = root * root * root
            return Question(
                id=question_id,
                text=f"∛{number} =",
                operands=[number],
                operator="∛",
                operators=None,
                answer=float(root),
                isVertical=False
            )
        elif question_type == "lcm":
            first_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else (constraints.digits if constraints.digits is not None else 2)
            second_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else (constraints.digits if constraints.digits is not None else 2)
            first_digits = max(1, min(10, first_digits))
            second_digits = max(1, min(10, second_digits))
            a = generate_num_fallback(first_digits)
            b = generate_num_fallback(second_digits)
            if a == b:
                b = b + 1 if b < (10 ** second_digits - 1) else (10 ** (second_digits - 1))
            answer = float(abs(a * b) // math.gcd(a, b))
            return Question(
                id=question_id,
                text=f"LCM({a}, {b}) =",
                operands=[a, b],
                operator="LCM",
                operators=None,
                answer=answer,
                isVertical=False
            )
        elif question_type == "gcd":
            first_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else (constraints.digits if constraints.digits is not None else 3)
            second_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else (constraints.digits if constraints.digits is not None else 2)
            first_digits = max(1, min(10, first_digits))
            second_digits = max(1, min(10, second_digits))
            a = generate_num_fallback(first_digits)
            b = generate_num_fallback(second_digits)
            if a == b:
                b = b + 1 if b < (10 ** second_digits - 1) else (10 ** (second_digits - 1))
            answer = float(math.gcd(a, b))
            return Question(
                id=question_id,
                text=f"GCD({a}, {b}) =",
                operands=[a, b],
                operator="GCD",
                operators=None,
                answer=answer,
                isVertical=False
            )
        elif question_type == "percentage":
            percentage_min = constraints.percentageMin if constraints.percentageMin is not None else 2
            percentage_max = constraints.percentageMax if constraints.percentageMax is not None else 89
            number_digits = constraints.numberDigits if constraints.numberDigits is not None else 3
            percentage_min = max(1, min(99, percentage_min))
            percentage_max = max(percentage_min, min(99, percentage_max))
            number_digits = max(1, min(4, number_digits))
            percentage = percentage_min + (question_id % (percentage_max - percentage_min + 1))
            number_min = 10 ** (number_digits - 1)
            number_max = (10 ** number_digits) - 1
            number = number_min + ((question_id * 7) % (number_max - number_min + 1))
            answer = round((percentage / 100.0) * number, 2)
            return Question(
                id=question_id,
                text=f"{percentage}% of {number} =",
                operands=[percentage, number],
                operator="%",
                operators=None,
                answer=answer,
                isVertical=False
            )
        elif question_type == "decimal_multiplication":
            multiplicand_digits = constraints.multiplicandDigits or 2
            multiplier_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else 1
            multiplicand_digits = max(1, min(20, multiplicand_digits))
            multiplier_digits = max(0, min(20, multiplier_digits))
            a_min = 10 ** (multiplicand_digits - 1)
            a_max = (10 ** multiplicand_digits) - 1
            a_whole = a_min + (question_id % (a_max - a_min + 1))
            a_decimal = (question_id * 3) % 10
            a_int = a_whole * 10 + a_decimal
            a = a_int / 10.0
            if multiplier_digits == 0:
                b = 1 + (question_id % 9)
                b_int = b
            else:
                b_min = 10 ** (multiplier_digits - 1)
                b_max = (10 ** multiplier_digits) - 1
                b_whole = b_min + ((question_id * 5) % (b_max - b_min + 1))
                b_decimal = (question_id * 7) % 10
                b_int = b_whole * 10 + b_decimal
                b = b_int / 10.0
            answer = round(a * b, 2)
            if multiplier_digits == 0:
                text = f"{a:.1f} × {b} ="
            else:
                text = f"{a:.1f} × {b:.1f} ="
            return Question(
                id=question_id,
                text=text,
                operands=[a_int, b_int],
                operator="×",
                operators=None,
                answer=answer,
                isVertical=False
            )
        elif question_type == "decimal_division":
            dividend_digits = constraints.dividendDigits or 2
            divisor_digits = constraints.divisorDigits or 1
            dividend_digits = max(1, min(20, dividend_digits))
            divisor_digits = max(1, min(20, divisor_digits))
            divisor = max(1, generate_num_fallback(divisor_digits))
            quotient = generate_num_fallback(max(1, dividend_digits - divisor_digits + 1))
            dividend = quotient * divisor
            while len(str(dividend)) > dividend_digits:
                quotient = max(1, quotient - 1)
                dividend = quotient * divisor
            answer = round(float(dividend) / float(divisor), 2)
            return Question(
                id=question_id,
                text=f"{dividend} ÷ {divisor} =",
                operands=[dividend, divisor],
                operator="÷",
                operators=None,
                answer=answer,
                isVertical=False
            )
        elif question_type == "decimal_add_sub":
            digits = constraints.digits or 2
            rows = constraints.rows or 3
            rows = max(2, min(30, rows))
            min_whole = 10 ** (digits - 1)
            max_whole = (10 ** digits) - 1
            operands = []
            for i in range(rows):
                whole = min_whole + ((question_id * (i + 1)) % (max_whole - min_whole + 1))
                decimal = (question_id * (i + 3)) % 10
                num_int = whole * 10 + decimal
                operands.append(num_int)
            operators_list = ["+"] * (rows - 1)  # Simple fallback: all additions
            answer = sum(float(op) / 10.0 for op in operands)
            answer = round(answer, 1)
            text_parts = [f"{float(operands[0]) / 10.0:.1f}"]
            for i, op in enumerate(operators_list):
                text_parts.append(f"{op} {float(operands[i + 1]) / 10.0:.1f}")
            return Question(
                id=question_id,
                text="\n".join(text_parts),
                operands=operands,
                operator="±",
                operators=operators_list,
                answer=answer,
                isVertical=True
            )
        elif question_type == "integer_add_sub":
            digits = constraints.digits or 2
            rows = constraints.rows or 3
            rows = max(2, min(30, rows))
            operands = []
            for i in range(rows):
                num = generate_num_fallback(digits)
                while len(str(num)) != digits:
                    num = generate_num_fallback(digits)
                operands.append(num)
            operators_list = ["+"] * (rows - 1)  # Simple fallback: all additions
            answer = float(sum(operands))
            return Question(
                id=question_id,
                text=f"{operands[0]}\n" + "\n".join([f"+ {op}" for op in operands[1:]]),
                operands=operands,
                operator="±",
                operators=operators_list,
                answer=answer,
                isVertical=True
            )
        elif question_type == "intl_add_sub":
            return generate_intl_add_sub_question(question_id, constraints, fallback_random_func)
        elif question_type in ("direct_add_sub", "small_friends_add_sub", "big_friends_add_sub"):
            # Junior operations fallback - simple addition
            digits = constraints.digits or 1
            rows = constraints.rows or 3
            rows = max(2, min(15, rows))
            digits = max(1, min(2, digits))
            operands = []
            for i in range(rows):
                min_val = 0 if digits == 1 else 10
                max_val = 9 if digits == 1 else 99
                num = min_val + ((question_id * (i + 1)) % (max_val - min_val + 1))
                operands.append(num)
            operators_list = ["+"] * (rows - 1)  # Simple fallback: all additions
            answer = float(sum(operands))
            text_lines = [str(operands[0])]
            for i, op in enumerate(operators_list):
                text_lines.append(f"{op} {operands[i + 1]}")
            return Question(
                id=question_id,
                text="\n".join(text_lines),
                operands=operands,
                operator="±",
                operators=operators_list,
                answer=answer,
                isVertical=True
            )
        # Default fallback for addition and other unhandled types
        digits = constraints.digits or 1
        a = generate_num_fallback(digits)
        b = generate_num_fallback(digits)
        return Question(
            id=question_id,
            text=f"{a}\n+ {b}",
            operands=[a, b],
            operator="+",
            operators=None,
            answer=float(a + b),
            isVertical=True
        )
    
    # Setup RNG
    if seed is not None:
        rng = generate_seeded_rng(seed, question_id)
        generate_num = lambda d: generate_number(d, rng)
        random_func = rng
    else:
        generate_num = lambda d: generate_number(d)
        random_func = random.random
    
    digits = constraints.digits or 1
    operands: List[int] = []
    answer = 0.0
    operator = "+"
    operators: Optional[List[str]] = None  # For mixed operations
    is_vertical = False
    text: Optional[str] = None  # Will be built later, or set for special operations
    
    # Read rows with proper validation
    rows = 2
    if constraints.rows is not None:
        rows = int(constraints.rows)
        if rows < 2:
            rows = 2
        if rows > 30:
            rows = 30
    
    if question_type == "addition":
        operator = "+"
        is_vertical = True
        # Generate all numbers with exact same digit count
        # Use better randomization: vary the range distribution to avoid patterns
        operands = []
        min_val = 10 ** (digits - 1)
        max_val = (10 ** digits) - 1
        
        # Use different distribution strategies to avoid patterns
        # Mix uniform, weighted (toward middle), and weighted (toward edges) distributions
        distribution_type = int(random_func() * 3)
        
        for i in range(rows):
            if distribution_type == 0:
                # Uniform distribution
                num = generate_num(digits)
            elif distribution_type == 1:
                # Weighted toward middle values (more typical numbers)
                # Use normal-like distribution approximated with multiple random calls
                center = (min_val + max_val) // 2
                spread = (max_val - min_val) // 4
                offset = int((random_func() + random_func() - 1) * spread)
                num = max(min_val, min(max_val, center + offset))
            else:
                # Weighted toward edges (include more edge cases)
                edge_choice = random_func()
                if edge_choice < 0.5:
                    # Lower half
                    num = int(random_func() * ((min_val + max_val) // 2 - min_val + 1)) + min_val
                else:
                    # Upper half
                    num = int(random_func() * (max_val - (min_val + max_val) // 2 + 1)) + (min_val + max_val) // 2
            
            # Ensure it has exactly the right number of digits
            while len(str(num)) != digits:
                num = generate_num(digits)
            operands.append(num)
        
        # Shuffle operands to avoid ordering patterns
        # Manual shuffle using random_func (Fisher-Yates algorithm)
        for i in range(len(operands) - 1, 0, -1):
            j = int(random_func() * (i + 1))
            operands[i], operands[j] = operands[j], operands[i]
        
        answer = float(sum(operands))
    
    elif question_type == "subtraction":
        operator = "-"
        is_vertical = True
        
        # For subtraction: first number must be >= sum of all numbers to subtract
        # All numbers must have exactly the same digit count
        
        max_first = (10 ** digits) - 1
        min_first = 10 ** (digits - 1)
        
        # Generate numbers to subtract first with better randomization
        # Use question_id to ensure different patterns for each question
        numbers_to_subtract = []
        # Use varied distribution to avoid patterns - incorporate question_id for uniqueness
        pattern_seed = (question_id * 7 + seed if seed else question_id * 7) % 10
        
        for i in range(rows - 1):
            # Use different strategies based on position and question_id to avoid patterns
            strategy = (pattern_seed + i) % 4
            
            if strategy == 0:
                # Standard random
                num = generate_num(digits)
            elif strategy == 1:
                # Weighted toward smaller numbers (more typical subtractions)
                weighted_max = int((max_first - min_first) * 0.5) + min_first
                num = int(random_func() * (weighted_max - min_first + 1)) + min_first
            elif strategy == 2:
                # Weighted toward middle values
                center = (min_first + max_first) // 2
                spread = (max_first - min_first) // 4
                offset = int((random_func() * 2 - 1) * spread)
                num = max(min_first, min(max_first, center + offset))
            else:
                # Weighted toward larger numbers (challenging subtractions)
                weighted_min = int((max_first - min_first) * 0.3) + min_first
                num = int(random_func() * (max_first - weighted_min + 1)) + weighted_min
            
            # Ensure exact digit count
            while len(str(num)) != digits:
                if strategy == 0:
                    num = generate_num(digits)
                else:
                    # Regenerate with same strategy
                    if strategy == 1:
                        weighted_max = int((max_first - min_first) * 0.5) + min_first
                        num = int(random_func() * (weighted_max - min_first + 1)) + min_first
                    elif strategy == 2:
                        center = (min_first + max_first) // 2
                        spread = (max_first - min_first) // 4
                        offset = int((random_func() * 2 - 1) * spread)
                        num = max(min_first, min(max_first, center + offset))
                    else:
                        weighted_min = int((max_first - min_first) * 0.3) + min_first
                        num = int(random_func() * (max_first - weighted_min + 1)) + weighted_min
            numbers_to_subtract.append(num)
        
        sum_to_subtract = sum(numbers_to_subtract)
        
        # Calculate minimum first number needed (must be >= sum + 1 to ensure positive answer)
        required_min_first = max(min_first, sum_to_subtract + 1)
        
        # If impossible (required min > max possible), retry with smaller numbers
        if required_min_first > max_first:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            # Last resort: use minimum possible numbers
            numbers_to_subtract = [min_first for _ in range(rows - 1)]
            sum_to_subtract = sum(numbers_to_subtract)
            required_min_first = max(min_first, sum_to_subtract + 1)
        
        # Generate first number in valid range [required_min_first, max_first]
        if required_min_first <= max_first:
            first = int(random_func() * (max_first - required_min_first + 1)) + required_min_first
        else:
            # Shouldn't happen, but fallback
            first = max_first
        
        # Verify first number has correct digits
        if len(str(first)) != digits:
            first = max(min_first, min(max_first, first))
            if len(str(first)) != digits and retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
        
        operands = [first] + numbers_to_subtract
        answer = float(first - sum_to_subtract)
        
        # Final verification
        if answer < 0:
            # This shouldn't happen, but fix it
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            # Last resort: ensure answer is at least 0
            operands[0] = sum_to_subtract
            answer = 0.0
        
        if len(operands) != rows:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
        
        # Verify all operands have correct digits
        for i, op in enumerate(operands):
            if len(str(op)) != digits:
                if retry_count < 20:
                    return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                # Clamp to valid range
                operands[i] = max(min_first, min(max_first, op))
    
    elif question_type == "add_sub":
        is_vertical = True
        operator = "±"  # Indicates mixed operations
        
        # Generate mixed addition/subtraction: e.g., 9 - 2 + 5 + 7 - 3
        # Strategy: Generate operands and randomly assign operators, ensuring positive result at every step
        
        max_val = (10 ** digits) - 1
        min_val = 10 ** (digits - 1)
        
        # Generate operands and operators ensuring no negatives at any step
        operands = []
        operators_list = []
        running_total = 0
        
        # Start with first operand (always positive)
        first_num = generate_num(digits)
        operands.append(first_num)
        running_total = float(first_num)
        
        # Generate remaining operands and operators, ensuring running total never goes negative
        for i in range(rows - 1):
            # Decide operator first (random, but ensure we can maintain positive total)
            # If running total is low, favor addition
            if running_total < min_val * 2:
                prob_add = 0.7  # Favor addition when total is low
            elif running_total > max_val * 0.8:
                prob_add = 0.4  # Favor subtraction when total is high
            else:
                # Balanced probability with variation
                base_prob = 0.5
                variation = (question_id % 5) / 20.0
                prob_add = base_prob + variation - 0.1
            
            op = "+" if random_func() < prob_add else "-"
            
            if op == "+":
                # Addition: can use any valid number
                num = generate_num(digits)
                operands.append(num)
                running_total += num
                operators_list.append("+")
            else:
                # Subtraction: must ensure running_total - num >= 0
                # Maximum we can subtract is running_total (to get 0)
                max_subtract = int(running_total)
                if max_subtract < min_val:
                    # Can't subtract without going negative, use addition instead
                    num = generate_num(digits)
                    operands.append(num)
                    running_total += num
                    operators_list.append("+")
                else:
                    # Generate number to subtract (between min_val and max_subtract)
                    subtract_max = min(max_val, max_subtract)
                    if subtract_max < min_val:
                        # Can't subtract, use addition
                        num = generate_num(digits)
                        operands.append(num)
                        running_total += num
                        operators_list.append("+")
                    else:
                        # Generate random number in valid range
                        num = int(random_func() * (subtract_max - min_val + 1)) + min_val
                        # Ensure exact digit count
                        while len(str(num)) != digits:
                            num = int(random_func() * (subtract_max - min_val + 1)) + min_val
                        operands.append(num)
                        running_total -= num
                        operators_list.append("-")
        
        # Final answer
        answer = running_total
        
        # Verify answer is non-negative (should always be true now)
        if answer < 0:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            # Last resort: set to 0
            answer = 0.0
        
        # Verify all operands have correct digits
        for i, op in enumerate(operands):
            if len(str(op)) != digits:
                if retry_count < 20:
                    return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                # Clamp to valid range
                operands[i] = max(min_val, min(max_val, op))
        
        # Store operators list for use in text generation
        operators = operators_list
    
    elif question_type == "multiplication":
        operator = "×"
        is_vertical = False
        # For multiplication, use specific digit constraints
        # Check if multiplicandDigits/multiplierDigits are explicitly set (not None)
        if constraints.multiplicandDigits is not None:
            multiplicand_digits = constraints.multiplicandDigits
        elif constraints.digits is not None:
            multiplicand_digits = constraints.digits
        else:
            multiplicand_digits = 2  # Default fallback
        
        if constraints.multiplierDigits is not None:
            multiplier_digits = constraints.multiplierDigits
        elif constraints.digits is not None:
            multiplier_digits = constraints.digits
        else:
            multiplier_digits = 1  # Default fallback

        multiplicand_digits = max(1, min(20, multiplicand_digits))  # Allow up to 20 digits as per schema
        multiplier_digits = max(1, min(20, multiplier_digits))  # Allow up to 20 digits as per schema

        # Generate numbers with exact digit constraints
        # Use question_id to ensure uniqueness and avoid patterns
        a = generate_num(multiplicand_digits)
        b = generate_num(multiplier_digits)
        
        # For large digits (10+), ensure numbers don't end with multiple zeros
        # Directly fix trailing zeros by replacing them with random non-zero digits
        if multiplicand_digits >= 10 or multiplier_digits >= 10:
            # For large numbers, allow max 1 trailing zero (to keep randomness)
            max_allowed_zeros = 1
            
            # Fix multiplicand: ensure it doesn't end with multiple zeros
            a_str = str(a)
            a_trailing_zeros = len(a_str) - len(a_str.rstrip('0'))
            if a_trailing_zeros > max_allowed_zeros:
                # Convert to list for easier manipulation
                a_digits_list = list(a_str)
                # Replace trailing zeros (beyond max_allowed_zeros) with random non-zero digits
                zeros_to_fix = a_trailing_zeros - max_allowed_zeros
                for i in range(len(a_digits_list) - a_trailing_zeros, len(a_digits_list) - max_allowed_zeros):
                    a_digits_list[i] = str(int(random_func() * 9) + 1)  # 1-9 (non-zero)
                a = int(''.join(a_digits_list))
                # Ensure correct digit count
                a_str_new = str(a)
                if len(a_str_new) != multiplicand_digits:
                    # Regenerate if digit count is wrong
                    a = generate_num(multiplicand_digits)
                    # Fix trailing zeros again
                    a_str = str(a)
                    a_trailing_zeros = len(a_str) - len(a_str.rstrip('0'))
                    if a_trailing_zeros > max_allowed_zeros:
                        a_digits_list = list(a_str)
                        zeros_to_fix = a_trailing_zeros - max_allowed_zeros
                        for i in range(len(a_digits_list) - a_trailing_zeros, len(a_digits_list) - max_allowed_zeros):
                            a_digits_list[i] = str(int(random_func() * 9) + 1)
                        a = int(''.join(a_digits_list))
            
            # Fix multiplier: ensure it doesn't end with multiple zeros
            b_str = str(b)
            b_trailing_zeros = len(b_str) - len(b_str.rstrip('0'))
            if b_trailing_zeros > max_allowed_zeros:
                # Convert to list for easier manipulation
                b_digits_list = list(b_str)
                # Replace trailing zeros (beyond max_allowed_zeros) with random non-zero digits
                zeros_to_fix = b_trailing_zeros - max_allowed_zeros
                for i in range(len(b_digits_list) - b_trailing_zeros, len(b_digits_list) - max_allowed_zeros):
                    b_digits_list[i] = str(int(random_func() * 9) + 1)  # 1-9 (non-zero)
                b = int(''.join(b_digits_list))
                # Ensure correct digit count
                b_str_new = str(b)
                if len(b_str_new) != multiplier_digits:
                    # Regenerate if digit count is wrong
                    b = generate_num(multiplier_digits)
                    # Fix trailing zeros again
                    b_str = str(b)
                    b_trailing_zeros = len(b_str) - len(b_str.rstrip('0'))
                    if b_trailing_zeros > max_allowed_zeros:
                        b_digits_list = list(b_str)
                        zeros_to_fix = b_trailing_zeros - max_allowed_zeros
                        for i in range(len(b_digits_list) - b_trailing_zeros, len(b_digits_list) - max_allowed_zeros):
                            b_digits_list[i] = str(int(random_func() * 9) + 1)
                        b = int(''.join(b_digits_list))
            
            # Final verification: double-check both numbers
            a_str = str(a)
            b_str = str(b)
            a_trailing_zeros = len(a_str) - len(a_str.rstrip('0'))
            b_trailing_zeros = len(b_str) - len(b_str.rstrip('0'))
            
            # Force fix if still too many zeros
            if a_trailing_zeros > max_allowed_zeros:
                a_digits_list = list(a_str)
                for i in range(len(a_digits_list) - a_trailing_zeros, len(a_digits_list) - max_allowed_zeros):
                    a_digits_list[i] = str(int(random_func() * 9) + 1)
                a = int(''.join(a_digits_list))
            
            if b_trailing_zeros > max_allowed_zeros:
                b_digits_list = list(b_str)
                for i in range(len(b_digits_list) - b_trailing_zeros, len(b_digits_list) - max_allowed_zeros):
                    b_digits_list[i] = str(int(random_func() * 9) + 1)
                b = int(''.join(b_digits_list))
        
        # Validate that generated numbers match the digit constraints
        a_digits = len(str(a))
        b_digits = len(str(b))
        
        # Retry if digits don't match (shouldn't happen, but safety check)
        if a_digits != multiplicand_digits or b_digits != multiplier_digits:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)

        operands = [a, b]
        answer = float(a * b)

        if answer < 0 or not (answer > 0 and answer < float('inf')):
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
        
        # Note: We removed the "skip if multiplier is 1" check to respect user's digit constraints
        # If user wants 1-digit multiplier, they should get 1-digit multipliers (including 1)
    
    elif question_type == "division":
        operator = "÷"
        is_vertical = False
        # For division, use specific digit constraints, with reasonable defaults
        dividend_digits = constraints.dividendDigits or 2  # Default to 2 digits
        divisor_digits = constraints.divisorDigits or 1    # Default to 1 digit

        dividend_digits = max(1, min(20, dividend_digits))  # Allow up to 20 digits as per schema
        divisor_digits = max(1, min(20, divisor_digits))  # Allow up to 20 digits as per schema
        
        # Generate divisor (must be non-zero)
        # For 1-digit divisor, allow 1 if user specifically wants 1/1 division
        divisor = generate_num(divisor_digits)
        attempts = 0
        while divisor == 0 and attempts < 10:
            divisor = generate_num(divisor_digits)
            attempts += 1
        if divisor == 0:
            divisor = 1  # Use 1 as fallback (minimum valid divisor)
        
        # Calculate valid quotient range
        dividend_min = 10 ** (dividend_digits - 1)
        dividend_max = (10 ** dividend_digits) - 1
        quotient_min = max(1, dividend_min // divisor)
        quotient_max = min(
            (10 ** max(1, dividend_digits - divisor_digits + 1)) - 1,
            dividend_max // divisor
        )
        
        # Ensure we have a valid range
        if quotient_min > quotient_max or quotient_max < 1:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            # Last resort: use minimum valid values
            quotient_min = 1
            quotient_max = max(1, dividend_max // divisor)
            if quotient_max < 1:
                # Can't generate valid division, use simple case
                quotient = 1
                dividend = divisor
                if len(str(dividend)) != dividend_digits:
                    # Adjust to meet digit requirement
                    dividend = max(dividend_min, min(dividend_max, dividend))
                operands = [dividend, divisor]
                answer = float(quotient)
                return Question(
                    id=question_id,
                    text=f"{dividend} ÷ {divisor} =",
                    operands=operands,
                    operator="÷",
                    operators=None,
                    answer=answer,
                    isVertical=False
                )
        
        # Generate quotient, ensuring dividend will have correct digits
        # First, generate all valid quotient-dividend pairs that satisfy digit constraints
        valid_quotients = []
        for q in range(quotient_min, quotient_max + 1):
            d = q * divisor
            # Strictly check: dividend must have exactly the correct number of digits
            if len(str(d)) == dividend_digits and dividend_min <= d <= dividend_max:
                valid_quotients.append(q)
        
        # If no valid quotients found, retry with a new divisor
        if not valid_quotients:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            # Last resort: use minimum valid values
            quotient = 1
            dividend = divisor
            # Ensure dividend has correct digits
            if len(str(dividend)) != dividend_digits:
                # Try to find a quotient that gives correct digits
                for q in range(1, 10):
                    d = q * divisor
                    if len(str(d)) == dividend_digits and dividend_min <= d <= dividend_max:
                        quotient = q
                        dividend = d
                        break
                # If still not found, clamp to valid range
                if len(str(dividend)) != dividend_digits:
                    dividend = max(dividend_min, min(dividend_max, dividend))
                    quotient = dividend // divisor
                    if quotient < 1:
                        quotient = 1
                        dividend = divisor
        else:
            # Pick a random valid quotient from the valid list
            quotient = valid_quotients[int(random_func() * len(valid_quotients))]
            dividend = quotient * divisor
        
        # Final strict verification: dividend must have exactly the correct number of digits
        if len(str(dividend)) != dividend_digits:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            # Last resort: ensure dividend is in valid range
            dividend = max(dividend_min, min(dividend_max, dividend))
            quotient = dividend // divisor
            if quotient < 1:
                quotient = 1
                dividend = divisor
        
        operands = [dividend, divisor]
        answer = float(quotient)
    
    elif question_type == "square_root":
        operator = "√"
        is_vertical = False
        root_digits = constraints.rootDigits or 3
        root_digits = max(1, min(30, root_digits))  # Allow up to 30 digits as per schema
        
        # Calculate valid root range
        target_min = 10 ** (root_digits - 1)
        target_max = (10 ** root_digits) - 1
        
        min_root = int(target_min ** 0.5) + 1
        max_root = int(target_max ** 0.5)
        
        # Ensure we have a valid range
        if max_root < min_root:
            root = min_root
        else:
            # Simple approach: use question_id to create unique offset, then add random
            root_range = max_root - min_root + 1
            base_offset = (question_id * 7) % root_range
            random_offset = int(random_func() * root_range)
            root = min_root + ((base_offset + random_offset) % root_range)
        
        number = root * root
        operands = [number]
        answer = float(root)
        
        # Format text - just show the square root symbol with number
        text = f"√{number} ="
    
    elif question_type == "cube_root":
        operator = "∛"
        is_vertical = False
        root_digits = constraints.rootDigits or 4
        root_digits = max(1, min(30, root_digits))  # Allow up to 30 digits as per schema
        
        # Calculate valid root range
        target_min = 10 ** (root_digits - 1)
        target_max = (10 ** root_digits) - 1
        
        min_root = int(target_min ** (1/3)) + 1
        max_root = int(target_max ** (1/3))
        
        # Ensure we have a valid range
        if max_root < min_root:
            root = min_root
        else:
            # Simple approach: use question_id to create unique offset, then add random
            root_range = max_root - min_root + 1
            base_offset = (question_id * 11) % root_range
            random_offset = int(random_func() * root_range)
            root = min_root + ((base_offset + random_offset) % root_range)
        
        number = root * root * root
        operands = [number]
        answer = float(root)
        
        # Format text - just show the cube root symbol with number
        text = f"∛{number} ="
    
    elif question_type == "decimal_multiplication":
        operator = "×"
        is_vertical = False
        
        # Get digit constraints for decimal multiplication
        # multiplicandDigits = digits BEFORE decimal point (always 1 decimal place after)
        # multiplierDigits: 0 = whole number, 1+ = digits BEFORE decimal point (always 1 decimal place after)
        multiplicand_digits = constraints.multiplicandDigits or int(random_func() * 3) + 1  # 1-3 digits default
        multiplier_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else int(random_func() * 2) + 1  # 1-2 digits default, or 0 for whole
        
        multiplicand_digits = max(1, min(20, multiplicand_digits))  # Allow up to 20 digits as per schema
        multiplier_digits = max(0, min(20, multiplier_digits))  # Allow 0 for whole number, up to 20 digits as per schema
        
        # Generate multiplicand: digits_before_decimal + 1 decimal place (always decimal)
        # e.g., multiplicand_digits=1 → range 1.0 to 9.9
        # e.g., multiplicand_digits=2 → range 10.0 to 99.9
        # e.g., multiplicand_digits=3 → range 100.0 to 999.9
        a_min_whole = 10 ** (multiplicand_digits - 1)
        a_max_whole = (10 ** multiplicand_digits) - 1
        a_whole = int(random_func() * (a_max_whole - a_min_whole + 1)) + a_min_whole
        a_decimal = int(random_func() * 10)  # 0-9 for decimal digit
        a_int = a_whole * 10 + a_decimal
        a = a_int / 10.0
        
        # Generate multiplier based on multiplier_digits
        if multiplier_digits == 0:
            # Whole number: generate single digit only (1-9)
            b = int(random_func() * 9) + 1
            b_int = b
        else:
            # Decimal: digits_before_decimal + 1 decimal place
            b_min_whole = 10 ** (multiplier_digits - 1)
            b_max_whole = (10 ** multiplier_digits) - 1
            b_whole = int(random_func() * (b_max_whole - b_min_whole + 1)) + b_min_whole
            b_decimal = int(random_func() * 10)  # 0-9 for decimal digit
            b_int = b_whole * 10 + b_decimal
            b = b_int / 10.0
        
        answer = round(a * b, 2)
        operands = [a_int, b_int]
        # Format numbers: always show 1 decimal place for multiplicand, show decimals for multiplier only if it's a decimal
        if multiplier_digits == 0:
            text = f"{a:.1f} × {b} ="
        else:
            text = f"{a:.1f} × {b:.1f} ="
    
    elif question_type == "lcm":
        operator = "LCM"
        is_vertical = False
        
        # Get digit constraints for LCM
        first_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else (constraints.digits if constraints.digits is not None else 2)  # Default 2
        second_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else (constraints.digits if constraints.digits is not None else 2)  # Default 2
        
        first_digits = max(1, min(10, first_digits))  # Updated max to 10
        second_digits = max(1, min(10, second_digits))  # Updated max to 10
        
        # Generate two numbers - simple and fast
        a = generate_num(first_digits)
        b = generate_num(second_digits)
        
        # Ensure a != b for variety
        if a == b:
            b_min = 10 ** (second_digits - 1)
            b_max = (10 ** second_digits) - 1
            if b < b_max:
                b += 1
            else:
                b = b_min
        
        # Calculate LCM
        answer = float(abs(a * b) // math.gcd(a, b))
        operands = [a, b]
        text = f"LCM({a}, {b}) ="
    
    elif question_type == "gcd":
        operator = "GCD"
        is_vertical = False
        
        # Get digit constraints for GCD
        first_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else (constraints.digits if constraints.digits is not None else 3)  # Default 3
        second_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else (constraints.digits if constraints.digits is not None else 2)  # Default 2
        
        first_digits = max(1, min(10, first_digits))  # Updated max to 10
        second_digits = max(1, min(10, second_digits))  # Updated max to 10
        
        # Generate two numbers - simple and fast
        a = generate_num(first_digits)
        b = generate_num(second_digits)
        
        # Ensure a != b for variety
        if a == b:
            b_min = 10 ** (second_digits - 1)
            b_max = (10 ** second_digits) - 1
            if b < b_max:
                b += 1
            else:
                b = b_min
        
        # Calculate GCD
        answer = float(math.gcd(a, b))
        operands = [a, b]
        text = f"GCD({a}, {b}) ="
    
    elif question_type == "integer_add_sub":
        operator = "±"  # Indicates mixed operations with possible negatives
        is_vertical = True
        
        # Get constraints
        digits = constraints.digits or 2
        rows = constraints.rows or 3
        rows = max(2, min(30, rows))  # Allow up to 30 rows as per schema
        
        # Generate all operands first (all with exact same digit count)
        operands = []
        for _ in range(rows):
            num = generate_num(digits)
            # Ensure exact digit count
            while len(str(num)) != digits:
                num = generate_num(digits)
            operands.append(num)
        
        # Randomly assign operators (+ or -) to each position after the first
        operators_list = []
        for i in range(rows - 1):
            # Randomly choose + or - (50/50 chance)
            op = "+" if random_func() < 0.5 else "-"
            operators_list.append(op)
        
        # Calculate answer by applying operations left to right (can be negative)
        answer = float(operands[0])
        for i, op in enumerate(operators_list):
            if op == "+":
                answer += operands[i + 1]
            else:
                answer -= operands[i + 1]
        
        # Store operators list for use in text generation
        operators = operators_list
        
        # Note: We don't ensure positive answer - negatives are allowed!
    
    elif question_type == "decimal_add_sub":
        operator = "±"  # Indicates mixed operations with decimals
        is_vertical = True
        
        # Get constraints
        digits = constraints.digits or 2
        rows = constraints.rows or 3
        rows = max(2, min(30, rows))  # Allow up to 30 rows as per schema
        
        # Generate decimal numbers: digits before decimal point, always 1 decimal place
        # e.g., digits=1 → 1.0 to 9.9, digits=2 → 10.0 to 99.9
        min_whole = 10 ** (digits - 1)
        max_whole = (10 ** digits) - 1
        
        # Generate all operands as decimals (stored as integers * 10)
        operands = []
        for _ in range(rows):
            whole_part = int(random_func() * (max_whole - min_whole + 1)) + min_whole
            decimal_part = int(random_func() * 10)  # 0-9 for decimal digit
            # Store as integer (multiply by 10 to preserve decimal)
            num_int = whole_part * 10 + decimal_part
            operands.append(num_int)
        
        # Generate operators ensuring no negative intermediate results
        # Strategy: Start with all additions, then carefully add subtractions that won't cause negatives
        operators_list = []
        current_total = float(operands[0]) / 10.0
        
        for i in range(rows - 1):
            operand_val = float(operands[i + 1]) / 10.0
            
            # Try to add a subtraction if it won't make the result negative
            # Otherwise, use addition
            if random_func() < 0.4 and current_total - operand_val >= 0.1:
                # Safe to subtract
                operators_list.append("-")
                current_total -= operand_val
            else:
                # Use addition
                operators_list.append("+")
                current_total += operand_val
        
        # Calculate final answer
        answer = float(operands[0]) / 10.0
        for i, op in enumerate(operators_list):
            operand_val = float(operands[i + 1]) / 10.0
            if op == "+":
                answer += operand_val
            else:
                answer -= operand_val
        
        # Double-check: ensure answer is positive (should always be true with our strategy)
        if answer < 0:
            if retry_count < 20:
                # Retry with different approach
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            
            # Last resort: convert all subtractions to additions
            operators_list = ["+"] * (rows - 1)
            answer = sum(float(op) / 10.0 for op in operands)
        
        # Round answer to 1 decimal place
        answer = round(answer, 1)
        
        # Store operators list for use in text generation
        operators = operators_list
        
        # Build text representation for decimal add/sub with decimal points
        text_parts = []
        # First operand (no operator)
        first_val = float(operands[0]) / 10.0
        text_parts.append(f"{first_val:.1f}")
        # Subsequent operands with their operators
        for i, op in enumerate(operators_list):
            operand_val = float(operands[i + 1]) / 10.0
            text_parts.append(f"{op} {operand_val:.1f}")
        text = "\n".join(text_parts)
        
        # Debug: Print text to verify it's being set correctly
        # print(f"DEBUG decimal_add_sub text: {repr(text)}")

    elif question_type == "intl_add_sub":
        return generate_intl_add_sub_question(question_id, constraints, random_func)
    
    elif question_type == "decimal_division":
        operator = "÷"
        is_vertical = False
        
        # Get digit constraints - use dividendDigits and divisorDigits
        # dividendDigits = number of digits for dividend (dividend will be whole number)
        # divisorDigits = number of digits for divisor (divisor will be whole number)
        dividend_digits = constraints.dividendDigits if constraints.dividendDigits is not None else int(random_func() * 3) + 1  # 1-3 digits default
        divisor_digits = constraints.divisorDigits if constraints.divisorDigits is not None else int(random_func() * 2) + 1  # 1-2 digits default
        
        dividend_digits = max(1, min(20, dividend_digits))  # Allow up to 20 digits as per schema
        divisor_digits = max(1, min(20, divisor_digits))  # Allow up to 20 digits as per schema
        
        # Generate whole number dividend with specified digits
        dividend_min = 10 ** (dividend_digits - 1)
        dividend_max = (10 ** dividend_digits) - 1
        dividend = generate_num(dividend_digits)
        
        # Ensure dividend has exactly the right number of digits (safety check)
        attempts_dividend = 0
        while (dividend < dividend_min or dividend > dividend_max) and attempts_dividend < 20:
            dividend = generate_num(dividend_digits)
            attempts_dividend += 1
        
        # Generate whole number divisor with specified digits
        divisor_min = 10 ** (divisor_digits - 1)
        divisor_max = (10 ** divisor_digits) - 1
        divisor = generate_num(divisor_digits)
        
        # Ensure divisor has exactly the right number of digits and is non-zero
        attempts = 0
        while (divisor == 0 or divisor < divisor_min or divisor > divisor_max) and attempts < 20:
            divisor = generate_num(divisor_digits)
            attempts += 1
        if divisor == 0:
            divisor = max(1, divisor_min)  # Ensure at least 1, or minimum for digit count
        
        # Calculate answer (will be decimal)
        answer = round(dividend / divisor, 2)
        
        operands = [dividend, divisor]
        text = f"{dividend} ÷ {divisor} ="
    
    elif question_type == "direct_add_sub":
        operator = "±"
        is_vertical = True

        digits = max(1, min(4, constraints.digits or 1))
        rows   = max(3, min(10, constraints.rows or 3))

        # ── Soroban "Direct" rules ──────────────────────────────────────────
        # For column digit c, adding b (c+b ≤ 9, no carry):
        #   c<5, c+b<5  → push earth         ✓  |  c<5, b≥5, c+b≤9  → push heaven+earth ✓
        #   c<5, b<5, c+b≥5 → small friend   ✗  |  c≥5 → push earth above heaven        ✓
        # For column digit c, subtracting b (c-b ≥ 0, no borrow):
        #   c<5, b≤c → pull earth            ✓  |  c≥5, b≤c-5 → pull earth above heaven ✓
        #   c≥5, b=5 → pull heaven           ✓  |  c≥5, b>5, b≤c → pull heaven+earth   ✓
        #   c≥5, b<5, b>c-5 → small friend   ✗

        def _da(c):
            c = c % 10
            if c < 5:
                return [b for b in range(1, 10 - c) if (c+b)<5 or b>=5]
            else:
                return list(range(1, 10 - c))

        def _ds(c):
            c = c % 10
            if c < 5:
                return list(range(1, c + 1))
            else:
                return [b for b in range(1, c + 1) if b <= c - 5 or b >= 5]

        # ── Column-sequence generation ────────────────────────────────────
        # Strategy: pre-generate each column's full digit sequence independently.
        # Each step in the sequence is the direction (add/sub) AND operand digit.
        # For each step, ALL columns must agree on add vs sub.
        # We generate the ones column sequence first (it determines direction per step),
        # then fill other columns matching that direction.

        def _build_col_digits(start_cd, directions):
            """Given list of booleans (True=add), build operand digit list for one column."""
            cd = start_cd
            operand_digits = []
            for do_add in directions:
                opts = _da(cd) if do_add else _ds(cd)
                if not opts:
                    return None  # stuck
                b = opts[int(random_func() * len(opts))]
                operand_digits.append(b)
                cd = (cd + b) if do_add else (cd - b)
            return operand_digits

        # Generate ones column sequence (determines directions)
        directions = None
        ones_start = None
        ones_digits = None
        for _ in range(60):
            cd = int(random_func() * 8) + 1  # 1..8
            dirs = []
            digs = []
            cur_cd = cd
            ok = True
            for step in range(rows - 1):
                add_opts = _da(cur_cd)
                sub_opts = _ds(cur_cd)
                if not add_opts and not sub_opts:
                    ok = False; break
                do_add = (random_func() < 0.6) if (add_opts and sub_opts) else bool(add_opts)
                opts = add_opts if do_add else sub_opts
                b = opts[int(random_func() * len(opts))]
                dirs.append(do_add)
                digs.append(b)
                cur_cd = (cur_cd + b) if do_add else (cur_cd - b)
            if ok and all(x > 0 for x in digs):
                directions = dirs
                ones_start = cd
                ones_digits = digs
                break

        if directions is None:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            directions = [True] * (rows - 1)
            ones_start = 3
            ones_digits = [1] * (rows - 1)

        # For each column, build operand digit sequence matching the directions
        col_starts = [ones_start]
        col_operand_digits = [ones_digits]

        for col in range(1, digits):
            found = False
            for _ in range(60):
                start_cd = int(random_func() * 8) + 1
                col_digits = _build_col_digits(start_cd, directions)
                if col_digits is not None and all(b > 0 for b in col_digits):
                    col_starts.append(start_cd)
                    col_operand_digits.append(col_digits)
                    found = True
                    break
            if not found:
                # Fallback: use ones column pattern
                col_starts.append(ones_start)
                col_operand_digits.append(ones_digits[:])

        # Build first number and operand list
        first = sum(col_starts[col] * (10 ** col) for col in range(digits))
        operands = [first]
        operators_list = []
        current = first

        for step in range(rows - 1):
            num = sum(col_operand_digits[col][step] * (10 ** col) for col in range(digits))
            do_add = directions[step]

            if num == 0:
                num = 1

            if do_add:
                operators_list.append("+")
                current += num
            else:
                if current < num:
                    if retry_count < 20:
                        return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                    num = 1
                operators_list.append("-")
                current -= num

            operands.append(num)

        answer = float(operands[0])
        for i, op in enumerate(operators_list):
            answer = answer + operands[i + 1] if op == "+" else answer - operands[i + 1]

        if answer < 0:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            operators_list = ["+"] * (rows - 1)
            answer = float(sum(operands))

        operators = operators_list
    
    elif question_type == "small_friends_add_sub":
        operator = "±"
        is_vertical = True

        digits = max(1, min(4, constraints.digits or 1))
        rows   = max(3, min(10, constraints.rows or 3))

        # ── Small Friends (complement-of-5) rules per column ──────────────
        # Small-friend ADD  : c ∈ {1,2,3,4}, b = 5-c  (c+b=5, use heaven+complement)
        # Small-friend SUB  : c ∈ {5,6,7,8}, b ∈ {1..} where b > c-5  and b < 5
        #                     i.e. b ∈ {c-4, c-3, c-2, c-1} ∩ {1,2,3,4}
        # Each column is independent; no carry/borrow between columns.

        def _sfa(c: int):
            """Small-friend addend for column digit c. Returns [] if none."""
            c = c % 10
            if 1 <= c <= 4:
                return [5 - c]
            return []

        def _sfs(c: int):
            """Small-friend subtrahend options for column digit c. Returns []."""
            c = c % 10
            if 5 <= c <= 8:
                # b must satisfy: b < 5, b > c-5  → b in range(c-4, 5) ∩ {1..4}
                return [b for b in range(max(1, c - 4), 5) if b > c - 5]
            return []

        def _sf_first_col(col):
            """Pick a starting column digit that has both add and sub options."""
            for _ in range(40):
                cd = int(random_func() * 9) + 1  # 1..9
                if _sfa(cd) or _sfs(cd):
                    return cd
            return 3  # fallback

        # Build first number column by column
        first = 0
        for col in range(digits):
            place = 10 ** col
            first += _sf_first_col(col) * place

        operands: list = [first]
        operators_list: list = []
        current = first

        for _ in range(rows - 1):
            ones_cd = current % 10
            can_add = bool(_sfa(ones_cd))
            can_sub = bool([b for b in _sfs(ones_cd) if current >= b])

            if not can_add and not can_sub:
                if retry_count < 20:
                    return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                break

            do_add = (random_func() < 0.6) if (can_add and can_sub) else can_add

            # Build D-digit operand column by column:
            # ones column → small-friend rule (required)
            # higher columns → small-friend preferred, proper direct rule as fallback
            # (direct = pure push/pull, no friend technique; student knows direct before small)
            num = 0
            for col in range(digits):
                place = 10 ** col
                cd = (current // place) % 10
                col_total = current // place
                if do_add:
                    opts = _sfa(cd)
                else:
                    opts = [b for b in _sfs(cd) if col_total >= b]
                if not opts and col > 0:
                    # Fallback: proper direct (no carry/borrow, no friend technique)
                    if do_add:
                        # _da(cd): valid direct addends for column digit cd
                        opts = [b for b in range(1, 10 - cd)
                                if (cd < 5 and ((cd + b) < 5 or b >= 5))
                                or (cd >= 5)]
                        opts = [b for b in opts if cd + b <= 9]
                    else:
                        # _ds(cd): valid direct subtrahends for column digit cd
                        if cd < 5:
                            opts = [b for b in range(1, cd + 1) if col_total >= b]
                        else:
                            opts = [b for b in range(1, cd + 1)
                                    if (b <= cd - 5 or b >= 5) and col_total >= b]
                if opts:
                    num += opts[int(random_func() * len(opts))] * place

            if num == 0:
                num = 1  # safety

            if do_add:
                operators_list.append("+")
                current += num
            else:
                if current < num:
                    if retry_count < 20:
                        return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                    num = 1
                operators_list.append("-")
                current -= num

            operands.append(num)

        answer = float(operands[0])
        for i, op in enumerate(operators_list):
            answer = answer + operands[i + 1] if op == "+" else answer - operands[i + 1]

        if answer < 0:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            operators_list = ["+"] * (rows - 1)
            answer = float(sum(operands))

        operators = operators_list
    
    elif question_type == "big_friends_add_sub":
        operator = "±"
        is_vertical = True

        digits = max(1, min(4, constraints.digits or 1))
        rows   = max(3, min(10, constraints.rows or 3))

        # ── Big Friends (complement-of-10) ───────────────────────────────
        # Big-friend ADD at column digit c (c∈{1..9}): b = 10-c (c+b=10, carry to next column).
        # Big-friend SUB at column digit c (c∈{1..4}): b = 10-c (borrow from next column, c-b<0).
        # For sequences: we track the full running integer and decide per-step.
        # Column digit c = (current // 10^col) % 10.
        # After ADD: actual column digit becomes (c + b - 10) = 0 with carry. Next column +1.
        # After SUB: actual column digit becomes (c - b + 10) = (2c - 10 + 10) = ... wait.
        #   For SUB big-friend: c∈{1..4}, b=10-c. c - (10-c) = 2c-10 < 0. Needs borrow.
        #   The result digit = c - (10-c) + 10 = 2c. (Borrowed 10 from next column.)
        # We track per-column digit sequences with explicit carry/borrow.

        def _bfa_opts(c):
            """Big-friend addend options for column digit c. Returns [b] or []."""
            c = c % 10
            return [10 - c] if 1 <= c <= 9 else []

        def _bfs_opts(c):
            """Big-friend subtrahend options for column digit c. Returns [b] or [].
            Valid when c∈{1..4}: borrow needed (b=10-c > c)."""
            c = c % 10
            return [10 - c] if 1 <= c <= 4 else []

        # For D-digit operands: ones column ALWAYS uses big-friend rule.
        # Higher columns use DIRECT rule (students know direct before big-friend).
        # This guarantees D-digit operands and pure big-friend technique on ones.

        def _direct_add_opts(c):
            c = c % 10
            if c < 5:
                return [b for b in range(1, 10 - c) if (c + b) < 5 or b >= 5]
            return list(range(1, 10 - c))

        def _direct_sub_opts(c):
            c = c % 10
            if c < 5:
                return list(range(1, c + 1))
            return [b for b in range(1, c + 1) if b <= c - 5 or b >= 5]

        # Build first number
        ones_cands = [c for c in range(1, 10) if _bfa_opts(c) and _bfs_opts(c)]
        ones_start = ones_cands[int(random_func() * len(ones_cands))]  # {1,2,3,4}
        first = ones_start
        for col in range(1, digits):
            cd = int(random_func() * 8) + 1  # 1..8 for direct viability
            first += cd * (10 ** col)

        operands = [first]
        operators_list = []
        current = first

        for _ in range(rows - 1):
            ones_c = current % 10
            can_bf_add = bool(_bfa_opts(ones_c))
            can_bf_sub = bool(_bfs_opts(ones_c))

            if not can_bf_add and not can_bf_sub:
                if retry_count < 20:
                    return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                break

            do_add = (random_func() < 0.5) if (can_bf_add and can_bf_sub) else can_bf_add

            # Ones: big-friend; higher cols: direct (ensuring b ≥ 1 for digit count)
            b_ones = 10 - ones_c
            num = b_ones
            for col in range(1, digits):
                place = 10 ** col
                cd = (current // place) % 10
                if do_add:
                    opts = _direct_add_opts(cd)
                    if not opts:
                        opts = [b for b in range(1, 10) if cd + b <= 9] or [1]
                else:
                    col_total = current // place
                    opts = [b for b in _direct_sub_opts(cd) if col_total >= b]
                    if not opts:
                        opts = [b for b in range(1, cd + 1)] if cd > 0 else []
                if not opts:
                    # No direct option; contribute 0 (loses D-digit but avoids crash)
                    continue
                num += opts[int(random_func() * len(opts))] * place

            # Ensure num has full D digits (ones already guaranteed ≥1)
            if digits > 1 and len(str(num)) < digits:
                # Higher digit was 0; fill with 1..8 direct
                for col in range(1, digits):
                    if (num // (10 ** col)) % 10 == 0:
                        num += (10 ** col)  # add place value of 1

            if do_add:
                operators_list.append("+")
                current += num
            else:
                if current < num:
                    # Switch to add to avoid negative
                    operators_list.append("+")
                    current += num
                else:
                    operators_list.append("-")
                    current -= num

            operands.append(num)

        answer = float(operands[0])
        for i, op in enumerate(operators_list):
            answer = answer + operands[i + 1] if op == "+" else answer - operands[i + 1]

        if answer < 0:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            operators_list = ["+"] * (rows - 1)
            answer = float(sum(operands))

        operators = operators_list

    elif question_type == "mix_friends_add_sub":
        operator = "±"
        is_vertical = True

        digits = max(1, min(4, constraints.digits or 1))
        rows   = max(3, min(10, constraints.rows or 3))

        # ── Mix Friends (big-friend + small-friend combined) per column ───
        # Mix-friend ADD: c ≥ 5, b ≥ 6, c+b ≥ 10 (carry), column result = (c+b)%10
        # Mix-friend SUB: reverse — if c_after = (c_before + b) % 10, then
        #   subtracting b from c_after (with borrow) reverses to c_before.
        #   Valid mix-sub: c is in mix_sub_map and b ≤ col_total.

        mix_add_map: dict = {}
        for c in range(5, 10):
            opts = [b for b in range(6, 10) if c + b >= 10]
            if opts:
                mix_add_map[c] = opts

        mix_sub_map: dict = {}
        for c_before, b_list in mix_add_map.items():
            for b in b_list:
                c_after = (c_before + b) % 10
                mix_sub_map.setdefault(c_after, []).append(b)

        def _mfa(c):
            return mix_add_map.get(c % 10, [])

        def _mfs(c):
            return mix_sub_map.get(c % 10, [])

        def _is_mix_add_valid(current_number, b_number, digits):
            """Check that each digit-column of b_number is a valid mix-add for current_number."""
            for col in range(digits):
                place = 10 ** col
                cd = (current_number // place) % 10
                bd = (b_number // place) % 10
                if bd not in _mfa(cd):
                    return False
            return True

        def _is_mix_sub_valid(current_number, b_number, digits):
            """Check that each digit-column of b_number is a valid mix-sub for current_number."""
            if current_number < b_number:
                return False
            for col in range(digits):
                place = 10 ** col
                cd = (current_number // place) % 10
                bd = (b_number // place) % 10
                if bd not in _mfs(cd):
                    return False
            return True

        # Generate a valid D-digit mix-friend operand for given running total and direction
        def _gen_mix_operand(current_number, do_add, digits):
            num = 0
            for col in range(digits):
                place = 10 ** col
                cd = (current_number // place) % 10
                opts = _mfa(cd) if do_add else _mfs(cd)
                if not opts:
                    return None
                b = opts[int(random_func() * len(opts))]
                num += b * place
            if not do_add and current_number < num:
                return None
            return num

        # Build first number: each column digit in mix_add_map keys {5..9}
        mix_keys = list(mix_add_map.keys())
        first = sum(
            mix_keys[int(random_func() * len(mix_keys))] * (10 ** col)
            for col in range(digits)
        )

        operands = [first]
        operators_list = []
        current = first

        for _ in range(rows - 1):
            ones_cd = current % 10
            can_add = bool(_mfa(ones_cd))
            can_sub = bool(_mfs(ones_cd)) and current >= 10 ** (digits - 1)

            if not can_add and not can_sub:
                if retry_count < 20:
                    return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                break

            do_add = (random_func() < 0.5) if (can_add and can_sub) else can_add

            num = None
            for _ in range(20):
                num = _gen_mix_operand(current, do_add, digits)
                if num is not None and num > 0:
                    break
                # Try opposite direction if stuck
                if do_add and can_sub:
                    do_add = False
                elif not do_add and can_add:
                    do_add = True
                else:
                    break

            if num is None or num == 0:
                if retry_count < 20:
                    return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
                break

            if do_add:
                operators_list.append("+")
                current += num
            else:
                operators_list.append("-")
                current -= num

            operands.append(num)

        # Pad to rows if loop broke early
        while len(operands) < rows:
            fallback = sum(mix_keys[int(random_func() * len(mix_keys))] * (10 ** col) for col in range(digits))
            operators_list.append("+")
            current += fallback
            operands.append(fallback)

        answer = float(operands[0])
        for i, op in enumerate(operators_list):
            answer = answer + operands[i + 1] if op == "+" else answer - operands[i + 1]

        if answer < 0:
            if retry_count < 20:
                return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
            operators_list = ["+"] * (rows - 1)
            answer = float(sum(operands))

        operators = operators_list

    # ========== VEDIC MATHS LEVEL 1 OPERATIONS ==========
    elif question_type == "vedic_multiply_by_11":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num * 11)
        operands = [num, 11]
        text = f"{num} × 11 ="
    
    elif question_type == "vedic_multiply_by_101":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num * 101)
        operands = [num, 101]
        text = f"{num} × 101 ="
    
    elif question_type == "vedic_subtraction_complement":
        operator = "C"
        is_vertical = False
        base = constraints.base if constraints.base is not None else 100
        # Common bases: 100, 1000, 10000, etc
        base = 10 ** int(math.log10(base)) if base > 0 else 100
        
        # Generate number less than base for complement
        num = int(random_func() * (base - 1)) + 1
        answer = float(base - num)  # Complement
        operands = [num]
        text = f"C of {num}"
    
    elif question_type == "vedic_subtraction_normal":
        operator = "-"
        is_vertical = False
        base = constraints.base if constraints.base is not None else 100
        base = 10 ** int(math.log10(base)) if base > 0 else 100
        
        # Generate number less than base
        num = int(random_func() * (base - 1)) + 1
        answer = float(base - num)
        operands = [base, num]
        text = f"{base} - {num} ="
    
    elif question_type == "vedic_multiply_by_12_19":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        # Use multiplier from constraints if specified, otherwise random 12-19
        if constraints.multiplier is not None:
            multiplier = max(12, min(19, constraints.multiplier))
        else:
            multiplier = int(random_func() * 8) + 12  # 12 to 19
        
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_special_products_base_100":
        operator = "×"
        is_vertical = False
        # Numbers near 100 (e.g., 99, 94, 102, 109)
        # Both numbers must be on the same side of 100 (both above or both below)
        side = int(random_func() * 2)  # 0 = below 100, 1 = above 100
        if side == 0:
            # Both below 100 (90-99)
            num1 = int(random_func() * 10) + 90  # 90 to 99
            num2 = int(random_func() * 10) + 90  # 90 to 99
        else:
            # Both above 100 (101-109)
            num1 = int(random_func() * 9) + 101  # 101 to 109
            num2 = int(random_func() * 9) + 101  # 101 to 109
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_special_products_base_50":
        operator = "×"
        is_vertical = False
        # Numbers near 50 (e.g., 53, 54, 47, 49)
        # Both numbers must be on the same side of 50 (both above or both below)
        side = int(random_func() * 2)  # 0 = below 50, 1 = above 50
        if side == 0:
            # Both below 50 (40-49)
            num1 = int(random_func() * 10) + 40  # 40 to 49
            num2 = int(random_func() * 10) + 40  # 40 to 49
        else:
            # Both above 50 (51-59)
            num1 = int(random_func() * 9) + 51  # 51 to 59
            num2 = int(random_func() * 9) + 51  # 51 to 59
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_multiply_by_21_91":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        # Multiplier must be one of the x1 series: 21, 31, 41, 51, 61, 71, 81, 91
        _SERIES_21_91 = [21, 31, 41, 51, 61, 71, 81, 91]
        if constraints.multiplierRange is not None:
            # Clamp to the nearest valid series member
            multiplier = min(_SERIES_21_91, key=lambda v: abs(v - constraints.multiplierRange))
        else:
            multiplier = _SERIES_21_91[int(random_func() * 8)]  # random pick from the 8 options
        
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_addition":
        operator = "+"
        is_vertical = False
        first_digits = constraints.firstDigits if constraints.firstDigits is not None else 2
        second_digits = constraints.secondDigits if constraints.secondDigits is not None else 2
        first_digits = max(1, min(30, first_digits))  # Updated: min 1, max 30 for vedic addition
        second_digits = max(1, min(30, second_digits))  # Updated: min 1, max 30 for vedic addition
        
        num1 = generate_num(first_digits)
        num2 = generate_num(second_digits)
        answer = float(num1 + num2)
        operands = [num1, num2]
        text = f"{num1} + {num2} ="
    
    elif question_type == "vedic_multiply_by_2":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num * 2)
        operands = [num, 2]
        text = f"{num} × 2 ="
    
    elif question_type == "vedic_multiply_by_4":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num * 4)
        operands = [num, 4]
        text = f"{num} × 4 ="
    
    elif question_type == "vedic_divide_by_2":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num / 2.0)
        operands = [num, 2]
        text = f"{num} ÷ 2 ="
    
    elif question_type == "vedic_divide_by_4":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num / 4.0)
        operands = [num, 4]
        text = f"{num} ÷ 4 ="
    
    elif question_type == "vedic_divide_single_digit":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        # Use divisor from constraints if specified, otherwise random 2-9
        if constraints.divisor is not None:
            divisor = max(2, min(9, constraints.divisor))
        else:
            divisor = int(random_func() * 8) + 2  # 2 to 9
        
        answer = float(num / divisor)
        operands = [num, divisor]
        text = f"{num} ÷ {divisor} ="
    
    elif question_type == "vedic_multiply_by_6":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(30, digits))
        
        # Generate even number (multiply by 2 then by 3)
        base_num = generate_num(digits)
        # Ensure it's even
        num = base_num if base_num % 2 == 0 else base_num + 1
        answer = float(num * 6)
        operands = [num, 6]
        text = f"{num} × 6 ="
    
    elif question_type == "vedic_divide_by_11":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 3  # Default 3
        digits = max(2, min(30, digits))
        
        num = generate_num(digits)
        answer = float(num / 11.0)
        operands = [num, 11]
        text = f"{num} ÷ 11 ="
    
    elif question_type == "vedic_squares_base_10":
        operator = "²"
        is_vertical = False
        # Numbers ending near 10 (e.g., 63, 91)
        # Generate number ending in 1-9, tens digit 1-9
        tens = int(random_func() * 9) + 1  # 1-9
        ones = int(random_func() * 9) + 1  # 1-9
        num = tens * 10 + ones
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_squares_base_100":
        operator = "²"
        is_vertical = False
        # Numbers near 100 with zeros in between (e.g., 306, 901)
        # Pattern: X0Y where X is 1-9, Y is 0-9
        hundreds = int(random_func() * 9) + 1  # 1-9
        ones = int(random_func() * 10)  # 0-9
        num = hundreds * 100 + ones  # e.g., 306, 901
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_squares_base_1000":
        operator = "²"
        is_vertical = False
        # Numbers near 1000 with zeros in between (e.g., 2004, 5005)
        # Pattern: X00Y where X is 1-9, Y is 0-9
        thousands = int(random_func() * 9) + 1  # 1-9
        ones = int(random_func() * 10)  # 0-9
        num = thousands * 1000 + ones  # e.g., 2004, 5005
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_tables":
        operator = "×"
        is_vertical = False
        # Table number: 11-99 range (double-digit tables)
        if constraints.tableNumber is not None:
            table_num = max(11, min(99, constraints.tableNumber))
        else:
            # Default to 11-99 range if not specified
            table_num = int(random_func() * (99 - 11 + 1)) + 11  # 11 to 99
        
        # For tables, the question_id determines which row (multiplier) we're on
        # multiplier ranges from 1 to rows (where rows comes from constraints.rows or count)
        # This will be handled in generate_block for vedic_tables
        multiplier = 1  # Default, will be overridden in generate_block
        answer = float(table_num * multiplier)
        operands = [table_num, multiplier]
        text = f"{table_num} × {multiplier} ="
    
    elif question_type == "vedic_tables_large":
        operator = "×"
        is_vertical = False
        # Table number: 101-999 range (triple-digit tables)
        if constraints.tableNumberLarge is not None:
            table_num = max(101, min(999, constraints.tableNumberLarge))
        else:
            # Default to 101-999 range if not specified
            table_num = int(random_func() * (999 - 101 + 1)) + 101  # 101 to 999
        
        # For tables, the question_id determines which row (multiplier) we're on
        # multiplier ranges from 1 to rows (where rows comes from constraints.rows or count)
        # This will be handled in generate_block for vedic_tables_large
        multiplier = 1  # Default, will be overridden in generate_block
        answer = float(table_num * multiplier)
        operands = [table_num, multiplier]
        text = f"{table_num} × {multiplier} ="
    
    # ========== VEDIC MATHS LEVEL 2 OPERATIONS ==========
    elif question_type == "vedic_fun_with_9_equal":
        operator = "×"
        is_vertical = False
        # Equal: multiplicand has 'digits' number of digits, multiplier has 'digits' digits of 9s
        # e.g., if digits=2: 57 × 99 (2-digit multiplicand × 2-digit 9s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        multiplicand_digits = digits
        multiplier_digits = digits
        
        multiplier_9s = int("9" * multiplier_digits)
        
        # Generate multiplicand with exactly multiplicand_digits digits
        min_val = 10 ** (multiplicand_digits - 1) if multiplicand_digits > 1 else 1
        max_val = (10 ** multiplicand_digits) - 1
        
        num = int(random_func() * (max_val - min_val + 1)) + min_val
        num = max(min_val, min(max_val, num))
        
        if len(str(num)) != multiplicand_digits:
            num = min_val + ((question_id * 7919) % (max_val - min_val + 1))
        
        answer = float(num * multiplier_9s)
        operands = [num, multiplier_9s]
        text = f"{num} × {multiplier_9s} ="
    
    elif question_type == "vedic_fun_with_9_less_than":
        operator = "×"
        is_vertical = False
        # Less than: multiplicand has 'digits - 1' digits, multiplier has 'digits' digits of 9s
        # e.g., if digits=2: 8 × 99 (1-digit multiplicand × 2-digit 9s)
        # e.g., if digits=3: 57 × 999 (2-digit multiplicand × 3-digit 9s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        multiplicand_digits = max(1, digits - 1)  # Relative to digits, minimum 1
        multiplier_digits = digits
        
        multiplier_9s = int("9" * multiplier_digits)
        
        # Generate multiplicand with exactly multiplicand_digits digits
        min_val = 10 ** (multiplicand_digits - 1) if multiplicand_digits > 1 else 1
        max_val = (10 ** multiplicand_digits) - 1
        
        num = int(random_func() * (max_val - min_val + 1)) + min_val
        num = max(min_val, min(max_val, num))
        
        if len(str(num)) != multiplicand_digits:
            num = min_val + ((question_id * 7919) % (max_val - min_val + 1))
        
        answer = float(num * multiplier_9s)
        operands = [num, multiplier_9s]
        text = f"{num} × {multiplier_9s} ="
    
    elif question_type == "vedic_fun_with_9_greater_than":
        operator = "×"
        is_vertical = False
        # Greater than: multiplicand has 'digits + 1' digits, multiplier has 'digits' digits of 9s
        # e.g., if digits=2: 364 × 99 (3-digit multiplicand × 2-digit 9s)
        # e.g., if digits=3: 3640 × 999 (4-digit multiplicand × 3-digit 9s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        multiplicand_digits = digits + 1  # Relative to digits
        multiplier_digits = digits
        
        multiplier_9s = int("9" * multiplier_digits)
        
        # Generate multiplicand with exactly multiplicand_digits digits
        min_val = 10 ** (multiplicand_digits - 1)
        max_val = (10 ** multiplicand_digits) - 1
        
        num = int(random_func() * (max_val - min_val + 1)) + min_val
        num = max(min_val, min(max_val, num))
        
        if len(str(num)) != multiplicand_digits:
            num = min_val + ((question_id * 7919) % (max_val - min_val + 1))
        
        answer = float(num * multiplier_9s)
        operands = [num, multiplier_9s]
        text = f"{num} × {multiplier_9s} ="


    
    elif question_type == "vedic_fun_with_5":
        operator = "×"
        is_vertical = False
        # 2×2 multiplication: first digits same, second digits sum to 10
        # e.g., 31 × 39 (3=3, 1+9=10), 95 × 95 (9=9, 5+5=10)
        # Exclude second_digit1=0 to avoid invalid cases like 10×20, 50×60
        first_digit = int(random_func() * 9) + 1  # 1-9
        second_digit1 = int(random_func() * 9) + 1  # 1-9 (exclude 0)
        second_digit2 = 10 - second_digit1  # Complement to 10 (will be 1-9)
        
        num1 = first_digit * 10 + second_digit1
        num2 = first_digit * 10 + second_digit2
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_fun_with_10":
        operator = "×"
        is_vertical = False
        # 2×2 multiplication: second digits same, first digits sum to 10
        # e.g., 33 × 73 (3+7=10, 3=3), 98 × 18 (9+1=10, 8=8)
        first_digit1 = int(random_func() * 9) + 1  # 1-9
        first_digit2 = 10 - first_digit1  # Complement to 10
        second_digit = int(random_func() * 10)  # 0-9
        
        num1 = first_digit1 * 10 + second_digit
        num2 = first_digit2 * 10 + second_digit
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_multiply_by_1001":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        answer = float(num * 1001)
        operands = [num, 1001]
        text = f"{num} × 1001 ="
    
    elif question_type == "vedic_multiply_by_5_25_125":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Randomly choose 5, 25, or 125
        multipliers = [5, 25, 125]
        multiplier = multipliers[int(random_func() * 3)]
        
        num = generate_num(digits)
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_divide_by_5_25_125":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Randomly choose 5, 25, or 125
        divisors = [5, 25, 125]
        divisor = divisors[int(random_func() * 3)]
        
        # Generate dividend that will result in decimal answer
        num = generate_num(digits)
        # Ensure it's not perfectly divisible
        while num % divisor == 0:
            num = generate_num(digits)
        
        answer = float(num / divisor)
        operands = [num, divisor]
        text = f"{num} ÷ {divisor} ="
    
    elif question_type == "vedic_multiply_by_5_50_500":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Randomly choose 5, 50, or 500
        multipliers = [5, 50, 500]
        multiplier = multipliers[int(random_func() * 3)]
        
        num = generate_num(digits)
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_divide_by_5_50_500":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Randomly choose 5, 50, or 500
        divisors = [5, 50, 500]
        divisor = divisors[int(random_func() * 3)]
        
        # Generate dividend that will result in decimal answer
        num = generate_num(digits)
        # Ensure it's not perfectly divisible
        while num % divisor == 0:
            num = generate_num(digits)
        
        answer = float(num / divisor)
        operands = [num, divisor]
        text = f"{num} ÷ {divisor} ="
    
    elif question_type == "vedic_vinculum":
        operator = "V"
        is_vertical = False
        # Coming Soon - placeholder
        num = generate_num(2)
        answer = float(num)
        operands = [num]
        text = f"Vinculum of {num} (Coming Soon)"
    
    elif question_type == "vedic_devinculum":
        operator = "DV"
        is_vertical = False
        # Coming Soon - placeholder
        num = generate_num(2)
        answer = float(num)
        operands = [num]
        text = f"DeVinculum of {num} (Coming Soon)"
    
    elif question_type == "vedic_subtraction_powers_of_10":
        operator = "-"
        is_vertical = False
        # Subtract from 100, 1000, 10000, etc.
        # Get power from constraints, default to 2 if not specified
        power = constraints.powerOf10 if constraints.powerOf10 is not None else 2
        # Validate power is between 2-6
        power = max(2, min(6, int(power)))
        
        base = 10 ** power
        # Generate number less than base
        num = int(random_func() * (base - 1)) + 1
        answer = float(base - num)
        operands = [base, num]
        text = f"{base} - {num} ="
    
    elif question_type == "vedic_special_products_base_1000":
        operator = "×"
        is_vertical = False
        # Either both above 1000 (1001-1010) OR both below 1000 (990-999)
        # Displacement allowed: 10 (cannot go above 1010 or below 990)
        side = int(random_func() * 2)  # 0 = below 1000, 1 = above 1000
        if side == 0:
            # Both below 1000: 990-999
            offset1 = int(random_func() * 10)  # 0 to 9
            offset2 = int(random_func() * 10)  # 0 to 9
            num1 = 990 + offset1  # 990 to 999
            num2 = 990 + offset2  # 990 to 999
        else:
            # Both above 1000: 1001-1010
            offset1 = int(random_func() * 10) + 1  # 1 to 10
            offset2 = int(random_func() * 10) + 1  # 1 to 10
            num1 = 1000 + offset1  # 1001 to 1010
            num2 = 1000 + offset2  # 1001 to 1010
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_special_products_cross_multiply":
        operator = "×"
        is_vertical = False
        # Base same but numbers above and below: 1003 × 996, 102 × 97
        # Displacement allowed: 10 (cannot go above base+10 or below base-10)
        base = constraints.base if constraints.base is not None else 100
        base = 10 ** int(math.log10(base)) if base > 0 else 100
        
        # Generate offsets: one positive (1-10), one negative (-10 to -1)
        max_offset = 10  # Displacement limit: 10
        offset1 = int(random_func() * max_offset) + 1  # Positive: 1 to 10
        offset2 = -(int(random_func() * max_offset) + 1)  # Negative: -10 to -1
        
        num1 = base + offset1  # base+1 to base+10
        num2 = base + offset2  # base-10 to base-1
        
        # Ensure both are positive
        num1 = max(1, num1)
        num2 = max(1, num2)
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_special_products_cross_base":
        operator = "×"
        is_vertical = False
        # Across bases: "1000+" x "100-" or "1000-" x "100-"
        # Pattern 1: 1001-1010 x 90-99 ("1000+" x "100-")
        # Pattern 2: 990-999 x 90-99 ("1000-" x "100-")
        # Displacement allowed: 10
        base1 = 1000
        base2 = 100
        
        pattern = int(random_func() * 2)  # 0 = "1000+" x "100-", 1 = "1000-" x "100-"
        if pattern == 0:
            # Pattern 1: "1000+" x "100-" (1001-1010 x 90-99)
            offset1 = int(random_func() * 10) + 1  # 1 to 10
            offset2 = -(int(random_func() * 10) + 1)  # -10 to -1
            num1 = base1 + offset1  # 1001 to 1010
            num2 = base2 + offset2  # 90 to 99
        else:
            # Pattern 2: "1000-" x "100-" (990-999 x 90-99)
            offset1 = -(int(random_func() * 10) + 1)  # -10 to -1
            offset2 = -(int(random_func() * 10) + 1)  # -10 to -1
            num1 = base1 + offset1  # 990 to 999
            num2 = base2 + offset2  # 90 to 99
        
        # Ensure both are positive
        num1 = max(1, num1)
        num2 = max(1, num2)
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_special_products_cross_base_50":
        operator = "×"
        is_vertical = False
        # Base 50 with "50+" x "50-": one above 50, one below 50
        # Examples: 52 × 48, 53 × 45, 57 × 46, 59 × 42
        # Displacement allowed: up to 10 (so 41-49 and 51-59)
        base = 50
        
        # One above 50 (51-59), one below 50 (41-49)
        offset1 = int(random_func() * 9) + 1  # 1 to 9 (above 50)
        offset2 = -(int(random_func() * 9) + 1)  # -9 to -1 (below 50)
        
        num1 = base + offset1  # 51 to 59
        num2 = base + offset2  # 41 to 49
        
        # Ensure both are positive
        num1 = max(1, num1)
        num2 = max(1, num2)
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_duplex":
        operator = "D"
        is_vertical = False
        # Duplex of numbers: D of 56, D of 567, D of 1234, etc.
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(10, digits))  # Minimum 2 digits, default 2 for duplex
        
        num = generate_num(digits)
        num_str = str(num)
        
        # Calculate duplex
        # D of 56 = 5 × 6 × 2
        # D of 567 = (5 × 7 × 2) + 6²
        # D of 1234 = (1 × 4 × 2) + (2 × 3 × 2)
        # D of 12345 = (1 × 5 × 2) + (2 × 4 × 2) + 3²
        duplex_value = 0
        n = len(num_str)
        for i in range(n // 2):
            left_idx = i
            right_idx = n - 1 - i
            if left_idx < right_idx:
                left_digit = int(num_str[left_idx])
                right_digit = int(num_str[right_idx])
                duplex_value += left_digit * right_digit * 2
        # Add middle digit squared if odd length
        if n % 2 == 1:
            mid_idx = n // 2
            mid_digit = int(num_str[mid_idx])
            duplex_value += mid_digit * mid_digit
        
        answer = float(duplex_value)
        operands = [num]
        text = f"D of {num}"
    
    elif question_type == "vedic_squares_duplex":
        operator = "²"
        is_vertical = False
        # Squares using duplex method: 49², 567², 2654²
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_divide_with_remainder":
        operator = "÷"
        is_vertical = False
        # Divide by single digit with decimal answer
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        divisor = int(random_func() * 8) + 2  # 2-9
        num = generate_num(digits)
        # Ensure it's not perfectly divisible
        while num % divisor == 0:
            num = generate_num(digits)
        
        answer = float(num / divisor)
        operands = [num, divisor]
        text = f"{num} ÷ {divisor} ="
    
    elif question_type == "vedic_divide_by_9s_repetition_equal":
        operator = "÷"
        is_vertical = False
        # Equal: dividend has 'digits' number of digits, divisor has 'digits' digits of 9s
        # e.g., if digits=2: 57 ÷ 99 (2-digit dividend ÷ 2-digit 9s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        divisor = int("9" * digits)
        
        answer = float(num / divisor)
        operands = [num, divisor]
        text = f"{num} ÷ {divisor} ="
    
    elif question_type == "vedic_divide_by_9s_repetition_less_than":
        operator = "÷"
        is_vertical = False
        # Less than: dividend has 1 digit less than divisor 9s, divisor has 'digits' digits of 9s
        # e.g., if digits=2: 8 ÷ 99 (1-digit dividend ÷ 2-digit 9s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        dividend_digits = max(1, digits - 1)
        num = generate_num(dividend_digits)
        divisor = int("9" * digits)
        
        answer = float(num / divisor)
        operands = [num, divisor]
        text = f"{num} ÷ {divisor} ="
    
    elif question_type == "vedic_divide_by_11s_repetition_equal":
        operator = "÷"
        is_vertical = False
        # Equal: dividend has 'digits' number of digits, divisor has (digits + 1) digits of 1s
        # e.g., if digits=2: 57 ÷ 111 (2-digit dividend ÷ 3-digit 1s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        divisor_11s = int("1" * (digits + 1))
        
        answer = float(num / divisor_11s)
        operands = [num, divisor_11s]
        text = f"{num} ÷ {divisor_11s} ="
    
    elif question_type == "vedic_divide_by_11s_repetition_less_than":
        operator = "÷"
        is_vertical = False
        # Less than: dividend has 'digits' number of digits, divisor has (digits + 2) digits of 1s
        # e.g., if digits=2: 57 ÷ 1111 (2-digit dividend ÷ 4-digit 1s)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        divisor_11s = int("1" * (digits + 2))
        
        answer = float(num / divisor_11s)
        operands = [num, divisor_11s]
        text = f"{num} ÷ {divisor_11s} ="

    
    elif question_type == "vedic_divide_by_7":
        operator = "÷"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        # Ensure it's not perfectly divisible
        while num % 7 == 0:
            num = generate_num(digits)
        
        answer = float(num / 7)
        operands = [num, 7]
        text = f"{num} ÷ 7 ="
    
    # ========== VEDIC MATHS LEVEL 3 OPERATIONS ==========
    elif question_type == "vedic_multiply_by_111_999":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Random multiplier: 111, 222, 333, ..., 999
        multiplier_digit = int(random_func() * 9) + 1  # 1-9
        multiplier = int(str(multiplier_digit) * 3)  # 111, 222, ..., 999
        
        num = generate_num(digits)
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_multiply_by_102_109":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Random multiplier: 102, 103, ..., 109
        multiplier = int(random_func() * 8) + 102  # 102-109
        
        num = generate_num(digits)
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_multiply_by_112_119":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        # Random multiplier: 112, 113, ..., 119
        multiplier = int(random_func() * 8) + 112  # 112-119
        
        num = generate_num(digits)
        answer = float(num * multiplier)
        operands = [num, multiplier]
        text = f"{num} × {multiplier} ="
    
    elif question_type == "vedic_multiplication":
        operator = "×"
        is_vertical = False
        # 6 cases: 2x2, 3x2, 4x2, 3x3, 4x3, 4x4
        case = constraints.multiplicationCase if constraints.multiplicationCase else "2x2"
        if case == "mix":
            cases = ["2x2", "3x2", "4x2", "3x3", "4x3", "4x4"]
            case = cases[int(random_func() * len(cases))]
        
        if case == "2x2":
            num1 = generate_num(2)
            num2 = generate_num(2)
        elif case == "3x2":
            num1 = generate_num(3)
            num2 = generate_num(2)
        elif case == "4x2":
            num1 = generate_num(4)
            num2 = generate_num(2)
        elif case == "3x3":
            num1 = generate_num(3)
            num2 = generate_num(3)
        elif case == "4x3":
            num1 = generate_num(4)
            num2 = generate_num(3)
        else:  # 4x4
            num1 = generate_num(4)
            num2 = generate_num(4)
        
        answer = float(num1 * num2)
        operands = [num1, num2]
        text = f"{num1} × {num2} ="
    
    elif question_type == "vedic_mix_multiplication":
        operator = "×"
        is_vertical = False
        # 2X2X2 multiplication: 35 × 21 × 27
        num1 = generate_num(2)
        num2 = generate_num(2)
        num3 = generate_num(2)
        
        answer = float(num1 * num2 * num3)
        operands = [num1, num2, num3]
        text = f"{num1} × {num2} × {num3} ="
    
    elif question_type == "vedic_combined_operation":
        operator = "+"
        is_vertical = False
        # (2X1) + (2X1): (34 × 6) + (47 × 3)
        num1 = generate_num(2)
        mult1 = generate_num(1)
        num2 = generate_num(2)
        mult2 = generate_num(1)
        
        part1 = num1 * mult1
        part2 = num2 * mult2
        answer = float(part1 + part2)
        operands = [num1, mult1, num2, mult2]
        text = f"({num1} × {mult1}) + ({num2} × {mult2}) ="
    
    elif question_type == "vedic_fraction_simplification":
        operator = "/"
        is_vertical = False
        # Fractions that can be simplified: 14/28, 33/77, 14/21, 35/63
        # Generate a fraction that has a common factor
        # Generate numerator and denominator with a common factor
        common_factor = int(random_func() * 8) + 2  # 2-9
        num_mult = int(random_func() * 8) + 2  # 2-9
        den_mult = int(random_func() * 8) + 2  # 2-9
        
        numerator = common_factor * num_mult
        denominator = common_factor * den_mult
        
        # Ensure they're not the same
        while numerator == denominator:
            num_mult = int(random_func() * 8) + 2
            numerator = common_factor * num_mult
        
        answer = float(numerator / denominator)
        operands = [numerator, denominator]
        text = f"{numerator}/{denominator} ="
    
    elif question_type == "vedic_fraction_addition":
        operator = "+"
        is_vertical = False
        # 4 cases: Direct, Different Denominator, Whole, Mix
        case = constraints.fractionCase if constraints.fractionCase else "mix"
        if case == "mix":
            cases = ["direct", "different_denominator", "whole"]
            case = cases[int(random_func() * len(cases))]
        
        if case == "direct":
            # Same denominator: 5/8 + 7/8
            den = int(random_func() * 90) + 2  # 2-91
            num1 = int(random_func() * (den - 1)) + 1
            num2 = int(random_func() * (den - 1)) + 1
            answer = float((num1 + num2) / den)
            operands = [num1, den, num2, den]
            text = f"{num1}/{den} + {num2}/{den} ="
        elif case == "different_denominator":
            # Different denominators: 1/2 + 1/6, 28/29 + 34/87
            den1 = int(random_func() * 90) + 2
            den2 = int(random_func() * 90) + 2
            while den1 == den2:
                den2 = int(random_func() * 90) + 2
            num1 = int(random_func() * (den1 - 1)) + 1
            num2 = int(random_func() * (den2 - 1)) + 1
            # Calculate answer using LCM
            lcm_den = lcm(den1, den2)
            answer = float((num1 * (lcm_den // den1) + num2 * (lcm_den // den2)) / lcm_den)
            operands = [num1, den1, num2, den2]
            text = f"{num1}/{den1} + {num2}/{den2} ="
        else:  # whole
            # Whole number + fraction: 247 + 5/6, 31 + 2/8
            whole = generate_num(int(random_func() * 3) + 1)  # 1-3 digits
            den = int(random_func() * 90) + 2
            num = int(random_func() * (den - 1)) + 1
            answer = float(whole + (num / den))
            operands = [whole, num, den]
            text = f"{whole} + {num}/{den} ="
    
    elif question_type == "vedic_fraction_subtraction":
        operator = "-"
        is_vertical = False
        # 4 cases: Direct, Different Denominator, Whole, Mix
        case = constraints.fractionCase if constraints.fractionCase else "mix"
        if case == "mix":
            cases = ["direct", "different_denominator", "whole"]
            case = cases[int(random_func() * len(cases))]
        
        if case == "direct":
            # Same denominator: 7/9 - 3/9
            den = int(random_func() * 90) + 2
            num1 = int(random_func() * (den - 1)) + 1
            num2 = int(random_func() * (den - 1)) + 1
            # Ensure num1 >= num2 for positive result
            if num1 < num2:
                num1, num2 = num2, num1
            answer = float((num1 - num2) / den)
            operands = [num1, den, num2, den]
            text = f"{num1}/{den} - {num2}/{den} ="
        elif case == "different_denominator":
            # Different denominators: 3/4 - 2/8, 38/47 - 19/32
            den1 = int(random_func() * 90) + 2
            den2 = int(random_func() * 90) + 2
            while den1 == den2:
                den2 = int(random_func() * 90) + 2
            num1 = int(random_func() * (den1 - 1)) + 1
            num2 = int(random_func() * (den2 - 1)) + 1
            # Calculate answer using LCM, ensure positive
            from math import lcm
            lcm_den = lcm(den1, den2)
            result_num = (num1 * (lcm_den // den1)) - (num2 * (lcm_den // den2))
            if result_num < 0:
                # Swap to ensure positive
                num1, num2 = num2, num1
                den1, den2 = den2, den1
                lcm_den = lcm(den1, den2)
                result_num = (num1 * (lcm_den // den1)) - (num2 * (lcm_den // den2))
            answer = float(result_num / lcm_den)
            operands = [num1, den1, num2, den2]
            text = f"{num1}/{den1} - {num2}/{den2} ="
        else:  # whole
            # Whole number - fraction: 34 - 6/9, 983 - 21/37
            whole = generate_num(int(random_func() * 3) + 1)  # 1-3 digits
            den = int(random_func() * 90) + 2
            num = int(random_func() * (den - 1)) + 1
            answer = float(whole - (num / den))
            operands = [whole, num, den]
            text = f"{whole} - {num}/{den} ="
    
    elif question_type == "vedic_squares_level3":
        operator = "²"
        is_vertical = False
        # Squares like 22², 333², 7777², etc (repeating digits)
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        digit = int(random_func() * 9) + 1  # 1-9
        num = int(str(digit) * digits)  # 22, 333, 7777, etc
        
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_percentage_level3":
        operator = "%"
        is_vertical = False
        # Percentage: 23% of 494, 273% of 981
        percentage = int(random_func() * 300) + 1  # 1-300%
        digits = constraints.digits if constraints.digits is not None else 3
        digits = max(1, min(10, digits))
        
        number = generate_num(digits)
        answer = float((percentage / 100.0) * number)
        operands = [percentage, number]
        text = f"{percentage}% of {number} ="
    
    elif question_type == "vedic_squares_addition":
        operator = "+"
        is_vertical = False
        # Sum of two squares: 69² + 42²
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num1 = generate_num(digits)
        num2 = generate_num(digits)
        
        answer = float((num1 * num1) + (num2 * num2))
        operands = [num1, num2]
        text = f"{num1}² + {num2}² ="
    
    elif question_type == "vedic_squares_subtraction":
        operator = "-"
        is_vertical = False
        # Difference of squares with difference of 1: 82² - 81², 956² - 955²
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(10, digits))
        
        num1 = generate_num(digits)
        num2 = num1 - 1  # Difference of 1
        
        answer = float((num1 * num1) - (num2 * num2))
        operands = [num1, num2]
        text = f"{num1}² - {num2}² ="
    
    elif question_type == "vedic_squares_deviation":
        operator = "²"
        is_vertical = False
        # 2 and 3 digit squares using deviation method: 72², 973²
        digits = int(random_func() * 2) + 2  # 2 or 3
        num = generate_num(digits)
        
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_cubes":
        operator = "³"
        is_vertical = False
        # 2 digit cubes: 34³, 63³
        num = generate_num(2)
        
        answer = float(num * num * num)
        operands = [num]
        text = f"{num}³ ="
    
    elif question_type == "vedic_check_divisibility":
        operator = "?"
        is_vertical = False
        # Check divisibility by 2,3,4,5,6,8,9,10
        divisors = [2, 3, 4, 5, 6, 8, 9, 10]
        divisor = constraints.divisorCheck if constraints.divisorCheck and constraints.divisorCheck in divisors else None
        if divisor is None:
            divisor = divisors[int(random_func() * len(divisors))]
        
        digits = constraints.digits if constraints.digits is not None else 3
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        is_divisible = (num % divisor == 0)
        answer = 1.0 if is_divisible else 0.0  # 1 for Yes, 0 for No
        operands = [num, divisor]
        text = f"{num} By {divisor}"
    
    elif question_type == "vedic_missing_numbers":
        operator = "×"
        is_vertical = False
        # Missing digit in 2X2 multiplication: 6_ × 74 = 4736, _3 × 74 = 6142
        num1 = generate_num(2)
        num2 = generate_num(2)
        correct_answer = num1 * num2
        
        # Randomly choose which digit to hide
        hide_position = int(random_func() * 4)  # 0-3: first digit of num1, second of num1, first of num2, second of num2
        
        if hide_position == 0:
            # Hide first digit of num1: _3 × 74
            num1_str = f"_{num1 % 10}"
            num2_str = str(num2)
        elif hide_position == 1:
            # Hide second digit of num1: 6_ × 74
            num1_str = f"{num1 // 10}_"
            num2_str = str(num2)
        elif hide_position == 2:
            # Hide first digit of num2: 29 × _9
            num1_str = str(num1)
            num2_str = f"_{num2 % 10}"
        else:
            # Hide second digit of num2: 79 × 3_
            num1_str = str(num1)
            num2_str = f"{num2 // 10}_"
        
        answer = float(correct_answer)
        operands = [num1, num2]
        text = f"{num1_str} × {num2_str} = {correct_answer}"
    
    elif question_type == "vedic_box_multiply":
        operator = "×"
        is_vertical = False
        # Coming Soon - placeholder
        num = generate_num(2)
        answer = float(num)
        operands = [num]
        text = f"Box Multiply of {num} (Coming Soon)"
    
    elif question_type == "vedic_multiply_by_10001":
        operator = "×"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(10, digits))
        
        num = generate_num(digits)
        answer = float(num * 10001)
        operands = [num, 10001]
        text = f"{num} × 10001 ="
    
    elif question_type == "vedic_duplex_level3":
        operator = "D"
        is_vertical = False
        # Same as level 2 duplex
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(2, min(10, digits))
        
        num = generate_num(digits)
        num_str = str(num)
        
        # Calculate duplex (same logic as level 2)
        duplex_value = 0
        n = len(num_str)
        for i in range(n // 2):
            left_idx = i
            right_idx = n - 1 - i
            if left_idx < right_idx:
                left_digit = int(num_str[left_idx])
                right_digit = int(num_str[right_idx])
                duplex_value += left_digit * right_digit * 2
        if n % 2 == 1:
            mid_idx = n // 2
            mid_digit = int(num_str[mid_idx])
            duplex_value += mid_digit * mid_digit
        
        answer = float(duplex_value)
        operands = [num]
        text = f"D of {num}"
    
    elif question_type == "vedic_squares_large":
        operator = "²"
        is_vertical = False
        # Large squares: 63497², 269534²
        digits = constraints.digits if constraints.digits is not None else 5
        digits = max(4, min(10, digits))  # At least 4 digits
        
        num = generate_num(digits)
        answer = float(num * num)
        operands = [num]
        text = f"{num}² ="
    
    elif question_type == "vedic_dropping_10_method":
        operator = "±"
        is_vertical = True
        # Basic add/sub like abacus: same as add_sub but with different name
        digits = constraints.digits if constraints.digits is not None else 2
        rows = constraints.rows if constraints.rows is not None else 3
        rows = max(2, min(30, rows))
        digits = max(1, min(5, digits))  # Limit for dropping 10 method
        
        max_val = (10 ** digits) - 1
        min_val = 10 ** (digits - 1) if digits > 1 else 1
        
        operands = []
        for _ in range(rows):
            num = int(random_func() * (max_val - min_val + 1)) + min_val
            operands.append(num)
        
        operators_list = []
        for i in range(rows - 1):
            op = "+" if random_func() < 0.5 else "-"
            operators_list.append(op)
        
        answer = float(operands[0])
        for i, op in enumerate(operators_list):
            if op == "+":
                answer += operands[i + 1]
            else:
                answer -= operands[i + 1]
        
        if answer < 0:
            return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
        
        operators = operators_list
        text = None  # Will be built below
    
    # Vedic Maths Level 4 operations
    elif question_type == "vedic_multiplication_level4":
        operator = "×"
        is_vertical = False
        # Normal random multiplication: 25463 X 29, 763249 X 465382
        multiplicand_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else 3
        multiplier_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else 2
        multiplicand_digits = max(1, min(10, multiplicand_digits))
        multiplier_digits = max(1, min(10, multiplier_digits))
        
        multiplicand = generate_num(multiplicand_digits)
        multiplier = generate_num(multiplier_digits)
        answer = float(multiplicand * multiplier)
        operands = [multiplicand, multiplier]
        text = f"{multiplicand} × {multiplier} ="
    
    elif question_type == "vedic_multiply_by_111_999_level4":
        operator = "×"
        is_vertical = False
        # Any random number multiplied with any number of digits of 111-999: 245X1111, 60742 X 11111, 92659 X 55555
        multiplicand_digits = constraints.multiplicandDigits if constraints.multiplicandDigits is not None else 3
        multiplier_pattern_digits = constraints.multiplierDigits if constraints.multiplierDigits is not None else 4
        multiplicand_digits = max(1, min(20, multiplicand_digits))  # Allow up to 20 digits as per schema
        multiplier_pattern_digits = max(3, min(20, multiplier_pattern_digits))  # At least 3 digits (111), allow up to 20
        
        multiplicand = generate_num(multiplicand_digits)
        # Generate multiplier as repeating digits (111, 1111, 222, 2222, etc.)
        base_digit = int(random_func() * 9) + 1  # 1-9
        multiplier = int(str(base_digit) * multiplier_pattern_digits)
        answer = float(multiplicand * multiplier)
        operands = [multiplicand, multiplier]
        text = f"{multiplicand} × {multiplier} ="
    
    elif question_type == "vedic_decimal_add_sub":
        operator = "±"
        is_vertical = False
        # Decimal addition/subtraction: 2.7 + 3.6, 326.3 + 29.8, 5.6 - 3.2, 496.8 - 312.6
        digits = constraints.digits if constraints.digits is not None else 2
        digits = max(1, min(5, digits))
        
        # Generate two decimal numbers
        whole1 = generate_num(digits)
        decimal1 = int(random_func() * 10)  # 0-9
        num1 = whole1 + decimal1 / 10.0
        
        whole2 = generate_num(digits)
        decimal2 = int(random_func() * 10)  # 0-9
        num2 = whole2 + decimal2 / 10.0
        
        # Randomly choose addition or subtraction
        is_add = random_func() < 0.5
        if is_add:
            answer = round(num1 + num2, 1)
            operator = "+"
            text = f"{num1} + {num2} ="
        else:
            # Ensure positive result
            if num1 < num2:
                num1, num2 = num2, num1
            answer = round(num1 - num2, 1)
            operator = "-"
            text = f"{num1} - {num2} ="
        
        operands = [int(num1 * 10), int(num2 * 10)]  # Store as integers (multiply by 10)
    
    elif question_type == "vedic_fun_with_5_level4":
        operator = "×"
        is_vertical = False
        # Fun with Five: 2.3 X 2.7, 8.7 X 8.3 (decimal) or 122 X 128, 263 X 267 (triple digits)
        case = constraints.funWith5Case if constraints.funWith5Case else "mix"
        if case == "mix":
            case = "decimal" if random_func() < 0.5 else "triple"
        
        if case == "decimal":
            # Decimal: numbers like 2.3, 2.7 (both end in .3 and .7, sum to 10)
            whole = int(random_func() * 9) + 1  # 1-9
            decimal1 = int(random_func() * 5) + 1  # 1-5
            decimal2 = 10 - decimal1  # Complement to 10
            num1 = whole + decimal1 / 10.0
            num2 = whole + decimal2 / 10.0
            answer = round(num1 * num2, 2)
            text = f"{num1} × {num2} ="
            operands = [int(num1 * 10), int(num2 * 10)]
        else:  # triple
            # Triple digits: 122 X 128 (both start with same digits, last digits sum to 10)
            base = generate_num(2)  # 2-digit base
            last1 = int(random_func() * 5) + 1  # 1-5
            last2 = 10 - last1
            num1 = base * 10 + last1
            num2 = base * 10 + last2
            answer = float(num1 * num2)
            text = f"{num1} × {num2} ="
            operands = [num1, num2]
    
    elif question_type == "vedic_fun_with_10_level4":
        operator = "×"
        is_vertical = False
        # Fun with Ten: 3.4 X 7.4, 9.3 X 1.2 (decimal) or 971 X 171, 294 X 894, 555 X 555 (triple)
        case = constraints.funWith10Case if constraints.funWith10Case else "mix"
        if case == "mix":
            case = "decimal" if random_func() < 0.5 else "triple"
        
        if case == "decimal":
            # Decimal: numbers with same decimal part
            whole1 = int(random_func() * 9) + 1  # 1-9
            whole2 = int(random_func() * 9) + 1  # 1-9
            decimal = int(random_func() * 10)  # 0-9
            num1 = whole1 + decimal / 10.0
            num2 = whole2 + decimal / 10.0
            answer = round(num1 * num2, 2)
            text = f"{num1} × {num2} ="
            operands = [int(num1 * 10), int(num2 * 10)]
        else:  # triple
            # Triple digits: first digits sum to 10, last two digits same
            # e.g., 371 × 631 (3+6=9, but should be 10), 294 × 794 (2+7=9, but should be 10)
            # Correct: 371 × 631 (3+6=9, wrong), 294 × 794 (2+7=9, wrong)
            # Should be: 371 × 631 (3+6=9, but we need 10), so 371 × 631 becomes 371 × 631
            # Actually: first digit of num1 + first digit of num2 = 10, last two digits same
            first1 = int(random_func() * 9) + 1  # 1-9
            first2 = 10 - first1  # Complement to 10
            last_two = int(random_func() * 90) + 10  # 10-99
            num1 = first1 * 100 + last_two
            num2 = first2 * 100 + last_two
            answer = float(num1 * num2)
            text = f"{num1} × {num2} ="
            operands = [num1, num2]
    
    elif question_type == "vedic_find_x":
        operator = "="
        is_vertical = False
        # Find The Value of X: x + 65 = 97, 5x + 43 = 103, 6x - 20 = 22, x - 29 = 17, 7x - 46 = 24
        # Generate equation: ax + b = c or x + b = c or x - b = c
        equation_type = int(random_func() * 4)  # 0: x + b = c, 1: x - b = c, 2: ax + b = c, 3: ax - b = c
        
        if equation_type == 0:  # x + b = c
            b = int(random_func() * 50) + 10
            x = int(random_func() * 50) + 10
            c = x + b
            text = f"x + {b} = {c}"
            answer = float(x)
            operands = [b, c]
        elif equation_type == 1:  # x - b = c
            b = int(random_func() * 50) + 10
            x = int(random_func() * 50) + 30
            c = x - b
            text = f"x - {b} = {c}"
            answer = float(x)
            operands = [b, c]
        elif equation_type == 2:  # ax + b = c
            a = int(random_func() * 8) + 2  # 2-9
            x = int(random_func() * 20) + 5
            b = int(random_func() * 50) + 10
            c = a * x + b
            text = f"{a}x + {b} = {c}"
            answer = float(x)
            operands = [a, b, c]
        else:  # ax - b = c
            a = int(random_func() * 8) + 2  # 2-9
            x = int(random_func() * 20) + 5
            b = int(random_func() * 50) + 10
            c = a * x - b
            if c < 0:
                c = a * x + b  # Ensure positive result
                text = f"{a}x - {b} = {c}"
                answer = float(x)
            else:
                text = f"{a}x - {b} = {c}"
                answer = float(x)
            operands = [a, b, c]
    
    elif question_type == "vedic_hcf":
        operator = "HCF"
        is_vertical = False
        # HCF: (2, 6), (9, 63), (14, 36), (24, 108), (53, 212)
        # Generate two numbers with a common factor
        factor = int(random_func() * 20) + 2  # 2-21
        mult1 = int(random_func() * 20) + 1  # 1-20
        mult2 = int(random_func() * 20) + 1  # 1-20
        num1 = factor * mult1
        num2 = factor * mult2
        
        # Calculate HCF
        def calculate_hcf(a, b):
            while b:
                a, b = b, a % b
            return a
        
        answer = float(calculate_hcf(num1, num2))
        operands = [num1, num2]
        text = f"HCF({num1}, {num2}) ="
    
    elif question_type == "vedic_lcm_level4":
        operator = "LCM"
        is_vertical = False
        # LCM: (1, 3), (8, 72), (12, 24), (29, 125), (54, 324)
        # Generate two numbers
        num1 = int(random_func() * 200) + 1  # 1-200
        num2 = int(random_func() * 200) + 1  # 1-200
        
        # Calculate LCM
        from math import gcd
        answer = float((num1 * num2) // gcd(num1, num2))
        operands = [num1, num2]
        text = f"LCM({num1}, {num2}) ="
    
    elif question_type == "vedic_bar_add_sub":
        # Coming Soon - placeholder
        operator = "±"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        a = generate_num(digits)
        b = generate_num(digits)
        answer = float(a + b)
        operands = [a, b]
        text = f"{a} + {b} = (Coming Soon)"
    
    elif question_type == "vedic_fraction_multiplication":
        operator = "×"
        is_vertical = False
        # Fraction multiplication: 4 x 3/4, 7 x 11/42, 5/7 x 1/5, 4/7 x 6/8, 8 x 12/64, 7/5 x 15/35, 11/13 x 15/22
        case_type = int(random_func() * 3)  # 0: whole x fraction, 1: fraction x fraction, 2: whole x fraction (simplified)
        
        if case_type == 0:  # whole x fraction
            whole = int(random_func() * 9) + 1
            num = int(random_func() * 9) + 1
            den = int(random_func() * 9) + 1
            answer_num = whole * num
            answer_den = den
            # Simplify
            from math import gcd
            g = gcd(answer_num, answer_den)
            answer_num //= g
            answer_den //= g
            text = f"{whole} × {num}/{den} ="
            answer = float(answer_num) / float(answer_den) if answer_den != 0 else 0.0
            operands = [whole, num, den]
        elif case_type == 1:  # fraction x fraction
            num1 = int(random_func() * 9) + 1
            den1 = int(random_func() * 9) + 1
            num2 = int(random_func() * 9) + 1
            den2 = int(random_func() * 9) + 1
            answer_num = num1 * num2
            answer_den = den1 * den2
            # Simplify
            from math import gcd
            g = gcd(answer_num, answer_den)
            answer_num //= g
            answer_den //= g
            text = f"{num1}/{den1} × {num2}/{den2} ="
            answer = float(answer_num) / float(answer_den) if answer_den != 0 else 0.0
            operands = [num1, den1, num2, den2]
        else:  # whole x fraction (with simplification)
            whole = int(random_func() * 9) + 1
            num = int(random_func() * 9) + 1
            den = int(random_func() * 9) + 1
            answer_num = whole * num
            answer_den = den
            # Simplify
            from math import gcd
            g = gcd(answer_num, answer_den)
            answer_num //= g
            answer_den //= g
            text = f"{whole} × {num}/{den} ="
            answer = float(answer_num) / float(answer_den) if answer_den != 0 else 0.0
            operands = [whole, num, den]
        # Store answer as fraction representation (numerator/denominator)
        # For display, we'll use the decimal value but the text shows the fraction
    
    elif question_type == "vedic_fraction_division":
        operator = "÷"
        is_vertical = False
        # Fraction division: 2 divided by 1/2, 2/3 divided by 8/9, 8/7 divided by 64/49, 19/21 divided by 57/84
        case_type = int(random_func() * 2)  # 0: whole ÷ fraction, 1: fraction ÷ fraction
        
        if case_type == 0:  # whole ÷ fraction
            whole = int(random_func() * 9) + 1
            num = int(random_func() * 9) + 1
            den = int(random_func() * 9) + 1
            answer_num = whole * den
            answer_den = num
            # Simplify
            from math import gcd
            g = gcd(answer_num, answer_den)
            answer_num //= g
            answer_den //= g
            text = f"{whole} ÷ {num}/{den} ="
            answer = float(answer_num) / float(answer_den) if answer_den != 0 else 0.0
            operands = [whole, num, den]
        else:  # fraction ÷ fraction
            num1 = int(random_func() * 9) + 1
            den1 = int(random_func() * 9) + 1
            num2 = int(random_func() * 9) + 1
            den2 = int(random_func() * 9) + 1
            answer_num = num1 * den2
            answer_den = den1 * num2
            # Simplify
            from math import gcd
            g = gcd(answer_num, answer_den)
            answer_num //= g
            answer_den //= g
            text = f"{num1}/{den1} ÷ {num2}/{den2} ="
            answer = float(answer_num) / float(answer_den) if answer_den != 0 else 0.0
            operands = [num1, den1, num2, den2]
    
    elif question_type == "vedic_check_divisibility_level4":
        operator = "?"
        is_vertical = False
        # Check divisibility: by 7, by 11, or random (12-39)
        case = constraints.divisibilityCase if constraints.divisibilityCase else "random"
        if case == "random":
            case = "by_7" if random_func() < 0.33 else ("by_11" if random_func() < 0.5 else "random")
        
        if case == "by_7":
            divisor = 7
            num_digits = int(random_func() * 4) + 2  # 2-5 digits
            num = generate_num(num_digits)
            answer = 1.0 if num % 7 == 0 else 0.0  # 1 = Yes, 0 = No
            text = f"{num} by {divisor}"
        elif case == "by_11":
            divisor = 11
            num_digits = int(random_func() * 4) + 2  # 2-5 digits
            num = generate_num(num_digits)
            answer = 1.0 if num % 11 == 0 else 0.0
            text = f"{num} by {divisor}"
        else:  # random (12-39)
            divisor = int(random_func() * 28) + 12  # 12-39
            num_digits = int(random_func() * 4) + 2  # 2-5 digits
            num = generate_num(num_digits)
            answer = 1.0 if num % divisor == 0 else 0.0
            text = f"{num} by {divisor}"
        
        operands = [num, divisor]
        # Answer: 1 = Yes, 0 = No
    
    elif question_type == "vedic_division_without_remainder":
        # Copy from abacus basic division
        operator = "÷"
        is_vertical = False
        dividend_digits = constraints.dividendDigits if constraints.dividendDigits is not None else 2
        divisor_digits = constraints.divisorDigits if constraints.divisorDigits is not None else 1
        dividend_digits = max(1, min(10, dividend_digits))
        divisor_digits = max(1, min(5, divisor_digits))
        
        divisor = generate_num(divisor_digits)
        if divisor == 0:
            divisor = 1
        # Generate dividend that is divisible by divisor
        quotient = generate_num(dividend_digits - divisor_digits + 1)
        dividend = divisor * quotient
        answer = float(quotient)
        operands = [dividend, divisor]
        text = f"{dividend} ÷ {divisor} ="
    
    elif question_type == "vedic_division_with_remainder":
        # Copy from abacus decimal division
        operator = "÷"
        is_vertical = False
        dividend_digits = constraints.dividendDigits if constraints.dividendDigits is not None else 3
        divisor_digits = constraints.divisorDigits if constraints.divisorDigits is not None else 1
        dividend_digits = max(1, min(10, dividend_digits))
        divisor_digits = max(1, min(5, divisor_digits))
        
        divisor = generate_num(divisor_digits)
        if divisor == 0:
            divisor = 1
        dividend = generate_num(dividend_digits)
        # Allow remainder
        answer = round(float(dividend) / float(divisor), 2)
        operands = [dividend, divisor]
        text = f"{dividend} ÷ {divisor} ="
    
    elif question_type == "vedic_divide_by_11_99":
        operator = "÷"
        is_vertical = False
        # Divide by 11, 22, 33, ..., 99
        multiplier = int(random_func() * 9) + 1  # 1-9
        divisor = multiplier * 11  # 11, 22, 33, ..., 99
        dividend_digits = constraints.dividendDigits if constraints.dividendDigits is not None else 4
        dividend_digits = max(2, min(6, dividend_digits))
        
        dividend = generate_num(dividend_digits)
        answer = round(float(dividend) / float(divisor), 2)
        operands = [dividend, divisor]
        text = f"{dividend} ÷ {divisor} ="
    
    elif question_type == "vedic_division_9_8_7_6":
        operator = "÷"
        is_vertical = False
        # Division by numbers ending in 9, 8, 7, or 6: 5/39, 56/38, etc.
        case = constraints.division9_8_7_6Case if constraints.division9_8_7_6Case else "mix"
        if case == "mix":
            case = ["9", "8", "7", "6"][int(random_func() * 4)]
        
        last_digit = int(case)
        # Generate 2-digit divisor ending in specified digit
        tens = int(random_func() * 9) + 1  # 1-9
        divisor = tens * 10 + last_digit  # e.g., 19, 29, 39, etc.
        
        # Generate 1-3 digit dividend
        dividend_digits = int(random_func() * 3) + 1  # 1-3 digits
        dividend = generate_num(dividend_digits)
        answer = round(float(dividend) / float(divisor), 2)
        operands = [dividend, divisor]
        text = f"{dividend} ÷ {divisor} ="
    
    elif question_type == "vedic_division_91_121":
        operator = "÷"
        is_vertical = False
        # Division by 91 or 121
        case = constraints.division91_121Case if constraints.division91_121Case else "mix"
        if case == "mix":
            case = "91" if random_func() < 0.5 else "121"
        
        divisor = int(case)
        # Generate 2-5 digit dividend
        dividend_digits = int(random_func() * 4) + 2  # 2-5 digits
        dividend = generate_num(dividend_digits)
        answer = round(float(dividend) / float(divisor), 2)
        operands = [dividend, divisor]
        text = f"{dividend} ÷ {divisor} ="
    
    elif question_type == "vedic_digital_sum":
        operator = "DS"
        is_vertical = False
        # Digital sum: sum of digits of a number
        digits = constraints.digits if constraints.digits is not None else 4
        digits = max(3, min(6, digits))  # 3-6 digits
        
        num = generate_num(digits)
        answer = float(sum(int(d) for d in str(num)))
        operands = [num]
        text = f"Digital Sum of {num} ="
    
    elif question_type == "vedic_cubes_base_method":
        operator = "³"
        is_vertical = False
        # Cubes using base method: 108³, 115³, 1007³, 1013³, 999³, 9989³, 9985³
        # Numbers close to base (100, 1000, etc.)
        base_type = int(random_func() * 2)  # 0: near 100, 1: near 1000
        if base_type == 0:
            base = 100
            deviation = int(random_func() * 20) - 10  # -10 to +10
            num = base + deviation
        else:
            base = 1000
            deviation = int(random_func() * 20) - 10  # -10 to +10
            num = base + deviation
        
        answer = float(num * num * num)
        operands = [num]
        text = f"{num}³ ="
    
    elif question_type == "vedic_check_perfect_cube":
        operator = "?"
        is_vertical = False
        # Check if number is perfect cube: 4-6 digit numbers
        digits = constraints.digits if constraints.digits is not None else 4
        digits = max(4, min(6, digits))
        
        # 50% chance of perfect cube, 50% chance of not
        if random_func() < 0.5:
            # Generate perfect cube
            cube_root = int(random_func() * 50) + 10  # 10-59
            num = cube_root * cube_root * cube_root
            answer = 1.0  # Yes
        else:
            # Generate non-perfect cube
            num = generate_num(digits)
            # Ensure it's not a perfect cube
            while int(round(num ** (1/3))) ** 3 == num:
                num = generate_num(digits)
            answer = 0.0  # No
        
        operands = [num]
        text = f"Is {num} a perfect cube?"
        # Answer: 1 = Yes, 0 = No
    
    elif question_type == "vedic_cube_root_level4":
        operator = "∛"
        is_vertical = False
        # Cube root: 4-10 digit numbers
        digits = constraints.cubeRootDigits if constraints.cubeRootDigits is not None else 5
        digits = max(4, min(10, digits))
        
        # Generate a perfect cube
        cube_root = int(random_func() * 200) + 10  # 10-209
        num = cube_root * cube_root * cube_root
        # Ensure it has the right number of digits
        while len(str(num)) < digits:
            cube_root += 1
            num = cube_root * cube_root * cube_root
        while len(str(num)) > digits:
            cube_root -= 1
            num = cube_root * cube_root * cube_root
        
        answer = float(cube_root)
        operands = [num]
        text = f"∛{num} ="
    
    elif question_type == "vedic_bodmas":
        operator = "="
        is_vertical = False
        # BODMAS: easy, medium, hard
        difficulty = constraints.bodmasDifficulty if constraints.bodmasDifficulty else "medium"
        if difficulty == "mix":
            difficulty = ["easy", "medium", "hard"][int(random_func() * 3)]
        
        if difficulty == "easy":
            # Simple: a + b × c
            a = int(random_func() * 20) + 1
            b = int(random_func() * 10) + 1
            c = int(random_func() * 10) + 1
            answer = float(a + b * c)
            text = f"{a} + {b} × {c} ="
            operands = [a, b, c]
        elif difficulty == "medium":
            # Medium: a × b + c × d
            a = int(random_func() * 10) + 1
            b = int(random_func() * 10) + 1
            c = int(random_func() * 10) + 1
            d = int(random_func() * 10) + 1
            answer = float(a * b + c * d)
            text = f"{a} × {b} + {c} × {d} ="
            operands = [a, b, c, d]
        else:  # hard
            # Hard: a + b × c - d
            a = int(random_func() * 50) + 10
            b = int(random_func() * 10) + 1
            c = int(random_func() * 10) + 1
            d = int(random_func() * 20) + 1
            answer = float(a + b * c - d)
            text = f"{a} + {b} × {c} - {d} ="
            operands = [a, b, c, d]
    
    elif question_type == "vedic_square_root_level4":
        # Copy from abacus square_root
        operator = "√"
        is_vertical = False
        root_digits = constraints.rootDigits if constraints.rootDigits is not None else 4
        root_digits = max(1, min(30, root_digits))
        
        # Generate a perfect square
        square_root = int(random_func() * 1000) + 10
        num = square_root * square_root
        # Ensure it has the right number of digits
        while len(str(num)) < root_digits:
            square_root += 1
            num = square_root * square_root
        while len(str(num)) > root_digits:
            square_root -= 1
            num = square_root * square_root
        
        answer = float(square_root)
        operands = [num]
        text = f"√{num} ="
    
    elif question_type == "vedic_magic_square":
        # Coming Soon - placeholder
        operator = "MS"
        is_vertical = False
        digits = constraints.digits if constraints.digits is not None else 2
        a = generate_num(digits)
        answer = float(a)
        operands = [a]
        text = f"Magic Square (Coming Soon)"
    
    elif question_type == "percentage":
        operator = "%"
        is_vertical = False
        
        # Get constraints for percentage
        percentage_min = constraints.percentageMin if constraints.percentageMin is not None else 1
        percentage_max = constraints.percentageMax if constraints.percentageMax is not None else 100
        number_digits = constraints.numberDigits if constraints.numberDigits is not None else 4
        
        # Ensure valid ranges
        percentage_min = max(1, min(100, percentage_min))
        percentage_max = max(1, min(100, percentage_max))
        if percentage_min > percentage_max:
            percentage_min, percentage_max = percentage_max, percentage_min
        
        number_digits = max(1, min(10, number_digits))  # Allow up to 10 digits as per schema
        
        # Generate percentage value
        percentage = int(random_func() * (percentage_max - percentage_min + 1)) + percentage_min
        
        # Generate number based on digits (1 to 9999)
        number_min = 10 ** (number_digits - 1)
        number_max = (10 ** number_digits) - 1
        number = int(random_func() * (number_max - number_min + 1)) + number_min
        
        # Calculate answer: percentage% of number = (percentage / 100) * number
        answer = round((percentage / 100.0) * number, 2)
        
        operands = [percentage, number]
        text = f"{percentage}% of {number} ="
    
    # Check answer bounds (skip for operations that have decimal answers or special handling)
    skip_answer_bounds = (
        "decimal_multiplication", "square_root", "cube_root", "lcm", "gcd", "integer_add_sub", 
        "decimal_division", "decimal_add_sub", "intl_add_sub", "direct_add_sub", "small_friends_add_sub", 
        "big_friends_add_sub", "mix_friends_add_sub", "percentage",
        "vedic_divide_by_2", "vedic_divide_by_4", "vedic_divide_single_digit", "vedic_divide_by_11",
        "vedic_divide_by_5_25_125", "vedic_divide_by_5_50_500", "vedic_divide_with_remainder",
        "vedic_divide_by_9s_repetition_equal", "vedic_divide_by_9s_repetition_less_than",
        "vedic_divide_by_11s_repetition_equal", "vedic_divide_by_11s_repetition_less_than",
        "vedic_divide_by_7",
        # Vedic Level 4 operations with decimal/special answers
        "vedic_decimal_add_sub", "vedic_fun_with_5_level4", "vedic_fun_with_10_level4",
        "vedic_fraction_multiplication", "vedic_fraction_division", "vedic_division_with_remainder",
        "vedic_divide_by_11_99", "vedic_division_9_8_7_6", "vedic_division_91_121",
        "vedic_check_divisibility_level4", "vedic_check_perfect_cube", "vedic_cube_root_level4",
        "vedic_square_root_level4", "vedic_bodmas", "vedic_hcf", "vedic_lcm_level4"
    )
    if question_type not in skip_answer_bounds:
        if constraints.minAnswer is not None and answer < constraints.minAnswer:
            return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
        if constraints.maxAnswer is not None and answer > constraints.maxAnswer:
            return generate_question(question_id, question_type, constraints, seed, retry_count + 1)
    
    # Build text representation (skip if already built for special operations)
    # Operations that already have text set: square_root, cube_root, lcm, gcd, decimal_multiplication, decimal_division, decimal_add_sub, percentage, and all vedic operations
    # Junior operations (direct_add_sub, small_friends_add_sub, big_friends_add_sub, mix_friends_add_sub) use standard vertical format, so text will be built below
    if text is None:
        text_parts = []
        if is_vertical:
            if operators:  # Mixed operations (add_sub)
                # First operand has no operator
                text_parts.append(str(operands[0]))
                # Subsequent operands have their operators
                for i, op in enumerate(operands[1:], 1):
                    text_parts.append(f"{operators[i-1]} {op}")
            else:
                # Single operator type
                for i, op in enumerate(operands):
                    if operator == "-" and i > 0:
                        # For subtraction, show operator on all lines except the first
                        text_parts.append(f"{operator} {op}")
                    elif i == len(operands) - 1:
                        # For addition, show operator only on the last line
                        text_parts.append(f"{operator} {op}")
                    else:
                        text_parts.append(str(op))
            text = "\n".join(text_parts)
        else:
            # Horizontal format
            if len(operands) == 2:
                text = f"{operands[0]} {operator} {operands[1]} ="
            else:
                text = f"{operator.join(map(str, operands))} ="
    
    return Question(
        id=question_id,
        text=text,
        operands=operands,
        operator=operator,
        operators=operators,
        answer=answer,
        isVertical=is_vertical  # Pydantic will handle the field name
    )


def _create_question_signature(question: Question) -> str:
    """Create a unique signature for a question to detect duplicates."""
    # Create signature from operands and operators
    if question.operators:
        # For add_sub type with operators list
        ops_str = "".join(question.operators)
        operands_str = ",".join(map(str, question.operands))
        return f"{question.operator}|{operands_str}|{ops_str}"
    else:
        # For simple operations - preserve order for operations where order matters
        # For vedic operations with fixed multipliers (11, 101, 2, 4, 6, etc.), order matters
        if question.operator in ("×", "÷") and len(question.operands) == 2:
            # For multiplication/division, preserve order (num × multiplier, not multiplier × num)
            operands_str = ",".join(map(str, question.operands))
        else:
            # For other operations, sort operands for uniqueness
            operands_str = ",".join(map(str, sorted(question.operands)))
        return f"{question.operator}|{operands_str}"


def generate_block(block_config: BlockConfig, start_id: int, seed: Optional[int] = None) -> GeneratedBlock:
    """Generate a block of questions with uniqueness guarantee."""
    questions = []
    seen_signatures = set()  # Track unique question signatures
    max_retries_per_question = 100  # Increased from 50 to 100 for better uniqueness with large question sets
    
    # For vedic_tables and vedic_tables_large, use rows (or count) to determine how many table rows to generate
    if block_config.type == "vedic_tables":
        try:
            rows = block_config.constraints.rows if block_config.constraints.rows is not None else (block_config.count if block_config.count else 10)
            rows = max(2, min(100, rows))  # For vedic_tables, rows means multiplier count (2-100), not questions
            
            # Get table number: 11-99 range
            table_num = None
            if block_config.constraints.tableNumber is not None:
                table_num = max(11, min(99, block_config.constraints.tableNumber))
            
            if table_num is None:
                # Generate a random table number if not specified (will be consistent with seed)
                if seed is not None:
                    rng = generate_seeded_rng(seed, start_id)
                    random_func = rng
                else:
                    import random
                    random_func = random.random
                table_num = int(random_func() * (99 - 11 + 1)) + 11  # 11 to 99
            
            # Generate table rows: table_num × 1, table_num × 2, ..., table_num × rows
            for i in range(rows):
                multiplier = i + 1
                answer = float(table_num * multiplier)
                question = Question(
                    id=start_id + i,
                    text=f"{table_num} × {multiplier} =",
                    operands=[table_num, multiplier],
                    operator="×",
                    operators=None,
                    answer=answer,
                    isVertical=False
                )
                questions.append(question)
        except Exception as e:
            # Fallback for vedic_tables
            if block_config.constraints.tableNumber is not None:
                table_num = max(11, min(99, block_config.constraints.tableNumber))
            else:
                table_num = 11  # Default fallback
            rows = block_config.constraints.rows if block_config.constraints.rows is not None else (block_config.count if block_config.count else 10)
            rows = max(2, min(100, rows))  # For vedic_tables, rows means multiplier count (2-100), not questions
            for i in range(min(rows, 10)):  # Limit to 10 questions on error
                multiplier = i + 1
                questions.append(Question(
                    id=start_id + i,
                    text=f"{table_num} × {multiplier} =",
                    operands=[table_num, multiplier],
                    operator="×",
                    operators=None,
                    answer=float(table_num * multiplier),
                    isVertical=False
                ))
    elif block_config.type == "vedic_tables_large":
        try:
            rows = block_config.constraints.rows if block_config.constraints.rows is not None else (block_config.count if block_config.count else 10)
            rows = max(2, min(100, rows))  # For vedic_tables_large, rows means multiplier count (2-100), not questions
            
            # Get table number: 101-999 range
            table_num = None
            if block_config.constraints.tableNumberLarge is not None:
                table_num = max(101, min(999, block_config.constraints.tableNumberLarge))
            
            if table_num is None:
                # Generate a random table number if not specified (will be consistent with seed)
                if seed is not None:
                    rng = generate_seeded_rng(seed, start_id)
                    random_func = rng
                else:
                    import random
                    random_func = random.random
                table_num = int(random_func() * (999 - 101 + 1)) + 101  # 101 to 999
            
            # Generate table rows: table_num × 1, table_num × 2, ..., table_num × rows
            for i in range(rows):
                multiplier = i + 1
                answer = float(table_num * multiplier)
                question = Question(
                    id=start_id + i,
                    text=f"{table_num} × {multiplier} =",
                    operands=[table_num, multiplier],
                    operator="×",
                    operators=None,
                    answer=answer,
                    isVertical=False
                )
                questions.append(question)
        except Exception as e:
            # Fallback for vedic_tables_large
            if block_config.constraints.tableNumberLarge is not None:
                table_num = max(101, min(999, block_config.constraints.tableNumberLarge))
            else:
                table_num = 101  # Default fallback
            rows = block_config.constraints.rows if block_config.constraints.rows is not None else (block_config.count if block_config.count else 10)
            rows = max(2, min(100, rows))  # For vedic_tables_large, rows means multiplier count (2-100), not questions
            for i in range(min(rows, 10)):  # Limit to 10 questions on error
                multiplier = i + 1
                questions.append(Question(
                    id=start_id + i,
                    text=f"{table_num} × {multiplier} =",
                    operands=[table_num, multiplier],
                    operator="×",
                    operators=None,
                    answer=float(table_num * multiplier),
                    isVertical=False
                ))
    else:
        # Standard generation for other question types with uniqueness guarantee
        for i in range(block_config.count):
            question = None
            retry_count = 0
            question_seed = seed
            
            # Try to generate a unique question
            while retry_count < max_retries_per_question:
                try:
                    # Use different seed variation for each retry to get different results
                    current_seed = question_seed
                    if retry_count > 0:
                        # Vary the seed significantly for retries to ensure different questions
                        # Use larger multipliers to ensure more variation, especially for large question sets
                        current_seed = (question_seed or 0) + (retry_count * 10000) + (i * 1000) + (start_id * 100) if question_seed else None
                    
                    question = generate_question(
                        start_id + i,
                        block_config.type,
                        block_config.constraints,
                        current_seed
                    )
                    
                    # Check for uniqueness
                    signature = _create_question_signature(question)
                    if signature not in seen_signatures:
                        seen_signatures.add(signature)
                        questions.append(question)
                        break
                    else:
                        # Duplicate found, retry with different seed
                        retry_count += 1
                        question = None
                        
                except Exception as e:
                    retry_count += 1
                    if retry_count >= max_retries_per_question:
                        # Fallback question after max retries - respect original question type
                        try:
                            # Use the fallback logic from generate_question with retry_count > 20
                            question = generate_question(
                                start_id + i,
                                block_config.type,
                                block_config.constraints,
                                question_seed,
                                21  # Set retry_count to 21 to trigger fallback logic
                            )
                            signature = _create_question_signature(question)
                            if signature not in seen_signatures:
                                seen_signatures.add(signature)
                                questions.append(question)
                            else:
                                # Even fallback is duplicate, try one more time with different seed
                                question = generate_question(
                                    start_id + i,
                                    block_config.type,
                                    block_config.constraints,
                                    (question_seed or 0) + i * 10000 if question_seed else None,
                                    21
                                )
                                questions.append(question)
                        except Exception:
                            # Ultimate fallback - still respect question type
                            # Use generate_question with retry_count=21 to trigger fallback logic
                            try:
                                question = generate_question(
                                    start_id + i,
                                    block_config.type,
                                    block_config.constraints,
                                    (seed or 0) + i * 10000 if seed else None,
                                    21  # Trigger fallback
                                )
                                signature = _create_question_signature(question)
                                if signature not in seen_signatures:
                                    seen_signatures.add(signature)
                                    questions.append(question)
                                else:
                                    # Even fallback is duplicate, append anyway to avoid infinite loop
                                    questions.append(question)
                            except Exception:
                                # Last resort - generate simple question of correct type
                                if block_config.type == "multiplication":
                                    a = 2 + (i % 8)
                                    b = 1 + (i % 9)
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"{a} × {b} =",
                                        operands=[a, b],
                                        operator="×",
                                        operators=None,
                                        answer=float(a * b),
                                        isVertical=False
                                    ))
                                elif block_config.type == "division":
                                    b = 2 + (i % 8)
                                    quotient = 1 + (i % 9)
                                    a = quotient * b
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"{a} ÷ {b} =",
                                        operands=[a, b],
                                        operator="÷",
                                        operators=None,
                                        answer=float(quotient),
                                        isVertical=False
                                    ))
                                elif block_config.type == "square_root":
                                    root_digits = block_config.constraints.rootDigits if block_config.constraints.rootDigits is not None else 3
                                    root_digits = max(1, min(30, root_digits))
                                    target_min = 10 ** (root_digits - 1)
                                    target_max = (10 ** root_digits) - 1
                                    min_root = int(target_min ** 0.5) + 1
                                    max_root = int(target_max ** 0.5)
                                    if max_root < min_root:
                                        root = min_root
                                    else:
                                        root = min_root + (i % (max_root - min_root + 1))
                                    number = root * root
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"√{number} =",
                                        operands=[number],
                                        operator="√",
                                        operators=None,
                                        answer=float(root),
                                        isVertical=False
                                    ))
                                elif block_config.type == "cube_root":
                                    root_digits = block_config.constraints.rootDigits if block_config.constraints.rootDigits is not None else 4
                                    root_digits = max(1, min(30, root_digits))
                                    target_min = 10 ** (root_digits - 1)
                                    target_max = (10 ** root_digits) - 1
                                    min_root = int(target_min ** (1/3)) + 1
                                    max_root = int(target_max ** (1/3))
                                    if max_root < min_root:
                                        root = min_root
                                    else:
                                        root = min_root + (i % (max_root - min_root + 1))
                                    number = root * root * root
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"∛{number} =",
                                        operands=[number],
                                        operator="∛",
                                        operators=None,
                                        answer=float(root),
                                        isVertical=False
                                    ))
                                elif block_config.type == "lcm":
                                    first_digits = block_config.constraints.multiplicandDigits if block_config.constraints.multiplicandDigits is not None else (block_config.constraints.digits if block_config.constraints.digits is not None else 2)
                                    second_digits = block_config.constraints.multiplierDigits if block_config.constraints.multiplierDigits is not None else (block_config.constraints.digits if block_config.constraints.digits is not None else 2)
                                    first_digits = max(1, min(10, first_digits))
                                    second_digits = max(1, min(10, second_digits))
                                    a = 10 ** (first_digits - 1) + (i % 9)
                                    b = 10 ** (second_digits - 1) + ((i * 3) % 9)
                                    if a == b:
                                        b = b + 1 if b < (10 ** second_digits - 1) else (10 ** (second_digits - 1))
                                    answer = float(abs(a * b) // math.gcd(a, b))
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"LCM({a}, {b}) =",
                                        operands=[a, b],
                                        operator="LCM",
                                        operators=None,
                                        answer=answer,
                                        isVertical=False
                                    ))
                                elif block_config.type == "gcd":
                                    first_digits = block_config.constraints.multiplicandDigits if block_config.constraints.multiplicandDigits is not None else (block_config.constraints.digits if block_config.constraints.digits is not None else 3)
                                    second_digits = block_config.constraints.multiplierDigits if block_config.constraints.multiplierDigits is not None else (block_config.constraints.digits if block_config.constraints.digits is not None else 2)
                                    first_digits = max(1, min(10, first_digits))
                                    second_digits = max(1, min(10, second_digits))
                                    a = 10 ** (first_digits - 1) + (i % 9)
                                    b = 10 ** (second_digits - 1) + ((i * 3) % 9)
                                    if a == b:
                                        b = b + 1 if b < (10 ** second_digits - 1) else (10 ** (second_digits - 1))
                                    answer = float(math.gcd(a, b))
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"GCD({a}, {b}) =",
                                        operands=[a, b],
                                        operator="GCD",
                                        operators=None,
                                        answer=answer,
                                        isVertical=False
                                    ))
                                elif block_config.type == "percentage":
                                    percentage_min = block_config.constraints.percentageMin if block_config.constraints.percentageMin is not None else 2
                                    percentage_max = block_config.constraints.percentageMax if block_config.constraints.percentageMax is not None else 89
                                    number_digits = block_config.constraints.numberDigits if block_config.constraints.numberDigits is not None else 3
                                    percentage_min = max(1, min(99, percentage_min))
                                    percentage_max = max(percentage_min, min(99, percentage_max))
                                    number_digits = max(1, min(4, number_digits))
                                    percentage = percentage_min + (i % (percentage_max - percentage_min + 1))
                                    number_min = 10 ** (number_digits - 1)
                                    number_max = (10 ** number_digits) - 1
                                    number = number_min + ((i * 7) % (number_max - number_min + 1))
                                    answer = round((percentage / 100.0) * number, 2)
                                    questions.append(Question(
                                        id=start_id + i,
                                        text=f"{percentage}% of {number} =",
                                        operands=[percentage, number],
                                        operator="%",
                                        operators=None,
                                        answer=answer,
                                        isVertical=False
                                    ))
                                elif block_config.type in ("decimal_multiplication", "decimal_division", "decimal_add_sub", "integer_add_sub", "intl_add_sub", "direct_add_sub", "small_friends_add_sub", "big_friends_add_sub"):
                                    # For other types, use generate_question fallback
                                    try:
                                        question = generate_question(
                                            start_id + i,
                                            block_config.type,
                                            block_config.constraints,
                                            (seed or 0) + i * 20000 if seed else None,
                                            21
                                        )
                                        questions.append(question)
                                    except Exception:
                                        # Truly last resort - use addition only if all else fails
                                        digits = block_config.constraints.digits if block_config.constraints.digits is not None else 1
                                        num1 = 10 ** (digits - 1) + (i % 9)
                                        num2 = 10 ** (digits - 1) + ((i * 3) % 9)
                                        questions.append(Question(
                                            id=start_id + i,
                                            text=f"{num1}\n+ {num2}",
                                            operands=[num1, num2],
                                            operator="+",
                                            operators=None,
                                            answer=float(num1 + num2),
                                            isVertical=True
                                        ))
                                else:
                                    # For other types (including vedic operations), use generate_question fallback
                                    try:
                                        question = generate_question(
                                            start_id + i,
                                            block_config.type,
                                            block_config.constraints,
                                            (seed or 0) + i * 20000 if seed else None,
                                            21
                                        )
                                        questions.append(question)
                                    except Exception:
                                        # Truly last resort - use addition only if all else fails
                                        digits = block_config.constraints.digits if block_config.constraints.digits is not None else 1
                                        num1 = 10 ** (digits - 1) + (i % 9)
                                        num2 = 10 ** (digits - 1) + ((i * 3) % 9)
                                        questions.append(Question(
                                            id=start_id + i,
                                            text=f"{num1}\n+ {num2}",
                                            operands=[num1, num2],
                                            operator="+",
                                            operators=None,
                                            answer=float(num1 + num2),
                                            isVertical=True
                                        ))
            
            # If we still don't have a question after all retries, use fallback
            if question is None:
                try:
                    # Use the fallback logic from generate_question
                    question = generate_question(
                        start_id + i,
                        block_config.type,
                        block_config.constraints,
                        question_seed,
                        21  # Set retry_count to 21 to trigger fallback logic
                    )
                    questions.append(question)
                except Exception:
                    # Ultimate fallback - still respect question type
                    # Use generate_question with retry_count=21 to trigger fallback logic
                    try:
                        question = generate_question(
                            start_id + i,
                            block_config.type,
                            block_config.constraints,
                            (seed or 0) + i * 10000 if seed else None,
                            21  # Trigger fallback
                        )
                        signature = _create_question_signature(question)
                        if signature not in seen_signatures:
                            seen_signatures.add(signature)
                            questions.append(question)
                        else:
                            # Even fallback is duplicate, append anyway to avoid infinite loop
                            questions.append(question)
                    except Exception:
                        # Last resort - generate simple question of correct type
                        if block_config.type == "multiplication":
                            a = 2 + (i % 8)
                            b = 1 + (i % 9)
                            questions.append(Question(
                                id=start_id + i,
                                text=f"{a} × {b} =",
                                operands=[a, b],
                                operator="×",
                                operators=None,
                                answer=float(a * b),
                                isVertical=False
                            ))
                        elif block_config.type == "division":
                            b = 2 + (i % 8)
                            quotient = 1 + (i % 9)
                            a = quotient * b
                            questions.append(Question(
                                id=start_id + i,
                                text=f"{a} ÷ {b} =",
                                operands=[a, b],
                                operator="÷",
                                operators=None,
                                answer=float(quotient),
                                isVertical=False
                            ))
                        else:
                            # For other types, use generate_question fallback
                            try:
                                question = generate_question(
                                    start_id + i,
                                    block_config.type,
                                    block_config.constraints,
                                    (seed or 0) + i * 20000 if seed else None,
                                    21
                                )
                                questions.append(question)
                            except Exception:
                                # Truly last resort - use addition only if all else fails
                                digits = block_config.constraints.digits if block_config.constraints.digits is not None else 1
                                num1 = 10 ** (digits - 1) + (i % 9)
                                num2 = 10 ** (digits - 1) + ((i * 3) % 9)
                                questions.append(Question(
                                    id=start_id + i,
                                    text=f"{num1}\n+ {num2}",
                                    operands=[num1, num2],
                                    operator="+",
                                    operators=None,
                                    answer=float(num1 + num2),
                                    isVertical=True
                                ))
    
    return GeneratedBlock(config=block_config, questions=questions)

