import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, RefreshCw, Users, CheckCircle2, Clock, AlertCircle,
  Plus, Search, Upload, Edit2, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, History, LockKeyhole,
} from "lucide-react";
import {
  fetchAccessSettings, updateAccessSettings, fetchSyncReport,
  fetchAllowlist, addAllowlistEntry, updateAllowlistEntry,
  deleteAllowlistEntry, bulkImportAllowlist, applySubscriptionOverride,
  fetchUserSubscriptionHistory,
} from "../lib/subscriptionApi";
import type {
  AccessControlSettings, AllowlistEntry, SyncReport,
  BulkImportResult, AuditLogEntry,
} from "../types/subscription";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SYNC_BADGE: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  synced: { label: "Synced", color: "#10B981", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  pending: { label: "Pending", color: "#F59E0B", icon: <Clock className="w-3.5 h-3.5" /> },
  not_in_list: { label: "Not in List", color: "#EF4444", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

function SyncBadge({ status }: { status: string }) {
  const b = SYNC_BADGE[status] ?? SYNC_BADGE["pending"];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}44` }}
    >
      {b.icon} {b.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Slide-in Drawer
// ---------------------------------------------------------------------------
function Drawer({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 210 }}
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full overflow-y-auto"
            style={{
              width: 480,
              maxWidth: "100vw",
              zIndex: 220,
              background: "#0F0F18",
              borderLeft: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-center justify-between p-5 sticky top-0 z-10"
              style={{ background: "#0F0F18", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-white font-semibold text-lg">{title}</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({
  open, title, description, onConfirm, onCancel, requireNote, loading,
}: {
  open: boolean; title: string; description: string;
  onConfirm: (note: string) => void; onCancel: () => void;
  requireNote?: boolean; loading?: boolean;
}) {
  const [note, setNote] = useState("");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 70 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <h4 className="text-white font-semibold text-lg mb-2">{title}</h4>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{description}</p>
            {requireNote && (
              <textarea
                placeholder="Add a reason / note (required)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl text-sm text-white resize-none mb-4"
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  padding: "10px 12px", outline: "none", fontFamily: "inherit",
                }}
              />
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => onConfirm(note)}
                disabled={(requireNote && !note.trim()) || loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  opacity: (requireNote && !note.trim()) || loading ? 0.5 : 1,
                  cursor: (requireNote && !note.trim()) || loading ? "not-allowed" : "pointer",
                  border: "none",
                }}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Add/Edit Email Drawer
// ---------------------------------------------------------------------------
function AllowlistEntryDrawer({
  open, onClose, onSaved, editEntry,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  editEntry?: AllowlistEntry | null;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editEntry) {
      setEmail(editEntry.email);
      setDisplayName(editEntry.user_name ?? "");
      setRole(editEntry.role as any ?? "student");
      setNote("");
    } else {
      setEmail(""); setDisplayName(""); setNote(""); setRole("student");
    }
    setError("");
  }, [editEntry, open]);

  const handleSave = async () => {
    if (!email.trim()) { setError("Email is required"); return; }
    setLoading(true); setError("");
    try {
      if (editEntry) {
        await updateAllowlistEntry(editEntry.id, { role, notes: note || undefined });
      } else {
        await addAllowlistEntry({ email, role, notes: displayName ? undefined : undefined });
      }
      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={editEntry ? "Edit Entry" : "Add Email"}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Email *</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className="w-full rounded-xl text-sm text-white"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Display Name</label>
          <input
            type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full rounded-xl text-sm text-white"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Role</label>
          <select
            value={role} onChange={(e) => setRole(e.target.value as any)}
            className="w-full rounded-xl text-sm text-white"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "inherit" }}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        {editEntry && (
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Reason for change</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} placeholder="Optional note"
              className="w-full rounded-xl text-sm text-white resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSave} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", cursor: loading ? "not-allowed" : "pointer", border: "none", opacity: loading ? 0.7 : 1 }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {editEntry ? "Save Changes" : "Add to Allowlist"}
        </button>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Subscription Override Drawer
// ---------------------------------------------------------------------------
function OverrideDrawer({
  open, onClose, userId, userEmail, onSaved,
}: {
  open: boolean; onClose: () => void; userId: number; userEmail: string; onSaved: () => void;
}) {
  const [action, setAction] = useState<"activate" | "extend" | "suspend" | "remove_override">("activate");
  const [_planId, _setPlanId] = useState("");
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setHistLoading(true);
      fetchUserSubscriptionHistory(userId).then(setHistory).catch(() => setHistory([])).finally(() => setHistLoading(false));
    }
  }, [open, userId]);

  const handleApply = async () => {
    if (!reason.trim()) { setError("Reason is required"); return; }
    setLoading(true); setError("");
    try {
      await applySubscriptionOverride(userId, { action, duration_days: days, note: reason });
      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.message || "Override failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Override: ${userEmail}`}>
      <div className="space-y-4">
        {/* Action selector */}
        <div className="grid grid-cols-2 gap-2">
          {(["activate", "extend", "suspend", "remove_override"] as const).map((a) => (
            <button
              key={a} onClick={() => setAction(a)}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                cursor: "pointer", border: action === a ? "1.5px solid #7C3AED" : "1px solid rgba(255,255,255,0.10)",
                background: action === a ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                color: action === a ? "#A78BFA" : "rgba(255,255,255,0.5)",
              }}
            >
              {a.replace("_", " ")}
            </button>
          ))}
        </div>

        {(action === "activate" || action === "extend") && (
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Days {action === "activate" ? "(duration)" : "(extend by)"}</label>
            <input
              type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        )}

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Reason (required)</label>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            rows={3} placeholder="Why is this override being applied?"
            className="w-full rounded-xl text-sm text-white resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "inherit" }}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleApply} disabled={loading || !reason.trim()}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
          style={{
            background: action === "suspend" ? "rgba(239,68,68,0.8)" : "linear-gradient(135deg, #4F46E5, #7C3AED)",
            cursor: loading || !reason.trim() ? "not-allowed" : "pointer",
            border: "none", opacity: loading || !reason.trim() ? 0.5 : 1,
          }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Apply Override
        </button>

        {/* History */}
        <div style={{ marginTop: 24 }}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">History</p>
          {histLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
          ) : history.length === 0 ? (
            <p className="text-slate-600 text-sm">No history found.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <History className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-300 font-medium">{h.action.replace(/_/g, " ")}</p>
                    {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
                    <p className="text-xs text-slate-600 mt-0.5">{new Date(h.performed_at).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Access Control Page
// ---------------------------------------------------------------------------
export default function AdminAccessControl() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher">("all");
  const [syncFilter, setSyncFilter] = useState<"all" | "synced" | "pending" | "not_in_list">("all");
  const [page, setPage] = useState(1);
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AllowlistEntry | null>(null);
  const [overrideDrawer, setOverrideDrawer] = useState<{ userId: number; email: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AllowlistEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [modeUpdating, setModeUpdating] = useState(false);

  // Maintenance mode state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean | null>(null);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [maintenanceMsgDraft, setMaintenanceMsgDraft] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceMsgEditing, setMaintenanceMsgEditing] = useState(false);

  // Fetch maintenance status on mount
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || "/api";
    fetch(`${base}/public/maintenance-status`)
      .then((r) => r.json())
      .then((d: { enabled: boolean; message: string }) => {
        setMaintenanceEnabled(d.enabled);
        setMaintenanceMsg(d.message);
        setMaintenanceMsgDraft(d.message);
      })
      .catch(() => { setMaintenanceEnabled(false); });
  }, []);

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE || "/api";
      const token = localStorage.getItem("auth_token") ?? "";
      const res = await fetch(`${base}/admin/maintenance/toggle`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setMaintenanceEnabled(d.enabled);
      setMaintenanceMsg(d.message);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const saveMaintenanceMessage = async () => {
    setMaintenanceLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE || "/api";
      const token = localStorage.getItem("auth_token") ?? "";
      const res = await fetch(`${base}/admin/maintenance/message`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: maintenanceMsgDraft }) });
      const d = await res.json();
      setMaintenanceMsg(d.message);
      setMaintenanceMsgDraft(d.message);
      setMaintenanceMsgEditing(false);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Queries
  const { data: settings, refetch: refetchSettings } = useQuery<AccessControlSettings>({
    queryKey: ["access-settings"],
    queryFn: fetchAccessSettings,
    staleTime: 30_000,
  });

  const { data: syncReport, refetch: refetchSync } = useQuery<SyncReport>({
    queryKey: ["sync-report"],
    queryFn: fetchSyncReport,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: allowlistData, isLoading: listLoading } = useQuery({
    queryKey: ["allowlist", page, search, roleFilter, syncFilter],
    queryFn: () => fetchAllowlist({ page, limit: 20, search: search || undefined, role: roleFilter !== "all" ? roleFilter : undefined, status: syncFilter !== "all" ? syncFilter : undefined }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const handleModeToggle = async () => {
    if (!settings) return;
    setModeUpdating(true);
    try {
      await updateAccessSettings(settings.mode === "restricted" ? "open" : "restricted", "");
      await refetchSettings();
    } finally {
      setModeUpdating(false);
    }
  };

  const handleDelete = async (_note: string) => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await deleteAllowlistEntry(deleteConfirm.id, "Removed by admin");
      queryClient.invalidateQueries({ queryKey: ["allowlist"] });
      queryClient.invalidateQueries({ queryKey: ["sync-report"] });
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const entries = bulkText.split(/[\n,;]/).map((e) => e.trim()).filter(Boolean);
    if (!entries.length) return;
    const payload = entries.map((email) => ({ email, role: "student" as const }));
    setBulkLoading(true);
    try {
      const result = await bulkImportAllowlist(payload);
      setBulkResult(result);
      queryClient.invalidateQueries({ queryKey: ["allowlist"] });
      queryClient.invalidateQueries({ queryKey: ["sync-report"] });
    } finally {
      setBulkLoading(false);
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["allowlist"] });
    queryClient.invalidateQueries({ queryKey: ["sync-report"] });
  };

  const entries: AllowlistEntry[] = (allowlistData as any)?.items ?? [];
  const total: number = (allowlistData as any)?.total ?? 0;
  const totalPages: number = Math.ceil(total / 20);

  return (
    <div className="min-h-screen" style={{ background: "#07070f", color: "#fff" }}>
      {/* Page header */}
      <div className="px-4 pt-8 pb-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Access Control</h1>
            <p className="text-slate-500 text-sm">Manage who can access the platform</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 pb-16 flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <div className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-24">
          {/* Access Mode card */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Access Mode</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold capitalize">{settings?.mode ?? "—"}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {settings?.mode === "restricted" ? "Only allowlisted emails can log in" : "Any registered user can access"}
                </p>
              </div>
              <button
                onClick={handleModeToggle}
                disabled={modeUpdating || !settings}
                className="transition-colors"
                style={{ background: "none", border: "none", cursor: modeUpdating ? "not-allowed" : "pointer" }}
              >
                {modeUpdating ? (
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                ) : settings?.mode === "restricted" ? (
                  <ToggleLeft className="w-10 h-10 text-indigo-400 hover:text-indigo-300 transition-colors" />
                ) : (
                  <ToggleRight className="w-10 h-10 text-emerald-400 hover:text-emerald-300 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Sync report card */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sync Report</p>
              <button onClick={() => refetchSync()} className="text-slate-500 hover:text-white transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {syncReport ? (
              <div className="space-y-2.5">
                {[
                  { label: "Synced", count: syncReport.synced, color: "#10B981" },
                  { label: "Pending", count: syncReport.pending, color: "#F59E0B" },
                  { label: "Not in List", count: syncReport.users_not_in_list, color: "#EF4444" },
                  { label: "Total Allowed", count: syncReport.total_allowed_emails, color: "#818CF8" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
            )}
          </div>

          {/* ── Maintenance Mode card ── */}
          <div className="rounded-2xl p-5" style={{ background: maintenanceEnabled ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)", border: maintenanceEnabled ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.08)", transition: "all 0.3s" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: maintenanceEnabled ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={maintenanceEnabled ? "#f87171" : "#94a3b8"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Maintenance Mode</p>
              </div>
              <button onClick={toggleMaintenance} disabled={maintenanceLoading || maintenanceEnabled === null} style={{ background: "none", border: "none", cursor: maintenanceLoading ? "not-allowed" : "pointer", opacity: maintenanceLoading ? 0.6 : 1 }}>
                {maintenanceLoading ? (
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                ) : maintenanceEnabled ? (
                  <ToggleRight className="w-10 h-10 text-red-400 hover:text-red-300 transition-colors" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-500 hover:text-slate-400 transition-colors" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: maintenanceEnabled ? "#f87171" : "#4ade80", boxShadow: maintenanceEnabled ? "0 0 6px #f87171" : "0 0 6px #4ade80", flexShrink: 0 }} />
              <span className="text-sm font-semibold" style={{ color: maintenanceEnabled ? "#fca5a5" : "#86efac" }}>
                {maintenanceEnabled === null ? "Checking…" : maintenanceEnabled ? "SITE IS DOWN" : "Site is Online"}
              </span>
            </div>
            {!maintenanceMsgEditing ? (
              <div className="flex items-start gap-2">
                <p className="text-xs text-slate-500 flex-1" style={{ fontStyle: "italic", lineHeight: 1.5 }}>"{maintenanceMsg}"</p>
                <button onClick={() => setMaintenanceMsgEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", padding: 0 }}>Edit</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea value={maintenanceMsgDraft} onChange={(e) => setMaintenanceMsgDraft(e.target.value)} rows={2} className="w-full rounded-xl text-xs text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 10px", outline: "none", fontFamily: "inherit", resize: "none" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveMaintenanceMessage} disabled={maintenanceLoading} className="flex-1 rounded-xl py-1.5 text-xs font-semibold text-white" style={{ background: "rgba(99,102,241,0.3)", border: "1px solid rgba(99,102,241,0.4)", cursor: "pointer" }}>Save</button>
                  <button onClick={() => { setMaintenanceMsgEditing(false); setMaintenanceMsgDraft(maintenanceMsg); }} className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search email or name…"
                className="bg-transparent text-white text-sm outline-none flex-1 min-w-0"
                style={{ fontFamily: "inherit" }}
              />
            </div>

            {/* Role filter */}
            <select
              value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1); }}
              className="rounded-xl text-sm text-white px-3 py-2"
              style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.09)", outline: "none", fontFamily: "inherit" }}
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>

            {/* Sync filter */}
            <select
              value={syncFilter} onChange={(e) => { setSyncFilter(e.target.value as any); setPage(1); }}
              className="rounded-xl text-sm text-white px-3 py-2"
              style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.09)", outline: "none", fontFamily: "inherit" }}
            >
              <option value="all">All Status</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending</option>
              <option value="not_in_list">Not in List</option>
            </select>

            {/* Actions */}
            <button
              onClick={() => setBulkImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer" }}
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={() => { setEditEntry(null); setEntryDrawerOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", cursor: "pointer", border: "none" }}
            >
              <Plus className="w-4 h-4" /> Add Email
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Header */}
            <div
              className="grid text-xs text-slate-500 uppercase tracking-wider px-4 py-3"
              style={{ gridTemplateColumns: "1fr 100px 120px auto", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span>Email / Name</span>
              <span>Role</span>
              <span>Sync Status</span>
              <span>Actions</span>
            </div>

            {listLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-slate-600">
                <Users className="w-10 h-10" />
                <p className="text-sm">No entries found</p>
              </div>
            ) : (
              entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="grid items-center px-4 py-3 hover:bg-white/5 transition-colors"
                  style={{ gridTemplateColumns: "1fr 100px 120px auto", borderBottom: i < entries.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                >
                  {/* Email / Name */}
                  <div>
                    <p className="text-sm text-white font-medium truncate">{entry.email}</p>
                    {entry.user_name && <p className="text-xs text-slate-500 truncate">{entry.user_name}</p>}
                    {!entry.is_active && (
                      <span className="text-xs text-slate-600">(inactive)</span>
                    )}
                  </div>

                  {/* Role */}
                  <span className={`text-xs font-semibold capitalize ${entry.role === "teacher" ? "text-amber-400" : "text-sky-400"}`}>
                    {entry.role ?? "—"}
                  </span>

                  {/* Sync status */}
                  <SyncBadge status={entry.sync_status ?? "pending"} />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditEntry(entry); setEntryDrawerOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  {entry.user_name && (
                    <button
                      onClick={() => setOverrideDrawer({ userId: 0, email: entry.email })}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      title="Subscription Override"
                    >
                      <LockKeyhole className="w-4 h-4" />
                    </button>
                  )}
                    <button
                      onClick={() => setDeleteConfirm(entry)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">{total} total entries</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-400 disabled:opacity-40 transition-colors hover:text-white hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: page <= 1 ? "not-allowed" : "pointer" }}
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-400">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-400 disabled:opacity-40 transition-colors hover:text-white hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: page >= totalPages ? "not-allowed" : "pointer" }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Drawers & Dialogs ───────────────────────────────────────────────── */}
      <AllowlistEntryDrawer
        open={entryDrawerOpen}
        onClose={() => { setEntryDrawerOpen(false); setEditEntry(null); }}
        onSaved={invalidate}
        editEntry={editEntry}
      />

      {overrideDrawer && (
        <OverrideDrawer
          open={true}
          onClose={() => setOverrideDrawer(null)}
          userId={overrideDrawer.userId}
          userEmail={overrideDrawer.email}
          onSaved={invalidate}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Remove from Allowlist"
        description={`Remove ${deleteConfirm?.email} from the allowlist? This will soft-delete the entry. The user can be re-added later.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteLoading}
      />

      {/* Bulk Import modal */}
      <AnimatePresence>
        {bulkImportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 50 }}
            onClick={() => { setBulkImportOpen(false); setBulkResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-lg"
              style={{ background: "#0F0F18", border: "1px solid rgba(255,255,255,0.10)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Bulk Import Emails</h3>
                <button onClick={() => { setBulkImportOpen(false); setBulkResult(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {!bulkResult ? (
                <>
                  <p className="text-slate-400 text-sm mb-3">Paste emails separated by newlines, commas, or semicolons.</p>
                  <textarea
                    value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                    rows={8} placeholder={"student1@example.com\nstudent2@example.com"}
                    className="w-full rounded-xl text-sm text-white resize-none mb-4"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", outline: "none", fontFamily: "monospace" }}
                  />
                  <button
                    onClick={handleBulkImport} disabled={bulkLoading || !bulkText.trim()}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", cursor: bulkLoading || !bulkText.trim() ? "not-allowed" : "pointer", border: "none", opacity: bulkLoading || !bulkText.trim() ? 0.5 : 1 }}
                  >
                    {bulkLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Import
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Added", val: bulkResult.added, color: "#10B981" },
                    { label: "Skipped", val: bulkResult.skipped, color: "#F59E0B" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className="font-semibold text-sm" style={{ color }}>{val}</span>
                    </div>
                  ))}
                  {bulkResult.errors?.length > 0 && (
                    <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <p className="text-xs text-red-400 font-semibold mb-1">Errors</p>
                      {bulkResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-red-300">{err}</p>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { setBulkImportOpen(false); setBulkResult(null); setBulkText(""); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-2"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
