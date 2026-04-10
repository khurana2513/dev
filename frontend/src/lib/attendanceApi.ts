/**
 * Attendance Management API Client
 * All types and API calls for the attendance system.
 */
import apiClient from "./apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "on_break" | "leave";

export interface ClassSchedule {
  id: number;
  branch: string;
  course: string | null;
  level: string | null;
  batch_name: string | null;
  schedule_days: number[];       // 0=Mon … 6=Sun
  time_slots: { start: string; end: string }[] | null;
  is_active: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: number;
  schedule_id: number | null;
  session_date: string;
  branch: string;
  course: string | null;
  level: string | null;
  batch_name: string | null;
  topic: string | null;
  teacher_remarks: string | null;
  is_completed: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface StudentEntry {
  student_profile_id: number;
  user_id: number;
  public_id: string | null;
  name: string;
  display_name: string | null;
  class_name: string | null;
  course: string | null;
  level: string | null;
  branch: string | null;
  attendance_record_id: number | null;
  status: AttendanceStatus | null;
  t_shirt_worn: boolean;
  remarks: string | null;
  marked_at: string | null;
}

export interface SheetSummary {
  total: number;
  marked: number;
  unmarked: number;
  present: number;
  absent: number;
  on_break: number;
  leave: number;
  tshirt: number;
}

export interface AttendanceSheet {
  session: ClassSession;
  students: StudentEntry[];
  summary: SheetSummary;
}

export interface MonthlySessionEntry {
  session_id: number;
  session_date: string;
  branch: string;
  course: string | null;
  level: string | null;
  batch_name: string | null;
  topic: string | null;
  teacher_remarks: string | null;
  is_completed: boolean;
  status: AttendanceStatus | null;
  t_shirt_worn: boolean;
  remarks: string | null;
  marked_at: string | null;
}

export interface MonthlySummary {
  total_sessions: number;
  total_held: number;
  present: number;
  absent: number;
  on_break: number;
  leave: number;
  tshirt_worn: number;
  attendance_percentage: number;
  tshirt_percentage: number;
}

export interface StudentMonthlyAttendance {
  student: {
    id: number;
    public_id: string | null;
    name: string | null;
    branch: string | null;
    course: string | null;
    level: string | null;
  };
  month: number;
  year: number;
  sessions: MonthlySessionEntry[];
  summary: MonthlySummary;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_profile_id: number;
  status: AttendanceStatus;
  t_shirt_worn: boolean;
  remarks: string | null;
  marked_by_user_id: number;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  student_public_id?: string | null;
}

export interface SimpleStudent {
  id: number;
  user_id: number;
  public_id: string | null;
  name: string;
  display_name: string | null;
  class_name: string | null;
  course: string | null;
  level: string | null;
  branch: string | null;
}

// ─── Create / update payloads ─────────────────────────────────────────────────

export interface SessionCreatePayload {
  session_date: string;   // ISO string
  branch: string;
  course?: string;
  level?: string;
  batch_name?: string;
  topic?: string;
  teacher_remarks?: string;
  schedule_id?: number;
}

export interface BulkAttendanceItem {
  session_id: number;          // required by AttendanceRecordCreate schema
  student_profile_id: number;
  status: AttendanceStatus;
  t_shirt_worn?: boolean;
  remarks?: string;
}

export interface BulkAttendancePayload {
  session_id: number;
  attendance_data: BulkAttendanceItem[];
}

export interface RecordUpdatePayload {
  status?: AttendanceStatus;
  t_shirt_worn?: boolean;
  remarks?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/** List sessions, optionally filtered */
export async function getSessions(filters?: {
  branch?: string;
  course?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ClassSession[]> {
  const params = new URLSearchParams();
  if (filters?.branch)     params.set("branch", filters.branch);
  if (filters?.course)     params.set("course", filters.course);
  if (filters?.start_date) params.set("start_date", filters.start_date);
  if (filters?.end_date)   params.set("end_date", filters.end_date);
  const qs = params.toString();
  return apiClient.get<ClassSession[]>(`/attendance/sessions${qs ? "?" + qs : ""}`);
}

/** Create a new session */
export async function createSession(data: SessionCreatePayload): Promise<ClassSession> {
  return apiClient.post<ClassSession>("/attendance/sessions", data);
}

/** Update an existing session */
export async function updateSession(
  sessionId: number,
  data: SessionCreatePayload
): Promise<ClassSession> {
  return apiClient.put<ClassSession>(`/attendance/sessions/${sessionId}`, data);
}

/** Delete a session */
export async function deleteSession(sessionId: number): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/attendance/sessions/${sessionId}`);
}

/** Get the full attendance sheet for a session */
export async function getAttendanceSheet(sessionId: number): Promise<AttendanceSheet> {
  return apiClient.get<AttendanceSheet>(`/attendance/session/${sessionId}/sheet`);
}

/** Mark / update a single student's attendance (upsert) */
export async function markAttendance(data: {
  session_id: number;
  student_profile_id: number;
  status: AttendanceStatus;
  t_shirt_worn?: boolean;
  remarks?: string;
}): Promise<AttendanceRecord> {
  return apiClient.post<AttendanceRecord>("/attendance/mark", data);
}

/** Bulk mark attendance for all students in a session */
export async function bulkMarkAttendance(data: BulkAttendancePayload): Promise<AttendanceRecord[]> {
  return apiClient.post<AttendanceRecord[]>("/attendance/mark-bulk", data);
}

/** Update an existing attendance record by its ID */
export async function updateAttendanceRecord(
  recordId: number,
  data: RecordUpdatePayload
): Promise<AttendanceRecord> {
  return apiClient.put<AttendanceRecord>(`/attendance/record/${recordId}`, data);
}

/** Delete (unmark) an attendance record */
export async function deleteAttendanceRecord(
  sessionId: number,
  studentProfileId: number
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/attendance/records?session_id=${sessionId}&student_profile_id=${studentProfileId}`
  );
}

/** Get students available for attendance marking */
export async function getStudentsForAttendance(filters?: {
  branch?: string;
  course?: string;
}): Promise<SimpleStudent[]> {
  const params = new URLSearchParams();
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.course) params.set("course", filters.course);
  const qs = params.toString();
  return apiClient.get<SimpleStudent[]>(`/attendance/students${qs ? "?" + qs : ""}`);
}

/** Student's monthly attendance (own data, or admin passing student_profile_id) */
export async function getStudentMonthlyAttendance(
  month: number,
  year: number,
  studentProfileId?: number
): Promise<StudentMonthlyAttendance> {
  const params = new URLSearchParams({ month: String(month), year: String(year) });
  if (studentProfileId != null) params.set("student_profile_id", String(studentProfileId));
  return apiClient.get<StudentMonthlyAttendance>(`/attendance/student/monthly?${params}`);
}

/** Get attendance metrics (admin dashboard overview) */
export async function getAttendanceMetrics(filters?: {
  date?: string;
  branch?: string;
  course?: string;
}): Promise<{
  date: string;
  date_stats: {
    present: number;
    absent: number;
    on_break: number;
    total_marked: number;
    attendance_percentage: number;
  };
  monthly_stats: {
    present: number;
    total: number;
    attendance_percentage: number;
  };
}> {
  const params = new URLSearchParams();
  if (filters?.date)   params.set("date", filters.date);
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.course) params.set("course", filters.course);
  const qs = params.toString();
  return apiClient.get(`/attendance/metrics${qs ? "?" + qs : ""}`);
}

