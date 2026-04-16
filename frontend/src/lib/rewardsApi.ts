/**
 * Rewards API Client — all reward system HTTP calls.
 * Uses the centralized apiClient for auth, retry, and dedup.
 */

import apiClient from "./apiClient";
import { buildApiUrl } from "./apiBase";
import type {
  RewardsSummary,
  StudentBadgesResponse,
  PointsHistoryResponse,
  StreakResponse,
  LeaderboardResponse,
  WeeklySummary,
  SuperJourneyResponse,
  StreakCalendarResponse,
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
  period: "all_time" | "weekly" = "all_time",
  limit = 100
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ limit: String(limit), period });
  return apiClient.get<LeaderboardResponse>(
    `/rewards/leaderboard?${params.toString()}`
  );
}

export interface PublicLeaderboardEntry {
  rank: number;
  student_name: string;
  branch: string;
  course: string;
  level: string;
  total_points: number;
  avatar_url: string | null;
  org_name: string;
}

export async function fetchPublicLeaderboard(limit = 10): Promise<{ entries: PublicLeaderboardEntry[]; total: number }> {
  const url = buildApiUrl(`/rewards/leaderboard/public?limit=${limit}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch public leaderboard");
  return res.json();
}

export async function fetchStreakCalendar(
  year: number,
  month: number
): Promise<StreakCalendarResponse> {
  return apiClient.get<StreakCalendarResponse>(
    `/rewards/streak/calendar?year=${year}&month=${month}`
  );
}

export async function fetchWeeklySummary(): Promise<WeeklySummary> {
  return apiClient.get<WeeklySummary>("/rewards/weekly-summary");
}

export async function fetchSuperJourney(): Promise<SuperJourneyResponse> {
  return apiClient.get<SuperJourneyResponse>("/rewards/super-journey");
}
