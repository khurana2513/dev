import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  Info,
  Keyboard,
  Maximize,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import {
  applyMentalPreset,
  compareMentalAnswer,
  createDefaultMentalConfig,
  describeMentalConfig,
  formatMentalQuestion,
  generateMentalQuestions,
  getAddSubItems,
  getPresetKeyForConfig,
  isAddSubFamily,
  MENTAL_PRESETS,
  type AddSubQuestion,
  type IntlAddSubQuestion,
  type IntegerAddSubQuestion,
  type MentalQuestionConfig,
  type OperationType,
  type Question,
} from "../lib/mentalMathEngine";
import {
  formatParsedSpeechNumber,
  getSpeechRecognitionCtor,
  parseSpokenNumber,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from "../lib/speechToNumber";

type ArenaPhase = "setup" | "countdown" | "playing" | "results";
type ArenaStage = "idle" | "announce" | "revealing" | "answering" | "feedback" | "paused";
type OrderMode = "sequential" | "snake" | "random";
type VoiceMode = "auto" | "push_to_talk";
type MicPermission = "unknown" | "granted" | "denied";

interface ArenaSettings {
  rounds: number;
  questionsPerRound: number;
  orderMode: OrderMode;
  voiceEnabled: boolean;
  voiceMode: VoiceMode;
  timeLimitSeconds: number;
  addSubRevealSeconds: number;
  autoAdvanceMs: number;
  showCorrectOnWrong: boolean;
  allowKeyboardFallback: boolean;
}

interface ArenaAttempt {
  question: Question;
  transcript: string;
  parsedAnswer: number | null;
  answerDisplay: string;
  isCorrect: boolean;
  timedOut: boolean;
  skipped: boolean;
  pointsAwarded: number;
  round: number;
  slot: number;
  timeTakenMs: number;
}

interface ArenaPlayer {
  id: string;
  name: string;
  avatar: string;
  accent: string;
  config: MentalQuestionConfig;
  questions: Question[];
  attempts: ArenaAttempt[];
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  wrongCount: number;
}

interface ArenaTurn {
  round: number;
  slot: number;
  playerId: string;
  questionIndex: number;
  orderIndex: number;
}

interface FeedbackState {
  correct: boolean;
  title: string;
  subtitle: string;
  points: number;
}

const PLAYER_AVATARS = ["🦁", "🐯", "🦊", "🐼", "🦄", "🐸", "🐵", "🦈", "🦋", "🐢", "🐙", "🐧"];
const PLAYER_ACCENTS = ["#7C3AED", "#2563EB", "#059669", "#EA580C", "#DB2777", "#0891B2", "#CA8A04", "#DC2626"];

/** Minimum STT alternative confidence to accept (0–1). Lower values get rejected. */
const MIN_CONFIDENCE = 0.4;

const OPERATION_LABELS: Record<OperationType, string> = {
  multiplication: "Multiplication",
  division: "Division",
  add_sub: "Add / Subtract",
  decimal_multiplication: "Decimal Multiplication",
  decimal_division: "Decimal Division",
  integer_add_sub: "Integer Add / Subtract",
  intl_add_sub: "International Add / Subtract",
  lcm: "LCM",
  gcd: "GCD",
  square_root: "Square Root",
  cube_root: "Cube Root",
  percentage: "Percentage",
};

const OPERATION_OPTIONS = Object.entries(OPERATION_LABELS) as Array<[OperationType, string]>;

/** Quick-start class presets that auto-fill all players with a common configuration. */
interface ClassPreset {
  label: string;
  description: string;
  emoji: string;
  config: MentalQuestionConfig;
}
const CLASS_PRESETS: ClassPreset[] = [
  {
    label: "Junior — Add/Sub 2-digit",
    description: "Simple 2-digit add/subtract with 3 rows. Great for beginners.",
    emoji: "🌱",
    config: { ...createDefaultMentalConfig("add_sub"), addSubDigits: 2, addSubRows: 3 },
  },
  {
    label: "Junior — Multiply 2×1",
    description: "Two-digit by one-digit multiplication. Standard Level 1.",
    emoji: "✖️",
    config: { ...createDefaultMentalConfig("multiplication"), multiplicandDigits: 2, multiplierDigits: 1 },
  },
  {
    label: "Intermediate — Multiply 3×1",
    description: "Three-digit by one-digit. Builds speed and confidence.",
    emoji: "⚡",
    config: { ...createDefaultMentalConfig("multiplication"), multiplicandDigits: 3, multiplierDigits: 1 },
  },
  {
    label: "Senior — Multiply 4×2",
    description: "Four-digit by two-digit multiplication. Advanced-level challenge.",
    emoji: "🔥",
    config: { ...createDefaultMentalConfig("multiplication"), multiplicandDigits: 4, multiplierDigits: 2 },
  },
  {
    label: "Speed — Add/Sub 3-digit × 5 rows",
    description: "3-digit numbers with 5 rows. Fast abacus practice.",
    emoji: "🧮",
    config: { ...createDefaultMentalConfig("add_sub"), addSubDigits: 3, addSubRows: 5 },
  },
  {
    label: "Advanced — Integer Add/Sub",
    description: "Positive and negative integers. Watch for negative answers!",
    emoji: "➕➖",
    config: { ...createDefaultMentalConfig("integer_add_sub"), integerAddSubDigits: 2, integerAddSubRows: 4 },
  },
];

const DEFAULT_SETTINGS: ArenaSettings = {
  rounds: 3,
  questionsPerRound: 3,
  orderMode: "sequential",
  voiceEnabled: true,
  voiceMode: "auto",
  timeLimitSeconds: 12,
  addSubRevealSeconds: 1.1,
  autoAdvanceMs: 1400,
  showCorrectOnWrong: true,
  allowKeyboardFallback: true,
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
  }
  return copy;
}

function createPlayer(seedIndex: number, name = ""): ArenaPlayer {
  return {
    id: makeId(),
    name,
    avatar: PLAYER_AVATARS[seedIndex % PLAYER_AVATARS.length],
    accent: PLAYER_ACCENTS[seedIndex % PLAYER_ACCENTS.length],
    config: createDefaultMentalConfig("add_sub"),
    questions: [],
    attempts: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    wrongCount: 0,
  };
}

function formatMs(ms: number): string {
  if (ms <= 0) return "0.0s";
  return `${(ms / 1000).toFixed(1)}s`;
}

function ordinalPlace(index: number): string {
  if (index === 0) return "1st";
  if (index === 1) return "2nd";
  if (index === 2) return "3rd";
  return `${index + 1}th`;
}

function formatAccuracy(player: ArenaPlayer): string {
  const attempts = player.attempts.length;
  if (!attempts) return "0%";
  return `${Math.round((player.correctCount / attempts) * 100)}%`;
}

function getAverageTime(player: ArenaPlayer): number | null {
  const validAttempts = player.attempts.filter((attempt) => !attempt.timedOut && !attempt.skipped && attempt.parsedAnswer !== null);
  if (!validAttempts.length) return null;
  return validAttempts.reduce((total, attempt) => total + attempt.timeTakenMs, 0) / validAttempts.length;
}

function scoreTurn(isCorrect: boolean, timeLimitSeconds: number, timeTakenMs: number, streakBefore: number): number {
  if (!isCorrect) return 0;
  const base = 100;
  const timeTakenSeconds = timeTakenMs / 1000;
  const speedRatio = clamp((timeLimitSeconds - timeTakenSeconds) / Math.max(timeLimitSeconds, 1), 0, 1);
  const speedBonus = Math.round(speedRatio * 45);
  const streakBonus = Math.min(streakBefore, 4) * 15;
  return base + speedBonus + streakBonus;
}

function buildTurns(players: ArenaPlayer[], settings: ArenaSettings): ArenaTurn[] {
  const turns: ArenaTurn[] = [];
  const playerIds = players.map((player) => player.id);

  for (let roundIndex = 0; roundIndex < settings.rounds; roundIndex += 1) {
    for (let slotIndex = 0; slotIndex < settings.questionsPerRound; slotIndex += 1) {
      let order = [...playerIds];
      if (settings.orderMode === "snake" && roundIndex % 2 === 1) {
        order = [...order].reverse();
      }
      if (settings.orderMode === "random") {
        order = shuffle(order);
      }
      order.forEach((playerId, orderIndex) => {
        turns.push({
          round: roundIndex + 1,
          slot: slotIndex + 1,
          playerId,
          questionIndex: roundIndex * settings.questionsPerRound + slotIndex,
          orderIndex,
        });
      });
    }
  }

  return turns;
}

function updatePlayerConfig(
  config: MentalQuestionConfig,
  patch: Partial<MentalQuestionConfig>,
): MentalQuestionConfig {
  return {
    ...config,
    ...patch,
  };
}

/** Returns true when the question's answer can be negative. */
function canAnswerBeNegative(question: Question | null): boolean {
  if (!question) return false;
  return question.type === "integer_add_sub";
}

/** Returns true when the question's answer can have decimals. */
function canAnswerBeDecimal(question: Question | null): boolean {
  if (!question) return false;
  return question.type === "decimal_multiplication" || question.type === "decimal_division" || question.type === "percentage";
}

