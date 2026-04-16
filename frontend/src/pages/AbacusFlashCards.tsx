import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { Maximize2, Minimize2, BookOpen, ChevronLeft, ChevronRight, Check, RotateCcw, Trophy, X, Layers } from "lucide-react";
import { isFullscreen, enterFullscreen, exitFullscreen } from "@/lib/fullscreen";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface RodState { upper: boolean; lower: number; }
type DigitRange = 'single' | 'double' | 'triple';
type CardStatus = 'unanswered' | 'correct' | 'wrong';
type Phase = 'config' | 'practice' | 'complete';
interface CardData {
  number: number;
  userAnswer: string;
  status: CardStatus;
  attempts: number;
}

// ─── ABACUS CONSTANTS (matches Soroban.tsx geometry exactly) ─────────────────
const ROD_COUNT = 4;
const TOP_H = 32, UPPER_H = 68, DIV_H = 16, LOWER_H = 128, BOT_H = 32;
const BEAD_H = 24, BEAD_RX = 12;
const DIV_Y = TOP_H + UPPER_H;
const TOTAL_H = TOP_H + UPPER_H + DIV_H + LOWER_H + BOT_H; // 276
const HB_REST = TOP_H + 5, HB_ACT = DIV_Y - BEAD_H - 3;
const EB_ACT_Y0 = DIV_Y + DIV_H + 3;
const EB_RST_Y3 = DIV_Y + DIV_H + LOWER_H - BEAD_H - 4;
const BW = 42, SP = BW + 16, PX = 52;
const ABW = PX * 2 + (ROD_COUNT - 1) * SP; // 278px — symmetric: left gap = right gap = PX - BW/2 = 31px

// ─── ABACUS HELPERS ───────────────────────────────────────────────────────────
function tEY(bi: number, cnt: number): number {
  if (bi < cnt) return EB_ACT_Y0 + bi * BEAD_H;
  const ri = bi - cnt, tr = 4 - cnt;
  return EB_RST_Y3 - (tr - 1 - ri) * BEAD_H;
}
const bk = (r: number, b: number) => r * 5 + b;
const dotColor = (i: number) => { const e = ROD_COUNT - i - 1; return e === 0 ? 'red' : e % 3 === 0 ? 'blue' : null; };
const digitToRod = (d: number): RodState => ({ upper: d >= 5, lower: d % 5 });
const numberToRods = (n: number): RodState[] => [
  digitToRod(Math.floor(n / 1000) % 10),
  digitToRod(Math.floor(n / 100) % 10),
  digitToRod(Math.floor(n / 10) % 10),
  digitToRod(n % 10),
];

function generateDeck(ranges: DigitRange[], count: number): number[] {
  const rangeMap: Record<DigitRange, [number, number]> = {
    single: [0, 9],
    double: [10, 99],
    triple: [100, 999],
  };

  // For each card, first randomly pick one of the selected ranges,
  // then pick a unique number from that range.
  // This guarantees true mixing — no bias toward larger ranges.
  const usedPerRange: Record<DigitRange, Set<number>> = {
    single: new Set(), double: new Set(), triple: new Set(),
  };

  const deck: number[] = [];
  let attempts = 0;

  while (deck.length < count && attempts < count * 200) {
    attempts++;
    // Randomly pick which range to sample from this turn
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    const [lo, hi] = rangeMap[range];
    const poolSize = hi - lo + 1;
    if (usedPerRange[range].size >= poolSize) continue; // that range exhausted
    let n: number;
    let inner = 0;
    do { n = Math.floor(Math.random() * poolSize) + lo; inner++; }
    while (usedPerRange[range].has(n) && inner < poolSize * 4);
    if (!usedPerRange[range].has(n)) { usedPerRange[range].add(n); deck.push(n); }
  }

  // ── Repeat-fill fallback ──────────────────────────────────────────────────
  // If count exceeds total unique numbers in the selected ranges (e.g. 50 cards
  // with only single-digit range which has only 10 unique values), fill the
  // remaining slots with additional random picks (repeats allowed) so the user
  // always gets exactly the number of cards they asked for.
  if (deck.length < count) {
    const allNums: [number, number][] = ranges.map(r => rangeMap[r]);
    while (deck.length < count) {
      const [lo, hi] = allNums[Math.floor(Math.random() * allNums.length)];
      deck.push(Math.floor(Math.random() * (hi - lo + 1)) + lo);
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rangesToLabel(ranges: DigitRange[]): string {
  if (ranges.length === 3) return 'All Digits (0–999)';
  if (ranges.length === 1) {
    if (ranges[0] === 'single') return 'Single Digit';
    if (ranges[0] === 'double') return 'Double Digit';
    return 'Triple Digit';
  }
  return ranges.map(r => r === 'single' ? 'Single' : r === 'double' ? 'Double' : 'Triple').join(' + ');
}

// ─── SPRING ANIMATION HOOK ────────────────────────────────────────────────────
function useBeadSprings(rods: RodState[]) {
  const [animY, setAnimY] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    rods.forEach((r, i) => {
      m[bk(i, 0)] = r.upper ? HB_ACT : HB_REST;
      [0, 1, 2, 3].forEach(bi => { m[bk(i, bi + 1)] = tEY(bi, r.lower); });
    });
    return m;
  });
  const spR = useRef<Record<string, { y: number; vy: number; target: number }>>({});
  const rafR = useRef(0), genR = useRef(0);

  useEffect(() => {
    const sp = spR.current;
    rods.forEach((r, i) => {
      const hk = bk(i, 0), hT = r.upper ? HB_ACT : HB_REST;
      if (hk in sp) sp[hk].target = hT; else sp[hk] = { y: hT, vy: 0, target: hT };
      [0, 1, 2, 3].forEach(bi => {
        const ek = bk(i, bi + 1), eT = tEY(bi, r.lower);
        if (ek in sp) sp[ek].target = eT; else sp[ek] = { y: eT, vy: 0, target: eT };
      });
    });
    Object.keys(sp).forEach(k => { if (Math.floor(Number(k) / 5) >= rods.length) delete sp[Number(k)]; });
    cancelAnimationFrame(rafR.current);
    const myGen = ++genR.current;
    let last = performance.now();
    function tick(now: number) {
      if (myGen !== genR.current) return;
      const dt = Math.min((now - last) / 1000, 0.032); last = now;
      let moving = false;
      Object.keys(spR.current).forEach(k => {
        const s = spR.current[k], bi = Number(k) % 5;
        const st = bi === 0 ? 280 : 320, dm = bi === 0 ? 22 : 26;
        s.vy += (-st * (s.y - s.target) - dm * s.vy) * dt;
        s.y += s.vy * dt;
        if (Math.abs(s.y - s.target) > 0.05 || Math.abs(s.vy) > 0.05) moving = true;
      });
      setAnimY(prev => {
        const next = { ...prev };
        Object.keys(spR.current).forEach(k => { next[Number(k)] = spR.current[k].y; });
        return next;
      });
      if (moving) rafR.current = requestAnimationFrame(tick);
    }
    rafR.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafR.current);
  }, [rods]); // eslint-disable-line

  return animY;
}

// ─── SOUND HOOK ───────────────────────────────────────────────────────────────
function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  function gc(): AudioContext | null {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      return ctxRef.current.state === 'running' ? ctxRef.current : null;
    } catch { return null; }
  }
  useEffect(() => { gc(); }, []); // eslint-disable-line

  const playCard = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(480, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
    } catch { /* ignore */ }
  }, []);

  const playCorrect = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.1); g.gain.linearRampToValueAtTime(0.18, t + i * 0.1 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.22);
        o.connect(g); g.connect(c.destination); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.28);
      });
    } catch { /* ignore */ }
  }, []);

  const playWrong = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      [220, 185].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.07); g.gain.linearRampToValueAtTime(0.11, t + i * 0.07 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.17);
        o.connect(g); g.connect(c.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.2);
      });
    } catch { /* ignore */ }
  }, []);

  const playNav = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 540;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.09);
    } catch { /* ignore */ }
  }, []);

  const playComplete = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      [523, 659, 784, 880, 1047, 1318].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.13); g.gain.linearRampToValueAtTime(0.15, t + i * 0.13 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.28);
        o.connect(g); g.connect(c.destination); o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.32);
      });
    } catch { /* ignore */ }
  }, []);

  return { playCard, playCorrect, playWrong, playNav, playComplete };
}

