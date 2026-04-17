"""API routes for user authentication, progress tracking, and dashboards."""
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status, Query, Request
from sqlalchemy.orm import Session, load_only
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import time
from timezone_utils import get_ist_now, get_utc_now, utc_to_ist

from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

from models import User, PracticeSession, Attempt, PaperAttempt, Paper, StudentProfile, ProfileAuditLog, VacantId, PointsLog, Certificate, Organization, get_db
from auth import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    clear_auth_cookies,
    get_current_user,
    get_current_admin,
    get_bearer_or_cookie_token,
    security,
    set_auth_cookies,
    verify_google_token,
    create_access_token,
    get_admin_email_set,
    normalize_email,
)
from fastapi.security import HTTPAuthorizationCredentials
from token_manager import create_token_pair, refresh_access_token, verify_refresh_token
from user_schemas import (
    LoginRequest, LoginResponse, UserResponse, PracticeSessionCreate,
    PracticeSessionResponse, StudentStats, AdminStats,
    PracticeSessionDetailResponse, AttemptResponse,
    StudentProfileResponse, StudentProfileUpdate, ProfileAuditLogResponse,
    PaperAttemptResponse, PaperAttemptDetailResponse,
    StudentIDInfo, UpdateStudentIDRequest, UpdateStudentIDResponse,
    PointsLogResponse, PointsSummaryResponse,
    RefreshTokenRequest, RefreshTokenResponse,
    StudentDashboardData, AdminDashboardData, DatabaseStatsSchema,
    AdminCreateStudentRequest, AdminUpdateStudentRequest, AdminStudentResponse,
    CertificateCreate, CertificateUpdate, CertificateResponse,
    ActiveStudentEntry, ActiveStudentsDayRecord,
    AdminSiteInsightsResponse, StudentEngagementResponse,
    StudentOnlineDay, AdminActivityEntry,
)
from student_profile_utils import (
    validate_level, validate_course, validate_branch, validate_status,
    validate_level_type, generate_public_id
)
from pydantic import BaseModel
from typing import Optional, List
import uuid as uuid_module
from input_sanitizer import sanitize_display_name, sanitize_string_field

# Rate limiter for API endpoints
limiter = Limiter(key_func=get_remote_address)

class UpdateDisplayNameRequest(BaseModel):
    display_name: Optional[str] = None

from gamification import calculate_points
from point_rule_engine import (
    point_rule_engine, normalize_operation, determine_tool,
    determine_config_mode, normalize_burst_preset_key,
)
from session_validator import session_validator

router = APIRouter(prefix="/users", tags=["users"])


def _to_ist_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return utc_to_ist(dt).isoformat()


def _get_admin_owned_org_ids(admin: User, db: Session) -> List[str]:
    rows = db.query(Organization.id).filter(Organization.owner_user_id == admin.id).all()
    return [r[0] for r in rows]


def _get_scoped_student_ids(admin: User, db: Session) -> Optional[List[int]]:
    """Return student IDs visible to this admin.

    - platform_admin → None (global scope)
    - org owner      → only students in owned org(s)
    - fallback       → None (legacy admins without org mapping keep old behavior)
    """
    if (admin.system_role or "") == "platform_admin":
        return None

    owned_org_ids = _get_admin_owned_org_ids(admin, db)
    if not owned_org_ids:
        return None

    rows = (
        db.query(User.id)
        .join(StudentProfile, StudentProfile.user_id == User.id)
        .filter(
            User.role == "student",
            StudentProfile.org_id.in_(owned_org_ids),
        )
        .all()
    )
    return [r[0] for r in rows]


def _active_students_between(
    db: Session,
    scoped_ids: Optional[List[int]],
    start_utc: datetime,
    end_utc: datetime,
) -> List[ActiveStudentEntry]:
    ps_q = db.query(PracticeSession.user_id).filter(
        PracticeSession.started_at >= start_utc,
        PracticeSession.started_at < end_utc,
    )
    pa_q = db.query(PaperAttempt.user_id).filter(
        PaperAttempt.started_at >= start_utc,
        PaperAttempt.started_at < end_utc,
    )
    if scoped_ids is not None:
        if not scoped_ids:
            return []
        ps_q = ps_q.filter(PracticeSession.user_id.in_(scoped_ids))
        pa_q = pa_q.filter(PaperAttempt.user_id.in_(scoped_ids))

    ps_ids = {r[0] for r in ps_q.distinct().all()}
    pa_ids = {r[0] for r in pa_q.distinct().all()}
    user_ids = sorted(ps_ids | pa_ids)
    if not user_ids:
        return []

    latest_ps = dict(
        db.query(PracticeSession.user_id, func.max(PracticeSession.started_at))
        .filter(PracticeSession.user_id.in_(user_ids))
        .group_by(PracticeSession.user_id)
        .all()
    )
    latest_pa = dict(
        db.query(PaperAttempt.user_id, func.max(PaperAttempt.started_at))
        .filter(PaperAttempt.user_id.in_(user_ids))
        .group_by(PaperAttempt.user_id)
        .all()
    )

    rows = (
        db.query(
            User.id,
            User.name,
            User.display_name,
            User.email,
            User.avatar_url,
            StudentProfile.public_id,
            StudentProfile.branch,
            StudentProfile.course,
        )
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .filter(User.id.in_(user_ids))
        .all()
    )

    result: List[ActiveStudentEntry] = []
    for r in rows:
        last_ts = latest_ps.get(r.id)
        pa_ts = latest_pa.get(r.id)
        if pa_ts and (not last_ts or pa_ts > last_ts):
            last_ts = pa_ts
        result.append(
            ActiveStudentEntry(
                user_id=r.id,
                name=r.name,
                display_name=r.display_name,
                email=r.email,
                avatar_url=r.avatar_url,
                public_id=r.public_id,
                branch=r.branch,
                course=r.course,
                last_active_at=_to_ist_iso(last_ts),
            )
        )

    result.sort(key=lambda s: s.last_active_at or "", reverse=True)
    return result


def _active_last_7_days(
    db: Session,
    scoped_ids: Optional[List[int]],
    now_ist: datetime,
) -> tuple[List[ActiveStudentsDayRecord], int]:
    day_records: List[ActiveStudentsDayRecord] = []
    unique_ids: set[int] = set()

    for days_ago in range(6, -1, -1):
        day_ist = (now_ist - timedelta(days=days_ago)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day_ist = day_ist + timedelta(days=1)
        day_start = day_ist.astimezone(timezone.utc)
        day_end = next_day_ist.astimezone(timezone.utc)
        students = _active_students_between(db, scoped_ids, day_start, day_end)
        unique_ids.update(s.user_id for s in students)
        day_records.append(
            ActiveStudentsDayRecord(
                date=day_ist.date().isoformat(),
                count=len(students),
                students=students,
            )
        )

    return day_records, len(unique_ids)


def _assert_student_in_scope(admin: User, db: Session, student_id: int) -> None:
    scoped_ids = _get_scoped_student_ids(admin, db)
    if scoped_ids is not None and student_id not in set(scoped_ids):
        raise HTTPException(status_code=404, detail="Student not found")


def _build_recent_activity_entries(
    db: Session,
    scoped_ids: Optional[List[int]],
    limit: int = 50,
) -> List[AdminActivityEntry]:
    practice_q = db.query(
        PracticeSession.user_id,
        PracticeSession.started_at,
        PracticeSession.time_taken,
        PracticeSession.correct_answers,
        PracticeSession.wrong_answers,
        PracticeSession.operation_type,
    )
    paper_q = db.query(
        PaperAttempt.user_id,
        PaperAttempt.started_at,
        PaperAttempt.time_taken,
        PaperAttempt.correct_answers,
        PaperAttempt.wrong_answers,
        PaperAttempt.paper_title,
    )

    if scoped_ids is not None:
        if not scoped_ids:
            return []
        practice_q = practice_q.filter(PracticeSession.user_id.in_(scoped_ids))
        paper_q = paper_q.filter(PaperAttempt.user_id.in_(scoped_ids))

    practice_rows = practice_q.order_by(desc(PracticeSession.started_at)).limit(limit).all()
    paper_rows = paper_q.order_by(desc(PaperAttempt.started_at)).limit(limit).all()

    user_ids = {r.user_id for r in practice_rows} | {r.user_id for r in paper_rows}
    if not user_ids:
        return []

    profiles = {
        r.user_id: r
        for r in db.query(StudentProfile.user_id, StudentProfile.public_id)
        .filter(StudentProfile.user_id.in_(user_ids))
        .all()
    }
    users = {
        r.id: r
        for r in db.query(User.id, User.name, User.email)
        .filter(User.id.in_(user_ids))
        .all()
    }

    merged: List[tuple[datetime, AdminActivityEntry]] = []
    for row in practice_rows:
        u = users.get(row.user_id)
        if not u:
            continue
        p = profiles.get(row.user_id)
        ts = row.started_at if row.started_at.tzinfo else row.started_at.replace(tzinfo=timezone.utc)
        merged.append((
            ts,
            AdminActivityEntry(
                student_id=row.user_id,
                name=u.name,
                email=u.email,
                public_id=p.public_id if p else None,
                activity_type="mental_math",
                activity_label=row.operation_type or "Mental Math",
                activity_at=_to_ist_iso(row.started_at) or "",
                duration_seconds=row.time_taken,
                correct_answers=row.correct_answers,
                wrong_answers=row.wrong_answers,
            ),
        ))

    for row in paper_rows:
        u = users.get(row.user_id)
        if not u:
            continue
        p = profiles.get(row.user_id)
        ts = row.started_at if row.started_at.tzinfo else row.started_at.replace(tzinfo=timezone.utc)
        merged.append((
            ts,
            AdminActivityEntry(
                student_id=row.user_id,
                name=u.name,
                email=u.email,
                public_id=p.public_id if p else None,
                activity_type="practice_paper",
                activity_label=row.paper_title or "Practice Paper",
                activity_at=_to_ist_iso(row.started_at) or "",
                duration_seconds=row.time_taken,
                correct_answers=row.correct_answers,
                wrong_answers=row.wrong_answers,
            ),
        ))

    merged.sort(key=lambda x: x[0], reverse=True)
    return [x[1] for x in merged[:limit]]


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")  # Security: Rate limit login attempts to prevent brute force
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """Login with Google OAuth token."""
    try:
        # Get token from either credential or token field
        try:
            token = login_data.get_token()
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        print(f"🟢 [LOGIN] Login attempt received, token length: {len(token)}")
        print(f"🟢 [LOGIN] Token source: {'credential' if login_data.credential else 'token'}")
        
        # Verify Google token — run the sync/blocking call in a thread pool so it
        # does not block the async event loop (verify_google_token_impl uses time.sleep
        # for retry back-off, which would stall all concurrent requests otherwise).
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            user_info = await loop.run_in_executor(None, verify_google_token, token)
            print(f"✅ [LOGIN] Token verified, user info: {user_info.get('email', 'N/A')}")
        except HTTPException as e:
            # Re-raise HTTP exceptions from verify_google_token
            print(f"❌ [LOGIN] Token verification failed: {e.detail}")
            raise
        except Exception as e:
            print(f"❌ [LOGIN] Token verification error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )
        
        # Find or create user
        user = db.query(User).filter(User.google_id == user_info["google_id"]).first()

        # ── Pre-created account fallback ─────────────────────────────────────
        # Admin may have pre-created a student account with an email but no google_id.
        # When that student logs in via Google OAuth for the first time, link accounts.
        if not user and user_info.get("email"):
            preexisting = db.query(User).filter(
                User.email == user_info["email"],
                User.google_id == None  # noqa: E711 — SQLAlchemy IS NULL
            ).first()
            if preexisting:
                # Link the Google account to the pre-created record
                preexisting.google_id = user_info["google_id"]
                preexisting.name = user_info["name"]  # Update name from Google
                preexisting.avatar_url = user_info.get("avatar_url")
                db.commit()
                user = preexisting
                print(f"🔗 [LOGIN] Linked pre-created account for {user_info['email']}")
        
        # Check if admin email (you can set this in environment)
        admin_emails = get_admin_email_set()
        is_admin_email = normalize_email(user_info["email"]) in admin_emails
        
        if not user:
            # New user - assign role based on admin emails
            role = "admin" if is_admin_email else "student"
            
            user = User(
                google_id=user_info["google_id"],
                email=user_info["email"],
                name=user_info["name"],
                avatar_url=user_info.get("avatar_url"),
                role=role,
                system_role="platform_admin" if is_admin_email else "user",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create student profile WITHOUT public ID - admin must assign it manually
            if role == "student":
                import uuid as uuid_module
                profile = StudentProfile(
                    user_id=user.id,
                    internal_uuid=str(uuid_module.uuid4())
                    # public_id is NOT assigned - admin must assign it through Student ID Management page
                )
                db.add(profile)

            db.commit()
        else:
            # Existing user - update info and check if role needs updating
            user.name = user_info["name"]
            user.avatar_url = user_info.get("avatar_url")
            
            # Update role if email is in admin list (promote to admin)
            # Or demote if email is removed from admin list (but keep existing admins unless explicitly removed)
            if is_admin_email and user.role != "admin":
                print(f"🔄 [AUTH] Promoting user {user.email} to admin (found in ADMIN_EMAILS)")
                user.role = "admin"
            elif not is_admin_email and user.role == "admin":
                pass
            # Sync system_role
            if is_admin_email and getattr(user, 'system_role', None) != "platform_admin":
                user.system_role = "platform_admin"
            elif not is_admin_email and getattr(user, 'system_role', None) != "user":
                user.system_role = "user"
            
            db.commit()
        
        # Create token pair - sub must be a string for JWT
        access_token, refresh_token = create_token_pair(data={
            "sub": str(user.id),
            "email": user.email
        })
        
        # Build user response with public_id, branch, course and level
        user_dict = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "role": user.role,
            "total_points": user.total_points,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "created_at": user.created_at,
            "public_id": None,
            "branch": None,
            "course": None,
            "level": None,
        }
        
        # Get public_id, branch, course, level from student profile if exists
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if profile:
            user_dict["public_id"] = profile.public_id
            user_dict["branch"] = profile.branch
            user_dict["course"] = profile.course
            user_dict["level"] = profile.level

        # ── Daily login bonus (idempotent per IST day) ────────────────────────
        login_bonus_points = 0
        try:
            from reward_engine import reward_engine
            login_result = reward_engine.record_daily_login(db, user.id)
            login_bonus_points = login_result.points_awarded
            if login_bonus_points > 0:
                db.commit()
                db.refresh(user)
                user_dict["total_points"] = user.total_points
                print(f"🎁 [LOGIN] Daily login bonus: +{login_bonus_points} pts for user {user.id}")
        except Exception as _login_err:
            logger.warning("[REWARD] daily login bonus failed: %s", _login_err, exc_info=True)
        
        set_auth_cookies(response, access_token, refresh_token)
        logger.info("✅ [LOGIN] Login successful for user: %s", user.email)
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user_dict)
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/auth/refresh", response_model=RefreshTokenResponse)
@limiter.limit("20/minute")  # Allow more frequent refresh attempts
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        logger.info("🔄 [REFRESH] Token refresh attempt")
        refresh_token = refresh_data.refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing. Please log in again."
            )
        
        # Verify refresh token and get payload
        try:
            payload = verify_refresh_token(refresh_token)
            user_id = int(payload.get("sub"))
        except ValueError as e:
            clear_auth_cookies(response)
            logger.warning("❌ [REFRESH] Invalid refresh token: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token. Please log in again."
            )
        except Exception as e:
            clear_auth_cookies(response)
            logger.exception("❌ [REFRESH] Token verification error: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed. Please log in again."
            )
        
        # Verify user still exists and is active
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            clear_auth_cookies(response)
            logger.warning("❌ [REFRESH] User %s not found", user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please log in again."
            )
        
        # Generate new access token
        new_access_token = refresh_access_token(
            refresh_token,
            user_data={"email": user.email}
        )
        set_auth_cookies(response, new_access_token, refresh_token)
        
        logger.info("✅ [REFRESH] Token refreshed successfully for user: %s", user.email)
        return RefreshTokenResponse(access_token=new_access_token)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("❌ [REFRESH] Unexpected error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed. Please try again or log in."
        )


