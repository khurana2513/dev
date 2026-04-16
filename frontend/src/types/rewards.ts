/**
 * Reward System TypeScript types.
 * Mirrors backend reward_schemas.py.
 */

// ── Badge Types ──────────────────────────────────────────────────────

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "special";
export type BadgeCategory = "practice" | "streak" | "attendance" | "special";

export interface BadgeStatus {
  badge_key: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  icon_emoji: string;
  is_earned: boolean;
  earned_at: string | null;
  progress: string | null;
  progress_pct: number | null;
  is_secret: boolean;
}

export interface StudentBadgesResponse {
  badges: BadgeStatus[];
  earned_count: number;
  total_count: number;
}

// ── Points & Events ─────────────────────────────────────────────────

export interface RewardEvent {
  id: number;
  event_type: string;
  source_tool: string;
  rule_key: string | null;
  points_delta: number;
  event_metadata: Record<string, unknown>;
  event_timestamp: string | null;
}

export interface PointsHistoryResponse {
  events: RewardEvent[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ── Streak ──────────────────────────────────────────────────────────

export interface NextMilestone {
  milestone: number;
  days_remaining: number;
}

export interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  today_qualifying_count: number;
  today_threshold: number;
  streak_active_today: boolean;
  next_milestone: NextMilestone | null;
}

// ── Rewards Summary ─────────────────────────────────────────────────

export interface RewardsSummary {
  total_points: number;
  badges_earned: number;
  total_badges: number;
  current_streak: number;
  longest_streak: number;
  leaderboard_rank: number | null;
  next_milestone: NextMilestone | null;
}

// ── Leaderboard ─────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string;
  branch: string;
  course: string;
  level: string;
  total_points: number;
  avatar_url: string | null;
  is_current_user: boolean;
}

// ── Streak Calendar ─────────────────────────────────────────────────

export interface StreakCalendarDay {
  date: string;       // YYYY-MM-DD (IST)
  qualified: boolean;
  count: number;
}

export interface StreakCalendarResponse {
  year: number;
  month: number;
  days: StreakCalendarDay[];
  qualified_count: number;
  total_days: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
  total_participants: number;
  available_branches: string[];
}

// ── Weekly Summary ──────────────────────────────────────────────────

export interface DailyPoint {
  date: string;
  points: number;
  is_today: boolean;
}

export interface WeeklySummary {
  daily_points: DailyPoint[];
  total_week: number;
}

// ── Badge Unlock (from session/paper response) ──────────────────────

export interface BadgeUnlock {
  badge_key: string;
  name: string;
  tier: BadgeTier;
  icon_emoji: string;
  description: string;
}

export interface RewardData {
  badges_unlocked: BadgeUnlock[];
  streak_updated: boolean;
  bonus_points: number;
}

// ── SUPER Journey Types ─────────────────────────────────────────────

export type SuperMilestoneType = "chocolate" | "letter" | "mystery" | "party";

export interface SuperMilestone {
  points: number;
  badge_key: string;
  type: SuperMilestoneType;
  label: string;
  emoji: string;
  letter?: string;
  unlocked: boolean;
  /** True if the badge row was formally inserted in StudentBadgeAward (independent of points threshold) */
  badge_awarded?: boolean;
}

export interface SuperNextMilestone {
  points: number;
  badge_key: string;
  type: SuperMilestoneType;
  label: string;
  emoji: string;
  letter?: string;
  points_needed: number;
  range_start: number;
  range_end: number;
  progress_in_range: number;
  range_size: number;
  pct: number;
}

export interface SuperJourneyResponse {
  total_points: number;
  milestones: SuperMilestone[];
  next_milestone: SuperNextMilestone | null;
  all_letters_done: boolean;
  letters_unlocked_count: number;
}

// ── Tier styling helpers ────────────────────────────────────────────

export const TIER_COLORS: Record<BadgeTier, { bg: string; border: string; text: string; glow: string }> = {
  bronze:   { bg: "bg-amber-900/30",   border: "border-amber-600/50",   text: "text-amber-400",   glow: "shadow-amber-500/20" },
  silver:   { bg: "bg-slate-400/20",   border: "border-slate-400/50",   text: "text-slate-300",   glow: "shadow-slate-400/20" },
  gold:     { bg: "bg-yellow-500/20",  border: "border-yellow-400/50",  text: "text-yellow-300",  glow: "shadow-yellow-400/30" },
  platinum: { bg: "bg-cyan-400/20",    border: "border-cyan-300/50",    text: "text-cyan-200",    glow: "shadow-cyan-300/30" },
  special:  { bg: "bg-purple-500/20",  border: "border-purple-400/50",  text: "text-purple-300",  glow: "shadow-purple-400/30" },
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  session_completed: "Practice Session",
  burst_mode_completed: "Burst Bonus",
  daily_login: "Daily Login",
  streak_incremented: "Streak +1",
  streak_milestone_reached: "Streak Milestone",
  badge_earned: "Badge Earned",
  admin_points_adjustment: "Admin Adjustment",
  monthly_leaderboard_reward: "Monthly Rank Bonus",
};

export const SOURCE_TOOL_LABELS: Record<string, string> = {
  mental_math: "Mental Math",
  burst_mode: "Burst Mode",
  practice_paper: "Practice Paper",
  system: "System",
  admin: "Admin",
};
