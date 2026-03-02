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
  getStudentCertificatesAdmin,
  createCertificateAdmin,
  updateCertificateAdmin,
  deleteCertificateAdmin,
  CertificateRecord,
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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Award,
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
  onCertificates,
}: {
  student: User;
  onEdit: (s: User) => void;
  onDelete: (s: User) => void;
  onCertificates: (s: User) => void;
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
            onClick={() => onCertificates(student)}
            className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors"
            title="Manage certificates"
          >
            <Award className="w-4 h-4 text-amber-500" />
          </button>
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
// ─── Certificate Manager Modal ─────────────────────────────────────────────────────
function CertificateManagerModal({
  student,
  onClose,
}: {
  student: User;
  onClose: () => void;
}) {
  const inputCls =
    "w-full px-3 py-2 bg-background dark:bg-slate-800 border border-border dark:border-slate-600 rounded-lg text-foreground dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing, setEditing] = useState<CertificateRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", marks: "", date_issued: "", description: "" });

  useEffect(() => { loadCerts(); }, []);

  const loadCerts = async () => {
    setLoading(true);
    try {
      const data = await getStudentCertificatesAdmin(student.id);
      setCerts(data);
    } catch {
      setError("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { setError("Certificate name is required"); return; }
    if (!form.date_issued)  { setError("Date of issue is required"); return; }
    setSaving(true); setError(null);
    try {
      const newCert = await createCertificateAdmin(student.id, {
        title: form.title.trim(),
        marks: form.marks ? parseFloat(form.marks) : null,
        date_issued: form.date_issued,
        description: form.description.trim() || null,
      });
      setCerts([newCert, ...certs]);
      setForm({ title: "", marks: "", date_issued: "", description: "" });
      flash("Certificate issued!");
    } catch {
      setError("Failed to issue certificate");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!form.title.trim()) { setError("Certificate name is required"); return; }
    if (!form.date_issued)  { setError("Date of issue is required"); return; }
    setSaving(true); setError(null);
    try {
      const updated = await updateCertificateAdmin(student.id, editing.id, {
        title: form.title.trim(),
        marks: form.marks ? parseFloat(form.marks) : null,
        date_issued: form.date_issued,
        description: form.description.trim() || null,
      });
      setCerts(certs.map(c => c.id === updated.id ? updated : c));
      setEditing(null);
      setForm({ title: "", marks: "", date_issued: "", description: "" });
      flash("Certificate updated!");
    } catch {
      setError("Failed to update certificate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (certId: number) => {
    if (!window.confirm("Delete this certificate? This cannot be undone.")) return;
    setDeleting(certId);
    try {
      await deleteCertificateAdmin(student.id, certId);
      setCerts(certs.filter(c => c.id !== certId));
      flash("Certificate deleted");
    } catch {
      setError("Failed to delete certificate");
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (cert: CertificateRecord) => {
    setEditing(cert);
    setError(null);
    const rawDate = new Date(cert.date_issued).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    setForm({
      title: cert.title,
      marks: cert.marks !== null && cert.marks !== undefined ? String(cert.marks) : "",
      date_issued: rawDate,
      description: cert.description || "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setError(null);
    setForm({ title: "", marks: "", date_issued: "", description: "" });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-card-foreground">Certificate Records</h2>
              <p className="text-sm text-muted-foreground">{student.display_name || student.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
          {/* ── Issue / Edit Form */}
          <div className="bg-background/60 border border-border rounded-2xl p-6">
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-4">
              {editing ? "Edit Certificate" : "Issue New Certificate"}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Certificate Name <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. Abacus Level 1 Completion"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Marks / Score
                </label>
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  placeholder="(optional)"
                  value={form.marks}
                  onChange={e => setForm(f => ({ ...f, marks: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Date of Issue <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.date_issued}
                  onChange={e => setForm(f => ({ ...f, date_issued: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Description
                </label>
                <input
                  className={inputCls}
                  placeholder="(optional) e.g. Scored highest in class"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={editing ? handleUpdate : handleAdd}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                {saving ? "Saving…" : editing ? "Save Changes" : "Issue Certificate"}
              </button>
              {editing && (
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-border text-card-foreground hover:bg-muted font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* ── Certificate List */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Award className="w-3.5 h-3.5" />
              Issued Certificates ({certs.length})
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-background/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : certs.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl">
                <Award className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No certificates issued yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Use the form above to issue the first one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {certs.map((cert, idx) => (
                  <div
                    key={cert.id}
                    className={`border rounded-xl p-4 flex items-start gap-4 transition-all ${
                      editing?.id === cert.id
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background/40 border-border hover:border-border/80"
                    }`}
                  >
                    {/* Row number */}
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-black text-primary">{idx + 1}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-card-foreground text-sm">{cert.title}</div>
                      {cert.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{cert.description}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {cert.marks !== null && cert.marks !== undefined ? (
                          <span className="px-2 py-0.5 text-xs font-black rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {cert.marks} marks
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                            No marks
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(cert.date_issued).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startEdit(cert)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        disabled={deleting === cert.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === cert.id
                          ? <Loader2 className="w-3.5 h-3.5 text-destructive animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

  // Sort
  type SortKey = "public_id" | "name" | "email" | "class_name" | "course" | "branch" | "status" | "total_points" | "";
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Certificates modal
  const [certStudent, setCertStudent] = useState<User | null>(null);

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

  // ── Filtered + sorted students ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const result = students.filter((s) => {
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

    if (!sortKey) return result;

    return [...result].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortKey === "name") {
        aVal = (a.display_name || a.name).toLowerCase();
        bVal = (b.display_name || b.name).toLowerCase();
      } else if (sortKey === "total_points") {
        aVal = a.total_points;
        bVal = b.total_points;
      } else {
        aVal = ((a[sortKey as keyof User] as string | null | undefined) ?? "").toString().toLowerCase();
        bVal = ((b[sortKey as keyof User] as string | null | undefined) ?? "").toString().toLowerCase();
      }
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [students, search, filterStatus, filterBranch, filterCourse, sortKey, sortDir]);

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
                    {([
                      { label: "Public ID", key: "public_id" },
                      { label: "Name",      key: "name" },
                      { label: "Email",     key: "email" },
                      { label: "Class",     key: "class_name" },
                      { label: "Course",    key: "course" },
                      { label: "Branch",    key: "branch" },
                      { label: "Status",    key: "status" },
                      { label: "Points",    key: "total_points" },
                    ] as { label: string; key: string }[]).map(({ label, key }) => {
                      const active = sortKey === key;
                      return (
                        <th
                          key={key}
                          onClick={() => handleSort(key as Parameters<typeof handleSort>[0])}
                          className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none group transition-colors hover:text-foreground"
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            <span className={`transition-opacity ${
                              active ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"
                            }`}>
                              {active
                                ? sortDir === "asc"
                                  ? <ChevronUp className="w-3 h-3" />
                                  : <ChevronDown className="w-3 h-3" />
                                : <ChevronsUpDown className="w-3 h-3" />
                              }
                            </span>
                          </span>
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      onEdit={openEdit}
                      onDelete={(s) => setDeleteTarget(s)}
                      onCertificates={(s) => setCertStudent(s)}
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
      {/* ── Certificate Manager ──────────────────────────────────── */}
      {certStudent && (
        <CertificateManagerModal
          student={certStudent}
          onClose={() => setCertStudent(null)}
        />
      )}    </div>
  );
}
