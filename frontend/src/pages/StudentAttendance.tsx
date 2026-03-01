import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Shirt, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import {
  getStudentMonthlyAttendance,
  StudentMonthlyAttendance,
  MonthlySessionEntry,
  AttendanceStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../lib/attendanceApi";
import { useAuth } from "../contexts/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-indexed
}

/** Returns weekday index (0=Mon … 6=Sun) for day 1 of the month */
function firstWeekday(year: number, month: number) {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0
}

function isoDateOnly(isoString: string) {
  return isoString.split("T")[0];
}

function todayDateStr() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD locale-safe
}

// ─────────────────────────────────────────────────────────────────────────────
// Circular progress ring
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressRingProps {
  percentage: number;  // 0–100
  size?: number;
  strokeWidth?: number;
}
function ProgressRing({ percentage, size = 96, strokeWidth = 8 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  const color =
    percentage >= 75 ? "#10B981" :
    percentage >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="currentColor"
        className="text-slate-200 dark:text-slate-700"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Card
// ─────────────────────────────────────────────────────────────────────────────
interface SummaryCardProps {
  data: StudentMonthlyAttendance;
  monthName: string;
  year: number;
}
function SummaryCard({ data, monthName, year }: SummaryCardProps) {
  const s = data.summary;
  const pct = s.attendance_percentage;
  const pctColor =
    pct >= 75 ? "text-emerald-600 dark:text-emerald-400" :
    pct >= 60 ? "text-amber-600 dark:text-amber-400"     : "text-rose-600 dark:text-rose-400";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-start gap-5">
        {/* Ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <ProgressRing percentage={pct} size={96} strokeWidth={8} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${pctColor}`}>{pct.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-400">present</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {monthName} {year}
            </h3>
            {data.student.name && (
              <span className="text-xs text-slate-400 truncate max-w-[120px]">{data.student.name}</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="Present"  value={s.present}      color="emerald" />
            <StatPill label="Absent"   value={s.absent}       color="rose"    />
            <StatPill label="On Break" value={s.on_break}     color="amber"   />
            <StatPill label="Leave"    value={s.leave}        color="blue"    />
          </div>

          {s.present > 0 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
              <Shirt className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                T-Shirt: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{s.tshirt_worn}</span> / {s.present} days
                {s.tshirt_percentage > 0 && <span className="text-slate-400"> ({s.tshirt_percentage.toFixed(0)}%)</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: "emerald" | "rose" | "amber" | "blue" }) {
  const classes: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    rose:    "bg-rose-50    dark:bg-rose-950/30    text-rose-700    dark:text-rose-300",
    amber:   "bg-amber-50   dark:bg-amber-950/30   text-amber-700   dark:text-amber-300",
    blue:    "bg-blue-50    dark:bg-blue-950/30    text-blue-700    dark:text-blue-300",
  };
  return (
    <div className={`rounded-xl px-3 py-2 ${classes[color]}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[11px] mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Day Cell
// ─────────────────────────────────────────────────────────────────────────────
interface DayCellProps {
  day: number;
  isToday: boolean;
  isPadding: boolean;
  session: MonthlySessionEntry | null;
  isExpanded: boolean;
  onClick: () => void;
}

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present:  "bg-emerald-500",
  absent:   "bg-rose-500",
  on_break: "bg-amber-500",
  leave:    "bg-blue-500",
};

const STATUS_CELL_BG: Record<AttendanceStatus, string> = {
  present:  "bg-emerald-50  dark:bg-emerald-950/25",
  absent:   "bg-rose-50     dark:bg-rose-950/25",
  on_break: "bg-amber-50    dark:bg-amber-950/25",
  leave:    "bg-blue-50     dark:bg-blue-950/25",
};

function DayCell({ day, isToday, isPadding, session, isExpanded, onClick }: DayCellProps) {
  const status = session?.status as AttendanceStatus | null;
  const cellBg = status ? STATUS_CELL_BG[status] : "";
  const hasTshirt = session?.t_shirt_worn && status === "present";

  return (
    <button
      onClick={session ? onClick : undefined}
      disabled={!session && !isPadding}
      className={`
        relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-150
        ${isPadding ? "opacity-20 cursor-default" : ""}
        ${!isPadding && session ? "cursor-pointer hover:scale-105" : "cursor-default"}
        ${isExpanded ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900" : ""}
        ${isToday ? "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-900" : ""}
        ${cellBg}
        ${!status && !isPadding ? "bg-white dark:bg-slate-900" : ""}
      `}
      aria-label={`Day ${day}${status ? ", " + STATUS_LABELS[status] : ""}`}
    >
      <span className={`text-sm font-semibold ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
        {day}
      </span>
      {status && (
        <span className={`mt-0.5 w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
      )}
      {hasTshirt && (
        <Shirt className="absolute bottom-1 right-1 w-2.5 h-2.5 text-indigo-500" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded Day Detail
// ─────────────────────────────────────────────────────────────────────────────
interface ExpandedDetailProps {
  session: MonthlySessionEntry;
  day: number;
  monthName: string;
}
function ExpandedDetail({ session, day, monthName }: ExpandedDetailProps) {
  const status = session.status as AttendanceStatus | null;
  const sc = status ? STATUS_COLORS[status] : null;

  return (
    <div className="col-span-7 mx-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {day} {monthName}
          </p>
          {session.topic && <p className="text-xs text-slate-500 dark:text-slate-400">{session.topic}</p>}
        </div>
        <div className="flex items-center gap-2">
          {session.course && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
              {session.course}
            </span>
          )}
          {session.level && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {session.level}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-wrap gap-3 items-center">
        {/* Attendance badge */}
        {status ? (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold ${sc!.bg} ${sc!.text}`}>
            <span className={`w-2 h-2 rounded-full ${sc!.dot}`} />
            {STATUS_LABELS[status]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            Not marked
          </span>
        )}

        {/* T-shirt badge */}
        {status === "present" && (
          session.t_shirt_worn ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              <Shirt className="w-3.5 h-3.5" />
              T-Shirt Worn ✓
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Shirt className="w-3.5 h-3.5" />
              T-Shirt Not Worn
            </span>
          )
        )}

        {/* Branch */}
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {session.branch}
          {session.batch_name ? ` · ${session.batch_name}` : ""}
        </span>

        {/* Marked at */}
        {session.marked_at && (
          <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
            Marked: {new Date(session.marked_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {session.teacher_remarks && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{session.teacher_remarks}"</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentAttendance() {
  const { isAuthenticated: _auth } = useAuth();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);  // 1–12
  const [year, setYear]   = useState(now.getFullYear());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const queryKey = ["student-attendance-monthly", month, year];
  const { data, isLoading, isError, refetch } = useQuery<StudentMonthlyAttendance>({
    queryKey,
    queryFn: () => getStudentMonthlyAttendance(month, year),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Build a map: YYYY-MM-DD → session entry
  const sessionMap = new Map<string, MonthlySessionEntry>();
  data?.sessions.forEach(s => {
    sessionMap.set(isoDateOnly(s.session_date), s);
  });

  const prevMonth = () => {
    setExpandedDay(null);
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setExpandedDay(null);
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const jumpToToday = () => {
    setExpandedDay(null);
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const totalDays  = daysInMonth(year, month);
  const startPad   = firstWeekday(year, month);
  const todayStr   = todayDateStr();
  const monthName  = MONTH_NAMES[month - 1];

  // Build calendar cells: padding cells + real day cells
  const calendarCells: { day: number; isPad: boolean }[] = [
    ...Array.from({ length: startPad }, (_, i) => ({
      day: daysInMonth(year, month === 1 ? 12 : month - 1) - startPad + 1 + i,
      isPad: true,
    })),
    ...Array.from({ length: totalDays }, (_, i) => ({ day: i + 1, isPad: false })),
  ];
  // Fill trailing cells to complete the grid (multiple of 7)
  const trailCount = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= trailCount; i++) calendarCells.push({ day: i, isPad: true });

  // For the expanded panel, figure out which row it belongs to
  const rows: typeof calendarCells[] = [];
  for (let i = 0; i < calendarCells.length; i += 7) rows.push(calendarCells.slice(i, i + 7));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">My Attendance</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track your class attendance</p>
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Summary Card */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start gap-5">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="grid grid-cols-4 gap-3">
                  {[0,1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
              </div>
            </div>
          </div>
        ) : isError ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900 p-5 flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Failed to load attendance. <button onClick={() => refetch()} className="underline">Retry</button></span>
          </div>
        ) : data ? (
          <SummaryCard data={data} monthName={monthName} year={year} />
        ) : null}

        {/* Calendar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {monthName} {year}
              </h2>
              {(month !== now.getMonth() + 1 || year !== now.getFullYear()) && (
                <button onClick={jumpToToday} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Today
                </button>
              )}
            </div>

            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-4 pt-3 pb-1">
            {DAY_NAMES_SHORT.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid — row by row so we can inject expanded detail */}
          <div className="px-4 pb-4 space-y-1">
            {rows.map((row, rowIdx) => {
              // Find if an expanded day is in this row
              const expandedInRow = row.find(c => !c.isPad && c.day === expandedDay);
              const expandedSession = expandedInRow
                ? sessionMap.get(`${year}-${String(month).padStart(2,"0")}-${String(expandedInRow.day).padStart(2,"0")}`) ?? null
                : null;

              return (
                <div key={rowIdx} className="contents">
                  <div className="grid grid-cols-7 gap-1">
                    {row.map((cell, ci) => {
                      const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(cell.day).padStart(2,"0")}`;
                      const session = !cell.isPad ? sessionMap.get(dateStr) ?? null : null;
                      const isToday = !cell.isPad && dateStr === todayStr;

                      return (
                        <DayCell
                          key={`${rowIdx}-${ci}`}
                          day={cell.day}
                          isToday={isToday}
                          isPadding={cell.isPad}
                          session={session}
                          isExpanded={!cell.isPad && expandedDay === cell.day}
                          onClick={() => {
                            if (cell.isPad) return;
                            setExpandedDay(prev => prev === cell.day ? null : cell.day);
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Expanded row detail */}
                  {expandedSession && expandedInRow && (
                    <div className="grid grid-cols-7 gap-1">
                      <ExpandedDetail
                        session={expandedSession}
                        day={expandedInRow.day}
                        monthName={monthName}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-5 flex-wrap bg-slate-50/60 dark:bg-slate-900/60">
            {([
              { label: "Present",  dot: "bg-emerald-500" },
              { label: "Absent",   dot: "bg-rose-500"    },
              { label: "On Break", dot: "bg-amber-500"   },
              { label: "Leave",    dot: "bg-blue-500"    },
            ] as const).map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                {l.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Shirt className="w-3 h-3 text-indigo-500" />T-Shirt
            </span>
          </div>
        </div>

        {/* Empty state for no sessions */}
        {!isLoading && data && data.sessions.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No classes found for {monthName} {year}</p>
            <p className="text-xs text-slate-400 mt-1">Try navigating to a different month</p>
          </div>
        )}

        {/* No profile warning */}
        {isError && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-800 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Attendance data unavailable</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Your student profile may not be set up yet, or you may not be assigned to a branch.
                Contact your administrator for help.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
