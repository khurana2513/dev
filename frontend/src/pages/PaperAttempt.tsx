import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { 
  startPaperAttempt, 
  submitPaperAttempt, 
  getPaperAttempt,
  validatePaperAttempt,
  PaperAttempt as PaperAttemptType,
  PaperAttemptDetail,
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
  RotateCcw
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
  const [sessionState, setSessionState] = useState<"idle" | "started" | "in_progress" | "completed" | "aborted" | "recovered">("idle");
  
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
  }, [paperReady, isSubmitted, attemptId, answers, startTime, currentTime]);
  
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
        
        // Verify token exists in localStorage (double-check)
        const token = localStorage.getItem("auth_token");
        if (!token) {
          console.error("❌ [ATTEMPT] isAuthenticated is true but no token in localStorage");
          if (mounted) {
            setError("Authentication token not found. Please log in again.");
            setLoading(false);
            setLocation("/login");
          }
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
          // Double-check token before API call
          const token = localStorage.getItem("auth_token");
          if (!token) {
            throw new Error("Authentication token not found. Please log in again.");
          }
          
          console.log("🟢 [ATTEMPT] Starting attempt API call...");
          const attemptData: PaperAttemptCreate = {
            paper_title: config.title,
            paper_level: config.level,
            paper_config: config,
            generated_blocks: blocks,
            seed: seedValue
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
            
            // If it's an auth error, redirect to login
            if (errorMessage.includes("Not authenticated") || errorMessage.includes("authentication") || errorMessage.includes("token")) {
              console.log("🟡 [ATTEMPT] Auth error detected, redirecting to login");
              setTimeout(() => {
                setLocation("/login");
              }, 1000); // Small delay to show error message
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
    return (
      <div style={{minHeight:'100vh',background:'#06070F',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <style>{`@keyframes pa-spin{to{transform:rotate(360deg)}}@keyframes pa-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{textAlign:'center',animation:'pa-fade-up 0.5s ease'}}>
          <div style={{width:48,height:48,border:'3px solid #7B5CE5',borderTopColor:'transparent',borderRadius:'50%',animation:'pa-spin 0.9s linear infinite',margin:'0 auto 24px'}}></div>
          <div style={{fontSize:18,color:'#B8BDD8',fontFamily:'DM Sans, sans-serif',fontWeight:500}}>Loading paper...</div>
          <div style={{fontSize:12,color:'#525870',marginTop:8,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.08em'}}>PLEASE WAIT</div>
        </div>
      </div>
    );
  }

  if (error && !paperConfig) {
    return (
      <div style={{minHeight:'100vh',background:'#06070F',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{textAlign:'center',maxWidth:420}}>
          <div style={{width:64,height:64,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <XCircle style={{width:32,height:32,color:'#EF4444'}} />
          </div>
          <div style={{color:'#EF4444',marginBottom:16,fontFamily:'DM Sans, sans-serif',fontSize:17,fontWeight:500}}>{error}</div>
          <Link href="/create">
            <button style={{padding:'12px 28px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',color:'white',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'DM Sans, sans-serif',fontWeight:600,fontSize:14,boxShadow:'0 4px 20px rgba(123,92,229,0.25)'}}>
              Go to Paper Creation
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted && result) {
    const accuracy = result.accuracy || 0;
    return (
      <div style={{minHeight:'100vh',background:'#06070F',paddingTop:40,paddingBottom:60}}>
        <style>{`
          @keyframes pa-scale-in{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
          @keyframes pa-fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pa-trophy{0%{transform:scale(0) rotate(-20deg)}60%{transform:scale(1.15) rotate(5deg)}100%{transform:scale(1) rotate(0deg)}}
          @keyframes pa-progress{from{width:0}to{width:var(--acc)}}
          .pa-stat-tile{transition:transform 0.2s,box-shadow 0.2s}
          .pa-stat-tile:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.4)!important}
          .pa-action-btn{transition:all 0.2s;cursor:pointer;border:none}
          .pa-action-btn:hover{filter:brightness(1.15);transform:translateY(-2px)}
          .pa-review-card{transition:all 0.2s}
          .pa-review-card:hover{border-color:rgba(255,255,255,0.15)!important}
        `}</style>
        <div style={{maxWidth:760,margin:'0 auto',padding:'0 16px'}}>
          <Link href="/dashboard">
            <button style={{marginBottom:20,display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#0F1120',border:'1px solid rgba(255,255,255,0.08)',color:'#B8BDD8',borderRadius:12,cursor:'pointer',fontFamily:'DM Sans, sans-serif',fontWeight:500,fontSize:14}}>
              <ArrowLeft style={{width:16,height:16}} />
              Back to Dashboard
            </button>
          </Link>

          <div style={{background:'#0F1120',borderRadius:20,padding:'40px 36px',marginBottom:20,border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 24px 60px rgba(0,0,0,0.5)',animation:'pa-scale-in 0.4s cubic-bezier(0.34,1.2,0.64,1)',overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7B5CE5,#10B981)'}} />
            <div style={{textAlign:'center',marginBottom:32}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#10B981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 32px rgba(16,185,129,0.4)',animation:'pa-trophy 0.6s cubic-bezier(0.34,1.56,0.64,1)'}}>
                <Trophy style={{width:36,height:36,color:'white'}} />
              </div>
              <h1 style={{fontSize:32,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'0 0 8px'}}>Paper Completed!</h1>
              <p style={{color:'#525870',fontFamily:'DM Sans, sans-serif',fontSize:15,margin:0}}>{paperConfig?.title}</p>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
              {[{val:result.correct_answers,label:'Correct',color:'#10B981',bg:'rgba(16,185,129,0.1)',border:'rgba(16,185,129,0.25)'},{val:result.wrong_answers,label:'Wrong',color:'#EF4444',bg:'rgba(239,68,68,0.1)',border:'rgba(239,68,68,0.25)'},{val:result.total_questions-result.correct_answers-result.wrong_answers,label:'Unattempted',color:'#F59E0B',bg:'rgba(245,158,11,0.1)',border:'rgba(245,158,11,0.25)'},{val:result.accuracy.toFixed(1)+'%',label:'Accuracy',color:'#9D7FF0',bg:'rgba(123,92,229,0.1)',border:'rgba(123,92,229,0.25)'},{val:result.points_earned,label:'Points',color:'#10B981',bg:'rgba(16,185,129,0.08)',border:'rgba(16,185,129,0.2)'}].map(({val,label,color,bg,border})=>(
                <div key={label} className="pa-stat-tile" style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:'18px 8px',textAlign:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
                  <div style={{fontSize:28,fontWeight:800,color,fontFamily:'JetBrains Mono, monospace',lineHeight:1}}>{val}</div>
                  <div style={{fontSize:12,color:'#B8BDD8',fontFamily:'DM Sans, sans-serif',marginTop:6,fontWeight:500}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Accuracy bar */}
            <div style={{marginBottom:24}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',fontWeight:500}}>ACCURACY</span>
                <span style={{fontSize:12,color:'#9D7FF0',fontFamily:'JetBrains Mono, monospace',fontWeight:600}}>{result.accuracy.toFixed(1)}%</span>
              </div>
              <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#7B5CE5,#10B981)',borderRadius:99,width:`${result.accuracy}%`,transition:'width 1s ease'}} />
              </div>
            </div>

            <div style={{background:'#141729',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'20px 24px',marginBottom:24}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,textAlign:'center'}}>
                <div>
                  <div style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',fontWeight:500,marginBottom:4}}>TIME TAKEN</div>
                  <div style={{fontSize:24,fontWeight:700,color:'#F0F2FF',fontFamily:'JetBrains Mono, monospace'}}>
                    {result.time_taken ? formatTime(Math.floor(result.time_taken)) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',fontWeight:500,marginBottom:4}}>SCORE</div>
                  <div style={{fontSize:24,fontWeight:700,color:'#F0F2FF',fontFamily:'JetBrains Mono, monospace'}}>
                    {result.score} / {result.total_questions}
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <button
                onClick={handleReAttempt}
                disabled={reAttempting || !paperConfig || !generatedBlocks || seed === null}
                className="pa-action-btn"
                style={{padding:'14px 20px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',color:'white',borderRadius:12,fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:14,boxShadow:'0 4px 20px rgba(123,92,229,0.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:reAttempting||!paperConfig||!generatedBlocks||seed===null?0.5:1}}
              >
                <RotateCcw style={{width:16,height:16,animation:reAttempting?'pa-spin 0.8s linear infinite':undefined}} />
                {reAttempting ? 'Starting...' : 'Re-attempt'}
              </button>
              <Link href="/dashboard" style={{textDecoration:'none'}}>
                <button className="pa-action-btn" style={{width:'100%',padding:'14px 20px',background:'linear-gradient(135deg,#10B981,#059669)',color:'white',borderRadius:12,fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:14,boxShadow:'0 4px 20px rgba(16,185,129,0.3)'}}>
                  Dashboard
                </button>
              </Link>
              <Link href="/create" style={{textDecoration:'none'}}>
                <button className="pa-action-btn" style={{width:'100%',padding:'14px 20px',background:'#141729',border:'1px solid rgba(255,255,255,0.1)',color:'#B8BDD8',borderRadius:12,fontWeight:600,fontFamily:'DM Sans, sans-serif',fontSize:14}}>
                  Create New
                </button>
              </Link>
            </div>
          </div>

          {/* Results breakdown */}
          <div style={{background:'#0F1120',borderRadius:20,padding:'32px 36px',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 24px 60px rgba(0,0,0,0.4)',animation:'pa-fade-up 0.5s ease 0.2s both'}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",marginBottom:24}}>Question Review</h2>
            
            {/* Separate questions into categories */}
            {(() => {
              const allQuestions: Array<{ question: Question; blockIdx: number; blockTitle?: string }> = [];
              generatedBlocks.forEach((block, blockIdx) => {
                block.questions.forEach((question) => {
                  allQuestions.push({ question, blockIdx, blockTitle: block.config.title });
                });
              });

              const correctQuestions = allQuestions.filter(({ question }) => {
                const userAnswerStr = answers[question.id];
                if (userAnswerStr === undefined) return false;
                // For large integers, compare as strings to avoid precision loss
                const userAnswerTrimmed = userAnswerStr.trim();
                const correctAnswerStr = String(question.answer);
                const userHasDecimal = userAnswerTrimmed.includes('.');
                const correctHasDecimal = correctAnswerStr.includes('.') || String(question.answer).includes('e') || String(question.answer).includes('E');
                
                if (!userHasDecimal && !correctHasDecimal) {
                  // Both are integers - compare as strings
                  return userAnswerTrimmed === correctAnswerStr;
                } else {
                  // At least one has decimals - use float comparison with tolerance
                  const userAnswer = parseFloat(userAnswerTrimmed);
                  return !isNaN(userAnswer) && Math.abs(userAnswer - question.answer) < 0.01;
                }
              });

              const wrongQuestions = allQuestions.filter(({ question }) => {
                const userAnswerStr = answers[question.id];
                if (userAnswerStr === undefined) return false;
                // For large integers, compare as strings to avoid precision loss
                const userAnswerTrimmed = userAnswerStr.trim();
                const correctAnswerStr = String(question.answer);
                const userHasDecimal = userAnswerTrimmed.includes('.');
                const correctHasDecimal = correctAnswerStr.includes('.') || String(question.answer).includes('e') || String(question.answer).includes('E');
                
                if (!userHasDecimal && !correctHasDecimal) {
                  // Both are integers - compare as strings
                  return userAnswerTrimmed !== correctAnswerStr;
                } else {
                  // At least one has decimals - use float comparison with tolerance
                  const userAnswer = parseFloat(userAnswerTrimmed);
                  return !isNaN(userAnswer) && Math.abs(userAnswer - question.answer) >= 0.01;
                }
              });

              const unattemptedQuestions = allQuestions.filter(({ question }) => {
                return answers[question.id] === undefined;
              });

              return (
                <div className="space-y-8">
                  {correctQuestions.length > 0 && (
                    <div>
                      <h3 style={{fontSize:18,fontWeight:700,color:'#10B981',fontFamily:"'Playfair Display', Georgia, serif",marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                        <CheckCircle2 style={{width:20,height:20}} />
                        Correct Answers ({correctQuestions.length})
                      </h3>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {correctQuestions.map(({ question, blockTitle }) => {
                          const userAnswerStr = answers[question.id] || "";
                          return (
                            <div
                              key={question.id}
                              className="pa-review-card"
                              style={{padding:'14px 16px',borderRadius:12,border:'1px solid rgba(16,185,129,0.25)',background:'rgba(16,185,129,0.07)'}}
                            >
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                                <div style={{flex:1}}>
                                  {blockTitle && (
                                    <p style={{fontSize:11,color:'rgba(16,185,129,0.7)',marginBottom:4,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.06em',textTransform:'uppercase'}}>{blockTitle}</p>
                                  )}
                                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                                    <span style={{fontWeight:600,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif'}}>Q{question.id}:</span>
                                    <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:16,fontSize:13}}>
                                    <span style={{color:'#10B981',fontFamily:'DM Sans, sans-serif'}}>Your answer: <span style={{fontWeight:600}}>{userAnswerStr}</span></span>
                                    <span style={{color:'#525870',fontFamily:'DM Sans, sans-serif'}}>Correct: <span style={{fontWeight:600,color:'#B8BDD8'}}>{question.answer}</span></span>
                                  </div>
                                </div>
                                <CheckCircle2 style={{width:20,height:20,color:'#10B981',flexShrink:0,marginLeft:12}} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {wrongQuestions.length > 0 && (
                    <div>
                      <h3 style={{fontSize:18,fontWeight:700,color:'#EF4444',fontFamily:"'Playfair Display', Georgia, serif",marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                        <XCircle style={{width:20,height:20}} />
                        Wrong Answers ({wrongQuestions.length})
                      </h3>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {wrongQuestions.map(({ question, blockTitle }) => {
                          const userAnswerStr = answers[question.id] || "";
                          return (
                            <div key={question.id} className="pa-review-card" style={{padding:'14px 16px',borderRadius:12,border:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.07)'}}>
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                                <div style={{flex:1}}>
                                  {blockTitle && (<p style={{fontSize:11,color:'rgba(239,68,68,0.7)',marginBottom:4,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.06em',textTransform:'uppercase'}}>{blockTitle}</p>)}
                                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                                    <span style={{fontWeight:600,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif'}}>Q{question.id}:</span>
                                    <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:16,fontSize:13}}>
                                    <span style={{color:'#EF4444',fontFamily:'DM Sans, sans-serif'}}>Your answer: <span style={{fontWeight:600}}>{userAnswerStr}</span></span>
                                    <span style={{color:'#525870',fontFamily:'DM Sans, sans-serif'}}>Correct: <span style={{fontWeight:600,color:'#B8BDD8'}}>{question.answer}</span></span>
                                  </div>
                                </div>
                                <XCircle style={{width:20,height:20,color:'#EF4444',flexShrink:0,marginLeft:12}} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {unattemptedQuestions.length > 0 && (
                    <div>
                      <h3 style={{fontSize:18,fontWeight:700,color:'#F59E0B',fontFamily:"'Playfair Display', Georgia, serif",marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                        <Square style={{width:20,height:20}} />
                        Unattempted ({unattemptedQuestions.length})
                      </h3>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {unattemptedQuestions.map(({ question, blockTitle }) => (
                          <div key={question.id} className="pa-review-card" style={{padding:'14px 16px',borderRadius:12,border:'1px solid rgba(245,158,11,0.25)',background:'rgba(245,158,11,0.07)'}}>
                            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                              <div style={{flex:1}}>
                                {blockTitle && (<p style={{fontSize:11,color:'rgba(245,158,11,0.7)',marginBottom:4,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.06em',textTransform:'uppercase'}}>{blockTitle}</p>)}
                                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                                  <span style={{fontWeight:600,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif'}}>Q{question.id}:</span>
                                  <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                </div>
                                <div style={{display:'flex',alignItems:'center',gap:16,fontSize:13}}>
                                  <span style={{color:'#F59E0B',fontFamily:'DM Sans, sans-serif'}}>Your answer: <span style={{fontWeight:600}}>—</span></span>
                                  <span style={{color:'#525870',fontFamily:'DM Sans, sans-serif'}}>Correct: <span style={{fontWeight:600,color:'#B8BDD8'}}>{question.answer}</span></span>
                                </div>
                              </div>
                              <Square style={{width:20,height:20,color:'#F59E0B',flexShrink:0,marginLeft:12}} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Safety check - don't render if we don't have the necessary data
  if (!paperConfig || !generatedBlocks || generatedBlocks.length === 0) {
    if (error) {
      return (
        <div style={{minHeight:'100vh',background:'#06070F',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{textAlign:'center'}}>
            <div style={{color:'#EF4444',marginBottom:16,fontFamily:'DM Sans, sans-serif',fontSize:17}}>{error}</div>
            <Link href="/create">
              <button style={{padding:'12px 28px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',color:'white',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'DM Sans, sans-serif',fontWeight:600,fontSize:14}}>
                Go to Paper Creation
              </button>
            </Link>
          </div>
        </div>
      );
    }
    // Still loading or no data
    return (
      <div style={{minHeight:'100vh',background:'#06070F',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:48,height:48,border:'3px solid #7B5CE5',borderTopColor:'transparent',borderRadius:'50%',animation:'pa-spin 0.9s linear infinite',margin:'0 auto 24px'}}></div>
          <div style={{fontSize:18,color:'#B8BDD8',fontFamily:'DM Sans, sans-serif'}}>Loading paper...</div>
        </div>
      </div>
    );
  }

  // Start screen overlay
  if (showStartScreen && paperReady) {
    const totalQuestions = generatedBlocks.reduce((sum: number, block: GeneratedBlock) => 
      sum + (block.questions?.length || 0), 0);
    
    return (
      <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(16px)'}}>
        <style>{`@keyframes pa-scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{background:'#0F1120',borderRadius:20,padding:'36px 32px',maxWidth:460,width:'calc(100% - 32px)',position:'relative',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',overflow:'hidden',animation:'pa-scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1)'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7B5CE5,#9D7FF0)'}} />
          <button
            onClick={() => setShowStartScreen(false)}
            style={{position:'absolute',top:16,right:16,color:'#525870',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:6,transition:'all 0.2s'}}
            title="Close"
          >
            <X style={{width:16,height:16}} />
          </button>
          <div style={{textAlign:'center',marginBottom:28,marginTop:8}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,rgba(123,92,229,0.2),rgba(157,127,240,0.1))',border:'1px solid rgba(123,92,229,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
              <Target style={{width:26,height:26,color:'#9D7FF0'}} />
            </div>
            <h2 style={{fontSize:26,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'0 0 6px'}}>{paperConfig.title}</h2>
            <p style={{color:'#525870',fontFamily:'JetBrains Mono, monospace',fontSize:12,letterSpacing:'0.1em',textTransform:'uppercase',margin:0}}>{paperConfig.level}</p>
          </div>
          
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#141729',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10}}>
              <span style={{color:'#B8BDD8',fontFamily:'DM Sans, sans-serif',fontWeight:500,fontSize:14}}>Total Questions:</span>
              <span style={{color:'#F0F2FF',fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:20}}>{totalQuestions}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#141729',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10}}>
              <span style={{color:'#B8BDD8',fontFamily:'DM Sans, sans-serif',fontWeight:500,fontSize:14}}>Blocks:</span>
              <span style={{color:'#F0F2FF',fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:20}}>{generatedBlocks.length}</span>
            </div>
          </div>

          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'12px 16px',marginBottom:24}}>
            <p style={{fontSize:13,color:'#F59E0B',fontFamily:'DM Sans, sans-serif',margin:0,lineHeight:1.6}}>
              <strong>Note:</strong> The timer will start as soon as you click "Start Paper". Make sure you're ready before proceeding.
            </p>
          </div>

          <div style={{display:'flex',gap:12}}>
            <Link href="/create" style={{flex:1}}>
              <button style={{width:'100%',padding:'14px 24px',background:'#141729',border:'1px solid rgba(255,255,255,0.08)',color:'#B8BDD8',borderRadius:12,fontWeight:600,fontFamily:'DM Sans, sans-serif',cursor:'pointer',fontSize:14}}>
                Cancel
              </button>
            </Link>
            <button
              onClick={handleStartPaper}
              style={{flex:1,padding:'14px 24px',background:'linear-gradient(135deg,#10B981,#059669)',color:'white',border:'none',borderRadius:12,fontWeight:700,fontFamily:'DM Sans, sans-serif',cursor:'pointer',fontSize:14,boxShadow:'0 4px 20px rgba(16,185,129,0.3)'}}
            >
              Start Paper
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#06070F',paddingBottom:120}}>
      <style>{`
        @keyframes pa-spin{to{transform:rotate(360deg)}}
        @keyframes pa-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pa-timer-tick{0%,100%{opacity:1}50%{opacity:0.7}}
        .pa-qcard{background:#141729;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:8px;transition:all 0.2s}
        .pa-qcard:hover{border-color:rgba(123,92,229,0.35);box-shadow:0 4px 20px rgba(123,92,229,0.1)}
        .pa-answer-input{background:#0F1120;border:none;border-bottom:1.5px solid rgba(255,255,255,0.15);border-radius:0;color:#F0F2FF;font-family:'JetBrains Mono',monospace;font-weight:600;text-align:center;transition:all 0.2s;outline:none}
        .pa-answer-input:focus{border-bottom-color:#7B5CE5;box-shadow:none;background:rgba(123,92,229,0.05)}
        .pa-answer-input.answered{border-bottom-color:#10B981;color:#10B981}
        .pa-block-card{border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.06);transition:all 0.3s;animation:pa-fade-up 0.4s ease both}
      `}</style>

      {/* Sticky Header */}
      <header style={{position:'sticky',top:0,zIndex:40,height:68,background:'rgba(6,7,15,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',padding:'0 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',width:'100%',maxWidth:1100,margin:'0 auto',gap:16}}>
          {/* Left: Exit */}
          <div>
            <button
              onClick={() => setShowExitConfirm(true)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#B8BDD8',cursor:'pointer',fontFamily:'DM Sans, sans-serif',fontWeight:500,fontSize:13}}
            >
              <ArrowLeft style={{width:15,height:15}} />
              Exit Paper
            </button>
          </div>
          {/* Center: Title */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Target style={{width:18,height:18,color:'#7B5CE5',flexShrink:0}} />
            <h1 style={{fontSize:17,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:360}}>{paperConfig.title}</h1>
          </div>
          {/* Right: Timer + Progress */}
          <div style={{display:'flex',alignItems:'center',gap:16,justifyContent:'flex-end'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10}}>
              <Clock style={{width:14,height:14,color:'#7B5CE5'}} />
              <span style={{fontSize:16,fontWeight:700,color:'#F0F2FF',fontFamily:'JetBrains Mono, monospace',animation:'pa-timer-tick 1s ease-in-out infinite'}}>{formatTime(currentTime)}</span>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:'#525870',fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.06em'}}>{answeredCount}/{totalQuestions}</div>
          </div>
        </div>
      </header>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)'}}>
          <div style={{background:'#0F1120',borderRadius:16,padding:'28px 32px',maxWidth:420,width:'calc(100% - 32px)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}>
            <h3 style={{fontSize:20,fontWeight:700,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",marginBottom:8}}>Exit Paper?</h3>
            <p style={{color:'#B8BDD8',fontFamily:'DM Sans, sans-serif',fontSize:14,marginBottom:24,lineHeight:1.6}}>
              Your progress will be saved, but the timer will stop. Are you sure you want to exit?
            </p>
            <div style={{display:'flex',gap:12}}>
              <button
                onClick={() => { setShowExitConfirm(false); }}
                style={{flex:1,padding:'12px 20px',background:'#141729',border:'1px solid rgba(255,255,255,0.08)',color:'#B8BDD8',borderRadius:10,fontWeight:600,fontFamily:'DM Sans, sans-serif',cursor:'pointer',fontSize:14}}
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
                style={{flex:1,padding:'12px 20px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444',borderRadius:10,fontWeight:600,fontFamily:'DM Sans, sans-serif',cursor:'pointer',fontSize:14}}
              >
                Exit Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px 0'}}>
        <div style={{display:'flex',flexDirection:'column',gap:20,marginBottom:24}}>
          {generatedBlocks.map((block, blockIdx) => {
            if (!block || !block.questions || block.questions.length === 0) {
              return null;
            }
            return (
            <div key={blockIdx} className="pa-block-card" style={{background:'#0F1120',animationDelay:`${blockIdx*0.07}s`}}>
              {block.config?.title && (
                <h2 style={{fontSize:15,fontWeight:700,color:'#9D7FF0',fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.08em',textTransform:'uppercase'}}>{block.config.title}</h2>
              )}
              
              {block.questions.some(q => q?.isVertical) ? (
                // Vertical questions
                <div className="grid grid-cols-10 gap-2">
                  {block.questions.map((question) => (
                    <div key={question.id} className="pa-qcard" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                      <div style={{textAlign:'center',marginBottom:4}}>
                        <span style={{fontWeight:700,color:'#9D7FF0',fontFamily:'JetBrains Mono, monospace',fontSize:11}}>{question.id}.</span>
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
                    <div key={question.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontWeight:700,color:'#9D7FF0',fontFamily:'JetBrains Mono, monospace',fontSize:13,minWidth:'2rem'}}>{question.id}.</span>
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
        <div style={{position:'sticky',bottom:0,left:0,right:0,background:'rgba(6,7,15,0.9)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.07)',padding:'14px 24px',zIndex:30}}>
          <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            {/* Progress */}
            <div style={{flex:1,maxWidth:400}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12,color:'#525870',fontFamily:'JetBrains Mono, monospace'}}>
                <span>{answeredCount === totalQuestions ? <span style={{color:'#10B981',fontWeight:600}}>All answered!</span> : <span>{totalQuestions - answeredCount} remaining</span>}</span>
                <span>{answeredCount}/{totalQuestions}</span>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:99}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#7B5CE5,#10B981)',borderRadius:99,width:`${totalQuestions ? (answeredCount/totalQuestions)*100 : 0}%`,transition:'width 0.3s ease'}} />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              style={{padding:'12px 32px',background:'linear-gradient(135deg,#10B981,#059669)',color:'white',borderRadius:12,fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:15,border:'none',cursor:submitting||answeredCount===0?'not-allowed':'pointer',opacity:submitting||answeredCount===0?0.5:1,boxShadow:'0 4px 20px rgba(16,185,129,0.3)',display:'flex',alignItems:'center',gap:8,transition:'all 0.2s'}}
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
          <div style={{margin:'16px 0',padding:'14px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:12,color:'#EF4444',fontFamily:'DM Sans, sans-serif',fontSize:14}}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

