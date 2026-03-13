/**
 * StreakCelebrationOverlay — crazy fire animation shown when the user
 * earns / extends their daily streak.  Mounted at App root.
 * Clicking anywhere navigates to /rewards?tab=streak.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStreakCelebrationStore } from "../../stores/streakCelebrationStore";
import { useLocation } from "wouter";

// Pre-seeded particles — fixed so React renders don't vary
const PARTICLES: { id: number; left: string; delay: number; size: number; dur: number; drift: number }[] = [
  { id: 0,  left: "7%",  delay: 0.0,  size: 2.2, dur: 2.4, drift: -20  },
  { id: 1,  left: "15%", delay: 0.3,  size: 1.6, dur: 1.9, drift: 15   },
  { id: 2,  left: "23%", delay: 0.1,  size: 2.8, dur: 2.8, drift: -10  },
  { id: 3,  left: "31%", delay: 0.6,  size: 1.4, dur: 2.1, drift: 25   },
  { id: 4,  left: "40%", delay: 0.2,  size: 2.0, dur: 2.6, drift: -30  },
  { id: 5,  left: "48%", delay: 0.8,  size: 3.0, dur: 3.0, drift: 10   },
  { id: 6,  left: "56%", delay: 0.15, size: 1.7, dur: 2.0, drift: -15  },
  { id: 7,  left: "63%", delay: 0.5,  size: 2.4, dur: 2.7, drift: 20   },
  { id: 8,  left: "72%", delay: 0.35, size: 1.5, dur: 1.8, drift: -25  },
  { id: 9,  left: "80%", delay: 0.7,  size: 2.6, dur: 2.9, drift: 5    },
  { id: 10, left: "88%", delay: 0.1,  size: 1.8, dur: 2.3, drift: -35  },
  { id: 11, left: "93%", delay: 0.45, size: 2.1, dur: 2.5, drift: 30   },
  { id: 12, left: "11%", delay: 0.9,  size: 1.3, dur: 1.7, drift: 12   },
  { id: 13, left: "27%", delay: 0.55, size: 2.9, dur: 3.1, drift: -8   },
  { id: 14, left: "52%", delay: 0.25, size: 1.6, dur: 2.2, drift: 22   },
  { id: 15, left: "67%", delay: 0.75, size: 2.3, dur: 2.6, drift: -18  },
  { id: 16, left: "77%", delay: 0.4,  size: 1.9, dur: 2.1, drift: 35   },
  { id: 17, left: "85%", delay: 0.65, size: 2.5, dur: 2.8, drift: -40  },
  { id: 18, left: "4%",  delay: 0.8,  size: 1.4, dur: 1.9, drift: 18   },
  { id: 19, left: "35%", delay: 0.2,  size: 2.0, dur: 2.4, drift: -22  },
  { id: 20, left: "58%", delay: 0.55, size: 2.7, dur: 2.9, drift: 8    },
  { id: 21, left: "97%", delay: 0.35, size: 1.5, dur: 2.0, drift: -12  },
];

function getMilestoneLabel(streak: number): string {
  if (streak >= 100) return "LEGENDARY! You're eternal 🔥";
  if (streak >= 60)  return "MYTHIC STREAK! Unstoppable! 🔥";
  if (streak >= 30)  return "LEGENDARY STREAK! 🏅";
  if (streak >= 14)  return "TWO WEEKS STREAK! 💪";
  if (streak >= 7)   return "ONE WEEK STREAK! 🏆";
  if (streak >= 3)   return "3-DAY STREAK! Keep it up!";
  return "Streak Extended! Keep going!";
}

export default function StreakCelebrationOverlay() {
  const { visible, streakCount, dismiss } = useStreakCelebrationStore();
  const [, setLocation] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(() => dismiss(), 4500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, dismiss]);

  const handleClick = () => {
    dismiss();
    setLocation("/rewards?tab=streak");
  };

  const flameColor =
    streakCount >= 60 ? "#c084fc" :
    streakCount >= 30 ? "#facc15" :
    streakCount >= 14 ? "#fb923c" :
    streakCount >= 7  ? "#f97316" :
    streakCount >= 3  ? "#ef4444" :
                        "#f97316";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="streak-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          onClick={handleClick}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(ellipse at 50% 60%, ${flameColor}22 0%, rgba(0,0,0,0.88) 65%)`,
            backdropFilter: "blur(6px)",
            cursor: "pointer",
            overflow: "hidden",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          {/* Fire particles */}
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: "105vh", x: 0, opacity: 0, scale: 0.4 }}
              animate={{
                y: "-15vh",
                x: [0, p.drift, -p.drift * 0.5, p.drift * 0.3, 0],
                opacity: [0, 0.9, 0.9, 0.5, 0],
                scale: [0.4, 1, 0.85, 0.65, 0.3],
              }}
              transition={{
                duration: p.dur,
                delay: p.delay,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 0.5 + p.delay * 0.4,
              }}
              style={{
                position: "absolute",
                left: p.left,
                bottom: 0,
                fontSize: `${p.size}rem`,
                lineHeight: 1,
                pointerEvents: "none",
                filter: `drop-shadow(0 0 ${p.size * 4}px ${flameColor}cc)`,
                userSelect: "none",
              }}
            >
              🔥
            </motion.div>
          ))}

          {/* Central card */}
          <motion.div
            initial={{ scale: 0.25, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.4, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.05 }}
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              padding: "2.25rem 3rem",
              borderRadius: "2rem",
              background: "rgba(255,255,255,0.04)",
              border: `2px solid ${flameColor}55`,
              boxShadow: `0 0 80px ${flameColor}33, 0 0 0 1px ${flameColor}22, inset 0 0 30px ${flameColor}11`,
              textAlign: "center",
              maxWidth: "360px",
              width: "90vw",
            }}
          >
            {/* Glowing ring behind the main flame */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: "7rem",
                height: "7rem",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${flameColor}44 0%, transparent 70%)`,
                top: "1.5rem",
                pointerEvents: "none",
              }}
            />

            {/* Main flame emoji */}
            <motion.div
              animate={{
                scale: [1, 1.18, 0.95, 1.12, 1],
                rotate: [0, -6, 6, -3, 0],
              }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontSize: "5rem",
                lineHeight: 1,
                filter: `drop-shadow(0 0 24px ${flameColor}) drop-shadow(0 0 48px ${flameColor}88)`,
                position: "relative",
                zIndex: 1,
                userSelect: "none",
              }}
            >
              🔥
            </motion.div>

            {/* Streak count */}
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 18 }}
              style={{
                fontSize: "5rem",
                fontWeight: 900,
                lineHeight: 1,
                color: flameColor,
                textShadow: `0 0 30px ${flameColor}cc, 0 0 60px ${flameColor}66`,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {streakCount}
            </motion.div>

            {/* "Day Streak" label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              style={{
                color: "white",
                fontSize: "1.4rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Day Streak! 🔥
            </motion.div>

            {/* Milestone label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52 }}
              style={{
                color: flameColor,
                fontSize: "0.85rem",
                fontWeight: 600,
                marginTop: "0.15rem",
                opacity: 0.9,
              }}
            >
              {getMilestoneLabel(streakCount)}
            </motion.div>

            {/* Tap hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0.5, 0] }}
              transition={{ delay: 1.5, duration: 2.5, times: [0, 0.2, 0.8, 1] }}
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.8rem",
                marginTop: "0.5rem",
              }}
            >
              Tap to view your streak →
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
