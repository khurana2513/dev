import type { PaperAttemptDetail } from "./api";
import apiClient from "./apiClient";

// User API client - Uses centralized API client with retry logic and error handling

export interface User {
  id: number;
  email?: string | null;
  name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  is_archived?: boolean;
  created_at: string;
  public_id?: string | null;
  // Profile fields (populated in admin context)
  class_name?: string | null;
  course?: string | null;
  level_type?: string | null;
  level?: string | null;
  branch?: string | null;
  status?: string;
  join_date?: string | null;
  finish_date?: string | null;
  parent_contact_number?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface PracticeSessionData {
  operation_type: string;
  difficulty_mode: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  score: number;
  time_taken: number;
  points_earned: number;
  preset_key?: string | null;   // e.g. '2x1', '3d2', 'rows_6_9'
  row_count?: number | null;    // Number of rows for add_sub family
  attempts: Array<{
    question_data: any;
    user_answer: number | null;
    correct_answer: number;
    is_correct: boolean;
    time_taken: number;
    question_number: number;
  }>;
}

export interface PracticeSession {
  id: number;
  operation_type: string;
  difficulty_mode: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  score: number;
  time_taken: number;
  points_earned: number;
  started_at: string;
  completed_at?: string;
}

export interface Attempt {
  id: number;
  question_data: any;
  user_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  time_taken: number;
  question_number: number;
  created_at: string;
}

export interface PracticeSessionDetail extends PracticeSession {
  attempts: Attempt[];
}

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
  seed: number; // Seed used for paper generation (needed for re-attempt limit checking)
}

export interface StudentStats {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  overall_accuracy: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  badges: string[];
  recent_sessions: PracticeSession[];
  recent_paper_attempts?: PaperAttempt[];
  total_paper_attempts?: number;
  paper_total_questions?: number;
  paper_total_correct?: number;
  paper_total_wrong?: number;
  paper_overall_accuracy?: number;
}

export interface AdminStats {
  total_students: number;
  total_sessions: number;
  total_questions: number;
  average_accuracy: number;
  active_students_today: number;
  active_students_today_list?: ActiveStudentEntry[];
  active_students_last_7_days?: ActiveStudentsDayRecord[];
  active_students_last_7_days_unique?: number;
  top_students: Array<{
    rank: number;
    user_id: number;
    name: string;
    display_name?: string;
    avatar_url?: string;
    total_points: number;
  }>;
}

export interface ActiveStudentEntry {
  user_id: number;
  name: string;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  public_id?: string | null;
  branch?: string | null;
  course?: string | null;
  last_active_at?: string | null;
}

export interface ActiveStudentsDayRecord {
  date: string;
  count: number;
  students: ActiveStudentEntry[];
}

export interface AdminActivityEntry {
  student_id: number;
  name: string;
  email?: string | null;
  public_id?: string | null;
  activity_type: string;
  activity_label: string;
  activity_at: string;
  duration_seconds?: number | null;
  correct_answers?: number | null;
  wrong_answers?: number | null;
}

export interface StudentOnlineDay {
  date: string;
  online: boolean;
  time_spent_seconds: number;
}

export interface StudentEngagementResponse {
  student_id: number;
  last_seen_at?: string | null;
  total_time_spent_seconds_6m: number;
  average_time_spent_seconds_active_day_6m: number;
  online_days_count_6m: number;
  offline_days_count_6m: number;
  online_offline_calendar_6m: StudentOnlineDay[];
  streak_days_all_time: string[];
  current_streak: number;
  longest_streak: number;
  recent_activities: AdminActivityEntry[];
}

export interface AdminSiteInsightsResponse {
  active_currently_count: number;
  active_currently_students: ActiveStudentEntry[];
  active_today_count: number;
  active_today_students: ActiveStudentEntry[];
  active_last_7_days_unique_count: number;
  active_last_7_days_by_day: ActiveStudentsDayRecord[];
  active_last_6_months_count: number;
  active_last_6_months_students: ActiveStudentEntry[];
  average_time_spent_seconds_per_user_6m: number;
  recent_activities: AdminActivityEntry[];
}

// ─── Combined Dashboard Interfaces ──────────────────────────────────────────
// Single-call endpoints that replace 5+ separate API calls per dashboard load

export interface StudentDashboardData {
  stats: StudentStats;
  profile: StudentProfile | null;
  paper_attempts: PaperAttempt[];
  // Pre-aggregated per-paper attempt counts: "{seed}_{paper_title}" → count
  attempt_counts: Record<string, number>;
}

