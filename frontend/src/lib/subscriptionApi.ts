/**
 * Subscription & Payment API client functions.
 * Uses existing apiClient patterns for auth + retry.
 */
import { apiClient } from "./apiClient";
import type {
  SubscriptionPlan,
  MySubscriptionStatus,
  PaymentInitiation,
  SubscriptionActivationResult,
  AccessControlSettings,
  AllowlistEntry,
  SyncReport,
  UserSubscriptionOut,
  AuditLogEntry,
  PaginatedAllowlist,
  BulkImportResult,
  PaymentGateway,
  AccessMode,
} from "../types/subscription";

// ---------------------------------------------------------------------------
// User-facing
// ---------------------------------------------------------------------------

export const fetchPlans = (role?: "student" | "teacher"): Promise<SubscriptionPlan[]> => {
  const url = role ? `/api/subscriptions/plans?role=${role}` : "/api/subscriptions/plans";
  return apiClient.get<SubscriptionPlan[]>(url, { requireAuth: false });
};

export const fetchMySubscriptionStatus = (): Promise<MySubscriptionStatus> =>
  apiClient.get<MySubscriptionStatus>("/api/subscriptions/my-status");

export const initiatePayment = (
  plan_id: string,
  gateway: PaymentGateway
): Promise<PaymentInitiation> =>
  apiClient.post<PaymentInitiation>("/api/subscriptions/initiate", { plan_id, gateway });

export const verifyPayment = async (params: {
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
  gateway: PaymentGateway;
}): Promise<SubscriptionActivationResult> =>
  apiClient.post<SubscriptionActivationResult>("/api/subscriptions/verify", params);

// ---------------------------------------------------------------------------
// Admin — Access Settings
// ---------------------------------------------------------------------------

export const fetchAccessSettings = (): Promise<AccessControlSettings> =>
  apiClient.get<AccessControlSettings>("/api/admin/access/settings");

export const updateAccessSettings = (
  mode: AccessMode,
  note: string
): Promise<AccessControlSettings> =>
  apiClient.put<AccessControlSettings>("/api/admin/access/settings", { mode, note });

export const fetchSyncReport = (): Promise<SyncReport> =>
  apiClient.get<SyncReport>("/api/admin/access/sync-report");

// ---------------------------------------------------------------------------
// Admin — Allowlist
// ---------------------------------------------------------------------------

export const fetchAllowlist = (params: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  status?: string;
}): Promise<PaginatedAllowlist> => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.role) qs.set("role", params.role);
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  return apiClient.get<PaginatedAllowlist>(`/api/admin/access/allowlist?${qs}`);
};

export const addAllowlistEntry = (data: {
  email: string;
  role: "student" | "teacher";
  grant_subscription?: boolean;
  subscription_plan_id?: string;
  subscription_duration_override_days?: number;
  notes?: string;
}): Promise<AllowlistEntry> =>
  apiClient.post<AllowlistEntry>("/api/admin/access/allowlist", data);

export const bulkImportAllowlist = (
  entries: Array<{ email: string; role: "student" | "teacher" }>
): Promise<BulkImportResult> =>
  apiClient.post<BulkImportResult>("/api/admin/access/allowlist/bulk", { entries });

export const updateAllowlistEntry = (
  id: string,
  data: Partial<{
    role: "student" | "teacher";
    is_active: boolean;
    grant_subscription: boolean;
    subscription_plan_id: string;
    notes: string;
  }>
): Promise<AllowlistEntry> =>
  apiClient.put<AllowlistEntry>(`/api/admin/access/allowlist/${id}`, data);

export const deleteAllowlistEntry = (id: string, reason: string): Promise<{ message: string }> =>
  apiClient.delete<{ message: string }>(
    `/api/admin/access/allowlist/${id}?reason=${encodeURIComponent(reason)}`
  );

// ---------------------------------------------------------------------------
// Admin — Subscription overrides
// ---------------------------------------------------------------------------

export const applySubscriptionOverride = (
  userId: number,
  data: {
    action: "activate" | "extend" | "suspend" | "remove_override";
    plan_id?: string;
    duration_days?: number;
    note: string;
    override_expires_at?: string;
  }
): Promise<UserSubscriptionOut> =>
  apiClient.post<UserSubscriptionOut>(
    `/api/admin/access/users/${userId}/subscription-override`,
    data
  );

export const fetchUserSubscriptionHistory = (userId: number): Promise<AuditLogEntry[]> =>
  apiClient.get<AuditLogEntry[]>(
    `/api/admin/access/users/${userId}/subscription-history`
  );
