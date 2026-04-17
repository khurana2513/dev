/**
 * ForInstitutesShowcase — Split-layout showcase for institute features:
 * Admin Dashboard, Attendance System, Fee Management, Live Exams / Olympiad.
 * Auto-playing tabbed demo on left, copy on right.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Building2, Users, CalendarCheck, IndianRupee, GraduationCap, ChevronRight, CheckCircle2, TrendingUp, Bell, Clock } from "lucide-react";

/* ── Design tokens ────────────────────────────────────────────────────────── */

const C = {
  bg:       "#050510",
  surf:     "#0A0A1A",
  surf2:    "#0E0E1F",
  bdr:      "rgba(255,255,255,0.06)",
  white:    "#F0F2FF",
  emerald:  "#10B981",
  emeraldDim: "rgba(16,185,129,0.10)",
  violet:   "#6D5CFF",
  orange:   "#F97316",
  gold:     "#F5A623",
  blue:     "#3B82F6",
  pink:     "#EC4899",
  ff:       "'Space Grotesk', 'DM Sans', sans-serif",
  fm:       "'JetBrains Mono', monospace",
} as const;

/* ── Tab data ─────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "dashboard" as const, icon: <TrendingUp size={12} />, label: "DASHBOARD", color: C.emerald },
  { key: "attendance" as const, icon: <CalendarCheck size={12} />, label: "ATTENDANCE", color: C.blue },
  { key: "fees" as const, icon: <IndianRupee size={12} />, label: "FEE SYSTEM", color: C.gold },
  { key: "exams" as const, icon: <GraduationCap size={12} />, label: "LIVE EXAMS", color: C.pink },
];

type TabKey = typeof TABS[number]["key"];

/* ── Dashboard Preview ────────────────────────────────────────────────────── */

function DashboardPreview({ active }: { active: boolean }) {
  const [stats, setStats] = useState([0, 0, 0]);
  const [bars, setBars] = useState([0, 0, 0, 0, 0]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  useEffect(() => {
    if (!active) { clearAll(); setStats([0, 0, 0]); setBars([0, 0, 0, 0, 0]); return; }
    t(300, () => setStats([247, 89, 96]));
    t(600, () => setBars([78, 92, 65, 88, 71]));
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const statLabels = ["Total Students", "Active Today", "Avg Accuracy"];
  const statSuffix = ["", "", "%"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div style={{ padding: "16px 12px" }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {stats.map((val, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: val > 0 ? 1 : 0.3, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            style={{ padding: "10px 8px", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.bdr}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: C.fm, fontSize: 18, fontWeight: 800, color: C.emerald, letterSpacing: "-0.03em" }}>{val}{statSuffix[i]}</div>
            <div style={{ fontFamily: C.fm, fontSize: 7, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginTop: 2 }}>{statLabels[i]}</div>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ padding: "12px", background: "rgba(255,255,255,0.015)", border: `1px solid ${C.bdr}`, borderRadius: 10 }}>
        <div style={{ fontFamily: C.fm, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 10 }}>WEEKLY ACTIVITY</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h * 0.55}px` }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                style={{ width: "100%", background: `linear-gradient(to top, ${C.emerald}60, ${C.emerald})`, borderRadius: "4px 4px 0 0", minHeight: 2 }}
              />
              <span style={{ fontFamily: C.fm, fontSize: 7, color: "rgba(255,255,255,0.2)" }}>{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Attendance Preview ───────────────────────────────────────────────────── */

function AttendancePreview({ active }: { active: boolean }) {
  const [checked, setChecked] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  const students = [
    { name: "Aryan K.", batch: "L3-Morning" },
    { name: "Priya S.", batch: "L3-Morning" },
    { name: "Rohan M.", batch: "L2-Evening" },
    { name: "Isha P.", batch: "L4-Morning" },
    { name: "Karan T.", batch: "L1-Evening" },
  ];

  useEffect(() => {
    if (!active) { clearAll(); setChecked(0); return; }
    for (let i = 1; i <= 5; i++) { t(i * 450, () => setChecked(i)); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div style={{ padding: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "6px 10px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8 }}>
        <span style={{ fontFamily: C.fm, fontSize: 9, color: C.blue, letterSpacing: "0.08em", fontWeight: 700 }}>
          <Clock size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />TODAY · {checked}/5 PRESENT
        </span>
        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {students.map((s, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i < checked ? 1 : 0.3, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: i < checked ? "rgba(59,130,246,0.04)" : "rgba(255,255,255,0.015)", border: `1px solid ${i < checked ? "rgba(59,130,246,0.12)" : C.bdr}`, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.fm, fontSize: 8, fontWeight: 700, color: C.blue }}>{s.name[0]}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: C.ff }}>{s.name}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: C.fm }}>{s.batch}</div>
              </div>
            </div>
            {i < checked && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                <CheckCircle2 size={14} color={C.blue} />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Fee Management Preview ───────────────────────────────────────────────── */

function FeePreview({ active }: { active: boolean }) {
  const [rows, setRows] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  const feeData = [
    { name: "Aryan K.", amount: "₹2,500", status: "paid", date: "Jan 15" },
    { name: "Priya S.", amount: "₹2,500", status: "paid", date: "Jan 12" },
    { name: "Rohan M.", amount: "₹2,500", status: "overdue", date: "Jan 05" },
    { name: "Isha P.", amount: "₹3,000", status: "paid", date: "Jan 18" },
  ];

  useEffect(() => {
    if (!active) { clearAll(); setRows(0); return; }
    for (let i = 1; i <= 4; i++) { t(i * 400, () => setRows(i)); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div style={{ padding: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "6px 10px", background: `${C.gold}08`, border: `1px solid ${C.gold}20`, borderRadius: 8 }}>
        <span style={{ fontFamily: C.fm, fontSize: 9, color: C.gold, letterSpacing: "0.08em", fontWeight: 700 }}>
          <IndianRupee size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />JANUARY COLLECTION
        </span>
        <span style={{ fontFamily: C.fm, fontSize: 10, fontWeight: 800, color: C.gold }}>₹10,500</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {feeData.slice(0, rows).map((f, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(255,255,255,0.015)", border: `1px solid ${C.bdr}`, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: C.ff }}>{f.name}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: C.fm, fontSize: 10, fontWeight: 700, color: C.white }}>{f.amount}</span>
              <span style={{
                fontFamily: C.fm, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em",
                padding: "2px 6px", borderRadius: 4,
                background: f.status === "paid" ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
                color: f.status === "paid" ? C.emerald : "#EF4444",
                border: `1px solid ${f.status === "paid" ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)"}`,
              }}>
                {f.status.toUpperCase()}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      {rows >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
          <Bell size={10} color="#EF4444" />
          <span style={{ fontFamily: C.fm, fontSize: 8, color: "#EF4444", letterSpacing: "0.06em" }}>1 OVERDUE · Auto-reminder sent</span>
        </motion.div>
      )}
    </div>
  );
}

