/**
 * LeaderboardTable — premium ranked list with podium top-3.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Crown, Users, RefreshCw } from "lucide-react";
import { fetchLeaderboard } from "../../lib/rewardsApi";
import type { LeaderboardEntry, LeaderboardResponse } from "../../types/rewards";

type Period = "all_time" | "weekly";

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "All Time", value: "all_time" },
  { label: "This Week", value: "weekly" },
];

// ── Podium card (top 3) ─────────────────────────────────────────────

const RANK_CFG = {
  1: {
    gradFrom: "from-yellow-900/50",
    gradTo: "to-yellow-800/10",
    border: "border-yellow-500/40",
    glow: "0 0 28px rgba(245,158,11,0.28)",
    text: "text-yellow-300",
    ringColor: "ring-yellow-500/50",
    icon: Crown,
    iconColor: "text-yellow-400",
    avatarBg: "from-yellow-700/40 to-yellow-600/20",
    avatarText: "text-yellow-200",
    avatarSize: "w-16 h-16",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-300",
  },
  2: {
    gradFrom: "from-zinc-700/50",
    gradTo: "to-zinc-600/10",
    border: "border-zinc-400/30",
    glow: "0 0 18px rgba(148,163,184,0.18)",
    text: "text-zinc-200",
    ringColor: "ring-zinc-400/40",
    icon: Medal,
    iconColor: "text-zinc-300",
    avatarBg: "from-zinc-600/40 to-zinc-500/20",
    avatarText: "text-zinc-100",
    avatarSize: "w-12 h-12",
    badgeBg: "bg-zinc-600/30",
    badgeText: "text-zinc-300",
  },
  3: {
    gradFrom: "from-amber-900/50",
    gradTo: "to-amber-800/10",
    border: "border-amber-600/40",
    glow: "0 0 18px rgba(180,83,9,0.22)",
    text: "text-amber-300",
    ringColor: "ring-amber-600/40",
    icon: Medal,
    iconColor: "text-amber-500",
    avatarBg: "from-amber-800/40 to-amber-700/20",
    avatarText: "text-amber-200",
    avatarSize: "w-12 h-12",
    badgeBg: "bg-amber-800/30",
    badgeText: "text-amber-400",
  },
} as const;

function PodiumCard({
  entry,
  currentUserId,
  index,
}: {
  entry: LeaderboardEntry;
  currentUserId?: number;
  index: number;
}) {
  const cfg = RANK_CFG[entry.rank as 1 | 2 | 3];
  const Icon = cfg.icon;
  const isMe = entry.student_id === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
      className={`relative flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-b ${cfg.gradFrom} ${cfg.gradTo} ${cfg.border} px-3 py-5 ${entry.rank === 1 ? "py-7 scale-105" : ""} ${isMe ? "ring-2 ring-violet-500/60 ring-offset-2 ring-offset-[#07070F]" : ""}`}
      style={{ boxShadow: cfg.glow }}
    >
      <Icon className={`w-5 h-5 ${cfg.iconColor}`} />

      {/* Avatar */}
      <div
        className={`${cfg.avatarSize} rounded-full overflow-hidden flex items-center justify-center font-bold text-lg ${cfg.avatarText} bg-gradient-to-br ${cfg.avatarBg} ring-2 ring-offset-2 ring-offset-[#07070F] ${cfg.ringColor} flex-shrink-0`}
      >
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.student_name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          (entry.student_name || "?")[0].toUpperCase()
        )}
      </div>

      {/* Name + subtitle */}
      <div className="text-center min-w-0 w-full">
        <p className={`text-xs font-bold ${cfg.text} truncate`}>
          {entry.student_name || "Student"}
          {isMe && <span className="ml-1 text-[9px] text-violet-400/70">(you)</span>}
        </p>
        {(entry.course || entry.level) && (
          <p className="text-[9px] text-zinc-500 truncate mt-0.5">
            {[entry.course, entry.level].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Points */}
      <div className="text-center">
        <p className="text-base font-extrabold text-white leading-none">
          {entry.total_points.toLocaleString()}
        </p>
        <p className="text-[9px] text-zinc-500">points</p>
      </div>
    </motion.div>
  );
}

