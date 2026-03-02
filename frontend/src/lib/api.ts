// API types matching Python backend
export interface Constraints {
  digits?: number;
  rows?: number;
  allowBorrow?: boolean;
  allowCarry?: boolean;
  minAnswer?: number;
  maxAnswer?: number;
  dividendDigits?: number;
  divisorDigits?: number;
  multiplicandDigits?: number;
  multiplierDigits?: number;
  rootDigits?: number;  // For square root and cube root (3-6 digits)
  percentageMin?: number;  // For percentage: minimum percentage (1-100)
  percentageMax?: number;  // For percentage: maximum percentage (1-100)
  numberDigits?: number;  // For percentage: digits for the number (1-10, default 4)
  // Vedic Maths constraints
  base?: number;  // For subtraction (100, 1000, etc) and special products
  firstDigits?: number;  // For addition: digits of first number
  secondDigits?: number;  // For addition: digits of second number
  multiplier?: number;  // For multiply by 12-19
  multiplierRange?: number;  // For multiply by 21-91
  divisor?: number;  // For divide by single digit
  tableNumber?: number;  // For tables (111-999)
  tableNumberLarge?: number;  // For large tables (1111-9999)
  // Vedic Maths Level 2 constraints
  powerOf10?: number;  // For subtraction from powers of 10 (2-6)
  // Vedic Maths Level 3 constraints
  multiplicationCase?: "2x2" | "3x2" | "4x2" | "3x3" | "4x3" | "4x4" | "mix";  // For vedic_multiplication
  fractionCase?: "direct" | "different_denominator" | "whole" | "mix";  // For fraction operations
  divisorCheck?: number;  // For check divisibility: 2,3,4,5,6,8,9,10
  // Vedic Maths Level 4 constraints
  funWith5Case?: "decimal" | "triple" | "mix";  // For Fun with 5 Level 4
  funWith10Case?: "decimal" | "triple" | "mix";  // For Fun with 10 Level 4
  divisibilityCase?: "by_7" | "by_11" | "random";  // For check divisibility Level 4
  division9_8_7_6Case?: "9" | "8" | "7" | "6" | "mix";  // For Division (9, 8, 7, 6)
  division91_121Case?: "91" | "121" | "mix";  // For Division (91, 121)
  bodmasDifficulty?: "easy" | "medium" | "hard";  // For BODMAS
  cubeRootDigits?: number;  // For cube root Level 4: 4-10 digits
}

