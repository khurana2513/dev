import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, X, Sparkles, Play, Zap, Target, Flame, Loader2, RotateCcw, Square, Star, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { savePracticeSession, PracticeSessionData } from "../lib/userApi";
import { useBadgeUnlockStore } from "../stores/badgeUnlockStore";
import { useStreakCelebrationStore } from "../stores/streakCelebrationStore";
import { usePointRules, buildPointsLookup } from "../hooks/usePointRules";
import TimeLimitSlider from "../components/TimeLimitSlider";
import ErrorBoundary from "../components/ErrorBoundary";

// ────────────────────────────────────────────────
// Preset definitions – each entry maps to a seed rule
// ────────────────────────────────────────────────

interface PresetOption {
  label: string;
  presetKey: string;          // matches seed rule preset_key
  points: number;             // display hint (overridden by API at runtime)
  /** Setter callback receives (state setters) to auto-configure digit fields */
  apply: (s: Record<string, (v: number) => void>) => void;
}

const MENTAL_PRESETS: Record<string, PresetOption[]> = {
  multiplication: [
    { label: "2 × 1", presetKey: "2x1", points: 3, apply: s => { s.setA(2); s.setB(1); } },
    { label: "3 × 1", presetKey: "3x1", points: 3, apply: s => { s.setA(3); s.setB(1); } },
    { label: "4 × 1", presetKey: "4x1", points: 5, apply: s => { s.setA(4); s.setB(1); } },
    { label: "2 × 2", presetKey: "2x2", points: 5, apply: s => { s.setA(2); s.setB(2); } },
    { label: "3 × 2", presetKey: "3x2", points: 8, apply: s => { s.setA(3); s.setB(2); } },
    { label: "4 × 2", presetKey: "4x2", points: 8, apply: s => { s.setA(4); s.setB(2); } },
  ],
  division: [
    { label: "2 ÷ 1", presetKey: "2d1", points: 3, apply: s => { s.setA(2); s.setB(1); } },
    { label: "3 ÷ 1", presetKey: "3d1", points: 3, apply: s => { s.setA(3); s.setB(1); } },
    { label: "4 ÷ 1", presetKey: "4d1", points: 5, apply: s => { s.setA(4); s.setB(1); } },
    { label: "3 ÷ 2", presetKey: "3d2", points: 5, apply: s => { s.setA(3); s.setB(2); } },
    { label: "4 ÷ 2", presetKey: "4d2", points: 8, apply: s => { s.setA(4); s.setB(2); } },
    { label: "4 ÷ 3", presetKey: "4d3", points: 8, apply: s => { s.setA(4); s.setB(3); } },
  ],
  decimal_multiplication: [
    { label: "1 × 0", presetKey: "1x0", points: 3, apply: s => { s.setA(1); s.setB(0); } },
    { label: "1 × 1", presetKey: "1x1", points: 3, apply: s => { s.setA(1); s.setB(1); } },
    { label: "2 × 1", presetKey: "2x1", points: 5, apply: s => { s.setA(2); s.setB(1); } },
    { label: "3 × 1", presetKey: "3x1", points: 5, apply: s => { s.setA(3); s.setB(1); } },
    { label: "2 × 2", presetKey: "2x2", points: 8, apply: s => { s.setA(2); s.setB(2); } },
    { label: "3 × 2", presetKey: "3x2", points: 8, apply: s => { s.setA(3); s.setB(2); } },
  ],
  decimal_division: [
    { label: "2 ÷ 1", presetKey: "2d1", points: 3, apply: s => { s.setA(2); s.setB(1); } },
    { label: "3 ÷ 1", presetKey: "3d1", points: 3, apply: s => { s.setA(3); s.setB(1); } },
    { label: "4 ÷ 1", presetKey: "4d1", points: 5, apply: s => { s.setA(4); s.setB(1); } },
    { label: "3 ÷ 2", presetKey: "3d2", points: 5, apply: s => { s.setA(3); s.setB(2); } },
    { label: "4 ÷ 2", presetKey: "4d2", points: 8, apply: s => { s.setA(4); s.setB(2); } },
    { label: "4 ÷ 3", presetKey: "4d3", points: 8, apply: s => { s.setA(4); s.setB(3); } },
  ],
  lcm: [
    { label: "(1, 1)", presetKey: "1_1", points: 3, apply: s => { s.setA(1); s.setB(1); } },
    { label: "(2, 1)", presetKey: "2_1", points: 3, apply: s => { s.setA(2); s.setB(1); } },
    { label: "(2, 2)", presetKey: "2_2", points: 5, apply: s => { s.setA(2); s.setB(2); } },
    { label: "(3, 2)", presetKey: "3_2", points: 5, apply: s => { s.setA(3); s.setB(2); } },
  ],
  gcd: [
    { label: "(1, 1)", presetKey: "1_1", points: 3, apply: s => { s.setA(1); s.setB(1); } },
    { label: "(2, 1)", presetKey: "2_1", points: 3, apply: s => { s.setA(2); s.setB(1); } },
    { label: "(2, 2)", presetKey: "2_2", points: 5, apply: s => { s.setA(2); s.setB(2); } },
    { label: "(3, 2)", presetKey: "3_2", points: 5, apply: s => { s.setA(3); s.setB(2); } },
  ],
  square_root: [
    { label: "2 Digit", presetKey: "2d", points: 3, apply: s => { s.setA(2); } },
    { label: "3 Digit", presetKey: "3d", points: 3, apply: s => { s.setA(3); } },
    { label: "4 Digit", presetKey: "4d", points: 5, apply: s => { s.setA(4); } },
    { label: "5 Digit", presetKey: "5d", points: 5, apply: s => { s.setA(5); } },
    { label: "6 Digit", presetKey: "6d", points: 8, apply: s => { s.setA(6); } },
    { label: "7 Digit", presetKey: "7d", points: 8, apply: s => { s.setA(7); } },
    { label: "8 Digit", presetKey: "8d", points: 8, apply: s => { s.setA(8); } },
  ],
  cube_root: [
    { label: "3 Digit", presetKey: "3d", points: 3, apply: s => { s.setA(3); } },
    { label: "4 Digit", presetKey: "4d", points: 3, apply: s => { s.setA(4); } },
    { label: "5 Digit", presetKey: "5d", points: 5, apply: s => { s.setA(5); } },
    { label: "6 Digit", presetKey: "6d", points: 5, apply: s => { s.setA(6); } },
    { label: "7 Digit", presetKey: "7d", points: 8, apply: s => { s.setA(7); } },
    { label: "8 Digit", presetKey: "8d", points: 8, apply: s => { s.setA(8); } },
  ],
  percentage: [
    { label: "2-Digit", presetKey: "2d", points: 3, apply: s => { s.setA(2); } },
    { label: "3-Digit", presetKey: "3d", points: 3, apply: s => { s.setA(3); } },
    { label: "4-Digit", presetKey: "4d", points: 5, apply: s => { s.setA(4); } },
    { label: "5-Digit", presetKey: "5d", points: 5, apply: s => { s.setA(5); } },
    { label: "6-Digit", presetKey: "6d", points: 8, apply: s => { s.setA(6); } },
    { label: "7-Digit", presetKey: "7d", points: 8, apply: s => { s.setA(7); } },
  ],
  add_sub: [
    { label: "3–5 Rows", presetKey: "rows_3_5", points: 3, apply: s => { s.setA(3); } },
    { label: "6–9 Rows", presetKey: "rows_6_9", points: 5, apply: s => { s.setA(6); } },
    { label: "10+ Rows", presetKey: "rows_10_up", points: 8, apply: s => { s.setA(10); } },
  ],
  integer_add_sub: [
    { label: "3–5 Rows", presetKey: "rows_3_5", points: 3, apply: s => { s.setA(3); } },
    { label: "6–9 Rows", presetKey: "rows_6_9", points: 5, apply: s => { s.setA(6); } },
    { label: "10+ Rows", presetKey: "rows_10_up", points: 8, apply: s => { s.setA(10); } },
  ],
};

/** Map frontend operation name → backend engine operation name */
const _OP_MAP_FE: Record<string, string> = {
  multiplication: "multiply",
  division: "divide",
  decimal_multiplication: "decimal_multiply",
  decimal_division: "decimal_divide",
};
function toEngineOp(op: string) { return _OP_MAP_FE[op] || op; }

type OperationType = 
  | "multiplication" 
  | "division" 
  | "add_sub"
  | "decimal_multiplication"
  | "decimal_division"
  | "integer_add_sub"
  | "lcm"
  | "gcd"
  | "square_root"
  | "cube_root"
  | "percentage";

interface MultiplicationQuestion {
  id: number;
  type: "multiplication";
  multiplicand: number;
  multiplier: number;
  answer: number;
}

interface DivisionQuestion {
  id: number;
  type: "division";
  dividend: number;
  divisor: number;
  answer: number;
}

interface AddSubQuestion {
  id: number;
  type: "add_sub";
  numbers: number[];
  operators: string[]; // ["+", "-", "+", ...]
  answer: number;
}

interface DecimalMultiplicationQuestion {
  id: number;
  type: "decimal_multiplication";
  multiplicand: number;
  multiplier: number;
  multiplicandDecimals: number;
  multiplierDecimals: number;
  answer: number;
}

interface DecimalDivisionQuestion {
  id: number;
  type: "decimal_division";
  dividend: number;
  divisor: number;
  dividendDecimals: number;
  divisorDecimals: number;
  answer: number;
}

interface IntegerAddSubQuestion {
  id: number;
  type: "integer_add_sub";
  numbers: number[];
  operators: string[];
  answer: number;
}

interface LCMQuestion {
  id: number;
  type: "lcm";
  first: number;
  second: number;
  answer: number;
}

interface GCDQuestion {
  id: number;
  type: "gcd";
  first: number;
  second: number;
  answer: number;
}

interface SquareRootQuestion {
  id: number;
  type: "square_root";
  number: number;
  answer: number;
}

interface CubeRootQuestion {
  id: number;
  type: "cube_root";
  number: number;
  answer: number;
}

interface PercentageQuestion {
  id: number;
  type: "percentage";
  number: number;
  percentage: number;
  answer: number;
}

type Question = 
  | MultiplicationQuestion 
  | DivisionQuestion 
  | AddSubQuestion
  | DecimalMultiplicationQuestion
  | DecimalDivisionQuestion
  | IntegerAddSubQuestion
  | LCMQuestion
  | GCDQuestion
  | SquareRootQuestion
  | CubeRootQuestion
  | PercentageQuestion;

// Numeric input component that allows complete deletion with error display
function DecimalNumericInput({
  value,
  onChange,
  min,
  max,
  step = 0.1,
  className = "",
  errorMessage,
  disabled = false,
}: {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  errorMessage?: string;
  disabled?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState<string>(String(value));
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef<boolean>(false);
  
  // Sync display value when prop value changes (but not if user is currently editing)
  useEffect(() => {
    if (!isEditingRef.current) {
      setDisplayValue(value.toFixed(1));
      setError("");
    }
  }, [value]);

  const validateAndSetError = (num: number): string => {
    if (num < min) {
      return `Minimum value is ${min}`;
    }
    if (num > max) {
      return `Maximum value is ${max}`;
    }
    return "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        disabled={disabled}
        onFocus={() => {
          if (!disabled) {
          isEditingRef.current = true;
          setError("");
          }
        }}
        onChange={(e) => {
          if (disabled) return;
          const val = e.target.value;
          // Allow numbers with optional decimal point and digits
          if (val === "" || /^\d*\.?\d*$/.test(val)) {
            setDisplayValue(val);
            if (val !== "" && val !== ".") {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                const err = validateAndSetError(num);
                setError(err);
                // Round to nearest step
                const roundedNum = Math.round(num / step) * step;
                if (err === "" && roundedNum >= min && roundedNum <= max) {
                  onChange(Number(roundedNum.toFixed(1)));
                }
              }
            } else {
              setError("");
            }
          }
        }}
        onBlur={(e) => {
          if (disabled) return;
          isEditingRef.current = false;
          const val = e.target.value;
          if (val === "" || val === "." || isNaN(parseFloat(val))) {
            const defaultVal = min;
            onChange(defaultVal);
            setDisplayValue(defaultVal.toFixed(1));
            setError("");
          } else {
            const num = parseFloat(val);
            const roundedNum = Math.round(num / step) * step;
            const clampedNum = Math.max(min, Math.min(max, roundedNum));
            onChange(Number(clampedNum.toFixed(1)));
            setDisplayValue(clampedNum.toFixed(1));
            setError("");
          }
        }}
        onKeyDown={(e) => {
          if (disabled || e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
          }
        }}
        className={className}
      />
      {(error || errorMessage) && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error || errorMessage}</p>
      )}
    </div>
  );
}

function NumericInput({
  value,
  onChange,
  min,
  max,
  className = "",
  errorMessage,
  disabled = false,
}: {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  className?: string;
  errorMessage?: string;
  disabled?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState<string>(String(value));
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef<boolean>(false);
  
  // Sync display value when prop value changes (but not if user is currently editing)
  useEffect(() => {
    // Only update if user is not currently editing
    if (!isEditingRef.current) {
      setDisplayValue(String(value));
      setError("");
    }
  }, [value]);

  const validateAndSetError = (num: number): string => {
    if (num < min) {
      return `Minimum value is ${min}`;
    }
    if (num > max) {
      return `Maximum value is ${max}`;
    }
    return "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        disabled={disabled}
        onFocus={() => {
          if (!disabled) {
          isEditingRef.current = true;
          setError("");
          }
        }}
        onChange={(e) => {
          if (disabled) return;
          const val = e.target.value;
          if (val === "" || /^\d+$/.test(val)) {
            setDisplayValue(val);
            if (val !== "") {
              const num = parseInt(val);
              if (!isNaN(num)) {
                const err = validateAndSetError(num);
                setError(err);
                if (err === "" && num >= min && num <= max) {
                  onChange(num);
                }
              }
            } else {
              setError("");
            }
          }
        }}
        onBlur={(e) => {
          if (disabled) return;
          isEditingRef.current = false;
          const val = e.target.value;
          if (val === "" || isNaN(parseInt(val))) {
            // If field is empty on blur, set to min (required for valid value)
            // But allow empty state while user is editing
            onChange(min);
            setDisplayValue(String(min));
            setError("");
          } else {
            const num = parseInt(val);
            const clampedNum = Math.max(min, Math.min(max, num));
            onChange(clampedNum);
            setDisplayValue(String(clampedNum));
            setError("");
          }
        }}
        onKeyDown={(e) => {
          if (disabled || e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
          }
        }}
        className={className}
      />
      {(error || errorMessage) && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error || errorMessage}</p>
      )}
    </div>
  );
}

