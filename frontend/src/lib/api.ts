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
  | "direct_add_sub" | "small_friends_add_sub" | "big_friends_add_sub" | "mix_friends_add_sub" | "percentage"
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

import apiClient from "./apiClient";
// Use same API base as userApi for consistency
import { buildApiUrl, looksLikeHtmlDocument } from "./apiBase";

function buildJsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function previewPaper(config: PaperConfig): Promise<PreviewResponse> {
  const url = buildApiUrl("/papers/preview");
  console.log("[PREVIEW] POST", url);

  try {
    const requestBody = JSON.stringify(config);

    const headers: Record<string, string> = {
      ...buildJsonHeaders(),
      "Accept": "application/json",
    };

    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: requestBody,
    });

    const responseText = await res.text();
    console.log("[PREVIEW] status:", res.status, "body length:", responseText.length);

    if (!res.ok) {
      let errorMessage = "Failed to preview paper";
      try {
        if (responseText) {
          const errorJson = JSON.parse(responseText);
          if (Array.isArray(errorJson.detail)) {
            errorMessage = errorJson.detail.map((e: any) =>
              `${e.loc?.join('.')}: ${e.msg}`
            ).join(', ');
          } else {
            errorMessage = errorJson.detail || errorJson.message || errorMessage;
          }
        }
      } catch {
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (!responseText) {
      throw new Error("Empty response from server");
    }

    if (looksLikeHtmlDocument(responseText)) {
      throw new Error(`API misconfiguration: preview returned HTML instead of JSON from ${url}`);
    }

    const data = JSON.parse(responseText);
    console.log("✅ [PREVIEW] blocks:", data.blocks?.length, "seed:", data.seed);
    return data;
  } catch (error) {
    console.error("[PREVIEW] error:", error instanceof Error ? error.message : String(error));
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
  const res = await fetch(buildApiUrl("/papers/generate-pdf"), {
    method: "POST",
    headers: buildJsonHeaders(),
    credentials: "include",
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
  /** When set, the attempt was started from a shared paper link.
   *  The backend tracks this separately from direct attempts (1 per share code per user). */
  shared_paper_code?: string;
}

export async function startPaperAttempt(data: PaperAttemptCreate): Promise<PaperAttempt> {
  return apiClient.post<PaperAttempt>("/papers/attempt", data);
}

export async function submitPaperAttempt(
  attemptId: number,
  answers: { [questionId: string]: number },
  timeTaken: number
): Promise<PaperAttempt> {
  return apiClient.put<PaperAttempt>(`/papers/attempt/${attemptId}`, {
    answers,
    time_taken: timeTaken,
  });
}

export async function getPaperAttempt(attemptId: number): Promise<PaperAttemptDetail> {
  return apiClient.get<PaperAttemptDetail>(`/papers/attempt/${attemptId}`);
}

export interface PaperAttemptValidation {
  valid: boolean;
  reason: string | null;
  expires_at: string | null;
}

export async function validatePaperAttempt(attemptId: number): Promise<PaperAttemptValidation> {
  return apiClient.get<PaperAttemptValidation>(`/papers/attempt/${attemptId}/validate`);
}

export async function getPaperAttempts(): Promise<PaperAttempt[]> {
  return apiClient.get<PaperAttempt[]>("/papers/attempts");
}

export interface PaperAttemptCount {
  count: number;
  can_reattempt: boolean;
  max_attempts: number;
}

export async function getPaperAttemptCount(seed: number, paperTitle: string): Promise<PaperAttemptCount> {
  const searchParams = new URLSearchParams({
    seed: String(seed),
    paper_title: paperTitle,
  });
  return apiClient.get<PaperAttemptCount>(`/papers/attempt/count?${searchParams.toString()}`);
}

// ── User Paper Templates ──────────────────────────────────────────────────────

export interface UserPaperTemplate {
  id: number;
  name: string;
  level: string | null;
  blocks: BlockConfig[];
  created_at: string;
  updated_at: string;
}

export interface UserPaperTemplateCreate {
  name: string;
  level?: string | null;
  blocks: BlockConfig[];
}

export interface UserPaperTemplateUpdate {
  name?: string;
  level?: string | null;
  blocks?: BlockConfig[];
}

export async function getUserPaperTemplates(): Promise<UserPaperTemplate[]> {
  return apiClient.get<UserPaperTemplate[]>("/paper-templates");
}

export async function createUserPaperTemplate(data: UserPaperTemplateCreate): Promise<UserPaperTemplate> {
  return apiClient.post<UserPaperTemplate>("/paper-templates", data);
}

export async function updateUserPaperTemplate(id: number, data: UserPaperTemplateUpdate): Promise<UserPaperTemplate> {
  return apiClient.put<UserPaperTemplate>(`/paper-templates/${id}`, data);
}

export async function deleteUserPaperTemplate(id: number): Promise<void> {
  return apiClient.delete<void>(`/paper-templates/${id}`);
}

// ── Shared Papers ───────────────────────────────────────────────────────────

export interface SharedPaper {
  code: string;
  paper_title: string;
  paper_level: string;
  paper_config: PaperConfig;
  generated_blocks: GeneratedBlock[];
  seed: number;
  total_questions: number;
  created_by_name: string | null;
  created_at: string;
  expires_at: string;
  view_count: number;
  attempt_count: number;
}

export interface SharePaperRequest {
  paper_title: string;
  paper_level: string;
  paper_config: PaperConfig;
  generated_blocks: GeneratedBlock[];
  seed: number;
}

export async function sharePaper(data: SharePaperRequest): Promise<SharedPaper> {
  return apiClient.post<SharedPaper>("/papers/share", data);
}

export async function getSharedPaper(code: string): Promise<SharedPaper> {
  return apiClient.get<SharedPaper>(`/papers/shared/${encodeURIComponent(code)}`, { requireAuth: false });
}

export async function markSharedPaperAttemptStarted(code: string): Promise<void> {
  return apiClient.post<void>(`/papers/shared/${encodeURIComponent(code)}/attempt-started`);
}
