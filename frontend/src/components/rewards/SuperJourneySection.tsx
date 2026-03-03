/**
 * SuperJourneySection — Cinematic main-character SUPER badge progression.
 * The defining section of the /rewards page. Clean, rich, premium.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSuperJourney } from "../../lib/rewardsApi";
import type { SuperJourneyResponse, SuperMilestone } from "../../types/rewards";

/* ── Letter colour / glow registry ──────────────────────────────────────────── */
const LETTER_META: Record<string, { color: string; glow: string; shadow: string }> = {
  S: { color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  shadow: "0 0 40px rgba(245,158,11,0.5)"  },
  U: { color: "#fb923c", glow: "rgba(251,146,60,0.35)",  shadow: "0 0 40px rgba(251,146,60,0.5)"  },
  P: { color: "#a78bfa", glow: "rgba(167,139,250,0.35)", shadow: "0 0 40px rgba(167,139,250,0.5)" },
  E: { color: "#34d399", glow: "rgba(52,211,153,0.35)",  shadow: "0 0 40px rgba(52,211,153,0.5)"  },
  R: { color: "#60a5fa", glow: "rgba(96,165,250,0.35)",  shadow: "0 0 40px rgba(96,165,250,0.5)"  },
};
const LETTERS = ["S", "U", "P", "E", "R"] as const;
function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

/* ── Starfield ───────────────────────────────────────────────────────────────── */
const STARS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  top: `${(i * 37 + 11) % 97}%`,
  left: `${(i * 59 + 17) % 100}%`,
  size: i % 5 === 0 ? 2 : 1,
  opacity: 0.04 + (i % 4) * 0.025,
  dur: 3 + (i % 7) * 0.8,
  delay: (i % 7) * 0.9,
}));

