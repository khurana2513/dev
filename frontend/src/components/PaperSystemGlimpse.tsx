/**
 * PaperSystemGlimpse — Animated step-through of the paper lifecycle:
 * CREATE → ATTEMPT → SHARE. Split layout with live preview on left, copy on right.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { FileText, PenTool, Share2, ChevronRight, CheckCircle2, Printer, Download, Settings } from "lucide-react";

/* ── Design tokens ────────────────────────────────────────────────────────── */

const C = {
  bg:       "#050510",
  surf:     "#0A0A1A",
  surf2:    "#0E0E1F",
  bdr:      "rgba(255,255,255,0.06)",
  white:    "#F0F2FF",
  violet:   "#6D5CFF",
  violetDim:"rgba(109,92,255,0.10)",
  green:    "#10B981",
  orange:   "#F97316",
  gold:     "#F5A623",
  pink:     "#EC4899",
  ff:       "'Space Grotesk', 'DM Sans', sans-serif",
  fm:       "'JetBrains Mono', monospace",
} as const;

/* ── Step data ────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    phase: "create" as const,
    icon: <FileText size={18} />,
    label: "CREATE",
    title: "Design your paper",
    desc: "Choose operation type, digit count, row count. Set institute headers, student info fields, and difficulty.",
    color: C.violet,
    dim: C.violetDim,
  },
  {
    phase: "attempt" as const,
    icon: <PenTool size={18} />,
    label: "ATTEMPT",
    title: "Students solve it",
    desc: "Share via code or link. Students attempt on any device. Timer, auto-grading, and instant results.",
    color: C.orange,
    dim: "rgba(249,115,22,0.10)",
  },
  {
    phase: "share" as const,
    icon: <Share2 size={18} />,
    label: "SHARE",
    title: "Export & distribute",
    desc: "Generate beautiful PDF papers. Print, download, or share digitally. Professional formatting built in.",
    color: C.pink,
    dim: "rgba(236,72,153,0.10)",
  },
];

type StepPhase = "create" | "attempt" | "share";

/* ── Animated paper mock for CREATE ───────────────────────────────────────── */

function CreatePreview({ active }: { active: boolean }) {
  const [rows, setRows] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };

  useEffect(() => {
    if (!active) { clearAll(); setRows(0); return; }
    for (let i = 1; i <= 5; i++) {
      const id = setTimeout(() => setRows(i), i * 400);
      timeoutsRef.current.push(id);
    }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const sampleRows = [
    { q: "347 + 158 + 492", a: "" },
    { q: "623 − 287 + 145", a: "" },
    { q: "891 + 234 − 567", a: "" },
    { q: "456 + 789 − 123", a: "" },
    { q: "234 + 567 + 890", a: "" },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, fontFamily: C.fm, color: "#111", maxWidth: 320, margin: "0 auto" }}>
      {/* Paper header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#333" }}>BLACKMONKEY INSTITUTE</div>
        <div style={{ fontSize: 8, color: "#888", marginTop: 3 }}>Abacus Practice · Level 3 · Direct Add/Sub</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#999", marginBottom: 10 }}>
        <span>Name: ___________</span><span>Date: ___/___/____</span>
      </div>
      {/* Rows animating in */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sampleRows.slice(0, rows).map((r, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: i % 2 === 0 ? "#f8f8f8" : "#fff", borderRadius: 4, border: "1px solid #eee" }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{i + 1}. {r.q}</span>
            <span style={{ fontSize: 10, color: "#ccc", borderBottom: "1px dashed #ccc", width: 40, textAlign: "center" }}>ans</span>
          </motion.div>
        ))}
      </div>
      {rows >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ marginTop: 12, display: "flex", gap: 6, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "#f3f0ff", fontSize: 9, fontWeight: 600, color: "#6D5CFF" }}>
            <Settings size={10} /> 3 Digits
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "#fef3e2", fontSize: 9, fontWeight: 600, color: "#f97316" }}>
            5 Rows
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Animated solving mock for ATTEMPT ────────────────────────────────────── */

