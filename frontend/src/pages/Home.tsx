import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowRight, Trophy, Zap, BarChart3, Flame, FileText,
  Target, Brain, Medal, Calendar, Star,
  TrendingUp, ChevronRight, Play, Shield, Users
} from "lucide-react";
import { motion, useInView as framerInView } from "framer-motion";

// ─── Animated number counter ──────────────────────────────────
function Counter({ to, suffix = "", duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = framerInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const totalFrames = Math.round((duration / 1000) * 60);
    const tick = () => {
      frame++;
      const progress = frame / totalFrames;
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * to));
      if (frame < totalFrames) requestAnimationFrame(tick);
      else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Section fade-up wrapper ───────────────────────────────────
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = framerInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating particle ────────────────────────────────────────
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <motion.div
      style={{ position: "absolute", borderRadius: "50%", ...style }}
      animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Gradient text ────────────────────────────────────────────
function GText({ children, gradient = "linear-gradient(135deg, #7c3aed, #a78bfa 60%, #06b6d4)" }: { children: React.ReactNode; gradient?: string }) {
  return (
    <span style={{ background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
      {children}
    </span>
  );
}

// ─── Pill badge ───────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.25)",
      borderRadius: 100, padding: "7px 18px", marginBottom: 28,
    }}>
      <span style={{ color: "#a78bfa", fontSize: 10 }}>✦</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
        {children}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOME COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const [, setLocation] = useLocation();
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleCTA = () => setLocation(isAuthenticated ? "/dashboard" : "/login");

  const crisisStats = [
    { value: 23, suffix: "%", label: "Grade 4 students can subtract correctly", note: "ASER 2024", color: "#f97316", icon: "📉" },
    { value: 39, suffix: "%", label: "Grade 8 students can do basic division", note: "ASER 2024", color: "#ec4899", icon: "÷" },
    { value: 56, suffix: "%", label: "Children struggle with mental arithmetic", note: "Research", color: "#eab308", icon: "🧠" },
    { value: 3, suffix: "x", label: "better outcomes with structured practice", note: "NCERT Study", color: "#22c55e", icon: "📈" },
  ];

  const features = [
    { icon: <Brain size={22} />, title: "Abacus Practice Engine", desc: "Generate unlimited custom worksheets across direct, small friends, big friends, and mix operations — perfectly calibrated per level.", gradient: "linear-gradient(135deg, #7c3aed, #5b21b6)", tag: "Core" },
    { icon: <Zap size={22} />, title: "Burst & Mental Mode", desc: "Timed flash-card sessions that build calculation speed and working memory — like HIIT for the brain.", gradient: "linear-gradient(135deg, #f59e0b, #d97706)", tag: "Speed" },
    { icon: <Trophy size={22} />, title: "Gamified Progress", desc: "Streak bonuses, XP points, level badges, and a real-time leaderboard. Students compete, celebrate, and improve.", gradient: "linear-gradient(135deg, #06b6d4, #0891b2)", tag: "Engage" },
    { icon: <Calendar size={22} />, title: "Live Attendance", desc: "One-tap QR attendance with real-time admin overview. Automated notifications and detailed reports for institutes.", gradient: "linear-gradient(135deg, #10b981, #059669)", tag: "Manage" },
    { icon: <BarChart3 size={22} />, title: "Progress Analytics", desc: "Per-student dashboards showing accuracy trends, streak history, weak areas, and improvement over time.", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)", tag: "Insights" },
    { icon: <FileText size={22} />, title: "PDF Paper Generator", desc: "Beautiful, print-ready practice papers with custom headers, difficulty levels, and professional formatting.", gradient: "linear-gradient(135deg, #ec4899, #db2777)", tag: "Print" },
  ];

  const instituteFeatures = [
    { icon: <Users size={18} />, text: "Manage unlimited students across batches" },
    { icon: <Calendar size={18} />, text: "Live attendance with automated notifications" },
    { icon: <BarChart3 size={18} />, text: "Admin dashboard with cohort-level analytics" },
    { icon: <FileText size={18} />, text: "Generate custom worksheets for any level" },
    { icon: <Trophy size={18} />, text: "Leaderboards to keep students motivated" },
    { icon: <Shield size={18} />, text: "Secure, role-based access controls" },
  ];

  const testimonials = [
    { quote: "My daughter's mental calculation speed has improved dramatically. She now solves 3-digit sums in seconds — her teachers are amazed.", name: "Priya Sharma", role: "Parent · Grade 5", avatar: "PS" },
    { quote: "As an abacus institute owner, managing attendance and tracking 200+ students used to be a nightmare. BlackMonkey made it effortless.", name: "Rajesh Kumar", role: "Institute Director · Delhi", avatar: "RK" },
    { quote: "The streak system keeps my students genuinely excited about practice. They remind ME to open the app — not the other way around.", name: "Sunita Mehra", role: "Abacus Instructor", avatar: "SM" },
  ];

  return (
    <div style={{ background: "#07070F", color: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HERO ──────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", top: "30%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />
          {[
            { width: 6, height: 6, background: "#7c3aed", top: "25%", left: "18%", opacity: 0.5 },
            { width: 4, height: 4, background: "#06b6d4", top: "40%", right: "15%", opacity: 0.4 },
            { width: 8, height: 8, background: "#a78bfa", top: "60%", left: "12%", opacity: 0.3 },
            { width: 5, height: 5, background: "#f59e0b", top: "20%", right: "25%", opacity: 0.35 },
            { width: 3, height: 3, background: "#06b6d4", top: "75%", right: "30%", opacity: 0.45 },
          ].map((p, i) => <Particle key={i} style={p as React.CSSProperties} />)}
        </div>

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 860, margin: "0 auto" }}>
          <FadeUp><Pill>Next-Gen Math Education Platform</Pill></FadeUp>
          <FadeUp delay={0.08}>
            <h1 style={{ fontSize: "clamp(42px, 7vw, 88px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.0, margin: "0 0 28px" }}>
              Where Brilliant<br /><GText>Minds Are Built.</GText>
            </h1>
          </FadeUp>
          <FadeUp delay={0.16}>
            <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.5)", lineHeight: 1.72, maxWidth: 560, margin: "0 auto 44px" }}>
              The all-in-one platform for abacus and mental maths — gamified practice, live attendance, AI worksheets, and real-time analytics for students and institutes.
            </p>
          </FadeUp>
          <FadeUp delay={0.22}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={handleCTA}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: "16px 32px", borderRadius: 14, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "-0.01em", boxShadow: "0 0 40px rgba(124,58,237,0.35)", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-2px)"; b.style.boxShadow = "0 8px 50px rgba(124,58,237,0.5)"; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(0)"; b.style.boxShadow = "0 0 40px rgba(124,58,237,0.35)"; }}>
                {isAuthenticated ? "Go to Dashboard" : "Start Free"} <ArrowRight size={16} />
              </button>
              <a href="#features"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", padding: "16px 28px", borderRadius: 14, fontSize: 15, fontWeight: 600, textDecoration: "none", letterSpacing: "-0.01em", transition: "background 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.09)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; }}>
                <Play size={14} /> See how it works
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div style={{ marginTop: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ display: "flex" }}>
                  {["#a78bfa","#7c3aed","#06b6d4","#f59e0b","#a78bfa"].map((c,i) => (
                    <div key={i} style={{ width:26, height:26, borderRadius:"50%", background:c, border:"2px solid #07070F", marginLeft:i>0?-8:0 }} />
                  ))}
                </div>
                5,000+ students learning
              </div>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13.5, color: "rgba(255,255,255,0.4)" }}>
                {[...Array(5)].map((_,i) => <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />)}
                <span style={{ marginLeft: 4 }}>Rated 4.9 by institutes</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── EDUCATION CRISIS STATS ──────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill>The Math Crisis Is Real</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
              The numbers are<br /><GText gradient="linear-gradient(135deg, #f97316, #ec4899)">alarming.</GText>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto" }}>
              Government data reveals the true scale of the numeracy gap in India. BlackMonkey exists to close it.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          {crisisStats.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.08}>
              <div style={{ background: "#07070F", padding: "40px 28px" }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontSize: "clamp(44px, 5vw, 64px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 10, color: s.color, textShadow: `0 0 40px ${s.color}60` }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.55, marginBottom: 10 }}>{s.label}</div>
                <div style={{ display: "inline-block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "3px 10px" }}>{s.note}</div>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.2}>
          <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
            Sources: ASER (Annual Status of Education Report) 2024, NCERT Learning Outcomes Survey
          </p>
        </FadeUp>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill>Everything You Need</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
              One platform.<br /><GText>Infinite practice.</GText>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto" }}>
              Every tool a student or institute needs to master mental maths — built into a single, seamless experience.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.07}>
              <div
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", height: "100%", transition: "border-color 0.2s, transform 0.2s" }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(124,58,237,0.4)"; d.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(255,255,255,0.07)"; d.style.transform = "translateY(0)"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: f.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{f.icon}</div>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "3px 10px", letterSpacing: "0.06em" }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#e2e8f0", letterSpacing: "-0.02em" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.72 }}>{f.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <Pill>The BlackMonkey Method</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Built for how kids<br /><GText>actually learn.</GText>
            </h2>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { step: "01", title: "Structured Pedagogy", color: "#7c3aed", desc: "Content follows the proven abacus sequence: Direct → Small Friends → Big Friends → Mix. No skipping steps.", icon: <Target size={20} /> },
            { step: "02", title: "Adaptive Practice", color: "#06b6d4", desc: "Worksheets auto-calibrate to digit count, rows, and operation type. Each session is unique, never repetitive.", icon: <Brain size={20} /> },
            { step: "03", title: "Instant Feedback", color: "#f59e0b", desc: "Burst and mental modes give per-question feedback. Students immediately know what they got right or wrong.", icon: <Zap size={20} /> },
            { step: "04", title: "Celebrate Milestones", color: "#10b981", desc: "XP, streaks, and badges celebrate every achievement. Visibility into progress keeps motivation high.", icon: <Trophy size={20} /> },
          ].map((item, i) => (
            <FadeUp key={item.step} delay={i * 0.09}>
              <div style={{ background: "#07070F", padding: "36px 28px", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${item.color}20`, border: `1px solid ${item.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color }}>{item.icon}</div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: item.color, fontWeight: 700, letterSpacing: "0.08em" }}>STEP {item.step}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#e2e8f0", letterSpacing: "-0.02em" }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.72 }}>{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── GAMIFICATION SPOTLIGHT ────────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>
          <FadeUp>
            <Pill>Gamification</Pill>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20 }}>Practice feels like<br /><GText>playing a game.</GText></h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.72, marginBottom: 32 }}>Streaks, XP points, achievement badges, and a competitive leaderboard turn daily practice from a chore into a highlight of the day.</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
              {[
                { icon: <Flame size={16} color="#f97316" />, text: "Daily streaks with bonus XP multipliers" },
                { icon: <TrendingUp size={16} color="#22c55e" />, text: "Level progression: Beginner to Champion" },
                { icon: <Medal size={16} color="#f59e0b" />, text: "Monthly achievement badges" },
                { icon: <Trophy size={16} color="#a78bfa" />, text: "Live leaderboard rankings by batch" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </FadeUp>
          <FadeUp delay={0.12}>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 18, textTransform: "uppercase" as const }}>This Week's Top Learners</div>
              {[
                { name: "Aryan K.", xp: "2,840 XP", streak: 14, badge: "1st" },
                { name: "Priya S.", xp: "2,410 XP", streak: 11, badge: "2nd" },
                { name: "Rohit M.", xp: "2,180 XP", streak: 9, badge: "3rd" },
                { name: "Ananya T.", xp: "1,950 XP", streak: 7, badge: "4th" },
                { name: "Dev P.", xp: "1,730 XP", streak: 6, badge: "5th" },
              ].map((entry, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: i === 0 ? "rgba(245,158,11,0.07)" : "transparent", marginBottom: 4, border: i === 0 ? "1px solid rgba(245,158,11,0.15)" : "1px solid transparent" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: i === 0 ? "#f59e0b" : "rgba(255,255,255,0.3)", width: 28, textAlign: "center" as const }}>{entry.badge}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#e2e8f0" }}>{entry.name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>{entry.xp}</span>
                      <span style={{ fontSize: 11, color: "#f97316" }}>{entry.streak} day streak</span>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={handleCTA} style={{ marginTop: 16, width: "100%", padding: "12px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 12, color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                View Full Leaderboard <ChevronRight size={14} />
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOR INSTITUTES ────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "rgba(6,182,212,0.03)", borderTop: "1px solid rgba(6,182,212,0.08)", borderBottom: "1px solid rgba(6,182,212,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 60, alignItems: "center" }}>
          <FadeUp>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 24, padding: 28 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(6,182,212,0.6)", letterSpacing: "0.1em", marginBottom: 18, textTransform: "uppercase" as const }}>Today's Attendance — Batch A</div>
              {[
                { name: "Shreya Agarwal", time: "09:02 AM", status: "present" },
                { name: "Karan Verma", time: "09:05 AM", status: "present" },
                { name: "Nisha Patel", time: "09:08 AM", status: "present" },
                { name: "Aakash Singh", time: "—", status: "absent" },
                { name: "Meera Roy", time: "09:12 AM", status: "present" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", marginBottom: 4 }}>
                  <span style={{ fontSize: 13.5, color: "#e2e8f0" }}>{s.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{s.time}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: s.status === "present" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: s.status === "present" ? "#4ade80" : "#f87171", border: `1px solid ${s.status === "present" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}` }}>{s.status}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(6,182,212,0.05)", borderRadius: 12, border: "1px solid rgba(6,182,212,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Attendance Rate</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#06b6d4" }}>80%</span>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.12}>
            <Pill>For Institutes</Pill>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20 }}>Run your academy<br /><GText gradient="linear-gradient(135deg, #06b6d4, #7c3aed)">with zero friction.</GText></h2>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.72, marginBottom: 28 }}>Everything a modern abacus or math institute needs — from live attendance to student analytics — in one place.</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {instituteFeatures.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                  <div style={{ color: "#06b6d4", flexShrink: 0 }}>{f.icon}</div>
                  {f.text}
                </div>
              ))}
            </div>
            <button onClick={handleCTA}
              style={{ marginTop: 32, display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4", padding: "14px 26px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(6,182,212,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(6,182,212,0.12)"; }}>
              Get Institute Access <ArrowRight size={15} />
            </button>
          </FadeUp>
        </div>
      </section>

      {/* ── METRICS ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <FadeUp>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 52 }}>
            Numbers that<br /><GText>speak for themselves.</GText>
          </h2>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { value: 5000, suffix: "+", label: "Active Students", color: "#7c3aed" },
            { value: 98, suffix: "%", label: "Accuracy Rate", color: "#06b6d4" },
            { value: 2000000, suffix: "+", label: "Problems Solved", color: "#f59e0b" },
            { value: 40, suffix: "%", label: "Avg. Speed Gain", color: "#22c55e" },
          ].map((m, i) => (
            <FadeUp key={m.label} delay={i * 0.1}>
              <div style={{ background: "#07070F", padding: "40px 20px" }}>
                <div style={{ fontSize: "clamp(32px, 4vw, 54px)", fontWeight: 900, letterSpacing: "-0.04em", color: m.color, textShadow: `0 0 30px ${m.color}50`, marginBottom: 8 }}>
                  <Counter to={m.value} suffix={m.suffix} />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{m.label}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <Pill>Stories</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Heard from those<br /><GText>who use it daily.</GText>
            </h2>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {testimonials.map((t, i) => (
            <FadeUp key={t.name} delay={i * 0.09}>
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", height: "100%", display: "flex", flexDirection: "column" as const }}>
                <div style={{ display: "flex", marginBottom: 16 }}>
                  {[...Array(5)].map((_,j) => <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.72, flex: 1, marginBottom: 24, fontStyle: "italic" }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 120px" }}>
        <FadeUp>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", inset: -60, background: "radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 28, padding: "64px 48px" }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🐒</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16 }}>
                Ready to build a<br /><GText>brilliant mind?</GText>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.72, maxWidth: 480, margin: "0 auto 40px" }}>
                Join thousands of students and institutes already on BlackMonkey. Free to start, powerful to scale.
              </p>
              <button onClick={handleCTA} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: "17px 36px", borderRadius: 14, fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "-0.01em", boxShadow: "0 0 50px rgba(124,58,237,0.4)" }}>
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"} <ArrowRight size={16} />
              </button>
              <p style={{ marginTop: 18, fontSize: 12.5, color: "rgba(255,255,255,0.25)" }}>No credit card required · Works on all devices</p>
            </div>
          </div>
        </FadeUp>
      </section>

    </div>
  );
}
