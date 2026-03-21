"""Authentication and authorization utilities."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
import os
import logging
from dotenv import load_dotenv

from models import User, get_db
from token_manager import create_token_pair, verify_access_token, revoke_token, TokenBlacklist
from circuit_breaker import GOOGLE_OAUTH_BREAKER
from exceptions import (
    AuthenticationError, TokenExpiredError, InvalidTokenError, 
    TokenRevokedError, ExternalServiceError, ErrorHandler, CircuitBreakerOpenError
)

load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)
error_handler = ErrorHandler()

# Security: SECRET_KEY must be set in production - no default fallback
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "CRITICAL SECURITY ERROR: SECRET_KEY environment variable must be set. "
        "Generate a secure key with: openssl rand -hex 32"
    )
if len(SECRET_KEY) < 32:
    raise ValueError(
        "CRITICAL SECURITY ERROR: SECRET_KEY must be at least 32 characters long for security. "
        "Generate a secure key with: openssl rand -hex 32"
    )

ALGORITHM = "HS256"
# Security: Use shorter-lived tokens with refresh token strategy
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days for refresh tokens

security = HTTPBearer()
token_blacklist = TokenBlacklist()


def normalize_email(email: Optional[str]) -> str:
    """Normalize email values before comparing roles/access."""
    return (email or "").strip().lower()


def get_admin_email_set() -> set[str]:
    """Read ADMIN_EMAILS from env as a normalized set."""
    raw = os.getenv("ADMIN_EMAILS", "")
    return {
        normalize_email(email)
        for email in raw.split(",")
        if normalize_email(email)
    }


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token.
    
    DEPRECATED: Use create_token_pair() instead for dual-token strategy.
    This function is kept for backward compatibility.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"✅ [AUTH] Token created for user_id: {data.get('sub')}, expires: {expire}")
    return encoded_jwt


def create_tokens_for_user(user_id: int) -> Tuple[str, str]:
    """Create access and refresh token pair for user.
    
    Args:
        user_id: User ID
        
    Returns:
        Tuple of (access_token, refresh_token)
    """
    return create_token_pair({"sub": str(user_id)})


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    print("🔥 NEW AUTH FILE LOADED")
    """Verify JWT token and check if it's been revoked.
    
    Raises:
        HTTPException: If token is invalid, expired, or revoked
    """
    token = credentials.credentials
    try:
        # Check if token is in blacklist (revoked)
        if token_blacklist.is_blacklisted(token):
            logger.warning(f"❌ [AUTH] Token has been revoked (logout)")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify and decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        token_type = payload.get("type", "access")
        
        if user_id_str is None:
            logger.error(f"❌ [AUTH] Token missing 'sub' field. Payload: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Ensure this is an access token, not refresh token
        if token_type != "access":
            logger.error(f"❌ [AUTH] Wrong token type: {token_type}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token cannot be used as access token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Convert string user_id to int for database lookup
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            logger.error(f"❌ [AUTH] Invalid user_id format in token: {user_id_str}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID format in token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"✅ [AUTH] Token verified for user_id: {user_id}")
        return user_id
        
    except JWTError as e:
        logger.error(f"❌ [AUTH] JWT decode error: {str(e)}")
        # Check if token expired
        if "expir" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Other JWT errors (invalid signature, malformed, etc.)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ [AUTH] Unexpected error in token verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    user_id: int = Depends(verify_token),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    # user_id comes from verify_token which extracts it from JWT sub field
    # Since we store it as string in JWT, we need to convert back to int
    if isinstance(user_id, str):
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID in token"
            )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Keep admin role aligned with ADMIN_EMAILS even for existing sessions/users.
    normalized_email = normalize_email(user.email)
    admin_emails = get_admin_email_set()
    if normalized_email in admin_emails and user.role != "admin":
        logger.info("Promoting %s to admin from ADMIN_EMAILS", user.email)
        user.role = "admin"
        db.commit()
        db.refresh(user)

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def verify_google_token_impl(token: str) -> dict:
    """Internal implementation of Google OAuth token verification.
    
    This is the actual verification logic separated out so it can be wrapped
    with a circuit breaker in verify_google_token().
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        import time
        import ssl
        from urllib3.exceptions import SSLError as Urllib3SSLError
        
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        if not GOOGLE_CLIENT_ID:
            error_msg = "GOOGLE_CLIENT_ID not set in environment"
            logger.error(f"❌ [AUTH] {error_msg}")
            raise ExternalServiceError(error_msg)
        
        logger.info(f"🟡 [AUTH] Verifying token with client ID: {GOOGLE_CLIENT_ID[:20]}...")
        logger.debug(f"🟡 [AUTH] Token length: {len(token) if token else 0}")
        
        # Retry logic for SSL errors (intermittent network issues)
        max_retries = 3
        retry_delay = 1  # Start with 1 second
        idinfo = None
        
        for attempt in range(max_retries):
            try:
                # Verify the ID token
                idinfo = id_token.verify_oauth2_token(
                    token, requests.Request(), GOOGLE_CLIENT_ID
                )
                logger.info(f"✅ [AUTH] Token verified successfully, issuer: {idinfo.get('iss')}")
                break  # Success, exit retry loop
            except ValueError as e:
                # Token verification failed (non-SSL error) - don't retry
                error_msg = str(e)
                logger.error(f"❌ [AUTH] Token verification failed: {error_msg}")
                # Check for common errors
                if "Token expired" in error_msg or "expired" in error_msg.lower():
                    raise TokenExpiredError()
                elif "Invalid token" in error_msg or "invalid" in error_msg.lower():
                    raise InvalidTokenError("Invalid Google token.")
                else:
                    raise InvalidTokenError(f"Token verification failed: {error_msg}")
            except ssl.SSLError as e:
                # Security: Don't retry SSL certificate validation errors (could be MITM attack)
                error_str = str(e).lower()
                if "certificate" in error_str or "verify" in error_str:
                    logger.error(f"❌ [AUTH] SSL certificate validation failed: {str(e)}")
                    raise ExternalServiceError("SSL certificate verification failed")
                # Only retry transient SSL/network errors (EOF, connection reset)
                elif ("eof" in error_str or "connection" in error_str) and attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"⚠️ [AUTH] Transient network error (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    logger.info(f"🔄 [AUTH] Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    # Non-retryable SSL error
                    logger.error(f"❌ [AUTH] SSL error: {str(e)}")
                    raise ExternalServiceError("SSL connection error during token verification")
            except (Urllib3SSLError, OSError) as e:
                # Handle other network errors with retry
                error_str = str(e).lower()
                if attempt < max_retries - 1 and ("eof" in error_str or "connection" in error_str):
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"⚠️ [AUTH] Network error (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    logger.info(f"🔄 [AUTH] Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    # Last attempt failed or non-retryable error
                    logger.error(f"❌ [AUTH] Network/SSL error: {str(e)}")
                    raise ExternalServiceError("Unable to verify token due to network error")
            except Exception as e:
                # Other unexpected errors
                error_msg = str(e)
                error_str = error_msg.lower()
                # Check if it's an SSL/network error that wasn't caught above
                is_ssl_error = (
                    "ssl" in error_str or 
                    "eof" in error_str or 
                    "unexpected_eof" in error_str or
                    "connection" in error_str
                )
                
                if is_ssl_error and attempt < max_retries - 1:
                    # Retry with exponential backoff
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"⚠️ [AUTH] Network error (attempt {attempt + 1}/{max_retries}): {error_msg}")
                    logger.info(f"🔄 [AUTH] Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"❌ [AUTH] Unexpected error: {error_msg}")
                    if is_ssl_error:
                        raise ExternalServiceError("Network error during token verification")
                    else:
                        raise InvalidTokenError(f"Token verification error: {error_msg}")
        
        # If we exhausted retries without success
        if idinfo is None:
            raise ExternalServiceError("Unable to verify token after multiple attempts")
        
        # Verify issuer
        if idinfo.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
            logger.error(f"❌ [AUTH] Wrong issuer: {idinfo.get('iss')}")
            raise InvalidTokenError('Wrong token issuer.')
        
        # Ensure required fields are present
        if 'sub' not in idinfo or 'email' not in idinfo:
            logger.error(f"❌ [AUTH] Missing required fields")
            raise InvalidTokenError('Missing required token fields.')
        
        user_info = {
            "google_id": idinfo['sub'],
            "email": idinfo['email'],
            "name": idinfo.get('name', idinfo.get('email', '').split('@')[0]),
            "avatar_url": idinfo.get('picture', '')
        }
        logger.info(f"✅ [AUTH] User info extracted: {user_info.get('email')}")
        return user_info
    except (TokenExpiredError, InvalidTokenError, ExternalServiceError):
        # Re-raise custom exceptions
        raise
    except Exception as e:
        logger.error(f"❌ [AUTH] Error in verify_google_token_impl: {str(e)}")
        raise InvalidTokenError(f"Invalid Google token: {str(e)}")


def verify_google_token(token: str) -> dict:
    """Verify Google OAuth ID token with circuit breaker for resilience.
    
    Uses circuit breaker to prevent cascading failures if Google OAuth service is down.
    
    Args:
        token: Google OAuth ID token
        
    Returns:
        Dict with: google_id, email, name, avatar_url
        
    Raises:
        TokenExpiredError: If token has expired
        InvalidTokenError: If token is invalid or signature doesn't match
        ExternalServiceError: If OAuth service is unavailable
        HTTPException: For other authentication failures
    """
    try:
        # Use circuit breaker with 120s timeout (Google OAuth can be slow)
        user_info = GOOGLE_OAUTH_BREAKER.call(verify_google_token_impl, token)
        return user_info
    except CircuitBreakerOpenError:
        logger.error("❌ [AUTH] Google OAuth circuit breaker is OPEN - service unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable. Please try again in a moment."
        )
    except (TokenExpiredError, InvalidTokenError) as e:
        logger.error(f"❌ [AUTH] Token validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except ExternalServiceError as e:
        logger.error(f"❌ [AUTH] External service error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify token. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [AUTH] Unexpected error in verify_google_token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