export interface AdminDashboardData {
  stats: AdminStats;
  students: User[];
  database_stats: DatabaseStats;
}

// Set auth token
export function setAuthToken(token: string): void {
  void token;
}

// Remove auth token
export function removeAuthToken(): void {
  // Auth now lives in HttpOnly cookies; only clear client-side cached profile data.
}

// Login with Google OAuth token - Uses centralized API client
export async function loginWithGoogle(token: string): Promise<LoginResponse> {
  console.log("🔵 [LOGIN] Login started, token length:", token.length);
  
  try {
    const data = await apiClient.login<LoginResponse>("/users/login", { credential: token });
    
    if (!data || !data.access_token) {
      console.error("❌ [LOGIN] No access_token in response:", data);
      throw new Error("No access token in response");
    }
    
    console.log("✅ [LOGIN] Login successful, received access_token and refresh_token!");
    return data;
  } catch (error: any) {
    console.error("❌ [LOGIN] Login failed:", error);
    throw error instanceof Error ? error : new Error(`Login failed: ${error?.toString() || 'Unknown error'}`);
  }
}

export async function refreshAccessToken(refreshToken?: string): Promise<{ access_token: string }> {
  console.log("🔄 [REFRESH] Attempting to refresh access token");
  try {
    const response = await apiClient.post<{ access_token: string; token_type: string }>(
      "/users/auth/refresh", 
      refreshToken ? { refresh_token: refreshToken } : {},
      { requireAuth: false }
    );
    console.log("✅ [REFRESH] Token refreshed successfully");
    return response;
  } catch (error) {
    console.error("❌ [REFRESH] Token refresh failed:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post("/users/auth/logout", {}, { requireAuth: false });
  } catch (error) {
    console.warn("⚠️ [LOGOUT] Backend logout failed:", error);
  }
}


// Update display name
export async function updateDisplayName(displayName: string | null): Promise<User> {
  return apiClient.put<User>("/users/me/display-name", { display_name: displayName });
}

// Get current user
export async function getCurrentUser(): Promise<User> {
  console.log("🟡 [API] getCurrentUser called");
  
  try {
    const user = await apiClient.get<User>("/users/me");
    
    if (!user) {
      throw new Error("No user data received");
    }
    
    console.log("✅ [API] User fetched:", user.email);
    // Update stored user data
    localStorage.setItem("user_data", JSON.stringify(user));
    return user;
  } catch (error: any) {
    console.error("❌ [API] Failed to get user:", error);
    
    // Handle 401 - clear auth state
    const errorMsg = error?.message || "";
    if (errorMsg.includes("Unauthorized") || errorMsg.includes("401") || errorMsg.includes("Please log in again")) {
      console.log("❌ [API] 401 Unauthorized - clearing auth state");
      removeAuthToken();
      localStorage.removeItem("user_data");
    }
    
    throw error;
  }
}

// Save practice session
export async function savePracticeSession(session: PracticeSessionData): Promise<any> {
  console.log("🟡 [API] savePracticeSession called");
  console.log("🟡 [API] Session data:", {
    operation_type: session.operation_type,
    total_questions: session.total_questions,
    correct_answers: session.correct_answers,
    attempts_count: session.attempts.length
  });
  
  try {
    const data = await apiClient.post("/users/practice-session", session);
    console.log("✅ [API] Practice session saved successfully!");
    return data;
  } catch (error) {
    console.error("❌ [API] Save failed:", error);
    throw error;
  }
}

// Get student stats
export async function getStudentStats(): Promise<StudentStats> {
  console.log("🟡 [API] getStudentStats called");
  
  try {
    const data = await apiClient.get<StudentStats>("/users/stats");
    console.log("✅ [API] Stats loaded:", {
      total_points: data?.total_points,
      total_sessions: data?.total_sessions,
      recent_sessions: data?.recent_sessions?.length || 0
    });
    return data;
  } catch (error) {
    console.error("❌ [API] Stats failed:", error);
    throw error;
  }
}

// ─── Combined Dashboard API Functions ───────────────────────────────────────
// Single call replaces 5+ separate requests per dashboard load

/** Student: Get all dashboard data in one call */
export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  console.log("🟡 [API] getStudentDashboardData called (combined endpoint)");
  try {
    const data = await apiClient.get<StudentDashboardData>("/users/dashboard-data");
    console.log("✅ [API] Dashboard data loaded:", {
      total_points: data?.stats?.total_points,
      paper_attempts: data?.paper_attempts?.length || 0,
    });
    return data;
  } catch (error) {
    console.error("❌ [API] Dashboard data failed:", error);
    throw error;
  }
}

