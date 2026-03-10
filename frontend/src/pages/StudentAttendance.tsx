import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Shirt, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import {
  getStudentMonthlyAttendance,
  StudentMonthlyAttendance,
  MonthlySessionEntry,
  AttendanceStatus,
} from "../lib/attendanceApi";
import { useAuth } from "../contexts/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:        "#07070F",
  surface:   "rgba(255,255,255,0.03)",
  surface2:  "rgba(255,255,255,0.06)",
  border:    "rgba(255,255,255,0.08)",
  borderSub: "rgba(255,255,255,0.04)",
  purple:    "#7c5af6",
  green:     "#22c55e",
  red:       "#f87171",
  amber:     "#f59e0b",
  blue:      "#60a5fa",
  orange:    "#f97316",
  text:      "#f1f5f9",
  textSub:   "#94a3b8",
  textMuted: "#64748b",
};

const STATUS_CONFIG: Record<AttendanceStatus, { bg: string; text: string; border: string; dot: string; label: string }> = {
  present:  { bg: "rgba(34,197,94,0.1)",   text: "#22c55e", border: "rgba(34,197,94,0.25)",   dot: "#22c55e", label: "Present"  },
  absent:   { bg: "rgba(248,113,113,0.1)", text: "#f87171", border: "rgba(248,113,113,0.25)", dot: "#f87171", label: "Absent"   },
  on_break: { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b", border: "rgba(245,158,11,0.25)",  dot: "#f59e0b", label: "On Break" },
  leave:    { bg: "rgba(96,165,250,0.1)",  text: "#60a5fa", border: "rgba(96,165,250,0.25)",  dot: "#60a5fa", label: "Leave"    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function firstWeekday(year: number, month: number) {
  const jsDay = new Date(year, month - 1, 1).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}
function isoDateOnly(isoString: string) { return isoString.split("T")[0]; }
function todayDateStr() { return new Date().toLocaleDateString("en-CA"); }

// ─────────────────────────────────────────────────────────────────────────────
// Progress Ring
// ─────────────────────────────────────────────────────────────────────────────
function ProgressRing({ percentage, size = 108, strokeWidth = 9 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const color         = percentage >= 75 ? T.green : percentage >= 60 ? T.amber : T.red;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Card
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ data, monthName, year }: { data: StudentMonthlyAttendance; monthName: string; year: number }) {
  const s   = data.summary;
  const pct = s.attendance_percentage;
  const pctColor = pct >= 75 ? T.green : pct >= 60 ? T.amber : T.red;
  const stats = [
    { label: "Present",  value: s.present,  color: T.green, bg: "rgba(34,197,94,0.08)"   },
    { label: "Absent",   value: s.absent,   color: T.red,   bg: "rgba(248,113,113,0.08)" },
    { label: "On Break", value: s.on_break, color: T.amber, bg: "rgba(245,158,11,0.08)"  },
    { label: "Leave",    value: s.leave,    color: T.blue,  bg: "rgba(96,165,250,0.08)"  },
  ];
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20,
      padding: "20px 24px", backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        {/* Donut ring */}
        <div style={{ position: "relative", flexShrink: 0, width: 108, height: 108 }}>
          <ProgressRing percentage={pct} size={108} strokeWidth={9} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: pctColor, lineHeight: 1 }}>
              {pct.toFixed(0)}%
            </span>
            <span style={{ fontSize: 10, color: T.textMuted, marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              present
            </span>
          </div>
        </div>
        {/* Stats grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{monthName} {year}</h3>
            {data.student.name && (
              <span style={{ fontSize: 12, color: T.textMuted }}>{data.student.name}</span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {stats.map(st => (
              <div key={st.label} style={{
                background: st.bg, borderRadius: 12, padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: st.color, lineHeight: 1 }}>{st.value}</p>
                <p style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{st.label}</p>
              </div>
            ))}
          </div>
          {s.present > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <Shirt style={{ width: 13, height: 13, color: T.orange, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: T.textMuted }}>
                T-Shirt worn{" "}
                <span style={{ color: T.orange, fontWeight: 600 }}>{s.tshirt_worn}</span>
                /{s.present} days
                {s.tshirt_percentage > 0 && (
                  <span style={{ color: T.textMuted }}> ({s.tshirt_percentage.toFixed(0)}%)</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Day Cell — uses inset box-shadow to avoid ring clipping in overflow:hidden parents
// ─────────────────────────────────────────────────────────────────────────────
interface DayCellProps {
  day: number; isToday: boolean; isPadding: boolean;
  session: MonthlySessionEntry | null; isExpanded: boolean; onClick: () => void;
}
function DayCell({ day, isToday, isPadding, session, isExpanded, onClick }: DayCellProps) {
  const status = session?.status as AttendanceStatus | null;
  const sc     = status ? STATUS_CONFIG[status] : null;
  const hasTshirt = session?.t_shirt_worn && status === "present";

  // inset shadow never gets clipped by parent overflow:hidden
  let boxShadow = "none";
  if (isExpanded)   boxShadow = `inset 0 0 0 2px ${T.purple}`;
  else if (isToday) boxShadow = `inset 0 0 0 2px ${T.purple}99`;

  return (
    <button
      onClick={session ? onClick : undefined}
      disabled={isPadding}
      className="attn-day"
      style={{
        position: "relative", aspectRatio: "1", borderRadius: 10,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: isPadding ? "transparent" : sc ? sc.bg : "rgba(255,255,255,0.02)",
        border: `1px solid ${isPadding ? "transparent" : sc ? sc.border : "rgba(255,255,255,0.04)"}`,
        boxShadow,
        cursor: (!isPadding && session) ? "pointer" : "default",
        opacity: isPadding ? 0.15 : 1,
        minWidth: 0,
      }}
      aria-label={`Day ${day}${status ? ", " + STATUS_CONFIG[status].label : ""}`}
    >
      <span style={{
        fontSize: 13, fontWeight: isToday ? 700 : 500,
        color: isToday ? T.purple : (sc ? sc.text : T.textSub), lineHeight: 1,
      }}>
        {day}
      </span>
      {status && (
        <span style={{ marginTop: 3, width: 5, height: 5, borderRadius: "50%", background: sc!.dot, flexShrink: 0 }} />
      )}
      {hasTshirt && (
        <Shirt style={{ position: "absolute", bottom: 3, right: 3, width: 9, height: 9, color: T.orange }} />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded Day Detail
// ─────────────────────────────────────────────────────────────────────────────
function ExpandedDetail({ session, day, monthName }: { session: MonthlySessionEntry; day: number; monthName: string }) {
  const status = session.status as AttendanceStatus;
  const sc     = STATUS_CONFIG[status];
  return (
    <div style={{
      gridColumn: "span 7", margin: "0 2px", borderRadius: 14,
      border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)", overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${T.borderSub}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{day} {monthName}</p>
          {session.topic && <p style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{session.topic}</p>}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {session.course && (
            <span style={{
              fontSize: 11, fontWeight: 500, color: T.blue,
              background: "rgba(96,165,250,0.1)", padding: "3px 9px", borderRadius: 99,
              border: "1px solid rgba(96,165,250,0.2)",
            }}>{session.course}</span>
          )}
          {session.level && (
            <span style={{
              fontSize: 11, color: T.textMuted,
              background: T.surface2, padding: "3px 9px", borderRadius: 99,
              border: `1px solid ${T.border}`,
            }}>{session.level}</span>
          )}
        </div>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 99,
          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
          fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />
          {sc.label}
        </span>
        {status === "present" && (
          session.t_shirt_worn ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
              borderRadius: 99, background: "rgba(249,115,22,0.1)", color: T.orange,
              border: "1px solid rgba(249,115,22,0.25)", fontSize: 12, fontWeight: 500,
            }}>
              <Shirt style={{ width: 12, height: 12 }} /> T-Shirt ✓
            </span>
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
              borderRadius: 99, background: T.surface2, color: T.textMuted,
              border: `1px solid ${T.border}`, fontSize: 12,
            }}>
              <Shirt style={{ width: 12, height: 12 }} /> No T-Shirt
            </span>
          )
        )}
        <span style={{ fontSize: 11, color: T.textMuted }}>
          {session.branch}{session.batch_name ? ` · ${session.batch_name}` : ""}
        </span>
        {session.marked_at && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: T.textMuted }}>
            {new Date(session.marked_at).toLocaleString("en-IN", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
      </div>
      {session.teacher_remarks && (
        <div style={{ padding: "0 16px 12px" }}>
          <p style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic" }}>"{session.teacher_remarks}"</p>
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
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year,  setYear]        = useState(now.getFullYear());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [isSpinning, setIsSpinning]   = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<StudentMonthlyAttendance>({
    queryKey: ["student-attendance-monthly", month, year],
    queryFn:  () => getStudentMonthlyAttendance(month, year),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    setIsSpinning(true);
    refetch().finally(() => setTimeout(() => setIsSpinning(false), 700));
  };

  const sessionMap = new Map<string, MonthlySessionEntry>();
  data?.sessions.forEach(s => sessionMap.set(isoDateOnly(s.session_date), s));

  const prevMonth = () => {
    setExpandedDay(null);
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setExpandedDay(null);
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };
  const jumpToToday = () => {
    setExpandedDay(null);
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const totalDays  = daysInMonth(year, month);
  const startPad   = firstWeekday(year, month);
  const todayStr   = todayDateStr();
  const monthName  = MONTH_NAMES[month - 1];

  const calendarCells: { day: number; isPad: boolean }[] = [
    ...Array.from({ length: startPad }, (_, i) => ({
      day: daysInMonth(year, month === 1 ? 12 : month - 1) - startPad + 1 + i,
      isPad: true,
    })),
    ...Array.from({ length: totalDays }, (_, i) => ({ day: i + 1, isPad: false })),
  ];
  const trailCount = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= trailCount; i++) calendarCells.push({ day: i, isPad: true });

  const rows: typeof calendarCells[] = [];
  for (let i = 0; i < calendarCells.length; i += 7) rows.push(calendarCells.slice(i, i + 7));

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      {/* Global CSS for hover + spin */}
      <style>{`
        .attn-day { transition: transform 0.12s ease; }
        .attn-day:not([disabled]):hover { transform: scale(1.08); }
        @keyframes attn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes attn-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div style={{
        background: "rgba(12,14,26,0.95)", borderBottom: `1px solid ${T.border}`,
        padding: "18px 24px", backdropFilter: "blur(20px)",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(124,90,246,0.15)", border: "1px solid rgba(124,90,246,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Calendar style={{ width: 18, height: 18, color: T.purple }} />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1 }}>My Attendance</h1>
              <p style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>Track your class sessions</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: T.surface2, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.textMuted,
            }}
            aria-label="Refresh"
          >
            <RefreshCw style={{
              width: 15, height: 15,
              animation: isSpinning ? "attn-spin 0.7s linear 1" : "none",
            }} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Summary Card ──────────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ width: 108, height: 108, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "attn-pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ width: 140, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.06)", animation: "attn-pulse 1.5s ease-in-out infinite" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {[0,1,2,3].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: "rgba(255,255,255,0.04)", animation: "attn-pulse 1.5s ease-in-out infinite" }} />)}
                </div>
              </div>
            </div>
          </div>
        ) : isError ? (
          <div style={{
            background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 16, padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 10, color: T.red,
          }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>
              Failed to load attendance.{" "}
              <button onClick={handleRefresh} style={{ textDecoration: "underline", background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 13 }}>
                Retry
              </button>
            </span>
          </div>
        ) : data ? (
          <SummaryCard data={data} monthName={monthName} year={year} />
        ) : null}

        {/* ── Calendar Card ─────────────────────────────────────────── */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 20, backdropFilter: "blur(12px)", overflow: "hidden",
        }}>
          {/* Month navigation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: `1px solid ${T.borderSub}`,
          }}>
            <button onClick={prevMonth} style={{
              width: 32, height: 32, borderRadius: 8, background: T.surface2,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: T.textSub,
            }} aria-label="Previous month">
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{monthName} {year}</span>
              {!isCurrentMonth && (
                <button onClick={jumpToToday} style={{
                  fontSize: 11, color: T.purple, fontWeight: 500,
                  background: "rgba(124,90,246,0.1)", border: "1px solid rgba(124,90,246,0.2)",
                  padding: "3px 9px", borderRadius: 99, cursor: "pointer",
                }}>Today</button>
              )}
            </div>
            <button onClick={nextMonth} style={{
              width: 32, height: 32, borderRadius: 8, background: T.surface2,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: T.textSub,
            }} aria-label="Next month">
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Day name headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "12px 16px 6px" }}>
            {DAY_NAMES_SHORT.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: 10, fontWeight: 600,
                color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em",
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid — padded so inset rings on last row don't look odd */}
          <div style={{ padding: "4px 16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {rows.map((row, rowIdx) => {
              const expandedInRow  = row.find(c => !c.isPad && c.day === expandedDay);
              const expandedSession = expandedInRow
                ? sessionMap.get(`${year}-${String(month).padStart(2,"0")}-${String(expandedInRow.day).padStart(2,"0")}`) ?? null
                : null;
              return (
                <div key={rowIdx}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                    {row.map((cell, ci) => {
                      const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(cell.day).padStart(2,"0")}`;
                      const session = !cell.isPad ? sessionMap.get(dateStr) ?? null : null;
                      const isToday = !cell.isPad && dateStr === todayStr;
                      return (
                        <DayCell
                          key={`${rowIdx}-${ci}`}
                          day={cell.day} isToday={isToday} isPadding={cell.isPad}
                          session={session} isExpanded={!cell.isPad && expandedDay === cell.day}
                          onClick={() => {
                            if (cell.isPad) return;
                            setExpandedDay(prev => prev === cell.day ? null : cell.day);
                          }}
                        />
                      );
                    })}
                  </div>
                  {expandedSession && expandedInRow && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginTop: 4 }}>
                      <ExpandedDetail session={expandedSession} day={expandedInRow.day} monthName={monthName} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            padding: "12px 20px", borderTop: `1px solid ${T.borderSub}`,
            display: "flex", flexWrap: "wrap", gap: "8px 18px", alignItems: "center",
            background: "rgba(255,255,255,0.01)",
          }}>
            {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(([, sc]) => (
              <span key={sc.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />
                {sc.label}
              </span>
            ))}
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted }}>
              <Shirt style={{ width: 10, height: 10, color: T.orange }} />
              T-Shirt
            </span>
          </div>
        </div>

        {/* Empty state */}
        {!isLoading && data && data.sessions.length === 0 && (
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: "32px 24px", textAlign: "center",
          }}>
            <Calendar style={{ width: 32, height: 32, color: T.textMuted, margin: "0 auto 10px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: T.textSub }}>No classes found for {monthName} {year}</p>
            <p style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Try navigating to a different month</p>
          </div>
        )}

        {/* Profile/branch not set up warning */}
        {isError && (
          <div style={{
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 14, padding: "14px 18px",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <AlertCircle style={{ width: 16, height: 16, color: T.amber, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.amber }}>Attendance data unavailable</p>
              <p style={{ fontSize: 12, color: "#a78a3f", marginTop: 4 }}>
                Your student profile may not be set up yet, or you're not assigned to a branch.
                Contact your administrator for help.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
