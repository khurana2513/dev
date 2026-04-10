"""API routes for attendance management system."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, date, timezone as _tz
from timezone_utils import get_ist_now, utc_to_ist, IST_OFFSET
from calendar import monthrange


def _dt_to_ist_iso(dt) -> Optional[str]:
    """Convert a naive-UTC (or tz-aware) datetime to an IST ISO string.

    Used for timestamps that are stored as naive UTC in the database
    (created_at / updated_at) so the frontend always receives a proper
    IST-annotated string instead of a bare UTC value that JavaScript
    would misinterpret as local time.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=_tz.utc)
    return utc_to_ist(dt).isoformat()


def _normalize_session_date(raw: datetime) -> datetime:
    """Normalise a session_date from client to midnight IST (stored as naive).

    The date-picker on the frontend sends a date the user perceives as IST.
    We convert any timezone-aware value to IST first, then strip the time
    component so we always store plain midnight (the semantically correct
    calendar date without a UTC offset artefact).
    """
    if raw.tzinfo is not None:
        # tz-aware → convert to IST, take date component
        ist = utc_to_ist(raw)
        return datetime(ist.year, ist.month, ist.day, 0, 0, 0)
    else:
        # naive → take the date component as-is (already the user's intent)
        return datetime(raw.year, raw.month, raw.day, 0, 0, 0)

from models import (
    User, StudentProfile, ClassSchedule, ClassSession, AttendanceRecord,
    Certificate, get_db
)
from auth import get_current_user, get_current_admin
from user_schemas import (
    ClassScheduleCreate, ClassScheduleResponse,
    ClassSessionCreate, ClassSessionResponse,
    AttendanceRecordCreate, AttendanceRecordUpdate, AttendanceRecordResponse,
    BulkAttendanceCreate, AttendanceStats,
    CertificateCreate, CertificateResponse
)

router = APIRouter(prefix="/attendance", tags=["attendance"])


