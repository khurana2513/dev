"""Pydantic schemas for fee management."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# Fee Plan Schemas
class FeePlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    branch: Optional[str] = None
    course: Optional[str] = None
    level: Optional[str] = None
    fee_amount: float
    fee_duration_days: int
    currency: str = "INR"
    is_active: bool = True


class FeePlanCreate(FeePlanBase):
    pass


class FeePlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    branch: Optional[str] = None
    course: Optional[str] = None
    level: Optional[str] = None
    fee_amount: Optional[float] = None
    fee_duration_days: Optional[int] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class FeePlanResponse(FeePlanBase):
    id: int
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# Fee Assignment Schemas
class FeeAssignmentBase(BaseModel):
    student_profile_id: int
    fee_plan_id: int
    custom_fee_amount: Optional[float] = None
    discount_amount: float = 0.0
    discount_percentage: float = 0.0
    effective_fee_amount: float
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True
    remarks: Optional[str] = None


class FeeAssignmentCreate(BaseModel):
    student_profile_id: int
    fee_plan_id: int
    custom_fee_amount: Optional[float] = None
    discount_amount: float = 0.0
    discount_percentage: float = 0.0
    start_date: datetime
    end_date: Optional[datetime] = None
    remarks: Optional[str] = None


class FeeAssignmentUpdate(BaseModel):
    custom_fee_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_percentage: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    remarks: Optional[str] = None


class FeeAssignmentResponse(FeeAssignmentBase):
    id: int
    assigned_by_user_id: int
    created_at: datetime
    updated_at: datetime
    fee_plan: Optional[FeePlanResponse] = None
    
    model_config = {"from_attributes": True}


# Fee Transaction Schemas
class FeeTransactionBase(BaseModel):
    assignment_id: int
    transaction_type: str  # "payment", "adjustment", "refund"
    amount: float
    payment_date: datetime
    payment_mode: str  # "cash", "online", "cheque", "bank_transfer"
    reference_number: Optional[str] = None
    balance_before: float
    balance_after: float
    remarks: Optional[str] = None
    is_partial: bool = False


class FeeTransactionCreate(BaseModel):
    assignment_id: int
    transaction_type: str = "payment"
    amount: float
    payment_date: datetime
    payment_mode: str
    reference_number: Optional[str] = None
    remarks: Optional[str] = None
    is_partial: bool = False


class FeeTransactionResponse(FeeTransactionBase):
    id: int
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# Student Fee Details
class StudentFeeSummary(BaseModel):
    student_profile_id: int
    student_name: str
    student_public_id: Optional[str] = None
    current_assignment: Optional[FeeAssignmentResponse] = None
    total_paid: float = 0.0
    total_due: float = 0.0
    balance: float = 0.0
    last_payment_date: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    is_overdue: bool = False
    overdue_days: int = 0
    transactions: List[FeeTransactionResponse] = []


# Dashboard Statistics
class FeeDashboardStats(BaseModel):
    total_fee_collected_all_time: float = 0.0
    total_fee_collected_monthly: float = 0.0
    total_fee_collected_today: float = 0.0
    total_fees_due: float = 0.0
    total_active_students: int = 0
    students_with_due_fees: int = 0
    overdue_count: int = 0
    due_today_count: int = 0
    collection_summary: Dict[str, float] = {}  # Day/Month/Overall breakdown


class FeePaymentSummary(BaseModel):
    date: str
    total_collected: float
    cash_collected: float = 0.0
    online_collected: float = 0.0
    other_collected: float = 0.0
    transaction_count: int = 0
