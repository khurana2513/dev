import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowRight, Trophy, Zap, BarChart3, Flame, FileText,
  Target, Brain, Medal, Calendar, Star,
  TrendingUp, ChevronRight, Play, Shield, Users, Crown
} from "lucide-react";
import { motion, useInView as framerInView, AnimatePresence } from "framer-motion";
import { fetchPublicLeaderboard, type PublicLeaderboardEntry } from "../lib/rewardsApi";
import BurstModeGlimpse from "../components/BurstModeGlimpse";

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
// HALL OF FAME COMPONENT
// ═══════════════════════════════════════════════════════════════

const HOF_RANK_CONFIGS = [
  { gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)", glow: "rgba(245,158,11,0.5)", border: "rgba(245,158,11,0.6)", label: "GOLD", crown: "#fbbf24", size: 1 },
  { gradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 50%, #334155 100%)", glow: "rgba(100,116,139,0.5)", border: "rgba(148,163,184,0.6)", label: "SILVER", crown: "#cbd5e1", size: 0.88 },
  { gradient: "linear-gradient(135deg, #cd7f32 0%, #a0522d 50%, #7c3a1c 100%)", glow: "rgba(205,127,50,0.5)", border: "rgba(205,127,50,0.6)", label: "BRONZE", crown: "#d97706", size: 0.80 },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg, #7c3aed, #4f46e5)",
  "linear-gradient(135deg, #f59e0b, #d97706)",
  "linear-gradient(135deg, #06b6d4, #0891b2)",
  "linear-gradient(135deg, #10b981, #059669)",
  "linear-gradient(135deg, #ec4899, #db2777)",
  "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  "linear-gradient(135deg, #f97316, #ea580c)",
  "linear-gradient(135deg, #14b8a6, #0d9488)",
  "linear-gradient(135deg, #a78bfa, #8b5cf6)",
  "linear-gradient(135deg, #34d399, #10b981)",
];

function HofAvatar({ name, idx, size = 48 }: { name: string; idx: number; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#fff",
      flexShrink: 0, letterSpacing: "-0.02em",
      boxShadow: `0 2px 16px ${AVATAR_COLORS[idx % AVATAR_COLORS.length].match(/#[0-9a-f]{6}/i)?.[0] || "#7c3aed"}55`,
    }}>
      {initials || "?"}
    </div>
  );
}

