import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { getStudentDashboardData, getPracticeSessionDetail, StudentStats, PracticeSessionDetail, getPointsLogs, PointsSummaryResponse, PointsLogEntry, StudentDashboardData, getOverallLeaderboard, getWeeklyLeaderboard, LeaderboardEntry } from "../lib/userApi";
import { PaperAttempt, getPaperAttempt, PaperAttemptDetail, getPaperAttemptCount } from "../lib/api";
import { Trophy, Target, Zap, CheckCircle2, XCircle, BarChart3, History, X, Eye, ChevronDown, ChevronUp, RotateCcw, Clock, Loader2, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDateToIST } from "../lib/timezoneUtils";
import MathQuestion from "../components/MathQuestion";
import Skeleton from "../components/Skeleton";

type SessionFilter = "overall" | "mental_math" | "practice_paper" | "burst_mode";

interface UnifiedSession {
  id: number;
  type: "mental_math" | "practice_paper" | "burst_mode";
  title: string;
  subtitle: string;
  started_at: string;
  completed_at: string | null;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  time_taken: number | null;
  points_earned: number;
  score?: number; // Score (correct answers)
  total_questions?: number; // Total questions
  // For mental math
  operation_type?: string;
  difficulty_mode?: string;
  // For practice paper
  paper_title?: string;
  paper_level?: string;
  paper_config?: any;
  generated_blocks?: any;
  seed?: number;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<PracticeSessionDetail | null>(null);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [paperAttempts, setPaperAttempts] = useState<PaperAttempt[]>([]);
  const [selectedPaperAttempt, setSelectedPaperAttempt] = useState<PaperAttempt | null>(null);
  const [selectedPaperAttemptDetail, setSelectedPaperAttemptDetail] = useState<PaperAttemptDetail | null>(null);
  const [loadingPaperDetail, setLoadingPaperDetail] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("overall");
  const [unifiedSessions, setUnifiedSessions] = useState<UnifiedSession[]>([]);
  const [reAttempting, setReAttempting] = useState<number | null>(null);
  const [attemptCounts, setAttemptCounts] = useState<{ [key: string]: { count: number; can_reattempt: boolean } }>({});
  const [showPointsLog, setShowPointsLog] = useState(false);
  const [pointsLogData, setPointsLogData] = useState<PointsSummaryResponse | null>(null);
  const [loadingPointsLog, setLoadingPointsLog] = useState(false);
  const [lbTab, setLbTab] = useState<"overall" | "weekly">("overall");

