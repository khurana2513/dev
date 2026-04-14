import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NUMBER NINJA — A reflex-action math game where numbers fly and kids slash ║
// ║  Game Modes: Slash Rush · True/False · Abacus Ninja · Chain Cutter ·       ║
// ║              Memory Slash · Endless Dojo                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tier = 1 | 2 | 3 | 4;
type GameMode = 'slash' | 'truefalse' | 'abacus' | 'chain' | 'memory' | 'endless';
type Phase = 'menu' | 'tierSelect' | 'modeSelect' | 'countdown' | 'playing' | 'results';
type BubbleState = 'floating' | 'correct' | 'wrong' | 'expired';

interface GameQuestion {
  id: number;
  text: string;
  answer: number;
  displayAnswer: string;
  options: number[];
  displayOptions: string[];
  category: string;
  difficulty: number; // 1-4
}

interface ChainQuestion {
  id: number;
  numbers: number[];
  operators: string[];
  answer: number;
  difficulty: number;
}

interface AbacusQuestion {
  id: number;
  number: number;
  mode: 'read' | 'match'; // read: beads shown, pick number; match: number shown, pick beads
  options: number[];
  difficulty: number;
}

interface TrueFalseQuestion {
  id: number;
  equation: string;
  shownAnswer: number;
  correctAnswer: number;
  isTrue: boolean;
  category: string;
  difficulty: number;
}

interface Bubble {
  id: number;
  value: number;
  displayValue: string;
  isCorrect: boolean;
  x: number;
  y: number;
  targetY: number;
  speed: number;
  state: BubbleState;
  angle: number;
  scale: number;
  opacity: number;
}

interface GameResult {
  correct: number;
  wrong: number;
  total: number;
  maxCombo: number;
  accuracy: number;
  timeElapsed: number;
  score: number;
  tier: Tier;
  mode: GameMode;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const GAME_DURATION = 60; // seconds
const COUNTDOWN_SECS = 3;
const COMBO_THRESHOLD_2X = 3;
const COMBO_THRESHOLD_3X = 5;
const COMBO_THRESHOLD_5X = 10;
const BUBBLE_COUNT = 4;
const MEMORY_VISIBLE_MS = 2500;
const CHAIN_SHOW_MS = 800; // ms per row reveal in chain mode

// ─── ABACUS CONSTANTS (exact copy from AbacusFlashCards) ─────────────────────

const ROD_COUNT = 4;
const TOP_H = 32, UPPER_H = 68, DIV_H = 16, LOWER_H = 128, BOT_H = 32;
const BEAD_H = 24, BEAD_RX = 12;
const DIV_Y = TOP_H + UPPER_H;
const TOTAL_H = TOP_H + UPPER_H + DIV_H + LOWER_H + BOT_H;
const HB_REST = TOP_H + 5, HB_ACT = DIV_Y - BEAD_H - 3;
const EB_ACT_Y0 = DIV_Y + DIV_H + 3;
const EB_RST_Y3 = DIV_Y + DIV_H + LOWER_H - BEAD_H - 4;
const BW = 42, SP = BW + 16, PX = 52;
const ABW = PX * 2 + (ROD_COUNT - 1) * SP + BW;

// ─── TIER CONFIGURATION ──────────────────────────────────────────────────────

const TIER_CONFIG: Record<Tier, {
  label: string; subtitle: string; emoji: string; ageRange: string;
  color: string; glow: string; bg: string; border: string;
  bubbleSpeed: number; answerTime: number; lives: number;
  memoryVisible: number;
}> = {
  1: {
    label: "Little Warrior", subtitle: "Beginner", emoji: "🥷",
    ageRange: "Ages 5–7", color: "#34D399", glow: "rgba(52,211,153,0.4)",
    bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.3)",
    bubbleSpeed: 0.3, answerTime: 5000, lives: 5, memoryVisible: 3500,
  },
  2: {
    label: "Steel Blade", subtitle: "Intermediate", emoji: "⚔️",
    ageRange: "Ages 8–9", color: "#60A5FA", glow: "rgba(96,165,250,0.4)",
    bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.3)",
    bubbleSpeed: 0.5, answerTime: 3500, lives: 3, memoryVisible: 2500,
  },
  3: {
    label: "Shadow Blade", subtitle: "Advanced", emoji: "🗡️",
    ageRange: "Ages 10–12", color: "#A78BFA", glow: "rgba(167,139,250,0.4)",
    bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.3)",
    bubbleSpeed: 0.7, answerTime: 2500, lives: 2, memoryVisible: 2000,
  },
  4: {
    label: "Phantom Ninja", subtitle: "Expert", emoji: "👹",
    ageRange: "Ages 12+", color: "#F472B6", glow: "rgba(244,114,182,0.4)",
    bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.3)",
    bubbleSpeed: 0.9, answerTime: 1800, lives: 0, memoryVisible: 1500,
  },
};

const MODE_CONFIG: Record<GameMode, {
  label: string; emoji: string; description: string;
  color: string; glow: string; bg: string; border: string;
}> = {
  slash: {
    label: "Slash Rush", emoji: "⚡", description: "Slash the correct answer before bubbles escape!",
    color: "#F59E0B", glow: "rgba(245,158,11,0.4)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)",
  },
  truefalse: {
    label: "True / False", emoji: "⚖️", description: "Is the equation correct? React fast!",
    color: "#10B981", glow: "rgba(16,185,129,0.4)", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.3)",
  },
  abacus: {
    label: "Abacus Ninja", emoji: "🧮", description: "Read the beads — slash the matching number!",
    color: "#8B5CF6", glow: "rgba(139,92,246,0.4)", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.3)",
  },
  chain: {
    label: "Chain Cutter", emoji: "⛓️", description: "Track the running total, then cut the right chain!",
    color: "#EF4444", glow: "rgba(239,68,68,0.4)", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)",
  },
  memory: {
    label: "Memory Slash", emoji: "🧠", description: "Memorize the question — then answer from memory!",
    color: "#06B6D4", glow: "rgba(6,182,212,0.4)", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.3)",
  },
  endless: {
    label: "Endless Dojo", emoji: "♾️", description: "No time limit. How far can your streak go?",
    color: "#F97316", glow: "rgba(249,115,22,0.4)", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)",
  },
};

// ─── ABACUS HELPERS ──────────────────────────────────────────────────────────

interface RodState { upper: boolean; lower: number; }
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

// ─── SPRING ANIMATION HOOK ──────────────────────────────────────────────────

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

// ─── SOUND ENGINE ────────────────────────────────────────────────────────────

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

  const playSlash = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      // Sharp metallic slash — white noise burst + high frequency sweep
      const bufferSize = c.sampleRate * 0.08;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2000;
      const g = c.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(hp); hp.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + 0.12);
      // Accompanying high sine sweep
      const o = c.createOscillator(), g2 = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.06);
      g2.gain.setValueAtTime(0.12, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g2); g2.connect(c.destination); o.start(t); o.stop(t + 0.1);
    } catch { /* ignore */ }
  }, []);

  const playCorrectSlash = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      // Triumphant ascending arpeggio
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.07);
        g.gain.linearRampToValueAtTime(0.16, t + i * 0.07 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.2);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.25);
      });
    } catch { /* ignore */ }
  }, []);

  const playWrongSlash = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      // Descending dissonant buzz
      [220, 180, 150].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.06);
        g.gain.linearRampToValueAtTime(0.1, t + i * 0.06 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.18);
      });
    } catch { /* ignore */ }
  }, []);

  const playCombo = useCallback((level: number) => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const base = 400 + level * 100;
      [0, 200, 400, 600].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = base + f;
        g.gain.setValueAtTime(0, t + i * 0.05);
        g.gain.linearRampToValueAtTime(0.14, t + i * 0.05 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.22);
      });
    } catch { /* ignore */ }
  }, []);

  const playCountdown = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.35);
    } catch { /* ignore */ }
  }, []);

  const playGo = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      [523, 784, 1047, 1568].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.06);
        g.gain.linearRampToValueAtTime(0.18, t + i * 0.06 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.3);
      });
    } catch { /* ignore */ }
  }, []);

  const playTick = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 600;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.05);
    } catch { /* ignore */ }
  }, []);

  const playGameOver = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      [523, 659, 784, 880, 1047, 1318, 1568].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.12);
        g.gain.linearRampToValueAtTime(0.15, t + i * 0.12 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.35);
      });
    } catch { /* ignore */ }
  }, []);

  const playLoseLife = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(400, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.3);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4);
    } catch { /* ignore */ }
  }, []);

  const playChainReveal = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.15);
    } catch { /* ignore */ }
  }, []);

  const playMemoryFlash = useCallback(() => {
    const c = gc(); if (!c) return;
    try {
      const t = c.currentTime;
      [660, 880].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.08);
        g.gain.linearRampToValueAtTime(0.1, t + i * 0.08 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.12);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.15);
      });
    } catch { /* ignore */ }
  }, []);

  return {
    playSlash, playCorrectSlash, playWrongSlash, playCombo,
    playCountdown, playGo, playTick, playGameOver, playLoseLife,
    playChainReveal, playMemoryFlash,
  };
}

// ─── MATH HELPERS ────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genNum(digits: number): number {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return randInt(min, max);
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

const NICE_PCTS = [5, 10, 12, 15, 20, 25, 30, 33, 40, 50, 60, 66, 70, 75, 80, 90];

// ─── DISTRACTOR GENERATOR ────────────────────────────────────────────────────

function generateDistractors(correct: number, count: number, tier: Tier): number[] {
  const distractors = new Set<number>();
  const maxAttempts = 200;
  let attempts = 0;

  while (distractors.size < count && attempts < maxAttempts) {
    attempts++;
    let d: number;
    if (tier <= 2) {
      // Easy: distractors far from correct
      const offset = randInt(3, Math.max(10, Math.ceil(Math.abs(correct) * 0.3)));
      d = correct + (Math.random() < 0.5 ? offset : -offset);
    } else if (tier === 3) {
      // Hard: close distractors
      const offset = randInt(1, Math.max(3, Math.ceil(Math.abs(correct) * 0.1)));
      d = correct + (Math.random() < 0.5 ? offset : -offset);
    } else {
      // Expert: digit-swap traps, off-by-one, near-misses
      const roll = Math.random();
      if (roll < 0.3 && correct >= 10) {
        // Digit swap
        const s = String(Math.abs(correct));
        if (s.length >= 2) {
          const i = randInt(0, s.length - 2);
          const arr = s.split('');
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          d = parseInt(arr.join(''), 10) * (correct < 0 ? -1 : 1);
        } else {
          d = correct + pick([-2, -1, 1, 2]);
        }
      } else if (roll < 0.6) {
        d = correct + pick([-2, -1, 1, 2]);
      } else {
        const offset = randInt(1, Math.max(5, Math.ceil(Math.abs(correct) * 0.05)));
        d = correct + (Math.random() < 0.5 ? offset : -offset);
      }
    }
    if (d !== correct && d >= 0 && !distractors.has(d)) {
      distractors.add(d);
    }
  }

  // Fill remaining with random if needed
  while (distractors.size < count) {
    const d = correct + randInt(1, 50) * (Math.random() < 0.5 ? 1 : -1);
    if (d !== correct && d >= 0 && !distractors.has(d)) distractors.add(d);
  }

  return Array.from(distractors);
}

// ─── QUESTION GENERATORS ─────────────────────────────────────────────────────