# Class Schedule Management
@router.post("/schedules", response_model=ClassScheduleResponse)
async def create_class_schedule(
    schedule_data: ClassScheduleCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new class schedule."""
    try:
        # Validate schedule_days is not empty
        if not schedule_data.schedule_days or len(schedule_data.schedule_days) == 0:
            raise HTTPException(status_code=400, detail="At least one schedule day is required")
        
        # Validate schedule_days are in valid range (0-6)
        if any(day < 0 or day > 6 for day in schedule_data.schedule_days):
            raise HTTPException(status_code=400, detail="Schedule days must be between 0 (Monday) and 6 (Sunday)")
        
        # Validate time_slots format if provided
        if schedule_data.time_slots is not None:
            if not isinstance(schedule_data.time_slots, list):
                raise HTTPException(status_code=400, detail="time_slots must be a list")
            for slot in schedule_data.time_slots:
                if not isinstance(slot, dict):
                    raise HTTPException(status_code=400, detail="Each time slot must be an object")
                if "start" not in slot or "end" not in slot:
                    raise HTTPException(status_code=400, detail="Each time slot must have 'start' and 'end' fields")
        
        schedule = ClassSchedule(
            branch=schedule_data.branch,
            course=schedule_data.course,
            level=schedule_data.level,
            batch_name=schedule_data.batch_name,
            schedule_days=schedule_data.schedule_days,
            time_slots=schedule_data.time_slots,
            is_active=schedule_data.is_active,
            created_by_user_id=admin.id
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return ClassScheduleResponse.model_validate(schedule)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create schedule: {str(e)}")


def ensure_default_schedules(db: Session, admin_id: int):
    """Ensure default Saturday/Sunday schedules exist for each branch."""
    branches = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"]
    courses = ["Abacus", "Vedic Maths", "Handwriting"]
    
    # Saturday = 5, Sunday = 6 (0=Monday, 1=Tuesday, ..., 6=Sunday)
    default_days = [5, 6]  # Saturday and Sunday
    
    for branch in branches:
        # Check if any schedule exists for this branch
        existing = db.query(ClassSchedule).filter(
            ClassSchedule.branch == branch,
            ClassSchedule.is_active == True
        ).first()
        
        if not existing:
            # Create default schedule for all courses (course = None means all courses)
            default_schedule = ClassSchedule(
                branch=branch,
                course=None,  # None means applies to all courses
                level=None,
                batch_name=None,
                schedule_days=default_days,
                time_slots=None,
                is_active=True,
                created_by_user_id=admin_id
            )
            db.add(default_schedule)
            db.flush()
            
            # Also create course-specific defaults
            for course in courses:
                course_schedule = ClassSchedule(
                    branch=branch,
                    course=course,
                    level=None,
                    batch_name=None,
                    schedule_days=default_days,
                    time_slots=None,
                    is_active=True,
                    created_by_user_id=admin_id
                )
                db.add(course_schedule)
            db.commit()


@router.post("/schedules/create-defaults")
async def create_default_schedules(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Explicitly create default Saturday/Sunday schedules for all branches. 
    This endpoint can be called by admins to set up initial schedules."""
    try:
        ensure_default_schedules(db, admin.id)
        return {"message": "Default schedules created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create default schedules: {str(e)}")


@router.get("/schedules", response_model=List[ClassScheduleResponse])
async def get_class_schedules(
    branch: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get class schedules with optional filters."""
    # NOTE: Removed auto-creation of default schedules to prevent deleted schedules from being restored
    # Default schedules should be created explicitly by admin via POST /schedules/create-defaults
    
    query = db.query(ClassSchedule)
    
    if branch:
        query = query.filter(ClassSchedule.branch == branch)
    if course:
        query = query.filter(ClassSchedule.course == course)
    
    schedules = query.filter(ClassSchedule.is_active == True).all()
    return [ClassScheduleResponse.model_validate(s) for s in schedules]


@router.put("/schedules/{schedule_id}", response_model=ClassScheduleResponse)
async def update_class_schedule(
    schedule_id: int,
    schedule_data: ClassScheduleCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a class schedule."""
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    try:
        # Validate schedule_days is not empty
        if not schedule_data.schedule_days or len(schedule_data.schedule_days) == 0:
            raise HTTPException(status_code=400, detail="At least one schedule day is required")
        
        # Validate schedule_days are in valid range (0-6)
        if any(day < 0 or day > 6 for day in schedule_data.schedule_days):
            raise HTTPException(status_code=400, detail="Schedule days must be between 0 (Monday) and 6 (Sunday)")
        
        # Validate time_slots format if provided
        if schedule_data.time_slots is not None:
            if not isinstance(schedule_data.time_slots, list):
                raise HTTPException(status_code=400, detail="time_slots must be a list")
            for slot in schedule_data.time_slots:
                if not isinstance(slot, dict):
                    raise HTTPException(status_code=400, detail="Each time slot must be an object")
                if "start" not in slot or "end" not in slot:
                    raise HTTPException(status_code=400, detail="Each time slot must have 'start' and 'end' fields")
        
        schedule.branch = schedule_data.branch
        schedule.course = schedule_data.course
        schedule.level = schedule_data.level
        schedule.batch_name = schedule_data.batch_name
        schedule.schedule_days = schedule_data.schedule_days
        schedule.time_slots = schedule_data.time_slots
        schedule.is_active = schedule_data.is_active
        schedule.updated_at = get_ist_now()
        
        db.commit()
        db.refresh(schedule)
        return ClassScheduleResponse.model_validate(schedule)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update schedule: {str(e)}")


@router.delete("/schedules/{schedule_id}")
async def delete_class_schedule(
    schedule_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a class schedule. Checks for related sessions before deletion."""
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Check if there are any related sessions
    session_count = db.query(ClassSession).filter(ClassSession.schedule_id == schedule_id).count()
    if session_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete schedule: {session_count} session(s) are associated with this schedule. Please delete or reassign the sessions first."
        )
    
    try:
        db.delete(schedule)
        db.commit()
        return {"message": "Schedule deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete schedule: {str(e)}")


# ──────────────────────────────────────────────────────────────────
# START TODAY — create or return today's session (idempotent)
# ──────────────────────────────────────────────────────────────────

class _StartTodayBody(BaseModel):
    branch: str
    course: Optional[str] = None
    level: Optional[str] = None
    batch_name: Optional[str] = None
    topic: Optional[str] = None
    schedule_id: Optional[int] = None


@router.post("/sessions/start-today", response_model=ClassSessionResponse)
async def start_today_session(
    body: _StartTodayBody,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Idempotently create or return today's session for a branch/course."""
    today = _normalize_session_date(get_ist_now())
    query = db.query(ClassSession).filter(
        func.date(ClassSession.session_date) == func.date(today),
        ClassSession.branch == body.branch,
    )
    if body.course:
        query = query.filter(ClassSession.course == body.course)
    existing = query.first()
    if existing:
        return ClassSessionResponse.model_validate(existing)
    session = ClassSession(
        schedule_id=body.schedule_id,
        session_date=today,
        branch=body.branch,
        course=body.course,
        level=body.level,
        batch_name=body.batch_name,
        topic=body.topic,
        created_by_user_id=admin.id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ClassSessionResponse.model_validate(session)


# Class Session Management
@router.post("/sessions", response_model=ClassSessionResponse)
async def create_class_session(
    session_data: ClassSessionCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new class session."""
    session = ClassSession(
        schedule_id=session_data.schedule_id,
        session_date=_normalize_session_date(session_data.session_date),
        branch=session_data.branch,
        course=session_data.course,
        level=session_data.level,
        batch_name=session_data.batch_name,
        topic=session_data.topic,
        teacher_remarks=session_data.teacher_remarks,
        created_by_user_id=admin.id
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ClassSessionResponse.model_validate(session)


@router.get("/sessions", response_model=List[ClassSessionResponse])
async def get_class_sessions(
    branch: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get class sessions with optional filters."""
    try:
        query = db.query(ClassSession)

        if branch:
            # Include sessions tagged to the specific branch OR sessions tagged for all branches
            query = query.filter(
                or_(ClassSession.branch == branch, ClassSession.branch == "All Branches")
            )
        if course:
            # Include sessions tagged to the specific course OR sessions with no course (applies to all)
            query = query.filter(
                or_(ClassSession.course == course, ClassSession.course == None)
            )

        # Frontend sends ISO strings like "...Z" (UTC). Pydantic parses those as
        # timezone-aware datetimes, but our DB DateTime fields are naive.
        # Normalize to naive before comparing to avoid tz-aware/naive issues.
        if start_date and start_date.tzinfo is not None:
            start_date = start_date.replace(tzinfo=None)
        if end_date and end_date.tzinfo is not None:
            end_date = end_date.replace(tzinfo=None)

        if start_date:
            query = query.filter(ClassSession.session_date >= start_date)
        if end_date:
            query = query.filter(ClassSession.session_date <= end_date)

        # Students can only see sessions for their branch
        if current_user.role != "admin":
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if profile and profile.branch:
                query = query.filter(ClassSession.branch == profile.branch)

        sessions = query.order_by(desc(ClassSession.session_date)).all()
        return [ClassSessionResponse.model_validate(s) for s in sessions]
    except Exception as e:
        # Ensure we never drop the connection without a response.
        raise HTTPException(status_code=500, detail=f"Failed to load class sessions: {str(e)}")


@router.get("/sessions/{session_id}", response_model=ClassSessionResponse)
async def get_class_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific class session."""
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return ClassSessionResponse.model_validate(session)


@router.delete("/sessions/{session_id}")
async def delete_class_session(
    session_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a class session. This will also delete all associated attendance records."""
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Attendance records will be deleted via cascade
        db.delete(session)
        db.commit()
        return {"message": "Session deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")


# Attendance Management
@router.post("/mark", response_model=AttendanceRecordResponse)
async def mark_attendance(
    attendance_data: AttendanceRecordCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Mark attendance for a single student."""
    # Fetch both existing record and session in one pass before any writes
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == attendance_data.session_id,
        AttendanceRecord.student_profile_id == attendance_data.student_profile_id
    ).first()
    session_obj = db.query(ClassSession).filter(ClassSession.id == attendance_data.session_id).first()

    if existing:
        existing.status = attendance_data.status
        existing.t_shirt_worn = attendance_data.t_shirt_worn if attendance_data.t_shirt_worn is not None else existing.t_shirt_worn
        existing.remarks = attendance_data.remarks
        existing.marked_by_user_id = admin.id
        existing.updated_at = get_ist_now()
        record = existing
    else:
        record = AttendanceRecord(
            session_id=attendance_data.session_id,
            student_profile_id=attendance_data.student_profile_id,
            status=attendance_data.status,
            t_shirt_worn=attendance_data.t_shirt_worn if attendance_data.t_shirt_worn is not None else False,
            remarks=attendance_data.remarks,
            marked_by_user_id=admin.id
        )
        db.add(record)

    # Mark session completed in the same transaction (no second commit)
    if session_obj and not session_obj.is_completed:
        session_obj.is_completed = True

    # flush assigns PK to new records, all Python-side defaults already set
    db.flush()
    response = AttendanceRecordResponse.model_validate(record)
    db.commit()
    return response


@router.post("/mark-bulk", response_model=List[AttendanceRecordResponse])
async def mark_bulk_attendance(
    bulk_data: BulkAttendanceCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Mark attendance for multiple students at once."""
    if not bulk_data.attendance_data:
        return []

    # Fetch ALL existing records for this session in a single query
    student_ids = [a.student_profile_id for a in bulk_data.attendance_data]
    existing_map = {
        r.student_profile_id: r
        for r in db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == bulk_data.session_id,
            AttendanceRecord.student_profile_id.in_(student_ids)
        ).all()
    }

    session_obj = db.query(ClassSession).filter(ClassSession.id == bulk_data.session_id).first()

    results = []
    for attendance_data in bulk_data.attendance_data:
        existing = existing_map.get(attendance_data.student_profile_id)
        if existing:
            existing.status = attendance_data.status
            t_shirt = getattr(attendance_data, 't_shirt_worn', None)
            existing.t_shirt_worn = t_shirt if t_shirt is not None else existing.t_shirt_worn
            existing.remarks = attendance_data.remarks
            existing.marked_by_user_id = admin.id
            existing.updated_at = get_ist_now()
            results.append(existing)
        else:
            record = AttendanceRecord(
                session_id=bulk_data.session_id,
                student_profile_id=attendance_data.student_profile_id,
                status=attendance_data.status,
                t_shirt_worn=getattr(attendance_data, 't_shirt_worn', None) or False,
                remarks=attendance_data.remarks,
                marked_by_user_id=admin.id
            )
            db.add(record)
            results.append(record)

    # Mark session completed in the same transaction
    if session_obj and not session_obj.is_completed:
        session_obj.is_completed = True

    # flush: assigns PKs to new records; all Python-side defaults (timestamps) already set
    db.flush()
    # Build Pydantic responses while objects are fully in-session (zero lazy-load overhead)
    response_list = [AttendanceRecordResponse.model_validate(r) for r in results]
    db.commit()
    return response_list


@router.delete("/records")
async def delete_attendance_record_by_session_student(
    session_id: int = Query(...),
    student_profile_id: int = Query(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete an attendance record by session and student (unmark attendance)."""
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_profile_id == student_profile_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    try:
        db.delete(record)
        db.commit()
        return {"message": "Attendance record deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete attendance record: {str(e)}")


@router.get("/records", response_model=List[AttendanceRecordResponse])
async def get_attendance_records(
    student_profile_id: Optional[int] = Query(None),
    session_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records with optional filters."""
    query = db.query(AttendanceRecord)
    
    # Students can only see their own records
    if current_user.role != "admin":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile:
            query = query.filter(AttendanceRecord.student_profile_id == profile.id)
        else:
            return []
    
    if student_profile_id:
        query = query.filter(AttendanceRecord.student_profile_id == student_profile_id)
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    if start_date or end_date:
        query = query.join(ClassSession).filter(ClassSession.session_date >= start_date if start_date else True)
        if end_date:
            query = query.filter(ClassSession.session_date <= end_date)
    
    records = query.order_by(desc(AttendanceRecord.created_at)).all()
    
    # Add student and session info
    results = []
    for record in records:
        profile = db.query(StudentProfile).filter(StudentProfile.id == record.student_profile_id).first()
        session = db.query(ClassSession).filter(ClassSession.id == record.session_id).first()
        
        response = AttendanceRecordResponse.model_validate(record)
        if profile:
            response.student_name = profile.full_name or profile.display_name
            response.student_public_id = profile.public_id
        if session:
            response.session = ClassSessionResponse.model_validate(session)
        results.append(response)
    
    return results


@router.get("/stats/{student_profile_id}", response_model=AttendanceStats)
async def get_attendance_stats(
    student_profile_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance statistics for a student."""
    # Check permissions
    if current_user.role != "admin":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile or profile.id != student_profile_id:
            raise HTTPException(status_code=403, detail="You can only view your own stats")
    
    # Build query
    query = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_profile_id == student_profile_id
    )
    
    if start_date or end_date:
        query = query.join(ClassSession)
        if start_date:
            query = query.filter(ClassSession.session_date >= start_date)
        if end_date:
            query = query.filter(ClassSession.session_date <= end_date)
    
    records = query.all()
    
    # Calculate stats
    total_sessions = len(records)
    present_count = sum(1 for r in records if r.status == "present")
    absent_count = sum(1 for r in records if r.status == "absent")
    on_break_count = sum(1 for r in records if r.status == "on_break")
    leave_count = sum(1 for r in records if r.status == "leave")
    
    attendance_percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0
    
    # Monthly breakdown
    monthly_stats = {}
    if start_date and end_date:
        current = start_date.replace(day=1)
        while current <= end_date:
            month_key = current.strftime("%Y-%m")
            month_records = [r for r in records if r.session and r.session.session_date.strftime("%Y-%m") == month_key]
            month_total = len(month_records)
            month_present = sum(1 for r in month_records if r.status == "present")
            monthly_stats[month_key] = {
                "total": month_total,
                "present": month_present,
                "percentage": (month_present / month_total * 100) if month_total > 0 else 0
            }
            # Move to next month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
    
    return AttendanceStats(
        total_sessions=total_sessions,
        present_count=present_count,
        absent_count=absent_count,
        on_break_count=on_break_count,
        leave_count=leave_count,
        attendance_percentage=round(attendance_percentage, 2),
        monthly_stats=monthly_stats
    )


@router.get("/metrics")
async def get_attendance_metrics(
    date: Optional[datetime] = Query(None),
    branch: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get attendance metrics for a specific date and overall monthly stats."""
    ist_now = get_ist_now()
    
    # Default to today if no date provided
    if date is None:
        target_date = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        # Normalize timezone-aware datetime to naive
        if date.tzinfo is not None:
            target_date = date.replace(tzinfo=None)
        else:
            target_date = date
        target_date = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate date range for the day
    start_of_day = target_date
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Get sessions for the selected date
    session_query = db.query(ClassSession).filter(
        func.date(ClassSession.session_date) == func.date(start_of_day)
    )
    
    if branch:
        session_query = session_query.filter(ClassSession.branch == branch)
    if course:
        session_query = session_query.filter(ClassSession.course == course)
    
    sessions = session_query.all()
    session_ids = [s.id for s in sessions]
    
    # Get attendance records for these sessions
    if session_ids:
        records_query = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id.in_(session_ids)
        )
        records = records_query.all()
        
        present_count = sum(1 for r in records if r.status == "present")
        absent_count = sum(1 for r in records if r.status == "absent")
        on_break_count = sum(1 for r in records if r.status == "on_break")
        total_marked = len(records)
        attendance_percentage = (present_count / total_marked * 100) if total_marked > 0 else 0
    else:
        present_count = 0
        absent_count = 0
        on_break_count = 0
        total_marked = 0
        attendance_percentage = 0
    
    # Get overall monthly stats (current month)
    current_month_start = ist_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if ist_now.month == 12:
        current_month_end = ist_now.replace(year=ist_now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        current_month_end = ist_now.replace(month=ist_now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all sessions for current month
    monthly_session_query = db.query(ClassSession).filter(
        ClassSession.session_date >= current_month_start,
        ClassSession.session_date < current_month_end
    )
    
    if branch:
        monthly_session_query = monthly_session_query.filter(ClassSession.branch == branch)
    if course:
        monthly_session_query = monthly_session_query.filter(ClassSession.course == course)
    
    monthly_sessions = monthly_session_query.all()
    monthly_session_ids = [s.id for s in monthly_sessions]
    
    # Get monthly attendance records
    if monthly_session_ids:
        monthly_records_query = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id.in_(monthly_session_ids)
        )
        monthly_records = monthly_records_query.all()
        
        monthly_present = sum(1 for r in monthly_records if r.status == "present")
        monthly_total = len(monthly_records)
        monthly_percentage = (monthly_present / monthly_total * 100) if monthly_total > 0 else 0
    else:
        monthly_present = 0
        monthly_total = 0
        monthly_percentage = 0
    
    return {
        "date": target_date.isoformat(),
        "date_stats": {
            "present": present_count,
            "absent": absent_count,
            "on_break": on_break_count,
            "total_marked": total_marked,
            "attendance_percentage": round(attendance_percentage, 2)
        },
        "monthly_stats": {
            "present": monthly_present,
            "total": monthly_total,
            "attendance_percentage": round(monthly_percentage, 2)
        }
    }


# Certificate Management
@router.post("/certificates", response_model=CertificateResponse)
async def create_certificate(
    certificate_data: CertificateCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a certificate for a student."""
    certificate = Certificate(
        student_profile_id=certificate_data.student_profile_id,
        title=certificate_data.title,
        marks=certificate_data.marks,
        date_issued=certificate_data.date_issued,
        description=certificate_data.description,
        certificate_file_url=certificate_data.certificate_file_url,
        issued_by_user_id=admin.id
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    
    # Add student info
    profile = db.query(StudentProfile).filter(StudentProfile.id == certificate_data.student_profile_id).first()
    response = CertificateResponse.model_validate(certificate)
    if profile:
        response.student_name = profile.full_name or profile.display_name
        response.student_public_id = profile.public_id
    
    return response


@router.get("/certificates", response_model=List[CertificateResponse])
async def get_certificates(
    student_profile_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get certificates with optional student filter."""
    query = db.query(Certificate)
    
    # Students can only see their own certificates
    if current_user.role != "admin":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile:
            query = query.filter(Certificate.student_profile_id == profile.id)
        else:
            return []
    elif student_profile_id:
        query = query.filter(Certificate.student_profile_id == student_profile_id)
    
    certificates = query.order_by(desc(Certificate.date_issued)).all()
    
    # Add student info
    results = []
    for cert in certificates:
        profile = db.query(StudentProfile).filter(StudentProfile.id == cert.student_profile_id).first()
        response = CertificateResponse.model_validate(cert)
        if profile:
            response.student_name = profile.full_name or profile.display_name
            response.student_public_id = profile.public_id
        results.append(response)
    
    return results


@router.delete("/certificates/{certificate_id}")
async def delete_certificate(
    certificate_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a certificate."""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    db.delete(certificate)
    db.commit()
    return {"message": "Certificate deleted successfully"}


# ──────────────────────────────────────────────────────────────────
# ATTENDANCE SHEET — returns a session with ALL relevant students
# and their current attendance status (or null if unmarked)
# ──────────────────────────────────────────────────────────────────

@router.get("/session/{session_id}/sheet")
async def get_attendance_sheet(
    session_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns the attendance sheet for a session:
    - Full session details
    - All active students in the session's branch (+ course filter if set)
    - Each student's current attendance record (or null if not yet marked)
    - Aggregate counts for the header summary bar
    """
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch all active students for this branch (course-filtered if session has a course)
    # "All Branches" (or empty-string branch) sessions show students from every branch
    _ALL_BRANCHES_SENTINEL = {"All Branches", ""}
    query = db.query(StudentProfile, User).join(User).filter(
        User.role == "student",
        StudentProfile.status == "active",
    )
    if session.branch and session.branch not in _ALL_BRANCHES_SENTINEL:
        query = query.filter(StudentProfile.branch == session.branch)
    if session.course:
        query = query.filter(StudentProfile.course == session.course)

    # Order by public_id numerically (TH-0001, TH-0002, …), nulls last
    students_rows = query.all()
    students_rows.sort(key=lambda row: (
        row[0].public_id is None,
        int(row[0].public_id.split("-")[1]) if row[0].public_id and "-" in row[0].public_id else 9999
    ))

    # Fetch all existing attendance records for this session in one query
    existing_records = {
        r.student_profile_id: r
        for r in db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    }

    student_entries = []
    present_count = absent_count = on_break_count = leave_count = unmarked_count = tshirt_count = 0

    for profile, user in students_rows:
        rec = existing_records.get(profile.id)
        entry = {
            "student_profile_id": profile.id,
            "user_id": profile.user_id,
            "public_id": profile.public_id,
            "name": profile.full_name or profile.display_name or user.name or "Unknown",
            "display_name": profile.display_name,
            "class_name": profile.class_name,
            "course": profile.course,
            "level": profile.level,
            "branch": profile.branch,
            "attendance_record_id": rec.id if rec else None,
            "status": rec.status if rec else None,
            "t_shirt_worn": rec.t_shirt_worn if rec else False,
            "remarks": rec.remarks if rec else None,
            "marked_at": _dt_to_ist_iso(rec.created_at) if rec else None,
        }
        student_entries.append(entry)
        if rec:
            if rec.status == "present":
                present_count += 1
                if rec.t_shirt_worn:
                    tshirt_count += 1
            elif rec.status == "absent":
                absent_count += 1
            elif rec.status == "on_break":
                on_break_count += 1
            elif rec.status == "leave":
                leave_count += 1
        else:
            unmarked_count += 1

    return {
        "session": ClassSessionResponse.model_validate(session).model_dump(),
        "students": student_entries,
        "summary": {
            "total": len(student_entries),
            "marked": len(student_entries) - unmarked_count,
            "unmarked": unmarked_count,
            "present": present_count,
            "absent": absent_count,
            "on_break": on_break_count,
            "leave": leave_count,
            "tshirt": tshirt_count,
        }
    }


# ──────────────────────────────────────────────────────────────────
# UPDATE SESSION (edit topic, remarks, date, etc.)
# ──────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────
# CLOSE SESSION — mark as completed
# ──────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/close", response_model=ClassSessionResponse)
async def close_class_session(
    session_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Mark a class session as completed."""
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_completed = True
    session.updated_at = get_ist_now()
    db.commit()
    db.refresh(session)
    return ClassSessionResponse.model_validate(session)


@router.put("/sessions/{session_id}", response_model=ClassSessionResponse)
async def update_class_session(
    session_id: int,
    session_data: ClassSessionCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a class session's details."""
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        session.session_date = _normalize_session_date(session_data.session_date)
        session.branch = session_data.branch
        session.course = session_data.course
        session.level = session_data.level
        session.batch_name = session_data.batch_name
        session.topic = session_data.topic
        session.teacher_remarks = session_data.teacher_remarks
        session.updated_at = get_ist_now()
        db.commit()
        db.refresh(session)
        return ClassSessionResponse.model_validate(session)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")


# ──────────────────────────────────────────────────────────────────
# UPDATE ATTENDANCE RECORD BY ID
# ──────────────────────────────────────────────────────────────────

@router.put("/record/{record_id}", response_model=AttendanceRecordResponse)
async def update_attendance_record(
    record_id: int,
    update_data: AttendanceRecordUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a specific attendance record by its ID."""
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    try:
        if update_data.status is not None:
            record.status = update_data.status
            # Clear t_shirt_worn when status is not present
            if update_data.status != "present":
                record.t_shirt_worn = False
        if update_data.t_shirt_worn is not None and record.status == "present":
            record.t_shirt_worn = update_data.t_shirt_worn
        if update_data.remarks is not None:
            record.remarks = update_data.remarks
        record.marked_by_user_id = admin.id
        record.updated_at = get_ist_now()
        db.commit()
        db.refresh(record)

        profile = db.query(StudentProfile).filter(StudentProfile.id == record.student_profile_id).first()
        response = AttendanceRecordResponse.model_validate(record)
        if profile:
            response.student_name = profile.full_name or profile.display_name
            response.student_public_id = profile.public_id
        return response
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update record: {str(e)}")


# ──────────────────────────────────────────────────────────────────
# STUDENT MONTHLY VIEW
# Returns all sessions for a student's branch/course in a given
# month, with the student's attendance status per session.
# Students can see their own data; admins can see any student.
# ──────────────────────────────────────────────────────────────────

@router.get("/student/monthly")
def get_student_monthly_attendance(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    student_profile_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a student's attendance for a specific month."""
    # Resolve which profile to query
    if current_user.role == "admin":
        if student_profile_id is not None:
            # Admin viewing a specific student's attendance
            profile = db.query(StudentProfile).filter(StudentProfile.id == student_profile_id).first()
        else:
            # Admin viewing their own attendance on the student dashboard — look up their own profile
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    else:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Enforce student can only see own data
    if current_user.role != "admin" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Calculate month range in IST-aware UTC bounds.
    # Session dates may be stored as either:
    #   (a) naive midnight IST  e.g. 2026-02-26 00:00:00  (new sessions)
    #   (b) naive midnight-IST-shifted-to-UTC e.g. 2026-02-25 18:30:00  (old sessions)
    # Subtracting IST_OFFSET (5h30m) from the calendar boundaries captures both:
    #   - New sessions: 2026-02-01 00:00:00 >= 2026-01-31 18:30:00 ✓
    #   - Old sessions: 2026-01-31 18:30:00 >= 2026-01-31 18:30:00 ✓
    from calendar import monthrange
    _, last_day = monthrange(year, month)
    month_start = datetime(year, month, 1, 0, 0, 0) - IST_OFFSET
    month_end   = datetime(year, month, last_day, 23, 59, 59) - IST_OFFSET

    # Fetch sessions for this student's branch (+ course if set)
    session_query = db.query(ClassSession).filter(
        ClassSession.session_date >= month_start,
        ClassSession.session_date <= month_end,
        ClassSession.branch == profile.branch,
    )
    if profile.course:
        session_query = session_query.filter(
            or_(ClassSession.course == profile.course, ClassSession.course == None)
        )
    sessions = session_query.order_by(ClassSession.session_date).all()

    # Fetch all attendance records for this student in these sessions
    session_ids = [s.id for s in sessions]
    records_map: dict = {}
    if session_ids:
        for rec in db.query(AttendanceRecord).filter(
            AttendanceRecord.student_profile_id == profile.id,
            AttendanceRecord.session_id.in_(session_ids)
        ).all():
            records_map[rec.session_id] = rec

    # Build response
    entries = []
    present_count = absent_count = on_break_count = leave_count = tshirt_count = 0
    for s in sessions:
        rec = records_map.get(s.id)
        if rec:
            if rec.status == "present":
                present_count += 1
                if rec.t_shirt_worn:
                    tshirt_count += 1
            elif rec.status == "absent":
                absent_count += 1
            elif rec.status == "on_break":
                on_break_count += 1
            elif rec.status == "leave":
                leave_count += 1
        entries.append({
            "session_id": s.id,
            # Always return an IST-annotated string so JS can safely parse the
            # correct calendar date regardless of how the date was stored.
            "session_date": _dt_to_ist_iso(s.session_date),
            "branch": s.branch,
            "course": s.course,
            "level": s.level,
            "batch_name": s.batch_name,
            "topic": s.topic,
            "is_completed": s.is_completed,
            "status": rec.status if rec else None,
            "t_shirt_worn": rec.t_shirt_worn if rec else False,
            "remarks": rec.remarks if rec else None,
            "marked_at": _dt_to_ist_iso(rec.created_at) if rec else None,
        })

    total_held = present_count + absent_count + on_break_count + leave_count
    attendance_pct = round(present_count / total_held * 100, 1) if total_held > 0 else 0.0
    tshirt_pct = round(tshirt_count / present_count * 100, 1) if present_count > 0 else 0.0

    return {
        "student": {
            "id": profile.id,
            "public_id": profile.public_id,
            "name": profile.full_name or profile.display_name,
            "branch": profile.branch,
            "course": profile.course,
            "level": profile.level,
        },
        "month": month,
        "year": year,
        "sessions": entries,
        "summary": {
            "total_sessions": len(sessions),
            "total_held": total_held,
            "present": present_count,
            "absent": absent_count,
            "on_break": on_break_count,
            "leave": leave_count,
            "tshirt_worn": tshirt_count,
            "attendance_percentage": attendance_pct,
            "tshirt_percentage": tshirt_pct,
        }
    }


# Helper endpoint to get students for a branch (for admin dashboard)
@router.get("/students")
async def get_students_for_attendance(
    branch: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get list of students for attendance marking (admin only)."""
    query = db.query(StudentProfile, User).join(User).filter(User.role == "student")

    if branch:
        query = query.filter(StudentProfile.branch == branch)
    if course:
        query = query.filter(StudentProfile.course == course)

    results = query.filter(StudentProfile.status == "active").all()

    return [
        {
            "id": profile.id,
            "user_id": profile.user_id,
            "public_id": profile.public_id,
            "name": profile.full_name or profile.display_name or user.name or "Unknown",
            "display_name": profile.display_name,
            "class_name": profile.class_name,
            "course": profile.course,
            "level": profile.level,
            "branch": profile.branch
        }
        for profile, user in results
    ]
