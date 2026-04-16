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
  PaymentGateway,
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
