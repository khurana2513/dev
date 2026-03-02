import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, Flame, RotateCcw, Play, ChevronRight, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { savePracticeSession, PracticeSessionData } from "../lib/userApi";

// ── Types ────────────────────────────────────────────────────────────────────

type BurstOperationType =
  | "burst_tables"
  | "burst_multiplication"
  | "burst_division"
  | "burst_decimal_multiplication"
  | "burst_decimal_division"
  | "burst_lcm"
  | "burst_gcd"
  | "burst_square_root"
  | "burst_cube_root"
  | "burst_percentage";

interface BurstConfig {
  label: string;
  description: string;
  icon: string;
  gradient: string;
  options: { label: string; value: string }[];
}

interface BurstQuestion {
  id: number;
  text: string;
  answer: number;
  operands: number[];
  operator: string;
}

interface BurstResult {
  question: BurstQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
  timeTaken: number;
}

// ── Configuration ────────────────────────────────────────────────────────────

const BURST_DURATION = 60; // 60 seconds

const BURST_OPERATIONS: Record<BurstOperationType, BurstConfig> = {
  burst_tables: {
    label: "Tables",
    description: "Speed through multiplication tables",
    icon: "📊",
    gradient: "from-violet-500 to-purple-600",
    options: [{ label: "1 × 1", value: "1x1" }],
  },
  burst_multiplication: {
    label: "Multiplication",
    description: "Rapid-fire multiplication",
    icon: "✖️",
    gradient: "from-blue-500 to-cyan-500",
    options: [
      { label: "2 × 1", value: "2x1" },
      { label: "3 × 1", value: "3x1" },
      { label: "4 × 1", value: "4x1" },
      { label: "2 × 2", value: "2x2" },
      { label: "3 × 2", value: "3x2" },
      { label: "4 × 2", value: "4x2" },
    ],
  },
  burst_division: {
    label: "Division",
    description: "Quick division challenges",
    icon: "➗",
    gradient: "from-emerald-500 to-teal-500",
    options: [
      { label: "2 / 1", value: "2/1" },
      { label: "3 / 1", value: "3/1" },
      { label: "4 / 1", value: "4/1" },
      { label: "3 / 2", value: "3/2" },
      { label: "4 / 2", value: "4/2" },
    ],
  },
  burst_decimal_multiplication: {
    label: "Decimal ×",
    description: "Decimal multiplication sprint",
    icon: "🔢",
    gradient: "from-amber-500 to-orange-500",
    options: [
      { label: "1 × 0", value: "1x0" },
      { label: "1 × 1", value: "1x1" },
      { label: "2 × 1", value: "2x1" },
      { label: "3 × 1", value: "3x1" },
      { label: "2 × 2", value: "2x2" },
    ],
  },
  burst_decimal_division: {
    label: "Decimal ÷",
    description: "Decimal division race",
    icon: "📐",
    gradient: "from-rose-500 to-pink-500",
    options: [
      { label: "2 / 1", value: "2/1" },
      { label: "3 / 1", value: "3/1" },
      { label: "4 / 1", value: "4/1" },
      { label: "3 / 2", value: "3/2" },
      { label: "4 / 2", value: "4/2" },
    ],
  },
  burst_lcm: {
    label: "LCM",
    description: "Least Common Multiple blitz",
    icon: "🔗",
    gradient: "from-indigo-500 to-blue-600",
    options: [
      { label: "(1, 1)", value: "1,1" },
      { label: "(2, 1)", value: "2,1" },
      { label: "(2, 2)", value: "2,2" },
      { label: "(3, 2)", value: "3,2" },
    ],
  },
  burst_gcd: {
    label: "GCD",
    description: "Greatest Common Divisor rush",
    icon: "🎯",
    gradient: "from-sky-500 to-blue-500",
    options: [
      { label: "(1, 1)", value: "1,1" },
      { label: "(2, 1)", value: "2,1" },
      { label: "(2, 2)", value: "2,2" },
      { label: "(3, 2)", value: "3,2" },
    ],
  },
  burst_square_root: {
    label: "Square Root",
    description: "Perfect square root speed",
    icon: "√",
    gradient: "from-fuchsia-500 to-purple-600",
    options: [
      { label: "2 digits", value: "2" },
      { label: "3 digits", value: "3" },
      { label: "4 digits", value: "4" },
      { label: "5 digits", value: "5" },
      { label: "6 digits", value: "6" },
      { label: "7 digits", value: "7" },
      { label: "8 digits", value: "8" },
    ],
  },
  burst_cube_root: {
    label: "Cube Root",
    description: "Perfect cube root challenge",
    icon: "∛",
    gradient: "from-lime-500 to-green-600",
    options: [
      { label: "3 digits", value: "3" },
      { label: "4 digits", value: "4" },
      { label: "5 digits", value: "5" },
      { label: "6 digits", value: "6" },
      { label: "7 digits", value: "7" },
      { label: "8 digits", value: "8" },
    ],
  },
  burst_percentage: {
    label: "Percentage",
    description: "Percentage calculation frenzy",
    icon: "%",
    gradient: "from-teal-500 to-emerald-600",
    options: [
      { label: "2-digit number", value: "2" },
      { label: "3-digit number", value: "3" },
      { label: "4-digit number", value: "4" },
      { label: "5-digit number", value: "5" },
      { label: "6-digit number", value: "6" },
    ],
  },
};

// ── Question Generation ──────────────────────────────────────────────────────

// Inclusive random integer in [min, max]
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNumber(digits: number): number {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return randomInt(min, max);
}

