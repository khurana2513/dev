/**
 * Exam System API — typed wrappers around the /exam/* backend endpoints.
 *
 * Answer durability strategy (client side):
 *   1. Every keypress writes to localStorage (primary durability)
 *   2. Every change debounces a POST to /exam/{code}/answer (server backup)
 *   3. On page reload, /exam/{code}/session is fetched and localStorage is
 *      hydrated from the server's saved answers (crash recovery)
 *   4. On submit, all answers are sent one final time as a safety net
 */

import apiClient from "./apiClient";
import { buildApiUrl } from "./apiBase";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExamPaper {
  id: number;
  exam_code: string;
  title: string;
  paper_id: number;
  scheduled_start_at: string;   // ISO UTC
  scheduled_end_at: string;     // ISO UTC
  duration_seconds: number;
  late_join_cutoff_minutes: number;
  shuffle_questions: boolean;
  allow_back_navigation: boolean;
  auto_submit_on_expiry: boolean;
  grace_window_seconds: number;
  org_id: string | null;
  is_open: boolean;
  is_published: boolean;
  status: "draft" | "published" | "live" | "ended" | "graded" | "results_released";
  results_release_mode: "manual" | "auto";
  results_released_at: string | null;
  show_answers_to_students: boolean;
  created_at: string;
  total_joined: number;
  total_submitted: number;
  total_active: number;
}

export interface ExamPaperCreate {
  title: string;
  paper_id: number;
  exam_code: string;
  scheduled_start_at: string;   // ISO string (UTC)
  scheduled_end_at: string;     // ISO string (UTC)
  duration_seconds: number;
  late_join_cutoff_minutes?: number;
  shuffle_questions?: boolean;
  allow_back_navigation?: boolean;
  auto_submit_on_expiry?: boolean;
  grace_window_seconds?: number;
  org_id?: string | null;
  is_open?: boolean;
  results_release_mode?: "manual" | "auto";
}

export interface ExamPaperUpdate {
  title?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
  duration_seconds?: number;
  is_open?: boolean;
  is_published?: boolean;
  show_answers_to_students?: boolean;
  results_release_mode?: "manual" | "auto";
}

export interface JoinResponse {
  session_id: number;
  exam_title: string;
  exam_code: string;
  duration_seconds: number;
  allow_back_navigation: boolean;
  scheduled_start_at: string;
  server_time_utc: string;
  status: "waiting" | "active";
  seconds_elapsed: number | null;
}

export interface ExamQuestion {
  id: number;
  display_index: number;
  text: string;
}

export interface ExamQuestionsResponse {
  session_id: number;
  questions: ExamQuestion[];
  total: number;
  server_time_utc: string;
  server_deadline: string;    // ISO UTC
}

export interface SessionState {
  session_id: number;
  exam_code: string;
  status: string;
  seconds_remaining: number | null;
  server_time_utc: string;
  question_order: number[] | null;
  answers: Record<number, string>;  // {question_id: raw_answer}
  allow_back_navigation: boolean;
  duration_seconds: number;
}

export interface ExamSessionSummary {
  id: number;
  user_id: number;
  student_name: string;
  public_id: string | null;
  status: string;
  joined_at: string | null;
  submitted_at: string | null;
  time_used_seconds: number | null;
  answers_saved: number;
  flag_count: number;
  tab_switch_count: number;
  scored_marks: number | null;
  percentage: number | null;
  rank: number | null;
  pass_fail: string | null;
}

export interface CockpitResponse {
  exam_paper_id: number;
  exam_code: string;
  status: string;
  total_registered: number;
  total_waiting: number;
  total_active: number;
  total_submitted: number;
  total_auto_submitted: number;
  total_not_joined: number;
  server_time_utc: string;
  seconds_remaining: number | null;
  recent_events: Array<{session_id: number; type: string; at: string; payload: unknown}>;
}

export interface StudentResult {
  session_id: number;
  exam_title: string;
  exam_code: string;
  submitted_at: string | null;
  total_marks: number | null;
  scored_marks: number | null;
  percentage: number | null;
  rank: number | null;
  pass_fail: string | null;
  is_graded: boolean;
  is_result_released: boolean;
  show_answers: boolean;
  answer_detail: Array<{
    question_id: number;
    your_answer: string;
    correct_answer: number | null;
    is_correct: boolean | null;
    marks_awarded: number | null;
  }> | null;
}