function HofPointsCounter({ points, delay = 0 }: { points: number; delay?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = framerInView(ref, { once: true, margin: "-20px" });
  useEffect(() => {
    if (!inView) return;
    const totalFrames = 90;
    let frame = 0;
    const tick = () => {
      frame++;
      const ease = 1 - Math.pow(1 - frame / totalFrames, 3);
      setVal(Math.round(ease * points));
      if (frame < totalFrames) requestAnimationFrame(tick);
      else setVal(points);
    };
    const timeout = setTimeout(() => requestAnimationFrame(tick), delay * 1000);
    return () => clearTimeout(timeout);
  }, [inView, points, delay]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

function HallOfFame() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: () => fetchPublicLeaderboard(10),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  const entries: PublicLeaderboardEntry[] = data?.entries ?? [];
  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const sectionRef = useRef<HTMLElement>(null);
  const inView = framerInView(sectionRef, { once: true, margin: "-60px" });

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative", padding: "clamp(48px,8vw,100px) clamp(14px,4vw,24px) clamp(60px,8vw,120px)", overflow: "hidden",
        background: "linear-gradient(180deg, #07070F 0%, #0a0812 40%, #0d0a05 70%, #07070F 100%)",
      }}
    >
      {/* Background glow orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "20%", width: 500, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", top: "30%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)", filter: "blur(60px)" }} />
        {/* Scan-line grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(245,158,11,0.02) 40px)", pointerEvents: "none" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          {/* Title with shimmer */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
            <h2 style={{
              fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 900, letterSpacing: "-0.05em",
              margin: "0 0 0", lineHeight: 0.92,
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #fff7e6 50%, #f59e0b 70%, #d97706 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              backgroundSize: "200% 100%",
            }}>
              HALL OF FAME
            </h2>
          </div>
          <div style={{ fontSize: "clamp(13px, 2vw, 16px)", color: "rgba(245,158,11,0.5)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.25em", textTransform: "uppercase" as const, marginTop: 14, marginBottom: 18 }}>
            ✦ All-Time Champions · All Institutes ✦
          </div>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 460, margin: "0 auto", lineHeight: 1.65 }}>
            The legends who sit at the very top. Every point earned through real practice, real dedication.
          </p>

          {/* Live badge — below main text */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 20 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.12em" }}>LIVE · UPDATES EVERY 90s</span>
          </div>
        </motion.div>

        {/* Loading / error states */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ width: 36, height: 36, border: "3px solid rgba(245,158,11,0.2)", borderTop: "3px solid #f59e0b", borderRadius: "50%", margin: "0 auto 16px" }} />
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>Loading champions…</p>
          </div>
        )}

        {isError && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            Unable to load leaderboard. Check back soon.
          </div>
        )}

        {!isLoading && !isError && entries.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>No champions yet — be the first to claim your spot.</p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <>
            {/* ── TOP 3 PODIUM ── */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, marginBottom: 48, flexWrap: "wrap" as const }}>
              {/* Reorder: 2nd, 1st, 3rd for visual podium */}
              {([1, 0, 2] as const).map((idx, posIdx) => {
                const entry = topThree[idx];
                if (!entry) return null;
                const cfg = HOF_RANK_CONFIGS[idx];
                const podiumHeights = [220, 270, 195];
                const height = podiumHeights[posIdx];
                const isFirst = idx === 0;

                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, y: 60 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.1 + posIdx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", flex: isFirst ? "0 0 280px" : "0 0 240px" }}
                  >
                    {/* Crown */}
                    <motion.div
                      animate={isFirst ? { y: [0, -6, 0] } : {}}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      style={{ marginBottom: 10 }}
                    >
                      <Crown size={isFirst ? 32 : 24} color={cfg.crown} fill={cfg.crown} style={{ filter: `drop-shadow(0 0 10px ${cfg.crown})` }} />
                    </motion.div>

                    {/* Avatar with glow ring */}
                    <div style={{ position: "relative", marginBottom: 14 }}>
                      <motion.div
                        animate={{ boxShadow: [`0 0 20px ${cfg.glow}`, `0 0 40px ${cfg.glow}`, `0 0 20px ${cfg.glow}`] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ borderRadius: "50%", padding: 3, background: cfg.gradient }}
                      >
                        <HofAvatar name={entry.student_name} idx={idx} size={isFirst ? 72 : 58} />
                      </motion.div>
                      {/* Rank badge */}
                      <div style={{
                        position: "absolute", bottom: -6, right: -6,
                        width: 26, height: 26, borderRadius: "50%",
                        background: cfg.gradient, border: "2px solid #0a0812",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 900, color: "#fff",
                        fontFamily: "'JetBrains Mono', monospace",
                        boxShadow: `0 0 12px ${cfg.glow}`,
                      }}>
                        {entry.rank}
                      </div>
                    </div>

                    {/* Card */}
                    <motion.div
                      whileHover={{ y: -4 }}
                      style={{
                        width: "100%", borderRadius: 20,
                        background: `linear-gradient(180deg, ${cfg.glow.replace("0.5", "0.08")} 0%, rgba(10,8,18,0.9) 100%)`,
                        border: `1px solid ${cfg.border.replace("0.6", "0.35")}`,
                        padding: isFirst ? "24px 20px 20px" : "20px 16px 16px",
                        height, display: "flex", flexDirection: "column" as const,
                        justifyContent: "space-between", textAlign: "center",
                        boxShadow: `0 8px 40px ${cfg.glow.replace("0.5", "0.2")}, inset 0 1px 0 ${cfg.border.replace("0.6", "0.2")}`,
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div>
                        <div style={{
                          display: "inline-block", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700, letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 100,
                          background: cfg.gradient, color: "#fff", marginBottom: 10,
                        }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: isFirst ? 17 : 15, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.2 }}>
                          {entry.student_name}
                        </div>
                        {(entry.org_name || entry.branch) && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500, marginBottom: 8 }}>
                            {entry.org_name || entry.branch}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" as const }}>
                          {entry.level && (
                            <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", borderRadius: 100, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                              Lvl {entry.level}
                            </span>
                          )}
                          {entry.course && (
                            <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", borderRadius: 100, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9" }}>
                              {entry.course}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <div style={{
                          fontSize: isFirst ? 32 : 26, fontWeight: 900, letterSpacing: "-0.04em",
                          background: cfg.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                          lineHeight: 1, textShadow: "none",
                        }}>
                          <HofPointsCounter points={entry.total_points} delay={0.2 + idx * 0.1} />
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginTop: 4 }}>
                          TOTAL POINTS
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── RANKS 4–10 ── */}
            {rest.length > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 20, overflow: "hidden",
              }}>
                {rest.map((entry, i) => (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: -24 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.45 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ backgroundColor: "rgba(245,158,11,0.04)" }}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 24px",
                      borderBottom: i < rest.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      cursor: "default",
                    }}
                  >
                    {/* Rank number */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800,
                      color: "rgba(245,158,11,0.7)", flexShrink: 0,
                    }}>
                      {entry.rank}
                    </div>

                    {/* Avatar */}
                    <HofAvatar name={entry.student_name} idx={entry.rank - 1} size={38} />

                    {/* Name + org */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.student_name}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" as const }}>
                        {(entry.org_name || entry.branch) && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            {entry.org_name || entry.branch}
                          </span>
                        )}
                        {entry.level && (
                          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "1px 7px", borderRadius: 100, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                            Lv {entry.level}
                          </span>
                        )}
                        {entry.course && (
                          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "1px 7px", borderRadius: 100, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.18)", color: "#67e8f9" }}>
                            {entry.course}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#f59e0b" }}>
                        <HofPointsCounter points={entry.total_points} delay={0.5 + i * 0.07} />
                      </div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginTop: 2 }}>
                        PTS
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Footer note */}
            <motion.div
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 1.1, duration: 0.6 }}
              style={{ textAlign: "center", marginTop: 32 }}
            >
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
                Rankings update every 90 seconds · Based on all-time points earned · Across all institutes
              </p>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Live activity ticker ───────────────────────────────────────
