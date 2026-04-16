/**
 * StreakCelebrationOverlay — multi-layered celebration shown when the user
 * earns / extends their daily streak.  Mounted at App root.
 * Clicking anywhere or the button navigates to /rewards?tab=streak.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStreakCelebrationStore } from "../../stores/streakCelebrationStore";
import { useLocation } from "wouter";

// ─── Constants ────────────────────────────────────────────────────────────────

const MILESTONES: { days: number; emoji: string; label: string; color: string }[] = [
  { days: 3,   emoji: "🔥", label: "3 Days",   color: "#ef4444" },
  { days: 7,   emoji: "⚡", label: "1 Week",   color: "#f97316" },
  { days: 14,  emoji: "💪", label: "2 Weeks",  color: "#fb923c" },
  { days: 30,  emoji: "🏅", label: "30 Days",  color: "#facc15" },
  { days: 60,  emoji: "🌙", label: "2 Months", color: "#a78bfa" },
  { days: 100, emoji: "👑", label: "100 Days", color: "#c084fc" },
];

type Particle = {
  id: number; left: string; delay: number; size: number;
  dur: number; drift: number; emoji: string; top?: string;
};

// Rich multi-emoji confetti shower
const PARTICLES: Particle[] = [
  { id: 0,  left: "5%",  delay: 0.0,  size: 1.8, dur: 2.8, drift: -18, emoji: "🔥" },
  { id: 1,  left: "12%", delay: 0.25, size: 1.4, dur: 2.2, drift: 14,  emoji: "⭐" },
  { id: 2,  left: "20%", delay: 0.1,  size: 2.4, dur: 3.1, drift: -12, emoji: "🔥" },
  { id: 3,  left: "28%", delay: 0.55, size: 1.2, dur: 2.0, drift: 22,  emoji: "✨" },
  { id: 4,  left: "36%", delay: 0.2,  size: 1.7, dur: 2.6, drift: -28, emoji: "💫" },
  { id: 5,  left: "45%", delay: 0.7,  size: 2.8, dur: 3.4, drift: 10,  emoji: "🔥" },
  { id: 6,  left: "53%", delay: 0.15, size: 1.5, dur: 2.2, drift: -14, emoji: "⭐" },
  { id: 7,  left: "61%", delay: 0.45, size: 2.1, dur: 2.9, drift: 18,  emoji: "✨" },
  { id: 8,  left: "70%", delay: 0.3,  size: 1.3, dur: 2.0, drift: -24, emoji: "💫" },
  { id: 9,  left: "78%", delay: 0.65, size: 2.3, dur: 3.0, drift: 7,   emoji: "🔥" },
  { id: 10, left: "86%", delay: 0.1,  size: 1.6, dur: 2.4, drift: -32, emoji: "⭐" },
  { id: 11, left: "92%", delay: 0.4,  size: 1.9, dur: 2.7, drift: 28,  emoji: "✨" },
  { id: 12, left: "9%",  delay: 0.85, size: 1.2, dur: 1.8, drift: 11,  emoji: "💫" },
  { id: 13, left: "25%", delay: 0.5,  size: 2.6, dur: 3.2, drift: -8,  emoji: "🔥" },
  { id: 14, left: "50%", delay: 0.22, size: 1.4, dur: 2.3, drift: 20,  emoji: "⭐" },
  { id: 15, left: "65%", delay: 0.72, size: 2.0, dur: 2.8, drift: -16, emoji: "🔥" },
  { id: 16, left: "75%", delay: 0.38, size: 1.7, dur: 2.3, drift: 33,  emoji: "✨" },
  { id: 17, left: "83%", delay: 0.62, size: 2.2, dur: 3.0, drift: -38, emoji: "💫" },
  { id: 18, left: "3%",  delay: 0.78, size: 1.3, dur: 2.1, drift: 16,  emoji: "⭐" },
  { id: 19, left: "33%", delay: 0.18, size: 1.8, dur: 2.5, drift: -20, emoji: "✨" },
  { id: 20, left: "57%", delay: 0.52, size: 2.5, dur: 3.1, drift: 9,   emoji: "🔥" },
  { id: 21, left: "96%", delay: 0.33, size: 1.4, dur: 2.2, drift: -11, emoji: "⭐" },
  // Extra sparkles from the sides
  { id: 22, left: "2%",  delay: 0.0,  size: 1.6, dur: 2.4, drift: 30,  emoji: "✨", top: "20%" },
  { id: 23, left: "98%", delay: 0.4,  size: 1.5, dur: 2.2, drift: -28, emoji: "💫", top: "30%" },
  { id: 24, left: "1%",  delay: 0.6,  size: 1.3, dur: 1.9, drift: 22,  emoji: "⭐", top: "50%" },
  { id: 25, left: "99%", delay: 0.2,  size: 1.4, dur: 2.0, drift: -20, emoji: "🔥", top: "40%" },
];

// ─── Web Audio sound engine ─────────────────────────────────────────────────

function playStreakSound(streakCount: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Determine whether this is a badge milestone
    const isMilestone = [3, 7, 14, 30, 60, 100].includes(streakCount);

    // Notes for the ascending chord (C4 E4 G4 C5)
    const baseFreqs = [261.63, 329.63, 392.00, 523.25];
    // For milestones, add a fanfare note
    const freqs = isMilestone ? [...baseFreqs, 659.25, 783.99] : baseFreqs;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(isMilestone ? 0.18 : 0.12, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (isMilestone ? 1.2 : 0.9));

      osc.start(startTime);
      osc.stop(startTime + (isMilestone ? 1.3 : 1.0));
    });

    // Sparkle ticks (high freq clicks)
    for (let i = 0; i < 6; i++) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.value = 1200 + Math.random() * 800;
      const t = ctx.currentTime + 0.05 + Math.random() * 0.6;
      gain2.gain.setValueAtTime(0.06, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc2.start(t);
      osc2.stop(t + 0.15);
    }
  } catch (_) {
    // Web Audio not available — silent fail
  }
}

// ─── Animated counter ──────────────────────────────────────────────────────

function AnimatedCounter({ from, to, color }: { from: number; to: number; color: string }) {
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    if (from === to) { setDisplay(to); return; }
    const step = Math.max(1, Math.ceil((to - from) / 20));
    const id = setInterval(() => {
      setDisplay((v) => {
        const next = v + step;
        if (next >= to) { clearInterval(id); return to; }
        return next;
      });
    }, 40);
    return () => clearInterval(id);
  }, [from, to]);

  return (
    <span
      style={{
        fontSize: "5.5rem",
        fontWeight: 900,
        lineHeight: 1,
        color,
        textShadow: `0 0 40px ${color}ee, 0 0 80px ${color}66`,
        letterSpacing: "-0.05em",
        fontVariantNumeric: "tabular-nums",
        fontFamily: "'SF Pro Display', 'Inter', system-ui, sans-serif",
      }}
    >
      {display}
    </span>
  );
}

// ─── Milestone stepper ─────────────────────────────────────────────────────

function MilestonePath({ streakCount }: { streakCount: number }) {
  const nextMilestone = MILESTONES.find((m) => m.days > streakCount);
  const daysToNext = nextMilestone ? nextMilestone.days - streakCount : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.72, duration: 0.5 }}
      style={{ width: "100%", marginTop: "0.5rem" }}
    >
      {/* Milestone dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, width: "100%" }}>
        {MILESTONES.map((m, idx) => {
          const earned = streakCount >= m.days;
          const justEarned = streakCount === m.days;
          const isNext = m === nextMilestone;
          return (
            <div key={m.days} style={{ display: "flex", alignItems: "center", flex: idx < MILESTONES.length - 1 ? "1 1 auto" : undefined }}>
              {/* Badge node */}
              <motion.div
                animate={justEarned ? {
                  scale: [1, 1.5, 1.2, 1.35, 1.2],
                  rotate: [0, -8, 8, -4, 0],
                } : earned ? {
                  scale: [1, 1.08, 1],
                } : {}}
                transition={justEarned ? {
                  duration: 0.8, delay: 0.9, repeat: 2, repeatDelay: 1.5,
                } : {
                  duration: 2.5, repeat: Infinity, ease: "easeInOut",
                }}
                title={`${m.label} streak badge`}
                style={{
                  width: justEarned ? 36 : earned ? 28 : 22,
                  height: justEarned ? 36 : earned ? 28 : 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: justEarned ? "1.3rem" : earned ? "1.05rem" : "0.75rem",
                  background: justEarned
                    ? `radial-gradient(circle, ${m.color}55 0%, ${m.color}22 100%)`
                    : earned
                      ? `rgba(255,255,255,0.08)`
                      : "rgba(255,255,255,0.04)",
                  border: justEarned
                    ? `2.5px solid ${m.color}`
                    : earned
                      ? `1.5px solid ${m.color}88`
                      : `1px solid rgba(255,255,255,0.1)`,
                  boxShadow: justEarned
                    ? `0 0 16px ${m.color}99, 0 0 32px ${m.color}44`
                    : earned
                      ? `0 0 8px ${m.color}44`
                      : "none",
                  filter: earned ? "none" : "grayscale(1) opacity(0.35)",
                  transition: "all 0.3s ease",
                  position: "relative",
                }}
              >
                {m.emoji}
                {justEarned && (
                  <motion.div
                    animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0] }}
                    transition={{ duration: 0.7, delay: 0.9, repeat: Infinity, repeatDelay: 2 }}
                    style={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: "50%",
                      border: `2px solid ${m.color}`,
                      pointerEvents: "none",
                    }}
                  />
                )}
                {isNext && !justEarned && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{
                      position: "absolute",
                      inset: -2,
                      borderRadius: "50%",
                      border: `1.5px dashed ${m.color}66`,
                      pointerEvents: "none",
                    }}
                  />
                )}
              </motion.div>
              {/* Connector line */}
              {idx < MILESTONES.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: streakCount >= MILESTONES[idx + 1].days
                    ? `linear-gradient(90deg, ${m.color}99, ${MILESTONES[idx+1].color}99)`
                    : streakCount >= m.days
                      ? `linear-gradient(90deg, ${m.color}66, rgba(255,255,255,0.06))`
                      : "rgba(255,255,255,0.07)",
                  borderRadius: 1,
                  marginLeft: 2,
                  marginRight: 2,
                }} />
              )}
            </div>
          );
        })}
      </div>
      {/* Day labels row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingLeft: 2, paddingRight: 2 }}>
        {MILESTONES.map((m) => (
          <span key={m.days} style={{
            fontSize: "0.62rem",
            color: streakCount >= m.days ? m.color : "rgba(255,255,255,0.22)",
            fontWeight: streakCount >= m.days ? 700 : 400,
            letterSpacing: "-0.02em",
          }}>{m.label}</span>
        ))}
      </div>
      {/* Next milestone hint */}
      {nextMilestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{
            marginTop: 10,
            padding: "6px 14px",
            borderRadius: 99,
            background: `${nextMilestone.color}15`,
            border: `1px solid ${nextMilestone.color}30`,
            display: "inline-block",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: nextMilestone.color, fontWeight: 700 }}>
            {nextMilestone.emoji} {daysToNext} day{daysToNext !== 1 ? "s" : ""} to {nextMilestone.label} badge!
          </span>
        </motion.div>
      )}
      {!nextMilestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{ marginTop: 10 }}
        >
          <span style={{ fontSize: "0.75rem", color: "#facc15", fontWeight: 700 }}>
            👑 All badge milestones conquered!
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function StreakCelebrationOverlay() {
  const { visible, streakCount, prevStreak, pointsEarned, newBadge, dismiss } =
    useStreakCelebrationStore();
  const [, setLocation] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundFired = useRef(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (visible) {
      soundFired.current = false;
      setShowCard(false);
      // Slight delay so the backdrop renders first, then card slides in
      const t1 = setTimeout(() => setShowCard(true), 80);
      // Play sound on first render
      const t2 = setTimeout(() => {
        if (!soundFired.current) {
          soundFired.current = true;
          playStreakSound(streakCount);
        }
      }, 100);
      timerRef.current = setTimeout(() => dismiss(), 9000);
      return () => { clearTimeout(t1); clearTimeout(t2); if (timerRef.current) clearTimeout(timerRef.current); };
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, streakCount, dismiss]);

  const handleDismiss = () => {
    dismiss();
    setLocation("/rewards?tab=streak");
  };

  const flameColor =
    streakCount >= 100 ? "#c084fc" :
    streakCount >= 60  ? "#a78bfa" :
    streakCount >= 30  ? "#facc15" :
    streakCount >= 14  ? "#fb923c" :
    streakCount >= 7   ? "#f97316" :
    streakCount >= 3   ? "#ef4444" :
                         "#f97316";

  const milestoneTitle =
    streakCount >= 100 ? "ETERNAL CHAMPION" :
    streakCount >= 60  ? "MYTHIC WARRIOR" :
    streakCount >= 30  ? "MONTHLY MASTER" :
    streakCount >= 14  ? "TWO WEEK LEGEND" :
    streakCount >= 7   ? "WEEK WARRIOR" :
    streakCount >= 3   ? "STARTER FLAME" :
                          "KEEP IT UP";

  const bgGradient =
    `radial-gradient(ellipse at 50% 70%, ${flameColor}28 0%, ${flameColor}10 40%, rgba(0,0,0,0.92) 70%)`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="streak-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeIn" } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: bgGradient,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            overflow: "hidden",
          }}
          onClick={handleDismiss}
        >
          {/* ── Particles ── */}
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              initial={p.top ? { x: 0, y: 0, opacity: 0, scale: 0.3 } : { y: "108vh", x: 0, opacity: 0, scale: 0.3 }}
              animate={p.top ? {
                x: [0, p.drift * 1.5, p.drift * 0.8, 0],
                y: [0, -60, -120, -200],
                opacity: [0, 0.8, 0.6, 0],
                scale: [0.3, 1, 0.8, 0.3],
              } : {
                y: "-14vh",
                x: [0, p.drift, -p.drift * 0.6, p.drift * 0.4, 0],
                opacity: [0, 0.95, 0.85, 0.5, 0],
                scale: [0.3, 1.1, 0.9, 0.7, 0.3],
              }}
              transition={{
                duration: p.dur,
                delay: p.delay,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 0.3 + p.delay * 0.5,
              }}
              style={{
                position: "absolute",
                left: p.left,
                ...(p.top ? { top: p.top } : { bottom: 0 }),
                fontSize: `${p.size}rem`,
                lineHeight: 1,
                pointerEvents: "none",
                filter: `drop-shadow(0 0 ${p.size * 5}px ${flameColor}cc)`,
                userSelect: "none",
              }}
            >
              {p.emoji}
            </motion.div>
          ))}

          {/* ── Scan lines (cinematic vibe) ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.04, 0.02, 0] }}
            transition={{ duration: 0.4, delay: 0.05 }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* ── Screen flash on entry ── */}
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 50% 50%, ${flameColor}55, transparent 70%)`,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* ── Central card ── */}
          <AnimatePresence>
            {showCard && (
              <motion.div
                key="card"
                initial={{ scale: 0.2, opacity: 0, y: 60, rotateX: 25 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: -30, transition: { duration: 0.4 } }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.04 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "2rem 1.75rem 1.5rem",
                  borderRadius: "2.25rem",
                  background: "linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.3) 100%)",
                  border: `2px solid ${flameColor}44`,
                  boxShadow: `
                    0 0 0 1px ${flameColor}22,
                    0 0 60px ${flameColor}28,
                    0 0 120px ${flameColor}14,
                    0 32px 64px rgba(0,0,0,0.55),
                    inset 0 1px 0 rgba(255,255,255,0.1),
                    inset 0 0 40px ${flameColor}0a
                  `,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  textAlign: "center",
                  maxWidth: "420px",
                  width: "92vw",
                  cursor: "default",
                  transformOrigin: "50% 60%",
                }}
              >
                {/* Card ambient glow ring */}
                <motion.div
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    inset: -12,
                    borderRadius: "2.8rem",
                    background: `radial-gradient(ellipse at 50% 30%, ${flameColor}18 0%, transparent 65%)`,
                    pointerEvents: "none",
                  }}
                />

                {/* ── Header: emoji + milestone title ── */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: flameColor,
                    opacity: 0.85,
                    marginBottom: "0.15rem",
                  }}
                >
                  {milestoneTitle}
                </motion.div>

                {/* ── Main flame with glow halo ── */}
                <div style={{ position: "relative", marginBottom: "0.1rem" }}>
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.25, 0.55, 0.25] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      width: "8rem",
                      height: "8rem",
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${flameColor}50 0%, transparent 65%)`,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.22, 0.96, 1.15, 1], rotate: [0, -8, 8, -4, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      fontSize: "5.5rem",
                      lineHeight: 1,
                      filter: `drop-shadow(0 0 28px ${flameColor}) drop-shadow(0 0 56px ${flameColor}88)`,
                      position: "relative",
                      zIndex: 1,
                      userSelect: "none",
                    }}
                  >
                    🔥
                  </motion.div>
                </div>

                {/* ── Streak counter ── */}
                <AnimatedCounter from={Math.max(0, prevStreak)} to={streakCount} color={flameColor} />

                {/* "Day Streak" label */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32, type: "spring", stiffness: 350, damping: 20 }}
                  style={{
                    color: "rgba(255,255,255,0.95)",
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                  }}
                >
                  Day Streak! 🔥
                </motion.div>

                {/* ── New badge unlock ── */}
                {newBadge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 16 }}
                    style={{
                      marginTop: "0.4rem",
                      padding: "0.45rem 1.1rem",
                      borderRadius: 99,
                      background: `linear-gradient(135deg, ${flameColor}30, ${flameColor}18)`,
                      border: `1.5px solid ${flameColor}66`,
                      boxShadow: `0 0 20px ${flameColor}44`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <motion.span
                      animate={{ rotate: [0, -12, 12, -6, 0] }}
                      transition={{ duration: 0.8, delay: 1, repeat: 3, repeatDelay: 1.5 }}
                      style={{ fontSize: "1.4rem" }}
                    >
                      🏅
                    </motion.span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "0.7rem", color: flameColor, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Badge Unlocked!
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
                        {newBadge.name}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Points earned ── */}
                {pointsEarned > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: newBadge ? 0.9 : 0.65, type: "spring", stiffness: 380, damping: 18 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.3rem 0.9rem",
                      borderRadius: 99,
                      background: "rgba(250,204,21,0.12)",
                      border: "1.5px solid rgba(250,204,21,0.3)",
                      marginTop: "0.2rem",
                    }}
                  >
                    <motion.span
                      animate={{ rotate: [0, 15, -15, 10, 0] }}
                      transition={{ duration: 0.5, delay: 1, repeat: 2, repeatDelay: 2 }}
                      style={{ fontSize: "1rem" }}
                    >
                      ⭐
                    </motion.span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#facc15" }}>
                      +{pointsEarned} pts earned
                    </span>
                  </motion.div>
                )}

                {/* ── Divider ── */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.65, duration: 0.4 }}
                  style={{
                    width: "100%",
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${flameColor}44, transparent)`,
                    marginTop: "0.5rem",
                    marginBottom: "0.1rem",
                  }}
                />

                {/* ── Milestone path ── */}
                <MilestonePath streakCount={streakCount} />

                {/* ── Divider ── */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  style={{
                    width: "100%",
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${flameColor}33, transparent)`,
                    marginTop: "0.5rem",
                  }}
                />

                {/* ── CTA buttons ── */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  style={{ display: "flex", gap: 10, marginTop: "0.75rem", width: "100%" }}
                >
                  <button
                    onClick={handleDismiss}
                    style={{
                      flex: 1,
                      padding: "0.7rem 0",
                      borderRadius: "0.9rem",
                      background: `linear-gradient(135deg, ${flameColor}33, ${flameColor}1a)`,
                      border: `1.5px solid ${flameColor}55`,
                      color: flameColor,
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = `linear-gradient(135deg, ${flameColor}55, ${flameColor}33)`;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = `linear-gradient(135deg, ${flameColor}33, ${flameColor}1a)`;
                    }}
                  >
                    View My Streak →
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(); }}
                    style={{
                      padding: "0.7rem 1.1rem",
                      borderRadius: "0.9rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1.5px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </motion.div>

                {/* Auto-dismiss hint */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0.4, 0] }}
                  transition={{ delay: 2, duration: 5, times: [0, 0.1, 0.9, 1] }}
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "0.7rem",
                    marginTop: "0.25rem",
                  }}
                >
                  Tap background to dismiss
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
