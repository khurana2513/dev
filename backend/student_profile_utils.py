"""Utility functions for student profile management."""
from typing import List, Optional, Tuple


# Level definitions based on course and level type
LEVEL_DEFINITIONS = {
    "Abacus": {
        "Regular": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        "Junior": ["1A", "1B", "2", "3", "4"]
    },
    "Vedic Maths": {
        "Regular": ["1", "2", "3", "4"],
        "Junior": ["1", "2", "3", "4"]
    },
    "Handwriting": {
        "Regular": ["English", "Hindi"],
        "Junior": ["English", "Hindi"]
    }
}

# Valid courses
VALID_COURSES = ["Abacus", "Vedic Maths", "Handwriting"]

# Valid branches
VALID_BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"]

# Valid statuses
VALID_STATUSES = ["active", "inactive", "closed"]

# Valid level types
VALID_LEVEL_TYPES = ["Regular", "Junior"]


def get_valid_levels(course: Optional[str], level_type: Optional[str]) -> List[str]:
    """
    Get valid levels for a given course and level type.
    
    Args:
        course: The course name (Abacus, Vedic Maths, Handwriting)
        level_type: The level type (Regular or Junior)
    
    Returns:
        List of valid level strings
    """
    if not course or not level_type:
        return []
    
    course = course.strip()
    level_type = level_type.strip()
    
    if course not in LEVEL_DEFINITIONS:
        return []
    
    if level_type not in LEVEL_DEFINITIONS[course]:
        return []
    
    return LEVEL_DEFINITIONS[course][level_type]


def validate_level(course: Optional[str], level_type: Optional[str], level: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate if a level is valid for the given course and level type.
    
    Args:
        course: The course name
        level_type: The level type (Regular or Junior)
        level: The level to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not course:
        return (True, None)  # Allow empty course
    
    if not level_type:
        return (True, None)  # Allow empty level_type
    
    if not level:
        return (True, None)  # Allow empty level
    
    valid_levels = get_valid_levels(course, level_type)
    
    if not valid_levels:
        return (False, f"Invalid course '{course}' or level type '{level_type}'")
    
    if level not in valid_levels:
        return (False, f"Level '{level}' is not valid for {course} {level_type}. Valid levels: {', '.join(valid_levels)}")
    
    return (True, None)


def validate_course(course: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validate course name."""
    if not course:
        return (True, None)
    
    if course not in VALID_COURSES:
        return (False, f"Invalid course '{course}'. Valid courses: {', '.join(VALID_COURSES)}")
    
    return (True, None)


def validate_branch(branch: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validate branch name."""
    if not branch:
        return (True, None)
    
    if branch not in VALID_BRANCHES:
        return (False, f"Invalid branch '{branch}'. Valid branches: {', '.join(VALID_BRANCHES)}")
    
    return (True, None)


def validate_status(status: str) -> Tuple[bool, Optional[str]]:
    """Validate status."""
    if status not in VALID_STATUSES:
        return (False, f"Invalid status '{status}'. Valid statuses: {', '.join(VALID_STATUSES)}")
    
    return (True, None)


def validate_level_type(level_type: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validate level type."""
    if not level_type:
        return (True, None)
    
    if level_type not in VALID_LEVEL_TYPES:
        return (False, f"Invalid level type '{level_type}'. Valid types: {', '.join(VALID_LEVEL_TYPES)}")
    
    return (True, None)


def generate_public_id(db, prefix: str = "TH") -> str:
    """
    Generate the next public ID in format TH-0001, TH-0002, etc.
    
    Args:
        db: Database session
        prefix: Prefix for the ID (default: "TH")
    
    Returns:
        Next available public ID string
    """
    from models import StudentProfile
    
    # Get the highest existing public_id number
    last_profile = db.query(StudentProfile).filter(
        StudentProfile.public_id.isnot(None),
        StudentProfile.public_id.like(f"{prefix}-%")
    ).order_by(StudentProfile.public_id.desc()).first()
    
    if not last_profile or not last_profile.public_id:
        # No existing profiles, start with 0001
        next_number = 1
    else:
        # Extract number from last public_id (e.g., "TH-0001" -> 1)
        try:
            last_number_str = last_profile.public_id.split("-")[-1]
            next_number = int(last_number_str) + 1
        except (ValueError, IndexError):
            # If parsing fails, start from 1
            next_number = 1
    
    # Format with zero padding (4 digits)
    return f"{prefix}-{next_number:04d}"


def generate_branch_specific_id(db, branch: str = None, prefix: str = None) -> str:
    """
    Generate a branch-specific public ID.

    Args:
        db: Database session
        branch: Student branch (rohini-16, rohini-11, gurgaon, online)
        prefix: Custom prefix (optional)

    Returns:
        Branch-specific public ID
    """
    # Define branch prefixes
    branch_prefixes = {
        "rohini-16": "R16",
        "rohini-11": "R11",
        "gurgaon": "GGN",
        "online": "ONL"
    }

    # Use provided prefix or get from branch
    if prefix:
        final_prefix = prefix.upper()
    elif branch and branch.lower() in branch_prefixes:
        final_prefix = branch_prefixes[branch.lower()]
    else:
        final_prefix = "TH"  # Default fallback

    return generate_public_id(db, final_prefix)


def get_branch_prefix(branch: str) -> str:
    """
    Get the standard prefix for a branch.

    Args:
        branch: Branch name

    Returns:
        Branch-specific prefix
    """
    branch_prefixes = {
        "rohini-16": "R16",
        "rohini-11": "R11",
        "gurgaon": "GGN",
        "online": "ONL"
    }

    return branch_prefixes.get(branch.lower(), "TH")