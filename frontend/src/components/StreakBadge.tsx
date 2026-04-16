import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const [, setLocation] = useLocation();

  const [animKey, setAnimKey] = useState(0);
  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevStreakRef.current !== null && prevStreakRef.current !== streak) {
      setAnimKey((k) => k + 1);
    }
    prevStreakRef.current = streak;
  }, [streak]);

  const hasStreak = streak > 0;
  const flameColor =
    streak >= 60 ? "#c084fc" :
    streak >= 30 ? "#facc15" :
    streak >= 14 ? "#fb923c" :
    streak >= 7  ? "#f97316" :
    streak >= 3  ? "#ef4444" :
    streak >= 1  ? "#f97316" : "#64748b";

  return (
    <motion.button
      onClick={() => setLocation("/rewards?tab=streak")}
      title={`${streak}-day streak — click to view`}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.22rem 0.65rem 0.22rem 0.5rem",
        borderRadius: 10,
        background: hasStreak
          ? `linear-gradient(135deg, ${flameColor}26 0%, ${flameColor}14 100%)`
          : "rgba(100,116,139,0.10)",
        border: `1.5px solid ${flameColor}55`,
        cursor: "pointer",
        userSelect: "none",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow layer */}
      {hasStreak && (
        <motion.span
          animate={{ opacity: [0.12, 0.28, 0.12] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 10,
            background: `radial-gradient(circle at 35% 50%, ${flameColor}55 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}
      {/* Fire icon */}
      <span
        className="streak-fire-icon"
        style={{
          fontSize: "1.05rem",
          filter: hasStreak ? `drop-shadow(0 0 5px ${flameColor}cc)` : undefined,
          lineHeight: 1,
          position: "relative",
        }}
      >
        🔥
      </span>
      {/* Streak number — pops in when value changes */}
      <span
        key={animKey}
        className={animKey > 0 ? "streak-number-pop" : ""}
        style={{
          fontSize: "0.875rem",
          fontWeight: 900,
          color: hasStreak ? flameColor : "#64748b",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: hasStreak ? `0 0 10px ${flameColor}88` : undefined,
          fontVariantNumeric: "tabular-nums",
          minWidth: "1ch",
          position: "relative",
        }}
      >
        {streak}
      </span>
    </motion.button>
  );
}
