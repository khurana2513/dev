import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import { 
  startPaperAttempt, 
  submitPaperAttempt, 
  getPaperAttempt,
  validatePaperAttempt,
  PaperAttempt as PaperAttemptType,
  PaperAttemptCreate,
  GeneratedBlock,
  Question,
  PaperConfig
} from "@/lib/api";
import MathQuestion from "@/components/MathQuestion";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy, 
  Target, 
  ArrowLeft,
  CheckSquare,
  Square,
  X,
  RotateCcw,
  Zap
} from "lucide-react";

export default function PaperAttempt() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get paper data from location state or URL params
  const [paperConfig, setPaperConfig] = useState<PaperConfig | null>(null);
  const [generatedBlocks, setGeneratedBlocks] = useState<GeneratedBlock[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<PaperAttemptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(false);
  const [paperReady, setPaperReady] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [reAttempting, setReAttempting] = useState(false);
  const initializedRef = useRef(false);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Guard against stale attemptId - tracks the active attempt ID for the current session
  const activeAttemptIdRef = useRef<number | null>(null);
  // Guard against double submission - prevents submitting the same attempt twice
  const isSubmittingRef = useRef<boolean>(false);
  
  // Session state persistence
  const PAPER_SESSION_STORAGE_KEY = "paper_attempt_session_state";
  const [, setSessionState] = useState<"idle" | "started" | "in_progress" | "completed" | "aborted" | "recovered">("idle");

  // ── Design-system CSS injection ──────────────────────────────────────────
  useEffect(() => {
    const id = "pa-design-tokens";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
      :root{--pa-bg:#07070F;--pa-surf:#0F1120;--pa-surf2:#141729;--pa-surf3:#1C2040;--pa-bdr:rgba(255,255,255,0.06);--pa-bdr2:rgba(255,255,255,0.10);--pa-pur:#7B5CE5;--pa-pur2:#9D7FF0;--pa-pur3:#C4ADFF;--pa-pglow:rgba(123,92,229,0.22);--pa-pdim:rgba(123,92,229,0.10);--pa-grn:#10B981;--pa-grn2:#059669;--pa-rdim:rgba(239,68,68,0.12);--pa-red:#EF4444;--pa-gld:#F59E0B;--pa-whi:#F0F2FF;--pa-whi2:#B8BDD8;--pa-muted:#525870;--pa-fd:'Playfair Display',Georgia,serif;--pa-fb:'DM Sans',sans-serif;--pa-fm:'JetBrains Mono',monospace;}
      @keyframes pa-spin{to{transform:rotate(360deg)}}
      @keyframes pa-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      @keyframes pa-scale-in{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
      @keyframes pa-trophy{0%{transform:scale(0) rotate(-20deg)}60%{transform:scale(1.15) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
      @keyframes pa-progress{from{width:0}to{width:var(--acc)}}
      @keyframes pa-count-up{from{opacity:0;transform:translateY(10px) scale(.85)}to{opacity:1;transform:none}}
      @keyframes pa-timer-tick{0%,100%{opacity:1}50%{opacity:0.7}}
      @keyframes pa-drain{from{width:100%}to{width:0%}}
      .pa-stat-tile{transition:transform 0.2s,box-shadow 0.2s}
      .pa-stat-tile:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.4)!important}
      .pa-action-btn{transition:all 0.2s;cursor:pointer;border:none}
      .pa-action-btn:hover{filter:brightness(1.15);transform:translateY(-2px)}
      .pa-review-card{transition:all 0.2s}
      .pa-review-card:hover{border-color:rgba(255,255,255,0.15)!important}
      .pa-count-up{animation:pa-count-up .4s ease both}
      .pa-qcard{background:var(--pa-surf2);border:1px solid var(--pa-bdr);border-radius:12px;padding:8px;transition:all 0.2s}
      .pa-qcard:hover{border-color:rgba(123,92,229,0.35);box-shadow:0 4px 20px rgba(123,92,229,0.1)}
      .pa-answer-input{background:var(--pa-surf);border:none;border-bottom:1.5px solid var(--pa-bdr2);border-radius:0;color:var(--pa-whi);font-family:var(--pa-fm);font-weight:600;text-align:center;transition:all 0.2s;outline:none}
      .pa-answer-input:focus{border-bottom-color:var(--pa-pur);box-shadow:none;background:rgba(123,92,229,0.05)}
      .pa-answer-input.answered{border-bottom-color:var(--pa-grn);color:var(--pa-grn)}
      .pa-block-card{border-radius:16px;padding:24px;border:1px solid var(--pa-bdr);transition:all 0.3s;animation:pa-fade-up 0.4s ease both}
      .pa-stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
      .pa-action-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      @media(max-width:640px){
        .pa-stats-grid{grid-template-columns:repeat(3,1fr)!important}
        .pa-action-grid{grid-template-columns:1fr 1fr!important}
      }
      @media(max-width:480px){
        .pa-stats-grid{grid-template-columns:repeat(2,1fr)!important}
        .pa-action-grid{grid-template-columns:1fr!important}
        .pa-block-card{padding:16px!important;border-radius:12px!important}
      }
    `;
    document.head.appendChild(s);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Save paper attempt state to localStorage
  const savePaperSessionState = () => {
    if (!paperReady || isSubmitted || !attemptId) return; // Don't save if not ready, submitted, or no attempt ID
    
    try {
      const state = {
        version: "1.0",
        state: "in_progress",
        timestamp: Date.now(),
        attemptId,
        paperConfig,
        generatedBlocks,
        seed,
        answers,
        startTime,
        currentTime,
      };
      localStorage.setItem(PAPER_SESSION_STORAGE_KEY, JSON.stringify(state));
      console.log("💾 [PAPER_SESSION] State saved to localStorage");
    } catch (error) {
      console.error("❌ [PAPER_SESSION] Failed to save state:", error);
    }
  };
  
  // Restore paper attempt state from localStorage
  const restorePaperSessionState = async (): Promise<boolean> => {
    try {
      const saved = localStorage.getItem(PAPER_SESSION_STORAGE_KEY);
      if (!saved) return false;
      
      const state = JSON.parse(saved);
      if (!state || state.state !== "in_progress") return false;
      
      // Check if session is too old (more than 30 minutes) - frontend quick check
      const age = Date.now() - state.timestamp;
      const FRONTEND_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
      if (age > FRONTEND_TIMEOUT_MS) {
        console.log("⚠️ [PAPER_SESSION] Saved session too old (frontend check), clearing");
        localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
        return false;
      }
      
      // Validate with backend that the attempt is still valid
      if (state.attemptId) {
        try {
          const validation = await validatePaperAttempt(state.attemptId);
          if (!validation.valid) {
            console.log(`⚠️ [PAPER_SESSION] Attempt ${state.attemptId} is not valid: ${validation.reason}`);
            localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
            return false;
          }
          console.log("✅ [PAPER_SESSION] Attempt validated with backend");
        } catch (validationError) {
          console.error("❌ [PAPER_SESSION] Error validating with backend:", validationError);
          // On validation error, don't restore to be safe
          localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
          return false;
        }
      }
      
      // Restore state
      if (state.paperConfig) setPaperConfig(state.paperConfig);
      if (state.generatedBlocks) setGeneratedBlocks(state.generatedBlocks);
      if (state.seed !== null && state.seed !== undefined) setSeed(state.seed);
      if (state.attemptId) {
        setAttemptId(state.attemptId);
        activeAttemptIdRef.current = state.attemptId;
      }
      if (state.answers) setAnswers(state.answers);
      if (state.startTime) setStartTime(state.startTime);
      if (state.currentTime !== undefined) setCurrentTime(state.currentTime);
      
      setSessionState("recovered");
      setPaperReady(true);
      console.log("✅ [PAPER_SESSION] State restored from localStorage");
      return true;
    } catch (error) {
      console.error("❌ [PAPER_SESSION] Failed to restore state:", error);
      localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
      return false;
    }
  };
  
  // Clear paper session state
  const clearPaperSessionState = () => {
    localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
    setSessionState("idle");
    console.log("🗑️ [PAPER_SESSION] State cleared");
  };
  
  // Auto-save paper session state periodically
  useEffect(() => {
    if (!paperReady || isSubmitted || !attemptId) return;
    
    const interval = setInterval(() => {
      savePaperSessionState();
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(interval);
  }, [paperReady, isSubmitted, attemptId, answers, startTime]);
  
  // Save state on answer changes
  useEffect(() => {
    if (paperReady && !isSubmitted && attemptId) {
      savePaperSessionState();
    }
  }, [answers, attemptId]);

  const handleReAttempt = () => {
    if (!paperConfig || !generatedBlocks || seed === null) {
      console.error("Cannot re-attempt: missing paper data");
      return;
    }
    
    setReAttempting(true);
    try {
      // Store paper data in sessionStorage for re-attempt
      const paperData = {
        config: paperConfig,
        blocks: generatedBlocks,
        seed: seed
      };
      sessionStorage.setItem("paperAttemptData", JSON.stringify(paperData));
      
      // Reset state and navigate to attempt page
      setLocation("/paper/attempt");
      // The page will reload and pick up the data from sessionStorage
      window.location.reload();
    } catch (error) {
      console.error("Failed to start re-attempt:", error);
      alert("Failed to start re-attempt. Please try again.");
      setReAttempting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAttempt = async () => {
      try {
        // Wait for auth to finish loading
        if (authLoading) {
          console.log("🟡 [ATTEMPT] Auth still loading...");
          return;
        }

        // Check authentication
        if (!isAuthenticated) {
          console.log("🟡 [ATTEMPT] Not authenticated, redirecting to login");
          if (mounted) setLocation("/login");
          return;
        }

        // ── Critical guard: if a paper is already active, don't reinitialize. ──
        // This prevents auth-context refreshes (token refresh, re-render) from
        // clearing the activeAttemptIdRef mid-session and causing "No active attempt" errors.
        if (activeAttemptIdRef.current !== null && !isSubmitted) {
          console.log("🟡 [ATTEMPT] Paper already active (attemptId:", activeAttemptIdRef.current, "), skipping re-initialization");
          return;
        }
        
        // Reset initializedRef first to allow new attempts
        // This is critical for re-attempts to work
        const wasInitialized = initializedRef.current;
        initializedRef.current = false;
        
        // Reset state for new attempt
        // CRITICAL: Clear ref FIRST (synchronous) before clearing state
        activeAttemptIdRef.current = null;
        console.log("🟡 [ATTEMPT] Cleared activeAttemptIdRef for new attempt initialization");
        
        if (mounted) {
          setAttemptId(null);
          setAnswers({});
          setStartTime(null);
          setIsSubmitted(false);
          setResult(null);
          setError(null);
          setShowStartScreen(false);
          setPaperReady(false);
        }

        // Only prevent if we're already in the process of initializing (to avoid duplicate calls)
        // But reset the ref first so re-attempts can create new attempts
        if (wasInitialized) {
          console.log("🟡 [ATTEMPT] Was previously initialized, but resetting for new attempt");
        }

        console.log("🟢 [ATTEMPT] Starting paper attempt initialization");
        initializedRef.current = true;

        // Check for recovery first (now async)
        const recovered = await restorePaperSessionState();
        if (recovered) {
          const shouldRecover = window.confirm(
            "A previous paper attempt was found. Would you like to continue where you left off?"
          );
          if (shouldRecover) {
            setSessionState("recovered");
            setLoading(false);
            setShowStartScreen(false); // Skip start screen for recovered sessions
            console.log("✅ [PAPER_SESSION] Session recovered");
            return;
          } else {
            clearPaperSessionState();
          }
        }
        
        // Get paper data from sessionStorage (passed from PaperCreate)
        const paperData = sessionStorage.getItem("paperAttemptData");
        console.log("🟡 [ATTEMPT] Paper data from sessionStorage:", paperData ? "Found" : "Not found");
        
        if (!paperData) {
          console.error("❌ [ATTEMPT] No paper data in sessionStorage");
          if (mounted) {
            setError("No paper data found. Please generate a paper first.");
            setLoading(false);
          }
          return;
        }

        const data = JSON.parse(paperData);
        console.log("🟢 [ATTEMPT] Parsed paper data:", {
          hasConfig: !!data.config,
          hasBlocks: !!data.blocks,
          blocksCount: data.blocks?.length || 0,
          seed: data.seed
        });
        
        const config = data.config;
        const blocks = data.blocks;
        const seedValue = data.seed;
        
        if (!config || !blocks || !Array.isArray(blocks) || seedValue === undefined || seedValue === null) {
          throw new Error("Invalid paper data structure");
        }
        
        if (mounted) {
          setPaperConfig(config);
          setGeneratedBlocks(blocks);
          setSeed(seedValue);
        }
        
        // Start the attempt immediately with the loaded data
        try {
          console.log("🟢 [ATTEMPT] Starting attempt API call...");
          const attemptData: PaperAttemptCreate = {
            paper_title: config.title,
            paper_level: config.level,
            paper_config: config,
            generated_blocks: blocks,
            seed: seedValue,
            // Pass the share code when this attempt originated from a shared paper link.
            // The backend uses this to bypass the direct 2-attempt limit and instead
            // tracks one attempt per user per share code.
            ...(data.sharedPaperCode ? { shared_paper_code: data.sharedPaperCode } : {}),
          };
          
          const attempt = await startPaperAttempt(attemptData);
          const newAttemptId = attempt.id;
          console.log("🔵 [ATTEMPT] ===== NEW ATTEMPT CREATED =====");
          console.log("✅ [ATTEMPT] Attempt started successfully:", newAttemptId);
          console.log("✅ [ATTEMPT] New attempt ID:", newAttemptId);
          console.log("✅ [ATTEMPT] Previous attemptId (state):", attemptId);
          console.log("✅ [ATTEMPT] Previous ref:", activeAttemptIdRef.current);
          console.log("✅ [ATTEMPT] Paper title:", config.title);
          console.log("✅ [ATTEMPT] Seed:", seedValue);
          
          if (mounted) {
            // CRITICAL: Update the ref FIRST (synchronous, immediate)
            // This is the source of truth for the current attempt
            const oldRef = activeAttemptIdRef.current;
            activeAttemptIdRef.current = newAttemptId;
            console.log("✅ [ATTEMPT] Active attempt ID ref updated:", oldRef, "->", newAttemptId);
            
            // Then update state (asynchronous, but ref is already set)
            setAttemptId(newAttemptId);
            
            setLoading(false);
            setPaperReady(true);
            setShowStartScreen(true);
            
            // Clear any old result/state from previous attempt
            setResult(null);
            setIsSubmitted(false);
            setAnswers({});
            
            // Only remove from sessionStorage after successful start
            sessionStorage.removeItem("paperAttemptData");
          }
        } catch (err) {
          console.error("❌ [ATTEMPT] Failed to start attempt:", err);
          if (mounted) {
            const errorMessage = err instanceof Error ? err.message : "Failed to start attempt";
            setError(errorMessage);
            setLoading(false);
            
            // Detect auth failures and redirect to login
            const isAuthError = (
              errorMessage.includes("Not authenticated") ||
              errorMessage.includes("authentication") ||
              errorMessage.includes("token") ||
              errorMessage.toLowerCase().includes("unauthorized") ||
              errorMessage.includes("Please log in") ||
              errorMessage.includes("log in again")
            );
            if (isAuthError) {
              console.log("🟡 [ATTEMPT] Auth error detected, redirecting to login");
              setTimeout(() => { setLocation("/login"); }, 1500);
            }
            // Don't remove from sessionStorage on error, so user can retry
          }
        }
      } catch (e) {
        console.error("❌ [ATTEMPT] Error parsing paper data:", e);
        if (mounted) {
          setError("Invalid paper data format");
          setLoading(false);
          // Remove invalid data
          sessionStorage.removeItem("paperAttemptData");
        }
      }
    };

    initializeAttempt();

    return () => {
      mounted = false;
      // Reset initializedRef when component unmounts or dependencies change
      // This ensures re-attempts can create new attempts
      initializedRef.current = false;
    };
  }, [isAuthenticated, authLoading, setLocation]);

  // Timer
  useEffect(() => {
    if (startTime !== null && !isSubmitted) {
      timerIntervalRef.current = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [startTime, isSubmitted]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      if (value === "") {
        delete newAnswers[questionId];
      } else {
        newAnswers[questionId] = value;
      }
      return newAnswers;
    });
  };

  const handleStartPaper = () => {
    // Verify we have a valid active attempt ID before starting
    if (!activeAttemptIdRef.current) {
      console.error("❌ [START] No active attempt ID found. Cannot start paper.");
      setError("No active attempt found. Please refresh and try again.");
      return;
    }
    
    setShowStartScreen(false);
    const now = Date.now();
    setStartTime(now);
    setCurrentTime(0);
    console.log("🟢 [START] Paper started with attempt ID:", activeAttemptIdRef.current);
  };

  const handleSubmit = async () => {
    // CRITICAL: Prevent double submission using ref (synchronous check)
    if (isSubmittingRef.current) {
      console.warn("⚠️ [SUBMIT] Submission already in progress, ignoring duplicate call");
      return;
    }
    
    // CRITICAL: Use the ref as the source of truth, not state
    // State can be stale due to React's asynchronous updates
    const activeAttemptId = activeAttemptIdRef.current;
    const currentStartTime = startTime;
    
    console.log("🔵 [SUBMIT] ===== SUBMIT ATTEMPT START =====");
    console.log("🔵 [SUBMIT] activeAttemptId (ref):", activeAttemptId);
    console.log("🔵 [SUBMIT] attemptId (state):", attemptId);
    console.log("🔵 [SUBMIT] currentStartTime:", currentStartTime);
    console.log("🔵 [SUBMIT] isSubmitted:", isSubmitted);
    console.log("🔵 [SUBMIT] submitting:", submitting);
    console.log("🔵 [SUBMIT] isSubmittingRef:", isSubmittingRef.current);
    
    if (!activeAttemptId || !currentStartTime) {
      console.error("❌ [SUBMIT] Cannot submit: activeAttemptId =", activeAttemptId, "startTime =", currentStartTime);
      console.error("❌ [SUBMIT] State attemptId =", attemptId, "isSubmitted =", isSubmitted);
      setError("Cannot submit: No active attempt found. Please refresh and try again.");
      return;
    }
    
    // Verify state matches ref (sanity check)
    if (attemptId !== activeAttemptId) {
      console.warn("⚠️ [SUBMIT] State and ref mismatch. State:", attemptId, "Ref:", activeAttemptId);
      console.warn("⚠️ [SUBMIT] Using ref value as source of truth.");
    }
    
    // Additional safety check: if attempt was already submitted, don't allow resubmission
    if (isSubmitted) {
      console.error("❌ [SUBMIT] Attempt already submitted (isSubmitted=true). Ignoring duplicate submission.");
      return;
    }
    
    // CRITICAL: Set submission lock IMMEDIATELY (before any async operations)
    // This prevents double submission even if user clicks multiple times
    if (isSubmittingRef.current) {
      console.warn("⚠️ [SUBMIT] Submission already in progress (lock detected), ignoring duplicate call");
      return;
    }
    isSubmittingRef.current = true;
    console.log("🔒 [SUBMIT] Submission lock acquired");
    
    // CRITICAL: Check if attempt is already completed on the backend BEFORE submitting
    // Do this check RIGHT BEFORE submission to minimize race condition window
    console.log("🔵 [SUBMIT] Checking attempt status on backend immediately before submission...");
    try {
      const attemptStatus = await getPaperAttempt(activeAttemptId);
      console.log("🔵 [SUBMIT] Attempt status check:", {
        id: attemptStatus.id,
        completed_at: attemptStatus.completed_at,
        isCompleted: !!attemptStatus.completed_at
      });
      
      if (attemptStatus.completed_at) {
        console.error("❌ [SUBMIT] Attempt", activeAttemptId, "is already completed on backend!");
        console.error("❌ [SUBMIT] Completed at:", attemptStatus.completed_at);
        
        // Show the results instead of error
            setResult(attemptStatus);
            setIsSubmitted(true);
            setSessionState("completed");
            clearPaperSessionState();
            activeAttemptIdRef.current = null;
            isSubmittingRef.current = false; // Release lock
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            console.log("✅ [SUBMIT] Showing existing results instead of submitting.");
            return;
      }
    } catch (statusError) {
      console.warn("⚠️ [SUBMIT] Could not check attempt status:", statusError);
      console.warn("⚠️ [SUBMIT] Proceeding with submission anyway...");
    }
    
    console.log("🟢 [SUBMIT] Attempt is not completed, proceeding with submission...");
    console.log("🟢 [SUBMIT] Submitting attempt ID:", activeAttemptId, "(from ref, state was:", attemptId, ")");
    const timeTaken = (Date.now() - currentStartTime) / 1000;
    console.log("🟢 [SUBMIT] Time taken:", timeTaken, "seconds");
    console.log("🟢 [SUBMIT] Answers count:", Object.keys(answers).length);
    
    setSubmitting(true);
    setError(null); // Clear any previous errors
    try {
      // Convert string answers to numbers for submission
      const numericAnswers: { [questionId: string]: number } = {};
      Object.keys(answers).forEach(key => {
        const numValue = parseFloat(answers[key]);
        if (!isNaN(numValue)) {
          numericAnswers[key] = numValue;
        }
      });
      const result = await submitPaperAttempt(activeAttemptId, numericAnswers, timeTaken);
      console.log("✅ [SUBMIT] Submission API call successful");
      console.log("✅ [SUBMIT] Result:", {
        id: result.id,
        completed_at: result.completed_at,
        score: result.score,
        points_earned: result.points_earned
      });
      
      setResult(result);
      setIsSubmitted(true);
      // Scroll to top after submission
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Mark session as completed and clear state
      setSessionState("completed");
      clearPaperSessionState();
      // Clear the active attempt ref after successful submission to prevent reuse
      activeAttemptIdRef.current = null;
      isSubmittingRef.current = false; // Release submission lock
      console.log("✅ [SUBMIT] Submission successful. Active attempt ref cleared.");
      console.log("🔓 [SUBMIT] Submission lock released");
      console.log("🔵 [SUBMIT] ===== SUBMIT ATTEMPT SUCCESS =====");
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    } catch (err: any) {
      console.error("❌ [SUBMIT] ===== SUBMIT ATTEMPT ERROR =====");
      console.error("❌ [SUBMIT] Error submitting attempt:", err);
      console.error("❌ [SUBMIT] Error type:", err?.constructor?.name);
      console.error("❌ [SUBMIT] Error message:", err?.message);
      console.error("❌ [SUBMIT] Attempt ID that failed:", activeAttemptId);
      
      // Check if error is "Attempt already completed"
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("Attempt already completed") || errMsg.includes("already completed")) {
        console.error("❌ [SUBMIT] Attempt already completed error detected!");
        console.error("❌ [SUBMIT] This means attempt", activeAttemptId, "was completed before this submission.");
        console.error("❌ [SUBMIT] Fetching attempt details to show results...");
        
        try {
          const attemptDetail = await getPaperAttempt(activeAttemptId);
          if (attemptDetail.completed_at) {
            console.log("✅ [SUBMIT] Found completed attempt, showing results");
            setResult(attemptDetail);
            setIsSubmitted(true);
            setSessionState("completed");
            clearPaperSessionState();
            activeAttemptIdRef.current = null;
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            console.log("✅ [SUBMIT] Showing existing results instead of error.");
            isSubmittingRef.current = false; // Release lock
            setSubmitting(false);
            return;
          }
        } catch (fetchError) {
          console.error("❌ [SUBMIT] Failed to fetch attempt details:", fetchError);
        }
        
        setError("This attempt was already completed. Showing results...");
        isSubmittingRef.current = false; // Release lock
        setSubmitting(false);
        return;
      }
      
      // If we get a network error (empty response), check if the attempt was actually completed
      // This handles the case where points are added but response fails
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        console.log("🟡 [SUBMIT] Network error detected, checking if attempt was completed...");
        try {
          // Try to fetch the attempt to see if it was completed
          // Use activeAttemptId from ref to avoid stale closure issues
          const attemptDetail = await getPaperAttempt(activeAttemptId);
          if (attemptDetail.completed_at) {
            console.log("✅ [SUBMIT] Attempt was completed despite network error, showing results");
            setResult(attemptDetail);
            setIsSubmitted(true);
            setSessionState("completed");
            clearPaperSessionState();
            // Clear the active attempt ref after successful submission
            activeAttemptIdRef.current = null;
            console.log("✅ [SUBMIT] Submission successful (recovered). Active attempt ref cleared.");
            isSubmittingRef.current = false; // Release lock
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            return; // Success - don't show error
          }
        } catch (fetchError) {
          console.error("❌ [SUBMIT] Failed to fetch attempt details:", fetchError);
        }
      }
      
      let errorMessage = "Failed to submit attempt";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        // Handle error objects from API
        if (err.detail) {
          errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        } else if (err.message) {
          errorMessage = typeof err.message === 'string' ? err.message : JSON.stringify(err.message);
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      // Always release the submission lock
      isSubmittingRef.current = false;
      console.log("🔓 [SUBMIT] Submission lock released (finally block)");
      setSubmitting(false);
    }
  };

  const totalQuestions = generatedBlocks?.length > 0 
    ? generatedBlocks.reduce((sum, block) => sum + (block.questions?.length || 0), 0)
    : 0;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return <LoadingScreen context="Your Paper" />;
  }

  if (error && !paperConfig) {
    return (
      <div style={{minHeight:'100vh',background:'var(--pa-bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{textAlign:'center',maxWidth:420}}>
          <div style={{width:64,height:64,background:'var(--pa-rdim)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <XCircle style={{width:32,height:32,color:'var(--pa-red)'}} />
          </div>
          <div style={{color:'var(--pa-red)',marginBottom:16,fontFamily:'var(--pa-fb)',fontSize:17,fontWeight:500}}>{error}</div>
          <Link href="/create">
            <button style={{padding:'12px 28px',background:'linear-gradient(135deg,var(--pa-pur),var(--pa-pur2))',color:'white',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'var(--pa-fb)',fontWeight:600,fontSize:14,boxShadow:'0 4px 20px var(--pa-pglow)'}}>
              Go to Paper Creation
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted && result) {
    const accuracy = result.accuracy || 0;
    const totalAnswered = result.correct_answers + result.wrong_answers;
    return (
      <div style={{minHeight:'100vh',background:'var(--pa-bg)',position:'relative'}}>
        {/* Background glow */}
        <div style={{position:'fixed',inset:0,pointerEvents:'none',background:'radial-gradient(ellipse 60% 50% at 50% 15%, rgba(123,92,229,.06) 0%, rgba(16,185,129,.04) 50%, transparent 70%)'}} />

        <div style={{maxWidth:700,margin:'0 auto',padding:'clamp(24px,5vw,40px) clamp(14px,3vw,24px) 60px',position:'relative',zIndex:1}}>
          {/* Completion header */}
          <div style={{textAlign:'center',marginBottom:32}}>
            <div className="pa-scale-in" style={{width:64,height:64,borderRadius:20,margin:'0 auto 20px',background:'linear-gradient(135deg, var(--pa-pur), #5535C0)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 40px rgba(123,92,229,.35), 0 0 0 1px rgba(123,92,229,.2)'}}>
              <Trophy style={{width:28,height:28,color:'white'}} />
            </div>
            <h1 style={{fontFamily:'var(--pa-fd)',fontSize:'clamp(28px,4vw,44px)',fontWeight:800,letterSpacing:'-.03em',color:'var(--pa-whi)',margin:'0 0 6px'}}>Paper Completed!</h1>
            <p style={{fontFamily:'var(--pa-fm)',fontSize:13,color:'var(--pa-muted)',letterSpacing:'.04em',margin:0}}>
              <span style={{color:'var(--pa-pur2)'}}>{paperConfig?.title}</span>
              {paperConfig?.level && <><span style={{color:'var(--pa-muted)'}}> · </span><span style={{color:'var(--pa-whi2)'}}>{paperConfig.level}</span></>}
              <span style={{color:'var(--pa-muted)'}}> · </span>
              <span style={{color:'var(--pa-whi2)'}}>You answered {totalAnswered} question{totalAnswered !== 1 ? 's' : ''}</span>
            </p>
          </div>

          {/* Primary stats grid */}
          <div className="pa-stats-grid" style={{marginBottom:14}}>
            {[
              {val:result.correct_answers,label:'Correct',color:'var(--pa-grn)',bg:'rgba(16,185,129,0.1)',border:'rgba(16,185,129,0.25)',delay:0},
              {val:result.wrong_answers,label:'Wrong',color:'var(--pa-red)',bg:'rgba(239,68,68,0.1)',border:'rgba(239,68,68,0.25)',delay:.07},
              {val:result.total_questions-result.correct_answers-result.wrong_answers,label:'Missed',color:'var(--pa-gld)',bg:'rgba(245,158,11,0.1)',border:'rgba(245,158,11,0.25)',delay:.14},
              {val:result.accuracy.toFixed(1)+'%',label:'Accuracy',color:'var(--pa-pur2)',bg:'rgba(123,92,229,0.1)',border:'rgba(123,92,229,0.25)',delay:.21},
              {val:`+${result.points_earned}`,label:'Points',color:'var(--pa-pur2)',bg:'rgba(123,92,229,0.08)',border:'rgba(123,92,229,0.2)',delay:.28}
            ].map(({val,label,color,bg,border,delay})=>(
              <div key={label} className="pa-stat-tile pa-count-up" style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:'14px 8px',textAlign:'center',animationDelay:`${delay}s`}}>
                <div style={{fontSize:'clamp(18px,2.5vw,26px)',fontWeight:700,color,fontFamily:'var(--pa-fm)',lineHeight:1}}>{val}</div>
                <div style={{fontSize:9,color:'var(--pa-muted)',fontFamily:'var(--pa-fm)',marginTop:5,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase'}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Secondary stats — two icon boxes like Burst Mode */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
            <div style={{background:'var(--pa-surf)',border:'1px solid var(--pa-bdr)',borderRadius:16,padding:'clamp(12px,2.5vw,18px) clamp(14px,3vw,22px)',display:'flex',alignItems:'center',gap:'clamp(10px,2vw,14px)'}}>
              <div style={{width:38,height:38,borderRadius:11,background:'rgba(123,92,229,.12)',border:'1px solid rgba(123,92,229,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Clock style={{width:18,height:18,color:'var(--pa-pur2)'}} />
              </div>
              <div>
                <div style={{fontFamily:'var(--pa-fm)',fontSize:'clamp(18px,3vw,22px)',fontWeight:800,color:'var(--pa-whi)'}}>{result.time_taken ? formatTime(Math.floor(result.time_taken)) : '—'}</div>
                <div style={{fontFamily:'var(--pa-fb)',fontSize:12,color:'var(--pa-muted)',marginTop:2}}>Time Taken</div>
              </div>
            </div>
            <div style={{background:'var(--pa-surf)',border:'1px solid var(--pa-bdr)',borderRadius:16,padding:'clamp(12px,2.5vw,18px) clamp(14px,3vw,22px)',display:'flex',alignItems:'center',gap:'clamp(10px,2vw,14px)'}}>
              <div style={{width:38,height:38,borderRadius:11,background:'rgba(245,158,11,.12)',border:'1px solid rgba(245,158,11,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Trophy style={{width:18,height:18,color:'var(--pa-gld)'}} />
              </div>
              <div>
                <div style={{fontFamily:'var(--pa-fm)',fontSize:'clamp(18px,3vw,22px)',fontWeight:800,color:'var(--pa-whi)'}}>{result.correct_answers} / {result.total_questions}</div>
                <div style={{fontFamily:'var(--pa-fb)',fontSize:12,color:'var(--pa-muted)',marginTop:2}}>Score</div>
              </div>
            </div>
          </div>

          {/* Accuracy bar */}
          <div style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontFamily:'var(--pa-fm)',fontSize:10,textTransform:'uppercase',letterSpacing:'.12em',color:'var(--pa-muted)'}}>ACCURACY</span>
              <span style={{fontFamily:'var(--pa-fm)',fontSize:13,fontWeight:700,color:'var(--pa-whi2)'}}>{result.accuracy.toFixed(1)}%</span>
            </div>
            <div style={{height:6,borderRadius:99,background:'var(--pa-bdr2)',overflow:'hidden'}}>
              <div style={{borderRadius:99,height:'100%',background:'linear-gradient(90deg,var(--pa-red) 0%,var(--pa-gld) 45%,var(--pa-grn) 100%)',width:`${result.accuracy}%`,transition:'width 1.4s cubic-bezier(.4,0,.2,1) .4s',boxShadow:accuracy > 70 ? '0 0 12px rgba(16,185,129,.2)' : undefined}} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pa-action-grid" style={{marginBottom:24}}>
            <button
              onClick={handleReAttempt}
              disabled={reAttempting || !paperConfig || !generatedBlocks || seed === null}
              className="pa-action-btn"
              style={{padding:'14px 10px',background:'linear-gradient(135deg,var(--pa-pur),#5535C0)',border:'none',borderRadius:14,color:'white',fontFamily:'var(--pa-fd)',fontSize:14,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 6px 20px var(--pa-pglow)',cursor:'pointer',transition:'all .25s ease',opacity:reAttempting||!paperConfig||!generatedBlocks||seed===null?0.5:1}}
              onMouseEnter={(e)=>{const b=e.currentTarget as HTMLButtonElement;b.style.transform='translateY(-2px)';b.style.boxShadow='0 12px 36px rgba(123,92,229,.35)';}}
              onMouseLeave={(e)=>{const b=e.currentTarget as HTMLButtonElement;b.style.transform='';b.style.boxShadow='0 6px 20px var(--pa-pglow)';}}
            >
              <RotateCcw style={{width:15,height:15,animation:reAttempting?'pa-spin 0.8s linear infinite':undefined}} />
              {reAttempting ? 'Starting...' : 'Re-attempt'}
            </button>
            <Link href="/create" style={{textDecoration:'none'}}>
              <button
                className="pa-action-btn"
                style={{width:'100%',padding:'14px 10px',background:'var(--pa-surf2)',border:'1px solid var(--pa-bdr2)',borderRadius:14,color:'var(--pa-whi2)',fontFamily:'var(--pa-fd)',fontSize:14,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',transition:'all .2s'}}
                onMouseEnter={(e)=>{const b=e.currentTarget as HTMLButtonElement;b.style.borderColor='rgba(123,92,229,.3)';b.style.color='var(--pa-whi)';}}
                onMouseLeave={(e)=>{const b=e.currentTarget as HTMLButtonElement;b.style.borderColor='var(--pa-bdr2)';b.style.color='var(--pa-whi2)';}}
              >
                <Zap style={{width:15,height:15}} />Create New
              </button>
            </Link>
            <Link href="/dashboard" style={{textDecoration:'none'}}>
              <button
                className="pa-action-btn"
                style={{width:'100%',padding:'14px 10px',background:'linear-gradient(135deg,var(--pa-grn),var(--pa-grn2))',border:'none',borderRadius:14,color:'white',fontFamily:'var(--pa-fd)',fontSize:14,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 6px 20px rgba(16,185,129,.2)',cursor:'pointer',transition:'all .25s ease'}}
                onMouseEnter={(e)=>{const b=e.currentTarget as HTMLButtonElement;b.style.transform='translateY(-2px)';b.style.boxShadow='0 12px 32px rgba(16,185,129,.32)';}}
                onMouseLeave={(e)=>{const b=e.currentTarget as HTMLButtonElement;b.style.transform='';b.style.boxShadow='0 6px 20px rgba(16,185,129,.2)';}}
              >
                <Trophy style={{width:15,height:15}} />Dashboard
              </button>
            </Link>
          </div>

          {/* Question Review — flat list like Burst Mode */}
          <div style={{background:'var(--pa-surf)',borderRadius:20,border:'1px solid var(--pa-bdr)',boxShadow:'0 24px 60px rgba(0,0,0,0.4)',animation:'pa-fade-up 0.5s ease 0.2s both',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid var(--pa-bdr)'}}>
              <span style={{fontFamily:'var(--pa-fd)',fontSize:17,fontWeight:700,color:'var(--pa-whi)'}}>Question Review</span>
            </div>
            <div style={{maxHeight:400,overflowY:'auto'}}>
            {(() => {
              const allQuestions: Array<{ question: Question; blockTitle?: string }> = [];
              generatedBlocks.forEach((block) => {
                block.questions.forEach((question) => {
                  allQuestions.push({ question, blockTitle: block.config.title });
                });
              });

              return allQuestions.map(({ question }, i) => {
                const userAnswerStr = answers[question.id];
                const isUnattempted = userAnswerStr === undefined;
                let isCorrect = false;
                if (!isUnattempted) {
                  const trimmed = userAnswerStr.trim();
                  const correctStr = String(question.answer);
                  if (!trimmed.includes('.') && !correctStr.includes('.')) {
                    isCorrect = trimmed === correctStr;
                  } else {
                    const parsed = parseFloat(trimmed);
                    isCorrect = !isNaN(parsed) && Math.abs(parsed - question.answer) < 0.01;
                  }
                }
                const borderColor = isUnattempted ? 'rgba(245,158,11,.2)' : isCorrect ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.2)';

                return (
                  <div
                    key={question.id}
                    className="pa-count-up"
                    style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:12,alignItems:'center',padding:'14px 20px',borderBottom:i < allQuestions.length - 1 ? '1px solid var(--pa-bdr)' : undefined,borderLeft:`2px solid ${borderColor}`,paddingLeft:18,transition:'background .15s ease',animationDelay:`${i*.04}s`}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.02)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=''}}
                  >
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      {isUnattempted
                        ? <Square style={{width:16,height:16,color:'var(--pa-gld)',flexShrink:0}} />
                        : isCorrect
                          ? <CheckCircle2 style={{width:16,height:16,color:'var(--pa-grn)',flexShrink:0}} />
                          : <XCircle style={{width:16,height:16,color:'var(--pa-red)',flexShrink:0}} />
                      }
                      <span style={{fontFamily:'var(--pa-fm)',fontSize:14,fontWeight:600,color:'var(--pa-whi)'}}>
                        <MathQuestion question={question} showAnswer={false} largeFont={false} />
                      </span>
                    </div>
                    {!isCorrect && !isUnattempted && (
                      <span style={{fontFamily:'var(--pa-fm)',fontSize:13,fontWeight:600,color:'var(--pa-red)',textDecoration:'line-through'}}>{userAnswerStr}</span>
                    )}
                    {isUnattempted && (
                      <span style={{fontFamily:'var(--pa-fm)',fontSize:13,fontWeight:600,color:'var(--pa-gld)'}}>—</span>
                    )}
                    <span style={{fontFamily:'var(--pa-fm)',fontSize:13,fontWeight:700,color:isCorrect ? 'var(--pa-grn)' : 'var(--pa-muted)'}}>{question.answer}</span>
                  </div>
                );
              });
            })()}
            {generatedBlocks.every(b => b.questions.length === 0) && (
              <div style={{padding:40,textAlign:'center',fontFamily:'var(--pa-fb)',color:'var(--pa-muted)'}}>No questions</div>
            )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check - don't render if we don't have the necessary data
  if (!paperConfig || !generatedBlocks || generatedBlocks.length === 0) {
    if (error) {
      return (
        <div style={{minHeight:'100vh',background:'var(--pa-bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{textAlign:'center'}}>
            <div style={{color:'var(--pa-red)',marginBottom:16,fontFamily:'var(--pa-fb)',fontSize:17}}>{error}</div>
            <Link href="/create">
              <button style={{padding:'12px 28px',background:'linear-gradient(135deg,var(--pa-pur),var(--pa-pur2))',color:'white',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'var(--pa-fb)',fontWeight:600,fontSize:14}}>
                Go to Paper Creation
              </button>
            </Link>
          </div>
        </div>
      );
    }
    // Still loading or no data
    return <LoadingScreen context="Your Paper" />;
  }

  // Start screen overlay
  if (showStartScreen && paperReady) {
    const totalQuestions = generatedBlocks.reduce((sum: number, block: GeneratedBlock) => 
      sum + (block.questions?.length || 0), 0);
    
    return (
      <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(16px)'}}>
        <div style={{background:'var(--pa-surf)',borderRadius:20,padding:'36px 32px',maxWidth:460,width:'calc(100% - 32px)',position:'relative',border:'1px solid var(--pa-bdr2)',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',overflow:'hidden',animation:'pa-scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1)'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,var(--pa-pur),var(--pa-pur2))'}} />
          <button
            onClick={() => setShowStartScreen(false)}
            style={{position:'absolute',top:16,right:16,color:'var(--pa-muted)',background:'rgba(255,255,255,0.05)',border:'1px solid var(--pa-bdr2)',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:6,transition:'all 0.2s'}}
            title="Close"
          >
            <X style={{width:16,height:16}} />
          </button>
          <div style={{textAlign:'center',marginBottom:28,marginTop:8}}>
            <div style={{width:56,height:56,borderRadius:18,background:'linear-gradient(135deg,rgba(123,92,229,0.2),rgba(157,127,240,0.1))',border:'1px solid rgba(123,92,229,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
              <Target style={{width:26,height:26,color:'var(--pa-pur2)'}} />
            </div>
            <h2 style={{fontSize:26,fontWeight:800,color:'var(--pa-whi)',fontFamily:'var(--pa-fd)',margin:'0 0 6px'}}>{paperConfig.title}</h2>
            <p style={{color:'var(--pa-muted)',fontFamily:'var(--pa-fm)',fontSize:12,letterSpacing:'0.1em',textTransform:'uppercase',margin:0}}>{paperConfig.level}</p>
          </div>
          
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--pa-surf2)',border:'1px solid var(--pa-bdr)',borderRadius:10}}>
              <span style={{color:'var(--pa-whi2)',fontFamily:'var(--pa-fb)',fontWeight:500,fontSize:14}}>Total Questions:</span>
              <span style={{color:'var(--pa-whi)',fontFamily:'var(--pa-fm)',fontWeight:700,fontSize:20}}>{totalQuestions}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--pa-surf2)',border:'1px solid var(--pa-bdr)',borderRadius:10}}>
              <span style={{color:'var(--pa-whi2)',fontFamily:'var(--pa-fb)',fontWeight:500,fontSize:14}}>Blocks:</span>
              <span style={{color:'var(--pa-whi)',fontFamily:'var(--pa-fm)',fontWeight:700,fontSize:20}}>{generatedBlocks.length}</span>
            </div>
          </div>

          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'12px 16px',marginBottom:24}}>
            <p style={{fontSize:13,color:'var(--pa-gld)',fontFamily:'var(--pa-fb)',margin:0,lineHeight:1.6}}>
              <strong>Note:</strong> The timer will start as soon as you click "Start Paper". Make sure you're ready before proceeding.
            </p>
          </div>

          <div style={{display:'flex',gap:12}}>
            <Link href="/create" style={{flex:1}}>
              <button style={{width:'100%',padding:'14px 24px',background:'var(--pa-surf2)',border:'1px solid var(--pa-bdr2)',color:'var(--pa-whi2)',borderRadius:12,fontWeight:600,fontFamily:'var(--pa-fb)',cursor:'pointer',fontSize:14}}>
                Cancel
              </button>
            </Link>
            <button
              onClick={handleStartPaper}
              style={{flex:1,padding:'14px 24px',background:'linear-gradient(135deg,var(--pa-grn),var(--pa-grn2))',color:'white',border:'none',borderRadius:12,fontWeight:700,fontFamily:'var(--pa-fb)',cursor:'pointer',fontSize:14,boxShadow:'0 4px 20px rgba(16,185,129,0.3)'}}
            >
              Start Paper
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--pa-bg)',paddingBottom:120}}>

      {/* Sticky Header */}
      <header style={{position:'sticky',top:0,zIndex:40,background:'rgba(6,7,15,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid var(--pa-bdr)'}}>
        <div style={{height:'clamp(52px,8vw,64px)',display:'flex',alignItems:'center',padding:'0 clamp(12px,3vw,24px)'}}>
          <div style={{display:'flex',alignItems:'center',width:'100%',maxWidth:1100,margin:'0 auto',gap:8,minWidth:0}}>
            {/* Left: Exit */}
            <div style={{flexShrink:0}}>
              <button
                onClick={() => setShowExitConfirm(true)}
                style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',background:'rgba(255,255,255,0.05)',border:'1px solid var(--pa-bdr2)',borderRadius:10,color:'var(--pa-whi2)',cursor:'pointer',fontFamily:'var(--pa-fb)',fontWeight:500,fontSize:13}}
              >
                <ArrowLeft style={{width:15,height:15}} />
                <span className="hidden sm:inline">Exit Paper</span>
              </button>
            </div>
            {/* Center: Title — hidden on very small screens */}
            <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0,justifyContent:'center'}} className="hidden sm:flex">
              <Target style={{width:16,height:16,color:'var(--pa-pur)',flexShrink:0}} />
              <h1 style={{fontSize:15,fontWeight:800,color:'var(--pa-whi)',fontFamily:'var(--pa-fd)',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{paperConfig.title}</h1>
            </div>
            {/* Right: Timer + Progress */}
            <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',flexShrink:0,marginLeft:'auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'rgba(255,255,255,0.05)',border:'1px solid var(--pa-bdr2)',borderRadius:10}}>
                <Clock style={{width:14,height:14,color:'var(--pa-pur)'}} />
                <span style={{fontSize:14,fontWeight:700,color:'var(--pa-whi)',fontFamily:'var(--pa-fm)',animation:'pa-timer-tick 1s ease-in-out infinite'}}>{formatTime(currentTime)}</span>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--pa-muted)',fontFamily:'var(--pa-fm)',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{answeredCount}/{totalQuestions}</div>
            </div>
          </div>
        </div>
        {/* Drain bar */}
        <div style={{height:4,position:'relative',overflow:'hidden',background:'var(--pa-surf2)'}}>
          <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${totalQuestions ? (answeredCount/totalQuestions)*100 : 0}%`,background:'linear-gradient(90deg,var(--pa-pur),var(--pa-grn))',transition:'width 0.4s cubic-bezier(.4,0,.2,1)',boxShadow:'2px 0 12px currentColor'}} />
        </div>
      </header>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)'}}>
          <div style={{background:'var(--pa-surf)',borderRadius:16,padding:'28px 32px',maxWidth:420,width:'calc(100% - 32px)',border:'1px solid var(--pa-bdr2)',boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}>
            <h3 style={{fontSize:20,fontWeight:700,color:'var(--pa-whi)',fontFamily:'var(--pa-fd)',marginBottom:8}}>Exit Paper?</h3>
            <p style={{color:'var(--pa-whi2)',fontFamily:'var(--pa-fb)',fontSize:14,marginBottom:24,lineHeight:1.6}}>
              Your progress will be saved, but the timer will stop. Are you sure you want to exit?
            </p>
            <div style={{display:'flex',gap:12}}>
              <button
                onClick={() => { setShowExitConfirm(false); }}
                style={{flex:1,padding:'12px 20px',background:'var(--pa-surf2)',border:'1px solid var(--pa-bdr2)',color:'var(--pa-whi2)',borderRadius:10,fontWeight:600,fontFamily:'var(--pa-fb)',cursor:'pointer',fontSize:14}}
              >
                Continue
              </button>
              <button
                onClick={() => {
                  if (paperReady && !isSubmitted && attemptId) {
                    setSessionState("aborted");
                    savePaperSessionState();
                  }
                  window.location.href = '/create';
                }}
                style={{flex:1,padding:'12px 20px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'var(--pa-red)',borderRadius:10,fontWeight:600,fontFamily:'var(--pa-fb)',cursor:'pointer',fontSize:14}}
              >
                Exit Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'clamp(16px,3vw,28px) clamp(12px,3vw,20px) 0'}}>
        <div style={{display:'flex',flexDirection:'column',gap:20,marginBottom:24}}>
          {generatedBlocks.map((block, blockIdx) => {
            if (!block || !block.questions || block.questions.length === 0) {
              return null;
            }
            return (
            <div key={blockIdx} className="pa-block-card" style={{background:'var(--pa-surf)',animationDelay:`${blockIdx*0.07}s`}}>
              {block.config?.title && (
                <h2 style={{fontSize:15,fontWeight:700,color:'var(--pa-pur2)',fontFamily:'var(--pa-fm)',marginBottom:16,letterSpacing:'0.08em',textTransform:'uppercase'}}>{block.config.title}</h2>
              )}
              
              {block.questions.some(q => q?.isVertical) ? (
                // Vertical questions — responsive grid with auto-fit columns
                <div className="overflow-x-auto -mx-2 px-2">
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(min(80px, 100%), 1fr))',gap:8}}>
                  {block.questions.map((question) => (
                    <div key={question.id} className="pa-qcard" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                      <div style={{textAlign:'center',marginBottom:4}}>
                        <span style={{fontWeight:700,color:'var(--pa-pur2)',fontFamily:'var(--pa-fm)',fontSize:11}}>{question.id}.</span>
                      </div>
                      <MathQuestion question={question} showAnswer={false} hideSerialNumber={true} largeFont={true} />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={answers[question.id] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || (/^-?\d*\.?\d*$/.test(val) && val.length <= 20)) {
                            handleAnswerChange(question.id, val);
                          }
                        }}
                        maxLength={20}
                        className={`pa-answer-input${answers[question.id] ? ' answered' : ''}`}
                        style={{width:'100%',marginTop:6,padding:'6px 4px',fontSize:13}}
                        placeholder="?"
                      />
                    </div>
                  ))}
                </div>
                </div>
              ) : (
                // Horizontal questions - fill columns vertically first (like PDF)
                (() => {
                  const questions = block.questions;
                  const numCols = 2;
                  const columns: Question[][] = Array.from({ length: numCols }, () => []);
                  questions.forEach((q, idx) => {
                    const col = idx % numCols;
                    columns[col].push(q);
                  });
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {columns.map((colQuestions, colIdx) => (
                        <div key={colIdx} style={{display:'flex',flexDirection:'column',gap:8}}>
                          {colQuestions.map((question) => (
                    <div key={question.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--pa-bdr)'}}>
                      <span style={{fontWeight:700,color:'var(--pa-pur2)',fontFamily:'var(--pa-fm)',fontSize:13,minWidth:'2rem'}}>{question.id}.</span>
                      <div style={{flex:1,display:'flex',alignItems:'center',gap:12}}>
                        <div style={{flex:1}}>
                          <MathQuestion question={question} showAnswer={false} hideSerialNumber={true} largeFont={true} />
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={answers[question.id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || (/^-?\d*\.?\d*$/.test(val) && val.length <= 20)) {
                              handleAnswerChange(question.id, val);
                            }
                          }}
                          maxLength={20}
                          className={`pa-answer-input${answers[question.id] ? ' answered' : ''}`}
                          style={{width:110,padding:'8px 12px',fontSize:16,borderRadius:8,borderBottomWidth:2}}
                          placeholder="?"
                        />
                      </div>
                    </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
            );
          })}
        </div>

        {/* Submit Bar */}
        <div style={{position:'sticky',bottom:0,left:0,right:0,background:'rgba(6,7,15,0.9)',backdropFilter:'blur(20px)',borderTop:'1px solid var(--pa-bdr)',padding:'14px clamp(12px,3vw,24px)',zIndex:30}}>
          <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            {/* Progress */}
            <div style={{flex:1,maxWidth:400}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12,color:'var(--pa-muted)',fontFamily:'var(--pa-fm)'}}>
                <span>{answeredCount === totalQuestions ? <span style={{color:'var(--pa-grn)',fontWeight:600}}>All answered!</span> : <span>{totalQuestions - answeredCount} remaining</span>}</span>
                <span>{answeredCount}/{totalQuestions}</span>
              </div>
              <div style={{height:4,background:'var(--pa-bdr)',borderRadius:99}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,var(--pa-pur),var(--pa-grn))',borderRadius:99,width:`${totalQuestions ? (answeredCount/totalQuestions)*100 : 0}%`,transition:'width 0.3s ease'}} />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              style={{padding:'12px 32px',background:'linear-gradient(135deg,var(--pa-grn),var(--pa-grn2))',color:'white',borderRadius:12,fontWeight:700,fontFamily:'var(--pa-fb)',fontSize:15,border:'none',cursor:submitting||answeredCount===0?'not-allowed':'pointer',opacity:submitting||answeredCount===0?0.5:1,boxShadow:'0 4px 20px rgba(16,185,129,0.3)',display:'flex',alignItems:'center',gap:8,transition:'all 0.2s'}}
            >
              {submitting ? (
                <>
                  <div style={{width:18,height:18,border:'2px solid white',borderTopColor:'transparent',borderRadius:'50%',animation:'pa-spin 0.8s linear infinite'}}></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckSquare style={{width:18,height:18}} />
                  Submit Paper
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div style={{margin:'16px 0',padding:'14px 16px',background:'var(--pa-rdim)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:12,color:'var(--pa-red)',fontFamily:'var(--pa-fb)',fontSize:14}}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
