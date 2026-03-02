"""Input sanitization utilities for security."""
from html import escape
import re
from typing import Optional


def sanitize_display_name(name: Optional[str]) -> str:
    """
    Sanitize and validate display name input.
    
    Security rules:
    - Remove HTML/script tags
    - Trim whitespace
    - Validate length (1-50 characters)
    - Remove special characters that could be used for injection
    
    Args:
        name: Raw display name input
        
    Returns:
        Sanitized display name
        
    Raises:
        ValueError: If validation fails
    """
    if not name or not name.strip():
        raise ValueError("Display name cannot be empty")
    
    # Trim whitespace
    name = name.strip()
    
    # Check length
    if len(name) > 50:
        raise ValueError("Display name too long (maximum 50 characters)")
    
    if len(name) < 1:
        raise ValueError("Display name too short (minimum 1 character)")
    
    # Escape HTML entities to prevent XSS
    name = escape(name)
    
    # Remove potentially dangerous characters (control characters, etc.)
    # Allow: letters, numbers, spaces, basic punctuation
    name = re.sub(r'[^\w\s\-_.,!?\'"()]', '', name)
    
    # Remove excessive whitespace
    name = re.sub(r'\s+', ' ', name)
    
    # Final trim
    name = name.strip()
    
    if not name:
        raise ValueError("Display name contains only invalid characters")
    
    return name


def sanitize_string_field(value: Optional[str], field_name: str = "field", max_length: int = 100) -> str:
    """
    Generic string field sanitization.
    
    Args:
        value: Raw string input
        field_name: Name of field (for error messages)
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
        
    Raises:
        ValueError: If validation fails
    """
    if not value or not value.strip():
        raise ValueError(f"{field_name} cannot be empty")
    
    value = value.strip()
    
    if len(value) > max_length:
        raise ValueError(f"{field_name} too long (maximum {max_length} characters)")
    
    # Escape HTML
    value = escape(value)
    
    # Remove control characters
    value = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value)
    
    return value


def validate_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not email or not email.strip():
        return False
    
    # Basic email validation regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def sanitize_search_query(query: Optional[str], max_length: int = 100) -> str:
    """
    Sanitize search query to prevent SQL injection and XSS.
    
    Args:
        query: Raw search query
        max_length: Maximum query length
        
    Returns:
        Sanitized query
        
    Raises:
        ValueError: If validation fails
    """
    if not query or not query.strip():
        return ""
    
    query = query.strip()
    
    if len(query) > max_length:
        raise ValueError(f"Search query too long (maximum {max_length} characters)")
    
    # Escape HTML
    query = escape(query)
    
    # Remove SQL injection attempts (basic filtering - use parameterized queries as primary defense)
    dangerous_patterns = [
        r'--', r';', r'/\*', r'\*/', r'xp_', r'sp_', r'exec', r'execute',
        r'script', r'javascript:', r'onerror', r'onload'
    ]
    
    for pattern in dangerous_patterns:
        query = re.sub(pattern, '', query, flags=re.IGNORECASE)
    
    return query


def sanitize_numeric_input(value: any, field_name: str = "field", min_value: float = None, max_value: float = None) -> float:
    """
    Sanitize and validate numeric input.
    
    Args:
        value: Raw numeric input
        field_name: Name of field (for error messages)
        min_value: Minimum allowed value (optional)
        max_value: Maximum allowed value (optional)
        
    Returns:
        Validated numeric value
        
    Raises:
        ValueError: If validation fails
    """
    try:
        num = float(value)
    except (ValueError, TypeError):
        raise ValueError(f"{field_name} must be a valid number")
    
    if min_value is not None and num < min_value:
        raise ValueError(f"{field_name} must be at least {min_value}")
    
    if max_value is not None and num > max_value:
        raise ValueError(f"{field_name} must be at most {max_value}")
    
    return num