@router.post("/auth/logout")
async def logout(
    response: Response,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Logout current user and clear auth cookies."""
    token = get_bearer_or_cookie_token(
        request,
        credentials,
        cookie_name=ACCESS_COOKIE_NAME,
    )
    if token:
        from token_manager import revoke_token
        revoke_token(token)
    clear_auth_cookies(response)
    return {"success": True}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user info."""
    import time
    request_start = time.time()
    # Build user dict with public_id from student profile
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "total_points": current_user.total_points,
        "current_streak": current_user.current_streak,
        "longest_streak": current_user.longest_streak,
        "created_at": current_user.created_at,
        "public_id": None,
        "branch": None,
        "course": None,
        "level": None,
    }
    
    # Get public_id, branch, course, level from student profile if exists
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile:
        user_dict["public_id"] = profile.public_id
        user_dict["branch"] = profile.branch
        user_dict["course"] = profile.course
        user_dict["level"] = profile.level
    
    elapsed = time.time() - request_start
    if elapsed > 0.5:  # Only log if slow
        print(f"⏱ [ME] GET /users/me took {elapsed:.2f}s")
    
    return UserResponse.model_validate(user_dict)


@router.put("/me/display-name", response_model=UserResponse)
async def update_display_name(
    request: UpdateDisplayNameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's display name."""
    # Security: Sanitize display name input to prevent XSS
    try:
        if request.display_name is not None:
            sanitized_name = sanitize_display_name(request.display_name)
            current_user.display_name = sanitized_name
        else:
            current_user.display_name = None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


def _bg_reward_practice_session(
    session_id: int,
    user_id: int,
    tool: str,
    points_earned: int,
    correct_answers: int,
    metadata: dict,
) -> None:
    """
    Background task: record reward events (badge evaluation, streak update, burst bonus)
    after the HTTP response for a practice session has already been sent.
    Uses its own DB session so it never blocks the request lifecycle.
    """
    from models import SessionLocal
    from reward_engine import reward_engine
    _db = SessionLocal()
    try:
        reward_engine.record_session_completed(
            db=_db,
            student_id=user_id,
            source_tool=tool,
            points_earned=points_earned,
            correct_answers=correct_answers,
            metadata=metadata,
        )
        if tool == "burst_mode":
            reward_engine.record_burst_completion(
                db=_db,
                student_id=user_id,
                score=correct_answers,
                session_id=session_id,
            )
        _db.commit()
    except Exception as _exc:
        _db.rollback()
        import logging as _log
        _log.getLogger(__name__).warning(
            "[BG_REWARD] practice_session session_id=%s failed: %s", session_id, _exc
        )
    finally:
        _db.close()


@router.post("/practice-session", response_model=PracticeSessionResponse)
async def save_practice_session(
    session_data: PracticeSessionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a practice session with all attempts.

    Idempotency: if the same user submits an identical session (same op, mode,
    question counts) within 60 seconds we return the already-committed record
    without awarding points a second time.  This guards against the API client
    retry logic that fires whenever a request times out or the connection drops
    after the backend has already committed.
    """
    import time
    request_start = time.time()
    try:
        # ── Idempotency guard ─────────────────────────────────────────────────
        # The API client retries mutations on network errors (ERR_EMPTY_RESPONSE,
        # timeout, etc.).  Without this check a retry after a dropped connection
        # would award points twice even though the first request already committed.
        sixty_secs_ago = get_utc_now() - timedelta(seconds=60)
        existing_session = db.query(PracticeSession).filter(
            PracticeSession.user_id == current_user.id,
            PracticeSession.operation_type == session_data.operation_type,
            PracticeSession.difficulty_mode == session_data.difficulty_mode,
            PracticeSession.total_questions == session_data.total_questions,
            PracticeSession.correct_answers == session_data.correct_answers,
            PracticeSession.wrong_answers == session_data.wrong_answers,
            PracticeSession.started_at >= sixty_secs_ago
        ).order_by(PracticeSession.started_at.desc()).first()
        if existing_session:
            print(f"⚠️ [PRACTICE_SESSION] Duplicate detected for user {current_user.id} "
                  f"(session {existing_session.id}), returning existing record")
            # Ensure datetime fields are tz-aware before serialising
            if existing_session.started_at and existing_session.started_at.tzinfo is None:
                existing_session.started_at = existing_session.started_at.replace(tzinfo=timezone.utc)
            if existing_session.completed_at and existing_session.completed_at.tzinfo is None:
                existing_session.completed_at = existing_session.completed_at.replace(tzinfo=timezone.utc)
            return PracticeSessionResponse.model_validate(existing_session)

        # ── Points calculation via PointRuleEngine ─────────────────────────────
        attempted_questions = session_data.correct_answers + session_data.wrong_answers

        # Determine tool, operation, mode from request fields
        tool = determine_tool(session_data.difficulty_mode)
        operation = normalize_operation(session_data.operation_type)
        config_mode = determine_config_mode(session_data.difficulty_mode)

        # Resolve preset_key
        preset_key = session_data.preset_key or None
        row_count = session_data.row_count

        # For burst mode, normalise the preset_key format
        if tool == "burst_mode" and preset_key:
            preset_key = normalize_burst_preset_key(preset_key, operation)

        # Validate session meets minimum thresholds
        if tool == "burst_mode":
            is_valid, _reason = session_validator.validate_burst_mode(attempted_questions)
        else:
            is_valid, _reason = session_validator.validate_mental_math(
                operation, attempted_questions, row_count
            )

        if is_valid and config_mode != "custom":
            # Resolve per-correct points from rule engine
            per_correct, rule_id = point_rule_engine.resolve_points(
                db, tool, operation, config_mode,
                preset_key=preset_key,
                row_count=row_count,
            )
            points_earned = per_correct * session_data.correct_answers
        else:
            per_correct = 0
            rule_id = None
            points_earned = 0
        
        # ── Create practice session ───────────────────────────────────────────
        session = PracticeSession(
            user_id=current_user.id,
            operation_type=session_data.operation_type,
            difficulty_mode=session_data.difficulty_mode,
            total_questions=session_data.total_questions,
            correct_answers=session_data.correct_answers,
            wrong_answers=session_data.wrong_answers,
            accuracy=session_data.accuracy,
            score=session_data.score,
            time_taken=session_data.time_taken,
            points_earned=points_earned,
            preset_key=preset_key,
            row_count=row_count,
            completed_at=datetime.utcnow().replace(tzinfo=timezone.utc)
        )
        db.add(session)
        db.flush()  # Materialise session.id before inserting attempts
        
        # ── Save individual attempts ──────────────────────────────────────────
        for attempt_data in session_data.attempts:
            is_correct = attempt_data.get("is_correct", False)
            attempt = Attempt(
                session_id=session.id,
                question_data=attempt_data.get("question_data", {}),
                user_answer=attempt_data.get("user_answer"),
                correct_answer=attempt_data.get("correct_answer"),
                is_correct=is_correct,
                time_taken=attempt_data.get("time_taken", 0),
                question_number=attempt_data.get("question_number", 0),
                points_awarded=per_correct if is_correct else 0,
                point_rule_id=rule_id,
            )
            db.add(attempt)
        
        # ── Award points (single atomic DB-level ADD) ─────────────────────────
        # We use a core UPDATE with a server-side expression so the increment
        # is atomic even under concurrent requests.  We do NOT also do
        # `current_user.total_points += points_earned` because that would mark
        # the ORM object as dirty and cause SQLAlchemy's autoflush-on-commit to
        # emit a second (SET) update, creating a race with the ADD expression.
        # db.refresh(current_user) at the end reloads the committed value.
        from sqlalchemy import update as sa_update
        balance_before = current_user.total_points
        balance_after  = balance_before + points_earned
        db.execute(
            sa_update(User)
            .where(User.id == current_user.id)
            .values(total_points=User.total_points + points_earned)
        )

        # ── Persist points log entry ──────────────────────────────────────────
        from points_logger import log_points
        log_points(
            db=db,
            user=current_user,
            points=points_earned,
            source_type="mental_math" if tool == "mental_math" else "burst_mode",
            description=(
                f"{session_data.operation_type.replace('_', ' ').title()} "
                f"({session_data.difficulty_mode}): "
                f"{session_data.correct_answers}/{attempted_questions} correct "
                f"@ {per_correct}pts/correct"
            ),
            source_id=session.id,
            extra_data={
                "operation_type":  session_data.operation_type,
                "difficulty_mode": session_data.difficulty_mode,
                "preset_key":      preset_key,
                "per_correct":     per_correct,
                "rule_id":         rule_id,
                "correct_answers": session_data.correct_answers,
                "wrong_answers":   session_data.wrong_answers,
                "attempted_questions": attempted_questions,
                "total_questions":  session_data.total_questions,
                "accuracy":         round(session_data.accuracy, 2),
                "balance_before":   balance_before,
                "balance_after":    balance_after,
            }
        )

        # ── Reward Events (streak, badge evaluation, burst bonus) ─────────────
        # Moved to background: runs after response is sent, owns its own DB session.
        background_tasks.add_task(
            _bg_reward_practice_session,
            session.id,
            current_user.id,
            tool,
            points_earned,
            session_data.correct_answers,
            {
                "config_mode":         config_mode,
                "operation":           operation,
                "preset_key":          preset_key,
                "per_correct":         per_correct,
                "rule_id":             rule_id,
                "attempted_questions": attempted_questions,
                "total_questions":     session_data.total_questions,
                "session_id":          session.id,
            },
        )

        db.commit()
        db.refresh(session)

        # Ensure datetimes are treated as UTC (SQLAlchemy returns naive datetimes)
        if session.started_at and session.started_at.tzinfo is None:
            session.started_at = session.started_at.replace(tzinfo=timezone.utc)
        if session.completed_at and session.completed_at.tzinfo is None:
            session.completed_at = session.completed_at.replace(tzinfo=timezone.utc)

        elapsed = time.time() - request_start
        print(f"⏱ [PRACTICE_SESSION] POST /users/practice-session took {elapsed:.2f}s (fast path)")

        return PracticeSessionResponse.model_validate(session)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Rollback transaction on error
        db.rollback()
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        print(f"❌ [PRACTICE SESSION] Error saving practice session: {error_msg}")
        print(traceback_str)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save practice session: {error_msg}"
        )


@router.get("/stats", response_model=StudentStats)
def get_student_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student statistics and progress.
    
    ✓ Optimized: Uses SQL aggregates instead of loading all records
    ✓ Performance: 40-100x faster than previous N+1 implementation
    ✓ Scalability: O(1) query time regardless of student history size
    """
    import time
    request_start = time.time()
    
    # ✓ FAST: Use SQL aggregates (SUM, COUNT, AVG) instead of loading all data
    # Returns single computed row instead of thousands of records
    from sqlalchemy import and_
    
    # Mental Math Stats (PracticeSession)
    mental_stats = db.query(
        func.count(PracticeSession.id).label('total_sessions'),
        func.sum(PracticeSession.total_questions).label('total_questions'),
        func.sum(PracticeSession.correct_answers).label('total_correct'),
        func.sum(PracticeSession.wrong_answers).label('total_wrong'),
        func.avg(PracticeSession.accuracy).label('overall_accuracy')
    ).filter(
        PracticeSession.user_id == current_user.id
    ).first()

    total_mental_sessions = mental_stats.total_sessions or 0
    mental_questions = mental_stats.total_questions or 0
    mental_correct = mental_stats.total_correct or 0
    mental_wrong = mental_stats.total_wrong or 0
    mental_accuracy = mental_stats.overall_accuracy or 0

    # Paper Attempt Stats
    paper_stats = db.query(
        func.count(PaperAttempt.id).label('total_attempts'),
        func.sum(PaperAttempt.total_questions).label('total_questions'),
        func.sum(PaperAttempt.correct_answers).label('total_correct'),
        func.sum(PaperAttempt.wrong_answers).label('total_wrong'),
        func.avg(PaperAttempt.accuracy).label('overall_accuracy')
    ).filter(
        PaperAttempt.user_id == current_user.id
    ).first()

    total_paper_attempts_count = paper_stats.total_attempts or 0
    paper_questions = paper_stats.total_questions or 0
    paper_correct = paper_stats.total_correct or 0
    paper_wrong = paper_stats.total_wrong or 0
    paper_accuracy = paper_stats.overall_accuracy or 0

    # Combined totals
    total_sessions = total_mental_sessions + total_paper_attempts_count
    total_questions = mental_questions + paper_questions
    total_correct = mental_correct + paper_correct
    total_wrong = mental_wrong + paper_wrong
    overall_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
    paper_overall_accuracy = (paper_correct / paper_questions * 100) if paper_questions > 0 else 0

    badge_names = []

    # Get recent sessions (only latest 10 - fetched directly from DB with limit)
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == current_user.id
    ).order_by(desc(PracticeSession.started_at)).limit(10).all()

    # Get recent paper attempts (only latest 10 - fetched directly from DB with limit)
    # load_only: skip TOAST-stored JSON columns (generated_blocks/paper_config/answers)
    # that are not needed for PaperAttemptResponse, cutting query time from ~35s to <0.5s
    recent_paper_attempts = db.query(PaperAttempt).options(
        load_only(
            PaperAttempt.id, PaperAttempt.paper_title, PaperAttempt.paper_level,
            PaperAttempt.total_questions, PaperAttempt.correct_answers,
            PaperAttempt.wrong_answers, PaperAttempt.accuracy, PaperAttempt.score,
            PaperAttempt.time_taken, PaperAttempt.points_earned,
            PaperAttempt.started_at, PaperAttempt.completed_at, PaperAttempt.seed,
        )
    ).filter(
        PaperAttempt.user_id == current_user.id
    ).order_by(desc(PaperAttempt.started_at)).limit(10).all()
    
    # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
    for s in recent_sessions:
        if s.started_at and s.started_at.tzinfo is None:
            s.started_at = s.started_at.replace(tzinfo=timezone.utc)
        if s.completed_at and s.completed_at.tzinfo is None:
            s.completed_at = s.completed_at.replace(tzinfo=timezone.utc)
    for a in recent_paper_attempts:
        if a.started_at and a.started_at.tzinfo is None:
            a.started_at = a.started_at.replace(tzinfo=timezone.utc)
        if a.completed_at and a.completed_at.tzinfo is None:
            a.completed_at = a.completed_at.replace(tzinfo=timezone.utc)
    
    elapsed = time.time() - request_start
    # Performance: Completed stats request in {elapsed:.3f}s
    
    return StudentStats(
        total_sessions=total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=total_wrong,
        overall_accuracy=round(overall_accuracy, 2),
        total_points=current_user.total_points,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        badges=badge_names,
        recent_sessions=[PracticeSessionResponse.model_validate(s) for s in recent_sessions],
        recent_paper_attempts=[PaperAttemptResponse.model_validate(a) for a in recent_paper_attempts],
        # Practice paper metrics
        total_paper_attempts=total_paper_attempts_count,
        paper_total_questions=paper_questions,
        paper_total_correct=paper_correct,
        paper_total_wrong=paper_wrong,
        paper_overall_accuracy=round(paper_overall_accuracy, 2)
    )


@router.get("/dashboard-data", response_model=StudentDashboardData)
def get_student_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Combined student dashboard endpoint - single call returns stats, profile, and paper attempts.
    
    ✓ Single JWT validation instead of 5
    ✓ Single DB session for all queries
    ✓ Single network round trip instead of 5
    ✓ ~500ms instead of ~2500ms
    """
    import time
    request_start = time.time()
    
    from sqlalchemy import and_

    # ── 1. Stats (SQL aggregates) ──────────────────────────────────────────────
    mental_stats = db.query(
        func.count(PracticeSession.id).label('total_sessions'),
        func.sum(PracticeSession.total_questions).label('total_questions'),
        func.sum(PracticeSession.correct_answers).label('total_correct'),
        func.sum(PracticeSession.wrong_answers).label('total_wrong'),
        func.avg(PracticeSession.accuracy).label('overall_accuracy')
    ).filter(PracticeSession.user_id == current_user.id).first()

    total_mental_sessions = mental_stats.total_sessions or 0
    mental_questions = mental_stats.total_questions or 0
    mental_correct = mental_stats.total_correct or 0
    mental_wrong = mental_stats.total_wrong or 0

    paper_stats = db.query(
        func.count(PaperAttempt.id).label('total_attempts'),
        func.sum(PaperAttempt.total_questions).label('total_questions'),
        func.sum(PaperAttempt.correct_answers).label('total_correct'),
        func.sum(PaperAttempt.wrong_answers).label('total_wrong'),
        func.avg(PaperAttempt.accuracy).label('overall_accuracy')
    ).filter(PaperAttempt.user_id == current_user.id).first()

    total_paper_attempts_count = paper_stats.total_attempts or 0
    paper_questions = paper_stats.total_questions or 0
    paper_correct = paper_stats.total_correct or 0
    paper_wrong = paper_stats.total_wrong or 0

    total_sessions = total_mental_sessions + total_paper_attempts_count
    total_questions = mental_questions + paper_questions
    total_correct = mental_correct + paper_correct
    total_wrong = mental_wrong + paper_wrong
    overall_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
    paper_overall_accuracy = (paper_correct / paper_questions * 100) if paper_questions > 0 else 0

    badge_names = []

    # Recent sessions
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == current_user.id
    ).order_by(desc(PracticeSession.started_at)).limit(10).all()

    # load_only: skip TOAST JSON columns not needed by PaperAttemptResponse
    recent_paper_attempts = db.query(PaperAttempt).options(
        load_only(
            PaperAttempt.id, PaperAttempt.paper_title, PaperAttempt.paper_level,
            PaperAttempt.total_questions, PaperAttempt.correct_answers,
            PaperAttempt.wrong_answers, PaperAttempt.accuracy, PaperAttempt.score,
            PaperAttempt.time_taken, PaperAttempt.points_earned,
            PaperAttempt.started_at, PaperAttempt.completed_at, PaperAttempt.seed,
        )
    ).filter(
        PaperAttempt.user_id == current_user.id
    ).order_by(desc(PaperAttempt.started_at)).limit(10).all()
    
    # Ensure datetimes are IST
    for s in recent_sessions:
        if s.started_at and s.started_at.tzinfo is None:
            s.started_at = s.started_at.replace(tzinfo=timezone.utc)
        if s.completed_at and s.completed_at.tzinfo is None:
            s.completed_at = s.completed_at.replace(tzinfo=timezone.utc)
    for a in recent_paper_attempts:
        if a.started_at and a.started_at.tzinfo is None:
            a.started_at = a.started_at.replace(tzinfo=timezone.utc)
        if a.completed_at and a.completed_at.tzinfo is None:
            a.completed_at = a.completed_at.replace(tzinfo=timezone.utc)

    stats = StudentStats(
        total_sessions=total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=total_wrong,
        overall_accuracy=round(overall_accuracy, 2),
        total_points=current_user.total_points,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        badges=badge_names,
        recent_sessions=[PracticeSessionResponse.model_validate(s) for s in recent_sessions],
        recent_paper_attempts=[PaperAttemptResponse.model_validate(a) for a in recent_paper_attempts],
        total_paper_attempts=total_paper_attempts_count,
        paper_total_questions=paper_questions,
        paper_total_correct=paper_correct,
        paper_total_wrong=paper_wrong,
        paper_overall_accuracy=round(paper_overall_accuracy, 2)
    )

    # ── 2. Student Profile ─────────────────────────────────────────────────────
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        import uuid as _uuid
        profile = StudentProfile(
            user_id=current_user.id,
            internal_uuid=str(_uuid.uuid4())
        )
        if current_user.role == "student":
            profile.public_id = generate_public_id(db, "TH")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    profile_response = StudentProfileResponse.model_validate(profile)

    # ── 4. All paper attempts (for session history) ────────────────────────────
    # load_only: skip TOAST JSON columns (generated_blocks ~15kB each) not in PaperAttemptResponse
    # Without this: 38 rows × 3 TOAST cols × ~300ms RTT = ~35s. With this: <0.5s.
    all_paper_attempts = db.query(PaperAttempt).options(
        load_only(
            PaperAttempt.id, PaperAttempt.paper_title, PaperAttempt.paper_level,
            PaperAttempt.total_questions, PaperAttempt.correct_answers,
            PaperAttempt.wrong_answers, PaperAttempt.accuracy, PaperAttempt.score,
            PaperAttempt.time_taken, PaperAttempt.points_earned,
            PaperAttempt.started_at, PaperAttempt.completed_at, PaperAttempt.seed,
        )
    ).filter(
        PaperAttempt.user_id == current_user.id
    ).order_by(desc(PaperAttempt.started_at)).limit(50).all()
    
    for a in all_paper_attempts:
        if a.started_at and a.started_at.tzinfo is None:
            a.started_at = a.started_at.replace(tzinfo=timezone.utc)
        if a.completed_at and a.completed_at.tzinfo is None:
            a.completed_at = a.completed_at.replace(tzinfo=timezone.utc)

    paper_attempts_response = [PaperAttemptResponse.model_validate(a) for a in all_paper_attempts]

    # ── 5. Attempt counts per unique paper (eliminates N+1 waterfall) ─────────
    # Single GROUP BY query replaces N separate getPaperAttemptCount() API calls.
    count_rows = (
        db.query(
            PaperAttempt.seed,
            PaperAttempt.paper_title,
            func.count(PaperAttempt.id).label("cnt"),
        )
        .filter(
            PaperAttempt.user_id == current_user.id,
            PaperAttempt.completed_at.isnot(None),
            PaperAttempt.shared_paper_code.is_(None),
        )
        .group_by(PaperAttempt.seed, PaperAttempt.paper_title)
        .all()
    )
    attempt_counts = {f"{row.seed}_{row.paper_title}": row.cnt for row in count_rows}

    # ── 6. Code sessions (exams, duels, shared papers) ────────────────────────
    code_sessions = []

    # Exam sessions
    try:
        from exam_models import ExamSession, ExamPaper
        exam_sessions = (
            db.query(ExamSession, ExamPaper.title, ExamPaper.exam_code)
            .join(ExamPaper, ExamSession.exam_paper_id == ExamPaper.id)
            .filter(ExamSession.user_id == current_user.id)
            .order_by(desc(ExamSession.joined_at))
            .limit(20)
            .all()
        )
        from user_schemas import CodeSessionSummary
        for sess, exam_title, exam_code in exam_sessions:
            code_sessions.append(CodeSessionSummary(
                session_type="exam",
                session_id=sess.id,
                title=exam_title or "Exam",
                code=exam_code or "",
                status=sess.status,
                started_at=sess.joined_at,
                ended_at=sess.submitted_at,
                score=sess.percentage,
                rank=sess.rank,
            ))
    except Exception as _exam_exc:
        logger.warning("[DASHBOARD] exam session fetch failed: %s", _exam_exc)

    # Duel sessions
    try:
        from duel_manager import DuelSession as DS, Duel
        duel_sessions = (
            db.query(DS, Duel.code)
            .join(Duel, DS.duel_id == Duel.id)
            .filter(DS.user_id == current_user.id)
            .order_by(desc(DS.joined_at))
            .limit(20)
            .all()
        )
        for dsess, duel_code in duel_sessions:
            opponent_name = None
            try:
                # find the other player
                other = (
                    db.query(DS).filter(DS.duel_id == dsess.duel_id, DS.user_id != current_user.id).first()
                )
                if other:
                    other_user = db.query(User).filter(User.id == other.user_id).first()
                    if other_user:
                        opponent_name = other_user.display_name or other_user.name or "Opponent"
            except Exception:
                pass
            code_sessions.append(CodeSessionSummary(
                session_type="duel",
                session_id=dsess.id,
                title=f"Duel vs {opponent_name}" if opponent_name else "Duel",
                code=duel_code or "",
                status=dsess.status if hasattr(dsess, "status") else "completed",
                started_at=dsess.joined_at if hasattr(dsess, "joined_at") else None,
                ended_at=None,
                score=dsess.score if hasattr(dsess, "score") else None,
                rank=None,
            ))
    except Exception as _duel_exc:
        logger.warning("[DASHBOARD] duel session fetch failed: %s", _duel_exc)

    # Shared-paper attempts (code-based only)
    try:
        sp_attempts = (
            db.query(PaperAttempt)
            .filter(
                PaperAttempt.user_id == current_user.id,
                PaperAttempt.shared_paper_code.isnot(None),
            )
            .order_by(desc(PaperAttempt.started_at))
            .limit(20)
            .all()
        )
        for sp in sp_attempts:
            code_sessions.append(CodeSessionSummary(
                session_type="shared_paper",
                session_id=sp.id,
                title=sp.paper_title or "Shared Paper",
                code=sp.shared_paper_code or "",
                status="completed" if sp.completed_at else "in_progress",
                started_at=sp.started_at,
                ended_at=sp.completed_at,
                score=sp.accuracy,
                rank=None,
            ))
    except Exception:
        pass

    # Normalize ALL datetimes in code_sessions to timezone-aware UTC
    # BEFORE any comparison/sort to prevent offset-naive vs offset-aware errors.
    for _cs in code_sessions:
        if _cs.started_at is not None and _cs.started_at.tzinfo is None:
            _cs.started_at = _cs.started_at.replace(tzinfo=timezone.utc)
        if _cs.ended_at is not None and _cs.ended_at.tzinfo is None:
            _cs.ended_at = _cs.ended_at.replace(tzinfo=timezone.utc)

    # Sort all code sessions by started_at descending (all datetimes now UTC-aware).
    code_sessions.sort(
        key=lambda s: s.started_at or datetime(1970, 1, 1, tzinfo=timezone.utc),
        reverse=True,
    )

    elapsed = time.time() - request_start
    print(f"⏱ [DASHBOARD] GET /users/dashboard-data took {elapsed:.2f}s (combined endpoint)")

    return StudentDashboardData(
        stats=stats,
        profile=profile_response,
        paper_attempts=paper_attempts_response,
        attempt_counts=attempt_counts,
        code_sessions=code_sessions,
    )


@router.get("/practice-session/{session_id}", response_model=PracticeSessionDetailResponse)
async def get_practice_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed practice session with all attempts."""
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all attempts for this session
    attempts = db.query(Attempt).filter(
        Attempt.session_id == session_id
    ).order_by(Attempt.question_number).all()
    
    # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
    started_at = session.started_at
    completed_at = session.completed_at
    if started_at and started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if completed_at and completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=timezone.utc)
    
    return PracticeSessionDetailResponse(
        id=session.id,
        operation_type=session.operation_type,
        difficulty_mode=session.difficulty_mode,
        total_questions=session.total_questions,
        correct_answers=session.correct_answers,
        wrong_answers=session.wrong_answers,
        accuracy=session.accuracy,
        score=session.score,
        time_taken=session.time_taken,
        points_earned=session.points_earned,
        started_at=started_at,
        completed_at=completed_at,
        attempts=[AttemptResponse.model_validate(a) for a in attempts]
    )


