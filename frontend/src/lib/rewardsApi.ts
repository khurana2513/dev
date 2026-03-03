/**
 * Rewards API Client — all reward system HTTP calls.
 * Uses the centralized apiClient for auth, retry, and dedup.
 */

import apiClient from "./apiClient";
import type {
  RewardsSummary,
  StudentBadgesResponse,
  PointsHistoryResponse,
  StreakResponse,
  LeaderboardResponse,
  WeeklySummary,
  SimulationResponse,
  BadgeDefinition,
  AdminCacheRebuild,
  AuditLogEntry,
} from "../types/rewards";

// ── Student Endpoints ────────────────────────────────────────────────

export async function fetchRewardsSummary(): Promise<RewardsSummary> {
  return apiClient.get<RewardsSummary>("/rewards/summary");
}

export async function fetchBadges(): Promise<StudentBadgesResponse> {
  return apiClient.get<StudentBadgesResponse>("/rewards/badges");
}

export async function fetchPointsHistory(
  page = 1,
  perPage = 20
): Promise<PointsHistoryResponse> {
  return apiClient.get<PointsHistoryResponse>(
    `/rewards/points/history?page=${page}&per_page=${perPage}`
  );
}

export async function fetchStreak(): Promise<StreakResponse> {
  return apiClient.get<StreakResponse>("/rewards/streak");
}

export async function fetchLeaderboard(
  period: string = "all_time",
  branch?: string,
  limit = 100
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ limit: String(limit), period });
  if (branch) params.set("branch", branch);
  return apiClient.get<LeaderboardResponse>(
    `/rewards/leaderboard?${params.toString()}`
  );
}

export async function fetchWeeklySummary(): Promise<WeeklySummary> {
  return apiClient.get<WeeklySummary>("/rewards/weekly-summary");
}

// ── Admin Endpoints ─────────────────────────────────────────────────

export async function adminAdjustPoints(
  studentId: number,
  adjustment: number,
  reason: string
): Promise<{ success: boolean; old_total: number; new_total: number }> {
  return apiClient.post("/admin/rewards/adjust-points", {
    student_id: studentId,
    adjustment,
    reason,
  });
}

export async function adminGrantBadge(
  studentId: number,
  badgeKey: string
): Promise<{ success: boolean; badge: Record<string, unknown> }> {
  return apiClient.post("/admin/rewards/grant-badge", {
    student_id: studentId,
    badge_key: badgeKey,
  });
}

export async function adminRevokeBadge(
  studentId: number,
  badgeKey: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  return apiClient.post("/admin/rewards/revoke-badge", {
    student_id: studentId,
    badge_key: badgeKey,
    reason,
  });
}

export async function adminVoidEvent(
  eventId: number,
  reason: string
): Promise<{ success: boolean; event_id: number; points_reversed: number }> {
  return apiClient.post("/admin/rewards/void-event", {
    event_id: eventId,
    reason,
  });
}

export async function adminRunSnapshot(
  month: number,
  year: number
): Promise<Record<string, unknown>> {
  return apiClient.post("/admin/rewards/run-snapshot", { month, year });
}

export async function adminSimulateMonth(
  month: number,
  year: number
): Promise<SimulationResponse> {
  return apiClient.post<SimulationResponse>(
    "/admin/rewards/simulate-month",
    { month, year }
  );
}

export async function adminRebuildCache(): Promise<{
  students_updated: number;
  details: AdminCacheRebuild[];
}> {
  return apiClient.post("/admin/rewards/rebuild-cache");
}

export async function adminFetchAuditLog(
  page = 1,
  perPage = 20,
  studentId?: number
): Promise<{
  entries: AuditLogEntry[];
  total: number;
  page: number;
  has_more: boolean;
}> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (studentId) params.set("student_id", String(studentId));
  return apiClient.get(`/admin/rewards/audit-log?${params.toString()}`);
}

export async function adminFetchStudentSummary(
  studentId: number
): Promise<RewardsSummary> {
  return apiClient.get<RewardsSummary>(
    `/admin/rewards/student/${studentId}/summary`
  );
}

export async function adminListBadgeDefinitions(): Promise<BadgeDefinition[]> {
  return apiClient.get<BadgeDefinition[]>("/admin/rewards/badges");
}

export async function adminCreateBadge(
  data: Partial<BadgeDefinition>
): Promise<{ success: boolean; badge_key: string; id: number }> {
  return apiClient.post("/admin/rewards/badges", data);
}

export async function adminUpdateBadge(
  badgeKey: string,
  data: Partial<BadgeDefinition>
): Promise<{ success: boolean }> {
  return apiClient.put(`/admin/rewards/badges/${badgeKey}`, data);
}

export async function adminRunStreakReset(): Promise<{
  success: boolean;
  reset_count: number;
  skipped_count: number;
}> {
  return apiClient.post("/admin/rewards/run-streak-reset");
}
