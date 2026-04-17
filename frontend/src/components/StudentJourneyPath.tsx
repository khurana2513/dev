/**
 * StudentJourneyPath — Horizontal scrolling milestone progression path.
 * Shows the full student lifecycle: Practice → XP → Levels → Badges → Streaks → Leaderboard → Champion.
 * Each milestone animates in with spring physics when scrolled into view.
 * A glowing path line connects all steps.
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BookOpen, Zap, TrendingUp, Medal, Flame, Trophy, Crown } from "lucide-react";

const T = {
  ff: "'DM Sans', sans-serif",
  fm: "'JetBrains Mono', monospace",
} as const;

const MILESTONES = [
  {
    step:  "01",
    icon:  <BookOpen size={22} />,
    title: "Practice Daily",
    desc:  "Generate worksheets. Attempt papers. Use timed mental math sessions.",
    color: "#6D5CFF",
    glow:  "rgba(109,92,255,0.22)",
    dim:   "rgba(109,92,255,0.10)",
    emoji: "📚",
  },
  {
    step:  "02",
    icon:  <Zap size={22} />,
    title: "Earn XP",
    desc:  "Every correct answer, every session, every streak adds to your XP.",
    color: "#F97316",
    glow:  "rgba(249,115,22,0.22)",
    dim:   "rgba(249,115,22,0.10)",
    emoji: "⚡",
  },
  {
    step:  "03",
    icon:  <TrendingUp size={22} />,
    title: "Level Up",
    desc:  "Progress from Beginner → Intermediate → Advanced → Master → Champion.",
    color: "#10B981",
    glow:  "rgba(16,185,129,0.22)",
    dim:   "rgba(16,185,129,0.10)",
    emoji: "📈",
  },
  {
    step:  "04",
    icon:  <Medal size={22} />,
    title: "Unlock Badges",
    desc:  "Monthly achievement badges. Speed Demon, Accuracy King, Streak Master…",
    color: "#F5A623",
    glow:  "rgba(245,166,35,0.22)",
    dim:   "rgba(245,166,35,0.10)",
    emoji: "🥇",
  },
  {
    step:  "05",
    icon:  <Flame size={22} />,
    title: "Build Your Streak",
    desc:  "Consecutive training days multiply your XP. Miss a day and it resets.",
    color: "#EF4444",
    glow:  "rgba(239,68,68,0.22)",
    dim:   "rgba(239,68,68,0.10)",
    emoji: "🔥",
  },
  {
    step:  "06",
    icon:  <Trophy size={22} />,
    title: "Climb the Board",
    desc:  "Weekly leaderboard rankings across your batch, institute, and globally.",
    color: "#3ECFB4",
    glow:  "rgba(62,207,180,0.22)",
    dim:   "rgba(62,207,180,0.10)",
    emoji: "🏆",
  },
  {
    step:  "07",
    icon:  <Crown size={22} />,
    title: "Become Champion",
    desc:  "Hall of Fame. SUPER Journey. The pinnacle every BlackMonkey student works towards.",
    color: "#EC4899",
    glow:  "rgba(236,72,153,0.22)",
    dim:   "rgba(236,72,153,0.10)",
    emoji: "👑",
  },
] as const;

export default function StudentJourneyPath() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView   = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      style={{ padding: "clamp(80px,12vw,140px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}
    >
      {/* Atmospheric background */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "30%", left: "20%", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,92,255,0.04) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.04) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(245,166,35,0.09)", border: "1px solid rgba(245,166,35,0.22)", borderRadius: 100,
            padding: "5px 16px", marginBottom: 22,
            fontFamily: T.fm, fontSize: 11, fontWeight: 700, color: "#F5A623", letterSpacing: "0.08em",
          }}>
            <Crown size={11} /> YOUR JOURNEY
          </div>
          <h2 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 16px", color: "#F0F2FF", lineHeight: 1.0, fontFamily: T.ff }}>
            Practice today.{" "}
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg, #F5A623, #F97316, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Champion tomorrow.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.38)", maxWidth: 520, margin: "0 auto", lineHeight: 1.72, fontFamily: T.ff }}>
            Every BlackMonkey student follows the same path. The fastest climbers practice the most consistently.
          </p>
        </motion.div>

        {/* Journey path — horizontal scroll on mobile, grid on desktop */}
        <div style={{ position: "relative" }}>

          {/* Connecting line (desktop only) */}
          <div style={{
            position: "absolute", top: 52, left: "calc(50% / 7)",
            right: "calc(50% / 7)",
            height: 2,
            background: "linear-gradient(90deg, rgba(109,92,255,0.4), rgba(249,115,22,0.4), rgba(16,185,129,0.4), rgba(245,166,35,0.4), rgba(239,68,68,0.4), rgba(62,207,180,0.4), rgba(236,72,153,0.4))",
            zIndex: 0,
            display: "none",
          }} className="journey-line" />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 16,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            } as React.CSSProperties}
          >
            {MILESTONES.map((m, i) => (
              <motion.div
                key={m.step}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 280, damping: 24, delay: i * 0.09 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, minWidth: 130, position: "relative" }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: m.dim,
                  border: `2px solid ${m.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: m.color,
                  position: "relative", zIndex: 1,
                  boxShadow: `0 0 28px ${m.glow}`,
                  marginBottom: 18,
                  flexShrink: 0,
                }}>
                  {m.icon}
                  {/* Step number badge */}
                  <div style={{
                    position: "absolute", bottom: -4, right: -4,
                    width: 20, height: 20, borderRadius: "50%",
                    background: m.color, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: T.fm, fontSize: 9, fontWeight: 800, color: "#fff",
                    border: "2px solid #050510",
                  }}>
                    {i + 1}
                  </div>
                </div>

                {/* Content card */}
                <div style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${m.color}18`,
                  borderRadius: 18, padding: "18px 14px",
                  textAlign: "center", width: "100%",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{m.emoji}</div>
                  <div style={{
                    fontFamily: T.ff, fontWeight: 800, fontSize: 13,
                    color: "#F0F2FF", letterSpacing: "-0.015em", marginBottom: 8, lineHeight: 1.3,
                  }}>
                    {m.title}
                  </div>
                  <div style={{ fontFamily: T.ff, fontSize: 11.5, color: "rgba(255,255,255,0.36)", lineHeight: 1.65 }}>
                    {m.desc}
                  </div>
                </div>

                {/* Arrow connector (except last) */}
                {i < MILESTONES.length - 1 && (
                  <div style={{
                    position: "absolute", right: -8, top: 28,
                    fontFamily: T.fm, fontSize: 14, color: "rgba(255,255,255,0.12)",
                    zIndex: 2,
                  }}>→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom: social proof strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.75, duration: 0.55, ease: "easeOut" }}
          style={{
            marginTop: 60, display: "flex", justifyContent: "center",
            gap: "clamp(24px,5vw,56px)", flexWrap: "wrap",
          }}
        >
          {[
            { val: "5,000+",  label: "Active Students",          color: "#6D5CFF" },
            { val: "21 days", label: "Avg. streak (top 10%)",   color: "#F97316" },
            { val: "94%",     label: "Improve in first 30 days", color: "#10B981" },
            { val: "340+",    label: "Institutes on BlackMonkey", color: "#F5A623" },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: T.fm, fontWeight: 800,
                fontSize: "clamp(22px,3.5vw,32px)",
                color: "#F0F2FF", letterSpacing: "-0.04em", lineHeight: 1,
                marginBottom: 6,
              }}>
                <span style={{ color }}>{val}</span>
              </div>
              <div style={{ fontFamily: T.fm, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.07em", maxWidth: 140 }}>
                {label.toUpperCase()}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