// ─── SVG DEFINITIONS ─────────────────────────────────────────────────────────
function SvgDefs() {
  return (
    <defs>
      <linearGradient id="fc-gRail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#222a3c" /><stop offset="100%" stopColor="#111620" />
      </linearGradient>
      <linearGradient id="fc-gRailHi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(140,170,220,0.11)" /><stop offset="60%" stopColor="rgba(140,170,220,0.02)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <linearGradient id="fc-gDivSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a3858" /><stop offset="48%" stopColor="#162238" /><stop offset="100%" stopColor="#080c18" />
      </linearGradient>
      <linearGradient id="fc-gDivTopEdge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="transparent" /><stop offset="6%" stopColor="rgba(140,180,255,0.55)" />
        <stop offset="50%" stopColor="rgba(180,210,255,0.75)" /><stop offset="94%" stopColor="rgba(140,180,255,0.55)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <linearGradient id="fc-gDivAmber" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="transparent" /><stop offset="4%" stopColor="rgba(232,152,10,0.55)" />
        <stop offset="50%" stopColor="rgba(255,190,40,0.90)" /><stop offset="96%" stopColor="rgba(232,152,10,0.55)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <radialGradient id="fc-gBg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#0c1020" /><stop offset="100%" stopColor="#070a14" />
      </radialGradient>
      <linearGradient id="fc-gRod" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0a0f1e" /><stop offset="50%" stopColor="#2e4058" /><stop offset="100%" stopColor="#0a0f1e" />
      </linearGradient>
      <linearGradient id="fc-gH0" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#d8e4f0" /><stop offset="30%" stopColor="#90a8c0" /><stop offset="68%" stopColor="#4a6070" /><stop offset="100%" stopColor="#1a2635" />
      </linearGradient>
      <linearGradient id="fc-gH1" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#fff0b0" /><stop offset="28%" stopColor="#f0a818" /><stop offset="65%" stopColor="#c86000" /><stop offset="100%" stopColor="#602800" />
      </linearGradient>
      <linearGradient id="fc-gE0" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#b0c4d8" /><stop offset="30%" stopColor="#6a8098" /><stop offset="68%" stopColor="#384858" /><stop offset="100%" stopColor="#141e28" />
      </linearGradient>
      <linearGradient id="fc-gE1" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#ffe090" /><stop offset="28%" stopColor="#d88810" /><stop offset="65%" stopColor="#a05000" /><stop offset="100%" stopColor="#4a2000" />
      </linearGradient>
      <linearGradient id="fc-gGloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.30)" /><stop offset="55%" stopColor="rgba(255,255,255,0.04)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <filter id="fc-fDrop" x="-40%" y="-50%" width="180%" height="210%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.82)" />
      </filter>
      <filter id="fc-fGlowE" x="-60%" y="-80%" width="220%" height="260%">
        <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(220,140,0,0.58)" />
      </filter>
      <filter id="fc-fGlowH" x="-70%" y="-90%" width="240%" height="280%">
        <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="rgba(245,175,20,0.68)" />
      </filter>
    </defs>
  );
}

function RodShaft({ cx }: { cx: number }) {
  return (
    <>
      <line x1={cx} y1={TOP_H + 2} x2={cx} y2={TOTAL_H - BOT_H - 2} stroke="url(#fc-gRod)" strokeWidth={2.8} strokeLinecap="round" />
      <line x1={cx} y1={TOP_H + 2} x2={cx} y2={TOTAL_H - BOT_H - 2} stroke="rgba(160,200,255,0.055)" strokeWidth={0.8} strokeLinecap="round" />
    </>
  );
}

function Bolts({ w, y }: { w: number; y: number }) {
  return (
    <>
      {[w * 0.1, w * 0.5, w * 0.9].map((bx, i) => (
        <g key={i}>
          <circle cx={bx} cy={y} r={5} fill="#0c1018" stroke="rgba(70,100,150,0.22)" strokeWidth={0.75} />
          <circle cx={bx} cy={y} r={2.5} fill="none" stroke="rgba(70,100,150,0.28)" strokeWidth={0.5} />
          <line x1={bx - 2.8} y1={y} x2={bx + 2.8} y2={y} stroke="rgba(80,110,160,0.28)" strokeWidth={0.8} />
          <line x1={bx} y1={y - 2.8} x2={bx} y2={y + 2.8} stroke="rgba(80,110,160,0.28)" strokeWidth={0.8} />
          <circle cx={bx - 1} cy={y - 1} r={0.9} fill="rgba(200,220,255,0.16)" />
        </g>
      ))}
    </>
  );
}

function MarkerDot({ cx, color }: { cx: number; color: string }) {
  const fill = color === 'red' ? '#e85030' : '#3da8e8';
  const glow = color === 'red' ? 'rgba(232,80,48,0.7)' : 'rgba(61,168,232,0.7)';
  const r = color === 'red' ? 5 : 4;
  return (
    <g>
      <circle cx={cx} cy={DIV_Y + DIV_H / 2} r={r + 3.5} fill="none" stroke={glow} strokeWidth={0.5} opacity={0.28} />
      <circle cx={cx} cy={DIV_Y + DIV_H / 2} r={r} fill={fill} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
      <circle cx={cx - 1.2} cy={DIV_Y + DIV_H / 2 - 1.5} r={1.2} fill="rgba(255,255,255,0.44)" />
    </g>
  );
}

function Bead({ bx, by, bw, active, kind }: { bx: number; by: number; bw: number; active: boolean; kind: string }) {
  const isH = kind === 'heaven';
  const fill = active ? (isH ? 'url(#fc-gH1)' : 'url(#fc-gE1)') : (isH ? 'url(#fc-gH0)' : 'url(#fc-gE0)');
  const filt = active ? (isH ? 'url(#fc-fGlowH)' : 'url(#fc-fGlowE)') : 'url(#fc-fDrop)';
  const strk = active ? 'rgba(255,175,0,0.26)' : 'rgba(22,36,60,0.9)';
  const cx = bx + bw / 2, cy = by + BEAD_H / 2;
  return (
    <g filter={filt}>
      <rect x={bx} y={by} width={bw} height={BEAD_H} rx={BEAD_RX} ry={BEAD_RX} fill={fill} stroke={strk} strokeWidth={0.8} />
      <rect x={bx + 3} y={by + 2} width={bw - 6} height={BEAD_H * 0.46} rx={BEAD_RX - 2} fill="url(#fc-gGloss)" />
      <line x1={bx + 9} y1={cy} x2={bx + bw - 9} y2={cy} stroke={active ? 'rgba(130,60,0,0.5)' : 'rgba(0,0,0,0.28)'} strokeWidth={1.1} />
      <ellipse cx={cx} cy={cy} rx={3} ry={2.2} fill={active ? 'rgba(80,30,0,0.52)' : 'rgba(0,0,0,0.4)'} stroke={active ? 'rgba(60,20,0,0.75)' : 'rgba(0,0,0,0.55)'} strokeWidth={0.5} />
      <circle cx={cx - 0.8} cy={cy - 0.8} r={0.9} fill="rgba(255,255,255,0.2)" />
      {active && <rect x={bx + 4} y={by + BEAD_H - 4} width={bw - 8} height={2.5} rx={1.5} fill="rgba(240,160,0,0.22)" />}
    </g>
  );
}

// ─── READ-ONLY ABACUS DISPLAY ─────────────────────────────────────────────────
const ABACUS_PAD_X = 20; // inner horizontal padding per side
const ABACUS_BORDER = 2;  // gradient-border padding
const ABACUS_FULL_W = ABW + ABACUS_PAD_X * 2 + ABACUS_BORDER * 2; // 322
const ABACUS_FULL_H = TOTAL_H + 18 + 22 + ABACUS_BORDER * 2;      // 320
const ABACUS_SCALE = 1.5; // display scale factor