/** Admin: Get all dashboard data in one call */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  console.log("🟡 [API] getAdminDashboardData called (combined endpoint)");
  try {
    const data = await apiClient.get<AdminDashboardData>("/users/admin/dashboard-data", { timeout: 20000 });
    console.log("✅ [API] Admin dashboard data loaded:", {
      students: data?.students?.length || 0,
      total_sessions: data?.stats?.total_sessions,
    });
    return data;
  } catch (error) {
    console.error("❌ [API] Admin dashboard data failed:", error);
    throw error;
  }
}

// Admin: Get all students
export async function getAllStudents(): Promise<User[]> {
  return apiClient.get<User[]>("/users/admin/students");
}

// Admin: Get admin stats
export async function getAdminStats(): Promise<AdminStats> {
  return apiClient.get<AdminStats>("/users/admin/stats");
}

// Admin: Get student stats
export async function getStudentStatsAdmin(studentId: number): Promise<StudentStats> {
  return apiClient.get<StudentStats>(`/users/admin/students/${studentId}/stats`);
}

export async function getStudentEngagementAdmin(studentId: number): Promise<StudentEngagementResponse> {
  return apiClient.get<StudentEngagementResponse>(`/users/admin/students/${studentId}/engagement`);
}

export async function getAdminSiteInsights(): Promise<AdminSiteInsightsResponse> {
  return apiClient.get<AdminSiteInsightsResponse>("/users/admin/site-insights", { timeout: 20000 });
}

