export type OperationType =
  | "multiplication"
  | "division"
  | "add_sub"
  | "decimal_multiplication"
  | "decimal_division"
  | "integer_add_sub"
  | "intl_add_sub"
  | "lcm"
  | "gcd"
  | "square_root"
  | "cube_root"
  | "percentage";

export interface MultiplicationQuestion {
  id: number;
  type: "multiplication";
  multiplicand: number;
  multiplier: number;
  answer: number;
}

export interface DivisionQuestion {
  id: number;
  type: "division";
  dividend: number;
  divisor: number;
  answer: number;
}

export interface AddSubQuestion {
  id: number;
  type: "add_sub";
  numbers: number[];
  operators: string[];
  answer: number;
}

export interface DecimalMultiplicationQuestion {
  id: number;
  type: "decimal_multiplication";
  multiplicand: number;
  multiplier: number;
  multiplicandDecimals: number;
  multiplierDecimals: number;
  answer: number;
}

export interface DecimalDivisionQuestion {
  id: number;
  type: "decimal_division";
  dividend: number;
  divisor: number;
  dividendDecimals: number;
  divisorDecimals: number;
  answer: number;
}

export interface IntegerAddSubQuestion {
  id: number;
  type: "integer_add_sub";
  numbers: number[];
  operators: string[];
  answer: number;
}

export interface IntlAddSubQuestion {
  id: number;
  type: "intl_add_sub";
  numbers: number[];
  operators: string[];
  answer: number;
}

export interface LCMQuestion {
  id: number;
  type: "lcm";
  first: number;
  second: number;
  answer: number;
}

export interface GCDQuestion {
  id: number;
  type: "gcd";
  first: number;
  second: number;
  answer: number;
}

export interface SquareRootQuestion {
  id: number;
  type: "square_root";
  number: number;
  answer: number;
}

export interface CubeRootQuestion {
  id: number;
  type: "cube_root";
  number: number;
  answer: number;
}

export interface PercentageQuestion {
  id: number;
  type: "percentage";
  number: number;
  percentage: number;
  answer: number;
}

export type Question =
  | MultiplicationQuestion
  | DivisionQuestion
  | AddSubQuestion
  | DecimalMultiplicationQuestion
  | DecimalDivisionQuestion
  | IntegerAddSubQuestion
  | IntlAddSubQuestion
  | LCMQuestion
  | GCDQuestion
  | SquareRootQuestion
  | CubeRootQuestion
  | PercentageQuestion;

export interface MentalQuestionConfig {
  operationType: OperationType;
  multiplicandDigits: number;
  multiplierDigits: number;
  dividendDigits: number;
  divisorDigits: number;
  addSubDigits: number;
  addSubRows: number;
  decimalMultMultiplicandDigits: number;
  decimalMultMultiplierDigits: number;
  decimalDivDividendDigits: number;
  decimalDivDivisorDigits: number;
  integerAddSubDigits: number;
  integerAddSubRows: number;
  intlAddSubPreset: "1_2" | "2_3";
  intlAddSubRows: number;
  lcmGcdFirstDigits: number;
  lcmGcdSecondDigits: number;
  rootDigits: number;
  percentageMin: number;
  percentageMax: number;
  percentageNumberDigits: number;
}

export interface MentalPresetOption {
  label: string;
  presetKey: string;
  apply: (config: MentalQuestionConfig) => MentalQuestionConfig;
}

const baseDefaults: Omit<MentalQuestionConfig, "operationType"> = {
  multiplicandDigits: 2,
  multiplierDigits: 1,
  dividendDigits: 2,
  divisorDigits: 1,
  addSubDigits: 2,
  addSubRows: 3,
  decimalMultMultiplicandDigits: 2,
  decimalMultMultiplierDigits: 1,
  decimalDivDividendDigits: 2,
  decimalDivDivisorDigits: 1,
  integerAddSubDigits: 2,
  integerAddSubRows: 3,
  intlAddSubPreset: "1_2",
  intlAddSubRows: 3,
  lcmGcdFirstDigits: 2,
  lcmGcdSecondDigits: 2,
  rootDigits: 4,
  percentageMin: 1,
  percentageMax: 100,
  percentageNumberDigits: 4,
};

