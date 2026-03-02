"""Token management with refresh tokens and blacklist system."""

from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, create_engine, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Token configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days

if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")
if len(SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY must be at least 32 characters")

# For token blacklist (Redis recommended in production)
# This is in-memory for now, but should migrate to Redis
TOKEN_BLACKLIST = {}  # {token_hash: expiration_time}
MAX_BLACKLIST_SIZE = 10000  # Prevent unbounded memory growth


class TokenBlacklist:
    """Token blacklist for invalidation."""

    MAX_SIZE = MAX_BLACKLIST_SIZE

    @property
    def blacklist(self):
        return TOKEN_BLACKLIST

    @staticmethod
    def add_to_blacklist(token: str, expires_at: datetime) -> None:
        """Add token to blacklist.
        
        Args:
            token: JWT token to blacklist
            expires_at: Token expiration time
        """
        try:
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            # Cleanup old entries if blacklist too large
            if len(TOKEN_BLACKLIST) > MAX_BLACKLIST_SIZE:
                now = datetime.utcnow()
                expired_tokens = [
                    k for k, v in TOKEN_BLACKLIST.items() 
                    if v < now
                ]
                for k in expired_tokens[:500]:  # Remove oldest 500
                    del TOKEN_BLACKLIST[k]
            
            TOKEN_BLACKLIST[token_hash] = expires_at
            logger.info(f"Token added to blacklist, expiring at {expires_at}")
        except Exception as e:
            logger.error(f"Error adding token to blacklist: {e}")
    
    @staticmethod
    def is_blacklisted(token: str) -> bool:
        """Check if token is blacklisted.
        
        Args:
            token: JWT token to check
            
        Returns:
            True if token is blacklisted and not expired, False otherwise
        """
        try:
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            if token_hash not in TOKEN_BLACKLIST:
                return False
            
            # Check if blacklist entry has expired
            if TOKEN_BLACKLIST[token_hash] < datetime.utcnow():
                del TOKEN_BLACKLIST[token_hash]
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error checking token blacklist: {e}")
            return False


def create_token_pair(data: dict) -> Tuple[str, str]:
    """Create both access and refresh tokens.
    
    Args:
        data: Dictionary with user information (must include 'sub' for user_id)
        
    Returns:
        Tuple of (access_token, refresh_token)
    """
    try:
        # Access token (short-lived: 1 hour)
        access_data = data.copy()
        access_expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_data.update({
            "exp": access_expire,
            "type": "access",  # Mark as access token
            "iat": datetime.utcnow()
        })
        access_token = jwt.encode(access_data, SECRET_KEY, algorithm=ALGORITHM)
        
        # Refresh token (long-lived: 30 days)
        refresh_data = data.copy()
        refresh_expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_data.update({
            "exp": refresh_expire,
            "type": "refresh",  # Mark as refresh token
            "iat": datetime.utcnow()
        })
        refresh_token = jwt.encode(refresh_data, SECRET_KEY, algorithm=ALGORITHM)
        
        logger.info(f"Token pair created for user {data.get('sub')}")
        return access_token, refresh_token
    except Exception as e:
        logger.error(f"Error creating token pair: {e}")
        raise


def verify_access_token(token: str) -> dict:
    """Verify access token and return payload.
    
    Args:
        token: JWT access token
        
    Returns:
        Token payload
        
    Raises:
        ValueError: If token is invalid, expired, or blacklisted
    """
    try:
        # Check if token is blacklisted
        if TokenBlacklist.is_blacklisted(token):
            from exceptions import TokenRevokedError
            raise TokenRevokedError()
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify token type
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing user ID (sub)")
        
        logger.info(f"Access token verified for user {user_id}")
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise ValueError(f"Token verification failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error verifying access token: {e}")
        raise


def verify_refresh_token(token: str) -> dict:
    """Verify refresh token and return payload.
    
    Args:
        token: JWT refresh token
        
    Returns:
        Token payload
        
    Raises:
        ValueError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify token type
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type - expected refresh token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing user ID (sub)")
        
        logger.info(f"Refresh token verified for user {user_id}")
        return payload
    except JWTError as e:
        logger.warning(f"Refresh token verification failed: {e}")
        raise ValueError(f"Token verification failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error verifying refresh token: {e}")
        raise


def revoke_token(token: str) -> bool:
    """Revoke an access token.
    
    Args:
        token: JWT token to revoke
        
    Returns:
        True if revocation successful
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        expires_at = datetime.fromtimestamp(payload.get("exp"))
        TokenBlacklist.add_to_blacklist(token, expires_at)
        logger.info(f"Token revoked for user {payload.get('sub')}")
        return True
    except Exception as e:
        logger.error(f"Error revoking token: {e}")
        return False


def refresh_access_token(refresh_token: str, user_data: Optional[dict] = None) -> str:
    """Generate new access token from refresh token.
    
    Args:
        refresh_token: Valid refresh token
        user_data: User information dictionary
        
    Returns:
        New access token
        
    Raises:
        ValueError: If refresh token is invalid
    """
    try:
        # Verify refresh token
        payload = verify_refresh_token(refresh_token)
        
        # Create new access token
        user_data = user_data or {}
        access_data = {
            "sub": str(payload.get("sub")),
            "email": user_data.get("email"),
        }
        access_expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_data.update({
            "exp": access_expire,
            "type": "access",
            "iat": datetime.utcnow()
        })
        
        access_token = jwt.encode(access_data, SECRET_KEY, algorithm=ALGORITHM)
        logger.info(f"New access token generated from refresh token for user {payload.get('sub')}")
        return access_token
    except Exception as e:
        logger.error(f"Error refreshing access token: {e}")
        raise
