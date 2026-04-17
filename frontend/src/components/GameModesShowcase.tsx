/**
 * GameModesShowcase — Four live-animated game mode cards.
 * Each card has an internal looping micro-demo that plays when the card
 * is in view. Hover lifts the card, pulses the glow, and reveals a CTA.
 */

import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Zap, Swords, Users, Gamepad2, ArrowRight } from "lucide-react";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const T = {
  bg:    "#050510",
  surf:  "#0A0A1A",
  bdr:   "rgba(255,255,255,0.06)",
  bdr2:  "rgba(255,255,255,0.10)",
  white: "#F0F2FF",
  muted: "rgba(240,242,255,0.38)",
  ff:    "'DM Sans', sans-serif",
  fm:    "'JetBrains Mono', monospace",
} as const;

// ─── Burst mini demo ──────────────────────────────────────────────────────────

const BURST_Q = ["47 × 8", "√ 225", "63 ÷ 7", "12 × 14"];
const BURST_A = ["376", "15", "9", "168"];

function BurstMini({ active }: { active: boolean }) {
  const [qi, setQi]     = useState(0);
  const [typed, setTyped] = useState("");
  const [ok, setOk]     = useState<boolean | null>(null);
  const [timer, setTimer] = useState(60);
  const tiRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const cyRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    cyRef.current.forEach(clearTimeout);
    cyRef.current = [];
    if (tiRef.current) { clearInterval(tiRef.current); tiRef.current = null; }
  };

  const t = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    cyRef.current.push(id);
  };

  useEffect(() => {
    if (!active) { clearAll(); setQi(0); setTyped(""); setOk(null); setTimer(60); return; }

    setTimer(60);
    tiRef.current = setInterval(() => setTimer(v => v > 0 ? v - 1 : 60), 1000);

    const cycle = (idx: number) => {
      const ans = BURST_A[idx];
      setQi(idx); setTyped(""); setOk(null);
      let charT = 700;
      for (let c = 1; c <= ans.length; c++) {
        const slice = ans.slice(0, c);
        t(charT, () => setTyped(slice));
        charT += 260;
      }
      t(charT + 200, () => { setOk(true); });
      t(charT + 900, () => cycle((idx + 1) % BURST_Q.length));
    };
    t(200, () => cycle(0));
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => clearAll(), []);

  return (
    <div style={{ fontFamily: T.fm, textAlign: "center" }}>
      {/* Mini timer arc */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: 60, height: 60 }}>
          <svg width="60" height="60" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
            <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle cx="30" cy="30" r="24" fill="none" stroke="#F97316"
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - timer / 60)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#F97316" }}>{timer}</div>
        </div>
      </div>
      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qi}
          initial={{ opacity: 0, y: 12, scale: 0.85 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={   { opacity: 0, y: -10, scale: 1.08  }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          style={{ fontSize: 26, fontWeight: 800, color: T.white, letterSpacing: "-0.03em", marginBottom: 14 }}
        >
          {BURST_Q[qi]}
        </motion.div>
      </AnimatePresence>
      {/* Answer box */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        minWidth: 90, padding: "8px 18px", borderRadius: 10,
        border: `2px solid ${ok === true ? "#10B981" : ok === false ? "#EF4444" : "rgba(255,255,255,0.12)"}`,
        background: ok === true ? "rgba(16,185,129,0.08)" : ok === false ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
        transition: "border-color 0.18s, background 0.18s",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: ok === true ? "#10B981" : ok === false ? "#EF4444" : T.white }}>
          {typed || "\u00A0"}
        </span>
        {ok === null && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
            style={{ display: "inline-block", width: 2, height: 18, background: "#F97316", borderRadius: 2 }}
          />
        )}
        {ok === true  && <span style={{ color: "#10B981", fontSize: 16 }}> ✓</span>}
        {ok === false && <span style={{ color: "#EF4444", fontSize: 16 }}> ✗</span>}
      </div>
    </div>
  );
}

// ─── Duel mini demo ───────────────────────────────────────────────────────────

const DUEL_Q = "63 × 4";
const PLAYERS = [
  { name: "You",    color: "#6D5CFF", progress: 0 },
  { name: "Rival",  color: "#F97316", progress: 0 },
];

