import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Plus, Search, Shirt,
  Filter, Trash2, Check, Loader2, AlertCircle, Users,
  BarChart3, X, BookOpen, MapPin, RefreshCw
} from "lucide-react";
import {
  getSessions, createSession, deleteSession, getAttendanceSheet, markAttendance,
  AttendanceSheet, ClassSession, StudentEntry,
  AttendanceStatus, SessionCreatePayload, STATUS_LABELS, STATUS_COLORS,
  BRANCHES, COURSES, formatSessionDate as _formatSessionDate, getInitials, avatarColor
} from "../lib/attendanceApi";
import { useAuth } from "../contexts/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function weekAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Save-state indicator for each student row
// ─────────────────────────────────────────────────────────────────────────────
type SaveState = "idle" | "saving" | "saved" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Create Session Modal
// ─────────────────────────────────────────────────────────────────────────────
interface CreateSessionModalProps {
  onClose: () => void;
  onCreate: (data: SessionCreatePayload) => Promise<void>;
  saving: boolean;
  defaultBranch?: string;
  defaultCourse?: string;
}

function CreateSessionModal({ onClose, onCreate, saving, defaultBranch, defaultCourse }: CreateSessionModalProps) {
  const [date, setDate] = useState(todayISO());
  const [branch, setBranch] = useState(defaultBranch || "Rohini-16");
  const [course, setCourse] = useState(defaultCourse || "");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!date || !branch) { setError("Date and Branch are required."); return; }
    try {
      await onCreate({
        // Send midnight IST explicitly so the backend stores the correct calendar
        // date regardless of server timezone. Avoids the UTC-shift bug where
        // new Date("YYYY-MM-DDT00:00:00").toISOString() gives the previous day UTC.
        session_date: date + "T00:00:00+05:30",
        branch,
        course: course || undefined,
        level:  level  || undefined,
        topic:  topic  || undefined,
        teacher_remarks: remarks || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create session.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Class Session</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Branch <span className="text-rose-500">*</span>
            </label>
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            >
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Course</label>
            <select
              value={course}
              onChange={e => setCourse(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            >
              <option value="">All Courses</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Level</label>
            <input
              type="text"
              value={level}
              onChange={e => setLevel(e.target.value)}
              placeholder="e.g. Level 3, Junior…"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Optional lesson topic"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Teacher Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              placeholder="Any notes for this session"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Dialog
// ─────────────────────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}
function ConfirmDialog({ message, onConfirm, onCancel, danger }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Toggle Pills
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_PILL_CONFIG: { status: AttendanceStatus; label: string; active: string; inactive: string }[] = [
  { status: "present",  label: "P",  active: "bg-emerald-600 text-white",             inactive: "bg-transparent text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600" },
  { status: "absent",   label: "A",  active: "bg-rose-600 text-white",                inactive: "bg-transparent text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600" },
  { status: "on_break", label: "OB", active: "bg-amber-500 text-white",               inactive: "bg-transparent text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600" },
  { status: "leave",    label: "L",  active: "bg-blue-600 text-white",                inactive: "bg-transparent text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600" },
];

interface StatusToggleProps {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
}

function StatusToggle({ value, onChange, disabled }: StatusToggleProps) {
  return (
    <div role="group" aria-label="Attendance status" className="flex gap-1">
      {STATUS_PILL_CONFIG.map(cfg => (
        <button
          key={cfg.status}
          type="button"
          disabled={disabled}
          onClick={() => onChange(cfg.status)}
          aria-label={STATUS_LABELS[cfg.status]}
          className={`h-7 min-w-[32px] px-2 rounded-md text-xs font-semibold transition-all duration-150 ${value === cfg.status ? cfg.active + " shadow-sm scale-105" : cfg.inactive} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {cfg.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-Shirt Toggle
// ─────────────────────────────────────────────────────────────────────────────
interface TShirtToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}
function TShirtToggle({ value, onChange, disabled }: TShirtToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      aria-label={disabled ? "Not applicable" : value ? "T-shirt worn" : "T-shirt not worn"}
      title={disabled ? "Only trackable when Present" : value ? "T-Shirt Worn ✓" : "T-Shirt Not Worn"}
      className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150
        ${disabled ? "opacity-25 cursor-not-allowed bg-slate-100 dark:bg-slate-800" :
          value ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400 hover:text-indigo-500"
        }`}
    >
      <Shirt className="w-3.5 h-3.5" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Student Row
// ─────────────────────────────────────────────────────────────────────────────
interface StudentRowProps {
  student: StudentEntry;
  localStatus: AttendanceStatus | null;
  localTshirt: boolean;
  saveState: SaveState;
  onStatusChange: (s: AttendanceStatus) => void;
  onTshirtChange: (v: boolean) => void;
  readOnly: boolean;
}

function StudentRow({ student, localStatus, localTshirt, saveState, onStatusChange, onTshirtChange, readOnly }: StudentRowProps) {
  const rowBg = localStatus ? STATUS_COLORS[localStatus].row : "";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${rowBg}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${avatarColor(student.name)}`}
        aria-hidden="true">
        {getInitials(student.name)}
      </div>

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate leading-tight">{student.name}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono leading-tight">
          {student.public_id || `#${student.student_profile_id}`}
          {student.class_name ? <span className="ml-1.5 not-italic font-sans">· {student.class_name}</span> : null}
        </p>
      </div>

      {/* Status toggle */}
      <div className="flex-shrink-0">
        <StatusToggle value={localStatus} onChange={onStatusChange} disabled={readOnly} />
      </div>

      {/* T-shirt toggle */}
      <div className="flex-shrink-0">
        <TShirtToggle
          value={localTshirt}
          onChange={onTshirtChange}
          disabled={readOnly || localStatus !== "present"}
        />
      </div>

      {/* Save state indicator */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        {saveState === "saving" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        {saveState === "saved"  && <Check    className="w-4 h-4 text-emerald-500" />}
        {saveState === "error"  && <AlertCircle className="w-4 h-4 text-rose-500" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Sheet Panel
// ─────────────────────────────────────────────────────────────────────────────
interface SheetPanelProps {
  session: ClassSession;
}

function SheetPanel({ session }: SheetPanelProps) {
  const qc = useQueryClient();
  const sheetKey = ["attendance-sheet", session.id];

  const { data: sheet, isLoading, isError, refetch } = useQuery<AttendanceSheet>({
    queryKey: sheetKey,
    queryFn:  () => getAttendanceSheet(session.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Local state mirrors DB values — updated optimistically
  const [localData, setLocalData] = useState<
    Record<number, { status: AttendanceStatus | null; t_shirt_worn: boolean; record_id: number | null }>
  >({});
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"id" | "name" | "unmarked">("id");
  const [confirmMarkAll, setConfirmMarkAll] = useState<AttendanceStatus | "clear" | null>(null);

  // Debounce refs: one per student profile ID
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Sync local state when sheet data arrives/changes
  useEffect(() => {
    if (!sheet) return;
    const next: typeof localData = {};
    sheet.students.forEach(s => {
      next[s.student_profile_id] = {
        status:       s.status,
        t_shirt_worn: s.t_shirt_worn,
        record_id:    s.attendance_record_id,
      };
    });
    setLocalData(next);
    setSaveStates({});
  }, [sheet]);

  const setSave = useCallback((id: number, state: SaveState) => {
    setSaveStates(prev => ({ ...prev, [id]: state }));
  }, []);

  const persistChange = useCallback((
    studentProfileId: number,
    status: AttendanceStatus,
    tShirt: boolean
  ) => {
    setSave(studentProfileId, "saving");

    apiSave(session.id, studentProfileId, status, tShirt)
      .then(record => {
        setLocalData(prev => ({
          ...prev,
          [studentProfileId]: { status, t_shirt_worn: tShirt, record_id: record.id },
        }));
        setSave(studentProfileId, "saved");
        qc.invalidateQueries({ queryKey: sheetKey });
        setTimeout(() => setSave(studentProfileId, "idle"), 1500);
      })
      .catch(() => {
        setSave(studentProfileId, "error");
        setTimeout(() => setSave(studentProfileId, "idle"), 3000);
      });
  }, [session.id, qc, sheetKey, setSave]);

  const handleStatusChange = useCallback((studentProfileId: number, status: AttendanceStatus) => {
    const current = localData[studentProfileId];
    const tShirt = status !== "present" ? false : (current?.t_shirt_worn ?? false);

    // Optimistic update
    setLocalData(prev => ({
      ...prev,
      [studentProfileId]: { ...prev[studentProfileId], status, t_shirt_worn: tShirt },
    }));
    setSave(studentProfileId, "saving");

    // Debounce the API call
    if (debounceRefs.current[studentProfileId]) clearTimeout(debounceRefs.current[studentProfileId]);
    debounceRefs.current[studentProfileId] = setTimeout(() => {
      persistChange(studentProfileId, status, tShirt);
    }, 300);
  }, [localData, persistChange, setSave]);

  const handleTshirtChange = useCallback((studentProfileId: number, value: boolean) => {
    const current = localData[studentProfileId];
    if (current?.status !== "present") return;

    setLocalData(prev => ({
      ...prev,
      [studentProfileId]: { ...prev[studentProfileId], t_shirt_worn: value },
    }));
    setSave(studentProfileId, "saving");

    if (debounceRefs.current[studentProfileId]) clearTimeout(debounceRefs.current[studentProfileId]);
    debounceRefs.current[studentProfileId] = setTimeout(() => {
      persistChange(studentProfileId, "present", value);
    }, 300);
  }, [localData, persistChange, setSave]);

  const handleMarkAll = (status: AttendanceStatus | "clear") => {
    if (!sheet) return;
    sheet.students.forEach(s => {
      if (status === "clear") {
        // just reset local state visually; don't call API for unmark in bulk
        setLocalData(prev => ({
          ...prev,
          [s.student_profile_id]: { ...prev[s.student_profile_id], status: null, t_shirt_worn: false },
        }));
      } else {
        handleStatusChange(s.student_profile_id, status);
      }
    });
    setConfirmMarkAll(null);
  };

  // Derived filtered + sorted students
  const students = sheet?.students ?? [];
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.public_id || "").toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const la = localData[a.student_profile_id];
    const lb = localData[b.student_profile_id];
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "unmarked") {
      const ua = la?.status == null ? 0 : 1;
      const ub = lb?.status == null ? 0 : 1;
      if (ua !== ub) return ua - ub;
    }
    // Default: sort by public_id numerically
    const numA = a.public_id ? parseInt(a.public_id.split("-")[1] || "0") : 9999;
    const numB = b.public_id ? parseInt(b.public_id.split("-")[1] || "0") : 9999;
    return numA - numB;
  });

  // Realtime summary from localData
  let pCount = 0, aCount = 0, obCount = 0, lCount = 0, uCount = 0, tCount = 0;
  (sheet?.students ?? []).forEach(s => {
    const ld = localData[s.student_profile_id];
    const st = ld?.status;
    if (!st) { uCount++; return; }
    if (st === "present") { pCount++; if (ld?.t_shirt_worn) tCount++; }
    else if (st === "absent")   aCount++;
    else if (st === "on_break") obCount++;
    else if (st === "leave")    lCount++;
  });

  if (isLoading) return (
    <div className="flex-1 flex flex-col">
      {/* skeleton header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
        <div className="h-3.5 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5" />
              <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="flex gap-1">
              {[0,1,2,3].map(j => <div key={j} className="h-7 w-8 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isError) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-500 dark:text-slate-400 p-8">
      <AlertCircle className="w-10 h-10 text-rose-400" />
      <p className="text-sm font-medium">Failed to load attendance sheet</p>
      <button onClick={() => refetch()} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );

  if (!sheet || sheet.students.length === 0) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 p-8">
      <Users className="w-10 h-10" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No active students found for this session's branch
        {session.course ? ` / ${session.course}` : ""}
      </p>
      <p className="text-xs text-slate-400">Students must be active and assigned to <strong>{session.branch}</strong></p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sheet header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {session.topic || formatDay(session.session_date)}
              {session.course && <span className="ml-2 text-xs font-normal text-slate-400">· {session.course}</span>}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDateShort(session.session_date)} · {session.branch}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">{pCount} P</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">{aCount} A</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">{obCount} OB</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{lCount} L</span>
            {uCount > 0 && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{uCount} unmarked</span>}
            {tCount > 0 && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              <Shirt className="w-3 h-3 inline mr-0.5" />{tCount}
            </span>}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="id">Sort: ID</option>
            <option value="name">Sort: Name</option>
            <option value="unmarked">Sort: Unmarked first</option>
          </select>

          {/* Bulk actions */}
          <div className="flex gap-1">
            <button onClick={() => setConfirmMarkAll("present")}
              className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
              All P
            </button>
            <button onClick={() => setConfirmMarkAll("absent")}
              className="px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">
              All A
            </button>
            <button onClick={() => setConfirmMarkAll("clear")}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="w-8 h-8 mb-2" />
            <p className="text-sm">No students match "{search}"</p>
          </div>
        ) : sorted.map(s => (
          <StudentRow
            key={s.student_profile_id}
            student={s}
            localStatus={localData[s.student_profile_id]?.status ?? null}
            localTshirt={localData[s.student_profile_id]?.t_shirt_worn ?? false}
            saveState={saveStates[s.student_profile_id] ?? "idle"}
            onStatusChange={status => handleStatusChange(s.student_profile_id, status)}
            onTshirtChange={v     => handleTshirtChange(s.student_profile_id, v)}
            readOnly={false}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/60">
        {[
          { label: "Present",  color: "bg-emerald-500" },
          { label: "Absent",   color: "bg-rose-500"    },
          { label: "On Break", color: "bg-amber-500"   },
          { label: "Leave",    color: "bg-blue-500"    },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Shirt className="w-3 h-3 text-indigo-500" />T-Shirt
        </span>
      </div>

      {/* Confirm bulk action dialog */}
      {confirmMarkAll && (
        <ConfirmDialog
          message={`This will mark all ${filtered.length} visible students as ${confirmMarkAll === "clear" ? "unmarked" : STATUS_LABELS[confirmMarkAll]}. Continue?`}
          onConfirm={() => handleMarkAll(confirmMarkAll)}
          onCancel={() => setConfirmMarkAll(null)}
          danger={confirmMarkAll === "absent"}
        />
      )}
    </div>
  );
}

// Actual API save helper
async function apiSave(
  sessionId: number,
  studentProfileId: number,
  status: AttendanceStatus,
  tShirt: boolean
) {
  return markAttendance({
    session_id:        sessionId,
    student_profile_id: studentProfileId,
    status,
    t_shirt_worn: status === "present" ? tShirt : false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Session List Item
// ─────────────────────────────────────────────────────────────────────────────
interface SessionItemProps {
  session: ClassSession;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionItem({ session, selected, onSelect, onDelete }: SessionItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div
        onClick={onSelect}
        className={`px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-all duration-150 group
          ${selected
            ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-2 border-l-transparent"
          }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${session.is_completed ? "bg-emerald-500" : "bg-amber-400"}`} />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">
                {session.topic || formatDay(session.session_date)}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-4 leading-tight">
              {formatDateShort(session.session_date)}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 pl-4 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                <MapPin className="w-2.5 h-2.5" />{session.branch}
              </span>
              {session.course && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                  <BookOpen className="w-2.5 h-2.5" />{session.course}
                </span>
              )}
              {session.is_completed ? (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Done</span>
              ) : (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Pending</span>
              )}
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex-shrink-0"
            aria-label="Delete session"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Delete session "${session.topic || formatDateShort(session.session_date)}" on ${formatDateShort(session.session_date)}? All attendance records for this session will also be deleted.`}
          onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAttendance() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(weekAgoISO());
  const [filterEndDate, setFilterEndDate] = useState(todayISO());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sessionsKey = ["sessions", filterBranch, filterCourse, filterStartDate, filterEndDate];

  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<ClassSession[]>({
    queryKey: sessionsKey,
    queryFn: () => getSessions({
      branch:     filterBranch  || undefined,
      course:     filterCourse  || undefined,
      start_date: filterStartDate ? new Date(filterStartDate + "T00:00:00").toISOString() : undefined,
      end_date:   filterEndDate   ? new Date(filterEndDate + "T23:59:59").toISOString()   : undefined,
    }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Sort sessions: newest first
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
  );

  const selectedSession = sortedSessions.find(s => s.id === selectedSessionId) ?? null;

  // Auto-select first session when list loads
  useEffect(() => {
    if (sortedSessions.length > 0 && selectedSessionId === null) {
      setSelectedSessionId(sortedSessions[0].id);
    }
  }, [sortedSessions.length]);

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionsKey });
      refetchSessions();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSession(id),
    onSuccess: (_data, id) => {
      if (selectedSessionId === id) setSelectedSessionId(null);
      qc.invalidateQueries({ queryKey: sessionsKey });
    },
  });

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 dark:text-slate-400 text-sm">Admin access required.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Attendance Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Create sessions and mark student attendance
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />

          <select value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setSelectedSessionId(null); }}
            className="px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setSelectedSessionId(null); }}
            className="px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Courses</option>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex items-center gap-1.5">
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button onClick={() => refetchSessions()} className="ml-auto p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="max-w-screen-xl mx-auto flex" style={{ height: "calc(100vh - 148px)" }}>
        {/* Sessions Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sessions
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {sessionsLoading ? "…" : sortedSessions.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sessionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-4" />
                </div>
              ))
            ) : sortedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400">
                <Calendar className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No sessions found</p>
                <p className="text-xs mt-1">Adjust filters or create a new session</p>
              </div>
            ) : sortedSessions.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                selected={s.id === selectedSessionId}
                onSelect={() => setSelectedSessionId(s.id)}
                onDelete={() => deleteMutation.mutate(s.id)}
              />
            ))}
          </div>
        </div>

        {/* Attendance Sheet Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          {selectedSession ? (
            <SheetPanel session={selectedSession} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8">
              <BarChart3 className="w-12 h-12 text-slate-200 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select a session to mark attendance</p>
              <p className="text-xs text-slate-400">
                {sortedSessions.length === 0 ? "Create your first session using the button above." : "Click any session from the list on the left."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={data => createMutation.mutateAsync(data).then(() => {})}          saving={createMutation.isPending}
          defaultBranch={filterBranch || undefined}
          defaultCourse={filterCourse || undefined}
        />
      )}
    </div>
  );
}