// ── Admin API ───────────────────────────────────────────────────────────────

export const examAdminApi = {
  createExam: (data: ExamPaperCreate): Promise<ExamPaper> =>
    apiClient.post<ExamPaper>("/exam/", data),

  listExams: (): Promise<ExamPaper[]> =>
    apiClient.get<ExamPaper[]>("/exam/admin/all"),

  updateExam: (code: string, data: ExamPaperUpdate): Promise<ExamPaper> =>
    apiClient.patch<ExamPaper>(`/exam/${encodeURIComponent(code)}`, data),

  deleteExam: (code: string): Promise<void> =>
    apiClient.delete<void>(`/exam/${encodeURIComponent(code)}`),

  publishExam: (code: string): Promise<ExamPaper> =>
    apiClient.post<ExamPaper>(`/exam/${encodeURIComponent(code)}/admin/publish`, {}),

  startExam: (code: string): Promise<ExamPaper> =>
    apiClient.post<ExamPaper>(`/exam/${encodeURIComponent(code)}/admin/start`, {}),

  endExam: (code: string): Promise<ExamPaper> =>
    apiClient.post<ExamPaper>(`/exam/${encodeURIComponent(code)}/admin/end`, {}),

  gradeExam: (code: string): Promise<{graded: number; total_questions: number}> =>
    apiClient.post<{graded: number; total_questions: number}>(
      `/exam/${encodeURIComponent(code)}/admin/grade`, {}
    ),

  releaseResults: (code: string, showAnswers: boolean): Promise<ExamPaper> =>
    apiClient.post<ExamPaper>(`/exam/${encodeURIComponent(code)}/admin/release`, {
      exam_paper_id: 0,       // server ignores this field, uses URL code
      show_answers_to_students: showAnswers,
    }),

  announce: (code: string, message: string): Promise<{sent: boolean}> =>
    apiClient.post<{sent: boolean}>(`/exam/${encodeURIComponent(code)}/admin/announce`, { message }),

  forceSubmit: (code: string, sessionId: number): Promise<{force_submitted: boolean; session_id: number}> =>
    apiClient.post<{force_submitted: boolean; session_id: number}>(
      `/exam/${encodeURIComponent(code)}/admin/force-submit/${sessionId}`, {}
    ),

  getCockpit: (code: string): Promise<CockpitResponse> =>
    apiClient.get<CockpitResponse>(`/exam/${encodeURIComponent(code)}/admin/cockpit`),

  getSessions: (code: string): Promise<ExamSessionSummary[]> =>
    apiClient.get<ExamSessionSummary[]>(`/exam/${encodeURIComponent(code)}/admin/sessions`),
};

// ── Student API ─────────────────────────────────────────────────────────────

export const examStudentApi = {
  getExamInfo: (code: string): Promise<{
    exam_code: string;
    title: string;
    status: string;
    scheduled_start_at: string | null;
    scheduled_end_at: string | null;
    duration_seconds: number;
    allow_back_navigation: boolean;
    server_time_utc: string;
  }> => apiClient.get(`/exam/${encodeURIComponent(code)}`),

  join: (code: string, deviceFingerprint?: string): Promise<JoinResponse> =>
    apiClient.post<JoinResponse>(`/exam/${encodeURIComponent(code)}/join`, {
      exam_code: code.toUpperCase(),
      device_fingerprint: deviceFingerprint || null,
    }),

  getQuestions: (code: string, sessionId: number): Promise<ExamQuestionsResponse> =>
    apiClient.get<ExamQuestionsResponse>(
      `/exam/${encodeURIComponent(code)}/questions?session_id=${sessionId}`
    ),

  getSessionState: (code: string, sessionId: number): Promise<SessionState> =>
    apiClient.get<SessionState>(
      `/exam/${encodeURIComponent(code)}/session?session_id=${sessionId}`
    ),

  saveAnswer: (
    code: string,
    questionId: number,
    rawAnswer: string,
  ): Promise<{question_id: number; saved: boolean; server_time_utc: string}> =>
    apiClient.post(`/exam/${encodeURIComponent(code)}/answer`, {
      question_id: questionId,
      raw_answer: rawAnswer,
    }),

  bulkSaveAnswers: (
    code: string,
    answers: Array<{question_id: number; raw_answer: string}>,
  ): Promise<{saved: number; skipped: number}> =>
    apiClient.post(`/exam/${encodeURIComponent(code)}/answers`, { answers }),

  submit: (
    code: string,
    answers: Array<{question_id: number; raw_answer: string}>,
  ): Promise<{
    submission_id: string;
    submitted_at: string;
    total_answered: number;
    total_questions: number;
    message: string;
  }> => apiClient.post(`/exam/${encodeURIComponent(code)}/submit`, { answers }),

  getResult: (code: string, sessionId: number): Promise<StudentResult> =>
    apiClient.get<StudentResult>(
      `/exam/${encodeURIComponent(code)}/result?session_id=${sessionId}`
    ),

  logEvent: (
    code: string,
    eventType: string,
    payload?: Record<string, unknown>,
  ): Promise<void> =>
    apiClient.post<void>(`/exam/${encodeURIComponent(code)}/event`, {
      type: eventType,
      ...payload,
    }).catch(() => { /* proctoring events are fire-and-forget */ }),
};


