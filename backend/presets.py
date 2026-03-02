"""Preset question blocks for different levels."""
from schemas import BlockConfig, Constraints, QuestionType


PRESETS = {
    "Junior": [
        BlockConfig(
            id="jr-1",
            type="direct_add_sub",
            count=10,
            constraints=Constraints(digits=1, rows=3),
            title="Direct Add/Sub"
        ),
        BlockConfig(
            id="jr-2",
            type="small_friends_add_sub",
            count=10,
            constraints=Constraints(digits=1, rows=3),
            title="Small Friends Add/Sub"
        ),
        BlockConfig(
            id="jr-3",
            type="big_friends_add_sub",
            count=10,
            constraints=Constraints(digits=1, rows=3),
            title="Big Friends Add/Sub"
        ),
    ],
    "AB-1": [
        BlockConfig(id="ab1-1", type="add_sub", count=10, constraints=Constraints(digits=1, rows=3), title="Add/Sub Mix 1D 3R"),
        BlockConfig(id="ab1-2", type="add_sub", count=10, constraints=Constraints(digits=1, rows=3), title="Add/Sub Mix 1D 3R"),
        BlockConfig(id="ab1-3", type="add_sub", count=10, constraints=Constraints(digits=1, rows=3), title="Add/Sub Mix 1D 3R"),
        BlockConfig(id="ab1-4", type="add_sub", count=10, constraints=Constraints(digits=1, rows=4), title="Add/Sub Mix 1D 4R"),
        BlockConfig(id="ab1-5", type="add_sub", count=10, constraints=Constraints(digits=1, rows=4), title="Add/Sub Mix 1D 4R"),
        BlockConfig(id="ab1-6", type="add_sub", count=10, constraints=Constraints(digits=1, rows=4), title="Add/Sub Mix 1D 4R"),
        BlockConfig(id="ab1-7", type="add_sub", count=10, constraints=Constraints(digits=1, rows=5), title="Add/Sub Mix 1D 5R"),
        BlockConfig(id="ab1-8", type="add_sub", count=10, constraints=Constraints(digits=1, rows=5), title="Add/Sub Mix 1D 5R"),
        BlockConfig(id="ab1-9", type="add_sub", count=10, constraints=Constraints(digits=1, rows=5), title="Add/Sub Mix 1D 5R"),
        BlockConfig(id="ab1-10", type="add_sub", count=10, constraints=Constraints(digits=1, rows=6), title="Add/Sub Mix 1D 6R"),
    ],
    "AB-2": [
        BlockConfig(id="ab2-1", type="add_sub", count=10, constraints=Constraints(digits=1, rows=4), title="Add/Sub Mix 1D 4R"),
        BlockConfig(id="ab2-2", type="add_sub", count=10, constraints=Constraints(digits=1, rows=5), title="Add/Sub Mix 1D 5R"),
        BlockConfig(id="ab2-3", type="add_sub", count=10, constraints=Constraints(digits=1, rows=6), title="Add/Sub Mix 1D 6R"),
        BlockConfig(id="ab2-4", type="add_sub", count=10, constraints=Constraints(digits=1, rows=7), title="Add/Sub Mix 1D 7R"),
        BlockConfig(id="ab2-5", type="add_sub", count=10, constraints=Constraints(digits=2, rows=3), title="Add/Sub Mix 2D 3R"),
        BlockConfig(id="ab2-6", type="add_sub", count=10, constraints=Constraints(digits=2, rows=3), title="Add/Sub Mix 2D 3R"),
        BlockConfig(id="ab2-7", type="add_sub", count=10, constraints=Constraints(digits=2, rows=3), title="Add/Sub Mix 2D 3R"),
        BlockConfig(id="ab2-8", type="add_sub", count=10, constraints=Constraints(digits=2, rows=4), title="Add/Sub Mix 2D 4R"),
        BlockConfig(id="ab2-9", type="add_sub", count=10, constraints=Constraints(digits=2, rows=4), title="Add/Sub Mix 2D 4R"),
        BlockConfig(id="ab2-10", type="add_sub", count=10, constraints=Constraints(digits=2, rows=5), title="Add/Sub Mix 2D 5R"),
    ],
    "AB-3": [
        BlockConfig(id="ab3-1", type="add_sub", count=10, constraints=Constraints(digits=1, rows=6), title="Add/Sub Mix 1D 6R"),
        BlockConfig(id="ab3-2", type="add_sub", count=10, constraints=Constraints(digits=1, rows=7), title="Add/Sub Mix 1D 7R"),
        BlockConfig(id="ab3-3", type="add_sub", count=10, constraints=Constraints(digits=2, rows=5), title="Add/Sub Mix 2D 5R"),
        BlockConfig(id="ab3-4", type="add_sub", count=10, constraints=Constraints(digits=2, rows=6), title="Add/Sub Mix 2D 6R"),
        BlockConfig(id="ab3-5", type="add_sub", count=10, constraints=Constraints(digits=3, rows=3), title="Add/Sub Mix 3D 3R"),
        BlockConfig(id="ab3-6", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Multiplication 2×1"),
        BlockConfig(id="ab3-7", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Multiplication 2×1"),
        BlockConfig(id="ab3-8", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Multiplication 2×1"),
        BlockConfig(id="ab3-9", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
        BlockConfig(id="ab3-10", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
    ],
    "AB-4": [
        BlockConfig(id="ab4-1", type="add_sub", count=10, constraints=Constraints(digits=1, rows=8), title="Add/Sub Mix 1D 8R"),
        BlockConfig(id="ab4-2", type="add_sub", count=10, constraints=Constraints(digits=2, rows=6), title="Add/Sub Mix 2D 6R"),
        BlockConfig(id="ab4-3", type="add_sub", count=10, constraints=Constraints(digits=2, rows=7), title="Add/Sub Mix 2D 7R"),
        BlockConfig(id="ab4-4", type="add_sub", count=10, constraints=Constraints(digits=3, rows=3), title="Add/Sub Mix 3D 3R"),
        BlockConfig(id="ab4-5", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Multiplication 2×1"),
        BlockConfig(id="ab4-6", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
        BlockConfig(id="ab4-7", type="division", count=10, constraints=Constraints(dividendDigits=2, divisorDigits=1), title="Divide 2÷1"),
        BlockConfig(id="ab4-8", type="division", count=10, constraints=Constraints(dividendDigits=3, divisorDigits=1), title="Divide 3÷1"),
        BlockConfig(id="ab4-9", type="division", count=10, constraints=Constraints(dividendDigits=3, divisorDigits=1), title="Divide 3÷1"),
        BlockConfig(id="ab4-10", type="division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=1), title="Divide 4÷1"),
    ],
    "AB-5": [
        BlockConfig(id="ab5-1", type="add_sub", count=10, constraints=Constraints(digits=1, rows=9), title="Add/Sub Mix 1D 9R"),
        BlockConfig(id="ab5-2", type="add_sub", count=10, constraints=Constraints(digits=2, rows=8), title="Add/Sub Mix 2D 8R"),
        BlockConfig(id="ab5-3", type="add_sub", count=10, constraints=Constraints(digits=3, rows=4), title="Add/Sub Mix 3D 4R"),
        BlockConfig(id="ab5-4", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
        BlockConfig(id="ab5-5", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=4, multiplierDigits=1), title="Multiplication 4×1"),
        BlockConfig(id="ab5-6", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="Multiplication 2×2"),
        BlockConfig(id="ab5-7", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="Multiplication 2×2"),
        BlockConfig(id="ab5-8", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=2), title="Multiplication 3×2"),
        BlockConfig(id="ab5-9", type="division", count=10, constraints=Constraints(dividendDigits=3, divisorDigits=1), title="Divide 3÷1"),
        BlockConfig(id="ab5-10", type="division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=1), title="Divide 4÷1"),
    ],
    "AB-6": [
        BlockConfig(id="ab6-1", type="add_sub", count=10, constraints=Constraints(digits=1, rows=10), title="Add/Sub Mix 1D 10R"),
        BlockConfig(id="ab6-2", type="add_sub", count=10, constraints=Constraints(digits=2, rows=9), title="Add/Sub Mix 2D 9R"),
        BlockConfig(id="ab6-3", type="add_sub", count=10, constraints=Constraints(digits=3, rows=5), title="Add/Sub Mix 3D 5R"),
        BlockConfig(id="ab6-4", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
        BlockConfig(id="ab6-5", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="Multiplication 2×2"),
        BlockConfig(id="ab6-6", type="multiplication", count=10, constraints=Constraints(multiplicandDigits=3, multiplierDigits=2), title="Multiplication 3×2"),
        BlockConfig(id="ab6-7", type="division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=1), title="Divide 4÷1"),
        BlockConfig(id="ab6-8", type="division", count=10, constraints=Constraints(dividendDigits=3, divisorDigits=2), title="Divide 3÷2"),
        BlockConfig(id="ab6-9", type="division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Divide 4÷2"),
        BlockConfig(id="ab6-10", type="division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Divide 4÷2"),
    ],
    "AB-7": [
        BlockConfig(id="ab7-1", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=10), title="Decimal Add/Sub 2D 10R"),
        BlockConfig(id="ab7-2", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=3), title="Decimal Add/Sub 2D 3R"),
        BlockConfig(id="ab7-3", type="multiplication", count=5, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
        BlockConfig(id="ab7-4", type="multiplication", count=5, constraints=Constraints(multiplicandDigits=4, multiplierDigits=1), title="Multiplication 4×1"),
        BlockConfig(id="ab7-5", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab7-6", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab7-7", type="decimal_division", count=10, constraints=Constraints(dividendDigits=3, divisorDigits=1), title="Decimal Division (3÷1)"),
        BlockConfig(id="ab7-8", type="decimal_division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=1), title="Decimal Division (4÷1)"),
        BlockConfig(id="ab7-9", type="decimal_division", count=10, constraints=Constraints(dividendDigits=3, divisorDigits=2), title="Decimal Division (3÷2)"),
        BlockConfig(id="ab7-10", type="decimal_division", count=10, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Decimal Division (4÷2)"),
        BlockConfig(id="ab7-11", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=6), title="Decimal Add/Sub 2D 6R"),
        BlockConfig(id="ab7-12", type="decimal_add_sub", count=5, constraints=Constraints(digits=3, rows=4), title="Decimal Add/Sub 3D 4R"),
        BlockConfig(id="ab7-13", type="multiplication", count=5, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Multiplication 3×1"),
        BlockConfig(id="ab7-14", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab7-15", type="decimal_division", count=5, constraints=Constraints(dividendDigits=3, divisorDigits=2), title="Decimal Division (3÷2)"),
        BlockConfig(id="ab7-16", type="decimal_division", count=5, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Decimal Division (4÷2)"),
    ],
    "AB-8": [
        BlockConfig(id="ab8-1", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=10), title="Decimal Add/Sub 2D 10R"),
        BlockConfig(id="ab8-2", type="decimal_add_sub", count=5, constraints=Constraints(digits=3, rows=3), title="Decimal Add/Sub 3D 3R"),
        BlockConfig(id="ab8-3", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab8-4", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Decimal Multiplication (3×1)"),
        BlockConfig(id="ab8-5", type="decimal_division", count=5, constraints=Constraints(dividendDigits=5, divisorDigits=1), title="Decimal Division (5÷1)"),
        BlockConfig(id="ab8-6", type="decimal_division", count=5, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Decimal Division (4÷2)"),
        BlockConfig(id="ab8-7", type="gcd", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="GCD (2×1 digits)"),
        BlockConfig(id="ab8-8", type="gcd", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="GCD (2×2 digits)"),
        BlockConfig(id="ab8-9", type="lcm", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="LCM (2×1 digits)"),
        BlockConfig(id="ab8-10", type="lcm", count=10, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="LCM (2×2 digits)"),
        BlockConfig(id="ab8-11", type="decimal_add_sub", count=5, constraints=Constraints(digits=1, rows=6), title="Decimal Add/Sub 1D 6R"),
        BlockConfig(id="ab8-12", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=4), title="Decimal Add/Sub 2D 4R"),
        BlockConfig(id="ab8-13", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab8-14", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab8-15", type="decimal_division", count=5, constraints=Constraints(dividendDigits=4, divisorDigits=1), title="Decimal Division (4÷1)"),
        BlockConfig(id="ab8-16", type="decimal_division", count=5, constraints=Constraints(dividendDigits=3, divisorDigits=2), title="Decimal Division (3÷2)"),
    ],
    "AB-9": [
        BlockConfig(id="ab9-1", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=10), title="Decimal Add/Sub 2D 10R"),
        BlockConfig(id="ab9-2", type="decimal_add_sub", count=5, constraints=Constraints(digits=3, rows=4), title="Decimal Add/Sub 3D 4R"),
        BlockConfig(id="ab9-3", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab9-4", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=3, multiplierDigits=1), title="Decimal Multiplication (3×1)"),
        BlockConfig(id="ab9-5", type="decimal_division", count=5, constraints=Constraints(dividendDigits=5, divisorDigits=1), title="Decimal Division (5÷1)"),
        BlockConfig(id="ab9-6", type="decimal_division", count=5, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Decimal Division (4÷2)"),
        BlockConfig(id="ab9-7", type="gcd", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="GCD (2×1 digits)"),
        BlockConfig(id="ab9-8", type="gcd", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="GCD (2×2 digits)"),
        BlockConfig(id="ab9-9", type="lcm", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="LCM (2×1 digits)"),
        BlockConfig(id="ab9-10", type="lcm", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="LCM (2×2 digits)"),
        BlockConfig(id="ab9-11", type="square_root", count=20, constraints=Constraints(rootDigits=4), title="Square Root (4 digits)"),
        BlockConfig(id="ab9-12", type="decimal_add_sub", count=5, constraints=Constraints(digits=2, rows=5), title="Decimal Add/Sub 2D 5R"),
        BlockConfig(id="ab9-13", type="decimal_add_sub", count=5, constraints=Constraints(digits=3, rows=3), title="Decimal Add/Sub 3D 3R"),
        BlockConfig(id="ab9-14", type="decimal_multiplication", count=4, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab9-15", type="decimal_division", count=4, constraints=Constraints(dividendDigits=4, divisorDigits=1), title="Decimal Division (4÷1)"),
        BlockConfig(id="ab9-16", type="gcd", count=4, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="GCD (2×2 digits)"),
        BlockConfig(id="ab9-17", type="lcm", count=4, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="LCM (2×2 digits)"),
        BlockConfig(id="ab9-18", type="square_root", count=4, constraints=Constraints(rootDigits=4), title="Square Root (4 digits)"),
    ],
    "AB-10": [
        BlockConfig(id="ab10-1", type="integer_add_sub", count=5, constraints=Constraints(digits=2, rows=8), title="Integer Add/Sub 2D 8R"),
        BlockConfig(id="ab10-2", type="integer_add_sub", count=5, constraints=Constraints(digits=3, rows=4), title="Integer Add/Sub 3D 4R"),
        BlockConfig(id="ab10-3", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="Decimal Multiplication (2×2)"),
        BlockConfig(id="ab10-4", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=5, multiplierDigits=2), title="Decimal Multiplication (5×2)"),
        BlockConfig(id="ab10-5", type="gcd", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="GCD (2×2 digits)"),
        BlockConfig(id="ab10-6", type="lcm", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="LCM (2×2 digits)"),
        BlockConfig(id="ab10-7", type="square_root", count=10, constraints=Constraints(rootDigits=4), title="Square Root (4 digits)"),
        BlockConfig(id="ab10-8", type="percentage", count=5, constraints=Constraints(percentageMin=2, percentageMax=89, numberDigits=3), title="Percentage (2-89%, 3 digits)"),
        BlockConfig(id="ab10-9", type="percentage", count=5, constraints=Constraints(percentageMin=2, percentageMax=89, numberDigits=4), title="Percentage (2-89%, 4 digits)"),
        BlockConfig(id="ab10-10", type="cube_root", count=5, constraints=Constraints(rootDigits=4), title="Cube Root (4 digits)"),
        BlockConfig(id="ab10-11", type="cube_root", count=5, constraints=Constraints(rootDigits=5), title="Cube Root (5 digits)"),
        BlockConfig(id="ab10-12", type="cube_root", count=10, constraints=Constraints(rootDigits=6), title="Cube Root (6 digits)"),
        BlockConfig(id="ab10-13", type="integer_add_sub", count=3, constraints=Constraints(digits=2, rows=8), title="Integer Add/Sub 2D 8R"),
        BlockConfig(id="ab10-14", type="integer_add_sub", count=2, constraints=Constraints(digits=3, rows=4), title="Integer Add/Sub 3D 4R"),
        BlockConfig(id="ab10-15", type="decimal_multiplication", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=1), title="Decimal Multiplication (2×1)"),
        BlockConfig(id="ab10-16", type="decimal_division", count=5, constraints=Constraints(dividendDigits=4, divisorDigits=2), title="Decimal Division (4÷2)"),
        BlockConfig(id="ab10-17", type="square_root", count=5, constraints=Constraints(rootDigits=4), title="Square Root (4 digits)"),
        BlockConfig(id="ab10-18", type="cube_root", count=5, constraints=Constraints(rootDigits=5), title="Cube Root (5 digits)"),
        BlockConfig(id="ab10-19", type="lcm", count=5, constraints=Constraints(multiplicandDigits=2, multiplierDigits=2), title="LCM (2×2 digits)"),
    ],
    "Advanced": [
        BlockConfig(
            id="adv-1",
            type="square_root",
            count=10,
            constraints=Constraints(rootDigits=3),
            title="Square Root (3 digits)"
        ),
        BlockConfig(
            id="adv-2",
            type="cube_root",
            count=10,
            constraints=Constraints(rootDigits=5),
            title="Cube Root (5 digits)"
        ),
        BlockConfig(
            id="adv-3",
            type="decimal_multiplication",
            count=10,
            constraints=Constraints(multiplicandDigits=2, multiplierDigits=1),
            title="Decimal Multiplication"
        ),
        BlockConfig(
            id="adv-4",
            type="decimal_division",
            count=10,
            constraints=Constraints(multiplicandDigits=2, multiplierDigits=1),
            title="Decimal Division"
        ),
        BlockConfig(
            id="adv-5",
            type="integer_add_sub",
            count=10,
            constraints=Constraints(digits=2, rows=3),
            title="Integer Add/Sub (with negatives)"
        ),
        BlockConfig(
            id="adv-6",
            type="lcm",
            count=10,
            constraints=Constraints(multiplicandDigits=2, multiplierDigits=2),
            title="LCM"
        ),
        BlockConfig(
            id="adv-7",
            type="gcd",
            count=10,
            constraints=Constraints(multiplicandDigits=2, multiplierDigits=2),
            title="GCD"
        ),
        BlockConfig(
            id="adv-8",
            type="percentage",
            count=10,
            constraints=Constraints(percentageMin=1, percentageMax=100, numberDigits=4),
            title="Percentage"
        )
    ],
    "Vedic-Level-1": [
        BlockConfig(
            id="vm1-1",
            type="vedic_multiply_by_11",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 11 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-2",
            type="vedic_multiply_by_101",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 101 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-3",
            type="vedic_multiply_by_12_19",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 12-19 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-4",
            type="vedic_multiply_by_21_91",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 21-91 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-5",
            type="vedic_multiply_by_2",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 2 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-6",
            type="vedic_multiply_by_4",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 4 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-7",
            type="vedic_multiply_by_6",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 6 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-8",
            type="vedic_divide_by_2",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide by 2 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-9",
            type="vedic_divide_by_4",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide by 4 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-10",
            type="vedic_divide_single_digit",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide Single Digit - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm1-11",
            type="vedic_divide_by_11",
            count=5,
            constraints=Constraints(digits=4),
            title="Divide by 11 - 5 Ques, 4 Digits"
        ),
        BlockConfig(
            id="vm1-12",
            type="vedic_subtraction_complement",
            count=5,
            constraints=Constraints(base=1000),
            title="Subtraction (Complements) - 5 Ques, Base 1000"
        ),
        BlockConfig(
            id="vm1-13",
            type="vedic_special_products_base_100",
            count=5,
            constraints=Constraints(base=100),
            title="Special Products (Base 100) - 5 Ques"
        ),
        BlockConfig(
            id="vm1-14",
            type="vedic_special_products_base_50",
            count=5,
            constraints=Constraints(base=50),
            title="Special Products (Base 50) - 5 Ques"
        ),
        BlockConfig(
            id="vm1-15",
            type="vedic_addition",
            count=5,
            constraints=Constraints(firstDigits=3, secondDigits=2),
            title="Addition - 5 Ques, First Number: 3 Digits, Second Number: 2 Digits"
        ),
        BlockConfig(
            id="vm1-16",
            type="vedic_squares_base_10",
            count=5,
            constraints=Constraints(),
            title="Squares (Base 10) - 5 Ques"
        ),
        BlockConfig(
            id="vm1-17",
            type="vedic_squares_base_100",
            count=5,
            constraints=Constraints(),
            title="Squares (Base 100) - 5 Ques"
        ),
        BlockConfig(
            id="vm1-18",
            type="vedic_squares_base_1000",
            count=5,
            constraints=Constraints(),
            title="Squares (Base 1000) - 5 Ques"
        ),
        BlockConfig(
            id="vm1-19",
            type="vedic_tables",
            count=10,
            constraints=Constraints(rows=10),
            title="Tables - 10 Ques"
        ),
    ],
    "Vedic-Level-2": [
        BlockConfig(
            id="vm2-1",
            type="vedic_fun_with_9_equal",
            count=2,
            constraints=Constraints(digits=3),
            title="Fun with 9 (Equal) - 2 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-2",
            type="vedic_fun_with_9_less_than",
            count=2,
            constraints=Constraints(digits=3),
            title="Fun with 9 (Less Than) - 2 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-3",
            type="vedic_fun_with_9_greater_than",
            count=2,
            constraints=Constraints(digits=3),
            title="Fun with 9 (Greater Than) - 2 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-4",
            type="vedic_fun_with_5",
            count=5,
            constraints=Constraints(),
            title="Fun with 5 - 5 Ques"
        ),
        BlockConfig(
            id="vm2-5",
            type="vedic_fun_with_10",
            count=5,
            constraints=Constraints(),
            title="Fun with 10 - 5 Ques"
        ),
        BlockConfig(
            id="vm2-6",
            type="vedic_multiply_by_1001",
            count=5,
            constraints=Constraints(digits=4),
            title="Multiply by 1001 - 5 Ques, 4 Digits"
        ),
        BlockConfig(
            id="vm2-7",
            type="vedic_multiply_by_5_25_125",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 5, 25, 125 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-8",
            type="vedic_multiply_by_5_50_500",
            count=5,
            constraints=Constraints(digits=3),
            title="Multiply by 5, 50, 500 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-9",
            type="vedic_divide_by_5_25_125",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide by 5, 25, 125 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-10",
            type="vedic_divide_by_5_50_500",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide by 5, 50, 500 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-11",
            type="vedic_divide_with_remainder",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide (with remainder) - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-12",
            type="vedic_divide_by_9s_repetition_equal",
            count=2,
            constraints=Constraints(digits=3),
            title="Divide by 9's Repetition (Equal) - 2 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-13",
            type="vedic_divide_by_9s_repetition_less_than",
            count=2,
            constraints=Constraints(digits=3),
            title="Divide by 9's Repetition (Less Than) - 2 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-14",
            type="vedic_divide_by_11s_repetition_equal",
            count=2,
            constraints=Constraints(digits=3),
            title="Divide by 11's Repetition (Equal) - 2 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-15",
            type="vedic_divide_by_11s_repetition_less_than",
            count=2,
            constraints=Constraints(digits=4),
            title="Divide by 11's Repetition (Less Than) - 2 Ques, 4 Digits"
        ),
        BlockConfig(
            id="vm2-16",
            type="vedic_divide_by_7",
            count=5,
            constraints=Constraints(digits=3),
            title="Divide by 7 - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-17",
            type="vedic_subtraction_powers_of_10",
            count=5,
            constraints=Constraints(powerOf10=4),
            title="Subtraction (Powers of 10) - 5 Ques, Power of 10s: 4"
        ),
        BlockConfig(
            id="vm2-18",
            type="vedic_special_products_base_1000",
            count=5,
            constraints=Constraints(base=1000),
            title="Special Products (Base 1000) - 5 Ques"
        ),
        BlockConfig(
            id="vm2-19",
            type="vedic_special_products_cross_multiply",
            count=5,
            constraints=Constraints(base=100),
            title="Special Products (Cross Multiply) - 5 Ques, Base: 100"
        ),
        BlockConfig(
            id="vm2-20",
            type="vedic_special_products_cross_base",
            count=5,
            constraints=Constraints(),
            title="Special Products (Cross Base) - 5 Ques"
        ),
        BlockConfig(
            id="vm2-21",
            type="vedic_special_products_cross_base_50",
            count=5,
            constraints=Constraints(),
            title="Special Products (Cross Base 50) - 5 Ques"
        ),
        BlockConfig(
            id="vm2-22",
            type="vedic_duplex",
            count=5,
            constraints=Constraints(digits=3),
            title="Find the Duplex - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-23",
            type="vedic_squares_duplex",
            count=5,
            constraints=Constraints(digits=3),
            title="Squares (Duplex Method) - 5 Ques, 3 Digits"
        ),
        BlockConfig(
            id="vm2-24",
            type="vedic_dropping_10_method",
            count=3,
            constraints=Constraints(digits=1, rows=10),
            title="Dropping 10 Method - 3 Ques, 1 Digits, 10 Rows"
        ),
        BlockConfig(
            id="vm2-25",
            type="vedic_dropping_10_method",
            count=3,
            constraints=Constraints(digits=2, rows=8),
            title="Dropping 10 Method - 3 Ques, 2 Digits, 8 Rows"
        ),
        BlockConfig(
            id="vm2-26",
            type="vedic_tables_large",
            count=10,
            constraints=Constraints(rows=10, tableNumberLarge=1111),
            title="Tables (1111-9999) - 10 Ques"
        ),
    ]
}


def get_preset_blocks(level: str) -> list[BlockConfig]:
    """Get preset blocks for a given level."""
    return PRESETS.get(level, [])

