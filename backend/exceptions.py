"""Specific exception types and error handling utilities."""

from fastapi import HTTPException, status
from typing import Optional
import logging

logger = logging.getLogger(__name__)


# Custom Exception Classes

class TalentHubException(Exception):
    """Base exception for all TalentHub errors."""
    
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR", status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class AuthenticationError(TalentHubException):
    """Authentication failed."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", status.HTTP_401_UNAUTHORIZED)
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=self.message,
            headers={"WWW-Authenticate": "Bearer"}
        )


class TokenExpiredError(AuthenticationError):
    """JWT token has expired."""
    
    def __init__(self, message: Optional[str] = None):
        super().__init__(message or "Token has expired. Please log in again.")
        self.code = "TOKEN_EXPIRED"


class InvalidTokenError(AuthenticationError):
    """JWT token is invalid."""
    
    def __init__(self, reason: str = "Invalid token"):
        super().__init__(f"Invalid token: {reason}")
        self.code = "INVALID_TOKEN"


class TokenRevokedError(AuthenticationError):
    """Token has been revoked."""
    
    def __init__(self, message: Optional[str] = None):
        super().__init__(message or "Token has been revoked")
        self.code = "TOKEN_REVOKED"


class AuthorizationError(TalentHubException):
    """User not authorized for action."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, "AUTHZ_ERROR", status.HTTP_403_FORBIDDEN)
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=self.message
        )


class ResourceNotFoundError(TalentHubException):
    """Requested resource not found."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None):
        msg = f"{resource_type} not found"
        if resource_id:
            msg += f" (ID: {resource_id})"
        super().__init__(msg, "NOT_FOUND", status.HTTP_404_NOT_FOUND)
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=self.message
        )


class ValidationError(TalentHubException):
    """Input validation failed."""
    
    def __init__(self, field: str, reason: str):
        super().__init__(
            f"Validation error in '{field}': {reason}",
            "VALIDATION_ERROR",
            status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=self.message
        )


class ExternalServiceError(TalentHubException):
    """External service (Google OAuth, etc.) error."""
    
    def __init__(self, message: str, service_name: str = "external"):
        super().__init__(
            f"{service_name} error: {message}",
            f"{service_name.upper()}_ERROR",
            status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=self.message
        )


class CircuitBreakerOpenError(ExternalServiceError):
    """Circuit breaker is open (service temporarily unavailable)."""
    
    def __init__(self, message: str, service_name: str = "external"):
        super().__init__(
            message,
            service_name=service_name
        )
        self.code = "CIRCUIT_OPEN"
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=self.message
        )


class DatabaseError(TalentHubException):
    """Database operation failed."""
    
    def __init__(self, operation: str, details: Optional[str] = None):
        msg = f"Database {operation} failed"
        if details:
            msg += f": {details}"
        super().__init__(msg, "DATABASE_ERROR", status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database operation failed. Please try again."
        )


class NetworkTimeoutError(ExternalServiceError):
    """Network request timed out."""
    
    def __init__(self, service_name: str = "network"):
        super().__init__("Request timed out", service_name=service_name)
        self.code = "NETWORK_TIMEOUT"


class RateLimitError(TalentHubException):
    """Rate limit exceeded."""
    
    def __init__(self, retry_after_seconds: int = 60):
        super().__init__(
            f"Rate limit exceeded. Please try again in {retry_after_seconds} seconds.",
            "RATE_LIMIT_EXCEEDED",
            status.HTTP_429_TOO_MANY_REQUESTS
        )
        self.retry_after = retry_after_seconds
    
    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=self.message,
            headers={"Retry-After": str(self.retry_after)}
        )


# Error Handler Utilities

class ErrorHandler:
    """Centralized error handling and logging."""
    
    @staticmethod
    def log_exception(
        exception: Exception,
        context: str = "Operation",
        level: str = "error"
    ) -> dict:
        """Log exception with context.
        
        Args:
            exception: Exception to log
            context: Context where error occurred
            level: Log level (debug, info, warning, error, critical)
            
        Returns:
            Error details dictionary
        """
        error_details = {
            "context": context,
            "exception_type": type(exception).__name__,
            "message": str(exception)
        }
        
        log_func = getattr(logger, level, logger.error)
        log_func(f"[{context}] {type(exception).__name__}: {str(exception)}")
        
        return error_details
    
    @staticmethod
    def handle_with_fallback(
        func,
        fallback_value=None,
        error_context: str = "Operation"
    ):
        """Execute function with fallback on error.
        
        Args:
            func: Function to execute
            fallback_value: Value to return on error
            error_context: Context for error logging
            
        Returns:
            Function result or fallback_value
        """
        try:
            return func()
        except Exception as e:
            ErrorHandler.log_exception(e, context=error_context)
            return fallback_value
    
    @staticmethod
    def convert_to_http_exception(
        exception: Exception
    ) -> HTTPException:
        """Convert custom exception to HTTPException.
        
        Args:
            exception: Exception to convert
            
        Returns:
            HTTPException
        """
        if isinstance(exception, TalentHubException):
            # Check if it's a specific type with to_http_exception method
            if hasattr(exception, 'to_http_exception'):
                return exception.to_http_exception()
            
            # Generic error response
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=exception.message
            )
        
        # Unknown exception
        ErrorHandler.log_exception(exception, context="Exception Conversion", level="error")
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )


# Helpful functions for common patterns

def require_authenticated() -> None:
    """Raise authentication error (for use in guards)."""
    raise AuthenticationError("Authentication required")


def require_admin() -> None:
    """Raise authorization error (for use in guards)."""
    raise AuthorizationError("Admin access required")


def validate_field(field: str, value: Optional[str], min_length: int = 1, max_length: int = 255) -> str:
    """Validate a string field.
    
    Args:
        field: Field name
        value: Field value
        min_length: Minimum length
        max_length: Maximum length
        
    Returns:
        Validated value
        
    Raises:
        ValidationError: If validation fails
    """
    if not value:
        raise ValidationError(field, f"{field} cannot be empty")
    
    if len(value) < min_length:
        raise ValidationError(field, f"too short (minimum {min_length} characters)")
    
    if len(value) > max_length:
        raise ValidationError(field, f"too long (maximum {max_length} characters)")
    
    return value
