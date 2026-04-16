/**
 * Fee Management API Client
 * All fee system HTTP calls — uses centralized apiClient for auth/retry/dedup.
 */

import apiClient from "./apiClient";
import type {
  FeePlan,
  FeeAssignment,
  FeeTransaction,
  StudentFeeSummary,
  FeeDashboardStats,
  MonthlyCollectionPoint,
  MyFeeStatus,
  CreateFeePlanPayload,
  CreateFeeAssignmentPayload,
  RecordPaymentPayload,
} from "../types/fees";

// ── Dashboard ──────────────────────────────────────────────────

export async function fetchFeeDashboardStats(): Promise<FeeDashboardStats> {
  return apiClient.get<FeeDashboardStats>("/fees/dashboard/stats");
}

export async function fetchFeeStudents(params?: {
  branch?: string;
  course?: string;
  show_overdue_only?: boolean;
}): Promise<StudentFeeSummary[]> {
  const qs = new URLSearchParams();
  if (params?.branch) qs.set("branch", params.branch);
  if (params?.course) qs.set("course", params.course);
  if (params?.show_overdue_only) qs.set("show_overdue_only", "true");
  const query = qs.toString();
  return apiClient.get<StudentFeeSummary[]>(`/fees/dashboard/students${query ? "?" + query : ""}`);
}

export async function fetchStudentFeeSummary(studentProfileId: number): Promise<StudentFeeSummary> {
  return apiClient.get<StudentFeeSummary>(`/fees/students/${studentProfileId}/summary`);
}

// ── Fee Plans ──────────────────────────────────────────────────

export async function fetchFeePlans(params?: {
  branch?: string;
  course?: string;
  is_active?: boolean;
}): Promise<FeePlan[]> {
  const qs = new URLSearchParams();
  if (params?.branch) qs.set("branch", params.branch);
  if (params?.course) qs.set("course", params.course);
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
  const query = qs.toString();
  return apiClient.get<FeePlan[]>(`/fees/plans${query ? "?" + query : ""}`);
}

export async function createFeePlan(data: CreateFeePlanPayload): Promise<FeePlan> {
  return apiClient.post<FeePlan>("/fees/plans", data);
}

export async function updateFeePlan(id: number, data: Partial<CreateFeePlanPayload>): Promise<FeePlan> {
  return apiClient.put<FeePlan>(`/fees/plans/${id}`, data);
}

export async function deleteFeePlan(id: number): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/fees/plans/${id}`);
}

// ── Assignments ────────────────────────────────────────────────

export async function createFeeAssignment(data: CreateFeeAssignmentPayload): Promise<FeeAssignment> {
  return apiClient.post<FeeAssignment>("/fees/assignments", data);
}

export async function updateFeeAssignment(
  id: number,
  data: Partial<CreateFeeAssignmentPayload>
): Promise<FeeAssignment> {
  return apiClient.put<FeeAssignment>(`/fees/assignments/${id}`, data);
}

// ── Transactions ───────────────────────────────────────────────

export async function recordFeePayment(data: RecordPaymentPayload): Promise<FeeTransaction> {
  return apiClient.post<FeeTransaction>("/fees/transactions", data);
}

export async function fetchFeeTransactions(params?: {
  assignment_id?: number;
  student_profile_id?: number;
  start_date?: string;
  end_date?: string;
  payment_mode?: string;
}): Promise<FeeTransaction[]> {
  const qs = new URLSearchParams();
  if (params?.assignment_id) qs.set("assignment_id", String(params.assignment_id));
  if (params?.student_profile_id) qs.set("student_profile_id", String(params.student_profile_id));
  if (params?.start_date) qs.set("start_date", params.start_date);
  if (params?.end_date) qs.set("end_date", params.end_date);
  if (params?.payment_mode) qs.set("payment_mode", params.payment_mode);
  const query = qs.toString();
  return apiClient.get<FeeTransaction[]>(`/fees/transactions${query ? "?" + query : ""}`);
}

// ── Reports ────────────────────────────────────────────────────

export async function fetchMonthlyCollection(months = 6): Promise<MonthlyCollectionPoint[]> {
  return apiClient.get<MonthlyCollectionPoint[]>(`/fees/reports/monthly-collection?months=${months}`);
}

// ── Student self-view ──────────────────────────────────────────

export async function fetchMyFeeStatus(): Promise<MyFeeStatus> {
  return apiClient.get<MyFeeStatus>("/fees/my");
}