// Admin: Delete student
export async function deleteStudent(studentId: number): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/users/admin/students/${studentId}`);
}

// ─── Admin Student CRUD ────────────────────────────────────────────────────────

export interface AdminCreateStudentRequest {
  name: string;
  email?: string | null;
  display_name?: string | null;
  class_name?: string | null;
  course?: string | null;
  level_type?: string | null;
  level?: string | null;
  branch?: string | null;
  status?: string;
  join_date?: string | null;
  finish_date?: string | null;
  parent_contact_number?: string | null;
}

// All fields optional for updates — name/email especially optional
export interface AdminUpdateStudentRequest {
  name?: string | null;
  email?: string | null;
  display_name?: string | null;
  class_name?: string | null;
  course?: string | null;
  level_type?: string | null;
  level?: string | null;
  branch?: string | null;
  status?: string;
  join_date?: string | null;
  finish_date?: string | null;
  parent_contact_number?: string | null;
}

// Admin: Create student manually (no OAuth required)
export async function createStudentAdmin(data: AdminCreateStudentRequest): Promise<User> {
  return apiClient.post<User>("/users/admin/students", data);
}

// Admin: Update student basic info + profile in one call
export async function updateStudentAdmin(studentId: number, data: AdminUpdateStudentRequest): Promise<User> {
  return apiClient.put<User>(`/users/admin/students/${studentId}/info`, data);
}

// Admin: Update student points
export async function updateStudentPoints(studentId: number, points: number): Promise<{ message: string; old_points: number; new_points: number }> {
  return apiClient.put<{ message: string; old_points: number; new_points: number }>(`/users/admin/students/${studentId}/points`, { points });
}

// Admin: Get database stats
export interface DatabaseStats {
  total_users: number;
  total_students: number;
  total_admins: number;
  total_sessions: number;
  total_paper_attempts: number;
  total_rewards: number;
  total_papers: number;
  database_size_mb: number;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  console.log("🔄 [API] Fetching database stats...");
  return apiClient.get<DatabaseStats>("/users/admin/database/stats", { timeout: 20000 });
}

// Admin: Get detailed practice session (with attempts) for a specific student
export async function getStudentPracticeSessionDetailAdmin(
  studentId: number,
  sessionId: number
): Promise<PracticeSessionDetail> {
  return apiClient.get<PracticeSessionDetail>(`/users/admin/students/${studentId}/practice-session/${sessionId}`);
}

// Admin: Get detailed practice paper attempt for a specific student
export async function getStudentPaperAttemptDetailAdmin(
  studentId: number,
  attemptId: number
): Promise<PaperAttemptDetail> {
  return apiClient.get<PaperAttemptDetail>(`/users/admin/students/${studentId}/paper-attempt/${attemptId}`);
}

// Promote self to admin (if email is in ADMIN_EMAILS)
// Get practice session details with attempts
export async function getPracticeSessionDetail(sessionId: number): Promise<PracticeSessionDetail> {
  return apiClient.get<PracticeSessionDetail>(`/users/practice-session/${sessionId}`);
}

// Student Profile Types
export interface StudentProfile {
  id: number;
  user_id: number;
  public_id: string | null;
  internal_uuid: string;
  full_name: string | null;
  display_name: string | null;
  class_name: string | null;
  course: string | null;
  level_type: string | null;
  level: string | null;
  branch: string | null;
  status: string;
  join_date: string | null;
  finish_date: string | null;
  parent_contact_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileUpdate {
  full_name?: string | null;
  display_name?: string | null;
  class_name?: string | null;
  course?: string | null;
  level_type?: string | null;
  level?: string | null;
  branch?: string | null;
  status?: string;
  join_date?: string | null;
  finish_date?: string | null;
  parent_contact_number?: string | null;
}export interface ProfileAuditLog {
  id: number;
  profile_id: number;
  changed_by_user_id: number;
  changed_by_name: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_reason: string | null;
  created_at: string;
}

// Get current user's student profile
export async function getStudentProfile(): Promise<StudentProfile> {
  return apiClient.get<StudentProfile>("/users/profile");
}

// Get student profile by user ID
export async function getStudentProfileById(userId: number): Promise<StudentProfile> {
  return apiClient.get<StudentProfile>(`/users/profile/${userId}`);
}

// Update student profile (admin only)
export async function updateStudentProfile(profileData: StudentProfileUpdate): Promise<StudentProfile> {
  return apiClient.put<StudentProfile>("/users/profile", profileData);
}

// Update student profile by user ID (admin only)
export async function updateStudentProfileById(userId: number, profileData: StudentProfileUpdate): Promise<StudentProfile> {
  return apiClient.put<StudentProfile>(`/users/profile/${userId}`, profileData);
}

// Get profile audit logs (admin only)
export async function getProfileAuditLogs(userId: number): Promise<ProfileAuditLog[]> {
  return apiClient.get<ProfileAuditLog[]>(`/users/profile/${userId}/audit-logs`);
}

// Get valid levels for a course and level type
export async function getValidLevels(course: string, levelType: string): Promise<{ levels: string[] }> {
  return apiClient.get<{ levels: string[] }>(`/users/valid-levels?course=${encodeURIComponent(course)}&level_type=${encodeURIComponent(levelType)}`);
}

// Student ID Management Interfaces
export interface StudentIDInfo {
  user_id: number;
  current_public_id: string | null;
  student_name: string;
  email: string;
}

export interface UpdateStudentIDRequest {
  new_public_id: string;
}

export interface UpdateStudentIDResponse {
  success: boolean;
  message: string;
  old_public_id: string | null;
  new_public_id: string;
  student_name: string;
}

// Student ID Management Functions
export async function getStudentIDInfo(studentId: number): Promise<StudentIDInfo> {
  return apiClient.get(`/admin/students/${studentId}/id-info`);
}

export async function updateStudentPublicId(studentId: number, request: UpdateStudentIDRequest): Promise<UpdateStudentIDResponse> {
  return apiClient.put(`/users/admin/students/${studentId}/public-id`, request);
}

export async function generateNextStudentId(): Promise<{suggested_id: string}> {
  return apiClient.post("/users/admin/generate-student-id", {});
}

export interface BulkAssignResult {
  user_id: number;
  student_name: string;
  assigned_id: string;
  source: "vacant" | "fresh";
}

export interface BulkAssignResponse {
  assigned: number;
  results: BulkAssignResult[];
  message: string;
}

export async function bulkAssignStudentIds(): Promise<BulkAssignResponse> {
  return apiClient.post("/users/admin/bulk-assign-ids", {});
}

export interface VacantId {
  id: number;
  public_id: string;
  original_student_name: string | null;
  deleted_at: string | null;
}

export interface VacantIdsResponse {
  vacant_ids: VacantId[];
}

export async function getVacantIds(): Promise<VacantIdsResponse> {
  return apiClient.get("/users/admin/vacant-ids");
}

export async function deleteVacantId(vacantIdId: number): Promise<{ message: string }> {
  return apiClient.delete(`/users/admin/vacant-ids/${vacantIdId}`);
}

export async function getPointsLogs(limit: number = 100, offset: number = 0): Promise<PointsSummaryResponse> {
  return apiClient.get(`/users/points/logs?limit=${limit}&offset=${offset}`);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

// PointsLog entry returned by GET /users/points/logs
export interface PointsLogEntry {
  id: number;
  points: number;
  source_type: string;
  description: string;
  source_id: number | null;
  extra_data: Record<string, any> | null;  // DB column name is extra_data
  created_at: string;
}

export interface PointsSummaryResponse {
  total_points_from_logs: number;
  total_points_from_user: number;
  match: boolean;
  logs: PointsLogEntry[];
  total_entries: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  avatar_url: string | null;
  total_points: number;
  weekly_points: number;
  public_id: string | null;
  level: string | null;
  course: string | null;
  branch: string | null;
}

export async function getOverallLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  return apiClient.get<LeaderboardEntry[]>(`/users/leaderboard/overall?limit=${limit}`);
}

export async function getWeeklyLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  return apiClient.get<LeaderboardEntry[]>(`/users/leaderboard/weekly?limit=${limit}`);
}


// ─── Certificates ─────────────────────────────────────────────────────────────

export interface CertificateRecord {
  id: number;
  title: string;
  marks: number | null;
  date_issued: string; // ISO string (IST)
  description: string | null;
  created_at: string;
}

export interface CertificateCreate {
  title: string;
  marks: number | null;
  date_issued: string; // "YYYY-MM-DD"
  description: string | null;
}

export interface CertificateUpdate {
  title?: string | null;
  marks?: number | null;
  date_issued?: string | null;
  description?: string | null;
}

/** Student: fetch own certificates. */
export async function getMyCertificates(): Promise<CertificateRecord[]> {
  return apiClient.get<CertificateRecord[]>("/users/my-certificates");
}

/** Admin: fetch a specific student's certificates. */
export async function getStudentCertificatesAdmin(studentId: number): Promise<CertificateRecord[]> {
  return apiClient.get<CertificateRecord[]>(`/users/admin/students/${studentId}/certificates`);
}

/** Admin: issue a new certificate to a student. */
export async function createCertificateAdmin(
  studentId: number,
  data: CertificateCreate
): Promise<CertificateRecord> {
  return apiClient.post<CertificateRecord>(`/users/admin/students/${studentId}/certificates`, data);
}

/** Admin: update an existing certificate. */
export async function updateCertificateAdmin(
  studentId: number,
  certId: number,
  data: CertificateUpdate
): Promise<CertificateRecord> {
  return apiClient.put<CertificateRecord>(
    `/users/admin/students/${studentId}/certificates/${certId}`,
    data
  );
}

/** Admin: delete a certificate. */
export async function deleteCertificateAdmin(
  studentId: number,
  certId: number
): Promise<void> {
  return apiClient.delete<void>(`/users/admin/students/${studentId}/certificates/${certId}`);
}


// ── Point Rules API ──────────────────────────────────────────────────────────

export interface PointRule {
  id: number;
  tool: string;       // 'practice_paper' | 'mental_math' | 'burst_mode'
  operation: string;   // 'multiply', 'divide', 'add_sub', etc.
  mode: string;        // 'preset' | 'custom'
  preset_key: string | null;   // '2x1', '3d2', 'rows_6_9', 'all', etc.
  points_correct: number;      // Points per correct answer
  display_label: string;       // '2 × 1', '3–5 Rows', etc.
  tier: string;                // '+3', '+5', '+8', 'no_points'
  display_order: number;
}

export interface ResolvedPoints {
  points_per_correct: number;
  rule_id: number | null;
}

/** Fetch point rules (public, no auth needed). */
export async function getPointRules(
  tool?: string,
  operation?: string
): Promise<PointRule[]> {
  const params = new URLSearchParams();
  if (tool) params.set("tool", tool);
  if (operation) params.set("operation", operation);
  const qs = params.toString();
  return apiClient.get<PointRule[]>(`/api/point-rules${qs ? `?${qs}` : ""}`);
}

/** Resolve point value for a specific configuration (public, no auth needed). */
export async function resolvePoints(
  tool: string,
  operation: string,
  configMode: string = "preset",
  presetKey?: string,
  rowCount?: number
): Promise<ResolvedPoints> {
  const params = new URLSearchParams({ tool, operation, config_mode: configMode });
  if (presetKey) params.set("preset_key", presetKey);
  if (rowCount != null) params.set("row_count", String(rowCount));
  return apiClient.get<ResolvedPoints>(`/api/point-rules/resolve?${params}`);
}
