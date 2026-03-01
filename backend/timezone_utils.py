"""Timezone utility functions for IST (India Standard Time) handling."""
from datetime import datetime, timezone, timedelta
from typing import Optional

# IST is UTC+5:30
IST_OFFSET = timedelta(hours=5, minutes=30)
IST_TIMEZONE = timezone(IST_OFFSET)


def get_ist_now() -> datetime:
    """
    Get current time in IST (India Standard Time, UTC+5:30).
    Returns a timezone-aware datetime object in IST.
    NOTE: Use this for business logic, but store UTC in database.
    """
    return datetime.now(timezone.utc).astimezone(IST_TIMEZONE)


def get_utc_now() -> datetime:
    """
    Get current time in UTC.
    Returns a timezone-aware datetime object in UTC.
    Use this for storing timestamps in the database.
    """
    return datetime.now(timezone.utc)


def utc_to_ist(utc_dt: datetime) -> datetime:
    """
    Convert UTC datetime to IST.
    If input is naive (no timezone), assumes it's UTC.
    """
    if utc_dt.tzinfo is None:
        # Assume it's UTC if naive
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(IST_TIMEZONE)


def ist_to_utc(ist_dt: datetime) -> datetime:
    """
    Convert IST datetime to UTC.
    If input is naive (no timezone), assumes it's IST.
    """
    if ist_dt.tzinfo is None:
        # Assume it's IST if naive
        ist_dt = ist_dt.replace(tzinfo=IST_TIMEZONE)
    return ist_dt.astimezone(timezone.utc)
