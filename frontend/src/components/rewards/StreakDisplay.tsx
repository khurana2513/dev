/**
 * StreakDisplay — shows current streak, today's progress, next milestone,
 * and a monthly calendar view of qualifying days.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Target, TrendingUp, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { fetchStreak, fetchStreakCalendar } from "../../lib/rewardsApi";

const MILESTONES = [3, 7, 14, 30, 60, 100];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getISTDate(): { year: number; month: number; day: number } {
  const now = new Date();
  const istStr = now.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" });
  const [ymd] = istStr.split(",");
  const [y, m, d] = ymd.trim().split("-").map(Number);
  return { year: y, month: m, day: d };
}

export default function StreakDisplay() {
  const { data, isLoading } = useQuery({
    queryKey: ["streak"],
    queryFn: fetchStreak,
    staleTime: 30_000,
  });

  const ist = getISTDate();
  const [calYear, setCalYear] = useState(ist.year);
  const [calMonth, setCalMonth] = useState(ist.month);

  // Countdown to midnight IST
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // IST midnight = today's date in IST, starting at 00:00 IST = previous UTC day 18:30
      // Easiest: compute seconds remaining in the IST day
      const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
      const msIntoDay = istMs % (24 * 60 * 60 * 1000);
      const msLeft = 24 * 60 * 60 * 1000 - msIntoDay;
      const h = Math.floor(msLeft / 3_600_000);
      const m = Math.floor((msLeft % 3_600_000) / 60_000);
      const s = Math.floor((msLeft % 60_000) / 1_000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const { data: calData, isLoading: calLoading } = useQuery({
    queryKey: ["streak-calendar", calYear, calMonth],
    queryFn: () => fetchStreakCalendar(calYear, calMonth),
    staleTime: 60_000,
  });

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    // Don't allow navigating past current month
    const { year: cy, month: cm } = getISTDate();
    if (calYear > cy || (calYear === cy && calMonth >= cm)) return;
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  const isCurrentMonth = calYear === ist.year && calMonth === ist.month;
  const canGoForward = !isCurrentMonth;

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 animate-pulse">
        <div className="h-20 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const streakDays = data.current_streak;
  const longestStreak = data.longest_streak;
  const todayCount = data.today_qualifying_count;
  const threshold = data.today_threshold;
  const todayPct = Math.min((todayCount / threshold) * 100, 100);
  const qualified = todayCount >= threshold;

  const nextMilestone = MILESTONES.find((m) => m > streakDays) ?? null;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= streakDays) ?? 0;
  const milestonePct = nextMilestone
    ? ((streakDays - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100;

  const flameColor =
    streakDays >= 60
      ? "text-purple-400"
      : streakDays >= 30
        ? "text-yellow-400"
        : streakDays >= 14
          ? "text-orange-400"
          : streakDays >= 7
            ? "text-amber-500"
            : streakDays >= 3
              ? "text-red-400"
              : "text-zinc-500";

  // Build calendar grid
  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const calDayMap: Record<string, { qualified: boolean; count: number; future: boolean }> = {};
  if (calData) {
    for (const d of calData.days) {
      const dayNum = parseInt(d.date.split("-")[2]);
      const isFuture =
        calYear > ist.year ||
        (calYear === ist.year && calMonth > ist.month) ||
        (calYear === ist.year && calMonth === ist.month && dayNum > ist.day);
      calDayMap[d.date] = { qualified: d.qualified, count: d.count, future: isFuture };
    }
  }

  const gridCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              streakDays > 0
                ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                : {}
            }
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <Flame className={`w-8 h-8 ${flameColor}`} />
          </motion.div>
          <div>
            <p className="text-3xl font-extrabold text-white leading-none">
              {streakDays}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">day streak</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Best: {longestStreak}d</span>
        </div>
      </div>

      {/* Today's progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Today&apos;s progress
          </span>
          <span
            className={
              qualified
                ? "text-emerald-400 font-semibold"
                : "text-zinc-500"
            }
          >
            {todayCount}/{threshold} questions
          </span>
        </div>

        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${todayPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              qualified
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,.4)]"
                : "bg-amber-500"
            }`}
          />
        </div>

        {qualified ? (
          <p className="text-xs text-emerald-400/80 text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Streak secured for today!
          </p>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              <span className="font-mono font-semibold text-amber-300">{countdown}</span>{" "}
              left to secure tonight&apos;s streak
            </span>
          </div>
        )}
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Next milestone
            </span>
            <span className="text-zinc-300 font-medium">
              {nextMilestone}-day streak
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${milestonePct}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full bg-violet-500/80"
            />
          </div>

          <p className="text-[10px] text-zinc-600 text-center">
            {nextMilestone - streakDays} days to go
          </p>
        </div>
      )}

      {!nextMilestone && streakDays >= 100 && (
        <p className="text-xs text-center text-yellow-400 font-semibold">
          All streak milestones achieved!
        </p>
      )}

      {/* ── Monthly Calendar ── */}
      <div className="pt-2 border-t border-zinc-800 space-y-3">
        {/* Calendar nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold text-zinc-200">
              {MONTH_NAMES[calMonth - 1]} {calYear}
            </p>
            {calData && (
              <p className="text-[10px] text-zinc-500 mt-0.5">
                <CheckCircle2 className="inline w-3 h-3 text-emerald-500 mr-0.5 -mt-0.5" />
                {calData.qualified_count}/{calData.total_days} days qualified
              </p>
            )}
          </div>
          <button
            onClick={nextMonth}
            disabled={!canGoForward}
            className={`p-1 rounded-lg transition-colors ${
              canGoForward
                ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                : "text-zinc-700 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day name headers */}
        <div className="grid grid-cols-7 gap-0.5">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[10px] text-zinc-600 font-medium py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {calLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-zinc-800/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((dayNum, i) => {
              if (dayNum === null) {
                return <div key={`empty-${i}`} />;
              }
              const isoDate = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const cell = calDayMap[isoDate];
              const isToday = isCurrentMonth && dayNum === ist.day;

              let cellClass = "rounded-lg flex flex-col items-center justify-center h-8 text-[11px] font-medium transition-colors relative ";
              if (!cell || cell.future) {
                cellClass += isToday
                  ? "text-zinc-200 ring-1 ring-zinc-500"
                  : "text-zinc-600";
              } else if (cell.qualified) {
                cellClass += "bg-emerald-500/20 text-emerald-300";
              } else {
                cellClass += "bg-red-900/20 text-red-500/60";
              }

              return (
                <div key={isoDate} className={cellClass} title={cell ? `${cell.count} questions` : undefined}>
                  <span>{dayNum}</span>
                  {cell && !cell.future && (
                    <div
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        cell.qualified ? "bg-emerald-500" : "bg-red-500/40"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
