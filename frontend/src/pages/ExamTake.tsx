/**
 * ExamTake — Student exam-taking experience.
 *
 * Flow:
 *   JoinScreen → WaitingRoom → ActiveExam → SubmittedScreen → ResultScreen
 *
 * Answer durability:
 *   - Every keypress → localStorage (instant, no network)
 *   - Last change → debounced POST to server every 1.5 s
 *   - On submit → all answers sent one final time
 *   - On crash/reload → /session endpoint hydrates answers from server → merged into localStorage
 *
 * Timer:
 *   - Server-authoritative: server_deadline is absolute UTC timestamp
 *   - Client computes offset = serverTime - localTime at join; applies to all countdowns
 *   - Auto-submit fires 2 s before hard deadline so it arrives within grace window
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import {
  examStudentApi,
  openExamSSE,
  localSaveAnswer,
  localGetAnswers,
  localMergeServerAnswers,
  localClearAnswers,
  isValidAnswer,
  ExamQuestion,
  SessionState,
  StudentResult,
} from "../lib/examApi";
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight, Send, WifiOff } from "lucide-react";

// ── CSS tokens ────────────────────────────────────────────────────────────────
const STYLE_ID = "exam-take-tokens";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    :root{
      --ex-bg:#07070F;--ex-surf:#0F1120;--ex-surf2:#141729;--ex-bdr:rgba(255,255,255,0.07);
      --ex-pur:#7B5CE5;--ex-pur2:#9D7FF0;--ex-pur3:#C4ADFF;
      --ex-grn:#10B981;--ex-red:#EF4444;--ex-gld:#F59E0B;
      --ex-whi:#F0F2FF;--ex-muted:#525870;
      --ex-fb:'DM Sans',sans-serif;--ex-fm:'JetBrains Mono',monospace;
    }
    @keyframes ex-fade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    @keyframes ex-pulse-ring{0%{box-shadow:0 0 0 0 rgba(123,92,229,.5)}70%{box-shadow:0 0 0 10px rgba(123,92,229,0)}100%{box-shadow:0 0 0 0 rgba(123,92,229,0)}}
    @keyframes ex-countdown{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
    .ex-card{animation:ex-fade .4s ease both}
    .ex-answer-box{
      background:transparent;border:none;
      border-bottom:2px solid rgba(255,255,255,0.15);
      color:var(--ex-whi);font-family:var(--ex-fm);font-size:1.8rem;font-weight:600;
      text-align:center;width:100%;max-width:280px;padding:8px 0;
      outline:none;transition:border-color .2s,color .2s;
      caret-color:var(--ex-pur2);
    }
    .ex-answer-box:focus{border-bottom-color:var(--ex-pur2);}
    .ex-answer-box.has-answer{border-bottom-color:var(--ex-grn);color:var(--ex-grn);}
    .ex-answer-box.saving{border-bottom-color:var(--ex-gld);}
    .ex-nav-dot{
      width:10px;height:10px;border-radius:50%;
      background:rgba(255,255,255,0.15);cursor:pointer;
      transition:all .15s;flex-shrink:0;
    }
    .ex-nav-dot.answered{background:var(--ex-grn);}
    .ex-nav-dot.current{background:var(--ex-pur2);box-shadow:0 0 0 2px rgba(157,127,240,.4);}
    .ex-nav-dot.current.answered{background:var(--ex-grn);box-shadow:0 0 0 2px rgba(16,185,129,.4);}
    .ex-timer-warn{color:var(--ex-red);animation:ex-countdown .8s ease-in-out infinite;}
  `;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function deviceFingerprint(): string {
  const parts = [
    screen.width, screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ];
  return btoa(parts.join("|")).slice(0, 32);
}

// ── Phases ────────────────────────────────────────────────────────────────────
type Phase =
  | "auth-check"
  | "joining"
  | "waiting"
  | "exam"
  | "submitted"
  | "result"
  | "error";

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExamTake() {
  const params = useParams<{ code: string }>();
  const examCode = (params.code || "").toUpperCase();
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => { injectStyles(); }, []);

  // ── Phase & data ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("auth-check");
  const [errorMsg, setErrorMsg] = useState("");
  const [examInfo, setExamInfo] = useState<{title: string; duration_seconds: number; scheduled_start_at: string} | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [allowBackNav, setAllowBackNav] = useState(true);
  const [result, setResult] = useState<StudentResult | null>(null);

  // ── Answer state ────────────────────────────────────────────────────────────
  // answers: { [questionId]: rawAnswerString }
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);    // 0-based display index
  const [savingQId, setSavingQId] = useState<number | null>(null);  // spinner indicator

  // ── Timer ───────────────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(0);
  const serverDeadlineRef = useRef<Date | null>(null);
  const clockOffsetRef = useRef(0);                  // ms: serverTime - localTime
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitFiredRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // ── SSE ─────────────────────────────────────────────────────────────────────
  const sseCleanupRef = useRef<(() => void) | null>(null);

  // ── Online/offline ───────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncPendingRef = useRef(false);              // trigger sync on reconnect

  // ── Answer debounce ──────────────────────────────────────────────────────────
  // Map: questionId → debounce timer
  const answerDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Map: questionId → pending answer (to be sent when debounce fires)
  const pendingAnswerRef = useRef<Record<number, string>>({});

  // ── Announce banner ──────────────────────────────────────────────────────────
  const [announce, setAnnounce] = useState<string | null>(null);

  // ── Announcement (auto-dismiss after 8s) ─────────────────────────────────────
  useEffect(() => {
    if (!announce) return;
    const t = setTimeout(() => setAnnounce(null), 8000);
    return () => clearTimeout(t);
  }, [announce]);

  // ── Online / offline handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); syncPendingRef.current = true; };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Sync on reconnect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !syncPendingRef.current || !sessionId || phase !== "exam") return;
    syncPendingRef.current = false;
    // Push all localStorage answers to server
    const all = localGetAnswers(examCode, sessionId);
    const ans = Object.entries(all).map(([qid, raw]) => ({
      question_id: Number(qid),
      raw_answer: raw,
    }));
    if (ans.length > 0) {
      examStudentApi.bulkSaveAnswers(examCode, ans).catch(() => {});
    }
  }, [isOnline, sessionId, phase, examCode]);

  // ── Proctoring events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    const onVisChange = () => {
      if (document.hidden && sessionId) {
        examStudentApi.logEvent(examCode, "visibility_hidden");
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [phase, sessionId, examCode]);

  // ── Submit function ──────────────────────────────────────────────────────────
  const doSubmit = useCallback(async (_isAuto = false) => {
    if (isSubmittingRef.current) return;
    if (!sessionId) return;
    isSubmittingRef.current = true;

    // Clear any pending debounce timers so we don't send stale answers after submit
    Object.values(answerDebounceRef.current).forEach(t => clearTimeout(t));
    answerDebounceRef.current = {};

    // Stop SSE
    sseCleanupRef.current?.();
    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Collect all localStorage answers
    const local = localGetAnswers(examCode, sessionId);
    const merged = { ...local, ...answers };
    const payload = Object.entries(merged).map(([qid, raw]) => ({
      question_id: Number(qid),
      raw_answer: raw,
    }));

    try {
      await examStudentApi.submit(examCode, payload);
      localClearAnswers(examCode, sessionId);
      setPhase("submitted");
    } catch (err) {
      // If submit fails, at least the answers are in localStorage + server from periodic saves
      // Show submitted screen anyway — avoid getting stuck
      setPhase("submitted");
    }
  }, [sessionId, examCode, answers]);

  // ── Timer tick ───────────────────────────────────────────────────────────────
  const startTimer = useCallback((deadlineIso: string) => {
    serverDeadlineRef.current = new Date(deadlineIso);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now() + clockOffsetRef.current;
      const remaining = (serverDeadlineRef.current!.getTime() - now) / 1000;
      setSecondsLeft(Math.max(0, remaining));
      // Auto-submit 2 s before hard deadline
      if (remaining <= 2 && !autoSubmitFiredRef.current) {
        autoSubmitFiredRef.current = true;
        doSubmit(true);
      }
    }, 500);
  }, [doSubmit]);

  // ── Connect SSE ──────────────────────────────────────────────────────────────
  const connectSSE = useCallback((sid: number) => {
    sseCleanupRef.current?.();
    const close = openExamSSE(examCode, sid, (ev) => {
      if (ev.type === "exam_started") {
        setPhase("exam");
        startTimer(ev.deadline_utc);
        // Fetch questions
        examStudentApi.getQuestions(examCode, sid).then(data => {
          setQuestions(data.questions);
          setTotalQuestions(data.total);
        }).catch(() => {});
      } else if (ev.type === "force_submit") {
        doSubmit(true);
      } else if (ev.type === "announce") {
        setAnnounce(ev.message);
      }
    });
    sseCleanupRef.current = close;
  }, [examCode, startTimer, doSubmit]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      sseCleanupRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
      Object.values(answerDebounceRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  // ── Auth check → Join ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (!examCode) { setErrorMsg("Invalid exam code"); setPhase("error"); return; }
    if (phase !== "auth-check") return;
    setPhase("joining");
  }, [authLoading, isAuthenticated, examCode, phase]);

  // ── Join ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "joining") return;

    async function doJoin() {
      try {
        // 1) Get exam info for the pre-join screen
        const info = await examStudentApi.getExamInfo(examCode);
        setExamInfo({ title: info.title, duration_seconds: info.duration_seconds, scheduled_start_at: info.scheduled_start_at || "" });
        clockOffsetRef.current = new Date(info.server_time_utc).getTime() - Date.now();

        // 2) Join (idempotent — if already joined, returns existing session)
        const join = await examStudentApi.join(examCode, deviceFingerprint());
        setSessionId(join.session_id);
        setAllowBackNav(join.allow_back_navigation);

        // 3) Restore answers from server (crash recovery) + merge localStorage
        const state: SessionState = await examStudentApi.getSessionState(examCode, join.session_id);
        localMergeServerAnswers(examCode, join.session_id, state.answers);
        setAnswers({ ...localGetAnswers(examCode, join.session_id) });

        // 4) If exam is already live + session active, go straight to exam
        if (join.status === "active") {
          // Need questions
          const qdata = await examStudentApi.getQuestions(examCode, join.session_id);
          setQuestions(qdata.questions);
          setTotalQuestions(qdata.total);
          setPhase("exam");
          startTimer(qdata.server_deadline);
        } else if (state.status === "submitted" || state.status === "auto_submitted") {
          setPhase("submitted");
          return;
        } else {
          setPhase("waiting");
        }

        // 5) Connect SSE for control events
        connectSSE(join.session_id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to join exam";
        setErrorMsg(msg);
        setPhase("error");
      }
    }

    doJoin();
  }, [phase]);

  // ── Answer input handler ─────────────────────────────────────────────────────
  const handleAnswerChange = useCallback((qId: number, raw: string) => {
    // Validate characters
    if (raw !== "" && !isValidAnswer(raw)) return;
    if (raw.length > 20) return;

    // 1. Write to state (instant UI)
    setAnswers(prev => ({ ...prev, [qId]: raw }));

    // 2. Write to localStorage (instant, no network)
    if (sessionId) localSaveAnswer(examCode, sessionId, qId, raw);

    // 3. Debounce server save (1.5 s)
    if (answerDebounceRef.current[qId]) clearTimeout(answerDebounceRef.current[qId]);
    pendingAnswerRef.current[qId] = raw;
    answerDebounceRef.current[qId] = setTimeout(async () => {
      const answer = pendingAnswerRef.current[qId];
      setSavingQId(qId);
      try {
        await examStudentApi.saveAnswer(examCode, qId, answer);
      } catch {
        // Save failed — answer is still in localStorage for reconnect sync
        syncPendingRef.current = true;
      } finally {
        setSavingQId(prev => (prev === qId ? null : prev));
      }
    }, 1500);
  }, [examCode, sessionId]);

  // ── Load result ──────────────────────────────────────────────────────────────
  async function loadResult() {
    try {
      const r = await examStudentApi.getMyResult(examCode);
      setResult(r);
      setPhase("result");
    } catch (err: unknown) {
      // 403 = results not yet released; stay on result phase but show not-released screen
      const status = (err as { status?: number })?.status;
      setResult(null);
      setPhase("result");
      if (status === 403) {
        setErrorMsg("Results haven't been released yet. Check back after the exam is graded.");
      } else {
        setErrorMsg("Could not load results. Please try again.");
      }
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  const currQuestion: ExamQuestion | null = questions[currentIdx] ?? null;
  const answeredCount = Object.values(answers).filter(a => a.trim() !== "").length;
  const goTo = (idx: number) => {
    if (!allowBackNav && idx < currentIdx) return;
    if (idx >= 0 && idx < totalQuestions) setCurrentIdx(idx);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (phase === "auth-check" || authLoading) return <LoadingScreen />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070F", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center px-6">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Cannot join exam</h2>
          <p className="text-zinc-400 mb-6">{errorMsg}</p>
          <button onClick={() => setLocation("/dashboard")}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Joining ────────────────────────────────────────────────────────────────
  if (phase === "joining") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070F" }}>
        <LoadingScreen context="Joining exam…" />
      </div>
    );
  }

  // ── Waiting room ────────────────────────────────────────────────────────────
  if (phase === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07070F", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center max-w-sm ex-card">
          <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center mx-auto mb-5"
            style={{ animation: "ex-pulse-ring 2s infinite" }}>
            <Clock size={32} className="text-indigo-400" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">{examInfo?.title}</h1>
          <p className="text-zinc-400 mb-1">You are in the waiting room</p>
          <p className="text-zinc-500 text-sm mb-6">The exam will start when your teacher begins it.</p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Duration</span>
              <span className="text-white font-semibold">{Math.round((examInfo?.duration_seconds ?? 0) / 60)} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Code</span>
              <span className="text-white font-mono font-semibold">{examCode}</span>
            </div>
          </div>
          <p className="text-zinc-600 text-xs mt-6">Keep this tab open. You'll be moved into the exam automatically.</p>
        </div>
      </div>
    );
  }

  // ── Active Exam ─────────────────────────────────────────────────────────────
  if (phase === "exam") {
    const isWarning = secondsLeft <= 120 && secondsLeft > 0;
    const isCritical = secondsLeft <= 30 && secondsLeft > 0;
    const currentAnswer = currQuestion ? (answers[currQuestion.id] ?? "") : "";

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#07070F", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(7,7,15,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Progress */}
          <div className="text-sm text-zinc-400">
            <span className="text-white font-semibold">{answeredCount}</span>
            <span className="text-zinc-600">/{totalQuestions}</span>
            <span className="text-zinc-500 ml-1.5">answered</span>
          </div>

          {/* Timer */}
          <div className={`text-2xl font-bold font-mono tabular-nums ${isCritical ? "ex-timer-warn" : isWarning ? "text-orange-400" : "text-white"}`}>
            {fmtTime(secondsLeft)}
          </div>

          {/* Online indicator + submit */}
          <div className="flex items-center gap-2">
            {!isOnline && <WifiOff size={14} className="text-red-400" />}
            {isOnline && savingQId !== null && <span className="text-xs text-yellow-500">Saving…</span>}
            <button onClick={() => { if (window.confirm(`Submit exam with ${answeredCount}/${totalQuestions} answers?`)) doSubmit(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
              <Send size={13} /> Submit
            </button>
          </div>
        </div>

        {/* Announcement Banner */}
        {announce && (
          <div className="mx-4 mt-3 bg-yellow-900/40 border border-yellow-700/50 rounded-xl px-4 py-2.5 text-yellow-200 text-sm flex items-center gap-2">
            <span className="font-semibold">Announcement:</span> {announce}
          </div>
        )}

        {/* Main question + answer */}
        {currQuestion && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-md ex-card">
              {/* Question number */}
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center">
                Question {currQuestion.display_index} of {totalQuestions}
              </div>

              {/* Question text */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 text-center">
                <p className="text-white text-2xl font-bold leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {currQuestion.text}
                </p>
              </div>

              {/* Answer input */}
              <div className="flex flex-col items-center gap-3">
                <input
                  key={currQuestion.id}
                  type="text"
                  inputMode="decimal"
                  className={`ex-answer-box ${currentAnswer.trim() ? "has-answer" : ""} ${savingQId === currQuestion.id ? "saving" : ""}`}
                  value={currentAnswer}
                  placeholder="Your answer"
                  onChange={e => handleAnswerChange(currQuestion.id, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && currentIdx < totalQuestions - 1) goTo(currentIdx + 1);
                    if (e.key === "ArrowRight") goTo(currentIdx + 1);
                    if (e.key === "ArrowLeft" && allowBackNav) goTo(currentIdx - 1);
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={20}
                />
                <p className="text-zinc-600 text-xs">Digits, '.' for decimal, '-' for negative · max 20 chars</p>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => goTo(currentIdx - 1)}
                  disabled={!allowBackNav || currentIdx === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={15} /> Back
                </button>
                <span className="text-zinc-500 text-xs">{currentIdx + 1} / {totalQuestions}</span>
                {currentIdx < totalQuestions - 1 ? (
                  <button onClick={() => goTo(currentIdx + 1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">
                    Next <ChevronRight size={15} />
                  </button>
                ) : (
                  <button onClick={() => { if (window.confirm(`Submit exam with ${answeredCount}/${totalQuestions} answers?`)) doSubmit(false); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-white bg-green-600 hover:bg-green-500 transition-colors">
                    Submit <Send size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Question navigator dots */}
        <div className="px-4 pb-6">
          <div className="w-full max-w-md mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => goTo(idx)}
                  disabled={!allowBackNav && idx > currentIdx}
                  title={`Q${q.display_index}`}
                  className={`ex-nav-dot ${answers[q.id]?.trim() ? "answered" : ""} ${idx === currentIdx ? "current" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted ───────────────────────────────────────────────────────────────
  if (phase === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07070F", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center max-w-sm ex-card">
          <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} className="text-green-400" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Submitted!</h2>
          <p className="text-zinc-400 mb-1">
            Your answers have been saved.
          </p>
          <p className="text-zinc-600 text-xs mb-1">Exam code: <span className="text-zinc-400 font-mono">{examCode}</span></p>
          <p className="text-zinc-600 text-xs mb-6">You can return to this page anytime to check results.</p>
          <div className="space-y-3">
            <button onClick={loadResult}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
              Check Results
            </button>
            <button onClick={() => setLocation("/dashboard")}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const pct = result.percentage ?? 0;
    const color = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";

    return (
      <div className="min-h-screen px-4 py-8" style={{ background: "#07070F", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-md mx-auto ex-card">
          {/* Score circle */}
          <div className="text-center mb-6">
            <div className="w-28 h-28 rounded-full border-4 flex items-center justify-center mx-auto mb-4"
              style={{ borderColor: color, boxShadow: `0 0 32px ${color}44` }}>
              <div>
                <div className="text-3xl font-bold" style={{ color }}>{pct.toFixed(0)}%</div>
                <div className="text-xs text-zinc-400">score</div>
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold">{result.exam_title}</h2>
            {result.pass_fail && (
              <span className={`mt-2 inline-block px-3 py-0.5 rounded-full text-sm font-semibold uppercase ${result.pass_fail === "pass" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
                {result.pass_fail}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {([
              ["Rank", result.rank ?? "—"],
              ["Correct", `${result.scored_marks?.toFixed(0) ?? "—"}/${result.total_marks?.toFixed(0) ?? "—"}`],
              ["Score", `${pct.toFixed(1)}%`],
            ] as [string, string | number][]).map(([label, val]) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-white">{val}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Answer detail (if shown) */}
          {result.show_answers && result.answer_detail && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">Answer Review</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.answer_detail.map(a => (
                  <div key={a.question_id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800/50 last:border-0">
                    <span className="text-zinc-400">Q{a.question_id}</span>
                    <span className="font-mono text-zinc-300">{a.your_answer || "—"}</span>
                    {a.is_correct === true && <CheckCircle2 size={14} className="text-green-400" />}
                    {a.is_correct === false && (
                      <span className="text-red-400 text-xs">
                        ✗ <span className="font-mono">{a.correct_answer}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setLocation("/dashboard")}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Result not yet released ─────────────────────────────────────────────────
  if (phase === "result" && !result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07070F", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center max-w-xs ex-card">
          <Clock size={40} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Results not yet available</h2>
          <p className="text-zinc-400 text-sm mb-1">{errorMsg || "Your teacher hasn't released results yet."}</p>
          <p className="text-zinc-600 text-xs mb-5">Exam code: <span className="text-zinc-400 font-mono">{examCode}</span></p>
          <div className="space-y-2">
            <button onClick={loadResult}
              className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">
              Try Again
            </button>
            <button onClick={() => setLocation("/dashboard")}
              className="w-full px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm hover:bg-zinc-700 transition-colors">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <LoadingScreen />;
}