export function createDefaultMentalConfig(
  operationType: OperationType = "add_sub",
): MentalQuestionConfig {
  return {
    operationType,
    ...baseDefaults,
  };
}

function withValues(
  config: MentalQuestionConfig,
  values: Partial<MentalQuestionConfig>,
): MentalQuestionConfig {
  return {
    ...config,
    ...values,
  };
}

export const MENTAL_PRESETS: Record<OperationType, MentalPresetOption[]> = {
  multiplication: [
    { label: "2 x 1", presetKey: "2x1", apply: (config) => withValues(config, { multiplicandDigits: 2, multiplierDigits: 1 }) },
    { label: "3 x 1", presetKey: "3x1", apply: (config) => withValues(config, { multiplicandDigits: 3, multiplierDigits: 1 }) },
    { label: "4 x 1", presetKey: "4x1", apply: (config) => withValues(config, { multiplicandDigits: 4, multiplierDigits: 1 }) },
    { label: "2 x 2", presetKey: "2x2", apply: (config) => withValues(config, { multiplicandDigits: 2, multiplierDigits: 2 }) },
    { label: "3 x 2", presetKey: "3x2", apply: (config) => withValues(config, { multiplicandDigits: 3, multiplierDigits: 2 }) },
    { label: "4 x 2", presetKey: "4x2", apply: (config) => withValues(config, { multiplicandDigits: 4, multiplierDigits: 2 }) },
  ],
  division: [
    { label: "2 / 1", presetKey: "2d1", apply: (config) => withValues(config, { dividendDigits: 2, divisorDigits: 1 }) },
    { label: "3 / 1", presetKey: "3d1", apply: (config) => withValues(config, { dividendDigits: 3, divisorDigits: 1 }) },
    { label: "4 / 1", presetKey: "4d1", apply: (config) => withValues(config, { dividendDigits: 4, divisorDigits: 1 }) },
    { label: "3 / 2", presetKey: "3d2", apply: (config) => withValues(config, { dividendDigits: 3, divisorDigits: 2 }) },
    { label: "4 / 2", presetKey: "4d2", apply: (config) => withValues(config, { dividendDigits: 4, divisorDigits: 2 }) },
    { label: "4 / 3", presetKey: "4d3", apply: (config) => withValues(config, { dividendDigits: 4, divisorDigits: 3 }) },
  ],
  add_sub: [
    { label: "3-5 Rows", presetKey: "rows_3_5", apply: (config) => withValues(config, { addSubRows: 3 }) },
    { label: "6-9 Rows", presetKey: "rows_6_9", apply: (config) => withValues(config, { addSubRows: 6 }) },
    { label: "10+ Rows", presetKey: "rows_10_up", apply: (config) => withValues(config, { addSubRows: 10 }) },
  ],
  decimal_multiplication: [
    { label: "1 x 0", presetKey: "1x0", apply: (config) => withValues(config, { decimalMultMultiplicandDigits: 1, decimalMultMultiplierDigits: 0 }) },
    { label: "1 x 1", presetKey: "1x1", apply: (config) => withValues(config, { decimalMultMultiplicandDigits: 1, decimalMultMultiplierDigits: 1 }) },
    { label: "2 x 1", presetKey: "2x1", apply: (config) => withValues(config, { decimalMultMultiplicandDigits: 2, decimalMultMultiplierDigits: 1 }) },
    { label: "3 x 1", presetKey: "3x1", apply: (config) => withValues(config, { decimalMultMultiplicandDigits: 3, decimalMultMultiplierDigits: 1 }) },
    { label: "2 x 2", presetKey: "2x2", apply: (config) => withValues(config, { decimalMultMultiplicandDigits: 2, decimalMultMultiplierDigits: 2 }) },
    { label: "3 x 2", presetKey: "3x2", apply: (config) => withValues(config, { decimalMultMultiplicandDigits: 3, decimalMultMultiplierDigits: 2 }) },
  ],
  decimal_division: [
    { label: "2 / 1", presetKey: "2d1", apply: (config) => withValues(config, { decimalDivDividendDigits: 2, decimalDivDivisorDigits: 1 }) },
    { label: "3 / 1", presetKey: "3d1", apply: (config) => withValues(config, { decimalDivDividendDigits: 3, decimalDivDivisorDigits: 1 }) },
    { label: "4 / 1", presetKey: "4d1", apply: (config) => withValues(config, { decimalDivDividendDigits: 4, decimalDivDivisorDigits: 1 }) },
    { label: "3 / 2", presetKey: "3d2", apply: (config) => withValues(config, { decimalDivDividendDigits: 3, decimalDivDivisorDigits: 2 }) },
    { label: "4 / 2", presetKey: "4d2", apply: (config) => withValues(config, { decimalDivDividendDigits: 4, decimalDivDivisorDigits: 2 }) },
    { label: "4 / 3", presetKey: "4d3", apply: (config) => withValues(config, { decimalDivDividendDigits: 4, decimalDivDivisorDigits: 3 }) },
  ],
  integer_add_sub: [
    { label: "3-5 Rows", presetKey: "rows_3_5", apply: (config) => withValues(config, { integerAddSubRows: 3 }) },
    { label: "6-9 Rows", presetKey: "rows_6_9", apply: (config) => withValues(config, { integerAddSubRows: 6 }) },
    { label: "10+ Rows", presetKey: "rows_10_up", apply: (config) => withValues(config, { integerAddSubRows: 10 }) },
  ],
  intl_add_sub: [
    { label: "3-5 Rows", presetKey: "rows_3_5", apply: (config) => withValues(config, { intlAddSubRows: 3 }) },
    { label: "6-9 Rows", presetKey: "rows_6_9", apply: (config) => withValues(config, { intlAddSubRows: 6 }) },
    { label: "10+ Rows", presetKey: "rows_10_up", apply: (config) => withValues(config, { intlAddSubRows: 10 }) },
  ],
  lcm: [
    { label: "(1, 1)", presetKey: "1_1", apply: (config) => withValues(config, { lcmGcdFirstDigits: 1, lcmGcdSecondDigits: 1 }) },
    { label: "(2, 1)", presetKey: "2_1", apply: (config) => withValues(config, { lcmGcdFirstDigits: 2, lcmGcdSecondDigits: 1 }) },
    { label: "(2, 2)", presetKey: "2_2", apply: (config) => withValues(config, { lcmGcdFirstDigits: 2, lcmGcdSecondDigits: 2 }) },
    { label: "(3, 2)", presetKey: "3_2", apply: (config) => withValues(config, { lcmGcdFirstDigits: 3, lcmGcdSecondDigits: 2 }) },
  ],
  gcd: [
    { label: "(1, 1)", presetKey: "1_1", apply: (config) => withValues(config, { lcmGcdFirstDigits: 1, lcmGcdSecondDigits: 1 }) },
    { label: "(2, 1)", presetKey: "2_1", apply: (config) => withValues(config, { lcmGcdFirstDigits: 2, lcmGcdSecondDigits: 1 }) },
    { label: "(2, 2)", presetKey: "2_2", apply: (config) => withValues(config, { lcmGcdFirstDigits: 2, lcmGcdSecondDigits: 2 }) },
    { label: "(3, 2)", presetKey: "3_2", apply: (config) => withValues(config, { lcmGcdFirstDigits: 3, lcmGcdSecondDigits: 2 }) },
  ],
  square_root: [
    { label: "2 Digit", presetKey: "2d", apply: (config) => withValues(config, { rootDigits: 2 }) },
    { label: "3 Digit", presetKey: "3d", apply: (config) => withValues(config, { rootDigits: 3 }) },
    { label: "4 Digit", presetKey: "4d", apply: (config) => withValues(config, { rootDigits: 4 }) },
    { label: "5 Digit", presetKey: "5d", apply: (config) => withValues(config, { rootDigits: 5 }) },
    { label: "6 Digit", presetKey: "6d", apply: (config) => withValues(config, { rootDigits: 6 }) },
    { label: "7 Digit", presetKey: "7d", apply: (config) => withValues(config, { rootDigits: 7 }) },
    { label: "8 Digit", presetKey: "8d", apply: (config) => withValues(config, { rootDigits: 8 }) },
  ],
  cube_root: [
    { label: "3 Digit", presetKey: "3d", apply: (config) => withValues(config, { rootDigits: 3 }) },
    { label: "4 Digit", presetKey: "4d", apply: (config) => withValues(config, { rootDigits: 4 }) },
    { label: "5 Digit", presetKey: "5d", apply: (config) => withValues(config, { rootDigits: 5 }) },
    { label: "6 Digit", presetKey: "6d", apply: (config) => withValues(config, { rootDigits: 6 }) },
    { label: "7 Digit", presetKey: "7d", apply: (config) => withValues(config, { rootDigits: 7 }) },
    { label: "8 Digit", presetKey: "8d", apply: (config) => withValues(config, { rootDigits: 8 }) },
  ],
  percentage: [
    { label: "2 Digit", presetKey: "2d", apply: (config) => withValues(config, { percentageNumberDigits: 2 }) },
    { label: "3 Digit", presetKey: "3d", apply: (config) => withValues(config, { percentageNumberDigits: 3 }) },
    { label: "4 Digit", presetKey: "4d", apply: (config) => withValues(config, { percentageNumberDigits: 4 }) },
    { label: "5 Digit", presetKey: "5d", apply: (config) => withValues(config, { percentageNumberDigits: 5 }) },
    { label: "6 Digit", presetKey: "6d", apply: (config) => withValues(config, { percentageNumberDigits: 6 }) },
    { label: "7 Digit", presetKey: "7d", apply: (config) => withValues(config, { percentageNumberDigits: 7 }) },
  ],
};

