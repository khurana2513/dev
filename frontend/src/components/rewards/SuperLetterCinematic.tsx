/**
 * SuperLetterCinematic — mini full-screen overlay triggered when a SUPER letter
 * is unlocked. Smaller and quicker than the badge cinematic.
 * Auto-dismisses after 3s. Mounted at App root.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperLetterStore } from "../../stores/superLetterStore";

const LETTER_COLORS: Record<string, string> = {
  S: "#f59e0b",
  U: "#f97316",
  P: "#a78bfa",
  E: "#34d399",
  R: "#60a5fa",
};

export default function SuperLetterCinematic() {
  const current = useSuperLetterStore((s) => s.current);
  const dismiss = useSuperLetterStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, current.isAllDone ? 5000 : 3200);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && current) dismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, dismiss]);

  const color = current ? (LETTER_COLORS[current.letter] ?? "#f59e0b") : "#f59e0b";

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.badge_key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={dismiss}
          style={{ pointerEvents: "all" }}
        >
          {/* Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * 360;
              const dist = 100 + Math.random() * 80;
              return (
                <motion.div
                  key={i}
                  initial={{ x: "50vw", y: "50vh", scale: 0, opacity: 1 }}
                  animate={{
                    x: `calc(50vw + ${Math.cos((angle * Math.PI) / 180) * dist}px)`,
                    y: `calc(50vh + ${Math.sin((angle * Math.PI) / 180) * dist}px)`,
                    scale: 1,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.9, delay: i * 0.03, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    width: 6 + Math.random() * 5,
                    height: 6 + Math.random() * 5,
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
              );
            })}
          </div>

          {/* Card */}
          <motion.div
            initial={{ scale: 0.6, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.05 }}
            className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border"
            style={{
              background: "linear-gradient(145deg, rgba(15,10,30,0.98) 0%, rgba(25,15,50,0.98) 100%)",
              border: `1.5px solid ${color}40`,
              boxShadow: `0 0 40px ${color}30, 0 25px 50px rgba(0,0,0,0.6)`,
              maxWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Label */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: `${color}99`, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace" }}>
              {current.isAllDone ? "✨ SUPER COMPLETE ✨" : "Letter Unlocked"}
            </div>

            {/* Letter glow */}
            <motion.div
              animate={
                current.isAllDone
                  ? { scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }
                  : { scale: [0.8, 1.1, 1] }
              }
              transition={
                current.isAllDone
                  ? { duration: 1.2, repeat: 2, ease: "easeInOut" }
                  : { duration: 0.4, ease: "backOut" }
              }
              style={{
                fontSize: current.isAllDone ? 80 : 96,
                fontWeight: 900,
                fontFamily: "'Playfair Display', Georgia, serif",
                color,
                textShadow: `0 0 30px ${color}cc, 0 0 60px ${color}66`,
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              {current.isAllDone ? "SUPER" : current.letter}
            </motion.div>

            {/* Sub text */}
            {current.isAllDone ? (
              <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, textAlign: "center" }}>
                🎉 You've completed the entire SUPER journey!
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                You've unlocked letter <span style={{ color, fontWeight: 700 }}>{current.letter}</span> of SUPER
              </div>
            )}

            <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Tap anywhere to dismiss</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