function generateSlashQuestion(tier: Tier, id: number): GameQuestion {
  const categories = getCategories(tier);
  const cat = pick(categories);

  let text = '';
  let answer = 0;
  let displayAnswer = '';
  let category = cat;
  let difficulty = tier;

  switch (cat) {
    case 'tables': {
      const a = randInt(1, tier >= 2 ? 9 : 5);
      const b = randInt(1, tier >= 2 ? 9 : 5);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
      break;
    }
    case 'mul_2x1': {
      const a = genNum(2), b = genNum(1);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
      break;
    }
    case 'mul_3x1': {
      const a = genNum(3), b = genNum(1);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
      break;
    }
    case 'mul_2x2': {
      const a = genNum(2), b = genNum(2);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
      break;
    }
    case 'mul_3x2': {
      const a = genNum(3), b = genNum(2);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
      break;
    }
    case 'mul_4x2': {
      const a = genNum(4), b = genNum(2);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
      break;
    }
    case 'div_2d1': {
      const divisor = genNum(1);
      const quotient = randInt(Math.ceil(10 / divisor), Math.floor(99 / divisor));
      const dividend = quotient * divisor;
      text = `${dividend} ÷ ${divisor}`;
      answer = quotient;
      displayAnswer = String(answer);
      break;
    }
    case 'div_3d1': {
      const divisor = genNum(1);
      const quotient = randInt(Math.ceil(100 / divisor), Math.floor(999 / divisor));
      const dividend = quotient * divisor;
      text = `${dividend} ÷ ${divisor}`;
      answer = quotient;
      displayAnswer = String(answer);
      break;
    }
    case 'div_3d2': {
      const divisor = genNum(2);
      const qMin = Math.ceil(100 / divisor);
      const qMax = Math.floor(999 / divisor);
      if (qMin > qMax) { text = '100 ÷ 10'; answer = 10; displayAnswer = '10'; break; }
      const quotient = randInt(qMin, qMax);
      const dividend = quotient * divisor;
      text = `${dividend} ÷ ${divisor}`;
      answer = quotient;
      displayAnswer = String(answer);
      break;
    }
    case 'div_4d2': {
      const divisor = genNum(2);
      const qMin = Math.ceil(1000 / divisor);
      const qMax = Math.floor(9999 / divisor);
      if (qMin > qMax) { text = '1000 ÷ 10'; answer = 100; displayAnswer = '100'; break; }
      const quotient = randInt(qMin, qMax);
      const dividend = quotient * divisor;
      text = `${dividend} ÷ ${divisor}`;
      answer = quotient;
      displayAnswer = String(answer);
      break;
    }
    case 'sqrt': {
      const maxDigits = tier === 3 ? 3 : tier === 4 ? 4 : 2;
      const digits = randInt(2, maxDigits);
      const rMin = Math.ceil(Math.sqrt(Math.pow(10, digits - 1)));
      const rMax = Math.floor(Math.sqrt(Math.pow(10, digits) - 1));
      const root = randInt(rMin, rMax);
      text = `√${root * root}`;
      answer = root;
      displayAnswer = String(answer);
      break;
    }
    case 'cbrt': {
      const digits = randInt(3, tier === 4 ? 5 : 4);
      const rMin = Math.ceil(Math.cbrt(Math.pow(10, digits - 1)));
      const rMax = Math.floor(Math.cbrt(Math.pow(10, digits) - 1));
      const root = randInt(rMin, rMax);
      text = `∛${root * root * root}`;
      answer = root;
      displayAnswer = String(answer);
      break;
    }
    case 'pct': {
      const digits = tier >= 4 ? randInt(3, 5) : tier >= 3 ? randInt(2, 4) : randInt(2, 3);
      const num = genNum(digits);
      const pct = pick(tier <= 2 ? [10, 25, 50] : NICE_PCTS);
      text = `${pct}% of ${num}`;
      answer = Math.round(num * pct / 100 * 100) / 100;
      displayAnswer = answer % 1 === 0 ? String(answer) : answer.toFixed(2);
      break;
    }
    case 'lcm_op': {
      const d1 = tier >= 4 ? randInt(1, 2) : 1;
      const d2 = tier >= 4 ? randInt(1, 2) : 1;
      let a = genNum(d1), b = genNum(d2);
      // Shared factor for interesting results
      if (Math.random() < 0.6) {
        const cf = pick([2, 3, 4, 5]);
        a = Math.max(cf, Math.round(a / cf) * cf);
        b = Math.max(cf, Math.round(b / cf) * cf);
      }
      if (a === b) b = b + 1;
      const ans = lcm(a, b);
      text = `LCM(${a}, ${b})`;
      answer = ans;
      displayAnswer = String(answer);
      break;
    }
    case 'gcd_op': {
      const d1 = tier >= 4 ? randInt(1, 2) : 1;
      const d2 = tier >= 4 ? randInt(1, 2) : 1;
      const cf = pick([2, 3, 4, 5, 6]);
      const a = cf * genNum(d1);
      const b = cf * genNum(d2);
      const ans = gcd(a, b);
      text = `GCD(${a}, ${b})`;
      answer = ans;
      displayAnswer = String(answer);
      break;
    }
    default: {
      // Default to simple tables
      const a = randInt(2, 9), b = randInt(2, 9);
      text = `${a} × ${b}`;
      answer = a * b;
      displayAnswer = String(answer);
    }
  }

  const distCount = BUBBLE_COUNT - 1;
  const distractors = generateDistractors(answer, distCount, tier);
  const options = shuffle([answer, ...distractors]);
  const displayOptions = options.map(o => o % 1 === 0 ? String(o) : o.toFixed(2));

  return { id, text, answer, displayAnswer, options, displayOptions, category, difficulty };
}

function getCategories(tier: Tier): string[] {
  switch (tier) {
    case 1: return ['tables'];
    case 2: return ['tables', 'mul_2x1', 'div_2d1'];
    case 3: return ['tables', 'mul_2x1', 'mul_3x1', 'mul_2x2', 'div_2d1', 'div_3d1', 'sqrt', 'pct'];
    case 4: return ['mul_3x1', 'mul_2x2', 'mul_3x2', 'mul_4x2', 'div_3d1', 'div_3d2', 'div_4d2', 'sqrt', 'cbrt', 'pct', 'lcm_op', 'gcd_op'];
  }
}

function generateTrueFalseQuestion(tier: Tier, id: number): TrueFalseQuestion {
  const qBase = generateSlashQuestion(tier, id);
  const isTrue = Math.random() < 0.5;
  let shownAnswer: number;
  if (isTrue) {
    shownAnswer = qBase.answer;
  } else {
    const distractors = generateDistractors(qBase.answer, 1, tier);
    shownAnswer = distractors[0];
  }
  return {
    id, equation: qBase.text, shownAnswer, correctAnswer: qBase.answer,
    isTrue, category: qBase.category, difficulty: qBase.difficulty,
  };
}

function generateChainQuestion(tier: Tier, id: number): ChainQuestion {
  const rowCount = tier === 1 ? randInt(3, 4)
    : tier === 2 ? randInt(4, 6)
    : tier === 3 ? randInt(5, 8)
    : randInt(7, 12);
  const maxDigit = tier === 1 ? 1 : tier === 2 ? 2 : tier === 3 ? 2 : 3;
  const numbers: number[] = [];
  const operators: string[] = [];
  let running = 0;

  for (let i = 0; i < rowCount; i++) {
    const num = genNum(maxDigit);
    if (i === 0) {
      numbers.push(num);
      running = num;
    } else {
      // Ensure running total doesn't go below 0 for young kids
      const canSubtract = tier >= 3 || running >= num;
      const op = canSubtract && Math.random() < 0.4 ? '-' : '+';
      operators.push(op);
      numbers.push(num);
      running = op === '+' ? running + num : running - num;
    }
  }

  return { id, numbers, operators, answer: running, difficulty: tier };
}

function generateAbacusQuestion(tier: Tier, id: number): AbacusQuestion {
  const maxVal = tier === 1 ? 9 : tier === 2 ? 99 : tier === 3 ? 999 : 9999;
  const minVal = tier === 1 ? 0 : tier === 2 ? 10 : tier === 3 ? 100 : 1000;
  const number = randInt(minVal, maxVal);
  const mode: 'read' | 'match' = Math.random() < 0.6 ? 'read' : 'match';
  const distractors = generateDistractors(number, BUBBLE_COUNT - 1, tier);
  const options = shuffle([number, ...distractors]);
  return { id, number, mode, options, difficulty: tier };
}

// ─── SVG ABACUS COMPONENTS ──────────────────────────────────────────────────

function NinjaSvgDefs() {
  return (
    <defs>
      <linearGradient id="nn-gRail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#222a3c" /><stop offset="100%" stopColor="#111620" />
      </linearGradient>
      <linearGradient id="nn-gRailHi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(140,170,220,0.11)" /><stop offset="60%" stopColor="rgba(140,170,220,0.02)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <linearGradient id="nn-gDivSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a3858" /><stop offset="48%" stopColor="#162238" /><stop offset="100%" stopColor="#080c18" />
      </linearGradient>
      <linearGradient id="nn-gDivTopEdge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="transparent" /><stop offset="6%" stopColor="rgba(140,180,255,0.55)" />
        <stop offset="50%" stopColor="rgba(180,210,255,0.75)" /><stop offset="94%" stopColor="rgba(140,180,255,0.55)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <linearGradient id="nn-gDivAmber" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="transparent" /><stop offset="4%" stopColor="rgba(232,152,10,0.55)" />
        <stop offset="50%" stopColor="rgba(255,190,40,0.90)" /><stop offset="96%" stopColor="rgba(232,152,10,0.55)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <radialGradient id="nn-gBg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#0c1020" /><stop offset="100%" stopColor="#070a14" />
      </radialGradient>
      <linearGradient id="nn-gRod" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0a0f1e" /><stop offset="50%" stopColor="#2e4058" /><stop offset="100%" stopColor="#0a0f1e" />
      </linearGradient>
      <linearGradient id="nn-gH0" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#d8e4f0" /><stop offset="30%" stopColor="#90a8c0" /><stop offset="68%" stopColor="#4a6070" /><stop offset="100%" stopColor="#1a2635" />
      </linearGradient>
      <linearGradient id="nn-gH1" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#fff0b0" /><stop offset="28%" stopColor="#f0a818" /><stop offset="65%" stopColor="#c86000" /><stop offset="100%" stopColor="#602800" />
      </linearGradient>
      <linearGradient id="nn-gE0" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#b0c4d8" /><stop offset="30%" stopColor="#6a8098" /><stop offset="68%" stopColor="#384858" /><stop offset="100%" stopColor="#141e28" />
      </linearGradient>
      <linearGradient id="nn-gE1" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#ffe090" /><stop offset="28%" stopColor="#d88810" /><stop offset="65%" stopColor="#a05000" /><stop offset="100%" stopColor="#4a2000" />
      </linearGradient>
      <linearGradient id="nn-gGloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.30)" /><stop offset="55%" stopColor="rgba(255,255,255,0.04)" /><stop offset="100%" stopColor="transparent" />
      </linearGradient>
      <filter id="nn-fDrop" x="-40%" y="-50%" width="180%" height="210%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.82)" />
      </filter>
      <filter id="nn-fGlowE" x="-60%" y="-80%" width="220%" height="260%">
        <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(220,140,0,0.58)" />
      </filter>
      <filter id="nn-fGlowH" x="-70%" y="-90%" width="240%" height="280%">
        <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="rgba(245,175,20,0.68)" />
      </filter>
    </defs>
  );
}