  // ─── Leaderboard queries ───────────────────────────────────────────────────
  const { data: overallLb = [], isLoading: lbOverallLoading, refetch: refetchOverallLb } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "overall"],
    queryFn: () => getOverallLeaderboard(50),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: weeklyLb = [], isLoading: lbWeeklyLoading, refetch: refetchWeeklyLb } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "weekly"],
    queryFn: () => getWeeklyLeaderboard(50),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ─── Combined Dashboard Query (replaces 5+ separate API calls) ────────────
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<StudentDashboardData>({
    queryKey: ["studentDashboard"],
    queryFn: getStudentDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh, no refetch
    refetchOnMount: false,     // Prevent duplicate fetch in React StrictMode
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Derive state from the combined query result
  useEffect(() => {
    if (!dashboardData) return;

    setStats(dashboardData.stats);

    // Process paper attempts
    const paperAttemptsData = dashboardData.paper_attempts || [];
    setPaperAttempts(paperAttemptsData);
    
    if (paperAttemptsData.length > 0) {
      // Load attempt counts for each unique paper in parallel
      const uniquePapers = new Map<string, { seed: number; title: string }>();
      paperAttemptsData.forEach(attempt => {
        if (attempt.seed !== undefined && attempt.seed !== null) {
          const key = `${attempt.seed}_${attempt.paper_title}`;
          if (!uniquePapers.has(key)) {
            uniquePapers.set(key, { seed: attempt.seed, title: attempt.paper_title });
          }
        }
      });
      
      if (uniquePapers.size > 0) {
        const countPromises = Array.from(uniquePapers.entries()).map(([key, paper]) =>
          (paper.seed !== undefined && paper.seed !== null)
            ? getPaperAttemptCount(paper.seed, paper.title)
                .then(countData => [key, { count: countData.count, can_reattempt: countData.can_reattempt }])
                .catch(err => {
                  console.error(`Failed to get attempt count for paper ${key}:`, err);
                  return [key, { count: 0, can_reattempt: false }];
                })
            : Promise.resolve(null)
        );
        
        Promise.all(countPromises).then(results => {
          const countsMap: { [key: string]: { count: number; can_reattempt: boolean } } = {};
          results.forEach(result => {
            if (result) {
              const [key, countData] = result as [string, { count: number; can_reattempt: boolean }];
              countsMap[key] = countData;
            }
          });
          setAttemptCounts(countsMap);
        });
      }
    }

    setLoading(false);
  }, [dashboardData]);

  // Handle loading state from React Query
  useEffect(() => {
    if (dashboardLoading) {
      setLoading(true);
    }
  }, [dashboardLoading]);

  const getOperationName = (op: string) => {
    const names: Record<string, string> = {
      add_sub: "Add/Subtract",
      multiplication: "Multiplication",
      division: "Division",
      decimal_multiplication: "Decimal Multiplication",
      decimal_division: "Decimal Division",
      integer_add_sub: "Integer Add/Subtract",
      lcm: "LCM",
      gcd: "GCD",
      square_root: "Square Root",
      cube_root: "Cube Root",
      percentage: "Percentage",
      burst_tables: "Tables",
      burst_multiplication: "Multiplication",
      burst_division: "Division",
      burst_decimal_multiplication: "Decimal ×",
      burst_decimal_division: "Decimal ÷",
      burst_lcm: "LCM",
      burst_gcd: "GCD",
      burst_square_root: "√ Root",
      burst_cube_root: "∛ Root",
      burst_percentage: "Percentage"
    };
    return names[op] || op;
  };

  // Derive unified sessions from stats and paperAttempts - NO API calls, just state transformation
  useEffect(() => {
    if (!stats && paperAttempts.length === 0) {
      // Don't process if we don't have data yet
      return;
    }
    
    const mentalMathSessions: UnifiedSession[] = (stats?.recent_sessions || []).map((session: any) => ({
      id: session.id,
      type: session.difficulty_mode === "burst_mode" ? "burst_mode" as const : "mental_math" as const,
      title: getOperationName(session.operation_type),
      subtitle: session.difficulty_mode === "burst_mode" ? "Burst Mode" : session.difficulty_mode,
      started_at: session.started_at,
      completed_at: session.completed_at || null,
      correct_answers: session.correct_answers,
      wrong_answers: session.wrong_answers,
      accuracy: session.accuracy,
      time_taken: session.time_taken,
      points_earned: session.points_earned,
      score: session.score || session.correct_answers, // Include score (fallback to correct_answers)
      total_questions: session.total_questions || (session.correct_answers + session.wrong_answers), // Include total
      operation_type: session.operation_type,
      difficulty_mode: session.difficulty_mode
    }));
  
    const practicePaperSessions: UnifiedSession[] = paperAttempts.map((attempt: PaperAttempt) => {
      return {
        id: attempt.id,
        type: "practice_paper",
        title: attempt.paper_title || "Practice Paper",
        subtitle: attempt.paper_level || "Custom",
        started_at: attempt.started_at,
        completed_at: attempt.completed_at || null,
        correct_answers: attempt.correct_answers || 0,
        wrong_answers: attempt.wrong_answers || 0,
        accuracy: attempt.accuracy || 0,
        time_taken: attempt.time_taken || null,
        points_earned: attempt.points_earned || 0,
        score: attempt.score || attempt.correct_answers || 0, // Include score
        total_questions: attempt.total_questions || (attempt.correct_answers || 0) + (attempt.wrong_answers || 0), // Include total
        paper_title: attempt.paper_title || "Practice Paper",
        paper_level: attempt.paper_level || "Custom",
        seed: attempt.seed // Include seed for attempt count checking
      };
    });
    
    // Combine and sort by started_at (most recent first)
    const combined = [...mentalMathSessions, ...practicePaperSessions].sort((a, b) => {
      const dateA = new Date(a.started_at).getTime();
      const dateB = new Date(b.started_at).getTime();
      if (isNaN(dateA) || isNaN(dateB)) {
        return 0;
      }
      return dateB - dateA;
    });
    
    // Deduplicate sessions - remove exact duplicates based on id, type, and key fields
    const seen = new Map<string, boolean>();
    const deduplicated = combined.filter((session) => {
      // Create unique key: type + id + started_at + completed_at
      const key = `${session.type}-${session.id}-${session.started_at}-${session.completed_at || 'null'}`;
      if (seen.has(key)) {
        return false; // Duplicate, skip
      }
      seen.set(key, true);
      return true;
    });
    
    setUnifiedSessions(deduplicated);
  }, [stats, paperAttempts]); // Only depends on data state, no API calls

  // Removed debug logging useEffect - it was causing unnecessary re-renders and console noise

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto pt-32 pb-20 px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`stats-skeleton-${index}`} className="h-32 rounded-[2.5rem]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`panel-skeleton-${index}`} className="h-48 rounded-[2.5rem]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-4">Failed to load dashboard</div>
          <p className="text-white mb-4">Please check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    // Parse the date string - backend sends UTC time
    const date = new Date(dateString);
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateString);
      return "Invalid date";
    }
    
    // Convert to IST (India Standard Time, UTC+5:30)
    // toLocaleString with timeZone is the most reliable way
    try {
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (error) {
      console.error("Error formatting date to IST:", error);
      // Fallback: manually add 5:30 hours (19800000 ms)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 hours in milliseconds
      const istDate = new Date(date.getTime() + istOffset);
      return istDate.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }
  };

  const formatTime = (seconds: number) => {
    // Ensure seconds is a valid number
    let timeInSeconds = Math.max(0, Number(seconds));
    
    // If value is suspiciously large, it might be stored incorrectly
    // Check if it's in milliseconds (typical session < 1 hour = 3600 seconds)
    // If > 3600 seconds (1 hour), and looks like milliseconds, convert
    // A reasonable session is < 3600 seconds (1 hour), so anything > 3600 might be ms
    if (timeInSeconds > 3600) {
      // If dividing by 1000 gives a more reasonable value (< 3600 seconds), it was in milliseconds
      const convertedValue = timeInSeconds / 1000;
      if (convertedValue < 3600 && convertedValue > 0) {
        console.warn("⚠️ [DASHBOARD] Time value appears to be in milliseconds, converting:", timeInSeconds, "→", convertedValue);
        timeInSeconds = convertedValue;
      } else if (timeInSeconds > 86400) {
        // If still very large after conversion check, force conversion anyway
        // This handles cases where session might be > 1 hour but was stored as ms
        console.warn("⚠️ [DASHBOARD] Time value extremely large, forcing conversion from milliseconds:", timeInSeconds);
        timeInSeconds = timeInSeconds / 1000;
      }
    }
    
    // Calculate minutes and seconds (no hours, just m and s)
    const totalSeconds = Math.floor(timeInSeconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    // Format: "Xm Ys" or just "Xs" if less than a minute
    if (mins === 0) {
      return `${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleViewSession = async (sessionId: number) => {
    try {
      const detail = await getPracticeSessionDetail(sessionId);
      setSelectedSession(detail);
    } catch (error) {
      console.error("Failed to load session details:", error);
      alert("Failed to load session details");
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
      return `${questionData.multiplicand || questionData.num1 || "?"} × ${questionData.multiplier || questionData.num2 || "?"} = ?`;
    } else if (operationType === "division") {
      return `${questionData.dividend || questionData.num1 || "?"} ÷ ${questionData.divisor || questionData.num2 || "?"} = ?`;
    } else if (operationType === "lcm") {
      return `LCM(${questionData.first || questionData.num1 || "?"}, ${questionData.second || questionData.num2 || "?"}) = ?`;
    } else if (operationType === "gcd") {
      return `GCD(${questionData.first || questionData.num1 || "?"}, ${questionData.second || questionData.num2 || "?"}) = ?`;
    } else if (operationType === "square_root") {
      return `√${questionData.number || "?"} = ?`;
    } else if (operationType === "cube_root") {
      return `∛${questionData.number || "?"} = ?`;
    } else if (operationType === "percentage") {
      return `${questionData.percentage || questionData.value || "?"}% of ${questionData.number || questionData.of || "?"} = ?`;
    } else if (operationType === "decimal_multiplication") {
      return `${questionData.multiplicand || "?"} × ${questionData.multiplier || "?"} = ?`;
    } else if (operationType === "decimal_division") {
      return `${questionData.dividend || "?"} ÷ ${questionData.divisor || "?"} = ?`;
    }
    return JSON.stringify(questionData);
  };

  const handleReAttempt = async (attemptId: number) => {
    try {
      setReAttempting(attemptId);
      // Get the paper attempt details
      const attemptDetail: PaperAttemptDetail = await getPaperAttempt(attemptId);
      
      // Check attempt count before allowing re-attempt
      const attemptCount = await getPaperAttemptCount(attemptDetail.seed, attemptDetail.paper_title);
      if (!attemptCount.can_reattempt) {
        alert("Maximum attempts reached. You can only attempt this paper twice (1 fresh attempt + 1 re-attempt).");
        setReAttempting(null);
        return;
      }
      
      // Prepare paper data for re-attempt
      const paperData = {
        config: attemptDetail.paper_config,
        blocks: attemptDetail.generated_blocks,
        seed: attemptDetail.seed
      };
      
      // Store in sessionStorage for PaperAttempt page
      sessionStorage.setItem("paperAttemptData", JSON.stringify(paperData));
      
      // Navigate to paper attempt page
      setLocation("/paper/attempt");
    } catch (error) {
      console.error("Failed to re-attempt paper:", error);
      alert("Failed to start re-attempt. Please try again.");
      setReAttempting(null);
    }
  };

  // Filter unified sessions based on selected filter
  const filteredSessions = unifiedSessions.filter(session => {
    if (sessionFilter === "overall") return true;
    if (sessionFilter === "mental_math") return session.type === "mental_math";
    if (sessionFilter === "practice_paper") return session.type === "practice_paper";
    if (sessionFilter === "burst_mode") return session.type === "burst_mode";
    return true;
  });

  const displaySessions = showAllSessions ? filteredSessions : filteredSessions.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2">
            Welcome Back, {user?.display_name || user?.name}!
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Track your progress and compete with others
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Points */}
          <div 
            className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group cursor-pointer"
            onClick={async () => {
              setShowPointsLog(true);
              setLoadingPointsLog(true);
              try {
                const data = await getPointsLogs(500, 0);
                setPointsLogData(data);
              } catch (error) {
                console.error("Failed to load points log:", error);
              } finally {
                setLoadingPointsLog(false);
              }
            }}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all duration-300">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Points</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats.total_points.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view log</div>
          </div>

          {/* Overall Accuracy */}
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all duration-300">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Overall Accuracy</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats.overall_accuracy.toFixed(1)}%</div>
          </div>

          {/* Total Questions */}
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all duration-300">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Questions</div>
            <div className="text-3xl font-black italic text-card-foreground">{(stats.total_questions || 0).toLocaleString()}</div>
          </div>

          {/* Total Sessions */}
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:border-primary transition-all group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all duration-300">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Practice Sessions</div>
            <div className="text-3xl font-black italic text-card-foreground">{stats.total_sessions}</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            {/* Recent Practice Sessions */}
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic text-card-foreground flex items-center gap-3">
                  <History className="w-8 h-8 text-primary" />
                  Recent Practice Sessions
                </h2>
                {/* Filter Buttons */}
                <div className="flex gap-2 bg-secondary/50 backdrop-blur-md p-1.5 rounded-full border border-border/50">
                  <button
                    onClick={() => setSessionFilter("overall")}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                      sessionFilter === "overall"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSessionFilter("mental_math")}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                      sessionFilter === "mental_math"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Mental Math
                  </button>
                  <button
                    onClick={() => setSessionFilter("practice_paper")}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                      sessionFilter === "practice_paper"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Practice Papers
                  </button>
                  <button
                    onClick={() => setSessionFilter("burst_mode")}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                      sessionFilter === "burst_mode"
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                        : "text-muted-foreground hover:text-amber-400"
                    }`}
                  >
                    ⚡ Burst Mode
                  </button>
                </div>
              </div>
              <div className="mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/20">
            <p className="text-sm text-primary font-bold">
              ℹ️ <strong>Note:</strong> Only your last 10 mental math practice sessions and 10 practice paper attempts are stored and displayed. Older sessions are automatically removed to optimize storage.
            </p>
          </div>
          {filteredSessions.length > 0 ? (
            <>
              <div className="space-y-4">
                {displaySessions.map((session) => (
                <div
                  key={`${session.type}-${session.id}`}
                  className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:border-primary transition-all cursor-pointer group"
                  onClick={() => {
                    if (session.type === "mental_math" || session.type === "burst_mode") {
                      setExpandedSession(expandedSession === session.id ? null : session.id);
                    } else {
                      setSelectedPaperAttempt(selectedPaperAttempt?.id === session.id ? null : paperAttempts.find(p => p.id === session.id) || null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-bold text-card-foreground text-lg">{session.title}</span>
                        <span className={session.type === "burst_mode" ? "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20" : session.type === "mental_math" ? "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full bg-primary/10 text-primary border border-primary/20" : "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full bg-accent text-accent-foreground border border-accent"}>
                          {session.subtitle}
                        </span>
                        <span className={session.type === "burst_mode" ? "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full bg-amber-500 text-white" : session.type === "mental_math" ? "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full bg-secondary text-secondary-foreground" : "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full bg-primary text-primary-foreground"}>
                          {session.type === "burst_mode" ? "⚡ Burst Mode" : session.type === "mental_math" ? "Mental Math" : "Practice Paper"}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm flex-wrap">
                        <span className="text-muted-foreground font-medium">
                          Score: <span className="font-bold text-primary">{session.score ?? session.correct_answers}</span>/{session.total_questions ?? (session.correct_answers + session.wrong_answers)}
                        </span>
                        <span className="text-muted-foreground font-medium">
                          Accuracy: <span className="font-bold text-primary">{session.accuracy.toFixed(1)}%</span>
                        </span>
                        {session.time_taken !== null && session.time_taken !== undefined && (
                          <span className="text-muted-foreground font-medium">
                            Duration: <span className="font-bold">{formatTime(session.time_taken)}</span>
                          </span>
                        )}
                        <span className="text-muted-foreground font-medium">
                          Points: <span className="font-bold text-primary">+{session.points_earned}</span>
                        </span>
                        <span className="text-muted-foreground font-medium">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {formatDateToIST(session.completed_at || session.started_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (session.type === "mental_math" || session.type === "burst_mode") {
                            handleViewSession(session.id);
                          } else {
                            const attemptId = session.id;
                            if (selectedPaperAttempt?.id === attemptId) {
                              setSelectedPaperAttempt(null);
                              setSelectedPaperAttemptDetail(null);
                            } else {
                              const attempt = paperAttempts.find(p => p.id === attemptId);
                              if (attempt) {
                                setSelectedPaperAttempt(attempt);
                                // Fetch full detail with all questions
                                setLoadingPaperDetail(true);
                                try {
                                  const detail = await getPaperAttempt(attemptId);
                                  setSelectedPaperAttemptDetail(detail);
                                } catch (error) {
                                  console.error("Failed to load paper attempt detail:", error);
                                  alert("Failed to load paper details");
                                } finally {
                                  setLoadingPaperDetail(false);
                                }
                              }
                            }
                          }
                        }}
                        className="group relative p-3 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg border border-primary/20 hover:border-primary/40"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300 group-hover:animate-pulse" />
                      </button>
                      {session.type === "practice_paper" && session.completed_at && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReAttempt(session.id);
                          }}
                          disabled={reAttempting === session.id || (session.seed !== undefined && session.seed !== null && attemptCounts[`${session.seed}_${session.paper_title}`]?.can_reattempt === false)}
                          className="group relative p-3 bg-accent/10 hover:bg-accent/20 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg border border-accent/20 hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          title={reAttempting === session.id ? "Starting..." : "Re-attempt"}
                        >
                          <RotateCcw className={`w-5 h-5 text-accent-foreground group-hover:scale-110 transition-transform duration-300 ${reAttempting === session.id ? "animate-spin" : "group-hover:rotate-180"}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>
              {filteredSessions.length > 5 && (
                <button
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="w-full group inline-flex items-center justify-center px-8 py-4 text-lg font-black uppercase tracking-widest text-primary-foreground bg-primary rounded-full shadow-2xl hover:scale-105 transition-all"
                >
                  {showAllSessions ? (
                    <>
                      <ChevronUp className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      Show All ({filteredSessions.length} sessions)
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p className="text-lg">No {sessionFilter === "overall" ? "" : sessionFilter === "mental_math" ? "mental math " : "practice paper "}practice sessions yet</p>
              <p className="text-sm mt-2">Start practicing to see your progress here!</p>
              <div className="flex gap-3 justify-center mt-4">
                {sessionFilter !== "practice_paper" && (
                  <Link href="/mental">
                    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-all shadow-lg">
                      Start Mental Math
                    </button>
                  </Link>
                )}
                {sessionFilter !== "mental_math" && (
                  <Link href="/create">
                    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-all shadow-lg">
                      Create Practice Paper
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
          </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-card-foreground mb-6">
              Quick Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">Total Questions</span>
                <span className="font-black text-card-foreground">{stats.total_questions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">Correct</span>
                <span className="font-black text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {stats.total_correct}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">Wrong</span>
                <span className="font-black text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {stats.total_wrong}
                </span>
              </div>

            </div>
          </div>

          {/* Practice Button */}
          <Link href="/mental">
            <button className="w-full group inline-flex items-center justify-center px-8 py-4 text-lg font-black uppercase tracking-widest text-primary-foreground bg-primary rounded-full shadow-2xl hover:scale-105 transition-all">
              <Zap className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Start Practice
            </button>
          </Link>

          {/* ─── Leaderboard ─────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
            {/* Header */}
            <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight text-card-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Leaderboard
              </h2>
              <div className="flex items-center gap-1.5">
                {/* Tab pills */}
                <div className="flex bg-background border border-border rounded-xl p-0.5 gap-0.5">
                  <button
                    onClick={() => setLbTab("overall")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      lbTab === "overall"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-card-foreground"
                    }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => setLbTab("weekly")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      lbTab === "weekly"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-card-foreground"
                    }`}
                  >
                    This Week
                  </button>
                </div>
                <button
                  onClick={() => lbTab === "overall" ? refetchOverallLb() : refetchWeeklyLb()}
                  className="p-1.5 rounded-lg border border-border hover:bg-primary/10 hover:border-primary transition-all"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Loading skeleton */}
            {(lbTab === "overall" ? lbOverallLoading : lbWeeklyLoading) ? (
              <div className="px-4 pb-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-background/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="pb-3 max-h-[22rem] overflow-y-auto scrollbar-premium">
                {(lbTab === "overall" ? overallLb : weeklyLb).map((entry, idx) => {
                  const pts = lbTab === "overall" ? entry.total_points : entry.weekly_points;
                  const isMe = entry.user_id === user?.id;
                  const initial = (entry.name || "?").charAt(0).toUpperCase();
                  const colours = ["bg-violet-500","bg-sky-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-pink-500","bg-indigo-500","bg-teal-500"];
                  const colIdx = entry.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colours.length;

                  return (
                    <div
                      key={entry.user_id}
                      className={`mx-3 my-0.5 px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all ${
                        isMe
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-primary/5"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-5 flex-shrink-0 text-center">
                        {idx === 0 ? <span className="text-base leading-none">🥇</span>
                          : idx === 1 ? <span className="text-base leading-none">🥈</span>
                          : idx === 2 ? <span className="text-base leading-none">🥉</span>
                          : <span className="text-xs font-black text-muted-foreground">{idx + 1}</span>}
                      </div>

                      {/* Avatar */}
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.name} className="w-7 h-7 rounded-full flex-shrink-0" />
                      ) : (
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${colours[colIdx]}`}>
                          {initial}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-xs font-bold truncate ${
                            isMe ? "text-primary" : "text-card-foreground"
                          }`}>
                            {entry.name}{isMe && " (you)"}
                          </span>
                          {entry.public_id && (
                            <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-primary/10 text-primary rounded flex-shrink-0">
                              {entry.public_id}
                            </span>
                          )}
                        </div>
                        {(entry.level || entry.course) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {entry.level && <span className="text-[9px] font-bold px-1 py-0.5 bg-violet-500/10 text-violet-500 rounded">{entry.level}</span>}
                            {entry.course && <span className="text-[9px] font-bold px-1 py-0.5 bg-sky-500/10 text-sky-500 rounded">{entry.course}</span>}
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-black ${
                          idx === 0 ? "text-amber-500" :
                          idx === 1 ? "text-slate-400" :
                          idx === 2 ? "text-orange-400" :
                          isMe ? "text-primary" : "text-card-foreground"
                        }`}>{pts.toLocaleString()}</div>
                        <div className="text-[9px] text-muted-foreground">pts</div>
                      </div>
                    </div>
                  );
                })}

                {(lbTab === "overall" ? overallLb : weeklyLb).length === 0 && (
                  <div className="px-6 py-10 text-center text-muted-foreground">
                    <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No rankings yet</p>
                    <p className="text-xs mt-1">Start practicing to appear here!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>





{/* Points Log Modal */}
      {showPointsLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPointsLog(false)}>
          <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic text-card-foreground mb-2">Points Transaction Log</h2>
                <p className="text-sm text-muted-foreground">
                  Complete history of all point transactions with checksum verification
                </p>
              </div>
              <button
                onClick={() => setShowPointsLog(false)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 scrollbar-premium">
              {loadingPointsLog ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading points log...</span>
                </div>
              ) : pointsLogData ? (
                <>
                  {/* Checksum Summary */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-2xl border border-primary/20">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">From Logs</div>
                        <div className="text-2xl font-black text-card-foreground">{pointsLogData.total_points_from_logs.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Current Total</div>
                        <div className="text-2xl font-black text-card-foreground">{pointsLogData.total_points_from_user.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Status</div>
                        <div className={`text-2xl font-black ${pointsLogData.match ? "text-emerald-500" : "text-red-500"}`}>
                          {pointsLogData.match ? "✓ Match" : "✕ Mismatch"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Points Log Entries */}
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-muted-foreground mb-4">
                      {pointsLogData.total_entries} total entries (showing {pointsLogData.logs.length})
                    </div>
                    {pointsLogData.logs.map((log: PointsLogEntry) => {
                      const meta = log.extra_data || {};
                      // source type label
                      const sourceLabel = log.source_type
                        .split("_")
                        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ");
                      return (
                      <div
                        key={log.id}
                        className={`p-4 rounded-xl border transition-all ${
                          log.points > 0
                            ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/50"
                            : "bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-700/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: description + badges */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-2">
                              <span className={`text-xl font-black tabular-nums flex-shrink-0 ${
                                log.points > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {log.points > 0 ? "+" : ""}{log.points.toLocaleString()}
                              </span>
                              <span className="text-sm font-semibold text-card-foreground leading-snug">{log.description}</span>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-0.5 bg-primary/10 rounded-lg text-primary font-semibold flex-shrink-0">
                                {sourceLabel}
                              </span>
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                {new Date(log.created_at).toLocaleString("en-IN", {
                                  timeZone: "Asia/Kolkata",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              {meta.operation_type && (
                                <span className="px-1.5 py-0.5 bg-background rounded border border-border">
                                  {String(meta.operation_type).replace(/_/g, " ")}
                                </span>
                              )}
                              {meta.difficulty_mode && (
                                <span className="px-1.5 py-0.5 bg-background rounded border border-border">
                                  {String(meta.difficulty_mode)}
                                </span>
                              )}
                              {meta.streak_days !== undefined && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20">
                                  🔥 {meta.streak_days}d streak
                                </span>
                              )}
                              {meta.correct_answers !== undefined && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20">
                                  ✓ {meta.correct_answers}/{meta.attempted_questions ?? meta.total_questions}
                                </span>
                              )}
                              {meta.paper_title && (
                                <span className="px-1.5 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded border border-sky-500/20 truncate max-w-[12rem]">
                                  📄 {String(meta.paper_title)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: balance after */}
                          {meta.balance_after !== undefined && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-muted-foreground">Balance</div>
                              <div className="text-sm font-black text-card-foreground tabular-nums">
                                {Number(meta.balance_after).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No points log data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Practice Session Details</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {getOperationName(selectedSession.operation_type)} • {selectedSession.difficulty_mode} • {formatDate(selectedSession.started_at)}
                </p>
                {selectedSession.completed_at && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Completed: {formatDateToIST(selectedSession.completed_at)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 scrollbar-premium">
              {/* Session Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700 transition-all duration-300">
                  <div className="text-sm text-indigo-600 dark:text-indigo-300 font-semibold">Score</div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">{selectedSession.score}/{selectedSession.total_questions}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-700 transition-all duration-300">
                  <div className="text-sm text-green-600 dark:text-green-300 font-semibold">Accuracy</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-200">{selectedSession.accuracy.toFixed(1)}%</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 transition-all duration-300">
                  <div className="text-sm text-blue-600 dark:text-blue-300 font-semibold">Time</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatTime(selectedSession.time_taken)}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700 transition-all duration-300">
                  <div className="text-sm text-purple-600 dark:text-purple-300 font-semibold">Points</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">+{selectedSession.points_earned}</div>
                </div>
              </div>

              {/* Questions List */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Questions & Answers</h3>
                <div className="space-y-3">
                  {selectedSession.attempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className={`rounded-lg p-4 border-2 transition-all duration-300 ${
                        attempt.is_correct
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-slate-700 dark:text-white">Q{attempt.question_number}:</span>
                            <span className="text-slate-900 dark:text-white font-mono text-lg">
                              {formatQuestion(attempt.question_data, selectedSession.operation_type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={attempt.is_correct ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                              Your answer: <span className="font-semibold">{attempt.user_answer !== null ? attempt.user_answer : "—"}</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              Correct: <span className="font-semibold">{attempt.correct_answer}</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              Time: <span className="font-semibold">{attempt.time_taken.toFixed(2)}s</span>
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {attempt.is_correct ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
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

      {/* Paper Attempt Detail Modal */}
      {selectedPaperAttempt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPaperAttempt(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Practice Paper Details</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {selectedPaperAttempt.paper_title} • {selectedPaperAttempt.paper_level} • {formatDate(selectedPaperAttempt.started_at)}
                </p>
                {selectedPaperAttempt.completed_at && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Completed: {formatDateToIST(selectedPaperAttempt.completed_at)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedPaperAttempt(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 scrollbar-premium">
              {/* Paper Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">Score</div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">{selectedPaperAttempt.score}/{selectedPaperAttempt.total_questions}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="text-sm text-green-600 dark:text-green-400 font-semibold">Accuracy</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-300">{selectedPaperAttempt.accuracy.toFixed(1)}%</div>
                </div>
                {selectedPaperAttempt.time_taken !== null && selectedPaperAttempt.time_taken !== undefined && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Time</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{formatTime(selectedPaperAttempt.time_taken)}</div>
                  </div>
                )}
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold">Points</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">+{selectedPaperAttempt.points_earned}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Results Summary</h3>
                {selectedPaperAttempt.completed_at && (() => {
                  // Only check re-attempt if seed is available
                  if (selectedPaperAttempt.seed === undefined || selectedPaperAttempt.seed === null) {
                    // If seed is missing, allow re-attempt (backward compatibility)
                    return (
                      <button
                        onClick={() => handleReAttempt(selectedPaperAttempt.id)}
                        disabled={reAttempting === selectedPaperAttempt.id}
                        className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className={`w-4 h-4 ${reAttempting === selectedPaperAttempt.id ? "animate-spin" : ""}`} />
                        {reAttempting === selectedPaperAttempt.id ? "Starting..." : "Re-attempt Paper"}
                      </button>
                    );
                  }
                  const paperKey = `${selectedPaperAttempt.seed}_${selectedPaperAttempt.paper_title}`;
                  const canReattempt = attemptCounts[paperKey]?.can_reattempt !== false;
                  return (
                    <button
                      onClick={() => handleReAttempt(selectedPaperAttempt.id)}
                      disabled={reAttempting === selectedPaperAttempt.id || !canReattempt}
                      className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!canReattempt ? "Maximum attempts reached (1 fresh + 1 re-attempt)" : ""}
                    >
                      <RotateCcw className={`w-4 h-4 ${reAttempting === selectedPaperAttempt.id ? "animate-spin" : ""}`} />
                      {reAttempting === selectedPaperAttempt.id ? "Starting..." : "Re-attempt Paper"}
                    </button>
                  );
                })()}
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Correct Answers</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedPaperAttempt.correct_answers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Wrong Answers</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{selectedPaperAttempt.wrong_answers}</div>
                  </div>
                </div>
              </div>

              {!selectedPaperAttempt.completed_at && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">This paper attempt is still in progress.</p>
                </div>
              )}

              {/* Questions List */}
              {loadingPaperDetail ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-slate-600 dark:text-slate-400">Loading questions...</span>
                </div>
              ) : selectedPaperAttemptDetail && selectedPaperAttemptDetail.generated_blocks ? (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">All Questions</h3>
                  <div className="space-y-4">
                    {selectedPaperAttemptDetail.generated_blocks.map((block: any, blockIdx: number) => (
                      <div key={blockIdx} className="mb-6">
                        {block.questions && block.questions.map((question: any) => {
                          const userAnswer = selectedPaperAttemptDetail.answers?.[String(question.id)] ?? selectedPaperAttemptDetail.answers?.[question.id];
                          const isCorrect = userAnswer !== null && userAnswer !== undefined && Math.abs(userAnswer - question.answer) < 0.01;
                          return (
                            <div
                              key={question.id}
                              className={`p-4 rounded-lg border-2 transition-all duration-300 mb-3 ${
                                isCorrect
                                  ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700"
                                  : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-semibold text-slate-700 dark:text-white">Q{question.id}:</span>
                                    <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className={isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                                      Your answer: <span className="font-semibold">
                                        {userAnswer !== null && userAnswer !== undefined ? userAnswer : "—"}
                                      </span>
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      Correct: <span className="font-semibold">{question.answer}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedPaperAttempt.completed_at ? (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">Click "View Details" again to load all questions.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