/** Get active class schedules (optionally filtered by branch/course) */
export async function getSchedules(filters?: {
  branch?: string;
  course?: string;
}): Promise<ClassSchedule[]> {
  const params = new URLSearchParams();
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.course) params.set("course", filters.course);
  const qs = params.toString();
  return apiClient.get<ClassSchedule[]>(`/attendance/schedules${qs ? "?" + qs : ""}`);
}

/** Idempotently create or get today's session for a branch/course */
export async function startTodaySession(data: {
  branch: string;
  course?: string;
  level?: string;
  batch_name?: string;
  topic?: string;
  schedule_id?: number;
}): Promise<ClassSession> {
  return apiClient.post<ClassSession>("/attendance/sessions/start-today", data);
}

/** Mark a session as completed */
export async function closeSession(sessionId: number): Promise<ClassSession> {
  return apiClient.post<ClassSession>(`/attendance/sessions/${sessionId}/close`, {});
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"] as const;
export const COURSES  = ["Abacus", "Vedic Maths", "Handwriting"] as const;

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present:   "Present",
  absent:    "Absent",
  on_break:  "On Break",
  leave:     "Leave",
};

export const STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string; dot: string; row: string }> = {
  present:  {
    bg:   " bg-emerald-900/40",
    text: " text-emerald-300",
    dot:  "bg-emerald-500",
    row:  " bg-emerald-950/25",
  },
  absent:   {
    bg:   " bg-rose-900/40",
    text: " text-rose-300",
    dot:  "bg-rose-500",
    row:  " bg-rose-950/25",
  },
  on_break: {
    bg:   " bg-amber-900/40",
    text: " text-amber-300",
    dot:  "bg-amber-500",
    row:  " bg-amber-950/25",
  },
  leave:    {
    bg:   " bg-blue-900/40",
    text: " text-blue-300",
    dot:  "bg-blue-500",
    row:  " bg-blue-950/25",
  },
};

/** Format a session date for display */
export function formatSessionDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
  });
}

/** Get initials from a name (max 2 chars) */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Deterministic pastel color for avatar based on name */
const AVATAR_PALETTE = [
  "bg-violet-500", "bg-blue-500",   "bg-cyan-500",
  "bg-teal-500",   "bg-emerald-500","bg-amber-500",
  "bg-rose-500",   "bg-pink-500",
];
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