// ── SSE helpers ─────────────────────────────────────────────────────────────

export type ExamSSEEvent =
  | { type: "connected"; exam_status: string; server_time_utc: string }
  | { type: "exam_started"; deadline_utc: string; server_time_utc?: string }
  | { type: "force_submit"; reason: string; session_id?: number }
  | { type: "announce"; message: string }
  | { type: "ping"; server_time_utc: string };

/**
 * Opens a Server-Sent Events connection for an exam session.
 * Returns a cleanup function — call it to close the connection.
 *
 * @example
 *   const close = openExamSSE(code, sessionId, (ev) => {
 *     if (ev.type === "exam_started") startTimer(ev.deadline_utc);
 *   });
 *   // later: close();
 */
export function openExamSSE(
  code: string,
  sessionId: number,
  onEvent: (event: ExamSSEEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const url = buildApiUrl(
    `/exam/${encodeURIComponent(code)}/sse?session_id=${sessionId}`
  );
  const es = new EventSource(url, { withCredentials: true });

  es.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data) as ExamSSEEvent;
      onEvent(parsed);
    } catch {
      // ignore malformed SSE payload
    }
  };

  if (onError) {
    es.onerror = onError;
  }

  return () => es.close();
}


// ── localStorage helpers ─────────────────────────────────────────────────────

const LOCAL_KEY = (code: string, sessionId: number) =>
  `exam_answers_${code.toUpperCase()}_${sessionId}`;

/** Write (or update) a single answer to localStorage. */
export function localSaveAnswer(
  code: string,
  sessionId: number,
  questionId: number,
  rawAnswer: string,
): void {
  try {
    const key = LOCAL_KEY(code, sessionId);
    const existing = localGetAnswers(code, sessionId);
    existing[questionId] = rawAnswer;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // localStorage can be unavailable (private mode) — fail silently
  }
}

/** Read all answers for a session from localStorage. */
export function localGetAnswers(
  code: string,
  sessionId: number,
): Record<number, string> {
  try {
    const key = LOCAL_KEY(code, sessionId);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, string>;
  } catch {
    return {};
  }
}

/** Merge server-side answers into localStorage (server wins on conflicts). */
export function localMergeServerAnswers(
  code: string,
  sessionId: number,
  serverAnswers: Record<number, string>,
): void {
  try {
    const key = LOCAL_KEY(code, sessionId);
    const local = localGetAnswers(code, sessionId);
    // Server takes precedence — if server has an answer for a question, use it
    const merged = { ...local, ...serverAnswers };
    localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // fail silently
  }
}

/** Clear localStorage answers after successful submit. */
export function localClearAnswers(code: string, sessionId: number): void {
  try {
    localStorage.removeItem(LOCAL_KEY(code, sessionId));
  } catch {
    // fail silently
  }
}

/** Validate an answer string: only 0-9, '.', '-', max 20 chars. */
export function isValidAnswer(raw: string): boolean {
  if (raw.length > 20) return false;
  return /^-?[0-9]*\.?[0-9]*$/.test(raw);
}

// ── Paper list (for exam creation) ──────────────────────────────────────────

export interface PaperSummary {
  id: number;
  title: string;
  level: string;
  created_at: string;
}

export async function listSavedPapers(): Promise<PaperSummary[]> {
  return apiClient.get<PaperSummary[]>("/papers");
}