/* ── Per-milestone chip in the timeline ─────────────────────────────────────── */
function MilestoneNode({
  m, index, isNext, nextPct,
}: {
  m: SuperMilestone;
  index: number;
  isNext: boolean;
  nextPct: number;
}) {
  const isLetter = m.type === "letter";
  const letter = m.letter ?? "";
  const meta = isLetter ? LETTER_META[letter] : null;
  const accentColor = meta?.color ?? (m.unlocked ? "#64748b" : "#334155");
  const pct = m.unlocked ? 100 : isNext ? nextPct : 0;

  return (
    <div
      data-chip="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        minWidth: 58,
        flex: "0 0 auto",
        position: "relative",
      }}
    >
      {/* Active pulse ring */}
      {isNext && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: `1.5px solid ${accentColor}`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Main icon circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.06 + index * 0.04, type: "spring", stiffness: 280, damping: 20 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isLetter ? 17 : 19,
          fontWeight: 900,
          fontFamily: isLetter ? "'Playfair Display', Georgia, serif" : "inherit",
          background: m.unlocked
            ? isLetter
              ? `radial-gradient(circle at 35% 35%, ${accentColor}55, ${accentColor}1e)`
              : "rgba(100,116,139,0.2)"
            : isNext
            ? `radial-gradient(circle at 35% 35%, ${accentColor}2a, ${accentColor}0d)`
            : "rgba(15,18,32,0.7)",
          border: m.unlocked
            ? isLetter ? `2px solid ${accentColor}99` : "2px solid rgba(100,116,139,0.45)"
            : isNext
            ? `2px solid ${accentColor}66`
            : "2px solid rgba(255,255,255,0.05)",
          color: m.unlocked
            ? isLetter ? accentColor : "#94a3b8"
            : isNext
            ? isLetter ? `${accentColor}bb` : "#64748b"
            : "#1a1f36",
          boxShadow: m.unlocked && isLetter ? `0 0 16px ${accentColor}55` : "none",
          position: "relative",
          zIndex: 1,
          transition: "all 0.3s",
          flexShrink: 0,
        }}
      >
        {m.unlocked
          ? isLetter ? letter : m.emoji
          : isNext
          ? isLetter ? letter : m.emoji
          : "·"}

        {m.unlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.12 + index * 0.03, type: "spring", stiffness: 420 }}
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 7,
              color: "#000",
              fontWeight: 900,
              boxShadow: `0 0 6px ${accentColor}`,
            }}
          >
            ✓
          </motion.div>
        )}
      </motion.div>

      {/* Points threshold */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: m.unlocked ? (isLetter ? accentColor : "#64748b") : isNext ? "#475569" : "#1e293b",
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.04em",
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        {fmt(m.points)}
      </div>

      {/* Per-milestone progress bar */}
      <div
        style={{
          width: "100%",
          height: 3,
          borderRadius: 999,
          background: m.unlocked
            ? isLetter ? `${accentColor}28` : "rgba(100,116,139,0.12)"
            : "rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.25 + index * 0.03 }}
          style={{
            height: "100%",
            borderRadius: 999,
            background: m.unlocked
              ? isLetter
                ? `linear-gradient(90deg, ${accentColor}99, ${accentColor})`
                : "linear-gradient(90deg, #64748b88, #64748b)"
              : isNext
              ? `linear-gradient(90deg, ${accentColor}99, ${accentColor}dd)`
              : "transparent",
            boxShadow: (m.unlocked || isNext) ? `0 0 5px ${accentColor}88` : "none",
          }}
        />
      </div>

      {isNext && (
        <div
          style={{
            fontSize: 7,
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: accentColor,
            textTransform: "uppercase",
            fontFamily: "JetBrains Mono, monospace",
            lineHeight: 1,
          }}
        >
          NEXT
        </div>
      )}
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────────────────── */
export default function SuperJourneySection() {
  const [data, setData] = useState<SuperJourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSuperJourney().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* Auto-scroll active milestone into view */
  useEffect(() => {
    if (!data || !trackRef.current) return;
    const nextIndex = data.milestones.findIndex((m) => !m.unlocked);
    if (nextIndex < 0) return;
    const chips = trackRef.current.querySelectorAll("[data-chip]");
    const chip = chips[nextIndex] as HTMLElement | undefined;
    chip?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [data]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div
        style={{
          background: "linear-gradient(160deg, rgba(8,5,20,0.99), rgba(12,8,28,0.99))",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 28,
          padding: "40px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          minHeight: 220,
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {LETTERS.map((l, i) => (
            <motion.div
              key={l}
              animate={{ opacity: [0.06, 0.2, 0.06] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            height: 4,
            borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: "40%",
              height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)",
            }}
          />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { milestones, next_milestone, total_points, all_letters_done } = data;

  const letterStatus = LETTERS.map((l) => {
    const m = milestones.find((x) => x.type === "letter" && x.letter === l);
    return { letter: l, unlocked: m?.unlocked ?? false, ...LETTER_META[l] };
  });

  const nextIndex = milestones.findIndex((m) => !m.unlocked);
  const collectedCount = letterStatus.filter((l) => l.unlocked).length;

  const sectionAccent = all_letters_done
    ? "#f59e0b"
    : next_milestone?.type === "letter"
    ? LETTER_META[next_milestone.letter ?? "S"]?.color ?? "#a78bfa"
    : "#7b5ce5";

  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label="SUPER Journey"
      style={{
        position: "relative",
        background:
          "linear-gradient(160deg, rgba(8,5,20,0.99) 0%, rgba(12,8,28,0.99) 60%, rgba(6,4,18,0.99) 100%)",
        border: `1px solid ${sectionAccent}20`,
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.6), 0 0 80px ${sectionAccent}0a`,
      }}
    >
      {/* ── Starfield + grid ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {STARS.map((s) => (
          <motion.div
            key={s.id}
            animate={{ opacity: [s.opacity, s.opacity * 2.8, s.opacity] }}
            transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "white",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${sectionAccent}16 0%, transparent 65%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,92,229,0.09) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", padding: "34px 26px 26px" }}>

        {/* Top row: label + points */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div
                style={{
                  width: 22,
                  height: 1,
                  background: `linear-gradient(90deg, ${sectionAccent}, transparent)`,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  color: `${sectionAccent}aa`,
                  textTransform: "uppercase",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                The SUPER Journey
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(17px, 2.8vw, 22px)",
                fontWeight: 900,
                color: "#f1f5f9",
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.18,
              }}
            >
              {all_letters_done
                ? "You've gone SUPER. Legendary."
                : collectedCount === 0
                ? "Collect S·U·P·E·R, win exclusive rewards"
                : `${collectedCount} of 5 letters collected`}
            </h2>
          </div>

          {/* Points pill */}
          <motion.div
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
            style={{
              flexShrink: 0,
              textAlign: "right",
              padding: "10px 16px",
              background: `linear-gradient(145deg, ${sectionAccent}18, ${sectionAccent}08)`,
              border: `1px solid ${sectionAccent}33`,
              borderRadius: 14,
              minWidth: 76,
            }}
          >
            <div
              style={{
                fontSize: 21,
                fontWeight: 900,
                color: sectionAccent,
                fontFamily: "'Playfair Display', serif",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {total_points.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#334155",
                textTransform: "uppercase",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: 4,
              }}
            >
              points
            </div>
          </motion.div>
        </div>

        {/* ── Hero: S U P E R letters ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(8px, 1.8vw, 16px)",
            marginBottom: 34,
          }}
        >
          {letterStatus.map(({ letter, unlocked, color, glow, shadow }, i) => (
            <motion.div
              key={letter}
              initial={{ scale: 0.45, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 260, damping: 17 }}
              style={{
                position: "relative",
                width: "clamp(50px, 9.5vw, 78px)",
                height: "clamp(50px, 9.5vw, 78px)",
                borderRadius: "clamp(13px, 2.2vw, 20px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(22px, 4.2vw, 36px)",
                fontWeight: 900,
                fontFamily: "'Playfair Display', Georgia, serif",
                userSelect: "none",
                background: unlocked
                  ? `linear-gradient(145deg, ${color}44 0%, ${color}1a 100%)`
                  : "rgba(255,255,255,0.022)",
                border: unlocked
                  ? `2px solid ${color}77`
                  : "2px solid rgba(255,255,255,0.05)",
                color: unlocked ? color : "#171c30",
                boxShadow: unlocked ? shadow : "none",
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              {unlocked && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background: `radial-gradient(circle at 30% 25%, ${color}33, transparent 60%)`,
                    pointerEvents: "none",
                  }}
                />
              )}
              {unlocked ? letter : "?"}
              {unlocked && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 420 }}
                  style={{
                    position: "absolute",
                    bottom: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                    border: "2px solid rgba(8,5,20,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    color: "#000",
                    fontWeight: 900,
                    boxShadow: `0 0 10px ${glow}`,
                  }}
                >
                  ✓
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Milestone rail ── */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: "#233044",
                textTransform: "uppercase",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Milestone Track
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#233044", fontFamily: "JetBrains Mono, monospace" }}>
              {milestones.filter((m) => m.unlocked).length}/{milestones.length} unlocked
            </span>
          </div>

          <div style={{ position: "relative" }}>
            {/* Background track line */}
            <div
              style={{
                position: "absolute",
                top: 22,
                left: 29,
                right: 29,
                height: 1,
                background: "rgba(255,255,255,0.04)",
                zIndex: 0,
                pointerEvents: "none",
              }}
            />
            {/* Filled portion */}
            {nextIndex > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `calc(${(nextIndex / (milestones.length - 1)) * 100}% - 58px)`,
                }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                style={{
                  position: "absolute",
                  top: 22,
                  left: 29,
                  height: 1,
                  background: `linear-gradient(90deg, ${sectionAccent}88, ${sectionAccent}44)`,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Horizontal scroll */}
            <div
              ref={trackRef}
              style={{ overflowX: "auto", scrollbarWidth: "none", paddingBottom: 6, position: "relative", zIndex: 1 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "clamp(10px, 2vw, 22px)",
                  minWidth: "max-content",
                  padding: "0 2px 2px",
                }}
              >
                {milestones.map((m, i) => (
                  <MilestoneNode
                    key={m.badge_key}
                    m={m}
                    index={i}
                    isNext={i === nextIndex}
                    nextPct={i === nextIndex ? (next_milestone?.pct ?? 0) : 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer: next milestone progress or completion ── */}
        <AnimatePresence mode="wait">
          {all_letters_done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.13), rgba(251,191,36,0.06))",
                border: "1px solid rgba(245,158,11,0.28)",
                borderRadius: 16,
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1 }}>🏆</div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#f59e0b",
                    fontFamily: "'Playfair Display', serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Journey Complete — You're SUPER.
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                  Every milestone unlocked. Truly legendary achievement.
                </div>
              </div>
            </motion.div>
          ) : next_milestone ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: `1px solid ${sectionAccent}1e`,
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: `${sectionAccent}22`,
                      border: `1px solid ${sectionAccent}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                      fontWeight: 900,
                      fontFamily:
                        next_milestone.type === "letter"
                          ? "'Playfair Display', serif"
                          : "inherit",
                      color: next_milestone.type === "letter" ? sectionAccent : undefined,
                    }}
                  >
                    {next_milestone.type === "letter" ? next_milestone.letter : next_milestone.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.25 }}>
                      Next:{" "}
                      <span style={{ color: sectionAccent }}>{next_milestone.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                      {next_milestone.points_needed.toLocaleString()} pts to go
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: sectionAccent,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "JetBrains Mono, monospace",
                      lineHeight: 1,
                    }}
                  >
                    {next_milestone.pct}%
                  </div>
                  <div style={{ fontSize: 9, color: "#233044", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                    {total_points.toLocaleString()} / {next_milestone.range_end.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${next_milestone.pct}%` }}
                    transition={{ duration: 1.1, ease: "easeOut", delay: 0.5 }}
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${sectionAccent}bb, ${sectionAccent})`,
                      boxShadow: `0 0 12px ${sectionAccent}77`,
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 9, color: "#1e293b", fontFamily: "JetBrains Mono, monospace" }}>
                    {next_milestone.range_start.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 9, color: "#1e293b", fontFamily: "JetBrains Mono, monospace" }}>
                    {next_milestone.range_end.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