// ── Regular row (rank 4+) ────────────────────────────────────────────

function EntryRow({
  entry,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
        isCurrentUser
          ? "bg-violet-500/10 border border-violet-500/30"
          : "hover:bg-zinc-800/40"
      }`}
    >
      {/* Rank number */}
      <span className="w-6 text-center text-xs font-bold text-zinc-500 flex-shrink-0">
        {entry.rank}
      </span>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold bg-zinc-800 text-zinc-400 flex-shrink-0">
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.student_name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          (entry.student_name || "?")[0].toUpperCase()
        )}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isCurrentUser ? "text-violet-300" : "text-zinc-200"
          }`}
        >
          {entry.student_name || "Student"}
          {isCurrentUser && (
            <span className="ml-1.5 text-[10px] text-violet-400/70">(you)</span>
          )}
        </p>
        {(entry.course || entry.level) && (
          <p className="text-[10px] text-zinc-500 truncate">
            {[entry.course, entry.level].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-white">
          {entry.total_points.toLocaleString()}
        </p>
        <p className="text-[10px] text-zinc-500">pts</p>
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function LeaderboardTable({
  currentUserId,
}: {
  currentUserId?: number;
}) {
  const [period, setPeriod] = useState<Period>("all_time");
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    refetch();
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 700);
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchLeaderboard(period) as Promise<LeaderboardResponse>,
    staleTime: 60_000,
  });

  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const top3 = entries.slice(0, 3);
  // Sort podium: rank2 left, rank1 center, rank3 right
  const podiumOrder = [
    top3.find((e) => e.rank === 2),
    top3.find((e) => e.rank === 1),
    top3.find((e) => e.rank === 3),
  ].filter(Boolean) as LeaderboardEntry[];

  const rest = entries.slice(3);

  return (
    <div
      className="rounded-2xl border border-zinc-800/80 overflow-hidden"
      style={{ background: "rgba(7,7,15,0.98)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/70"
        style={{ background: "linear-gradient(to right, rgba(24,24,40,0.9), rgba(12,12,24,0.9))" }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3
            className="text-white font-bold text-sm"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Leaderboard
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex bg-zinc-800/80 rounded-lg p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  period === opt.value
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <motion.button
            onClick={handleRefresh}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-transform ${(isSpinning || isFetching) ? "animate-spin" : ""}`}
            />
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-zinc-800/50 animate-pulse" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && data && data.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Users className="w-8 h-8 mb-3" />
            <p className="text-sm">
              {period === "weekly" ? "No activity this week yet" : "No data yet"}
            </p>
          </div>
        )}

        {!isLoading && data && data.entries.length > 0 && (
          <>
            {/* Podium */}
            {podiumOrder.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6 items-end">
                {podiumOrder.map((entry, i) => (
                  <PodiumCard
                    key={entry.student_id}
                    entry={entry}
                    currentUserId={currentUserId}
                    index={i}
                  />
                ))}
              </div>
            )}

            {/* Divider */}
            {rest.length > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
                  Rankings
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            )}

            {/* Rank 4+ */}
            <AnimatePresence mode="popLayout">
              <div className="space-y-0.5 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700/60">
                {rest.map((entry, i) => (
                  <EntryRow
                    key={entry.student_id}
                    entry={entry}
                    isCurrentUser={entry.student_id === currentUserId}
                    index={i}
                  />
                ))}
              </div>
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Footer */}
      {data && currentUserId && (() => {
        const myEntry = data.entries.find((e) => e.student_id === currentUserId);
        if (!myEntry) return null;
        return (
          <div className="border-t border-zinc-800/70 px-5 py-3 flex items-center justify-between text-xs text-zinc-400">
            <span>Your Rank</span>
            <span className="font-bold text-violet-400">
              #{myEntry.rank} of {data.total_participants}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