function DuelMini({ active }: { active: boolean }) {
  const [pct, setPct] = useState([0, 0]);
  const [done, setDone] = useState<number | null>(null);
  const cyRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => { cyRef.current.forEach(clearTimeout); cyRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); cyRef.current.push(id); };

  useEffect(() => {
    if (!active) { clearAll(); setPct([0,0]); setDone(null); return; }
    const run = () => {
      setPct([0,0]); setDone(null);
      const steps = [
        [15,0],[30,12],[45,25],[55,35],[68,50],[82,62],[100,80],
      ];
      steps.forEach(([y, r], i) => {
        t(i * 280 + 400, () => setPct([y, r]));
      });
      t(steps.length * 280 + 500, () => { setDone(0); });
      t(steps.length * 280 + 2800, () => run());
    };
    t(300, run);
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => clearAll(), []);

  return (
    <div style={{ fontFamily: T.fm }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.white, textAlign: "center", marginBottom: 18, letterSpacing: "-0.03em" }}>
        {DUEL_Q} = ?
      </div>
      {PLAYERS.map((p, i) => (
        <div key={p.name} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: i === done ? p.color : "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
              {p.name} {i === done ? "🏆" : ""}
            </span>
            <span style={{ fontSize: 11, color: p.color }}>{pct[i]}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${pct[i]}%` }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              style={{ height: "100%", background: p.color, borderRadius: 4, boxShadow: `0 0 12px ${p.color}60` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Classroom mini demo ──────────────────────────────────────────────────────

const CLASS_STUDENTS = [
  { name: "Aryan",  score: 0, color: "#6D5CFF" },
  { name: "Priya",  score: 0, color: "#F97316" },
  { name: "Rohit",  score: 0, color: "#10B981" },
  { name: "Ananya", score: 0, color: "#F5A623" },
];

function ClassroomMini({ active }: { active: boolean }) {
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [active_i, setActiveI] = useState(0);
  const cyRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { cyRef.current.forEach(clearTimeout); cyRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); cyRef.current.push(id); };

  useEffect(() => {
    if (!active) { clearAll(); setScores([0,0,0,0]); setActiveI(0); return; }
    const run = () => {
      setScores([0,0,0,0]); setActiveI(0);
      const seq = [
        { i: 0, pts: 10 }, { i: 2, pts: 10 }, { i: 1, pts: 10 }, { i: 3, pts: 10 },
        { i: 0, pts: 10 }, { i: 2, pts: 10 }, { i: 0, pts: 10 },
      ];
      seq.forEach(({ i, pts }, step) => {
        t(step * 560 + 400, () => {
          setActiveI(i);
          setScores(prev => { const n = [...prev]; n[i] += pts; return n; });
        });
      });
      t(seq.length * 560 + 1200, run);
    };
    t(300, run);
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => clearAll(), []);

  const sorted = CLASS_STUDENTS.map((s, i) => ({ ...s, score: scores[i], i })).sort((a,b) => b.score - a.score);

  return (
    <div style={{ fontFamily: T.fm }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 12 }}>LIVE SCOREBOARD</div>
      {sorted.map((s, rank) => (
        <motion.div
          key={s.name}
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 10, marginBottom: 6,
            background: active_i === s.i ? `${s.color}12` : "rgba(255,255,255,0.025)",
            border: `1px solid ${active_i === s.i ? s.color + "35" : "rgba(255,255,255,0.05)"}`,
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: rank === 0 ? "#F5A623" : "rgba(255,255,255,0.25)", width: 18, textAlign: "center" }}>
            {rank === 0 ? "🏆" : `${rank + 1}`}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: s.color, flex: 1 }}>{s.name}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={s.score}
              initial={{ scale: 1.5, color: s.color }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
              style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: T.fm }}
            >
              {s.score}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

// ─── NumberNinja mini demo ─────────────────────────────────────────────────────

const NINJA_SEQ = [
  { q: "8 × 7",  correct: true,  combo: 1 },
  { q: "15 + 28", correct: true,  combo: 2 },
  { q: "96 ÷ 8",  correct: true,  combo: 3 },
  { q: "13 × 6",  correct: false, combo: 0 },
  { q: "7 × 9",   correct: true,  combo: 1 },
];

function NinjaMini({ active }: { active: boolean }) {
  const [idx, setIdx]     = useState(0);
  const [fb, setFb]       = useState<boolean | null>(null);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const cyRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { cyRef.current.forEach(clearTimeout); cyRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); cyRef.current.push(id); };

  useEffect(() => {
    if (!active) { clearAll(); setIdx(0); setFb(null); setCombo(0); setScore(0); return; }
    const cycle = (i: number) => {
      const item = NINJA_SEQ[i % NINJA_SEQ.length];
      setIdx(i % NINJA_SEQ.length); setFb(null);
      t(700, () => {
        setFb(item.correct);
        setCombo(item.combo);
        setScore(prev => prev + (item.correct ? 10 * Math.max(item.combo, 1) : 0));
      });
      t(1450, () => cycle(i + 1));
    };
    t(300, () => cycle(0));
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => clearAll(), []);

  const item = NINJA_SEQ[idx];
  return (
    <div style={{ fontFamily: T.fm, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 11 }}>
        <span style={{ color: "rgba(255,255,255,0.35)" }}>SCORE</span>
        <motion.span key={score} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
          style={{ fontWeight: 800, color: "#F5A623" }}>{score}</motion.span>
      </div>
      {combo > 0 && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
          style={{ fontSize: 10, fontWeight: 700, color: "#F97316", letterSpacing: "0.12em", marginBottom: 10 }}
        >
          {"🔥".repeat(Math.min(combo, 3))} {combo}× COMBO
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1,   rotate: 0  }}
          exit={   { opacity: 0, x: fb === true ? 80 : -80 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          style={{
            fontSize: 28, fontWeight: 800, color: T.white, letterSpacing: "-0.03em",
            background: fb === true ? "rgba(16,185,129,0.08)" : fb === false ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
            border: `2px solid ${fb === true ? "#10B981" : fb === false ? "#EF4444" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 16, padding: "20px 32px", transition: "border-color 0.18s, background 0.18s",
          }}
        >
          {item.q}
          {fb !== null && <span style={{ fontSize: 20, marginLeft: 12 }}>{fb ? " ✓" : " ✗"}</span>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES = [
  {
    id:    "burst",
    label: "Burst Mode",
    icon:  <Zap size={20} />,
    tag:   "⚡ SPEED DRILL",
    tagColor: "#F97316",
    glow: "rgba(249,115,22,0.18)",
    glowSoft: "rgba(249,115,22,0.07)",
    border: "rgba(249,115,22,0.22)",
    borderHover: "rgba(249,115,22,0.45)",
    desc: "60 seconds. Pure speed. Questions burst on screen — type the answer before the next one hits.",
    route: "/burst-mode",
    cta: "Start Burst",
    Demo: BurstMini,
  },
  {
    id:    "duel",
    label: "Duel Mode",
    icon:  <Swords size={20} />,
    tag:   "⚔️ HEAD-TO-HEAD",
    tagColor: "#6D5CFF",
    glow: "rgba(109,92,255,0.18)",
    glowSoft: "rgba(109,92,255,0.07)",
    border: "rgba(109,92,255,0.22)",
    borderHover: "rgba(109,92,255,0.45)",
    desc: "Challenge a friend with a code. Same question, same clock. First to the right answer wins the round.",
    route: "/duel",
    cta: "Challenge Someone",
    Demo: DuelMini,
  },
  {
    id:    "classroom",
    label: "Classroom Arena",
    icon:  <Users size={20} />,
    tag:   "🎓 TEACHER MODE",
    tagColor: "#10B981",
    glow: "rgba(16,185,129,0.18)",
    glowSoft: "rgba(16,185,129,0.07)",
    border: "rgba(16,185,129,0.22)",
    borderHover: "rgba(16,185,129,0.45)",
    desc: "Add your students, run live rounds on one shared screen. Real-time scoreboard. No logins required.",
    route: "/classroom-arena",
    cta: "Open Arena",
    Demo: ClassroomMini,
  },
  {
    id:    "ninja",
    label: "Number Ninja",
    icon:  <Gamepad2 size={20} />,
    tag:   "🥷 ARCADE",
    tagColor: "#F5A623",
    glow: "rgba(245,166,35,0.18)",
    glowSoft: "rgba(245,166,35,0.07)",
    border: "rgba(245,166,35,0.22)",
    borderHover: "rgba(245,166,35,0.45)",
    desc: "Swipe or tap to answer. Combo chains. Tier-based challenges. Designed to feel like a real arcade game.",
    route: "/number-ninja",
    cta: "Play Now",
    Demo: NinjaMini,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameModesShowcase() {
  const [, setLocation] = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView   = useInView(sectionRef, { once: false, margin: "-80px" });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section
      ref={sectionRef}
      style={{ padding: "clamp(80px,12vw,140px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}
    >
      {/* Section glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,92,255,0.05) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: 68 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(109,92,255,0.1)", border: "1px solid rgba(109,92,255,0.24)", borderRadius: 100,
            padding: "5px 16px", marginBottom: 22,
            fontFamily: T.fm, fontSize: 11, fontWeight: 700, color: "#8B7FFF", letterSpacing: "0.08em",
          }}>
            <Gamepad2 size={11} /> FOUR WAYS TO TRAIN
          </div>
          <h2 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 16px", fontFamily: T.ff, color: "#F0F2FF", lineHeight: 1.0 }}>
            Pick your game.{" "}
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg, #6D5CFF, #8B7FFF, #3ECFB4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Beat the clock.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.38)", maxWidth: 520, margin: "0 auto", lineHeight: 1.72, fontFamily: T.ff }}>
            Not just worksheets. Four live game modes that make math feel like competing in a tournament.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {MODES.map((mode, idx) => {
            const isHovered = hoveredId === mode.id;
            const cardActive = isInView;

            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHoveredId(mode.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setLocation(mode.route)}
                style={{
                  background: isHovered ? mode.glowSoft : "#0A0A1A",
                  border: `1px solid ${isHovered ? mode.borderHover : mode.border}`,
                  borderRadius: 24,
                  padding: "28px 24px 24px",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  transform: isHovered ? "translateY(-10px)" : "translateY(0)",
                  boxShadow: isHovered
                    ? `0 32px 100px rgba(0,0,0,0.55), 0 0 0 1px ${mode.border}, 0 0 60px ${mode.glow}`
                    : "0 8px 32px rgba(0,0,0,0.4)",
                  transition: "transform 0.26s cubic-bezier(0.22,1,0.36,1), box-shadow 0.26s ease, background 0.22s, border-color 0.22s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                {/* Ambient top glow on hover */}
                <div style={{
                  position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
                  width: 260, height: 120, borderRadius: "50%",
                  background: isHovered ? mode.glow : "transparent",
                  filter: "blur(40px)", pointerEvents: "none",
                  transition: "background 0.3s",
                }} />

                {/* Top row: icon + tag */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, position: "relative" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `${mode.tagColor}15`,
                    border: `1px solid ${mode.tagColor}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: mode.tagColor,
                  }}>
                    {mode.icon}
                  </div>
                  <div style={{
                    fontFamily: T.fm, fontSize: 9, fontWeight: 700,
                    color: mode.tagColor, letterSpacing: "0.1em",
                    background: `${mode.tagColor}10`,
                    border: `1px solid ${mode.tagColor}22`,
                    borderRadius: 100, padding: "3px 10px",
                  }}>
                    {mode.tag}
                  </div>
                </div>

                {/* Title + desc */}
                <div style={{ fontFamily: T.ff, fontWeight: 800, fontSize: 20, color: "#F0F2FF", letterSpacing: "-0.025em", marginBottom: 10 }}>
                  {mode.label}
                </div>
                <p style={{ fontFamily: T.ff, fontSize: 13.5, color: "rgba(255,255,255,0.42)", lineHeight: 1.72, marginBottom: 24 }}>
                  {mode.desc}
                </p>

                {/* Live demo area */}
                <div style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid rgba(255,255,255,0.06)`,
                  borderRadius: 16, padding: "22px 18px",
                  marginBottom: 22, minHeight: 160,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${mode.tagColor}04, transparent)`, pointerEvents: "none" }} />
                  <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
                    <mode.Demo active={cardActive} />
                  </div>
                </div>

                {/* CTA row — appears on hover */}
                <motion.div
                  animate={{ opacity: isHovered ? 1 : 0.45, x: isHovered ? 0 : -4 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontFamily: T.fm, fontSize: 12, fontWeight: 700,
                    color: mode.tagColor, letterSpacing: "0.04em",
                  }}
                >
                  {mode.cta}
                  <motion.div animate={{ x: isHovered ? 3 : 0 }} transition={{ duration: 0.2 }}>
                    <ArrowRight size={14} />
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.55, duration: 0.6 }}
          style={{ textAlign: "center", marginTop: 40, fontFamily: T.fm, fontSize: 11, color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em" }}
        >
          All modes auto-save · Progress synced to your dashboard · Works on any device
        </motion.p>
      </div>
    </section>
  );
}
