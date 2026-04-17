/**
 * MentalArenaGlimpse — Split-screen showcase for Mental Math (left) and Classroom Arena (right).
 * Both have animated live previews showing real gameplay loops.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Brain, Mic, ChevronRight, Zap, Users, Timer, Volume2 } from "lucide-react";

/* ── Design tokens ────────────────────────────────────────────────────────── */

const C = {
  bg:       "#050510",
  surf:     "#0A0A1A",
  surf2:    "#0E0E1F",
  bdr:      "rgba(255,255,255,0.06)",
  white:    "#F0F2FF",
  teal:     "#3ECFB4",
  tealDim:  "rgba(62,207,180,0.10)",
  violet:   "#6D5CFF",
  orange:   "#F97316",
  green:    "#10B981",
  red:      "#EF4444",
  gold:     "#F5A623",
  ff:       "'Space Grotesk', 'DM Sans', sans-serif",
  fm:       "'JetBrains Mono', monospace",
} as const;

/* ── Mental Math demo data ────────────────────────────────────────────────── */

const MENTAL_FLASHES = [
  { numbers: [45, 23, 67, 12], answer: 147 },
  { numbers: [89, 34, 56], answer: 179 },
  { numbers: [72, 18, 93, 41], answer: 224 },
];

/* ── Classroom Arena demo data ────────────────────────────────────────────── */

const ARENA_QUESTIONS = [
  { q: "8 × 7", ans: "56", spoken: "fifty six" },
  { q: "√ 81", ans: "9", spoken: "nine" },
  { q: "12 × 6", ans: "72", spoken: "seventy two" },
];

/* ── Mental Math mini preview ─────────────────────────────────────────────── */

