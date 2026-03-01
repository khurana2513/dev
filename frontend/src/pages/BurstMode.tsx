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
  const [exitConfirm, setExitConfirm] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  // Tracks the last N question texts to prevent immediate repeats
  const recentTextsRef = useRef<string[]>([]);

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
    if (phase !== "results" || results.length === 0 || sessionSaved || saving) return;
    saveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const saveSession = async () => {
    if (!selectedOp || results.length === 0) return;
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
      <div className="min-h-screen bg-background pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="relative">
                <Zap className="w-10 h-10 text-amber-500" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                BURST MODE
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              60 seconds. Unlimited questions. Push your speed to the limit.
            </p>
          </div>

          {/* Operations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {(Object.entries(BURST_OPERATIONS) as [BurstOperationType, BurstConfig][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleSelectOperation(key)}
                  className="group relative bg-card border-2 border-border hover:border-primary/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className={`text-3xl mb-3 transition-transform group-hover:scale-110`}>
                    {config.icon}
                  </div>
                  <h3 className="font-bold text-sm text-card-foreground mb-1">{config.label}</h3>
                  <p className="text-[11px] text-muted-foreground leading-tight">{config.description}</p>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity`} />
                </button>
              )
            )}
          </div>

          {/* Back link */}
          <div className="text-center mt-10">
            <Link href="/dashboard">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
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
      <div className="min-h-screen bg-background pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <button onClick={resetToSelect} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">{config.icon}</div>
              <h2 className="text-2xl font-black text-card-foreground">{config.label}</h2>
              <p className="text-muted-foreground mt-1">{config.description}</p>
            </div>

            {/* Difficulty options */}
            <div className="space-y-2 mb-8">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Choose Difficulty
              </label>
              <div className="grid grid-cols-2 gap-2">
                {config.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedOption(opt.value)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                      selectedOption === opt.value
                        ? "border-primary bg-primary/10 text-primary shadow-md"
                        : "border-border text-card-foreground hover:border-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="bg-primary/5 rounded-2xl p-5 mb-8 border border-primary/10">
              <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4" /> How it works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary/70 flex-shrink-0" />
                  60-second countdown timer
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 text-primary/70 flex-shrink-0" />
                  Answer as many questions as possible
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 mt-0.5 text-primary/70 flex-shrink-0" />
                  See your final scorecard when time's up
                </li>
              </ul>
            </div>

            {/* Start button */}
            <button
              onClick={startCountdown}
              className={`w-full py-4 rounded-2xl text-lg font-black uppercase tracking-widest text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3`}
            >
              <Play className="w-6 h-6" />
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div
              key={countdownNum}
              className="text-[12rem] font-black text-primary animate-[pulse_0.8s_ease-in-out]"
              style={{ lineHeight: 1 }}
            >
              {countdownNum}
            </div>
          </div>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest">
            Get Ready
          </p>
        </div>
      </div>
    );
  }

  // Playing phase
  if (phase === "playing" && currentQuestion) {
    const config = selectedOp ? BURST_OPERATIONS[selectedOp] : null;
    return (
      <div
        className={`min-h-screen flex flex-col transition-colors duration-150 ${
          flashColor === "green"
            ? "bg-emerald-50 dark:bg-emerald-950/30"
            : flashColor === "red"
            ? "bg-red-50 dark:bg-red-950/30"
            : "bg-background"
        }`}
      >
        {/* Exit confirmation modal */}
        {exitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border-2 border-border rounded-3xl p-8 max-w-sm mx-4 shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-center text-card-foreground mb-2">Exit Burst Mode?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {results.length > 0
                  ? `You've answered ${results.length} question${results.length !== 1 ? "s" : ""}. Your progress will be saved.`
                  : "Your session will be lost."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setExitConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-border text-card-foreground hover:bg-secondary transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="w-full px-4 sm:px-8 pt-4 sm:pt-6">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* Timer */}
            <div className="flex items-center gap-3">
              <div className={`text-4xl sm:text-5xl font-black tabular-nums ${timerColor} transition-colors`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Score counter */}
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="text-emerald-500">{correctCount} ✓</span>
              <span className="text-red-400">{wrongCount} ✗</span>
            </div>
          </div>

          {/* Timer progress bar */}
          <div className="max-w-3xl mx-auto mt-3">
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 10
                    ? "bg-red-500"
                    : timeLeft <= 20
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-2xl text-center">
            {/* Question number */}
            <div className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest">
              Question #{results.length + 1}
            </div>

            {/* Question text */}
            <div className="text-5xl sm:text-7xl lg:text-8xl font-black text-foreground mb-10 tracking-tight leading-none">
              {currentQuestion.text.replace(" =", "")}
            </div>

            {/* Answer input */}
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
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
                className="flex-1 text-center text-4xl sm:text-5xl font-black py-4 px-6 bg-card border-3 border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30"
              />
              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className={`p-5 rounded-2xl transition-all ${
                  userInput.trim()
                    ? `bg-gradient-to-r ${config?.gradient || "from-primary to-primary"} text-white shadow-lg hover:shadow-xl hover:scale-105`
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                }`}
              >
                <ChevronRight className="w-8 h-8" />
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
      <div className="min-h-screen bg-background pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-xl">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-1">Burst Complete!</h1>
            <p className="text-muted-foreground">
              {config?.label} • {BURST_OPERATIONS[selectedOp!]?.options.find(o => o.value === selectedOption)?.label}
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-card border-2 border-border rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-foreground">{results.length}</div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Attempted</div>
            </div>
            <div className="bg-card border-2 border-emerald-500/20 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-emerald-500">{correctCount}</div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Correct</div>
            </div>
            <div className="bg-card border-2 border-red-500/20 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-red-400">{wrongCount}</div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Wrong</div>
            </div>
            <div className="bg-card border-2 border-primary/20 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-primary">{accuracy}%</div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Accuracy</div>
            </div>
          </div>

          {/* Extra stats */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-muted-foreground" />
              <div>
                <div className="text-lg font-black text-foreground">{avgTime.toFixed(1)}s</div>
                <div className="text-[11px] text-muted-foreground font-medium">Avg. per question</div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-lg font-black text-foreground">{bestStreak}</div>
                <div className="text-[11px] text-muted-foreground font-medium">Best streak</div>
              </div>
            </div>
          </div>

          {/* Saving indicator */}
          {saving && (
            <div className="text-center text-sm text-muted-foreground mb-4 animate-pulse">
              Saving your session...
            </div>
          )}

          {/* Question review */}
          <div className="bg-card border-2 border-border rounded-3xl overflow-hidden mb-8">
            <div className="p-5 border-b border-border">
              <h3 className="font-bold text-card-foreground">Question Review</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-0 ${
                    r.isCorrect ? "bg-emerald-500/5" : "bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {r.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <span className="font-mono text-sm font-bold text-card-foreground">{r.question.text}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {!r.isCorrect && (
                      <span className="text-red-400 line-through">{r.userAnswer ?? "—"}</span>
                    )}
                    <span className={r.isCorrect ? "text-emerald-600 font-bold" : "text-muted-foreground font-medium"}>
                      {r.question.answer}
                    </span>
                    <span className="text-muted-foreground text-xs">{r.timeTaken.toFixed(1)}s</span>
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No questions attempted</div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setResults([]);
                setTimeLeft(BURST_DURATION);
                setSessionSaved(false);
                startCountdown();
              }}
              className={`flex-1 py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${config?.gradient || "from-primary to-primary"} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
            <button
              onClick={resetToSelect}
              className="flex-1 py-4 rounded-2xl font-bold border-2 border-border text-card-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              New Operation
            </button>
          </div>

          <div className="text-center mt-6">
            <Link href="/dashboard">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                Go to Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