export type QuestionType = 
  | "addition" | "subtraction" | "add_sub" | "multiplication" | "division" | "square_root" | "cube_root" 
  | "decimal_multiplication" | "lcm" | "gcd" | "integer_add_sub" | "decimal_division" | "decimal_add_sub" 
  | "direct_add_sub" | "small_friends_add_sub" | "big_friends_add_sub" | "percentage"
  | "vedic_multiply_by_11" | "vedic_multiply_by_101" | "vedic_subtraction_complement" | "vedic_subtraction_normal"
  | "vedic_multiply_by_12_19" | "vedic_special_products_base_100" | "vedic_special_products_base_50"
  | "vedic_multiply_by_21_91" | "vedic_addition" | "vedic_multiply_by_2" | "vedic_multiply_by_4"
  | "vedic_divide_by_2" | "vedic_divide_by_4" | "vedic_divide_single_digit" | "vedic_multiply_by_6"
  | "vedic_divide_by_11" | "vedic_squares_base_10" | "vedic_squares_base_100" | "vedic_squares_base_1000" | "vedic_tables"
  | "vedic_tables_large"
  | "vedic_fun_with_9_equal" | "vedic_fun_with_9_less_than" | "vedic_fun_with_9_greater_than"
  | "vedic_fun_with_5" | "vedic_fun_with_10" | "vedic_multiply_by_1001"
  | "vedic_multiply_by_5_25_125" | "vedic_divide_by_5_25_125" | "vedic_multiply_by_5_50_500" | "vedic_divide_by_5_50_500"
  | "vedic_vinculum" | "vedic_devinculum" | "vedic_subtraction_powers_of_10" | "vedic_special_products_base_1000"
  | "vedic_special_products_cross_multiply" | "vedic_special_products_cross_base" | "vedic_special_products_cross_base_50"
  | "vedic_duplex" | "vedic_squares_duplex" | "vedic_divide_with_remainder"
  | "vedic_divide_by_9s_repetition_equal" | "vedic_divide_by_9s_repetition_less_than"
  | "vedic_divide_by_11s_repetition_equal" | "vedic_divide_by_11s_repetition_less_than"
  | "vedic_divide_by_7" | "vedic_dropping_10_method"
  | "vedic_multiply_by_111_999" | "vedic_multiply_by_102_109" | "vedic_multiply_by_112_119" | "vedic_multiplication"
  | "vedic_mix_multiplication" | "vedic_combined_operation" | "vedic_fraction_simplification" | "vedic_fraction_addition"
  | "vedic_fraction_subtraction" | "vedic_squares_level3" | "vedic_percentage_level3" | "vedic_squares_addition"
  | "vedic_squares_subtraction" | "vedic_squares_deviation" | "vedic_cubes" | "vedic_check_divisibility"
  | "vedic_missing_numbers" | "vedic_box_multiply" | "vedic_multiply_by_10001" | "vedic_duplex_level3" | "vedic_squares_large"
  | "vedic_multiplication_level4" | "vedic_multiply_by_111_999_level4" | "vedic_decimal_add_sub" | "vedic_fun_with_5_level4"
  | "vedic_fun_with_10_level4" | "vedic_find_x" | "vedic_hcf" | "vedic_lcm_level4" | "vedic_bar_add_sub"
  | "vedic_fraction_multiplication" | "vedic_fraction_division" | "vedic_check_divisibility_level4"
  | "vedic_division_without_remainder" | "vedic_division_with_remainder" | "vedic_divide_by_11_99"
  | "vedic_division_9_8_7_6" | "vedic_division_91_121" | "vedic_digital_sum" | "vedic_cubes_base_method"
  | "vedic_check_perfect_cube" | "vedic_cube_root_level4" | "vedic_bodmas" | "vedic_square_root_level4" | "vedic_magic_square";

export interface BlockConfig {
  id: string;
  type: QuestionType;
  count: number;
  constraints: Constraints;
  title?: string;
}

export interface PaperConfig {
  level: "Custom" | "Junior" | "AB-1" | "AB-2" | "AB-3" | "AB-4" | "AB-5" | "AB-6" | "AB-7" | "AB-8" | "AB-9" | "AB-10" | "Advanced" | "Vedic-Level-1" | "Vedic-Level-2" | "Vedic-Level-3" | "Vedic-Level-4";
  title: string;
  totalQuestions: "10" | "20" | "30" | "50" | "100";
  blocks: BlockConfig[];
  orientation: "portrait" | "landscape";
}

export interface Question {
  id: number;
  text: string;
  operands: number[];
  operator: string;
  operators?: string[];  // For mixed operations: list of operators for each operand (except first)
  answer: number;  // Can be float for decimal operations
  isVertical: boolean;
}

export interface GeneratedBlock {
  config: BlockConfig;
  questions: Question[];
}

export interface PreviewResponse {
  blocks: GeneratedBlock[];
  seed: number;
}