// Pick a random item from an array
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// "Nice" percentages that appear in real-world mental math
const NICE_PERCENTAGES = [5, 10, 12, 15, 20, 25, 30, 33, 40, 50, 60, 66, 70, 75, 80, 90];

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function generateBurstQuestion(
  opType: BurstOperationType,
  option: string,
  id: number
): BurstQuestion {
  switch (opType) {
    case "burst_tables": {
      const a = randomInt(1, 9);
      const b = randomInt(1, 9);
      return { id, text: `${a} × ${b} =`, answer: a * b, operands: [a, b], operator: "×" };
    }

    case "burst_multiplication": {
      const [md, ml] = option.split("x").map(Number);
      const a = generateNumber(md);
      const b = generateNumber(ml);
      return { id, text: `${a} × ${b} =`, answer: a * b, operands: [a, b], operator: "×" };
    }

    case "burst_division": {
      const [dd, dv] = option.split("/").map(Number);
      const dvdMin = Math.pow(10, dd - 1);
      const dvdMax = Math.pow(10, dd) - 1;
      const divMin = Math.pow(10, dv - 1);
      const divMax = Math.pow(10, dv) - 1;
      // Pick a divisor then compute the exact quotient range that keeps
      // the dividend within the requested digit count. Retry divisor if
      // no valid quotient exists for it (rare edge case).
      let divisor = randomInt(divMin, divMax);
      let quotientMin = Math.ceil(dvdMin / divisor);
      let quotientMax = Math.floor(dvdMax / divisor);
      for (let i = 0; i < 10 && quotientMin > quotientMax; i++) {
        divisor = randomInt(divMin, divMax);
        quotientMin = Math.ceil(dvdMin / divisor);
        quotientMax = Math.floor(dvdMax / divisor);
      }
      const quotient = randomInt(quotientMin, quotientMax);
      const dividend = quotient * divisor;
      return { id, text: `${dividend} ÷ ${divisor} =`, answer: quotient, operands: [dividend, divisor], operator: "÷" };
    }

    case "burst_decimal_multiplication": {
      const [mcd, mld] = option.split("x").map(Number);
      // Vary decimal part: 0–9 tenths, but bias toward non-zero for variety
      const aDec = Math.random() < 0.15 ? 0 : randomInt(1, 9);
      const a = generateNumber(Math.max(1, mcd)) + aDec / 10;
      if (mld === 0) {
        const b = randomInt(2, 9); // whole-number multiplier, avoid 1 (trivial)
        const answer = Math.round(a * b * 100) / 100;
        return { id, text: `${a.toFixed(1)} × ${b} =`, answer, operands: [a, b], operator: "×" };
      } else {
        const bDec = Math.random() < 0.15 ? 0 : randomInt(1, 9);
        const b = generateNumber(Math.max(1, mld)) + bDec / 10;
        const answer = Math.round(a * b * 100) / 100;
        return { id, text: `${a.toFixed(1)} × ${b.toFixed(1)} =`, answer, operands: [a, b], operator: "×" };
      }
    }

    case "burst_decimal_division": {
      const [dvd, dvs] = option.split("/").map(Number);
      const dvdMin = Math.pow(10, dvd - 1);
      const dvdMax = Math.pow(10, dvd) - 1;
      const divMin = Math.pow(10, dvs - 1);
      const divMax = Math.pow(10, dvs) - 1;
      let divisor = randomInt(divMin, divMax);
      let quotientMin = Math.ceil(dvdMin / divisor);
      let quotientMax = Math.floor(dvdMax / divisor);
      for (let i = 0; i < 10 && quotientMin > quotientMax; i++) {
        divisor = randomInt(divMin, divMax);
        quotientMin = Math.ceil(dvdMin / divisor);
        quotientMax = Math.floor(dvdMax / divisor);
      }
      const quotient = randomInt(quotientMin, quotientMax);
      const dividend = quotient * divisor;
      return { id, text: `${dividend} ÷ ${divisor} =`, answer: quotient, operands: [dividend, divisor], operator: "÷" };
    }

    case "burst_lcm": {
      const [d1, d2] = option.split(",").map(Number);
      let a = generateNumber(d1);
      let b = generateNumber(d2);
      // 60% of the time: force a small common factor so LCM is non-trivial and interesting
      if (Math.random() < 0.6) {
        const cf = pick([2, 3, 4, 5, 6]);
        // Round both numbers to nearest multiple of cf
        a = Math.max(cf, Math.round(generateNumber(d1) / cf) * cf);
        b = Math.max(cf, Math.round(generateNumber(d2) / cf) * cf);
        // Clamp to digit count
        const aMax = Math.pow(10, d1) - 1;
        const bMax = Math.pow(10, d2) - 1;
        if (a > aMax) a = aMax - (aMax % cf);
        if (b > bMax) b = bMax - (bMax % cf);
      }
      if (a === b) b = b < Math.pow(10, d2) - 1 ? b + 1 : Math.max(1, Math.pow(10, d2 - 1));
      const answer = lcm(a, b);
      return { id, text: `LCM(${a}, ${b}) =`, answer, operands: [a, b], operator: "LCM" };
    }

    case "burst_gcd": {
      const [d1, d2] = option.split(",").map(Number);
      let a: number, b: number;
      // 65% of the time: build numbers from a known common factor → realistic GCD answers
      const maxG = Math.min(9, Math.pow(10, Math.min(d1, d2) - 1) || 9);
      if (maxG >= 2 && Math.random() < 0.65) {
        const g = randomInt(2, maxG);
        // Pick co-prime multipliers p, q so gcd(a,b) = g exactly
        const coprimes = [1, 2, 3, 5, 7, 11, 13, 17, 19];
        let p = pick(coprimes);
        let q = pick(coprimes.filter(x => x !== p));
        a = g * p;
        b = g * q;
        // If over digit count, fall back to plain random
        if (String(a).length !== d1 || String(b).length !== d2) {
          a = generateNumber(d1);
          b = generateNumber(d2);
        }
      } else {
        a = generateNumber(d1);
        b = generateNumber(d2);
      }
      if (a === b) b = b < Math.pow(10, d2) - 1 ? b + 1 : Math.max(1, Math.pow(10, d2 - 1));
      const answer = gcd(a, b);
      return { id, text: `GCD(${a}, ${b}) =`, answer, operands: [a, b], operator: "GCD" };
    }

    case "burst_square_root": {
      const rootDigits = parseInt(option);
      const minTarget = Math.pow(10, rootDigits - 1);
      const maxTarget = Math.pow(10, rootDigits) - 1;
      const minRoot = Math.ceil(Math.sqrt(minTarget));
      const maxRoot = Math.floor(Math.sqrt(maxTarget));
      const root = randomInt(minRoot, maxRoot);
      const number = root * root;
      return { id, text: `√${number} =`, answer: root, operands: [number], operator: "√" };
    }

    case "burst_cube_root": {
      const rootDigits = parseInt(option);
      const minTarget = Math.pow(10, rootDigits - 1);
      const maxTarget = Math.pow(10, rootDigits) - 1;
      const minRoot = Math.ceil(Math.cbrt(minTarget));
      const maxRoot = Math.floor(Math.cbrt(maxTarget));
      const root = randomInt(minRoot, maxRoot);
      const number = root * root * root;
      return { id, text: `∛${number} =`, answer: root, operands: [number], operator: "∛" };
    }

    case "burst_percentage": {
      const numDigits = parseInt(option);
      // Mix: 45% nice round percentages, 55% fully random 1–99
      const percentage = Math.random() < 0.45 ? pick(NICE_PERCENTAGES) : randomInt(1, 99);
      const number = generateNumber(numDigits);
      const answer = Math.round((percentage / 100) * number * 100) / 100;
      return { id, text: `${percentage}% of ${number} =`, answer, operands: [percentage, number], operator: "%" };
    }

    default:
      return { id, text: "1 + 1 =", answer: 2, operands: [1, 1], operator: "+" };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function compareAnswers(userAnswer: number, correctAnswer: number): boolean {
  // For decimal answers, allow small floating point tolerance
  if (Number.isInteger(correctAnswer)) {
    return userAnswer === correctAnswer;
  }
  return Math.abs(userAnswer - correctAnswer) < 0.01;
}

// ── Component ────────────────────────────────────────────────────────────────

type Phase = "select" | "config" | "countdown" | "playing" | "results";

export default function BurstMode() {
  const { refreshUser } = useAuth();

  // Phase state
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedOp, setSelectedOp] = useState<BurstOperationType | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");

  // Game state
  const [timeLeft, setTimeLeft] = useState(BURST_DURATION);
  const [currentQuestion, setCurrentQuestion] = useState<BurstQuestion | null>(null);
  const [userInput, setUserInput] = useState("");
  const [results, setResults] = useState<BurstResult[]>([]);
  const [questionId, setQuestionId] = useState(1);
  const [flashColor, setFlashColor] = useState<"" | "green" | "red">("");
  const [countdownNum, setCountdownNum] = useState(3);
  const [saving, setSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  // useRef guard prevents React StrictMode double-invocation from saving twice
  const savingRef = useRef(false);
  const [exitConfirm, setExitConfirm] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  // Tracks the last N question texts to prevent immediate repeats
  const recentTextsRef = useRef<string[]>([]);

  // ── CSS Injection ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = "burst-design-tokens";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
      :root {
        --bm-bg: #06070F; --bm-bg2: #0B0D1A; --bm-surf: #0F1120; --bm-surf2: #141729; --bm-surf3: #1A1F38;
        --bm-bdr: rgba(255,255,255,0.06); --bm-bdr2: rgba(255,255,255,0.10);
        --bm-burst: #F97316; --bm-burst2: #FB923C; --bm-burst3: #FED7AA;
        --bm-burstdim: rgba(249,115,22,0.12); --bm-burstglow: rgba(249,115,22,0.22);
        --bm-purple: #7B5CE5; --bm-purple2: #9D7FF0;
        --bm-green: #10B981; --bm-gdim: rgba(16,185,129,0.12);
        --bm-red: #EF4444; --bm-rdim: rgba(239,68,68,0.12);
        --bm-gold: #F59E0B; --bm-white: #F0F2FF; --bm-white2: #B8BDD8; --bm-muted: #525870;
        --bm-fd: 'Playfair Display', Georgia, serif; --bm-fb: 'DM Sans', sans-serif; --bm-fm: 'JetBrains Mono', monospace;
      }
      @keyframes bm-fade-up { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
      @keyframes bm-fade-in { from{opacity:0} to{opacity:1} }
      @keyframes bm-scale-in { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
      @keyframes bm-scale-pop { 0%{transform:scale(1)} 45%{transform:scale(1.1)} 100%{transform:scale(1)} }
      @keyframes bm-number-slam { 0%{opacity:0;transform:scale(.55) translateY(20px)} 55%{transform:scale(1.07) translateY(-3px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes bm-burst-pulse { 0%,100%{box-shadow:0 0 0 0 var(--bm-burstglow)} 60%{box-shadow:0 0 0 14px transparent} }
      @keyframes bm-timer-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
      @keyframes bm-correct-ring { 0%{outline-color:rgba(16,185,129,0)} 40%{outline-color:rgba(16,185,129,.5)} 100%{outline-color:rgba(16,185,129,0)} }
      @keyframes bm-wrong-ring { 0%{outline-color:rgba(239,68,68,0)} 40%{outline-color:rgba(239,68,68,.6)} 100%{outline-color:rgba(239,68,68,0)} }
      @keyframes bm-streak-pop { 0%{transform:scale(1)} 50%{transform:scale(1.25) rotate(-3deg)} 100%{transform:scale(1)} }
      @keyframes bm-progress-drain { from{width:100%} to{width:0%} }
      @keyframes bm-count-up { from{opacity:0;transform:translateY(10px) scale(.85)} to{opacity:1;transform:none} }
      @keyframes bm-lightning-in { from{opacity:0;transform:rotate(-10deg) scale(.6)} to{opacity:1;transform:rotate(0) scale(1)} }
      @keyframes bm-bg-breathe { 0%,100%{opacity:.6} 50%{opacity:1} }
      @keyframes bm-card-hover-glow { 0%,100%{box-shadow:0 0 20px rgba(249,115,22,0)} 50%{box-shadow:0 0 28px rgba(249,115,22,.18)} }
      .bm-mode-card { all: unset; display: block; box-sizing: border-box; }
      .bm-mode-card:hover { transform: translateY(-6px) !important; border-color: rgba(249,115,22,.3) !important; box-shadow: 0 16px 48px rgba(0,0,0,.35), 0 0 32px rgba(249,115,22,.08) !important; animation: bm-card-hover-glow 2s ease infinite !important; }
      .bm-mode-card:active { transform: translateY(-3px) scale(.98) !important; }
      .bm-mode-card:hover .bm-card-accent { opacity: 1 !important; }
      .bm-mode-card:hover .bm-card-icon { background: var(--bm-burstdim) !important; border-color: rgba(249,115,22,.3) !important; box-shadow: 0 0 20px rgba(249,115,22,.15) !important; }
      .bm-diff-btn { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 14px 12px; border-radius: 12px; border: 1px solid var(--bm-bdr2); background: var(--bm-surf2); font-family: var(--bm-fm); font-size: 15px; font-weight: 600; color: var(--bm-white2); cursor: pointer; text-align: center; transition: all .2s cubic-bezier(.4,0,.2,1); }
      .bm-diff-btn:hover { border-color: rgba(249,115,22,.3) !important; background: rgba(249,115,22,.06) !important; color: var(--bm-white) !important; transform: translateY(-1px); }
      .bm-diff-btn.selected { background: rgba(249,115,22,.12) !important; border: 1.5px solid rgba(249,115,22,.5) !important; color: var(--bm-burst2) !important; font-weight: 700 !important; box-shadow: 0 0 20px rgba(249,115,22,.12) !important; animation: bm-scale-pop .2s ease both; }
      .bm-input { background: var(--bm-surf); border: 2px solid var(--bm-bdr2); border-radius: 16px; padding: 18px 22px; font-family: var(--bm-fm); font-size: 24px; font-weight: 700; color: var(--bm-white); text-align: center; outline: none; outline-offset: 3px; outline-width: 3px; outline-style: solid; outline-color: transparent; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; width: 100%; box-sizing: border-box; }
      .bm-input::placeholder { color: rgba(255,255,255,.1); font-size: 20px; font-weight: 400; }
      .bm-input:focus { border-color: rgba(249,115,22,.45); box-shadow: 0 0 0 3px rgba(249,115,22,.08); }
      .bm-input.correct { border-color: rgba(16,185,129,.6); background: rgba(16,185,129,.06); animation: bm-correct-ring .4s ease both; }
      .bm-input.wrong { border-color: rgba(239,68,68,.6); background: rgba(239,68,68,.06); animation: bm-wrong-ring .4s ease both; }
      .bm-skip-btn { background: var(--bm-surf2); border: 1px solid var(--bm-bdr2); border-radius: 14px; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; color: var(--bm-muted); transition: all .2s ease; flex-shrink: 0; }
      .bm-skip-btn:hover { background: rgba(249,115,22,.08); border-color: rgba(249,115,22,.3); color: var(--bm-burst2); }
      .bm-skip-btn:active { transform: scale(.92); }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Config phase ─────────────────────────────────────────────────────────

  const handleSelectOperation = (op: BurstOperationType) => {
    setSelectedOp(op);
    const config = BURST_OPERATIONS[op];
    setSelectedOption(config.options[0].value);
    setPhase("config");
  };

  // ── Start game ───────────────────────────────────────────────────────────

  const startCountdown = () => {
    setPhase("countdown");
    setCountdownNum(3);
    setResults([]);
    setQuestionId(1);
    setTimeLeft(BURST_DURATION);
    setUserInput("");
    setFlashColor("");
    setSessionSaved(false);
    setExitConfirm(false);
    recentTextsRef.current = [];
  };

  // Countdown effect
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum <= 0) {
      // Start playing — generate first question with anti-repeat seeding
      let q = generateBurstQuestion(selectedOp!, selectedOption, 1);
      for (let i = 0; i < 12 && recentTextsRef.current.includes(q.text); i++) {
        q = generateBurstQuestion(selectedOp!, selectedOption, 1);
      }
      recentTextsRef.current = [q.text];
      setCurrentQuestion(q);
      setQuestionId(2);
      sessionStartRef.current = Date.now();
      questionStartRef.current = Date.now();
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, selectedOp, selectedOption]);

  // Timer effect
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase("results");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Auto-focus input
  useEffect(() => {
    if (phase === "playing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, currentQuestion]);

  // ── Submit answer ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || phase !== "playing" || !userInput.trim()) return;

    const now = Date.now();
    const timeTaken = (now - questionStartRef.current) / 1000;
    const userAnswer = parseFloat(userInput);
    const isCorrect = !isNaN(userAnswer) && compareAnswers(userAnswer, currentQuestion.answer);

    setResults((prev) => [
      ...prev,
      { question: currentQuestion, userAnswer: isNaN(userAnswer) ? null : userAnswer, isCorrect, timeTaken },
    ]);

    // Flash feedback
    setFlashColor(isCorrect ? "green" : "red");
    setTimeout(() => setFlashColor(""), 200);

    // Next question: retry until text is not in recent history (max 12 attempts)
    let nextQ = generateBurstQuestion(selectedOp!, selectedOption, questionId);
    for (let i = 0; i < 12 && recentTextsRef.current.includes(nextQ.text); i++) {
      nextQ = generateBurstQuestion(selectedOp!, selectedOption, questionId);
    }
    // Keep last 10 question texts in history
    recentTextsRef.current = [...recentTextsRef.current.slice(-9), nextQ.text];
    setCurrentQuestion(nextQ);
    setQuestionId((prev) => prev + 1);
    setUserInput("");
    questionStartRef.current = Date.now();
    inputRef.current?.focus();
  }, [currentQuestion, phase, userInput, selectedOp, selectedOption, questionId]);

  // Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Save session ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "results" || results.length === 0 || sessionSaved || saving || savingRef.current) return;
    saveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const saveSession = async () => {
    if (!selectedOp || results.length === 0) return;
    if (savingRef.current) return;  // prevent double-save (StrictMode / retry)
    savingRef.current = true;
    setSaving(true);
    try {
      const correct = results.filter((r) => r.isCorrect).length;
      const wrong = results.length - correct;
      const accuracy = results.length > 0 ? (correct / results.length) * 100 : 0;
      const totalTime = BURST_DURATION;

      const attempts = results.map((r, i) => ({
        question_data: {
          text: r.question.text,
          operands: r.question.operands,
          operator: r.question.operator,
          answer: r.question.answer,
        },
        user_answer: r.userAnswer,
        correct_answer: r.question.answer,
        is_correct: r.isCorrect,
        time_taken: Math.max(0.1, r.timeTaken),
        question_number: i + 1,
      }));

      const sessionData: PracticeSessionData = {
        operation_type: selectedOp,
        difficulty_mode: "burst_mode",
        total_questions: results.length,
        correct_answers: correct,
        wrong_answers: wrong,
        accuracy: Math.round(accuracy * 100) / 100,
        score: correct,
        time_taken: totalTime,
        points_earned: 0, // No points for burst mode
        attempts,
      };

      await savePracticeSession(sessionData);
      setSessionSaved(true);
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error("Failed to save burst mode session:", err);
      savingRef.current = false;  // allow retry on genuine failure
    } finally {
      setSaving(false);
    }
  };

  // ── Exit handling ────────────────────────────────────────────────────────

  const handleBack = () => {
    if (phase === "playing") {
      setExitConfirm(true);
    } else {
      resetToSelect();
    }
  };

  const confirmExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Save partial results if any
    if (results.length > 0) {
      setPhase("results");
    } else {
      resetToSelect();
    }
    setExitConfirm(false);
  };

  const resetToSelect = () => {
    setPhase("select");
    setSelectedOp(null);
    setSelectedOption("");
    setResults([]);
    setTimeLeft(BURST_DURATION);
    setQuestionId(1);
    setUserInput("");
    setFlashColor("");
    setCurrentQuestion(null);
    setSessionSaved(false);
    setExitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ── Computed ─────────────────────────────────────────────────────────────

  const correctCount = results.filter((r) => r.isCorrect).length;
  const wrongCount = results.length - correctCount;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const timerPercent = (timeLeft / BURST_DURATION) * 100;
  const timerColor = timeLeft <= 10 ? "text-red-500" : timeLeft <= 20 ? "text-amber-500" : "text-emerald-400";

  // ── Render ───────────────────────────────────────────────────────────────

  // Selection phase
  if (phase === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bm-bg)", position: "relative", overflowX: "hidden" }}>
        {/* Atmospheric glow */}
        <div style={{
          position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 500, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(249,115,22,.07) 0%, rgba(123,92,229,.05) 50%, transparent 70%)",
          animation: "bm-bg-breathe 6s ease-in-out infinite"
        }} />
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: .3, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(249,115,22,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)"
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Hero header */}
          <div style={{ textAlign: "center", padding: "72px 24px 48px", position: "relative" }}>
            <div style={{ animation: "bm-lightning-in .5s cubic-bezier(.34,1.56,.64,1) both", marginBottom: 16 }}>
              <Zap style={{ width: 48, height: 48, color: "var(--bm-burst2)", display: "block", margin: "0 auto" }} />
            </div>
            <h1 style={{
              fontFamily: "var(--bm-fd)", fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800,
              letterSpacing: "-.04em", lineHeight: 1, margin: "0 0 12px",
              background: "linear-gradient(135deg, var(--bm-burst3) 0%, var(--bm-burst2) 35%, var(--bm-burst) 70%, #C2410C 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>Burst Mode</h1>
            <p style={{ fontFamily: "var(--bm-fb)", fontSize: 17, fontWeight: 300, color: "var(--bm-white2)", maxWidth: 460, margin: "0 auto 16px", lineHeight: 1.65 }}>
              60 seconds. Unlimited questions. Push your speed to the limit.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--bm-burstdim)", border: "1px solid rgba(249,115,22,.22)", borderRadius: 100, padding: "6px 16px", fontFamily: "var(--bm-fm)", fontSize: 12, color: "var(--bm-burst2)" }}>
              ⚡ 10 modes available · 60s each
            </div>
          </div>

          {/* Mode cards grid */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 16px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
            {(Object.entries(BURST_OPERATIONS) as [BurstOperationType, BurstConfig][]).map(
              ([key, config], index) => (
                <button
                  key={key}
                  onClick={() => handleSelectOperation(key)}
                  className="bm-mode-card"
                  style={{
                    background: "var(--bm-surf)", border: "1px solid var(--bm-bdr)", borderRadius: 18,
                    padding: "28px 16px", textAlign: "center", cursor: "pointer",
                    transition: "all .3s cubic-bezier(.4,0,.2,1)",
                    animation: `bm-fade-up .5s ease ${index * 0.05}s both`,
                    position: "relative", overflow: "hidden"
                  }}
                >
                  <div className="bm-card-accent" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--bm-burst), transparent)", opacity: 0, transition: "opacity .3s ease" }} />
                  <div className="bm-card-icon" style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 16px", background: "var(--bm-surf2)", border: "1px solid var(--bm-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, transition: "all .3s ease" }}>
                    {config.icon}
                  </div>
                  <div style={{ fontFamily: "var(--bm-fd)", fontSize: 16, fontWeight: 700, color: "var(--bm-white)", marginBottom: 6, lineHeight: 1.2 }}>{config.label}</div>
                  <div style={{ fontFamily: "var(--bm-fb)", fontSize: 12, fontWeight: 300, color: "var(--bm-muted)", lineHeight: 1.5 }}>{config.description}</div>
                </button>
              )
            )}
          </div>

          {/* Back link */}
          <div style={{ textAlign: "center", margin: "40px 0 24px" }}>
            <Link href="/dashboard">
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--bm-fb)", fontSize: 14, fontWeight: 500, color: "var(--bm-muted)", textDecoration: "none", cursor: "pointer", transition: "color .2s, gap .2s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLSpanElement; el.style.color = "var(--bm-white2)"; el.style.gap = "12px"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLSpanElement; el.style.color = "var(--bm-muted)"; el.style.gap = "8px"; }}
              >
                ← Back to Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Config phase
  if (phase === "config" && selectedOp) {
    const config = BURST_OPERATIONS[selectedOp];
    return (
      <div style={{ minHeight: "100vh", background: "var(--bm-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>
        {/* Backdrop atmosphere */}
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(16px)", animation: "bm-fade-in .2s ease both" }} />

        {/* Modal card */}
        <div style={{ position: "relative", maxWidth: 480, width: "100%", background: "var(--bm-surf)", border: "1px solid var(--bm-bdr2)", borderRadius: 24, overflow: "hidden", animation: "bm-scale-in .28s cubic-bezier(.4,0,.2,1) both", boxShadow: "0 40px 100px rgba(0,0,0,.55), 0 0 60px rgba(249,115,22,.04)" }}>
          {/* Top accent bar */}
          <div style={{ height: 3, background: "linear-gradient(90deg, var(--bm-burst), var(--bm-burst2), transparent)" }} />

          {/* Header */}
          <div style={{ padding: "28px 28px 20px", textAlign: "center", position: "relative" }}>
            <button
              onClick={resetToSelect}
              style={{ position: "absolute", top: 20, right: 20, width: 32, height: 32, borderRadius: 9, background: "var(--bm-surf2)", border: "1px solid var(--bm-bdr)", color: "var(--bm-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, lineHeight: 1, transition: "all .2s" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(239,68,68,.1)"; b.style.borderColor = "rgba(239,68,68,.25)"; b.style.color = "var(--bm-red)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--bm-surf2)"; b.style.borderColor = "var(--bm-bdr)"; b.style.color = "var(--bm-muted)"; }}
            >×</button>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{config.icon}</div>
            <h2 style={{ fontFamily: "var(--bm-fd)", fontSize: 24, fontWeight: 800, letterSpacing: "-.03em", color: "var(--bm-white)", margin: "0 0 4px" }}>{config.label}</h2>
            <p style={{ fontFamily: "var(--bm-fb)", fontSize: 14, fontWeight: 300, color: "var(--bm-muted)", margin: 0 }}>{config.description}</p>
          </div>

          {/* Difficulty section */}
          <div style={{ padding: "0 24px 8px" }}>
            <div style={{ fontFamily: "var(--bm-fm)", fontSize: 10, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--bm-muted)", marginBottom: 12 }}>Choose Difficulty</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {config.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedOption(opt.value)}
                  className={`bm-diff-btn${selectedOption === opt.value ? " selected" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ margin: "16px 24px", background: "rgba(123,92,229,.06)", border: "1px solid rgba(123,92,229,.14)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Flame style={{ width: 16, height: 16, color: "var(--bm-burst2)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--bm-fd)", fontSize: 14, fontWeight: 700, color: "var(--bm-burst2)" }}>How it works</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <Clock style={{ width: 14, height: 14, color: "var(--bm-purple2)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: "var(--bm-fb)", fontSize: 13, color: "var(--bm-white2)", lineHeight: 1.5 }}>60-second countdown timer</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <Zap style={{ width: 14, height: 14, color: "var(--bm-purple2)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: "var(--bm-fb)", fontSize: 13, color: "var(--bm-white2)", lineHeight: 1.5 }}>Answer as many questions as possible</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Trophy style={{ width: 14, height: 14, color: "var(--bm-purple2)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: "var(--bm-fb)", fontSize: 13, color: "var(--bm-white2)", lineHeight: 1.5 }}>See your final scorecard when time's up</span>
            </div>
          </div>

          {/* Start button */}
          <div style={{ margin: "16px 24px 24px" }}>
            <button
              onClick={startCountdown}
              className="bm-burst-pulse"
              style={{ width: "100%", background: "linear-gradient(135deg, var(--bm-burst) 0%, #C2410C 100%)", border: "none", borderRadius: 14, padding: 17, color: "white", fontFamily: "var(--bm-fd)", fontSize: 17, fontWeight: 800, letterSpacing: "-.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 8px 32px rgba(249,115,22,.3), inset 0 1px 0 rgba(255,255,255,.1)", cursor: "pointer", transition: "all .25s ease" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-3px)"; b.style.boxShadow = "0 16px 48px rgba(249,115,22,.45), inset 0 1px 0 rgba(255,255,255,.12)"; b.style.animation = "none"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ""; b.style.boxShadow = "0 8px 32px rgba(249,115,22,.3), inset 0 1px 0 rgba(255,255,255,.1)"; b.style.animation = ""; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            >
              <Play style={{ width: 20, height: 20 }} />
              START BURST
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Countdown phase
  if (phase === "countdown") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bm-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div
          key={countdownNum}
          style={{ fontFamily: "var(--bm-fm)", fontSize: "clamp(120px,20vw,200px)", fontWeight: 800, lineHeight: 1, color: "var(--bm-burst2)", animation: "bm-scale-in .35s cubic-bezier(.34,1.56,.64,1) both", letterSpacing: "-.04em" }}
        >
          {countdownNum}
        </div>
        <p style={{ fontFamily: "var(--bm-fb)", fontSize: 18, fontWeight: 500, color: "var(--bm-muted)", letterSpacing: ".16em", textTransform: "uppercase", marginTop: 24, animation: "bm-fade-up .4s ease .1s both" }}>
          Get Ready
        </p>
      </div>
    );
  }

  // Playing phase
  if (phase === "playing" && currentQuestion) {
    const progressColor = timerPercent > 33
      ? "linear-gradient(90deg, var(--bm-green), #34D399)"
      : timerPercent > 15
      ? "linear-gradient(90deg, var(--bm-gold), #FCD34D)"
      : "linear-gradient(90deg, var(--bm-red), #F87171)";
    const timerStyle: React.CSSProperties = timeLeft <= 10
      ? { color: "var(--bm-red)", transition: "color .5s ease", animation: "bm-timer-shake .4s ease" }
      : timeLeft <= 20
      ? { color: "var(--bm-gold)", transition: "color .5s ease" }
      : { color: "var(--bm-green)", transition: "color .5s ease" };

    return (
      <div style={{ minHeight: "100vh", background: "var(--bm-bg)", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden" }}>
        {/* Background atmosphere */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 50% 60%, rgba(249,115,22,.04) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Red vignette when < 10s */}
        {timeLeft < 10 && (
          <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(239,68,68,.04) 100%)", pointerEvents: "none", zIndex: 1 }} />
        )}

        {/* Exit confirmation modal */}
        {exitConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.75)", backdropFilter: "blur(16px)" }}>
            <div style={{ background: "var(--bm-surf)", border: "1px solid var(--bm-bdr2)", borderRadius: 24, padding: 36, maxWidth: 360, width: "calc(100vw - 48px)", boxShadow: "0 40px 80px rgba(0,0,0,.5)", animation: "bm-scale-in .2s ease both" }}>
              <AlertTriangle style={{ width: 44, height: 44, color: "var(--bm-gold)", display: "block", margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "var(--bm-fd)", fontSize: 22, fontWeight: 800, textAlign: "center", color: "var(--bm-white)", margin: "0 0 8px" }}>Exit Burst Mode?</h3>
              <p style={{ fontFamily: "var(--bm-fb)", fontSize: 14, color: "var(--bm-muted)", textAlign: "center", margin: "0 0 24px", lineHeight: 1.6 }}>
                {results.length > 0
                  ? `You've answered ${results.length} question${results.length !== 1 ? "s" : ""}. Your progress will be saved.`
                  : "Your session will be lost."}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setExitConfirm(false)}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--bm-bdr2)", background: "var(--bm-surf2)", fontFamily: "var(--bm-fb)", fontSize: 14, fontWeight: 600, color: "var(--bm-white2)", cursor: "pointer", transition: "all .2s" }}
                >Continue</button>
                <button
                  onClick={confirmExit}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, var(--bm-red), #B91C1C)", fontFamily: "var(--bm-fb)", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer", transition: "all .2s" }}
                >Exit</button>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,7,15,.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--bm-bdr)", height: 64, display: "grid", gridTemplateColumns: "80px 1fr 120px", alignItems: "center", padding: "0 24px" }}>
          {/* Back button */}
          <button
            onClick={handleBack}
            style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bm-surf2)", border: "1px solid var(--bm-bdr)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bm-muted)", cursor: "pointer", transition: "all .2s" }}
            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(249,115,22,.3)"; b.style.color = "var(--bm-burst2)"; b.style.background = "rgba(249,115,22,.06)"; }}
            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--bm-bdr)"; b.style.color = "var(--bm-muted)"; b.style.background = "var(--bm-surf2)"; }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>

          {/* Timer */}
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "var(--bm-fm)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-.02em", display: "inline-block", ...timerStyle }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Live scores */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: "var(--bm-fm)", fontSize: 16, fontWeight: 800, color: "var(--bm-green)" }}>{correctCount}</span>
              <CheckCircle2 style={{ width: 13, height: 13, color: "var(--bm-green)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: "var(--bm-fm)", fontSize: 16, fontWeight: 800, color: "var(--bm-red)" }}>{wrongCount}</span>
              <XCircle style={{ width: 13, height: 13, color: "var(--bm-red)" }} />
            </div>
          </div>
        </div>

        {/* Progress drain bar */}
        <div style={{ height: 4, position: "relative", overflow: "hidden", background: "var(--bm-bdr2)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${timerPercent}%`, background: progressColor, transition: "background .8s ease, width 1s linear", boxShadow: "2px 0 12px currentColor" }} />
        </div>

        {/* Question area */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", position: "relative", zIndex: 2 }}>
          <div style={{ width: "100%", maxWidth: 600 }}>
            {/* Question label */}
            <div style={{ fontFamily: "var(--bm-fm)", fontSize: 11, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--bm-muted)", marginBottom: 20 }}>
              QUESTION <span style={{ color: "var(--bm-burst2)" }}>#{results.length + 1}</span>
            </div>

            {/* Question expression */}
            <div
              key={currentQuestion.id}
              className="bm-number-slam"
              style={{ fontFamily: "var(--bm-fm)", fontSize: "clamp(56px, 10vw, 110px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "0 2px" }}
            >
              {currentQuestion.text.replace(" =", "").split(" ").map((token, i) => {
                const isOp = ["÷", "×", "+", "−", "-", "of"].includes(token);
                return (
                  <span key={i} style={{ color: isOp ? "var(--bm-burst2)" : "var(--bm-white)", fontSize: isOp ? "0.65em" : undefined, verticalAlign: isOp ? "middle" : undefined, display: "inline-block", margin: "0 2px" }}>
                    {token}
                  </span>
                );
              })}
            </div>

            {/* Answer input row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 500, margin: "0 auto" }}>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={userInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || v === "-" || v === "." || v === "-." || /^-?\d*\.?\d*$/.test(v)) {
                    setUserInput(v);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="?"
                autoComplete="off"
                className={`bm-input${flashColor === "green" ? " correct" : flashColor === "red" ? " wrong" : ""}`}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSubmit}
                className="bm-skip-btn"
                style={{ all: "unset", width: 52, height: 52, borderRadius: 14, background: "var(--bm-surf2)", border: "1px solid var(--bm-bdr2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: "var(--bm-muted)", transition: "all .2s ease", flexShrink: 0, boxSizing: "border-box" } as React.CSSProperties}
                onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(249,115,22,.08)"; b.style.borderColor = "rgba(249,115,22,.3)"; b.style.color = "var(--bm-burst2)"; }}
                onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--bm-surf2)"; b.style.borderColor = "var(--bm-bdr2)"; b.style.color = "var(--bm-muted)"; }}
                onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(.92)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results phase
  if (phase === "results") {
    const config = selectedOp ? BURST_OPERATIONS[selectedOp] : null;
    const avgTime = results.length > 0 ? results.reduce((s, r) => s + r.timeTaken, 0) / results.length : 0;
    const bestStreak = (() => {
      let max = 0, cur = 0;
      for (const r of results) {
        if (r.isCorrect) { cur++; max = Math.max(max, cur); } else { cur = 0; }
      }
      return max;
    })();

    return (
      <div style={{ minHeight: "100vh", background: "var(--bm-bg)", position: "relative" }}>
        {/* Background glow */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 15%, rgba(249,115,22,.06) 0%, rgba(123,92,229,.04) 50%, transparent 70%)" }} />

        <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 60px", position: "relative", zIndex: 1 }}>
          {/* Completion header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div className="bm-scale-in" style={{ width: 68, height: 68, borderRadius: 20, margin: "0 auto 20px", background: "linear-gradient(135deg, var(--bm-burst), #C2410C)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(249,115,22,.35), 0 0 0 1px rgba(249,115,22,.2)" }}>
              <Trophy style={{ width: 32, height: 32, color: "white" }} />
            </div>
            <h1 style={{ fontFamily: "var(--bm-fd)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--bm-white)", margin: "0 0 6px" }}>Burst Complete!</h1>
            <p style={{ fontFamily: "var(--bm-fm)", fontSize: 13, color: "var(--bm-muted)", letterSpacing: ".04em", margin: 0 }}>
              <span style={{ color: "var(--bm-burst2)" }}>{config?.label}</span>
              <span style={{ color: "var(--bm-muted)" }}> · </span>
              <span style={{ color: "var(--bm-white2)" }}>{BURST_OPERATIONS[selectedOp!]?.options.find(o => o.value === selectedOption)?.label}</span>
            </p>
          </div>

          {/* Primary stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { value: results.length, label: "Attempted", bg: "rgba(123,92,229,.08)", border: "rgba(123,92,229,.2)", color: "var(--bm-white)", delay: 0 },
              { value: correctCount, label: "Correct", bg: "rgba(16,185,129,.08)", border: "rgba(16,185,129,.2)", color: "var(--bm-green)", delay: 0.07 },
              { value: wrongCount, label: "Wrong", bg: "rgba(239,68,68,.08)", border: "rgba(239,68,68,.2)", color: "var(--bm-red)", delay: 0.14 },
              { value: `${accuracy}%`, label: "Accuracy", bg: "rgba(249,115,22,.08)", border: "rgba(249,115,22,.22)", color: "var(--bm-burst2)", delay: 0.21 },
            ].map(({ value, label, bg, border, color, delay }) => (
              <div key={label} className="bm-count-up" style={{ borderRadius: 18, padding: "22px 12px", textAlign: "center", background: bg, border: `1px solid ${border}`, animationDelay: `${delay}s` }}>
                <div style={{ fontFamily: "var(--bm-fm)", fontSize: "clamp(26px,3vw,36px)", fontWeight: 800, color }}>{value}</div>
                <div style={{ fontFamily: "var(--bm-fm)", fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--bm-muted)", marginTop: 8 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ background: "var(--bm-surf)", border: "1px solid var(--bm-bdr)", borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(123,92,229,.12)", border: "1px solid rgba(123,92,229,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock style={{ width: 18, height: 18, color: "var(--bm-purple2)" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--bm-fm)", fontSize: 22, fontWeight: 800, color: "var(--bm-white)" }}>{avgTime.toFixed(1)}s</div>
                <div style={{ fontFamily: "var(--bm-fb)", fontSize: 12, color: "var(--bm-muted)", marginTop: 2 }}>Avg. per question</div>
              </div>
            </div>
            <div style={{ background: "var(--bm-surf)", border: "1px solid var(--bm-bdr)", borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Flame style={{ width: 18, height: 18, color: "var(--bm-gold)" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--bm-fm)", fontSize: 22, fontWeight: 800, color: "var(--bm-white)" }}>{bestStreak}</div>
                <div style={{ fontFamily: "var(--bm-fb)", fontSize: 12, color: "var(--bm-muted)", marginTop: 2 }}>Best streak</div>
              </div>
            </div>
          </div>

          {/* Accuracy bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--bm-fm)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--bm-muted)" }}>ACCURACY</span>
              <span style={{ fontFamily: "var(--bm-fm)", fontSize: 13, fontWeight: 700, color: "var(--bm-white2)" }}>{accuracy}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--bm-bdr2)", overflow: "hidden" }}>
              <div style={{ borderRadius: 3, height: "100%", background: "linear-gradient(90deg, var(--bm-red) 0%, var(--bm-gold) 45%, var(--bm-green) 100%)", width: `${accuracy}%`, transition: "width 1.4s cubic-bezier(.4,0,.2,1) .4s", boxShadow: accuracy > 70 ? "0 0 12px rgba(16,185,129,.2)" : undefined }} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => { setResults([]); setTimeLeft(BURST_DURATION); setSessionSaved(false); startCountdown(); }}
              style={{ background: "linear-gradient(135deg, var(--bm-burst), #C2410C)", border: "none", borderRadius: 12, padding: "14px 10px", color: "white", fontFamily: "var(--bm-fd)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(249,115,22,.22)", cursor: "pointer", transition: "all .25s ease" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-2px)"; b.style.boxShadow = "0 12px 36px rgba(249,115,22,.35)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ""; b.style.boxShadow = "0 6px 20px rgba(249,115,22,.22)"; }}
            >
              <RotateCcw style={{ width: 15, height: 15 }} />Burst Again
            </button>
            <button
              onClick={() => { /* navigate to dashboard */ window.location.href = "/dashboard"; }}
              style={{ background: "linear-gradient(135deg, var(--bm-purple), #5535C0)", border: "none", borderRadius: 12, padding: "14px 10px", color: "white", fontFamily: "var(--bm-fd)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(123,92,229,.2)", cursor: "pointer", transition: "all .25s ease" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-2px)"; b.style.boxShadow = "0 12px 32px rgba(123,92,229,.32)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ""; b.style.boxShadow = "0 6px 20px rgba(123,92,229,.2)"; }}
            >
              <Trophy style={{ width: 15, height: 15 }} />Dashboard
            </button>
            <button
              onClick={resetToSelect}
              style={{ background: "var(--bm-surf2)", border: "1px solid var(--bm-bdr2)", borderRadius: 12, padding: "14px 10px", color: "var(--bm-white2)", fontFamily: "var(--bm-fb)", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(249,115,22,.3)"; b.style.color = "var(--bm-white)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--bm-bdr2)"; b.style.color = "var(--bm-white2)"; }}
            >
              <Zap style={{ width: 15, height: 15 }} />New Mode
            </button>
          </div>

          {/* Saving indicator */}
          {saving && (
            <div style={{ textAlign: "center", fontFamily: "var(--bm-fb)", fontSize: 13, color: "var(--bm-muted)", marginBottom: 16, animation: "bm-bg-breathe 1s ease infinite" }}>
              Saving your session…
            </div>
          )}

          {/* Question review */}
          <div style={{ background: "var(--bm-surf)", border: "1px solid var(--bm-bdr)", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bm-bdr)" }}>
              <span style={{ fontFamily: "var(--bm-fd)", fontSize: 17, fontWeight: 700, color: "var(--bm-white)" }}>Question Review</span>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="bm-fade-up"
                  style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center", padding: "14px 20px", borderBottom: i < results.length - 1 ? "1px solid var(--bm-bdr)" : undefined, transition: "background .15s ease", borderLeft: r.isCorrect ? "2px solid rgba(16,185,129,.15)" : "2px solid rgba(239,68,68,.2)", paddingLeft: 18, animationDelay: `${i * 0.04}s` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {r.isCorrect
                      ? <CheckCircle2 style={{ width: 16, height: 16, color: "var(--bm-green)", flexShrink: 0 }} />
                      : <XCircle style={{ width: 16, height: 16, color: "var(--bm-red)", flexShrink: 0 }} />
                    }
                    <span style={{ fontFamily: "var(--bm-fm)", fontSize: 14, fontWeight: 600, color: "var(--bm-white)" }}>{r.question.text}</span>
                  </div>
                  {!r.isCorrect && (
                    <span style={{ fontFamily: "var(--bm-fm)", fontSize: 13, fontWeight: 600, color: "var(--bm-red)", textDecoration: "line-through" }}>{r.userAnswer ?? "—"}</span>
                  )}
                  <span style={{ fontFamily: "var(--bm-fm)", fontSize: 13, fontWeight: 700, color: r.isCorrect ? "var(--bm-green)" : "var(--bm-muted)" }}>{r.question.answer}</span>
                  <span style={{ fontFamily: "var(--bm-fm)", fontSize: 11, color: "var(--bm-muted)", whiteSpace: "nowrap" }}>{r.timeTaken.toFixed(1)}s</span>
                </div>
              ))}
              {results.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--bm-fb)", color: "var(--bm-muted)" }}>No questions attempted</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
