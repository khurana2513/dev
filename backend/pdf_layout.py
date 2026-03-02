"""Layout constants and typography system for professional PDF generation."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from typing import NamedTuple


# ========== PAGE CONSTANTS ==========
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 20 * mm
MARGIN_LEFT = 20 * mm
MARGIN_RIGHT = 20 * mm

USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# Minimum space required before page break
MIN_SPACE_BEFORE_BREAK = 30 * mm


# ========== TYPOGRAPHY CONSTANTS ==========
class Typography(NamedTuple):
    """Typography settings for different text elements."""
    font_name: str
    font_size: float
    color: colors.Color
    leading: float  # Line height multiplier


# Font families (using Helvetica variants)
FONT_BOLD = "Helvetica-Bold"
FONT_REGULAR = "Helvetica"
FONT_ITALIC = "Helvetica-Oblique"

# Typography hierarchy
TYPO_PAPER_TITLE = Typography(FONT_BOLD, 18, colors.HexColor('#000000'), 1.2)
TYPO_SECTION_TITLE = Typography(FONT_BOLD, 14, colors.HexColor('#000000'), 1.3)
TYPO_INSTRUCTIONS = Typography(FONT_REGULAR, 10, colors.HexColor('#333333'), 1.4)
TYPO_QUESTION_NUMBER = Typography(FONT_BOLD, 12, colors.HexColor('#1E40AF'), 1.2)
TYPO_QUESTION_TEXT = Typography(FONT_REGULAR, 12, colors.HexColor('#000000'), 1.3)
TYPO_ANSWER = Typography(FONT_REGULAR, 11, colors.HexColor('#666666'), 1.2)
TYPO_OPERATOR = Typography(FONT_BOLD, 12, colors.HexColor('#2563EB'), 1.3)


# ========== SPACING CONSTANTS ==========
SPACE_AFTER_TITLE = 6 * mm
SPACE_AFTER_SECTION = 4 * mm
SPACE_BEFORE_SECTION = 4 * mm
SPACE_BETWEEN_QUESTIONS = 3 * mm  # Compact spacing
SPACE_BETWEEN_BLOCKS = 6 * mm  # Reduced spacing
SPACE_AFTER_INSTRUCTIONS = 3 * mm

# Block/Section boundary
BLOCK_BORDER_WIDTH = 1.5
BLOCK_PADDING = 3 * mm
BLOCK_HEADER_HEIGHT = 8 * mm

# Question box dimensions (compact)
QUESTION_BOX_PADDING = 2 * mm
QUESTION_BOX_MIN_HEIGHT = 20 * mm  # Reduced height
VERTICAL_QUESTION_LINE_SPACING = 4 * mm  # Tighter spacing
HORIZONTAL_QUESTION_SPACING = 2 * mm

# Table layout for horizontal questions
TABLE_ROW_HEIGHT = 10 * mm  # Increased for more padding
TABLE_CELL_PADDING = 3 * mm  # Increased padding
TABLE_COLUMNS = 3  # 3 questions per row for horizontal format

# Vertical questions layout (addition/subtraction)
VERTICAL_QUESTIONS_PER_ROW = 2  # 2 questions side by side
VERTICAL_QUESTION_WIDTH = (USABLE_WIDTH - BLOCK_PADDING * 2 - 2*mm) / 2  # Half width minus gap
VERTICAL_QUESTION_GAP = 2 * mm  # Gap between two vertical questions


# ========== HELPER FUNCTIONS ==========
def apply_typography(canvas, typo: Typography):
    """Apply typography settings to canvas."""
    canvas.setFont(typo.font_name, typo.font_size)
    canvas.setFillColor(typo.color)
    return typo.leading * typo.font_size


def get_text_height(text: str, typo: Typography, max_width: float = None) -> float:
    """Calculate text height for given typography."""
    if max_width:
        # Simple estimation: assume average 50 chars per line
        lines = len(text) / 50
        return lines * typo.font_size * typo.leading
    return typo.font_size * typo.leading


def check_page_break(canvas, current_y: float, required_height: float) -> bool:
    """Check if we need a page break and create one if needed."""
    if current_y - required_height < MARGIN_BOTTOM + MIN_SPACE_BEFORE_BREAK:
        canvas.showPage()
        return True
    return False


def draw_page_header(canvas, title: str, level: str):
    """Draw consistent page header."""
    y = PAGE_HEIGHT - MARGIN_TOP
    
    # Brand name (top right)
    apply_typography(canvas, Typography(FONT_BOLD, 10, colors.HexColor('#666666'), 1.0))
    canvas.drawRightString(MARGIN_LEFT + USABLE_WIDTH, y, "Talent Hub")
    
    # Paper title
    leading = apply_typography(canvas, TYPO_PAPER_TITLE)
    canvas.drawString(MARGIN_LEFT, y, title)
    
    # Level
    apply_typography(canvas, Typography(FONT_REGULAR, 10, colors.HexColor('#666666'), 1.0))
    canvas.drawString(MARGIN_LEFT, y - leading, f"Level: {level}")
    
    return y - leading - SPACE_AFTER_TITLE