function LiveTicker() {
  const ticks = [
    "⚡  Aryan K. just solved 50 problems in 90 seconds",
    "🔥  Priya S. is on a 14-day win streak",
    "🏆  Rohit M. reached Level 8 — Champion tier",
    "💎  New record: 840 XP earned in a single session",
    "🎯  Ananya T. hit 99% accuracy in Burst Mode",
    "⚡  Dev P. just unlocked the Speed Demon badge",
    "🔥  Shreya A. extended her streak to 21 days",
    "🌟  Meera R. topped the weekly leaderboard",
    "🏆  Karan V. aced Mental Math Level 5",
    "⚡  50 new students joined BlackMonkey this week",
  ];
  const doubled = [...ticks, ...ticks];
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(124,58,237,0.025)", padding: "10px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 52, width: "max-content", animation: "home-ticker 55s linear infinite" }}>
        {doubled.map((t, i) => (
          <span key={i} style={{ whiteSpace: "nowrap", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.28)", letterSpacing: "0.04em" }}>{t}</span>
        ))}
      </div>
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

  useEffect(() => {
    const s = document.createElement("style");
    s.id = "home-design-tokens";
    s.textContent = `
      @keyframes home-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      @keyframes home-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes home-glow-breathe { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.06)} }
      .home-feature-card { transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease !important }
      .home-feature-card:hover { border-color: rgba(124,58,237,0.5) !important; transform: translateY(-5px) !important; box-shadow: 0 24px 64px rgba(124,58,237,0.16) !important }
      .home-step-card { transition: border-color 0.25s, background 0.25s !important }
      .home-step-card:hover { border-color: rgba(255,255,255,0.12) !important; background: rgba(255,255,255,0.035) !important }
    `;
    document.head.appendChild(s);
    return () => { document.getElementById("home-design-tokens")?.remove(); };
  }, []);

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
      <section style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(72px,12vw,120px) clamp(14px,4vw,24px) clamp(48px,8vw,80px)", overflow: "hidden" }}>
        {/* Layered atmospheric glow */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {/* Primary violet core glow */}
          <div style={{ position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)", width: 1100, height: 800, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, rgba(109,40,217,0.07) 45%, transparent 70%)", filter: "blur(60px)", animation: "home-glow-breathe 5s ease-in-out infinite" }} />
          {/* Cyan top-right accent */}
          <div style={{ position: "absolute", top: "-10%", right: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.13) 0%, transparent 70%)", filter: "blur(80px)" }} />
          {/* Amber bottom-left */}
          <div style={{ position: "absolute", bottom: "10%", left: "0%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)", filter: "blur(80px)" }} />
          {/* Subtle grid mesh */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,.04) 1px, transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 10%, black 20%, transparent 100%)" } as React.CSSProperties} />
          {/* Particles */}
          {([
            { width: 5, height: 5, background: "#2563EB", top: "22%", left: "13%", opacity: 0.5 },
            { width: 3, height: 3, background: "#06b6d4", top: "36%", right: "11%", opacity: 0.4 },
            { width: 7, height: 7, background: "rgba(37,99,235,0.25)", top: "60%", left: "7%", opacity: 0.35 },
            { width: 4, height: 4, background: "#f59e0b", top: "17%", right: "21%", opacity: 0.4 },
            { width: 3, height: 3, background: "#06b6d4", top: "74%", right: "27%", opacity: 0.45 },
            { width: 4, height: 4, background: "#7c3aed", top: "48%", left: "5%", opacity: 0.3 },
          ] as React.CSSProperties[]).map((p, i) => <Particle key={i} style={p} />)}
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", textAlign: "left" }}>

          {/* Live status pill */}
          <FadeUp>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32, padding: "6px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100 }}>
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.6)" }}
              />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "-0.01em" }}>
                5,000+ students training right now
              </span>
            </div>
          </FadeUp>

          {/* Hero headline — clean sans-serif, accent word */}
          <FadeUp delay={0.07}>
            <h1 style={{ margin: "0 0 24px", padding: 0, fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.0, color: "#F8FAFC" }}>
              Build a{" "}
              <span style={{ color: "#2563EB" }}>champion</span>
              {" "}mind.
            </h1>
          </FadeUp>

          {/* Sub-headline */}
          <FadeUp delay={0.14}>
            <p style={{ fontSize: "clamp(16px, 2.2vw, 20px)", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, maxWidth: 540, margin: "0 0 32px", fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>
              The gamified abacus & mental math platform that makes practice{" "}
              <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>addictive</span>.
              {" "}Earn XP, build streaks, race to the top.
            </p>
          </FadeUp>

          {/* Feature badges */}
          <FadeUp delay={0.19}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36, flexWrap: "wrap" as const }}>
              {[
                { icon: <Zap size={14} />, label: "Calculate Faster", color: "#F59E0B" },
                { icon: <Flame size={14} />, label: "Build Streaks", color: "#F97316" },
                { icon: <Trophy size={14} />, label: "Climb the Leaderboard", color: "#2563EB" },
              ].map((badge, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 16px", flexShrink: 0 }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: badge.color, display: "flex", alignItems: "center" }}>{badge.icon}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em" }}>{badge.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* CTAs */}
          <FadeUp delay={0.25}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <button onClick={handleCTA}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#2563EB", color: "#fff", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "-0.01em", boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(37,99,235,0.5)", transition: "transform 0.15s ease, box-shadow 0.15s ease", fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-2px)"; b.style.boxShadow = "0 8px 32px rgba(37,99,235,0.4), 0 0 0 1px rgba(37,99,235,0.6)"; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(0)"; b.style.boxShadow = "0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(37,99,235,0.5)"; }}>
                {isAuthenticated ? "Go to Dashboard" : "Start Training Free"} <ArrowRight size={15} />
              </button>
              <a href="#features"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none", letterSpacing: "-0.01em", transition: "background 0.15s, border-color 0.15s, color 0.15s", fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = "rgba(255,255,255,0.1)"; a.style.borderColor = "rgba(255,255,255,0.18)"; a.style.color = "rgba(255,255,255,0.9)"; }}
                onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = "rgba(255,255,255,0.06)"; a.style.borderColor = "rgba(255,255,255,0.1)"; a.style.color = "rgba(255,255,255,0.7)"; }}>
                <Play size={13} /> See how it works
              </a>
            </div>
          </FadeUp>

          {/* Social proof strip */}
          <FadeUp delay={0.34}>
            <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" as const }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ display: "flex" }}>
                  {["#3B82F6","#6366F1","#06b6d4","#f59e0b","#10b981"].map((c,i) => (
                    <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: "2px solid #07070F", marginLeft: i > 0 ? -6 : 0 }} />
                  ))}
                </div>
                <span><strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>5,000+</strong> students</span>
              </div>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ display: "flex", gap: 2, alignItems: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                {[...Array(5)].map((_,i) => <Star key={i} size={11} fill="#F59E0B" color="#F59E0B" />)}
                <span style={{ marginLeft: 6 }}>4.9 by institutes</span>
              </div>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>2M+</strong> problems solved
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── LIVE TICKER ────────────────────────────── */}
      <LiveTicker />

      {/* ── EDUCATION CRISIS STATS ──────────────────────────────── */}
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill>The Math Crisis Is Real</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
              India has a maths problem.<br />
              <GText gradient="linear-gradient(135deg, #f97316, #ec4899)">Here's what the data shows.</GText>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Real numbers from ASER 2024 — and why{" "}
              <em style={{ color: "rgba(255,255,255,0.65)", fontStyle: "normal", fontWeight: 600 }}>structured, gamified practice</em>{" "}
              is the only fix.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          {crisisStats.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.08}>
              <div style={{ background: "#07070F", padding: "40px 28px", position: "relative", overflow: "hidden" }}>
                {/* Colored bottom accent bar */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${s.color}80, transparent)` }} />
                {/* Subtle background glow */}
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: "60%", background: `radial-gradient(ellipse at top, ${s.color}10 0%, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{s.icon}</div>
                  <div style={{ fontSize: "clamp(44px, 5vw, 68px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 10, color: s.color, textShadow: `0 0 48px ${s.color}70` }}>
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.65)", lineHeight: 1.55, marginBottom: 12 }}>{s.label}</div>
                  <div style={{ display: "inline-block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "3px 10px" }}>{s.note}</div>
                </div>
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
      <section id="features" style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill>Everything You Need</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
              Every tool.
              <br /><GText>Zero excuses.</GText>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Practice engine. Speed trainer. Analytics. Gamification. Attendance. PDF papers. One platform, seamlessly connected.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.07}>
              <div
                className="home-feature-card"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", height: "100%", position: "relative", overflow: "hidden" }}
              >
                {/* Gradient top-edge accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, ${f.gradient.match(/#[0-9a-fA-F]{6}/g)?.[0] ?? "#7c3aed"}60 50%, transparent 100%)` }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: f.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, boxShadow: `0 8px 24px ${f.gradient.match(/#[0-9a-fA-F]{6}/g)?.[0] ?? "#7c3aed"}40` }}>{f.icon}</div>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.32)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "3px 10px", letterSpacing: "0.06em" }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: "#f1f5f9", letterSpacing: "-0.025em" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>{f.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── BURST MODE INTERACTIVE GLIMPSE ──────────────────────── */}
      <BurstModeGlimpse />

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <Pill>The BlackMonkey Method</Pill>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
              Smart practice.<br /><GText>Real results.</GText>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", maxWidth: 420, margin: "0 auto", lineHeight: 1.7 }}>
              Four steps that transform casual practice into measurable mastery.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
          {([            { step: "01", title: "Structured Pedagogy", color: "#7c3aed", desc: "Content follows the proven abacus sequence: Direct → Small Friends → Big Friends → Mix. No skipping steps.", icon: <Target size={20} /> },            { step: "02", title: "Adaptive Practice", color: "#06b6d4", desc: "Worksheets auto-calibrate to digit count, rows, and operation type. Each session is unique, never repetitive.", icon: <Brain size={20} /> },            { step: "03", title: "Instant Feedback", color: "#f59e0b", desc: "Burst and mental modes give per-question feedback. Students immediately know what they got right or wrong.", icon: <Zap size={20} /> },            { step: "04", title: "Celebrate Milestones", color: "#10b981", desc: "XP, streaks, and badges celebrate every achievement. Visibility into progress keeps motivation high.", icon: <Trophy size={20} /> },          ] as const).map((item, i) => (            <FadeUp key={item.step} delay={i * 0.09}>
              <div className="home-step-card" style={{ background: "rgba(255,255,255,0.02)", padding: "36px 28px", height: "100%", borderRadius: 4, border: "1px solid transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${item.color}18`, border: `1px solid ${item.color}35`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>{item.icon}</div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: item.color, fontWeight: 800, letterSpacing: "0.1em" }}>STEP {item.step}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: "#f1f5f9", letterSpacing: "-0.025em" }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── GAMIFICATION SPOTLIGHT ────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>
          <FadeUp>
            <Pill>Gamification</Pill>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>Practice feels like<br /><GText>playing a game.</GText></h2>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 32 }}>Streaks, XP points, badges and a competitive leaderboard. Every session has a score. Every score can be beaten. <em style={{ color:"rgba(255,255,255,0.65)", fontStyle:"normal", fontWeight:600 }}>That's the hook.</em></p>
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
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", background: "rgba(6,182,212,0.03)", borderTop: "1px solid rgba(6,182,212,0.08)", borderBottom: "1px solid rgba(6,182,212,0.08)" }}>
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
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20 }}>Run your academy<br /><GText gradient="linear-gradient(135deg, #06b6d4, #7c3aed)">without the chaos.</GText></h2>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 28 }}>Attendance, student tracking, analytics, worksheets — all wired together. You focus on teaching. We handle the operations.</p>
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
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
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

      {/* ── HALL OF FAME ──────────────────────────────────────────── */}
      <HallOfFame />

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", maxWidth: 1200, margin: "0 auto" }}>
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
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px) clamp(60px,8vw,120px)" }}>
        <FadeUp>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", inset: -80, background: "radial-gradient(ellipse at center, rgba(124,58,237,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: 28, padding: "72px 52px", overflow: "hidden" }}>
              {/* Grid overlay */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,.04) 1px, transparent 1px)", backgroundSize: "48px 48px", WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)" } as React.CSSProperties} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 52, marginBottom: 16, filter: "drop-shadow(0 0 20px rgba(124,58,237,0.4))" }}>🐒</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "6px 18px", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.28)", borderRadius: 100 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em" }}>FREE TO START · NO CREDIT CARD</span>
                </div>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 58px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16, lineHeight: 0.95 }}>
                  Stop waiting.<br /><GText>Start winning.</GText>
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, maxWidth: 480, margin: "0 auto 40px" }}>
                  Your streak starts today. Join thousands of students already training on BlackMonkey — the leaderboard is waiting.
                </p>
                <button onClick={handleCTA}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)", color: "#fff", padding: "18px 40px", borderRadius: 14, fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer", letterSpacing: "0.01em", boxShadow: "0 0 60px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.18)", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-3px) scale(1.02)"; b.style.boxShadow = "0 20px 70px rgba(124,58,237,0.7), inset 0 1px 0 rgba(255,255,255,0.18)"; }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(0) scale(1)"; b.style.boxShadow = "0 0 60px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.18)"; }}>
                  {isAuthenticated ? "Go to Dashboard" : "Get Started Free"} <ArrowRight size={16} />
                </button>
                <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" as const }}>
                  {["Works on all devices", "Instant access", "5,000+ students"].map((t, i) => (
                    <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>{i > 0 ? "· " : ""}{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

    </div>
  );
}
