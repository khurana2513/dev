/**
 * BadgeUnlockCinematic — full-screen celebration when a badge is unlocked.
 *
 * Mounted at the App root.  Reads from the Zustand badge unlock store.
 * Shows a dramatic reveal with particles, then auto-dismisses after 4s.
 */

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBadgeUnlockStore } from "../../stores/badgeUnlockStore";
import { TIER_COLORS } from "../../types/rewards";

export default function BadgeUnlockCinematic() {
  const current = useBadgeUnlockStore((s) => s.current);
  const dismiss = useBadgeUnlockStore((s) => s.dismiss);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  // Dismiss on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && current) dismiss();
    },
    [current, dismiss]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const tier = current ? TIER_COLORS[current.tier] || TIER_COLORS.bronze : TIER_COLORS.bronze;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.badge_key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={dismiss}
        >
          {/* Particle ring */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * 360;
              const delay = Math.random() * 0.5;
              const size = 4 + Math.random() * 6;
              return (
                <motion.div
                  key={i}
                  initial={{
                    x: "50vw",
                    y: "50vh",
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: `calc(50vw + ${Math.cos((angle * Math.PI) / 180) * 200}px)`,
                    y: `calc(50vh + ${Math.sin((angle * Math.PI) / 180) * 200}px)`,
                    scale: 1,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 1.2,
                    delay,
                    ease: "easeOut",
                  }}
                  className={`absolute rounded-full ${tier.text}`}
                  style={{
                    width: size,
                    height: size,
                    background: "currentColor",
                    filter: "blur(1px)",
                  }}
                />
              );
            })}
          </div>

          {/* Badge reveal card */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.6, opacity: 0, y: 40 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.1,
            }}
            className={`
              relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2
              ${tier.bg} ${tier.border} shadow-2xl ${tier.glow}
              max-w-xs w-full mx-4
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top label */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold"
            >
              Badge Unlocked
            </motion.p>

            {/* Icon with glow */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                delay: 0.2,
              }}
              className="relative"
            >
              <div
                className={`absolute inset-0 blur-2xl opacity-40 rounded-full`}
                style={{ background: "currentColor" }}
              />
              <span className="text-7xl relative z-10 drop-shadow-lg select-none">
                {current.icon_emoji || "🏆"}
              </span>
            </motion.div>

            {/* Name */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`text-xl font-bold ${tier.text} text-center`}
            >
              {current.name}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-zinc-400 text-center leading-relaxed"
            >
              {current.description}
            </motion.p>

            {/* Tier badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${tier.border} ${tier.text}`}
            >
              {current.tier}
            </motion.span>

            {/* Tap to dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.5 }}
              className="text-[10px] text-zinc-600 mt-2"
            >
              Tap anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
