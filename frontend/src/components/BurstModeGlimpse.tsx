import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, ChevronRight, Zap, CheckCircle2, XCircle, Timer } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "countdown" | "playing" | "result";

interface Question {
  id: number;
  a: number;
  b: number;
  op: string;
  answer: number;
  text: string;
}

interface AnswerRecord {
  q: Question;
  userAnswer: number | null;
  correct: boolean;
  timeMs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_TIME = 15; // seconds for the demo round
const TOTAL_QUESTIONS = 8;

const OPERATIONS = [
  { key: "tables", label: "Tables", icon: "📊", color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  { key: "multiply", label: "Multiply", icon: "✖️", color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
  { key: "division", label: "Division", icon: "➗", color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  { key: "square", label: "Square Root", icon: "√", color: "#d946ef", bg: "rgba(217,70,239,0.10)" },
  { key: "percentage", label: "Percentage", icon: "%", color: "#14b8a6", bg: "rgba(20,184,166,0.10)" },
];

// ─── Math generation (safe, always integer answers) ───────────────────────────

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateQuestion(id: number): Question {
  const ops = [
    () => { const a = rand(2, 12); const b = rand(2, 12); return { a, b, op: "×", answer: a * b, text: `${a} × ${b}` }; },
    () => { const a = rand(11, 99); const b = rand(2, 9); return { a, b, op: "×", answer: a * b, text: `${a} × ${b}` }; },
    () => { const b = rand(2, 9); const ans = rand(5, 30); const a = b * ans; return { a, b, op: "÷", answer: ans, text: `${a} ÷ ${b}` }; },
    () => { const root = rand(2, 15); const a = root * root; return { a, b: 0, op: "√", answer: root, text: `√${a}` }; },
  ];
  const fn = ops[rand(0, ops.length - 1)];
  const { a, b, op, answer, text } = fn();
  return { id, a, b, op, answer, text };
}

function generateRound(): Question[] {
  return Array.from({ length: TOTAL_QUESTIONS }, (_, i) => generateQuestion(i));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const V = {
  bg: "#07070F",
  surf: "#0F1120",
  surf2: "#141729",
  bdr: "rgba(255,255,255,0.06)",
  bdr2: "rgba(255,255,255,0.10)",
  accent: "#F97316",
  accent2: "#FB923C",
  accentDim: "rgba(249,115,22,0.12)",
  green: "#10B981",
  red: "#EF4444",
  gold: "#F59E0B",
  white: "#F0F2FF",
  white2: "#B8BDD8",
  muted: "#525870",
  ff: "'DM Sans', sans-serif",
  fm: "'JetBrains Mono', monospace",
  fd: "'Playfair Display', Georgia, serif",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BurstModeGlimpse() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Question[]>(() => generateRound());
  const [qIndex, setQIndex] = useState(0);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [countdownVal, setCountdownVal] = useState(3);
  const [selectedOp, setSelectedOp] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qStartRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Timer ─────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Focus input on question change ────────────────────────────

  useEffect(() => {
    if (phase === "playing") {
      setTimeout(() => inputRef.current?.focus(), 50);
      qStartRef.current = Date.now();
    }
  }, [phase, qIndex]);

  // ── Start the game ────────────────────────────────────────────

  const startGame = useCallback(() => {
    const qs = generateRound();
    setQuestions(qs);
    setQIndex(0);
    setInput("");
    setTimeLeft(TOTAL_TIME);
    setScore({ correct: 0, wrong: 0 });
    setAnswers([]);
    setFeedback(null);
    setCountdownVal(3);
    setPhase("countdown");

    // 3-2-1 countdown
    let c = 3;
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        setPhase("playing");
      } else {
        setCountdownVal(c);
      }
    }, 800);
  }, []);

  // ── Submit answer ─────────────────────────────────────────────

  const submitAnswer = useCallback(() => {
    if (input.trim() === "" || phase !== "playing") return;
    const q = questions[qIndex];
    const userAns = parseInt(input, 10);
    const isCorrect = userAns === q.answer;
    const timeMs = Date.now() - qStartRef.current;

    setFeedback(isCorrect ? "correct" : "wrong");
    setScore(s => isCorrect ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 });
    setAnswers(a => [...a, { q, userAnswer: userAns, correct: isCorrect, timeMs }]);

    setTimeout(() => {
      setFeedback(null);
      setInput("");
      if (qIndex < questions.length - 1) {
        setQIndex(i => i + 1);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase("result");
      }
    }, 350);
  }, [input, phase, questions, qIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitAnswer();
  };

  // ── Derived ───────────────────────────────────────────────────

  const q = questions[qIndex];
  const timePct = (timeLeft / TOTAL_TIME) * 100;
  const timerColor = timePct > 50 ? V.green : timePct > 25 ? V.gold : V.red;
  const accuracy = answers.length > 0 ? Math.round((score.correct / answers.length) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <section style={{ padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>
      {/* Background atmospheric effects */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "8%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${V.accent}08 0%, transparent 70%)`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div ref={containerRef} style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: V.accentDim, border: `1px solid ${V.accent}30`, borderRadius: 100,
            padding: "5px 16px", marginBottom: 20, fontSize: 11,
            fontFamily: V.fm, fontWeight: 700, color: V.accent, letterSpacing: "0.08em",
          }}>
            <Zap size={12} /> LIVE INTERACTIVE PREVIEW
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14, fontFamily: V.ff, color: V.white }}>
            This is{" "}
            <span style={{
              fontFamily: V.fd, fontStyle: "italic", fontWeight: 900,
              background: `linear-gradient(135deg, ${V.accent2}, ${V.accent})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Burst Mode.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>
            Speed math. Real-time scoring. Addictive practice sessions
            that sharpen mental calculation — right here, right now. Try it.
          </p>
        </div>

        {/* Main interactive area */}
        <div style={{
          background: V.bg,
          border: `1px solid ${V.bdr}`,
          borderRadius: 28,
          overflow: "hidden",
          position: "relative",
          boxShadow: `0 40px 120px rgba(0,0,0,0.5), 0 0 80px ${V.accent}06`,
        }}>
          {/* Browser chrome bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 20px",
            background: V.surf,
            borderBottom: `1px solid ${V.bdr}`,
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E" }} />
            </div>
            <div style={{
              flex: 1, background: V.surf2, borderRadius: 8, padding: "5px 14px",
              fontSize: 11, fontFamily: V.fm, color: V.muted, textAlign: "center",
              border: `1px solid ${V.bdr}`,
            }}>
              blackmonkey.app/burst-mode
            </div>
          </div>

          {/* Sticky game top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px",
            background: `linear-gradient(180deg, ${V.surf} 0%, transparent 100%)`,
            borderBottom: `1px solid ${V.bdr}`,
          }}>
            {/* Left — operation pills */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingRight: 8 }}>
              {OPERATIONS.map((op, i) => (
                <button
                  key={op.key}
                  onClick={() => { if (phase === "idle") setSelectedOp(i); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 10,
                    border: `1px solid ${i === selectedOp ? `${op.color}50` : V.bdr2}`,
                    background: i === selectedOp ? op.bg : "transparent",
                    color: i === selectedOp ? op.color : V.muted,
                    fontSize: 11, fontFamily: V.fm, fontWeight: 600,
                    cursor: phase === "idle" ? "pointer" : "default",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    ...(phase !== "idle" ? { opacity: 0.45, pointerEvents: "none" as const } : {}),
                  }}
                >
                  <span style={{ fontSize: 13 }}>{op.icon}</span>
                  <span style={{ display: "none" }} className="bm-glimpse-op-label">{op.label}</span>
                </button>
              ))}
            </div>

            {/* Center — Timer */}
            <div style={{
              fontFamily: V.fm, fontWeight: 800,
              fontSize: phase === "playing" ? 22 : 16,
              color: phase === "playing" ? timerColor : V.muted,
              transition: "all 0.3s",
              minWidth: 60, textAlign: "center",
              ...(phase === "playing" && timeLeft <= 5 ? { animation: "bm-g-shake 0.4s ease infinite" } : {}),
            }}>
              {phase === "playing"
                ? `0:${String(timeLeft).padStart(2, "0")}`
                : phase === "result" ? "0:00" : `0:${String(TOTAL_TIME).padStart(2, "0")}`}
            </div>

            {/* Right — score badges */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: V.fm, fontSize: 13, fontWeight: 700 }}>
                <CheckCircle2 size={14} color={V.green} />
                <span style={{ color: V.green }}>{score.correct}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: V.fm, fontSize: 13, fontWeight: 700 }}>
                <XCircle size={14} color={V.red} />
                <span style={{ color: V.red }}>{score.wrong}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: V.bdr }}>
            <div style={{
              height: "100%", width: `${timePct}%`,
              background: `linear-gradient(90deg, ${timerColor}, ${timerColor}aa)`,
              borderRadius: 3,
              transition: "width 1s linear, background 0.5s",
              boxShadow: `2px 0 12px ${timerColor}`,
            }} />
          </div>

          {/* Main content area */}
          <div style={{
            minHeight: 340,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "40px 24px",
            position: "relative",
          }}>
            <AnimatePresence mode="wait">

              {/* ── IDLE — invite to play ────────────────────── */}
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  style={{ textAlign: "center", maxWidth: 400 }}
                >
                  <div style={{
                    width: 80, height: 80, borderRadius: 24,
                    background: V.accentDim, border: `1px solid ${V.accent}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 24px",
                    boxShadow: `0 16px 48px ${V.accent}15`,
                  }}>
                    <Zap size={36} color={V.accent} />
                  </div>
                  <h3 style={{ fontFamily: V.fd, fontSize: 28, fontWeight: 800, color: V.white, marginBottom: 10, letterSpacing: "-0.02em" }}>
                    Ready to Burst?
                  </h3>
                  <p style={{ fontSize: 14, color: V.white2, lineHeight: 1.65, marginBottom: 28 }}>
                    {TOTAL_QUESTIONS} rapid-fire math questions. {TOTAL_TIME} seconds on the clock.
                    <br />How many can you nail?
                  </p>
                  <button
                    onClick={startGame}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "14px 32px", borderRadius: 14,
                      background: `linear-gradient(135deg, ${V.accent}, #C2410C)`,
                      border: "none", color: "#fff",
                      fontFamily: V.fm, fontSize: 15, fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: `0 8px 32px ${V.accent}40, 0 0 20px ${V.accent}15`,
                      transition: "all 0.25s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${V.accent}55, 0 0 30px ${V.accent}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 8px 32px ${V.accent}40, 0 0 20px ${V.accent}15`; }}
                  >
                    <Play size={18} fill="#fff" /> Start Burst
                  </button>
                </motion.div>
              )}

