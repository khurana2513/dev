/**
 * BurstModeGlimpse — Split layout: live demo on the left, copy on the right.
 * Matches the visual language of the Gamification / For Institutes sections.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useAnimation } from "framer-motion";
import { Zap, Flame, TrendingUp, Target, ChevronRight, Clock } from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:        "#050510",
  surf:      "#0A0A1A",
  surf2:     "#0E0E1F",
  bdr:       "rgba(255,255,255,0.06)",
  bdr2:      "rgba(255,255,255,0.09)",
  orange:    "#F97316",
  orangeDim: "rgba(249,115,22,0.10)",
  violet:    "#6D5CFF",
  green:     "#10B981",
  red:       "#EF4444",
  gold:      "#F5A623",
  white:     "#F0F2FF",
  muted:     "#252840",
  ff:        "'DM Sans', sans-serif",
  fm:        "'JetBrains Mono', monospace",
} as const;

// ─── Circular timer ───────────────────────────────────────────────────────────

const R            = 50;
const CIRCUMFERENCE = 2 * Math.PI * R;

// ─── Scripted questions ───────────────────────────────────────────────────────

interface ScriptedQ {
  display:     string;
  chars:       string[];   // incremental typed states
  correct:     boolean;
  xp:          number;
  streakAfter: number;
}

const QUESTIONS: ScriptedQ[] = [
  { display: "47 × 8",  chars: ["3","37","376"],    correct: true,  xp: 12, streakAfter: 1 },
  { display: "√ 225",   chars: ["1","15"],          correct: true,  xp: 12, streakAfter: 2 },
  { display: "63 ÷ 7",  chars: ["9"],              correct: true,  xp: 12, streakAfter: 3 },
  { display: "12 × 14", chars: ["1","16","168"],   correct: true,  xp: 15, streakAfter: 4 },
  { display: "√ 144",   chars: ["1","12"],         correct: true,  xp: 18, streakAfter: 5 },
  { display: "89 × 7",  chars: ["6","62","621"],   correct: false, xp:  0, streakAfter: 0 },
  { display: "15 × 15", chars: ["2","22","225"],   correct: true,  xp: 12, streakAfter: 1 },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "countdown" | "playing" | "result";
interface ScoreState { c: number; w: number }

// ─── Right-column feature bullets ────────────────────────────────────────────

const FEATURES = [
  { icon: <Clock size={15} color="#f97316" />,      text: "60-second timed sessions with live countdown" },
  { icon: <Flame size={15} color="#f97316" />,      text: "Streak multipliers reward consecutive correct answers" },
  { icon: <TrendingUp size={15} color="#22c55e" />, text: "XP earned every session, tracked on the leaderboard" },
  { icon: <Target size={15} color="#a78bfa" />,     text: "Covers multiplication, division, square roots & more" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BurstModeGlimpse() {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const isInView = useInView(wrapRef, { once: false, margin: "-60px" });
  const shake    = useAnimation();

  const [phase,        setPhase]        = useState<Phase>("idle");
  const [countdownNum, setCountdownNum] = useState(3);
  const [qIndex,       setQIndex]       = useState(0);
  const [typed,        setTyped]        = useState("");
  const [feedback,     setFeedback]     = useState<"correct" | "wrong" | null>(null);
  const [score,        setScore]        = useState<ScoreState>({ c: 0, w: 0 });
  const [streak,       setStreak]       = useState(0);
  const [timer,        setTimer]        = useState(60);
  const [xpPop,        setXpPop]        = useState<number | null>(null);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timerIvRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef  = useRef(false);
  const cycleRef    = useRef<(() => void) | null>(null);

  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (timerIvRef.current) { clearInterval(timerIvRef.current); timerIvRef.current = null; }
  };

  const t = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  };

  // Always-fresh cycle — stored in ref so the last scheduled restart gets newest closure
  cycleRef.current = () => {
    clearAll();

    setPhase("countdown");
    setCountdownNum(3);
    setQIndex(0);
    setTyped("");
    setFeedback(null);
    setScore({ c: 0, w: 0 });
    setStreak(0);
    setTimer(60);
    setXpPop(null);

    // 3-2-1
    t(800,  () => setCountdownNum(2));
    t(1600, () => setCountdownNum(1));
    t(2400, () => {
      setPhase("playing");
      timerIvRef.current = setInterval(
        () => setTimer(v => (v > 0 ? v - 1 : 0)),
        1000,
      );
    });

    // Schedule each question: appear → type chars → submit → next
    const scheduleQ = (
      offset:     number,
      qIdx:       number,
      scoreAfter: ScoreState,
    ): number => {
      const q = QUESTIONS[qIdx];
      t(offset, () => { setQIndex(qIdx); setTyped(""); setFeedback(null); setXpPop(null); });

      let charT = offset + 600;
      for (const ch of q.chars) {
        t(charT, () => setTyped(ch));
        charT += 290;
      }

      const submitT = charT + 180;
      t(submitT, () => {
        setFeedback(q.correct ? "correct" : "wrong");
        setScore(scoreAfter);
        setStreak(q.streakAfter);
        if (q.correct && q.xp > 0) setXpPop(q.xp);
        if (!q.correct) {
          shake.start({
            x:          [0, -10, 10, -7, 7, -3, 3, 0],
            transition: { duration: 0.48, ease: "easeInOut" },
          });
        }
      });

      return submitT + 480;
    };

    let cursor = 2400;
    const run: ScoreState = { c: 0, w: 0 };
    QUESTIONS.forEach((q, i) => {
      const after = { c: run.c + (q.correct ? 1 : 0), w: run.w + (q.correct ? 0 : 1) };
      cursor = scheduleQ(cursor, i, after) + 160;
      run.c = after.c; run.w = after.w;
    });

    // Results
    t(cursor + 200, () => {
      if (timerIvRef.current) { clearInterval(timerIvRef.current); timerIvRef.current = null; }
      setPhase("result");
      setFeedback(null);
      setXpPop(null);
    });

    // Restart
    t(cursor + 4800, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (isInView && !startedRef.current) {
      startedRef.current = true;
      t(350, () => cycleRef.current?.());
    }
    if (!isInView) {
      clearAll();
      startedRef.current = false;
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  useEffect(() => () => clearAll(), []);

  // Derived visuals
  const timerPct   = timer / 60;
  const timerColor = timerPct > 0.5 ? C.green : timerPct > 0.25 ? C.gold : C.red;
  const arcOffset  = CIRCUMFERENCE * (1 - timerPct);
  const q          = QUESTIONS[Math.max(0, Math.min(qIndex, QUESTIONS.length - 1))];
  const totalAns   = score.c + score.w;
  const accuracy   = totalAns > 0 ? Math.round((score.c / totalAns) * 100) : 100;
  const totalXP    = score.c * 12 + (score.c >= 5 ? 24 : score.c >= 3 ? 9 : 0);

  return (
    <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}>

      {/* Atmospheric glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "3%", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${C.orange}07 0%, transparent 70%)`, filter: "blur(120px)" }} />
        <div style={{ position: "absolute", top: "5%", right: "3%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.violet}06 0%, transparent 70%)`, filter: "blur(100px)" }} />
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <div ref={wrapRef} style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center", position: "relative", zIndex: 1 }}>

        {/* ── LEFT: live demo ─────────────────────────────────────────────── */}
        <div style={{ minWidth: 0 }}>
        {/* Window chrome */}
        <motion.div
          animate={shake}
          style={{
            background:   C.bg,
            border:       `1px solid ${C.bdr2}`,
            borderRadius: 20,
            overflow:     "hidden",
            boxShadow:    "0 40px 120px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)",
            position:     "relative",
          }}
        >
          {/* Feedback flash */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                key={`flash-${feedback}-${qIndex}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none",
                  background: feedback === "correct"
                    ? "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(16,185,129,0.09) 0%, transparent 70%)"
                    : "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(239,68,68,0.09) 0%, transparent 70%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* macOS chrome bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", background: C.surf, borderBottom: `1px solid ${C.bdr}` }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#FF5F57","#FFBD2E","#28C840"].map(col => (
                <div key={col} style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
              ))}
            </div>
            <div style={{ flex: 1, background: C.surf2, borderRadius: 6, padding: "4px 14px", fontSize: 11, fontFamily: C.fm, color: "#343650", textAlign: "center", border: `1px solid ${C.bdr}` }}>
              blackmonkey.app/burst-mode
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: C.orangeDim, border: "1px solid rgba(249,115,22,0.22)", fontFamily: C.fm, fontSize: 10, fontWeight: 700, color: C.orange, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
              <Zap size={9} /> BURST
            </div>
          </div>

          {/* Game area */}
          <div style={{ display: "flex", minHeight: 380 }}>

            {/* Left: timer + score + streak */}
            <div style={{
              width: "clamp(120px, 25%, 164px)", padding: "26px 14px",
              borderRight: `1px solid ${C.bdr}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
              background: `linear-gradient(180deg, ${C.surf}90 0%, transparent 100%)`,
              flexShrink: 0,
            }}>

              {/* Arc timer */}
              <div style={{ position: "relative", width: "clamp(80px,18vw,120px)", height: "clamp(80px,18vw,120px)" }}>
                <div style={{
                  position: "absolute", inset: -8, borderRadius: "50%",
                  background: `radial-gradient(circle, ${phase === "playing" ? timerColor : C.orange}16 0%, transparent 70%)`,
                  filter: "blur(10px)", transition: "background 0.5s",
                }} />
                <svg width="100%" height="100%" viewBox="0 0 120 120" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
                  <circle
                    cx="60" cy="60" r={R} fill="none"
                    stroke={phase === "playing" ? timerColor : C.orange}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={phase === "playing" ? arcOffset : 0}
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={phase === "countdown" ? `cd-${countdownNum}` : `t-${timer}`}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1   }}
                      exit={   { opacity: 0, scale: 1.8 }}
                      transition={{ duration: 0.28 }}
                      style={{
                        fontFamily: C.fm, fontWeight: 800,
                        fontSize: phase === "countdown" ? 38 : 28,
                        color:     phase === "playing"   ? timerColor
                                 : phase === "countdown" ? C.orange
                                 : "rgba(255,255,255,0.22)",
                        lineHeight: 1,
                      }}
                    >
                      {phase === "countdown" ? countdownNum : timer}
                    </motion.div>
                  </AnimatePresence>
                  <div style={{ fontFamily: C.fm, fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.12em", marginTop: 5 }}>
                    {phase === "playing" ? "SECS" : phase === "countdown" ? "READY" : phase === "result" ? "DONE" : "BURST"}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {([
                  { label: "CORRECT", val: score.c, color: C.green, dim: "rgba(16,185,129,0.09)" },
                  { label: "WRONG",   val: score.w, color: C.red,   dim: "rgba(239,68,68,0.09)"  },
                ] as const).map(({ label, val, color, dim }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={val}
                        initial={{ scale: 1.7, opacity: 0 }}
                        animate={{ scale: 1,   opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: dim, border: `1px solid ${color}28`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: C.fm, fontWeight: 800, fontSize: 14, color,
                          flexShrink: 0,
                        }}
                      >
                        {val}
                      </motion.div>
                    </AnimatePresence>
                    <span style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Streak */}
              <div style={{ width: "100%", paddingTop: 8, borderTop: `1px solid ${C.bdr}` }}>
                <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.16)", letterSpacing: "0.1em", marginBottom: 8 }}>STREAK</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={streak}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 18 }}
                  >
                    {streak > 0 ? (
                      <>
                        <div style={{ fontSize: 17, lineHeight: 1, marginBottom: 5 }}>
                          {"🔥".repeat(Math.min(streak, 5))}
                        </div>
                        <div style={{
                          fontFamily: C.fm, fontWeight: 800, fontSize: 11, letterSpacing: "0.04em",
                          color: streak >= 5 ? C.gold : streak >= 3 ? C.orange : "rgba(255,255,255,0.4)",
                        }}>
                          {streak}× COMBO
                        </div>
                      </>
                    ) : (
                      <div style={{ fontFamily: C.fm, fontSize: 11, color: C.muted }}>· · ·</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Centre: question + typed answer */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 24px", position: "relative", overflow: "hidden" }}>

              {/* Ambient glow behind active question */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `radial-gradient(ellipse 70% 55% at 50% 48%, ${C.orange}05 0%, transparent 70%)`,
              }} />

              <AnimatePresence mode="wait">

                {/* IDLE */}
                {phase === "idle" && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} exit={{ opacity: 0 }}>
                    <div style={{ fontFamily: C.fm, fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>INITIALISING…</div>
                  </motion.div>
                )}

                {/* COUNTDOWN */}
                {phase === "countdown" && (
                  <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center" }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={countdownNum}
                        initial={{ opacity: 0, scale: 3.8, y: -20 }}
                        animate={{ opacity: 1, scale: 1,   y: 0   }}
                        exit={   { opacity: 0, scale: 0.25          }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          fontFamily: C.fm, fontWeight: 800,
                          fontSize: "clamp(88px,17vw,168px)",
                          background: `linear-gradient(135deg, ${C.orange} 0%, #FDBA74 55%, ${C.orange} 100%)`,
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                          lineHeight: 1, letterSpacing: "-0.06em",
                          filter: `drop-shadow(0 0 55px ${C.orange}40)`,
                        }}
                      >
                        {countdownNum}
                      </motion.div>
                    </AnimatePresence>
                    <div style={{ fontFamily: C.fm, fontSize: 11, color: C.orange, letterSpacing: "0.22em", marginTop: 12, opacity: 0.65 }}>
                      GET READY
                    </div>
                  </motion.div>
                )}

                {/* PLAYING */}
                {phase === "playing" && (
                  <motion.div
                    key={`q-${qIndex}`}
                    initial={{ opacity: 0, scale: 0.52, y: 44 }}
                    animate={{ opacity: 1, scale: 1,    y: 0  }}
                    exit={   { opacity: 0, scale: 1.1,  y: -28 }}
                    transition={{ type: "spring", stiffness: 370, damping: 24 }}
                    style={{ textAlign: "center", width: "100%", maxWidth: 420, position: "relative" }}
                  >
                    {/* Q badge */}
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "3px 12px", borderRadius: 6,
                      background: C.orangeDim, border: "1px solid rgba(249,115,22,0.16)",
                      fontFamily: C.fm, fontSize: 10, fontWeight: 700, color: C.orange,
                      letterSpacing: "0.1em", marginBottom: 22,
                    }}>
                      Q {qIndex + 1} / {QUESTIONS.length}
                    </div>

                    {/* Question — the big impact moment */}
                    <div style={{
                      fontFamily: C.fm, fontWeight: 800,
                      fontSize: "clamp(48px,10vw,90px)",
                      color: C.white, letterSpacing: "-0.04em", lineHeight: 1.05,
                      marginBottom: 32,
                      filter: `drop-shadow(0 2px 28px rgba(249,115,22,0.10))`,
                    }}>
                      {q.display}
                      <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.4em", marginLeft: "0.22em" }}>= ?</span>
                    </div>

                    {/* Answer box */}
                    <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                      <motion.div
                        animate={{
                          borderColor: feedback === "correct" ? C.green
                                     : feedback === "wrong"   ? C.red
                                     : "rgba(255,255,255,0.11)",
                          boxShadow:   feedback === "correct"
                            ? `0 0 28px ${C.green}42, 0 0 70px ${C.green}09`
                            : feedback === "wrong"
                            ? `0 0 28px ${C.red}42,   0 0 70px ${C.red}09`
                            : "0 0 0 rgba(0,0,0,0)",
                        }}
                        transition={{ duration: 0.16 }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          minWidth: 158, height: 66, borderRadius: 16,
                          border: "2px solid rgba(255,255,255,0.11)",
                          background: feedback === "correct" ? "rgba(16,185,129,0.07)"
                                    : feedback === "wrong"   ? "rgba(239,68,68,0.07)"
                                    : "rgba(255,255,255,0.022)",
                          padding: "0 20px", gap: 4,
                        }}
                      >
                        <span style={{
                          fontFamily: C.fm, fontWeight: 800, fontSize: 29,
                          color:    feedback === "correct" ? C.green
                                  : feedback === "wrong"   ? C.red
                                  : C.white,
                          letterSpacing: "-0.02em", transition: "color 0.16s", minWidth: 12,
                        }}>
                          {typed}
                        </span>

                        {!feedback && (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.72, repeat: Infinity, ease: "linear" }}
                            style={{ display: "inline-block", width: 2.5, height: 28, background: C.orange, borderRadius: 2 }}
                          />
                        )}

                        {feedback && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 640, damping: 18 }}
                            style={{ fontFamily: C.fm, fontWeight: 800, fontSize: 22, color: feedback === "correct" ? C.green : C.red }}
                          >
                            {feedback === "correct" ? " ✓" : " ✗"}
                          </motion.span>
                        )}
                      </motion.div>

                      {/* XP float */}
                      <AnimatePresence>
                        {xpPop && feedback === "correct" && (
                          <motion.div
                            key={`xp-${qIndex}`}
                            initial={{ opacity: 0, y: 6,   scale: 0.55 }}
                            animate={{ opacity: 1, y: -50, scale: 1    }}
                            exit={   { opacity: 0, y: -85               }}
                            transition={{ duration: 0.92, ease: "easeOut" }}
                            style={{
                              position: "absolute", right: -6, top: "50%",
                              fontFamily: C.fm, fontWeight: 800, fontSize: 15,
                              color: C.gold, textShadow: `0 0 22px ${C.gold}65`,
                              letterSpacing: "0.02em", whiteSpace: "nowrap",
                            }}
                          >
                            +{xpPop} XP
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* RESULT */}
                {phase === "result" && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={   { opacity: 0         }}
                    transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                    style={{ textAlign: "center", maxWidth: 400, width: "100%" }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: 1, rotate: 0   }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 360, damping: 18 }}
                      style={{ fontSize: 54, lineHeight: 1, marginBottom: 18 }}
                    >
                      🏆
                    </motion.div>

                    <div style={{ fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.18em", marginBottom: 22 }}>
                      SESSION COMPLETE
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                      {([
                        { label: "CORRECT",  value: `${score.c}/${totalAns}`, color: C.green  },
                        { label: "ACCURACY", value: `${accuracy}%`,           color: C.orange },
                        { label: "XP WON",   value: `+${totalXP}`,            color: C.gold   },
                      ] as const).map(({ label, value, color }, i) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0  }}
                          transition={{ delay: 0.18 + i * 0.09, duration: 0.4, ease: "easeOut" }}
                          style={{
                            background: "rgba(255,255,255,0.022)", border: `1px solid ${C.bdr}`,
                            borderRadius: 14, padding: "16px 8px",
                          }}
                        >
                          <div style={{ fontFamily: C.fm, fontWeight: 800, fontSize: 22, color, lineHeight: 1, marginBottom: 7 }}>{value}</div>
                          <div style={{ fontFamily: C.fm, fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>{label}</div>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                      style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}
                    >
                      Replaying in a moment…
                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          {/* Bottom progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.035)" }}>
            <motion.div
              animate={{ width: `${timerPct * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${timerColor}cc, ${timerColor}55)`,
                boxShadow: `0 0 10px ${timerColor}70`,
                borderRadius: 3, transition: "background 0.5s",
              }}
            />
          </div>
        </motion.div>
        </div>{/* end LEFT demo col */}

        {/* ── RIGHT: copy + features + CTA ───────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: C.orangeDim, border: "1px solid rgba(249,115,22,0.24)", borderRadius: 100, padding: "5px 16px", marginBottom: 22, fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.08em" }}>
            <Zap size={11} /> Burst Mode
          </div>

          {/* Headline */}
          <h2 style={{ fontSize: "clamp(26px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 16, fontFamily: "'DM Sans', sans-serif", color: C.white }}>
            60 seconds.{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.orange}, #FDBA74)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic" }}>
              Maximum math.
            </span>
          </h2>

          {/* Description */}
          <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 28, fontFamily: "'DM Sans', sans-serif" }}>
            Questions burst onto the screen. Students type, race the clock, and build streaks.
            {" "}<em style={{ color: "rgba(255,255,255,0.65)", fontStyle: "normal", fontWeight: 600 }}>It's addictive by design.</em>
          </p>

          {/* Feature bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", fontFamily: "'DM Sans', sans-serif" }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Stats mini-strip */}
          <div style={{ display: "flex", gap: 24, marginBottom: 30, flexWrap: "wrap" }}>
            {([
              { n: "60s",  desc: "per session"       },
              { n: "15+Q", desc: "avg per session"   },
              { n: "94%",  desc: "improve in week 1" },
            ] as const).map(({ n, desc }) => (
              <div key={desc}>
                <div style={{ fontFamily: C.fm, fontWeight: 800, fontSize: 20, color: C.orange, letterSpacing: "-0.03em", lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", marginTop: 5 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="/burst-mode"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.30)", color: C.orange, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s, border-color 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(249,115,22,0.22)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(249,115,22,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(249,115,22,0.12)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(249,115,22,0.30)"; }}
          >
            Try Burst Mode <ChevronRight size={15} />
          </a>
        </div>{/* end RIGHT copy col */}

      </div>
    </section>
  );
}

