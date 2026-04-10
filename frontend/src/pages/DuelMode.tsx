/**
 * DuelMode – Live real-time math competition between multiple players.
 *
 * Phases
 * ──────
 * entry         → choose Create Room or Join Room
 * host-select   → pick operation type (10 modes + Mix)
 * host-config   → pick difficulty (single) or build combo set (mix)
 * creating      → spinner while POST /duel/rooms resolves
 * lobby         → room code, player list, Start button (host only)
 * join-input    → enter 6-char room code
 * joining       → spinner while POST /duel/rooms/{code}/join resolves
 * countdown     → 3 → 2 → 1 → GO!  (server-driven via WebSocket)
 * playing       → 60-second timed game + live leaderboard overlay
 * waiting       → player finished, waiting for others
 * results       → podium animation + full rankings table
 *
 * Question sync
 * ─────────────
 * The server picks one random integer `seed` when the room is created.
 * Every client pre-generates 60 questions using a deterministic PRNG that
 * mirrors the Python implementation in backend/math_generator.py exactly.
 * No questions travel over the network; each client independently produces
 * the same sequence from the shared seed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { savePracticeSession, PracticeSessionData } from "../lib/userApi";

import {
  BurstOperationType, SelectedCombo, DuelConfig,
  DuelPlayer, DuelRoomState, DuelRanking, DuelMsg,
  createDuelRoom, getDuelRoom, joinDuelRoom, requestWsTicket, buildDuelWsUrl,
} from "../lib/duelApi";

// ── Local types ──────────────────────────────────────────────────────────────

type DuelPhase =
  | "entry" | "host-select" | "host-config" | "creating"
  | "lobby" | "join-input" | "joining"
  | "countdown" | "playing" | "waiting" | "results";

type HostConfigStep = "select" | "single-config" | "mix";

interface LiveScore { correct: number; wrong: number; }

interface DuelQuestion {
  id:       number;
  text:     string;
  answer:   number;
  operands: number[];
  operator: string;
}

interface DuelResult {
  question:   DuelQuestion;
  userAnswer: number | null;
  isCorrect:  boolean;
  timeTaken:  number;
}

// ── BurstMode config mirror ──────────────────────────────────────────────────

interface BurstConfig {
  label:       string;
  icon:        string;
  accentClass: string;   // Tailwind text-color class used for card border/glow
  options:     { label: string; value: string }[];
}

const BURST_OPERATIONS: Record<BurstOperationType, BurstConfig> = {
  burst_tables:               { label: "Tables",                icon: "📊", accentClass: "violet",  options: [{ label: "1 × 1",        value: "1x1"  }] },
  burst_multiplication:       { label: "Multiplication",       icon: "✖️",  accentClass: "blue",    options: [{ label: "2 × 1", value: "2x1" }, { label: "3 × 1", value: "3x1" }, { label: "4 × 1", value: "4x1" }, { label: "2 × 2", value: "2x2" }, { label: "3 × 2", value: "3x2" }, { label: "4 × 2", value: "4x2" }] },
  burst_division:             { label: "Division",             icon: "➗",  accentClass: "emerald", options: [{ label: "2 ÷ 1", value: "2/1" }, { label: "3 ÷ 1", value: "3/1" }, { label: "4 ÷ 1", value: "4/1" }, { label: "3 ÷ 2", value: "3/2" }, { label: "4 ÷ 2", value: "4/2" }, { label: "4 ÷ 3", value: "4/3" }] },
  burst_decimal_multiplication:{ label: "Decimal ×",           icon: "🔢",  accentClass: "amber",   options: [{ label: "1 × 0", value: "1x0" }, { label: "1 × 1", value: "1x1" }, { label: "2 × 1", value: "2x1" }, { label: "3 × 1", value: "3x1" }, { label: "2 × 2", value: "2x2" }, { label: "3 × 2", value: "3x2" }] },
  burst_decimal_division:     { label: "Decimal ÷",           icon: "📐",  accentClass: "rose",    options: [{ label: "2 ÷ 1", value: "2/1" }, { label: "3 ÷ 1", value: "3/1" }, { label: "4 ÷ 1", value: "4/1" }, { label: "3 ÷ 2", value: "3/2" }, { label: "4 ÷ 2", value: "4/2" }, { label: "4 ÷ 3", value: "4/3" }] },
  burst_lcm:                  { label: "LCM",                  icon: "🔗",  accentClass: "indigo",  options: [{ label: "(1,1)", value: "1,1" }, { label: "(2,1)", value: "2,1" }, { label: "(2,2)", value: "2,2" }, { label: "(3,2)", value: "3,2" }] },
  burst_gcd:                  { label: "GCD",                  icon: "🎯",  accentClass: "sky",     options: [{ label: "(1,1)", value: "1,1" }, { label: "(2,1)", value: "2,1" }, { label: "(2,2)", value: "2,2" }, { label: "(3,2)", value: "3,2" }] },
  burst_square_root:          { label: "Square Root",          icon: "√",   accentClass: "fuchsia", options: [{ label: "2 dig", value: "2" }, { label: "3 dig", value: "3" }, { label: "4 dig", value: "4" }, { label: "5 dig", value: "5" }, { label: "6 dig", value: "6" }, { label: "7 dig", value: "7" }, { label: "8 dig", value: "8" }] },
  burst_cube_root:            { label: "Cube Root",            icon: "∛",   accentClass: "lime",    options: [{ label: "3 dig", value: "3" }, { label: "4 dig", value: "4" }, { label: "5 dig", value: "5" }, { label: "6 dig", value: "6" }, { label: "7 dig", value: "7" }, { label: "8 dig", value: "8" }] },
  burst_percentage:           { label: "Percentage",           icon: "%",   accentClass: "teal",    options: [{ label: "2-digit", value: "2" }, { label: "3-digit", value: "3" }, { label: "4-digit", value: "4" }, { label: "5-digit", value: "5" }, { label: "6-digit", value: "6" }] },
};

// ── Seeded deterministic PRNG (mirrors backend/math_generator.py exactly) ────

type RNG = () => number;

function makeSeededRng(roomSeed: number, qIdx: number): RNG {
  // initial_state = (seed * 7919 + question_id * 9973) % 2^31
  let state = (roomSeed * 7919 + qIdx * 9973) % 2_147_483_648;
  let calls = 0;
  return () => {
    calls++;
    // LCG: matches Python's generate_seeded_rng exactly
    state = (state * 1_664_525 + 1_013_904_223 + calls * 17) % 4_294_967_296;
    return (state % 2_147_483_648) / 2_147_483_648;
  };
}

// ── Seeded math helpers ────────────────────────────────────────────────────────

function sRandInt(min: number, max: number, rng: RNG): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function sGenNum(digits: number, rng: RNG): number {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return sRandInt(min, max, rng);
}
function sPick<T>(arr: T[], rng: RNG): T {
  return arr[sRandInt(0, arr.length - 1, rng)];
}
function sgcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function slcm(a: number, b: number): number { return Math.abs(a * b) / sgcd(a, b); }

const NICE_PCT = [5, 10, 12, 15, 20, 25, 30, 33, 40, 50, 60, 66, 70, 75, 80, 90];

function generateDuelQuestion(opType: BurstOperationType, option: string, id: number, rng: RNG): DuelQuestion {
  switch (opType) {
    case "burst_tables": {
      const a = sRandInt(1, 9, rng), b = sRandInt(1, 9, rng);
      return { id, text: `${a} × ${b} =`, answer: a * b, operands: [a, b], operator: "×" };
    }
    case "burst_multiplication": {
      const [md, ml] = option.split("x").map(Number);
      const a = sGenNum(md, rng), b = sGenNum(ml, rng);
      return { id, text: `${a} × ${b} =`, answer: a * b, operands: [a, b], operator: "×" };
    }
    case "burst_division": {
      const [dd, dv] = option.split("/").map(Number);
      const dvdMin = Math.pow(10, dd - 1), dvdMax = Math.pow(10, dd) - 1;
      const divMin = Math.pow(10, dv - 1), divMax = Math.pow(10, dv) - 1;
      let divisor = sRandInt(divMin, divMax, rng);
      let qMin = Math.ceil(dvdMin / divisor), qMax = Math.floor(dvdMax / divisor);
      for (let i = 0; i < 10 && qMin > qMax; i++) { divisor = sRandInt(divMin, divMax, rng); qMin = Math.ceil(dvdMin / divisor); qMax = Math.floor(dvdMax / divisor); }
      const quotient = sRandInt(qMin, qMax, rng);
      return { id, text: `${quotient * divisor} ÷ ${divisor} =`, answer: quotient, operands: [quotient * divisor, divisor], operator: "÷" };
    }
    case "burst_decimal_multiplication": {
      const [mcd, mld] = option.split("x").map(Number);
      const aDec = rng() < 0.15 ? 0 : sRandInt(1, 9, rng);
      const a = sGenNum(Math.max(1, mcd), rng) + aDec / 10;
      if (mld === 0) { const b = sRandInt(2, 9, rng); return { id, text: `${a.toFixed(1)} × ${b} =`, answer: Math.round(a * b * 100) / 100, operands: [a, b], operator: "×" }; }
      const bDec = rng() < 0.15 ? 0 : sRandInt(1, 9, rng);
      const b = sGenNum(Math.max(1, mld), rng) + bDec / 10;
      return { id, text: `${a.toFixed(1)} × ${b.toFixed(1)} =`, answer: Math.round(a * b * 100) / 100, operands: [a, b], operator: "×" };
    }
    case "burst_decimal_division": {
      const [dvd, dvs] = option.split("/").map(Number);
      const dvdMin = Math.pow(10, dvd - 1), dvdMax = Math.pow(10, dvd) - 1;
      const divMin = Math.pow(10, dvs - 1), divMax = Math.pow(10, dvs) - 1;
      let divisor = sRandInt(divMin, divMax, rng);
      let qMin = Math.ceil(dvdMin / divisor), qMax = Math.floor(dvdMax / divisor);
      for (let i = 0; i < 10 && qMin > qMax; i++) { divisor = sRandInt(divMin, divMax, rng); qMin = Math.ceil(dvdMin / divisor); qMax = Math.floor(dvdMax / divisor); }
      const q = sRandInt(qMin, qMax, rng);
      return { id, text: `${q * divisor} ÷ ${divisor} =`, answer: q, operands: [q * divisor, divisor], operator: "÷" };
    }
    case "burst_lcm": {
      const [d1, d2] = option.split(",").map(Number);
      let a = sGenNum(d1, rng), b = sGenNum(d2, rng);
      if (rng() < 0.6) {
        const cf = sPick([2, 3, 4, 5, 6], rng);
        a = Math.max(cf, Math.round(sGenNum(d1, rng) / cf) * cf);
        b = Math.max(cf, Math.round(sGenNum(d2, rng) / cf) * cf);
        const aMax = Math.pow(10, d1) - 1, bMax = Math.pow(10, d2) - 1;
        if (a > aMax) a = aMax - (aMax % cf);
        if (b > bMax) b = bMax - (bMax % cf);
      }
      if (a === b) b = b < Math.pow(10, d2) - 1 ? b + 1 : Math.max(1, Math.pow(10, d2 - 1));
      return { id, text: `LCM(${a}, ${b}) =`, answer: slcm(a, b), operands: [a, b], operator: "LCM" };
    }
    case "burst_gcd": {
      const [d1, d2] = option.split(",").map(Number);
      let a: number, b: number;
      const maxG = Math.min(9, Math.pow(10, Math.min(d1, d2) - 1) || 9);
      if (maxG >= 2 && rng() < 0.65) {
        const g  = sRandInt(2, maxG, rng);
        const cp = [1, 2, 3, 5, 7, 11, 13, 17, 19];
        const p  = sPick(cp, rng), q = sPick(cp.filter(x => x !== p), rng);
        a = g * p; b = g * q;
        if (String(a).length !== d1 || String(b).length !== d2) { a = sGenNum(d1, rng); b = sGenNum(d2, rng); }
      } else { a = sGenNum(d1, rng); b = sGenNum(d2, rng); }
      if (a === b) b = b < Math.pow(10, d2) - 1 ? b + 1 : Math.max(1, Math.pow(10, d2 - 1));
      return { id, text: `GCD(${a}, ${b}) =`, answer: sgcd(a, b), operands: [a, b], operator: "GCD" };
    }
    case "burst_square_root": {
      const rd = parseInt(option);
      const minR = Math.ceil(Math.sqrt(Math.pow(10, rd - 1))), maxR = Math.floor(Math.sqrt(Math.pow(10, rd) - 1));
      const root = sRandInt(minR, maxR, rng);
      return { id, text: `√${root * root} =`, answer: root, operands: [root * root], operator: "√" };
    }
    case "burst_cube_root": {
      const rd = parseInt(option);
      const minR = Math.ceil(Math.cbrt(Math.pow(10, rd - 1))), maxR = Math.floor(Math.cbrt(Math.pow(10, rd) - 1));
      const root = sRandInt(minR, maxR, rng);
      return { id, text: `∛${root * root * root} =`, answer: root, operands: [root * root * root], operator: "∛" };
    }
    case "burst_percentage": {
      const numDigits = parseInt(option);
      const pct = rng() < 0.45 ? sPick(NICE_PCT, rng) : sRandInt(1, 99, rng);
      const num = sGenNum(numDigits, rng);
      return { id, text: `${pct}% of ${num} =`, answer: Math.round((pct / 100) * num * 100) / 100, operands: [pct, num], operator: "%" };
    }
    default:
      return { id, text: "1 + 1 =", answer: 2, operands: [1, 1], operator: "+" };
  }
}

function getDuelQuestion(config: DuelConfig, qIdx: number, roomSeed: number): DuelQuestion {
  const rng = makeSeededRng(roomSeed, qIdx);
  if (config.type === "mix" && config.combos && config.combos.length > 0) {
    const i     = sRandInt(0, config.combos.length - 1, rng);
    const combo = config.combos[i];
    return generateDuelQuestion(combo.opType, combo.optionValue, qIdx, rng);
  }
  return generateDuelQuestion(config.opType!, config.optionValue!, qIdx, rng);
}

function preGenQuestions(config: DuelConfig, seed: number, count = 60): DuelQuestion[] {
  return Array.from({ length: count }, (_, i) => getDuelQuestion(config, i, seed));
}

function compareAnswers(user: number, correct: number): boolean {
  if (Number.isInteger(correct)) return user === correct;
  return Math.abs(user - correct) < 0.01;
}

// ── Avatar color helper ───────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#db2777", "#dc2626", "#0891b2", "#65a30d",
];
function avatarColor(id: number): string { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

// ── Sound helpers (Web Audio API) ────────────────────────────────────────────

function playBeep(freq: number, vol: number, dur: number): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), (dur + 0.1) * 1000);
  } catch (_) { /* AudioContext may be unavailable */ }
}

