/**
 * orgApi.ts — SaaS Organization API client
 *
 * Wraps all /orgs/* endpoints. Every function gracefully handles the
 * case where the current admin has no organization (returns null instead
 * of throwing so callers can show a soft "no org yet" state).
 */

import apiClient from "./apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgResponse {
  id: string;
  name: string;
  slug: string;
  id_prefix: string;
  owner_user_id: number;
  contact_email?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  address?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  description?: string | null;
  subscription_tier: string;
  max_students: number;
  is_active: boolean;
  is_verified: boolean;
  onboarding_complete: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrgUpdatePayload {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  address?: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
}

export interface InviteLinkResponse {
  id: string;
  org_id: string;
  code: string;
  role: string;
  max_uses: number;
  uses_count: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface InviteLinkCreate {
  role?: string;          // default "student"
  max_uses?: number;      // default 100
  expires_days?: number;  // optional — omit for no expiry
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch the current admin's organization.
 * Returns null without throwing if the admin has no org (404) or on any error.
 */
export async function getMyOrg(): Promise<OrgResponse | null> {
  try {
    return await apiClient.get<OrgResponse>("/orgs/mine");
  } catch (err: unknown) {
    // 404 = no org yet; silently return null so callers degrade gracefully
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
      return null;
    }
    // For other errors (401, 500 …) also return null — the page shouldn't crash
    return null;
  }
}

/**
 * Update org details (name, contact, address, branding).
 */
export async function updateOrg(orgId: string, data: OrgUpdatePayload): Promise<OrgResponse> {
  return apiClient.put<OrgResponse>(`/orgs/${orgId}`, data);
}

/**
 * Create an invite link for an org.
 * If max_uses or expires_days are omitted, backend defaults apply.
 */
export async function createInviteLink(
  orgId: string,
  data: InviteLinkCreate = {}
): Promise<InviteLinkResponse> {
  return apiClient.post<InviteLinkResponse>(`/orgs/${orgId}/invite-links`, data);
}

/**
 * List all invite links for an org.
 */
export async function listInviteLinks(orgId: string): Promise<InviteLinkResponse[]> {
  return apiClient.get<InviteLinkResponse[]>(`/orgs/${orgId}/invite-links`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable tier label */
export const TIER_LABELS: Record<string, string> = {
  free:       "Free",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
};

/** Tier badge color tokens (matches site palette) */
export const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free:       { bg: "rgba(100,116,139,0.15)", text: "#94a3b8",  border: "rgba(100,116,139,0.3)" },
  starter:    { bg: "rgba(34,197,94,0.12)",   text: "#22c55e",  border: "rgba(34,197,94,0.3)"   },
  pro:        { bg: "rgba(124,90,246,0.15)",   text: "#a78bfa",  border: "rgba(124,90,246,0.35)" },
  enterprise: { bg: "rgba(245,158,11,0.12)",   text: "#f59e0b",  border: "rgba(245,158,11,0.3)"  },
};

/** Build the full join URL from an invite code */
export function buildInviteUrl(code: string): string {
  return `${window.location.origin}/join?code=${code}`;
}
