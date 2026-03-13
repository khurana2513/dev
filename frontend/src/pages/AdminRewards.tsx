/**
 * AdminRewards — admin panel for managing the reward system.
 * Tab sections: Points, Badges, Leaderboard, Audit Log
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Award,
  Trophy,
  ScrollText,
  RefreshCw,
  Zap,
  Play,
  Eye,
  Shield,
  AlertTriangle,
  Check,
  X,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  adminAdjustPoints,
  adminGrantBadge,
  adminRevokeBadge,
  adminVoidEvent,
  adminRunSnapshot,
  adminSimulateMonth,
  adminRebuildCache,
  adminFetchAuditLog,
  adminFetchStudentSummary,
  adminListBadgeDefinitions,
  adminRunStreakReset,
} from "../lib/rewardsApi";
import type {
  BadgeDefinition,
  AuditLogEntry,
  RewardsSummary,
  SimulationEntry,
} from "../types/rewards";

type Tab = "points" | "badges" | "leaderboard" | "audit";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "points", label: "Points & Events", icon: <Coins className="w-4 h-4" /> },
  { key: "badges", label: "Badges", icon: <Award className="w-4 h-4" /> },
  { key: "leaderboard", label: "Leaderboard", icon: <Trophy className="w-4 h-4" /> },
  { key: "audit", label: "Audit Log", icon: <ScrollText className="w-4 h-4" /> },
];

/* ────── Toast-style feedback ────── */
function StatusMessage({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${
        type === "success"
          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
          : "bg-red-500/10 border border-red-500/30 text-red-400"
      }`}
    >
      <span className="flex items-center gap-2">
        {type === "success" ? (
          <Check className="w-4 h-4" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
        {message}
      </span>
    </motion.div>
  );
}

/* ────── Points & Events Tab ────── */
function PointsTab() {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [voidEventId, setVoidEventId] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [status, setStatus] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Student lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupData, setLookupData] = useState<RewardsSummary | null>(null);

  const adjustMut = useMutation({
    mutationFn: () =>
      adminAdjustPoints(Number(studentId), Number(delta), reason),
    onSuccess: () => {
      setStatus({ msg: "Points adjusted successfully", type: "success" });
      setStudentId("");
      setDelta("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["rewards-summary"] });
    },
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  const voidMut = useMutation({
    mutationFn: () => adminVoidEvent(Number(voidEventId), voidReason),
    onSuccess: () => {
      setStatus({ msg: "Event voided successfully", type: "success" });
      setVoidEventId("");
      setVoidReason("");
      qc.invalidateQueries({ queryKey: ["points-history"] });
    },
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  const rebuildMut = useMutation({
    mutationFn: adminRebuildCache,
    onSuccess: (d) =>
      setStatus({
        msg: `Cache rebuilt: ${d.students_updated} students updated`,
        type: "success",
      }),
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  const handleLookup = async () => {
    if (!lookupId) return;
    try {
      const data = await adminFetchStudentSummary(Number(lookupId));
      setLookupData(data);
    } catch {
      setStatus({ msg: "Student not found", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {status && (
          <StatusMessage message={status.msg} type={status.type} />
        )}
      </AnimatePresence>

      {/* Student Lookup */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-400" />
          Student Lookup
        </h4>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Student ID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleLookup}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Look Up
          </button>
        </div>
        {lookupData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500">Points</p>
              <p className="text-lg font-bold text-white">
                {lookupData.total_points.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500">Streak</p>
              <p className="text-lg font-bold text-white">
                {lookupData.current_streak}d
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500">Badges</p>
              <p className="text-lg font-bold text-white">
                {lookupData.badges_earned}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500">Rank</p>
              <p className="text-lg font-bold text-white">
                {lookupData.leaderboard_rank ? `#${lookupData.leaderboard_rank}` : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Points */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          Adjust Points
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="number"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
          <input
            type="number"
            placeholder="Points (+ or -)"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
          <input
            type="text"
            placeholder="Reason (min 10 chars)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
        </div>
        <button
          disabled={
            !studentId ||
            !delta ||
            reason.length < 10 ||
            adjustMut.isPending
          }
          onClick={() => adjustMut.mutate()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {adjustMut.isPending ? "Adjusting..." : "Apply Adjustment"}
        </button>
      </div>

      {/* Void Event */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          Void Event
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Event ID"
            value={voidEventId}
            onChange={(e) => setVoidEventId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
          <input
            type="text"
            placeholder="Reason (min 10 chars)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
        </div>
        <button
          disabled={
            !voidEventId || voidReason.length < 10 || voidMut.isPending
          }
          onClick={() => voidMut.mutate()}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {voidMut.isPending ? "Voiding..." : "Void Event"}
        </button>
      </div>

      {/* Rebuild cache */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              Rebuild Points Cache
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Recalculates total_points for all students from the event ledger.
            </p>
          </div>
          <button
            onClick={() => rebuildMut.mutate()}
            disabled={rebuildMut.isPending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {rebuildMut.isPending ? "Rebuilding..." : "Rebuild"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────── Badges Tab ────── */
function BadgesTab() {
  const [studentId, setStudentId] = useState("");
  const [badgeKey, setBadgeKey] = useState("");
  const [revokeStudentId, setRevokeStudentId] = useState("");
  const [revokeBadgeKey, setRevokeBadgeKey] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [status, setStatus] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const qc = useQueryClient();

  const { data: badges, isLoading } = useQuery({
    queryKey: ["admin-badge-definitions"],
    queryFn: adminListBadgeDefinitions,
    staleTime: 120_000,
  });

  const grantMut = useMutation({
    mutationFn: () => adminGrantBadge(Number(studentId), badgeKey),
    onSuccess: () => {
      setStatus({ msg: "Badge granted successfully", type: "success" });
      setStudentId("");
      setBadgeKey("");
      qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  const revokeMut = useMutation({
    mutationFn: () =>
      adminRevokeBadge(Number(revokeStudentId), revokeBadgeKey, revokeReason),
    onSuccess: () => {
      setStatus({ msg: "Badge revoked successfully", type: "success" });
      setRevokeStudentId("");
      setRevokeBadgeKey("");
      setRevokeReason("");
      qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {status && (
          <StatusMessage message={status.msg} type={status.type} />
        )}
      </AnimatePresence>

      {/* All badge definitions */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" />
          Badge Definitions ({badges?.length ?? 0})
        </h4>
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-zinc-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {badges && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {badges.map((b: BadgeDefinition) => (
              <div
                key={b.badge_key}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/50"
              >
                <span className="text-2xl">{b.icon_emoji || "🏆"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {b.name}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {b.badge_key} &middot; {b.tier} &middot; {b.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant badge */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          Grant Badge
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
          <select
            value={badgeKey}
            onChange={(e) => setBadgeKey(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            <option value="">Select badge...</option>
            {badges?.map((b: BadgeDefinition) => (
              <option key={b.badge_key} value={b.badge_key}>
                {b.icon_emoji} {b.name} ({b.badge_key})
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={!studentId || !badgeKey || grantMut.isPending}
          onClick={() => grantMut.mutate()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {grantMut.isPending ? "Granting..." : "Grant Badge"}
        </button>
      </div>

      {/* Revoke badge */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          Revoke Badge
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="number"
            placeholder="Student ID"
            value={revokeStudentId}
            onChange={(e) => setRevokeStudentId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
          <select
            value={revokeBadgeKey}
            onChange={(e) => setRevokeBadgeKey(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            <option value="">Select badge...</option>
            {badges?.map((b: BadgeDefinition) => (
              <option key={b.badge_key} value={b.badge_key}>
                {b.icon_emoji} {b.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Reason (min 10 chars)"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          />
        </div>
        <button
          disabled={
            !revokeStudentId ||
            !revokeBadgeKey ||
            revokeReason.length < 10 ||
            revokeMut.isPending
          }
          onClick={() => revokeMut.mutate()}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {revokeMut.isPending ? "Revoking..." : "Revoke Badge"}
        </button>
      </div>
    </div>
  );
}

/* ────── Leaderboard Tab ────── */
function LeaderboardTab() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [simResults, setSimResults] = useState<SimulationEntry[] | null>(
    null
  );

  const snapshotMut = useMutation({
    mutationFn: () => adminRunSnapshot(month, year),
    onSuccess: () =>
      setStatus({
        msg: `Snapshot complete for ${month}/${year}`,
        type: "success",
      }),
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  const simulateMut = useMutation({
    mutationFn: () => adminSimulateMonth(month, year),
    onSuccess: (d) => {
      setSimResults(d.entries);
      setStatus({
        msg: `Simulation complete — ${d.entries.length} students`,
        type: "success",
      });
    },
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  const streakResetMut = useMutation({
    mutationFn: adminRunStreakReset,
    onSuccess: () =>
      setStatus({
        msg: "Nightly streak reset executed",
        type: "success",
      }),
    onError: (e: Error) =>
      setStatus({ msg: e.message || "Failed", type: "error" }),
  });

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {status && (
          <StatusMessage message={status.msg} type={status.type} />
        )}
      </AnimatePresence>

      {/* Month selector */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Monthly Leaderboard Snapshot
        </h4>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Month</label>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Year</label>
            <input
              type="number"
              min={2024}
              max={2099}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            onClick={() => simulateMut.mutate()}
            disabled={simulateMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            {simulateMut.isPending ? "Simulating..." : "Simulate"}
          </button>
          <button
            onClick={() => snapshotMut.mutate()}
            disabled={snapshotMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Play className="w-4 h-4" />
            {snapshotMut.isPending ? "Running..." : "Run Snapshot"}
          </button>
        </div>
      </div>

      {/* Simulation results */}
      {simResults && simResults.length > 0 && (
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3">
          <h4 className="text-sm font-bold text-white">
            Simulation Preview ({simResults.length} students)
          </h4>
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 space-y-1">
            {simResults.slice(0, 50).map((r) => (
              <div
                key={r.student_id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/40 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-300 w-8">
                    #{r.projected_rank}
                  </span>
                  <span className="text-zinc-400">
                    Student {r.student_id}
                    {r.student_name && ` — ${r.student_name}`}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-200 font-medium">
                    {r.monthly_points} pts
                  </span>
                  {r.projected_bonus > 0 && (
                    <span className="text-emerald-400 font-bold">
                      +{r.projected_bonus} bonus
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nightly streak reset */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Nightly Streak Reset
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Manually trigger the end-of-day streak check. Resets streaks for
              students who didn&apos;t meet the daily threshold.
            </p>
          </div>
          <button
            onClick={() => streakResetMut.mutate()}
            disabled={streakResetMut.isPending}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {streakResetMut.isPending ? "Running..." : "Run Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────── Audit Log Tab ────── */
function AuditLogTab() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-audit-log", page],
    queryFn: () => adminFetchAuditLog(page, pageSize),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const entries: AuditLogEntry[] = data?.entries ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-zinc-400" />
            Audit Log
          </h4>
          <span className="text-xs text-zinc-500">{total} entries</span>
        </div>

        <div
          className={`divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 transition-opacity ${
            isFetching ? "opacity-60" : ""
          }`}
        >
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-zinc-800/30 animate-pulse m-2 rounded-lg"
              />
            ))}

          {!isLoading && entries.length === 0 && (
            <div className="py-12 text-center text-sm text-zinc-500">
              No audit entries yet.
            </div>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className="px-5 py-3 hover:bg-zinc-800/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-3.5 h-3.5 text-violet-400" />
                  <span className="font-medium text-zinc-200">
                    {entry.action}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {entry.created_at ? new Date(entry.created_at).toLocaleString("en-IN") : "—"}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-500 space-x-3">
                <span>Admin: {entry.admin_id}</span>
                {entry.target_student_id && (
                  <span>Student: {entry.target_student_id}</span>
                )}
                {entry.reason && <span>Reason: {entry.reason}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-xs text-zinc-400 enabled:hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-xs text-zinc-500">
              {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-xs text-zinc-400 enabled:hover:text-white disabled:opacity-30 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────── Main Admin Rewards Page ────── */
export default function AdminRewards() {
  const [activeTab, setActiveTab] = useState<Tab>("points");

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6" style={{ background: '#07070F' }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Shield className="w-7 h-7 text-violet-400" />
          Rewards Administration
        </h1>
        <p className="text-sm text-zinc-500">
          Manage points, badges, leaderboard snapshots, and audit all reward
          system activity.
        </p>
      </motion.div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="admin-reward-tab-bg"
                className="absolute inset-0 bg-zinc-800 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === "points" && <PointsTab />}
          {activeTab === "badges" && <BadgesTab />}
          {activeTab === "leaderboard" && <LeaderboardTab />}
          {activeTab === "audit" && <AuditLogTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