export default function Mental() {
  const [operationType, setOperationType] = useState<OperationType>("add_sub");
  const [studentName, setStudentName] = useState("");
  const [studentNameError, setStudentNameError] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  
  // Multiplication/Division inputs
  const [multiplicandDigits, setMultiplicandDigits] = useState(2);
  const [multiplierDigits, setMultiplierDigits] = useState(1);
  const [dividendDigits, setDividendDigits] = useState(2);
  const [divisorDigits, setDivisorDigits] = useState(1);
  
  // Add/Sub inputs
  const [addSubDigits, setAddSubDigits] = useState(2);
  const [addSubRows, setAddSubRows] = useState(3);
  
  // Decimal Multiplication inputs
  const [decimalMultMultiplicandDigits, setDecimalMultMultiplicandDigits] = useState(2);
  const [decimalMultMultiplierDigits, setDecimalMultMultiplierDigits] = useState(1);
  
  // Decimal Division inputs
  const [decimalDivDividendDigits, setDecimalDivDividendDigits] = useState(2);
  const [decimalDivDivisorDigits, setDecimalDivDivisorDigits] = useState(1);
  
  // Integer Add/Sub inputs
  const [integerAddSubDigits, setIntegerAddSubDigits] = useState(2);
  const [integerAddSubRows, setIntegerAddSubRows] = useState(3);
  
  // LCM/GCD inputs
  const [lcmGcdFirstDigits, setLcmGcdFirstDigits] = useState(2);
  const [lcmGcdSecondDigits, setLcmGcdSecondDigits] = useState(2);
  
  // Square/Cube Root inputs
  const [rootDigits, setRootDigits] = useState(4);
  
  // Percentage inputs
  const [percentageMin, setPercentageMin] = useState(1);
  const [percentageMax, setPercentageMax] = useState(100);
  const [percentageNumberDigits, setPercentageNumberDigits] = useState(4);
  
  // Time limits
  const [timeLimit, setTimeLimit] = useState(15);
  const [addSubRowTime, setAddSubRowTime] = useState(1.0); // Time to show each row (Duration)
  const addSubAnswerTime = 15; // Fixed: Time to answer after all rows shown (always 15s)
  
  // Mode selection
  type DifficultyMode = "custom" | "easy" | "medium" | "hard";
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>("custom");

  // Standard / Custom config mode for point system
  type ConfigMode = "standard" | "custom";
  const [configMode, setConfigMode] = useState<ConfigMode>("standard");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("");

  // Point rules from API
  const { data: mmRules = [] } = usePointRules("mental_math");
  const pointsLookup = useMemo(() => buildPointsLookup(mmRules), [mmRules]);

  /** Resolve the live points value for a given preset key and engine operation */
  const getPresetPoints = (engineOp: string, pk: string): number => {
    return pointsLookup.get(`${engineOp}:${pk}`) ?? 0;
  };

  /** Auto-select the first preset when switching to standard mode or changing operation */
  useEffect(() => {
    if (configMode === "standard") {
      const presets = MENTAL_PRESETS[operationType];
      if (presets && presets.length > 0) {
        const first = presets[0];
        setSelectedPresetKey(first.presetKey);
        // Apply digit setters for the first preset
        applyPreset(first);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configMode, operationType]);

  /** Digit setter map — used by PresetOption.apply */
  const presetSetters = (): Record<string, (v: number) => void> => {
    const op = operationType;
    if (op === "multiplication") return { setA: setMultiplicandDigits, setB: setMultiplierDigits };
    if (op === "division") return { setA: setDividendDigits, setB: setDivisorDigits };
    if (op === "decimal_multiplication") return { setA: setDecimalMultMultiplicandDigits, setB: setDecimalMultMultiplierDigits };
    if (op === "decimal_division") return { setA: setDecimalDivDividendDigits, setB: setDecimalDivDivisorDigits };
    if (op === "lcm" || op === "gcd") return { setA: setLcmGcdFirstDigits, setB: setLcmGcdSecondDigits };
    if (op === "square_root" || op === "cube_root") return { setA: setRootDigits };
    if (op === "percentage") return { setA: setPercentageNumberDigits };
    if (op === "add_sub") return { setA: setAddSubRows };
    if (op === "integer_add_sub") return { setA: setIntegerAddSubRows };
    return {};
  };

  const applyPreset = (preset: PresetOption) => {
    preset.apply(presetSetters());
  };

  /** Derive preset_key from current digit config (for save — same as backend derive_preset_key_from_digits) */
  const derivePresetKey = (): string => {
    const op = toEngineOp(operationType);
    if (op === "multiply" || op === "decimal_multiply") {
      const a = op === "multiply" ? multiplicandDigits : decimalMultMultiplicandDigits;
      const b = op === "multiply" ? multiplierDigits : decimalMultMultiplierDigits;
      return `${a}x${b}`;
    }
    if (op === "divide" || op === "decimal_divide") {
      const a = op === "divide" ? dividendDigits : decimalDivDividendDigits;
      const b = op === "divide" ? divisorDigits : decimalDivDivisorDigits;
      return `${a}d${b}`;
    }
    if (op === "lcm" || op === "gcd") return `${lcmGcdFirstDigits}_${lcmGcdSecondDigits}`;
    if (op === "square_root" || op === "cube_root") return `${rootDigits}d`;
    if (op === "percentage") return `${percentageNumberDigits}d`;
    if (op === "tables") return "1x1";
    // add_sub / integer_add_sub: derive tier from actual row count
    if (op === "add_sub" || op === "integer_add_sub") {
      const rows = op === "add_sub" ? addSubRows : integerAddSubRows;
      if (rows <= 5) return "rows_3_5";
      if (rows <= 9) return "rows_6_9";
      return "rows_10_up";
    }
    return "";
  };

  /** Current points preview (shown on the start button) */
  const currentPointsPreview = useMemo(() => {
    if (configMode === "custom") return 0;
    const engineOp = toEngineOp(operationType);
    // For add_sub / integer_add_sub, points depend on row count
    if (operationType === "add_sub" || operationType === "integer_add_sub") {
      const rows = operationType === "add_sub" ? addSubRows : integerAddSubRows;
      if (rows <= 5) return getPresetPoints(engineOp, "rows_3_5");
      if (rows <= 9) return getPresetPoints(engineOp, "rows_6_9");
      return getPresetPoints(engineOp, "rows_10_up");
    }
    const pk = selectedPresetKey || derivePresetKey();
    return getPresetPoints(engineOp, pk);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configMode, operationType, selectedPresetKey, pointsLookup, addSubRows, integerAddSubRows, multiplicandDigits, multiplierDigits, dividendDigits, divisorDigits, decimalMultMultiplicandDigits, decimalMultMultiplierDigits, decimalDivDividendDigits, decimalDivDivisorDigits, lcmGcdFirstDigits, lcmGcdSecondDigits, rootDigits, percentageNumberDigits]);
  
  const [isStarted, setIsStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<Array<{ question: Question; userAnswer: number | null; isCorrect: boolean }>>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Add/Sub specific state
  const [addSubDisplayIndex, setAddSubDisplayIndex] = useState(0); // Which row is currently being shown
  const [addSubDisplayedNumbers, setAddSubDisplayedNumbers] = useState<string>(""); // What's currently displayed
  const [addSubCurrentItem, setAddSubCurrentItem] = useState<string>(""); // Current item being shown in big text
  const [addSubDisplayedItems, setAddSubDisplayedItems] = useState<string[]>([]); // Items that have been shown (for side view)
  const [isShowingAnswerTime, setIsShowingAnswerTime] = useState(false);
  const isShowingAnswerTimeRef = useRef(false); // mirror for stale-closure-safe reads inside timer callbacks
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const addSubRowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const currentAnswerRef = useRef<string>("");
  const currentQuestionIndexRef = useRef<number>(0);
  const questionsRef = useRef<Question[]>([]);
  const isProcessingSubmissionRef = useRef<boolean>(false);
  const resultsRef = useRef<Array<{ question: Question; userAnswer: number | null; isCorrect: boolean }>>([]);
  const isTimerRunningRef = useRef<boolean>(false);
  
  // Progress tracking
  const { isAuthenticated, user, refreshUser } = useAuth();
  
  // Auto-fill student name from user settings
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use display_name if set, otherwise use name from Google
      const nameToUse = (user as any).display_name || user.name || "";
      if (nameToUse && !studentName) {
        setStudentName(nameToUse);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);
  const sessionStartTimeRef = useRef<number>(0);
  const attemptTimesRef = useRef<Map<number, number>>(new Map()); // question index -> start time
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(0); // Session timer in seconds
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Session state persistence
  const SESSION_STORAGE_KEY = "mental_math_session_state";
  const [sessionState, setSessionState] = useState<"idle" | "started" | "in_progress" | "completed" | "aborted" | "recovered">("idle");
  
  // Save session state to localStorage
  const saveSessionState = () => {
    if (!isStarted || isGameOver) return; // Don't save if not started or already completed
    
    try {
      const state = {
        version: "1.0",
        state: "in_progress",
        timestamp: Date.now(),
        operationType,
        difficultyMode,
        numQuestions,
        studentName,
        questions: questionsRef.current,
        currentQuestionIndex: currentQuestionIndexRef.current,
        results: resultsRef.current,
        score,
        currentAnswer,
        timeRemaining,
        sessionStartTime: sessionStartTimeRef.current,
        attemptTimes: Array.from(attemptTimesRef.current.entries()),
        // Add/Sub specific state
        addSubDisplayIndex,
        addSubCurrentItem,
        addSubDisplayedItems,
        isShowingAnswerTime,
        // Settings
        multiplicandDigits,
        multiplierDigits,
        dividendDigits,
        divisorDigits,
        addSubDigits,
        addSubRows,
        decimalMultMultiplicandDigits,
        decimalMultMultiplierDigits,
        decimalDivDividendDigits,
        decimalDivDivisorDigits,
        integerAddSubDigits,
        integerAddSubRows,
        lcmGcdFirstDigits,
        lcmGcdSecondDigits,
        rootDigits,
        percentageMin,
        percentageMax,
        percentageNumberDigits,
        timeLimit,
        addSubRowTime,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
      console.log("💾 [SESSION] State saved to localStorage");
    } catch (error) {
      console.error("❌ [SESSION] Failed to save state:", error);
    }
  };
  
  // Restore session state from localStorage
  const restoreSessionState = (): boolean => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) return false;
      
      const state = JSON.parse(saved);
      if (!state || state.state !== "in_progress") return false;
      
      // Check if session is too old (more than 24 hours)
      const age = Date.now() - state.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.log("⚠️ [SESSION] Saved session too old, clearing");
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return false;
      }
      
      // Restore state
      setOperationType(state.operationType);
      setDifficultyMode(state.difficultyMode);
      setNumQuestions(state.numQuestions);
      setStudentName(state.studentName || "");
      setQuestions(state.questions || []);
      setCurrentQuestionIndex(state.currentQuestionIndex || 0);
      setResults(state.results || []);
      setScore(state.score || 0);
      setCurrentAnswer(state.currentAnswer || "");
      setTimeRemaining(state.timeRemaining || 0);
      sessionStartTimeRef.current = state.sessionStartTime || Date.now();
      
      // Restore attempt times
      if (state.attemptTimes) {
        attemptTimesRef.current = new Map(state.attemptTimes);
      }
      
      // Restore refs
      questionsRef.current = state.questions || [];
      currentQuestionIndexRef.current = state.currentQuestionIndex || 0;
      resultsRef.current = state.results || [];
      
      // Restore Add/Sub state
      setAddSubDisplayIndex(state.addSubDisplayIndex || 0);
      setAddSubCurrentItem(state.addSubCurrentItem || "");
      setAddSubDisplayedItems(state.addSubDisplayedItems || []);
      isShowingAnswerTimeRef.current = state.isShowingAnswerTime || false;
      setIsShowingAnswerTime(state.isShowingAnswerTime || false);
      
      // Restore settings
      if (state.multiplicandDigits !== undefined) setMultiplicandDigits(state.multiplicandDigits);
      if (state.multiplierDigits !== undefined) setMultiplierDigits(state.multiplierDigits);
      if (state.dividendDigits !== undefined) setDividendDigits(state.dividendDigits);
      if (state.divisorDigits !== undefined) setDivisorDigits(state.divisorDigits);
      if (state.addSubDigits !== undefined) setAddSubDigits(state.addSubDigits);
      if (state.addSubRows !== undefined) setAddSubRows(state.addSubRows);
      if (state.integerAddSubDigits !== undefined) setIntegerAddSubDigits(state.integerAddSubDigits);
      if (state.integerAddSubRows !== undefined) setIntegerAddSubRows(state.integerAddSubRows);
      if (state.timeLimit !== undefined) setTimeLimit(state.timeLimit);
      if (state.addSubRowTime !== undefined) setAddSubRowTime(state.addSubRowTime);
      
      setSessionState("recovered");
      console.log("✅ [SESSION] State restored from localStorage");
      return true;
    } catch (error) {
      console.error("❌ [SESSION] Failed to restore state:", error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }
  };
  
  // Clear session state
  const clearSessionState = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionState("idle");
    console.log("🗑️ [SESSION] State cleared");
  };
  
  // Auto-save session state periodically
  useEffect(() => {
    if (!isStarted || isGameOver) return;
    
    const interval = setInterval(() => {
      saveSessionState();
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(interval);
  }, [isStarted, isGameOver, currentQuestionIndex, results, score, currentAnswer, timeRemaining]);
  
  // Save state on critical changes
  useEffect(() => {
    if (isStarted && !isGameOver) {
      saveSessionState();
    }
  }, [currentQuestionIndex, results.length, score]);
  
  // Check for recovery on mount
  useEffect(() => {
    const recovered = restoreSessionState();
    if (recovered) {
      // Show recovery prompt
      const shouldRecover = window.confirm(
        "A previous session was found. Would you like to continue where you left off?"
      );
      if (shouldRecover) {
        setIsStarted(true);
        setSessionState("recovered");
        // Resume timer if needed
        if (operationType === "add_sub" || operationType === "integer_add_sub") {
          if (isShowingAnswerTime) {
            startTimer();
          } else {
            startAddSubQuestion();
          }
        } else {
          if (timeRemaining > 0) {
            startTimer();
          }
        }
        // Resume session timer
        sessionTimerRef.current = setInterval(() => {
          if (sessionStartTimeRef.current > 0) {
            const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
            setSessionElapsedTime(elapsed);
          }
        }, 1000);
      } else {
        clearSessionState();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Generate questions based on operation type
  const generateQuestions = (count: number): Question[] => {
    const questionsList: Question[] = [];
    
    if (operationType === "multiplication") {
      for (let i = 0; i < count; i++) {
        const multiplicandMin = Math.pow(10, multiplicandDigits - 1);
        const multiplicandMax = Math.pow(10, multiplicandDigits) - 1;
        const multiplierMin = Math.pow(10, multiplierDigits - 1);
        const multiplierMax = Math.pow(10, multiplierDigits) - 1;
        
        const multiplicand = Math.floor(Math.random() * (multiplicandMax - multiplicandMin + 1)) + multiplicandMin;
        const multiplier = Math.floor(Math.random() * (multiplierMax - multiplierMin + 1)) + multiplierMin;
        
        questionsList.push({
          id: i + 1,
          type: "multiplication",
          multiplicand,
          multiplier,
          answer: multiplicand * multiplier
        });
      }
    } else if (operationType === "division") {
      for (let i = 0; i < count; i++) {
        const divisorMin = Math.pow(10, divisorDigits - 1);
        const divisorMax = Math.pow(10, divisorDigits) - 1;
        
        // Generate divisor first
        const divisor = Math.floor(Math.random() * (divisorMax - divisorMin + 1)) + divisorMin;
        
        // Calculate the quotient range that will give us a dividend with the correct number of digits
        const dividendMin = Math.pow(10, dividendDigits - 1);
        const dividendMax = Math.pow(10, dividendDigits) - 1;
        
        // Calculate quotient range: dividendMin/divisor to dividendMax/divisor
        const quotientMin = Math.ceil(dividendMin / divisor);
        const quotientMax = Math.floor(dividendMax / divisor);
        
        // Generate a quotient in the valid range
        const quotient = Math.floor(Math.random() * (quotientMax - quotientMin + 1)) + quotientMin;
        const dividend = divisor * quotient; // Ensure clean division
        
        questionsList.push({
          id: i + 1,
          type: "division",
          dividend,
          divisor,
          answer: quotient
        });
      }
    } else if (operationType === "add_sub") {
      for (let i = 0; i < count; i++) {
        const numMin = Math.pow(10, addSubDigits - 1);
        const numMax = Math.pow(10, addSubDigits) - 1;
        
        const numbers: number[] = [];
        const operators: string[] = [];
        let result = 0;
        
        // Generate first number (always positive, no operator)
        const firstNum = Math.floor(Math.random() * (numMax - numMin + 1)) + numMin;
        numbers.push(firstNum);
        result = firstNum;
        
        // Generate remaining numbers with random operators, ensuring result never goes negative during generation
        for (let j = 1; j < addSubRows; j++) {
          const num = Math.floor(Math.random() * (numMax - numMin + 1)) + numMin;
          // If current result is less than num, we must add (can't subtract or result would go negative)
          const isAdd = result < num ? true : Math.random() > 0.5;
          
          operators.push(isAdd ? "+" : "-");
          numbers.push(num);
          result += isAdd ? num : -num;
          
          // Safety check: if result went negative (shouldn't happen), force it positive by changing last operator to add
          if (result < 0) {
            operators[operators.length - 1] = "+";
            result = numbers.slice(0, -1).reduce((sum, n, idx) => {
              if (idx === 0) return n;
              return operators[idx - 1] === "+" ? sum + n : sum - n;
            }, numbers[0]) + num;
          }
        }
        
        // Ensure final answer is positive (regenerate if negative - this is a safety check)
        if (result < 0) {
          i--; // Retry this question
          continue;
        }
        
        questionsList.push({
          id: i + 1,
          type: "add_sub",
          numbers,
          operators,
          answer: result
        });
      }
    } else if (operationType === "decimal_multiplication") {
      for (let i = 0; i < count; i++) {
        // Generate multiplicand: digits_before_decimal + 1 decimal place
        const multiplicandMin = Math.pow(10, decimalMultMultiplicandDigits - 1);
        const multiplicandMax = Math.pow(10, decimalMultMultiplicandDigits) - 1;
        const multiplicandWhole = Math.floor(Math.random() * (multiplicandMax - multiplicandMin + 1)) + multiplicandMin;
        const multiplicandDecimal = Math.floor(Math.random() * 10);
        const multiplicand = (multiplicandWhole * 10 + multiplicandDecimal) / 10.0;
        
        // Generate multiplier
        let multiplier: number;
        if (decimalMultMultiplierDigits === 0) {
          // Whole number
          multiplier = Math.floor(Math.random() * 99) + 1;
        } else {
          // Decimal: digits_before_decimal + 1 decimal place
          const multiplierMin = Math.pow(10, decimalMultMultiplierDigits - 1);
          const multiplierMax = Math.pow(10, decimalMultMultiplierDigits) - 1;
          const multiplierWhole = Math.floor(Math.random() * (multiplierMax - multiplierMin + 1)) + multiplierMin;
          const multiplierDecimal = Math.floor(Math.random() * 10);
          multiplier = (multiplierWhole * 10 + multiplierDecimal) / 10.0;
        }
        
        const answer = multiplicand * multiplier;
        
        questionsList.push({
          id: i + 1,
          type: "decimal_multiplication",
          multiplicand,
          multiplier,
          multiplicandDecimals: 1,
          multiplierDecimals: decimalMultMultiplierDigits === 0 ? 0 : 1,
          answer: Math.round(answer * 100) / 100 // Round to 2 decimal places
        });
      }
    } else if (operationType === "decimal_division") {
      for (let i = 0; i < count; i++) {
        // Generate whole number divisor
        const divisorMin = Math.pow(10, decimalDivDivisorDigits - 1);
        const divisorMax = Math.pow(10, decimalDivDivisorDigits) - 1;
        const divisor = Math.floor(Math.random() * (divisorMax - divisorMin + 1)) + divisorMin;
        
        // Generate whole number dividend that will result in a decimal answer
        const dividendMin = Math.pow(10, decimalDivDividendDigits - 1);
        const dividendMax = Math.pow(10, decimalDivDividendDigits) - 1;
        
        // Generate a dividend that is NOT divisible by the divisor to ensure decimal answer
        let dividend: number;
        let attempts = 0;
        do {
          dividend = Math.floor(Math.random() * (dividendMax - dividendMin + 1)) + dividendMin;
          attempts++;
        } while (dividend % divisor === 0 && attempts < 100); // Ensure non-exact division
        
        const answer = dividend / divisor;
        
        questionsList.push({
          id: i + 1,
          type: "decimal_division",
          dividend,
          divisor,
          dividendDecimals: 0, // Whole numbers
          divisorDecimals: 0, // Whole numbers
          answer: Math.round(answer * 100) / 100 // Round to 2 decimal places
        });
      }
    } else if (operationType === "integer_add_sub") {
      for (let i = 0; i < count; i++) {
        const numMin = Math.pow(10, integerAddSubDigits - 1);
        const numMax = Math.pow(10, integerAddSubDigits) - 1;
        
        const numbers: number[] = [];
        const operators: string[] = [];
        let result = 0;
        
        const firstNum = Math.floor(Math.random() * (numMax - numMin + 1)) + numMin;
        numbers.push(firstNum);
        result = firstNum;
        
        for (let j = 1; j < integerAddSubRows; j++) {
          const num = Math.floor(Math.random() * (numMax - numMin + 1)) + numMin;
          const isAdd = Math.random() > 0.5;
          operators.push(isAdd ? "+" : "-");
          numbers.push(num);
          result += isAdd ? num : -num;
        }
        
        questionsList.push({
          id: i + 1,
          type: "integer_add_sub",
          numbers,
          operators,
          answer: result
        });
      }
    } else if (operationType === "lcm") {
      for (let i = 0; i < count; i++) {
        const firstMin = Math.pow(10, lcmGcdFirstDigits - 1);
        const firstMax = Math.pow(10, lcmGcdFirstDigits) - 1;
        const secondMin = Math.pow(10, lcmGcdSecondDigits - 1);
        const secondMax = Math.pow(10, lcmGcdSecondDigits) - 1;
        
        const first = Math.floor(Math.random() * (firstMax - firstMin + 1)) + firstMin;
        const second = Math.floor(Math.random() * (secondMax - secondMin + 1)) + secondMin;
        
        // Calculate LCM
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const lcm = (first * second) / gcd(first, second);
        
        questionsList.push({
          id: i + 1,
          type: "lcm",
          first,
          second,
          answer: lcm
        });
      }
    } else if (operationType === "gcd") {
      for (let i = 0; i < count; i++) {
        const firstMin = Math.pow(10, lcmGcdFirstDigits - 1);
        const firstMax = Math.pow(10, lcmGcdFirstDigits) - 1;
        const secondMin = Math.pow(10, lcmGcdSecondDigits - 1);
        const secondMax = Math.pow(10, lcmGcdSecondDigits) - 1;
        
        const first = Math.floor(Math.random() * (firstMax - firstMin + 1)) + firstMin;
        const second = Math.floor(Math.random() * (secondMax - secondMin + 1)) + secondMin;
        
        // Calculate GCD
        const gcdFunc = (a: number, b: number): number => b === 0 ? a : gcdFunc(b, a % b);
        const gcdValue = gcdFunc(first, second);
        
        questionsList.push({
          id: i + 1,
          type: "gcd",
          first,
          second,
          answer: gcdValue
        });
      }
    } else if (operationType === "square_root") {
      for (let i = 0; i < count; i++) {
        // Generate a perfect square
        const targetMin = Math.pow(10, rootDigits - 1);
        const targetMax = Math.pow(10, rootDigits) - 1;
        
        const minRoot = Math.ceil(Math.sqrt(targetMin));
        const maxRoot = Math.floor(Math.sqrt(targetMax));
        
        const root = Math.floor(Math.random() * (maxRoot - minRoot + 1)) + minRoot;
        const number = root * root;
        
        questionsList.push({
          id: i + 1,
          type: "square_root",
          number,
          answer: root
        });
      }
    } else if (operationType === "cube_root") {
      for (let i = 0; i < count; i++) {
        // Generate a perfect cube
        const targetMin = Math.pow(10, rootDigits - 1);
        const targetMax = Math.pow(10, rootDigits) - 1;
        
        const minRoot = Math.ceil(Math.cbrt(targetMin));
        const maxRoot = Math.floor(Math.cbrt(targetMax));
        
        const root = Math.floor(Math.random() * (maxRoot - minRoot + 1)) + minRoot;
        const number = root * root * root;
        
        questionsList.push({
          id: i + 1,
          type: "cube_root",
          number,
          answer: root
        });
      }
    } else if (operationType === "percentage") {
      for (let i = 0; i < count; i++) {
        const percentage = Math.floor(Math.random() * (percentageMax - percentageMin + 1)) + percentageMin;
        const numberMin = Math.pow(10, percentageNumberDigits - 1);
        const numberMax = Math.pow(10, percentageNumberDigits) - 1;
        const number = Math.floor(Math.random() * (numberMax - numberMin + 1)) + numberMin;
        
        const answer = (number * percentage) / 100;
        
        questionsList.push({
          id: i + 1,
          type: "percentage",
          number,
          percentage,
          answer: Math.round(answer * 100) / 100 // Round to 2 decimal places
        });
      }
    }
    
    return questionsList;
  };

  const startCountdown = () => {
    // Validate name is provided
    if (!studentName || studentName.trim() === "") {
      setStudentNameError("Name is required");
      return;
    }
    setStudentNameError("");
    
    // Scroll to top when starting practice
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Set session start time right when countdown ends, before game starts
          sessionStartTimeRef.current = Date.now();
          setSessionElapsedTime(0); // Reset session timer
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    console.log("🟢 [GAME] startGame called");
    const generatedQuestions = generateQuestions(numQuestions);
    
    // Validate questions were generated
    if (!generatedQuestions || generatedQuestions.length === 0) {
      console.error("❌ [GAME] Failed to generate questions");
      alert("Failed to generate questions. Please try again.");
      return;
    }
    
    console.log("✅ [GAME] Generated", generatedQuestions.length, "questions");
    console.log("✅ [GAME] First question:", generatedQuestions[0]);
    
    // Mark session as started
    setSessionState("started");
    
    // Update refs first (synchronous)
    questionsRef.current = generatedQuestions;
    currentQuestionIndexRef.current = 0;
    resultsRef.current = [];
    isProcessingSubmissionRef.current = false;
    
    // Update state (asynchronous)
    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setResults([]);
    setCurrentAnswer("");
    setIsGameOver(false);
    setAddSubDisplayIndex(0);
    setAddSubCurrentItem("");
    setAddSubDisplayedItems([]);
    isShowingAnswerTimeRef.current = false;
    setIsShowingAnswerTime(false);
    
    // Clear any existing timers
    if (addSubRowTimerRef.current) {
      clearTimeout(addSubRowTimerRef.current);
      addSubRowTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isTimerRunningRef.current = false;
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    // Start session timer (updates every second)
    sessionTimerRef.current = setInterval(() => {
      if (sessionStartTimeRef.current > 0) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        setSessionElapsedTime(elapsed);
      }
    }, 1000);
    
    // Set isStarted after all state is ready
    console.log("🟢 [GAME] Setting isStarted to true");
    setIsStarted(true);
    
    // Auto scroll to top on start
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Save initial state
    setTimeout(() => {
      saveSessionState();
    }, 500);
    
    // Use setTimeout to ensure state is updated before accessing questions
    setTimeout(() => {
      console.log("🟢 [GAME] Starting question display, operationType:", operationType);
      if (operationType === "add_sub" || operationType === "integer_add_sub") {
        startAddSubQuestion();
      } else {
        const effectiveTimeLimit = getTimeLimitForMode(difficultyMode, operationType);
        setTimeRemaining(effectiveTimeLimit);
        startTimer();
      }
    }, 100);
  };

  const startTimer = (customTimeLimit?: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Track start time for current question when timer starts
    const currentIndex = currentQuestionIndexRef.current;
    if (!attemptTimesRef.current.has(currentIndex)) {
      attemptTimesRef.current.set(currentIndex, Date.now());
    }
    
    // For add/sub operations in answer time, always use addSubAnswerTime (15s)
    // For other operations or if customTimeLimit is provided, use that
    // Otherwise, get fresh time limit from mode
    let effectiveTimeLimit: number;
    if (customTimeLimit !== undefined) {
      effectiveTimeLimit = customTimeLimit;
    } else if ((operationType === "add_sub" || operationType === "integer_add_sub") && isShowingAnswerTimeRef.current) {
      // For add/sub answer time, always use 15s
      effectiveTimeLimit = addSubAnswerTime;
    } else {
      // For other operations, get time limit from mode
      effectiveTimeLimit = getTimeLimitForMode(difficultyMode, operationType);
    }
    
    // Set initial time remaining BEFORE starting interval
    setTimeRemaining(effectiveTimeLimit);
    
    // Mark timer as running
    isTimerRunningRef.current = true;
    
    // Start timer immediately with correct initial value
    let currentTime = effectiveTimeLimit;
    
    timerRef.current = setInterval(() => {
      currentTime = currentTime - 1;
      
      if (currentTime <= 0) {
        // Clear timer immediately
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        isTimerRunningRef.current = false;
        setTimeRemaining(0);
        // Auto-submit when timer reaches 0
        setTimeout(() => {
          processAnswerSubmission(true);
        }, 0);
      } else {
        setTimeRemaining(currentTime);
      }
    }, 1000);
  };

  const startAddSubQuestion = () => {
    // Clear any existing timers first
    if (addSubRowTimerRef.current) {
      clearTimeout(addSubRowTimerRef.current);
      addSubRowTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Get current question from refs (always fresh)
    const q = questionsRef.current[currentQuestionIndexRef.current];
    
    // Validate question exists and is correct type
    if (!q || (q.type !== "add_sub" && q.type !== "integer_add_sub")) {
      return;
    }
    
    const currentQ = q as AddSubQuestion | IntegerAddSubQuestion;
    
    // Validate question has numbers
    if (!currentQ.numbers || currentQ.numbers.length === 0) {
      return;
    }
    
    // Reset state
    setAddSubDisplayIndex(0);
    isShowingAnswerTimeRef.current = false;
    setIsShowingAnswerTime(false);
    setTimeRemaining(0);
    setAddSubCurrentItem("");
    setAddSubDisplayedItems([]);
    
    // Track start time for this question (when answer time begins)
    // For add/sub, timing starts when answer time begins, not when rows start showing
    const questionIndex = currentQuestionIndexRef.current;
    
    // Store question data in local scope to avoid closure issues
    const questionNumbers = [...currentQ.numbers];
    const questionOperators = [...currentQ.operators];
    let currentItemIndex = 0; // Track which item we're showing (0 = first number)
    const questionIndexAtStart = currentQuestionIndexRef.current; // Capture index at start
    
    // Build items array: [number1, operator1+number2, operator2+number3, ...]
    // First item is just the first number, subsequent items are operator + number together (no space)
    const items: string[] = [];
    items.push(String(questionNumbers[0])); // First number without operator
    for (let i = 0; i < questionOperators.length; i++) {
      // Pair operator with the next number (no space between operator and number)
      items.push(`${questionOperators[i]}${questionNumbers[i + 1]}`);
    }
    
    // Show first number immediately
    setAddSubCurrentItem(items[0]);
    setAddSubDisplayIndex(0);
    
    // If only one number, go straight to answer time
    if (items.length === 1) {
      // Track start time when answer time begins
      attemptTimesRef.current.set(questionIndex, Date.now());
      isShowingAnswerTimeRef.current = true;
      setIsShowingAnswerTime(true);
      setTimeRemaining(addSubAnswerTime);
      startTimer(addSubAnswerTime); // Pass addSubAnswerTime explicitly
      return;
    }
    
    // Function to show next item - defined here to capture question data
    const showNextItem = () => {
      // Check if question index has changed (user moved to next question)
      if (currentQuestionIndexRef.current !== questionIndexAtStart) {
        addSubRowTimerRef.current = null;
        return;
      }
      
      // Move current item to displayed items (side view)
      const currentItem = items[currentItemIndex];
      setAddSubDisplayedItems(prev => [...prev, currentItem]);
      
      currentItemIndex++;
      
      // Check if we've shown all items
      if (currentItemIndex >= items.length) {
        // All items shown, transition to answer time
        // Track start time when answer time begins (this is when timing starts for add/sub)
        attemptTimesRef.current.set(questionIndexAtStart, Date.now());
        isShowingAnswerTimeRef.current = true;
        setIsShowingAnswerTime(true);
        setTimeRemaining(addSubAnswerTime);
        startTimer(addSubAnswerTime); // Pass addSubAnswerTime explicitly (always 15s)
        setAddSubCurrentItem(""); // Clear current item
        addSubRowTimerRef.current = null;
        return;
      }
      
      // Show next item in big text
      setAddSubCurrentItem(items[currentItemIndex]);
      setAddSubDisplayIndex(currentItemIndex);
      
      // Schedule next item
      addSubRowTimerRef.current = setTimeout(showNextItem, addSubRowTime * 1000) as any;
    };
    
    // Start showing next item after initial delay
    addSubRowTimerRef.current = setTimeout(showNextItem, addSubRowTime * 1000) as any;
  };

  // Shared submission logic - used by both handleSubmitAnswer and handleTimeUp
  const processAnswerSubmission = (allowEmpty: boolean = false) => {
    // Prevent multiple simultaneous calls
    if (isProcessingSubmissionRef.current) {
      return;
    }
    isProcessingSubmissionRef.current = true;
    
    // Check if we can submit (for add/sub operations)
    if ((operationType === "add_sub" || operationType === "integer_add_sub") && !isShowingAnswerTimeRef.current) {
      // Can't submit during row display phase
      isProcessingSubmissionRef.current = false;
      return;
    }
    
    // Capture current answer value - read from input ref first (most current), fallback to ref, then state
    const answerValue = answerInputRef.current?.value ?? currentAnswerRef.current ?? currentAnswer;
    
    // Don't allow empty answers unless explicitly allowed (for time up)
    if (!allowEmpty && answerValue === "") {
      isProcessingSubmissionRef.current = false;
      return;
    }
    
    // Clear all timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isTimerRunningRef.current = false;
    if (addSubRowTimerRef.current) {
      clearTimeout(addSubRowTimerRef.current);
      addSubRowTimerRef.current = null;
    }
    
    // Use refs to get current question (always fresh)
    const currentIndex = currentQuestionIndexRef.current;
    const currentQ = questionsRef.current[currentIndex];
    
    // Safety check
    if (!currentQ) {
      console.error("No question found at index", currentIndex);
      isProcessingSubmissionRef.current = false;
      return;
    }
    
    // Calculate time taken for this question
    const questionStartTime = attemptTimesRef.current.get(currentIndex) || sessionStartTimeRef.current;
    const timeTaken = (Date.now() - questionStartTime) / 1000; // in seconds
    
    // Get user answer (empty string becomes null)
    // For large integers, compare as strings to avoid precision loss
    let userAns: number | null = null;
    let isCorrect = false;
    
    if (answerValue !== "") {
      // Check if both user answer and correct answer are integers (no decimal point)
      const userAnswerStr = answerValue.trim();
      const correctAnswerStr = String(currentQ.answer);
      const userHasDecimal = userAnswerStr.includes('.');
      const correctHasDecimal = correctAnswerStr.includes('.') || correctAnswerStr.includes('e') || correctAnswerStr.includes('E');
      
      // For large integers (no decimals), compare as strings to preserve precision
      if (!userHasDecimal && !correctHasDecimal) {
        // Both are integers - compare as strings
        isCorrect = userAnswerStr === correctAnswerStr;
        // Still store as number for consistency, but comparison was done as string
        userAns = parseFloat(userAnswerStr);
      } else {
        // At least one has decimals - use float comparison with tolerance
        userAns = parseFloat(userAnswerStr);
        isCorrect = !isNaN(userAns) && Math.abs(userAns - currentQ.answer) < 0.01;
      }
    }
    
    // Create the result entry
    const resultEntry = { question: currentQ, userAnswer: userAns, isCorrect };
    
    // Update score using functional update
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    // Get current results from ref (always fresh)
    const currentResults = resultsRef.current;
    const updatedResults = [...currentResults, resultEntry];
    
    // Update results ref immediately
    resultsRef.current = updatedResults;
    
    // Update results state
    setResults(updatedResults);
    
    // Move to next question or end game
    if (currentIndex < questionsRef.current.length - 1) {
      const nextIndex = currentIndex + 1;
      
      // Track start time for next question
      attemptTimesRef.current.set(nextIndex, Date.now());
      
      // Update refs
      currentQuestionIndexRef.current = nextIndex;
      
      // Reset all state
      setCurrentAnswer("");
      setAddSubDisplayIndex(0);
      setAddSubDisplayedNumbers("");
      isShowingAnswerTimeRef.current = false;
      setIsShowingAnswerTime(false);
      // Reset timer to 0 to ensure it doesn't carry over from previous question
      setTimeRemaining(0);
      setCurrentQuestionIndex(nextIndex);
      
      // Scroll to top after submission
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Use setTimeout to ensure state updates are processed before starting next question
      setTimeout(() => {
        isProcessingSubmissionRef.current = false;
      if (operationType === "add_sub" || operationType === "integer_add_sub") {
          // For add/sub, start the next question
          startAddSubQuestion();
      } else {
          // For other operations, reset timer and start with fresh time limit
          const effectiveTimeLimit = getTimeLimitForMode(difficultyMode, operationType);
          setTimeRemaining(effectiveTimeLimit); // Set fresh time limit
        startTimer();
      }
      }, 100);
    } else {
      // End game with updated results
      setTimeout(() => {
        isProcessingSubmissionRef.current = false;
        endGame(updatedResults);
      }, 0);
    }
  };

  const handleTimeUp = () => {
    // Time up = auto-submit (allow empty answers)
    processAnswerSubmission(true);
  };
  
  // Get time limit based on mode and operation type
  const getTimeLimitForMode = (mode: DifficultyMode, opType: OperationType): number => {
    if (mode === "custom") {
      return timeLimit;
    }
    
    if (opType === "add_sub" || opType === "integer_add_sub") {
      if (mode === "easy") return 1.8;
      if (mode === "medium") return 1.2;
      if (mode === "hard") return 0.6;
    } else {
      if (mode === "easy") return 30;
      if (mode === "medium") return 20;
      if (mode === "hard") return 10;
    }
    return timeLimit;
  };
  
  // Update time limit when mode or operation type changes
  useEffect(() => {
    if (difficultyMode !== "custom") {
      const newTimeLimit = getTimeLimitForMode(difficultyMode, operationType);
      setTimeLimit(newTimeLimit);
      // For add/sub operations, also update addSubRowTime (duration)
      if (operationType === "add_sub" || operationType === "integer_add_sub") {
        setAddSubRowTime(newTimeLimit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyMode, operationType]);

  const handleSubmitAnswer = () => {
    // Manual submit (don't allow empty answers)
    processAnswerSubmission(false);
  };

  const endGame = async (finalResults: Array<{ question: Question; userAnswer: number | null; isCorrect: boolean }>) => {
    // Mark session as completed and clear state
    setSessionState("completed");
    clearSessionState();
    
    // Stop session timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    // Calculate final session elapsed time - MUST calculate before setting state
    const endTime = Date.now();
    let finalElapsed = 0;
    let totalTime = 0;
    
    if (sessionStartTimeRef.current > 0) {
      const timeDiffMs = endTime - sessionStartTimeRef.current;
      
      // Validate: reasonable session should be < 2 hours (7,200,000 ms)
      if (timeDiffMs < 0) {
        console.error("⚠️ [PRACTICE] Negative time difference! Using sessionElapsedTime state.");
        totalTime = sessionElapsedTime; // Use current elapsed time state
      } else if (timeDiffMs > 7200000) { // > 2 hours (unreasonable)
        console.error("⚠️ [PRACTICE] Unreasonably long session detected! Using sessionElapsedTime state.");
        totalTime = sessionElapsedTime; // Use current elapsed time state
      } else {
        totalTime = timeDiffMs / 1000; // Total time in seconds
      }
      
      finalElapsed = Math.floor(totalTime);
      // Set the final elapsed time - this is what will be displayed and saved
      setSessionElapsedTime(finalElapsed);
      // Ensure totalTime matches the displayed time (use the same floor value)
      totalTime = finalElapsed; // Use the floor value for consistency - displayed time = saved time
      console.log("🟢 [PRACTICE] Session duration calculated:", {
        startTime: sessionStartTimeRef.current,
        endTime: endTime,
        timeDiffMs: timeDiffMs,
        totalTimeSeconds: totalTime,
        finalElapsed: finalElapsed,
        note: "This exact time will be displayed and saved to dashboard"
      });
    } else {
      console.error("⚠️ [PRACTICE] sessionStartTimeRef was not set! Using sessionElapsedTime state.");
      // Use current elapsed time from state as fallback
      const fallbackTime = sessionElapsedTime || (finalResults.length * 10);
      totalTime = Math.floor(fallbackTime); // Ensure it's an integer
      setSessionElapsedTime(totalTime); // Ensure state matches saved time
      }

    // Ensure results state is set with final results
    setResults(finalResults);
    setIsGameOver(true);
    setIsStarted(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isTimerRunningRef.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (addSubRowTimerRef.current) {
      clearTimeout(addSubRowTimerRef.current);
      addSubRowTimerRef.current = null;
    }
    
    // Save practice session if authenticated
    if (isAuthenticated && finalResults.length > 0) {
      try {
        console.log("🟢 [PRACTICE] Starting to save practice session...");
        console.log("🟢 [PRACTICE] User authenticated:", isAuthenticated);
        console.log("🟢 [PRACTICE] Results count:", finalResults.length);
        console.log("🟢 [PRACTICE] Total session time:", totalTime, "seconds");
        const correctAnswers = finalResults.filter(r => r.isCorrect).length;
        const attemptedWrong = finalResults.length - correctAnswers;
        const unansweredQuestions = numQuestions - finalResults.length;
        // Wrong answers = only attempted wrong (unattempted should not be counted as wrong)
        const wrongAnswers = attemptedWrong;
        // Accuracy calculated using total questions (including unanswered)
        const accuracy = (correctAnswers / numQuestions) * 100;
        
        console.log("🟢 [PRACTICE] Stats:", { correctAnswers, wrongAnswers, accuracy, totalTime, score });
        
        // Prepare attempts data
        const attempts = finalResults.map((result, index) => {
          // Calculate time taken for this question
          // For the last question, use endTime; for others, use next question start time
          const questionStartTime = attemptTimesRef.current.get(index) || sessionStartTimeRef.current;
          const questionEndTime = attemptTimesRef.current.get(index + 1) || endTime;
          const questionTime = (questionEndTime - questionStartTime) / 1000; // in seconds
          
          return {
            question_data: result.question,
            user_answer: result.userAnswer,
            correct_answer: result.question.answer,
            is_correct: result.isCorrect,
            time_taken: Math.max(0.1, questionTime), // Minimum 0.1 seconds
            question_number: index + 1
          };
        });
        
        console.log("🟢 [PRACTICE] Prepared attempts:", attempts.length);
        
        // Calculate points using new point rule engine
        const perCorrect = currentPointsPreview; // points per correct answer from rule engine
        // Mental math requires ≥10 attempted questions to earn points (matches backend)
        const meetsMinimum = finalResults.length >= 10;
        const estimatedPoints = (meetsMinimum && configMode === "standard") ? (perCorrect * correctAnswers) : 0;
        
        // Set points immediately so they show even if save fails
        setPointsEarned(estimatedPoints);

        // Determine row_count for add_sub family
        const effectiveRowCount = (operationType === "add_sub") ? addSubRows
          : (operationType === "integer_add_sub") ? integerAddSubRows
          : undefined;

        // Determine the preset_key to send
        // For add_sub/integer_add_sub, always derive from actual row count so
        // the correct tier (rows_3_5 / rows_6_9 / rows_10_up) is sent even though
        // there are no longer any preset "tiles" to set selectedPresetKey.
        const effectivePresetKey = configMode === "standard"
          ? ((operationType === "add_sub" || operationType === "integer_add_sub")
              ? derivePresetKey()
              : (selectedPresetKey || derivePresetKey()))
          : undefined; // custom → backend resolves to 0 pts

        // When configMode is "standard", ensure difficulty_mode is never "custom"
        // (because backend maps "custom" → config_mode "custom" → 0 points).
        // When configMode is "custom", always send "custom".
        const effectiveDifficultyMode = configMode === "custom"
          ? "custom"
          : (difficultyMode === "custom" ? "standard" : difficultyMode);

        const sessionData: PracticeSessionData = {
          operation_type: operationType,
          difficulty_mode: effectiveDifficultyMode,
          total_questions: numQuestions, // Total questions generated, including unanswered
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          accuracy: accuracy,
          score: correctAnswers,  // Use computed correctAnswers — React state 'score' can be stale
          time_taken: totalTime,
          points_earned: estimatedPoints,
          preset_key: effectivePresetKey,
          row_count: effectiveRowCount,
          attempts: attempts
        };
        
        console.log("🟢 [PRACTICE] Session data prepared, calling savePracticeSession...");
        let streakUpdated = false;
        try {
          const savedSession = await savePracticeSession(sessionData);
          console.log("✅ [PRACTICE] Session saved successfully!", savedSession);
          // Always sync points with what the backend actually stored
          if (savedSession.points_earned != null) {
            setPointsEarned(savedSession.points_earned);
          }
          // Trigger badge cinematic for any newly unlocked badges
          const rewardBadges = savedSession?.reward_data?.badges_unlocked;
          if (rewardBadges && rewardBadges.length > 0) {
            useBadgeUnlockStore.getState().enqueue(rewardBadges);
          }
          streakUpdated = savedSession?.reward_data?.streak_updated ?? false;
          setSessionSaved(true);
        } catch (saveError) {
          // Save failed, but still show points
          console.error("⚠️ [PRACTICE] Save failed but showing points:", saveError);
          setSessionSaved(false);
          // Points already set above, so they'll still display
        }
        
        // Refresh user data to update points in header
        if (refreshUser) {
          console.log("🟢 [PRACTICE] Refreshing user data to update points...");
          try {
            await refreshUser();
            console.log("✅ [PRACTICE] User data refreshed!");
            // Fire streak celebration AFTER refresh so current_streak is up-to-date
            if (streakUpdated) {
              const freshUser = JSON.parse(localStorage.getItem("user_data") || "{}");
              const newStreak = freshUser?.current_streak ?? 1;
              useStreakCelebrationStore.getState().trigger(newStreak);
            }
          } catch (refreshError) {
            console.error("⚠️ [PRACTICE] Failed to refresh user data:", refreshError);
            // Don't fail the whole process if refresh fails
          }
        }
      } catch (error: any) {
        console.error("❌ [PRACTICE] Failed to save practice session:", error);
        console.error("❌ [PRACTICE] Error message:", error?.message);
        console.error("❌ [PRACTICE] Error stack:", error?.stack);
        // Points already set above, so they'll still display
        setSessionSaved(false);
        // Show error but don't block UI - points are already displayed
        console.warn("⚠️ [PRACTICE] Session not saved, but points are displayed");
      }
    } else {
      if (!isAuthenticated) {
        console.log("⚠️ [PRACTICE] User not authenticated, skipping save");
      }
      if (finalResults.length === 0) {
        console.log("⚠️ [PRACTICE] No results to save");
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exitPractice = () => {
    // Mark session as aborted and save state (in case user wants to recover)
    if (isStarted && !isGameOver) {
      setSessionState("aborted");
      saveSessionState(); // Save state before clearing, in case user wants to recover
    } else {
      clearSessionState();
    }
    
    // Clear all timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isTimerRunningRef.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (addSubRowTimerRef.current) {
      clearTimeout(addSubRowTimerRef.current);
      addSubRowTimerRef.current = null;
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    // Reset game state
    setIsStarted(false);
    setCountdown(0);
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setCurrentAnswer("");
    setScore(0);
    setResults([]);
    setTimeRemaining(0);
    setIsGameOver(false);
    setAddSubDisplayIndex(0);
    setAddSubCurrentItem("");
    setAddSubDisplayedItems([]);
    isShowingAnswerTimeRef.current = false;
    setIsShowingAnswerTime(false);
    sessionStartTimeRef.current = 0;
    setSessionElapsedTime(0);
  };

  const resetGame = () => {
    isProcessingSubmissionRef.current = false; // Reset processing flag
    setIsStarted(false);
    setCountdown(0);
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setCurrentAnswer("");
    setScore(0);
    setResults([]);
    resultsRef.current = []; // Reset results ref
    setTimeRemaining(0);
    setIsGameOver(false);
    setAddSubDisplayIndex(0);
    setAddSubCurrentItem("");
    setAddSubDisplayedItems([]);
    isShowingAnswerTimeRef.current = false;
    setIsShowingAnswerTime(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isTimerRunningRef.current = false;
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    sessionStartTimeRef.current = 0;
    setSessionElapsedTime(0);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (addSubRowTimerRef.current) {
      clearTimeout(addSubRowTimerRef.current);
      addSubRowTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (addSubRowTimerRef.current) {
        clearTimeout(addSubRowTimerRef.current);
      }
    };
  }, []);

  // Update refs whenever questions or index change
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);
  
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const currentQuestion = questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length ? questions[currentQuestionIndex] : null;
  
  // Debug logging for currentQuestion
  useEffect(() => {
    if (isStarted) {
      console.log("🟡 [GAME] State check:", {
        isStarted,
        questionsLength: questions.length,
        currentQuestionIndex,
        hasCurrentQuestion: !!currentQuestion,
        questionType: currentQuestion?.type
      });
    }
  }, [isStarted, questions.length, currentQuestionIndex, currentQuestion]);
  
  // Auto-focus input when question changes (for multiplication and division, or when answer time starts for add/sub)
  useEffect(() => {
    if (isStarted && currentQuestion) {
      if ((currentQuestion.type !== "add_sub" && currentQuestion.type !== "integer_add_sub") || isShowingAnswerTime) {
        // Focus on input after a short delay to ensure it's rendered
        const timer = setTimeout(() => {
          if (answerInputRef.current) {
            answerInputRef.current.focus();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isStarted, currentQuestionIndex, isShowingAnswerTime, currentQuestion]);

  // Track start time for questions (for non-add/sub operations)
  useEffect(() => {
    if (isStarted && currentQuestionIndex >= 0 && 
        operationType !== "add_sub" && operationType !== "integer_add_sub") {
      // Only track for non-add/sub operations (add/sub tracks when answer time starts)
      if (!attemptTimesRef.current.has(currentQuestionIndex)) {
        attemptTimesRef.current.set(currentQuestionIndex, Date.now());
      }
    }
  }, [isStarted, currentQuestionIndex, operationType]);

  // ALL HOOKS MUST BE ABOVE THIS LINE - NO EARLY RETURNS BEFORE ALL HOOKS

  // ── Design-system CSS injection ──────────────────────────────────────────
  useEffect(() => {
    const id = "mm-design-tokens";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
      :root{--mm-bg:#06070F;--mm-bg2:#0B0D1A;--mm-surf:#0F1120;--mm-surf2:#141729;--mm-surf3:#1C2040;--mm-bdr:rgba(255,255,255,0.06);--mm-bdr2:rgba(255,255,255,0.10);--mm-pur:#7B5CE5;--mm-pur2:#9D7FF0;--mm-pur3:#C4ADFF;--mm-pglow:rgba(123,92,229,0.22);--mm-pdim:rgba(123,92,229,0.10);--mm-grn:#10B981;--mm-rdim:rgba(239,68,68,0.12);--mm-red:#EF4444;--mm-gld:#F59E0B;--mm-whi:#F0F2FF;--mm-whi2:#B8BDD8;--mm-muted:#525870;--mm-fd:'Playfair Display',Georgia,serif;--mm-fb:'DM Sans',sans-serif;--mm-fm:'JetBrains Mono',monospace;}
      @keyframes mm-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      @keyframes mm-fade-in{from{opacity:0}to{opacity:1}}
      @keyframes mm-scale-in{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
      @keyframes mm-scale-pop{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}
      @keyframes mm-number-slam{0%{opacity:0;transform:scale(.6) translateY(24px)}60%{transform:scale(1.08) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes mm-pulse-ring{0%{box-shadow:0 0 0 0 rgba(123,92,229,0.22)}70%{box-shadow:0 0 0 12px transparent}100%{box-shadow:0 0 0 0 transparent}}
      @keyframes mm-timer-urgent{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.75;transform:scale(1.05)}}
      @keyframes mm-countdown-in{0%{opacity:0;transform:scale(2.5)}30%{opacity:1;transform:scale(1)}80%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}
      @keyframes mm-row-reveal{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
      @keyframes mm-count-up{from{opacity:0;transform:translateY(10px) scale(.85)}to{opacity:1;transform:none}}
      @keyframes mm-glow-border{0%,100%{border-color:rgba(123,92,229,.3)}50%{border-color:rgba(123,92,229,.7)}}
      @keyframes mm-correct-flash{0%{background:rgba(16,185,129,.25)}100%{background:transparent}}
      @keyframes mm-wrong-flash{0%{background:rgba(239,68,68,.25)}100%{background:transparent}}
      @keyframes mm-progress-drain{from{width:100%}to{width:0%}}
      .mm-countdown-num{animation:mm-countdown-in 1s cubic-bezier(.4,0,.2,1) both}
      .mm-pulse-ring{animation:mm-pulse-ring 2s ease infinite}
      .mm-number-slam{animation:mm-number-slam .4s cubic-bezier(.34,1.56,.64,1) both}
      .mm-row-reveal{animation:mm-row-reveal .25s ease both}
      .mm-scale-in{animation:mm-scale-in .3s cubic-bezier(.4,0,.2,1) both}
      .mm-results-in{animation:mm-scale-in .4s cubic-bezier(.4,0,.2,1) both}
      .mm-count-up{animation:mm-count-up .4s ease both}
      .mm-timer-urgent{animation:mm-timer-urgent .6s ease infinite}
      .mm-drain{animation:mm-progress-drain linear both}
      .mm-answer-input:focus{border-color:rgba(123,92,229,.6)!important;box-shadow:0 0 0 4px rgba(123,92,229,.08)!important;animation:mm-glow-border 2s ease infinite!important}
      .mm-fade-up{animation:mm-fade-up .35s ease both}
      .mm-preset-pop{animation:mm-scale-pop .25s ease}
      .mm-form-input{background:var(--mm-surf2)!important;border:1px solid var(--mm-bdr2)!important;border-radius:12px!important;padding:13px 16px!important;color:var(--mm-whi)!important;font-family:var(--mm-fm)!important;font-size:16px!important;font-weight:500!important;width:100%!important;transition:border-color .2s,box-shadow .2s!important;outline:none!important;}
      .mm-form-input:focus{border-color:rgba(123,92,229,.5)!important;box-shadow:0 0 0 3px rgba(123,92,229,.07)!important;}
      .mm-form-input::placeholder{color:rgba(255,255,255,.2)!important;font-weight:400!important;font-size:14px!important;}
      .mm-form-select{background:#141729!important;appearance:none;padding-right:36px!important;background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239D7FF0' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>")!important;background-repeat:no-repeat!important;background-position:right 14px center!important;}
    `;
    document.head.appendChild(s);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  if (countdown > 0) {
    return (
      <div style={{minHeight:"100vh",background:"var(--mm-bg)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflowX:"hidden"}}>
        {/* Background glow */}
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle, rgba(123,92,229,.15) 0%, transparent 70%)",pointerEvents:"none"}} />
        <div className="mm-pulse-ring" style={{position:"absolute",width:300,height:300,borderRadius:"50%",border:"1px solid rgba(123,92,229,.12)",pointerEvents:"none"}} />
        <div style={{textAlign:"center",position:"relative",zIndex:1}}>
          <div key={countdown} className="mm-countdown-num"
            style={{fontFamily:"var(--mm-fm)",fontSize:"clamp(120px,20vw,200px)",fontWeight:800,lineHeight:1,
              background:"linear-gradient(135deg, var(--mm-pur2) 0%, #C084FC 40%, var(--mm-pur) 100%)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
            {countdown}
          </div>
          <p style={{fontFamily:"var(--mm-fd)",fontSize:20,fontWeight:700,color:"var(--mm-whi2)",marginTop:24,
            opacity:.7,letterSpacing:"-.01em",animation:"mm-fade-in .5s ease .2s both"}}>
            Get Ready!
          </p>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"var(--mm-surf)",
            border:"1px solid var(--mm-bdr2)",borderRadius:100,padding:"7px 16px",marginTop:16,
            animation:"mm-fade-in .5s ease .4s both"}}>
            <span style={{fontFamily:"var(--mm-fm)",fontSize:12,color:"var(--mm-muted)"}}>
              {numQuestions} questions · {operationType.replace(/_/g," ")} · {operationType === "add_sub" ? `${addSubRowTime.toFixed(1)}s/row` : `${timeLimit}s each`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if started but questions not ready
  if (isStarted && (!questions || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-slate-300">Preparing questions...</p>
        </div>
      </div>
    );
  }

  // Show error state if started but no current question
  if (isStarted && !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
        <div className="text-center max-w-md">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Question</h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Unable to load the current question. Please try again.
            </p>
            <button
              onClick={() => {
                setIsStarted(false);
                setCurrentQuestionIndex(0);
                setQuestions([]);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isGameOver) {
    // Use results array as source of truth — score state can be stale
    const actualCorrect = results.filter(r => r.isCorrect).length;
    const percentage = (actualCorrect / numQuestions) * 100;
    const getPerformanceMessage = () => {
      if (percentage === 100) return "Perfect! 🌟";
      if (percentage >= 80) return "Excellent! 🎉";
      if (percentage >= 60) return "Great Job! 👏";
      if (percentage >= 40) return "Good Effort! 💪";
      return "Keep Practicing! 📚";
    };

    return (
      <div style={{minHeight:"100vh",background:"var(--mm-bg)",position:"relative",overflowX:"hidden"}}>
        {/* Background glow */}
        <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 60% 50% at 50% 20%, rgba(16,185,129,.06), transparent 70%)",pointerEvents:"none"}} />

        {/* Fixed Session Timer */}
        <div style={{position:"fixed",top:88,right:16,zIndex:40}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"var(--mm-surf)",border:"1px solid var(--mm-bdr2)",borderRadius:14,backdropFilter:"blur(12px)"}}>
            <Clock style={{width:14,height:14,color:"var(--mm-pur2)"}} />
            <span style={{fontFamily:"var(--mm-fm)",fontSize:13,fontWeight:600,color:"var(--mm-whi)",letterSpacing:"-.01em"}}>
              {Math.floor(sessionElapsedTime / 60)}m {String(sessionElapsedTime % 60).padStart(2, '0')}s
            </span>
          </div>
        </div>

        <div style={{maxWidth:700,margin:"0 auto",padding:"80px 20px 60px"}}>
          {/* Main results card */}
          <div className="mm-results-in" style={{background:"var(--mm-surf)",border:"1px solid var(--mm-bdr2)",borderRadius:28,overflow:"hidden",marginBottom:24}}>
            {/* Top accent bar */}
            <div style={{height:3,background:"linear-gradient(90deg, var(--mm-pur), var(--mm-grn), transparent)"}} />
            <div style={{padding:"36px 36px 32px"}}>
              {/* Trophy + title */}
              <div style={{textAlign:"center",marginBottom:32}}>
                <div className="mm-count-up" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,borderRadius:20,background:"linear-gradient(135deg, var(--mm-grn), #059669)",marginBottom:16}}>
                  <Trophy style={{width:28,height:28,color:"#fff"}} />
                </div>
                <h1 style={{fontFamily:"var(--mm-fd)",fontSize:"clamp(24px,3.5vw,36px)",fontWeight:800,color:"var(--mm-whi)",margin:"0 0 6px",letterSpacing:"-.02em"}}>
                  Practice Completed!
                </h1>
                <p style={{fontFamily:"var(--mm-fb)",fontSize:14,color:"var(--mm-muted)",margin:0}}>{getPerformanceMessage()}</p>
              </div>

              {/* Stats grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:24}}>
                {[
                  {label:"CORRECT",value:actualCorrect,color:"var(--mm-grn)",bg:"rgba(16,185,129,.08)",bdr:"rgba(16,185,129,.2)",delay:".05s"},
                  {label:"WRONG",value:results.filter(r=>!r.isCorrect).length,color:"var(--mm-red)",bg:"rgba(239,68,68,.08)",bdr:"rgba(239,68,68,.2)",delay:".1s"},
                  {label:"MISSED",value:numQuestions-results.length,color:"var(--mm-gld)",bg:"rgba(245,158,11,.08)",bdr:"rgba(245,158,11,.2)",delay:".15s"},
                  {label:"ACCURACY",value:`${percentage.toFixed(1)}%`,color:"var(--mm-pur2)",bg:"rgba(123,92,229,.08)",bdr:"rgba(123,92,229,.2)",delay:".2s"},
                  {label:"POINTS",value:pointsEarned||0,color:"var(--mm-grn)",bg:"rgba(16,185,129,.08)",bdr:"rgba(16,185,129,.2)",delay:".25s"},
                ].map(({label,value,color,bg,bdr,delay})=>(
                  <div key={label} className="mm-count-up" style={{background:bg,border:`1px solid ${bdr}`,borderRadius:14,padding:"14px 8px",textAlign:"center",animationDelay:delay}}>
                    <div style={{fontFamily:"var(--mm-fm)",fontSize:"clamp(18px,2.5vw,26px)",fontWeight:700,color,lineHeight:1}}>{value}</div>
                    <div style={{fontFamily:"var(--mm-fm)",fontSize:9,fontWeight:600,letterSpacing:".1em",color:"var(--mm-muted)",marginTop:5,textTransform:"uppercase"}}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Accuracy bar */}
              <div style={{marginBottom:24}}>
                <div style={{height:6,background:"var(--mm-surf2)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"linear-gradient(90deg, var(--mm-red) 0%, var(--mm-gld) 40%, var(--mm-grn) 100%)",width:`${percentage}%`,borderRadius:99,transition:"width 1.2s cubic-bezier(.4,0,.2,1) .5s"}} />
                </div>
              </div>

              {/* Time / Score row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr",background:"var(--mm-surf2)",borderRadius:16,overflow:"hidden",marginBottom:28}}>
                <div style={{padding:"18px 20px",textAlign:"center"}}>
                  <div style={{fontFamily:"var(--mm-fb)",fontSize:11,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:6}}>Time Taken</div>
                  <div style={{fontFamily:"var(--mm-fm)",fontSize:22,fontWeight:700,color:"var(--mm-whi)"}}>
                    {sessionElapsedTime ? formatTime(Math.floor(sessionElapsedTime)) : "—"}
                  </div>
                </div>
                <div style={{background:"var(--mm-bdr)"}} />
                <div style={{padding:"18px 20px",textAlign:"center"}}>
                  <div style={{fontFamily:"var(--mm-fb)",fontSize:11,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:6}}>Score</div>
                  <div style={{fontFamily:"var(--mm-fm)",fontSize:22,fontWeight:700,color:"var(--mm-whi)"}}>{actualCorrect} / {numQuestions}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <button
                  onClick={resetGame}
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"14px 10px",background:"linear-gradient(135deg, var(--mm-pur), #5535C0)",border:"none",borderRadius:14,fontFamily:"var(--mm-fd)",fontSize:14,fontWeight:800,color:"#fff",cursor:"pointer",letterSpacing:"-.01em",transition:"transform .2s, box-shadow .2s",boxShadow:"0 6px 24px rgba(123,92,229,.25)"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 12px 36px rgba(123,92,229,.4)"}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform="";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 6px 24px rgba(123,92,229,.25)"}}
                >
                  <RotateCcw style={{width:16,height:16}} />
                  Try Again
                </button>
                <Link href="/dashboard" style={{textDecoration:"none"}}>
                  <button style={{width:"100%",padding:"14px 10px",background:"linear-gradient(135deg, var(--mm-grn), #059669)",border:"none",borderRadius:14,fontFamily:"var(--mm-fd)",fontSize:14,fontWeight:800,color:"#fff",cursor:"pointer",letterSpacing:"-.01em",transition:"transform .2s, box-shadow .2s",boxShadow:"0 6px 24px rgba(16,185,129,.2)"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 12px 36px rgba(16,185,129,.35)"}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform="";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 6px 24px rgba(16,185,129,.2)"}}>
                    View Dashboard
                  </button>
                </Link>
                <Link href="/" style={{textDecoration:"none"}}>
                  <button style={{width:"100%",padding:"14px 10px",background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr2)",borderRadius:14,fontFamily:"var(--mm-fd)",fontSize:14,fontWeight:700,color:"var(--mm-whi2)",cursor:"pointer",letterSpacing:"-.01em",transition:"background .2s"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="var(--mm-surf3)"}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="var(--mm-surf2)"}}>
                    Go Home
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Question Review */}
          {(results.length > 0 || (questionsRef.current.length > 0 && questionsRef.current.length > results.length)) && (
            <div style={{background:"var(--mm-surf)",border:"1px solid var(--mm-bdr2)",borderRadius:24,overflow:"hidden"}}>
              <div style={{height:2,background:"linear-gradient(90deg, var(--mm-pur), transparent)"}} />
              <div style={{padding:"28px 32px"}}>
                <h2 style={{fontFamily:"var(--mm-fd)",fontSize:18,fontWeight:800,color:"var(--mm-whi)",margin:"0 0 24px",letterSpacing:"-.01em"}}>Question Review</h2>
              
              {/* Separate questions into categories */}
              {(() => {
                // Get all questions that were generated
                const allQuestions = questionsRef.current.length > 0 ? questionsRef.current : questions;
                
                // Find unattempted questions (questions not in results)
                const unattemptedQuestions = allQuestions.filter((q, idx) => {
                  // Check if this question is in results by comparing key properties
                  return !results.some(r => {
                    if (q.type === "multiplication" && r.question.type === "multiplication") {
                      return q.multiplicand === r.question.multiplicand && q.multiplier === r.question.multiplier;
                    } else if (q.type === "division" && r.question.type === "division") {
                      return q.dividend === r.question.dividend && q.divisor === r.question.divisor;
                    } else if ((q.type === "add_sub" || q.type === "integer_add_sub") && 
                               (r.question.type === "add_sub" || r.question.type === "integer_add_sub")) {
                      return JSON.stringify(q.numbers) === JSON.stringify((r.question as any).numbers);
                    } else if (q.type === "decimal_multiplication" && r.question.type === "decimal_multiplication") {
                      return Math.abs(q.multiplicand - r.question.multiplicand) < 0.01 && 
                             Math.abs(q.multiplier - r.question.multiplier) < 0.01;
                    } else if (q.type === "decimal_division" && r.question.type === "decimal_division") {
                      return Math.abs(q.dividend - r.question.dividend) < 0.01 && 
                             Math.abs(q.divisor - r.question.divisor) < 0.01;
                    } else if (q.type === "lcm" && r.question.type === "lcm") {
                      return q.first === r.question.first && q.second === r.question.second;
                    } else if (q.type === "gcd" && r.question.type === "gcd") {
                      return q.first === r.question.first && q.second === r.question.second;
                    } else if (q.type === "square_root" && r.question.type === "square_root") {
                      return Math.abs(q.number - r.question.number) < 0.01;
                    } else if (q.type === "cube_root" && r.question.type === "cube_root") {
                      return Math.abs(q.number - r.question.number) < 0.01;
                    } else if (q.type === "percentage" && r.question.type === "percentage") {
                      return Math.abs(q.percentage - r.question.percentage) < 0.01 && 
                             Math.abs(q.number - r.question.number) < 0.01;
                    }
                    return Math.abs(q.answer - r.question.answer) < 0.01;
                  });
                }).map((q, idx) => ({ question: q, originalIndex: idx }));

                const correctQuestions = results.filter(r => r.isCorrect);
                const wrongQuestions = results.filter(r => !r.isCorrect);

                const formatQuestionText = (q: Question, idx: number) => {
                  if (q.type === "multiplication") {
                    return `${q.multiplicand} × ${q.multiplier} = ?`;
                  } else if (q.type === "division") {
                    return `${q.dividend} ÷ ${q.divisor} = ?`;
                  } else if (q.type === "add_sub" || q.type === "integer_add_sub") {
                    const addSubQ = q as AddSubQuestion | IntegerAddSubQuestion;
                    const displayText = addSubQ.numbers.map((num, i) => {
                      if (i === 0) return String(num);
                      return `${addSubQ.operators[i - 1]} ${num}`;
                    }).join(" ");
                    return `${displayText} = ?`;
                  } else if (q.type === "decimal_multiplication") {
                    return `${q.multiplicand.toFixed(1)} × ${q.multiplier.toFixed(q.multiplierDecimals)} = ?`;
                  } else if (q.type === "decimal_division") {
                    return `${q.dividend} ÷ ${q.divisor} = ?`;
                  } else if (q.type === "lcm") {
                    return `LCM(${q.first}, ${q.second}) = ?`;
                  } else if (q.type === "gcd") {
                    return `GCD(${q.first}, ${q.second}) = ?`;
                  } else if (q.type === "square_root") {
                    return `√${q.number} = ?`;
                  } else if (q.type === "cube_root") {
                    return `∛${q.number} = ?`;
                  } else if (q.type === "percentage") {
                    return `${q.percentage}% of ${q.number} = ?`;
                  }
                  return `Question ${idx + 1}`;
                };

                return (
                  <div style={{maxHeight:480,overflowY:"auto",display:"flex",flexDirection:"column",gap:28}}>
                    {/* Wrong Questions first (most useful) */}
                    {wrongQuestions.length > 0 && (
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                          <XCircle style={{width:18,height:18,color:"var(--mm-red)"}} />
                          <span style={{fontFamily:"var(--mm-fd)",fontSize:14,fontWeight:800,color:"var(--mm-red)",letterSpacing:"-.01em"}}>Wrong Answers ({wrongQuestions.length})</span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {wrongQuestions.map((result, index) => {
                            const questionText = formatQuestionText(result.question, index);
                            return (
                              <div key={index} className="mm-fade-up"
                                style={{padding:"14px 16px",background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.14)",borderRadius:12,animationDelay:`${index*.04}s`}}>
                                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                      <span style={{fontFamily:"var(--mm-fm)",fontSize:11,fontWeight:600,color:"var(--mm-muted)"}}>Q{index+1}</span>
                                      <span style={{fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)"}}>{questionText}</span>
                                    </div>
                                    <div style={{display:"flex",gap:16,fontSize:12}}>
                                      <span style={{fontFamily:"var(--mm-fb)",color:"var(--mm-red)"}}>Your answer: <b>{result.userAnswer !== null && result.userAnswer !== undefined ? result.userAnswer : "—"}</b></span>
                                      <span style={{fontFamily:"var(--mm-fb)",color:"var(--mm-muted)"}}>Correct: <b style={{color:"var(--mm-whi2)"}}>{result.question.answer}</b></span>
                                    </div>
                                  </div>
                                  <XCircle style={{width:16,height:16,color:"var(--mm-red)",flexShrink:0,marginTop:2}} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Correct Questions */}
                    {correctQuestions.length > 0 && (
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                          <CheckCircle2 style={{width:18,height:18,color:"var(--mm-grn)"}} />
                          <span style={{fontFamily:"var(--mm-fd)",fontSize:14,fontWeight:800,color:"var(--mm-grn)",letterSpacing:"-.01em"}}>Correct Answers ({correctQuestions.length})</span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {correctQuestions.map((result, index) => {
                            const questionText = formatQuestionText(result.question, index);
                            return (
                              <div key={index} className="mm-fade-up"
                                style={{padding:"14px 16px",background:"rgba(16,185,129,.05)",border:"1px solid rgba(16,185,129,.14)",borderRadius:12,animationDelay:`${index*.04}s`}}>
                                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                      <span style={{fontFamily:"var(--mm-fm)",fontSize:11,fontWeight:600,color:"var(--mm-muted)"}}>Q{index+1}</span>
                                      <span style={{fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)"}}>{questionText}</span>
                                    </div>
                                    <div style={{display:"flex",gap:16,fontSize:12}}>
                                      <span style={{fontFamily:"var(--mm-fb)",color:"var(--mm-grn)"}}>Your answer: <b>{result.userAnswer}</b></span>
                                      <span style={{fontFamily:"var(--mm-fb)",color:"var(--mm-muted)"}}>Correct: <b style={{color:"var(--mm-whi2)"}}>{result.question.answer}</b></span>
                                    </div>
                                  </div>
                                  <CheckCircle2 style={{width:16,height:16,color:"var(--mm-grn)",flexShrink:0,marginTop:2}} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Unattempted Questions */}
                    {unattemptedQuestions.length > 0 && (
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                          <Square style={{width:18,height:18,color:"var(--mm-gld)"}} />
                          <span style={{fontFamily:"var(--mm-fd)",fontSize:14,fontWeight:800,color:"var(--mm-gld)",letterSpacing:"-.01em"}}>Unattempted ({unattemptedQuestions.length})</span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {unattemptedQuestions.map(({ question, originalIndex }) => {
                            const questionText = formatQuestionText(question, originalIndex);
                            return (
                              <div key={originalIndex} className="mm-fade-up"
                                style={{padding:"14px 16px",background:"rgba(245,158,11,.05)",border:"1px solid rgba(245,158,11,.14)",borderRadius:12,animationDelay:`${originalIndex*.04}s`}}>
                                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                      <span style={{fontFamily:"var(--mm-fm)",fontSize:11,fontWeight:600,color:"var(--mm-muted)"}}>Q{originalIndex+1}</span>
                                      <span style={{fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)"}}>{questionText}</span>
                                    </div>
                                    <div style={{display:"flex",gap:16,fontSize:12}}>
                                      <span style={{fontFamily:"var(--mm-fb)",color:"var(--mm-gld)"}}>Your answer: <b>—</b></span>
                                      <span style={{fontFamily:"var(--mm-fb)",color:"var(--mm-muted)"}}>Correct: <b style={{color:"var(--mm-whi2)"}}>{question.answer}</b></span>
                                    </div>
                                  </div>
                                  <Square style={{width:16,height:16,color:"var(--mm-gld)",flexShrink:0,marginTop:2}} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isStarted && currentQuestion) {
    // Shared session timer widget
    const sessionTimerWidget = (
      <div style={{position:"fixed",top:88,right:16,zIndex:40}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",background:"var(--mm-surf)",border:"1px solid var(--mm-bdr2)",borderRadius:12}}>
          <Clock style={{width:13,height:13,color:"var(--mm-pur2)"}} />
          <span style={{fontFamily:"var(--mm-fm)",fontSize:12,fontWeight:600,color:"var(--mm-whi)",letterSpacing:"-.01em"}}>
            {Math.floor(sessionElapsedTime / 60)}m {String(sessionElapsedTime % 60).padStart(2, '0')}s
          </span>
        </div>
      </div>
    );

    // Shared card header
    const cardHeader = (
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"var(--mm-fm)",fontSize:11,fontWeight:600,color:"var(--mm-muted)",letterSpacing:".08em"}}>
            Q {currentQuestionIndex + 1} / {numQuestions}
          </span>
          <span style={{fontFamily:"var(--mm-fm)",fontSize:11,fontWeight:600,color:"var(--mm-pur2)"}}>
            {score} pts
          </span>
        </div>
        <button
          onClick={exitPractice}
          title="Exit Practice"
          style={{padding:"6px 8px",background:"transparent",border:"1px solid transparent",borderRadius:8,color:"var(--mm-muted)",cursor:"pointer",transition:"color .2s, background .2s, border-color .2s"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color="var(--mm-red)";(e.currentTarget as HTMLButtonElement).style.background="rgba(239,68,68,.08)";(e.currentTarget as HTMLButtonElement).style.borderColor="rgba(239,68,68,.2)"}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color="var(--mm-muted)";(e.currentTarget as HTMLButtonElement).style.background="transparent";(e.currentTarget as HTMLButtonElement).style.borderColor="transparent"}}
        >
          <X style={{width:16,height:16}} />
        </button>
      </div>
    );

    // Shared progress bar
    const progressBar = (
      <div style={{height:4,background:"var(--mm-surf2)",borderRadius:99,overflow:"hidden",marginBottom:28}}>
        <div style={{height:"100%",background:"linear-gradient(90deg, var(--mm-pur), var(--mm-pur2))",width:`${((currentQuestionIndex+1)/numQuestions)*100}%`,borderRadius:99,transition:"width .4s cubic-bezier(.4,0,.2,1)"}} />
      </div>
    );

    // Handle Add/Sub question display (row by row)
    if ((currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime) {
      return (
        <div style={{minHeight:"100vh",background:"var(--mm-bg)",position:"relative"}}>
          <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 50% 40% at 50% 20%, rgba(123,92,229,.05), transparent 70%)",pointerEvents:"none"}} />
          {sessionTimerWidget}

          <div style={{maxWidth:720,margin:"0 auto",padding:"80px 20px 60px"}}>
            <div className="mm-scale-in" style={{background:"var(--mm-surf)",border:"1px solid var(--mm-bdr2)",borderRadius:24,overflow:"hidden"}}>
              <div style={{height:2,background:"linear-gradient(90deg, var(--mm-pur), var(--mm-pur2), transparent)"}} />
              <div style={{padding:"24px 28px"}}>
                {cardHeader}
                {progressBar}

                {/* Question Display (Sequential - One by One) */}
                <div style={{position:"relative",minHeight:500,maxHeight:600,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",position:"relative",padding:"0 56px"}}>
                    {/* Current Item - Big Text (Centered) */}
                    {addSubCurrentItem && (
                      <div
                        key={addSubCurrentItem}
                        className="mm-number-slam"
                        style={{fontSize:"clamp(80px,14vw,160px)",fontFamily:"var(--mm-fm)",fontWeight:800,background:"linear-gradient(135deg, var(--mm-pur2), #EC4899, var(--mm-pur))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",lineHeight:1,textAlign:"center",letterSpacing:"-.04em"}}
                      >
                        {addSubCurrentItem}
                      </div>
                    )}
                    
                    {/* Previous Items - Left Column (First 10 rows) and Right Column (If more than 10) */}
                    {addSubDisplayedItems.length > 0 && (() => {
                      const leftItems = addSubDisplayedItems.slice(0, 10);
                      const rightItems = addSubDisplayedItems.slice(10);
                      
                      return (
                        <>
                          {/* Left Column - First 10 items starting from top-left */}
                          <div style={{position:"absolute",left:0,top:0,display:"flex",flexDirection:"column",gap:6,height:400,overflow:"hidden",paddingLeft:4}}>
                            {leftItems.map((item, idx) => {
                              const totalItems = addSubDisplayedItems.length;
                              const positionFromEnd = totalItems - idx;
                              const opacity = positionFromEnd <= 8 ? 1 : Math.max(0.3, 1 - (positionFromEnd - 8) * 0.1);
                              return (
                                <span
                                  key={idx}
                                  className="mm-row-reveal"
                                  style={{whiteSpace:"nowrap",fontFamily:"var(--mm-fm)",fontSize:18,fontWeight:500,color:"var(--mm-whi2)",opacity,transition:"opacity .3s",animationDelay:`${idx*.03}s`}}
                                >
                                  {item}
                                </span>
                              );
                            })}
                          </div>
                          
                          {/* Right Column - Items beyond 10 */}
                          {rightItems.length > 0 && (
                            <div style={{position:"absolute",right:0,top:0,display:"flex",flexDirection:"column",gap:6,height:400,overflowY:"auto",overflowX:"hidden",paddingRight:4}}>
                              {rightItems.map((item, idx) => {
                                const totalItems = addSubDisplayedItems.length;
                                const actualIdx = 10 + idx;
                                const positionFromEnd = totalItems - actualIdx;
                                const opacity = positionFromEnd <= 8 ? 1 : Math.max(0.3, 1 - (positionFromEnd - 8) * 0.1);
                                return (
                                  <span
                                    key={actualIdx}
                                    style={{whiteSpace:"nowrap",fontFamily:"var(--mm-fm)",fontSize:18,fontWeight:500,color:"var(--mm-whi2)",opacity,transition:"opacity .3s"}}
                                  >
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Row counter */}
                  <p style={{fontFamily:"var(--mm-fm)",fontSize:13,color:"var(--mm-muted)",marginTop:48,textAlign:"center"}}>
                    {(() => {
                      if (currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") {
                        const addSubQ = currentQuestion as AddSubQuestion | IntegerAddSubQuestion;
                        return `${addSubDisplayIndex + 1} / ${addSubQ.numbers.length}`;
                      }
                      return `${addSubDisplayIndex + 1}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Handle regular question display
    let questionDisplay = "";
    if (currentQuestion.type === "multiplication") {
      questionDisplay = `${currentQuestion.multiplicand} × ${currentQuestion.multiplier}`;
    } else if (currentQuestion.type === "division") {
      questionDisplay = `${currentQuestion.dividend} ÷ ${currentQuestion.divisor}`;
    } else if (currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") {
      // Show full question during answer time
      const addSubQ = currentQuestion as AddSubQuestion | IntegerAddSubQuestion;
      questionDisplay = addSubQ.numbers.map((num, idx) => {
        if (idx === 0) return String(num);
        return `${addSubQ.operators[idx - 1]} ${num}`;
      }).join(" ");
    } else if (currentQuestion.type === "decimal_multiplication") {
      questionDisplay = `${currentQuestion.multiplicand.toFixed(1)} × ${currentQuestion.multiplier.toFixed(currentQuestion.multiplierDecimals)}`;
    } else if (currentQuestion.type === "decimal_division") {
      questionDisplay = `${currentQuestion.dividend} ÷ ${currentQuestion.divisor}`;
    } else if (currentQuestion.type === "lcm") {
      questionDisplay = `LCM(${currentQuestion.first}, ${currentQuestion.second})`;
    } else if (currentQuestion.type === "gcd") {
      questionDisplay = `GCD(${currentQuestion.first}, ${currentQuestion.second})`;
    } else if (currentQuestion.type === "square_root") {
      questionDisplay = `√${currentQuestion.number}`;
    } else if (currentQuestion.type === "cube_root") {
      questionDisplay = `∛${currentQuestion.number}`;
    } else if (currentQuestion.type === "percentage") {
      questionDisplay = `${currentQuestion.percentage}% of ${currentQuestion.number}`;
    }

    const effectiveLimit = (isShowingAnswerTime || (currentQuestion.type !== "add_sub" && currentQuestion.type !== "integer_add_sub")) ? timeLimit : addSubAnswerTime;
    const timerRatio = timeRemaining / effectiveLimit;
    const timerColor = timerRatio > 0.5 ? "var(--mm-grn)" : timerRatio > 0.25 ? "var(--mm-gld)" : "var(--mm-red)";
    const timerBg = timerRatio > 0.5 ? "rgba(16,185,129,.15)" : timerRatio > 0.25 ? "rgba(245,158,11,.15)" : "rgba(239,68,68,.15)";
    const timerBdr = timerRatio > 0.5 ? "rgba(16,185,129,.3)" : timerRatio > 0.25 ? "rgba(245,158,11,.3)" : "rgba(239,68,68,.3)";

    return (
      <div style={{minHeight:"100vh",background:"var(--mm-bg)",position:"relative"}}>
        <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 50% 40% at 50% 20%, rgba(123,92,229,.05), transparent 70%)",pointerEvents:"none"}} />
        {sessionTimerWidget}

        <div style={{maxWidth:640,margin:"0 auto",padding:"80px 20px 60px"}}>
          <div className="mm-scale-in" style={{background:"var(--mm-surf)",border:"1px solid var(--mm-bdr2)",borderRadius:24,overflow:"hidden"}}>
            <div style={{height:2,background:"linear-gradient(90deg, var(--mm-pur), var(--mm-pur2), transparent)",position:"relative"}}>
              {/* Timer drain overlay */}
              {(isShowingAnswerTime || (currentQuestion.type !== "add_sub" && currentQuestion.type !== "integer_add_sub")) && (
                <div
                  key={`drain-${currentQuestionIndex}`}
                  className="mm-drain"
                  style={{position:"absolute",top:0,right:0,height:"100%",background:"var(--mm-bg)",animationDuration:`${effectiveLimit}s`,animationFillMode:"forwards"}}
                />
              )}
            </div>
            <div style={{padding:"24px 28px"}}>
              {cardHeader}
              {progressBar}

              {/* Timer pill */}
              {(isShowingAnswerTime || (currentQuestion.type !== "add_sub" && currentQuestion.type !== "integer_add_sub")) && (
                <div style={{display:"flex",justifyContent:"center",marginBottom:28}}>
                  <div
                    className={timerRatio < 0.25 ? "mm-timer-urgent" : ""}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",background:timerBg,border:`1px solid ${timerBdr}`,borderRadius:99,transition:"background .5s ease, border-color .5s ease, color .5s ease"}}
                  >
                    <Clock style={{width:14,height:14,color:timerColor}} />
                    <span style={{fontFamily:"var(--mm-fm)",fontSize:22,fontWeight:700,color:timerColor,letterSpacing:"-.02em"}}>{timeRemaining}s</span>
                  </div>
                </div>
              )}

              {/* Question */}
              <div style={{textAlign:"center",marginBottom:28}}>
                <div
                  key={currentQuestionIndex}
                  className="mm-number-slam"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:"0.3em",fontSize:"clamp(40px,8vw,72px)",fontFamily:"var(--mm-fm)",fontWeight:800,lineHeight:1.1,marginBottom:12}}
                >
                  {questionDisplay.split(" ").map((token, i) => {
                    const isAdd = token === "+";
                    const isSub = token === "−" || token === "-";
                    const isMul = token === "×";
                    const isDiv = token === "÷";
                    const isParen = token.startsWith("(") || token.endsWith(")") || token === "of";
                    if (isAdd) return <span key={i} style={{color:"var(--mm-grn)"}}>{token}</span>;
                    if (isSub) return <span key={i} style={{color:"var(--mm-red)"}}>{token}</span>;
                    if (isMul || isDiv) return <span key={i} style={{color:"var(--mm-pur2)"}}>{token}</span>;
                    if (isParen) return <span key={i} style={{color:"var(--mm-muted)"}}>{token}</span>;
                    return <span key={i} style={{background:"linear-gradient(135deg, var(--mm-whi), var(--mm-whi2))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{token}</span>;
                  })}
                </div>
                <span style={{fontFamily:"var(--mm-fm)",fontSize:24,fontWeight:600,color:"var(--mm-muted)"}}>= ?</span>
              </div>

              {/* Answer Input */}
              <div style={{maxWidth:360,margin:"0 auto"}}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={currentAnswer}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty, integers, decimals, and negative numbers, max 20 characters
                    if (val === "" || (/^-?\d*\.?\d*$/.test(val) && val.length <= 20)) {
                      setCurrentAnswer(val);
                      currentAnswerRef.current = val; // Update ref immediately for timer access
                    }
                  }}
                  maxLength={20}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSubmitAnswer();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter your answer"
                  className="mm-answer-input"
                  style={{width:"100%",padding:"14px 20px",fontSize:22,fontFamily:"var(--mm-fm)",fontWeight:700,textAlign:"center",background:"var(--mm-surf2)",border:"1.5px solid rgba(123,92,229,.3)",borderRadius:14,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box",caretColor:"var(--mm-pur2)"}}
                  autoFocus={!((currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime)}
                  disabled={(currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime}
                  ref={(input) => {
                    answerInputRef.current = input;
                  }}
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={currentAnswer === "" || ((currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime)}
                  style={{width:"100%",marginTop:12,padding:"14px",background:"linear-gradient(135deg, var(--mm-grn), #059669)",border:"none",borderRadius:14,fontFamily:"var(--mm-fd)",fontSize:15,fontWeight:800,color:"#fff",cursor:"pointer",letterSpacing:"-.01em",transition:"transform .2s, opacity .2s",opacity:currentAnswer===""||((currentQuestion.type==="add_sub"||currentQuestion.type==="integer_add_sub")&&!isShowingAnswerTime)?0.45:1}}
                  onMouseEnter={e=>{if(!(currentAnswer===""||((currentQuestion.type==="add_sub"||currentQuestion.type==="integer_add_sub")&&!isShowingAnswerTime)))(e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform=""}}
                >
                  Submit Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"var(--mm-bg)"}}>

      {/* Hero banner */}
      <div style={{position:"relative",overflow:"hidden",borderRadius:"0 0 28px 28px",padding:"52px 32px 56px",background:"linear-gradient(145deg,#12103A 0%,#1A1050 40%,#0E0B28 100%)",borderBottom:"1px solid rgba(123,92,229,.2)"}}>
        {/* Grid pattern layer */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(123,92,229,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(123,92,229,.05) 1px, transparent 1px)",backgroundSize:"48px 48px",WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)"}} />
        {/* Bottom fade */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:40,background:"linear-gradient(to bottom, transparent, var(--mm-bg))"}} />
        <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:60,height:60,borderRadius:18,background:"rgba(123,92,229,.2)",marginBottom:20}}>
            <Sparkles style={{width:28,height:28,color:"var(--mm-pur2)"}} />
          </div>
          <h1 style={{fontFamily:"var(--mm-fd)",fontSize:"clamp(28px,4vw,44px)",fontWeight:800,color:"var(--mm-whi)",margin:"0 0 10px",letterSpacing:"-.03em"}}>Mental Math Practice</h1>
          <p style={{fontFamily:"var(--mm-fb)",fontSize:16,fontWeight:300,color:"rgba(255,255,255,.5)",margin:0}}>Challenge yourself with timed questions</p>
        </div>
      </div>

      {/* Form content */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px 60px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          {/* Left Column */}
          <div className="mm-fade-up" style={{background:"var(--mm-surf)",border:"1px solid var(--mm-bdr)",borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:20,animationDelay:".1s"}}>

                {/* Student Name */}
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:"var(--mm-red)",flexShrink:0}} />
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (e.target.value.trim() !== "") {
                        setStudentNameError("");
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim() === "") {
                        setStudentNameError("Name is required");
                      } else {
                        setStudentNameError("");
                      }
                }}
                placeholder="Enter your name"
                    className="mm-form-input"
                    style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:`1.5px solid ${studentNameError ? "var(--mm-red)" : "var(--mm-bdr2)"}`,borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
              />
              {studentNameError && (
                    <p style={{marginTop:6,fontFamily:"var(--mm-fb)",fontSize:12,color:"var(--mm-red)",display:"flex",alignItems:"center",gap:4}}>
                      <XCircle style={{width:12,height:12}} />
                      {studentNameError}
                    </p>
                  )}
                </div>

                {/* Operation Type */}
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Operation Type</label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value as OperationType)}
                    className="mm-form-input mm-form-select"
                    style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",cursor:"pointer",boxSizing:"border-box" as const}}
                  >
                <optgroup label="Basic Operations">
                  <option value="add_sub">Add/Subtract</option>
                  <option value="multiplication">Multiplication</option>
                  <option value="division">Division</option>
                </optgroup>
                <optgroup label="Advanced Operations">
                  <option value="integer_add_sub">Integer Add/Subtract</option>
                  <option value="decimal_multiplication">Decimal Multiplication</option>
                  <option value="decimal_division">Decimal Division</option>
                  <option value="lcm">LCM</option>
                  <option value="gcd">GCD</option>
                  <option value="square_root">Square Root</option>
                  <option value="cube_root">Cube Root</option>
                  <option value="percentage">Percentage</option>
                </optgroup>
              </select>
            </div>

            {/* Standard / Custom Toggle */}
            <div>
              <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Config Mode</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,background:"var(--mm-surf2)",borderRadius:12,padding:3,border:"1.5px solid var(--mm-bdr2)"}}>
                {(["standard","custom"] as ConfigMode[]).map(m => (
                  <button key={m} onClick={() => setConfigMode(m)} style={{
                    padding:"10px 0",
                    borderRadius:10,
                    border:"none",
                    fontFamily:"var(--mm-fm)",
                    fontSize:13,
                    fontWeight:700,
                    cursor:"pointer",
                    transition:"all .2s",
                    background: configMode===m ? "var(--mm-pur)" : "transparent",
                    color: configMode===m ? "#fff" : "var(--mm-muted)",
                    boxShadow: configMode===m ? "0 2px 8px rgba(123,92,229,.35)" : "none",
                  }}>
                    {m === "standard" ? "Standard" : "Custom"}
                  </button>
                ))}
              </div>
              {configMode === "custom" && (
                <p style={{marginTop:8,fontFamily:"var(--mm-fb)",fontSize:11,color:"var(--mm-red)",display:"flex",alignItems:"center",gap:4}}>
                  <XCircle style={{width:12,height:12,flexShrink:0}} />
                  Custom config earns 0 points
                </p>
              )}
            </div>

            {/* Number of Questions */}
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Questions <span style={{fontWeight:400,opacity:.6}}>(1–50)</span></label>
              <NumericInput
                value={numQuestions}
                onChange={setNumQuestions}
                min={1}
                max={50}
                    className="mm-form-input"
                    style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
              />
                  {configMode === "standard" && numQuestions < 10 && (
                    <div style={{marginTop:8,padding:"8px 12px",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.18)",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
                      <AlertTriangle style={{width:13,height:13,color:"#F59E0B",flexShrink:0}} />
                      <span style={{fontFamily:"var(--mm-fb)",fontSize:11,fontWeight:500,color:"#F59E0B",lineHeight:1.4}}>Minimum 10 questions required to earn points</span>
                    </div>
                  )}
                </div>
          </div>

          {/* Right Column */}
          <div className="mm-fade-up" style={{background:"var(--mm-surf)",border:"1px solid var(--mm-bdr)",borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:20,animationDelay:".2s"}}>

            {/* ── STANDARD MODE: Preset Grid OR Add/Sub Inputs ── */}
            {configMode === "standard" && (() => {
              const presets = MENTAL_PRESETS[operationType] || [];
              const engineOp = toEngineOp(operationType);
              const isAddSub = operationType === "add_sub" || operationType === "integer_add_sub";
              const curDigits = operationType === "add_sub" ? addSubDigits : integerAddSubDigits;
              const setDigits = operationType === "add_sub" ? setAddSubDigits : setIntegerAddSubDigits;
              const curRows = operationType === "add_sub" ? addSubRows : integerAddSubRows;
              const setRows = operationType === "add_sub" ? setAddSubRows : setIntegerAddSubRows;
              return (
                <>
                  {isAddSub ? (
                    /* Add/Sub & Integer Add/Sub: free-form digit + row inputs */
                    <>
                      <div>
                        <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                        <NumericInput
                          value={curDigits}
                          onChange={setDigits}
                          min={1}
                          max={10}
                          className="mm-form-input"
                          style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                        />
                      </div>
                      <div>
                        <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Rows <span style={{fontWeight:400,opacity:.6}}>(3–20)</span></label>
                        <NumericInput
                          value={curRows}
                          onChange={setRows}
                          min={3}
                          max={20}
                          className="mm-form-input"
                          style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                        />
                      </div>
                    </>
                  ) : (
                    /* All other operations: preset tile grid */
                    <div>
                      <label style={{display:"flex",alignItems:"center",gap:6,fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:10}}>
                        <Star style={{width:12,height:12,color:"#F59E0B"}} />
                        Select Difficulty Preset
                      </label>
                      <div style={{display:"grid",gridTemplateColumns: presets.length <= 4 ? "1fr 1fr" : "1fr 1fr 1fr",gap:10}}>
                        {presets.map(p => {
                          const active = selectedPresetKey === p.presetKey;
                          const pts = getPresetPoints(engineOp, p.presetKey) || p.points;
                          return (
                            <button
                              key={p.presetKey}
                              onClick={() => {
                                setSelectedPresetKey(p.presetKey);
                                applyPreset(p);
                              }}
                              style={{
                                position:"relative",
                                padding:"16px 10px 14px",
                                borderRadius:14,
                                border: active ? "2px solid var(--mm-pur2)" : "1.5px solid var(--mm-bdr2)",
                                background: active ? "rgba(123,92,229,.15)" : "var(--mm-surf2)",
                                cursor:"pointer",
                                transition:"all .2s",
                                textAlign:"center",
                                boxShadow: active ? "0 0 16px rgba(123,92,229,.25)" : "none",
                              }}
                            >
                              <div style={{fontFamily:"var(--mm-fd)",fontSize:16,fontWeight:800,color: active ? "var(--mm-pur2)" : "var(--mm-whi)",letterSpacing:"-.01em"}}>{p.label}</div>
                              <div style={{
                                position:"absolute",top:6,right:8,
                                padding:"2px 7px",borderRadius:8,
                                fontSize:10,fontWeight:700,fontFamily:"var(--mm-fm)",
                                background: pts >= 8 ? "rgba(245,158,11,.18)" : pts >= 5 ? "rgba(16,185,129,.18)" : "rgba(123,92,229,.18)",
                                color: pts >= 8 ? "#F59E0B" : pts >= 5 ? "#10B981" : "var(--mm-pur2)",
                              }}>
                                +{pts}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Points Preview Card */}
                  <div style={{
                    background:"linear-gradient(135deg, rgba(245,158,11,.08), rgba(245,158,11,.03))",
                    border:"1px solid rgba(245,158,11,.2)",
                    borderRadius:14,
                    padding:"14px 18px",
                    display:"flex",
                    alignItems:"center",
                    gap:10,
                  }}>
                    <div style={{width:36,height:36,borderRadius:10,background:"rgba(245,158,11,.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Zap style={{width:18,height:18,color:"#F59E0B"}} />
                    </div>
                    <div>
                      <div style={{fontFamily:"var(--mm-fm)",fontSize:11,fontWeight:600,color:"rgba(245,158,11,.7)",letterSpacing:".05em",textTransform:"uppercase"}}>Points per correct</div>
                      <div style={{fontFamily:"var(--mm-fd)",fontSize:22,fontWeight:800,color:"#F59E0B",letterSpacing:"-.02em"}}>+{currentPointsPreview}</div>
                    </div>
                  </div>

                  {/* Time Limit Slider (always shown in standard mode) */}
                  <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                    <TimeLimitSlider
                      value={operationType === "add_sub" || operationType === "integer_add_sub" ? addSubRowTime : timeLimit}
                      onChange={operationType === "add_sub" || operationType === "integer_add_sub" ? setAddSubRowTime : setTimeLimit}
                      operationType={operationType}
                      difficultyMode={difficultyMode}
                      onDifficultyChange={setDifficultyMode}
                    />
                  </div>
                </>
              );
            })()}

            {/* ── CUSTOM MODE: Free-form inputs ── */}
            {configMode === "custom" && (
              <>

            {/* Multiplication/Division specific inputs */}
            {(operationType === "multiplication" || operationType === "division") && (
              <>
                {operationType === "multiplication" ? (
                  <>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Multiplicand Digits <span style={{fontWeight:400,opacity:.6}}>(2–10)</span></label>
                      <NumericInput
                        value={multiplicandDigits}
                        onChange={setMultiplicandDigits}
                        min={2}
                        max={10}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                      />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Multiplier Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                      <NumericInput
                        value={multiplierDigits}
                        onChange={setMultiplierDigits}
                        min={1}
                        max={10}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Dividend Digits <span style={{fontWeight:400,opacity:.6}}>(2–10)</span></label>
                      <NumericInput
                        value={dividendDigits}
                        onChange={setDividendDigits}
                        min={2}
                        max={10}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                      />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Divisor Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                      <NumericInput
                        value={divisorDigits}
                        onChange={setDivisorDigits}
                        min={1}
                        max={10}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                      />
                    </div>
                  </>
                )}
                {/* Time Limit for Multiplication/Division */}
                <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                  <TimeLimitSlider
                    value={timeLimit}
                    onChange={setTimeLimit}
                    operationType={operationType}
                    difficultyMode={difficultyMode}
                    onDifficultyChange={setDifficultyMode}
                  />
                </div>
              </>
            )}

            {/* Decimal Multiplication inputs */}
            {operationType === "decimal_multiplication" && (
              <>
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Multiplicand Digits <span style={{fontWeight:400,opacity:.6}}>(2–20)</span></label>
                    <NumericInput
                      value={decimalMultMultiplicandDigits}
                      onChange={setDecimalMultMultiplicandDigits}
                      min={2}
                      max={20}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                </div>
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Multiplier Digits <span style={{fontWeight:400,opacity:.6}}>(0–20, 0 = whole)</span></label>
                    <NumericInput
                      value={decimalMultMultiplierDigits}
                      onChange={setDecimalMultMultiplierDigits}
                      min={0}
                      max={20}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                </div>
                <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                  <TimeLimitSlider
                    value={timeLimit}
                    onChange={setTimeLimit}
                    operationType={operationType}
                    difficultyMode={difficultyMode}
                    onDifficultyChange={setDifficultyMode}
                  />
                </div>
              </>
            )}

            {/* Decimal Division inputs */}
            {operationType === "decimal_division" && (
              <>
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Dividend Digits <span style={{fontWeight:400,opacity:.6}}>(2–20)</span></label>
                    <NumericInput
                      value={decimalDivDividendDigits}
                      onChange={setDecimalDivDividendDigits}
                      min={2}
                      max={20}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Divisor Digits <span style={{fontWeight:400,opacity:.6}}>(1–20)</span></label>
                      <NumericInput
                        value={decimalDivDivisorDigits}
                        onChange={setDecimalDivDivisorDigits}
                        min={1}
                        max={20}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                </div>
                <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                  <TimeLimitSlider
                    value={timeLimit}
                    onChange={setTimeLimit}
                    operationType={operationType}
                    difficultyMode={difficultyMode}
                    onDifficultyChange={setDifficultyMode}
                  />
                </div>
              </>
            )}

            {/* Integer Add/Sub inputs */}
            {operationType === "integer_add_sub" && (
              <>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                    <NumericInput
                      value={integerAddSubDigits}
                      onChange={setIntegerAddSubDigits}
                      min={1}
                      max={10}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Rows <span style={{fontWeight:400,opacity:.6}}>(3–20)</span></label>
                      <NumericInput
                        value={integerAddSubRows}
                        onChange={setIntegerAddSubRows}
                        min={3}
                        max={20}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    {/* Time Limit Slider for Integer Add/Sub - controls addSubRowTime */}
                    <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                      <TimeLimitSlider
                        value={addSubRowTime}
                        onChange={setAddSubRowTime}
                        operationType={operationType}
                        difficultyMode={difficultyMode}
                        onDifficultyChange={setDifficultyMode}
                      />
                    </div>
              </>
            )}

            {/* LCM/GCD inputs */}
            {(operationType === "lcm" || operationType === "gcd") && (
              <>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>First Number Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                    <NumericInput
                      value={lcmGcdFirstDigits}
                      onChange={setLcmGcdFirstDigits}
                      min={1}
                      max={10}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Second Number Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                      <NumericInput
                        value={lcmGcdSecondDigits}
                        onChange={setLcmGcdSecondDigits}
                        min={1}
                        max={10}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                </div>
                <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                  <TimeLimitSlider
                    value={timeLimit}
                    onChange={setTimeLimit}
                    operationType={operationType}
                    difficultyMode={difficultyMode}
                    onDifficultyChange={setDifficultyMode}
                  />
                </div>
              </>
            )}

            {/* Square/Cube Root inputs */}
            {(operationType === "square_root" || operationType === "cube_root") && (
              <>
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Root Digits <span style={{fontWeight:400,opacity:.6}}>(2–30)</span></label>
                    <NumericInput
                      value={rootDigits}
                      onChange={setRootDigits}
                      min={2}
                      max={30}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                </div>
                <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                  <TimeLimitSlider
                    value={timeLimit}
                    onChange={setTimeLimit}
                    operationType={operationType}
                    difficultyMode={difficultyMode}
                    onDifficultyChange={setDifficultyMode}
                  />
                </div>
              </>
            )}

            {/* Percentage inputs */}
            {operationType === "percentage" && (
              <>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Percentage Min <span style={{fontWeight:400,opacity:.6}}>(1–100)</span></label>
                    <NumericInput
                      value={percentageMin}
                      onChange={setPercentageMin}
                      min={1}
                      max={100}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Percentage Max <span style={{fontWeight:400,opacity:.6}}>(1–100)</span></label>
                      <NumericInput
                        value={percentageMax}
                        onChange={setPercentageMax}
                        min={1}
                        max={100}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number Digits <span style={{fontWeight:400,opacity:.6}}>(2–10)</span></label>
                      <NumericInput
                        value={percentageNumberDigits}
                        onChange={setPercentageNumberDigits}
                        min={2}
                        max={10}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                </div>
                <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                  <TimeLimitSlider
                    value={timeLimit}
                    onChange={setTimeLimit}
                    operationType={operationType}
                    difficultyMode={difficultyMode}
                    onDifficultyChange={setDifficultyMode}
                  />
                </div>
              </>
            )}

            {/* Add/Sub specific inputs */}
            {operationType === "add_sub" && (
              <>
                <div>
                  <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Digits <span style={{fontWeight:400,opacity:.6}}>(1–10)</span></label>
                    <NumericInput
                      value={addSubDigits}
                      onChange={setAddSubDigits}
                      min={1}
                      max={10}
                      className="mm-form-input"
                      style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    <div>
                      <label style={{display:"block",fontFamily:"var(--mm-fm)",fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"var(--mm-muted)",marginBottom:8}}>Number of Rows <span style={{fontWeight:400,opacity:.6}}>(3–20)</span></label>
                      <NumericInput
                        value={addSubRows}
                        onChange={setAddSubRows}
                        min={3}
                        max={20}
                        className="mm-form-input"
                        style={{width:"100%",padding:"12px 16px",background:"var(--mm-surf2)",border:"1.5px solid var(--mm-bdr2)",borderRadius:12,fontFamily:"var(--mm-fm)",fontSize:14,fontWeight:600,color:"var(--mm-whi)",outline:"none",boxSizing:"border-box" as const}}
                    />
                    </div>
                    {/* Time Limit Slider for Add/Sub - controls addSubRowTime */}
                    <div style={{background:"var(--mm-surf2)",border:"1px solid var(--mm-bdr)",borderRadius:16,padding:20}}>
                      <TimeLimitSlider
                        value={addSubRowTime}
                        onChange={setAddSubRowTime}
                        operationType={operationType}
                        difficultyMode={difficultyMode}
                        onDifficultyChange={setDifficultyMode}
                      />
                    </div>
              </>
            )}
            </>
            )}
          </div>
        </div>

        {/* Start Button — sticky footer */}
        <div style={{position:"sticky",bottom:0,background:"linear-gradient(to top, var(--mm-bg) 65%, transparent)",padding:"16px 20px 24px",maxWidth:900,margin:"0 auto"}}>
          <button
            onClick={startCountdown}
            style={{width:"100%",padding:"18px",background:"linear-gradient(135deg, var(--mm-pur) 0%, #5535C0 50%, #4428A8 100%)",border:"none",borderRadius:16,fontFamily:"var(--mm-fd)",fontSize:17,fontWeight:800,color:"#fff",cursor:"pointer",letterSpacing:"-.01em",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 8px 32px rgba(123,92,229,.3), inset 0 1px 0 rgba(255,255,255,.1)",transition:"transform .2s, box-shadow .2s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 16px 48px rgba(123,92,229,.45), inset 0 1px 0 rgba(255,255,255,.1)"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform="";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 8px 32px rgba(123,92,229,.3), inset 0 1px 0 rgba(255,255,255,.1)"}}
          >
            <Play style={{width:20,height:20}} />
            Start Practice
            <span style={{fontFamily:"var(--mm-fm)",fontSize:12,fontWeight:400,opacity:.55,marginLeft:4}}>{numQuestions} questions · {operationType==="add_sub"||operationType==="integer_add_sub" ? `${addSubRowTime.toFixed(1)}s/row` : `${timeLimit}s each`}</span>
            {currentPointsPreview > 0 && (
              <span style={{marginLeft:6,padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,fontFamily:"var(--mm-fm)",background:"rgba(245,158,11,.2)",color:"#F59E0B"}}>+{currentPointsPreview}/correct</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ✓ Wrapped with error boundary for crash protection
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              The Mental Math practice encountered an error. Please try again.
            </p>
            <Link href="/">
              <button className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold transition-colors">
                Go to Home
              </button>
            </Link>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gradient">Mental Math</h1>
            <Link href="/student-dashboard">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Controls Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
                {/* Student Name Section */}
                <div className="mb-8">
                  <label htmlFor="studentName" className="block text-lg font-bold text-gray-700 dark:text-white mb-3">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="studentName"
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      setStudentNameError("");
                    }}
                    onBlur={() => {
                      if (!studentName.trim()) {
                        setStudentNameError("Student name is required");
                      }
                    }}
                    placeholder="Enter student name"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                  />
                  {studentNameError && (
                    <p className="text-red-500 text-sm mt-2">{studentNameError}</p>
                  )}
                </div>
                
                {/* Operation Type Selector */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-700 dark:text-white mb-4">Operation Type</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      "multiplication", "division", "add_sub", "decimal_multiplication",
                      "decimal_division", "integer_add_sub", "lcm", "gcd", 
                      "square_root", "cube_root", "percentage"
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => setOperationType(type as OperationType)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          operationType === type
                            ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg"
                            : "bg-slate-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                        }`}
                      >
                        {type.replace(/_/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Questions */}
                <div className="mb-8">
                  <label htmlFor="numQuestions" className="block text-lg font-bold text-gray-700 dark:text-white mb-3">
                    Number of Questions: <span className="text-indigo-600">{numQuestions}</span>
                  </label>
                  <input
                    id="numQuestions"
                    type="range"
                    min="1"
                    max="100"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <span>1</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Operation-specific controls */}
                <div className="space-y-6 mb-8">
                  {/* Multiplication/Division */}
                  {(operationType === "multiplication" || operationType === "division") && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {operationType === "multiplication" ? "Multiplicand Digits" : "Dividend Digits"}
                          </label>
                          <NumericInput
                            value={operationType === "multiplication" ? multiplicandDigits : dividendDigits}
                            onChange={operationType === "multiplication" ? setMultiplicandDigits : setDividendDigits}
                            min={1}
                            max={20}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {operationType === "multiplication" ? "Multiplier Digits" : "Divisor Digits"}
                          </label>
                          <NumericInput
                            value={operationType === "multiplication" ? multiplierDigits : divisorDigits}
                            onChange={operationType === "multiplication" ? setMultiplierDigits : setDivisorDigits}
                            min={1}
                            max={20}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Add/Sub and Integer Add/Sub */}
                  {(operationType === "add_sub" || operationType === "integer_add_sub") && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Digits
                          </label>
                          <NumericInput
                            value={operationType === "add_sub" ? addSubDigits : integerAddSubDigits}
                            onChange={operationType === "add_sub" ? setAddSubDigits : setIntegerAddSubDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Rows
                          </label>
                          <NumericInput
                            value={operationType === "add_sub" ? addSubRows : integerAddSubRows}
                            onChange={operationType === "add_sub" ? setAddSubRows : setIntegerAddSubRows}
                            min={2}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Decimal Multiplication */}
                  {operationType === "decimal_multiplication" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Multiplicand Digits
                          </label>
                          <NumericInput
                            value={decimalMultMultiplicandDigits}
                            onChange={setDecimalMultMultiplicandDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Multiplier Digits
                          </label>
                          <NumericInput
                            value={decimalMultMultiplierDigits}
                            onChange={setDecimalMultMultiplierDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Decimal Division */}
                  {operationType === "decimal_division" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Dividend Digits
                          </label>
                          <NumericInput
                            value={decimalDivDividendDigits}
                            onChange={setDecimalDivDividendDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Divisor Digits
                          </label>
                          <NumericInput
                            value={decimalDivDivisorDigits}
                            onChange={setDecimalDivDivisorDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* LCM/GCD */}
                  {(operationType === "lcm" || operationType === "gcd") && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            First Number Digits
                          </label>
                          <NumericInput
                            value={lcmGcdFirstDigits}
                            onChange={setLcmGcdFirstDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Second Number Digits
                          </label>
                          <NumericInput
                            value={lcmGcdSecondDigits}
                            onChange={setLcmGcdSecondDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Square Root / Cube Root */}
                  {(operationType === "square_root" || operationType === "cube_root") && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Number Digits
                        </label>
                        <NumericInput
                          value={rootDigits}
                          onChange={setRootDigits}
                          min={1}
                          max={10}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                        />
                      </div>
                    </>
                  )}

                  {/* Percentage */}
                  {operationType === "percentage" && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Min %
                          </label>
                          <NumericInput
                            value={percentageMin}
                            onChange={setPercentageMin}
                            min={1}
                            max={100}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Max %
                          </label>
                          <NumericInput
                            value={percentageMax}
                            onChange={setPercentageMax}
                            min={1}
                            max={100}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Number Digits
                          </label>
                          <NumericInput
                            value={percentageNumberDigits}
                            onChange={setPercentageNumberDigits}
                            min={1}
                            max={10}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Time Limit Slider (shown for non-add_sub or shown during difficulty selection) */}
                  {operationType !== "add_sub" && difficultyMode !== "medium" && (
                    <div>
                      <label htmlFor="timeLimit" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Time Limit per Question: <span className="text-indigo-600">{timeLimit}s</span>
                      </label>
                      <input
                        id="timeLimit"
                        type="range"
                        min="1"
                        max="300"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Add/Sub Specific: Show Row Time input */}
                  {operationType === "add_sub" && (
                    <div>
                      <label htmlFor="addSubRowTime" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Time to Show Each Row: <span className="text-indigo-600">{addSubRowTime.toFixed(1)}s</span>
                      </label>
                      <DecimalNumericInput
                        value={addSubRowTime}
                        onChange={setAddSubRowTime}
                        min={0.5}
                        max={10}
                        step={0.1}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:bg-slate-700 dark:text-white transition-colors"
                      />
                      <TimeLimitSlider
                        value={addSubRowTime}
                        onChange={setAddSubRowTime}
                        operationType={operationType}
                        difficultyMode={difficultyMode}
                        onDifficultyChange={setDifficultyMode}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-700 dark:text-white mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-600" />
                Summary
              </h2>

              <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Operation</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{operationType.replace(/_/g, " ").toUpperCase()}</p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{numQuestions}</p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Time Per Question</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{operationType === "add_sub" ? `${addSubRowTime.toFixed(1)}s + 15s` : `${timeLimit}s`}</p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {operationType === "add_sub"
                      ? `${((addSubRowTime * addSubRows + addSubAnswerTime) * numQuestions / 60).toFixed(1)} min`
                      : `${(timeLimit * numQuestions / 60).toFixed(1)} min`}
                  </p>
                </div>

                {/* Start Button */}
                <div className="col-span-1 lg:col-span-2 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                  <div>
                    <button
                      onClick={startCountdown}
                      className="group w-full px-10 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      <Play className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform" />
                      <span className="relative z-10">Start Practice</span>
                      <Sparkles className="w-5 h-5 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

