/**
 * PointsHistoryList — paginated reward-event timeline.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  Flame,
  Target,
  Trophy,
  LogIn,
  Star,
} from "lucide-react";
import { fetchPointsHistory } from "../../lib/rewardsApi";
import { EVENT_TYPE_LABELS, SOURCE_TOOL_LABELS } from "../../types/rewards";
import type { RewardEvent } from "../../types/rewards";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  session_completed: <Target className="w-4 h-4 text-emerald-400" />,
  daily_login: <LogIn className="w-4 h-4 text-blue-400" />,
  streak_milestone: <Flame className="w-4 h-4 text-orange-400" />,
  streak_incremented: <Flame className="w-4 h-4 text-amber-500" />,
  burst_mode_completed: <Zap className="w-4 h-4 text-yellow-400" />,
  monthly_rank_bonus: <Trophy className="w-4 h-4 text-yellow-400" />,
  admin_adjustment: <Star className="w-4 h-4 text-violet-400" />,
};

function EventRow({ event, index }: { event: RewardEvent; index: number }) {
  const icon = EVENT_ICONS[event.event_type] || (
    <Zap className="w-4 h-4 text-zinc-500" />
  );
  const isPositive = event.points_delta >= 0;
  const dateStr = new Date(event.event_timestamp || "").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/30 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 font-medium truncate">
          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">
          {SOURCE_TOOL_LABELS[event.source_tool] || event.source_tool} &middot;{" "}
          {dateStr}
        </p>
        {/* Session detail line for session_completed events */}
        {event.event_type === "session_completed" && (
          <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
            {event.event_metadata?.operation
              ? String(event.event_metadata.operation).replace(/_/g, " ")
              : ""}
            {event.event_metadata?.correct_answers !== undefined
              ? ` · ${event.event_metadata.correct_answers}${
                  event.event_metadata.attempted_questions !== undefined
                    ? `/${event.event_metadata.attempted_questions}`
                    : ""
                } correct`
              : ""}
          </p>
        )}
        {/* Streak detail */}
        {(event.event_type === "streak_incremented" || event.event_type === "streak_milestone_reached") &&
          event.event_metadata?.streak_days !== undefined && (
          <p className="text-[10px] text-amber-500/80 mt-0.5">
            🔥 {String(event.event_metadata.streak_days)} day streak
          </p>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className={`text-sm font-bold ${
            isPositive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {event.points_delta}
        </p>
      </div>
    </motion.div>
  );
}

export default function PointsHistoryList() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["points-history", page],
    queryFn: () => fetchPointsHistory(page, pageSize),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <Clock className="w-5 h-5 text-zinc-400" />
        <h3 className="text-white font-bold text-sm">Points History</h3>
        {data && (
          <span className="ml-auto text-xs text-zinc-500">
            {data.total} events
          </span>
        )}
      </div>

      {/* List */}
      <div
        className={`p-2 space-y-0.5 min-h-[200px] max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 transition-opacity ${
          isFetching ? "opacity-60" : ""
        }`}
      >
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-zinc-800/40 animate-pulse"
            />
          ))}

        {!isLoading && data && data.events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Clock className="w-8 h-8 mb-2" />
            <p className="text-sm">No activity yet</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {data?.events.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} />
          ))}
        </AnimatePresence>
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
  );
}
