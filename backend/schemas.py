"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


# Question Types
QuestionType = Literal[
    "addition", "subtraction", "add_sub", "multiplication", "division", "square_root", "cube_root", 
    "decimal_multiplication", "lcm", "gcd", "integer_add_sub", "decimal_division", "decimal_add_sub", 
    "direct_add_sub", "small_friends_add_sub", "big_friends_add_sub", "mix_friends_add_sub", "percentage",
    # Vedic Maths Level 1 operations
    "vedic_multiply_by_11", "vedic_multiply_by_101", "vedic_subtraction_complement", "vedic_subtraction_normal",
    "vedic_multiply_by_12_19", "vedic_special_products_base_100", "vedic_special_products_base_50",
    "vedic_multiply_by_21_91", "vedic_addition", "vedic_multiply_by_2", "vedic_multiply_by_4",
    "vedic_divide_by_2", "vedic_divide_by_4", "vedic_divide_single_digit", "vedic_multiply_by_6",
    "vedic_divide_by_11", "vedic_squares_base_10", "vedic_squares_base_100", "vedic_squares_base_1000", "vedic_tables",
    # Vedic Maths Level 2 operations
    "vedic_tables_large",
    "vedic_fun_with_9_equal", "vedic_fun_with_9_less_than", "vedic_fun_with_9_greater_than",
    "vedic_fun_with_5", "vedic_fun_with_10", "vedic_multiply_by_1001",
    "vedic_multiply_by_5_25_125", "vedic_divide_by_5_25_125", "vedic_multiply_by_5_50_500", "vedic_divide_by_5_50_500",
    "vedic_vinculum", "vedic_devinculum", "vedic_subtraction_powers_of_10", "vedic_special_products_base_1000",
    "vedic_special_products_cross_multiply", "vedic_special_products_cross_base", "vedic_special_products_cross_base_50",
    "vedic_duplex", "vedic_squares_duplex", "vedic_divide_with_remainder",
    "vedic_divide_by_9s_repetition_equal", "vedic_divide_by_9s_repetition_less_than",
    "vedic_divide_by_11s_repetition_equal", "vedic_divide_by_11s_repetition_less_than",
    "vedic_divide_by_7", "vedic_dropping_10_method",
    # Vedic Maths Level 3 operations
    "vedic_multiply_by_111_999", "vedic_multiply_by_102_109", "vedic_multiply_by_112_119", "vedic_multiplication",
    "vedic_mix_multiplication", "vedic_combined_operation", "vedic_fraction_simplification", "vedic_fraction_addition",
    "vedic_fraction_subtraction", "vedic_squares_level3", "vedic_percentage_level3", "vedic_squares_addition",
    "vedic_squares_subtraction", "vedic_squares_deviation", "vedic_cubes", "vedic_check_divisibility",
    "vedic_missing_numbers", "vedic_box_multiply", "vedic_multiply_by_10001", "vedic_duplex_level3", "vedic_squares_large",
    # Vedic Maths Level 4 operations
    "vedic_multiplication_level4", "vedic_multiply_by_111_999_level4", "vedic_decimal_add_sub", "vedic_fun_with_5_level4",
    "vedic_fun_with_10_level4", "vedic_find_x", "vedic_hcf", "vedic_lcm_level4", "vedic_bar_add_sub",
    "vedic_fraction_multiplication", "vedic_fraction_division", "vedic_check_divisibility_level4",
    "vedic_division_without_remainder", "vedic_division_with_remainder", "vedic_divide_by_11_99",
    "vedic_division_9_8_7_6", "vedic_division_91_121", "vedic_digital_sum", "vedic_cubes_base_method",
    "vedic_check_perfect_cube", "vedic_cube_root_level4", "vedic_bodmas", "vedic_square_root_level4", "vedic_magic_square"
]
PaperLevel = Literal["Custom", "Junior", "AB-1", "AB-2", "AB-3", "AB-4", "AB-5", "AB-6", "AB-7", "AB-8", "AB-9", "AB-10", "Advanced", "Vedic-Level-1", "Vedic-Level-2", "Vedic-Level-3", "Vedic-Level-4"]