function MentalMathPreview({ active }: { active: boolean }) {
  const [flashIdx, setFlashIdx] = useState(0);
  const [numIdx, setNumIdx] = useState(-1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleRef = useRef<(() => void) | null>(null);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  cycleRef.current = () => {
    clearAll();
    let cursor = 0;
    MENTAL_FLASHES.forEach((flash, fi) => {
      // Reset
      t(cursor, () => { setFlashIdx(fi); setNumIdx(-1); setShowAnswer(false); setCorrect(null); });
      cursor += 400;
      // Flash each number
      flash.numbers.forEach((_, ni) => {
        t(cursor, () => setNumIdx(ni));
        cursor += 600;
      });
      // Blank after last number
      t(cursor, () => setNumIdx(-2));
      cursor += 300;
      // Show answer
      t(cursor, () => { setShowAnswer(true); setCorrect(fi !== 1); });
      cursor += 1400;
    });
    t(cursor, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (active) { t(200, () => cycleRef.current?.()); }
    else { clearAll(); setFlashIdx(0); setNumIdx(-1); setShowAnswer(false); setCorrect(null); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const flash = MENTAL_FLASHES[flashIdx];

  return (
    <div style={{ textAlign: "center", padding: "20px 16px" }}>
      <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginBottom: 16 }}>
        FLASH #{flashIdx + 1} · {flash.numbers.length} NUMBERS
      </div>

      {/* Number flash display */}
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <AnimatePresence mode="wait">
          {numIdx >= 0 && numIdx < flash.numbers.length && (
            <motion.div
              key={`${flashIdx}-${numIdx}`}
              initial={{ opacity: 0, scale: 2.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: C.fm, fontWeight: 800,
                fontSize: "clamp(40px,8vw,64px)",
                color: C.teal,
                filter: `drop-shadow(0 0 20px ${C.teal}50)`,
                letterSpacing: "-0.04em",
              }}
            >
              {flash.numbers[numIdx]}
            </motion.div>
          )}
          {(numIdx === -1 || numIdx === -2) && !showAnswer && (
            <motion.div key="blank" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
              style={{ fontFamily: C.fm, fontSize: 14, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>
              {numIdx === -1 ? "GET READY" : "ANSWER?"}
            </motion.div>
          )}
          {showAnswer && (
            <motion.div key="answer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.fm, fontWeight: 800, fontSize: 36, color: correct ? C.green : C.red, letterSpacing: "-0.04em" }}>
                {flash.answer}
              </div>
              <div style={{ fontFamily: C.fm, fontSize: 10, color: correct ? C.green : C.red, marginTop: 4, letterSpacing: "0.08em" }}>
                {correct ? "✓ CORRECT" : "✗ TRY AGAIN"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Number indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {flash.numbers.map((_, i) => (
          <motion.div key={i}
            animate={{ background: i <= numIdx ? C.teal : "rgba(255,255,255,0.08)", scale: i === numIdx ? 1.3 : 1 }}
            style={{ width: 8, height: 8, borderRadius: "50%", transition: "background 0.2s" }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Classroom Arena mini preview ─────────────────────────────────────────── */

function ArenaPreview({ active }: { active: boolean }) {
  const [qIdx, setQIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleRef = useRef<(() => void) | null>(null);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  cycleRef.current = () => {
    clearAll();
    let cursor = 0;
    ARENA_QUESTIONS.forEach((aq, i) => {
      t(cursor, () => { setQIdx(i); setSpeaking(false); setSpokenText(""); setResult(null); });
      cursor += 800;
      // Start "speaking"
      t(cursor, () => setSpeaking(true));
      cursor += 600;
      // Show spoken text
      t(cursor, () => setSpokenText(aq.spoken));
      cursor += 500;
      // Result
      t(cursor, () => { setSpeaking(false); setResult(true); });
      cursor += 1200;
    });
    t(cursor, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (active) { t(200, () => cycleRef.current?.()); }
    else { clearAll(); setQIdx(0); setSpeaking(false); setSpokenText(""); setResult(null); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const q = ARENA_QUESTIONS[qIdx];

  return (
    <div style={{ textAlign: "center", padding: "20px 16px" }}>
      {/* Student count bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.bdr}`, width: "fit-content", margin: "0 auto 16px" }}>
        <Users size={11} color="rgba(255,255,255,0.3)" />
        <span style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>12 students connected</span>
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{ fontFamily: C.fm, fontWeight: 800, fontSize: "clamp(32px,6vw,52px)", color: C.white, letterSpacing: "-0.03em", marginBottom: 16, filter: `drop-shadow(0 0 16px ${C.orange}20)` }}>
          {q.q}
        </motion.div>
      </AnimatePresence>

      {/* Voice indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12, minHeight: 36 }}>
        {speaking ? (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
              <Mic size={14} color={C.orange} />
            </motion.div>
            {/* Sound wave bars */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {[12, 18, 8, 14, 10].map((h, i) => (
                <motion.div key={i}
                  animate={{ height: [h * 0.4, h, h * 0.4] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
                  style={{ width: 2.5, background: C.orange, borderRadius: 2 }}
                />
              ))}
            </div>
            {spokenText && (
              <span style={{ fontFamily: C.fm, fontSize: 11, color: C.orange, fontWeight: 600 }}>"{spokenText}"</span>
            )}
          </motion.div>
        ) : result ? (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span style={{ fontFamily: C.fm, fontSize: 12, fontWeight: 700, color: C.green }}>{q.ans} ✓</span>
          </motion.div>
        ) : (
          <div style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em" }}>
            <Volume2 size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />LISTENING…
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function MentalArenaGlimpse() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-80px" });
  const [activeTab, setActiveTab] = useState<"mental" | "arena">("mental");
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedRef = useRef(false);
  const cycleRef = useRef<(() => void) | null>(null);

  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  cycleRef.current = () => {
    clearAll();
    setActiveTab("mental");
    t(7000, () => setActiveTab("arena"));
    t(14000, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (isInView && !startedRef.current) { startedRef.current = true; t(300, () => cycleRef.current?.()); }
    if (!isInView) { clearAll(); startedRef.current = false; setActiveTab("mental"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);
  useEffect(() => () => clearAll(), []);

  return (
    <section ref={sectionRef}
      style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.teal}08 0%, transparent 70%)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "8%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.orange}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center", position: "relative", zIndex: 1 }}>

        {/* LEFT: Copy */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: C.tealDim, border: "1px solid rgba(62,207,180,0.24)", borderRadius: 100, padding: "5px 16px", marginBottom: 22, fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.08em" }}>
            <Brain size={11} /> Speed Training
          </div>

          <h2 style={{ fontSize: "clamp(26px,3.5vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 16, fontFamily: C.ff, color: C.white }}>
            Flash. Speak.{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.green})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic" }}>
              Conquer.
            </span>
          </h2>

          <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 28, fontFamily: C.ff }}>
            Mental Math flashes numbers at speed — students calculate in their head. Classroom Arena turns group practice into a live, voice-powered competition.{" "}
            <em style={{ color: "rgba(255,255,255,0.65)", fontStyle: "normal", fontWeight: 600 }}>Two modes, one goal: mental speed.</em>
          </p>

          {/* Feature cards for both modes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {[
              { icon: <Brain size={15} color={C.teal} />,   label: "Mental Math", desc: "Timed number flashing with configurable speed & digit count" },
              { icon: <Mic size={15} color={C.orange} />,    label: "Classroom Arena", desc: "Voice-powered live classroom competition with speech recognition" },
              { icon: <Timer size={15} color={C.violet} />,  label: "Adaptive Speed", desc: "Difficulty auto-adjusts based on student performance" },
              { icon: <Users size={15} color={C.green} />,   label: "Multiplayer", desc: "Teachers control sessions, students compete in real-time" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(62,207,180,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: C.fm, fontSize: 9, fontWeight: 700, color: C.teal, letterSpacing: "0.08em", marginBottom: 1 }}>{f.label}</div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: C.ff }}>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <a href="/mental" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(62,207,180,0.12)", border: "1px solid rgba(62,207,180,0.30)", color: C.teal, padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: C.ff, transition: "background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(62,207,180,0.22)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(62,207,180,0.12)"; }}>
              Mental Math <ChevronRight size={13} />
            </a>
            <a href="/classroom-arena" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.30)", color: C.orange, padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: C.ff, transition: "background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(249,115,22,0.22)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(249,115,22,0.12)"; }}>
              Arena <ChevronRight size={13} />
            </a>
          </div>
        </div>

        {/* RIGHT: Live preview */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            background: C.bg, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 20,
            overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}>
            {/* macOS chrome */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", background: C.surf, borderBottom: `1px solid ${C.bdr}` }}>
              <div style={{ display: "flex", gap: 6 }}>{["#FF5F57", "#FFBD2E", "#28C840"].map(col => <div key={col} style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />)}</div>
              <div style={{ flex: 1, background: C.surf2, borderRadius: 6, padding: "4px 14px", fontSize: 11, fontFamily: C.fm, color: "#343650", textAlign: "center", border: `1px solid ${C.bdr}` }}>
                blackmonkey.app/{activeTab === "mental" ? "mental-math" : "classroom-arena"}
              </div>
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}` }}>
              {([
                { key: "mental" as const, label: "MENTAL MATH", icon: <Brain size={11} />, color: C.teal },
                { key: "arena" as const, label: "CLASSROOM ARENA", icon: <Mic size={11} />, color: C.orange },
              ]).map((tab) => (
                <div key={tab.key} style={{
                  flex: 1, padding: "10px 8px", textAlign: "center", cursor: "default",
                  borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
                  background: activeTab === tab.key ? `${tab.color}08` : "transparent",
                  transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span style={{ color: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.15)" }}>{tab.icon}</span>
                  <span style={{ fontFamily: C.fm, fontSize: 9, fontWeight: 700, color: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
                    {tab.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={{ minHeight: 280 }}>
              <AnimatePresence mode="wait">
                {activeTab === "mental" && (
                  <motion.div key="mental" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
                    <MentalMathPreview active={activeTab === "mental"} />
                  </motion.div>
                )}
                {activeTab === "arena" && (
                  <motion.div key="arena" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
                    <ArenaPreview active={activeTab === "arena"} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