// Use same API base as userApi for consistency
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function previewPaper(config: PaperConfig): Promise<PreviewResponse> {
  console.log("=".repeat(60));
  console.log("PREVIEW REQUEST");
  console.log("=".repeat(60));
  console.log("Config:", JSON.stringify(config, null, 2));
  
  const url = `${API_BASE}/papers/preview`;
  console.log("URL:", url);
  console.log("Full URL would be:", window.location.origin + url);
  
  try {
    const requestBody = JSON.stringify(config);
    console.log("Request body length:", requestBody.length);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: requestBody,
    });
    
    console.log("Response received!");
    console.log("Status:", res.status, res.statusText);
    console.log("Status Text:", res.statusText);
    console.log("OK:", res.ok);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    
    const responseText = await res.text();
    console.log("Response text length:", responseText.length);
    console.log("Response text (first 500 chars):", responseText.substring(0, 500));
    
    if (!res.ok) {
      console.error("Response not OK!");
      let errorMessage = "Failed to preview paper";
      try {
        if (responseText) {
          const errorJson = JSON.parse(responseText);
          console.log("Error JSON:", errorJson);
          if (Array.isArray(errorJson.detail)) {
            errorMessage = errorJson.detail.map((e: any) => 
              `${e.loc?.join('.')}: ${e.msg}`
            ).join(', ');
          } else {
            errorMessage = errorJson.detail || errorJson.message || errorMessage;
          }
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    if (!responseText) {
      throw new Error("Empty response from server");
    }
    
    const data = JSON.parse(responseText);
    console.log("✅ Preview success!");
    console.log("Blocks:", data.blocks?.length || 0);
    console.log("Seed:", data.seed);
    return data;
  } catch (error) {
    console.error("=".repeat(60));
    console.error("PREVIEW ERROR");
    console.error("=".repeat(60));
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
    throw error;
  }
}

export async function generatePdf(
  config: PaperConfig,
  withAnswers: boolean,
  seed?: number,
  generatedBlocks?: GeneratedBlock[],
  answersOnly?: boolean,
  includeSeparateAnswerKey?: boolean
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/papers/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, withAnswers, seed, generatedBlocks, answersOnly, includeSeparateAnswerKey }),
  });
  if (!res.ok) throw new Error("Failed to generate PDF");
  return res.blob();
}

// Paper Attempt API
export interface PaperAttempt {
  id: number;
  paper_title: string;
  paper_level: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  score: number;
  time_taken: number | null;
  points_earned: number;
  started_at: string;
  completed_at: string | null;
  seed?: number; // Seed used for paper generation (needed for re-attempt limit checking)
}

export interface PaperAttemptDetail extends PaperAttempt {
  paper_config: PaperConfig;
  generated_blocks: GeneratedBlock[];
  seed: number;
  answers: { [questionId: string]: number } | null;
}

export interface PaperAttemptCreate {
  paper_title: string;
  paper_level: string;
  paper_config: PaperConfig;
  generated_blocks: GeneratedBlock[];
  seed: number;
  answers?: { [questionId: string]: number };
}

export async function startPaperAttempt(data: PaperAttemptCreate): Promise<PaperAttempt> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/papers/attempt`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to start attempt" }));
    throw new Error(error.detail || "Failed to start attempt");
  }
  return res.json();
}

export async function submitPaperAttempt(
  attemptId: number,
  answers: { [questionId: string]: number },
  timeTaken: number
): Promise<PaperAttempt> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  
  try {
    const res = await fetch(`${API_BASE}/papers/attempt/${attemptId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ answers, time_taken: timeTaken }),
    });
    
    if (!res.ok) {
      let errorMessage = "Failed to submit attempt";
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          // Handle both string and object detail
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e: any) => 
              `${e.loc?.join('.')}: ${e.msg || e.message || JSON.stringify(e)}`
            ).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
        }
      } catch (parseError) {
        const text = await res.text().catch(() => "");
        errorMessage = text || `Server error: ${res.status} ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    return res.json();
  } catch (error) {
    // Re-throw with better error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(typeof error === 'string' ? error : "Failed to submit attempt");
  }
}

export async function getPaperAttempt(attemptId: number): Promise<PaperAttemptDetail> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/papers/attempt/${attemptId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get attempt");
  return res.json();
}

export interface PaperAttemptValidation {
  valid: boolean;
  reason: string | null;
  expires_at: string | null;
}

export async function validatePaperAttempt(attemptId: number): Promise<PaperAttemptValidation> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/papers/attempt/${attemptId}/validate`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to validate attempt");
  return res.json();
}

export async function getPaperAttempts(): Promise<PaperAttempt[]> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/papers/attempts`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ [API] getPaperAttempts error:", res.status, errorText);
    try {
      const errorJson = JSON.parse(errorText);
      console.error("❌ [API] Error details:", errorJson);
    } catch {
      // Not JSON, use text
    }
    throw new Error(`Failed to get attempts: ${res.status} ${errorText}`);
  }
  return res.json();
}

export interface PaperAttemptCount {
  count: number;
  can_reattempt: boolean;
  max_attempts: number;
}

export async function getPaperAttemptCount(seed: number, paperTitle: string): Promise<PaperAttemptCount> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/papers/attempt/count?seed=${seed}&paper_title=${encodeURIComponent(paperTitle)}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get attempt count");
  return res.json();
}

