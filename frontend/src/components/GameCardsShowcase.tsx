/**
 * GameCardsShowcase — Four premium animated tool cards:
 * Soroban Abacus, Vedic Grid Master, Magic Square, Abacus Flashcards.
 * Each card has a unique mini visual demo that loops when in view.
 */

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Columns3, Grid3X3, Sparkles, Layers, ArrowRight } from "lucide-react";

/* ── Design tokens ────────────────────────────────────────────────────────── */

const C = {
  bg:      "#050510",
  surf:    "#0A0A1A",
  bdr:     "rgba(255,255,255,0.06)",
  white:   "#F0F2FF",
  violet:  "#6D5CFF",
  teal:    "#3ECFB4",
  orange:  "#F97316",
  pink:    "#EC4899",
  gold:    "#F5A623",
  green:   "#10B981",
  ff:      "'Space Grotesk', 'DM Sans', sans-serif",
  fm:      "'JetBrains Mono', monospace",
} as const;

/* ── Soroban Abacus mini demo ─────────────────────────────────────────────── */

function SorobanMini({ active }: { active: boolean }) {
  const [beadPositions, setBeadPositions] = useState([0, 0, 0, 0, 0]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleRef = useRef<(() => void) | null>(null);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  const sequences = [
    [0, 0, 3, 4, 7],
    [0, 1, 5, 2, 3],
    [0, 0, 0, 8, 9],
    [0, 2, 4, 6, 1],
  ];

  cycleRef.current = () => {
    clearAll();
    let cursor = 0;
    sequences.forEach((seq) => {
      t(cursor, () => setBeadPositions(seq));
      cursor += 1200;
    });
    t(cursor, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (active) { t(300, () => cycleRef.current?.()); }
    else { clearAll(); setBeadPositions([0, 0, 0, 0, 0]); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Simple rod-and-bead visualization
  const ROD_H = 64;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "8px 0" }}>
      {beadPositions.map((val, rodIdx) => {
        const upperActive = val >= 5;
        const lowerCount = val % 5;
        return (
          <div key={rodIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {/* Rod line */}
            <div style={{ position: "absolute", top: 0, width: 2, height: ROD_H, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
            {/* Upper bead */}
            <motion.div
              animate={{ y: upperActive ? 12 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ width: 18, height: 8, borderRadius: 4, background: upperActive ? C.teal : "rgba(255,255,255,0.06)", border: `1px solid ${upperActive ? C.teal + "60" : "rgba(255,255,255,0.08)"}`, position: "relative", zIndex: 2, transition: "background 0.2s, border-color 0.2s" }}
            />
            {/* Divider bar */}
            <div style={{ width: 24, height: 2, background: "rgba(255,255,255,0.15)", margin: "10px 0", borderRadius: 1 }} />
            {/* Lower beads */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[0, 1, 2, 3].map(bi => (
                <motion.div key={bi}
                  animate={{ y: bi < lowerCount ? -4 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ width: 18, height: 7, borderRadius: 3.5, background: bi < lowerCount ? C.teal : "rgba(255,255,255,0.05)", border: `1px solid ${bi < lowerCount ? C.teal + "40" : "rgba(255,255,255,0.06)"}`, transition: "background 0.2s, border-color 0.2s" }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Vedic Grid mini demo ─────────────────────────────────────────────────── */

function VedicGridMini({ active }: { active: boolean }) {
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleRef = useRef<(() => void) | null>(null);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  const grid = [
    [4, 2, 8],
    [3, 5, 6],
    [7, 1, 9],
  ];

  cycleRef.current = () => {
    clearAll();
    let cursor = 0;
    for (let i = 0; i < 9; i++) {
      t(cursor, () => setHighlightIdx(i));
      cursor += 400;
    }
    t(cursor, () => setHighlightIdx(-1));
    cursor += 600;
    t(cursor, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (active) { t(300, () => cycleRef.current?.()); }
    else { clearAll(); setHighlightIdx(-1); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  let flatIdx = 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, maxWidth: 100, margin: "0 auto" }}>
      {grid.flat().map((num, i) => {
        const isActive = i <= highlightIdx;
        return (
          <motion.div key={i}
            animate={{ background: isActive ? `${C.orange}20` : "rgba(255,255,255,0.03)", borderColor: isActive ? `${C.orange}50` : "rgba(255,255,255,0.08)", scale: i === highlightIdx ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: isActive ? C.orange : "rgba(255,255,255,0.2)" }}>
            {num}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Magic Square mini demo ───────────────────────────────────────────────── */

function MagicSquareMini({ active }: { active: boolean }) {
  const [placed, setPlaced] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleRef = useRef<(() => void) | null>(null);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  // 3×3 magic square: each row/col/diag sums to 15
  const solution = [2, 7, 6, 9, 5, 1, 4, 3, 8];
  const order = [4, 0, 8, 2, 6, 1, 7, 3, 5]; // reveal order (center first, then corners, etc.)

  cycleRef.current = () => {
    clearAll();
    setPlaced(0);
    let cursor = 0;
    for (let i = 1; i <= 9; i++) {
      t(cursor, () => setPlaced(i));
      cursor += 500;
    }
    cursor += 1500;
    t(cursor, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (active) { t(300, () => cycleRef.current?.()); }
    else { clearAll(); setPlaced(0); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const revealedIndices = new Set(order.slice(0, placed));
  const allPlaced = placed >= 9;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, maxWidth: 100, margin: "0 auto" }}>
      {solution.map((num, i) => {
        const isRevealed = revealedIndices.has(i);
        return (
          <motion.div key={i}
            animate={{
              background: allPlaced ? `${C.pink}25` : isRevealed ? `${C.pink}12` : "rgba(255,255,255,0.02)",
              borderColor: allPlaced ? `${C.pink}60` : isRevealed ? `${C.pink}35` : "rgba(255,255,255,0.08)",
              scale: isRevealed && !allPlaced ? [1, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: isRevealed ? C.pink : "rgba(255,255,255,0.08)" }}>
            {isRevealed ? num : ""}
          </motion.div>
        );
      })}
      {allPlaced && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ gridColumn: "1 / -1", textAlign: "center", fontFamily: C.fm, fontSize: 8, color: C.pink, letterSpacing: "0.1em", marginTop: 4, fontWeight: 700 }}>
          = 15 ✓
        </motion.div>
      )}
    </div>
  );
}

/* ── Flashcards mini demo ─────────────────────────────────────────────────── */

function FlashcardMini({ active }: { active: boolean }) {
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleRef = useRef<(() => void) | null>(null);
  const clearAll = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const t = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); };

  const cards = [
    { front: "347", back: "●●● ●●●● ○○○○ ○○○○ ●●●○" },
    { front: "89",  back: "○ ●●●● ○○○○ ●●●●" },
    { front: "512", back: "● ○ ●○○○ ○○●○" },
  ];

  cycleRef.current = () => {
    clearAll();
    let cursor = 0;
    cards.forEach((_, ci) => {
      t(cursor, () => { setCardIdx(ci); setFlipped(false); });
      cursor += 800;
      t(cursor, () => setFlipped(true));
      cursor += 1400;
    });
    t(cursor, () => cycleRef.current?.());
  };

  useEffect(() => {
    if (active) { t(300, () => cycleRef.current?.()); }
    else { clearAll(); setCardIdx(0); setFlipped(false); }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const card = cards[cardIdx];

  return (
    <div style={{ perspective: 200, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${cardIdx}-${flipped}`}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            width: 100, height: 60, borderRadius: 10,
            background: flipped ? `${C.gold}15` : "rgba(255,255,255,0.03)",
            border: `1px solid ${flipped ? C.gold + "40" : "rgba(255,255,255,0.08)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          {!flipped ? (
            <span style={{ fontFamily: C.fm, fontSize: 20, fontWeight: 800, color: C.gold, letterSpacing: "-0.02em" }}>{card.front}</span>
          ) : (
            <>
              <span style={{ fontFamily: C.fm, fontSize: 8, color: C.gold, letterSpacing: "0.08em" }}>ABACUS</span>
              {/* Mini bead row representation */}
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 16, borderRadius: 3, background: `${C.gold}30`, border: `1px solid ${C.gold}40` }} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Card wrapper ─────────────────────────────────────────────────────────── */

interface GameCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  children: React.ReactNode;
  index: number;
  active: boolean;
}

function GameCard({ title, subtitle, icon, color, href, children, index, active }: GameCardProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(href)}
      style={{
        cursor: "pointer",
        position: "relative",
        padding: 24,
        borderRadius: 20,
        background: C.surf,
        border: `1px solid ${hovered ? color + "40" : C.bdr}`,
        overflow: "hidden",
        transition: "border-color 0.3s, transform 0.3s, box-shadow 0.3s",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered ? `0 24px 60px ${color}12, 0 0 0 1px ${color}18` : "0 8px 30px rgba(0,0,0,0.2)",
      }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", top: -60, right: -60, width: 160, height: 160, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}${hovered ? "12" : "06"} 0%, transparent 70%)`,
        transition: "background 0.3s", pointerEvents: "none",
      }} />

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, position: "relative", zIndex: 1 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: C.ff, letterSpacing: "-0.02em" }}>{title}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: C.ff }}>{subtitle}</div>
        </div>
      </div>

      {/* Mini demo */}
      <div style={{ position: "relative", zIndex: 1, minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, padding: "8px 0", borderRadius: 12, background: "rgba(255,255,255,0.015)", border: `1px solid ${C.bdr}` }}>
        {children}
      </div>

      {/* CTA */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.4, x: hovered ? 4 : 0 }}
        style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.ff, fontSize: 12, fontWeight: 600, color, position: "relative", zIndex: 1 }}>
        Try it <ArrowRight size={13} />
      </motion.div>
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function GameCardsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-60px" });

  const cards = [
    {
      title: "Soroban Abacus",
      subtitle: "Interactive virtual abacus",
      icon: <Columns3 size={18} />,
      color: C.teal,
      href: "/tools/soroban",
      demo: <SorobanMini active={isInView} />,
    },
    {
      title: "Vedic Grid",
      subtitle: "Multiplication mastery",
      icon: <Grid3X3 size={18} />,
      color: C.orange,
      href: "/tools/gridmaster",
      demo: <VedicGridMini active={isInView} />,
    },
    {
      title: "Magic Square",
      subtitle: "Number puzzle challenge",
      icon: <Sparkles size={18} />,
      color: C.pink,
      href: "/tools/gridmaster/magic",
      demo: <MagicSquareMini active={isInView} />,
    },
    {
      title: "Abacus Flashcards",
      subtitle: "Number-to-bead training",
      icon: <Layers size={18} />,
      color: C.gold,
      href: "/tools/soroban/flashcards",
      demo: <FlashcardMini active={isInView} />,
    },
  ];

  return (
    <section ref={sectionRef}
      style={{ padding: "clamp(40px,8vw,80px) clamp(14px,4vw,24px)", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.violet}06 0%, transparent 70%)`, filter: "blur(100px)" }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px,5vw,56px)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(109,92,255,0.08)", border: "1px solid rgba(109,92,255,0.20)", borderRadius: 100, padding: "5px 16px", marginBottom: 18, fontFamily: C.fm, fontSize: 11, fontWeight: 700, color: C.violet, letterSpacing: "0.08em" }}>
            <Grid3X3 size={11} /> Learning Tools
          </div>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: C.ff, color: C.white, marginBottom: 12 }}>
            Master every{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.orange}, ${C.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              technique
            </span>
          </h2>
          <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto", fontFamily: C.ff }}>
            Interactive tools built specifically for abacus and vedic math students. Practice with real visual models.
          </p>
        </div>

        {/* Cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "clamp(14px,2vw,20px)" }}>
          {cards.map((card, i) => (
            <GameCard key={i} index={i} title={card.title} subtitle={card.subtitle} icon={card.icon} color={card.color} href={card.href} active={isInView}>
              {card.demo}
            </GameCard>
          ))}
        </div>
      </div>
    </section>
  );
}
