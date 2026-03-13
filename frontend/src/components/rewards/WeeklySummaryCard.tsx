/**
 * WeeklySummaryCard — 7-day bar chart of daily points with total.
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";
import { fetchWeeklySummary } from "../../lib/rewardsApi";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklySummaryCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-summary"],
    queryFn: fetchWeeklySummary,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 animate-pulse">
        <div className="h-32 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const maxPts = Math.max(...data.daily_points.map((d) => d.points), 1);
  const totalWeekPoints = data.daily_points.reduce(
    (sum, d) => sum + d.points,
    0
  );
  const activeDays = data.daily_points.filter((d) => d.points > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h3 className="text-white font-bold text-sm">This Week</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-white leading-none">
            {totalWeekPoints.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500">points this week</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 h-28">
        {data.daily_points.map((d, i) => {
          const heightPct = (d.points / maxPts) * 100;
          const isToday = i === new Date().getDay() - 1; // Mon=0
          const dayOfWeek =
            i < DAY_LABELS.length ? DAY_LABELS[i] : d.date.slice(-2);

          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              {/* Points label (only for non-zero) */}
              {d.points > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-[9px] text-zinc-400 font-medium"
                >
                  {d.points}
                </motion.span>
              )}

              {/* Bar */}
              <div className="w-full relative flex items-end justify-center h-20">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, 4)}%` }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.06,
                    ease: "easeOut",
                  }}
                  className={`w-full max-w-[28px] rounded-t-md ${
                    d.points === 0
                      ? "bg-zinc-800"
                      : isToday
                        ? "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,.3)]"
                        : "bg-violet-500/50"
                  }`}
                />
              </div>

              {/* Day label */}
              <span
                className={`text-[10px] font-medium ${
                  isToday ? "text-violet-400" : "text-zinc-500"
                }`}
              >
                {dayOfWeek}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          {activeDays}/7 active days
        </span>
        <span>
          Avg: {activeDays > 0 ? Math.round(totalWeekPoints / activeDays) : 0}{" "}
          pts/day
        </span>
      </div>
    </motion.div>
  );
}