function NumericField({
  label,
  min,
  max,
  value,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const prevValue = useRef(value);

  // Sync from parent when the controlled value changes externally
  if (value !== prevValue.current) {
    prevValue.current = value;
    setRaw(String(value));
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="arena-label">{label}</span>
      <div className="arena-input-shell">
        <input
          className="arena-input"
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(event) => {
            const v = event.target.value;
            // Allow empty or partial numeric input while typing
            if (v === "" || v === "-" || v === ".") {
              setRaw(v);
              return;
            }
            if (!/^-?\d*\.?\d*$/.test(v)) return;
            setRaw(v);
            const parsed = Number(v);
            if (!Number.isNaN(parsed)) {
              const clamped = clamp(parsed, min, max);
              prevValue.current = clamped;
              onChange(clamped);
            }
          }}
          onBlur={() => {
            // On blur, snap to the valid clamped value
            const parsed = Number(raw);
            const final = Number.isNaN(parsed) ? min : clamp(parsed, min, max);
            setRaw(String(final));
            prevValue.current = final;
            onChange(final);
          }}
        />
        {suffix ? <span className="arena-input-suffix">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  tooltip,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  tooltip?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="arena-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {tooltip && (
          <span title={tooltip} style={{ cursor: "help", display: "inline-flex" }}>
            <Info size={11} style={{ color: "var(--arena-soft)", opacity: 0.8 }} />
          </span>
        )}
      </span>
      <select className="arena-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function ClassroomArena() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<ArenaPhase>("setup");
  const [stage, setStage] = useState<ArenaStage>("idle");
  const [players, setPlayers] = useState<ArenaPlayer[]>([
    createPlayer(0, ""),
    createPlayer(1, ""),
    createPlayer(2, ""),
  ]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [setupError, setSetupError] = useState("");
  const [settings, setSettings] = useState<ArenaSettings>(DEFAULT_SETTINGS);
  const [turns, setTurns] = useState<ArenaTurn[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState(settings.timeLimitSeconds * 1000);
  const [keyboardAnswer, setKeyboardAnswer] = useState("");
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [speechPreview, setSpeechPreview] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [currentRevealItem, setCurrentRevealItem] = useState("");
  const [revealedItems, setRevealedItems] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown");
  const [micStatus, setMicStatus] = useState("Ready to test the microphone.");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [applyToAllPending, setApplyToAllPending] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionShouldRestartRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerPhaseStartedAtRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const playersRef = useRef(players);
  const turnsRef = useRef(turns);
  const currentTurnIndexRef = useRef(currentTurnIndex);
  const settingsRef = useRef(settings);
  const phaseRef = useRef(phase);
  const stageRef = useRef(stage);
  const recognitionSessionRef = useRef(0);
  const recognitionFinalTranscriptRef = useRef("");
  const recognitionInterimTranscriptRef = useRef("");
  const recognitionBestCandidateRef = useRef<{ transcript: string; parsed: number | null; formatted: string | null }>({
    transcript: "",
    parsed: null,
    formatted: null,
  });
  const recognitionManualStopRef = useRef(false);
  const turnSubmissionRef = useRef(false);

  const speechSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);

  useEffect(() => {
    const initialName = ((user as { display_name?: string; name?: string } | null)?.display_name
      ?? (user as { name?: string } | null)?.name
      ?? "")
      .split(" ")[0]
      .trim();
    setPlayers((prev) => {
      if (!prev.length) return prev;
      if (prev[0].name.trim()) return prev;
      const next = [...prev];
      next[0] = { ...next[0], name: initialName };
      return next;
    });
  }, [user]);

  useEffect(() => {
    if (!selectedPlayerId && players.length) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { currentTurnIndexRef.current = currentTurnIndex; }, [currentTurnIndex]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  /* ─── Styles ─── */
  useEffect(() => {
    const styleId = "classroom-arena-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Fraunces:opsz,wght@9..144,600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');
      :root{
        --arena-bg:#050510;
        --arena-bg2:#0a0a1a;
        --arena-surface:rgba(12,14,28,0.92);
        --arena-surface-2:rgba(16,20,42,0.95);
        --arena-border:rgba(255,255,255,0.06);
        --arena-border-strong:rgba(255,255,255,0.12);
        --arena-text:#F0F2FF;
        --arena-muted:rgba(240,242,255,0.72);
        --arena-soft:rgba(240,242,255,0.40);
        --arena-gold:#F5A623;
        --arena-green:#34D399;
        --arena-red:#FF5A5A;
        --arena-blue:#38BDF8;
        --arena-violet:#6D5CFF;
        --arena-violet2:#8B7FFF;
        --arena-teal:#3ECFB4;
        --arena-pink:#EC4899;
        --arena-warm:#F5A623;
        --arena-shadow:0 24px 80px rgba(0,0,0,0.45);
        --font-d:'DM Sans',system-ui,sans-serif;
        --font-m:'JetBrains Mono','Menlo',monospace;
        --font-s:'Fraunces','Georgia',serif;
      }

      /* KEYFRAMES */
      @keyframes arena-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
      @keyframes arena-pop{0%{opacity:0;transform:scale(.82)}100%{opacity:1;transform:scale(1)}}
      @keyframes arena-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
      @keyframes arena-wave{0%,100%{transform:scaleY(.55)}50%{transform:scaleY(1)}}
      @keyframes arena-shine{0%{transform:translateX(-140%)}100%{transform:translateX(140%)}}
      @keyframes arena-urgency-pulse{
        0%,100%{box-shadow:0 0 0 0 rgba(255,90,90,0),0 24px 80px rgba(0,0,0,0.45)}
        50%{box-shadow:0 0 0 8px rgba(255,90,90,.25),0 0 60px 12px rgba(255,90,90,.12),0 24px 80px rgba(0,0,0,0.45)}
      }
      @keyframes arena-countdown-tick{0%{opacity:0;transform:scale(2.2)}12%{opacity:1;transform:scale(1)}90%{opacity:1;transform:scale(1)}100%{opacity:.2;transform:scale(.8)}}
      @keyframes arena-feedback-enter{0%{opacity:0;transform:scale(.8) translateY(20px)}100%{opacity:1;transform:none}}
      @keyframes arena-avatar-glow{0%,100%{filter:drop-shadow(0 0 12px var(--glow-color,rgba(109,92,255,.4)))}50%{filter:drop-shadow(0 0 28px var(--glow-color,rgba(109,92,255,.6)))}}
      @keyframes arena-reveal-flash{0%{opacity:0;transform:scale(1.5)}20%{opacity:1;transform:scale(1)}85%{opacity:1}100%{opacity:.7}}
      @keyframes arena-bar-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}

      /* SHELL */
      .arena-shell{
        min-height:100vh;
        background:
          radial-gradient(ellipse 100% 60% at 50% 0%, rgba(109,92,255,.10) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(62,207,180,.06) 0%, transparent 40%),
          radial-gradient(circle at 15% 85%, rgba(245,166,35,.04) 0%, transparent 35%),
          var(--arena-bg);
        color:var(--arena-text);
        font-family:var(--font-d);
      }

      /* CARDS */
      .arena-card{background:var(--arena-surface);border:1px solid var(--arena-border);box-shadow:var(--arena-shadow);backdrop-filter:blur(18px);border-radius:28px}
      .arena-card-urgency{animation:arena-urgency-pulse 1.2s ease-in-out infinite}

      /* TYPOGRAPHY */
      .arena-section-title{font:800 .72rem var(--font-m);letter-spacing:.16em;text-transform:uppercase;color:var(--arena-soft)}
      .arena-heading{font:800 clamp(2rem,4vw,4rem) var(--font-s);line-height:.95;letter-spacing:-.04em}
      .arena-copy{font:500 .95rem/1.7 var(--font-d);color:var(--arena-muted)}
      .arena-label{font:700 .68rem var(--font-m);letter-spacing:.14em;text-transform:uppercase;color:var(--arena-soft)}

      /* INPUTS */
      .arena-input-shell{display:flex;align-items:center;gap:10px;padding:0 14px;background:rgba(5,5,16,.78);border:1px solid var(--arena-border);border-radius:16px;transition:border-color .18s}
      .arena-input,.arena-select{width:100%;min-height:48px;background:transparent;border:none;outline:none;color:var(--arena-text);font:600 .95rem var(--font-d)}
      .arena-select{padding:0 14px;background:rgba(5,5,16,.78);border:1px solid var(--arena-border);border-radius:16px}
      .arena-input-shell:focus-within,.arena-select:focus{border-color:rgba(109,92,255,.55);box-shadow:0 0 0 3px rgba(109,92,255,.12)}
      .arena-input:focus{outline:none;box-shadow:none}
      .arena-select:focus{outline:none}
      .arena-input-suffix{font:700 .72rem var(--font-m);color:var(--arena-soft)}

      /* CHIPS */
      .arena-chip{border:1px solid var(--arena-border);background:rgba(255,255,255,.03);padding:10px 14px;border-radius:999px;color:var(--arena-muted);font:700 .75rem var(--font-m);cursor:pointer;transition:all .18s ease}
      .arena-chip:hover{background:rgba(255,255,255,.06);border-color:var(--arena-border-strong)}
      .arena-chip.active{background:linear-gradient(135deg, rgba(109,92,255,.22), rgba(62,207,180,.12));border-color:rgba(109,92,255,.45);color:var(--arena-text);box-shadow:0 14px 30px rgba(109,92,255,.10)}

      /* BUTTONS */
      .arena-button{display:inline-flex;align-items:center;justify-content:center;gap:10px;border:none;border-radius:18px;padding:14px 20px;font:800 .9rem var(--font-d);cursor:pointer;transition:transform .18s ease, box-shadow .18s ease, opacity .18s ease}
      .arena-button:hover{transform:translateY(-2px)}
      .arena-button:active{transform:translateY(0)}
      .arena-button.primary{background:linear-gradient(135deg, #6D5CFF, #4A3ADB);color:#fff;box-shadow:0 18px 48px rgba(109,92,255,.28),inset 0 1px 0 rgba(255,255,255,.12)}
      .arena-button.secondary{background:rgba(255,255,255,.05);color:var(--arena-text);border:1px solid var(--arena-border)}
      .arena-button.secondary:hover{background:rgba(255,255,255,.08)}
      .arena-button.success{background:linear-gradient(135deg, #059669, #34D399);color:#fff;box-shadow:0 18px 48px rgba(52,211,153,.22)}
      .arena-button.warn{background:linear-gradient(135deg, #EA580C, #F5A623);color:#fff;box-shadow:0 18px 48px rgba(245,166,35,.20)}
      .arena-button.danger{background:linear-gradient(135deg, #DC2626, #FF5A5A);color:#fff;box-shadow:0 18px 48px rgba(220,38,38,.20)}

      /* PLAYER CARDS */
      .arena-player-card{position:relative;overflow:hidden;border-radius:22px;padding:16px;background:rgba(255,255,255,.03);border:1px solid var(--arena-border);cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s,background .18s}
      .arena-player-card:hover{transform:translateY(-2px);border-color:var(--arena-border-strong);background:rgba(255,255,255,.05)}
      .arena-player-card.active{border-color:rgba(109,92,255,.40);box-shadow:0 18px 42px rgba(109,92,255,.10);background:rgba(109,92,255,.06)}

      /* PROGRESS */
      .arena-progress{height:8px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
      .arena-progress > span{display:block;height:100%;border-radius:999px;transition:width .18s ease}

      /* WAVE METER */
      .arena-wave{display:flex;align-items:flex-end;gap:4px;height:40px}
      .arena-wave span{width:6px;border-radius:999px;background:linear-gradient(180deg, var(--arena-teal), var(--arena-violet));animation:arena-wave 1.05s ease-in-out infinite}
      .arena-wave span:nth-child(2){animation-delay:.1s}
      .arena-wave span:nth-child(3){animation-delay:.2s}
      .arena-wave span:nth-child(4){animation-delay:.3s}
      .arena-wave span:nth-child(5){animation-delay:.4s}

      /* OVERLAY */
      .arena-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,5,16,.80);backdrop-filter:blur(18px);z-index:90}

      /* COUNTDOWN */
      .arena-countdown{font:900 clamp(6rem,20vw,12rem) var(--font-m);line-height:1;background:linear-gradient(135deg, #6D5CFF 0%, #3ECFB4 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:arena-countdown-tick .95s ease both;filter:drop-shadow(0 20px 60px rgba(109,92,255,.35))}

      /* SHEEN */
      .arena-sheen{position:absolute;inset:-1px;overflow:hidden;border-radius:inherit;pointer-events:none}
      .arena-sheen::before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg, transparent, rgba(255,255,255,.05), transparent);animation:arena-shine 3.6s ease-in-out infinite}

      /* UTILS */
      .arena-fade-up{animation:arena-fade-up .35s ease both}
      .arena-stat-pill{padding:8px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--arena-border)}
      .arena-side-card{padding:16px;border-radius:20px;background:rgba(5,5,16,.50);border:1px solid var(--arena-border)}
      .app-fullscreen .arena-shell{min-height:100vh;overflow:hidden}

      /* QUESTION DISPLAY */
      .arena-question-text{
        font:800 clamp(2.8rem,8vw,6rem) var(--font-s);
        line-height:1.05;letter-spacing:-.045em;
        background:linear-gradient(135deg, var(--arena-text) 30%, rgba(240,242,255,.75));
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        filter:drop-shadow(0 4px 24px rgba(109,92,255,.18));
      }

      /* PLAYER BANNER */
      .arena-player-banner{
        display:flex;flex-direction:column;align-items:center;gap:8px;
        padding:18px 24px;
      }
      .arena-player-banner .avatar{
        width:80px;height:80px;border-radius:28px;
        display:grid;place-items:center;font-size:42px;
        border:2px solid;
        animation:arena-avatar-glow 2.4s ease-in-out infinite;
      }
      .arena-player-banner .player-name{
        font:800 clamp(1.6rem,4vw,2.6rem) var(--font-s);
        letter-spacing:-.03em;
      }

      /* TIMER BAR */
      .arena-timer-bar{
        position:relative;height:6px;border-radius:999px;
        background:rgba(255,255,255,.06);overflow:hidden;width:100%;
      }
      .arena-timer-bar > span{
        display:block;height:100%;border-radius:999px;
        transform-origin:left center;
      }

      /* FEEDBACK OVERLAY */
      .arena-feedback-overlay{
        position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;
        pointer-events:none;
      }
      .arena-feedback-card{
        animation:arena-feedback-enter .35s ease both;
        padding:clamp(28px,5vw,48px);border-radius:32px;
        text-align:center;backdrop-filter:blur(24px);
        border:1px solid;pointer-events:auto;
        min-width:min(420px,90vw);
      }
      .arena-feedback-card.correct{
        background:rgba(52,211,153,.10);border-color:rgba(52,211,153,.28);
        box-shadow:0 32px 80px rgba(52,211,153,.15),0 0 120px rgba(52,211,153,.06);
      }
      .arena-feedback-card.wrong{
        background:rgba(255,90,90,.10);border-color:rgba(255,90,90,.22);
        box-shadow:0 32px 80px rgba(255,90,90,.12),0 0 120px rgba(255,90,90,.04);
      }

      /* REVEAL */
      .arena-reveal-number{animation:arena-reveal-flash .45s ease both}

      /* MINI LEADERBOARD (horizontal) */
      .arena-mini-lb{
        display:flex;gap:6px;flex-wrap:wrap;justify-content:center;
        padding:12px 16px;border-radius:18px;
        background:rgba(5,5,16,.50);border:1px solid var(--arena-border);
      }
      .arena-mini-lb-item{
        display:flex;align-items:center;gap:6px;
        padding:6px 12px;border-radius:12px;
        background:rgba(255,255,255,.03);border:1px solid var(--arena-border);
        font:600 .82rem var(--font-d);color:var(--arena-muted);
        transition:all .18s;
      }
      .arena-mini-lb-item.current{
        background:rgba(109,92,255,.12);border-color:rgba(109,92,255,.30);
        color:var(--arena-text);
      }

      /* HINT BADGE */
      .arena-hint{
        display:inline-flex;align-items:center;gap:6px;
        padding:6px 14px;border-radius:999px;
        background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.18);
        font:600 .78rem var(--font-d);color:rgba(245,166,35,.90);
      }

      /* CLASS PRESET CARD */
      .arena-preset-card{
        padding:16px;border-radius:18px;cursor:pointer;
        background:rgba(255,255,255,.03);border:1px solid var(--arena-border);
        transition:all .18s ease;text-align:left;color:var(--arena-text);
      }
      .arena-preset-card:hover{
        background:rgba(109,92,255,.08);border-color:rgba(109,92,255,.30);
        transform:translateY(-2px);box-shadow:0 12px 32px rgba(109,92,255,.10);
      }

      /* RESPONSIVE */
      @media (max-width: 1024px){.arena-grid{grid-template-columns:1fr !important}}
      @media (max-width: 640px){
        .arena-player-banner .avatar{width:64px;height:64px;border-radius:22px;font-size:34px}
        .arena-question-text{font-size:clamp(2rem,10vw,3.5rem) !important}
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  /* ─── Timers ─── */
  const clearStageTimers = useCallback(() => {
    if (stageTimerRef.current) { clearTimeout(stageTimerRef.current); stageTimerRef.current = null; }
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
    if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (recognitionRestartTimerRef.current) { clearTimeout(recognitionRestartTimerRef.current); recognitionRestartTimerRef.current = null; }
  }, []);

  const stopMetering = useCallback(() => {
    if (meterFrameRef.current) { cancelAnimationFrame(meterFrameRef.current); meterFrameRef.current = null; }
    setAudioLevel(0);
  }, []);

  const stopListening = useCallback((abort = false) => {
    recognitionShouldRestartRef.current = false;
    recognitionManualStopRef.current = true;
    setIsListening(false);
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (recognitionRestartTimerRef.current) { clearTimeout(recognitionRestartTimerRef.current); recognitionRestartTimerRef.current = null; }
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      if (abort) recognition.abort();
      else recognition.stop();
    } catch {
      // Ignore repeated stop errors
    }
    recognitionRef.current = null;
  }, []);

  const cleanupMedia = useCallback(() => {
    stopMetering();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, [stopMetering]);

  const cleanupSession = useCallback(() => {
    clearStageTimers();
    stopListening(true);
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
  }, [clearStageTimers, stopListening]);

  const playTone = useCallback((kind: "countdown" | "correct" | "wrong" | "start") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const context = audioContextRef.current;
      // Resume AudioContext if suspended (required by iOS/Safari after page load)
      if (context.state === "suspended") {
        context.resume().catch(() => undefined);
      }
      const time = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      if (kind === "correct") oscillator.frequency.setValueAtTime(680, time);
      if (kind === "wrong") oscillator.frequency.setValueAtTime(220, time);
      if (kind === "countdown") oscillator.frequency.setValueAtTime(480, time);
      if (kind === "start") oscillator.frequency.setValueAtTime(900, time);

      oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.08, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (kind === "correct" ? 0.26 : 0.18));

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.3);
    } catch {
      // Audio should never block gameplay
    }
  }, []);

  const startMetering = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const total = data.reduce((sum, value) => sum + value, 0);
      const normalized = total / data.length / 255;
      setAudioLevel((prev) => prev * 0.55 + normalized * 0.45);
      meterFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const setupMicrophone = useCallback(async (): Promise<boolean> => {
    if (!settingsRef.current.voiceEnabled) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission("denied");
      setMicStatus("This browser does not expose microphone APIs.");
      return false;
    }
    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        mediaStreamRef.current = stream;
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      // Resume AudioContext if suspended (iOS/Safari user-gesture requirement)
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      if (!analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;
      }
      setMicPermission("granted");
      setMicStatus("Microphone live and ready for classroom turns.");
      startMetering();
      return true;
    } catch (error) {
      console.error("Microphone setup failed", error);
      setMicPermission("denied");
      setMicStatus("Microphone access was blocked. Keyboard fallback is still available.");
      return false;
    }
  }, [startMetering]);

  const currentTurn = phase === "playing" && turns.length ? turns[currentTurnIndex] ?? null : null;
  const currentPlayer = currentTurn ? players.find((player) => player.id === currentTurn.playerId) ?? null : null;
  const currentQuestion = currentTurn && currentPlayer
    ? currentPlayer.questions[currentTurn.questionIndex] ?? null
    : null;

  const leaderboard = useMemo(() => {
    return [...players].sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.correctCount !== left.correctCount) return right.correctCount - left.correctCount;
      return left.wrongCount - right.wrongCount;
    });
  }, [players]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  const updatePlayerById = useCallback((playerId: string, updater: (player: ArenaPlayer) => ArenaPlayer) => {
    setPlayers((prev) => prev.map((player) => (player.id === playerId ? updater(player) : player)));
  }, []);

  const finishSession = useCallback(() => {
    cleanupSession();
    stopListening(true);
    turnSubmissionRef.current = false;
    setFeedback(null);
    setSpeechTranscript("");
    setSpeechPreview("");
    setSpeechError("");
    setCurrentRevealItem("");
    setRevealedItems([]);
    setIsListening(false);
    setStage("idle");
    setPhase("results");
  }, [cleanupSession, stopListening]);

  const beginAnswerPhase = useCallback(async () => {
    clearStageTimers();
    setStage("answering");
    setSpeechError("");
    setKeyboardAnswer("");
    setSpeechTranscript("");
    setSpeechPreview("");
    recognitionFinalTranscriptRef.current = "";
    recognitionInterimTranscriptRef.current = "";
    recognitionBestCandidateRef.current = { transcript: "", parsed: null, formatted: null };
    recognitionManualStopRef.current = false;
    turnSubmissionRef.current = false;
    answerPhaseStartedAtRef.current = Date.now();
    const totalMs = settingsRef.current.timeLimitSeconds * 1000;
    setTimeRemainingMs(totalMs);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - answerPhaseStartedAtRef.current;
      const remaining = Math.max(totalMs - elapsed, 0);
      setTimeRemainingMs(remaining);
      if (remaining <= 0) {
        if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
      }
    }, 80);
  }, [clearStageTimers]);

  const startTurn = useCallback(async (turnIndex: number) => {
    cleanupSession();
    setFeedback(null);
    setCurrentTurnIndex(turnIndex);
    if (!turnsRef.current[turnIndex]) { finishSession(); return; }

    setStage("announce");
    setCurrentRevealItem("");
    setRevealedItems([]);
    setSpeechTranscript("");
    setSpeechPreview("");
    setSpeechError("");
    setKeyboardAnswer("");
    recognitionFinalTranscriptRef.current = "";
    recognitionInterimTranscriptRef.current = "";
    recognitionBestCandidateRef.current = { transcript: "", parsed: null, formatted: null };
    turnSubmissionRef.current = false;
    setTimeRemainingMs(settingsRef.current.timeLimitSeconds * 1000);

    const turn = turnsRef.current[turnIndex];
    const player = playersRef.current.find((entry) => entry.id === turn.playerId);
    const question = player?.questions[turn.questionIndex] ?? null;
    const isRowRevealQuestion = question && isAddSubFamily(question.type);

    stageTimerRef.current = setTimeout(async () => {
      if (stageRef.current === "paused") return;
      if (!question) { finishSession(); return; }
      if (isRowRevealQuestion) {
        setStage("revealing");
        const items = getAddSubItems(question as AddSubQuestion | IntegerAddSubQuestion | IntlAddSubQuestion);
        let index = 0;
        setCurrentRevealItem(items[index] ?? "");
        setRevealedItems([]);
        const stepReveal = () => {
          if (stageRef.current === "paused") return;
          if (index >= items.length - 1) {
            setRevealedItems(items);
            setCurrentRevealItem("");
            void beginAnswerPhase();
            return;
          }
          setRevealedItems(items.slice(0, index + 1));
          index += 1;
          setCurrentRevealItem(items[index] ?? "");
          revealTimerRef.current = setTimeout(stepReveal, settingsRef.current.addSubRevealSeconds * 1000);
        };
        revealTimerRef.current = setTimeout(stepReveal, settingsRef.current.addSubRevealSeconds * 1000);
        return;
      }
      await beginAnswerPhase();
    }, 900);
  }, [beginAnswerPhase, cleanupSession, finishSession]);

  const submitAnswer = useCallback((params: {
    parsedAnswer: number | null;
    transcript: string;
    answerDisplay: string;
    timedOut?: boolean;
    skipped?: boolean;
  }) => {
    if (turnSubmissionRef.current) return;
    turnSubmissionRef.current = true;
    const turn = turnsRef.current[currentTurnIndexRef.current];
    const player = playersRef.current.find((entry) => entry.id === turn?.playerId);
    const question = player?.questions[turn?.questionIndex ?? -1];
    if (!turn || !player || !question) { turnSubmissionRef.current = false; return; }

    cleanupSession();
    stopListening(true);

    const timeTakenMs = answerPhaseStartedAtRef.current
      ? Date.now() - answerPhaseStartedAtRef.current
      : settingsRef.current.timeLimitSeconds * 1000;
    const isCorrect = compareMentalAnswer(params.parsedAnswer, question.answer);
    const pointsAwarded = scoreTurn(isCorrect, settingsRef.current.timeLimitSeconds, timeTakenMs, player.streak);

    updatePlayerById(player.id, (entry) => {
      const nextStreak = isCorrect ? entry.streak + 1 : 0;
      return {
        ...entry,
        attempts: [
          ...entry.attempts,
          {
            question,
            transcript: params.transcript,
            parsedAnswer: params.parsedAnswer,
            answerDisplay: params.answerDisplay,
            isCorrect,
            timedOut: params.timedOut ?? false,
            skipped: params.skipped ?? false,
            pointsAwarded,
            round: turn.round,
            slot: turn.slot,
            timeTakenMs,
          },
        ],
        score: entry.score + pointsAwarded,
        streak: nextStreak,
        bestStreak: Math.max(entry.bestStreak, nextStreak),
        correctCount: entry.correctCount + (isCorrect ? 1 : 0),
        wrongCount: entry.wrongCount + (isCorrect ? 0 : 1),
      };
    });

    setStage("feedback");
    setSpeechTranscript(params.transcript);
    setSpeechPreview(params.answerDisplay);
    setFeedback({
      correct: isCorrect,
      title: isCorrect ? "Nailed it!" : params.timedOut ? "Time's up" : params.skipped ? "Turn skipped" : "Not quite",
      subtitle: isCorrect
        ? `+${pointsAwarded} pts · ${formatParsedSpeechNumber(question.answer)}`
        : settingsRef.current.showCorrectOnWrong
          ? `Answer was ${formatParsedSpeechNumber(question.answer)}`
          : "Next player up",
      points: pointsAwarded,
    });

    playTone(isCorrect ? "correct" : "wrong");

    const nextIndex = currentTurnIndexRef.current + 1;
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      if (nextIndex >= turnsRef.current.length) { finishSession(); return; }
      void startTurn(nextIndex);
    }, settingsRef.current.autoAdvanceMs);
  }, [cleanupSession, finishSession, playTone, startTurn, stopListening, updatePlayerById]);

  useEffect(() => {
    if (stage !== "answering") return;
    if (timeRemainingMs > 0) return;
    submitAnswer({ parsedAnswer: null, transcript: "", answerDisplay: "No answer", timedOut: true });
  }, [stage, submitAnswer, timeRemainingMs]);

  /* ─── Speech Recognition ─── */
  const startListening = useCallback(async () => {
    if (!settingsRef.current.voiceEnabled) return;
    if (!speechSupported) return;
    if (stageRef.current !== "answering") return;
    if (turnSubmissionRef.current) return;
    if (isListening) return;

    const micReady = await setupMicrophone();
    if (!micReady) {
      setSpeechError("Voice capture is unavailable. Use keyboard fallback.");
      return;
    }

    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) return;

    // Always create a fresh instance to avoid stale callback references from
    // rapid pause/resume cycles where a previous session's handlers linger.
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    const recognition = new RecognitionCtor();
    recognitionRef.current = recognition;

    const sessionId = recognitionSessionRef.current + 1;
    recognitionSessionRef.current = sessionId;
    recognitionFinalTranscriptRef.current = "";
    recognitionInterimTranscriptRef.current = "";
    recognitionBestCandidateRef.current = { transcript: "", parsed: null, formatted: null };
    recognitionManualStopRef.current = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (recognitionSessionRef.current !== sessionId || stageRef.current !== "answering") return;

      // Parse each NEW result chunk individually to prevent transcript
      // accumulation ("three" + "three" → "three three" → 33).
      // For single-number answers we only need ONE valid parse.
      let bestChunk = "";
      let bestParse: { value: number | null; formatted: string | null; transcript: string } = { value: null, formatted: null, transcript: "" };
      let hasFinal = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        let chunk = result?.[0]?.transcript?.trim() ?? "";
        for (let altIdx = 0; altIdx < Math.min(result.length, 3); altIdx += 1) {
          const alt = result?.[altIdx];
          const altText = alt?.transcript?.trim() ?? "";
          if (!altText) continue;
          if (typeof alt?.confidence === "number" && alt.confidence < MIN_CONFIDENCE) continue;
          const altParse = parseSpokenNumber(altText);
          if (altParse.value !== null) {
            chunk = altText;
            break;
          }
        }
        if (!chunk) continue;
        if (result.isFinal) hasFinal = true;

        // Parse this individual chunk — do NOT concatenate with prior results
        const chunkParse = parseSpokenNumber(chunk);
        if (chunkParse.value !== null && chunkParse.formatted) {
          bestChunk = chunk;
          bestParse = chunkParse;
        } else if (!bestParse.value) {
          bestChunk = chunk;
        }
      }

      // Update UI transcript & preview with just the latest chunk
      if (bestChunk) {
        setSpeechTranscript(bestChunk);
        recognitionInterimTranscriptRef.current = bestChunk;
      }
      if (bestParse.value !== null && bestParse.formatted) {
        setSpeechPreview(bestParse.formatted);
        recognitionBestCandidateRef.current = { transcript: bestChunk, parsed: bestParse.value, formatted: bestParse.formatted };
        // Store ONLY the latest valid chunk — never accumulate across results
        recognitionFinalTranscriptRef.current = bestChunk;
      }

      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }

      if (bestParse.value !== null && bestParse.formatted) {
        recognitionShouldRestartRef.current = false;
        if (hasFinal) {
          // Final result with valid number — submit immediately, no debounce
          submitAnswer({ parsedAnswer: bestParse.value, transcript: bestChunk, answerDisplay: bestParse.formatted });
        } else {
          // Interim result — short debounce in case the final corrects it
          silenceTimerRef.current = setTimeout(() => {
            submitAnswer({ parsedAnswer: bestParse.value, transcript: bestChunk, answerDisplay: bestParse.formatted ?? bestChunk });
          }, 180);
        }
        setSpeechError("");
      } else if (bestChunk) {
        setSpeechPreview("");
        setSpeechError("Listening... speak the number clearly.");
      } else {
        setSpeechPreview("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (recognitionSessionRef.current !== sessionId) return;
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        setSpeechError("Didn't catch that. Say the number once, clearly.");
        return;
      }
      if (event.error === "audio-capture" || event.error === "not-allowed" || event.error === "service-not-allowed") {
        recognitionShouldRestartRef.current = false;
        setMicPermission("denied");
        setMicStatus("Microphone access is unavailable. Keyboard fallback stays ready.");
      }
      setSpeechError(`Voice recognition issue: ${event.error}.`);
    };

    recognition.onend = () => {
      if (recognitionSessionRef.current !== sessionId) return;
      setIsListening(false);
      if (turnSubmissionRef.current) return;
      if (recognitionManualStopRef.current) return;

      // Use the best candidate captured during this session as a fallback
      const best = recognitionBestCandidateRef.current;
      if (best.parsed !== null && best.formatted && stageRef.current === "answering") {
        recognitionShouldRestartRef.current = false;
        submitAnswer({ parsedAnswer: best.parsed, transcript: best.transcript, answerDisplay: best.formatted });
        return;
      }

      // Also try parsing whatever was last heard (single chunk, not accumulated)
      const lastHeard = (recognitionFinalTranscriptRef.current || recognitionInterimTranscriptRef.current).trim();
      if (lastHeard) {
        const fallback = parseSpokenNumber(lastHeard);
        if (fallback.value !== null && fallback.formatted && stageRef.current === "answering") {
          recognitionShouldRestartRef.current = false;
          submitAnswer({ parsedAnswer: fallback.value, transcript: lastHeard, answerDisplay: fallback.formatted });
          return;
        }
      }

      if (!(recognitionShouldRestartRef.current && settingsRef.current.voiceMode === "auto" && stageRef.current === "answering")) return;
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = window.setTimeout(() => {
        if (recognitionSessionRef.current === sessionId && !turnSubmissionRef.current && stageRef.current === "answering") {
          void startListening();
        }
      }, 150);
    };

    try {
      recognitionShouldRestartRef.current = settingsRef.current.voiceMode === "auto";
      recognition.start();
      setSpeechError("");
      setIsListening(true);
    } catch (error) {
      console.error("Speech recognition start failed", error);
      setSpeechError("Voice recognition is warming up. Try again in a moment.");
    }
  }, [isListening, setupMicrophone, speechSupported, submitAnswer]);

  useEffect(() => {
    if (phase === "playing" && stage === "answering" && settings.voiceEnabled && settings.voiceMode === "auto") {
      void startListening();
    }
  }, [phase, settings.voiceEnabled, settings.voiceMode, stage, startListening]);

  useEffect(() => {
    return () => {
      cleanupSession();
      cleanupMedia();
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, [cleanupMedia, cleanupSession]);

  useEffect(() => {
    const onFullscreenChange = async () => {
      const fullscreenLib = await import("../lib/fullscreen");
      setIsFullScreen(fullscreenLib.isFullscreen());
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const fullscreenLib = await import("../lib/fullscreen");
    if (fullscreenLib.isFullscreen()) await fullscreenLib.exitFullscreen();
    else await fullscreenLib.enterFullscreen();
    setIsFullScreen(fullscreenLib.isFullscreen());
  }, []);

  const applyConfigToAll = useCallback(() => {
    if (!selectedPlayer) return;
    if (!applyToAllPending) {
      setApplyToAllPending(true);
      return;
    }
    setPlayers((prev) => prev.map((player) => ({ ...player, config: { ...selectedPlayer.config } })));
    setApplyToAllPending(false);
  }, [applyToAllPending, selectedPlayer]);

  const cancelApplyToAll = useCallback(() => { setApplyToAllPending(false); }, []);

  const applyClassPreset = useCallback((preset: ClassPreset) => {
    setPlayers((prev) => prev.map((player) => ({ ...player, config: { ...preset.config } })));
  }, []);

  const addPlayer = useCallback(() => {
    setPlayers((prev) => [...prev, createPlayer(prev.length, newPlayerName.trim())]);
    setNewPlayerName("");
  }, [newPlayerName]);

  const removePlayer = useCallback((playerId: string) => {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId));
    if (selectedPlayerId === playerId) {
      const survivor = players.find((player) => player.id !== playerId);
      if (survivor) setSelectedPlayerId(survivor.id);
    }
  }, [players, selectedPlayerId]);

  const updateSelectedPlayerConfig = useCallback((patch: Partial<MentalQuestionConfig>) => {
    if (!selectedPlayer) return;
    updatePlayerById(selectedPlayer.id, (player) => ({
      ...player,
      config: updatePlayerConfig(player.config, patch),
    }));
  }, [selectedPlayer, updatePlayerById]);

  const changeSelectedOperation = useCallback((operationType: string) => {
    if (!selectedPlayer) return;
    const nextOperation = operationType as OperationType;
    updatePlayerById(selectedPlayer.id, (player) => ({
      ...player,
      config: { ...createDefaultMentalConfig(nextOperation), operationType: nextOperation },
    }));
  }, [selectedPlayer, updatePlayerById]);

  const startArena = useCallback(async () => {
    const trimmedPlayers = players.map((player, index) => ({
      ...player,
      name: player.name.trim() || `Player ${index + 1}`,
    }));
    if (trimmedPlayers.length < 2) { setSetupError("Add at least two players to begin."); return; }
    if (!settings.voiceEnabled && !settings.allowKeyboardFallback) { setSetupError("Enable voice or keyboard fallback."); return; }
    if (settings.voiceEnabled && !speechSupported && !settings.allowKeyboardFallback) { setSetupError("Voice not supported and keyboard fallback disabled."); return; }
    setSetupError("");
    if (settings.voiceEnabled) {
      const micReady = await setupMicrophone();
      if (!micReady && !settings.allowKeyboardFallback) { setSetupError("Microphone required unless keyboard fallback enabled."); return; }
    }
    const questionsPerPlayer = settings.rounds * settings.questionsPerRound;
    const preparedPlayers = trimmedPlayers.map((player) => ({
      ...player,
      questions: generateMentalQuestions(player.config, questionsPerPlayer),
      attempts: [],
      score: 0, streak: 0, bestStreak: 0, correctCount: 0, wrongCount: 0,
    }));
    const preparedTurns = buildTurns(preparedPlayers, settings);
    setPlayers(preparedPlayers);
    setTurns(preparedTurns);
    setCurrentTurnIndex(0);
    setPhase("countdown");
    setStage("idle");
    setCountdown(3);
    playTone("countdown");

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          playTone("start");
          setPhase("playing");
          void startTurn(0);
          return 0;
        }
        playTone("countdown");
        return prev - 1;
      });
    }, 1000);
  }, [players, playTone, settings, setupMicrophone, speechSupported, startTurn]);

  const pauseArena = useCallback(() => { cleanupSession(); stopListening(true); setStage("paused"); }, [cleanupSession, stopListening]);
  const resumeArena = useCallback(() => { if (phase !== "playing") return; void startTurn(currentTurnIndexRef.current); }, [phase, startTurn]);

  const resetArena = useCallback(() => {
    cleanupSession();
    stopListening(true);
    turnSubmissionRef.current = false;
    setPlayers((prev) => prev.map((player, index) => ({
      ...createPlayer(index, player.name), id: player.id, avatar: player.avatar, accent: player.accent, config: { ...player.config },
    })));
    setTurns([]);
    setPhase("setup");
    setStage("idle");
    setCurrentTurnIndex(0);
    setCountdown(0);
    setFeedback(null);
    setCurrentRevealItem("");
    setRevealedItems([]);
    setSpeechTranscript("");
    setSpeechPreview("");
    setSpeechError("");
    setKeyboardAnswer("");
  }, [cleanupSession, stopListening]);

  const submitKeyboard = useCallback(() => {
    const trimmed = keyboardAnswer.trim();
    if (!trimmed) return;
    const numeric = Number(trimmed);
    if (Number.isNaN(numeric)) return;
    submitAnswer({ parsedAnswer: numeric, transcript: trimmed, answerDisplay: trimmed });
  }, [keyboardAnswer, submitAnswer]);

  const currentPlayerPlace = currentPlayer ? leaderboard.findIndex((player) => player.id === currentPlayer.id) : -1;
  const currentQuestionLabel = currentQuestion
    ? isAddSubFamily(currentQuestion.type)
      ? stage === "revealing" ? "Watch the rows" : "What is the total?"
      : formatMentalQuestion(currentQuestion)
    : "";

  const awards = useMemo(() => {
    if (!leaderboard.length || phase !== "results") return [];
    const fastest = [...leaderboard]
      .map((player) => ({ player, avg: getAverageTime(player) }))
      .filter((entry) => entry.avg !== null)
      .sort((left, right) => (left.avg ?? Infinity) - (right.avg ?? Infinity))[0];
    const hottest = [...leaderboard].sort((left, right) => right.bestStreak - left.bestStreak)[0];
    const sharpest = [...leaderboard].sort((left, right) => {
      const rightAccuracy = right.attempts.length ? right.correctCount / right.attempts.length : 0;
      const leftAccuracy = left.attempts.length ? left.correctCount / left.attempts.length : 0;
      return rightAccuracy - leftAccuracy;
    })[0];
    return [
      fastest ? { label: "Fastest Thinker", value: `${fastest.player.avatar} ${fastest.player.name}`, meta: fastest.avg ? formatMs(fastest.avg) : "—" } : null,
      hottest ? { label: "Hottest Streak", value: `${hottest.avatar} ${hottest.name}`, meta: `${hottest.bestStreak} in a row` } : null,
      sharpest ? { label: "Sharpest Accuracy", value: `${sharpest.avatar} ${sharpest.name}`, meta: formatAccuracy(sharpest) } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; meta: string }>;
  }, [leaderboard, phase]);

  const renderConfigEditor = () => {
    if (!selectedPlayer) return null;
    const config = selectedPlayer.config;
    const activePresetKey = getPresetKeyForConfig(config);

    return (
      <div className="arena-card arena-fade-up" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="arena-section-title">Player Config</div>
            <div style={{ font: "700 1.5rem var(--font-s)", marginTop: 8 }}>{selectedPlayer.avatar} {selectedPlayer.name || "Selected Player"}</div>
            <div className="arena-copy" style={{ marginTop: 8 }}>{describeMentalConfig(config)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {applyToAllPending ? (
              <>
                <span style={{ font: "600 .82rem var(--font-d)", color: "var(--arena-warm)" }}>Apply {selectedPlayer.name}'s config to all?</span>
                <button className="arena-button success" onClick={applyConfigToAll} type="button" style={{ padding: "10px 16px", borderRadius: 14 }}>
                  Confirm
                </button>
                <button className="arena-button secondary" onClick={cancelApplyToAll} type="button" style={{ padding: "10px 16px", borderRadius: 14 }}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="arena-button secondary" onClick={applyConfigToAll} type="button">
                <Wand2 size={16} />
                Apply to all
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="arena-label">Player Name</span>
            <input
              className="arena-select"
              value={selectedPlayer.name}
              placeholder="Enter player name"
              onChange={(event) => updatePlayerById(selectedPlayer.id, (player) => ({ ...player, name: event.target.value }))}
            />
          </label>
          <SelectField
            label="Operation"
            value={config.operationType}
            options={OPERATION_OPTIONS.map(([value, label]) => ({ value, label }))}
            onChange={changeSelectedOperation}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {MENTAL_PRESETS[config.operationType].map((preset) => (
            <button
              key={preset.presetKey}
              type="button"
              className={`arena-chip ${activePresetKey === preset.presetKey ? "active" : ""}`}
              onClick={() => updatePlayerById(selectedPlayer.id, (player) => ({ ...player, config: applyMentalPreset(player.config, preset.presetKey) }))}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {config.operationType === "multiplication" && (
            <>
              <NumericField label="Multiplicand digits" min={1} max={6} value={config.multiplicandDigits} onChange={(v) => updateSelectedPlayerConfig({ multiplicandDigits: v })} />
              <NumericField label="Multiplier digits" min={1} max={4} value={config.multiplierDigits} onChange={(v) => updateSelectedPlayerConfig({ multiplierDigits: v })} />
            </>
          )}
          {config.operationType === "division" && (
            <>
              <NumericField label="Dividend digits" min={2} max={6} value={config.dividendDigits} onChange={(v) => updateSelectedPlayerConfig({ dividendDigits: v })} />
              <NumericField label="Divisor digits" min={1} max={4} value={config.divisorDigits} onChange={(v) => updateSelectedPlayerConfig({ divisorDigits: v })} />
            </>
          )}
          {config.operationType === "add_sub" && (
            <>
              <NumericField label="Digits" min={1} max={6} value={config.addSubDigits} onChange={(v) => updateSelectedPlayerConfig({ addSubDigits: v })} />
              <NumericField label="Rows" min={3} max={20} value={config.addSubRows} onChange={(v) => updateSelectedPlayerConfig({ addSubRows: v })} />
            </>
          )}
          {config.operationType === "integer_add_sub" && (
            <>
              <NumericField label="Digits" min={1} max={6} value={config.integerAddSubDigits} onChange={(v) => updateSelectedPlayerConfig({ integerAddSubDigits: v })} />
              <NumericField label="Rows" min={3} max={20} value={config.integerAddSubRows} onChange={(v) => updateSelectedPlayerConfig({ integerAddSubRows: v })} />
            </>
          )}
          {config.operationType === "intl_add_sub" && (
            <>
              <SelectField label="Digit mix" value={config.intlAddSubPreset} options={[{ value: "1_2", label: "1 & 2 digits" }, { value: "2_3", label: "2 & 3 digits" }]} onChange={(v) => updateSelectedPlayerConfig({ intlAddSubPreset: v as "1_2" | "2_3" })} />
              <NumericField label="Rows" min={3} max={20} value={config.intlAddSubRows} onChange={(v) => updateSelectedPlayerConfig({ intlAddSubRows: v })} />
            </>
          )}
          {config.operationType === "decimal_multiplication" && (
            <>
              <NumericField label="Left digits" min={1} max={4} value={config.decimalMultMultiplicandDigits} onChange={(v) => updateSelectedPlayerConfig({ decimalMultMultiplicandDigits: v })} />
              <NumericField label="Right digits" min={0} max={3} value={config.decimalMultMultiplierDigits} onChange={(v) => updateSelectedPlayerConfig({ decimalMultMultiplierDigits: v })} />
            </>
          )}
          {config.operationType === "decimal_division" && (
            <>
              <NumericField label="Dividend digits" min={2} max={6} value={config.decimalDivDividendDigits} onChange={(v) => updateSelectedPlayerConfig({ decimalDivDividendDigits: v })} />
              <NumericField label="Divisor digits" min={1} max={4} value={config.decimalDivDivisorDigits} onChange={(v) => updateSelectedPlayerConfig({ decimalDivDivisorDigits: v })} />
            </>
          )}
          {(config.operationType === "lcm" || config.operationType === "gcd") && (
            <>
              <NumericField label="First number digits" min={1} max={4} value={config.lcmGcdFirstDigits} onChange={(v) => updateSelectedPlayerConfig({ lcmGcdFirstDigits: v })} />
              <NumericField label="Second number digits" min={1} max={4} value={config.lcmGcdSecondDigits} onChange={(v) => updateSelectedPlayerConfig({ lcmGcdSecondDigits: v })} />
            </>
          )}
          {(config.operationType === "square_root" || config.operationType === "cube_root") && (
            <NumericField label="Target digits" min={2} max={8} value={config.rootDigits} onChange={(v) => updateSelectedPlayerConfig({ rootDigits: v })} />
          )}
          {config.operationType === "percentage" && (
            <>
              <NumericField label="Percentage min" min={1} max={99} value={config.percentageMin} onChange={(v) => updateSelectedPlayerConfig({ percentageMin: v })} />
              <NumericField label="Percentage max" min={1} max={100} value={config.percentageMax} onChange={(v) => updateSelectedPlayerConfig({ percentageMax: Math.max(v, config.percentageMin) })} />
              <NumericField label="Number digits" min={2} max={7} value={config.percentageNumberDigits} onChange={(v) => updateSelectedPlayerConfig({ percentageNumberDigits: v })} />
            </>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════
     COUNTDOWN PHASE
     ═══════════════════════════════════════════════════════════ */
  if (phase === "countdown") {
    const firstTurn = turns[0];
    const firstPlayer = firstTurn ? players.find((p) => p.id === firstTurn.playerId) : null;

    return (
      <div className="arena-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="arena-countdown" key={countdown}>{countdown || "GO"}</div>
          {firstPlayer && countdown > 0 && (
            <div style={{ marginTop: 24, animation: "arena-fade-up .3s ease both" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{firstPlayer.avatar}</div>
              <div style={{ font: "700 1.4rem var(--font-s)", color: "var(--arena-text)", marginBottom: 6 }}>
                {firstPlayer.name} goes first
              </div>
              <div style={{ font: "600 .85rem var(--font-m)", color: "var(--arena-soft)", letterSpacing: ".08em" }}>
                {OPERATION_LABELS[firstPlayer.config.operationType]} · {describeMentalConfig(firstPlayer.config)}
              </div>
            </div>
          )}
          {!countdown && (
            <div style={{ font: "700 .85rem var(--font-m)", color: "var(--arena-soft)", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 12 }}>
              Classroom Arena
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RESULTS PHASE
     ═══════════════════════════════════════════════════════════ */
  if (phase === "results") {
    // Classic podium order: 2nd | 1st | 3rd
    const podiumOrder = [1, 0, 2] as const;
    const podiumHeights = [200, 260, 180];
    const podiumColors = [
      { gradient: "linear-gradient(135deg, #94a3b8, #64748b)", glow: "rgba(148,163,184,.4)" },
      { gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)", glow: "rgba(245,158,11,.4)" },
      { gradient: "linear-gradient(135deg, #cd7f32, #a0522d)", glow: "rgba(205,127,50,.4)" },
    ];

    return (
      <div className="arena-shell">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 80px" }}>
          {/* Header */}
          <div className="arena-card arena-fade-up" style={{ padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Link href="/mental">
                <button className="arena-button secondary" type="button"><ArrowLeft size={16} /> Back</button>
              </Link>
              <div>
                <div className="arena-section-title">Final Results</div>
                <div style={{ font: "700 1.8rem var(--font-s)", marginTop: 6 }}>Session complete!</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="arena-button secondary" onClick={resetArena} type="button"><RotateCcw size={16} /> New Setup</button>
              <button className="arena-button primary" onClick={startArena} type="button"><Play size={16} /> Play Again</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 24, marginTop: 24 }} className="arena-grid">
            <div className="arena-card" style={{ padding: 28 }}>
              <div className="arena-section-title">Podium</div>

              {/* Top 3 podium — 2nd | 1st | 3rd */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, alignItems: "flex-end", marginTop: 20 }}>
                {podiumOrder.map((leaderIdx, posIdx) => {
                  const player = leaderboard[leaderIdx];
                  if (!player) return <div key={posIdx} />;
                  return (
                    <div
                      key={player.id}
                      style={{
                        position: "relative", overflow: "hidden", padding: 20, borderRadius: 24,
                        minHeight: podiumHeights[posIdx],
                        background: `linear-gradient(180deg, ${player.accent}20, rgba(255,255,255,.03))`,
                        border: `1px solid ${player.accent}35`,
                        boxShadow: leaderIdx === 0 ? `0 0 48px ${podiumColors[posIdx].glow}` : undefined,
                      }}
                    >
                      <div className="arena-sheen" />
                      {leaderIdx === 0 && (
                        <div style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(245,158,11,.15)", color: "var(--arena-gold)" }}>
                          <Crown size={18} />
                        </div>
                      )}
                      <div style={{ font: "800 .65rem var(--font-m)", color: "var(--arena-soft)", letterSpacing: ".14em", marginBottom: 12 }}>{ordinalPlace(leaderIdx)}</div>
                      <div style={{ fontSize: 42, marginBottom: 8 }}>{player.avatar}</div>
                      <div style={{ font: "800 1.4rem var(--font-s)", marginBottom: 4 }}>{player.name}</div>
                      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="arena-label">Score</span>
                          <span style={{ font: "800 1rem var(--font-m)" }}>{player.score}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="arena-label">Accuracy</span>
                          <span style={{ font: "800 1rem var(--font-m)" }}>{formatAccuracy(player)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="arena-label">Best streak</span>
                          <span style={{ font: "800 1rem var(--font-m)" }}>{player.bestStreak}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Full ranking table */}
              <div style={{ marginTop: 28, display: "grid", gap: 10 }}>
                {leaderboard.map((player, index) => (
                  <div key={player.id} style={{ display: "grid", gridTemplateColumns: "56px 1.2fr repeat(4, .7fr)", gap: 12, alignItems: "center", padding: "12px 16px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid var(--arena-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{player.avatar}</span>
                      <span style={{ font: "800 .92rem var(--font-m)", color: "var(--arena-soft)" }}>{index + 1}</span>
                    </div>
                    <div>
                      <div style={{ font: "700 .95rem var(--font-d)" }}>{player.name}</div>
                      <div className="arena-copy" style={{ fontSize: ".82rem" }}>{OPERATION_LABELS[player.config.operationType]}</div>
                    </div>
                    <div>
                      <div className="arena-label">Score</div>
                      <div style={{ font: "800 .95rem var(--font-m)" }}>{player.score}</div>
                    </div>
                    <div>
                      <div className="arena-label">Correct</div>
                      <div style={{ font: "800 .95rem var(--font-m)" }}>{player.correctCount}</div>
                    </div>
                    <div>
                      <div className="arena-label">Wrong</div>
                      <div style={{ font: "800 .95rem var(--font-m)" }}>{player.wrongCount}</div>
                    </div>
                    <div>
                      <div className="arena-label">Avg speed</div>
                      <div style={{ font: "800 .95rem var(--font-m)" }}>{getAverageTime(player) ? formatMs(getAverageTime(player) ?? 0) : "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 20 }}>
              <div className="arena-card" style={{ padding: 24 }}>
                <div className="arena-section-title">Highlights</div>
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  {awards.map((award) => (
                    <div key={award.label} style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,.03)", border: "1px solid var(--arena-border)" }}>
                      <div className="arena-label">{award.label}</div>
                      <div style={{ font: "700 1.1rem var(--font-s)", marginTop: 8 }}>{award.value}</div>
                      <div className="arena-copy" style={{ marginTop: 4 }}>{award.meta}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="arena-card" style={{ padding: 24 }}>
                <div className="arena-section-title">Session Settings</div>
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  {[
                    ["Rounds", `${settings.rounds}`],
                    ["Q / round", `${settings.questionsPerRound}`],
                    ["Turn order", settings.orderMode],
                    ["Voice mode", settings.voiceEnabled ? settings.voiceMode.replace("_", " ") : "voice off"],
                    ["Timer", `${settings.timeLimitSeconds}s`],
                    ["Row reveal", `${settings.addSubRevealSeconds.toFixed(1)}s`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <span className="arena-label">{label}</span>
                      <span style={{ font: "800 .9rem var(--font-m)", textTransform: "capitalize" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PLAYING PHASE
     ═══════════════════════════════════════════════════════════ */
  if (phase === "playing" && currentTurn && currentPlayer && currentQuestion) {
    const progressPercent = ((currentTurnIndex + 1) / turns.length) * 100;
    const totalMs = settings.timeLimitSeconds * 1000;
    const timePercent = totalMs > 0 ? (timeRemainingMs / totalMs) * 100 : 0;
    const timeSeconds = timeRemainingMs / 1000;
    const isUrgent = stage === "answering" && timeSeconds <= 5 && timeSeconds > 0;
    const timerColor = timePercent > 60 ? "var(--arena-teal)" : timePercent > 25 ? "var(--arena-warm)" : "var(--arena-red)";
    const showNegativeHint = canAnswerBeNegative(currentQuestion);
    const showDecimalHint = canAnswerBeDecimal(currentQuestion);

    return (
      <div className="arena-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* ── Top bar ── */}
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--arena-border)", background: "rgba(5,5,16,.6)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/mental">
              <button className="arena-button secondary" type="button" style={{ padding: "8px 12px", borderRadius: 12, fontSize: ".8rem" }}><ArrowLeft size={14} /></button>
            </Link>
            <div style={{ font: "700 .68rem var(--font-m)", color: "var(--arena-soft)", letterSpacing: ".12em" }}>
              R{currentTurn.round}/{settings.rounds} · Q{currentTurn.slot}/{settings.questionsPerRound}
            </div>
            <div className="arena-progress" style={{ width: 120, height: 5 }}>
              <span style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, var(--arena-violet), var(--arena-teal))" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="arena-button secondary" type="button" onClick={toggleFullscreen} style={{ padding: "8px 12px", borderRadius: 12, fontSize: ".8rem" }}>
              <Maximize size={14} />
            </button>
            <button className="arena-button secondary" type="button" onClick={pauseArena} style={{ padding: "8px 12px", borderRadius: 12, fontSize: ".8rem" }}>
              <Pause size={14} />
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 900, width: "100%", margin: "0 auto", padding: "0 16px" }}>
          {/* Player banner */}
          <div className="arena-player-banner">
            <div
              className="avatar"
              style={{
                background: `${currentPlayer.accent}18`,
                borderColor: currentPlayer.accent,
                "--glow-color": `${currentPlayer.accent}80`,
              } as React.CSSProperties}
            >
              {currentPlayer.avatar}
            </div>
            <div className="player-name">{currentPlayer.name}</div>
            <div style={{ font: "700 .72rem var(--font-m)", color: currentPlayer.accent, letterSpacing: ".1em", textTransform: "uppercase" }}>
              {OPERATION_LABELS[currentPlayer.config.operationType]} · {describeMentalConfig(currentPlayer.config)}
            </div>
            {/* Quick stats */}
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              {[
                { label: "Score", value: currentPlayer.score },
                { label: "Streak", value: `${currentPlayer.streak}🔥` },
                { label: "Place", value: currentPlayerPlace >= 0 ? ordinalPlace(currentPlayerPlace) : "—" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ font: "800 .95rem var(--font-m)", color: "var(--arena-text)" }}>{s.value}</div>
                  <div style={{ font: "600 .58rem var(--font-m)", color: "var(--arena-soft)", letterSpacing: ".1em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Question area */}
          <div className={`arena-card ${isUrgent ? "arena-card-urgency" : ""}`} style={{
            padding: "clamp(24px,4vw,48px) clamp(16px,3vw,32px)",
            textAlign: "center",
            borderColor: isUrgent ? "rgba(255,90,90,.35)" : undefined,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
            minHeight: 0,
          }}>
            {/* Revealing phase (add/sub rows) */}
            {stage === "revealing" && (
              <>
                <div style={{ font: "600 .85rem var(--font-m)", color: "var(--arena-soft)", letterSpacing: ".1em", textTransform: "uppercase" }}>Row Reveal</div>
                <div className="arena-reveal-number" key={currentRevealItem} style={{ font: "800 clamp(4rem,12vw,8rem) var(--font-m)", lineHeight: 1, color: "var(--arena-text)", filter: "drop-shadow(0 8px 32px rgba(109,92,255,.25))" }}>
                  {currentRevealItem}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                  {revealedItems.map((item, idx) => (
                    <span key={`${item}-${idx}`} style={{ padding: "6px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid var(--arena-border)", font: "700 .88rem var(--font-m)", color: "var(--arena-muted)" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Announce phase */}
            {stage === "announce" && (
              <>
                <div style={{ font: "600 .85rem var(--font-m)", color: currentPlayer.accent, letterSpacing: ".1em", textTransform: "uppercase" }}>Get Ready</div>
                <div className="arena-question-text">{currentQuestionLabel}</div>
                <div className="arena-copy" style={{ fontSize: ".95rem" }}>{currentPlayer.name}, focus up.</div>
              </>
            )}

            {/* Answering / Feedback / Paused */}
            {(stage === "answering" || stage === "feedback" || stage === "paused") && (
              <>
                {/* Question text */}
                <div className="arena-question-text">{currentQuestionLabel}</div>

                {/* Rows summary for add/sub after reveal */}
                {isAddSubFamily(currentQuestion.type) && revealedItems.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                    {revealedItems.map((item, idx) => (
                      <span key={`${item}-${idx}`} style={{ padding: "5px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid var(--arena-border)", font: "700 .82rem var(--font-m)", color: "var(--arena-muted)" }}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Timer bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="arena-timer-bar" style={{ flex: 1 }}>
                    <span style={{ width: `${timePercent}%`, background: timerColor, transition: "width .08s linear" }} />
                  </div>
                  <div style={{ font: `800 ${isUrgent ? "1.1rem" : ".82rem"} var(--font-m)`, color: timerColor, minWidth: 50, textAlign: "right", transition: "font-size .18s" }}>
                    {timeSeconds.toFixed(1)}s
                  </div>
                </div>

                {/* Voice answer lane */}
                {stage === "answering" && (
                  <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
                    {settings.voiceEnabled && (
                      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 12, alignItems: "center", padding: "14px 18px", borderRadius: 20, background: "rgba(5,5,16,.50)", border: `1px solid ${isListening ? "rgba(62,207,180,.30)" : "var(--arena-border)"}`, transition: "border-color .18s" }}>
                        {/* Waveform */}
                        <div className="arena-wave" style={{ height: 34 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ height: `${10 + audioLevel * 24 + i * 2}px` }} />
                          ))}
                        </div>
                        {/* Transcript + detected */}
                        <div>
                          <div style={{ font: "600 .85rem var(--font-d)", color: speechTranscript ? "var(--arena-text)" : "var(--arena-soft)", minHeight: 20 }}>
                            {speechTranscript || (isListening ? "Listening..." : "Mic ready")}
                          </div>
                          {speechPreview && (
                            <div style={{ font: "800 1.3rem var(--font-m)", color: "var(--arena-teal)", marginTop: 4 }}>→ {speechPreview}</div>
                          )}
                          {speechError && (
                            <div style={{ font: "600 .78rem var(--font-d)", color: "rgba(255,90,90,.85)", marginTop: 4 }}>{speechError}</div>
                          )}
                        </div>
                        {/* Mic toggle */}
                        <button
                          className={`arena-button ${isListening ? "warn" : "secondary"}`}
                          type="button"
                          style={{ padding: "10px 14px", borderRadius: 14 }}
                          onClick={() => { if (isListening) stopListening(); else void startListening(); }}
                        >
                          {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                        </button>
                      </div>
                    )}

                    {/* Keyboard fallback */}
                    {settings.allowKeyboardFallback && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Keyboard size={15} style={{ color: "var(--arena-soft)", flexShrink: 0 }} />
                        <div className="arena-input-shell" style={{ flex: 1 }}>
                          <input
                            className="arena-input"
                            inputMode="decimal"
                            value={keyboardAnswer}
                            placeholder="Type answer..."
                            style={{ minHeight: 42, fontSize: "1rem" }}
                            onChange={(e) => { const v = e.target.value; if (v === "" || /^-?\d*\.?\d*$/.test(v)) setKeyboardAnswer(v); }}
                            onKeyDown={(e) => { if (e.key === "Enter") submitKeyboard(); }}
                          />
                        </div>
                        <button className="arena-button success" type="button" style={{ padding: "10px 14px", borderRadius: 14 }} onClick={submitKeyboard}>
                          <ChevronRight size={16} />
                        </button>
                        <button className="arena-button secondary" type="button" style={{ padding: "10px 14px", borderRadius: 14 }} onClick={() => submitAnswer({ parsedAnswer: null, transcript: "", answerDisplay: "Skipped", skipped: true })}>
                          <SkipForward size={14} />
                        </button>
                      </div>
                    )}

                    {/* Hints */}
                    {(showNegativeHint || showDecimalHint) && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                        {showNegativeHint && <span className="arena-hint">💡 Say "minus" or "negative" for negative answers</span>}
                        {showDecimalHint && <span className="arena-hint">💡 Say "point" for decimals (e.g. "twelve point five")</span>}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mini leaderboard */}
          <div className="arena-mini-lb" style={{ marginTop: 10, marginBottom: 12, flexShrink: 0 }}>
            {leaderboard.map((player, index) => (
              <div key={player.id} className={`arena-mini-lb-item ${player.id === currentPlayer.id ? "current" : ""}`}>
                <span style={{ fontSize: 16 }}>{player.avatar}</span>
                {index === 0 && <span style={{ fontSize: 10 }}>👑</span>}
                <span style={{ font: "700 .78rem var(--font-d)" }}>{player.name}</span>
                <span style={{ font: "800 .75rem var(--font-m)", color: "var(--arena-violet2)" }}>{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback overlay */}
        {feedback && (
          <div className="arena-feedback-overlay">
            <div className={`arena-feedback-card ${feedback.correct ? "correct" : "wrong"}`}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{feedback.correct ? "✓" : feedback.points === 0 ? "✗" : "⏱"}</div>
              <div style={{ font: "800 clamp(1.8rem,4vw,2.8rem) var(--font-s)", color: "var(--arena-text)", letterSpacing: "-.03em" }}>
                {feedback.title}
              </div>
              <div style={{ font: "600 1rem var(--font-d)", color: "var(--arena-muted)", marginTop: 8 }}>
                {feedback.subtitle}
              </div>
              {feedback.correct && (
                <div style={{ font: "800 1.8rem var(--font-m)", color: "var(--arena-teal)", marginTop: 16, filter: "drop-shadow(0 4px 16px rgba(52,211,153,.25))" }}>
                  +{feedback.points}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paused overlay */}
        {stage === "paused" && (
          <div className="arena-overlay">
            <div className="arena-card" style={{ padding: 32, width: "min(520px, calc(100vw - 32px))", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏸</div>
              <div style={{ font: "700 2rem var(--font-s)" }}>Paused</div>
              <div className="arena-copy" style={{ marginTop: 12, maxWidth: 360, margin: "12px auto 0" }}>
                You can resume this turn. The student will get a fair restart from the same question.
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
                <button className="arena-button secondary" onClick={resetArena} type="button"><X size={16} /> End Session</button>
                <button className="arena-button primary" onClick={resumeArena} type="button"><Play size={16} /> Resume Turn</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SETUP PHASE
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="arena-shell">
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "22px 18px 48px" }}>
        {/* Header */}
        <div className="arena-card arena-fade-up" style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}>
          <div className="arena-sheen" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 700 }}>
              <div className="arena-section-title">Classroom Arena</div>
              <div style={{ font: "700 clamp(1.6rem,4vw,2.6rem) var(--font-s)", lineHeight: 1.05, letterSpacing: "-.04em", marginTop: 10 }}>
                Fast multiplayer math for one screen.
              </div>
              <div className="arena-copy" style={{ marginTop: 12, maxWidth: 520 }}>
                Add players, tune each child's difficulty, test the mic, and launch. Voice-powered answers or keyboard fallback.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/mental"><button className="arena-button secondary" type="button" style={{ padding: "12px 16px", borderRadius: 14 }}><ArrowLeft size={16} /> Back</button></Link>
              <button className="arena-button secondary" type="button" onClick={toggleFullscreen} style={{ padding: "12px 16px", borderRadius: 14 }}><Maximize size={16} /></button>
              <button className="arena-button primary" type="button" onClick={() => void setupMicrophone()} style={{ padding: "12px 16px", borderRadius: 14 }}><Volume2 size={16} /> Test Mic</button>
            </div>
          </div>
          <div className="arena-copy" style={{ marginTop: 14, color: micPermission === "denied" ? "rgba(255,90,90,.9)" : undefined }}>{micStatus}</div>
        </div>

        {/* Class Presets */}
        <div className="arena-card arena-fade-up" style={{ padding: 24, marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div>
              <div className="arena-section-title">Quick-Start Presets</div>
              <div className="arena-copy" style={{ marginTop: 4 }}>One click applies the same config to all players.</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {CLASS_PRESETS.map((preset) => (
              <button key={preset.label} type="button" className="arena-preset-card" onClick={() => applyClassPreset(preset)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{preset.emoji}</span>
                  <span style={{ font: "700 .88rem var(--font-d)" }}>{preset.label}</span>
                </div>
                <div className="arena-copy" style={{ fontSize: ".8rem" }}>{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Players + Config Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18, marginTop: 18 }} className="arena-grid">
          {/* Players list */}
          <div className="arena-card arena-fade-up" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div className="arena-section-title">Players</div>
                <div style={{ font: "700 1.4rem var(--font-s)", marginTop: 8 }}>Build the roster</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="arena-input-shell" style={{ minWidth: 200 }}>
                  <input className="arena-input" value={newPlayerName} placeholder="Player name" onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPlayer(); }} />
                </div>
                <button className="arena-button success" type="button" onClick={addPlayer} style={{ padding: "12px 16px", borderRadius: 14 }}><Plus size={16} /> Add</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`arena-player-card ${selectedPlayerId === player.id ? "active" : ""}`}
                  onClick={() => setSelectedPlayerId(player.id)}
                  style={{ borderColor: selectedPlayerId === player.id ? player.accent : undefined }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: `${player.accent}18`, display: "grid", placeItems: "center", fontSize: 24 }}>
                      {player.avatar}
                    </div>
                    <div>
                      <div style={{ font: "700 .95rem var(--font-d)" }}>{player.name || `Player ${index + 1}`}</div>
                      <div className="arena-copy" style={{ marginTop: 2, fontSize: ".82rem" }}>{OPERATION_LABELS[player.config.operationType]} · {describeMentalConfig(player.config)}</div>
                    </div>
                    <button className="arena-button secondary" type="button" style={{ padding: 8, borderRadius: 12 }} onClick={(e) => { e.stopPropagation(); removePlayer(player.id); }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Config editor */}
          {renderConfigEditor()}
        </div>

        {/* Arena Settings */}
        <div className="arena-card arena-fade-up" style={{ padding: 24, marginTop: 18 }}>
          <div className="arena-section-title">Arena Settings</div>
          <div style={{ font: "700 1.3rem var(--font-s)", marginTop: 8 }}>Tune the flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: 18 }} className="arena-grid">
            <NumericField label="Rounds" min={1} max={10} value={settings.rounds} onChange={(v) => setSettings((prev) => ({ ...prev, rounds: v }))} />
            <NumericField label="Questions / round" min={1} max={15} value={settings.questionsPerRound} onChange={(v) => setSettings((prev) => ({ ...prev, questionsPerRound: v }))} />
            <SelectField
              label="Turn order"
              value={settings.orderMode}
              options={[
                { value: "sequential", label: "Sequential" },
                { value: "snake", label: "Snake (alternating)" },
                { value: "random", label: "Random each slot" },
              ]}
              onChange={(v) => setSettings((prev) => ({ ...prev, orderMode: v as OrderMode }))}
              tooltip="Snake reverses player order on odd rounds (1-2-3 then 3-2-1). Helps fairness."
            />
            <NumericField label="Timer per turn" min={5} max={60} value={settings.timeLimitSeconds} onChange={(v) => setSettings((prev) => ({ ...prev, timeLimitSeconds: v }))} suffix="sec" />
            <NumericField label="Row reveal" min={0.4} max={2.5} step={0.1} value={settings.addSubRevealSeconds} onChange={(v) => setSettings((prev) => ({ ...prev, addSubRevealSeconds: v }))} suffix="sec" />
            <NumericField label="Auto advance" min={800} max={3000} step={100} value={settings.autoAdvanceMs} onChange={(v) => setSettings((prev) => ({ ...prev, autoAdvanceMs: v }))} suffix="ms" />
            <SelectField
              label="Voice mode"
              value={settings.voiceMode}
              options={[
                { value: "auto", label: "Auto listening" },
                { value: "push_to_talk", label: "Push to talk" },
              ]}
              onChange={(v) => setSettings((prev) => ({ ...prev, voiceMode: v as VoiceMode }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 18 }} className="arena-grid">
            {[
              {
                label: "Voice recognition",
                description: speechSupported ? "Hear spoken numeric answers." : "Not supported in this browser.",
                value: settings.voiceEnabled,
                onChange: (checked: boolean) => setSettings((prev) => ({ ...prev, voiceEnabled: checked })),
                disabled: !speechSupported,
              },
              {
                label: "Keyboard fallback",
                description: "Keep a quiet manual lane available.",
                value: settings.allowKeyboardFallback,
                onChange: (checked: boolean) => setSettings((prev) => ({ ...prev, allowKeyboardFallback: checked })),
              },
              {
                label: "Show correct answer",
                description: "Reveal the answer after wrong turns.",
                value: settings.showCorrectOnWrong,
                onChange: (checked: boolean) => setSettings((prev) => ({ ...prev, showCorrectOnWrong: checked })),
              },
            ].map((toggle) => (
              <button
                key={toggle.label}
                type="button"
                disabled={toggle.disabled}
                onClick={() => toggle.onChange(!toggle.value)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 18,
                  border: `1px solid ${toggle.value ? "rgba(109,92,255,.25)" : "var(--arena-border)"}`,
                  background: toggle.value ? "rgba(109,92,255,.08)" : "rgba(255,255,255,.03)",
                  color: "var(--arena-text)",
                  opacity: toggle.disabled ? 0.55 : 1,
                  cursor: toggle.disabled ? "not-allowed" : "pointer",
                  transition: "all .18s",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ font: "700 .92rem var(--font-d)" }}>{toggle.label}</div>
                  <div className="arena-copy" style={{ marginTop: 4, fontSize: ".82rem" }}>{toggle.description}</div>
                </div>
                <div style={{
                  width: 48, height: 28, borderRadius: 999, flexShrink: 0, position: "relative",
                  background: toggle.value ? "linear-gradient(135deg, var(--arena-violet), var(--arena-teal))" : "rgba(255,255,255,.08)",
                  transition: "background .18s",
                }}>
                  <div style={{ position: "absolute", top: 3, left: toggle.value ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .16s ease" }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Launch */}
        <div className="arena-card arena-fade-up" style={{ padding: "18px 22px", marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="arena-section-title">Ready</div>
            <div className="arena-copy" style={{ marginTop: 6 }}>
              {players.length} players · {settings.rounds * settings.questionsPerRound * players.length} total turns
            </div>
            {setupError && <div style={{ marginTop: 8, color: "var(--arena-red)", font: "700 .9rem var(--font-d)" }}>{setupError}</div>}
          </div>
          <button className="arena-button primary" type="button" onClick={startArena} style={{ padding: "16px 24px", fontSize: ".95rem" }}>
            <Play size={18} />
            Start Classroom Arena
          </button>
        </div>
      </div>
    </div>
  );
}
