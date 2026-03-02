import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { getStudentDashboardData, getPracticeSessionDetail, StudentStats, PracticeSessionDetail, getPointsLogs, PointsSummaryResponse, PointsLogEntry, StudentDashboardData, getOverallLeaderboard, getWeeklyLeaderboard, LeaderboardEntry, getMyCertificates, CertificateRecord } from "../lib/userApi";
import { PaperAttempt, getPaperAttempt, PaperAttemptDetail, getPaperAttemptCount } from "../lib/api";
import { Trophy, Target, Zap, CheckCircle2, XCircle, BarChart3, History, X, Eye, ChevronDown, ChevronUp, RotateCcw, Clock, Loader2, RefreshCw, Award, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDateToIST } from "../lib/timezoneUtils";
import MathQuestion from "../components/MathQuestion";

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

  // ─── Certificates Query ───────────────────────────────────────────────────
  const { data: certificates = [], isLoading: certificatesLoading } = useQuery<CertificateRecord[]>({
    queryKey: ["myCertificates"],
    queryFn: getMyCertificates,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
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
      <div style={{minHeight:"100vh",background:"#0c0e1a",paddingTop:"8rem",paddingBottom:"5rem",padding:"8rem 1.5rem 5rem"}}>
        <div style={{maxWidth:"1280px",margin:"0 auto"}}>
          <div style={{marginBottom:"2.5rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{height:"2.5rem",width:"18rem",background:"#1a1d30",borderRadius:"0.75rem",animation:"pulse 1.5s ease-in-out infinite"}} />
            <div style={{height:"1.25rem",width:"24rem",background:"#1a1d30",borderRadius:"0.75rem",animation:"pulse 1.5s ease-in-out infinite"}} />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1.5rem",marginBottom:"3rem"}}>
            {Array.from({length:4}).map((_,i)=>(
              <div key={`stats-skeleton-${i}`} style={{height:"9rem",background:"#131629",borderRadius:"1.5rem",animation:"pulse 1.5s ease-in-out infinite",animationDelay:`${i*0.1}s`}} />
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"8fr 4fr",gap:"2rem"}}>
            {Array.from({length:2}).map((_,i)=>(
              <div key={`panel-skeleton-${i}`} style={{height:"14rem",background:"#131629",borderRadius:"1.5rem",animation:"pulse 1.5s ease-in-out infinite",animationDelay:`${i*0.15}s`}} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{minHeight:"100vh",background:"#0c0e1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",padding:"2rem"}}>
          <div style={{width:"4rem",height:"4rem",background:"rgba(239,68,68,0.1)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",border:"2px solid rgba(239,68,68,0.3)"}}>
            <span style={{fontSize:"1.5rem"}}>⚠</span>
          </div>
          <div style={{fontSize:"1.25rem",color:"#f87171",fontWeight:800,marginBottom:"0.75rem",fontFamily:"'Playfair Display',Georgia,serif"}}>Failed to load dashboard</div>
          <p style={{color:"#94a3b8",marginBottom:"1.5rem",fontSize:"0.875rem"}}>Please check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{padding:"0.625rem 1.5rem",background:"#7c5af6",color:"#fff",border:"none",borderRadius:"0.75rem",fontWeight:700,cursor:"pointer",fontSize:"0.875rem"}}
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

  const DB = {
    bg: "#0c0e1a",
    surf: "#131629",
    surf2: "#181b2e",
    border: "rgba(255,255,255,0.07)",
    purple: "#7c5af6",
    purpleDim: "rgba(124,90,246,0.13)",
    gold: "#f59e0b",
    goldDim: "rgba(245,158,11,0.13)",
    green: "#22c55e",
    greenDim: "rgba(34,197,94,0.13)",
    burst: "#f97316",
    burstDim: "rgba(249,115,22,0.13)",
    teal: "#14b8a6",
    tealDim: "rgba(20,184,166,0.13)",
    text: "#e2e8f0",
    muted: "#64748b",
    font: "'Playfair Display',Georgia,serif",
  };

  return (
    <div style={{minHeight:"100vh",background:DB.bg,paddingTop:"8rem",paddingBottom:"5rem"}}>
      <style>{`
        @keyframes db-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes db-count-up{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        @keyframes db-pulse-ring{0%,100%{box-shadow:0 0 0 0 rgba(124,90,246,0.5)}50%{box-shadow:0 0 0 8px rgba(124,90,246,0)}}
        @keyframes db-slide-row{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes db-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .db-stat-card{transition:transform 0.2s,box-shadow 0.2s}
        .db-stat-card:hover{transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,0,0,0.5)}
        .db-sess-row{transition:background 0.15s,border-color 0.15s}
        .db-sess-row:hover{background:rgba(255,255,255,0.04)!important;border-color:rgba(124,90,246,0.35)!important}
        .db-scrollbar::-webkit-scrollbar{width:4px}
        .db-scrollbar::-webkit-scrollbar-track{background:transparent}
        .db-scrollbar::-webkit-scrollbar-thumb{background:rgba(124,90,246,0.4);border-radius:2px}
        .db-btn-icon{transition:transform 0.15s,background 0.15s}
        .db-btn-icon:hover{transform:scale(1.12)}
      `}</style>
      <div style={{maxWidth:"1280px",margin:"0 auto",padding:"0 1.5rem"}}>
        {/* Page Header */}
        <header style={{marginBottom:"3rem",animation:"db-fade-up 0.5s ease both"}}>
          <h1 style={{fontFamily:DB.font,fontSize:"clamp(2rem,4vw,3.25rem)",fontWeight:900,color:DB.text,marginBottom:"0.5rem",lineHeight:1.1}}>
            Welcome Back,{" "}
            <span style={{background:"linear-gradient(120deg,#7c5af6,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              {user?.display_name || user?.name}
            </span>!
          </h1>
          <p style={{color:DB.muted,fontSize:"1rem",fontWeight:500,marginBottom:"1rem"}}>
            Track your progress and compete with others
          </p>
          <div>
            <Link href="/attendance">
              <span style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",fontSize:"0.8125rem",fontWeight:700,color:DB.purple,background:DB.purpleDim,padding:"0.5rem 1rem",borderRadius:"9999px",cursor:"pointer",border:`1px solid rgba(124,90,246,0.25)`,transition:"background 0.15s"}}>
                <Calendar style={{width:"0.875rem",height:"0.875rem"}} /> My Attendance
              </span>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1.5rem",marginBottom:"3rem"}}>
          {/* Total Points */}
          <div
            className="db-stat-card"
            style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"1.75rem",cursor:"pointer",position:"relative",overflow:"hidden",animation:"db-fade-up 0.5s ease 0.05s both",borderTop:`3px solid ${DB.gold}`}}
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
            <div style={{width:"2.5rem",height:"2.5rem",background:DB.goldDim,borderRadius:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.25rem",border:`1px solid rgba(245,158,11,0.25)`}}>
              <Trophy style={{width:"1.25rem",height:"1.25rem",color:DB.gold}} />
            </div>
            <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>Total Points</div>
            <div style={{fontSize:"1.75rem",fontWeight:900,color:DB.gold,fontFamily:DB.font,animation:"db-count-up 0.5s ease 0.1s both"}}>{stats.total_points.toLocaleString()}</div>
            <div style={{fontSize:"0.7rem",color:DB.muted,marginTop:"0.5rem"}}>Click to view log</div>
          </div>

          {/* Overall Accuracy */}
          <div className="db-stat-card" style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"1.75rem",position:"relative",overflow:"hidden",animation:"db-fade-up 0.5s ease 0.1s both",borderTop:`3px solid ${DB.purple}`}}>
            <div style={{width:"2.5rem",height:"2.5rem",background:DB.purpleDim,borderRadius:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.25rem",border:`1px solid rgba(124,90,246,0.25)`}}>
              <Target style={{width:"1.25rem",height:"1.25rem",color:DB.purple}} />
            </div>
            <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>Overall Accuracy</div>
            <div style={{fontSize:"1.75rem",fontWeight:900,color:DB.purple,fontFamily:DB.font,animation:"db-count-up 0.5s ease 0.15s both"}}>{stats.overall_accuracy.toFixed(1)}%</div>
          </div>

          {/* Total Questions */}
          <div className="db-stat-card" style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"1.75rem",position:"relative",overflow:"hidden",animation:"db-fade-up 0.5s ease 0.15s both",borderTop:`3px solid ${DB.teal}`}}>
            <div style={{width:"2.5rem",height:"2.5rem",background:DB.tealDim,borderRadius:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.25rem",border:`1px solid rgba(20,184,166,0.25)`}}>
              <Zap style={{width:"1.25rem",height:"1.25rem",color:DB.teal}} />
            </div>
            <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>Total Questions</div>
            <div style={{fontSize:"1.75rem",fontWeight:900,color:DB.teal,fontFamily:DB.font,animation:"db-count-up 0.5s ease 0.2s both"}}>{(stats.total_questions || 0).toLocaleString()}</div>
          </div>

          {/* Total Sessions */}
          <div className="db-stat-card" style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"1.75rem",position:"relative",overflow:"hidden",animation:"db-fade-up 0.5s ease 0.2s both",borderTop:`3px solid ${DB.green}`}}>
            <div style={{width:"2.5rem",height:"2.5rem",background:DB.greenDim,borderRadius:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.25rem",border:`1px solid rgba(34,197,94,0.25)`}}>
              <BarChart3 style={{width:"1.25rem",height:"1.25rem",color:DB.green}} />
            </div>
            <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>Practice Sessions</div>
            <div style={{fontSize:"1.75rem",fontWeight:900,color:DB.green,fontFamily:DB.font,animation:"db-count-up 0.5s ease 0.25s both"}}>{stats.total_sessions}</div>
          </div>
        </div>

        {/* Content Grid */}
        <div style={{display:"grid",gridTemplateColumns:"8fr 4fr",gap:"2rem"}}>
          {/* Main Content */}
          <div style={{display:"flex",flexDirection:"column",gap:"2rem"}}>
            {/* Recent Practice Sessions */}
            <div style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"2rem",animation:"db-fade-up 0.5s ease 0.25s both"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
                <h2 style={{fontFamily:DB.font,fontSize:"1.5rem",fontWeight:900,color:DB.text,display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <History style={{width:"1.5rem",height:"1.5rem",color:DB.purple}} />
                  Recent Practice Sessions
                </h2>
                {/* Filter Buttons */}
                <div style={{display:"flex",gap:"0.25rem",background:"rgba(255,255,255,0.04)",padding:"0.25rem",borderRadius:"9999px",border:`1px solid ${DB.border}`}}>
                  {([
                    {key:"overall",label:"All",color:DB.purple},
                    {key:"mental_math",label:"Mental Math",color:DB.purple},
                    {key:"practice_paper",label:"Papers",color:DB.teal},
                    {key:"burst_mode",label:"⚡ Burst",color:DB.burst},
                  ] as const).map(({key,label,color})=>(
                    <button
                      key={key}
                      onClick={() => setSessionFilter(key)}
                      style={{padding:"0.375rem 0.875rem",borderRadius:"9999px",fontSize:"0.75rem",fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.15s",background:sessionFilter===key?color:"transparent",color:sessionFilter===key?"#fff":DB.muted}}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:"1.5rem",padding:"0.875rem 1rem",background:DB.purpleDim,borderRadius:"0.875rem",border:`1px solid rgba(124,90,246,0.2)`}}>
                <p style={{fontSize:"0.8rem",color:DB.purple,fontWeight:600}}>
                  <strong>Note:</strong> Only your last 10 mental math practice sessions and 10 practice paper attempts are stored. Older sessions are automatically removed to optimize storage.
                </p>
              </div>
          {filteredSessions.length > 0 ? (
            <>
              <div style={{display:"flex",flexDirection:"column",gap:"0.625rem"}}>
                {displaySessions.map((session,rowIdx) => {
                  const typeColor = session.type==="burst_mode"?DB.burst:session.type==="mental_math"?DB.purple:DB.teal;
                  const typeBadge = session.type==="burst_mode"?"⚡ Burst Mode":session.type==="mental_math"?"Mental Math":"Practice Paper";
                  return (
                  <div
                    key={`${session.type}-${session.id}`}
                    className="db-sess-row"
                    style={{background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"1rem",padding:"1rem 1.25rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"1rem",animation:`db-slide-row 0.3s ease ${rowIdx*0.05}s both`,borderLeft:`3px solid ${typeColor}`}}
                    onClick={() => {
                      if (session.type === "mental_math" || session.type === "burst_mode") {
                        setExpandedSession(expandedSession === session.id ? null : session.id);
                      } else {
                        setSelectedPaperAttempt(selectedPaperAttempt?.id === session.id ? null : paperAttempts.find(p => p.id === session.id) || null);
                      }
                    }}
                  >
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.375rem",flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:DB.text,fontSize:"0.9rem",whiteSpace:"nowrap"}}>{session.title}</span>
                        <span style={{padding:"0.2rem 0.625rem",fontSize:"0.65rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.05em",borderRadius:"9999px",background:`rgba(${session.type==="burst_mode"?"249,115,22":session.type==="mental_math"?"124,90,246":"20,184,166"},0.15)`,color:typeColor,border:`1px solid ${typeColor}40`}}>
                          {session.subtitle}
                        </span>
                        <span style={{padding:"0.2rem 0.625rem",fontSize:"0.65rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.05em",borderRadius:"9999px",background:typeColor,color:"#fff"}}>
                          {typeBadge}
                        </span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"1rem",fontSize:"0.8rem",flexWrap:"wrap"}}>
                        <span style={{color:DB.muted}}>Score: <strong style={{color:typeColor}}>{session.score ?? session.correct_answers}</strong>/{session.total_questions ?? (session.correct_answers + session.wrong_answers)}</span>
                        <span style={{color:DB.muted}}>Accuracy: <strong style={{color:typeColor}}>{session.accuracy.toFixed(1)}%</strong></span>
                        {session.time_taken !== null && session.time_taken !== undefined && (
                          <span style={{color:DB.muted}}>Duration: <strong style={{color:DB.text}}>{formatTime(session.time_taken)}</strong></span>
                        )}
                        <span style={{color:DB.muted}}>Points: <strong style={{color:DB.gold}}>+{session.points_earned}</strong></span>
                        <span style={{color:DB.muted,display:"flex",alignItems:"center",gap:"0.25rem"}}>
                          <Clock style={{width:"0.75rem",height:"0.75rem"}} />
                          {formatDateToIST(session.completed_at || session.started_at)}
                        </span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexShrink:0}}>
                      <button
                        className="db-btn-icon"
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
                        style={{padding:"0.5rem",background:DB.purpleDim,border:`1px solid rgba(124,90,246,0.25)`,borderRadius:"0.625rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
                        title="View Details"
                      >
                        <Eye style={{width:"1rem",height:"1rem",color:DB.purple}} />
                      </button>
                      {session.type === "practice_paper" && session.completed_at && (
                        <button
                          className="db-btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReAttempt(session.id);
                          }}
                          disabled={reAttempting === session.id || (session.seed !== undefined && session.seed !== null && attemptCounts[`${session.seed}_${session.paper_title}`]?.can_reattempt === false)}
                          style={{padding:"0.5rem",background:DB.tealDim,border:`1px solid rgba(20,184,166,0.25)`,borderRadius:"0.625rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:reAttempting===session.id?0.5:1}}
                          title={reAttempting === session.id ? "Starting..." : "Re-attempt"}
                        >
                          <RotateCcw style={{width:"1rem",height:"1rem",color:DB.teal}} className={reAttempting === session.id ? "animate-spin" : ""} />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              {filteredSessions.length > 5 && (
                <button
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  style={{width:"100%",marginTop:"1rem",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",padding:"0.875rem",fontSize:"0.875rem",fontWeight:700,color:DB.purple,background:DB.purpleDim,border:`1px solid rgba(124,90,246,0.25)`,borderRadius:"0.875rem",cursor:"pointer",transition:"all 0.15s"}}
                >
                  {showAllSessions ? (
                    <><ChevronUp style={{width:"1rem",height:"1rem"}} />Show Less</>
                  ) : (
                    <><ChevronDown style={{width:"1rem",height:"1rem"}} />Show All ({filteredSessions.length} sessions)</>
                  )}
                </button>
              )}
            </>
          ) : (
            <div style={{textAlign:"center",padding:"3rem 1rem"}}>
              <div style={{width:"3.5rem",height:"3.5rem",background:DB.purpleDim,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",animation:"db-float 3s ease-in-out infinite"}}>
                <History style={{width:"1.5rem",height:"1.5rem",color:DB.purple}} />
              </div>
              <p style={{fontSize:"1rem",fontWeight:700,color:DB.text,marginBottom:"0.25rem"}}>No {sessionFilter === "overall" ? "" : sessionFilter === "mental_math" ? "mental math " : "practice paper "}sessions yet</p>
              <p style={{fontSize:"0.8rem",color:DB.muted,marginBottom:"1rem"}}>Start practicing to see your progress here!</p>
              <div style={{display:"flex",gap:"0.75rem",justifyContent:"center"}}>
                {sessionFilter !== "practice_paper" && (
                  <Link href="/mental">
                    <button style={{padding:"0.625rem 1.25rem",background:DB.purple,color:"#fff",border:"none",borderRadius:"0.75rem",fontWeight:700,cursor:"pointer",fontSize:"0.875rem"}}>Start Mental Math</button>
                  </Link>
                )}
                {sessionFilter !== "mental_math" && (
                  <Link href="/create">
                    <button style={{padding:"0.625rem 1.25rem",background:DB.teal,color:"#fff",border:"none",borderRadius:"0.75rem",fontWeight:700,cursor:"pointer",fontSize:"0.875rem"}}>Create Practice Paper</button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
          </div>

        {/* Sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          {/* Quick Stats */}
          <div style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"1.75rem",animation:"db-fade-up 0.5s ease 0.3s both"}}>
            <h2 style={{fontFamily:DB.font,fontSize:"1.125rem",fontWeight:900,color:DB.text,marginBottom:"1.25rem"}}>Quick Stats</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"0.875rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.8rem",fontWeight:700,color:DB.muted}}>Total Questions</span>
                <span style={{fontWeight:900,color:DB.text}}>{stats.total_questions}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.8rem",fontWeight:700,color:DB.muted}}>Correct</span>
                <span style={{fontWeight:900,color:DB.green,display:"flex",alignItems:"center",gap:"0.25rem"}}>
                  <CheckCircle2 style={{width:"0.875rem",height:"0.875rem"}} />{stats.total_correct}
                </span>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.8rem",fontWeight:700,color:DB.muted}}>Wrong</span>
                <span style={{fontWeight:900,color:"#f87171",display:"flex",alignItems:"center",gap:"0.25rem"}}>
                  <XCircle style={{width:"0.875rem",height:"0.875rem"}} />{stats.total_wrong}
                </span>
              </div>
            </div>
          </div>

          {/* Practice Button */}
          <Link href="/mental">
            <button
              className="db-btn-icon"
              style={{width:"100%",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",padding:"1rem",fontSize:"0.9375rem",fontWeight:900,color:"#fff",background:"linear-gradient(135deg,#7c5af6,#a78bfa)",border:"none",borderRadius:"1rem",cursor:"pointer",letterSpacing:"0.05em",textTransform:"uppercase",animation:"db-pulse-ring 2.5s ease-in-out infinite"}}
            >
              <Zap style={{width:"1.125rem",height:"1.125rem"}} />
              Start Practice
            </button>
          </Link>

          {/* ─── Leaderboard ─────────────────────────────────────────────── */}
          <div style={{background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",overflow:"hidden",animation:"db-fade-up 0.5s ease 0.35s both"}}>
            {/* Header */}
            <div style={{padding:"1.25rem 1.5rem 0",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <h2 style={{fontFamily:DB.font,fontSize:"1rem",fontWeight:900,color:DB.text,display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <Trophy style={{width:"1rem",height:"1rem",color:DB.gold}} />
                Leaderboard
              </h2>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:`1px solid ${DB.border}`,borderRadius:"0.625rem",padding:"0.2rem",gap:"0.15rem"}}>
                  <button
                    onClick={() => setLbTab("overall")}
                    style={{padding:"0.25rem 0.625rem",borderRadius:"0.4rem",fontSize:"0.7rem",fontWeight:700,border:"none",cursor:"pointer",background:lbTab==="overall"?DB.purple:"transparent",color:lbTab==="overall"?"#fff":DB.muted,transition:"all 0.15s"}}
                  >Overall</button>
                  <button
                    onClick={() => setLbTab("weekly")}
                    style={{padding:"0.25rem 0.625rem",borderRadius:"0.4rem",fontSize:"0.7rem",fontWeight:700,border:"none",cursor:"pointer",background:lbTab==="weekly"?DB.purple:"transparent",color:lbTab==="weekly"?"#fff":DB.muted,transition:"all 0.15s"}}
                  >This Week</button>
                </div>
                <button
                  onClick={() => lbTab === "overall" ? refetchOverallLb() : refetchWeeklyLb()}
                  style={{padding:"0.35rem",borderRadius:"0.5rem",border:`1px solid ${DB.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
                  title="Refresh"
                >
                  <RefreshCw style={{width:"0.8rem",height:"0.8rem",color:DB.muted}} />
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
              <div className="db-scrollbar" style={{paddingBottom:"0.75rem",maxHeight:"22rem",overflowY:"auto"}}>
                {(lbTab === "overall" ? overallLb : weeklyLb).map((entry, idx) => {
                  const pts = lbTab === "overall" ? entry.total_points : entry.weekly_points;
                  const isMe = entry.user_id === user?.id;
                  const initial = (entry.name || "?").charAt(0).toUpperCase();
                  const avatarColors = ["#7c5af6","#14b8a6","#22c55e","#f59e0b","#f87171","#ec4899","#6366f1","#0ea5e9"];
                  const colIdx = entry.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length;
                  const medalText = idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":null;
                  const rankColor = idx===0?DB.gold:idx===1?"#94a3b8":idx===2?"#fb923c":DB.muted;

                  return (
                    <div
                      key={entry.user_id}
                      style={{margin:"0 0.75rem 0.25rem",padding:"0.625rem",borderRadius:"0.75rem",display:"flex",alignItems:"center",gap:"0.625rem",background:isMe?DB.purpleDim:"transparent",border:isMe?`1px solid rgba(124,90,246,0.3)`:`1px solid transparent`,transition:"all 0.15s"}}
                    >
                      {/* Rank */}
                      <div style={{width:"1.25rem",flexShrink:0,textAlign:"center"}}>
                        {medalText
                          ? <span style={{fontSize:"0.9rem",lineHeight:1}}>{medalText}</span>
                          : <span style={{fontSize:"0.7rem",fontWeight:900,color:DB.muted}}>{idx + 1}</span>}
                      </div>

                      {/* Avatar */}
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.name} style={{width:"1.75rem",height:"1.75rem",borderRadius:"50%",flexShrink:0,border:idx<3?`2px solid ${rankColor}`:"2px solid transparent"}} />
                      ) : (
                        <div style={{width:"1.75rem",height:"1.75rem",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.7rem",fontWeight:700,background:avatarColors[colIdx],border:idx<3?`2px solid ${rankColor}`:"none"}}>
                          {initial}
                        </div>
                      )}

                      {/* Info */}
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.25rem",flexWrap:"wrap"}}>
                          <span style={{fontSize:"0.75rem",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:isMe?DB.purple:DB.text}}>
                            {entry.name}{isMe && " (you)"}
                          </span>
                          {entry.public_id && (
                            <span style={{fontSize:"0.6rem",fontFamily:"monospace",fontWeight:700,padding:"0.1rem 0.3rem",background:DB.purpleDim,color:DB.purple,borderRadius:"0.25rem",flexShrink:0}}>
                              {entry.public_id}
                            </span>
                          )}
                        </div>
                        {(entry.level || entry.course) && (
                          <div style={{display:"flex",alignItems:"center",gap:"0.25rem",marginTop:"0.15rem"}}>
                            {entry.level && <span style={{fontSize:"0.6rem",fontWeight:700,padding:"0.1rem 0.3rem",background:"rgba(124,90,246,0.13)",color:DB.purple,borderRadius:"0.25rem"}}>{entry.level}</span>}
                            {entry.course && <span style={{fontSize:"0.6rem",fontWeight:700,padding:"0.1rem 0.3rem",background:"rgba(14,165,233,0.13)",color:"#38bdf8",borderRadius:"0.25rem"}}>{entry.course}</span>}
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:"0.8rem",fontWeight:900,color:idx===0?DB.gold:idx===1?"#94a3b8":idx===2?"#fb923c":isMe?DB.purple:DB.text}}>{pts.toLocaleString()}</div>
                        <div style={{fontSize:"0.6rem",color:DB.muted}}>pts</div>
                      </div>
                    </div>
                  );
                })}

                {(lbTab === "overall" ? overallLb : weeklyLb).length === 0 && (
                  <div style={{padding:"2.5rem 1.5rem",textAlign:"center"}}>
                    <Trophy style={{width:"2rem",height:"2rem",margin:"0 auto 0.5rem",color:DB.muted,opacity:0.3}} />
                    <p style={{fontSize:"0.8rem",fontWeight:600,color:DB.muted}}>No rankings yet</p>
                    <p style={{fontSize:"0.7rem",color:DB.muted,marginTop:"0.25rem"}}>Start practicing to appear here!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* MY CERTIFICATES */}
        <div style={{marginTop:"2.5rem",background:DB.surf,border:`1px solid ${DB.border}`,borderRadius:"1.5rem",padding:"2rem",animation:"db-fade-up 0.5s ease 0.4s both"}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem"}}>
            <h2 style={{fontFamily:DB.font,fontSize:"1.5rem",fontWeight:900,color:DB.text,display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <div style={{width:"2.75rem",height:"2.75rem",background:DB.goldDim,border:`1px solid rgba(245,158,11,0.25)`,borderRadius:"0.875rem",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Award style={{width:"1.25rem",height:"1.25rem",color:DB.gold}} />
              </div>
              My Certificates
            </h2>
            {certificatesLoading && (
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.8rem",color:DB.muted}}>
                <Loader2 style={{width:"1rem",height:"1rem",animation:"spin 1s linear infinite"}} />
                Loading…
              </div>
            )}
          </div>

          {certificates.length > 0 ? (
            <div style={{overflowX:"auto",margin:"0 -0.5rem"}}>
              <table style={{width:"100%",minWidth:"520px",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${DB.border}`}}>
                    <th style={{padding:"0 0.5rem 1rem",textAlign:"left",width:"3.5rem"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted}}>S.No.</span>
                    </th>
                    <th style={{padding:"0 1rem 1rem",textAlign:"left"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted}}>Certificate Name</span>
                    </th>
                    <th style={{padding:"0 1rem 1rem",textAlign:"left",width:"9rem"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted}}>Marks</span>
                    </th>
                    <th style={{padding:"0 1rem 1rem",textAlign:"left",width:"11rem"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted}}>Date of Issue</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert, idx) => (
                    <tr
                      key={cert.id}
                      style={{borderBottom:`1px solid rgba(255,255,255,0.05)`,transition:"background 0.15s"}}
                      onMouseOver={e=>(e.currentTarget.style.background=DB.purpleDim)}
                      onMouseOut={e=>(e.currentTarget.style.background="transparent")}
                    >
                      {/* S.No */}
                      <td style={{padding:"1.25rem 0.5rem"}}>
                        <div style={{width:"2rem",height:"2rem",borderRadius:"50%",background:DB.purpleDim,border:`1px solid rgba(124,90,246,0.2)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:"0.75rem",fontWeight:900,color:DB.purple}}>{idx + 1}</span>
                        </div>
                      </td>

                      {/* Certificate Name */}
                      <td style={{padding:"1.25rem 1rem"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                          <div style={{width:"2.25rem",height:"2.25rem",borderRadius:"0.625rem",background:DB.goldDim,border:`1px solid rgba(245,158,11,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <Award style={{width:"1.125rem",height:"1.125rem",color:DB.gold}} />
                          </div>
                          <div>
                            <div style={{fontWeight:700,color:DB.text,fontSize:"0.875rem"}}>{cert.title}</div>
                            {cert.description && (
                              <div style={{fontSize:"0.75rem",color:DB.muted,marginTop:"0.125rem",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical"}}>{cert.description}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Marks */}
                      <td style={{padding:"1.25rem 1rem"}}>
                        {cert.marks !== null && cert.marks !== undefined ? (
                          <span style={{display:"inline-flex",alignItems:"center",padding:"0.25rem 0.75rem",borderRadius:"9999px",fontSize:"0.875rem",fontWeight:900,background:DB.goldDim,color:DB.gold,border:`1px solid rgba(245,158,11,0.2)`}}>
                            {cert.marks}
                          </span>
                        ) : (
                          <span style={{color:DB.muted,fontSize:"0.875rem",fontWeight:500}}>—</span>
                        )}
                      </td>

                      {/* Date of Issue */}
                      <td style={{padding:"1.25rem 1rem"}}>
                        <span style={{fontSize:"0.875rem",fontWeight:500,color:DB.text}}>
                          {new Date(cert.date_issued).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : certificatesLoading ? (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",padding:"0.5rem 0"}}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{height:"4rem",background:DB.surf2,borderRadius:"1rem",animation:"pulse 1.5s ease-in-out infinite"}} />
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"3.5rem 1rem"}}>
              <div style={{width:"5rem",height:"5rem",background:DB.goldDim,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.25rem",border:`2px dashed rgba(245,158,11,0.25)`,animation:"db-float 3s ease-in-out infinite"}}>
                <Award style={{width:"2.25rem",height:"2.25rem",color:DB.gold,opacity:0.4}} />
              </div>
              <p style={{fontWeight:700,color:DB.text,fontSize:"1rem",marginBottom:"0.375rem"}}>No certificates yet</p>
              <p style={{fontSize:"0.8rem",color:DB.muted}}>Complete your levels to earn certificates</p>
            </div>
          )}
        </div>

    </div>

{/* Points Log Modal */}
      {showPointsLog && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={() => setShowPointsLog(false)}>
          <div style={{background:DB.surf,border:`1px solid ${DB.border}`,borderTop:`3px solid ${DB.purple}`,borderRadius:"1.5rem",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",maxWidth:"56rem",width:"100%",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={(e) => e.stopPropagation()}>
            <div style={{padding:"1.5rem",borderBottom:`1px solid ${DB.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h2 style={{fontFamily:DB.font,fontSize:"1.5rem",fontWeight:900,color:DB.text,marginBottom:"0.375rem"}}>Points Transaction Log</h2>
                <p style={{fontSize:"0.8rem",color:DB.muted}}>
                  Complete history of all point transactions with checksum verification
                </p>
              </div>
              <button
                onClick={() => setShowPointsLog(false)}
                style={{padding:"0.5rem",background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
              >
                <X style={{width:"1.25rem",height:"1.25rem",color:DB.muted}} />
              </button>
            </div>
            
            <div className="db-scrollbar" style={{padding:"1.5rem",overflowY:"auto",flex:1}}>
              {loadingPointsLog ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem"}}>
                  <Loader2 style={{width:"2rem",height:"2rem",animation:"spin 1s linear infinite",color:DB.purple}} />
                  <span style={{marginLeft:"0.75rem",color:DB.muted}}>Loading points log...</span>
                </div>
              ) : pointsLogData ? (
                <>
                  {/* Checksum Summary */}
                  <div style={{marginBottom:"1.5rem",padding:"1rem",background:DB.purpleDim,borderRadius:"1rem",border:`1px solid rgba(124,90,246,0.2)`}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",textAlign:"center"}}>
                      <div>
                        <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>From Logs</div>
                        <div style={{fontSize:"1.5rem",fontWeight:900,color:DB.text}}>{pointsLogData.total_points_from_logs.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>Current Total</div>
                        <div style={{fontSize:"1.5rem",fontWeight:900,color:DB.text}}>{pointsLogData.total_points_from_user.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{fontSize:"0.65rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:DB.muted,marginBottom:"0.375rem"}}>Status</div>
                        <div style={{fontSize:"1.5rem",fontWeight:900,color:pointsLogData.match?DB.green:"#f87171"}}>
                          {pointsLogData.match ? "✓ Match" : "✕ Mismatch"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Points Log Entries */}
                  <div style={{display:"flex",flexDirection:"column",gap:"0.625rem"}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:DB.muted,marginBottom:"0.75rem"}}>
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
                        style={{padding:"1rem",borderRadius:"0.75rem",border:`1px solid ${log.points >= 0 ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.2)"}`,background:log.points >= 0 ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.06)",animation:"db-slide-row 0.3s ease both"}}
                      >
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"1rem"}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:"0.75rem",marginBottom:"0.5rem"}}>
                              <span style={{fontSize:"1.1rem",fontWeight:900,fontVariantNumeric:"tabular-nums",flexShrink:0,color:log.points >= 0 ? DB.green : "#f87171"}}>
                                {log.points >= 0 ? "+" : ""}{(log.points ?? 0).toLocaleString()}
                              </span>
                              <span style={{fontSize:"0.8rem",fontWeight:600,color:DB.text,lineHeight:1.4}}>{log.description}</span>
                            </div>
                            <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"0.5rem",fontSize:"0.7rem",color:DB.muted}}>
                              <span style={{padding:"0.15rem 0.5rem",background:DB.purpleDim,borderRadius:"0.375rem",color:DB.purple,fontWeight:600,flexShrink:0}}>
                                {sourceLabel}
                              </span>
                              <span style={{display:"flex",alignItems:"center",gap:"0.25rem",flexShrink:0}}>
                                <Clock style={{width:"0.7rem",height:"0.7rem"}} />
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
                                <span style={{padding:"0.15rem 0.5rem",background:DB.surf2,borderRadius:"0.25rem",border:`1px solid ${DB.border}`}}>
                                  {String(meta.operation_type).replace(/_/g, " ")}
                                </span>
                              )}
                              {meta.difficulty_mode && (
                                <span style={{padding:"0.15rem 0.5rem",background:DB.surf2,borderRadius:"0.25rem",border:`1px solid ${DB.border}`}}>
                                  {String(meta.difficulty_mode)}
                                </span>
                              )}
                              {meta.streak_days !== undefined && (
                                <span style={{padding:"0.15rem 0.5rem",background:"rgba(245,158,11,0.1)",color:DB.gold,borderRadius:"0.25rem",border:`1px solid rgba(245,158,11,0.2)`}}>
                                  🔥 {meta.streak_days}d streak
                                </span>
                              )}
                              {meta.correct_answers !== undefined && (
                                <span style={{padding:"0.15rem 0.5rem",background:DB.greenDim,color:DB.green,borderRadius:"0.25rem",border:`1px solid rgba(34,197,94,0.2)`}}>
                                  ✓ {meta.correct_answers}/{meta.attempted_questions ?? meta.total_questions}
                                </span>
                              )}
                              {meta.paper_title && (
                                <span style={{padding:"0.15rem 0.5rem",background:"rgba(14,165,233,0.1)",color:"#38bdf8",borderRadius:"0.25rem",border:"1px solid rgba(14,165,233,0.2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"12rem"}}>
                                  📄 {String(meta.paper_title)}
                                </span>
                              )}
                            </div>
                          </div>
                          {(meta.balance_after !== undefined) && (
                            <div style={{textAlign:"right",flexShrink:0}}>
                              <div style={{fontSize:"0.65rem",color:DB.muted}}>Balance</div>
                              <div style={{fontSize:"0.875rem",fontWeight:900,color:DB.text,fontVariantNumeric:"tabular-nums"}}>
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
                <div style={{textAlign:"center",padding:"3rem",color:DB.muted}}>
                  <p>No points log data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={() => setSelectedSession(null)}>
          <div style={{background:DB.surf,border:`1px solid ${DB.border}`,borderTop:`3px solid ${DB.purple}`,borderRadius:"1.5rem",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",maxWidth:"56rem",width:"100%",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={(e) => e.stopPropagation()}>
            <div style={{padding:"1.5rem",borderBottom:`1px solid ${DB.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h2 style={{fontFamily:DB.font,fontSize:"1.375rem",fontWeight:900,color:DB.text,marginBottom:"0.25rem"}}>Practice Session Details</h2>
                <p style={{fontSize:"0.8rem",color:DB.muted}}>
                  {getOperationName(selectedSession.operation_type)} • {selectedSession.difficulty_mode} • {formatDate(selectedSession.started_at)}
                </p>
                {selectedSession.completed_at && (
                  <p style={{fontSize:"0.8rem",color:DB.muted,marginTop:"0.125rem"}}>Completed: {formatDateToIST(selectedSession.completed_at)}</p>
                )}
              </div>
              <button onClick={() => setSelectedSession(null)} style={{padding:"0.5rem",background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X style={{width:"1.25rem",height:"1.25rem",color:DB.muted}} />
              </button>
            </div>
            <div className="db-scrollbar" style={{padding:"1.5rem",overflowY:"auto",flex:1}}>
              {/* Session Summary */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
                {[
                  {label:"Score",val:`${selectedSession.score}/${selectedSession.total_questions}`,color:DB.purple},
                  {label:"Accuracy",val:`${selectedSession.accuracy.toFixed(1)}%`,color:DB.green},
                  {label:"Time",val:formatTime(selectedSession.time_taken),color:DB.teal},
                  {label:"Points",val:`+${selectedSession.points_earned}`,color:DB.gold},
                ].map(({label,val,color})=>(
                  <div key={label} style={{background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.875rem",padding:"1rem",borderTop:`2px solid ${color}`}}>
                    <div style={{fontSize:"0.7rem",fontWeight:700,color:DB.muted,marginBottom:"0.375rem"}}>{label}</div>
                    <div style={{fontSize:"1.375rem",fontWeight:900,color}}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Questions List */}
              <div>
                <h3 style={{fontSize:"1rem",fontWeight:900,color:DB.text,marginBottom:"1rem"}}>Questions & Answers</h3>
                <div style={{display:"flex",flexDirection:"column",gap:"0.625rem"}}>
                  {selectedSession.attempts.map((attempt) => (
                    <div key={attempt.id} style={{borderRadius:"0.75rem",padding:"1rem",border:`1px solid ${attempt.is_correct?"rgba(34,197,94,0.25)":"rgba(248,113,113,0.25)"}`,background:attempt.is_correct?"rgba(34,197,94,0.06)":"rgba(248,113,113,0.06)"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                            <span style={{fontWeight:600,color:DB.text,fontSize:"0.875rem"}}>Q{attempt.question_number}:</span>
                            <span style={{color:DB.text,fontFamily:"monospace",fontSize:"1rem"}}>{formatQuestion(attempt.question_data, selectedSession.operation_type)}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:"1rem",fontSize:"0.8rem",flexWrap:"wrap"}}>
                            <span style={{color:attempt.is_correct?DB.green:"#f87171"}}>Your answer: <strong>{attempt.user_answer !== null ? attempt.user_answer : "—"}</strong></span>
                            <span style={{color:DB.muted}}>Correct: <strong style={{color:DB.text}}>{attempt.correct_answer}</strong></span>
                            <span style={{color:DB.muted}}>Time: <strong style={{color:DB.text}}>{attempt.time_taken.toFixed(2)}s</strong></span>
                          </div>
                        </div>
                        <div style={{marginLeft:"1rem"}}>
                          {attempt.is_correct
                            ? <CheckCircle2 style={{width:"1.25rem",height:"1.25rem",color:DB.green}} />
                            : <XCircle style={{width:"1.25rem",height:"1.25rem",color:"#f87171"}} />}
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={() => setSelectedPaperAttempt(null)}>
          <div style={{background:DB.surf,border:`1px solid ${DB.border}`,borderTop:`3px solid ${DB.teal}`,borderRadius:"1.5rem",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",maxWidth:"56rem",width:"100%",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={(e) => e.stopPropagation()}>
            <div style={{padding:"1.5rem",borderBottom:`1px solid ${DB.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h2 style={{fontFamily:DB.font,fontSize:"1.375rem",fontWeight:900,color:DB.text,marginBottom:"0.25rem"}}>Practice Paper Details</h2>
                <p style={{fontSize:"0.8rem",color:DB.muted}}>
                  {selectedPaperAttempt.paper_title} • {selectedPaperAttempt.paper_level} • {formatDate(selectedPaperAttempt.started_at)}
                </p>
                {selectedPaperAttempt.completed_at && (
                  <p style={{fontSize:"0.8rem",color:DB.muted,marginTop:"0.125rem"}}>Completed: {formatDateToIST(selectedPaperAttempt.completed_at)}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedPaperAttempt(null)}
                style={{padding:"0.5rem",background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
              >
                <X style={{width:"1.25rem",height:"1.25rem",color:DB.muted}} />
              </button>
            </div>
            
            <div className="db-scrollbar" style={{padding:"1.5rem",overflowY:"auto",flex:1}}>
              {/* Paper Summary */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
                <div style={{background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.875rem",padding:"1rem",borderTop:`2px solid ${DB.purple}`}}>
                  <div style={{fontSize:"0.7rem",fontWeight:700,color:DB.muted,marginBottom:"0.375rem"}}>Score</div>
                  <div style={{fontSize:"1.375rem",fontWeight:900,color:DB.purple}}>{selectedPaperAttempt.score}/{selectedPaperAttempt.total_questions}</div>
                </div>
                <div style={{background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.875rem",padding:"1rem",borderTop:`2px solid ${DB.green}`}}>
                  <div style={{fontSize:"0.7rem",fontWeight:700,color:DB.muted,marginBottom:"0.375rem"}}>Accuracy</div>
                  <div style={{fontSize:"1.375rem",fontWeight:900,color:DB.green}}>{selectedPaperAttempt.accuracy.toFixed(1)}%</div>
                </div>
                {selectedPaperAttempt.time_taken !== null && selectedPaperAttempt.time_taken !== undefined && (
                  <div style={{background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.875rem",padding:"1rem",borderTop:`2px solid ${DB.teal}`}}>
                    <div style={{fontSize:"0.7rem",fontWeight:700,color:DB.muted,marginBottom:"0.375rem"}}>Time</div>
                    <div style={{fontSize:"1.375rem",fontWeight:900,color:DB.teal}}>{formatTime(selectedPaperAttempt.time_taken)}</div>
                  </div>
                )}
                <div style={{background:DB.surf2,border:`1px solid ${DB.border}`,borderRadius:"0.875rem",padding:"1rem",borderTop:`2px solid ${DB.gold}`}}>
                  <div style={{fontSize:"0.7rem",fontWeight:700,color:DB.muted,marginBottom:"0.375rem"}}>Points</div>
                  <div style={{fontSize:"1.375rem",fontWeight:900,color:DB.gold}}>+{selectedPaperAttempt.points_earned}</div>
                </div>
              </div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
                <h3 style={{fontSize:"1rem",fontWeight:900,color:DB.text}}>Results Summary</h3>
                {selectedPaperAttempt.completed_at && (() => {
                  // Only check re-attempt if seed is available
                  if (selectedPaperAttempt.seed === undefined || selectedPaperAttempt.seed === null) {
                    return (
                      <button
                        onClick={() => handleReAttempt(selectedPaperAttempt.id)}
                        disabled={reAttempting === selectedPaperAttempt.id}
                        style={{padding:"0.5rem 1rem",background:DB.purple,color:"#fff",border:"none",borderRadius:"0.625rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem",opacity:reAttempting===selectedPaperAttempt.id?0.5:1,fontSize:"0.875rem"}}
                      >
                        <RotateCcw style={{width:"0.875rem",height:"0.875rem"}} className={reAttempting === selectedPaperAttempt.id ? "animate-spin" : ""} />
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
                      style={{padding:"0.5rem 1rem",background:DB.purple,color:"#fff",border:"none",borderRadius:"0.625rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem",opacity:(reAttempting===selectedPaperAttempt.id||!canReattempt)?0.5:1,fontSize:"0.875rem"}}
                      title={!canReattempt ? "Maximum attempts reached (1 fresh + 1 re-attempt)" : ""}
                    >
                      <RotateCcw style={{width:"0.875rem",height:"0.875rem"}} className={reAttempting === selectedPaperAttempt.id ? "animate-spin" : ""} />
                      {reAttempting === selectedPaperAttempt.id ? "Starting..." : "Re-attempt Paper"}
                    </button>
                  );
                })()}
              </div>

              <div style={{background:DB.surf2,borderRadius:"0.875rem",padding:"1rem",border:`1px solid ${DB.border}`,marginBottom:"1rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                  <div>
                    <div style={{fontSize:"0.8rem",color:DB.muted,marginBottom:"0.25rem"}}>Correct Answers</div>
                    <div style={{fontSize:"1.375rem",fontWeight:900,color:DB.green}}>{selectedPaperAttempt.correct_answers}</div>
                  </div>
                  <div>
                    <div style={{fontSize:"0.8rem",color:DB.muted,marginBottom:"0.25rem"}}>Wrong Answers</div>
                    <div style={{fontSize:"1.375rem",fontWeight:900,color:"#f87171"}}>{selectedPaperAttempt.wrong_answers}</div>
                  </div>
                </div>
              </div>

              {!selectedPaperAttempt.completed_at && (
                <div style={{marginTop:"1rem",padding:"1rem",background:"rgba(245,158,11,0.08)",border:`1px solid rgba(245,158,11,0.2)`,borderRadius:"0.75rem"}}>
                  <p style={{fontSize:"0.8rem",color:DB.gold}}>This paper attempt is still in progress.</p>
                </div>
              )}

              {/* Questions List */}
              {loadingPaperDetail ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
                  <Loader2 style={{width:"2rem",height:"2rem",animation:"spin 1s linear infinite",color:DB.purple}} />
                  <span style={{marginLeft:"0.75rem",color:DB.muted}}>Loading questions...</span>
                </div>
              ) : selectedPaperAttemptDetail && selectedPaperAttemptDetail.generated_blocks ? (
                <div style={{marginTop:"1.5rem"}}>
                  <h3 style={{fontSize:"1rem",fontWeight:900,color:DB.text,marginBottom:"1rem"}}>All Questions</h3>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                    {selectedPaperAttemptDetail.generated_blocks.map((block: any, blockIdx: number) => (
                      <div key={blockIdx} style={{marginBottom:"0.5rem"}}>
                        {block.questions && block.questions.map((question: any) => {
                          const userAnswer = selectedPaperAttemptDetail.answers?.[String(question.id)] ?? selectedPaperAttemptDetail.answers?.[question.id];
                          const isCorrect = userAnswer !== null && userAnswer !== undefined && Math.abs(userAnswer - question.answer) < 0.01;
                          return (
                            <div
                              key={question.id}
                              style={{padding:"1rem",borderRadius:"0.75rem",border:`1px solid ${isCorrect?"rgba(34,197,94,0.25)":"rgba(248,113,113,0.25)"}`,background:isCorrect?"rgba(34,197,94,0.06)":"rgba(248,113,113,0.06)",marginBottom:"0.5rem"}}
                            >
                              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                                <div style={{flex:1}}>
                                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                                    <span style={{fontWeight:600,color:DB.text,fontSize:"0.875rem"}}>Q{question.id}:</span>
                                    <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                  </div>
                                  <div style={{display:"flex",alignItems:"center",gap:"1rem",fontSize:"0.8rem",flexWrap:"wrap"}}>
                                    <span style={{color:isCorrect?DB.green:"#f87171"}}>
                                      Your answer: <strong>{userAnswer !== null && userAnswer !== undefined ? userAnswer : "—"}</strong>
                                    </span>
                                    <span style={{color:DB.muted}}>
                                      Correct: <strong style={{color:DB.text}}>{question.answer}</strong>
                                    </span>
                                  </div>
                                </div>
                                <div style={{marginLeft:"1rem"}}>
                                  {isCorrect
                                    ? <CheckCircle2 style={{width:"1.25rem",height:"1.25rem",color:DB.green}} />
                                    : <XCircle style={{width:"1.25rem",height:"1.25rem",color:"#f87171"}} />}
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
                <div style={{marginTop:"1rem",padding:"1rem",background:"rgba(14,165,233,0.08)",border:`1px solid rgba(14,165,233,0.2)`,borderRadius:"0.75rem"}}>
                  <p style={{fontSize:"0.8rem",color:"#38bdf8"}}>Click "View Details" again to load all questions.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
