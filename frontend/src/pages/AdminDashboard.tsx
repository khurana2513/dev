import { useEffect, useState } from "react";
import { LoadingScreen } from "../components/LoadingScreen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { 
  getAdminDashboardData, getStudentStatsAdmin, AdminStats, StudentStats,
  updateStudentPoints, getDatabaseStats, DatabaseStats,
  getStudentPracticeSessionDetailAdmin, PracticeSessionDetail,
  getStudentPaperAttemptDetailAdmin, User, AdminDashboardData,
  getOverallLeaderboard, getWeeklyLeaderboard, LeaderboardEntry,
} from "../lib/userApi";
import { getAttendanceMetrics } from "../lib/attendanceApi";
import { PaperAttemptDetail } from "../lib/api";
import { Shield, Users, BarChart3, Target, TrendingUp, User as UserIcon, Edit2, RefreshCw, Database, X, Brain, FileText, Clock, Eye, CheckCircle2, XCircle, Trophy, IdCard } from "lucide-react";
import { useLocation } from "wouter";
import { formatDateToIST, formatDateOnlyToIST } from "../lib/timezoneUtils";

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPoints, setEditingPoints] = useState<number | null>(null);
  const [pointsInput, setPointsInput] = useState<string>("");
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [sortBy, setSortBy] = useState<"id" | "name" | "points">("id");
  const [selectedSession, setSelectedSession] = useState<PracticeSessionDetail | null>(null);
  const [selectedPaperAttempt, setSelectedPaperAttempt] = useState<PaperAttemptDetail | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<"overall" | "weekly">("overall");

  // ─── Leaderboard Queries ───────────────────────────────────────────────────
  const { data: overallLb = [], isLoading: lbOverallLoading, refetch: refetchOverall } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "overall"],
    queryFn: () => getOverallLeaderboard(100),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: true,
  });
  const { data: weeklyLb = [], isLoading: lbWeeklyLoading, refetch: refetchWeekly } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "weekly"],
    queryFn: () => getWeeklyLeaderboard(100),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: true,
  });

  const { data: attendanceMetrics } = useQuery({
    queryKey: ["attn-metrics-dashboard"],
    queryFn:  () => getAttendanceMetrics(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
  });

  // ─── Combined Admin Dashboard Query (replaces 3 separate API calls) ────────
  const { data: dashboardData, isLoading: dashboardLoading, isError: dashboardError } = useQuery<AdminDashboardData>({
    queryKey: ["adminDashboard"],
    queryFn: getAdminDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh, no refetch
    refetchOnMount: false,     // Prevent duplicate fetch in React StrictMode
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Derive state from the combined query result
  useEffect(() => {
    if (!dashboardData) return;

    setStats(dashboardData.stats);
    setDbStats(dashboardData.database_stats);

    if (dashboardData.students && dashboardData.students.length > 0) {
      const sortedStudents = [...dashboardData.students].sort((a, b) => {
        if (a.public_id && b.public_id) {
          const numA = parseInt(a.public_id.split('-')[1]) || 0;
          const numB = parseInt(b.public_id.split('-')[1]) || 0;
          return numA - numB;
        }
        return (a.public_id ? 0 : 1) - (b.public_id ? 0 : 1) || a.id - b.id;
      });
      setStudents(sortedStudents);
    }

    setLoading(false);
  }, [dashboardData]);

  useEffect(() => {
    setLoading(dashboardLoading);
  }, [dashboardLoading]);

  useEffect(() => {
    if (dashboardError) {
      setLoading(false);
    }
  }, [dashboardError]);

  const handleStudentClick = async (student: User) => {
    setSelectedStudent(student);
    setEditingPoints(null);
    setPointsInput("");
    setSelectedSession(null);
    setSelectedPaperAttempt(null);
    try {
      const stats = await getStudentStatsAdmin(student.id);
      setStudentStats(stats);
    } catch (error) {
      console.error("Failed to load student stats:", error);
    }
  };

  const formatQuestion = (questionData: any, operationType: string): string => {
    if (typeof questionData === "string") {
      try {
        questionData = JSON.parse(questionData);
      } catch {
        return String(questionData);
      }
    }
    
    if (operationType === "add_sub" || operationType === "integer_add_sub") {
      const numbers = questionData.numbers || [];
      const operators = questionData.operators || [];
      return numbers.map((n: number, i: number) => 
        i < operators.length ? `${n} ${operators[i]}` : n
      ).join(" ") + " = ?";
    } else if (operationType === "multiplication") {
      return `${questionData.multiplicand || questionData.num1} × ${questionData.multiplier || questionData.num2} = ?`;
    } else if (operationType === "division") {
      return `${questionData.dividend || questionData.num1} ÷ ${questionData.divisor || questionData.num2} = ?`;
    } else if (operationType === "lcm") {
      return `LCM(${questionData.num1}, ${questionData.num2}) = ?`;
    } else if (operationType === "gcd") {
      return `GCD(${questionData.num1}, ${questionData.num2}) = ?`;
    } else if (operationType === "square_root") {
      return `√${questionData.number} = ?`;
    } else if (operationType === "cube_root") {
      return `∛${questionData.number} = ?`;
    } else if (operationType === "percentage") {
      return `${questionData.value}% of ${questionData.of} = ?`;
    }
    return JSON.stringify(questionData);
  };

  const isPaperAnswerCorrect = (studentAnswer: unknown, correctAnswer: unknown): boolean => {
    const a = Number(studentAnswer);
    const b = Number(correctAnswer);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) < 1e-6;
  };

  const handleStartEditPoints = () => {
    if (studentStats) {
      setEditingPoints(studentStats.total_points);
      setPointsInput(studentStats.total_points.toString());
    }
  };

  const handleSavePoints = async () => {
    if (!selectedStudent || !pointsInput) return;
    const newPoints = parseInt(pointsInput);
    if (isNaN(newPoints) || newPoints < 0) {
      alert("Please enter a valid non-negative number");
      return;
    }
    try {
      await updateStudentPoints(selectedStudent.id, newPoints);
      
      // ✓ FIXED: Use React Query cache invalidation instead of manual sequential fetches
      // Invalidate the combined dashboard query — triggers automatic refetch
      await queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      
      // Reload selected student's stats
      const stats = await getStudentStatsAdmin(selectedStudent.id);
      setStudentStats(stats);
      
      setEditingPoints(null);
      setPointsInput("");
    } catch (error) {
      console.error("Failed to update points:", error);
      alert("Failed to update points. Please try again.");
    }
  };

  const handleCancelEditPoints = () => {
    setEditingPoints(null);
    setPointsInput("");
  };

  const getSortedStudents = () => {
    const sorted = [...students];
    switch (sortBy) {
      case "id":
        return sorted.sort((a, b) => {
          if (a.public_id && b.public_id) {
            const numA = parseInt(a.public_id.split('-')[1]) || 0;
            const numB = parseInt(b.public_id.split('-')[1]) || 0;
            return numA - numB;
          }
          return (a.public_id ? 0 : 1) - (b.public_id ? 0 : 1) || a.id - b.id;
        });
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "points":
        return sorted.sort((a, b) => b.total_points - a.total_points);
      default:
        return sorted;
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-4">Access Denied</div>
          <div className=" text-slate-400 mb-4">You do not have admin permissions to access this page.</div>
          <a href="/dashboard" className=" text-indigo-400  hover:text-indigo-300 underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070F' }}>
        <div className="text-xl  text-red-400">Failed to load dashboard</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-6 sm:pt-16 pb-10 px-4 sm:px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg font-medium">Monitor all student activity and progress</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-card border border-border rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-all">
              <Users className="w-5 h-5 sm:w-6 sm:h-6  text-blue-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Students</div>
            <div className="text-2xl sm:text-3xl font-black italic text-card-foreground">{stats.total_students}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-all">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6  text-green-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Sessions</div>
            <div className="text-2xl sm:text-3xl font-black italic text-card-foreground">{stats.total_sessions}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-all">
              <Target className="w-5 h-5 sm:w-6 sm:h-6  text-purple-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Accuracy</div>
            <div className="text-2xl sm:text-3xl font-black italic text-card-foreground">{stats?.average_accuracy?.toFixed(1) || '0.0'}%</div>
          </div>

          <div className="bg-card border border-border rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-all">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6  text-orange-400" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Active Today</div>
            <div className="text-2xl sm:text-3xl font-black italic text-card-foreground">{stats.active_students_today}</div>
          </div>
        </div>

        {/* ── Attendance Overview ───────────────────────────────────── */}
        <div className="mb-8 bg-card border border-border rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-5 sm:pb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-card-foreground">Attendance Overview</h2>
                <p className="text-xs text-muted-foreground">Today · This Month</p>
              </div>
            </div>

            {attendanceMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Today */}
                {(() => {
                  const pct = attendanceMetrics.date_stats.attendance_percentage;
                  const present = attendanceMetrics.date_stats.present;
                  const absent  = attendanceMetrics.date_stats.absent;
                  const onBreak = attendanceMetrics.date_stats.on_break;
                  const total   = attendanceMetrics.date_stats.total_marked;
                  const r = 30, stroke = 5, circ = 2 * Math.PI * r;
                  const dash = (pct / 100) * circ;
                  return (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                      {/* Donut */}
                      <svg width={74} height={74} className="shrink-0">
                        <circle cx={37} cy={37} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
                        <circle cx={37} cy={37} r={r} fill="none" stroke="rgb(34 197 94)" strokeWidth={stroke}
                          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                          transform="rotate(-90 37 37)" style={{ transition: "stroke-dasharray 0.5s ease" }}
                        />
                        <text x={37} y={34} textAnchor="middle" className="fill-emerald-400" style={{ fontSize: 12, fontWeight: 800 }}>
                          {Math.round(pct)}%
                        </text>
                        <text x={37} y={46} textAnchor="middle" style={{ fontSize: 8, fill: "currentColor", opacity: 0.5 }}>
                          today
                        </text>
                      </svg>
                      {/* Counts */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Today</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-emerald-400 font-semibold">Present</span>
                            <span className="text-sm font-black text-card-foreground">{present}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-rose-400 font-semibold">Absent</span>
                            <span className="text-sm font-black text-card-foreground">{absent}</span>
                          </div>
                          {onBreak > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-amber-400 font-semibold">Break</span>
                              <span className="text-sm font-black text-card-foreground">{onBreak}</span>
                            </div>
                          )}
                          <div className="pt-1 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Marked</span>
                            <span className="text-xs font-bold text-muted-foreground">{total}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* This Month */}
                {(() => {
                  const pct     = attendanceMetrics.monthly_stats.attendance_percentage;
                  const present = attendanceMetrics.monthly_stats.present;
                  const total   = attendanceMetrics.monthly_stats.total;
                  const r = 30, stroke = 5, circ = 2 * Math.PI * r;
                  const dash = (pct / 100) * circ;
                  return (
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                      {/* Donut */}
                      <svg width={74} height={74} className="shrink-0">
                        <circle cx={37} cy={37} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
                        <circle cx={37} cy={37} r={r} fill="none" stroke="rgb(139 92 246)" strokeWidth={stroke}
                          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                          transform="rotate(-90 37 37)" style={{ transition: "stroke-dasharray 0.5s ease" }}
                        />
                        <text x={37} y={34} textAnchor="middle" style={{ fontSize: 12, fontWeight: 800, fill: "rgb(139 92 246)" }}>
                          {Math.round(pct)}%
                        </text>
                        <text x={37} y={46} textAnchor="middle" style={{ fontSize: 8, fill: "currentColor", opacity: 0.5 }}>
                          month
                        </text>
                      </svg>
                      {/* Counts */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">This Month</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-400 font-semibold">Present</span>
                            <span className="text-sm font-black text-card-foreground">{present}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-semibold">Total</span>
                            <span className="text-sm font-black text-card-foreground">{total}</span>
                          </div>
                          <div className="pt-1 border-t border-border">
                            <div className="w-full bg-background rounded-full h-1.5 mt-1">
                              <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1].map(i => (
                  <div key={i} className="h-24 bg-background/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Premium Leaderboard Panel ─────────────────────────────── */}
        <div className="mb-8 bg-card border border-border rounded-[2.5rem] shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black tracking-tight text-card-foreground flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-500" />
              Leaderboard
            </h2>
            <div className="flex items-center gap-2">
              {/* Tab pills */}
              <div className="flex bg-background border border-border rounded-xl p-1 gap-1">
                <button
                  onClick={() => setLeaderboardTab("overall")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    leaderboardTab === "overall"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-card-foreground"
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setLeaderboardTab("weekly")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    leaderboardTab === "weekly"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-card-foreground"
                  }`}
                >
                  This Week
                </button>
              </div>
              {/* Refresh */}
              <button
                onClick={() => leaderboardTab === "overall" ? refetchOverall() : refetchWeekly()}
                className="p-2 rounded-xl border border-border hover:bg-primary/10 hover:border-primary transition-all"
                title="Refresh leaderboard"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Table */}
          {(leaderboardTab === "overall" ? lbOverallLoading : lbWeeklyLoading) ? (
            <div className="px-4 sm:px-8 pb-8 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-background/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Column header */}
              <div className="px-4 sm:px-8 pb-2 grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_auto_auto] gap-3 items-center">
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">#</div>
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Student</div>
                <div className="hidden sm:block text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Total</div>
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground text-right">
                  {leaderboardTab === "weekly" ? "Week" : "Points"}
                </div>
              </div>

              <div className="pb-4 max-h-[26rem] overflow-y-auto scrollbar-premium">
                {(leaderboardTab === "overall" ? overallLb : weeklyLb).map((entry, idx) => {
                  const pts = leaderboardTab === "overall" ? entry.total_points : entry.weekly_points;
                  const initial = (entry.name || "?").charAt(0).toUpperCase();
                  // Deterministic avatar colour from name hash
                  const colours = ["bg-violet-500","bg-sky-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-pink-500","bg-indigo-500","bg-teal-500"];
                  const colIdx = entry.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colours.length;

                  return (
                    <div
                      key={entry.user_id}
                      className="mx-4 my-0.5 px-4 py-2 rounded-2xl grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_auto] gap-2 items-center hover:bg-primary/5 transition-all group"
                    >
                      {/* Rank badge */}
                      <div className="flex justify-center">
                        {idx === 0 ? (
                          <span className="text-lg leading-none">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-lg leading-none">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-lg leading-none">🥉</span>
                        ) : (
                          <span className="text-xs font-black text-muted-foreground w-5 text-center">{idx + 1}</span>
                        )}
                      </div>

                      {/* Avatar + info — single compact row */}
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt={entry.name} className="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-border" />
                        ) : (
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${colours[colIdx]}`}>
                            {initial}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-bold text-card-foreground text-sm truncate group-hover:text-primary transition-colors">
                            {entry.name}
                          </span>
                          {entry.public_id && (
                            <span className="text-[9px] font-mono font-bold px-1 py-px bg-primary/10 text-primary rounded flex-shrink-0">
                              {entry.public_id}
                            </span>
                          )}
                          {entry.branch && (
                            <span className="text-[9px] font-bold px-1 py-px bg-emerald-500/10 text-emerald-400 rounded flex-shrink-0">
                              {entry.branch}
                            </span>
                          )}
                          {entry.course && (
                            <span className="text-[9px] font-bold px-1 py-px bg-sky-500/10 text-sky-400 rounded flex-shrink-0 hidden sm:inline">
                              {entry.course}
                            </span>
                          )}
                          {entry.level && (
                            <span className="text-[9px] font-bold px-1 py-px bg-violet-500/10 text-violet-400 rounded flex-shrink-0 hidden sm:inline">
                              {entry.level}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Total points (overall tab secondary, weekly tab hidden) */}
                      <div className="hidden sm:block text-right">
                        {leaderboardTab === "weekly" && (
                          <span className="text-xs text-muted-foreground font-medium">{entry.total_points.toLocaleString()}</span>
                        )}
                      </div>

                      {/* Primary metric */}
                      <div className="text-right">
                        <span className={`font-black text-sm ${
                          idx === 0 ? "text-amber-500" :
                          idx === 1 ? "text-slate-400" :
                          idx === 2 ? "text-orange-400" :
                          "text-card-foreground"
                        }`}>
                          {pts.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-muted-foreground">pts</div>
                      </div>
                    </div>
                  );
                })}

                {(leaderboardTab === "overall" ? overallLb : weeklyLb).length === 0 && (
                  <div className="px-8 py-12 text-center text-muted-foreground">
                    <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No data yet</p>
                    <p className="text-sm mt-1">Rankings will appear once students start practicing.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Students List */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-card-foreground flex items-center gap-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    Students
                  </h2>
                  <span className="text-sm font-bold text-muted-foreground">{students.length} total</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setLocation("/admin/students")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs sm:text-sm font-bold transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Manage
                  </button>
                  <button
                    onClick={() => setLocation("/admin/student-ids")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20  text-blue-400 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                  >
                    <IdCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    IDs
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "id" | "name" | "points")}
                    className="px-2 py-1.5 sm:px-3 sm:py-2  bg-slate-800 border border-border rounded-xl text-xs sm:text-sm font-medium text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="id">Sort by ID</option>
                    <option value="name">Sort by Name</option>
                    <option value="points">Sort by Points</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-premium">
                {getSortedStudents().map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    className={`bg-background/50 border rounded-2xl p-6 cursor-pointer transition-all group ${
                      selectedStudent?.id === student.id
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={student.display_name || student.name} className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all">
                            <UserIcon className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-card-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            {student.display_name || student.name}
                            {student.public_id && (
                              <span className="text-xs font-medium text-muted-foreground">ID: {student.public_id}</span>
                            )}

                          </div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-card-foreground">{student.total_points} pts</div>
                        <div className="text-xs text-muted-foreground">Total Points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedStudent && studentStats ? (
              <div className="bg-card border border-border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black tracking-tight text-card-foreground flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    {selectedStudent.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Points Section */}
                  <div className="bg-background/50 border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Points</span>
                      {editingPoints === null ? (
                        <button
                          onClick={handleStartEditPoints}
                          className="p-1 hover:bg-primary/10 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-primary" />
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={handleSavePoints}
                            className="p-1 hover:bg-green-500/10 rounded transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={handleCancelEditPoints}
                            className="p-1 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingPoints !== null ? (
                      <input
                        type="number"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                        className="w-full px-3 py-2  bg-slate-800 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        placeholder="Enter points"
                      />
                    ) : (
                      <div className="text-2xl font-black italic text-card-foreground">{studentStats.total_points || 0}</div>
                    )}
                  </div>

                  {/* Mental Math Metrics */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      Mental Math Practice
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Accuracy</div>
                        <div className="text-lg font-black italic text-card-foreground">{studentStats.overall_accuracy.toFixed(1)}%</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Sessions</div>
                        <div className="text-lg font-black italic text-card-foreground">{studentStats.total_sessions}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Correct</div>
                        <div className="text-lg font-black italic  text-green-400">{studentStats.total_correct}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Wrong</div>
                        <div className="text-lg font-black italic  text-red-400">{studentStats.total_wrong}</div>
                      </div>
                    </div>
                    <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Questions</div>
                      <div className="text-xl font-black italic text-card-foreground">{studentStats.total_questions || 0}</div>
                    </div>
                  </div>

                  {/* Practice Paper Metrics */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Practice Paper Attempts
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Accuracy</div>
                        <div className="text-lg font-black italic text-card-foreground">
                          {studentStats.paper_overall_accuracy !== undefined ? studentStats.paper_overall_accuracy.toFixed(1) : "0.0"}%
                        </div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Sessions</div>
                        <div className="text-lg font-black italic text-card-foreground">{studentStats.total_paper_attempts || 0}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Correct</div>
                        <div className="text-lg font-black italic  text-green-400">{studentStats.paper_total_correct || 0}</div>
                      </div>
                      <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Wrong</div>
                        <div className="text-lg font-black italic  text-red-400">{studentStats.paper_total_wrong || 0}</div>
                      </div>
                    </div>
                    <div className="bg-background/50 border border-border rounded-xl p-3 text-center">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Questions</div>
                      <div className="text-xl font-black italic text-card-foreground">{studentStats.paper_total_questions || 0}</div>
                    </div>
                  </div>



                  {/* Mental Math Sessions */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      Mental Math Sessions
                    </h4>
                    {studentStats.recent_sessions && studentStats.recent_sessions.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-premium">
                        {studentStats.recent_sessions.map((session) => (
                          <div
                            key={session.id}
                            onClick={async () => {
                              if (!selectedStudent) return;
                              try {
                                const detail = await getStudentPracticeSessionDetailAdmin(selectedStudent.id, session.id);
                                setSelectedSession(detail);
                              } catch (err) {
                                console.error("Failed to load session details for admin:", err);
                                alert("Failed to load session details");
                              }
                            }}
                            className="bg-background/50 border border-border rounded-lg p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-bold text-card-foreground">
                                {session.operation_type} - {session.difficulty_mode}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateOnlyToIST(session.started_at)}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs items-center">
                              <div>
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-bold  text-green-400">{session.correct_answers}/{session.total_questions}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Accuracy: </span>
                                <span className="font-bold text-primary">{session.accuracy.toFixed(1)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-muted-foreground">Points: </span>
                                  <span className="font-bold  text-yellow-400">{session.points_earned}</span>
                                </div>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                            {session.time_taken && (
                              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.floor(session.time_taken / 60)}m {Math.floor(session.time_taken % 60)}s
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">No mental math sessions yet</div>
                    )}
                  </div>

                  {/* Practice Paper Sessions */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Practice Paper Sessions
                    </h4>
                    {studentStats.recent_paper_attempts && studentStats.recent_paper_attempts.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-premium">
                        {studentStats.recent_paper_attempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            onClick={async () => {
                              if (!selectedStudent) return;
                              try {
                                const detail = await getStudentPaperAttemptDetailAdmin(selectedStudent.id, attempt.id);
                                setSelectedPaperAttempt(detail);
                              } catch (err) {
                                console.error("Failed to load paper attempt details for admin:", err);
                                alert("Failed to load paper attempt details");
                              }
                            }}
                            className="bg-background/50 border border-border rounded-lg p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-bold text-card-foreground">
                                {attempt.paper_title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {attempt.started_at ? formatDateOnlyToIST(attempt.started_at) : 'N/A'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Level: {attempt.paper_level}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs items-center">
                              <div>
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-bold  text-green-400">{attempt.correct_answers}/{attempt.total_questions}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Accuracy: </span>
                                <span className="font-bold text-primary">{attempt.accuracy.toFixed(1)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-muted-foreground">Points: </span>
                                  <span className="font-bold  text-yellow-400">{attempt.points_earned}</span>
                                </div>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                            {attempt.time_taken && (
                              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.floor(attempt.time_taken / 60)}m {Math.floor(attempt.time_taken % 60)}s
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">No practice paper sessions yet</div>
                    )}
                  </div>

                  {/* Delete button moved to Student Management page */}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl text-center">
                <UserIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-muted-foreground font-medium">Select a student to view details</div>
              </div>
            )}
          </div>
        </div>

        {/* Session Detail Modal */}
        {selectedSession && selectedStudent && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSession(null)}
          >
            <div
              className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-card-foreground">
                    Practice Session Details
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStudent.name} • {selectedSession.operation_type} • {selectedSession.difficulty_mode}
                  </p>
                  {selectedSession.completed_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Completed: {formatDateToIST(selectedSession.completed_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-destructive" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 scrollbar-premium">
                {/* Session Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Score</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {selectedSession.score}/{selectedSession.total_questions}
                    </div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Accuracy</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {selectedSession.accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Time</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {Math.floor(selectedSession.time_taken / 60)}m {Math.floor(selectedSession.time_taken % 60)}s
                    </div>
                  </div>
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Points</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      +{selectedSession.points_earned}
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div>
                  <h3 className="text-xl font-black tracking-tight text-card-foreground mb-6">
                    Questions & Answers
                  </h3>
                  <div className="space-y-4">
                    {selectedSession.attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className={`bg-background/50 border rounded-2xl p-6 transition-all ${
                          attempt.is_correct
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="font-bold text-card-foreground">
                                Q{attempt.question_number}:
                              </span>
                              <span className="text-card-foreground font-mono text-lg">
                                {formatQuestion(attempt.question_data, selectedSession.operation_type)}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <span className={attempt.is_correct ? " text-green-400" : " text-red-400"}>
                                Student answer: <span className="font-bold">{attempt.user_answer !== null ? attempt.user_answer : "—"}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Correct: <span className="font-bold">{attempt.correct_answer}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Time: <span className="font-bold">{attempt.time_taken.toFixed(2)}s</span>
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            {attempt.is_correct ? (
                              <CheckCircle2 className="w-6 h-6  text-green-400" />
                            ) : (
                              <XCircle className="w-6 h-6  text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Practice Paper Attempt Detail Modal */}
        {selectedPaperAttempt && selectedStudent && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPaperAttempt(null)}
          >
            <div
              className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-card-foreground">
                    Practice Paper Details
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStudent.name} • {selectedPaperAttempt.paper_title} • {selectedPaperAttempt.paper_level}
                  </p>
                  {selectedPaperAttempt.completed_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Completed: {formatDateToIST(selectedPaperAttempt.completed_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPaperAttempt(null)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-destructive" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 scrollbar-premium">
                {/* Attempt Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-background/50 border border-border rounded-2xl p-6 text-center">
                    <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Score</div>
                    <div className="text-3xl font-black italic text-card-foreground">
                      {selectedPaperAttempt.correct_answers}/{selectedPaperAttempt.total_questions}
                    </div>
                  </div>
                <div className=" bg-green-900/30 rounded-lg p-4 border  border-green-700 transition-all duration-300">
                  <div className="text-sm  text-green-300 font-semibold">Accuracy</div>
                  <div className="text-2xl font-bold  text-green-200">
                    {selectedPaperAttempt.accuracy.toFixed(1)}%
                  </div>
                </div>
                <div className=" bg-blue-900/30 rounded-lg p-4 border  border-blue-700 transition-all duration-300">
                  <div className="text-sm  text-blue-300 font-semibold">Time</div>
                  <div className="text-2xl font-bold  text-blue-200">
                    {selectedPaperAttempt.time_taken != null
                      ? `${Math.floor(selectedPaperAttempt.time_taken / 60)}m ${Math.floor(selectedPaperAttempt.time_taken % 60)}s`
                      : "—"}
                  </div>
                </div>
                <div className=" bg-purple-900/30 rounded-lg p-4 border  border-purple-700 transition-all duration-300">
                  <div className="text-sm  text-purple-300 font-semibold">Points</div>
                  <div className="text-2xl font-bold  text-purple-200">
                    +{selectedPaperAttempt.points_earned}
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div>
                <h3 className="text-lg font-bold  text-white mb-4">
                  Questions &amp; Answers
                </h3>
                <div className="space-y-3">
                  {selectedPaperAttempt.generated_blocks?.flatMap((b) => b.questions || []).map((q, idx) => {
                    const studentAnswer = selectedPaperAttempt.answers?.[String(q.id)];
                    const isCorrect = isPaperAnswerCorrect(studentAnswer, q.answer);
                    return (
                      <div
                        key={q.id ?? idx}
                        className={`rounded-lg p-4 border-2 transition-all duration-300 ${
                          isCorrect
                            ? " bg-green-900/20  border-green-700"
                            : " bg-red-900/20  border-red-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold  text-white">
                                Q{idx + 1}:
                              </span>
                              <span className=" text-white font-mono text-lg">
                                {q.text}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className={isCorrect ? " text-green-300" : " text-red-300"}>
                                Student answer:{" "}
                                <span className="font-semibold">
                                  {studentAnswer != null ? String(studentAnswer) : "—"}
                                </span>
                              </span>
                              <span className=" text-slate-300">
                                Correct: <span className="font-semibold">{String(q.answer)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            {isCorrect ? (
                              <CheckCircle2 className="w-6 h-6  text-green-400" />
                            ) : (
                              <XCircle className="w-6 h-6  text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Database Stats */}
        {dbStats && (
          <div className="mt-8  bg-slate-800 backdrop-blur-sm rounded-2xl p-6  shadow-xl border  border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6  text-indigo-400" />
                <h2 className="text-2xl font-bold  text-white">Database Statistics</h2>
              </div>
              <button
                onClick={async () => {
                  try {
                    const dbStatsData = await getDatabaseStats();
                    setDbStats(dbStatsData);
                  } catch (error) {
                    console.error("Failed to refresh database stats:", error);
                    alert("Failed to refresh database stats. Please try again.");
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-4  bg-slate-700 rounded-xl border  border-slate-600 transition-all duration-300">
                <div className="text-xs  text-slate-300 mb-1">Total Users</div>
                <div className="text-xl font-bold  text-white">{dbStats.total_users}</div>
              </div>
              <div className="p-4  bg-slate-700 rounded-xl border  border-slate-600 transition-all duration-300">
                <div className="text-xs  text-slate-300 mb-1">Students</div>
                <div className="text-xl font-bold  text-indigo-400">{dbStats.total_students}</div>
              </div>
              <div className="p-4  bg-slate-700 rounded-xl border  border-slate-600 transition-all duration-300">
                <div className="text-xs  text-slate-300 mb-1">Admins</div>
                <div className="text-xl font-bold  text-purple-400">{dbStats.total_admins}</div>
              </div>
              <div className="p-4  bg-slate-700 rounded-xl border  border-slate-600 transition-all duration-300">
                <div className="text-xs  text-slate-300 mb-1">Sessions</div>
                <div className="text-xl font-bold  text-green-400">{dbStats.total_sessions}</div>
              </div>
              <div className="p-4  bg-slate-700 rounded-xl border  border-slate-600 transition-all duration-300">
                <div className="text-xs  text-slate-300 mb-1">Paper Attempts</div>
                <div className="text-xl font-bold  text-blue-400">{dbStats.total_paper_attempts}</div>
              </div>
              <div className="p-4  bg-slate-700 rounded-xl border  border-slate-600 transition-all duration-300">
                <div className="text-xs  text-slate-300 mb-1">DB Size</div>
                <div className="text-xl font-bold  text-white">{dbStats.database_size_mb} MB</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

