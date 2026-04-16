import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  examAdminApi,
  ExamPaper,
  ExamPaperCreate,
  ExamPaperUpdate,
  ExamSessionSummary,
  CockpitResponse,
  PaperSummary,
  paperLibraryApi,
} from "../lib/examApi";
import { apiClient } from "../lib/apiClient";
import {
  ClipboardList, Plus,
  RefreshCw, ChevronDown, ChevronUp, X, Pencil,
  AlertTriangle, Clock, BookOpen, Trash2, Eye, Library,
} from "lucide-react";

// ── Timezone helpers ──────────────────────────────────────────────────────────

/** Append "Z" if the ISO string has no timezone info, so JS treats it as UTC */
function formatIST(iso: string | null): string {
  if (!iso) return "\u2014";
  const utc = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(utc).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Round up to next :00 with at least 15 min buffer, expressed in IST */
function getDefaultStart(): { date: string; time: string } {
  const advMs = Date.now() + 15 * 60 * 1000;
  const rounded = new Date(Math.ceil(advMs / 3_600_000) * 3_600_000);
  const sv = rounded.toLocaleString("sv", { timeZone: "Asia/Kolkata" });
  const [datePart, timePart] = sv.split(" ");
  return { date: datePart, time: timePart.slice(0, 5) };
}

/** Convert IST date + time string to UTC ISO */
function toUTCIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00+05:30`).toISOString();
}

/** Compute derived end time label in IST */
function computeEndIST(dateStr: string, timeStr: string, durationMin: number): string {
  if (!dateStr || !timeStr || !durationMin) return "\u2014";
  const startMs = new Date(`${dateStr}T${timeStr}:00+05:30`).getTime();
  const endMs = startMs + durationMin * 60_000;
  return new Date(endMs).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit", minute: "2-digit",
  });
}

/** True when the given IST date+time is in the past */
function isPast(dateStr: string, timeStr: string): boolean {
  if (!dateStr || !timeStr) return false;
  return new Date(`${dateStr}T${timeStr}:00+05:30`).getTime() < Date.now();
}

/** Fetch a server-guaranteed unique exam code (E + 5 chars). */
async function fetchUniqueExamCode(): Promise<string> {
  const data = await apiClient.get<{ exam_code: string }>("/exam/generate-code");
  return data.exam_code;
}

function fmtDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

// ── Status config ─────────────────────────────────────────────────────────────

type StatusKey = ExamPaper["status"];

const STATUS: Record<
  StatusKey,
  {
    label: string;
    dot: string;
    text: string;
    nextAction: string;
    nextColor: string;
    nextDesc: string;
    pulse?: boolean;
  }
> = {
  draft: {
    label: "Draft", dot: "bg-zinc-500", text: "text-zinc-400",
    nextAction: "Publish", nextColor: "bg-blue-700 hover:bg-blue-600",
    nextDesc: "Students will be able to see this exam and join a waiting room.",
  },
  published: {
    label: "Published", dot: "bg-blue-500", text: "text-blue-300",
    nextAction: "Start Exam", nextColor: "bg-green-700 hover:bg-green-600",
    nextDesc: "Starts the exam NOW — all waiting students will be activated immediately.",
  },
  live: {
    label: "Live", dot: "bg-green-400", text: "text-green-300",
    nextAction: "End Exam", nextColor: "bg-orange-700 hover:bg-orange-600",
    nextDesc: "Force-submits all active sessions and locks the exam.",
    pulse: true,
  },
  ended: {
    label: "Ended", dot: "bg-orange-400", text: "text-orange-300",
    nextAction: "Grade", nextColor: "bg-purple-700 hover:bg-purple-600",
    nextDesc: "Scores all submitted sessions automatically.",
  },
  graded: {
    label: "Graded", dot: "bg-purple-400", text: "text-purple-300",
    nextAction: "Release Results", nextColor: "bg-emerald-700 hover:bg-emerald-600",
    nextDesc: "Students can see their scores (and answers, if enabled).",
  },
  results_released: {
    label: "Released", dot: "bg-emerald-400", text: "text-emerald-300",
    nextAction: "", nextColor: "",
    nextDesc: "Results are visible to students. All done.",
  },
};

const PIPELINE: StatusKey[] = [
  "draft", "published", "live", "ended", "graded", "results_released",
];

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status as StatusKey] ?? STATUS.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.text} bg-zinc-800`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

// ── PipelineBar ───────────────────────────────────────────────────────────────

function PipelineBar({ current }: { current: StatusKey }) {
  const idx = PIPELINE.indexOf(current);
  return (
    <div className="flex items-center text-xs select-none overflow-x-auto pb-1">
      {PIPELINE.map((stage, i) => {
        const done = i < idx;
        const active = i === idx;
        const s = STATUS[stage];
        return (
          <div key={stage} className="flex items-center">
            <div
              className={`px-2 py-1 rounded whitespace-nowrap font-medium ${
                active ? `${s.text} font-bold` : done ? "text-zinc-600" : "text-zinc-800"
              }`}
            >
              {s.label}
            </div>
            {i < PIPELINE.length - 1 && (
              <div className={`w-4 h-px ${done || active ? "bg-zinc-700" : "bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared form types ─────────────────────────────────────────────────────────

interface ExamFormState {
  title: string;
  paper_id: string;
  exam_code: string;
  date: string;
  startTime: string;
  durationMinutes: string;
  is_open: boolean;
  shuffle: boolean;
  backNav: boolean;
}

function defaultForm(): ExamFormState {
  const { date, time } = getDefaultStart();
  return {
    title: "",
    paper_id: "",
    exam_code: "",
    date,
    startTime: time,
    durationMinutes: "10",
    is_open: true,
    shuffle: true,
    backNav: true,
  };
}

// ── Shared ExamFields component ───────────────────────────────────────────────

interface ExamFieldsProps {
  form: ExamFormState;
  setForm: React.Dispatch<React.SetStateAction<ExamFormState>>;
  papers: PaperSummary[];
  loadingPapers: boolean;
  hideCodeAndPaper?: boolean;
}

function ExamFields({ form, setForm, papers, loadingPapers, hideCodeAndPaper }: ExamFieldsProps) {
  const inp =
    "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500";
  const lbl = "block text-xs font-semibold text-zinc-400 mb-1";
  const dur = parseInt(form.durationMinutes) || 0;
  const past = isPast(form.date, form.startTime);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className={lbl}>Exam Title</label>
        <input
          className={inp}
          placeholder="e.g. AB-3 Monthly Test"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>

      {!hideCodeAndPaper && (
        <>
          {/* Paper */}
          <div>
            <label className={lbl}>Source Paper *</label>
            {loadingPapers ? (
              <p className="text-zinc-500 text-sm">Loading papers\u2026</p>
            ) : (
              <select
                className={inp}
                value={form.paper_id}
                onChange={(e) => setForm((f) => ({ ...f, paper_id: e.target.value }))}
              >
                <option value="">\u2014 Select a saved paper \u2014</option>
                {papers.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.title} ({p.level})
                  </option>
                ))}
              </select>
            )}
            {papers.length === 0 && !loadingPapers && (
              <p className="text-zinc-500 text-xs mt-1">
                No exam papers saved yet.{" "}
                <Link href="/create/basic" className="text-indigo-400 underline">
                  Create a paper
                </Link>
                , generate a preview, then click{" "}
                <span className="text-green-400 font-semibold">Save to Exam Library</span>.
              </p>
            )}
          </div>

          {/* Exam code */}
          <div>
            <label className={lbl}>Exam Code *</label>
            <div className="flex gap-2">
              <input
                className={inp}
                placeholder="Loading…"
                value={form.exam_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, exam_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) }))
                }
                maxLength={6}
              />
              <button
                type="button"
                title="Get a fresh unique code from the server"
                onClick={async () => {
                  try {
                    const code = await fetchUniqueExamCode();
                    setForm((f) => ({ ...f, exam_code: code }));
                  } catch {}
                }}
                className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-zinc-600 text-xs mt-1">
              6-character code (E prefix). Click ↺ to regenerate a unique server-issued code.
            </p>
          </div>
        </>
      )}

      {/* Date + start time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Date (IST)</label>
          <input
            className={inp}
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <label className={lbl}>Start Time (IST)</label>
          <input
            className={inp}
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          />
        </div>
      </div>

      {/* Past time warning */}
      {past && (
        <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/50 text-amber-400 text-xs rounded-lg px-3 py-2">
          <AlertTriangle size={13} />
          This start time is in the past. You can still save, but students cannot join a waiting room
          for a past schedule.
        </div>
      )}

      {/* Duration + derived end */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Duration (minutes) *</label>
          <input
            className={inp}
            type="number"
            min="5"
            max="300"
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
          />
        </div>
        <div>
          <label className={lbl}>End Time (auto-calculated)</label>
          <div className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-3 py-2 text-zinc-500 text-sm cursor-not-allowed select-none">
            {dur > 0 ? computeEndIST(form.date, form.startTime, dur) : "\u2014"}
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2 pt-1">
        {(
          [
            ["shuffle", "Shuffle questions per student"],
            ["backNav", "Allow back navigation"],
            ["is_open", "Open to all students (no org restriction)"],
          ] as [keyof ExamFormState, string][]
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
              className="accent-indigo-500 w-4 h-4"
            />
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ErrBanner({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-lg mb-4">
      {msg}
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [form, setForm] = useState<ExamFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Use exam-library papers only (those saved after preview with locked seed)
    paperLibraryApi.list()
      .then(setPapers)
      .catch(() => setPapers([]))
      .finally(() => setLoadingPapers(false));
    // Fetch a server-guaranteed unique code on mount
    fetchUniqueExamCode()
      .then((code) => setForm((f) => ({ ...f, exam_code: code })))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.paper_id) { setErr("Select a source paper"); return; }
    if (!form.exam_code.trim()) { setErr("Exam code is required"); return; }
    const dur = parseInt(form.durationMinutes);
    if (!dur || dur < 5) { setErr("Duration must be at least 5 minutes"); return; }

    setSaving(true);
    try {
      const startIso = toUTCIso(form.date, form.startTime);
      const endIso = new Date(new Date(startIso).getTime() + dur * 60_000).toISOString();
      const payload: ExamPaperCreate = {
        title: form.title || `Exam ${form.exam_code.toUpperCase()}`,
        paper_id: parseInt(form.paper_id),
        exam_code: form.exam_code.trim().toUpperCase(),
        scheduled_start_at: startIso,
        scheduled_end_at: endIso,
        duration_seconds: dur * 60,
        shuffle_questions: form.shuffle,
        allow_back_navigation: form.backNav,
        is_open: form.is_open,
        auto_submit_on_expiry: true,
        late_join_cutoff_minutes: 5,
      };
      await examAdminApi.createExam(payload);
      onCreated();
      onClose();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed to create exam");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create New Exam" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ErrBanner msg={err} />
        <ExamFields
          form={form}
          setForm={setForm}
          papers={papers}
          loadingPapers={loadingPapers}
        />
        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating\u2026" : "Create Exam"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: ExamPaper;
  onClose: () => void;
  onSaved: () => void;
}) {
  function examToForm(e: ExamPaper): ExamFormState {
    const iso = e.scheduled_start_at;
    const utc = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
    const sv = new Date(utc).toLocaleString("sv", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = sv.split(" ");
    return {
      title: e.title,
      paper_id: String(e.paper_id),
      exam_code: e.exam_code,
      date: datePart,
      startTime: timePart.slice(0, 5),
      durationMinutes: String(Math.round(e.duration_seconds / 60)),
      is_open: e.is_open,
      shuffle: e.shuffle_questions,
      backNav: e.allow_back_navigation,
    };
  }

  const [form, setForm] = useState<ExamFormState>(() => examToForm(exam));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const dur = parseInt(form.durationMinutes);
    if (!dur || dur < 5) { setErr("Duration must be at least 5 minutes"); return; }

    setSaving(true);
    try {
      const startIso = toUTCIso(form.date, form.startTime);
      const endIso = new Date(new Date(startIso).getTime() + dur * 60_000).toISOString();
      const patch: ExamPaperUpdate = {
        title: form.title || undefined,
        scheduled_start_at: startIso,
        scheduled_end_at: endIso,
        duration_seconds: dur * 60,
        is_open: form.is_open,
      };
      await examAdminApi.updateExam(exam.exam_code, patch);
      onSaved();
      onClose();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit: ${exam.exam_code}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ErrBanner msg={err} />
        <ExamFields
          form={form}
          setForm={setForm}
          papers={[]}
          loadingPapers={false}
          hideCodeAndPaper
        />
        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving\u2026" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── ExamCard ──────────────────────────────────────────────────────────────────

function ExamCard({ exam, refetch }: { exam: ExamPaper; refetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sessions, setSessions] = useState<ExamSessionSummary[] | null>(null);
  const [cockpit, setCockpit] = useState<CockpitResponse | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const s = STATUS[exam.status];
  const isLive = exam.status === "live";
  const canEdit = exam.status === "draft" || exam.status === "published";
  const studentUrl = `${window.location.origin}/exam/${exam.exam_code}`;

  async function doNextAction() {
    const waitingCount = cockpit?.total_waiting ?? 0;
    const confirmMap: Record<string, string> = {
      draft: `Publish "${exam.title}"?\n\nStudents will be able to see this exam and join a waiting room.`,
      published: `Start the exam NOW?\n\nAll waiting students will be activated immediately.${
        waitingCount === 0 ? "\n\n\u26a0\ufe0f No students are in the waiting room yet." : `\n\n${waitingCount} student(s) waiting.`
      }`,
      live: `End the exam now?\n\nAll active sessions will be force-submitted. This cannot be undone.`,
      ended: `Grade all submissions for "${exam.title}"?`,
      graded: `Release results to students?\n\nThey will be able to see their scores.`,
    };
    const msg = confirmMap[exam.status];
    if (msg && !window.confirm(msg)) return;

    setActionLoading(true);
    try {
      if (exam.status === "draft") await examAdminApi.publishExam(exam.exam_code);
      else if (exam.status === "published") await examAdminApi.startExam(exam.exam_code);
      else if (exam.status === "live") await examAdminApi.endExam(exam.exam_code);
      else if (exam.status === "ended") await examAdminApi.gradeExam(exam.exam_code);
      else if (exam.status === "graded") {
        const showAnswers = window.confirm(
          "Show correct answers to students alongside their results?"
        );
        await examAdminApi.releaseResults(exam.exam_code, showAnswers);
      }
      refetch();
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function loadCockpit() {
    const data = await examAdminApi.getCockpit(exam.exam_code).catch(() => null);
    if (data) setCockpit(data);
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      setSessions(await examAdminApi.getSessions(exam.exam_code));
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    if (!expanded) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    // Always load sessions when expanded
    loadSessions();

    if (isLive) {
      // Live: poll cockpit + sessions every 5 s for real-time stats
      loadCockpit();
      pollRef.current = setInterval(() => {
        loadCockpit();
        loadSessions();
      }, 5_000);
    } else if (exam.status === "published") {
      // Published: students are in the waiting room — poll sessions every 5 s
      // so admin can see who has joined without refreshing the page
      pollRef.current = setInterval(loadSessions, 5_000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, isLive, exam.status]);

  async function sendAnnounce() {
    if (!announceMsg.trim()) return;
    try {
      await examAdminApi.announce(exam.exam_code, announceMsg);
      setAnnounceMsg("");
    } catch {
      alert("Failed to send announcement");
    }
  }

  return (
    <>
      {editing && canEdit && (
        <EditModal
          exam={exam}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refetch();
          }}
        />
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Card header */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/40 transition-colors"
          onClick={() => {
            setExpanded((v) => !v);
          }}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${s.dot} ${s.pulse ? "animate-pulse" : ""}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm">{exam.title}</span>
              <StatusBadge status={exam.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 flex-wrap">
              <span className="font-mono text-zinc-400">{exam.exam_code}</span>
              <span>
                <Clock size={10} className="inline mr-0.5" />
                {formatIST(exam.scheduled_start_at)}
              </span>
              <span>{fmtDur(exam.duration_seconds)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-xs text-right hidden sm:block">
              <div>
                <span className="text-white font-medium">{exam.total_joined}</span>
                <span className="text-zinc-600"> joined</span>
              </div>
              <div>
                <span className="text-green-400 font-medium">{exam.total_submitted}</span>
                <span className="text-zinc-600"> submitted</span>
              </div>
            </div>
            {expanded ? (
              <ChevronUp size={14} className="text-zinc-600" />
            ) : (
              <ChevronDown size={14} className="text-zinc-600" />
            )}
          </div>
        </div>

        {/* Expanded cockpit */}
        {expanded && (
          <div className="border-t border-zinc-800 p-4 space-y-4">
            {/* Lifecycle pipeline */}
            <PipelineBar current={exam.status} />

            {/* Student access */}
            <div className="bg-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-zinc-500 text-xs shrink-0">Student link:</span>
              <code className="text-indigo-300 text-xs flex-1 truncate">{studentUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(studentUrl).catch(() => {})}
                className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors shrink-0"
              >
                Copy
              </button>
            </div>

            {/* Primary action */}
            {s.nextAction && (
              <div className="flex items-start gap-3">
                <button
                  disabled={actionLoading}
                  onClick={doNextAction}
                  className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shrink-0 ${s.nextColor}`}
                >
                  {s.nextAction}
                </button>
                <p className="text-zinc-500 text-xs pt-1.5">{s.nextDesc}</p>
              </div>
            )}

            {/* Edit button */}
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-lg transition-colors"
              >
                <Pencil size={12} /> Edit Exam Details
              </button>
            )}

            {/* Live cockpit stats */}
            {isLive && cockpit && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    ["Waiting", cockpit.total_waiting, "text-yellow-400"],
                    ["Active", cockpit.total_active, "text-green-400"],
                    [
                      "Submitted",
                      (cockpit.total_submitted ?? 0) + (cockpit.total_auto_submitted ?? 0),
                      "text-blue-400",
                    ],
                    [
                      "Time Left",
                      cockpit.seconds_remaining != null
                        ? `${Math.ceil(cockpit.seconds_remaining / 60)}m`
                        : "\u2014",
                      "text-zinc-300",
                    ],
                  ] as [string, string | number, string][]
                ).map(([label, val, cls]) => (
                  <div key={label} className="bg-zinc-800 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold tabular-nums ${cls}`}>{val}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Announce (live only) */}
            {isLive && (
              <div className="flex gap-2">
                <input
                  value={announceMsg}
                  onChange={(e) => setAnnounceMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAnnounce()}
                  placeholder="Broadcast a message to all active students\u2026"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={sendAnnounce}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
            )}

            {/* Sessions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Sessions ({exam.total_joined})
                </span>
                <button
                  onClick={loadSessions}
                  className="text-xs text-zinc-600 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={10} /> Refresh
                </button>
              </div>
              {loadingSessions && (
                <p className="text-zinc-600 text-sm">Loading\u2026</p>
              )}
              {sessions && sessions.length === 0 && (
                <p className="text-zinc-700 text-sm italic">No students have joined yet.</p>
              )}
              {sessions && sessions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-zinc-600 border-b border-zinc-800">
                        {["Student", "Status", "Ans", "Score", "Rank", "Flags"].map((h) => (
                          <th key={h} className="text-left pb-1.5 pr-3 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((ss) => (
                        <tr
                          key={ss.id}
                          className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-1.5 pr-3 text-white font-medium">
                            {ss.student_name}
                          </td>
                          <td className="py-1.5 pr-3">
                            <StatusBadge status={ss.status} />
                          </td>
                          <td className="py-1.5 pr-3 text-zinc-400">{ss.answers_saved}</td>
                          <td className="py-1.5 pr-3 text-zinc-400">
                            {ss.scored_marks != null
                              ? `${ss.scored_marks} (${ss.percentage?.toFixed(0)}%)`
                              : "\u2014"}
                          </td>
                          <td className="py-1.5 pr-3 text-zinc-400">{ss.rank ?? "\u2014"}</td>
                          <td className="py-1.5">
                            {ss.flag_count > 0 ? (
                              <span className="text-orange-400 font-semibold">
                                {ss.flag_count}
                              </span>
                            ) : (
                              <span className="text-zinc-700">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminExams() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"exams" | "library">("exams");

  const {
    data: exams = [],
    isLoading,
    refetch,
  } = useQuery<ExamPaper[]>({
    queryKey: ["admin-exams"],
    queryFn: () => examAdminApi.listExams(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const arr = q.state.data as ExamPaper[] | undefined;
      return arr?.some((e) => e.status === "live" || e.status === "published") ? 10_000 : false;
    },
  });

  const {
    data: libraryPapers = [],
    isLoading: libraryLoading,
    refetch: refetchLibrary,
  } = useQuery<PaperSummary[]>({
    queryKey: ["exam-paper-library"],
    queryFn: () => paperLibraryApi.list(),
    staleTime: 60_000,
    enabled: activeTab === "library",
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      paperLibraryApi.rename(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-paper-library"] }),
  });

  const deletePaperMutation = useMutation({
    mutationFn: (id: number) => paperLibraryApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-paper-library"] }),
    onError: (e: unknown) => alert(e instanceof Error ? e.message : "Delete failed"),
  });

  const live     = exams.filter((e) => e.status === "live");
  const upcoming = exams.filter((e) => e.status === "draft" || e.status === "published");
  const past     = exams.filter(
    (e) => !["draft", "published", "live"].includes(e.status)
  );

  function onCreated() {
    qc.invalidateQueries({ queryKey: ["admin-exams"] });
    refetch();
  }

  return (
    <div className="min-h-screen" style={{ background: "#07070F" }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList size={20} className="text-indigo-400" />
              Exam Management
            </h1>
            <p className="text-zinc-600 text-xs mt-0.5">
              Create, schedule, monitor exams and manage your paper library
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "exams" && (
              <>
                <button
                  onClick={() => refetch()}
                  title="Refresh"
                  className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Plus size={14} /> New Exam
                </button>
              </>
            )}
            {activeTab === "library" && (
              <button
                onClick={() => refetchLibrary()}
                title="Refresh library"
                className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("exams")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "exams"
                ? "bg-indigo-600 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ClipboardList size={14} /> Exams
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "library"
                ? "bg-emerald-600 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Library size={14} /> Paper Library
          </button>
        </div>

        {/* ── EXAMS TAB ── */}
        {activeTab === "exams" && (
          <>
            {isLoading && (
              <p className="text-center text-zinc-600 py-12">Loading exams…</p>
            )}

            {!isLoading && exams.length === 0 && (
              <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
                <ClipboardList size={36} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-600 text-sm">No exams yet.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm underline"
                >
                  Create your first exam
                </button>
              </div>
            )}

            {/* Live */}
            {live.length > 0 && (
              <section className="mb-6">
                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">
                  ● Live Now
                </p>
                <div className="space-y-3">
                  {live.map((e) => (
                    <ExamCard key={e.exam_code} exam={e} refetch={refetch} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section className="mb-6">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  Upcoming
                </p>
                <div className="space-y-3">
                  {upcoming.map((e) => (
                    <ExamCard key={e.exam_code} exam={e} refetch={refetch} />
                  ))}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section className="mb-6">
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-3">Past</p>
                <div className="space-y-3">
                  {past.map((e) => (
                    <ExamCard key={e.exam_code} exam={e} refetch={refetch} />
                  ))}
                </div>
              </section>
            )}

            {/* FAQ */}
            {!isLoading && (
              <details className="mt-8 border border-zinc-800 rounded-xl text-xs text-zinc-600">
                <summary className="px-4 py-3 cursor-pointer hover:text-zinc-400 font-medium transition-colors">
                  How does the exam flow work? (edge cases & FAQ)
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-3">
                  {(
                    [
                      [
                        "What is the student flow?",
                        "Students go to /exam/CODE, enter the code, and land in a waiting room. When you press Start, all waiting screens activate simultaneously with the exam timer.",
                      ],
                      [
                        "What if no one joins?",
                        "The exam can be started and ended normally. Sessions will simply be empty. You'll see 0 in the cockpit counters.",
                      ],
                      [
                        "What if I publish or start late?",
                        "No problem. Students join the waiting room whenever it is published. The exam timer only starts when you press Start — duration is always measured from the moment you start.",
                      ],
                      [
                        "Can I create an exam in the past?",
                        "Yes, but students can't join a waiting room for a past-scheduled time. If you need an immediate exam, set today's time and publish + start right away.",
                      ],
                      [
                        "Why was the time showing 3:30 AM instead of 9:00 AM?",
                        "This was a timezone bug: the backend stored UTC times without a 'Z' suffix, and the browser was treating them as local IST time. Now fixed — all times are appended with 'Z' before parsing, so they display correctly in IST.",
                      ],
                      [
                        "Can I edit the exam after creating it?",
                        "Yes — while in Draft or Published state, click 'Edit Exam Details' inside the card. You can change the title, date, time, duration, and open setting. The exam code and source paper cannot be changed.",
                      ],
                      [
                        "What if a student loses connection mid-exam?",
                        "Answers are saved to localStorage every keystroke and synced to the server every 1.5 s. On reconnect, the full session is restored. The SSE stream reconnects automatically.",
                      ],
                      [
                        "What happens if time runs out?",
                        "The exam auto-submits all active sessions when the timer expires (grace window: 10 s). You can also manually end the exam at any time with the End Exam button.",
                      ],
                    ] as [string, string][]
                  ).map(([q, a]) => (
                    <div key={q}>
                      <p className="text-zinc-400 font-semibold">{q}</p>
                      <p className="text-zinc-600 mt-0.5">{a}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {/* ── PAPER LIBRARY TAB ── */}
        {activeTab === "library" && (
          <PaperLibraryTab
            papers={libraryPapers}
            isLoading={libraryLoading}
            onRename={(id, title) => renameMutation.mutate({ id, title })}
            onDelete={(id) => {
              if (confirm("Delete this paper? This cannot be undone if it has no linked exams.")) {
                deletePaperMutation.mutate(id);
              }
            }}
          />
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={onCreated} />
      )}
    </div>
  );
}

/* ─── Paper Library Tab ─── */
interface PaperLibraryTabProps {
  papers: PaperSummary[];
  isLoading: boolean;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

function PaperLibraryTab({ papers, isLoading, onRename, onDelete }: PaperLibraryTabProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [previewPaper, setPreviewPaper] = useState<PaperSummary | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<unknown[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function openPreview(paper: PaperSummary) {
    setPreviewPaper(paper);
    setPreviewQuestions(null);
    setPreviewLoading(true);
    try {
      const data = await paperLibraryApi.previewQuestions(paper.id);
      setPreviewQuestions(data.questions ?? data);
    } catch {
      setPreviewQuestions([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  function startEdit(paper: PaperSummary) {
    setEditingId(paper.id);
    setEditTitle(paper.title);
  }

  function commitEdit(id: number) {
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  }

  if (isLoading) {
    return <p className="text-center text-zinc-600 py-12">Loading paper library…</p>;
  }

  if (papers.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
        <BookOpen size={36} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm font-medium">No papers in the library yet.</p>
        <p className="text-zinc-700 text-xs mt-1 max-w-xs mx-auto">
          Go to <span className="text-indigo-400">Practice → Create Paper</span>, generate a preview,
          then click <span className="text-emerald-400">Save to Exam Library</span>. The paper will
          appear here with its questions locked.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              {editingId === paper.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => commitEdit(paper.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(paper.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none border border-indigo-500"
                />
              ) : (
                <p className="text-white text-sm font-semibold truncate">{paper.title}</p>
              )}
              <p className="text-zinc-600 text-xs mt-0.5">
                Level {paper.level} · {paper.num_questions} questions ·{" "}
                <span className="text-emerald-600">Locked</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openPreview(paper)}
                title="Preview questions"
                className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => startEdit(paper)}
                title="Rename paper"
                className="p-2 text-zinc-500 hover:text-yellow-400 transition-colors"
              >
                <BookOpen size={14} />
              </button>
              <button
                onClick={() => onDelete(paper.id)}
                title="Delete paper"
                className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-white font-semibold text-sm">{previewPaper.title}</p>
                <p className="text-zinc-600 text-xs">Level {previewPaper.level} · {previewPaper.num_questions} questions</p>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {previewLoading && (
                <p className="text-zinc-600 text-sm text-center py-8">Loading questions…</p>
              )}
              {!previewLoading && previewQuestions && previewQuestions.length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-8">
                  Could not load questions for this paper.
                </p>
              )}
              {!previewLoading && previewQuestions && previewQuestions.length > 0 && (
                <ol className="space-y-3">
                  {(previewQuestions as Array<{ question?: string; a?: string; b?: string; answer?: string | number }>).map((q, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-zinc-300 font-medium">
                        {i + 1}. {q.question ?? `${q.a} ★ ${q.b}`}
                      </p>
                      <p className="text-emerald-500 text-xs mt-0.5">
                        Answer: {String(q.answer ?? "—")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