function AttemptPreview({ active }: { active: boolean }) {
  const [solvedCount, setSolvedCount] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };

  useEffect(() => {
    if (!active) { clearAll(); setSolvedCount(0); return; }
    for (let i = 1; i <= 4; i++) {
      const id = setTimeout(() => setSolvedCount(i), i * 600);
      timeoutsRef.current.push(id);
    }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const questions = [
    { q: "347 + 158 + 492", ans: "997", correct: true },
    { q: "623 − 287 + 145", ans: "481", correct: true },
    { q: "891 + 234 − 567", ans: "560", correct: false },
    { q: "456 + 789 − 123", ans: "1122", correct: true },
  ];

  return (
    <div style={{ maxWidth: 320, margin: "0 auto" }}>
      {/* Timer bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.bdr}`, borderRadius: 10 }}>
        <span style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>SOLVING</span>
        <span style={{ fontFamily: C.fm, fontSize: 12, fontWeight: 700, color: C.orange }}>{solvedCount}/5</span>
      </div>
      {questions.slice(0, solvedCount).map((q, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: q.correct ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${q.correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`, borderRadius: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: C.fm, fontSize: 12, color: C.white }}>{q.q}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: C.fm, fontSize: 13, fontWeight: 700, color: q.correct ? C.green : "#EF4444" }}>{q.ans}</span>
            <CheckCircle2 size={14} color={q.correct ? C.green : "#EF4444"} />
          </div>
        </motion.div>
      ))}
      {solvedCount >= 4 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          style={{ marginTop: 10, padding: "10px 14px", background: "rgba(109,92,255,0.06)", border: "1px solid rgba(109,92,255,0.18)", borderRadius: 10, textAlign: "center" }}>
          <span style={{ fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.violet }}>75% Accuracy · +38 XP earned</span>
        </motion.div>
      )}
    </div>
  );
}

/* ── PDF export mock for SHARE ────────────────────────────────────────────── */

function SharePreview({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };

  useEffect(() => {
    if (!active) { clearAll(); setStep(0); return; }
    const id1 = setTimeout(() => setStep(1), 500);
    const id2 = setTimeout(() => setStep(2), 1200);
    const id3 = setTimeout(() => setStep(3), 2000);
    timeoutsRef.current.push(id1, id2, id3);
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div style={{ maxWidth: 320, margin: "0 auto", textAlign: "center" }}>
      {/* PDF preview */}
      <motion.div
        animate={{ scale: step >= 1 ? 1 : 0.9, opacity: step >= 1 ? 1 : 0.3 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "#fff", borderRadius: 8, padding: "24px 20px", marginBottom: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          display: "inline-block", position: "relative",
        }}
      >
        <div style={{ width: 180, height: 220, background: "#fafafa", borderRadius: 4, border: "1px solid #eee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 12 }}>
          <div style={{ width: "80%", height: 8, background: "#e5e5e5", borderRadius: 4 }} />
          <div style={{ width: "60%", height: 6, background: "#eee", borderRadius: 3 }} />
          <div style={{ width: "100%", height: 1, background: "#ddd", margin: "6px 0" }} />
          {[1, 2, 3, 4].map(r => (
            <div key={r} style={{ width: "90%", height: 10, background: r % 2 === 0 ? "#f5f5f5" : "#fafafa", borderRadius: 3 }} />
          ))}
        </div>
        {step >= 2 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}
            style={{ position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={16} color="#fff" />
          </motion.div>
        )}
      </motion.div>
      {/* Action buttons */}
      {step >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[
            { icon: <Printer size={12} />, label: "Print", color: C.violet },
            { icon: <Download size={12} />, label: "PDF", color: C.orange },
            { icon: <Share2 size={12} />, label: "Share", color: C.pink },
          ].map((a, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: `${a.color}14`, border: `1px solid ${a.color}30`, fontSize: 11, fontWeight: 600, color: a.color, fontFamily: C.fm }}>
              {a.icon} {a.label}
            </motion.div>
          ))}
        </motion.div>
      )}
      {step >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ marginTop: 12, fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>
          Paper code: BM-7X4K · Shareable link ready
        </motion.div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function PaperSystemGlimpse() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-80px" });

  const [activeStep, setActiveStep] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedRef = useRef(false);
  const cycleRef = useRef<(() => void) | null>(null);

  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  cycleRef.current = () => {
    clearAll();
    setActiveStep(0);
    t(3200, () => setActiveStep(1));
    t(6400, () => setActiveStep(2));
    t(10000, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (isInView && !startedRef.current) { startedRef.current = true; t(300, () => cycleRef.current?.()); }
    if (!isInView) { clearAll(); startedRef.current = false; setActiveStep(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);
  useEffect(() => () => clearAll(), []);

  const step = STEPS[activeStep];

  return (
    <section
      ref={sectionRef}
      style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "15%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.violet}08 0%, transparent 70%)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.pink}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center", position: "relative", zIndex: 1 }}>

        {/* LEFT: Live preview */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            background: C.bg, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 20,
            overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}>
            {/* macOS chrome */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", background: C.surf, borderBottom: `1px solid ${C.bdr}` }}>
              <div style={{ display: "flex", gap: 6 }}>{["#FF5F57", "#FFBD2E", "#28C840"].map(col => <div key={col} style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />)}</div>
              <div style={{ flex: 1, background: C.surf2, borderRadius: 6, padding: "4px 14px", fontSize: 11, fontFamily: C.fm, color: "#343650", textAlign: "center", border: `1px solid ${C.bdr}` }}>blackmonkey.app/papers</div>
            </div>

            {/* Step tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}` }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: "10px 8px", textAlign: "center", cursor: "default",
                  borderBottom: activeStep === i ? `2px solid ${s.color}` : "2px solid transparent",
                  background: activeStep === i ? `${s.color}08` : "transparent",
                  transition: "all 0.3s",
                }}>
                  <span style={{ fontFamily: C.fm, fontSize: 9, fontWeight: 700, color: activeStep === i ? s.color : "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Preview content */}
            <div style={{ padding: "28px 20px", minHeight: 340 }}>
              <AnimatePresence mode="wait">
                {activeStep === 0 && (
                  <motion.div key="create" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
                    <CreatePreview active={activeStep === 0} />
                  </motion.div>
                )}
                {activeStep === 1 && (
                  <motion.div key="attempt" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
                    <AttemptPreview active={activeStep === 1} />
                  </motion.div>
                )}
                {activeStep === 2 && (
                  <motion.div key="share" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
                    <SharePreview active={activeStep === 2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: Copy */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: C.violetDim, border: "1px solid rgba(109,92,255,0.24)", borderRadius: 100, padding: "5px 16px", marginBottom: 22, fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.violet, letterSpacing: "0.08em" }}>
            <FileText size={11} /> Paper System
          </div>

          <h2 style={{ fontSize: "clamp(26px,3.5vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 16, fontFamily: C.ff, color: C.white }}>
            Create. Attempt.{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.violet}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic" }}>
              Share.
            </span>
          </h2>

          <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 28, fontFamily: C.ff }}>
            Generate professional practice papers in seconds. Students attempt them digitally with auto-grading, or print beautiful PDFs.{" "}
            <em style={{ color: "rgba(255,255,255,0.65)", fontStyle: "normal", fontWeight: 600 }}>The complete paper lifecycle.</em>
          </p>

          {/* Step indicators */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                animate={{ borderColor: activeStep === i ? `${s.color}40` : "rgba(255,255,255,0.07)", background: activeStep === i ? `${s.color}08` : "rgba(255,255,255,0.03)" }}
                transition={{ duration: 0.3 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, background: s.dim, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontFamily: C.fm, fontSize: 9, fontWeight: 700, color: s.color, letterSpacing: "0.1em", marginBottom: 2 }}>{s.label}</div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: C.ff }}>{s.title}</span>
                </div>
                {activeStep === i && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginLeft: "auto" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <a href="/papers" style={{ display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start", background: "rgba(109,92,255,0.12)", border: "1px solid rgba(109,92,255,0.30)", color: C.violet, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: C.ff, transition: "background 0.2s, border-color 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(109,92,255,0.22)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(109,92,255,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(109,92,255,0.12)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(109,92,255,0.30)"; }}>
            Try Paper Builder <ChevronRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