              {/* ── COUNTDOWN — 3…2…1 ────────────────────────── */}
              {phase === "countdown" && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ textAlign: "center", position: "relative" }}
                >
                  {/* Pulsing ring */}
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 180, height: 180, borderRadius: "50%",
                    border: `2px solid ${V.accent}30`,
                    animation: "bm-g-ring 0.8s ease-out infinite",
                  }} />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={countdownVal}
                      initial={{ opacity: 0, scale: 2.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                      style={{
                        fontFamily: V.fm, fontWeight: 800,
                        fontSize: "clamp(80px, 15vw, 160px)",
                        background: `linear-gradient(135deg, ${V.accent2} 0%, #FDBA74 40%, ${V.accent} 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        lineHeight: 1, letterSpacing: "-0.04em",
                      }}
                    >
                      {countdownVal}
                    </motion.div>
                  </AnimatePresence>
                  <p style={{ fontFamily: V.fm, fontSize: 12, color: V.accent, fontWeight: 700, letterSpacing: "0.15em", marginTop: 16 }}>
                    GET READY
                  </p>
                </motion.div>
              )}

              {/* ── PLAYING — question + input ───────────────── */}
              {phase === "playing" && q && (
                <motion.div
                  key={`q-${qIndex}`}
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ textAlign: "center", width: "100%", maxWidth: 480, position: "relative" }}
                >
                  {/* Question number badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 12px", borderRadius: 8,
                    background: V.accentDim, border: `1px solid ${V.accent}25`,
                    fontFamily: V.fm, fontSize: 10, fontWeight: 700, color: V.accent,
                    letterSpacing: "0.08em", marginBottom: 20,
                  }}>
                    QUESTION {qIndex + 1} / {TOTAL_QUESTIONS}
                  </div>

                  {/* Question text */}
                  <div style={{
                    fontFamily: V.fm, fontWeight: 800,
                    fontSize: "clamp(48px, 10vw, 96px)",
                    color: V.white,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    marginBottom: 32,
                    display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.15em",
                  }}>
                    <span>{q.text}</span>
                    <span style={{
                      fontSize: "0.45em", color: V.muted, fontWeight: 500,
                    }}>=</span>
                  </div>

                  {/* Answer input */}
                  <div style={{ display: "flex", gap: 10, maxWidth: 320, margin: "0 auto" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        ref={inputRef}
                        type="number"
                        inputMode="numeric"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="?"
                        style={{
                          width: "100%", padding: "14px 18px",
                          borderRadius: 14,
                          border: `2px solid ${
                            feedback === "correct" ? V.green :
                            feedback === "wrong" ? V.red :
                            V.bdr2
                          }`,
                          background: feedback === "correct" ? "rgba(16,185,129,0.08)"
                            : feedback === "wrong" ? "rgba(239,68,68,0.08)"
                            : V.surf2,
                          color: V.white, fontFamily: V.fm, fontSize: 22, fontWeight: 700,
                          outline: "none", textAlign: "center",
                          transition: "all 0.15s",
                          boxShadow: feedback === "correct" ? `0 0 20px ${V.green}30`
                            : feedback === "wrong" ? `0 0 20px ${V.red}30`
                            : "none",
                        }}
                        autoComplete="off"
                      />
                      {/* Feedback icon */}
                      <AnimatePresence>
                        {feedback && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            style={{
                              position: "absolute", right: -36, top: "50%",
                              transform: "translateY(-50%)",
                            }}
                          >
                            {feedback === "correct"
                              ? <CheckCircle2 size={22} color={V.green} />
                              : <XCircle size={22} color={V.red} />}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={submitAnswer}
                      disabled={!input.trim()}
                      style={{
                        padding: "14px 20px", borderRadius: 14,
                        background: input.trim() ? `linear-gradient(135deg, ${V.accent}, #C2410C)` : V.surf2,
                        border: "none", color: input.trim() ? "#fff" : V.muted,
                        fontFamily: V.fm, fontSize: 14, fontWeight: 700,
                        cursor: input.trim() ? "pointer" : "default",
                        transition: "all 0.2s",
                        boxShadow: input.trim() ? `0 4px 16px ${V.accent}35` : "none",
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── RESULT — scorecard ────────────────────────── */}
              {phase === "result" && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ textAlign: "center", width: "100%", maxWidth: 480 }}
                >
                  {/* Trophy */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: accuracy >= 70 ? "rgba(16,185,129,0.12)" : accuracy >= 40 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${accuracy >= 70 ? V.green : accuracy >= 40 ? V.gold : V.red}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                  }}>
                    <span style={{ fontSize: 28 }}>
                      {accuracy >= 70 ? "🏆" : accuracy >= 40 ? "⭐" : "💪"}
                    </span>
                  </div>

                  <h3 style={{
                    fontFamily: V.fd, fontSize: 26, fontWeight: 800, color: V.white,
                    marginBottom: 8, letterSpacing: "-0.02em",
                  }}>
                    {accuracy >= 80 ? "Incredible!" : accuracy >= 60 ? "Great Job!" : accuracy >= 40 ? "Nice Try!" : "Keep Practicing!"}
                  </h3>

                  {/* Stat grid */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
                    marginBottom: 24,
                  }}>
                    {[
                      { label: "Correct", value: score.correct, color: V.green, icon: "✓" },
                      { label: "Wrong", value: score.wrong, color: V.red, icon: "✗" },
                      { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? V.green : accuracy >= 40 ? V.gold : V.red, icon: "◎" },
                    ].map(s => (
                      <div
                        key={s.label}
                        style={{
                          background: V.surf, border: `1px solid ${V.bdr}`, borderRadius: 14,
                          padding: "16px 12px",
                        }}
                      >
                        <div style={{ fontFamily: V.fm, fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 4 }}>
                          {s.icon} {s.value}
                        </div>
                        <div style={{ fontSize: 10, color: V.muted, fontFamily: V.fm, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Accuracy bar */}
                  <div style={{ height: 6, background: V.surf2, borderRadius: 100, marginBottom: 24, position: "relative", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${accuracy}%` }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                      style={{
                        height: "100%", borderRadius: 100,
                        background: accuracy >= 70
                          ? `linear-gradient(90deg, ${V.green}, #34d399)`
                          : accuracy >= 40
                          ? `linear-gradient(90deg, ${V.gold}, #fbbf24)`
                          : `linear-gradient(90deg, ${V.red}, #f87171)`,
                        boxShadow: `0 0 12px ${accuracy >= 70 ? V.green : accuracy >= 40 ? V.gold : V.red}35`,
                      }}
                    />
                  </div>

                  {/* Answer review (scrollable) */}
                  <div style={{
                    maxHeight: 120, overflowY: "auto", marginBottom: 24,
                    borderRadius: 12, border: `1px solid ${V.bdr}`,
                    background: V.surf,
                  }}>
                    {answers.map((a, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 14px",
                        borderBottom: i < answers.length - 1 ? `1px solid ${V.bdr}` : "none",
                        fontSize: 12, fontFamily: V.fm,
                      }}>
                        <span style={{ color: V.white2 }}>{a.q.text} = {a.q.answer}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: a.correct ? V.green : V.red, fontWeight: 700 }}>
                            {a.userAnswer ?? "—"}
                          </span>
                          {a.correct
                            ? <CheckCircle2 size={12} color={V.green} />
                            : <XCircle size={12} color={V.red} />
                          }
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button
                      onClick={() => { setPhase("idle"); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "10px 20px", borderRadius: 12,
                        border: `1px solid ${V.bdr2}`, background: V.surf,
                        color: V.white2, fontFamily: V.fm, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = V.surf2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = V.surf; }}
                    >
                      <RotateCcw size={14} /> Try Again
                    </button>
                    <button
                      onClick={() => window.location.href = "/burst"}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "10px 24px", borderRadius: 12,
                        background: `linear-gradient(135deg, ${V.accent}, #C2410C)`,
                        border: "none", color: "#fff",
                        fontFamily: V.fm, fontSize: 13, fontWeight: 700,
                        cursor: "pointer", transition: "all 0.2s",
                        boxShadow: `0 4px 20px ${V.accent}35`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                    >
                      Play Full Game <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Bottom info strip — social proof */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap",
          marginTop: 32, padding: "0 16px",
        }}>
          {[
            { icon: <Zap size={14} />, text: "2M+ questions solved", color: V.accent },
            { icon: <Timer size={14} />, text: "40% faster calculations", color: V.green },
            { icon: <CheckCircle2 size={14} />, text: "98% accuracy improvement", color: "#8b5cf6" },
          ].map(s => (
            <div key={s.text} style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: V.fm, fontSize: 11, fontWeight: 600, color: s.color,
              letterSpacing: "0.04em",
            }}>
              {s.icon} {s.text}
            </div>
          ))}
        </div>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes bm-g-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes bm-g-ring {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        /* Remove number input spinners */
        .bm-glimpse-input::-webkit-outer-spin-button,
        .bm-glimpse-input::-webkit-inner-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        .bm-glimpse-input[type=number] { -moz-appearance: textfield; }
        /* Show op labels on wider screens */
        @media (min-width: 768px) {
          .bm-glimpse-op-label { display: inline !important; }
        }
      `}</style>
    </section>
  );
}