function NinjaAbacusDisplay({ number, compact }: { number: number; compact?: boolean }) {
  const rods = useMemo(() => numberToRods(number), [number]);
  const animY = useBeadSprings(rods);
  const w = ABW;
  const scale = compact ? 0.65 : 0.82;

  return (
    <div style={{
      transform: `scale(${scale})`, transformOrigin: 'center center',
      padding: 2, borderRadius: 13,
      background: 'linear-gradient(145deg,rgba(80,110,160,0.42) 0%,rgba(20,28,45,0.25) 45%,rgba(70,100,150,0.36) 100%)',
      boxShadow: '0 0 40px rgba(139,92,246,0.3), 0 16px 60px rgba(0,0,0,0.7)',
    }}>
      <div style={{
        background: 'linear-gradient(165deg,#0c1422,#08101a 35%,#060c14 60%,#08101a)',
        borderRadius: 11, padding: '14px 16px 18px', position: 'relative', overflow: 'hidden',
      }}>
        <svg width={w} height={TOTAL_H} viewBox={`0 0 ${w} ${TOTAL_H}`} style={{ display: 'block', overflow: 'visible' }}>
          <NinjaSvgDefs />
          <rect x={0} y={0} width={w} height={TOP_H} rx={5} fill="url(#nn-gRail)" />
          <rect x={0} y={0} width={w} height={TOP_H} rx={5} fill="url(#nn-gRailHi)" />
          <rect x={0} y={TOTAL_H - BOT_H} width={w} height={BOT_H} rx={5} fill="url(#nn-gRail)" />
          <rect x={0} y={TOP_H} width={w} height={TOTAL_H - TOP_H - BOT_H} fill="url(#nn-gBg)" />
          <rect x={0} y={DIV_Y} width={w} height={DIV_H} fill="url(#nn-gDivSteel)" />
          <rect x={0} y={DIV_Y} width={w} height={1.5} fill="url(#nn-gDivTopEdge)" />
          <rect x={8} y={DIV_Y + DIV_H / 2 - 0.75} width={w - 16} height={1.5} fill="url(#nn-gDivAmber)" rx={0.75} />
          {rods.map((rod, i) => {
            const cx = PX + i * SP, bxx = cx - BW / 2;
            const dc = dotColor(i);
            const hY = animY[bk(i, 0)] !== undefined ? animY[bk(i, 0)] : (rod.upper ? HB_ACT : HB_REST);
            const eYs = [0, 1, 2, 3].map(bi => animY[bk(i, bi + 1)] !== undefined ? animY[bk(i, bi + 1)] : tEY(bi, rod.lower));
            return (
              <g key={i}>
                <line x1={cx} y1={TOP_H + 2} x2={cx} y2={TOTAL_H - BOT_H - 2} stroke="url(#nn-gRod)" strokeWidth={2.8} />
                {dc && (() => {
                  const fill = dc === 'red' ? '#e85030' : '#3da8e8';
                  const glow = dc === 'red' ? 'rgba(232,80,48,0.7)' : 'rgba(61,168,232,0.7)';
                  return (
                    <circle cx={cx} cy={DIV_Y + DIV_H / 2} r={dc === 'red' ? 5 : 4}
                      fill={fill} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
                  );
                })()}
                {/* Heaven bead */}
                {(() => {
                  const isH = true, active = rod.upper;
                  const fill = active ? 'url(#nn-gH1)' : 'url(#nn-gH0)';
                  const filt = active ? 'url(#nn-fGlowH)' : 'url(#nn-fDrop)';
                  return (
                    <g filter={filt}>
                      <rect x={bxx} y={hY} width={BW} height={BEAD_H} rx={BEAD_RX} fill={fill} stroke={active ? 'rgba(255,175,0,0.26)' : 'rgba(22,36,60,0.9)'} strokeWidth={0.8} />
                      <rect x={bxx + 3} y={hY + 2} width={BW - 6} height={BEAD_H * 0.46} rx={BEAD_RX - 2} fill="url(#nn-gGloss)" />
                    </g>
                  );
                })()}
                {/* Earth beads */}
                {[0, 1, 2, 3].map(bi => {
                  const active = bi < rod.lower;
                  const fill = active ? 'url(#nn-gE1)' : 'url(#nn-gE0)';
                  const filt = active ? 'url(#nn-fGlowE)' : 'url(#nn-fDrop)';
                  return (
                    <g key={bi} filter={filt}>
                      <rect x={bxx} y={eYs[bi]} width={BW} height={BEAD_H} rx={BEAD_RX} fill={fill} stroke={active ? 'rgba(255,175,0,0.26)' : 'rgba(22,36,60,0.9)'} strokeWidth={0.8} />
                      <rect x={bxx + 3} y={eYs[bi] + 2} width={BW - 6} height={BEAD_H * 0.46} rx={BEAD_RX - 2} fill="url(#nn-gGloss)" />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── PARTICLES ───────────────────────────────────────────────────────────────

function SlashParticles({ color }: { color: string }) {
  const pts = useRef(Array.from({ length: 12 }, (_, i) => ({
    id: i, x: 20 + Math.random() * 60, delay: Math.random() * 0.3,
    sz: 10 + Math.random() * 14, dx: (Math.random() - 0.5) * 200, dy: -(50 + Math.random() * 100),
    e: ['✨', '⭐', '💥', '🔥', '⚡', '💫'][Math.floor(Math.random() * 6)],
  }))).current;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, overflow: 'hidden' }}>
      {pts.map(p => (
        <div key={p.id} className="nn-slash-particle" style={{
          position: 'absolute', left: `${p.x}%`, top: '50%', fontSize: p.sz,
          animationDelay: `${p.delay}s`,
          '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
        } as React.CSSProperties}>{p.e}</div>
      ))}
    </div>
  );
}

function ComboFlash({ combo, multiplier }: { combo: number; multiplier: number }) {
  if (multiplier <= 1) return null;
  return (
    <div className="nn-combo-flash" key={combo}>
      <span className="nn-combo-text">{multiplier}× COMBO!</span>
      <span className="nn-combo-streak">{combo} streak</span>
    </div>
  );
}

function CelebrationParticles() {
  const pts = useRef(Array.from({ length: 30 }, (_, i) => ({
    id: i, x: 5 + Math.random() * 90, delay: Math.random() * 1.5,
    sz: 14 + Math.random() * 18,
    e: ['🎉', '🏆', '⭐', '🥷', '✨', '🎊', '💫', '🌟', '🎈', '🔥'][Math.floor(Math.random() * 10)],
  }))).current;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, overflow: 'hidden' }}>
      {pts.map(p => (
        <div key={p.id} className="nn-celebration-particle" style={{
          position: 'absolute', left: `${p.x}%`, top: -40, fontSize: p.sz,
          animationDelay: `${p.delay}s`,
        }}>{p.e}</div>
      ))}
    </div>
  );
}

// ─── NINJA BACKGROUND ────────────────────────────────────────────────────────

function NinjaBackground({ tier }: { tier: Tier }) {
  const tc = TIER_CONFIG[tier];
  return (
    <div className="nn-bg-container">
      <div className="nn-bg-gradient" style={{
        background: `radial-gradient(ellipse at 50% 20%, ${tc.glow} 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 50%), #07070F`,
      }} />
      <div className="nn-bg-grid" />
      {/* Floating ninja stars */}
      <div className="nn-bg-stars">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="nn-bg-star" style={{
            left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 4}s`,
            opacity: 0.04 + Math.random() * 0.06, fontSize: 16 + Math.random() * 20,
          }}>✦</div>
        ))}
      </div>
    </div>
  );
}

// ─── GAME HUD ────────────────────────────────────────────────────────────────

function GameHUD({ timer, score, combo, multiplier, lives, maxLives, tier, mode }: {
  timer: number; score: number; combo: number; multiplier: number;
  lives: number; maxLives: number; tier: Tier; mode: GameMode;
}) {
  const tc = TIER_CONFIG[tier];
  const isEndless = mode === 'endless';
  const timerPct = isEndless ? 100 : (timer / GAME_DURATION) * 100;
  const timerColor = timer <= 10 ? '#EF4444' : timer <= 20 ? '#F59E0B' : tc.color;
  const isLow = timer <= 10 && !isEndless;

  return (
    <div className="nn-hud">
      <div className="nn-hud-inner">
        {/* Timer or Endless indicator */}
        <div className="nn-hud-timer">
          {isEndless ? (
            <div className="nn-hud-endless-badge">
              <span style={{ fontSize: 16 }}>♾️</span>
              <span className="nn-hud-timer-text" style={{ color: tc.color }}>ENDLESS</span>
            </div>
          ) : (
            <>
              <div className="nn-hud-timer-bar-bg">
                <div className="nn-hud-timer-bar" style={{
                  width: `${timerPct}%`, background: timerColor,
                  boxShadow: `0 0 12px ${timerColor}60`,
                }} />
              </div>
              <span className={`nn-hud-timer-text ${isLow ? 'nn-timer-pulse' : ''}`} style={{ color: timerColor }}>
                {Math.ceil(timer)}s
              </span>
            </>
          )}
        </div>

        {/* Score */}
        <div className="nn-hud-score">
          <span className="nn-hud-score-label">SCORE</span>
          <span className="nn-hud-score-value" style={{ color: tc.color }}>{score.toLocaleString()}</span>
        </div>

        {/* Combo */}
        <div className="nn-hud-combo">
          {multiplier > 1 && (
            <span className="nn-hud-multiplier" style={{ color: tc.color }}>{multiplier}×</span>
          )}
          <span className="nn-hud-combo-label">{combo > 0 ? `${combo} combo` : 'No combo'}</span>
        </div>

        {/* Lives */}
        {maxLives > 0 && (
          <div className="nn-hud-lives">
            {Array.from({ length: maxLives }).map((_, i) => (
              <span key={i} className={`nn-heart ${i < lives ? '' : 'nn-heart-lost'}`}>
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MENU SCREEN ─────────────────────────────────────────────────────────────

function MenuScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="nn-menu">
      <div className="nn-menu-hero">
        <div className="nn-menu-glow" />
        <div className="nn-menu-ninja-icon">🥷</div>
        <h1 className="nn-menu-title">
          <span className="nn-menu-title-number">Number</span>
          <span className="nn-menu-title-ninja">Ninja</span>
        </h1>
        <p className="nn-menu-subtitle">Slash through math problems at lightning speed</p>
        <div className="nn-menu-features">
          <div className="nn-menu-feature">⚡ 6 Game Modes</div>
          <div className="nn-menu-feature">🎮 4 Difficulty Tiers</div>
          <div className="nn-menu-feature">🧮 Abacus Challenges</div>
          <div className="nn-menu-feature">🧠 Memory Training</div>
        </div>
        <button className="nn-menu-play-btn" onClick={onStart}>
          <span className="nn-menu-play-icon">⚔️</span>
          <span>BEGIN TRAINING</span>
        </button>
        <Link href="/">
          <button className="nn-back-link">← Back to Home</button>
        </Link>
      </div>
    </div>
  );
}

// ─── TIER SELECT SCREEN ──────────────────────────────────────────────────────

function TierSelectScreen({ onSelect, onBack }: { onSelect: (tier: Tier) => void; onBack: () => void }) {
  return (
    <div className="nn-tier-select">
      <button className="nn-back-btn" onClick={onBack}>
        <span>←</span> Back
      </button>
      <div className="nn-section-header">
        <div className="nn-section-icon">🎯</div>
        <h2 className="nn-section-title">Choose Your Level</h2>
        <p className="nn-section-sub">Select the difficulty that matches your skill</p>
      </div>
      <div className="nn-tier-grid">
        {([1, 2, 3, 4] as Tier[]).map(t => {
          const tc = TIER_CONFIG[t];
          return (
            <button key={t} className="nn-tier-card" onClick={() => onSelect(t)} style={{
              '--tier-color': tc.color, '--tier-glow': tc.glow,
              '--tier-bg': tc.bg, '--tier-border': tc.border,
            } as React.CSSProperties}>
              <div className="nn-tier-emoji">{tc.emoji}</div>
              <div className="nn-tier-label" style={{ color: tc.color }}>{tc.label}</div>
              <div className="nn-tier-subtitle">{tc.subtitle}</div>
              <div className="nn-tier-age" style={{ color: tc.color }}>{tc.ageRange}</div>
              <div className="nn-tier-details">
                {tc.lives > 0 ? `${tc.lives} lives` : 'No lives — pure skill'}
                <br />
                {tc.answerTime / 1000}s per question
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODE SELECT SCREEN ──────────────────────────────────────────────────────

function ModeSelectScreen({ tier, onSelect, onBack }: { tier: Tier; onSelect: (mode: GameMode) => void; onBack: () => void }) {
  const tc = TIER_CONFIG[tier];
  const modes: GameMode[] = ['slash', 'truefalse', 'abacus', 'chain', 'memory', 'endless'];

  return (
    <div className="nn-mode-select">
      <button className="nn-back-btn" onClick={onBack}>
        <span>←</span> Back
      </button>
      <div className="nn-section-header">
        <div className="nn-section-icon">{tc.emoji}</div>
        <h2 className="nn-section-title" style={{ color: tc.color }}>{tc.label}</h2>
        <p className="nn-section-sub">Choose your battle mode</p>
      </div>
      <div className="nn-mode-grid">
        {modes.map(m => {
          const mc = MODE_CONFIG[m];
          return (
            <button key={m} className="nn-mode-card" onClick={() => onSelect(m)} style={{
              '--mode-color': mc.color, '--mode-glow': mc.glow,
              '--mode-bg': mc.bg, '--mode-border': mc.border,
            } as React.CSSProperties}>
              <div className="nn-mode-emoji">{mc.emoji}</div>
              <div className="nn-mode-label" style={{ color: mc.color }}>{mc.label}</div>
              <div className="nn-mode-desc">{mc.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── COUNTDOWN SCREEN ────────────────────────────────────────────────────────

function CountdownScreen({ tier, mode, onDone }: { tier: Tier; mode: GameMode; onDone: () => void }) {
  const [count, setCount] = useState(COUNTDOWN_SECS);
  const tc = TIER_CONFIG[tier];
  const mc = MODE_CONFIG[mode];
  const sounds = useSounds();

  useEffect(() => {
    if (count > 0) {
      sounds.playCountdown();
      const timer = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      sounds.playGo();
      const goTimer = setTimeout(onDone, 600);
      return () => clearTimeout(goTimer);
    }
  }, [count]); // eslint-disable-line

  return (
    <div className="nn-countdown">
      <NinjaBackground tier={tier} />
      <div className="nn-countdown-content">
        <div className="nn-countdown-mode">
          <span>{mc.emoji}</span> {mc.label}
        </div>
        <div className="nn-countdown-tier" style={{ color: tc.color }}>
          {tc.emoji} {tc.label}
        </div>
        <div className={`nn-countdown-number ${count === 0 ? 'nn-countdown-go' : ''}`}
          style={{ color: count === 0 ? tc.color : '#F0F2FF' }} key={count}>
          {count === 0 ? 'GO!' : count}
        </div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  GAME ENGINES — One for each mode                                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ─── SLASH RUSH ENGINE ───────────────────────────────────────────────────────

function SlashRushGame({ tier, onEnd }: { tier: Tier; onEnd: (result: GameResult) => void }) {
  const tc = TIER_CONFIG[tier];
  const sounds = useSounds();
  const [question, setQuestion] = useState<GameQuestion>(() => generateSlashQuestion(tier, 1));
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isCorrectAnim, setIsCorrectAnim] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [lives, setLives] = useState(tc.lives);
  const [queueNext, setQueueNext] = useState(false);
  const questionIdRef = useRef(1);
  const startTimeRef = useRef(Date.now());

  const multiplier = combo >= COMBO_THRESHOLD_5X ? 5 : combo >= COMBO_THRESHOLD_3X ? 3 : combo >= COMBO_THRESHOLD_2X ? 2 : 1;

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      setTimer(prev => {
        if (prev <= 0) {
          clearInterval(iv);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Game over check
  useEffect(() => {
    if (timer <= 0 || (tc.lives > 0 && lives <= 0)) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onEnd({
        correct, wrong, total: correct + wrong, maxCombo,
        accuracy: (correct + wrong) > 0 ? Math.round(correct / (correct + wrong) * 100) : 0,
        timeElapsed: elapsed, score, tier, mode: 'slash',
      });
    }
  }, [timer, lives]); // eslint-disable-line

  // Queue next question
  useEffect(() => {
    if (queueNext) {
      const t = setTimeout(() => {
        questionIdRef.current += 1;
        setQuestion(generateSlashQuestion(tier, questionIdRef.current));
        setAnswered(false);
        setSelectedIdx(null);
        setIsCorrectAnim(null);
        setQueueNext(false);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [queueNext, tier]);

  const handleSelect = useCallback((idx: number) => {
    if (answered || timer <= 0) return;
    setAnswered(true);
    setSelectedIdx(idx);
    const isRight = question.options[idx] === question.answer;
    setIsCorrectAnim(isRight);

    if (isRight) {
      sounds.playCorrectSlash();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrect(prev => prev + 1);
      const pts = 10 * multiplier * tier;
      setScore(prev => prev + pts);
      if (newCombo === COMBO_THRESHOLD_2X || newCombo === COMBO_THRESHOLD_3X || newCombo === COMBO_THRESHOLD_5X) {
        sounds.playCombo(newCombo >= COMBO_THRESHOLD_5X ? 3 : newCombo >= COMBO_THRESHOLD_3X ? 2 : 1);
      }
    } else {
      sounds.playWrongSlash();
      setCombo(0);
      setWrong(prev => prev + 1);
      if (tc.lives > 0) {
        setLives(prev => prev - 1);
        sounds.playLoseLife();
      }
    }
    setQueueNext(true);
  }, [answered, timer, question, combo, multiplier, tier, tc.lives, sounds]);

  return (
    <div className="nn-game-arena">
      <NinjaBackground tier={tier} />
      <GameHUD timer={timer} score={score} combo={combo} multiplier={multiplier}
        lives={lives} maxLives={tc.lives} tier={tier} mode="slash" />

      <div className="nn-arena-content">
        {/* Question display */}
        <div className="nn-question-display">
          <div className="nn-question-text" style={{ color: '#F0F2FF' }}>{question.text} = ?</div>
        </div>

        {/* Answer bubbles */}
        <div className="nn-bubbles-container">
          {question.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isRight = opt === question.answer;
            let bubbleClass = 'nn-bubble';
            if (answered) {
              if (isSelected && isRight) bubbleClass += ' nn-bubble-correct';
              else if (isSelected && !isRight) bubbleClass += ' nn-bubble-wrong';
              else if (isRight) bubbleClass += ' nn-bubble-reveal';
            }
            return (
              <button key={`${question.id}-${idx}`} className={bubbleClass}
                onClick={() => handleSelect(idx)} disabled={answered}
                style={{ '--bubble-delay': `${idx * 0.08}s`, '--tier-color': tc.color } as React.CSSProperties}>
                <span className="nn-bubble-value">{question.displayOptions[idx]}</span>
              </button>
            );
          })}
        </div>

        {/* Combo display */}
        <ComboFlash combo={combo} multiplier={multiplier} />

        {/* Correct/Wrong animation */}
        {isCorrectAnim !== null && (
          <div className={`nn-feedback ${isCorrectAnim ? 'nn-feedback-correct' : 'nn-feedback-wrong'}`}>
            {isCorrectAnim ? '✓ CORRECT' : `✗ ${question.displayAnswer}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRUE/FALSE ENGINE ───────────────────────────────────────────────────────

function TrueFalseGame({ tier, onEnd }: { tier: Tier; onEnd: (result: GameResult) => void }) {
  const tc = TIER_CONFIG[tier];
  const sounds = useSounds();
  const [question, setQuestion] = useState<TrueFalseQuestion>(() => generateTrueFalseQuestion(tier, 1));
  const [answered, setAnswered] = useState(false);
  const [isCorrectAnim, setIsCorrectAnim] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [lives, setLives] = useState(tc.lives);
  const [queueNext, setQueueNext] = useState(false);
  const questionIdRef = useRef(1);
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  const multiplier = combo >= COMBO_THRESHOLD_5X ? 5 : combo >= COMBO_THRESHOLD_3X ? 3 : combo >= COMBO_THRESHOLD_2X ? 2 : 1;

  useEffect(() => {
    const iv = setInterval(() => setTimer(prev => (prev <= 0 ? 0 : prev - 0.1)), 100);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (timer <= 0 || (tc.lives > 0 && lives <= 0)) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onEnd({
        correct, wrong, total: correct + wrong, maxCombo,
        accuracy: (correct + wrong) > 0 ? Math.round(correct / (correct + wrong) * 100) : 0,
        timeElapsed: elapsed, score, tier, mode: 'truefalse',
      });
    }
  }, [timer, lives]); // eslint-disable-line

  useEffect(() => {
    if (queueNext) {
      const t = setTimeout(() => {
        questionIdRef.current += 1;
        setQuestion(generateTrueFalseQuestion(tier, questionIdRef.current));
        setAnswered(false);
        setIsCorrectAnim(null);
        setQueueNext(false);
        questionStartRef.current = Date.now();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [queueNext, tier]);

  const handleAnswer = useCallback((userSaysTrue: boolean) => {
    if (answered || timer <= 0) return;
    setAnswered(true);
    const responseMs = Date.now() - questionStartRef.current;
    const isRight = userSaysTrue === question.isTrue;
    setIsCorrectAnim(isRight);

    if (isRight) {
      sounds.playCorrectSlash();
      const speedBonus = responseMs < 1000 ? 3 : responseMs < 2000 ? 2 : 1;
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 10 * multiplier * speedBonus * tier);
    } else {
      sounds.playWrongSlash();
      setCombo(0);
      setWrong(prev => prev + 1);
      if (tc.lives > 0) { setLives(prev => prev - 1); sounds.playLoseLife(); }
    }
    setQueueNext(true);
  }, [answered, timer, question, combo, multiplier, tier, tc.lives, sounds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') handleAnswer(true);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleAnswer(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAnswer]);

  return (
    <div className="nn-game-arena">
      <NinjaBackground tier={tier} />
      <GameHUD timer={timer} score={score} combo={combo} multiplier={multiplier}
        lives={lives} maxLives={tc.lives} tier={tier} mode="truefalse" />

      <div className="nn-arena-content">
        <div className="nn-tf-equation">
          <div className="nn-tf-text">{question.equation} = {question.shownAnswer}</div>
          <div className="nn-tf-prompt">Is this correct?</div>
        </div>

        <div className="nn-tf-buttons">
          <button className={`nn-tf-btn nn-tf-true ${answered && question.isTrue ? 'nn-tf-highlight' : ''} ${answered && !question.isTrue ? 'nn-tf-dim' : ''}`}
            onClick={() => handleAnswer(true)} disabled={answered}>
            <span className="nn-tf-icon">✓</span>
            <span>TRUE</span>
          </button>
          <button className={`nn-tf-btn nn-tf-false ${answered && !question.isTrue ? 'nn-tf-highlight' : ''} ${answered && question.isTrue ? 'nn-tf-dim' : ''}`}
            onClick={() => handleAnswer(false)} disabled={answered}>
            <span className="nn-tf-icon">✗</span>
            <span>FALSE</span>
          </button>
        </div>

        <ComboFlash combo={combo} multiplier={multiplier} />

        {isCorrectAnim !== null && (
          <div className={`nn-feedback ${isCorrectAnim ? 'nn-feedback-correct' : 'nn-feedback-wrong'}`}>
            {isCorrectAnim ? '✓ CORRECT' : `✗ Answer: ${question.correctAnswer}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ABACUS NINJA ENGINE ─────────────────────────────────────────────────────

function AbacusNinjaGame({ tier, onEnd }: { tier: Tier; onEnd: (result: GameResult) => void }) {
  const tc = TIER_CONFIG[tier];
  const sounds = useSounds();
  const [question, setQuestion] = useState<AbacusQuestion>(() => generateAbacusQuestion(tier, 1));
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isCorrectAnim, setIsCorrectAnim] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [lives, setLives] = useState(tc.lives);
  const [queueNext, setQueueNext] = useState(false);
  const questionIdRef = useRef(1);
  const startTimeRef = useRef(Date.now());

  const multiplier = combo >= COMBO_THRESHOLD_5X ? 5 : combo >= COMBO_THRESHOLD_3X ? 3 : combo >= COMBO_THRESHOLD_2X ? 2 : 1;

  useEffect(() => {
    const iv = setInterval(() => setTimer(prev => (prev <= 0 ? 0 : prev - 0.1)), 100);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (timer <= 0 || (tc.lives > 0 && lives <= 0)) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onEnd({
        correct, wrong, total: correct + wrong, maxCombo,
        accuracy: (correct + wrong) > 0 ? Math.round(correct / (correct + wrong) * 100) : 0,
        timeElapsed: elapsed, score, tier, mode: 'abacus',
      });
    }
  }, [timer, lives]); // eslint-disable-line

  useEffect(() => {
    if (queueNext) {
      const t = setTimeout(() => {
        questionIdRef.current += 1;
        setQuestion(generateAbacusQuestion(tier, questionIdRef.current));
        setAnswered(false);
        setSelectedIdx(null);
        setIsCorrectAnim(null);
        setQueueNext(false);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [queueNext, tier]);

  const handleSelect = useCallback((idx: number) => {
    if (answered || timer <= 0) return;
    setAnswered(true);
    setSelectedIdx(idx);
    const isRight = question.options[idx] === question.number;
    setIsCorrectAnim(isRight);

    if (isRight) {
      sounds.playCorrectSlash();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 15 * multiplier * tier);
    } else {
      sounds.playWrongSlash();
      setCombo(0);
      setWrong(prev => prev + 1);
      if (tc.lives > 0) { setLives(prev => prev - 1); sounds.playLoseLife(); }
    }
    setQueueNext(true);
  }, [answered, timer, question, combo, multiplier, tier, tc.lives, sounds]);

  return (
    <div className="nn-game-arena">
      <NinjaBackground tier={tier} />
      <GameHUD timer={timer} score={score} combo={combo} multiplier={multiplier}
        lives={lives} maxLives={tc.lives} tier={tier} mode="abacus" />

      <div className="nn-arena-content nn-abacus-arena">
        {question.mode === 'read' ? (
          <>
            <div className="nn-abacus-prompt">What number is shown?</div>
            <div className="nn-abacus-display">
              <NinjaAbacusDisplay number={question.number} />
            </div>
            <div className="nn-bubbles-container">
              {question.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isRight = opt === question.number;
                let cls = 'nn-bubble';
                if (answered) {
                  if (isSelected && isRight) cls += ' nn-bubble-correct';
                  else if (isSelected && !isRight) cls += ' nn-bubble-wrong';
                  else if (isRight) cls += ' nn-bubble-reveal';
                }
                return (
                  <button key={`${question.id}-${idx}`} className={cls}
                    onClick={() => handleSelect(idx)} disabled={answered}
                    style={{ '--bubble-delay': `${idx * 0.08}s`, '--tier-color': tc.color } as React.CSSProperties}>
                    <span className="nn-bubble-value">{opt}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="nn-abacus-prompt">
              Show <span style={{ color: tc.color, fontWeight: 800, fontSize: '1.5em' }}>{question.number}</span> on the abacus
            </div>
            <div className="nn-abacus-options-grid">
              {question.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isRight = opt === question.number;
                let cls = 'nn-abacus-option';
                if (answered) {
                  if (isSelected && isRight) cls += ' nn-abacus-option-correct';
                  else if (isSelected && !isRight) cls += ' nn-abacus-option-wrong';
                  else if (isRight) cls += ' nn-abacus-option-reveal';
                }
                return (
                  <button key={`${question.id}-${idx}`} className={cls}
                    onClick={() => handleSelect(idx)} disabled={answered}>
                    <NinjaAbacusDisplay number={opt} compact />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <ComboFlash combo={combo} multiplier={multiplier} />

        {isCorrectAnim !== null && (
          <div className={`nn-feedback ${isCorrectAnim ? 'nn-feedback-correct' : 'nn-feedback-wrong'}`}>
            {isCorrectAnim ? '✓ CORRECT' : `✗ Answer: ${question.number}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHAIN CUTTER ENGINE ─────────────────────────────────────────────────────

function ChainCutterGame({ tier, onEnd }: { tier: Tier; onEnd: (result: GameResult) => void }) {
  const tc = TIER_CONFIG[tier];
  const sounds = useSounds();
  const [chainQ, setChainQ] = useState<ChainQuestion>(() => generateChainQuestion(tier, 1));
  const [revealedRows, setRevealedRows] = useState(0);
  const [chainPhase, setChainPhase] = useState<'revealing' | 'answering'>('revealing');
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isCorrectAnim, setIsCorrectAnim] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [lives, setLives] = useState(tc.lives);
  const [queueNext, setQueueNext] = useState(false);
  const questionIdRef = useRef(1);
  const startTimeRef = useRef(Date.now());
  const [options, setOptions] = useState<number[]>([]);

  const multiplier = combo >= COMBO_THRESHOLD_5X ? 5 : combo >= COMBO_THRESHOLD_3X ? 3 : combo >= COMBO_THRESHOLD_2X ? 2 : 1;

  // Timer
  useEffect(() => {
    const iv = setInterval(() => setTimer(prev => (prev <= 0 ? 0 : prev - 0.1)), 100);
    return () => clearInterval(iv);
  }, []);

  // Chain row reveal animation
  useEffect(() => {
    if (chainPhase === 'revealing' && revealedRows < chainQ.numbers.length) {
      sounds.playChainReveal();
      const t = setTimeout(() => setRevealedRows(prev => prev + 1), CHAIN_SHOW_MS);
      return () => clearTimeout(t);
    } else if (chainPhase === 'revealing' && revealedRows >= chainQ.numbers.length) {
      const distractors = generateDistractors(chainQ.answer, BUBBLE_COUNT - 1, tier);
      setOptions(shuffle([chainQ.answer, ...distractors]));
      setChainPhase('answering');
    }
  }, [chainPhase, revealedRows, chainQ, tier, sounds]);

  // Game over
  useEffect(() => {
    if (timer <= 0 || (tc.lives > 0 && lives <= 0)) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onEnd({
        correct, wrong, total: correct + wrong, maxCombo,
        accuracy: (correct + wrong) > 0 ? Math.round(correct / (correct + wrong) * 100) : 0,
        timeElapsed: elapsed, score, tier, mode: 'chain',
      });
    }
  }, [timer, lives]); // eslint-disable-line

  // Queue next
  useEffect(() => {
    if (queueNext) {
      const t = setTimeout(() => {
        questionIdRef.current += 1;
        const newQ = generateChainQuestion(tier, questionIdRef.current);
        setChainQ(newQ);
        setRevealedRows(0);
        setChainPhase('revealing');
        setAnswered(false);
        setSelectedIdx(null);
        setIsCorrectAnim(null);
        setOptions([]);
        setQueueNext(false);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [queueNext, tier]);

  const handleSelect = useCallback((idx: number) => {
    if (answered || chainPhase !== 'answering' || timer <= 0) return;
    setAnswered(true);
    setSelectedIdx(idx);
    const isRight = options[idx] === chainQ.answer;
    setIsCorrectAnim(isRight);

    if (isRight) {
      sounds.playCorrectSlash();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 12 * multiplier * tier * chainQ.numbers.length);
    } else {
      sounds.playWrongSlash();
      setCombo(0);
      setWrong(prev => prev + 1);
      if (tc.lives > 0) { setLives(prev => prev - 1); sounds.playLoseLife(); }
    }
    setQueueNext(true);
  }, [answered, chainPhase, timer, options, chainQ, combo, multiplier, tier, tc.lives, sounds]);

  return (
    <div className="nn-game-arena">
      <NinjaBackground tier={tier} />
      <GameHUD timer={timer} score={score} combo={combo} multiplier={multiplier}
        lives={lives} maxLives={tc.lives} tier={tier} mode="chain" />

      <div className="nn-arena-content">
        {/* Chain display */}
        <div className="nn-chain-container">
          <div className="nn-chain-label">Track the total!</div>
          <div className="nn-chain-rows">
            {chainQ.numbers.map((num, i) => {
              const visible = i < revealedRows;
              const op = i === 0 ? '' : chainQ.operators[i - 1];
              return (
                <div key={i} className={`nn-chain-row ${visible ? 'nn-chain-row-visible' : ''}`}
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="nn-chain-op">{op}</span>
                  <span className="nn-chain-num">{num}</span>
                </div>
              );
            })}
            {chainPhase === 'answering' && (
              <div className="nn-chain-equals" style={{ color: tc.color }}>= ?</div>
            )}
          </div>
        </div>

        {/* Answer options */}
        {chainPhase === 'answering' && options.length > 0 && (
          <div className="nn-bubbles-container">
            {options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              const isRight = opt === chainQ.answer;
              let cls = 'nn-bubble';
              if (answered) {
                if (isSelected && isRight) cls += ' nn-bubble-correct';
                else if (isSelected && !isRight) cls += ' nn-bubble-wrong';
                else if (isRight) cls += ' nn-bubble-reveal';
              }
              return (
                <button key={`chain-${chainQ.id}-${idx}`} className={cls}
                  onClick={() => handleSelect(idx)} disabled={answered}
                  style={{ '--bubble-delay': `${idx * 0.08}s`, '--tier-color': tc.color } as React.CSSProperties}>
                  <span className="nn-bubble-value">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        <ComboFlash combo={combo} multiplier={multiplier} />

        {isCorrectAnim !== null && (
          <div className={`nn-feedback ${isCorrectAnim ? 'nn-feedback-correct' : 'nn-feedback-wrong'}`}>
            {isCorrectAnim ? '✓ CORRECT' : `✗ Answer: ${chainQ.answer}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MEMORY SLASH ENGINE ─────────────────────────────────────────────────────

function MemorySlashGame({ tier, onEnd }: { tier: Tier; onEnd: (result: GameResult) => void }) {
  const tc = TIER_CONFIG[tier];
  const sounds = useSounds();
  const [question, setQuestion] = useState<GameQuestion>(() => generateSlashQuestion(tier, 1));
  const [memoryPhase, setMemoryPhase] = useState<'showing' | 'hidden' | 'answered'>('showing');
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isCorrectAnim, setIsCorrectAnim] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [lives, setLives] = useState(tc.lives);
  const [queueNext, setQueueNext] = useState(false);
  const questionIdRef = useRef(1);
  const startTimeRef = useRef(Date.now());

  const multiplier = combo >= COMBO_THRESHOLD_5X ? 5 : combo >= COMBO_THRESHOLD_3X ? 3 : combo >= COMBO_THRESHOLD_2X ? 2 : 1;

  // Timer
  useEffect(() => {
    const iv = setInterval(() => setTimer(prev => (prev <= 0 ? 0 : prev - 0.1)), 100);
    return () => clearInterval(iv);
  }, []);

  // Memory phase transition
  useEffect(() => {
    if (memoryPhase === 'showing') {
      sounds.playMemoryFlash();
      const t = setTimeout(() => setMemoryPhase('hidden'), tc.memoryVisible);
      return () => clearTimeout(t);
    }
  }, [memoryPhase, tc.memoryVisible, sounds]);

  // Game over
  useEffect(() => {
    if (timer <= 0 || (tc.lives > 0 && lives <= 0)) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onEnd({
        correct, wrong, total: correct + wrong, maxCombo,
        accuracy: (correct + wrong) > 0 ? Math.round(correct / (correct + wrong) * 100) : 0,
        timeElapsed: elapsed, score, tier, mode: 'memory',
      });
    }
  }, [timer, lives]); // eslint-disable-line

  // Queue next
  useEffect(() => {
    if (queueNext) {
      const t = setTimeout(() => {
        questionIdRef.current += 1;
        setQuestion(generateSlashQuestion(tier, questionIdRef.current));
        setMemoryPhase('showing');
        setAnswered(false);
        setSelectedIdx(null);
        setIsCorrectAnim(null);
        setQueueNext(false);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [queueNext, tier]);

  const handleSelect = useCallback((idx: number) => {
    if (answered || memoryPhase === 'showing' || timer <= 0) return;
    setAnswered(true);
    setMemoryPhase('answered');
    setSelectedIdx(idx);
    const isRight = question.options[idx] === question.answer;
    setIsCorrectAnim(isRight);

    if (isRight) {
      sounds.playCorrectSlash();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 20 * multiplier * tier); // bonus for memory!
    } else {
      sounds.playWrongSlash();
      setCombo(0);
      setWrong(prev => prev + 1);
      if (tc.lives > 0) { setLives(prev => prev - 1); sounds.playLoseLife(); }
    }
    setQueueNext(true);
  }, [answered, memoryPhase, timer, question, combo, multiplier, tier, tc.lives, sounds]);

  return (
    <div className="nn-game-arena">
      <NinjaBackground tier={tier} />
      <GameHUD timer={timer} score={score} combo={combo} multiplier={multiplier}
        lives={lives} maxLives={tc.lives} tier={tier} mode="memory" />

      <div className="nn-arena-content">
        {/* Memory question display */}
        <div className="nn-memory-display">
          {memoryPhase === 'showing' && (
            <div className="nn-memory-question nn-memory-visible">
              <div className="nn-memory-label">MEMORIZE!</div>
              <div className="nn-question-text">{question.text} = ?</div>
              <div className="nn-memory-timer-bar">
                <div className="nn-memory-timer-fill" style={{
                  animationDuration: `${tc.memoryVisible}ms`, background: tc.color,
                }} />
              </div>
            </div>
          )}
          {memoryPhase === 'hidden' && (
            <div className="nn-memory-question nn-memory-hidden">
              <div className="nn-memory-label" style={{ color: tc.color }}>RECALL!</div>
              <div className="nn-memory-hidden-text">❓ What was the answer? ❓</div>
            </div>
          )}
          {memoryPhase === 'answered' && (
            <div className="nn-memory-question">
              <div className="nn-question-text" style={{ opacity: 0.6 }}>{question.text} = {question.displayAnswer}</div>
            </div>
          )}
        </div>

        {/* Answer bubbles (only shown after memory phase or during answered) */}
        {memoryPhase !== 'showing' && (
          <div className="nn-bubbles-container">
            {question.options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              const isRight = opt === question.answer;
              let cls = 'nn-bubble';
              if (answered) {
                if (isSelected && isRight) cls += ' nn-bubble-correct';
                else if (isSelected && !isRight) cls += ' nn-bubble-wrong';
                else if (isRight) cls += ' nn-bubble-reveal';
              }
              return (
                <button key={`${question.id}-${idx}`} className={cls}
                  onClick={() => handleSelect(idx)} disabled={answered}
                  style={{ '--bubble-delay': `${idx * 0.08}s`, '--tier-color': tc.color } as React.CSSProperties}>
                  <span className="nn-bubble-value">{question.displayOptions[idx]}</span>
                </button>
              );
            })}
          </div>
        )}

        <ComboFlash combo={combo} multiplier={multiplier} />

        {isCorrectAnim !== null && (
          <div className={`nn-feedback ${isCorrectAnim ? 'nn-feedback-correct' : 'nn-feedback-wrong'}`}>
            {isCorrectAnim ? '✓ CORRECT' : `✗ Answer: ${question.displayAnswer}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ENDLESS DOJO ENGINE ─────────────────────────────────────────────────────

function EndlessDojoGame({ tier: initialTier, onEnd }: { tier: Tier; onEnd: (result: GameResult) => void }) {
  const sounds = useSounds();
  const [currentTier, setCurrentTier] = useState<Tier>(initialTier);
  const tc = TIER_CONFIG[currentTier];
  const [question, setQuestion] = useState<GameQuestion>(() => generateSlashQuestion(initialTier, 1));
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isCorrectAnim, setIsCorrectAnim] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  const [queueNext, setQueueNext] = useState(false);
  const questionIdRef = useRef(1);
  const startTimeRef = useRef(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  const MAX_WRONG = 3;
  const multiplier = combo >= COMBO_THRESHOLD_5X ? 5 : combo >= COMBO_THRESHOLD_3X ? 3 : combo >= COMBO_THRESHOLD_2X ? 2 : 1;

  // Elapsed time counter
  useEffect(() => {
    const iv = setInterval(() => setElapsedTime((Date.now() - startTimeRef.current) / 1000), 100);
    return () => clearInterval(iv);
  }, []);

  // Progressive difficulty: every 10 correct, tier up
  useEffect(() => {
    if (correct > 0 && correct % 10 === 0) {
      const newTier = Math.min(4, currentTier + 1) as Tier;
      if (newTier !== currentTier) setCurrentTier(newTier);
    }
  }, [correct, currentTier]);

  // Game over
  useEffect(() => {
    if (wrongTotal >= MAX_WRONG) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onEnd({
        correct, wrong: wrongTotal, total: correct + wrongTotal, maxCombo,
        accuracy: (correct + wrongTotal) > 0 ? Math.round(correct / (correct + wrongTotal) * 100) : 0,
        timeElapsed: elapsed, score, tier: currentTier, mode: 'endless',
      });
    }
  }, [wrongTotal]); // eslint-disable-line

  // Queue next
  useEffect(() => {
    if (queueNext) {
      const t = setTimeout(() => {
        questionIdRef.current += 1;
        setQuestion(generateSlashQuestion(currentTier, questionIdRef.current));
        setAnswered(false);
        setSelectedIdx(null);
        setIsCorrectAnim(null);
        setQueueNext(false);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [queueNext, currentTier]);

  const handleSelect = useCallback((idx: number) => {
    if (answered || wrongTotal >= MAX_WRONG) return;
    setAnswered(true);
    setSelectedIdx(idx);
    const isRight = question.options[idx] === question.answer;
    setIsCorrectAnim(isRight);

    if (isRight) {
      sounds.playCorrectSlash();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 10 * multiplier * currentTier);
    } else {
      sounds.playWrongSlash();
      setCombo(0);
      setWrong(prev => prev + 1);
      setWrongTotal(prev => prev + 1);
      sounds.playLoseLife();
    }
    setQueueNext(true);
  }, [answered, wrongTotal, question, combo, multiplier, currentTier, sounds]);

  return (
    <div className="nn-game-arena">
      <NinjaBackground tier={currentTier} />
      <div className="nn-hud">
        <div className="nn-hud-inner">
          <div className="nn-hud-timer">
            <div className="nn-hud-endless-badge">
              <span style={{ fontSize: 16 }}>♾️</span>
              <span className="nn-hud-timer-text" style={{ color: tc.color }}>
                {Math.floor(elapsedTime / 60)}:{String(Math.floor(elapsedTime % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>
          <div className="nn-hud-score">
            <span className="nn-hud-score-label">SCORE</span>
            <span className="nn-hud-score-value" style={{ color: tc.color }}>{score.toLocaleString()}</span>
          </div>
          <div className="nn-hud-combo">
            {multiplier > 1 && <span className="nn-hud-multiplier" style={{ color: tc.color }}>{multiplier}×</span>}
            <span className="nn-hud-combo-label">{combo > 0 ? `${combo} combo` : 'No combo'}</span>
          </div>
          <div className="nn-hud-lives">
            {Array.from({ length: MAX_WRONG }).map((_, i) => (
              <span key={i} className={`nn-heart ${i < (MAX_WRONG - wrongTotal) ? '' : 'nn-heart-lost'}`}>
                {i < (MAX_WRONG - wrongTotal) ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
          {/* Tier indicator */}
          <div className="nn-hud-tier-badge" style={{ color: tc.color, borderColor: tc.border }}>
            {tc.emoji} Tier {currentTier}
          </div>
        </div>
      </div>

      <div className="nn-arena-content">
        <div className="nn-question-display">
          <div className="nn-question-text" style={{ color: '#F0F2FF' }}>{question.text} = ?</div>
        </div>

        <div className="nn-bubbles-container">
          {question.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isRight = opt === question.answer;
            let cls = 'nn-bubble';
            if (answered) {
              if (isSelected && isRight) cls += ' nn-bubble-correct';
              else if (isSelected && !isRight) cls += ' nn-bubble-wrong';
              else if (isRight) cls += ' nn-bubble-reveal';
            }
            return (
              <button key={`${question.id}-${idx}`} className={cls}
                onClick={() => handleSelect(idx)} disabled={answered}
                style={{ '--bubble-delay': `${idx * 0.08}s`, '--tier-color': tc.color } as React.CSSProperties}>
                <span className="nn-bubble-value">{question.displayOptions[idx]}</span>
              </button>
            );
          })}
        </div>

        <ComboFlash combo={combo} multiplier={multiplier} />

        {isCorrectAnim !== null && (
          <div className={`nn-feedback ${isCorrectAnim ? 'nn-feedback-correct' : 'nn-feedback-wrong'}`}>
            {isCorrectAnim ? '✓ CORRECT' : `✗ ${question.displayAnswer}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ──────────────────────────────────────────────────────────

function ResultsScreen({ result, onPlayAgain, onMenu }: {
  result: GameResult; onPlayAgain: () => void; onMenu: () => void;
}) {
  const tc = TIER_CONFIG[result.tier];
  const mc = MODE_CONFIG[result.mode];
  const sounds = useSounds();
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    sounds.playGameOver();
    const t = setTimeout(() => setShowStats(true), 400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const grade = result.accuracy >= 95 ? 'S' : result.accuracy >= 85 ? 'A' : result.accuracy >= 70 ? 'B' : result.accuracy >= 50 ? 'C' : 'D';
  const gradeColor = grade === 'S' ? '#F59E0B' : grade === 'A' ? '#34D399' : grade === 'B' ? '#60A5FA' : grade === 'C' ? '#A78BFA' : '#EF4444';
  const gradeLabel = grade === 'S' ? 'LEGENDARY!' : grade === 'A' ? 'EXCELLENT!' : grade === 'B' ? 'GREAT!' : grade === 'C' ? 'GOOD TRY!' : 'KEEP TRAINING!';

  return (
    <div className="nn-results">
      <NinjaBackground tier={result.tier} />
      <CelebrationParticles />
      <div className="nn-results-content">
        <div className="nn-results-header">
          <span className="nn-results-emoji">{mc.emoji}</span>
          <h2 className="nn-results-title" style={{ color: mc.color }}>{mc.label}</h2>
          <div className="nn-results-tier">{tc.emoji} {tc.label}</div>
        </div>

        {/* Grade circle */}
        <div className="nn-grade-circle" style={{ borderColor: gradeColor, boxShadow: `0 0 40px ${gradeColor}40` }}>
          <span className="nn-grade-letter" style={{ color: gradeColor }}>{grade}</span>
          <span className="nn-grade-label" style={{ color: gradeColor }}>{gradeLabel}</span>
        </div>

        {/* Score */}
        <div className="nn-results-score" style={{ color: tc.color }}>
          {result.score.toLocaleString()} pts
        </div>

        {/* Stats grid */}
        {showStats && (
          <div className="nn-stats-grid">
            <div className="nn-stat-card">
              <div className="nn-stat-value" style={{ color: '#34D399' }}>{result.correct}</div>
              <div className="nn-stat-label">Correct</div>
            </div>
            <div className="nn-stat-card">
              <div className="nn-stat-value" style={{ color: '#EF4444' }}>{result.wrong}</div>
              <div className="nn-stat-label">Wrong</div>
            </div>
            <div className="nn-stat-card">
              <div className="nn-stat-value" style={{ color: '#F59E0B' }}>{result.maxCombo}</div>
              <div className="nn-stat-label">Max Combo</div>
            </div>
            <div className="nn-stat-card">
              <div className="nn-stat-value" style={{ color: '#60A5FA' }}>{result.accuracy}%</div>
              <div className="nn-stat-label">Accuracy</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="nn-results-actions">
          <button className="nn-action-btn nn-action-primary" onClick={onPlayAgain}
            style={{ background: `linear-gradient(135deg, ${tc.color}, ${mc.color})` }}>
            ⚔️ Play Again
          </button>
          <button className="nn-action-btn nn-action-secondary" onClick={onMenu}>
            🏠 Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MAIN COMPONENT                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export default function NumberNinja() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [tier, setTier] = useState<Tier>(2);
  const [mode, setMode] = useState<GameMode>('slash');
  const [result, setResult] = useState<GameResult | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const handleStart = useCallback(() => setPhase('tierSelect'), []);

  const handleTierSelect = useCallback((t: Tier) => {
    setTier(t);
    setPhase('modeSelect');
  }, []);

  const handleModeSelect = useCallback((m: GameMode) => {
    setMode(m);
    setGameKey(prev => prev + 1);
    setPhase('countdown');
  }, []);

  const handleCountdownDone = useCallback(() => setPhase('playing'), []);

  const handleGameEnd = useCallback((r: GameResult) => {
    setResult(r);
    setPhase('results');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameKey(prev => prev + 1);
    setPhase('countdown');
  }, []);

  const handleMenu = useCallback(() => {
    setPhase('menu');
    setResult(null);
  }, []);

  const handleTierBack = useCallback(() => setPhase('menu'), []);
  const handleModeBack = useCallback(() => setPhase('tierSelect'), []);

  return (
    <>
      <style>{NINJA_CSS}</style>
      <div className="nn-root">
        {phase === 'menu' && <MenuScreen onStart={handleStart} />}
        {phase === 'tierSelect' && <TierSelectScreen onSelect={handleTierSelect} onBack={handleTierBack} />}
        {phase === 'modeSelect' && <ModeSelectScreen tier={tier} onSelect={handleModeSelect} onBack={handleModeBack} />}
        {phase === 'countdown' && <CountdownScreen tier={tier} mode={mode} onDone={handleCountdownDone} />}
        {phase === 'playing' && mode === 'slash' && <SlashRushGame key={gameKey} tier={tier} onEnd={handleGameEnd} />}
        {phase === 'playing' && mode === 'truefalse' && <TrueFalseGame key={gameKey} tier={tier} onEnd={handleGameEnd} />}
        {phase === 'playing' && mode === 'abacus' && <AbacusNinjaGame key={gameKey} tier={tier} onEnd={handleGameEnd} />}
        {phase === 'playing' && mode === 'chain' && <ChainCutterGame key={gameKey} tier={tier} onEnd={handleGameEnd} />}
        {phase === 'playing' && mode === 'memory' && <MemorySlashGame key={gameKey} tier={tier} onEnd={handleGameEnd} />}
        {phase === 'playing' && mode === 'endless' && <EndlessDojoGame key={gameKey} tier={tier} onEnd={handleGameEnd} />}
        {phase === 'results' && result && <ResultsScreen result={result} onPlayAgain={handlePlayAgain} onMenu={handleMenu} />}
      </div>
    </>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CSS — Complete embedded stylesheet                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const NINJA_CSS = `
/* ── ROOT ──────────────────────────────────────────────── */
.nn-root {
  min-height: 100vh;
  background: #07070F;
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  color: #F0F2FF;
  position: relative;
  overflow-x: hidden;
}

/* ── BACKGROUND ────────────────────────────────────────── */
.nn-bg-container {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
}
.nn-bg-gradient {
  position: absolute; inset: 0;
}
.nn-bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 48px 48px;
}
.nn-bg-stars {
  position: absolute; inset: 0;
}
.nn-bg-star {
  position: absolute; color: rgba(255,255,255,0.08);
  animation: nn-float-star ease-in-out infinite alternate;
}
@keyframes nn-float-star {
  0% { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(-20px) rotate(180deg); }
}

/* ── MENU ──────────────────────────────────────────────── */
.nn-menu {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.08) 0%, transparent 60%), #07070F;
  padding: 24px;
}
.nn-menu-hero {
  text-align: center; max-width: 480px; position: relative; z-index: 1;
}
.nn-menu-glow {
  position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
  width: 360px; height: 360px; border-radius: 50%;
  background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%);
  pointer-events: none; filter: blur(40px);
  animation: nn-glow-pulse 4s ease-in-out infinite alternate;
}
@keyframes nn-glow-pulse {
  0% { opacity: 0.6; transform: translateX(-50%) scale(1); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.15); }
}
.nn-menu-ninja-icon {
  font-size: 72px; margin-bottom: 12px;
  animation: nn-bounce 2s ease-in-out infinite;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.5));
}
@keyframes nn-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
.nn-menu-title {
  font-size: clamp(36px, 8vw, 56px); font-weight: 900;
  line-height: 1.1; margin: 0 0 12px;
  letter-spacing: -1px;
}
.nn-menu-title-number {
  display: block;
  background: linear-gradient(135deg, #F0F2FF 0%, #B8BDD8 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.nn-menu-title-ninja {
  display: block;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #8B5CF6 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.nn-menu-subtitle {
  font-size: 15px; color: #525870; margin-bottom: 28px; font-weight: 500;
}
.nn-menu-features {
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 32px;
}
.nn-menu-feature {
  padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #B8BDD8; white-space: nowrap;
}
.nn-menu-play-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 16px 40px; border-radius: 16px; border: none;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #8B5CF6 100%);
  color: white; font-size: 18px; font-weight: 800; font-family: inherit;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 8px 32px rgba(245,158,11,0.3), 0 4px 12px rgba(0,0,0,0.3);
  text-transform: uppercase; letter-spacing: 1px;
  animation: nn-btn-glow 3s ease-in-out infinite alternate;
}
@keyframes nn-btn-glow {
  0% { box-shadow: 0 8px 32px rgba(245,158,11,0.3), 0 4px 12px rgba(0,0,0,0.3); }
  100% { box-shadow: 0 8px 48px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.3), 0 0 80px rgba(139,92,246,0.15); }
}
.nn-menu-play-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 12px 48px rgba(245,158,11,0.5);
}
.nn-menu-play-btn:active { transform: translateY(0) scale(0.98); }
.nn-menu-play-icon { font-size: 22px; }
.nn-back-link {
  display: inline-block; margin-top: 20px; padding: 8px 20px;
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: #525870;
  font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.nn-back-link:hover { color: #B8BDD8; background: rgba(255,255,255,0.08); }

/* ── BACK BUTTON ───────────────────────────────────────── */
.nn-back-btn {
  position: relative; z-index: 10; display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: #B8BDD8;
  font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer;
  margin-bottom: 20px; transition: all 0.15s;
}
.nn-back-btn:hover { color: #F0F2FF; background: rgba(255,255,255,0.08); }

/* ── SECTION HEADERS ───────────────────────────────────── */
.nn-section-header { text-align: center; margin-bottom: 28px; position: relative; z-index: 1; }
.nn-section-icon { font-size: 44px; margin-bottom: 8px; }
.nn-section-title { font-size: 28px; font-weight: 900; margin: 0 0 6px; letter-spacing: -0.5px; }
.nn-section-sub { font-size: 14px; color: #525870; margin: 0; font-weight: 500; }

/* ── TIER SELECT ───────────────────────────────────────── */
.nn-tier-select {
  min-height: 100vh; padding: clamp(20px, 5vw, 40px);
  background: radial-gradient(ellipse at 50% 20%, rgba(139,92,246,0.06) 0%, transparent 60%), #07070F;
  display: flex; flex-direction: column; align-items: center;
}
.nn-tier-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px; max-width: 880px; width: 100%; position: relative; z-index: 1;
}
.nn-tier-card {
  padding: 24px 20px; border-radius: 16px;
  background: rgba(255,255,255,0.02);
  border: 1.5px solid var(--tier-border);
  cursor: pointer; transition: all 0.25s; text-align: center;
  font-family: inherit;
  position: relative; overflow: hidden;
}
.nn-tier-card::before {
  content: ''; position: absolute; inset: 0; border-radius: 16px;
  background: radial-gradient(circle at 50% 0%, var(--tier-glow), transparent 70%);
  opacity: 0; transition: opacity 0.3s;
}
.nn-tier-card:hover::before { opacity: 1; }
.nn-tier-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 30px var(--tier-glow);
  border-color: var(--tier-color);
}
.nn-tier-card:active { transform: translateY(-1px) scale(0.98); }
.nn-tier-emoji { font-size: 40px; margin-bottom: 8px; position: relative; z-index: 1; }
.nn-tier-label { font-size: 18px; font-weight: 800; margin-bottom: 2px; position: relative; z-index: 1; }
.nn-tier-subtitle { font-size: 12px; color: #525870; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; position: relative; z-index: 1; }
.nn-tier-age { font-size: 13px; font-weight: 700; margin-bottom: 8px; position: relative; z-index: 1; }
.nn-tier-details { font-size: 11px; color: #525870; line-height: 1.6; position: relative; z-index: 1; }

/* ── MODE SELECT ───────────────────────────────────────── */
.nn-mode-select {
  min-height: 100vh; padding: clamp(20px, 5vw, 40px);
  background: radial-gradient(ellipse at 50% 20%, rgba(139,92,246,0.06) 0%, transparent 60%), #07070F;
  display: flex; flex-direction: column; align-items: center;
}
.nn-mode-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px; max-width: 720px; width: 100%; position: relative; z-index: 1;
}
.nn-mode-card {
  padding: 22px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1.5px solid var(--mode-border);
  cursor: pointer; transition: all 0.25s; text-align: center;
  font-family: inherit; position: relative; overflow: hidden;
}
.nn-mode-card::before {
  content: ''; position: absolute; inset: 0; border-radius: 14px;
  background: radial-gradient(circle at 50% 0%, var(--mode-glow), transparent 70%);
  opacity: 0; transition: opacity 0.3s;
}
.nn-mode-card:hover::before { opacity: 1; }
.nn-mode-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 24px var(--mode-glow);
  border-color: var(--mode-color);
}
.nn-mode-card:active { transform: translateY(-1px) scale(0.98); }
.nn-mode-emoji { font-size: 36px; margin-bottom: 8px; position: relative; z-index: 1; }
.nn-mode-label { font-size: 16px; font-weight: 800; margin-bottom: 4px; position: relative; z-index: 1; }
.nn-mode-desc { font-size: 11px; color: #6B7280; line-height: 1.5; position: relative; z-index: 1; }

/* ── COUNTDOWN ─────────────────────────────────────────── */
.nn-countdown {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  position: relative;
}
.nn-countdown-content { position: relative; z-index: 1; text-align: center; }
.nn-countdown-mode { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #B8BDD8; }
.nn-countdown-tier { font-size: 15px; font-weight: 600; margin-bottom: 32px; }
.nn-countdown-number {
  font-size: clamp(80px, 20vw, 140px); font-weight: 900;
  line-height: 1; animation: nn-count-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.nn-countdown-go { animation: nn-go-flash 0.5s ease-out !important; }
@keyframes nn-count-pop {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes nn-go-flash {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); }
}

/* ── GAME HUD ──────────────────────────────────────────── */
.nn-hud {
  position: sticky; top: 0; z-index: 20;
  background: rgba(7,7,15,0.92); backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 0 clamp(12px, 3vw, 24px);
}
.nn-hud-inner {
  max-width: 700px; margin: 0 auto; height: 56px;
  display: flex; align-items: center; gap: clamp(8px, 2vw, 16px);
}
.nn-hud-timer { flex: 1; display: flex; align-items: center; gap: 8px; }
.nn-hud-timer-bar-bg {
  flex: 1; height: 6px; border-radius: 3px;
  background: rgba(255,255,255,0.06); overflow: hidden;
}
.nn-hud-timer-bar {
  height: 100%; border-radius: 3px; transition: width 0.1s linear, background 0.3s;
}
.nn-hud-timer-text { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; min-width: 36px; }
.nn-timer-pulse { animation: nn-pulse 0.5s ease-in-out infinite alternate; }
@keyframes nn-pulse { 0% { opacity: 1; } 100% { opacity: 0.5; } }
.nn-hud-endless-badge { display: flex; align-items: center; gap: 6px; }
.nn-hud-score { text-align: center; }
.nn-hud-score-label { display: block; font-size: 9px; font-weight: 700; color: #525870; text-transform: uppercase; letter-spacing: 1px; }
.nn-hud-score-value { font-size: 18px; font-weight: 900; font-variant-numeric: tabular-nums; }
.nn-hud-combo { text-align: center; min-width: 60px; }
.nn-hud-multiplier { font-size: 16px; font-weight: 900; display: block; }
.nn-hud-combo-label { font-size: 10px; color: #525870; font-weight: 600; }
.nn-hud-lives { display: flex; gap: 2px; }
.nn-heart { font-size: 16px; transition: all 0.3s; }
.nn-heart-lost { opacity: 0.3; transform: scale(0.9); filter: grayscale(1); }
.nn-hud-tier-badge {
  padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 700;
  border: 1px solid; background: rgba(255,255,255,0.03);
}

/* ── GAME ARENA ────────────────────────────────────────── */
.nn-game-arena {
  min-height: 100vh; position: relative; display: flex; flex-direction: column;
}
.nn-arena-content {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 20px clamp(16px, 4vw, 32px);
  position: relative; z-index: 1; gap: 24px;
}

/* ── QUESTION DISPLAY ──────────────────────────────────── */
.nn-question-display {
  text-align: center; padding: 20px 32px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; backdrop-filter: blur(12px);
  animation: nn-fade-in 0.3s ease-out;
}
.nn-question-text {
  font-size: clamp(24px, 6vw, 40px); font-weight: 900;
  letter-spacing: -0.5px; font-variant-numeric: tabular-nums;
}
@keyframes nn-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── BUBBLES ───────────────────────────────────────────── */
.nn-bubbles-container {
  display: flex; gap: clamp(10px, 2.5vw, 16px); flex-wrap: wrap; justify-content: center;
}
.nn-bubble {
  width: clamp(72px, 18vw, 110px); height: clamp(72px, 18vw, 110px);
  border-radius: 50%; border: 2.5px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
  position: relative; overflow: hidden;
  animation: nn-bubble-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  animation-delay: var(--bubble-delay, 0s);
}
.nn-bubble::before {
  content: ''; position: absolute; inset: -2px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 70%);
}
.nn-bubble:not(:disabled):hover {
  transform: scale(1.1);
  border-color: var(--tier-color, #F59E0B);
  box-shadow: 0 0 24px rgba(245,158,11,0.2), 0 8px 24px rgba(0,0,0,0.3);
}
.nn-bubble:not(:disabled):active { transform: scale(0.95); }
@keyframes nn-bubble-enter {
  from { transform: scale(0) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
.nn-bubble-value {
  font-size: clamp(16px, 4vw, 24px); font-weight: 800; position: relative; z-index: 1;
  color: #F0F2FF; font-variant-numeric: tabular-nums;
}
/* Correct state */
.nn-bubble-correct {
  border-color: #34D399 !important; background: rgba(52,211,153,0.15) !important;
  animation: nn-bubble-correct 0.4s ease-out !important;
  box-shadow: 0 0 32px rgba(52,211,153,0.4) !important;
}
@keyframes nn-bubble-correct {
  0% { transform: scale(1); }
  30% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
/* Wrong state */
.nn-bubble-wrong {
  border-color: #EF4444 !important; background: rgba(239,68,68,0.15) !important;
  animation: nn-bubble-wrong 0.4s ease-out !important;
}
@keyframes nn-bubble-wrong {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
/* Reveal correct */
.nn-bubble-reveal {
  border-color: #34D399 !important; background: rgba(52,211,153,0.08) !important;
  animation: nn-bubble-reveal-pulse 0.6s ease-out !important;
}
@keyframes nn-bubble-reveal-pulse {
  0% { box-shadow: 0 0 0 transparent; }
  50% { box-shadow: 0 0 24px rgba(52,211,153,0.4); }
  100% { box-shadow: 0 0 12px rgba(52,211,153,0.2); }
}

/* ── FEEDBACK TOAST ────────────────────────────────────── */
.nn-feedback {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  padding: 8px 24px; border-radius: 12px; font-size: 16px; font-weight: 800;
  animation: nn-feedback-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none; z-index: 25; white-space: nowrap;
}
.nn-feedback-correct {
  background: rgba(52,211,153,0.15); color: #34D399;
  border: 1px solid rgba(52,211,153,0.3);
  box-shadow: 0 4px 20px rgba(52,211,153,0.2);
}
.nn-feedback-wrong {
  background: rgba(239,68,68,0.15); color: #EF4444;
  border: 1px solid rgba(239,68,68,0.3);
  box-shadow: 0 4px 20px rgba(239,68,68,0.2);
}
@keyframes nn-feedback-pop {
  from { transform: translateX(-50%) scale(0.8) translateY(10px); opacity: 0; }
  to { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
}

/* ── COMBO FLASH ───────────────────────────────────────── */
.nn-combo-flash {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; pointer-events: none; z-index: 28;
  animation: nn-combo-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes nn-combo-enter {
  from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  40% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
}
.nn-combo-text {
  display: block; font-size: 32px; font-weight: 900;
  background: linear-gradient(135deg, #F59E0B, #EF4444);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none; filter: drop-shadow(0 2px 8px rgba(245,158,11,0.4));
}
.nn-combo-streak {
  display: block; font-size: 13px; color: #B8BDD8; font-weight: 600; margin-top: 2px;
}

/* ── SLASH PARTICLES ───────────────────────────────────── */
.nn-slash-particle {
  animation: nn-slash-fly 0.6s ease-out forwards;
  pointer-events: none;
}
@keyframes nn-slash-fly {
  from { transform: translate(0, 0) scale(1); opacity: 1; }
  to { transform: translate(var(--dx, 0), var(--dy, -80px)) scale(0); opacity: 0; }
}

/* ── CELEBRATION PARTICLES ─────────────────────────────── */
.nn-celebration-particle {
  animation: nn-confetti-fall 2.5s ease-out forwards;
  pointer-events: none;
}
@keyframes nn-confetti-fall {
  0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 0; }
  10% { transform: translateY(10px) rotate(45deg) scale(1); opacity: 1; }
  100% { transform: translateY(calc(100vh + 40px)) rotate(720deg) scale(0.5); opacity: 0.3; }
}

/* ── TRUE/FALSE ────────────────────────────────────────── */
.nn-tf-equation {
  text-align: center; padding: 28px 40px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px; backdrop-filter: blur(12px);
  animation: nn-fade-in 0.3s ease-out;
}
.nn-tf-text {
  font-size: clamp(26px, 6vw, 44px); font-weight: 900;
  color: #F0F2FF; font-variant-numeric: tabular-nums;
}
.nn-tf-prompt {
  font-size: 14px; color: #525870; font-weight: 600; margin-top: 8px;
  text-transform: uppercase; letter-spacing: 1px;
}
.nn-tf-buttons {
  display: flex; gap: 16px;
}
.nn-tf-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 20px 36px; border-radius: 20px; border: 2.5px solid;
  font-family: inherit; font-weight: 800; font-size: 18px;
  cursor: pointer; transition: all 0.2s; min-width: 130px;
  text-transform: uppercase; letter-spacing: 1px;
}
.nn-tf-true {
  border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.06); color: #34D399;
}
.nn-tf-true:not(:disabled):hover {
  border-color: #34D399; background: rgba(52,211,153,0.12);
  box-shadow: 0 0 24px rgba(52,211,153,0.2); transform: scale(1.05);
}
.nn-tf-false {
  border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.06); color: #EF4444;
}
.nn-tf-false:not(:disabled):hover {
  border-color: #EF4444; background: rgba(239,68,68,0.12);
  box-shadow: 0 0 24px rgba(239,68,68,0.2); transform: scale(1.05);
}
.nn-tf-btn:active { transform: scale(0.96) !important; }
.nn-tf-icon { font-size: 28px; }
.nn-tf-highlight { transform: scale(1.05) !important; box-shadow: 0 0 32px rgba(52,211,153,0.3) !important; }
.nn-tf-dim { opacity: 0.35 !important; }

/* ── ABACUS MODE ───────────────────────────────────────── */
.nn-abacus-arena { gap: 16px; }
.nn-abacus-prompt {
  font-size: 18px; font-weight: 700; color: #B8BDD8; text-align: center;
}
.nn-abacus-display {
  display: flex; justify-content: center;
  animation: nn-fade-in 0.4s ease-out;
}
.nn-abacus-options-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
}
.nn-abacus-option {
  padding: 8px; border-radius: 14px;
  border: 2px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  cursor: pointer; transition: all 0.2s; font-family: inherit;
  display: flex; justify-content: center;
}
.nn-abacus-option:hover {
  border-color: rgba(139,92,246,0.4);
  box-shadow: 0 0 20px rgba(139,92,246,0.2);
}
.nn-abacus-option-correct {
  border-color: #34D399 !important;
  box-shadow: 0 0 24px rgba(52,211,153,0.3) !important;
}
.nn-abacus-option-wrong {
  border-color: #EF4444 !important;
  animation: nn-bubble-wrong 0.4s ease-out !important;
}
.nn-abacus-option-reveal {
  border-color: #34D399 !important;
  background: rgba(52,211,153,0.06) !important;
}

/* ── CHAIN CUTTER ──────────────────────────────────────── */
.nn-chain-container {
  text-align: center; padding: 20px 32px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; min-width: 200px;
}
.nn-chain-label {
  font-size: 14px; font-weight: 700; color: #525870;
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;
}
.nn-chain-rows {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.nn-chain-row {
  display: flex; align-items: center; gap: 8px;
  font-size: clamp(20px, 5vw, 32px); font-weight: 800;
  opacity: 0; transform: translateY(-10px);
  transition: all 0.3s ease-out;
  font-variant-numeric: tabular-nums;
}
.nn-chain-row-visible { opacity: 1; transform: translateY(0); }
.nn-chain-op { color: #60A5FA; font-weight: 900; min-width: 24px; text-align: center; }
.nn-chain-num { color: #F0F2FF; }
.nn-chain-equals {
  font-size: 28px; font-weight: 900; margin-top: 8px;
  animation: nn-fade-in 0.3s ease-out;
}

/* ── MEMORY SLASH ──────────────────────────────────────── */
.nn-memory-display {
  text-align: center; width: 100%; max-width: 400px;
}
.nn-memory-question {
  padding: 24px 32px; border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
}
.nn-memory-visible {
  animation: nn-memory-glow 0.4s ease-out;
  border-color: rgba(6,182,212,0.4);
  box-shadow: 0 0 40px rgba(6,182,212,0.15);
}
@keyframes nn-memory-glow {
  from { box-shadow: 0 0 0 transparent; }
  to { box-shadow: 0 0 40px rgba(6,182,212,0.15); }
}
.nn-memory-label {
  font-size: 12px; font-weight: 800; color: #06B6D4;
  text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;
}
.nn-memory-timer-bar {
  height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06);
  margin-top: 12px; overflow: hidden;
}
.nn-memory-timer-fill {
  height: 100%; border-radius: 2px; width: 100%;
  animation: nn-memory-drain linear forwards;
  transform-origin: left;
}
@keyframes nn-memory-drain {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
.nn-memory-hidden {
  animation: nn-fade-in 0.3s ease-out;
  border-color: rgba(245,158,11,0.2);
}
.nn-memory-hidden-text {
  font-size: 20px; font-weight: 700; color: #525870;
}

/* ── RESULTS ───────────────────────────────────────────── */
.nn-results {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  position: relative; padding: 40px 20px;
}
.nn-results-content {
  position: relative; z-index: 3; text-align: center;
  max-width: 480px; width: 100%;
  animation: nn-fade-in 0.5s ease-out;
}
.nn-results-header { margin-bottom: 20px; }
.nn-results-emoji { font-size: 40px; }
.nn-results-title { font-size: 26px; font-weight: 900; margin: 4px 0; }
.nn-results-tier { font-size: 14px; color: #525870; font-weight: 600; }

.nn-grade-circle {
  width: 120px; height: 120px; border-radius: 50%;
  border: 4px solid; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  margin: 0 auto 16px; background: rgba(255,255,255,0.03);
}
.nn-grade-letter { font-size: 48px; font-weight: 900; line-height: 1; }
.nn-grade-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }

.nn-results-score {
  font-size: 36px; font-weight: 900; margin-bottom: 24px;
  font-variant-numeric: tabular-nums;
}

.nn-stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  margin-bottom: 28px;
  animation: nn-fade-in 0.5s ease-out 0.2s backwards;
}
.nn-stat-card {
  padding: 14px 8px; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
}
.nn-stat-value { font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
.nn-stat-label { font-size: 10px; color: #525870; font-weight: 600; text-transform: uppercase; margin-top: 2px; }

.nn-results-actions {
  display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
}
.nn-action-btn {
  padding: 14px 28px; border-radius: 14px; border: none;
  font-family: inherit; font-size: 15px; font-weight: 800;
  cursor: pointer; transition: all 0.2s; text-transform: uppercase;
  letter-spacing: 0.5px;
}
.nn-action-primary {
  color: white; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.nn-action-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
.nn-action-secondary {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1) !important;
  color: #B8BDD8;
}
.nn-action-secondary:hover { background: rgba(255,255,255,0.08); color: #F0F2FF; }
.nn-action-btn:active { transform: translateY(0) scale(0.97); }

/* ── RESPONSIVE ────────────────────────────────────────── */
@media (max-width: 480px) {
  .nn-hud-inner { height: 48px; gap: 6px; }
  .nn-hud-score-value { font-size: 15px; }
  .nn-hud-multiplier { font-size: 13px; }
  .nn-heart { font-size: 14px; }
  .nn-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .nn-abacus-options-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .nn-tf-buttons { flex-direction: column; gap: 10px; }
  .nn-tf-btn { min-width: 100%; padding: 16px 24px; }
  .nn-tier-grid { grid-template-columns: repeat(2, 1fr); }
  .nn-mode-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 360px) {
  .nn-tier-grid { grid-template-columns: 1fr; }
  .nn-mode-grid { grid-template-columns: 1fr; }
}
`;