// ── Utility ────────────────────────────────────────────────────────────────────

// ── Main component ─────────────────────────────────────────────────────────────

export default function DuelMode() {
  const { user } = useAuth();
  const { code: urlCode } = useParams<{ code?: string }>();
  const [, setLocation]   = useLocation();

  // ── Phase / nav ─────────────────────────────────────────────────────────
  const [phase,      setPhase]     = useState<DuelPhase>(() => urlCode ? "joining" : "entry");
  const [hostStep,   setHostStep]  = useState<HostConfigStep>("select");
  const [selectedOp,     setSelectedOp]     = useState<BurstOperationType | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [selectedCombos, setSelectedCombos] = useState<SelectedCombo[]>([]);

  // ── Room state ──────────────────────────────────────────────────────────
  const [room,     setRoom]     = useState<DuelRoomState | null>(null);
  const [joinCode, setJoinCode] = useState<string>(urlCode?.toUpperCase() ?? "");
  const [error,    setError]    = useState<string>("");

  // ── WebSocket ───────────────────────────────────────────────────────────
  const wsRef          = useRef<WebSocket | null>(null);
  const [isConnected,  setIsConnected] = useState(false);
  const pingRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Game state ──────────────────────────────────────────────────────────
  const [countdownN,    setCountdownN]    = useState<number | null>(null);
  const [gameSeed,      setGameSeed]      = useState<number | null>(null);
  const [gameStartTs,   setGameStartTs]   = useState<number | null>(null);
  const [timeLeft,      setTimeLeft]      = useState(60);
  const [allQs,         setAllQs]         = useState<DuelQuestion[]>([]);
  const [qIndex,        setQIndex]        = useState(0);
  const [inputValue,    setInputValue]    = useState("");
  const [correctCount,  setCorrectCount]  = useState(0);
  const [wrongCount,    setWrongCount]    = useState(0);
  const [flashColor,    setFlashColor]    = useState<"" | "correct" | "wrong">("");
  const [liveScores,    setLiveScores]    = useState<Record<number, LiveScore>>({});
  const [finishedIds,   setFinishedIds]   = useState<Set<number>>(new Set());
  const [finalRankings, setFinalRankings] = useState<DuelRanking[] | null>(null);
  const [showBoard,     setShowBoard]     = useState(false);
  const [myPoints,      setMyPoints]      = useState(0);

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef        = useRef<HTMLInputElement | null>(null);
  const correctRef      = useRef(0);
  const wrongRef        = useRef(0);
  const resultsRef      = useRef<DuelResult[]>([]);
  const qStartRef       = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());
  const pendingScoreRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── CSS injection (animations) ──────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "dm-styles";
    style.textContent = `
      @keyframes dm-pop   { 0%{transform:scale(1)}  50%{transform:scale(1.05)} 100%{transform:scale(1)} }
      @keyframes dm-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
      @keyframes dm-cd    { from{transform:scale(2.6);opacity:0} to{transform:scale(1);opacity:1} }
      @keyframes dm-go    { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
      @keyframes dm-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      @keyframes dm-rise  { from{transform:translateY(80px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes dm-confetti { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(720deg);opacity:0} }
      @keyframes dm-slide-r { from{transform:translateX(24px);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes dm-glow-correct { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,.25)} }
      @keyframes dm-glow-wrong   { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}  50%{box-shadow:0 0 0 8px rgba(239,68,68,.25)} }
      .dm-flash-correct { animation: dm-glow-correct .35s ease both; }
      .dm-flash-wrong   { animation: dm-glow-wrong   .35s ease both, dm-shake .35s ease both; }
      .dm-score-row     { transition: transform .3s ease, background .2s ease; }
      .dm-score-row:hover { background: rgba(255,255,255,.04) !important; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("dm-styles")?.remove(); };
  }, []);

  // ── Auto-join from URL code ─────────────────────────────────────────────
  useEffect(() => {
    if (urlCode && phase === "joining") {
      handleJoin(urlCode.toUpperCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket connect / disconnect ──────────────────────────────────────
  const connectWs = useCallback(async (code: string) => {
    try {
      const { ticket } = await requestWsTicket(code);
      const url = buildDuelWsUrl(code, ticket);
      const ws  = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        // heartbeat PING every 20s
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "PING", payload: {} }));
        }, 20_000);
      };

      ws.onmessage = (e) => handleWsMessage(JSON.parse(e.data) as DuelMsg);

      ws.onerror = () => {
        setError("Connection error. Please check your internet and try again.");
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingRef.current) clearInterval(pingRef.current);
      };

      wsRef.current = ws;
    } catch (err) {
      setError("Unable to connect to the duel server. Please try again.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnectWs = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    if (pingRef.current) clearInterval(pingRef.current);
  }, []);

  useEffect(() => () => disconnectWs(), [disconnectWs]);

  // ── WS message handler ──────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg: DuelMsg) => {
    switch (msg.type) {
      case "ROOM_STATE": {
        const r = msg.payload;
        setRoom(r);
        if (r.state === "playing" && r.start_ts && r.seed) {
          // Reconnected mid-game: resume
          const elapsed = Date.now() - r.start_ts * 1000;
          const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
          startGame(r.config, r.seed, r.start_ts * 1000, remaining);
        } else if (r.state === "lobby" || r.state === "countdown") {
          setPhase("lobby");
        } else if (r.state === "results") {
          // Already finished when we (re)connected
          setPhase("results");
        }
        break;
      }
      case "PLAYER_JOINED": {
        setRoom(prev => prev ? {
          ...prev,
          players: prev.players.some(p => p.id === msg.payload.player.id)
            ? prev.players
            : [...prev.players, { ...msg.payload.player, joined_at: Date.now() / 1000, is_ready: true, is_finished: false }],
        } : prev);
        break;
      }
      case "PLAYER_LEFT": {
        setRoom(prev => prev ? {
          ...prev,
          players:  msg.payload.players,
          host_id:  msg.payload.newHostId ?? prev.host_id,
        } : prev);
        break;
      }
      case "COUNTDOWN": {
        const n = msg.payload.n;
        setCountdownN(n);
        playBeep(n === 3 ? 440 : n === 2 ? 480 : 520, 0.15, 0.18);
        setPhase("countdown");
        break;
      }
      case "GAME_START": {
        const { seed, startTimestamp } = msg.payload;
        playBeep(660, 0.2, 0.28);
        setRoom(prev => prev ? { ...prev, state: "playing", seed } : prev);
        if (room) startGame(room.config, seed, startTimestamp, 60);
        else {
          setGameSeed(seed);
          setGameStartTs(startTimestamp);
        }
        break;
      }
      case "LIVE_SCORE": {
        const { userId, correct, wrong } = msg.payload;
        setLiveScores(prev => ({ ...prev, [userId]: { correct, wrong } }));
        break;
      }
      case "PLAYER_FINISHED": {
        setFinishedIds(prev => new Set([...prev, msg.payload.userId]));
        break;
      }
      case "ALL_FINISHED": {
        setFinalRankings(msg.payload.rankings);
        setPhase("results");
        clearTimers();
        break;
      }
      case "ERROR": {
        setError(msg.payload.message);
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Keep handler fresh
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = (e) => handleWsMessage(JSON.parse(e.data) as DuelMsg);
    }
  }, [handleWsMessage]);

  // ── Game start ──────────────────────────────────────────────────────────
  const startGame = useCallback((config: DuelConfig, seed: number, startTs: number, startingTime: number) => {
    const qs = preGenQuestions(config, seed);
    setAllQs(qs);
    setQIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    correctRef.current = 0;
    wrongRef.current   = 0;
    resultsRef.current = [];
    setInputValue("");
    setTimeLeft(startingTime);
    setGameSeed(seed);
    setGameStartTs(startTs);
    qStartRef.current       = Date.now();
    sessionStartRef.current = Date.now();
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);

    // Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          onTimerExpired();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle GAME_START when room wasn't set yet
  useEffect(() => {
    if (gameSeed && gameStartTs && room && phase !== "playing") {
      startGame(room.config, gameSeed, gameStartTs, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSeed, gameStartTs, room]);

  function clearTimers() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (pendingScoreRef.current) { clearTimeout(pendingScoreRef.current); pendingScoreRef.current = null; }
  }

  // ── Timer expired: submit results ───────────────────────────────────────
  const onTimerExpired = useCallback(() => {
    setPhase("waiting");
    const pts = correctRef.current * 10;
    setMyPoints(pts);

    // Send FINISH to server
    wsRef.current?.send(JSON.stringify({
      type:    "FINISH",
      payload: { correct: correctRef.current, wrong: wrongRef.current, points: pts },
    }));

    // Save to practice_sessions for gamification pipeline
    if (user && room) {
      const opType = room.config.type === "mix" ? "burst_mix" : (room.config.opType ?? "burst_tables");
      const sessionData: PracticeSessionData = {
        operation_type:  `${opType}_duel`,
        difficulty_mode: "duel",
        total_questions: resultsRef.current.length,
        correct_answers: correctRef.current,
        wrong_answers:   wrongRef.current,
        accuracy:        resultsRef.current.length > 0
          ? Math.round((correctRef.current / resultsRef.current.length) * 100)
          : 0,
        score:           correctRef.current,
        time_taken:      60,
        points_earned:   pts,
        preset_key:      room.config.optionValue ?? null,
        attempts:        resultsRef.current.map((r, i) => ({
          question_data:  { text: r.question.text, operands: r.question.operands, operator: r.question.operator },
          user_answer:    r.userAnswer,
          correct_answer: r.question.answer,
          is_correct:     r.isCorrect,
          time_taken:     r.timeTaken,
          question_number: i + 1,
        })),
      };
      savePracticeSession(sessionData).catch(() => {/* fire and forget */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, room]);

  // ── Answer submission ───────────────────────────────────────────────────
  function handleAnswer(value: string) {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return;
    const currentQ = allQs[qIndex];
    if (!currentQ) return;

    const isCorrect = compareAnswers(parsed, currentQ.answer);
    const timeTaken = (Date.now() - qStartRef.current) / 1000;

    resultsRef.current.push({ question: currentQ, userAnswer: parsed, isCorrect, timeTaken });

    if (isCorrect) {
      correctRef.current++;
      setCorrectCount(c => c + 1);
      setFlashColor("correct");
      playBeep(660, 0.12, 0.1);
    } else {
      wrongRef.current++;
      setWrongCount(w => w + 1);
      setFlashColor("wrong");
      playBeep(220, 0.1, 0.15);
    }
    setTimeout(() => setFlashColor(""), 350);

    // Advance to next question
    const nextIdx = qIndex + 1;
    if (nextIdx < allQs.length) {
      setQIndex(nextIdx);
      qStartRef.current = Date.now();
    }
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 20);

    // Throttled live score broadcast (max once per 1.5s)
    if (pendingScoreRef.current) clearTimeout(pendingScoreRef.current);
    pendingScoreRef.current = setTimeout(() => {
      wsRef.current?.send(JSON.stringify({
        type: "SCORE_UPDATE",
        payload: { correct: correctRef.current, wrong: wrongRef.current, points: correctRef.current * 10 },
      }));
    }, 1_500);
  }

  // ── Create room ─────────────────────────────────────────────────────────
  async function handleCreateRoom() {
    setPhase("creating");
    setError("");
    try {
      const config: DuelConfig = selectedCombos.length > 0
        ? { type: "mix", combos: selectedCombos }
        : { type: "single", opType: selectedOp!, optionValue: selectedOption };
      const newRoom = await createDuelRoom(config);
      setRoom(newRoom);
      setPhase("lobby");
      setLocation(`/duel/${newRoom.code}`);
      await connectWs(newRoom.code);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create room");
      setPhase("host-config");
    }
  }

  // ── Join room ───────────────────────────────────────────────────────────
  async function handleJoin(code: string) {
    const upperCode = code.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6);
    if (upperCode.length < 6) { setError("Please enter a 6-character room code"); return; }
    setPhase("joining");
    setError("");
    try {
      await joinDuelRoom(upperCode);
      const roomData = await getDuelRoom(upperCode);
      setRoom(roomData);
      setJoinCode(upperCode);
      setLocation(`/duel/${upperCode}`);
      setPhase("lobby");
      await connectWs(upperCode);
    } catch (e: any) {
      const msg = e?.message ?? "";
      setError(msg.includes("ROOM_FULL") ? "This room is full (max 8 players)" : msg.includes("in progress") ? "This game has already started" : msg.includes("not found") ? "Room not found. Check the code and try again." : "Failed to join room");
      setPhase("join-input");
    }
  }

  // ── Trigger countdown (host only) ──────────────────────────────────────
  function handleStart() {
    if (!room || !isConnected) return;
    wsRef.current?.send(JSON.stringify({ type: "START", payload: {} }));
  }

  // ── Play again (same config) ─────────────────────────────────────────────
  async function handlePlayAgain() {
    if (!room) return;
    disconnectWs();
    setPhase("creating");
    setError("");
    try {
      const newRoom = await createDuelRoom(room.config);
      setRoom(newRoom);
      setFinalRankings(null);
      setFinishedIds(new Set());
      setLiveScores({});
      setPhase("lobby");
      setLocation(`/duel/${newRoom.code}`);
      await connectWs(newRoom.code);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create room");
      setPhase("entry");
    }
  }

  function handleBack() {
    disconnectWs();
    clearTimers();
    setPhase("entry");
    setRoom(null);
    setFinalRankings(null);
    setFinishedIds(new Set());
    setLiveScores({});
    setLocation("/duel");
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (phase === "entry") return <EntryScreen onHost={() => setPhase("host-select")} onJoin={() => setPhase("join-input")} />;

  if (phase === "host-select") return (
    <HostSelectScreen
      onBack={() => setPhase("entry")}
      onSelectOp={op => { setSelectedOp(op); setSelectedOption(BURST_OPERATIONS[op].options[0].value); setHostStep("single-config"); setPhase("host-config"); }}
      onMix={() => { setSelectedCombos([]); setHostStep("mix"); setPhase("host-config"); }}
    />
  );

  if (phase === "host-config") return (
    <HostConfigScreen
      step={hostStep}
      selectedOp={selectedOp}
      selectedOption={selectedOption}
      selectedCombos={selectedCombos}
      onSetOption={setSelectedOption}
      onToggleCombo={(c) => setSelectedCombos(prev => prev.some(x => x.opType === c.opType && x.optionValue === c.optionValue) ? prev.filter(x => !(x.opType === c.opType && x.optionValue === c.optionValue)) : [...prev, c])}
      onBack={() => setPhase("host-select")}
      onCreate={handleCreateRoom}
    />
  );

  if (phase === "creating") return <LoadingScreen label="Creating your room…" />;
  if (phase === "joining")  return <LoadingScreen label="Joining the duel…" />;

  if (phase === "join-input") return (
    <JoinInputScreen
      value={joinCode}
      onChange={setJoinCode}
      onJoin={() => handleJoin(joinCode)}
      onBack={() => setPhase("entry")}
      error={error}
    />
  );

  if (phase === "lobby" && room) return (
    <LobbyScreen
      room={room}
      isHost={user?.id === room.host_id}
      isConnected={isConnected}
      myId={user?.id ?? 0}
      error={error}
      onStart={handleStart}
      onBack={handleBack}
    />
  );

  if (phase === "countdown") return <CountdownScreen n={countdownN} players={room?.players ?? []} />;

  if ((phase === "playing" || phase === "waiting") && allQs.length > 0) return (
    <PlayingScreen
      q={allQs[Math.min(qIndex, allQs.length - 1)]}
      timeLeft={timeLeft}
      correct={correctCount}
      wrong={wrongCount}
      flashColor={flashColor}
      inputValue={inputValue}
      onInput={setInputValue}
      onSubmit={handleAnswer}
      inputRef={inputRef}
      room={room}
      myId={user?.id ?? 0}
      liveScores={liveScores}
      finishedIds={finishedIds}
      showBoard={showBoard}
      onToggleBoard={() => setShowBoard(b => !b)}
      isWaiting={phase === "waiting"}
    />
  );

  if (phase === "results" && finalRankings) return (
    <ResultsScreen
      rankings={finalRankings}
      myId={user?.id ?? 0}
      myPoints={myPoints}
      room={room}
      onPlayAgain={handlePlayAgain}
      onBack={handleBack}
    />
  );

  // Fallback loading
  return <LoadingScreen label="Loading…" />;
}

// ════════════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════════════

// ── Shared styling helpers ───────────────────────────────────────────────────

const BG   = "min-h-screen bg-[#07070F] text-white flex flex-col items-center justify-center px-4 py-10";
const CARD = "bg-[#10101f] border border-white/[0.07] rounded-3xl";

// ── Loading ──────────────────────────────────────────────────────────────────

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className={BG}>
      <div className="w-14 h-14 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin mb-5" />
      <p className="text-white/50 text-sm font-medium">{label}</p>
    </div>
  );
}

// ── Entry ────────────────────────────────────────────────────────────────────

function EntryScreen({ onHost, onJoin }: { onHost: () => void; onJoin: () => void }) {
  return (
    <div className={BG} style={{ gap: 0 }}>
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">⚔️</div>
        <h1 className="text-4xl font-black tracking-tight mb-2" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          LIVE DUEL MODE
        </h1>
        <p className="text-white/40 text-sm">Real-time math battle · Same questions · Same timer · May the best mind win</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={onHost}
          className="flex-1 flex flex-col items-center gap-3 p-7 rounded-2xl cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg,rgba(249,115,22,.15),rgba(251,146,60,.08))", border: "1px solid rgba(249,115,22,.3)" }}
        >
          <span className="text-4xl">🏠</span>
          <span className="font-black text-lg text-orange-400">Create Room</span>
          <span className="text-white/40 text-xs text-center">Pick a game mode and invite friends</span>
        </button>
        <button
          onClick={onJoin}
          className="flex-1 flex flex-col items-center gap-3 p-7 rounded-2xl cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg,rgba(124,58,237,.15),rgba(139,92,246,.08))", border: "1px solid rgba(124,58,237,.3)" }}
        >
          <span className="text-4xl">🚪</span>
          <span className="font-black text-lg text-violet-400">Join Room</span>
          <span className="text-white/40 text-xs text-center">Enter a 6-letter code to join</span>
        </button>
      </div>
      <Link href="/burst" className="mt-8 text-white/30 text-xs hover:text-white/60 transition-colors">
        ← Back to Burst Mode
      </Link>
    </div>
  );
}

// ── Host — Operation Select ───────────────────────────────────────────────────

function HostSelectScreen({ onBack, onSelectOp, onMix }: {
  onBack: () => void;
  onSelectOp: (op: BurstOperationType) => void;
  onMix: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#07070F] text-white px-4 py-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          ← Back
        </button>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black mb-2">Choose Your Battle Mode</h2>
          <p className="text-white/40 text-sm">Select the math operation for tonight's duel</p>
        </div>

        {/* Mix Mode card */}
        <button
          onClick={onMix}
          className="w-full mb-4 p-5 rounded-2xl flex items-center gap-4 text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[.99]"
          style={{ background: "linear-gradient(135deg,rgba(249,115,22,.12),rgba(251,146,60,.06))", border: "1px solid rgba(249,115,22,.25)" }}
        >
          <span className="text-3xl">🎲</span>
          <div>
            <p className="font-black text-base text-orange-400">Multi-Op Mix</p>
            <p className="text-white/40 text-xs mt-0.5">Combine multiple operations — questions appear randomly</p>
          </div>
          <span className="ml-auto text-orange-400/60 text-xl">→</span>
        </button>

        {/* Operation grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.entries(BURST_OPERATIONS) as [BurstOperationType, BurstConfig][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onSelectOp(key)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.03] active:scale-[.97]"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <span className="text-2xl">{cfg.icon}</span>
              <span className="text-xs font-bold text-white/80 text-center leading-tight">{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Host — Config (Single or Mix) ────────────────────────────────────────────

function HostConfigScreen({
  step, selectedOp, selectedOption, selectedCombos,
  onSetOption, onToggleCombo, onBack, onCreate,
}: {
  step:            HostConfigStep;
  selectedOp:      BurstOperationType | null;
  selectedOption:  string;
  selectedCombos:  SelectedCombo[];
  onSetOption:     (v: string) => void;
  onToggleCombo:   (c: SelectedCombo) => void;
  onBack:          () => void;
  onCreate:        () => void;
}) {
  const canStart = step === "single-config"
    ? (selectedOp !== null && selectedOption !== "")
    : selectedCombos.length > 0;

  return (
    <div className="min-h-screen bg-[#07070F] text-white px-4 py-8 overflow-y-auto">
      <div className="max-w-xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">← Back</button>

        {step === "single-config" && selectedOp && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-2">{BURST_OPERATIONS[selectedOp].icon}</div>
              <h2 className="text-2xl font-black">{BURST_OPERATIONS[selectedOp].label}</h2>
              <p className="text-white/40 text-sm mt-1">Pick a difficulty level</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {BURST_OPERATIONS[selectedOp].options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onSetOption(opt.value)}
                  className="p-4 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background:  selectedOption === opt.value ? "rgba(249,115,22,.2)" : "rgba(255,255,255,.04)",
                    border:      `1px solid ${selectedOption === opt.value ? "rgba(249,115,22,.5)" : "rgba(255,255,255,.08)"}`,
                    color:       selectedOption === opt.value ? "#fb923c" : "rgba(255,255,255,.7)",
                    transform:   selectedOption === opt.value ? "scale(1.04)" : "scale(1)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "mix" && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-2">🎲</div>
              <h2 className="text-2xl font-black">Build Your Mix</h2>
              <p className="text-white/40 text-sm mt-1">Pick any combination — questions appear randomly during the 60s duel</p>
            </div>
            <div className="space-y-3 mb-8">
              {(Object.entries(BURST_OPERATIONS) as [BurstOperationType, BurstConfig][]).map(([key, cfg]) => (
                <div key={key} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,.06)" }}>
                  <div className="px-4 py-2 font-bold text-sm text-white/70 flex items-center gap-2" style={{ background: "rgba(255,255,255,.04)" }}>
                    <span>{cfg.icon}</span> {cfg.label}
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {cfg.options.map(opt => {
                      const active = selectedCombos.some(c => c.opType === key && c.optionValue === opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => onToggleCombo({ opType: key, optionValue: opt.value })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: active ? "rgba(249,115,22,.2)" : "rgba(255,255,255,.05)",
                            border:     `1px solid ${active ? "rgba(249,115,22,.4)" : "rgba(255,255,255,.08)"}`,
                            color:      active ? "#fb923c" : "rgba(255,255,255,.5)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onCreate}
          disabled={!canStart}
          className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all"
          style={{
            background: canStart ? "linear-gradient(135deg,#f97316,#fb923c)" : "rgba(255,255,255,.06)",
            color:      canStart ? "#fff" : "rgba(255,255,255,.3)",
            cursor:     canStart ? "pointer" : "not-allowed",
            boxShadow:  canStart ? "0 8px 32px rgba(249,115,22,.35)" : "none",
          }}
        >
          ⚔️ Create Duel Room
        </button>
      </div>
    </div>
  );
}

// ── Join — Code Input ────────────────────────────────────────────────────────

function JoinInputScreen({ value, onChange, onJoin, onBack, error }: {
  value:    string;
  onChange: (v: string) => void;
  onJoin:   () => void;
  onBack:   () => void;
  error:    string;
}) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !refs[i].current?.value && i > 0) refs[i - 1].current?.focus();
    if (e.key === "Enter") onJoin();
  }

  function handleChange(i: number, v: string) {
    const char = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    const chars = value.split("").concat(Array(6).fill("")).slice(0, 6);
    chars[i] = char;
    const newCode = chars.join("").toUpperCase();
    onChange(newCode);
    if (char && i < 5) refs[i + 1].current?.focus();
  }

  const chars = value.padEnd(6, " ").split("").slice(0, 6);

  return (
    <div className={BG}>
      <button onClick={onBack} className="self-start mb-6 text-white/40 hover:text-white text-sm transition-colors">← Back</button>
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🚪</div>
        <h2 className="text-3xl font-black mb-1">Join a Duel</h2>
        <p className="text-white/40 text-sm">Enter the 6-character room code from your friend</p>
      </div>

      {/* 6-box code input */}
      <div className="flex gap-3 mb-6">
        {chars.map((ch, i) => (
          <input
            key={i}
            ref={refs[i]}
            maxLength={1}
            value={ch.trim()}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={e => e.target.select()}
            className="w-12 h-14 text-center text-xl font-black uppercase rounded-xl outline-none transition-all focus:scale-105"
            style={{
              background:  "rgba(255,255,255,.06)",
              border:      ch.trim() ? "2px solid rgba(249,115,22,.6)" : "2px solid rgba(255,255,255,.1)",
              color:       ch.trim() ? "#fb923c" : "rgba(255,255,255,.3)",
              fontFamily:  "monospace",
            }}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

      <button
        onClick={onJoin}
        disabled={value.trim().length < 6}
        className="w-full max-w-xs py-4 rounded-2xl font-black text-base tracking-wide transition-all"
        style={{
          background: value.trim().length === 6 ? "linear-gradient(135deg,#7c3aed,#8b5cf6)" : "rgba(255,255,255,.06)",
          color:      value.trim().length === 6 ? "#fff" : "rgba(255,255,255,.3)",
          cursor:     value.trim().length === 6 ? "pointer" : "not-allowed",
          boxShadow:  value.trim().length === 6 ? "0 8px 32px rgba(124,58,237,.35)" : "none",
        }}
      >
        Join Game →
      </button>
    </div>
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────────

function LobbyScreen({ room, isHost, isConnected, myId, error, onStart, onBack }: {
  room:        DuelRoomState;
  isHost:      boolean;
  isConnected: boolean;
  myId:        number;
  error:       string;
  onStart:     () => void;
  onBack:      () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canStart = room.players.length >= 2 && isConnected;

  function copyCode() {
    navigator.clipboard.writeText(`${window.location.origin}/duel/${room.code}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className={BG} style={{ gap: 0 }}>
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">← Leave</button>

        {/* Room code display */}
        <div className={`${CARD} p-6 mb-4 text-center`}>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-3">Room Code</p>
          <div className="text-5xl font-black tracking-[0.2em] mb-4" style={{ fontFamily: "monospace", color: "#f97316", textShadow: "0 0 40px rgba(249,115,22,.4)" }}>
            {room.code}
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: copied ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.06)", border: `1px solid ${copied ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.1)"}`, color: copied ? "#4ade80" : "rgba(255,255,255,.6)" }}
          >
            {copied ? "✓ Copied!" : "📋 Copy invite link"}
          </button>
          <p className="text-white/25 text-xs mt-3">Share with friends so they can join</p>
        </div>

        {/* Config summary */}
        <div className={`${CARD} p-4 mb-4`}>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Battle Config</p>
          <p className="text-white/80 text-sm font-semibold">
            {room.config.type === "mix"
              ? `🎲 Mix — ${room.config.combos?.length ?? 0} combination${(room.config.combos?.length ?? 0) !== 1 ? "s" : ""}`
              : `${BURST_OPERATIONS[room.config.opType!]?.icon} ${BURST_OPERATIONS[room.config.opType!]?.label} · ${room.config.optionValue}`}
          </p>
          <p className="text-white/30 text-xs mt-1">60-second timer · Same questions for everyone</p>
        </div>

        {/* Players */}
        <div className={`${CARD} p-4 mb-5`}>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-3">
            Players ({room.players.length}/{8})
            {!isConnected && <span className="ml-2 text-yellow-400/70">Connecting…</span>}
          </p>
          <div className="space-y-2">
            {room.players.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: avatarColor(p.id) }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-white/80 text-sm font-medium flex-1">{p.name}{p.id === myId ? " (you)" : ""}</span>
                {p.id === room.host_id && <span className="text-xs px-2 py-0.5 rounded-full text-orange-400 font-bold" style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.2)" }}>Host</span>}
                <span className="text-green-400 text-xs">●</span>
              </div>
            ))}
            {room.players.length === 1 && (
              <div className="flex items-center gap-3 py-1 opacity-40">
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-sm text-white/30">?</div>
                <span className="text-white/30 text-sm italic">Waiting for friends…</span>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all"
            style={{
              background: canStart ? "linear-gradient(135deg,#f97316,#fb923c)" : "rgba(255,255,255,.06)",
              color:      canStart ? "#fff" : "rgba(255,255,255,.3)",
              cursor:     canStart ? "pointer" : "not-allowed",
              boxShadow:  canStart ? "0 8px 32px rgba(249,115,22,.35)" : "none",
              animation:  canStart ? "dm-pulse 2.5s ease infinite" : "none",
            }}
          >
            {canStart ? "⚔️ Start Duel!" : `Waiting for more players… (${room.players.length}/2 min)`}
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl text-center text-white/40 font-semibold text-sm" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
            ⏳ Waiting for host to start the game…
          </div>
        )}
      </div>
    </div>
  );
}

// ── Countdown ────────────────────────────────────────────────────────────────

function CountdownScreen({ n, players }: { n: number | null; players: DuelPlayer[] }) {
  return (
    <div className="min-h-screen bg-[#07070F] flex flex-col items-center justify-center gap-8" style={{ background: "radial-gradient(ellipse at center,rgba(249,115,22,.08) 0%,#07070F 70%)" }}>
      {n !== null && n > 0 ? (
        <div key={n} className="text-[clamp(120px,30vw,200px)] font-black leading-none" style={{ fontFamily: "monospace", color: "#f97316", textShadow: "0 0 80px rgba(249,115,22,.6)", animation: "dm-cd .5s cubic-bezier(.17,.67,.3,1.3) both" }}>
          {n}
        </div>
      ) : (
        <div key="go" className="text-[clamp(80px,20vw,140px)] font-black" style={{ color: "#4ade80", textShadow: "0 0 80px rgba(74,222,128,.6)", animation: "dm-go .4s cubic-bezier(.17,.67,.3,1.3) both" }}>
          GO!
        </div>
      )}
      <p className="text-white/40 text-sm tracking-widest uppercase font-bold">Get ready…</p>
      <div className="flex gap-3">
        {players.map(p => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ background: avatarColor(p.id) }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-white/40 text-xs">{p.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Playing ───────────────────────────────────────────────────────────────────

function PlayingScreen({
  q, timeLeft, correct, wrong, flashColor, inputValue, onInput, onSubmit,
  inputRef, room, myId, liveScores, finishedIds, showBoard, onToggleBoard, isWaiting,
}: {
  q:             DuelQuestion;
  timeLeft:      number;
  correct:       number;
  wrong:         number;
  flashColor:    "" | "correct" | "wrong";
  inputValue:    string;
  onInput:       (v: string) => void;
  onSubmit:      (v: string) => void;
  inputRef:      React.RefObject<HTMLInputElement>;
  room:          DuelRoomState | null;
  myId:          number;
  liveScores:    Record<number, LiveScore>;
  finishedIds:   Set<number>;
  showBoard:     boolean;
  onToggleBoard: () => void;
  isWaiting:     boolean;
}) {
  const timerPct = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 20 ? "#4ade80" : timeLeft > 10 ? "#fbbf24" : "#f87171";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isWaiting) onSubmit(inputValue);
  }

  // Build live leaderboard
  const allPlayers = room?.players ?? [];
  const scores: { id: number; name: string; correct: number; wrong: number; finished: boolean }[] =
    allPlayers.map(p => {
      const ls = liveScores[p.id] ?? { correct: 0, wrong: 0 };
      return { id: p.id, name: p.name, correct: (p.id === myId ? correct : ls.correct), wrong: (p.id === myId ? wrong : ls.wrong), finished: finishedIds.has(p.id) };
    }).sort((a, b) => b.correct - a.correct || a.wrong - b.wrong);

  const myRank = scores.findIndex(s => s.id === myId) + 1;

  return (
    <div className="min-h-screen bg-[#07070F] text-white flex flex-col" style={{ userSelect: "none" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm font-bold">⚔️ DUEL</span>
          {room && <span className="text-white/25 text-xs">{room.code}</span>}
        </div>
        {/* Timer */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="absolute inset-0 -rotate-90" width="48" height="48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke={timerColor}
              strokeWidth="4" strokeDasharray={`${timerPct * 1.2566} 125.66`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s linear, stroke .5s ease" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: timerColor }}>{timeLeft}</span>
        </div>
        {/* Leaderboard toggle */}
        <button onClick={onToggleBoard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)" }}>
          📊 {myRank > 0 ? `#${myRank}` : ""}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/[.04] shrink-0">
        <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, transition: "width 1s linear, background .5s ease", boxShadow: `2px 0 12px ${timerColor}` }} />
      </div>

      {/* Scores */}
      <div className="flex justify-center gap-8 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-green-400">{correct}</span>
          <span className="text-white/30 text-sm">✓</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-red-400">{wrong}</span>
          <span className="text-white/30 text-sm">✗</span>
        </div>
      </div>

      {/* Question area (expands) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
        {isWaiting ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mx-auto mb-4" />
            <p className="text-green-400 font-black text-lg mb-1">Finished! 🎉</p>
            <p className="text-white/40 text-sm">Waiting for others to finish…</p>
            <p className="text-white/60 font-bold mt-2">{correct} correct · {wrong} wrong</p>
          </div>
        ) : (
          <div className={`w-full max-w-sm ${flashColor === "correct" ? "dm-flash-correct" : flashColor === "wrong" ? "dm-flash-wrong" : ""}`}>
            <div className="text-center mb-8">
              <p className="text-[clamp(28px,7vw,52px)] font-black tracking-tight text-white leading-tight"
                style={{ fontFamily: "monospace", animation: "dm-pop .15s ease both" }}
                key={q.id}
              >
                {q.text}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={inputValue}
                onChange={e => onInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-center text-xl font-black rounded-2xl outline-none transition-all"
                style={{ background: "rgba(255,255,255,.06)", border: "2px solid rgba(255,255,255,.1)", color: "#fff", padding: "14px 12px", caretColor: "#f97316" }}
                placeholder="Answer"
                autoFocus
              />
              <button
                onClick={() => onSubmit(inputValue)}
                className="px-5 rounded-2xl font-black text-white text-lg transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", boxShadow: "0 4px 20px rgba(249,115,22,.35)" }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live leaderboard overlay */}
      {showBoard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={onToggleBoard}>
          <div className="w-full max-w-xs rounded-3xl overflow-hidden" style={{ background: "#10101f", border: "1px solid rgba(255,255,255,.1)" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/[.06]">
              <span className="font-black text-white">Live Scores</span>
              <button onClick={onToggleBoard} className="text-white/40 hover:text-white text-lg font-bold">✕</button>
            </div>
            <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
              {scores.map((s, i) => (
                <div key={s.id} className="dm-score-row flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: s.id === myId ? "rgba(249,115,22,.1)" : "transparent" }}>
                  <span className="text-white/30 text-xs w-4 text-center font-bold">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: avatarColor(s.id) }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-white/80 truncate">{s.name}{s.id === myId ? " (you)" : ""}</span>
                  <span className="text-green-400 font-black text-sm">{s.correct}</span>
                  {s.finished && <span className="text-xs text-white/30">✓done</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function ResultsScreen({ rankings, myId, myPoints, room, onPlayAgain, onBack }: {
  rankings:    DuelRanking[];
  myId:        number;
  myPoints:    number;
  room:        DuelRoomState | null;
  onPlayAgain: () => void;
  onBack:      () => void;
}) {
  const me      = rankings.find(r => r.userId === myId);
  const winner  = rankings[0];
  const top3    = rankings.slice(0, 3);
  const isWinner = me?.rank === 1;

  // Confetti dots (winner only)
  const confettiColors = ["#f97316","#fb923c","#fbbf24","#4ade80","#60a5fa","#a78bfa","#f472b6"];
  const confettiItems  = isWinner ? Array.from({ length: 28 }, (_, i) => ({
    color: confettiColors[i % confettiColors.length],
    left:  `${(i * 37 + 12) % 100}%`,
    delay: `${(i * 0.08) % 1.5}s`,
    size:  `${6 + (i % 5)}px`,
  })) : [];

  return (
    <div className="min-h-screen bg-[#07070F] text-white px-4 py-8 overflow-y-auto relative">
      {/* Confetti */}
      {confettiItems.map((c, i) => (
        <div key={i} className="absolute top-0 pointer-events-none" style={{ left: c.left, width: c.size, height: c.size, background: c.color, borderRadius: "2px", animation: `dm-confetti 1.8s ease-out ${c.delay} both` }} />
      ))}

      <div className="max-w-md mx-auto">
        {/* Winner banner */}
        <div className="text-center mb-8">
          {isWinner ? (
            <>
              <div className="text-5xl mb-3" style={{ animation: "dm-go .5s ease .2s both" }}>🏆</div>
              <h1 className="text-3xl font-black mb-1" style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                You Won!
              </h1>
              <p className="text-white/50 text-sm">⚡ Duel Champion · {me?.correct} correct answers</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black mb-1">{winner.name} wins! 🎉</h1>
              <p className="text-white/50 text-sm">You placed #{me?.rank ?? "—"} · {me?.correct ?? 0} correct answers</p>
            </>
          )}
        </div>

        {/* Podium (top 3) */}
        {top3.length >= 2 && (
          <div className="flex items-end justify-center gap-3 mb-8">
            {[
              top3[1] && { ...top3[1], podiumHeight: "h-24", delay: ".1s", medal: "🥈" },
              top3[0] && { ...top3[0], podiumHeight: "h-32", delay: ".0s", medal: "🥇" },
              top3[2] && { ...top3[2], podiumHeight: "h-16", delay: ".2s", medal: "🥉" },
            ].filter(Boolean).map((p, i) => p && (
              <div key={p.userId} className="flex flex-col items-center gap-2" style={{ animation: `dm-rise .5s ease ${p.delay} both` }}>
                <span className="text-2xl">{p.medal}</span>
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-base" style={{ background: avatarColor(p.userId) }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-white/70 font-semibold truncate max-w-[64px] text-center">{p.name.split(" ")[0]}</span>
                <div className={`w-20 ${p.podiumHeight} rounded-t-xl flex items-end justify-center pb-2`} style={{ background: i === 1 ? "rgba(251,191,36,.15)" : "rgba(255,255,255,.05)", border: `1px solid ${i === 1 ? "rgba(251,191,36,.25)" : "rgba(255,255,255,.08)"}` }}>
                  <span className="text-sm font-black text-white/60">{p.correct}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full rankings */}
        <div className={`${CARD} mb-6 overflow-hidden`}>
          <div className="px-4 py-3 border-b border-white/[.06]">
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Final Rankings</p>
          </div>
          <div className="divide-y divide-white/[.04]">
            {rankings.map(r => (
              <div key={r.userId} className="flex items-center gap-3 px-4 py-3" style={{ background: r.userId === myId ? "rgba(249,115,22,.06)" : "transparent" }}>
                <span className="text-lg w-7 text-center">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `${r.rank}`}</span>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ background: avatarColor(r.userId) }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-semibold text-white/80">{r.name}{r.userId === myId ? " (you)" : ""}</span>
                <div className="text-right">
                  <p className="text-sm font-black text-green-400">{r.correct} <span className="text-white/20 text-xs">✓</span></p>
                  <p className="text-xs text-red-400/70">{r.wrong} ✗</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My stats */}
        {me && (
          <div className={`${CARD} p-4 mb-6`} style={{ border: "1px solid rgba(249,115,22,.2)" }}>
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-3">Your Performance</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Correct", value: me.correct, color: "#4ade80" },
                { label: "Wrong",   value: me.wrong,   color: "#f87171" },
                { label: "Points",  value: myPoints,   color: "#fb923c" },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-white/30 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {room && (
            <button
              onClick={onPlayAgain}
              className="w-full py-4 rounded-2xl font-black text-base tracking-wide text-white transition-all hover:scale-[1.01] active:scale-[.99]"
              style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", boxShadow: "0 8px 32px rgba(249,115,22,.35)" }}
            >
              ⚔️ Play Again (same config)
            </button>
          )}
          <button
            onClick={onBack}
            className="w-full py-3 rounded-2xl font-semibold text-sm text-white/50 transition-all hover:text-white/80"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
          >
            ← Back to Duel Menu
          </button>
        </div>
      </div>
    </div>
  );
}
