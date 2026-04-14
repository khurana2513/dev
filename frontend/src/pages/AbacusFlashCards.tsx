import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface RodState { upper: boolean; lower: number; }
type DigitRange = 'single' | 'double' | 'triple';
type FlashMode = 'single' | 'double' | 'triple' | 'mix'; // kept for compat
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
const ABW = PX * 2 + (ROD_COUNT - 1) * SP + BW; // 320px

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
  const segments: [number, number][] = [];
  if (ranges.includes('single')) segments.push([0, 9]);
  if (ranges.includes('double')) segments.push([10, 99]);
  if (ranges.includes('triple')) segments.push([100, 999]);
  if (segments.length === 0) segments.push([0, 9]);
  // Build combined pool
  let pool: number[] = [];
  segments.forEach(([lo, hi]) => {
    for (let i = lo; i <= hi; i++) pool.push(i);
  });
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

// Legacy helper — converts ranges[] back to a FlashMode label for display
function rangesToLabel(ranges: DigitRange[]): string {
  if (ranges.length === 3) return 'All Digits (0–999)';
  if (ranges.length === 1) {
    if (ranges[0] === 'single') return 'Single Digit';
    if (ranges[0] === 'double') return 'Double Digit';
    return 'Triple Digit';
  }
  return ranges.map(r => r === 'single' ? 'Single' : r === 'double' ? 'Double' : 'Triple').join(' + ');
}
function rangesToFlashMode(ranges: DigitRange[]): FlashMode {
  if (ranges.length === 1) return ranges[0];
  return 'mix';
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

  const playReveal = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(650, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.18);
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

  return { playCard, playCorrect, playWrong, playReveal, playNav, playComplete };
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
function AbacusDisplay({ rods, glowColor, fullscreen }: { rods: RodState[]; glowColor?: string; fullscreen?: boolean }) {
  const animY = useBeadSprings(rods);
  const scale = fullscreen ? 1.65 : 1;
  const w = ABW;
  const shadowGlow = glowColor ? `0 0 60px ${glowColor}40, 0 24px 80px rgba(0,0,0,0.88)` : '0 24px 80px rgba(0,0,0,0.88), 0 8px 24px rgba(0,0,0,0.55)';

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center top', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
    <div style={{
      position: 'relative',
      padding: 2,
      borderRadius: 13,
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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.fc-page{min-height:100vh;background:linear-gradient(180deg,#0A091A 0%,#07070F 100%);font-family:'DM Sans','Segoe UI',sans-serif;color:#fff;overflow-x:hidden}

/* ── Config Screen ─────────────────────────────── */
.fc-config-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;background:linear-gradient(180deg,#0A091A 0%,#07070F 100%)}
.fc-config-back{position:fixed;top:18px;left:18px;display:flex;align-items:center;gap:6px;color:rgba(255,255,255,0.4);font-size:13px;font-weight:500;letter-spacing:.02em;text-decoration:none;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(8px);background:rgba(255,255,255,0.04);transition:all .2s}
.fc-config-back:hover{color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.07)}
.fc-config-header{text-align:center;margin-bottom:40px}
.fc-config-eyebrow{font-size:11px;font-weight:600;letter-spacing:.18em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-bottom:10px}
.fc-config-title{font-size:clamp(26px,5vw,38px);font-weight:700;letter-spacing:-.02em;color:#fff;line-height:1.1}
.fc-config-sub{font-size:14px;color:rgba(255,255,255,0.4);margin-top:8px;font-weight:400}
.fc-config-section-lbl{font-size:11px;font-weight:600;letter-spacing:.15em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-bottom:14px;text-align:center}
.fc-range-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:32px;max-width:580px;width:100%}
.fc-range-card{position:relative;border-radius:14px;border:1.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);padding:18px 16px 14px;cursor:pointer;transition:all .22s;display:flex;flex-direction:column;gap:6px}
.fc-range-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.18)}
.fc-range-card.active{border-color:var(--range-border,rgba(255,255,255,0.3));background:var(--range-bg,rgba(255,255,255,0.06));box-shadow:0 0 0 1px var(--range-border,rgba(255,255,255,0.3)),0 4px 24px rgba(0,0,0,0.3)}
.fc-range-check{position:absolute;top:12px;right:12px;width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.2);background:transparent;display:flex;align-items:center;justify-content:center;font-size:10px;transition:all .2s}
.fc-range-card.active .fc-range-check{border-color:var(--range-color,#fff);background:var(--range-color,#fff);color:#000}
.fc-range-emoji{font-size:22px;margin-bottom:2px}
.fc-range-label{font-size:13px;font-weight:600;color:#fff}
.fc-range-sub{font-size:11px;color:rgba(255,255,255,0.35)}
.fc-count-row{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:28px}
.fc-count-lbl{font-size:13px;color:rgba(255,255,255,0.5);font-weight:500}
.fc-count-select{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 14px;border-radius:9px;font-size:14px;font-weight:600;outline:none;cursor:pointer;transition:border .2s}
.fc-count-select:focus{border-color:rgba(255,255,255,0.3)}
.fc-config-start{width:100%;max-width:580px;padding:16px 0;border-radius:14px;border:none;font-size:15px;font-weight:700;letter-spacing:.02em;cursor:pointer;transition:all .22s;color:#000}
.fc-config-start:hover{transform:translateY(-1px);box-shadow:0 6px 32px rgba(0,0,0,0.5)}

/* ── Practice Screen ───────────────────────────── */
.fc-practice-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:0 0 80px;background:linear-gradient(180deg,#0A091A 0%,#07070F 100%);position:relative}
.fc-practice-wrap.fc-fullscreen{position:fixed;inset:0;z-index:9999;background:linear-gradient(180deg,#0A091A 0%,#07070F 100%);overflow-y:auto}
.fc-practice-header{width:100%;max-width:680px;padding:18px 20px 10px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:rgba(10,9,26,0.92);backdrop-filter:blur(12px);z-index:10}
.fc-header-left{display:flex;align-items:center;gap:14px}
.fc-exit-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:8px;padding:6px 11px;font-size:12px;cursor:pointer;transition:all .2s}
.fc-exit-btn:hover{background:rgba(255,255,255,0.09);color:rgba(255,255,255,0.8)}
.fc-progress-text{font-size:12px;color:rgba(255,255,255,0.35);font-weight:500}
.fc-progress-bar-outer{position:relative;width:100%;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-top:6px}
.fc-progress-bar-fill{height:100%;border-radius:2px;transition:width .4s ease}
.fc-header-right{display:flex;align-items:center;gap:8px}
.fc-fs-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.45);border-radius:8px;padding:6px 10px;font-size:14px;cursor:pointer;transition:all .2s;line-height:1}
.fc-fs-btn:hover{background:rgba(255,255,255,0.09);color:rgba(255,255,255,0.8)}
.fc-score-pill{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid rgba(74,222,128,0.25);background:rgba(74,222,128,0.07);color:#4ade80}
.fc-card-area{width:100%;max-width:680px;padding:24px 20px 16px;display:flex;flex-direction:column;align-items:center;gap:20px}
.fc-fullscreen .fc-card-area{max-width:720px;padding:28px 20px 20px}
.fc-card-number-display{font-size:clamp(52px,11vw,80px);font-weight:700;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums;transition:transform .15s}
.fc-fullscreen .fc-card-number-display{font-size:clamp(64px,12vw,96px)}
.fc-abacus-container{width:100%;display:flex;justify-content:center;position:relative;padding:12px 0}
.fc-abacus-fullscreen-wrap{display:flex;justify-content:center;align-items:center}
.fc-answer-wrap{width:100%;max-width:320px;display:flex;flex-direction:column;align-items:center;gap:10px}
.fc-fullscreen .fc-answer-wrap{max-width:360px}
.fc-answer-lbl{font-size:11px;font-weight:600;letter-spacing:.12em;color:rgba(255,255,255,0.3);text-transform:uppercase}
.fc-answer-row{width:100%;display:flex;align-items:center;gap:10px}
.fc-answer-input{flex:1;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);color:#fff;padding:14px 18px;border-radius:12px;font-size:22px;font-weight:700;text-align:center;outline:none;transition:border .2s;font-variant-numeric:tabular-nums}
.fc-fullscreen .fc-answer-input{height:64px;font-size:30px}
.fc-answer-input::placeholder{color:rgba(255,255,255,0.2)}
.fc-answer-input:focus{border-color:rgba(255,255,255,0.35)}
.fc-answer-input.correct{border-color:#4ade80;background:rgba(74,222,128,0.08)}
.fc-answer-input.wrong{border-color:#f87171;background:rgba(248,113,113,0.08)}
.fc-check-btn{padding:12px 20px;border-radius:12px;border:none;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .22s;color:#000}
.fc-check-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,0.4)}
.fc-check-btn:disabled{opacity:.4;transform:none;cursor:default}
.fc-feedback-area{height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600}
.fc-nav-row{display:flex;align-items:center;gap:16px;width:100%;max-width:320px;margin-top:4px}
.fc-nav-btn{flex:1;padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.fc-nav-btn:hover{background:rgba(255,255,255,0.09);color:#fff}
.fc-nav-btn:disabled{opacity:.25;cursor:default}
.fc-keyboard-hint{font-size:11px;color:rgba(255,255,255,0.2);text-align:center;margin-top:4px}
.fc-celeb-ring{position:absolute;inset:-18px;border-radius:50%;border:2px solid transparent;pointer-events:none}
.fc-celeb-ring.active{animation:fcCorrectFlash .6s ease-out forwards}
@keyframes fcCorrectFlash{0%{border-color:rgba(74,222,128,0.8);box-shadow:0 0 0 0 rgba(74,222,128,0.4)}100%{border-color:rgba(74,222,128,0);box-shadow:0 0 0 20px rgba(74,222,128,0)}}
@keyframes fc-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.fc-shake{animation:fc-shake .4s ease}

/* ── Complete Screen ───────────────────────────── */
.fc-complete-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;background:linear-gradient(180deg,#0A091A 0%,#07070F 100%);position:relative}
.fc-complete-hero-glow{position:fixed;top:0;left:0;right:0;height:360px;pointer-events:none;z-index:0}
.fc-complete-card{width:100%;max-width:480px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 28px;display:flex;flex-direction:column;align-items:center;gap:0;position:relative;z-index:1}
.fc-complete-banner-emoji{font-size:56px;margin-bottom:8px;line-height:1}
.fc-complete-title{font-size:24px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px;color:#fff;text-align:center}
.fc-complete-score{font-size:42px;font-weight:700;letter-spacing:-.03em;margin-bottom:20px;text-align:center}
.fc-complete-pct{font-size:20px;font-weight:500;color:rgba(255,255,255,0.5)}
.fc-stats-row{display:flex;gap:12px;width:100%;margin-bottom:22px}
.fc-stat-box{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:4px}
.fc-stat-val{font-size:26px;font-weight:700;letter-spacing:-.03em}
.fc-stat-lbl{font-size:11px;color:rgba(255,255,255,0.4);font-weight:500}
.fc-breakdown{width:100%;margin-bottom:22px}
.fc-breakdown-title{font-size:10px;font-weight:600;letter-spacing:.14em;color:rgba(255,255,255,0.25);text-transform:uppercase;margin-bottom:10px;text-align:center}
.fc-breakdown-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
.fc-breakdown-item{padding:8px 4px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;align-items:center;gap:3px}
.fc-bdr-n{font-size:14px;font-weight:700}
.fc-bdr-icon{font-size:11px;color:rgba(255,255,255,0.3)}
.fc-complete-actions{width:100%;display:flex;flex-direction:column;gap:10px}
.fc-complete-btn-primary{width:100%;padding:15px;border-radius:13px;border:none;font-size:15px;font-weight:700;cursor:pointer;transition:all .22s;color:#000}
.fc-complete-btn-primary:hover{transform:translateY(-1px);opacity:.92}
.fc-complete-btn-secondary{width:100%;padding:13px;border-radius:13px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.fc-complete-btn-secondary:hover{background:rgba(255,255,255,0.1);color:#fff}
.fc-complete-btn-ghost{width:100%;padding:11px;border-radius:13px;background:transparent;border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.35);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;text-align:center}
.fc-complete-btn-ghost:hover{border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.6)}
`;

// ─── MODE CONFIGS ─────────────────────────────────────────────────────────────
const DIGIT_RANGES: { id: DigitRange; label: string; range: string; emoji: string;
  color: string; light: string; bg: string; border: string; desc: string }[] = [
  { id: 'single', label: 'Single Digit', range: '0 – 9', emoji: '①',
    color: '#F59E0B', light: '#FCD34D', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
    desc: 'Ones rod only. Perfect for beginners learning bead values.' },
  { id: 'double', label: 'Double Digit', range: '10 – 99', emoji: '②',
    color: '#60A5FA', light: '#93C5FD', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)',
    desc: 'Tens and ones rods. Build speed reading two-digit place values.' },
  { id: 'triple', label: 'Triple Digit', range: '100 – 999', emoji: '③',
    color: '#A78BFA', light: '#C4B5FD', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)',
    desc: 'Hundreds, tens and ones. Advanced bead recognition challenge.' },
] as const;

// ─── CONFIG SCREEN ────────────────────────────────────────────────────────────
function ConfigScreen({ onStart }: { onStart: (ranges: DigitRange[], count: number) => void }) {
  const [selectedRanges, setSelectedRanges] = useState<DigitRange[]>(['single']);
  const [count, setCount] = useState(10);

  function toggleRange(id: DigitRange) {
    setSelectedRanges(prev => {
      if (prev.includes(id)) {
        // Don't allow deselecting all
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
    <div className="fc-config-wrap">
      {/* Hero */}
      <div className="fc-hero">
        <div className="fc-hero-glow" style={{ background: `radial-gradient(ellipse, ${accentColor}22 0%, transparent 70%)` }} />
        <div className="fc-hero-icon">🧮</div>
        <h1 className="fc-hero-title">Abacus Flashcards</h1>
        <p className="fc-hero-sub">Train your eyes to read beads at lightning speed</p>
      </div>

      <div className="fc-config-card">
        {/* Digit range multi-select */}
        <div className="fc-section-label">SELECT DIGIT RANGE(S)</div>
        <p className="fc-section-hint">Choose one or more — questions will mix the selected ranges</p>
        <div className="fc-modes-grid">
          {DIGIT_RANGES.map(m => {
            const active = selectedRanges.includes(m.id);
            return (
              <button
                key={m.id}
                className={`fc-mode-card${active ? ' fc-mode-active' : ''}`}
                style={active ? { borderColor: m.border, background: m.bg, boxShadow: `0 0 28px ${m.color}22` } : {}}
                onClick={() => toggleRange(m.id)}
              >
                <div className="fc-mode-emoji">{m.emoji}</div>
                <div className="fc-mode-label" style={active ? { color: m.color } : {}}>{m.label}</div>
                <div className="fc-mode-range" style={active ? { color: m.light } : {}}>{m.range}</div>
                {active && (
                  <div className="fc-mode-check" style={{ background: m.color }}>✓</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection summary */}
        <div className="fc-mode-desc" style={{ borderColor: `${accentColor}44`, background: `${accentColor}0d` }}>
          <span style={{ fontSize: 20 }}>
            {activeCount === 1 ? DIGIT_RANGES.find(r => r.id === selectedRanges[0])!.emoji : activeCount === 2 ? '🎯' : '🎲'}
          </span>
          <span style={{ color: accentLight }}>
            {activeCount === 1
              ? DIGIT_RANGES.find(r => r.id === selectedRanges[0])!.desc
              : `Mixed: ${rangeLabel} — questions will appear from all selected ranges.`}
          </span>
        </div>

        {/* Card count */}
        <div className="fc-section-label" style={{ marginTop: 24 }}>NUMBER OF FLASHCARDS</div>
        <div className="fc-count-row">
          <span className="fc-count-num" style={{ color: accentColor }}>{count}</span>
          <span className="fc-count-unit">cards</span>
        </div>
        <input
          type="range" min={5} max={50} step={5} value={count}
          className="fc-range"
          style={{ '--rc': accentColor } as React.CSSProperties}
          onChange={e => setCount(Number(e.target.value))}
        />
        <div className="fc-range-ends">
          <span>5 (quick)</span>
          <span>25 (standard)</span>
          <span>50 (marathon)</span>
        </div>
        <div className="fc-count-grid">
          {[5, 10, 15, 20, 25, 30, 40, 50].map(n => (
            <button
              key={n}
              className={`fc-preset-btn${count === n ? ' fc-preset-on' : ''}`}
              style={count === n ? { borderColor: accentColor, color: accentColor, background: `${accentColor}15` } : {}}
              onClick={() => setCount(n)}
            >{n}</button>
          ))}
        </div>

        {/* Start button */}
        <button
          className="fc-start-btn"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentLight})` }}
          onClick={() => onStart(selectedRanges, count)}
        >
          <span style={{ fontSize: 22 }}>▶</span>
          Start Practice
          <span className="fc-start-meta">{count} cards · {rangeLabel}</span>
        </button>

        {/* Back link */}
        <Link href="/tools/soroban">
          <div className="fc-back-link">← Back to Abacus Soroban</div>
        </Link>
      </div>
    </div>
  );
}

// ─── PRACTICE SCREEN ─────────────────────────────────────────────────────────
function PracticeScreen({
  cards, mode, currentIdx,
  onNext, onPrev, onCheck, onExit,
  onAnswerChange,
  celebKey,
  shaking,
  fullscreen,
  onToggleFullscreen,
}: {
  cards: CardData[];
  mode: FlashMode;
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

  // Derive accent color from the number's digit range
  const numDigits = card.number >= 100 ? 3 : card.number >= 10 ? 2 : 1;
  const rangeInfo = numDigits === 3
    ? { color: '#A78BFA', light: '#C4B5FD', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.07)', short: 'TRIPLE', emoji: '③' }
    : numDigits === 2
    ? { color: '#60A5FA', light: '#93C5FD', border: 'rgba(96,165,250,0.3)', bg: 'rgba(96,165,250,0.07)', short: 'DOUBLE', emoji: '②' }
    : { color: '#F59E0B', light: '#FCD34D', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.07)', short: 'SINGLE', emoji: '①' };

  const rods = useMemo(() => numberToRods(card.number), [card.number]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const correctCount = cards.filter(c => c.status === 'correct').length;
  const total = cards.length;

  // Focus input on card change
  useEffect(() => {
    if (card.status === 'unanswered' || card.status === 'wrong') {
      inputRef.current?.focus();
    }
    // Scroll to top
    wrapRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIdx, card.status]);

  const glowColor =
    card.status === 'correct' ? '#4ade80' :
    card.status === 'wrong' ? '#f87171' : undefined;

  const progressPct = ((currentIdx + 1) / total) * 100;

  return (
    <div ref={wrapRef} className={`fc-practice-wrap${fullscreen ? ' fc-fullscreen' : ''}`}>
      {/* Top bar */}
      <div className="fc-top-bar">
        <button className="fc-exit-btn" onClick={onExit}>
          ✕ Exit
        </button>
        <div className="fc-top-center">
          <span className="fc-mode-badge" style={{ color: rangeInfo.color, borderColor: rangeInfo.border, background: rangeInfo.bg }}>
            {rangeInfo.emoji} {rangeInfo.short}
          </span>
          <span className="fc-card-counter">
            <strong>{currentIdx + 1}</strong> / {total}
          </span>
          <span className="fc-score-badge">
            ✓ <strong style={{ color: '#4ade80' }}>{correctCount}</strong>
          </span>
        </div>
        <button className="fc-fs-btn" onClick={onToggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen ? '⊡' : '⊞'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="fc-progress-track">
        <div className="fc-progress-fill" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${rangeInfo.color}, ${rangeInfo.light})` }} />
      </div>

      {/* Card status dots */}
      <div className="fc-dots-row">
        {cards.map((c, i) => (
          <div
            key={i}
            className={`fc-dot${i === currentIdx ? ' fc-dot-current' : ''}`}
            style={{
              background:
                c.status === 'correct' ? '#4ade80' :
                c.status === 'wrong' ? '#f87171' :
                i === currentIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)',
              transform: i === currentIdx ? 'scale(1.5)' : 'scale(1)',
              boxShadow: i === currentIdx ? `0 0 8px ${rangeInfo.color}80` : undefined,
            }}
          />
        ))}
      </div>

      {/* Main flashcard area */}
      <div className={`fc-card-area${shaking ? ' fc-shake' : ''}`} key={currentIdx}>
        {/* Abacus */}
        <div className={`fc-abacus-wrap${fullscreen ? ' fc-abacus-fullscreen' : ''}`} style={{ position: 'relative' }}>
          <AbacusDisplay rods={rods} glowColor={glowColor} fullscreen={fullscreen} />
          {celebKey > 0 && card.status === 'correct' && <SuccessParticles key={celebKey} />}

          {/* Status overlay badge */}
          {card.status === 'correct' && (
            <div className="fc-status-badge fc-status-correct">✓ Correct!</div>
          )}
          {card.status === 'wrong' && card.attempts > 0 && (
            <div className="fc-status-badge fc-status-wrong">Try again</div>
          )}
        </div>

        {/* Prompt */}
        <div className="fc-prompt">
          What number is on the abacus?
        </div>

        {/* Answer area */}
        {card.status !== 'correct' && (
          <div className="fc-answer-row">
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              placeholder="Your answer"
              value={card.userAnswer}
              onChange={e => onAnswerChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && card.userAnswer.trim()) onCheck(); }}
              className={`fc-answer-input${card.status === 'wrong' ? ' fc-input-wrong' : ''}`}
            />
            {card.userAnswer.trim() && (
              <button className="fc-check-btn" style={{ background: rangeInfo.color }} onClick={onCheck}>
                ✓
              </button>
            )}
          </div>
        )}

        {/* Correct: show answer then auto-advance */}
        {card.status === 'correct' && (
          <div className="fc-answer-reveal" style={{ borderColor: '#4ade8066' }}>
            <span className="fc-answer-label">ANSWER</span>
            <span className="fc-answer-number" style={{ color: '#4ade80' }}>{card.number}</span>
            {card.number >= 10 && (
              <span className="fc-answer-breakdown">
                {card.number >= 100 && <span><span style={{ color: '#A78BFA' }}>{Math.floor(card.number / 100)}</span><span className="fc-bd-label"> h</span></span>}
                {card.number >= 10 && <span><span style={{ color: '#60A5FA' }}>{Math.floor(card.number / 10) % 10}</span><span className="fc-bd-label"> t</span></span>}
                <span><span style={{ color: '#F59E0B' }}>{card.number % 10}</span><span className="fc-bd-label"> o</span></span>
              </span>
            )}
          </div>
        )}

        {/* Wrong hint after 2+ tries */}
        {card.status === 'wrong' && card.attempts >= 2 && (
          <div className="fc-hint-box">
            💡 Heaven bead (×5) + count earth beads below the bar
          </div>
        )}

        {/* Nav buttons */}
        <div className="fc-nav-btns">
          <button
            className="fc-nav-btn"
            disabled={currentIdx === 0}
            onClick={onPrev}
            style={currentIdx === 0 ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
          >
            ←
          </button>
          {currentIdx < total - 1 ? (
            <button
              className="fc-nav-btn fc-nav-next"
              style={{ background: rangeInfo.color, color: '#07070F', flex: 3 }}
              onClick={onNext}
            >
              Next →
            </button>
          ) : (
            <button
              className="fc-nav-btn fc-nav-next fc-nav-finish"
              style={{ background: '#4ade80', color: '#07070F', flex: 3 }}
              onClick={onNext}
            >
              Finish 🏁
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="fc-keyboard-hint">Enter to check · ← → to navigate</div>
      </div>
    </div>
  );
}

// ─── COMPLETE SCREEN ──────────────────────────────────────────────────────────
function CompleteScreen({
  cards, ranges, onReplay, onNewSettings,
}: {
  cards: CardData[]; ranges: DigitRange[];
  onReplay: () => void; onNewSettings: () => void;
}) {
  const correct = cards.filter(c => c.status === 'correct').length;
  const wrong = cards.filter(c => c.status === 'wrong').length;
  const total = cards.length;
  const answered = correct + wrong;
  const scorePct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const perfect = correct === total && answered === total;

  const accentColor = ranges.length === 1
    ? (ranges[0] === 'triple' ? '#A78BFA' : ranges[0] === 'double' ? '#60A5FA' : '#F59E0B')
    : '#34D399';
  const accentLight = ranges.length === 1
    ? (ranges[0] === 'triple' ? '#C4B5FD' : ranges[0] === 'double' ? '#93C5FD' : '#FCD34D')
    : '#6EE7B7';

  const grade = perfect ? '🏆 Perfect!' : scorePct >= 80 ? '🌟 Excellent!' : scorePct >= 60 ? '👍 Good job!' : scorePct >= 40 ? '💪 Keep going!' : '📚 Practice more!';

  return (
    <div className="fc-complete-wrap">
      <div className="fc-complete-hero-glow" style={{ background: `radial-gradient(ellipse, ${accentColor}22 0%, transparent 70%)` }} />
      <div className="fc-complete-card">
        <div className="fc-complete-banner-emoji">{perfect ? '🏆' : '🎯'}</div>
        <div className="fc-complete-title">{grade}</div>
        {answered > 0 && (
          <div className="fc-complete-score" style={{ color: accentColor }}>
            {correct} / {answered}
            <span className="fc-complete-pct"> · {scorePct}%</span>
          </div>
        )}
        <div className="fc-stats-row">
          {[
            { label: 'Total', value: total, color: accentColor },
            { label: '✓ Correct', value: correct, color: '#4ade80' },
            { label: '✗ Wrong', value: wrong, color: '#f87171' },
          ].map(s => (
            <div key={s.label} className="fc-stat-box">
              <span className="fc-stat-val" style={{ color: s.color }}>{s.value}</span>
              <span className="fc-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="fc-breakdown">
          <div className="fc-breakdown-title">CARD BY CARD</div>
          <div className="fc-breakdown-grid">
            {cards.map((c, i) => (
              <div key={i} className="fc-breakdown-item" style={{
                borderColor: c.status === 'correct' ? '#4ade8040' : c.status === 'wrong' ? '#f8717140' : 'rgba(255,255,255,0.08)',
                background: c.status === 'correct' ? 'rgba(74,222,128,0.07)' : c.status === 'wrong' ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.02)',
              }}>
                <span className="fc-bdr-n" style={{ color: c.status === 'correct' ? '#4ade80' : c.status === 'wrong' ? '#f87171' : 'rgba(255,255,255,0.4)' }}>{c.number}</span>
                <span className="fc-bdr-icon">{c.status === 'correct' ? '✓' : c.status === 'wrong' ? '✗' : '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="fc-complete-actions">
          <button className="fc-complete-btn-primary" style={{ background: `linear-gradient(135deg,${accentColor},${accentLight})` }} onClick={onReplay}>
            🔄 Play Again
          </button>
          <button className="fc-complete-btn-secondary" onClick={onNewSettings}>
            ⚙ Change Settings
          </button>
          <Link href="/tools/soroban">
            <div className="fc-complete-btn-ghost">← Back to Soroban</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AbacusFlashCards() {
  const [phase, setPhase] = useState<Phase>('config');
  const [selectedRanges, setSelectedRanges] = useState<DigitRange[]>(['single']);
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
    setSelectedRanges(ranges);
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
        setPhase('complete');
        setFullscreen(false);
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
    if (isNaN(parsed)) { setShaking(true); setTimeout(() => setShaking(false), 500); return; }
    if (parsed === card.number) {
      setCards(prev => {
        const next = [...prev];
        next[currentIdx] = { ...next[currentIdx], status: 'correct' };
        return next;
      });
      playCorrect();
      setCelebKey(k => k + 1);
      // Auto-advance: green flash visible for 900ms then move on
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null;
        setCurrentIdx(i => {
          const next = i + 1;
          if (next >= cardsRef.current.length) {
            setPhase('complete');
            setFullscreen(false);
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
        next[currentIdx] = { ...next[currentIdx], status: 'wrong', userAnswer: '', attempts: next[currentIdx].attempts + 1 };
        return next;
      });
      playWrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, [currentIdx, playCorrect, playWrong, playNav, playComplete]);

  // Arrow key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== 'practice') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [phase, handleNext, handlePrev]);

  // Fullscreen API
  useEffect(() => {
    if (fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
  }, [fullscreen]);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleReplay = useCallback(() => {
    const newCards: CardData[] = savedDeckNumbers.map(n => ({ number: n, userAnswer: '', status: 'unanswered', attempts: 0 }));
    setCards(newCards);
    setCurrentIdx(0);
    setCelebKey(0);
    setPhase('practice');
    playCard();
  }, [savedDeckNumbers, playCard]);

  const handleNewSettings = useCallback(() => {
    setPhase('config');
    setCards([]);
    setCurrentIdx(0);
    setFullscreen(false);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#07070F', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{FLASHCARD_CSS}</style>
      {phase === 'config' && <ConfigScreen onStart={handleStart} />}
      {phase === 'practice' && cards.length > 0 && (
        <PracticeScreen
          cards={cards} mode={rangesToFlashMode(selectedRanges)} currentIdx={currentIdx}
          onNext={handleNext} onPrev={handlePrev}
          onCheck={handleCheck}
          onExit={handleNewSettings}
          onAnswerChange={handleAnswerChange}
          celebKey={celebKey}
          shaking={shaking}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen(f => !f)}
        />
      )}
      {phase === 'complete' && (
        <CompleteScreen
          cards={cards} ranges={savedRanges}
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