@router.get("/admin/students/{student_id}/practice-session/{session_id}", response_model=PracticeSessionDetailResponse)
async def get_practice_session_detail_admin(
    student_id: int,
    session_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: Get detailed practice session for a specific student, with all attempts."""
    _assert_student_in_scope(admin, db, student_id)

    # Ensure the session belongs to the requested student
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.user_id == student_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found for this student")

    # Get all attempts for this session
    attempts = db.query(Attempt).filter(
        Attempt.session_id == session_id
    ).order_by(Attempt.question_number).all()

    # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
    started_at = session.started_at
    completed_at = session.completed_at
    if started_at and started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if completed_at and completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=timezone.utc)

    return PracticeSessionDetailResponse(
        id=session.id,
        operation_type=session.operation_type,
        difficulty_mode=session.difficulty_mode,
        total_questions=session.total_questions,
        correct_answers=session.correct_answers,
        wrong_answers=session.wrong_answers,
        accuracy=session.accuracy,
        score=session.score,
        time_taken=session.time_taken,
        points_earned=session.points_earned,
        started_at=started_at,
        completed_at=completed_at,
        attempts=[AttemptResponse.model_validate(a) for a in attempts]
    )


@router.get("/admin/students/{student_id}/paper-attempt/{attempt_id}", response_model=PaperAttemptDetailResponse)
async def get_paper_attempt_detail_admin(
    student_id: int,
    attempt_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: Get detailed practice paper attempt for a specific student."""
    _assert_student_in_scope(admin, db, student_id)

    paper_attempt = db.query(PaperAttempt).filter(
        PaperAttempt.id == attempt_id,
        PaperAttempt.user_id == student_id
    ).first()
    if not paper_attempt:
        raise HTTPException(status_code=404, detail="Paper attempt not found for this student")
    return PaperAttemptDetailResponse.model_validate(paper_attempt)


# Admin routes
@router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics."""
    scoped_student_ids = _get_scoped_student_ids(admin, db)

    student_query = db.query(User.id).filter(User.role == "student")
    if scoped_student_ids is not None:
        if not scoped_student_ids:
            return AdminStats(
                total_students=0,
                total_sessions=0,
                total_questions=0,
                average_accuracy=0.0,
                active_students_today=0,
                active_students_today_list=[],
                active_students_last_7_days=[],
                active_students_last_7_days_unique=0,
                top_students=[]
            )
        student_query = student_query.filter(User.id.in_(scoped_student_ids))

    student_ids = [r[0] for r in student_query.all()]
    total_students = len(student_ids)

    mental_q = db.query(PracticeSession)
    paper_q = db.query(PaperAttempt)
    if scoped_student_ids is not None:
        mental_q = mental_q.filter(PracticeSession.user_id.in_(student_ids))
        paper_q = paper_q.filter(PaperAttempt.user_id.in_(student_ids))

    total_mental_math_sessions = mental_q.count()
    total_paper_attempts = paper_q.count()
    total_sessions = total_mental_math_sessions + total_paper_attempts
    total_questions = mental_q.with_entities(func.sum(PracticeSession.total_questions)).scalar() or 0
    avg_accuracy = mental_q.with_entities(func.avg(PracticeSession.accuracy)).scalar() or 0

    ist_now = get_ist_now()
    _ist_midnight = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
    _ist_next_midnight = _ist_midnight + timedelta(days=1)
    today_start = _ist_midnight.astimezone(timezone.utc)
    today_end = _ist_next_midnight.astimezone(timezone.utc)

    active_today_students = _active_students_between(db, scoped_student_ids, today_start, today_end)
    active_7_days, active_7_days_unique = _active_last_7_days(db, scoped_student_ids, ist_now)
    
    return AdminStats(
        total_students=total_students,
        total_sessions=total_sessions,
        total_questions=int(total_questions),
        average_accuracy=round(float(avg_accuracy), 2),
        active_students_today=len(active_today_students),
        active_students_today_list=active_today_students,
        active_students_last_7_days=active_7_days,
        active_students_last_7_days_unique=active_7_days_unique,
        top_students=[]
    )


@router.get("/admin/students", response_model=List[AdminStudentResponse])
async def get_all_students(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all students (including admin-pre-created accounts)."""
    try:
        scoped_student_ids = _get_scoped_student_ids(admin, db)
        students_q = db.query(User).filter(User.role == "student")
        if scoped_student_ids is not None:
            if not scoped_student_ids:
                return []
            students_q = students_q.filter(User.id.in_(scoped_student_ids))
        students = students_q.order_by(User.id.asc()).all()

        # Bulk-fetch all profiles in one query (was: separate query per student = N+1)
        student_ids = [s.id for s in students]
        profiles_map = {}
        if student_ids:
            profiles = db.query(StudentProfile).filter(StudentProfile.user_id.in_(student_ids)).all()
            profiles_map = {p.user_id: p for p in profiles}

        result = []
        for student in students:
            prof = profiles_map.get(student.id)
            student_dict = {
                "id": student.id,
                "email": student.email,
                "name": student.name,
                "display_name": student.display_name,
                "avatar_url": student.avatar_url,
                "role": student.role,
                "total_points": student.total_points,
                "current_streak": student.current_streak,
                "longest_streak": student.longest_streak,
                "is_archived": getattr(student, "is_archived", False),
                "created_at": student.created_at,
                "public_id": prof.public_id if prof else None,
                "class_name": prof.class_name if prof else None,
                "course": prof.course if prof else None,
                "level_type": prof.level_type if prof else None,
                "level": prof.level if prof else None,
                "branch": prof.branch if prof else None,
                "status": (prof.status if prof else None) or "active",
                "join_date": prof.join_date if prof else None,
                "finish_date": prof.finish_date if prof else None,
                "parent_contact_number": prof.parent_contact_number if prof else None,
            }

            result.append(AdminStudentResponse.model_validate(student_dict))

        return result
    except Exception as e:
        # Ensure we never drop the connection without a response.
        raise HTTPException(status_code=500, detail=f"Failed to load students: {str(e)}")


@router.post("/admin/students", response_model=AdminStudentResponse)
async def create_student_admin(
    request_data: AdminCreateStudentRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin creates a student account manually (no OAuth required).
    The student can later log in via Google OAuth if the email matches.
    """
    # Validate email uniqueness if provided
    if request_data.email:
        existing_email = db.query(User).filter(User.email == request_data.email).first()
        if existing_email:
            raise HTTPException(status_code=409, detail="A user with this email already exists")

    # Create the User record (no google_id needed)
    new_user = User(
        google_id=None,
        email=request_data.email or None,
        name=request_data.name,
        display_name=request_data.display_name,
        role="student",
        total_points=0,
        current_streak=0,
        longest_streak=0,
        is_archived=False,
    )
    db.add(new_user)
    db.flush()  # Get the new user.id

    # Create associated student profile
    profile = StudentProfile(
        user_id=new_user.id,
        internal_uuid=str(uuid_module.uuid4()),
        display_name=request_data.display_name,
        class_name=request_data.class_name,
        course=request_data.course,
        level_type=request_data.level_type,
        level=request_data.level,
        branch=request_data.branch,
        status=request_data.status or "active",
        join_date=request_data.join_date,
        finish_date=request_data.finish_date,
        parent_contact_number=request_data.parent_contact_number,
    )
    db.add(profile)
    db.commit()
    db.refresh(new_user)
    db.refresh(profile)

    return AdminStudentResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        display_name=new_user.display_name,
        avatar_url=new_user.avatar_url,
        role=new_user.role,
        total_points=new_user.total_points,
        current_streak=new_user.current_streak,
        longest_streak=new_user.longest_streak,
        is_archived=new_user.is_archived,
        created_at=new_user.created_at,
        public_id=profile.public_id,
        class_name=profile.class_name,
        course=profile.course,
        level_type=profile.level_type,
        level=profile.level,
        branch=profile.branch,
        status=profile.status or "active",
        join_date=profile.join_date,
        finish_date=profile.finish_date,
        parent_contact_number=profile.parent_contact_number,
    )


@router.put("/admin/students/{student_id}/info", response_model=AdminStudentResponse)
async def update_student_info_admin(
    student_id: int,
    request_data: AdminUpdateStudentRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin updates student's basic info (name/email) and profile fields in one call."""
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Validate email uniqueness if changing email
    if request_data.email is not None and request_data.email != student.email:
        if request_data.email:  # Non-empty string
            existing_email = db.query(User).filter(
                User.email == request_data.email,
                User.id != student_id
            ).first()
            if existing_email:
                raise HTTPException(status_code=409, detail="A user with this email already exists")
        student.email = request_data.email or None

    if request_data.name is not None:
        student.name = request_data.name
    if request_data.display_name is not None:
        student.display_name = request_data.display_name or None

    # Update student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile:
        # Create profile if missing
        profile = StudentProfile(
            user_id=student.id,
            internal_uuid=str(uuid_module.uuid4()),
        )
        db.add(profile)
        db.flush()

    if request_data.display_name is not None:
        profile.display_name = request_data.display_name or None
    if request_data.class_name is not None:
        profile.class_name = request_data.class_name
    if request_data.course is not None:
        profile.course = request_data.course
    if request_data.level_type is not None:
        profile.level_type = request_data.level_type
    if request_data.level is not None:
        profile.level = request_data.level
    if request_data.branch is not None:
        profile.branch = request_data.branch
    if request_data.status is not None:
        profile.status = request_data.status
    if request_data.join_date is not None:
        profile.join_date = request_data.join_date
    if request_data.finish_date is not None:
        profile.finish_date = request_data.finish_date
    if request_data.parent_contact_number is not None:
        profile.parent_contact_number = request_data.parent_contact_number

    db.commit()
    db.refresh(student)
    db.refresh(profile)

    return AdminStudentResponse(
        id=student.id,
        email=student.email,
        name=student.name,
        display_name=student.display_name,
        avatar_url=student.avatar_url,
        role=student.role,
        total_points=student.total_points,
        current_streak=student.current_streak,
        longest_streak=student.longest_streak,
        is_archived=student.is_archived,
        created_at=student.created_at,
        public_id=profile.public_id,
        class_name=profile.class_name,
        course=profile.course,
        level_type=profile.level_type,
        level=profile.level,
        branch=profile.branch,
        status=profile.status or "active",
        join_date=profile.join_date,
        finish_date=profile.finish_date,
        parent_contact_number=profile.parent_contact_number,
    )


@router.get("/admin/students/{student_id}/stats", response_model=StudentStats)
def get_student_stats_admin(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get stats for a specific student (admin view).
    
    ✓ Optimized: Uses SQL aggregates instead of loading all records
    ✓ Performance: Same 40-100x improvement as /users/stats
    """
    _assert_student_in_scope(admin, db, student_id)

    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # ✓ FAST: Use SQL aggregates for mental math stats
    mental_stats = db.query(
        func.count(PracticeSession.id).label('total_sessions'),
        func.sum(PracticeSession.total_questions).label('total_questions'),
        func.sum(PracticeSession.correct_answers).label('total_correct'),
        func.sum(PracticeSession.wrong_answers).label('total_wrong'),
        func.avg(PracticeSession.accuracy).label('overall_accuracy')
    ).filter(
        PracticeSession.user_id == student.id
    ).first()

    total_sessions = mental_stats.total_sessions or 0
    total_questions = mental_stats.total_questions or 0
    total_correct = mental_stats.total_correct or 0
    total_wrong = mental_stats.total_wrong or 0
    overall_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
    
    # ✓ FAST: Use SQL aggregates for paper attempt stats
    paper_stats = db.query(
        func.count(PaperAttempt.id).label('total_attempts'),
        func.sum(PaperAttempt.total_questions).label('total_questions'),
        func.sum(PaperAttempt.correct_answers).label('total_correct'),
        func.sum(PaperAttempt.wrong_answers).label('total_wrong'),
        func.avg(PaperAttempt.accuracy).label('overall_accuracy')
    ).filter(
        PaperAttempt.user_id == student.id
    ).first()

    total_paper_attempts = paper_stats.total_attempts or 0
    paper_total_questions = paper_stats.total_questions or 0
    paper_total_correct = paper_stats.total_correct or 0
    paper_total_wrong = paper_stats.total_wrong or 0
    paper_overall_accuracy = (paper_total_correct / paper_total_questions * 100) if paper_total_questions > 0 else 0.0
    
    badge_names = []
    
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == student.id
    ).order_by(desc(PracticeSession.started_at)).limit(10).all()
    
    # Get recent paper attempts (practice paper sessions)
    # load_only: skip TOAST JSON columns not needed by PaperAttemptResponse
    recent_paper_attempts = db.query(PaperAttempt).options(
        load_only(
            PaperAttempt.id, PaperAttempt.paper_title, PaperAttempt.paper_level,
            PaperAttempt.total_questions, PaperAttempt.correct_answers,
            PaperAttempt.wrong_answers, PaperAttempt.accuracy, PaperAttempt.score,
            PaperAttempt.time_taken, PaperAttempt.points_earned,
            PaperAttempt.started_at, PaperAttempt.completed_at, PaperAttempt.seed,
        )
    ).filter(
        PaperAttempt.user_id == student.id
    ).order_by(desc(PaperAttempt.started_at)).limit(10).all()
    
    return StudentStats(
        total_sessions=total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=total_wrong,
        overall_accuracy=round(overall_accuracy, 2),
        total_points=student.total_points,
        current_streak=student.current_streak,
        longest_streak=student.longest_streak,
        badges=badge_names,
        recent_sessions=[PracticeSessionResponse.model_validate(s) for s in recent_sessions],
        recent_paper_attempts=[PaperAttemptResponse.model_validate(a) for a in recent_paper_attempts],
        total_paper_attempts=total_paper_attempts,
        paper_total_questions=paper_total_questions,
        paper_total_correct=paper_total_correct,
        paper_total_wrong=paper_total_wrong,
        paper_overall_accuracy=round(paper_overall_accuracy, 2)
    )


@router.get("/admin/site-insights", response_model=AdminSiteInsightsResponse)
def get_admin_site_insights(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return scoped, site-level activity intelligence for admin dashboards."""
    scoped_student_ids = _get_scoped_student_ids(admin, db)
    now_ist = get_ist_now()

    current_window_start_utc = (now_ist - timedelta(minutes=15)).astimezone(timezone.utc)

    day_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end_ist = day_start_ist + timedelta(days=1)
    day_start_utc = day_start_ist.astimezone(timezone.utc)
    day_end_utc = day_end_ist.astimezone(timezone.utc)

    six_months_ago_ist = now_ist - timedelta(days=180)
    six_months_ago_utc = six_months_ago_ist.astimezone(timezone.utc)
    now_utc = now_ist.astimezone(timezone.utc)

    active_currently_students = _active_students_between(db, scoped_student_ids, current_window_start_utc, now_utc)
    active_today_students = _active_students_between(db, scoped_student_ids, day_start_utc, day_end_utc)
    active_7_days, active_7_days_unique = _active_last_7_days(db, scoped_student_ids, now_ist)
    active_6_months_students = _active_students_between(db, scoped_student_ids, six_months_ago_utc, now_utc)

    practice_time_q = db.query(func.coalesce(func.sum(PracticeSession.time_taken), 0.0)).filter(
        PracticeSession.started_at >= six_months_ago_utc,
        PracticeSession.started_at < now_utc,
    )
    paper_time_q = db.query(func.coalesce(func.sum(PaperAttempt.time_taken), 0.0)).filter(
        PaperAttempt.started_at >= six_months_ago_utc,
        PaperAttempt.started_at < now_utc,
    )
    if scoped_student_ids is not None:
        if not scoped_student_ids:
            practice_time_q = practice_time_q.filter(False)
            paper_time_q = paper_time_q.filter(False)
        else:
            practice_time_q = practice_time_q.filter(PracticeSession.user_id.in_(scoped_student_ids))
            paper_time_q = paper_time_q.filter(PaperAttempt.user_id.in_(scoped_student_ids))

    total_time_6m = float(practice_time_q.scalar() or 0.0) + float(paper_time_q.scalar() or 0.0)
    active_6m_count = len(active_6_months_students)
    avg_time_per_user_6m = (total_time_6m / active_6m_count) if active_6m_count else 0.0

    recent_activities = _build_recent_activity_entries(db, scoped_student_ids, limit=60)

    return AdminSiteInsightsResponse(
        active_currently_count=len(active_currently_students),
        active_currently_students=active_currently_students,
        active_today_count=len(active_today_students),
        active_today_students=active_today_students,
        active_last_7_days_unique_count=active_7_days_unique,
        active_last_7_days_by_day=active_7_days,
        active_last_6_months_count=active_6m_count,
        active_last_6_months_students=active_6_months_students,
        average_time_spent_seconds_per_user_6m=round(avg_time_per_user_6m, 2),
        recent_activities=recent_activities,
    )


@router.get("/admin/students/{student_id}/engagement", response_model=StudentEngagementResponse)
def get_student_engagement_admin(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get deep engagement metrics for a student (6-month activity + all-time streak calendar)."""
    _assert_student_in_scope(admin, db, student_id)

    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    now_ist = get_ist_now()
    start_6m_ist = (now_ist - timedelta(days=180)).replace(hour=0, minute=0, second=0, microsecond=0)
    start_6m_utc = start_6m_ist.astimezone(timezone.utc)
    now_utc = now_ist.astimezone(timezone.utc)

    practice_rows = db.query(PracticeSession.started_at, PracticeSession.time_taken).filter(
        PracticeSession.user_id == student_id,
        PracticeSession.started_at >= start_6m_utc,
        PracticeSession.started_at <= now_utc,
    ).all()
    paper_rows = db.query(PaperAttempt.started_at, PaperAttempt.time_taken).filter(
        PaperAttempt.user_id == student_id,
        PaperAttempt.started_at >= start_6m_utc,
        PaperAttempt.started_at <= now_utc,
    ).all()

    per_day_seconds: dict[str, float] = {}
    last_seen_dt: Optional[datetime] = None

    for started_at, time_taken in practice_rows:
        ts = started_at if started_at.tzinfo else started_at.replace(tzinfo=timezone.utc)
        day_key = utc_to_ist(ts).date().isoformat()
        per_day_seconds[day_key] = per_day_seconds.get(day_key, 0.0) + float(time_taken or 0.0)
        if not last_seen_dt or ts > last_seen_dt:
            last_seen_dt = ts

    for started_at, time_taken in paper_rows:
        ts = started_at if started_at.tzinfo else started_at.replace(tzinfo=timezone.utc)
        day_key = utc_to_ist(ts).date().isoformat()
        per_day_seconds[day_key] = per_day_seconds.get(day_key, 0.0) + float(time_taken or 0.0)
        if not last_seen_dt or ts > last_seen_dt:
            last_seen_dt = ts

    total_time_6m = sum(per_day_seconds.values())
    online_days_count_6m = sum(1 for v in per_day_seconds.values() if v > 0)

    calendar_6m: List[StudentOnlineDay] = []
    day_cursor = start_6m_ist
    offline_days = 0
    while day_cursor.date() <= now_ist.date():
        key = day_cursor.date().isoformat()
        secs = float(per_day_seconds.get(key, 0.0))
        is_online = secs > 0
        if not is_online:
            offline_days += 1
        calendar_6m.append(StudentOnlineDay(date=key, online=is_online, time_spent_seconds=secs))
        day_cursor += timedelta(days=1)

    avg_per_active_day = (total_time_6m / online_days_count_6m) if online_days_count_6m else 0.0

    # All-time streak days are derived from days where at least one activity exists.
    all_practice_days = [r[0] for r in db.query(PracticeSession.started_at).filter(PracticeSession.user_id == student_id).all()]
    all_paper_days = [r[0] for r in db.query(PaperAttempt.started_at).filter(PaperAttempt.user_id == student_id).all()]
    streak_days = set()
    for ts in all_practice_days + all_paper_days:
        stamp = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        streak_days.add(utc_to_ist(stamp).date().isoformat())

    recent_activities = _build_recent_activity_entries(db, [student_id], limit=30)

    return StudentEngagementResponse(
        student_id=student_id,
        last_seen_at=_to_ist_iso(last_seen_dt),
        total_time_spent_seconds_6m=round(float(total_time_6m), 2),
        average_time_spent_seconds_active_day_6m=round(float(avg_per_active_day), 2),
        online_days_count_6m=online_days_count_6m,
        offline_days_count_6m=offline_days,
        online_offline_calendar_6m=calendar_6m,
        streak_days_all_time=sorted(streak_days),
        current_streak=student.current_streak or 0,
        longest_streak=student.longest_streak or 0,
        recent_activities=recent_activities,
    )


class UpdatePointsRequest(BaseModel):
    points: int
    reason: str | None = None

class DatabaseStatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_admins: int
    total_sessions: int
    total_paper_attempts: int
    total_rewards: int
    total_papers: int
    database_size_mb: float


@router.delete("/admin/students/{student_id}")
async def delete_student(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a student account and all associated data.
    
    Deletion order is explicit to be robust against any DB-level FK constraint
    configurations (some tables use RESTRICT on the user FK, e.g. RewardEvent).
    """
    from models import (
        VacantId, PointsLog,
        PaperAttempt, PracticeSession, StudentProfile,
        ProfileAuditLog, AttendanceRecord, Certificate,
        FeeAssignment, FeeTransaction,
    )
    from reward_models import (
        RewardEvent, StudentBadgeAward, MonthlyLeaderboardSnapshot,
    )
    from subscription_models import (
        UserSubscription, PaymentOrder, SubscriptionAuditLog,
    )

    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_name = student.name

    try:
        # ── Step 1: Preserve public_id in vacant_ids before any deletion ──────
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == student_id
        ).first()

        if profile and profile.public_id:
            existing_vacant = db.query(VacantId).filter(
                VacantId.public_id == profile.public_id
            ).first()
            if not existing_vacant:
                vacant_id = VacantId(
                    public_id=profile.public_id,
                    original_student_name=student.name,
                    deleted_at=datetime.utcnow().replace(tzinfo=timezone.utc),
                    deleted_by_user_id=admin.id,
                )
                db.add(vacant_id)
                db.flush()

        # ── Step 2: Delete fee transactions → fee assignments (profile chain) ──
        if profile:
            assignment_ids = [
                a.id for a in db.query(FeeAssignment.id).filter(
                    FeeAssignment.student_profile_id == profile.id
                ).all()
            ]
            if assignment_ids:
                db.query(FeeTransaction).filter(
                    FeeTransaction.assignment_id.in_(assignment_ids)
                ).delete(synchronize_session=False)
            db.query(FeeAssignment).filter(
                FeeAssignment.student_profile_id == profile.id
            ).delete(synchronize_session=False)

            # ── Step 3: Delete attendance records ────────────────────────────
            db.query(AttendanceRecord).filter(
                AttendanceRecord.student_profile_id == profile.id
            ).delete(synchronize_session=False)

            # ── Step 4: Delete certificates ──────────────────────────────────
            db.query(Certificate).filter(
                Certificate.student_profile_id == profile.id
            ).delete(synchronize_session=False)

            # ── Step 5: Delete profile audit logs ────────────────────────────
            db.query(ProfileAuditLog).filter(
                ProfileAuditLog.profile_id == profile.id
            ).delete(synchronize_session=False)

            # ── Step 6: Delete the profile itself ────────────────────────────
            db.delete(profile)
            db.flush()

        # ── Step 7: Delete leaderboard snapshots (NOT in User ORM cascade) ──
        db.query(MonthlyLeaderboardSnapshot).filter(
            MonthlyLeaderboardSnapshot.student_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 8: Delete practice sessions + their individual attempts ──────
        session_ids = [
            s.id for s in db.query(PracticeSession.id).filter(
                PracticeSession.user_id == student_id
            ).all()
        ]
        if session_ids:
            from models import Attempt
            db.query(Attempt).filter(
                Attempt.session_id.in_(session_ids)
            ).delete(synchronize_session=False)
        db.query(PracticeSession).filter(
            PracticeSession.user_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 9: Delete paper attempts ────────────────────────────────────
        db.query(PaperAttempt).filter(
            PaperAttempt.user_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 10: Delete reward events and badge awards ───────────────────
        db.query(RewardEvent).filter(
            RewardEvent.student_id == student_id
        ).delete(synchronize_session=False)
        db.query(StudentBadgeAward).filter(
            StudentBadgeAward.student_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 11: Delete points logs ──────────────────────────────────────
        db.query(PointsLog).filter(
            PointsLog.user_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 12: Delete subscription audit log (RESTRICT on user_id) ─────
        db.query(SubscriptionAuditLog).filter(
            SubscriptionAuditLog.user_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 13: Delete payment orders (RESTRICT on user_id) ─────────────
        db.query(PaymentOrder).filter(
            PaymentOrder.user_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 14: Delete user subscriptions (RESTRICT on user_id) ─────────
        db.query(UserSubscription).filter(
            UserSubscription.user_id == student_id
        ).delete(synchronize_session=False)

        # ── Step 15: Delete legacy orphaned table rows (no ORM model) ───────
        from sqlalchemy import text as _text
        for _legacy_table in ("rewards", "leaderboard"):
            try:
                db.execute(
                    _text(f"DELETE FROM {_legacy_table} WHERE user_id = :uid"),
                    {"uid": student_id},
                )
            except Exception:
                db.rollback()  # table may not exist in all envs — safe to skip

        # ── Step 16: Finally delete the user ─────────────────────────────────
        db.delete(student)
        db.commit()

    except Exception as e:
        db.rollback()
        import logging as _logging, traceback as _tb
        _logging.getLogger(__name__).error(
            "[DELETE_STUDENT] Failed for user_id=%s: %s\n%s",
            student_id, e, _tb.format_exc()
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete student '{student_name}': {str(e)}"
        )

    return {"message": f"Student {student_name} deleted successfully"}


@router.put("/admin/students/{student_id}/points")
async def update_student_points(
    student_id: int,
    request: UpdatePointsRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a student's total points."""
    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    old_points = student.total_points
    points_change = request.points - old_points
    student.total_points = max(0, request.points)  # Ensure non-negative
    db.flush()  # REQUIRED
    
    # Log points transaction if there's a change
    if points_change != 0:
        from points_logger import log_points
        log_points(
            db=db,
            user=student,
            points=points_change,
            source_type="admin_adjustment",
            description=f"Admin points adjustment by {admin.name}: {old_points} → {student.total_points}",
            extra_data={
                "old_points":    old_points,
                "new_points":    student.total_points,
                "balance_before": old_points,
                "balance_after":  student.total_points,
                "adjusted_by":   admin.id,
                "admin_name":    admin.name,
                "reason":        getattr(request, "reason", None)
            }
        )
    
    db.commit()
    
    student_name = student.name
    student_total_points = student.total_points
    
    return {
        "message": f"Points updated for {student_name}",
        "old_points": old_points,
        "new_points": student_total_points
    }


@router.get("/admin/database/stats", response_model=DatabaseStatsResponse)
async def get_database_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get database statistics."""
    try:
        total_users = db.query(User).count()
        total_students = db.query(User).filter(User.role == "student").count()
        total_admins = db.query(User).filter(User.role == "admin").count()
        total_sessions = db.query(PracticeSession).count()
        total_paper_attempts = db.query(PaperAttempt).count()
        total_rewards = 0
        total_papers = db.query(Paper).count()

        # Calculate database size (SQLite or PostgreSQL)
        import os
        from sqlalchemy import text
        db_path = os.getenv("DATABASE_URL", "sqlite:///./abacus_replitt.db")

        if db_path.startswith("sqlite:///"):
            # SQLite: get file size
            db_file = db_path.replace("sqlite:///", "")
            # If it's a relative path, make it absolute from the project root
            if not os.path.isabs(db_file):
                # Assume we're running from backend directory, go up one level
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                db_file = os.path.join(project_root, db_file)
            
            print(f"🔍 [DB STATS] Checking database file: {db_file}")
            if os.path.exists(db_file):
                db_size_mb = os.path.getsize(db_file) / (1024 * 1024)
                print(f"✅ [DB STATS] Database size: {db_size_mb:.2f} MB")
            else:
                print(f"⚠️ [DB STATS] Database file not found: {db_file}")
                db_size_mb = 0.0
        else:
            # PostgreSQL: use pg_database_size query
            try:
                if "postgresql" in db_path or "postgres" in db_path:
                    result = db.execute(text("SELECT pg_database_size(current_database()) as size_bytes"))
                    size_bytes = result.scalar()
                    if size_bytes:
                        db_size_mb = size_bytes / (1024 * 1024)
                    else:
                        db_size_mb = 0.0
                else:
                    db_size_mb = 0.0
            except Exception as e:
                print(f"⚠️ [DB STATS] Failed to get PostgreSQL size: {e}")
                db_size_mb = 0.0

        return DatabaseStatsResponse(
            total_users=total_users,
            total_students=total_students,
            total_admins=total_admins,
            total_sessions=total_sessions,
            total_paper_attempts=total_paper_attempts,
            total_rewards=total_rewards,
            total_papers=total_papers,
            database_size_mb=round(db_size_mb, 2)
        )
    except Exception as e:
        # Ensure we never drop the connection without a response.
        raise HTTPException(status_code=500, detail=f"Failed to load database stats: {str(e)}")


@router.get("/admin/dashboard-data", response_model=AdminDashboardData)
async def get_admin_dashboard_data(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Combined admin dashboard endpoint - single call replaces 3+ separate API calls.
    
    Returns: admin stats, all students, and database stats.
    
    ✓ Single JWT/admin validation instead of 3
    ✓ Single DB session for all queries
    ✓ Single network round trip instead of 3
    """
    import time
    request_start = time.time()
    
    scoped_student_ids = _get_scoped_student_ids(admin, db)
    students_scope_q = db.query(User.id).filter(User.role == "student")
    if scoped_student_ids is not None:
        if scoped_student_ids:
            students_scope_q = students_scope_q.filter(User.id.in_(scoped_student_ids))
        else:
            students_scope_q = students_scope_q.filter(False)
    scoped_ids = [r[0] for r in students_scope_q.all()]

    # ── 1. Admin Stats ─────────────────────────────────────────────────────────
    total_students = len(scoped_ids)
    mental_q = db.query(PracticeSession)
    paper_q = db.query(PaperAttempt)
    if scoped_student_ids is not None:
        if not scoped_ids:
            mental_q = mental_q.filter(False)
            paper_q = paper_q.filter(False)
        else:
            mental_q = mental_q.filter(PracticeSession.user_id.in_(scoped_ids))
            paper_q = paper_q.filter(PaperAttempt.user_id.in_(scoped_ids))

    total_mental_math_sessions = mental_q.count()
    total_paper_attempts_count = paper_q.count()
    total_sessions = total_mental_math_sessions + total_paper_attempts_count
    total_questions_val = mental_q.with_entities(func.sum(PracticeSession.total_questions)).scalar() or 0
    avg_accuracy_val = mental_q.with_entities(func.avg(PracticeSession.accuracy)).scalar() or 0
    
    ist_now = get_ist_now()
    _ist_midnight = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
    _ist_next_midnight = _ist_midnight + timedelta(days=1)
    today_start = _ist_midnight.astimezone(timezone.utc)
    today_end = _ist_next_midnight.astimezone(timezone.utc)
    active_today_students = _active_students_between(db, scoped_student_ids, today_start, today_end)
    active_7_days, active_7_days_unique = _active_last_7_days(db, scoped_student_ids, ist_now)
    
    admin_stats = AdminStats(
        total_students=total_students,
        total_sessions=total_sessions,
        total_questions=int(total_questions_val),
        average_accuracy=round(float(avg_accuracy_val), 2),
        active_students_today=len(active_today_students),
        active_students_today_list=active_today_students,
        active_students_last_7_days=active_7_days,
        active_students_last_7_days_unique=active_7_days_unique,
        top_students=[]
    )

    # ── 2. All Students (OPTIMIZED: single query for profiles instead of N+1) ──
    students_q = db.query(User).filter(User.role == "student")
    if scoped_student_ids is not None:
        if not scoped_ids:
            students_q = students_q.filter(False)
        else:
            students_q = students_q.filter(User.id.in_(scoped_ids))
    students = students_q.order_by(User.id.asc()).all()
    
    # Bulk-fetch all profiles in one query (was: separate query per student = N+1)
    student_ids = [s.id for s in students]
    profiles_map = {}
    if student_ids:
        profiles = db.query(StudentProfile).filter(StudentProfile.user_id.in_(student_ids)).all()
        profiles_map = {p.user_id: p for p in profiles}
    
    students_result = []
    for student in students:
        prof = profiles_map.get(student.id)
        student_dict = {
            "id": student.id,
            "email": student.email,
            "name": student.name,
            "display_name": student.display_name,
            "avatar_url": student.avatar_url,
            "role": student.role,
            "total_points": student.total_points,
            "current_streak": student.current_streak,
            "longest_streak": student.longest_streak,
            "is_archived": getattr(student, "is_archived", False),
            "created_at": student.created_at,
            "public_id": prof.public_id if prof else None,
            "class_name": prof.class_name if prof else None,
            "course": prof.course if prof else None,
            "level_type": prof.level_type if prof else None,
            "level": prof.level if prof else None,
            "branch": prof.branch if prof else None,
            "status": (prof.status if prof else None) or "active",
            "join_date": prof.join_date if prof else None,
            "finish_date": prof.finish_date if prof else None,
            "parent_contact_number": prof.parent_contact_number if prof else None,
        }
        students_result.append(AdminStudentResponse.model_validate(student_dict))

    # ── 3. Database Stats ──────────────────────────────────────────────────────
    total_users = total_students if scoped_student_ids is not None else db.query(User).count()
    total_admins = 0 if scoped_student_ids is not None else db.query(User).filter(User.role == "admin").count()
    total_rewards = 0
    total_papers = db.query(Paper).count()
    
    import os
    from sqlalchemy import text
    db_path = os.getenv("DATABASE_URL", "sqlite:///./abacus_replitt.db")
    
    if db_path.startswith("sqlite:///"):
        db_file = db_path.replace("sqlite:///", "")
        if not os.path.isabs(db_file):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_file = os.path.join(project_root, db_file)
        db_size_mb = os.path.getsize(db_file) / (1024 * 1024) if os.path.exists(db_file) else 0.0
    else:
        try:
            if "postgresql" in db_path or "postgres" in db_path:
                result = db.execute(text("SELECT pg_database_size(current_database()) as size_bytes"))
                size_bytes = result.scalar()
                db_size_mb = (size_bytes / (1024 * 1024)) if size_bytes else 0.0
            else:
                db_size_mb = 0.0
        except Exception:
            db_size_mb = 0.0
    
    db_stats = DatabaseStatsSchema(
        total_users=total_users,
        total_students=total_students,
        total_admins=total_admins,
        total_sessions=total_sessions,
        total_paper_attempts=total_paper_attempts_count,
        total_rewards=total_rewards,
        total_papers=total_papers,
        database_size_mb=round(db_size_mb, 2)
    )

    elapsed = time.time() - request_start
    print(f"⏱ [ADMIN] GET /users/admin/dashboard-data took {elapsed:.2f}s (combined endpoint)")

    return AdminDashboardData(
        stats=admin_stats,
        students=students_result,
        database_stats=db_stats
    )


@router.post("/admin/promote-self")
async def promote_self_to_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allow users to promote themselves to admin if their email is in ADMIN_EMAILS.
    This is useful for fixing existing users who should be admins.
    """
    admin_emails = get_admin_email_set()
    
    if normalize_email(current_user.email) not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not in the ADMIN_EMAILS list. Contact system administrator."
        )
    
    if current_user.role == "admin":
        return {
            "message": "You are already an admin",
            "email": current_user.email,
            "role": current_user.role
        }
    
    # Promote to admin
    current_user.role = "admin"
    db.commit()
    
    return {
        "message": f"Successfully promoted {current_user.email} to admin",
        "email": current_user.email,
        "role": current_user.role
    }


@router.post("/admin/reset-progress")
async def reset_all_progress_data(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ONLY: Reset all user progress data.
    
    This will:
    - Delete all practice sessions and attempts
    - Delete all paper attempts
    - Reset all user points and stats to 0
    
    This will NOT delete:
    - User accounts
    - Student profiles
    - Certificates
    """
    try:
        # 1. Delete all attempts first (child table)
        deleted_attempts = db.query(Attempt).delete()
        
        # 2. Delete all practice sessions (parent table)
        deleted_sessions = db.query(PracticeSession).delete()
        
        # 3. Delete all paper attempts
        deleted_papers = db.query(PaperAttempt).delete()
        
        # 4. Reset all user stats
        users_updated = db.query(User).update({
            User.total_points: 0,
            User.total_questions_attempted: 0,
        })
        
        # Commit all changes
        db.commit()
        
        return {
            "message": "All progress data reset successfully",
            "summary": {
                "attempts_deleted": deleted_attempts,
                "practice_sessions_deleted": deleted_sessions,
                "paper_attempts_deleted": deleted_papers,
                "users_reset": users_updated,
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset progress data: {str(e)}"
        )


# Student Profile Routes
@router.get("/valid-levels")
async def get_valid_levels(
    course: Optional[str] = Query(None),
    level_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get valid levels for a course and level type combination."""
    from student_profile_utils import get_valid_levels
    
    if not course or not level_type:
        return {"levels": []}
    
    # Trim whitespace from inputs
    course = course.strip() if course else None
    level_type = level_type.strip() if level_type else None
    
    if not course or not level_type:
        return {"levels": []}
    
    levels = get_valid_levels(course, level_type)
    return {"levels": levels}


@router.get("/profile", response_model=StudentProfileResponse)
async def get_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's student profile. Students and parents can view their own profile."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        # Auto-create profile if it doesn't exist
        profile = StudentProfile(
            user_id=current_user.id,
            internal_uuid=str(uuid_module.uuid4())
        )
        # Auto-generate public_id if user is a student
        if current_user.role == "student":
            from student_profile_utils import generate_branch_specific_id
            # Use TH prefix for now, can be updated when branch is set
            profile.public_id = generate_public_id(db, "TH")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return StudentProfileResponse.model_validate(profile)


@router.get("/profile/{user_id}", response_model=StudentProfileResponse)
async def get_student_profile_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a student profile by user ID. Students can only view their own, admins can view any."""
    # Check permissions: students can only view their own profile
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    return StudentProfileResponse.model_validate(profile)


@router.put("/profile", response_model=StudentProfileResponse)
async def update_student_profile(
    profile_data: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student profile. Students can edit basic info (display_name, class_name, parent_contact_number), admins can edit everything."""
    # Get or create profile for current user
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            internal_uuid=str(uuid_module.uuid4())
        )
        if current_user.role == "student":
            profile.public_id = generate_public_id(db)
        db.add(profile)
        db.flush()
    
    # Students can only edit basic info fields
    student_editable_fields = {"display_name", "class_name", "parent_contact_number"}
    
    # Security: Sanitize all text input fields before processing
    if profile_data.display_name:
        try:
            profile_data.display_name = sanitize_display_name(profile_data.display_name)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"display_name: {str(e)}")
    
    if profile_data.full_name:
        try:
            profile_data.full_name = sanitize_display_name(profile_data.full_name)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"full_name: {str(e)}")
    
    if profile_data.class_name:
        try:
            profile_data.class_name = sanitize_string_field(profile_data.class_name, "class_name", 100)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"class_name: {str(e)}")
    
    if profile_data.parent_contact_number:
        try:
            profile_data.parent_contact_number = sanitize_string_field(profile_data.parent_contact_number, "parent_contact_number", 20)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"parent_contact_number: {str(e)}")
    is_admin = current_user.role == "admin"
    student_editable_fields = {"display_name", "class_name", "parent_contact_number"}
    admin_only_fields = {"course", "level_type", "level", "branch", "status", "join_date", "finish_date", "full_name"}
    
    # Check if student is trying to edit admin-only fields
    # Use model_dump(exclude_unset=True) to only check fields that were actually provided in the request
    if not is_admin:
        provided_fields = profile_data.model_dump(exclude_unset=True)
        for field in admin_only_fields:
            if field in provided_fields:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Only admins can edit {field}"
                )
    
    # Validate inputs (only for admin-only fields if they're being updated)
    if profile_data.course:
        is_valid, error = validate_course(profile_data.course)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level_type:
        is_valid, error = validate_level_type(profile_data.level_type)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level:
        is_valid, error = validate_level(profile_data.course, profile_data.level_type, profile_data.level)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.branch:
        is_valid, error = validate_branch(profile_data.branch)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.status:
        is_valid, error = validate_status(profile_data.status)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    # Track changes for audit log
    changes = []
    field_mapping = {
        "full_name": "full_name",
        "display_name": "display_name",
        "class_name": "class_name",
        "course": "course",
        "level_type": "level_type",
        "level": "level",
        "branch": "branch",
        "status": "status",
        "join_date": "join_date",
        "finish_date": "finish_date",
        "parent_contact_number": "parent_contact_number"
    }
    
    for field_key, model_field in field_mapping.items():
        new_value = getattr(profile_data, field_key, None)
        if new_value is not None:
            old_value = getattr(profile, model_field, None)
            # Convert datetime to string for comparison
            if isinstance(old_value, datetime):
                old_value = old_value.isoformat() if old_value else None
            if isinstance(new_value, datetime):
                new_value = new_value.isoformat() if new_value else None
            else:
                new_value = str(new_value) if new_value is not None else None
            
            # Only log if value actually changed
            if str(old_value) != str(new_value):
                changes.append({
                    "field": model_field,
                    "old": str(old_value) if old_value is not None else None,
                    "new": new_value
                })
                setattr(profile, model_field, getattr(profile_data, field_key))
    
    # ✓ SYNC: Update User.display_name to match StudentProfile.display_name
    # This ensures consistency across all endpoints (dashboard, navbar, etc.)
    # Previously only StudentProfile.display_name was updated, causing sync issues
    if profile_data.display_name is not None:
        current_user.display_name = profile_data.display_name
    
    # Update profile
    profile.updated_at = get_utc_now()
    db.flush()
    
    # Create audit log entries
    for change in changes:
        audit_log = ProfileAuditLog(
            profile_id=profile.id,
            changed_by_user_id=current_user.id,
            field_name=change["field"],
            old_value=change["old"],
            new_value=change["new"]
        )
        db.add(audit_log)
    
    db.commit()
    db.refresh(profile)
    db.refresh(current_user)  # Refresh user to ensure display_name is updated
    
    return StudentProfileResponse.model_validate(profile)


@router.put("/profile/{user_id}", response_model=StudentProfileResponse)
async def update_student_profile_by_id(
    user_id: int,
    profile_data: StudentProfileUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a student profile by user ID. Only admins can use this endpoint."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile = StudentProfile(
            user_id=user_id,
            internal_uuid=str(uuid_module.uuid4())
        )
        if user.role == "student":
            from student_profile_utils import generate_branch_specific_id
            profile.public_id = generate_public_id(db, "TH")
        db.add(profile)
        db.flush()
    
    # Validate inputs
    if profile_data.course:
        is_valid, error = validate_course(profile_data.course)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level_type:
        is_valid, error = validate_level_type(profile_data.level_type)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level:
        is_valid, error = validate_level(profile_data.course, profile_data.level_type, profile_data.level)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.branch:
        is_valid, error = validate_branch(profile_data.branch)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.status:
        is_valid, error = validate_status(profile_data.status)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    # Track changes for audit log
    changes = []
    field_mapping = {
        "full_name": "full_name",
        "display_name": "display_name",
        "class_name": "class_name",
        "course": "course",
        "level_type": "level_type",
        "level": "level",
        "branch": "branch",
        "status": "status",
        "join_date": "join_date",
        "finish_date": "finish_date",
        "parent_contact_number": "parent_contact_number"
    }
    
    for field_key, model_field in field_mapping.items():
        new_value = getattr(profile_data, field_key, None)
        if new_value is not None:
            old_value = getattr(profile, model_field, None)
            # Convert datetime to string for comparison
            if isinstance(old_value, datetime):
                old_value = old_value.isoformat() if old_value else None
            if isinstance(new_value, datetime):
                new_value = new_value.isoformat() if new_value else None
            else:
                new_value = str(new_value) if new_value is not None else None
            
            # Only log if value actually changed
            if str(old_value) != str(new_value):
                changes.append({
                    "field": model_field,
                    "old": str(old_value) if old_value is not None else None,
                    "new": new_value
                })
                setattr(profile, model_field, getattr(profile_data, field_key))
    
    # ✓ SYNC: Update User.display_name to match StudentProfile.display_name
    # This ensures consistency across all endpoints (dashboard, navbar, etc.)
    # Previously only StudentProfile.display_name was updated, causing sync issues
    if profile_data.display_name is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.display_name = profile_data.display_name
    
    # Update profile
    profile.updated_at = datetime.utcnow().replace(tzinfo=timezone.utc)
    db.flush()
    
    # Create audit log entries
    for change in changes:
        audit_log = ProfileAuditLog(
            profile_id=profile.id,
            changed_by_user_id=admin.id,
            field_name=change["field"],
            old_value=change["old"],
            new_value=change["new"]
        )
        db.add(audit_log)
    
    db.commit()
    db.refresh(profile)
    
    return StudentProfileResponse.model_validate(profile)


@router.get("/profile/{user_id}/audit-logs", response_model=List[ProfileAuditLogResponse])
async def get_profile_audit_logs(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs for a student profile. Only admins can access."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    logs = db.query(ProfileAuditLog).filter(
        ProfileAuditLog.profile_id == profile.id
    ).order_by(desc(ProfileAuditLog.created_at)).all()
    
    # Get user names for changed_by
    result = []
    for log in logs:
        changed_by_user = db.query(User).filter(User.id == log.changed_by_user_id).first()
        log_dict = ProfileAuditLogResponse.model_validate(log).model_dump()
        log_dict["changed_by_name"] = changed_by_user.name if changed_by_user else None
        result.append(ProfileAuditLogResponse(**log_dict))

    return result


# Student ID Management Endpoints (Admin Only)

@router.get("/admin/students/{student_id}/id-info", response_model=StudentIDInfo)
async def get_student_id_info(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a student's current public ID information."""
    # Get user
    user = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()

    return StudentIDInfo(
        user_id=user.id,
        current_public_id=profile.public_id if profile else None,
        student_name=user.name,
        email=user.email
    )


@router.put("/admin/students/{student_id}/public-id", response_model=UpdateStudentIDResponse)
async def update_student_public_id(
    student_id: int,
    request: UpdateStudentIDRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a student's public ID (admin only). Simple rule: just check for duplicates."""
    from models import VacantId
    
    # Validate the new public ID is not empty
    if not request.new_public_id or not request.new_public_id.strip():
        raise HTTPException(status_code=400, detail="Public ID cannot be empty")

    new_id = request.new_public_id.strip().upper()
    
    # Validate ID format: must be TH-XXXX where XXXX is 0001-9999
    import re
    if not re.match(r'^TH-\d{4}$', new_id):
        raise HTTPException(
            status_code=400,
            detail="Public ID must be in format TH-XXXX where XXXX is a number between 0001 and 9999"
        )
    
    # Extract and validate the number part
    try:
        id_number = int(new_id.split('-')[1])
        if id_number < 1 or id_number > 9999:
            raise HTTPException(
                status_code=400,
                detail="Public ID number must be between 1 and 9999"
            )
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail="Invalid public ID format. Must be TH-XXXX where XXXX is a number"
        )

    # Check if the new ID already exists for another student
    existing_profile = db.query(StudentProfile).filter(
        StudentProfile.public_id == new_id,
        StudentProfile.user_id != student_id
    ).first()

    if existing_profile:
        raise HTTPException(
            status_code=409,
            detail=f"Public ID '{new_id}' is already assigned to another student"
        )
    
    # If assigning a vacant ID, remove it from vacant_ids
    vacant_id_entry = db.query(VacantId).filter(VacantId.public_id == new_id).first()
    if vacant_id_entry:
        db.delete(vacant_id_entry)

    # Get the student
    user = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get or create student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()

    old_public_id = profile.public_id if profile else None

    if not profile:
        # Create profile if it doesn't exist
        import uuid as uuid_module
        profile = StudentProfile(
            user_id=student_id,
            internal_uuid=str(uuid_module.uuid4())
        )
        db.add(profile)
        db.flush()

    # If old_public_id exists and is different from new_id, add it to vacant_ids
    if old_public_id and old_public_id != new_id:
        # Check if old ID is already in vacant_ids
        existing_vacant = db.query(VacantId).filter(VacantId.public_id == old_public_id).first()
        if not existing_vacant:
            vacant_id = VacantId(
                public_id=old_public_id,
                original_student_name=user.name,
                deleted_at=datetime.utcnow().replace(tzinfo=timezone.utc),
                deleted_by_user_id=admin.id
            )
            db.add(vacant_id)

    # Update the public ID
    profile.public_id = new_id
    profile.updated_at = datetime.utcnow().replace(tzinfo=timezone.utc)

    # Create audit log entry
    audit_log = ProfileAuditLog(
        profile_id=profile.id,
        changed_by_user_id=admin.id,
        field_name="public_id",   # ✅ CORRECT COLUMN NAME
        old_value=str(old_public_id) if old_public_id is not None else None,
        new_value=str(new_id),
        change_reason="Admin manually updated student public ID"
    )
    db.add(audit_log)

    db.commit()

    return UpdateStudentIDResponse(
        success=True,
        message=f"Public ID updated successfully for student {user.name}",
        old_public_id=old_public_id,
        new_public_id=new_id,
        student_name=user.name
    )


@router.get("/admin/vacant-ids")
async def get_vacant_ids(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all vacant IDs available for assignment (admin only)."""
    vacant_ids = db.query(VacantId).order_by(VacantId.deleted_at.desc()).all()
    
    return {
        "vacant_ids": [
            {
                "id": v.id,
                "public_id": v.public_id,
                "original_student_name": v.original_student_name,
                "deleted_at": v.deleted_at.isoformat() if v.deleted_at else None
            }
            for v in vacant_ids
        ]
    }


@router.delete("/admin/vacant-ids/{vacant_id_id}")
async def delete_vacant_id(
    vacant_id_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a specific vacant ID (admin only)."""
    vacant = db.query(VacantId).filter(VacantId.id == vacant_id_id).first()
    if not vacant:
        raise HTTPException(status_code=404, detail="Vacant ID not found")
    db.delete(vacant)
    db.commit()
    return {"message": f"Vacant ID {vacant.public_id} deleted successfully"}


@router.post("/admin/generate-student-id")
async def generate_next_student_id(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suggest the next available TH-XXXX student ID (always TH prefix)."""
    next_id = generate_public_id(db)
    return {"suggested_id": next_id}


@router.post("/admin/bulk-assign-ids")
async def bulk_assign_student_ids(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Assign TH-XXXX IDs to every student that currently has no public_id.

    Assignment rules (applied in this exact order to avoid clashes):
      1. Vacant IDs (from the vacant_ids table) are consumed first, sorted
         numerically so the lowest numbers are reused first.
      2. Once vacant IDs are exhausted, fresh sequential TH numbers are used,
         always choosing the smallest number not already taken by any profile.
      3. Each assignment is committed atomically so a partial failure leaves
         the database consistent.
      4. The corresponding VacantId row is deleted when a vacant ID is consumed.

    Returns a summary of what was assigned.
    """
    from models import StudentProfile, VacantId as VacantIdModel

    # ── 1. Find all students without a public_id ──────────────────────────────
    unassigned_profiles = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.public_id.is_(None),
            StudentProfile.user_id.isnot(None),
        )
        .order_by(StudentProfile.user_id.asc())
        .all()
    )

    if not unassigned_profiles:
        return {"assigned": 0, "results": [], "message": "All students already have IDs assigned."}

    # ── 2. Build the pool of available IDs ───────────────────────────────────
    # 2a. Collect all numbers already in use (any TH-xxxx profile)
    existing = db.query(StudentProfile.public_id).filter(
        StudentProfile.public_id.isnot(None),
        StudentProfile.public_id.like("TH-%"),
    ).all()
    used: set = set()
    for (pid,) in existing:
        try:
            used.add(int(pid.split("-")[1]))
        except (ValueError, IndexError):
            pass

    # 2b. Collect vacant IDs, sorted numerically (smallest first)
    vacant_rows = (
        db.query(VacantIdModel)
        .filter(VacantIdModel.public_id.like("TH-%"))
        .all()
    )
    # Sort numerically
    vacant_rows.sort(key=lambda v: int(v.public_id.split("-")[1]) if v.public_id.split("-")[1].isdigit() else 9999)
    vacant_queue = list(vacant_rows)  # will pop from front

    # 2c. Fresh-number generator: smallest TH number not in `used`
    _fresh_counter = 1

    def _next_fresh() -> str:
        nonlocal _fresh_counter
        while _fresh_counter in used:
            _fresh_counter += 1
        n = _fresh_counter
        used.add(n)
        _fresh_counter += 1
        return f"TH-{n:04d}"

    # ── 3. Assign IDs ─────────────────────────────────────────────────────────
    results = []
    assigned_count = 0

    for profile in unassigned_profiles:
        if vacant_queue:
            # Use a vacant ID first
            vacant_row = vacant_queue.pop(0)
            new_id = vacant_row.public_id
            # Mark the vacant-id number as used so fresh counter skips it
            try:
                used.add(int(new_id.split("-")[1]))
            except (ValueError, IndexError):
                pass
            db.delete(vacant_row)
            source = "vacant"
        else:
            new_id = _next_fresh()
            source = "fresh"

        profile.public_id = new_id
        student_name = (
            db.query(User.name).filter(User.id == profile.user_id).scalar() or "Unknown"
        )
        results.append({
            "user_id": profile.user_id,
            "student_name": student_name,
            "assigned_id": new_id,
            "source": source,
        })
        assigned_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Bulk assignment failed: {str(e)}"
        )

    return {
        "assigned": assigned_count,
        "results": results,
        "message": f"Successfully assigned IDs to {assigned_count} student(s).",
    }



# ─── Leaderboard Endpoints ────────────────────────────────────────────────────
# These query the User table directly (always up-to-date) rather than relying
# on the Leaderboard cache table which is only populated by background jobs.

@router.get("/leaderboard/overall")
async def get_overall_leaderboard_endpoint(
    limit: Optional[int] = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the overall leaderboard sorted by total_points.

    Queries User table directly so data is always correct regardless of whether
    the background cache-update job has run. Includes StudentProfile data
    (public_id, level, course, branch) via a single bulk join.
    """
    students = (
        db.query(User)
        .filter(User.role == "student")
        .order_by(desc(User.total_points))
        .limit(limit)
        .all()
    )

    user_ids = [u.id for u in students]
    profiles: dict = {}
    if user_ids:
        for p in db.query(StudentProfile).filter(StudentProfile.user_id.in_(user_ids)).all():
            profiles[p.user_id] = p

    result = []
    for rank, u in enumerate(students, start=1):
        p = profiles.get(u.id)
        result.append({
            "rank":          rank,
            "user_id":       u.id,
            "name":          u.display_name or u.name,
            "avatar_url":    u.avatar_url,
            "total_points":  u.total_points,
            "weekly_points": 0,       # weekly points computed separately
            "public_id":     p.public_id if p else None,
            "level":         p.level     if p else None,
            "course":        p.course    if p else None,
            "branch":        p.branch    if p else None,
        })
    return result


@router.get("/leaderboard/weekly")
async def get_weekly_leaderboard_endpoint(
    limit: Optional[int] = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the weekly leaderboard sorted by points earned this calendar week.

    Computes weekly points live via a SQL aggregate on PracticeSession and
    PaperAttempt so data is always accurate. Falls back gracefully when there
    are no sessions this week (ranks by total_points instead).
    """
    ist_now = get_ist_now()
    today = ist_now.date()
    days_since_monday = today.weekday()  # 0 = Monday
    week_start_ist = datetime.combine(today - timedelta(days=days_since_monday), datetime.min.time())
    # Convert IST week-start to naive UTC for DB comparison
    from timezone_utils import IST_OFFSET
    week_start_utc = week_start_ist - IST_OFFSET

    # Aggregate weekly points from mental-math practice sessions
    mental_weekly = (
        db.query(
            PracticeSession.user_id,
            func.sum(PracticeSession.points_earned).label("pts")
        )
        .filter(PracticeSession.started_at >= week_start_utc)
        .group_by(PracticeSession.user_id)
        .all()
    )

    # Aggregate weekly points from practice paper attempts
    paper_weekly = (
        db.query(
            PaperAttempt.user_id,
            func.sum(PaperAttempt.points_earned).label("pts")
        )
        .filter(PaperAttempt.started_at >= week_start_utc)
        .group_by(PaperAttempt.user_id)
        .all()
    )

    weekly_pts: dict = {}
    for row in mental_weekly:
        weekly_pts[row.user_id] = weekly_pts.get(row.user_id, 0) + int(row.pts or 0)
    for row in paper_weekly:
        weekly_pts[row.user_id] = weekly_pts.get(row.user_id, 0) + int(row.pts or 0)

    students = db.query(User).filter(User.role == "student").all()

    # Sort by weekly points desc, break ties by total points
    students.sort(key=lambda u: (weekly_pts.get(u.id, 0), u.total_points), reverse=True)
    students = students[:limit]

    user_ids = [u.id for u in students]
    profiles: dict = {}
    if user_ids:
        for p in db.query(StudentProfile).filter(StudentProfile.user_id.in_(user_ids)).all():
            profiles[p.user_id] = p

    result = []
    for rank, u in enumerate(students, start=1):
        p = profiles.get(u.id)
        result.append({
            "rank":          rank,
            "user_id":       u.id,
            "name":          u.display_name or u.name,
            "avatar_url":    u.avatar_url,
            "total_points":  u.total_points,
            "weekly_points": weekly_pts.get(u.id, 0),
            "public_id":     p.public_id if p else None,
            "level":         p.level     if p else None,
            "course":        p.course    if p else None,
            "branch":        p.branch    if p else None,
        })
    return result


# ─── Certificate Routes ─────────────────────────────────────────────────────

@router.get("/my-certificates", response_model=List[CertificateResponse])
def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all certificates issued to the currently authenticated student."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not profile:
        return []
    certs = (
        db.query(Certificate)
        .filter(Certificate.student_profile_id == profile.id)
        .order_by(desc(Certificate.date_issued))
        .all()
    )
    return [CertificateResponse.model_validate(c) for c in certs]


@router.get("/admin/students/{student_id}/certificates", response_model=List[CertificateResponse])
async def get_student_certificates_admin(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all certificates for a specific student (admin only)."""
    student = db.query(User).filter(
        User.id == student_id, User.role == "student"
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == student_id
    ).first()
    if not profile:
        return []
    certs = (
        db.query(Certificate)
        .filter(Certificate.student_profile_id == profile.id)
        .order_by(desc(Certificate.date_issued))
        .all()
    )
    return [CertificateResponse.model_validate(c) for c in certs]


@router.post("/admin/students/{student_id}/certificates", response_model=CertificateResponse, status_code=201)
async def create_student_certificate(
    student_id: int,
    payload: CertificateCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Issue a new certificate to a student (admin only)."""
    student = db.query(User).filter(
        User.id == student_id, User.role == "student"
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == student_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    try:
        date_issued_dt = datetime.fromisoformat(payload.date_issued).replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date_issued format. Use YYYY-MM-DD.")
    cert = Certificate(
        student_profile_id=profile.id,
        title=payload.title.strip(),
        marks=payload.marks,
        date_issued=date_issued_dt,
        description=payload.description.strip() if payload.description else None,
        issued_by_user_id=admin.id,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return CertificateResponse.model_validate(cert)


@router.put("/admin/students/{student_id}/certificates/{cert_id}", response_model=CertificateResponse)
async def update_student_certificate(
    student_id: int,
    cert_id: int,
    payload: CertificateUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a certificate record (admin only)."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == student_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    cert = db.query(Certificate).filter(
        Certificate.id == cert_id,
        Certificate.student_profile_id == profile.id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if payload.title is not None:
        cert.title = payload.title.strip()
    if payload.marks is not None:
        cert.marks = payload.marks
    if payload.date_issued is not None:
        try:
            cert.date_issued = datetime.fromisoformat(payload.date_issued).replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_issued format. Use YYYY-MM-DD.")
    if payload.description is not None:
        cert.description = payload.description.strip() if payload.description else None
    db.commit()
    db.refresh(cert)
    return CertificateResponse.model_validate(cert)


@router.delete("/admin/students/{student_id}/certificates/{cert_id}", status_code=204)
async def delete_student_certificate(
    student_id: int,
    cert_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a certificate record (admin only)."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == student_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    cert = db.query(Certificate).filter(
        Certificate.id == cert_id,
        Certificate.student_profile_id == profile.id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    db.delete(cert)
    db.commit()


@router.get("/points/logs", response_model=PointsSummaryResponse)
async def get_points_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0)
):
    """Get points transaction log with checksum verification.
    
    Uses RewardEvent as the authoritative ledger so that daily login bonuses,
    streak bonuses, burst bonuses, and admin adjustments are all visible.
    """
    from points_logger import get_points_summary
    from reward_models import RewardEvent as _RewardEvent

    _EVENT_TYPE_LABELS = {
        "daily_login": "Daily Login Bonus",
        "streak_bonus": "Streak Bonus",
        "streak_milestone": "Streak Milestone Badge",
        "session_completed": "Practice Session",
        "burst_mode_completed": "Burst Mode Completion",
        "admin_points_adjustment": "Admin Adjustment",
        "monthly_snapshot_created": "Monthly Snapshot",
        "badge_awarded": "Badge Awarded",
    }

    def _make_description(evt: _RewardEvent) -> str:
        label = _EVENT_TYPE_LABELS.get(evt.event_type, evt.event_type.replace("_", " ").title())
        meta = evt.event_metadata or {}
        if evt.event_type == "session_completed":
            tool = (evt.source_tool or "").replace("_", " ").title()
            correct = meta.get("correct_answers", "")
            if correct != "":
                return f"{label} — {tool}, {correct} correct"
            return f"{label} — {tool}"
        if evt.event_type == "admin_points_adjustment":
            reason = meta.get("reason", "")
            admin = meta.get("admin_name", "Admin")
            return f"{label} by {admin}" + (f": {reason}" if reason else "")
        if evt.event_type == "streak_bonus":
            streak = meta.get("streak_day", "")
            return f"{label}" + (f" (Day {streak})" if streak else "")
        return label

    # Get all non-voided reward events ordered by timestamp desc
    events = (
        db.query(_RewardEvent)
        .filter(
            _RewardEvent.student_id == current_user.id,
            _RewardEvent.is_voided == False,
        )
        .order_by(_RewardEvent.event_timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    total_entries = (
        db.query(func.count(_RewardEvent.id))
        .filter(
            _RewardEvent.student_id == current_user.id,
            _RewardEvent.is_voided == False,
        )
        .scalar()
        or 0
    )

    summary = get_points_summary(db, current_user.id)

    log_responses = [
        PointsLogResponse(
            id=evt.id,
            points=evt.points_delta,
            source_type=evt.event_type,
            description=_make_description(evt),
            source_id=(evt.event_metadata or {}).get("session_id"),
            extra_data=evt.event_metadata,
            created_at=evt.event_timestamp,
        )
        for evt in events
    ]

    return PointsSummaryResponse(
        total_points_from_logs=summary["total_points_from_logs"],
        total_points_from_user=summary["total_points_from_user"],
        match=summary["match"],
        logs=log_responses,
        total_entries=total_entries,
    )
