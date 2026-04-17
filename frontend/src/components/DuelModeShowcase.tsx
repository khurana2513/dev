/**
 * DuelModeShowcase — Full-width cinematic hero section for Duel Mode.
 * Two animated player cards clash in real time with live scoring,
 * animated health bars, question display, and XP gain effects.
 * The finest, most visually dramatic section on the home page.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useAnimation } from "framer-motion";
import { Swords, Zap, Crown, Shield, Flame, ChevronRight, Timer } from "lucide-react";

/* ── Design tokens ────────────────────────────────────────────────────────── */

const C = {
  bg:      "#050510",
  surf:    "#0A0A1A",
  surf2:   "#0E0E1F",
  bdr:     "rgba(255,255,255,0.06)",
  white:   "#F0F2FF",
  muted:   "rgba(255,255,255,0.22)",
  red:     "#EF4444",
  redDim:  "rgba(239,68,68,0.12)",
  blue:    "#3B82F6",
  blueDim: "rgba(59,130,246,0.12)",
  violet:  "#6D5CFF",
  gold:    "#F5A623",
  green:   "#10B981",
  ff:      "'Space Grotesk', 'DM Sans', sans-serif",
  fm:      "'JetBrains Mono', monospace",
} as const;

/* ── Scripted duel sequence ───────────────────────────────────────────────── */

interface DuelRound {
  question:  string;
  p1Answer:  string;
  p2Answer:  string;
  p1Correct: boolean;
  p2Correct: boolean;
  p1Time:    string;
  p2Time:    string;
}

const ROUNDS: DuelRound[] = [
  { question: "48 × 7",  p1Answer: "336",  p2Answer: "338",  p1Correct: true,  p2Correct: false, p1Time: "2.1s", p2Time: "3.4s" },
  { question: "√ 196",   p1Answer: "14",   p2Answer: "14",   p1Correct: true,  p2Correct: true,  p1Time: "1.8s", p2Time: "2.2s" },
  { question: "156 ÷ 12",p1Answer: "12",   p2Answer: "13",   p1Correct: false, p2Correct: true,  p1Time: "4.1s", p2Time: "2.9s" },
  { question: "25 × 16", p1Answer: "400",  p2Answer: "400",  p1Correct: true,  p2Correct: true,  p1Time: "1.5s", p2Time: "1.7s" },
  { question: "√ 529",   p1Answer: "23",   p2Answer: "21",   p1Correct: true,  p2Correct: false, p1Time: "3.2s", p2Time: "5.1s" },
];

type Phase = "idle" | "matchmaking" | "battle" | "result";

/* ── Component ────────────────────────────────────────────────────────────── */