/* ── Exam/Olympiad Preview ────────────────────────────────────────────────── */

function ExamPreview({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  useEffect(() => {
    if (!active) { clearAll(); setStep(0); return; }
    t(300, () => setStep(1));
    t(1000, () => setStep(2));
    t(1800, () => setStep(3));
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div style={{ padding: "12px" }}>
      {/* Exam header */}
      <div style={{ textAlign: "center", marginBottom: 14, padding: "10px", background: `${C.pink}06`, border: `1px solid ${C.pink}18`, borderRadius: 10 }}>
        <div style={{ fontFamily: C.fm, fontSize: 8, color: C.pink, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 2 }}>NATIONAL ABACUS OLYMPIAD</div>
        <div style={{ fontFamily: C.fm, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Level 3 · 30 Questions · 20 min</div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "EXAM CREATED", desc: "Questions auto-generated", done: step >= 1 },
          { label: "STUDENTS JOINED", desc: "24 / 30 connected", done: step >= 2 },
          { label: "LIVE IN PROGRESS", desc: "Timer: 18:42 remaining", done: step >= 3 },
        ].map((s, i) => (
          <motion.div key={i}
            animate={{ opacity: s.done ? 1 : 0.3, borderColor: s.done ? `${C.pink}30` : C.bdr }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: s.done ? `${C.pink}05` : "rgba(255,255,255,0.01)", border: `1px solid ${C.bdr}`, borderRadius: 8 }}>
            <motion.div
              animate={{ scale: s.done ? [1, 1.2, 1] : 1, background: s.done ? C.pink : "rgba(255,255,255,0.06)" }}
              transition={{ duration: 0.3 }}
              style={{ width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.done && <CheckCircle2 size={12} color="#fff" />}
            </motion.div>
            <div>
              <div style={{ fontFamily: C.fm, fontSize: 8, fontWeight: 700, color: s.done ? C.pink : "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: C.ff }}>{s.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {step >= 3 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 12 }}>
          {[
            { label: "Avg Score", value: "87%", color: C.emerald },
            { label: "Top Score", value: "100%", color: C.gold },
          ].map((s, i) => (
            <div key={i} style={{ padding: "6px 12px", background: `${s.color}08`, border: `1px solid ${s.color}20`, borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontFamily: C.fm, fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: C.fm, fontSize: 7, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function ForInstitutesShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-80px" });
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedRef = useRef(false);
  const cycleRef = useRef<(() => void) | null>(null);

  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  cycleRef.current = () => {
    clearAll();
    setActiveTab("dashboard");
    t(4000, () => setActiveTab("attendance"));
    t(8000, () => setActiveTab("fees"));
    t(12000, () => setActiveTab("exams"));
    t(16000, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (isInView && !startedRef.current) { startedRef.current = true; t(300, () => cycleRef.current?.()); }
    if (!isInView) { clearAll(); startedRef.current = false; setActiveTab("dashboard"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);
  useEffect(() => () => clearAll(), []);

  return (
    <section ref={sectionRef}
      style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", right: "15%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.emerald}08 0%, transparent 70%)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.blue}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
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
              <div style={{ flex: 1, background: C.surf2, borderRadius: 6, padding: "4px 14px", fontSize: 11, fontFamily: C.fm, color: "#343650", textAlign: "center", border: `1px solid ${C.bdr}` }}>blackmonkey.app/admin</div>
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}`, overflowX: "auto" }}>
              {TABS.map((tab) => (
                <div key={tab.key} style={{
                  flex: 1, padding: "10px 6px", textAlign: "center", cursor: "default", whiteSpace: "nowrap",
                  borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
                  background: activeTab === tab.key ? `${tab.color}08` : "transparent",
                  transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                  <span style={{ color: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.15)" }}>{tab.icon}</span>
                  <span style={{ fontFamily: C.fm, fontSize: 8, fontWeight: 700, color: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
                    {tab.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={{ minHeight: 300 }}>
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && (
                  <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                    <DashboardPreview active={activeTab === "dashboard"} />
                  </motion.div>
                )}
                {activeTab === "attendance" && (
                  <motion.div key="attendance" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                    <AttendancePreview active={activeTab === "attendance"} />
                  </motion.div>
                )}
                {activeTab === "fees" && (
                  <motion.div key="fees" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                    <FeePreview active={activeTab === "fees"} />
                  </motion.div>
                )}
                {activeTab === "exams" && (
                  <motion.div key="exams" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                    <ExamPreview active={activeTab === "exams"} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: Copy */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: C.emeraldDim, border: "1px solid rgba(16,185,129,0.24)", borderRadius: 100, padding: "5px 16px", marginBottom: 22, fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.emerald, letterSpacing: "0.08em" }}>
            <Building2 size={11} /> For Institutes
          </div>

          <h2 style={{ fontSize: "clamp(26px,3.5vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 16, fontFamily: C.ff, color: C.white }}>
            Run your institute.{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.emerald}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic" }}>
              Effortlessly.
            </span>
          </h2>

          <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 28, fontFamily: C.ff }}>
            Admin dashboard, attendance tracking, fee management, and live exam hosting — everything an abacus institute needs.{" "}
            <em style={{ color: "rgba(255,255,255,0.65)", fontStyle: "normal", fontWeight: 600 }}>One platform, zero overhead.</em>
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {[
              { icon: <TrendingUp size={15} color={C.emerald} />, label: "Admin Dashboard", desc: "Real-time overview of students, batches, and performance metrics" },
              { icon: <CalendarCheck size={15} color={C.blue} />, label: "Smart Attendance", desc: "One-tap check-in with automated notifications to parents" },
              { icon: <IndianRupee size={15} color={C.gold} />, label: "Fee Management", desc: "Track payments, send reminders, generate receipts automatically" },
              { icon: <GraduationCap size={15} color={C.pink} />, label: "Live Examinations", desc: "Host national olympiads and assessments with real-time proctoring" },
            ].map((f, i) => (
              <motion.div key={i}
                animate={{ borderColor: TABS[i].key === activeTab ? `${TABS[i].color}40` : "rgba(255,255,255,0.07)", background: TABS[i].key === activeTab ? `${TABS[i].color}06` : "rgba(255,255,255,0.03)" }}
                transition={{ duration: 0.3 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(16,185,129,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: C.fm, fontSize: 9, fontWeight: 700, color: TABS[i].color, letterSpacing: "0.08em", marginBottom: 1 }}>{f.label}</div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: C.ff }}>{f.desc}</span>
                </div>
                {TABS[i].key === activeTab && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginLeft: "auto" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: TABS[i].color, boxShadow: `0 0 8px ${TABS[i].color}` }} />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <a href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.30)", color: C.emerald, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: C.ff, transition: "background 0.2s, border-color 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(16,185,129,0.22)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(16,185,129,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(16,185,129,0.12)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(16,185,129,0.30)"; }}>
            Get Institute Access <ChevronRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
