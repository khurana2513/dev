/**
 * AdminExams — full exam lifecycle management for administrators.
 *
 * Features:
 *  - Create exam (pick paper, set code, schedule, duration)
 *  - List all exams with status badges
 *  - Publish → Start → Grade → Release pipeline
 *  - Live cockpit (auto-refreshes every 5 s when exam is live)
 *  - Student sessions list
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  examAdminApi,
  ExamPaper,
  ExamPaperCreate,
  ExamSessionSummary,
  CockpitResponse,
  listSavedPapers,
  PaperSummary,
} from "../lib/examApi";
import { ClipboardList, Plus, Play, StopCircle, FileCheck, Share2, RefreshCw, ChevronDown, ChevronUp, X, Eye, Users } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
  return `${s}s`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-zinc-800 text-zinc-400",
    published: "bg-blue-900 text-blue-300",
    live: "bg-green-900 text-green-300 animate-pulse",
    ended: "bg-orange-900 text-orange-300",
    graded: "bg-purple-900 text-purple-300",
    results_released: "bg-emerald-900 text-emerald-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${map[status] ?? "bg-zinc-800 text-zinc-400"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Create Exam Modal ─────────────────────────────────────────────────────────

function CreateExamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [form, setForm] = useState<{
    title: string;
    paper_id: string;
    exam_code: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: string;
    is_open: boolean;
    shuffle: boolean;
    backNav: boolean;
  }>({
    title: "",
    paper_id: "",
    exam_code: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:00",
    durationMinutes: "60",
    is_open: true,
    shuffle: true,
    backNav: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSavedPapers()
      .then(setPapers)
      .catch(() => setPapers([]))
      .finally(() => setLoadingPapers(false));
  }, []);

  function toUTCIso(dateStr: string, timeStr: string): string {
    // Treat input as IST and convert to UTC
    const ist = new Date(`${dateStr}T${timeStr}:00+05:30`);
    return ist.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.paper_id) { setError("Select a paper"); return; }
    if (!form.exam_code.trim()) { setError("Enter an exam code"); return; }
    if (!form.durationMinutes || isNaN(Number(form.durationMinutes))) { setError("Enter duration in minutes"); return; }

    setSaving(true);
    try {
      const payload: ExamPaperCreate = {
        title: form.title || `Exam – ${form.exam_code.toUpperCase()}`,
        paper_id: parseInt(form.paper_id),
        exam_code: form.exam_code.trim().toUpperCase(),
        scheduled_start_at: toUTCIso(form.date, form.startTime),
        scheduled_end_at: toUTCIso(form.date, form.endTime),
        duration_seconds: parseInt(form.durationMinutes) * 60,
        shuffle_questions: form.shuffle,
        allow_back_navigation: form.backNav,
        is_open: form.is_open,
        auto_submit_on_expiry: true,
        late_join_cutoff_minutes: 5,
      };
      await examAdminApi.createExam(payload);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create exam";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500";
  const lbl = "block text-xs font-semibold text-zinc-400 mb-1";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Create New Exam</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-lg">{error}</div>}

          <div>
            <label className={lbl}>Exam Title</label>
            <input className={inp} placeholder="e.g. AB-3 Monthly Test" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div>
            <label className={lbl}>Source Paper *</label>
            {loadingPapers ? (
              <p className="text-zinc-500 text-sm">Loading papers…</p>
            ) : (
              <select className={inp} value={form.paper_id}
                onChange={e => setForm(f => ({ ...f, paper_id: e.target.value }))}>
                <option value="">— Select a saved paper —</option>
                {papers.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.title} ({p.level})</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Exam Code *</label>
              <input className={inp} placeholder="e.g. AB3-JAN" value={form.exam_code}
                onChange={e => setForm(f => ({ ...f, exam_code: e.target.value.toUpperCase() }))}
                maxLength={12} />
            </div>
            <div>
              <label className={lbl}>Duration (minutes) *</label>
              <input className={inp} type="number" min="5" max="180" value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={lbl}>Exam Date (IST)</label>
            <input className={inp} type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Start Time (IST)</label>
              <input className={inp} type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>End Time (IST)</label>
              <input className={inp} type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            {([
              ["shuffle", "Shuffle questions per student"],
              ["backNav", "Allow back navigation"],
              ["is_open", "Open to all (no org restriction)"],
            ] as [keyof typeof form, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="accent-indigo-500 w-4 h-4" />
                <span className="text-sm text-zinc-300">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? "Creating…" : "Create Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Exam Card ─────────────────────────────────────────────────────────────────

function ExamCard({ exam, refetch }: { exam: ExamPaper; refetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<ExamSessionSummary[] | null>(null);
  const [cockpit, setCockpit] = useState<CockpitResponse | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const cockpitInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const copyCode = () => navigator.clipboard.writeText(exam.exam_code).catch(() => {});

  async function action(fn: () => Promise<unknown>, label: string) {
    if (!window.confirm(`${label}?`)) return;
    setActionLoading(true);
    try { await fn(); refetch(); }
    catch (e) { alert(`Error: ${e instanceof Error ? e.message : "Unknown error"}`); }
    finally { setActionLoading(false); }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const data = await examAdminApi.getSessions(exam.exam_code);
      setSessions(data);
    } finally { setLoadingSessions(false); }
  }

  async function loadCockpit() {
    const data = await examAdminApi.getCockpit(exam.exam_code).catch(() => null);
    if (data) setCockpit(data);
  }

  useEffect(() => {
    if (expanded && exam.status === "live") {
      loadCockpit();
      cockpitInterval.current = setInterval(loadCockpit, 5000);
    }
    return () => { if (cockpitInterval.current) clearInterval(cockpitInterval.current); };
  }, [expanded, exam.status]);

  async function sendAnnounce() {
    if (!announceMsg.trim()) return;
    try {
      await examAdminApi.announce(exam.exam_code, announceMsg);
      setAnnounceMsg("");
      alert("Message sent to all connected students");
    } catch { alert("Failed to send"); }
  }

  const canPublish = exam.status === "draft";
  const canStart   = exam.status === "published";
  const canEnd     = exam.status === "live";
  const canGrade   = exam.status === "ended";
  const canRelease = exam.status === "graded";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3 min-w-0">
          <ClipboardList size={18} className="text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm">{exam.title}</span>
              <StatusBadge status={exam.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400 flex-wrap">
              <button onClick={e => { e.stopPropagation(); copyCode(); }}
                className="font-mono bg-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-700 text-zinc-300">
                {exam.exam_code}
              </button>
              <span>{formatDate(exam.scheduled_start_at)}</span>
              <span>{formatDuration(exam.duration_seconds)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <div className="text-xs text-zinc-400 text-right hidden sm:block">
            <div><span className="text-white">{exam.total_joined}</span> joined</div>
            <div><span className="text-green-400">{exam.total_submitted}</span> submitted</div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canPublish && (
              <button disabled={actionLoading}
                onClick={() => action(() => examAdminApi.publishExam(exam.exam_code), "Publish this exam so students can join the waiting room")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Share2 size={13} /> Publish
              </button>
            )}
            {canStart && (
              <button disabled={actionLoading}
                onClick={() => action(() => examAdminApi.startExam(exam.exam_code), "Start the exam NOW — all waiting students will be activated")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Play size={13} /> Start Exam
              </button>
            )}
            {canEnd && (
              <button disabled={actionLoading}
                onClick={() => action(() => examAdminApi.endExam(exam.exam_code), "End exam — all active sessions will be auto-submitted")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                <StopCircle size={13} /> End Exam
              </button>
            )}
            {canGrade && (
              <button disabled={actionLoading}
                onClick={() => action(() => examAdminApi.gradeExam(exam.exam_code), "Grade all submitted sessions")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                <FileCheck size={13} /> Grade
              </button>
            )}
            {canRelease && (
              <button disabled={actionLoading}
                onClick={() => action(
                  () => examAdminApi.releaseResults(exam.exam_code, window.confirm("Show correct answers to students?")),
                  "Release results to students"
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Eye size={13} /> Release Results
              </button>
            )}
            <button
              onClick={() => { loadSessions(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold rounded-lg transition-colors">
              <Users size={13} /> View Sessions
            </button>
          </div>

          {/* Live cockpit (only shown when live) */}
          {exam.status === "live" && cockpit && (
            <div className="bg-zinc-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ["Waiting", cockpit.total_waiting, "text-yellow-400"],
                ["Active", cockpit.total_active, "text-green-400"],
                ["Submitted", cockpit.total_submitted + cockpit.total_auto_submitted, "text-blue-400"],
                ["Time Left", cockpit.seconds_remaining != null ? `${Math.round(cockpit.seconds_remaining / 60)}m` : "—", "text-zinc-300"],
              ] as [string, string | number, string][]).map(([label, val, cls]) => (
                <div key={label} className="text-center">
                  <div className={`text-2xl font-bold ${cls}`}>{val}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
                </div>
              ))}
              {/* Announce */}
              <div className="col-span-2 sm:col-span-4 flex gap-2 mt-1">
                <input
                  value={announceMsg}
                  onChange={e => setAnnounceMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendAnnounce()}
                  placeholder="Announce to all students…"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
                <button onClick={sendAnnounce}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-colors">
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Sessions table */}
          {loadingSessions && <p className="text-zinc-400 text-sm">Loading sessions…</p>}
          {sessions && sessions.length === 0 && (
            <p className="text-zinc-500 text-sm">No students have joined yet.</p>
          )}
          {sessions && sessions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="pb-2 pr-3">Student</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Answers</th>
                    <th className="pb-2 pr-3">Score</th>
                    <th className="pb-2 pr-3">Rank</th>
                    <th className="pb-2">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-1.5 pr-3 text-white">{s.student_name}</td>
                      <td className="py-1.5 pr-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-1.5 pr-3 text-zinc-300">{s.answers_saved}</td>
                      <td className="py-1.5 pr-3 text-zinc-300">
                        {s.scored_marks != null ? `${s.scored_marks} (${s.percentage?.toFixed(0)}%)` : "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-zinc-300">{s.rank ?? "—"}</td>
                      <td className="py-1.5">
                        {s.flag_count > 0 ? (
                          <span className="text-orange-400 font-semibold">{s.flag_count}</span>
                        ) : <span className="text-zinc-500">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminExams() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: exams = [],
    isLoading,
    refetch,
  } = useQuery<ExamPaper[]>({
    queryKey: ["admin-exams"],
    queryFn: () => examAdminApi.listExams(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Group exams by status for visual organisation
  const liveExams = exams.filter(e => e.status === "live");
  const upcomingExams = exams.filter(e => ["draft", "published"].includes(e.status));
  const pastExams = exams.filter(e => ["ended", "graded", "results_released"].includes(e.status));

  return (
    <div className="min-h-screen" style={{ background: "#07070F" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList size={24} className="text-indigo-400" />
              Exam Management
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Create, schedule, and monitor live exams</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 text-zinc-400 hover:text-white transition-colors">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus size={16} /> New Exam
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-zinc-500">Loading exams…</div>
        )}

        {!isLoading && exams.length === 0 && (
          <div className="text-center py-16 border border-dashed border-zinc-700 rounded-2xl">
            <ClipboardList size={40} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No exams yet. Create your first exam to get started.</p>
          </div>
        )}

        {/* Live */}
        {liveExams.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">🟢 Live Now</h2>
            <div className="space-y-3">
              {liveExams.map(e => <ExamCard key={e.exam_code} exam={e} refetch={refetch} />)}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcomingExams.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcomingExams.map(e => <ExamCard key={e.exam_code} exam={e} refetch={refetch} />)}
            </div>
          </section>
        )}

        {/* Past */}
        {pastExams.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Past Exams</h2>
            <div className="space-y-3">
              {pastExams.map(e => <ExamCard key={e.exam_code} exam={e} refetch={refetch} />)}
            </div>
          </section>
        )}
      </div>

      {showCreate && (
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
            refetch();
          }}
        />
      )}
    </div>
  );
}