export default function DuelModeShowcase() {
  const wrapRef = useRef<HTMLElement>(null);
  const isInView = useInView(wrapRef, { once: false, margin: "-80px" });
  const shakeCtrl = useAnimation();

  const [phase, setPhase] = useState<Phase>("idle");
  const [roundIdx, setRoundIdx] = useState(0);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Hp, setP1Hp] = useState(100);
  const [p2Hp, setP2Hp] = useState(100);
  const [showAnswer, setShowAnswer] = useState(false);
  const [xpPop, setXpPop] = useState<{ side: "left" | "right"; val: number } | null>(null);
  const [mmDots, setMmDots] = useState(0);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedRef = useRef(false);
  const cycleRef = useRef<(() => void) | null>(null);

  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  cycleRef.current = () => {
    clearAll();
    setPhase("matchmaking");
    setRoundIdx(0); setP1Score(0); setP2Score(0); setP1Hp(100); setP2Hp(100);
    setShowAnswer(false); setXpPop(null); setMmDots(0);

    // Matchmaking dots animation
    for (let d = 1; d <= 6; d++) t(d * 400, () => setMmDots(d));

    // Start battle
    t(2800, () => setPhase("battle"));

    let cursor = 2800;
    let runP1 = 0, runP2 = 0;
    let hp1 = 100, hp2 = 100;

    ROUNDS.forEach((round, i) => {
      // Show question
      t(cursor, () => { setRoundIdx(i); setShowAnswer(false); setXpPop(null); });

      // Show answers
      const answerT = cursor + 1400;
      t(answerT, () => {
        setShowAnswer(true);
        const newP1 = runP1 + (round.p1Correct ? 1 : 0);
        const newP2 = runP2 + (round.p2Correct ? 1 : 0);
        runP1 = newP1; runP2 = newP2;
        setP1Score(newP1); setP2Score(newP2);

        if (!round.p1Correct) { hp1 -= 20; setP1Hp(hp1); }
        if (!round.p2Correct) { hp2 -= 20; setP2Hp(hp2); }

        // XP pop for winner of round
        if (round.p1Correct && !round.p2Correct) setXpPop({ side: "left", val: 25 });
        else if (round.p2Correct && !round.p1Correct) setXpPop({ side: "right", val: 25 });
        else if (round.p1Correct && round.p2Correct) {
          // Both correct — faster wins
          setXpPop({ side: parseFloat(round.p1Time) < parseFloat(round.p2Time) ? "left" : "right", val: 15 });
        }

        // Shake on wrong
        if (!round.p1Correct || !round.p2Correct) {
          shakeCtrl.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.35 } });
        }
      });

      cursor = answerT + 1800;
    });

    // Result
    t(cursor + 300, () => { setPhase("result"); setShowAnswer(false); setXpPop(null); });
    t(cursor + 5500, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (isInView && !startedRef.current) { startedRef.current = true; t(400, () => cycleRef.current?.()); }
    if (!isInView) { clearAll(); startedRef.current = false; setPhase("idle"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);
  useEffect(() => () => clearAll(), []);

  const round = ROUNDS[Math.min(roundIdx, ROUNDS.length - 1)];
  const winner = p1Score > p2Score ? "Aryan K." : p1Score < p2Score ? "Priya S." : "Draw";

  return (
    <section
      ref={wrapRef}
      style={{
        position: "relative",
        padding: "clamp(60px,10vw,120px) clamp(14px,4vw,24px)",
        overflow: "hidden",
        background: `linear-gradient(180deg, #030308 0%, ${C.bg} 30%, #080814 100%)`,
      }}
    >
      {/* Full-width atmospheric glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "15%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.red}10 0%, transparent 70%)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", top: "20%", right: "15%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.blue}10 0%, transparent 70%)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.violet}0a 0%, transparent 70%)`, filter: "blur(80px)" }} />
        {/* Scan lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)", pointerEvents: "none" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 100,
            padding: "6px 20px", marginBottom: 24,
          }}>
            <Swords size={13} color={C.red} />
            <span style={{ fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.red, letterSpacing: "0.1em" }}>
              DUEL MODE
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.04em",
            lineHeight: 1.02, marginBottom: 16, fontFamily: C.ff,
          }}>
            <span style={{ color: C.red }}>Challenge.</span>{" "}
            <span style={{ color: C.white }}>Compete.</span>{" "}
            <span style={{
              background: `linear-gradient(135deg, ${C.gold}, #FDBA74)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Conquer.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.40)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: C.ff }}>
            Real-time 1v1 math battles. Challenge any student, race to answer first, earn XP and climb the rankings.
            The ultimate test of speed and accuracy.
          </p>
        </motion.div>

        {/* ── DUEL ARENA ─────────────────────────────────────────── */}
        <motion.div
          animate={shakeCtrl}
          style={{
            background: C.bg,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 60px 160px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {/* Top bar — VS banner */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px",
            background: `linear-gradient(90deg, ${C.redDim} 0%, rgba(255,255,255,0.02) 50%, ${C.blueDim} 100%)`,
            borderBottom: `1px solid ${C.bdr}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, boxShadow: `0 0 8px ${C.red}` }} />
              <span style={{ fontFamily: C.fm, fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.06em" }}>PLAYER 1</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.bdr}` }}>
              <Swords size={11} color="rgba(255,255,255,0.35)" />
              <span style={{ fontFamily: C.fm, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
                {phase === "battle" ? `ROUND ${roundIdx + 1}/${ROUNDS.length}` : phase === "matchmaking" ? "MATCHING" : phase === "result" ? "FINISHED" : "DUEL MODE"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: C.fm, fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: "0.06em" }}>PLAYER 2</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, boxShadow: `0 0 8px ${C.blue}` }} />
            </div>
          </div>

          {/* Main arena area */}
          <div className="duel-arena-grid" style={{ minHeight: 360 }}>

            {/* ─── Player 1 (left) ─── */}
            <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${C.bdr}`, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${C.red}06 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%" }}>
                {/* Avatar */}
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, #B91C1C)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 auto 10px", border: "3px solid rgba(239,68,68,0.4)", boxShadow: `0 0 24px ${C.red}40` }}>
                  AK
                </div>
                <div style={{ fontFamily: C.ff, fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>Aryan K.</div>
                <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 16 }}>LEVEL 7 · MASTER</div>

                {/* HP bar */}
                <div style={{ width: "80%", maxWidth: 160, margin: "0 auto 14px", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${p1Hp}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ height: "100%", background: p1Hp > 50 ? C.green : p1Hp > 25 ? C.gold : C.red, borderRadius: 3, boxShadow: `0 0 8px ${p1Hp > 50 ? C.green : C.red}60` }}
                  />
                </div>

                {/* Score */}
                <AnimatePresence mode="wait">
                  <motion.div key={p1Score} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    style={{ fontFamily: C.fm, fontSize: 36, fontWeight: 800, color: C.red, letterSpacing: "-0.04em" }}>
                    {p1Score}
                  </motion.div>
                </AnimatePresence>
                <div style={{ fontFamily: C.fm, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginTop: 2 }}>SCORE</div>

                {/* Answer display */}
                {phase === "battle" && showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                    style={{ marginTop: 18, padding: "8px 16px", borderRadius: 10, background: round.p1Correct ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${round.p1Correct ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}
                  >
                    <span style={{ fontFamily: C.fm, fontSize: 16, fontWeight: 800, color: round.p1Correct ? C.green : C.red }}>{round.p1Answer}</span>
                    <span style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{round.p1Time}</span>
                    <span style={{ marginLeft: 6, fontSize: 14 }}>{round.p1Correct ? "✓" : "✗"}</span>
                  </motion.div>
                )}

                {/* XP pop */}
                <AnimatePresence>
                  {xpPop && xpPop.side === "left" && (
                    <motion.div key={`xp-l-${roundIdx}`}
                      initial={{ opacity: 0, y: 10, scale: 0.5 }} animate={{ opacity: 1, y: -20, scale: 1 }} exit={{ opacity: 0, y: -50 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", fontFamily: C.fm, fontWeight: 800, fontSize: 16, color: C.gold, textShadow: `0 0 12px ${C.gold}80` }}>
                      +{xpPop.val} XP
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ─── Centre column: VS / Question ─── */}
            <div style={{ width: 200, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "20px 0" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${C.violet}08 0%, transparent 70%)`, pointerEvents: "none" }} />
              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} style={{ textAlign: "center" }}>
                    <Swords size={40} color="rgba(255,255,255,0.15)" />
                    <div style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, letterSpacing: "0.15em" }}>WAITING</div>
                  </motion.div>
                )}
                {phase === "matchmaking" && (
                  <motion.div key="mm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <Shield size={32} color={C.violet} />
                    </motion.div>
                    <div style={{ fontFamily: C.fm, fontSize: 11, color: C.violet, fontWeight: 700, letterSpacing: "0.1em", marginTop: 12 }}>
                      MATCHING{".".repeat(mmDots % 4)}
                    </div>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>Finding opponent…</div>
                  </motion.div>
                )}
                {phase === "battle" && (
                  <motion.div
                    key={`q-${roundIdx}`}
                    initial={{ opacity: 0, scale: 0.4, rotateY: 90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{ textAlign: "center", width: "100%" }}
                  >
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", marginBottom: 8 }}>SOLVE</div>
                    <div style={{
                      fontFamily: C.fm, fontWeight: 800,
                      fontSize: "clamp(28px, 4vw, 44px)",
                      color: C.white, letterSpacing: "-0.03em", lineHeight: 1,
                      filter: `drop-shadow(0 0 20px ${C.violet}30)`,
                    }}>
                      {round.question}
                    </div>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: C.gold, letterSpacing: "0.1em", marginTop: 12, fontWeight: 700 }}>
                      FASTEST WINS
                    </div>
                  </motion.div>
                )}
                {phase === "result" && (
                  <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{ textAlign: "center" }}>
                    <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 18 }}>
                      <Crown size={36} color={C.gold} fill={C.gold} style={{ filter: `drop-shadow(0 0 16px ${C.gold}60)` }} />
                    </motion.div>
                    <div style={{ fontFamily: C.fm, fontSize: 10, color: C.gold, letterSpacing: "0.15em", fontWeight: 700, marginTop: 12 }}>WINNER</div>
                    <div style={{ fontFamily: C.ff, fontSize: 16, fontWeight: 700, color: C.white, marginTop: 6 }}>{winner}</div>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 8, letterSpacing: "0.08em" }}>Replaying…</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Player 2 (right) ─── */}
            <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${C.bdr}`, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${C.blue}06 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%" }}>
                {/* Avatar */}
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, #1D4ED8)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 auto 10px", border: "3px solid rgba(59,130,246,0.4)", boxShadow: `0 0 24px ${C.blue}40` }}>
                  PS
                </div>
                <div style={{ fontFamily: C.ff, fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>Priya S.</div>
                <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 16 }}>LEVEL 6 · ADVANCED</div>

                {/* HP bar */}
                <div style={{ width: "80%", maxWidth: 160, margin: "0 auto 14px", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${p2Hp}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ height: "100%", background: p2Hp > 50 ? C.green : p2Hp > 25 ? C.gold : C.red, borderRadius: 3, boxShadow: `0 0 8px ${p2Hp > 50 ? C.green : C.red}60` }}
                  />
                </div>

                {/* Score */}
                <AnimatePresence mode="wait">
                  <motion.div key={p2Score} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    style={{ fontFamily: C.fm, fontSize: 36, fontWeight: 800, color: C.blue, letterSpacing: "-0.04em" }}>
                    {p2Score}
                  </motion.div>
                </AnimatePresence>
                <div style={{ fontFamily: C.fm, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginTop: 2 }}>SCORE</div>

                {/* Answer display */}
                {phase === "battle" && showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                    style={{ marginTop: 18, padding: "8px 16px", borderRadius: 10, background: round.p2Correct ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${round.p2Correct ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}
                  >
                    <span style={{ fontFamily: C.fm, fontSize: 16, fontWeight: 800, color: round.p2Correct ? C.green : C.red }}>{round.p2Answer}</span>
                    <span style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{round.p2Time}</span>
                    <span style={{ marginLeft: 6, fontSize: 14 }}>{round.p2Correct ? "✓" : "✗"}</span>
                  </motion.div>
                )}

                {/* XP pop */}
                <AnimatePresence>
                  {xpPop && xpPop.side === "right" && (
                    <motion.div key={`xp-r-${roundIdx}`}
                      initial={{ opacity: 0, y: 10, scale: 0.5 }} animate={{ opacity: 1, y: -20, scale: 1 }} exit={{ opacity: 0, y: -50 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", fontFamily: C.fm, fontWeight: 800, fontSize: 16, color: C.gold, textShadow: `0 0 12px ${C.gold}80` }}>
                      +{xpPop.val} XP
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 24px",
            background: "rgba(255,255,255,0.015)",
            borderTop: `1px solid ${C.bdr}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Flame size={13} color={C.gold} />
              <span style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>Winner earns 2× XP bonus</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Timer size={13} color="rgba(255,255,255,0.25)" />
              <span style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>5 rounds · fastest finger first</span>
            </div>
          </div>
        </motion.div>

        {/* ── Feature chips below arena ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 40 }}
        >
          {[
            { icon: <Swords size={13} />, text: "Real-time 1v1 battles", color: C.red },
            { icon: <Zap size={13} />,    text: "Instant matchmaking",   color: C.blue },
            { icon: <Crown size={13} />,  text: "ELO-based rankings",   color: C.gold },
            { icon: <Shield size={13} />, text: "Anti-cheat protection", color: C.green },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontFamily: C.ff }}>
              <span style={{ color: f.color }}>{f.icon}</span> {f.text}
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{ textAlign: "center", marginTop: 36 }}
        >
          <a
            href="/duel"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: `linear-gradient(135deg, ${C.red}20, ${C.blue}20)`,
              border: "1px solid rgba(239,68,68,0.25)",
              color: C.white, padding: "16px 32px", borderRadius: 14,
              fontSize: 15, fontWeight: 700, textDecoration: "none", fontFamily: C.ff,
              transition: "background 0.2s, border-color 0.2s, transform 0.15s",
              boxShadow: `0 0 40px ${C.red}15, 0 0 40px ${C.blue}15`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(239,68,68,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(239,68,68,0.25)"; }}
          >
            Challenge a Friend <ChevronRight size={15} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
