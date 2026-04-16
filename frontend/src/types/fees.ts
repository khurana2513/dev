/** TypeScript types for the fee management system */

export interface FeePlan {
  id: number;
  name: string;
  description: string | null;
  branch: string | null;
  course: string | null;
  level: string | null;
  fee_amount: number;
  fee_duration_days: number;
  currency: string;
  is_active: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface FeeAssignment {
  id: number;
  student_profile_id: number;
  fee_plan_id: number;
  custom_fee_amount: number | null;
  discount_amount: number;
  discount_percentage: number;
  effective_fee_amount: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_by_user_id: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  fee_plan?: FeePlan;
}

export type PaymentMode = "cash" | "online" | "cheque" | "bank_transfer";
export type TransactionType = "payment" | "adjustment" | "refund";

export interface FeeTransaction {
  id: number;
  assignment_id: number;
  transaction_type: TransactionType;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_number: string | null;
  balance_before: number;
  balance_after: number;
  remarks: string | null;
  is_partial: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface StudentFeeSummary {
  student_profile_id: number;
  student_name: string;
  student_public_id: string | null;
  branch: string | null;
  course: string | null;
  level: string | null;
  current_assignment: FeeAssignment | null;
  total_paid: number;
  total_due: number;
  balance: number;
  cumulative_balance: number;
  periods_elapsed: number;
  total_expected_cumulative: number;
  last_payment_date: string | null;
  next_due_date: string | null;
  is_overdue: boolean;
  overdue_days: number;
  transactions: FeeTransaction[];
}

export interface FeeDashboardStats {
  total_fee_collected_all_time: number;
  total_fee_collected_monthly: number;
  total_fee_collected_today: number;
  total_fees_due: number;
  total_active_students: number;
  students_with_due_fees: number;
  overdue_count: number;
  due_today_count: number;
  collection_summary: Record<string, number>;
}

export interface MonthlyCollectionPoint {
  month: string;         // "2025-01"
  month_label: string;   // "Jan 25"
  total: number;
  cash: number;
  online: number;
  cheque: number;
  bank_transfer: number;
  count: number;
}

export interface MyFeeStatus {
  has_plan: boolean;
  plan_name: string | null;
  fee_amount: number | null;
  fee_period_days: number | null;
  currency: string;
  balance: number;
  cumulative_balance: number;
  total_paid: number;
  total_expected_cumulative: number;
  periods_elapsed: number;
  last_payment_date: string | null;
  next_due_date: string | null;
  is_overdue: boolean;
  overdue_days: number;
  recent_transactions: FeeTransaction[];
}

// Form payloads
export interface CreateFeePlanPayload {
  name: string;
  description?: string;
  branch?: string;
  course?: string;
  level?: string;
  fee_amount: number;
  fee_duration_days: number;
  currency?: string;
  is_active?: boolean;
}

export interface CreateFeeAssignmentPayload {
  student_profile_id: number;
  fee_plan_id: number;
  custom_fee_amount?: number;
  discount_amount?: number;
  discount_percentage?: number;
  start_date: string;
  end_date?: string;
  remarks?: string;
}

export interface RecordPaymentPayload {
  assignment_id: number;
  transaction_type?: TransactionType;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_number?: string;
  remarks?: string;
  is_partial?: boolean;
}

// Fee status helpers
export type FeeStatus = "no_plan" | "paid" | "due_soon" | "overdue" | "advance";

export function getFeeStatus(summary: StudentFeeSummary): FeeStatus {
  if (!summary.current_assignment) return "no_plan";
  const bal = summary.cumulative_balance;
  if (bal < 0) return "advance";
  if (bal === 0) return "paid";
  if (summary.is_overdue) return "overdue";
  // due soon = balance > 0 and next_due within 7 days
  if (summary.next_due_date) {
    const daysUntil = Math.ceil(
      (new Date(summary.next_due_date).getTime() - Date.now()) / 86400000
    );
    if (daysUntil <= 7) return "due_soon";
  }
  return "due_soon"; // has balance but not yet overdue = upcoming due
}

export const STATUS_CONFIG: Record<
  FeeStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  paid:     { label: "Paid",      color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  dot: "#10b981" },
  due_soon: { label: "Due Soon",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  dot: "#f59e0b" },
  overdue:  { label: "Overdue",   color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   dot: "#ef4444" },
  no_plan:  { label: "No Plan",   color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)",  dot: "#6b7280" },
  advance:  { label: "Advance",   color: "#06b6d4", bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.25)",   dot: "#06b6d4" },
};

export const PAYMENT_MODE_CONFIG: Record<PaymentMode, { label: string; icon: string; color: string }> = {
  cash:          { label: "Cash",          icon: "💵", color: "#10b981" },
  online:        { label: "Online",        icon: "📲", color: "#06b6d4" },
  cheque:        { label: "Cheque",        icon: "📄", color: "#8b5cf6" },
  bank_transfer: { label: "Bank Transfer", icon: "🏦", color: "#f59e0b" },
};

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDuration(days: number): string {
  if (days === 30 || days === 31) return "Monthly";
  if (days === 90) return "Quarterly";
  if (days === 180) return "Half-Yearly";
  if (days === 365) return "Annual";
  if (days === 7) return "Weekly";
  return `${days} days`;
}