class Constraints(BaseModel):
    """Constraints for question generation."""
    model_config = ConfigDict(populate_by_name=True)
    
    digits: Optional[int] = Field(default=None, ge=1, le=30)  # Max 30 for vedic operations, but clamped appropriately in code for other operations
    rows: Optional[int] = Field(default=None, ge=3, le=30)  # Updated min to 3, max to 30
    allowBorrow: Optional[bool] = Field(default=True)
    allowCarry: Optional[bool] = Field(default=True)
    minAnswer: Optional[int] = None
    maxAnswer: Optional[int] = None
    dividendDigits: Optional[int] = Field(default=None, ge=2, le=20)  # Updated min to 2, max to 20
    divisorDigits: Optional[int] = Field(default=None, ge=1, le=20)  # Updated max to 20
    multiplicandDigits: Optional[int] = Field(default=None, ge=2, le=20)  # Updated min to 2, max to 20
    multiplierDigits: Optional[int] = Field(default=None, ge=0, le=20)  # Updated max to 20, 0 = whole number for decimal_multiplication
    # For square root and cube root: digits of the number under the root
    rootDigits: Optional[int] = Field(default=None, ge=1, le=30)  # Updated max to 30
    # For percentage: percentage value range and number digits
    percentageMin: Optional[int] = Field(default=None, ge=1, le=100)  # Minimum percentage (default 1)
    percentageMax: Optional[int] = Field(default=None, ge=1, le=100)  # Maximum percentage (default 100)
    numberDigits: Optional[int] = Field(default=None, ge=1, le=10)  # Updated max to 10 for percentage number digits
    # For Vedic Maths operations
    base: Optional[int] = Field(default=None)  # For subtraction (100, 1000, etc) and special products
    firstDigits: Optional[int] = Field(default=None, ge=1, le=30)  # Updated min to 1, max to 30 for vedic addition
    secondDigits: Optional[int] = Field(default=None, ge=1, le=30)  # Updated min to 1, max to 30 for vedic addition
    multiplier: Optional[int] = Field(default=None, ge=12, le=19)  # For multiply by 12-19
    multiplierRange: Optional[int] = Field(default=None, ge=21, le=91)  # For multiply by 21-91
    divisor: Optional[int] = Field(default=None, ge=2, le=9)  # For divide by single digit
    tableNumber: Optional[int] = Field(default=None, ge=111, le=999)  # Tables: 111-999 (for vedic_tables)
    tableNumberLarge: Optional[int] = Field(default=None, ge=1111, le=9999)  # Large tables: 1111-9999 (for vedic_tables_large)
    # For Vedic Maths Level 2 operations
    powerOf10: Optional[int] = Field(default=None, ge=2, le=6)  # For subtraction from powers of 10 (2-6)
    # For Vedic Maths Level 3 operations
    multiplicationCase: Optional[str] = Field(default=None)  # "2x2", "3x2", "4x2", "3x3", "4x3", "4x4" for vedic_multiplication
    fractionCase: Optional[str] = Field(default=None)  # "direct", "different_denominator", "whole", "mix" for fraction operations
    divisorCheck: Optional[int] = Field(default=None)  # For check divisibility: 2,3,4,5,6,8,9,10
    # For Vedic Maths Level 4 operations
    funWith5Case: Optional[str] = Field(default=None)  # "decimal", "triple", "mix" for Fun with 5 Level 4
    funWith10Case: Optional[str] = Field(default=None)  # "decimal", "triple", "mix" for Fun with 10 Level 4
    divisibilityCase: Optional[str] = Field(default=None)  # "by_7", "by_11", "random" for check divisibility Level 4
    division9_8_7_6Case: Optional[str] = Field(default=None)  # "9", "8", "7", "6", "mix" for Division (9, 8, 7, 6)
    division91_121Case: Optional[str] = Field(default=None)  # "91", "121", "mix" for Division (91, 121)
    bodmasDifficulty: Optional[str] = Field(default=None)  # "easy", "medium", "hard" for BODMAS
    cubeRootDigits: Optional[int] = Field(default=None, ge=4, le=10)  # For cube root Level 4: 4-10 digits


class BlockConfig(BaseModel):
    """Configuration for a block of questions."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    type: QuestionType
    count: int = Field(ge=1, le=200, default=10)  # Updated max to 200
    constraints: Constraints
    title: Optional[str] = None


class PaperConfig(BaseModel):
    """Full paper configuration."""
    model_config = ConfigDict(populate_by_name=True)
    
    level: PaperLevel = "Custom"
    title: str = Field(min_length=1, max_length=40)
    totalQuestions: Literal["10", "20", "30", "50", "100"] = Field(default="20")
    blocks: List[BlockConfig]
    orientation: Literal["portrait", "landscape"] = "portrait"


class Question(BaseModel):
    """Generated question."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    text: str
    operands: List[int]  # For decimal multiplication, operands may be floats stored as ints (multiply by 10)
    operator: str
    operators: Optional[List[str]] = None  # For mixed operations: list of operators for each operand (except first)
    answer: float  # Changed to float to support decimal answers
    isVertical: bool


class GeneratedBlock(BaseModel):
    """Generated block with questions."""
    model_config = ConfigDict(populate_by_name=True)
    
    config: BlockConfig
    questions: List[Question]


class PaperCreate(BaseModel):
    """Request schema for creating a paper."""
    model_config = ConfigDict(populate_by_name=True)
    
    title: str
    level: str
    config: PaperConfig


class PaperResponse(BaseModel):
    """Response schema for a paper."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    title: str
    level: str
    config: PaperConfig
    createdAt: datetime = Field(alias="created_at")


class PreviewResponse(BaseModel):
    """Response schema for preview."""
    model_config = ConfigDict(populate_by_name=True)
    
    blocks: List[GeneratedBlock]
    seed: int
