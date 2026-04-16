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

