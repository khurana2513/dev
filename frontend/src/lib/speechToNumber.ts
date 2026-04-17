export interface ParsedSpeechNumber {
  value: number | null;
  formatted: string | null;
  transcript: string;
}

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const SMALL_NUMBERS: Record<string, number> = {
  zero: 0,
  oh: 0,
  o: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALE_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  lakh: 100_000,
  lac: 100_000,
  million: 1_000_000,
  crore: 10_000_000,
  billion: 1_000_000_000,
};

const SIGN_WORDS = new Set(["minus", "negative"]);
const FILLER_WORDS = new Set([
  "the",
  "answer",
  "is",
  "equals",
  "equal",
  "to",
  "its",
  "it's",
  "it",
  "my",
  "final",
  "and",
  "um",
  "uh",
  "like",
  "so",
  "well",
  "okay",
  "ok",
  "right",
  "sir",
  "ma'am",
  "maam",
  "teacher",
  "please",
  "that",
  "this",
  "a",
  "i",
  "think",
  "know",
  "got",
  "get",
  "say",
]);

export function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function formatParsedSpeechNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

function sanitizeTranscript(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[=,]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenToDigit(token: string): string | null {
  if (/^\d$/.test(token)) return token;
  if (token in SMALL_NUMBERS && SMALL_NUMBERS[token] >= 0 && SMALL_NUMBERS[token] <= 9) {
    return String(SMALL_NUMBERS[token]);
  }
  return null;
}

function parseSimpleNumericValue(raw: string): number | null {
  const compact = raw.replace(/\s+/g, "");
  if (/^-?\d+(\.\d+)?$/.test(compact)) {
    return Number(compact);
  }
  return null;
}

function parseDigitSequence(tokens: string[]): number | null {
  const digits: string[] = [];
  let sign = 1;
  const working = [...tokens];

  if (working[0] && SIGN_WORDS.has(working[0])) {
    sign = -1;
    working.shift();
  }

  for (const token of working) {
    if (token === "point" || token === "dot") return null;
    const digit = tokenToDigit(token);
    if (digit === null) return null;
    digits.push(digit);
  }

  if (digits.length === 0) return null;
  return sign * Number(digits.join(""));
}

function parseNumberWords(tokens: string[]): number | null {
  if (!tokens.length) return null;

  let sign = 1;
  const working = [...tokens];
  if (working[0] && SIGN_WORDS.has(working[0])) {
    sign = -1;
    working.shift();
  }

  const pointIndex = working.findIndex((token) => token === "point" || token === "dot");
  const integerTokens = pointIndex >= 0 ? working.slice(0, pointIndex) : working;
  const decimalTokens = pointIndex >= 0 ? working.slice(pointIndex + 1) : [];

  let total = 0;
  let current = 0;

  for (const token of integerTokens) {
    if (FILLER_WORDS.has(token)) continue;
    if (token in SMALL_NUMBERS) {
      current += SMALL_NUMBERS[token];
      continue;
    }
    if (token in TENS) {
      current += TENS[token];
      continue;
    }
    if (token === "hundred") {
      current = Math.max(1, current) * 100;
      continue;
    }
    if (token in SCALE_WORDS) {
      const scale = SCALE_WORDS[token];
      if (scale >= 1000) {
        total += Math.max(1, current) * scale;
        current = 0;
      }
      continue;
    }
    if (/^\d+$/.test(token)) {
      current += Number(token);
      continue;
    }
    return null;
  }

  const integerValue = total + current;

  if (!decimalTokens.length) {
    return sign * integerValue;
  }

  const decimalDigits: string[] = [];
  for (const token of decimalTokens) {
    if (FILLER_WORDS.has(token)) continue;
    const digit = tokenToDigit(token);
    if (digit !== null) {
      decimalDigits.push(digit);
      continue;
    }
    if (/^\d+$/.test(token)) {
      decimalDigits.push(token);
      continue;
    }
    return null;
  }

  if (!decimalDigits.length) return sign * integerValue;
  return Number(`${sign < 0 ? "-" : ""}${integerValue}.${decimalDigits.join("")}`);
}

export function parseSpokenNumber(transcript: string): ParsedSpeechNumber {
  const cleaned = sanitizeTranscript(transcript);
  if (!cleaned) {
    return { value: null, formatted: null, transcript: cleaned };
  }

  const numericValue = parseSimpleNumericValue(cleaned);
  if (numericValue !== null && !Number.isNaN(numericValue)) {
    return {
      value: numericValue,
      formatted: formatParsedSpeechNumber(numericValue),
      transcript: cleaned,
    };
  }

  const tokens = cleaned.split(" ").filter(Boolean);

  const digitValue = parseDigitSequence(tokens);
  if (digitValue !== null && !Number.isNaN(digitValue)) {
    return {
      value: digitValue,
      formatted: formatParsedSpeechNumber(digitValue),
      transcript: cleaned,
    };
  }

  const wordValue = parseNumberWords(tokens);
  if (wordValue !== null && !Number.isNaN(wordValue)) {
    return {
      value: wordValue,
      formatted: formatParsedSpeechNumber(wordValue),
      transcript: cleaned,
    };
  }

  return { value: null, formatted: null, transcript: cleaned };
}
