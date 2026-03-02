// Subscription system TypeScript types

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "trial"
  | "grace"
  | "expired"
  | "suspended";

export type PlanRole = "student" | "teacher";
export type PlanDuration = "monthly" | "biannual" | "annual";
export type PaymentGateway = "razorpay" | "cashfree";
export type AccessMode = "restricted" | "open";

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  role: PlanRole;
  duration: PlanDuration;
  duration_days: number;
  display_name: string;
  price_inr: number;             // in paise
  original_price_inr: number | null;
  savings_pct: number | null;
  is_popular: boolean;
  features: string[];
}

export interface MySubscriptionStatus {
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  started_at: string | null;
  expires_at: string | null;
  grace_ends_at: string | null;
  days_remaining: number | null;
  grace_days_remaining: number | null;
  is_admin_override: boolean;
  can_access_tools: boolean;
  can_access_history: boolean;
}

export interface PaymentInitiation {
  order_id: string;
  gateway_order_id: string;
  amount: number;          // paise
  currency: string;
  gateway: PaymentGateway;
  gateway_key: string;
  user_name: string;
  user_email: string;
  plan_name: string;
}

export interface SubscriptionActivationResult {
  success: boolean;
  message: string;
  status?: string;
  expires_at?: string;
}

// Admin facing
export interface AccessControlSettings {
  id: string;
  mode: AccessMode;
  updated_by: number | null;
  updated_at: string | null;
  note: string | null;
}

export interface AllowlistEntry {
  id: string;
  email: string;
  role: PlanRole;
  is_active: boolean;
  grant_subscription: boolean;
  subscription_plan_id: string | null;
  notes: string | null;
  added_at: string;
  sync_status: "synced" | "pending" | "not_in_list";
  last_login_at: string | null;
  user_name: string | null;
  subscription_status: string | null;
}

export interface SyncReport {
  total_allowed_emails: number;
  synced: number;
  pending: number;
  users_not_in_list: number;
  access_mode: AccessMode;
}

export interface UserSubscriptionOut {
  id: string;
  user_id: number;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
  grace_ends_at: string | null;
  admin_override: boolean;
  admin_override_note: string | null;
  admin_override_expires_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface AuditLogEntry {
  id: string;
  user_id: number;
  subscription_id: string | null;
  action: string;
  performed_by: string | null;
  old_values: unknown;
  new_values: unknown;
  note: string | null;
  performed_at: string;
}

export interface PaginatedAllowlist {
  items: AllowlistEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BulkImportResult {
  added: number;
  skipped: number;
  errors: string[];
}
