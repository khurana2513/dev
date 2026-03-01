import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAllStudents,
  createStudentAdmin,
  updateStudentAdmin,
  deleteStudent,
  getValidLevels,
  User,
  AdminCreateStudentRequest,
} from "../lib/userApi";
import {
  Users,
  UserPlus,
  Search,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  ArrowLeft,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COURSES = ["Abacus", "Vedic Maths", "Handwriting"];
const LEVEL_TYPES = ["Regular", "Junior"];
const BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"];
const STATUSES = ["active", "inactive", "closed"];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// ─── Blank form state ──────────────────────────────────────────────────────────
const blankForm = (): AdminCreateStudentRequest => ({
  name: "",
  email: "",
  display_name: "",
  class_name: "",
  course: "",
  level_type: "",
  level: "",
  branch: "",
  status: "active",
  join_date: "",
  finish_date: "",
  parent_contact_number: "",
});

// ─── Validation ──────────────────────────────────────────────────────────────
function validateForm(form: AdminCreateStudentRequest, isEdit = false): string | null {
  if (!isEdit && !form.name?.trim()) return "Name is required";
  if (form.name !== undefined && form.name !== "" && form.name.trim().length < 2)
    return "Name must be at least 2 characters";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    return "Invalid email format";
  if (
    form.parent_contact_number &&
    !/^\d{10}$/.test(form.parent_contact_number)
  )
    return "Parent contact number must be exactly 10 digits";
  if (form.class_name) {
    const n = parseInt(form.class_name);
    if (isNaN(n) || n < 1 || n > 12) return "Class must be between 1 and 12";
  }
  return null;
}

// ─── Student Row Menu ─────────────────────────────────────────────────────────
function StudentRow({
  student,
  onEdit,
  onDelete,
}: {
  student: User;
  onEdit: (s: User) => void;
  onDelete: (s: User) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-primary/5 transition-colors">
      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
        {student.public_id ?? <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-card-foreground text-sm">
          {student.display_name || student.name}
        </div>
        {student.display_name && student.display_name !== student.name && (
          <div className="text-xs text-muted-foreground">{student.name}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {student.email ?? <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-card-foreground">
        {student.class_name ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-card-foreground">
        {student.course ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-card-foreground">
        {student.branch ?? "—"}
      </td>
      <td className="px-4 py-3">
        {(() => {
          const s: string = student.status ?? "active";
          return (
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[s] ?? STATUS_STYLES.active}`}
            >
              {s}
            </span>
          );
        })()}
      </td>
      <td className="px-4 py-3 text-sm text-card-foreground font-bold">
        {student.total_points}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(student)}
            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            title="Edit student"
          >
            <Edit2 className="w-4 h-4 text-primary" />
          </button>
          <button
            onClick={() => onDelete(student)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            title="Delete student"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function StudentFormModal({
  title,
  form,
  onChange,
  onClose,
  onSubmit,
  saving,
  error,
  validLevels,
  onCourseChange,
  isEdit,
}: {
  title: string;
  form: AdminCreateStudentRequest;
  onChange: (k: keyof AdminCreateStudentRequest, v: string | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
  validLevels: string[];
  onCourseChange: (course: string, levelType: string) => void;
  isEdit: boolean;
}) {
  const inputCls =
    "w-full px-3 py-2 bg-background dark:bg-slate-800 border border-border dark:border-slate-600 rounded-lg text-foreground dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const selectCls =
    "w-full px-3 py-2 bg-background dark:bg-slate-800 border border-border dark:border-slate-600 rounded-lg text-foreground dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const labelCls = "block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <h2 className="text-xl font-black tracking-tight text-card-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Basic Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name <span className="text-destructive">*</span></label>
                <input
                  className={inputCls}
                  placeholder="Full name"
                  value={form.name ?? ""}
                  onChange={(e) => onChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Display Name</label>
                <input
                  className={inputCls}
                  placeholder="(optional)"
                  value={form.display_name ?? ""}
                  onChange={(e) => onChange("display_name", e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="(optional — needed for Google login)"
                  value={form.email ?? ""}
                  onChange={(e) => onChange("email", e.target.value || null)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If set, this student can sign in with Google using this email.
                </p>
              </div>
              <div>
                <label className={labelCls}>Class (1–12)</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 5"
                  value={form.class_name ?? ""}
                  onChange={(e) => onChange("class_name", e.target.value || null)}
                />
              </div>
            </div>
          </div>

          {/* Course Info */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Course Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Course</label>
                <select
                  className={selectCls}
                  value={form.course ?? ""}
                  onChange={(e) => {
                    onChange("course", e.target.value || null);
                    onCourseChange(e.target.value, form.level_type ?? "");
                  }}
                >
                  <option value="">— Select course —</option>
                  {COURSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Level Type</label>
                <select
                  className={selectCls}
                  value={form.level_type ?? ""}
                  onChange={(e) => {
                    onChange("level_type", e.target.value || null);
                    onCourseChange(form.course ?? "", e.target.value);
                  }}
                >
                  <option value="">— Select level type —</option>
                  {LEVEL_TYPES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Level</label>
                {validLevels.length > 0 ? (
                  <select
                    className={selectCls}
                    value={form.level ?? ""}
                    onChange={(e) => onChange("level", e.target.value || null)}
                  >
                    <option value="">— Select level —</option>
                    {validLevels.map((l) => <option key={l}>{l}</option>)}
                  </select>
                ) : (
                  <input
                    className={inputCls}
                    placeholder="Select course & level type first"
                    value={form.level ?? ""}
                    onChange={(e) => onChange("level", e.target.value || null)}
                    readOnly={!form.course && !form.level_type}
                  />
                )}
              </div>
              <div>
                <label className={labelCls}>Branch</label>
                <select
                  className={selectCls}
                  value={form.branch ?? ""}
                  onChange={(e) => onChange("branch", e.target.value || null)}
                >
                  <option value="">— Select branch —</option>
                  {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Status & Dates */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Status & Dates</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={selectCls}
                  value={form.status ?? "active"}
                  onChange={(e) => onChange("status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Join Date</label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.join_date ? form.join_date.split("T")[0] : ""}
                  onChange={(e) => onChange("join_date", e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelCls}>Finish Date</label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.finish_date ? form.finish_date.split("T")[0] : ""}
                  onChange={(e) => onChange("finish_date", e.target.value || null)}
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Parent Contact</div>
            <div className="max-w-xs">
              <label className={labelCls}>Contact Number (10 digits)</label>
              <input
                className={inputCls}
                type="tel"
                placeholder="10-digit number"
                maxLength={10}
                value={form.parent_contact_number ?? ""}
                onChange={(e) => onChange("parent_contact_number", e.target.value || null)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-border">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border text-card-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Student"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteConfirmModal({
  student,
  onConfirm,
  onCancel,
  deleting,
}: {
  student: User;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border rounded-[2rem] shadow-2xl w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-black text-card-foreground mb-1">Delete Student</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-card-foreground">
                {student.display_name || student.name}
              </span>
              ? All practice sessions, paper attempts, points, and badges will be
              deleted. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl border border-border text-card-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-6 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminStudentManagement() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Data
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AdminCreateStudentRequest>(blankForm());
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addValidLevels, setAddValidLevels] = useState<string[]>([]);

  // Edit modal
  const [editStudent, setEditStudent] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<AdminCreateStudentRequest>(blankForm());
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editValidLevels, setEditValidLevels] = useState<string[]>([]);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success banner
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) setLocation("/dashboard");
  }, [isAdmin]);

  // ── Load students ───────────────────────────────────────────────────────────
  const loadStudents = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (e) {
      console.error("Failed to load students", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);

  // ── Valid levels helper ──────────────────────────────────────────────────────
  const fetchLevels = async (
    course: string,
    levelType: string,
    setter: (l: string[]) => void
  ) => {
    if (!course || !levelType) { setter([]); return; }
    try {
      const res = await getValidLevels(course, levelType);
      setter(res.levels ?? []);
    } catch { setter([]); }
  };

  // ── Filtered students ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const term = search.toLowerCase();
      const matchSearch =
        !search ||
        s.name?.toLowerCase().includes(term) ||
        (s.email ?? "").toLowerCase().includes(term) ||
        (s.public_id ?? "").toLowerCase().includes(term) ||
        (s.display_name ?? "").toLowerCase().includes(term);

      const matchStatus = !filterStatus || s.status === filterStatus;
      const matchBranch = !filterBranch || s.branch === filterBranch;
      const matchCourse = !filterCourse || s.course === filterCourse;

      return matchSearch && matchStatus && matchBranch && matchCourse;
    });
  }, [students, search, filterStatus, filterBranch, filterCourse]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === "active" || !s.status).length;
    const inactive = students.filter((s) => s.status === "inactive").length;
    const closed = students.filter((s) => s.status === "closed").length;
    return { total, active, inactive, closed };
  }, [students]);

  // ── flash success ─────────────────────────────────────────────────────────
  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // ── Add student ───────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setAddError(null);
    const err = validateForm(addForm, false);
    if (err) { setAddError(err); return; }
    setAddSaving(true);
    try {
      await createStudentAdmin({
        ...addForm,
        email: addForm.email || null,
        display_name: addForm.display_name || null,
        class_name: addForm.class_name || null,
        course: addForm.course || null,
        level_type: addForm.level_type || null,
        level: addForm.level || null,
        branch: addForm.branch || null,
        join_date: addForm.join_date || null,
        finish_date: addForm.finish_date || null,
        parent_contact_number: addForm.parent_contact_number || null,
      });
      setShowAdd(false);
      setAddForm(blankForm());
      setAddValidLevels([]);
      await loadStudents(true);
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      flashSuccess("Student created successfully!");
    } catch (e: any) {
      setAddError(e?.message ?? "Failed to create student");
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (student: User) => {
    setEditStudent(student);
    setEditForm({
      name: student.name,
      email: student.email ?? "",
      display_name: student.display_name ?? "",
      class_name: student.class_name ?? "",
      course: student.course ?? "",
      level_type: student.level_type ?? "",
      level: student.level ?? "",
      branch: student.branch ?? "",
      status: student.status ?? "active",
      join_date: student.join_date ? student.join_date.split("T")[0] : "",
      finish_date: student.finish_date ? student.finish_date.split("T")[0] : "",
      parent_contact_number: student.parent_contact_number ?? "",
    });
    if (student.course && student.level_type) {
      fetchLevels(student.course, student.level_type, setEditValidLevels);
    } else {
      setEditValidLevels([]);
    }
    setEditError(null);
  };

  // ── Edit student ─────────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editStudent) return;
    setEditError(null);
    const err = validateForm(editForm as AdminCreateStudentRequest, true);
    if (err) { setEditError(err); return; }
    setEditSaving(true);
    try {
      await updateStudentAdmin(editStudent.id, {
        ...editForm,
        email: editForm.email || null,
        display_name: editForm.display_name || null,
        class_name: editForm.class_name || null,
        course: editForm.course || null,
        level_type: editForm.level_type || null,
        level: editForm.level || null,
        branch: editForm.branch || null,
        join_date: editForm.join_date || null,
        finish_date: editForm.finish_date || null,
        parent_contact_number: editForm.parent_contact_number || null,
      });
      setEditStudent(null);
      await loadStudents(true);
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      flashSuccess("Student updated successfully!");
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to update student");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete student ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      await loadStudents(true);
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      flashSuccess("Student deleted successfully.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const selectCls =
    "px-3 py-2 bg-background dark:bg-slate-800 border border-border dark:border-slate-600 rounded-lg text-foreground dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/admin")}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
              title="Back to admin dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Student Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, edit, and manage all student accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadStudents(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => { setShowAdd(true); setAddForm(blankForm()); setAddError(null); setAddValidLevels([]); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

        {/* ── Success Flash ───────────────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-700 dark:text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* ── Stats Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-primary" },
            { label: "Active", value: stats.active, color: "text-green-600 dark:text-green-400" },
            { label: "Inactive", value: stats.inactive, color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Closed", value: stats.closed, color: "text-red-500 dark:text-red-400" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                className="w-full pl-9 pr-4 py-2 bg-background dark:bg-slate-800 border border-border dark:border-slate-600 rounded-lg text-foreground dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Search by name, email, or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className={selectCls} value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                <option value="">All Courses</option>
                {COURSES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className={selectCls} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                <option value="">All Branches</option>
                {BRANCHES.map((b) => <option key={b}>{b}</option>)}
              </select>
              {(filterStatus || filterCourse || filterBranch) && (
                <button
                  onClick={() => { setFilterStatus(""); setFilterCourse(""); setFilterBranch(""); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground ml-auto">
              {filtered.length} / {students.length} students
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-4">Loading students…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No students found</p>
              {(search || filterStatus || filterBranch || filterCourse) && (
                <p className="text-xs text-muted-foreground mt-1">Try clearing the filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Public ID", "Name", "Email", "Class", "Course", "Branch", "Status", "Points", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      onEdit={openEdit}
                      onDelete={(s) => setDeleteTarget(s)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ──────────────────────────────────────────────────────── */}
      {showAdd && (
        <StudentFormModal
          title="Add New Student"
          form={addForm}
          onChange={(k, v) => setAddForm((f) => ({ ...f, [k]: v }))}
          onClose={() => { setShowAdd(false); setAddError(null); }}
          onSubmit={handleAdd}
          saving={addSaving}
          error={addError}
          validLevels={addValidLevels}
          onCourseChange={(course, levelType) =>
            fetchLevels(course, levelType, setAddValidLevels)
          }
          isEdit={false}
        />
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editStudent && (
        <StudentFormModal
          title={`Edit: ${editStudent.display_name || editStudent.name}`}
          form={editForm}
          onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))}
          onClose={() => { setEditStudent(null); setEditError(null); }}
          onSubmit={handleEdit}
          saving={editSaving}
          error={editError}
          validLevels={editValidLevels}
          onCourseChange={(course, levelType) =>
            fetchLevels(course, levelType, setEditValidLevels)
          }
          isEdit
        />
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          student={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