export function isAddSubFamily(operationType: string): operationType is "add_sub" | "integer_add_sub" | "intl_add_sub" {
  return operationType === "add_sub" || operationType === "integer_add_sub" || operationType === "intl_add_sub";
}

export function applyMentalPreset(
  config: MentalQuestionConfig,
  presetKey: string,
): MentalQuestionConfig {
  const preset = MENTAL_PRESETS[config.operationType].find((entry) => entry.presetKey === presetKey);
  return preset ? preset.apply(config) : config;
}

export function getPresetKeyForConfig(config: MentalQuestionConfig): string {
  if (config.operationType === "multiplication") {
    return `${config.multiplicandDigits}x${config.multiplierDigits}`;
  }
  if (config.operationType === "division") {
    return `${config.dividendDigits}d${config.divisorDigits}`;
  }
  if (config.operationType === "decimal_multiplication") {
    return `${config.decimalMultMultiplicandDigits}x${config.decimalMultMultiplierDigits}`;
  }
  if (config.operationType === "decimal_division") {
    return `${config.decimalDivDividendDigits}d${config.decimalDivDivisorDigits}`;
  }
  if (config.operationType === "lcm" || config.operationType === "gcd") {
    return `${config.lcmGcdFirstDigits}_${config.lcmGcdSecondDigits}`;
  }
  if (config.operationType === "square_root" || config.operationType === "cube_root") {
    return `${config.rootDigits}d`;
  }
  if (config.operationType === "percentage") {
    return `${config.percentageNumberDigits}d`;
  }
  if (isAddSubFamily(config.operationType)) {
    const rows = config.operationType === "add_sub"
      ? config.addSubRows
      : config.operationType === "integer_add_sub"
        ? config.integerAddSubRows
        : config.intlAddSubRows;
    if (rows <= 5) return "rows_3_5";
    if (rows <= 9) return "rows_6_9";
    return "rows_10_up";
  }
  return "";
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function minForDigits(digits: number): number {
  return digits === 1 ? 1 : Math.pow(10, digits - 1);
}

function maxForDigits(digits: number): number {
  return Math.pow(10, digits) - 1;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

export function compareMentalAnswer(userAnswer: number | null, correctAnswer: number): boolean {
  if (userAnswer === null || Number.isNaN(userAnswer)) return false;
  if (Number.isInteger(correctAnswer) && Number.isInteger(userAnswer)) {
    return userAnswer === correctAnswer;
  }
  return Math.abs(userAnswer - correctAnswer) < 0.01;
}

export function formatMentalQuestion(question: Question): string {
  if (question.type === "multiplication") return `${question.multiplicand} x ${question.multiplier}`;
  if (question.type === "division") return `${question.dividend} / ${question.divisor}`;
  if (question.type === "decimal_multiplication") {
    return `${question.multiplicand.toFixed(question.multiplicandDecimals)} x ${question.multiplier.toFixed(question.multiplierDecimals)}`;
  }
  if (question.type === "decimal_division") return `${question.dividend} / ${question.divisor}`;
  if (question.type === "lcm") return `LCM(${question.first}, ${question.second})`;
  if (question.type === "gcd") return `GCD(${question.first}, ${question.second})`;
  if (question.type === "square_root") return `√${question.number}`;
  if (question.type === "cube_root") return `∛${question.number}`;
  if (question.type === "percentage") return `${question.percentage}% of ${question.number}`;
  return question.numbers
    .map((value, index) => (index === 0 ? `${value}` : `${question.operators[index - 1]} ${value}`))
    .join(" ");
}

export function getAddSubItems(question: AddSubQuestion | IntegerAddSubQuestion | IntlAddSubQuestion): string[] {
  return question.numbers.map((value, index) => (index === 0 ? `${value}` : `${question.operators[index - 1]} ${value}`));
}

export function describeMentalConfig(config: MentalQuestionConfig): string {
  switch (config.operationType) {
    case "multiplication":
      return `${config.multiplicandDigits} x ${config.multiplierDigits} digits`;
    case "division":
      return `${config.dividendDigits} / ${config.divisorDigits} digits`;
    case "add_sub":
      return `${config.addSubDigits} digits · ${config.addSubRows} rows`;
    case "decimal_multiplication":
      return `${config.decimalMultMultiplicandDigits} x ${config.decimalMultMultiplierDigits}`;
    case "decimal_division":
      return `${config.decimalDivDividendDigits} / ${config.decimalDivDivisorDigits}`;
    case "integer_add_sub":
      return `${config.integerAddSubDigits} digits · ${config.integerAddSubRows} rows`;
    case "intl_add_sub":
      return `${config.intlAddSubPreset.replace("_", "-")} digits · ${config.intlAddSubRows} rows`;
    case "lcm":
    case "gcd":
      return `${config.lcmGcdFirstDigits} & ${config.lcmGcdSecondDigits} digits`;
    case "square_root":
    case "cube_root":
      return `${config.rootDigits} digit target`;
    case "percentage": {
      const isDefaultRange = config.percentageMin === 1 && config.percentageMax === 100;
      return isDefaultRange
        ? `${config.percentageNumberDigits} digits`
        : `${config.percentageNumberDigits} digits · ${config.percentageMin}-${config.percentageMax}%`;
    }
    default:
      return "Custom";
  }
}

export function generateMentalQuestions(
  config: MentalQuestionConfig,
  count: number,
): Question[] {
  const questions: Question[] = [];

  for (let i = 0; i < count; i += 1) {
    if (config.operationType === "multiplication") {
      const multiplicand = randomInt(minForDigits(config.multiplicandDigits), maxForDigits(config.multiplicandDigits));
      const multiplier = randomInt(minForDigits(config.multiplierDigits), maxForDigits(config.multiplierDigits));
      questions.push({
        id: i + 1,
        type: "multiplication",
        multiplicand,
        multiplier,
        answer: multiplicand * multiplier,
      });
      continue;
    }

    if (config.operationType === "division") {
      const divisor = randomInt(minForDigits(config.divisorDigits), maxForDigits(config.divisorDigits));
      const quotientMin = Math.ceil(minForDigits(config.dividendDigits) / divisor);
      const quotientMax = Math.floor(maxForDigits(config.dividendDigits) / divisor);
      const quotient = randomInt(quotientMin, Math.max(quotientMin, quotientMax));
      questions.push({
        id: i + 1,
        type: "division",
        dividend: divisor * quotient,
        divisor,
        answer: quotient,
      });
      continue;
    }

    if (config.operationType === "add_sub") {
      const numbers: number[] = [];
      const operators: string[] = [];
      let result = 0;
      const min = minForDigits(config.addSubDigits);
      const max = maxForDigits(config.addSubDigits);
      const firstNum = randomInt(min, max);
      numbers.push(firstNum);
      result = firstNum;

      for (let row = 1; row < config.addSubRows; row += 1) {
        const value = randomInt(min, max);
        const isAdd = result < value ? true : Math.random() > 0.5;
        operators.push(isAdd ? "+" : "-");
        numbers.push(value);
        result += isAdd ? value : -value;
      }

      if (result < 0) {
        i -= 1;
        continue;
      }

      questions.push({
        id: i + 1,
        type: "add_sub",
        numbers,
        operators,
        answer: result,
      });
      continue;
    }

    if (config.operationType === "decimal_multiplication") {
      const multiplicandWhole = randomInt(
        minForDigits(config.decimalMultMultiplicandDigits),
        maxForDigits(config.decimalMultMultiplicandDigits),
      );
      const multiplicand = (multiplicandWhole * 10 + randomInt(0, 9)) / 10;
      const multiplier = config.decimalMultMultiplierDigits === 0
        ? randomInt(1, 99)
        : (randomInt(
            minForDigits(config.decimalMultMultiplierDigits),
            maxForDigits(config.decimalMultMultiplierDigits),
          ) * 10 + randomInt(0, 9)) / 10;
      questions.push({
        id: i + 1,
        type: "decimal_multiplication",
        multiplicand,
        multiplier,
        multiplicandDecimals: 1,
        multiplierDecimals: config.decimalMultMultiplierDigits === 0 ? 0 : 1,
        answer: Math.round(multiplicand * multiplier * 100) / 100,
      });
      continue;
    }

    if (config.operationType === "decimal_division") {
      const divisor = randomInt(
        minForDigits(config.decimalDivDivisorDigits),
        maxForDigits(config.decimalDivDivisorDigits),
      );
      let dividend = 0;
      let tries = 0;
      do {
        dividend = randomInt(
          minForDigits(config.decimalDivDividendDigits),
          maxForDigits(config.decimalDivDividendDigits),
        );
        tries += 1;
      } while (dividend % divisor === 0 && tries < 100);

      questions.push({
        id: i + 1,
        type: "decimal_division",
        dividend,
        divisor,
        dividendDecimals: 0,
        divisorDecimals: 0,
        answer: Math.round((dividend / divisor) * 100) / 100,
      });
      continue;
    }

    if (config.operationType === "integer_add_sub") {
      const numbers: number[] = [];
      const operators: string[] = [];
      let result = 0;
      const min = minForDigits(config.integerAddSubDigits);
      const max = maxForDigits(config.integerAddSubDigits);
      const firstNum = randomInt(min, max);
      numbers.push(firstNum);
      result = firstNum;

      for (let row = 1; row < config.integerAddSubRows; row += 1) {
        const value = randomInt(min, max);
        const isAdd = Math.random() > 0.5;
        operators.push(isAdd ? "+" : "-");
        numbers.push(value);
        result += isAdd ? value : -value;
      }

      questions.push({
        id: i + 1,
        type: "integer_add_sub",
        numbers,
        operators,
        answer: result,
      });
      continue;
    }

    if (config.operationType === "intl_add_sub") {
      const digitOptions = config.intlAddSubPreset === "1_2" ? [1, 2] : [2, 3];
      const numbers: number[] = [];
      const operators: string[] = [];
      let result = 0;

      const firstDigits = digitOptions[randomInt(0, digitOptions.length - 1)];
      const firstNum = randomInt(minForDigits(firstDigits), maxForDigits(firstDigits));
      numbers.push(firstNum);
      result = firstNum;

      for (let row = 1; row < config.intlAddSubRows; row += 1) {
        const digits = digitOptions[randomInt(0, digitOptions.length - 1)];
        const value = randomInt(minForDigits(digits), maxForDigits(digits));
        const isAdd = result < value ? true : Math.random() > 0.5;
        operators.push(isAdd ? "+" : "-");
        numbers.push(value);
        result += isAdd ? value : -value;
      }

      if (result < 0) {
        i -= 1;
        continue;
      }

      questions.push({
        id: i + 1,
        type: "intl_add_sub",
        numbers,
        operators,
        answer: result,
      });
      continue;
    }

    if (config.operationType === "lcm") {
      const first = randomInt(minForDigits(config.lcmGcdFirstDigits), maxForDigits(config.lcmGcdFirstDigits));
      const second = randomInt(minForDigits(config.lcmGcdSecondDigits), maxForDigits(config.lcmGcdSecondDigits));
      questions.push({
        id: i + 1,
        type: "lcm",
        first,
        second,
        answer: (first * second) / gcd(first, second),
      });
      continue;
    }

    if (config.operationType === "gcd") {
      const first = randomInt(minForDigits(config.lcmGcdFirstDigits), maxForDigits(config.lcmGcdFirstDigits));
      const second = randomInt(minForDigits(config.lcmGcdSecondDigits), maxForDigits(config.lcmGcdSecondDigits));
      questions.push({
        id: i + 1,
        type: "gcd",
        first,
        second,
        answer: gcd(first, second),
      });
      continue;
    }

    if (config.operationType === "square_root") {
      const minRoot = Math.ceil(Math.sqrt(minForDigits(config.rootDigits)));
      const maxRoot = Math.floor(Math.sqrt(maxForDigits(config.rootDigits)));
      const root = randomInt(minRoot, maxRoot);
      questions.push({
        id: i + 1,
        type: "square_root",
        number: root * root,
        answer: root,
      });
      continue;
    }

    if (config.operationType === "cube_root") {
      const minRoot = Math.ceil(Math.cbrt(minForDigits(config.rootDigits)));
      const maxRoot = Math.floor(Math.cbrt(maxForDigits(config.rootDigits)));
      const root = randomInt(minRoot, maxRoot);
      questions.push({
        id: i + 1,
        type: "cube_root",
        number: root * root * root,
        answer: root,
      });
      continue;
    }

    const percentage = randomInt(config.percentageMin, config.percentageMax);
    const number = randomInt(
      minForDigits(config.percentageNumberDigits),
      maxForDigits(config.percentageNumberDigits),
    );
    questions.push({
      id: i + 1,
      type: "percentage",
      number,
      percentage,
      answer: Math.round(((number * percentage) / 100) * 100) / 100,
    });
  }

  return questions;
}
