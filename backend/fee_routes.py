"""API routes for fee management system."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_, case
from typing import List, Optional
from datetime import datetime, timedelta, date
from timezone_utils import get_ist_now
from calendar import monthrange

from models import (
    User, StudentProfile, FeePlan, FeeAssignment, FeeTransaction, get_db
)
from auth import get_current_user, get_current_admin
from fee_schemas import (
    FeePlanCreate, FeePlanUpdate, FeePlanResponse,
    FeeAssignmentCreate, FeeAssignmentUpdate, FeeAssignmentResponse,
    FeeTransactionCreate, FeeTransactionResponse,
    StudentFeeSummary, FeeDashboardStats,
    MonthlyCollectionPoint, MyFeeStatus,
)

router = APIRouter(prefix="/fees", tags=["fees"])


# Diagnostic endpoint to check database tables
@router.get("/debug/check-tables")
async def check_tables(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check if fee tables exist."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        
        fee_tables = {
            "fee_plans": "fee_plans" in tables,
            "fee_assignments": "fee_assignments" in tables,
            "fee_transactions": "fee_transactions" in tables
        }
        
        # Try to query each table
        results = {}
        for table_name in ["fee_plans", "fee_assignments", "fee_transactions"]:
            try:
                if table_name in tables:
                    result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
                    results[table_name] = {"exists": True, "count": result}
                else:
                    results[table_name] = {"exists": False, "error": "Table does not exist"}
            except Exception as e:
                results[table_name] = {"exists": table_name in tables, "error": str(e)}
        
        return {
            "all_tables": tables,
            "fee_tables_exist": fee_tables,
            "query_results": results
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }


# Helper functions
def calculate_effective_fee(plan: FeePlan, custom_amount: Optional[float], discount_amount: float, discount_percentage: float) -> float:
    """Calculate effective fee amount after discounts."""
    base_amount = custom_amount if custom_amount is not None else plan.fee_amount
    discount = discount_amount + (base_amount * discount_percentage / 100)
    return max(0.0, base_amount - discount)


def calculate_balance(assignment: FeeAssignment, db: Session) -> float:
    """Calculate current balance for a fee assignment (single-period legacy)."""
    total_paid = db.query(func.sum(FeeTransaction.amount)).filter(
        and_(
            FeeTransaction.assignment_id == assignment.id,
            FeeTransaction.transaction_type == "payment"
        )
    ).scalar() or 0.0
    
    total_refunds = db.query(func.sum(func.abs(FeeTransaction.amount))).filter(
        and_(
            FeeTransaction.assignment_id == assignment.id,
            FeeTransaction.transaction_type.in_(["refund", "adjustment"]),
            FeeTransaction.amount < 0
        )
    ).scalar() or 0.0
    
    return max(0.0, assignment.effective_fee_amount - total_paid + total_refunds)


def calculate_cumulative_balance(assignment: FeeAssignment, db: Session):
    """
    Returns (net_balance, periods_elapsed, total_expected, total_paid_net).
    Handles recurring fees: if 3 months have passed since start_date and only
    1 month has been paid, balance correctly reflects 2 months outstanding.
    """
    plan = assignment.fee_plan
    if not plan:
        plan = db.query(FeePlan).filter(FeePlan.id == assignment.fee_plan_id).first()

    # Total paid (positive transactions)
    total_paid = db.query(func.sum(FeeTransaction.amount)).filter(
        FeeTransaction.assignment_id == assignment.id,
        FeeTransaction.transaction_type == "payment",
        FeeTransaction.amount > 0,
    ).scalar() or 0.0

    # Total refunded (negative transactions)
    total_refunded = db.query(func.sum(func.abs(FeeTransaction.amount))).filter(
        FeeTransaction.assignment_id == assignment.id,
        FeeTransaction.transaction_type.in_(["refund", "adjustment"]),
        FeeTransaction.amount < 0,
    ).scalar() or 0.0

    net_paid = max(0.0, total_paid - total_refunded)

    if not plan or plan.fee_duration_days <= 0:
        # One-time fee — no recurring periods
        return (max(0.0, assignment.effective_fee_amount - net_paid), 1, assignment.effective_fee_amount, net_paid)

    now = get_ist_now()
    days_elapsed = max(0, (now - assignment.start_date).days)
    periods_elapsed = (days_elapsed // plan.fee_duration_days) + 1
    total_expected = periods_elapsed * assignment.effective_fee_amount
    net_balance = max(0.0, total_expected - net_paid)

    return (net_balance, periods_elapsed, total_expected, net_paid)


def get_next_due_date(assignment: FeeAssignment, db: Session) -> Optional[datetime]:
    """Calculate next due date based on last payment and fee duration."""
    # Load fee plan if not already loaded
    if not assignment.fee_plan:
        assignment.fee_plan = db.query(FeePlan).filter(FeePlan.id == assignment.fee_plan_id).first()
    
    if not assignment.fee_plan:
        return None
    
    last_transaction = db.query(FeeTransaction).filter(
        and_(
            FeeTransaction.assignment_id == assignment.id,
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0
        )
    ).order_by(desc(FeeTransaction.payment_date)).first()
    
    if last_transaction:
        return last_transaction.payment_date + timedelta(days=assignment.fee_plan.fee_duration_days)
    else:
        return assignment.start_date + timedelta(days=assignment.fee_plan.fee_duration_days)


# Fee Plan Management
@router.post("/plans", response_model=FeePlanResponse)
async def create_fee_plan(
    plan_data: FeePlanCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new fee plan."""
    plan = FeePlan(
        name=plan_data.name,
        description=plan_data.description,
        branch=plan_data.branch,
        course=plan_data.course,
        level=plan_data.level,
        fee_amount=plan_data.fee_amount,
        fee_duration_days=plan_data.fee_duration_days,
        currency=plan_data.currency,
        is_active=plan_data.is_active,
        created_by_user_id=admin.id
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return FeePlanResponse.model_validate(plan)


@router.get("/plans", response_model=List[FeePlanResponse])
async def get_fee_plans(
    branch: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all fee plans with optional filters."""
    try:
        print(f"🔵 [FEE] get_fee_plans called by admin {admin.id}")
        query = db.query(FeePlan)
        
        if branch:
            query = query.filter(or_(FeePlan.branch == branch, FeePlan.branch.is_(None)))
        if course:
            query = query.filter(or_(FeePlan.course == course, FeePlan.course.is_(None)))
        if is_active is not None:
            query = query.filter(FeePlan.is_active == is_active)
        
        plans = query.order_by(desc(FeePlan.created_at)).all()
        print(f"🟢 [FEE] Found {len(plans)} fee plans")
        return [FeePlanResponse.model_validate(p) for p in plans]
    except Exception as e:
        import traceback
        error_msg = f"❌ [FEE] Error in get_fee_plans: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get fee plans: {str(e)}")


@router.get("/plans/{plan_id}", response_model=FeePlanResponse)
async def get_fee_plan(
    plan_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a specific fee plan."""
    plan = db.query(FeePlan).filter(FeePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Fee plan not found")
    return FeePlanResponse.model_validate(plan)


@router.put("/plans/{plan_id}", response_model=FeePlanResponse)
async def update_fee_plan(
    plan_id: int,
    plan_data: FeePlanUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a fee plan."""
    plan = db.query(FeePlan).filter(FeePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Fee plan not found")
    
    for field, value in plan_data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    
    plan.updated_at = get_ist_now()
    db.commit()
    db.refresh(plan)
    return FeePlanResponse.model_validate(plan)


@router.delete("/plans/{plan_id}")
async def delete_fee_plan(
    plan_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a fee plan (soft delete by deactivating)."""
    plan = db.query(FeePlan).filter(FeePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Fee plan not found")
    
    plan.is_active = False
    plan.updated_at = get_ist_now()
    db.commit()
    return {"message": "Fee plan deactivated successfully"}


# Fee Assignment Management
@router.post("/assignments", response_model=FeeAssignmentResponse)
async def create_fee_assignment(
    assignment_data: FeeAssignmentCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Assign a fee plan to a student."""
    # Check if student exists
    student = db.query(StudentProfile).filter(StudentProfile.id == assignment_data.student_profile_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Check if plan exists
    plan = db.query(FeePlan).filter(FeePlan.id == assignment_data.fee_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Fee plan not found")
    
    # Deactivate existing active assignments
    existing = db.query(FeeAssignment).filter(
        and_(
            FeeAssignment.student_profile_id == assignment_data.student_profile_id,
            FeeAssignment.is_active == True
        )
    ).all()
    for assign in existing:
        assign.is_active = False
        assign.end_date = assignment_data.start_date
        assign.updated_at = get_ist_now()
    
    # Calculate effective fee
    effective_fee = calculate_effective_fee(
        plan,
        assignment_data.custom_fee_amount,
        assignment_data.discount_amount,
        assignment_data.discount_percentage
    )
    
    assignment = FeeAssignment(
        student_profile_id=assignment_data.student_profile_id,
        fee_plan_id=assignment_data.fee_plan_id,
        custom_fee_amount=assignment_data.custom_fee_amount,
        discount_amount=assignment_data.discount_amount,
        discount_percentage=assignment_data.discount_percentage,
        effective_fee_amount=effective_fee,
        start_date=assignment_data.start_date,
        end_date=assignment_data.end_date,
        is_active=True,
        remarks=assignment_data.remarks,
        assigned_by_user_id=admin.id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Load relationship for response
    assignment.fee_plan = plan
    return FeeAssignmentResponse.model_validate(assignment)


@router.get("/assignments", response_model=List[FeeAssignmentResponse])
async def get_fee_assignments(
    student_profile_id: Optional[int] = Query(None),
    fee_plan_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get fee assignments with optional filters."""
    query = db.query(FeeAssignment)
    
    if student_profile_id:
        query = query.filter(FeeAssignment.student_profile_id == student_profile_id)
    if fee_plan_id:
        query = query.filter(FeeAssignment.fee_plan_id == fee_plan_id)
    if is_active is not None:
        query = query.filter(FeeAssignment.is_active == is_active)
    
    assignments = query.order_by(desc(FeeAssignment.created_at)).all()
    # Load fee_plan relationship
    for assign in assignments:
        assign.fee_plan = db.query(FeePlan).filter(FeePlan.id == assign.fee_plan_id).first()
    
    return [FeeAssignmentResponse.model_validate(a) for a in assignments]


@router.put("/assignments/{assignment_id}", response_model=FeeAssignmentResponse)
async def update_fee_assignment(
    assignment_id: int,
    assignment_data: FeeAssignmentUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a fee assignment."""
    assignment = db.query(FeeAssignment).filter(FeeAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Fee assignment not found")
    
    plan = db.query(FeePlan).filter(FeePlan.id == assignment.fee_plan_id).first()
    
    # Update fields
    update_data = assignment_data.model_dump(exclude_unset=True)
    
    # Recalculate effective fee if fee-related fields changed
    if any(field in update_data for field in ['custom_fee_amount', 'discount_amount', 'discount_percentage']):
        custom_amount = update_data.get('custom_fee_amount', assignment.custom_fee_amount)
        discount_amount = update_data.get('discount_amount', assignment.discount_amount)
        discount_percentage = update_data.get('discount_percentage', assignment.discount_percentage)
        update_data['effective_fee_amount'] = calculate_effective_fee(plan, custom_amount, discount_amount, discount_percentage)
    
    for field, value in update_data.items():
        setattr(assignment, field, value)
    
    assignment.updated_at = get_ist_now()
    db.commit()
    db.refresh(assignment)
    
    assignment.fee_plan = plan
    return FeeAssignmentResponse.model_validate(assignment)


# Fee Transaction Management
@router.post("/transactions", response_model=FeeTransactionResponse)
async def create_fee_transaction(
    transaction_data: FeeTransactionCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Record a fee payment or adjustment."""
    assignment = db.query(FeeAssignment).filter(FeeAssignment.id == transaction_data.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Fee assignment not found")
    
    # Calculate current balance
    current_balance = calculate_balance(assignment, db)
    balance_before = current_balance
    
    # Calculate new balance
    if transaction_data.transaction_type == "payment":
        balance_after = max(0.0, balance_before - transaction_data.amount)
    elif transaction_data.transaction_type in ["refund", "adjustment"]:
        balance_after = balance_before + abs(transaction_data.amount)
    else:
        balance_after = balance_before
    
    transaction = FeeTransaction(
        assignment_id=transaction_data.assignment_id,
        transaction_type=transaction_data.transaction_type,
        amount=transaction_data.amount if transaction_data.transaction_type == "payment" else -abs(transaction_data.amount),
        payment_date=transaction_data.payment_date,
        payment_mode=transaction_data.payment_mode,
        reference_number=transaction_data.reference_number,
        balance_before=balance_before,
        balance_after=balance_after,
        remarks=transaction_data.remarks,
        is_partial=transaction_data.is_partial,
        created_by_user_id=admin.id
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return FeeTransactionResponse.model_validate(transaction)


@router.get("/transactions", response_model=List[FeeTransactionResponse])
async def get_fee_transactions(
    assignment_id: Optional[int] = Query(None),
    student_profile_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    payment_mode: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get fee transactions with optional filters."""
    query = db.query(FeeTransaction)
    
    if assignment_id:
        query = query.filter(FeeTransaction.assignment_id == assignment_id)
    elif student_profile_id:
        assignments = db.query(FeeAssignment.id).filter(FeeAssignment.student_profile_id == student_profile_id).all()
        assignment_ids = [a.id for a in assignments]
        query = query.filter(FeeTransaction.assignment_id.in_(assignment_ids))
    
    if start_date:
        query = query.filter(FeeTransaction.payment_date >= start_date)
    if end_date:
        query = query.filter(FeeTransaction.payment_date <= end_date)
    if payment_mode:
        query = query.filter(FeeTransaction.payment_mode == payment_mode)
    
    transactions = query.order_by(desc(FeeTransaction.payment_date)).all()
    return [FeeTransactionResponse.model_validate(t) for t in transactions]


# Student Fee Summary
@router.get("/students/{student_profile_id}/summary", response_model=StudentFeeSummary)
async def get_student_fee_summary(
    student_profile_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive fee summary for a student."""
    student = db.query(StudentProfile).filter(StudentProfile.id == student_profile_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get active assignment
    assignment = db.query(FeeAssignment).filter(
        and_(
            FeeAssignment.student_profile_id == student_profile_id,
            FeeAssignment.is_active == True
        )
    ).first()
    
    if not assignment:
        return StudentFeeSummary(
            student_profile_id=student_profile_id,
            student_name=student.display_name or student.full_name or "Unknown",
            student_public_id=student.public_id,
            branch=student.branch,
            course=student.course,
            level=student.level,
        )

    # Load fee_plan
    if not assignment.fee_plan:
        assignment.fee_plan = db.query(FeePlan).filter(FeePlan.id == assignment.fee_plan_id).first()

    # Cumulative balance (recurring-period-aware)
    cumulative_balance, periods_elapsed, total_expected_cumulative, net_paid = calculate_cumulative_balance(assignment, db)
    # Legacy single-period balance
    legacy_balance = calculate_balance(assignment, db)

    total_due = assignment.effective_fee_amount

    # Last payment date
    last_transaction = db.query(FeeTransaction).filter(
        and_(
            FeeTransaction.assignment_id == assignment.id,
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0
        )
    ).order_by(desc(FeeTransaction.payment_date)).first()

    last_payment_date = last_transaction.payment_date if last_transaction else None
    next_due_date = get_next_due_date(assignment, db)

    # Overdue check uses cumulative balance
    is_overdue = False
    overdue_days = 0
    if cumulative_balance > 0:
        ist_now = get_ist_now()
        if next_due_date and next_due_date < ist_now:
            is_overdue = True
            overdue_days = (ist_now - next_due_date).days

    # Get all transactions
    transactions = db.query(FeeTransaction).filter(
        FeeTransaction.assignment_id == assignment.id
    ).order_by(desc(FeeTransaction.payment_date)).all()

    return StudentFeeSummary(
        student_profile_id=student_profile_id,
        student_name=student.display_name or student.full_name or "Unknown",
        student_public_id=student.public_id,
        branch=student.branch,
        course=student.course,
        level=student.level,
        current_assignment=FeeAssignmentResponse.model_validate(assignment),
        total_paid=net_paid,
        total_due=total_due,
        balance=legacy_balance,
        cumulative_balance=cumulative_balance,
        periods_elapsed=periods_elapsed,
        total_expected_cumulative=total_expected_cumulative,
        last_payment_date=last_payment_date,
        next_due_date=next_due_date,
        is_overdue=is_overdue,
        overdue_days=overdue_days,
        transactions=[FeeTransactionResponse.model_validate(t) for t in transactions]
    )


# Dashboard Statistics
@router.get("/dashboard/stats", response_model=FeeDashboardStats)
async def get_fee_dashboard_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get fee management dashboard statistics."""
    try:
        now = get_ist_now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # ── 1. Transaction aggregates (3 queries → replaces 1 per assignment) ──
        total_collected_all_time = db.query(func.sum(FeeTransaction.amount)).filter(
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
        ).scalar() or 0.0

        total_collected_monthly = db.query(func.sum(FeeTransaction.amount)).filter(
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
            FeeTransaction.payment_date >= month_start,
        ).scalar() or 0.0

        total_collected_today = db.query(func.sum(FeeTransaction.amount)).filter(
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
            FeeTransaction.payment_date >= today_start,
        ).scalar() or 0.0

        # ── 2. Active student count (1 query) ─────────────────────────────────
        total_active_students = db.query(
            func.count(func.distinct(FeeAssignment.student_profile_id))
        ).filter(FeeAssignment.is_active == True).scalar() or 0

        # ── 3. Load all active assignments + fee plans in one query ───────────
        active_assignments = (
            db.query(FeeAssignment)
            .filter(FeeAssignment.is_active == True)
            .options(joinedload(FeeAssignment.fee_plan))
            .all()
        )

        if not active_assignments:
            return FeeDashboardStats(
                total_fee_collected_all_time=total_collected_all_time,
                total_fee_collected_monthly=total_collected_monthly,
                total_fee_collected_today=total_collected_today,
                total_fees_due=0.0,
                total_active_students=total_active_students,
                students_with_due_fees=0,
                overdue_count=0,
                due_today_count=0,
                collection_summary={
                    "today": total_collected_today,
                    "this_month": total_collected_monthly,
                    "all_time": total_collected_all_time,
                },
            )

        assignment_ids = [a.id for a in active_assignments]

        # ── 4. Bulk load paid totals per assignment (1 query) ─────────────────
        paid_rows = db.query(
            FeeTransaction.assignment_id,
            func.sum(FeeTransaction.amount).label("total_paid"),
        ).filter(
            FeeTransaction.assignment_id.in_(assignment_ids),
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
        ).group_by(FeeTransaction.assignment_id).all()
        paid_by_id = {r.assignment_id: float(r.total_paid) for r in paid_rows}

        # ── 5. Bulk load refunded totals per assignment (1 query) ─────────────
        refund_rows = db.query(
            FeeTransaction.assignment_id,
            func.sum(func.abs(FeeTransaction.amount)).label("total_refunded"),
        ).filter(
            FeeTransaction.assignment_id.in_(assignment_ids),
            FeeTransaction.transaction_type.in_(["refund", "adjustment"]),
            FeeTransaction.amount < 0,
        ).group_by(FeeTransaction.assignment_id).all()
        refunded_by_id = {r.assignment_id: float(r.total_refunded) for r in refund_rows}

        # ── 6. Bulk load last payment date per assignment (1 query) ───────────
        last_payment_rows = db.query(
            FeeTransaction.assignment_id,
            func.max(FeeTransaction.payment_date).label("last_payment"),
        ).filter(
            FeeTransaction.assignment_id.in_(assignment_ids),
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
        ).group_by(FeeTransaction.assignment_id).all()
        last_payment_by_id = {r.assignment_id: r.last_payment for r in last_payment_rows}

        # ── 7. Calculate stats in Python — zero extra DB queries ──────────────
        total_fees_due = 0.0
        students_with_due: set = set()
        overdue_count = 0
        due_today_count = 0

        for assignment in active_assignments:
            try:
                plan = assignment.fee_plan
                paid = paid_by_id.get(assignment.id, 0.0)
                refunded = refunded_by_id.get(assignment.id, 0.0)
                net_paid = max(0.0, paid - refunded)
                last_payment = last_payment_by_id.get(assignment.id)

                if plan and plan.fee_duration_days > 0:
                    days_elapsed = max(0, (now - assignment.start_date).days)
                    periods_elapsed = (days_elapsed // plan.fee_duration_days) + 1
                    total_expected = periods_elapsed * assignment.effective_fee_amount
                    balance = max(0.0, total_expected - net_paid)
                else:
                    balance = max(0.0, assignment.effective_fee_amount - net_paid)

                if balance > 0:
                    total_fees_due += balance
                    students_with_due.add(assignment.student_profile_id)

                    # Next due date
                    if plan and plan.fee_duration_days > 0:
                        if last_payment:
                            next_due = last_payment + timedelta(days=plan.fee_duration_days)
                        else:
                            next_due = assignment.start_date + timedelta(days=plan.fee_duration_days)

                        if next_due < today_start:
                            overdue_count += 1
                        elif next_due.date() == today_start.date():
                            due_today_count += 1

            except Exception as e:
                print(f"⚠️ [FEE] Error processing assignment {assignment.id}: {e}")
                continue

        return FeeDashboardStats(
            total_fee_collected_all_time=total_collected_all_time,
            total_fee_collected_monthly=total_collected_monthly,
            total_fee_collected_today=total_collected_today,
            total_fees_due=total_fees_due,
            total_active_students=total_active_students,
            students_with_due_fees=len(students_with_due),
            overdue_count=overdue_count,
            due_today_count=due_today_count,
            collection_summary={
                "today": total_collected_today,
                "this_month": total_collected_monthly,
                "all_time": total_collected_all_time,
            },
        )
    except Exception as e:
        import traceback
        print(f"❌ [FEE] Error in get_fee_dashboard_stats: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard stats: {str(e)}")


@router.get("/dashboard/students", response_model=List[StudentFeeSummary])
async def get_students_with_fees(
    branch: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    show_overdue_only: bool = Query(False),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get list of students with their fee summaries."""
    try:
        # ── 1. Load active assignments (with their fee plans + student profiles) ──
        query = (
            db.query(FeeAssignment)
            .filter(FeeAssignment.is_active == True)
            .options(
                joinedload(FeeAssignment.fee_plan),
                joinedload(FeeAssignment.student_profile),
            )
        )

        if branch or course:
            query = query.join(StudentProfile, FeeAssignment.student_profile_id == StudentProfile.id)
            if branch:
                query = query.filter(StudentProfile.branch == branch)
            if course:
                query = query.filter(StudentProfile.course == course)

        assignments = query.all()

        if not assignments:
            return []

        assignment_ids = [a.id for a in assignments]

        # ── 2. Bulk load paid totals per assignment (1 query) ─────────────────
        paid_rows = db.query(
            FeeTransaction.assignment_id,
            func.sum(FeeTransaction.amount).label("total_paid"),
        ).filter(
            FeeTransaction.assignment_id.in_(assignment_ids),
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
        ).group_by(FeeTransaction.assignment_id).all()
        paid_by_id = {r.assignment_id: float(r.total_paid) for r in paid_rows}

        # ── 3. Bulk load refunded totals per assignment (1 query) ─────────────
        refund_rows = db.query(
            FeeTransaction.assignment_id,
            func.sum(func.abs(FeeTransaction.amount)).label("total_refunded"),
        ).filter(
            FeeTransaction.assignment_id.in_(assignment_ids),
            FeeTransaction.transaction_type.in_(["refund", "adjustment"]),
            FeeTransaction.amount < 0,
        ).group_by(FeeTransaction.assignment_id).all()
        refunded_by_id = {r.assignment_id: float(r.total_refunded) for r in refund_rows}

        # ── 4. Bulk load last payment date per assignment (1 query) ───────────
        last_payment_rows = db.query(
            FeeTransaction.assignment_id,
            func.max(FeeTransaction.payment_date).label("last_payment"),
        ).filter(
            FeeTransaction.assignment_id.in_(assignment_ids),
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
        ).group_by(FeeTransaction.assignment_id).all()
        last_payment_by_id = {r.assignment_id: r.last_payment for r in last_payment_rows}

        # ── 5. Build summaries in Python — zero extra DB queries ──────────────
        ist_now = get_ist_now()
        summaries = []

        for assignment in assignments:
            try:
                student = assignment.student_profile
                if not student:
                    continue

                plan = assignment.fee_plan
                paid = paid_by_id.get(assignment.id, 0.0)
                refunded = refunded_by_id.get(assignment.id, 0.0)
                net_paid = max(0.0, paid - refunded)
                last_payment = last_payment_by_id.get(assignment.id)

                if plan and plan.fee_duration_days > 0:
                    days_elapsed = max(0, (ist_now - assignment.start_date).days)
                    periods_elapsed = (days_elapsed // plan.fee_duration_days) + 1
                    total_expected = periods_elapsed * assignment.effective_fee_amount
                    cumul_balance = max(0.0, total_expected - net_paid)
                    # Next due date
                    if last_payment:
                        next_due = last_payment + timedelta(days=plan.fee_duration_days)
                    else:
                        next_due = assignment.start_date + timedelta(days=plan.fee_duration_days)
                else:
                    periods_elapsed = 1
                    total_expected = assignment.effective_fee_amount
                    cumul_balance = max(0.0, assignment.effective_fee_amount - net_paid)
                    next_due = None

                simple_balance = max(0.0, assignment.effective_fee_amount - net_paid)
                is_overdue = cumul_balance > 0 and next_due is not None and next_due < ist_now
                overdue_days = (ist_now - next_due).days if is_overdue and next_due else 0

                if show_overdue_only and not is_overdue:
                    continue

                summaries.append(StudentFeeSummary(
                    student_profile_id=assignment.student_profile_id,
                    student_name=student.display_name or student.full_name or "Unknown",
                    student_public_id=student.public_id,
                    branch=student.branch,
                    course=student.course,
                    level=student.level,
                    current_assignment=FeeAssignmentResponse.model_validate(assignment),
                    total_paid=net_paid,
                    total_due=assignment.effective_fee_amount,
                    balance=simple_balance,
                    cumulative_balance=cumul_balance,
                    periods_elapsed=periods_elapsed,
                    total_expected_cumulative=total_expected,
                    next_due_date=next_due,
                    is_overdue=is_overdue,
                    overdue_days=overdue_days,
                    transactions=[],
                ))
            except Exception as e:
                print(f"⚠️ [FEE] Error processing student {assignment.student_profile_id}: {e}")
                continue

        summaries.sort(
            key=lambda x: (x.is_overdue, x.overdue_days, x.cumulative_balance),
            reverse=True,
        )
        return summaries
    except Exception as e:
        import traceback
        print(f"❌ [FEE] Error in get_students_with_fees: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get students with fees: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# GET /fees/reports/monthly-collection
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/reports/monthly-collection", response_model=list)
async def get_monthly_collection_report(
    months: int = Query(6, ge=1, le=24),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return per-month collection breakdown for the last N months."""
    import calendar as _cal
    now = get_ist_now()

    results = []
    for i in range(months - 1, -1, -1):
        # Walk backwards i months from current month
        target_month = now.month - i
        target_year = now.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1

        _, last_day = _cal.monthrange(target_year, target_month)
        month_start = now.replace(year=target_year, month=target_month, day=1,
                                   hour=0, minute=0, second=0, microsecond=0)
        month_end = now.replace(year=target_year, month=target_month, day=last_day,
                                 hour=23, minute=59, second=59, microsecond=999999)

        # All payment transactions in that month
        txns = db.query(FeeTransaction).filter(
            FeeTransaction.transaction_type == "payment",
            FeeTransaction.amount > 0,
            FeeTransaction.payment_date >= month_start,
            FeeTransaction.payment_date <= month_end,
        ).all()

        cash = sum(t.amount for t in txns if t.payment_mode == "cash")
        online = sum(t.amount for t in txns if t.payment_mode == "online")
        cheque = sum(t.amount for t in txns if t.payment_mode == "cheque")
        bank = sum(t.amount for t in txns if t.payment_mode == "bank_transfer")
        total = sum(t.amount for t in txns)

        month_label = month_start.strftime("%b %y")  # e.g. "Jan 25"
        results.append({
            "month": month_start.strftime("%Y-%m"),
            "month_label": month_label,
            "total": round(total, 2),
            "cash": round(cash, 2),
            "online": round(online, 2),
            "cheque": round(cheque, 2),
            "bank_transfer": round(bank, 2),
            "count": len(txns),
        })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# GET /fees/my  — student-facing own fee status
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/my", response_model=MyFeeStatus)
async def get_my_fee_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current student's own fee status and recent transactions."""
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        return MyFeeStatus(has_plan=False)

    assignment = db.query(FeeAssignment).filter(
        FeeAssignment.student_profile_id == student.id,
        FeeAssignment.is_active == True,
    ).first()

    if not assignment:
        return MyFeeStatus(has_plan=False)

    # Load fee plan
    if not assignment.fee_plan:
        assignment.fee_plan = db.query(FeePlan).filter(FeePlan.id == assignment.fee_plan_id).first()

    plan = assignment.fee_plan
    cumul_balance, periods_elapsed, total_expected_cumulative, net_paid = calculate_cumulative_balance(assignment, db)
    legacy_balance = calculate_balance(assignment, db)
    next_due = get_next_due_date(assignment, db)

    last_txn = db.query(FeeTransaction).filter(
        FeeTransaction.assignment_id == assignment.id,
        FeeTransaction.transaction_type == "payment",
        FeeTransaction.amount > 0,
    ).order_by(desc(FeeTransaction.payment_date)).first()

    ist_now = get_ist_now()
    is_overdue = cumul_balance > 0 and next_due is not None and next_due < ist_now
    overdue_days = (ist_now - next_due).days if is_overdue and next_due else 0

    recent = db.query(FeeTransaction).filter(
        FeeTransaction.assignment_id == assignment.id,
    ).order_by(desc(FeeTransaction.payment_date)).limit(10).all()

    return MyFeeStatus(
        has_plan=True,
        plan_name=plan.name if plan else None,
        fee_amount=assignment.effective_fee_amount,
        fee_period_days=plan.fee_duration_days if plan else None,
        currency=plan.currency if plan else "INR",
        balance=legacy_balance,
        cumulative_balance=cumul_balance,
        total_paid=net_paid,
        total_expected_cumulative=total_expected_cumulative,
        periods_elapsed=periods_elapsed,
        last_payment_date=last_txn.payment_date if last_txn else None,
        next_due_date=next_due,
        is_overdue=is_overdue,
        overdue_days=overdue_days,
        recent_transactions=[FeeTransactionResponse.model_validate(t) for t in recent],
    )