function AbacusDisplay({ rods, glowColor }: { rods: RodState[]; glowColor?: string }) {
  const animY = useBeadSprings(rods);

  const w = ABW;
  const shadowGlow = glowColor
    ? `0 0 60px ${glowColor}40, 0 24px 80px rgba(0,0,0,0.88)`
    : '0 24px 80px rgba(0,0,0,0.88), 0 8px 24px rgba(0,0,0,0.55)';

  const scaledW = Math.round(ABACUS_FULL_W * ABACUS_SCALE);
  const scaledH = Math.round(ABACUS_FULL_H * ABACUS_SCALE);

  return (
    <div style={{ width: scaledW, height: scaledH, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flexShrink: 0 }}>
    <div style={{ flexShrink: 0, width: ABACUS_FULL_W, transform: `scale(${ABACUS_SCALE})`, transformOrigin: 'top center' }}>
      <div style={{
        position: 'relative', padding: 2, borderRadius: 13,
        background: 'linear-gradient(145deg,rgba(80,110,160,0.42) 0%,rgba(20,28,45,0.25) 45%,rgba(70,100,150,0.36) 100%)',
        boxShadow: `${shadowGlow}, inset 0 1px 0 rgba(130,170,230,0.1)`,
        transition: 'box-shadow 0.4s ease',
      }}>
        {/* Hardware corner bolts */}
        {([{ top: 10, left: 10 }, { top: 10, right: 10 }, { bottom: 10, left: 10 }, { bottom: 10, right: 10 }] as React.CSSProperties[]).map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', width: 12, height: 12, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%,#2a3550,#0e1420)',
            border: '1px solid rgba(80,110,160,0.32)', zIndex: 3,
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)', ...pos,
          }} />
        ))}
        {/* Side braces */}
        {([{ left: 3 }, { right: 3 }] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{
            position: 'absolute', ...s, top: 22, bottom: 22, width: 1, zIndex: 2,
            background: 'linear-gradient(180deg,transparent,rgba(80,110,160,0.22) 30%,rgba(80,110,160,0.22) 70%,transparent)',
          }} />
        ))}
        {/* Frame body */}
        <div style={{
          background: 'linear-gradient(165deg,#0c1422,#08101a 35%,#060c14 60%,#08101a)',
          borderRadius: 11, padding: '18px 20px 22px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(50,90,160,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(50,90,160,0.022) 1px,transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
          <svg width={w} height={TOTAL_H} viewBox={`0 0 ${w} ${TOTAL_H}`} style={{ display: 'block', overflow: 'visible' }}>
            <SvgDefs />
            <rect x={0} y={0} width={w} height={TOP_H} rx={5} fill="url(#fc-gRail)" />
            <rect x={0} y={0} width={w} height={TOP_H} rx={5} fill="url(#fc-gRailHi)" />
            <rect x={14} y={1.5} width={w - 28} height={0.8} rx={0.4} fill="rgba(180,210,255,0.11)" />
            <Bolts w={w} y={TOP_H / 2} />
            <rect x={0} y={TOTAL_H - BOT_H} width={w} height={BOT_H} rx={5} fill="url(#fc-gRail)" />
            <rect x={14} y={TOTAL_H - BOT_H + 1.5} width={w - 28} height={0.8} rx={0.4} fill="rgba(180,210,255,0.06)" />
            <Bolts w={w} y={TOTAL_H - BOT_H / 2} />
            <rect x={0} y={TOP_H} width={w} height={TOTAL_H - TOP_H - BOT_H} fill="url(#fc-gBg)" />
            <rect x={0} y={DIV_Y} width={w} height={DIV_H} fill="#080c16" />
            <rect x={0} y={DIV_Y} width={w} height={DIV_H} fill="url(#fc-gDivSteel)" />
            <rect x={0} y={DIV_Y} width={w} height={1.5} fill="url(#fc-gDivTopEdge)" />
            <rect x={8} y={DIV_Y + DIV_H / 2 - 0.75} width={w - 16} height={1.5} fill="url(#fc-gDivAmber)" rx={0.75} />
            <rect x={0} y={DIV_Y + DIV_H - 2} width={w} height={2} fill="rgba(0,0,0,0.65)" />
            {rods.map((rod, i) => {
              const cx = PX + i * SP, bx = cx - BW / 2;
              const dc = dotColor(i);
              const hY = animY[bk(i, 0)] !== undefined ? animY[bk(i, 0)] : (rod.upper ? HB_ACT : HB_REST);
              const eYs = [0, 1, 2, 3].map(bi => animY[bk(i, bi + 1)] !== undefined ? animY[bk(i, bi + 1)] : tEY(bi, rod.lower));
              return (
                <g key={i}>
                  <RodShaft cx={cx} />
                  {dc && <MarkerDot cx={cx} color={dc} />}
                  <Bead bx={bx} by={hY} bw={BW} active={rod.upper} kind="heaven" />
                  {[0, 1, 2, 3].map(bi => (
                    <Bead key={bi} bx={bx} by={eYs[bi]} bw={BW} active={bi < rod.lower} kind="earth" />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── PARTICLES ───────────────────────────────────────────────────────────────
function SuccessParticles() {
  const pts = useRef(Array.from({ length: 18 }, (_, i) => ({
    id: i, x: 10 + Math.random() * 80, delay: Math.random() * 0.5,
    sz: 12 + Math.random() * 14,
    e: ['⭐', '✨', '🎊', '💛', '🌟', '🎉', '🎈', '💫'][Math.floor(Math.random() * 8)],
  }))).current;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, overflow: 'hidden' }}>
      {pts.map(p => (
        <div key={p.id} className="fc-particle" style={{
          position: 'absolute', left: `${p.x}%`, top: -40, fontSize: p.sz,
          animationDelay: `${p.delay}s`,
        }}>{p.e}</div>
      ))}
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const FLASHCARD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');

  :root {
    --fk-bg:    #07070F;
    --fk-surf:  rgba(255,255,255,0.04);
    --fk-surf2: rgba(255,255,255,0.065);
    --fk-bdr:   rgba(255,255,255,0.09);
    --fk-bdr2:  rgba(255,255,255,0.13);
    --fk-white: #F0F2FF;
    --fk-muted: #525870;
    --fk-fb:    'DM Sans', sans-serif;
    --fk-fm:    'JetBrains Mono', monospace;
    --fk-purple:  #7C3AED;
    --fk-purple2: #9D7FF0;
    --fk-pdim:    rgba(124,58,237,0.12);
    --fk-pglow:   rgba(124,58,237,0.22);
    --fk-green:   #10B981;
    --fk-gdim:    rgba(16,185,129,0.12);
    --fk-red:     #EF4444;
    --fk-rdim:    rgba(239,68,68,0.12);
    --fk-gold:    #F59E0B;
  }

  @keyframes fk-fade-up   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes fk-fade-in   { from{opacity:0} to{opacity:1} }
  @keyframes fk-scale-in  { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
  @keyframes fk-scale-pop { 0%{transform:scale(1)} 45%{transform:scale(1.08)} 100%{transform:scale(1)} }
  @keyframes fk-shake     { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
  @keyframes fk-correct-ring { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0)} 40%{box-shadow:0 0 0 5px rgba(16,185,129,.22)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
  @keyframes fk-wrong-ring   { 0%{box-shadow:0 0 0 0 rgba(239,68,68,0)}   40%{box-shadow:0 0 0 5px rgba(239,68,68,.25)}  100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
  @keyframes fk-bg-breathe  { 0%,100%{opacity:.55} 50%{opacity:1} }
  @keyframes fk-particle-fall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(380px) rotate(520deg);opacity:0} }
  @keyframes fk-reveal { from{opacity:0;transform:translateY(10px) scale(.95)} to{opacity:1;transform:none} }
  @keyframes fk-card-pop { from{opacity:0;transform:scale(.94) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }

  .fk-particle { animation: fk-particle-fall 1.3s ease-in forwards; }
  .fk-shake    { animation: fk-shake .38s ease; }

  /* ── Page shell ───────────────────────────────── */
  .fk-page {
    min-height:100vh; background:var(--fk-bg); font-family:var(--fk-fb);
    color:var(--fk-white); overflow-x:hidden; position:relative;
  }
  /* Fullscreen: fix the practice wrapper over everything (covers footer & banner) */
  .fk-practice-wrap.fk-fullscreen {
    position:fixed; inset:0; z-index:9999; overflow-y:auto;
    display:flex; flex-direction:column; background:var(--fk-bg);
  }
  .fk-practice-wrap.fk-fullscreen .fk-top-bar { max-width:100%; box-sizing:border-box; }
  .fk-practice-wrap.fk-fullscreen .fk-dots-row { max-width:100%; }

  /* ── Config ───────────────────────────────────── */
  .fk-config-hero {
    position:relative; overflow:hidden; border-radius:0 0 28px 28px;
    padding:clamp(32px,5vw,52px) clamp(16px,4vw,32px) clamp(40px,6vw,60px);
    background:linear-gradient(145deg,#180E2A 0%,#120C22 40%,#08060F 100%);
    border-bottom:1px solid rgba(124,58,237,.2);
  }
  .fk-config-hero-glow {
    position:absolute; top:-20%; left:50%; transform:translateX(-50%);
    width:520px; height:420px;
    background:radial-gradient(ellipse,rgba(124,58,237,.14) 0%,rgba(124,58,237,.04) 50%,transparent 70%);
    pointer-events:none; animation:fk-bg-breathe 7s ease-in-out infinite;
  }
  .fk-config-grid {
    position:absolute; inset:0;
    background-image:linear-gradient(rgba(124,58,237,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.05) 1px,transparent 1px);
    background-size:48px 48px;
    -webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%);
  }
  .fk-config-hero-inner { position:relative; z-index:1; text-align:center; }

  .fk-how-btn {
    position:absolute; top:clamp(14px,2vw,22px); right:clamp(14px,2vw,22px); z-index:10;
    background:rgba(124,58,237,.12); border:1px solid rgba(124,58,237,.25);
    border-radius:10px; padding:8px 14px; display:flex; align-items:center; gap:6px;
    color:var(--fk-purple2); font-family:var(--fk-fb); font-size:12px; font-weight:600;
    cursor:pointer; transition:all .2s;
  }
  .fk-how-btn:hover { background:rgba(124,58,237,.2); border-color:rgba(124,58,237,.45); }

  .fk-back-top-btn {
    position:absolute; top:clamp(14px,2vw,22px); left:clamp(14px,2vw,22px); z-index:10;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
    border-radius:10px; padding:8px 14px; display:flex; align-items:center; gap:6px;
    color:rgba(255,255,255,.5); font-family:var(--fk-fb); font-size:12px; font-weight:600;
    cursor:pointer; transition:all .2s; text-decoration:none;
  }
  .fk-back-top-btn:hover { background:rgba(255,255,255,.09); color:var(--fk-white); }

  .fk-hero-title {
    font-size:clamp(26px,5vw,38px); font-weight:800; letter-spacing:-.03em;
    line-height:1.1; color:var(--fk-white); margin:0 0 8px;
  }
  .fk-hero-sub {
    font-size:14px; color:rgba(255,255,255,.4); font-weight:400; margin:0;
  }

  .fk-config-body {
    max-width:560px; margin:0 auto; padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px) 80px;
    display:flex; flex-direction:column; gap:0;
  }
  .fk-section-label {
    font-size:10px; font-weight:700; letter-spacing:.16em;
    color:rgba(255,255,255,.3); text-transform:uppercase; margin-bottom:10px;
  }

  .fk-modes-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
  @media(max-width:360px){ .fk-modes-grid{ grid-template-columns:1fr; } }

  .fk-mode-card {
    all:unset; display:block; box-sizing:border-box;
    border-radius:16px; border:1.5px solid var(--fk-bdr);
    background:var(--fk-surf); padding:18px 14px 16px;
    cursor:pointer; position:relative; overflow:hidden;
    transition:transform .3s cubic-bezier(.4,0,.2,1), border-color .3s, box-shadow .3s, background .25s;
  }
  .fk-mode-card:hover  { transform:translateY(-5px); border-color:rgba(255,255,255,.2); box-shadow:0 12px 36px rgba(0,0,0,.35); }
  .fk-mode-card:active { transform:translateY(-2px) scale(.98); }
  .fk-mode-card.fk-active { transform:translateY(-4px); }

  .fk-mode-emoji  { font-size:22px; margin-bottom:6px; }
  .fk-mode-label  { font-size:13px; font-weight:700; color:rgba(255,255,255,.75); transition:color .2s; }
  .fk-mode-range  { font-size:11px; color:rgba(255,255,255,.3); transition:color .2s; margin-top:2px; }
  .fk-mode-check  {
    position:absolute; top:10px; right:10px;
    width:18px; height:18px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:9px; font-weight:700; color:#000;
    animation:fk-scale-pop .2s ease both;
  }

  .fk-selection-summary {
    border-radius:13px; border:1px solid; padding:12px 16px;
    display:flex; align-items:flex-start; gap:10px;
    font-size:12.5px; line-height:1.55; margin-bottom:28px;
    transition:all .3s;
  }

  .fk-count-row { display:flex; align-items:baseline; gap:8px; justify-content:center; margin-bottom:10px; }
  .fk-count-num  { font-size:44px; font-weight:800; letter-spacing:-.04em; line-height:1; transition:color .3s; font-family:var(--fk-fm); }
  .fk-count-unit { font-size:14px; color:rgba(255,255,255,.35); font-weight:500; }

  .fk-range {
    width:100%; height:4px; border-radius:2px; outline:none;
    cursor:pointer; -webkit-appearance:none; appearance:none;
    background:rgba(255,255,255,.1); margin-bottom:8px;
  }
  .fk-range::-webkit-slider-thumb {
    -webkit-appearance:none; appearance:none;
    width:22px; height:22px; border-radius:50%;
    background:var(--rc,#7C3AED); cursor:pointer;
    border:2px solid rgba(255,255,255,.35);
    box-shadow:0 2px 10px rgba(0,0,0,.4);
    transition:transform .15s;
  }
  .fk-range::-webkit-slider-thumb:hover { transform:scale(1.15); }
  .fk-range-ends { display:flex; justify-content:space-between; font-size:10px; color:rgba(255,255,255,.2); margin-bottom:14px; }

  .fk-presets { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:28px; }
  .fk-preset {
    padding:9px 4px; border-radius:10px;
    background:var(--fk-surf); border:1px solid var(--fk-bdr);
    color:rgba(255,255,255,.4); font-size:13px; font-weight:600;
    cursor:pointer; transition:all .18s; font-family:var(--fk-fm);
  }
  .fk-preset:hover { background:var(--fk-surf2); color:rgba(255,255,255,.7); }
  .fk-preset.fk-preset-on { font-weight:700; }

  .fk-start-btn {
    width:100%; padding:17px 0; border-radius:14px; border:none;
    font-size:15px; font-weight:800; letter-spacing:.01em;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;
    color:#fff; font-family:var(--fk-fb);
    transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s, filter .22s;
    position:relative; overflow:hidden;
  }
  .fk-start-btn:hover  { transform:translateY(-2px); filter:brightness(1.08); }
  .fk-start-btn:active { transform:translateY(0); filter:brightness(.96); }
  .fk-start-meta { font-size:11px; font-weight:500; opacity:.6; }

  /* ── How to Play modal ────────────────────────── */
  .fk-guide-overlay {
    position:fixed; inset:0; z-index:600;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,.78); backdrop-filter:blur(16px);
    animation:fk-fade-in .18s ease both;
  }
  .fk-guide-modal {
    background:#0E0C1E; border:1px solid rgba(124,58,237,.25);
    border-radius:22px; max-width:500px; width:calc(100vw - 40px);
    max-height:85vh; display:flex; flex-direction:column;
    box-shadow:0 40px 80px rgba(0,0,0,.5); animation:fk-scale-in .2s ease both;
  }
  .fk-guide-header {
    padding:24px 28px 0; flex-shrink:0;
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:18px;
  }
  .fk-guide-body   { padding:0 28px 28px; overflow-y:auto; flex:1; }
  .fk-guide-step   { display:flex; gap:14px; margin-bottom:18px; }
  .fk-guide-num    {
    width:28px; height:28px; border-radius:8px; flex-shrink:0;
    background:rgba(124,58,237,.12); border:1px solid rgba(124,58,237,.2);
    display:flex; align-items:center; justify-content:center;
    font-family:var(--fk-fm); font-size:12px; font-weight:700; color:var(--fk-purple2);
  }
  .fk-guide-close {
    width:32px; height:32px; border-radius:8px;
    border:1px solid var(--fk-bdr); background:var(--fk-surf2);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:var(--fk-muted); font-size:16px; font-weight:700; flex-shrink:0;
  }

  /* ── Practice screen ──────────────────────────── */
  .fk-practice-wrap {
    min-height:100vh; display:flex; flex-direction:column; align-items:center;
    padding:0 0 80px;
    background:linear-gradient(180deg,#0A091A 0%,var(--fk-bg) 100%);
    position:relative;
  }

  .fk-top-bar {
    width:100%; max-width:900px;
    padding:14px 18px 10px;
    display:flex; align-items:center; justify-content:space-between;
    gap:12px;
    position:sticky; top:0;
    background:rgba(10,9,26,.94); backdrop-filter:blur(14px);
    z-index:10; border-bottom:1px solid rgba(255,255,255,.05);
  }

  .fk-exit-btn {
    display:flex; align-items:center; gap:6px;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
    color:rgba(255,255,255,.5); border-radius:9px; padding:7px 12px;
    font-size:12.5px; font-weight:600; cursor:pointer;
    transition:all .2s; white-space:nowrap; font-family:var(--fk-fb);
  }
  .fk-exit-btn:hover { background:rgba(255,255,255,.1); color:var(--fk-white); }

  .fk-top-center { display:flex; align-items:center; gap:10px; flex:1; justify-content:center; flex-wrap:wrap; }
  .fk-mode-pill  {
    font-size:11px; font-weight:700; padding:3px 10px;
    border-radius:20px; border:1px solid; letter-spacing:.04em;
    white-space:nowrap;
  }
  .fk-counter { font-size:13px; color:rgba(255,255,255,.5); font-weight:500; font-family:var(--fk-fm); }
  .fk-counter strong { color:var(--fk-white); font-weight:700; }
  .fk-score-chip { font-size:12px; font-weight:700; white-space:nowrap; }

  .fk-fs-btn {
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
    color:rgba(255,255,255,.45); border-radius:9px; padding:7px 10px;
    cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center;
    flex-shrink:0;
  }
  .fk-fs-btn:hover { background:rgba(255,255,255,.1); color:var(--fk-white); }

  .fk-progress-bar { width:100%; height:3px; background:rgba(255,255,255,.07); position:relative; overflow:hidden; }
  .fk-progress-fill { height:100%; border-radius:2px; transition:width .5s cubic-bezier(.16,1,.3,1); }

  .fk-dots-row {
    display:flex; align-items:center; justify-content:center; gap:5px;
    padding:14px 20px 2px; flex-wrap:wrap; max-width:900px; width:100%;
  }
  .fk-dot {
    width:7px; height:7px; border-radius:50%;
    transition:all .3s cubic-bezier(.16,1,.3,1); flex-shrink:0;
  }

  .fk-card-area {
    width:100%; max-width:900px; padding:18px 20px 20px;
    display:flex; flex-direction:column; align-items:center; gap:18px;
    animation:fk-card-pop .38s cubic-bezier(.34,1.56,.64,1) both;
  }

  /* Column wrappers — stacked on mobile, side-by-side on ≥700px */
  .fk-abacus-col { display:flex; justify-content:center; align-items:center; flex-shrink:0; }
  .fk-controls-col { width:100%; display:flex; flex-direction:column; align-items:center; gap:18px; }

  /* ── Two-column layout on wider screens ───────────── */
  @media(min-width:700px) {
    .fk-card-area {
      flex-direction:row; align-items:center; justify-content:center;
      gap:0 40px; padding:24px 32px 28px;
    }
    .fk-abacus-col { flex:0 0 auto; }
    .fk-controls-col { flex:1; max-width:380px; align-items:stretch; }
    .fk-controls-col .fk-input-wrap { max-width:100%; }
    .fk-controls-col .fk-nav-row { max-width:100%; }
    .fk-controls-col .fk-answer-reveal { max-width:100%; }
    .fk-controls-col .fk-hint { max-width:100%; }
  }

  /* ── Fullscreen: same layout, fills viewport ─────── */
  .fk-practice-wrap.fk-fullscreen .fk-card-area {
    flex:1; max-width:100%; padding:20px 40px 28px;
  }
  @media(min-width:700px) {
    .fk-practice-wrap.fk-fullscreen .fk-card-area { gap:0 56px; padding:24px 56px 28px; }
    .fk-practice-wrap.fk-fullscreen .fk-controls-col { max-width:420px; }
  }

  .fk-abacus-wrap {
    display:flex; justify-content:center; align-items:flex-start;
    padding:10px 0; position:relative;
  }

  .fk-status-strip {
    display:flex; align-items:center; gap:8px;
    padding:8px 18px; border-radius:24px; border:1px solid;
    font-size:13px; font-weight:700; letter-spacing:.04em;
    animation:fk-reveal .22s ease both; white-space:nowrap;
  }
  .fk-status-correct { background:rgba(16,185,129,.1); border-color:rgba(16,185,129,.3); color:#34d399; }
  .fk-status-wrong   { background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.25); color:#f87171; }
  .fk-status-skip    { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.12); color:rgba(255,255,255,.45); }

  .fk-prompt {
    font-size:12px; font-weight:600; color:rgba(255,255,255,.35);
    letter-spacing:.08em; text-transform:uppercase; text-align:center;
  }

  .fk-input-wrap { width:100%; max-width:340px; display:flex; align-items:center; gap:10px; }
  .fk-input {
    flex:1; background:var(--fk-surf); border:2px solid var(--fk-bdr2);
    border-radius:14px; padding:16px 20px;
    font-family:var(--fk-fm); font-size:26px; font-weight:700;
    color:var(--fk-white); text-align:center; outline:none;
    transition:border-color .18s ease, box-shadow .18s ease, background .18s ease;
    width:100%; box-sizing:border-box;
  }
  .fk-input::placeholder { color:rgba(255,255,255,.1); font-size:18px; font-weight:400; font-family:var(--fk-fb); }
  .fk-input:focus   { border-color:rgba(124,58,237,.5); box-shadow:0 0 0 3px rgba(124,58,237,.1); }
  .fk-input.correct { border-color:rgba(16,185,129,.6); background:rgba(16,185,129,.06); animation:fk-correct-ring .45s ease both; }
  .fk-input.wrong   { border-color:rgba(239,68,68,.55); background:rgba(239,68,68,.06); animation:fk-wrong-ring .45s ease both; }

  .fk-check-btn {
    width:56px; height:56px; border-radius:14px; border:none;
    font-size:20px; font-weight:800; cursor:pointer; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    transition:transform .18s, filter .18s; color:#fff;
  }
  .fk-check-btn:hover  { transform:translateY(-2px); filter:brightness(1.1); }
  .fk-check-btn:active { transform:scale(.93); }

  .fk-answer-reveal {
    width:100%; max-width:340px; border-radius:16px; border:1px solid;
    padding:18px 24px 16px; display:flex; flex-direction:column; align-items:center; gap:6px;
    animation:fk-reveal .28s cubic-bezier(.34,1.56,.64,1) both;
  }
  .fk-answer-lbl  { font-size:10px; font-weight:700; letter-spacing:.2em; color:rgba(255,255,255,.28); text-transform:uppercase; }
  .fk-answer-num  { font-size:52px; font-weight:800; letter-spacing:-.04em; line-height:1; font-family:var(--fk-fm); }
  .fk-answer-breakdown { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:700; font-family:var(--fk-fm); }
  .fk-bd-sub { font-size:10px; color:rgba(255,255,255,.3); font-weight:400; }

  .fk-hint {
    font-size:12px; color:rgba(255,255,255,.4); background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08); border-radius:10px;
    padding:10px 16px; text-align:center; max-width:340px;
    animation:fk-reveal .22s ease both;
  }

  .fk-nav-row { display:flex; align-items:center; gap:9px; width:100%; max-width:340px; }
  .fk-nav-prev {
    width:52px; height:52px; border-radius:13px; border:1px solid var(--fk-bdr2);
    background:var(--fk-surf); color:rgba(255,255,255,.5); flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all .2s;
  }
  .fk-nav-prev:hover:not(:disabled) { background:var(--fk-surf2); color:var(--fk-white); }
  .fk-nav-prev:disabled { opacity:.28; cursor:not-allowed; }
  .fk-nav-next {
    flex:1; height:52px; border-radius:13px; border:none;
    font-family:var(--fk-fb); font-size:14.5px; font-weight:800;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px;
    color:#fff; transition:transform .2s, filter .2s, box-shadow .2s;
  }
  .fk-nav-next:hover  { transform:translateY(-2px); filter:brightness(1.08); }
  .fk-nav-next:active { transform:scale(.97); }

  .fk-kbd-hint { font-size:11px; color:rgba(255,255,255,.15); text-align:center; margin-top:2px; letter-spacing:.02em; }

  /* ── Exit confirm overlay ──────────────────────── */
  .fk-confirm-overlay {
    position:fixed; inset:0; z-index:500;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,.72); backdrop-filter:blur(14px);
    animation:fk-fade-in .15s ease both;
  }
  .fk-confirm-box {
    background:#0E0C1E; border:1px solid rgba(255,255,255,.1);
    border-radius:20px; padding:32px 28px;
    max-width:370px; width:calc(100vw - 40px);
    box-shadow:0 32px 64px rgba(0,0,0,.5); animation:fk-scale-in .2s ease both;
    display:flex; flex-direction:column; gap:20px; text-align:center;
  }

  /* ── Complete screen ──────────────────────────── */
  .fk-complete-wrap {
    min-height:100vh; display:flex; flex-direction:column; align-items:center;
    padding:32px 16px 80px;
    background:linear-gradient(180deg,#0A091A 0%,var(--fk-bg) 100%);
    position:relative; overflow-x:hidden;
  }
  .fk-complete-glow {
    position:fixed; top:0; left:0; right:0; height:380px;
    pointer-events:none; z-index:0;
  }
  .fk-complete-card {
    width:100%; max-width:500px;
    background:var(--fk-surf); border:1px solid var(--fk-bdr);
    border-radius:22px; padding:36px 28px 28px;
    display:flex; flex-direction:column; align-items:center; gap:0;
    position:relative; z-index:1; animation:fk-fade-up .45s ease both;
  }
  .fk-complete-icon-wrap {
    width:72px; height:72px; border-radius:22px; margin-bottom:16px;
    display:flex; align-items:center; justify-content:center;
    border:1.5px solid;
  }
  .fk-complete-title { font-size:26px; font-weight:800; letter-spacing:-.03em; margin:0 0 4px; color:var(--fk-white); }
  .fk-complete-grade { font-size:14px; color:rgba(255,255,255,.4); margin-bottom:24px; font-weight:400; }
  .fk-complete-score {
    font-size:56px; font-weight:800; letter-spacing:-.05em; line-height:1;
    font-family:var(--fk-fm); margin-bottom:6px;
  }
  .fk-complete-pct { font-size:18px; font-weight:500; color:rgba(255,255,255,.4); margin-bottom:28px; }

  .fk-stats-row { display:flex; gap:10px; width:100%; margin-bottom:22px; }
  .fk-stat-box {
    flex:1; background:rgba(255,255,255,.04); border:1px solid var(--fk-bdr);
    border-radius:14px; padding:16px 8px;
    display:flex; flex-direction:column; align-items:center; gap:4px;
  }
  .fk-stat-val { font-size:30px; font-weight:800; letter-spacing:-.04em; font-family:var(--fk-fm); }
  .fk-stat-lbl { font-size:11px; color:rgba(255,255,255,.35); font-weight:500; }

  .fk-breakdown-title {
    font-size:10px; font-weight:700; letter-spacing:.16em;
    color:rgba(255,255,255,.22); text-transform:uppercase; margin-bottom:10px; text-align:center;
  }
  .fk-breakdown-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(62px,1fr)); gap:6px; margin-bottom:24px; width:100%; }
  .fk-bd-item {
    padding:9px 4px; border-radius:11px; border:1px solid;
    display:flex; flex-direction:column; align-items:center; gap:3px;
  }
  .fk-bd-num  { font-size:14px; font-weight:700; font-family:var(--fk-fm); }
  .fk-bd-icon { font-size:11px; color:rgba(255,255,255,.25); }

  .fk-actions { width:100%; display:flex; flex-direction:column; gap:9px; }
  .fk-btn-primary {
    width:100%; padding:16px; border-radius:14px; border:none;
    font-size:15px; font-weight:800; cursor:pointer; color:#fff;
    font-family:var(--fk-fb); display:flex; align-items:center; justify-content:center; gap:8px;
    transition:transform .2s, filter .2s;
  }
  .fk-btn-primary:hover  { transform:translateY(-2px); filter:brightness(1.07); }
  .fk-btn-primary:active { transform:scale(.97); }
  .fk-btn-secondary {
    width:100%; padding:14px; border-radius:14px;
    background:var(--fk-surf2); border:1px solid var(--fk-bdr2);
    color:rgba(255,255,255,.65); font-size:14px; font-weight:600;
    cursor:pointer; transition:all .2s; font-family:var(--fk-fb);
    display:flex; align-items:center; justify-content:center; gap:6px;
  }
  .fk-btn-secondary:hover { background:rgba(255,255,255,.1); color:var(--fk-white); }
  .fk-btn-ghost {
    width:100%; padding:12px; border-radius:14px;
    background:transparent; border:1px solid rgba(255,255,255,.07);
    color:rgba(255,255,255,.3); font-size:13px; font-weight:500;
    cursor:pointer; transition:all .2s; text-align:center; font-family:var(--fk-fb);
    display:flex; align-items:center; justify-content:center; gap:6px;
  }
  .fk-btn-ghost:hover { border-color:rgba(255,255,255,.16); color:rgba(255,255,255,.6); }
`;


// ─── MODE CONFIGS ─────────────────────────────────────────────────────────────
const DIGIT_RANGES: {
  id: DigitRange; label: string; range: string; emoji: string;
  color: string; light: string; bg: string; border: string; desc: string;
}[] = [
  {
    id: 'single', label: 'Single Digit', range: '0 – 9', emoji: '①',
    color: '#F59E0B', light: '#FCD34D', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
    desc: 'Ones rod only. Perfect for beginners learning bead values.',
  },
  {
    id: 'double', label: 'Double Digit', range: '10 – 99', emoji: '②',
    color: '#60A5FA', light: '#93C5FD', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)',
    desc: 'Tens and ones rods. Build speed reading two-digit place values.',
  },
  {
    id: 'triple', label: 'Triple Digit', range: '100 – 999', emoji: '③',
    color: '#A78BFA', light: '#C4B5FD', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)',
    desc: 'Hundreds, tens and ones. Advanced bead recognition challenge.',
  },
] as const;

// ─── HOW TO PLAY GUIDE ──────────────────────────────────────────────────────
const HOW_TO_PLAY_STEPS = [
  { n: '1', title: 'Choose Digit Range', body: 'Select Single (0–9), Double (10–99), Triple (100–999) or mix them all. Mixed mode draws from each range equally.' },
  { n: '2', title: 'Set Card Count', body: 'Pick 5–50 cards. 10 is a great warm-up; 25 is a standard workout; 50 is a full marathon session.' },
  { n: '3', title: 'Read the Abacus', body: 'Each bead above the bar counts as 5; each bead below counts as 1. Add them up per rod to form the number.' },
  { n: '4', title: 'Type Your Answer', body: 'Enter the number you see and press Check (or hit Enter). A green ring means correct — a red ring reveals the right answer.' },
  { n: '5', title: 'Navigate Freely', body: 'Press Next (or → arrow) at any time — even without checking. Wrong or skipped cards are tallied at the end so you can review.' },
  { n: 'F', title: 'Full Screen Mode', body: 'Press F on your keyboard (or tap the icon top-right) to enter distraction-free fullscreen. Press F or Esc to exit.' },
];

// ─── CONFIG SCREEN ────────────────────────────────────────────────────────────
function ConfigScreen({ onStart }: { onStart: (ranges: DigitRange[], count: number) => void }) {
  const [selectedRanges, setSelectedRanges] = useState<DigitRange[]>(['single']);
  const [count, setCount] = useState(10);
  const [showGuide, setShowGuide] = useState(false);

  function toggleRange(id: DigitRange) {
    setSelectedRanges(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== id);
      }
      return [...prev, id].sort((a, b) => {
        const order = { single: 0, double: 1, triple: 2 };
        return order[a] - order[b];
      });
    });
  }

  const activeCount = selectedRanges.length;
  const accentColor = activeCount === 1
    ? DIGIT_RANGES.find(r => r.id === selectedRanges[0])!.color
    : activeCount === 2 ? '#34D399' : '#F472B6';
  const accentLight = activeCount === 1
    ? DIGIT_RANGES.find(r => r.id === selectedRanges[0])!.light
    : activeCount === 2 ? '#6EE7B7' : '#F9A8D4';

  const rangeLabel = rangesToLabel(selectedRanges);

  return (
    <div className="fk-page">
      {/* Hero */}
      <div className="fk-config-hero">
        <div className="fk-config-hero-glow" />
        <div className="fk-config-grid" />
        <Link href="/tools/soroban" className="fk-back-top-btn">
          <ChevronLeft size={13} /> Soroban
        </Link>
        <button className="fk-how-btn" onClick={() => setShowGuide(true)}>
          <BookOpen size={13} /> How to Play
        </button>
        <div className="fk-config-hero-inner">
          <h1 className="fk-hero-title">Abacus Flashcards</h1>
          <p className="fk-hero-sub">Train your eyes to read beads at lightning speed</p>
        </div>
      </div>

      <div className="fk-config-body">
        {/* Digit range multi-select */}
        <div className="fk-section-label">SELECT DIGIT RANGE(S)</div>
        <div className="fk-modes-grid">
          {DIGIT_RANGES.map(m => {
            const active = selectedRanges.includes(m.id);
            return (
              <button
                key={m.id}
                className={`fk-mode-card${active ? ' fk-active' : ''}`}
                style={active ? { borderColor: m.border, background: m.bg, boxShadow: `0 8px 32px ${m.color}14` } : {}}
                onClick={() => toggleRange(m.id)}
              >
                <div className="fk-mode-emoji">{m.emoji}</div>
                <div className="fk-mode-label" style={active ? { color: m.color } : {}}>{m.label}</div>
                <div className="fk-mode-range" style={active ? { color: m.light } : {}}>{m.range}</div>
                {active && <div className="fk-mode-check" style={{ background: m.color }}><Check size={9} /></div>}
              </button>
            );
          })}
        </div>

        {/* Selection summary */}
        <div className="fk-selection-summary" style={{ borderColor: `${accentColor}33`, background: `${accentColor}0b`, marginBottom: 28 }}>
          <Layers size={16} style={{ color: accentColor, flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: accentLight, fontSize: 12.5 }}>
            {activeCount === 1
              ? DIGIT_RANGES.find(r => r.id === selectedRanges[0])!.desc
              : `Mixed: ${rangeLabel} — cards are drawn equally from all selected ranges.`}
          </span>
        </div>

        {/* Card count */}
        <div className="fk-section-label">NUMBER OF FLASHCARDS</div>
        <div className="fk-count-row">
          <span className="fk-count-num" style={{ color: accentColor }}>{count}</span>
          <span className="fk-count-unit">cards</span>
        </div>
        <input
          type="range" min={5} max={50} step={5} value={count}
          className="fk-range"
          style={{ '--rc': accentColor } as React.CSSProperties}
          onChange={e => setCount(Number(e.target.value))}
        />
        <div className="fk-range-ends">
          <span>5 · quick</span>
          <span>25 · standard</span>
          <span>50 · marathon</span>
        </div>
        <div className="fk-presets">
          {[5, 10, 15, 20, 25, 30, 40, 50].map(n => (
            <button
              key={n}
              className={`fk-preset${count === n ? ' fk-preset-on' : ''}`}
              style={count === n ? { borderColor: accentColor, color: accentColor, background: `${accentColor}12` } : {}}
              onClick={() => setCount(n)}
            >{n}</button>
          ))}
        </div>

        {/* Start button */}
        <button
          className="fk-start-btn"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentLight})` }}
          onClick={() => onStart(selectedRanges, count)}
        >
          <Layers size={15} />
          Start Practice
          <span className="fk-start-meta">{count} cards · {rangeLabel}</span>
        </button>
      </div>

      {/* How to Play guide modal */}
      {showGuide && (
        <div className="fk-guide-overlay" onClick={() => setShowGuide(false)}>
          <div className="fk-guide-modal" onClick={e => e.stopPropagation()}>
            <div className="fk-guide-header">
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fk-white)' }}>How to Play</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>Abacus Flashcards guide</div>
              </div>
              <button className="fk-guide-close" onClick={() => setShowGuide(false)}><X size={14} /></button>
            </div>
            <div className="fk-guide-body">
              {HOW_TO_PLAY_STEPS.map(s => (
                <div key={s.n} className="fk-guide-step">
                  <div className="fk-guide-num">{s.n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fk-white)', marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRACTICE SCREEN ─────────────────────────────────────────────────────────
function PracticeScreen({
  cards, currentIdx,
  onNext, onPrev, onCheck, onExit,
  onAnswerChange,
  celebKey,
  shaking,
  fullscreen,
  onToggleFullscreen,
}: {
  cards: CardData[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onCheck: () => void;
  onExit: () => void;
  onAnswerChange: (v: string) => void;
  celebKey: number;
  shaking: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const card = cards[currentIdx];
  const numDigits = card.number >= 100 ? 3 : card.number >= 10 ? 2 : 1;
  const rangeInfo = numDigits === 3
    ? { color: '#A78BFA', light: '#C4B5FD', short: 'TRIPLE' }
    : numDigits === 2
    ? { color: '#60A5FA', light: '#93C5FD', short: 'DOUBLE' }
    : { color: '#F59E0B', light: '#FCD34D', short: 'SINGLE' };

  const rods = useMemo(() => numberToRods(card.number), [card.number]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const correctCount = cards.filter(c => c.status === 'correct').length;
  const total = cards.length;
  const isLast = currentIdx === total - 1;

  useEffect(() => {
    if (card.status === 'unanswered') inputRef.current?.focus();
    wrapRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIdx, card.status]);

  const progressPct = ((currentIdx + 1) / total) * 100;

  return (
    <div ref={wrapRef} className={`fk-practice-wrap${fullscreen ? ' fk-fullscreen' : ''}`}>
      {/* Top bar */}
      <div className="fk-top-bar">
        <button className="fk-exit-btn" onClick={onExit}>
          <ChevronLeft size={15} /> Flashcards
        </button>
        <div className="fk-top-center">
          <span
            className="fk-mode-pill"
            style={{ color: rangeInfo.color, borderColor: `${rangeInfo.color}40`, background: `${rangeInfo.color}10` }}
          >
            {rangeInfo.short}
          </span>
          <span className="fk-counter">
            <strong>{currentIdx + 1}</strong> / {total}
          </span>
          <span className="fk-score-chip" style={{ color: '#4ade80' }}>
            ✓ {correctCount}
          </span>
        </div>
        <button className="fk-fs-btn" onClick={onToggleFullscreen} title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="fk-progress-bar" style={{ width: '100%' }}>
        <div
          className="fk-progress-fill"
          style={{ width: `${progressPct}%`, background: `linear-gradient(90deg,${rangeInfo.color},${rangeInfo.light})` }}
        />
      </div>

      {/* Card dots */}
      <div className="fk-dots-row">
        {cards.map((c, i) => (
          <div
            key={i}
            className="fk-dot"
            style={{
              background:
                c.status === 'correct' ? '#4ade80' :
                c.status === 'wrong'   ? '#f87171' :
                i === currentIdx       ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.12)',
              transform: i === currentIdx ? 'scale(1.5)' : 'scale(1)',
              boxShadow: i === currentIdx ? `0 0 8px ${rangeInfo.color}80` : undefined,
            }}
          />
        ))}
      </div>

      {/* Main card area — key forces re-animation on card change */}
      <div className={`fk-card-area${shaking ? ' fk-shake' : ''}`} key={currentIdx}>

        {/* LEFT / TOP column: Abacus only */}
        <div className="fk-abacus-col">
          <div className="fk-abacus-wrap">
            <AbacusDisplay
              rods={rods}
              glowColor={card.status === 'correct' ? '#4ade80' : card.status === 'wrong' ? '#f87171' : undefined}
            />
            {celebKey > 0 && card.status === 'correct' && <SuccessParticles key={celebKey} />}
          </div>
        </div>

        {/* RIGHT / BOTTOM column: all interactive controls */}
        <div className="fk-controls-col">

          {/* Status strip */}
          {card.status === 'correct' && (
            <div className="fk-status-strip fk-status-correct">
              <Check size={14} /> Correct!
            </div>
          )}
          {card.status === 'wrong' && (
            <div className="fk-status-strip fk-status-wrong">
              <X size={14} /> Wrong — see answer below
            </div>
          )}

          {/* Prompt */}
          <div className="fk-prompt">What number is on the abacus?</div>

          {/* Input (hidden once answered) */}
          {card.status === 'unanswered' && (
            <div className="fk-input-wrap">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                placeholder="Your answer…"
                value={card.userAnswer}
                onChange={e => onAnswerChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && card.userAnswer.trim()) onCheck(); }}
                className="fk-input"
              />
              <button
                className="fk-check-btn"
                style={{ background: card.userAnswer.trim() ? rangeInfo.color : 'rgba(255,255,255,.12)', opacity: card.userAnswer.trim() ? 1 : 0.5 }}
                onClick={onCheck}
                disabled={!card.userAnswer.trim()}
              >
                <Check size={18} />
              </button>
            </div>
          )}

          {/* Answer reveal — correct */}
          {card.status === 'correct' && (
            <div className="fk-answer-reveal" style={{ borderColor: 'rgba(16,185,129,.35)', background: 'rgba(16,185,129,.06)' }}>
              <span className="fk-answer-lbl">ANSWER</span>
              <span className="fk-answer-num" style={{ color: '#4ade80' }}>{card.number}</span>
              {card.number >= 10 && (
                <span className="fk-answer-breakdown">
                  {card.number >= 100 && <span><span style={{ color: '#A78BFA' }}>{Math.floor(card.number / 100)}</span><span className="fk-bd-sub"> h</span></span>}
                  <span><span style={{ color: '#60A5FA' }}>{Math.floor(card.number / 10) % 10}</span><span className="fk-bd-sub"> t</span></span>
                  <span><span style={{ color: '#F59E0B' }}>{card.number % 10}</span><span className="fk-bd-sub"> o</span></span>
                </span>
              )}
            </div>
          )}

          {/* Answer reveal — wrong */}
          {card.status === 'wrong' && (
            <div className="fk-answer-reveal" style={{ borderColor: 'rgba(239,68,68,.35)', background: 'rgba(239,68,68,.06)' }}>
              <span className="fk-answer-lbl">CORRECT ANSWER</span>
              <span className="fk-answer-num" style={{ color: '#f87171' }}>{card.number}</span>
              {card.number >= 10 && (
                <span className="fk-answer-breakdown">
                  {card.number >= 100 && <span><span style={{ color: '#A78BFA' }}>{Math.floor(card.number / 100)}</span><span className="fk-bd-sub"> h</span></span>}
                  <span><span style={{ color: '#60A5FA' }}>{Math.floor(card.number / 10) % 10}</span><span className="fk-bd-sub"> t</span></span>
                  <span><span style={{ color: '#F59E0B' }}>{card.number % 10}</span><span className="fk-bd-sub"> o</span></span>
                </span>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="fk-nav-row">
            <button className="fk-nav-prev" disabled={currentIdx === 0} onClick={onPrev}>
              <ChevronLeft size={20} />
            </button>
            <button
              className="fk-nav-next"
              style={{ background: isLast ? 'linear-gradient(135deg,#10B981,#34D399)' : `linear-gradient(135deg,${rangeInfo.color},${rangeInfo.light})` }}
              onClick={onNext}
            >
              {isLast ? <><Trophy size={14} /> Finish</> : <>Next <ChevronRight size={14} /></>}
            </button>
          </div>

          <div className="fk-kbd-hint">Enter to check · ← → arrows · F for fullscreen</div>

        </div>{/* /fk-controls-col */}
      </div>
    </div>
  );
}

// ─── COMPLETE SCREEN ──────────────────────────────────────────────────────────
function CompleteScreen({
  cards, ranges, onReplay, onNewSettings,
}: {
  cards: CardData[];
  ranges: DigitRange[];
  onReplay: () => void;
  onNewSettings: () => void;
}) {
  const correct = cards.filter(c => c.status === 'correct').length;
  const wrong   = cards.filter(c => c.status === 'wrong').length;
  const skipped = cards.filter(c => c.status === 'unanswered').length;
  const total   = cards.length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const perfect  = correct === total;

  const accentColor = ranges.length === 1
    ? (ranges[0] === 'triple' ? '#A78BFA' : ranges[0] === 'double' ? '#60A5FA' : '#F59E0B')
    : '#34D399';
  const accentLight = ranges.length === 1
    ? (ranges[0] === 'triple' ? '#C4B5FD' : ranges[0] === 'double' ? '#93C5FD' : '#FCD34D')
    : '#6EE7B7';

  const gradeText = perfect ? 'Perfect Score!' : scorePct >= 80 ? 'Excellent!' : scorePct >= 60 ? 'Good Job!' : scorePct >= 40 ? 'Keep Going!' : 'Practice More!';
  const gradeNote = perfect ? 'Every bead read correctly' : scorePct >= 80 ? 'You\'re reading fast' : scorePct >= 60 ? 'Solid progress' : 'Keep training daily';

  return (
    <div className="fk-complete-wrap">
      <div className="fk-complete-glow" style={{ background: `radial-gradient(ellipse, ${accentColor}1a 0%, transparent 70%)` }} />

      <div className="fk-complete-card">
        {/* Icon */}
        <div
          className="fk-complete-icon-wrap"
          style={{ background: `${accentColor}12`, borderColor: `${accentColor}30` }}
        >
          <Trophy size={32} style={{ color: accentColor }} />
        </div>

        <div className="fk-complete-title">{gradeText}</div>
        <div className="fk-complete-grade">{gradeNote}</div>

        <div className="fk-complete-score" style={{ color: accentColor }}>{correct}<span style={{ fontSize: 28, opacity: .5 }}> / {total}</span></div>
        <div className="fk-complete-pct">{scorePct}% accuracy</div>

        {/* Stats */}
        <div className="fk-stats-row">
          {[
            { label: 'Correct',  value: correct, color: '#4ade80' },
            { label: 'Wrong',    value: wrong,   color: '#f87171' },
            { label: 'Skipped',  value: skipped, color: 'rgba(255,255,255,.35)' },
          ].map(s => (
            <div key={s.label} className="fk-stat-box">
              <span className="fk-stat-val" style={{ color: s.color }}>{s.value}</span>
              <span className="fk-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Card-by-card breakdown */}
        <div className="fk-breakdown-title">CARD BREAKDOWN</div>
        <div className="fk-breakdown-grid">
          {cards.map((c, i) => (
            <div
              key={i}
              className="fk-bd-item"
              style={{
                borderColor: c.status === 'correct' ? '#4ade8035' : c.status === 'wrong' ? '#f8717130' : 'rgba(255,255,255,.07)',
                background:  c.status === 'correct' ? 'rgba(74,222,128,.06)' : c.status === 'wrong' ? 'rgba(248,113,113,.06)' : 'rgba(255,255,255,.02)',
              }}
            >
              <span className="fk-bd-num" style={{ color: c.status === 'correct' ? '#4ade80' : c.status === 'wrong' ? '#f87171' : 'rgba(255,255,255,.35)' }}>{c.number}</span>
              <span className="fk-bd-icon">{c.status === 'correct' ? '✓' : c.status === 'wrong' ? '✗' : '—'}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="fk-actions">
          <button
            className="fk-btn-primary"
            style={{ background: `linear-gradient(135deg,${accentColor},${accentLight})` }}
            onClick={onReplay}
          >
            <RotateCcw size={15} /> Play Again
          </button>
          <button className="fk-btn-secondary" onClick={onNewSettings}>
            <Layers size={14} /> Back to Flashcards
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AbacusFlashCards() {
  const [phase, setPhase] = useState<Phase>('config');
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [celebKey, setCelebKey] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [savedDeckNumbers, setSavedDeckNumbers] = useState<number[]>([]);
  const [savedRanges, setSavedRanges] = useState<DigitRange[]>(['single']);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playCard, playCorrect, playWrong, playNav, playComplete } = useSounds();

  const handleStart = useCallback((ranges: DigitRange[], count: number) => {
    const deck = generateDeck(ranges, count);
    setSavedDeckNumbers(deck);
    setSavedRanges(ranges);
    const newCards: CardData[] = deck.map(n => ({ number: n, userAnswer: '', status: 'unanswered', attempts: 0 }));
    setCards(newCards);
    setCurrentIdx(0);
    setCelebKey(0);
    setPhase('practice');
    playCard();
  }, [playCard]);

  const handleAnswerChange = useCallback((val: string) => {
    setCards(prev => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], userAnswer: val };
      return next;
    });
  }, [currentIdx]);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const handleNext = useCallback(() => {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    setCurrentIdx(i => {
      const next = i + 1;
      if (next >= cardsRef.current.length) {
        exitFullscreen().catch(() => {});
        setFullscreen(false);
        setPhase('complete');
        playComplete();
        return i;
      }
      playNav();
      return next;
    });
  }, [playNav, playComplete]);

  const handlePrev = useCallback(() => {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    setCurrentIdx(i => {
      if (i <= 0) return i;
      playNav();
      return i - 1;
    });
  }, [playNav]);

  const handleCheck = useCallback(() => {
    const card = cardsRef.current[currentIdx];
    if (!card || !card.userAnswer.trim()) return;
    const parsed = parseInt(card.userAnswer.trim(), 10);
    if (isNaN(parsed)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    if (parsed === card.number) {
      setCards(prev => {
        const next = [...prev];
        next[currentIdx] = { ...next[currentIdx], status: 'correct' };
        return next;
      });
      playCorrect();
      setCelebKey(k => k + 1);
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null;
        setCurrentIdx(i => {
          const next = i + 1;
          if (next >= cardsRef.current.length) {
            exitFullscreen().catch(() => {});
            setFullscreen(false);
            setPhase('complete');
            playComplete();
            return i;
          }
          playNav();
          return next;
        });
      }, 900);
    } else {
      setCards(prev => {
        const next = [...prev];
        next[currentIdx] = { ...next[currentIdx], status: 'wrong' };
        return next;
      });
      playWrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 420);
    }
  }, [currentIdx, playCorrect, playWrong, playNav, playComplete]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen()) { await exitFullscreen(); setFullscreen(false); }
    else { await enterFullscreen(); setFullscreen(true); }
  }, []);

  // Keyboard: Arrow navigation + F for fullscreen + sync fullscreen state
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'practice') return;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!isInput && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); toggleFullscreen(); return; }
      if (isInput) return;
      if (e.code === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); handlePrev(); }
    };
    const onFSChange = () => setFullscreen(isFullscreen());
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFSChange);
    };
  }, [phase, handleNext, handlePrev, toggleFullscreen]);

  const handleReplay = useCallback(() => {
    const newCards: CardData[] = savedDeckNumbers.map(n => ({ number: n, userAnswer: '', status: 'unanswered', attempts: 0 }));
    setCards(newCards);
    setCurrentIdx(0);
    setCelebKey(0);
    setPhase('practice');
    playCard();
  }, [savedDeckNumbers, playCard]);

  const handleNewSettings = useCallback(() => {
    exitFullscreen().catch(() => {});
    setFullscreen(false);
    setPhase('config');
    setCards([]);
    setCurrentIdx(0);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#07070F', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{FLASHCARD_CSS}</style>
      {phase === 'config' && <ConfigScreen onStart={handleStart} />}
      {phase === 'practice' && cards.length > 0 && (
        <PracticeScreen
          cards={cards}
          currentIdx={currentIdx}
          onNext={handleNext}
          onPrev={handlePrev}
          onCheck={handleCheck}
          onExit={handleNewSettings}
          onAnswerChange={handleAnswerChange}
          celebKey={celebKey}
          shaking={shaking}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}
      {phase === 'complete' && (
        <CompleteScreen
          cards={cards}
          ranges={savedRanges}
          onReplay={handleReplay}
          onNewSettings={handleNewSettings}
        />
      )}
    </div>
  );
}

export function AbacusFlashCardsPage() {
  return (
    <>
      <style>{`body { background: #07070F !important; }`}</style>
      <AbacusFlashCards />
    </>
  );
}
