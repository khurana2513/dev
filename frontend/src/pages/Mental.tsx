import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, X, Sparkles, Play, Zap, Target, Flame, Loader2, RotateCcw, Square } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { savePracticeSession, PracticeSessionData } from "../lib/userApi";
import TimeLimitSlider from "../components/TimeLimitSlider";
import ErrorBoundary from "../components/ErrorBoundary";

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
        
        // Calculate points: +1 per attempted, +10 per correct
        const attemptedQuestions = finalResults.length; // All results are attempted
        const estimatedPoints = (attemptedQuestions * 1) + (correctAnswers * 10);
        
        // Set points immediately so they show even if save fails
        setPointsEarned(estimatedPoints);
        
        const sessionData: PracticeSessionData = {
          operation_type: operationType,
          difficulty_mode: difficultyMode,
          total_questions: numQuestions, // Total questions generated, including unanswered
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          accuracy: accuracy,
          score: score,
          time_taken: totalTime,
          points_earned: estimatedPoints,
          attempts: attempts
        };
        
        console.log("🟢 [PRACTICE] Session data prepared, calling savePracticeSession...");
        try {
          const savedSession = await savePracticeSession(sessionData);
          console.log("✅ [PRACTICE] Session saved successfully!", savedSession);
          // Update with actual points from backend if different
          if (savedSession.points_earned) {
            setPointsEarned(savedSession.points_earned);
          }
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

  if (countdown > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
        <div className="text-center">
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 animate-pulse">
            {countdown}
          </div>
          <p className="text-2xl font-semibold text-gray-700 dark:text-white mt-4">Get Ready!</p>
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
    const percentage = (score / numQuestions) * 100;
    const getPerformanceMessage = () => {
      if (percentage === 100) return "Perfect! 🌟";
      if (percentage >= 80) return "Excellent! 🎉";
      if (percentage >= 60) return "Great Job! 👏";
      if (percentage >= 40) return "Good Effort! 💪";
      return "Keep Practicing! 📚";
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative">
        {/* Fixed Session Timer - Top Right, Shows Final Time */}
        <div className="fixed top-24 right-4 z-40">
          <div className="flex items-center gap-2 px-5 py-2.5 premium-gradient rounded-xl shadow-2xl border-2 border-white/20 backdrop-blur-md">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-base font-bold text-white tracking-wide">
              {Math.floor(sessionElapsedTime / 60)}m {String(sessionElapsedTime % 60).padStart(2, '0')}s
            </span>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl">
          <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 mb-6 border border-slate-700 dark:border-slate-700 transition-all duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 gradient-green rounded-full mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">Practice Completed!</h1>
              <p className="text-slate-300">Mental Math Practice</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-blue-900/30 dark:bg-blue-900/30 border border-blue-700 dark:border-blue-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-blue-400 dark:text-blue-400">{score}</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Correct</div>
              </div>
              <div className="bg-red-900/30 dark:bg-red-900/30 border border-red-700 dark:border-red-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-red-400 dark:text-red-400">{results.filter(r => !r.isCorrect).length}</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Wrong</div>
              </div>
              <div className="bg-yellow-900/30 dark:bg-yellow-900/30 border border-yellow-700 dark:border-yellow-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-yellow-400 dark:text-yellow-400">
                  {numQuestions - results.length}
                </div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Unattempted</div>
              </div>
              <div className="bg-purple-900/30 dark:bg-purple-900/30 border border-purple-700 dark:border-purple-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-purple-400 dark:text-purple-400">{percentage.toFixed(1)}%</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Accuracy</div>
              </div>
              <div className="bg-emerald-900/30 dark:bg-emerald-900/30 border border-emerald-700 dark:border-emerald-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-emerald-400 dark:text-emerald-400">{pointsEarned || 0}</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Points</div>
              </div>
            </div>

            <div className="bg-slate-700/50 dark:bg-slate-700/50 border border-slate-600 dark:border-slate-600 rounded-xl p-6 mb-6 transition-all duration-300">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-slate-300 dark:text-slate-300">Time Taken</div>
                  <div className="text-2xl font-bold text-white dark:text-white">
                    {sessionElapsedTime ? formatTime(Math.floor(sessionElapsedTime)) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-300 dark:text-slate-300">Score</div>
                  <div className="text-2xl font-bold text-white dark:text-white">
                    {score} / {numQuestions}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetGame}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
              <Link href="/dashboard" className="w-full sm:flex-1">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                  View Dashboard
                </button>
              </Link>
              <Link href="/" className="w-full sm:flex-1">
                <button className="w-full px-6 py-3 bg-slate-700 dark:bg-slate-700 border-2 border-slate-600 dark:border-slate-600 text-white dark:text-white rounded-lg font-semibold hover:bg-slate-600 dark:hover:bg-slate-600 transition-all">
                  Go Home
                </button>
              </Link>
            </div>
          </div>

          {/* Question Review */}
          {(results.length > 0 || (questionsRef.current.length > 0 && questionsRef.current.length > results.length)) && (
            <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 border border-slate-700 dark:border-slate-700 transition-all duration-300 mt-6">
              <h2 className="text-2xl font-bold text-white mb-6">Question Review</h2>
              
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
                  <div className="space-y-8 max-h-96 overflow-y-auto scrollbar-premium">
                    {/* Correct Questions */}
                    {correctQuestions.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-green-400 dark:text-green-400 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6" />
                          Correct Answers ({correctQuestions.length})
                        </h3>
                        <div className="space-y-3">
                          {correctQuestions.map((result, index) => {
                            const questionText = formatQuestionText(result.question, index);
                            return (
                              <div
                                key={index}
                                className="p-4 rounded-lg border-2 bg-green-900/30 dark:bg-green-900/30 border-green-700 dark:border-green-700 transition-all duration-300"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="font-semibold text-white dark:text-white">Q{index + 1}:</span>
                                      <span className="text-lg font-semibold text-white dark:text-white">
                                        {questionText}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-green-400 dark:text-green-400">
                                        Your answer: <span className="font-semibold">{result.userAnswer}</span>
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-300">
                                        Correct: <span className="font-semibold">{result.question.answer}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <CheckCircle2 className="w-6 h-6 text-green-400 dark:text-green-400" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Wrong Questions */}
                    {wrongQuestions.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-red-400 dark:text-red-400 mb-4 flex items-center gap-2">
                          <XCircle className="w-6 h-6" />
                          Wrong Answers ({wrongQuestions.length})
                        </h3>
                        <div className="space-y-3">
                          {wrongQuestions.map((result, index) => {
                            const questionText = formatQuestionText(result.question, index);
                            return (
                              <div
                                key={index}
                                className="p-4 rounded-lg border-2 bg-red-900/30 dark:bg-red-900/30 border-red-700 dark:border-red-700 transition-all duration-300"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="font-semibold text-white dark:text-white">Q{index + 1}:</span>
                                      <span className="text-lg font-semibold text-white dark:text-white">
                                        {questionText}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-red-400 dark:text-red-400">
                                        Your answer: <span className="font-semibold">
                                          {result.userAnswer !== null && result.userAnswer !== undefined ? result.userAnswer : "—"}
                                        </span>
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-300">
                                        Correct: <span className="font-semibold">{result.question.answer}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <XCircle className="w-6 h-6 text-red-400 dark:text-red-400" />
                                  </div>
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
                        <h3 className="text-xl font-bold text-yellow-400 dark:text-yellow-400 mb-4 flex items-center gap-2">
                          <Square className="w-6 h-6" />
                          Unattempted Questions ({unattemptedQuestions.length})
                        </h3>
                        <div className="space-y-3">
                          {unattemptedQuestions.map(({ question, originalIndex }) => {
                            const questionText = formatQuestionText(question, originalIndex);
                            return (
                              <div
                                key={originalIndex}
                                className="p-4 rounded-lg border-2 bg-yellow-900/30 dark:bg-yellow-900/30 border-yellow-700 dark:border-yellow-700 transition-all duration-300"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="font-semibold text-white dark:text-white">Q{originalIndex + 1}:</span>
                                      <span className="text-lg font-semibold text-white dark:text-white">
                                        {questionText}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-yellow-400 dark:text-yellow-400">
                                        Your answer: <span className="font-semibold">—</span>
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-300">
                                        Correct: <span className="font-semibold">{question.answer}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <Square className="w-6 h-6 text-yellow-400 dark:text-yellow-400" />
                                  </div>
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
          )}
        </div>
      </div>
    );
  }

  if (isStarted && currentQuestion) {
    // Handle Add/Sub question display (row by row)
    if ((currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative">
          {/* Fixed Session Timer - Top Right, Below Navbar */}
          <div className="fixed top-24 right-4 z-40">
            <div className="flex items-center gap-2 px-5 py-2.5 premium-gradient rounded-xl shadow-2xl border-2 border-white/20 backdrop-blur-md">
              <Clock className="w-4 h-4 text-white animate-pulse" />
              <span className="text-base font-bold text-white tracking-wide">
                {Math.floor(sessionElapsedTime / 60)}m {String(sessionElapsedTime % 60).padStart(2, '0')}s
              </span>
            </div>
          </div>

          <div className="container mx-auto max-w-5xl">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-xl dark:shadow-2xl p-6 md:p-10 lg:p-12 mt-8 relative border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300">
            {/* Exit Button */}
            <button
              onClick={exitPractice}
              className="absolute top-4 right-4 p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 z-10"
              title="Exit Practice"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Question {currentQuestionIndex + 1} of {numQuestions}
                </span>
                <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Score: {score}/{results.length > 0 ? results.length : currentQuestionIndex}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${((currentQuestionIndex + 1) / numQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Display (Sequential - One by One) */}
            <div className="mb-8 relative min-h-[500px] max-h-[600px] flex flex-col items-center justify-center">
              <div className="flex items-center justify-center w-full relative px-4">
                {/* Current Item - Big Text (Centered, Double Size) */}
                {addSubCurrentItem && (
                  <div className="text-[210px] md:text-[240px] lg:text-[270px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 transition-all duration-500 ease-out text-center leading-none tracking-tight">
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
                      <div 
                        className="absolute left-0 top-0 flex flex-col gap-1.5 h-[400px] overflow-hidden pl-3"
                      >
                        {leftItems.map((item, idx) => {
                          // Calculate opacity based on position (newer items more visible)
                          const totalItems = addSubDisplayedItems.length;
                          const positionFromEnd = totalItems - idx;
                          const opacity = positionFromEnd <= 8 ? 1 : Math.max(0.3, 1 - (positionFromEnd - 8) * 0.1);
                          
                          return (
                            <span 
                              key={idx} 
                              className="whitespace-nowrap text-xl md:text-2xl font-medium text-gray-500 dark:text-slate-400 transition-all duration-300"
                              style={{ opacity }}
                            >
                              {item}
                            </span>
                          );
                        })}
                      </div>
                      
                      {/* Right Column - Items beyond 10, only shown if there are more than 10 items */}
                      {rightItems.length > 0 && (
                        <div 
                          className="absolute right-0 top-0 flex flex-col gap-1.5 h-[400px] overflow-y-auto overflow-x-hidden pr-3 scrollbar-premium"
                        >
                          {rightItems.map((item, idx) => {
                            // Calculate opacity based on position (newer items more visible)
                            const totalItems = addSubDisplayedItems.length;
                            const actualIdx = 10 + idx; // Actual index in the full array
                            const positionFromEnd = totalItems - actualIdx;
                            const opacity = positionFromEnd <= 8 ? 1 : Math.max(0.3, 1 - (positionFromEnd - 8) * 0.1);
                            
                            return (
                              <span 
                                key={actualIdx} 
                                className="whitespace-nowrap text-xl md:text-2xl font-medium text-gray-500 dark:text-slate-400 transition-all duration-300"
                                style={{ opacity }}
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
              
              {/* Showing item text - Below in center */}
              <p className="text-sm md:text-base text-gray-400 dark:text-slate-500 mt-12 text-center font-medium tracking-wide">
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative">
        {/* Fixed Session Timer - Top Right, Below Navbar */}
        <div className="fixed top-24 right-4 z-40">
          <div className="flex items-center gap-2 px-5 py-2.5 premium-gradient rounded-xl shadow-2xl border-2 border-white/20 backdrop-blur-md">
            <Clock className="w-4 h-4 text-white animate-pulse" />
            <span className="text-base font-bold text-white tracking-wide">
              {Math.floor(sessionElapsedTime / 60)}m {String(sessionElapsedTime % 60).padStart(2, '0')}s
            </span>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/90 dark:bg-slate-800 backdrop-blur-sm rounded-3xl shadow-2xl dark:shadow-2xl p-8 md:p-12 mt-8 relative border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300">
            {/* Exit Button */}
            <button
              onClick={exitPractice}
              className="absolute top-4 right-4 p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors z-10"
              title="Exit Practice"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-white">
                  Question {currentQuestionIndex + 1} of {numQuestions}
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-white">
                  Score: {score}/{results.length > 0 ? results.length : currentQuestionIndex}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / numQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Timer (Time Remaining) */}
            {isShowingAnswerTime || (currentQuestion.type !== "add_sub" && currentQuestion.type !== "integer_add_sub") ? (
              <div className="flex justify-center mb-8">
                <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                  <span className="text-3xl font-bold text-white">{timeRemaining}s</span>
                </div>
              </div>
            ) : null}

            {/* Question */}
            <div className="text-center mb-8">
              <div className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 mb-4">
                {questionDisplay}
              </div>
              <p className="text-2xl text-gray-600 dark:text-slate-300">= ?</p>
            </div>

            {/* Answer Input */}
            <div className="max-w-md mx-auto">
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
                className="w-full px-6 py-4 text-3xl font-bold text-center border-4 border-purple-300 dark:border-purple-600 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-900/30 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                autoFocus={!((currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime)}
                disabled={(currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime}
                ref={(input) => {
                  answerInputRef.current = input;
                }}
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={currentAnswer === "" || ((currentQuestion.type === "add_sub" || currentQuestion.type === "integer_add_sub") && !isShowingAnswerTime)}
                className="w-full mt-4 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <button className="group flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-primary" />
                <span className="font-bold uppercase tracking-widest text-muted-foreground">Back to Home</span>
              </button>
            </Link>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground flex items-center gap-3">
              <Sparkles className="w-10 h-10 text-primary" />
              Mental Math Practice
            </h1>
            <div className="w-32"></div>
          </div>
        </header>

        <div className="bg-card border border-border rounded-[2.5rem] shadow-xl overflow-hidden">
          {/* Premium Header */}
          <div className="relative bg-gradient-to-r from-primary via-primary/80 to-primary/60 px-8 md:px-16 py-14 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary/30"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl mb-6 shadow-xl border border-white/30 transform hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-lg uppercase italic tracking-tighter">
                Mental Math Practice
              </h2>
              <p className="text-white/95 text-lg md:text-xl font-medium">
                Challenge yourself with timed math questions
              </p>
            </div>
          </div>

          {/* Form Content - Horizontal Layout */}
          <div className="p-8 md:p-12 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Left Column */}
              <div className="space-y-6 bg-background/50 rounded-2xl p-6 border border-border shadow-sm transition-all duration-300">
                {/* Student Name */}
                <div className="group">
                  <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    Your Name <span className="text-red-500">*</span>
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
                    className={`w-full px-5 py-4 border-2 dark:border-slate-600 rounded-xl focus:ring-4 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 font-semibold shadow-sm hover:shadow-md ${
                  studentNameError
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-200"
                }`}
              />
              {studentNameError && (
                    <p className="mt-2 text-sm font-medium text-red-600 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {studentNameError}
                    </p>
                  )}
                </div>

                {/* Operation Type */}
                <div className="group">
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
                    Operation Type
                  </label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value as OperationType)}
                    className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm hover:shadow-md cursor-pointer"
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

            {/* Number of Questions */}
                <div className="group">
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></span>
                    Number of Questions <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 50)</span>
              </label>
              <NumericInput
                value={numQuestions}
                onChange={setNumQuestions}
                min={1}
                max={50}
                    className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm hover:shadow-md"
              />
                </div>
            </div>

              {/* Right Column - White Background */}
              <div className="space-y-6 bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">

            {/* Multiplication/Division specific inputs */}
            {(operationType === "multiplication" || operationType === "division") && (
              <>
                {operationType === "multiplication" ? (
                  <>
                    <div className="group">
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></span>
                        Multiplicand Digits <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">(Min: 2, Max: 10)</span>
                      </label>
                      <NumericInput
                        value={multiplicandDigits}
                        onChange={setMultiplicandDigits}
                        min={2}
                        max={10}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></span>
                        Multiplier Digits <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 10)</span>
                      </label>
                      <NumericInput
                        value={multiplierDigits}
                        onChange={setMultiplierDigits}
                        min={1}
                        max={10}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm hover:shadow-md"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="group">
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></span>
                        Dividend Digits <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">(Min: 2, Max: 10)</span>
                      </label>
                      <NumericInput
                        value={dividendDigits}
                        onChange={setDividendDigits}
                        min={2}
                        max={10}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></span>
                        Divisor Digits <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 10)</span>
                      </label>
                      <NumericInput
                        value={divisorDigits}
                        onChange={setDivisorDigits}
                        min={1}
                        max={10}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm hover:shadow-md"
                      />
                    </div>
                  </>
                )}
                {/* Time Limit for Multiplication/Division */}
                <div className="group">
                  <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
                    <TimeLimitSlider
                      value={timeLimit}
                      onChange={setTimeLimit}
                      operationType={operationType}
                      difficultyMode={difficultyMode}
                      onDifficultyChange={setDifficultyMode}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Decimal Multiplication inputs */}
            {operationType === "decimal_multiplication" && (
              <>
                <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    Multiplicand Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 2, Max: 20)</span>
                  </label>
                    <NumericInput
                      value={decimalMultMultiplicandDigits}
                      onChange={setDecimalMultMultiplicandDigits}
                      min={2}
                      max={20}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    Multiplier Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 0, Max: 20, 0 = whole number)</span>
                  </label>
                    <NumericInput
                      value={decimalMultMultiplierDigits}
                      onChange={setDecimalMultMultiplierDigits}
                      min={0}
                      max={20}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    Dividend Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 2, Max: 20)</span>
                  </label>
                    <NumericInput
                      value={decimalDivDividendDigits}
                      onChange={setDecimalDivDividendDigits}
                      min={2}
                      max={20}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Divisor Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 20)</span>
                      </label>
                      <NumericInput
                        value={decimalDivDivisorDigits}
                        onChange={setDecimalDivDivisorDigits}
                        min={1}
                        max={20}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Number of Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 10)</span>
                      </label>
                    <NumericInput
                      value={integerAddSubDigits}
                      onChange={setIntegerAddSubDigits}
                      min={1}
                      max={10}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Number of Rows <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 3, Max: 20)</span>
                      </label>
                      <NumericInput
                        value={integerAddSubRows}
                        onChange={setIntegerAddSubRows}
                        min={3}
                        max={20}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    {/* Time Limit Slider for Integer Add/Sub - controls addSubRowTime */}
                    <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        First Number Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 10)</span>
                      </label>
                    <NumericInput
                      value={lcmGcdFirstDigits}
                      onChange={setLcmGcdFirstDigits}
                      min={1}
                      max={10}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Second Number Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 10)</span>
                      </label>
                      <NumericInput
                        value={lcmGcdSecondDigits}
                        onChange={setLcmGcdSecondDigits}
                        min={1}
                        max={10}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    Root Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 2, Max: 30)</span>
                  </label>
                    <NumericInput
                      value={rootDigits}
                      onChange={setRootDigits}
                      min={2}
                      max={30}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Percentage Min <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 100)</span>
                      </label>
                    <NumericInput
                      value={percentageMin}
                      onChange={setPercentageMin}
                      min={1}
                      max={100}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Percentage Max <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 100)</span>
                      </label>
                      <NumericInput
                        value={percentageMax}
                        onChange={setPercentageMax}
                        min={1}
                        max={100}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Number Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 2, Max: 10)</span>
                      </label>
                      <NumericInput
                        value={percentageNumberDigits}
                        onChange={setPercentageNumberDigits}
                        min={2}
                        max={10}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    Number of Digits <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 1, Max: 10)</span>
                  </label>
                    <NumericInput
                      value={addSubDigits}
                      onChange={setAddSubDigits}
                      min={1}
                      max={10}
                      className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                        Number of Rows <span className="text-gray-500 dark:text-slate-400 font-normal text-xs">(Min: 3, Max: 20)</span>
                      </label>
                      <NumericInput
                        value={addSubRows}
                        onChange={setAddSubRows}
                        min={3}
                        max={20}
                        className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 font-semibold shadow-sm hover:shadow-md transition-all duration-300 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    </div>
                    {/* Time Limit Slider for Add/Sub - controls addSubRowTime */}
                    <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-xl">
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
            </div>
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

