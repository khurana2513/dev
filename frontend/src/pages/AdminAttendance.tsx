/**
 * AdminAttendance — Premium attendance marking system for admins.
 *
 * Features:
 *  - Today's Class quick-start cards (from schedules)
 *  - Repeat Recent cards for fast session creation
 *  - Attendance sheet with keyboard navigation (P/A/O/L keys)
 *  - Status filter tabs (All / Unmarked / Present / Absent / Break / Leave)
 *  - T-shirt double-tap: click Present once = present, click again = present + shirt
 *  - Floating save bar (pending / saving / saved / error + retry)
 *  - Three-layer data safety: visibilitychange flush → localStorage backup → mount recovery
 *  - Offline banner + retry on reconnect
 *  - Submit / Close session with summary dialog
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, X, Check, CheckCircle2, AlertTriangle, Loader2,
  Shirt, WifiOff, Calendar, Users, Trash2, Zap, Search,
  RotateCcw, MapPin, BookOpen, Layers, FileText, MessageSquare,
  Building2, Link, Copy, CheckCheck, Shield, Globe,
  TrendingUp, Activity, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  ClassSession, ClassSchedule, StudentEntry, AttendanceSheet,
  AttendanceStatus, BulkAttendancePayload, BulkAttendanceItem,
  SessionCreatePayload,
  getSessions, createSession, deleteSession, getAttendanceSheet,
  bulkMarkAttendance, deleteAttendanceRecord, getSchedules, startTodaySession, closeSession,
  getAttendanceMetrics, BRANCHES, COURSES,
} from "../lib/attendanceApi";
import {
  OrgResponse, InviteLinkResponse, InviteLinkCreate,
  getMyOrg, updateOrg, createInviteLink, listInviteLinks,
  TIER_LABELS, TIER_COLORS, buildInviteUrl,
} from "../lib/orgApi";
import { useAuth } from "../contexts/AuthContext";

// ── Design tokens (matches site design system) ────────────────────────────────
const T = {
  bg:         "#07070F",
  surface:    "rgba(255,255,255,0.025)",
  surface2:   "rgba(255,255,255,0.05)",
  surface3:   "rgba(255,255,255,0.08)",
  border:     "rgba(255,255,255,0.07)",
  borderSub:  "rgba(255,255,255,0.04)",
  purple:     "#7c5af6",
  purpleDim:  "rgba(124,90,246,0.12)",
  purpleBdr:  "rgba(124,90,246,0.25)",
  green:      "#22c55e",
  greenDim:   "rgba(34,197,94,0.1)",
  red:        "#f87171",
  redDim:     "rgba(248,113,113,0.1)",
  amber:      "#f59e0b",
  amberDim:   "rgba(245,158,11,0.1)",
  blue:       "#60a5fa",
  blueDim:    "rgba(96,165,250,0.1)",
  orange:     "#f97316",
  text:       "#f1f5f9",
  textSub:    "#94a3b8",
  textMuted:  "#64748b",
} as const;

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AttendanceStatus, {
  label: string; short: string;
  bg: string; text: string; bdr: string; dot: string;
}> = {
  present:  { label: "Present",  short: "P",  bg: "rgba(34,197,94,0.12)",   text: "#22c55e", bdr: "rgba(34,197,94,0.3)",   dot: "#22c55e" },
  absent:   { label: "Absent",   short: "A",  bg: "rgba(248,113,113,0.12)", text: "#f87171", bdr: "rgba(248,113,113,0.3)", dot: "#f87171" },
  on_break: { label: "On Break", short: "B",  bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", bdr: "rgba(245,158,11,0.3)",  dot: "#f59e0b" },
  leave:    { label: "Leave",    short: "L",  bg: "rgba(96,165,250,0.12)",  text: "#60a5fa", bdr: "rgba(96,165,250,0.3)",  dot: "#60a5fa" },
};
const STATUS_ORDER: AttendanceStatus[] = ["present", "absent", "on_break", "leave"];

// ── localStorage queue (layer 2/3 safety) ─────────────────────────────────────
const QUEUE_KEY = "attendance_queue_v2";
interface QueuedBatch { sessionId: number; payload: BulkAttendancePayload; savedAt: number; }
function readQueue(): QueuedBatch[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(q: QueuedBatch[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}
function clearQueueSession(id: number) { writeQueue(readQueue().filter(q => q.sessionId !== id)); }

// ── Date helpers ──────────────────────────────────────────────────────────────
function getTodayISO(): string { return new Date().toLocaleDateString("en-CA"); }
function sessionDateISO(iso: string): string { return new Date(iso).toLocaleDateString("en-CA"); }
function todayDOW(): number { const js = new Date().getDay(); return js === 0 ? 6 : js - 1; }
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// ── useOnlineStatus ───────────────────────────────────────────────────────────
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ── Shared field style (used in SheetPanel) ───────────────────────────────────
const fieldSt: React.CSSProperties = {
  width: "100%", background: T.surface2, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "9px 12px", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box",
};

// ── Modal field style (premium) ───────────────────────────────────────────────
const mFieldSt: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12, padding: "11px 14px", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s ease",
};

// ── CreateSessionModal ────────────────────────────────────────────────────────
interface CreateModalDefaults extends Partial<SessionCreatePayload> { dateStr?: string; }
function CreateSessionModal({ onClose, onCreate, isCreating, defaults = {} }: {
  onClose: () => void;
  onCreate: (data: SessionCreatePayload) => void;
  isCreating: boolean;
  defaults?: CreateModalDefaults;
}) {
  const [date,    setDate]    = useState(defaults.dateStr || getTodayISO());
  const [branch,  setBranch]  = useState(defaults.branch  || "");
  const [course,  setCourse]  = useState(defaults.course  || "");
  const [level,   setLevel]   = useState(defaults.level   || "");
  const [topic,   setTopic]   = useState(defaults.topic   || "");
  const [remarks, setRemarks] = useState(defaults.teacher_remarks || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      session_date: new Date(`${date}T00:00:00+05:30`).toISOString(),
      branch: branch || "All Branches",
      course: course || undefined,
      level: level || undefined,
      topic: topic || undefined,
      teacher_remarks: remarks || undefined,
      schedule_id: defaults.schedule_id,
    });
  };

  const lbSt: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 10, fontWeight: 700, color: T.textMuted,
    marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(10,11,26,0.98)", borderRadius: 22, width: "100%", maxWidth: 468, overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(124,90,246,0.22), 0 0 60px rgba(124,90,246,0.07) inset",
          border: "1px solid rgba(124,90,246,0.2)",
        }}
      >
        {/* Gradient accent top bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #7c5af6 0%, #a78bfa 55%, #818cf8 100%)" }} />

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(124,90,246,0.15)", border: "1px solid rgba(124,90,246,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Calendar style={{ width: 17, height: 17, color: T.purple }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>New Session</h3>
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>Schedule a class session for your students</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Date + Branch */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbSt}><Calendar style={{ width: 10, height: 10 }} />Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={mFieldSt} />
            </div>
            <div>
              <label style={lbSt}><MapPin style={{ width: 10, height: 10 }} />Branch</label>
              <select value={branch} onChange={e => setBranch(e.target.value)} style={mFieldSt}>
                <option value="">✦ All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Course + Level */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbSt}><BookOpen style={{ width: 10, height: 10 }} />Course</label>
              <select value={course} onChange={e => setCourse(e.target.value)} style={mFieldSt}>
                <option value="">All Courses</option>
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbSt}><Layers style={{ width: 10, height: 10 }} />Level</label>
              <input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. Level 1, Advanced…" style={mFieldSt} />
            </div>
          </div>

          {/* Topic */}
          <div>
            <label style={lbSt}><FileText style={{ width: 10, height: 10 }} />Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Today's topic or lesson name…" style={mFieldSt} />
          </div>

          {/* Remarks */}
          <div>
            <label style={lbSt}><MessageSquare style={{ width: 10, height: 10 }} />Remarks</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Any notes for this session…" style={{ ...mFieldSt, resize: "none" } as React.CSSProperties} />
          </div>

          {/* Branch hint when All Branches selected */}
          {!branch && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 13px", background: "rgba(124,90,246,0.07)", borderRadius: 10, border: "1px solid rgba(124,90,246,0.18)" }}>
              <Users style={{ width: 13, height: 13, color: T.purple, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
                <span style={{ color: T.purple, fontWeight: 600 }}>All Branches</span> — students from every branch will appear on the attendance sheet.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: T.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isCreating}
              style={{
                flex: 2, padding: "11px 0", borderRadius: 12,
                background: isCreating ? "rgba(124,90,246,0.4)" : "linear-gradient(135deg, #7c5af6 0%, #9061f9 100%)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: isCreating ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: isCreating ? "none" : "0 4px 22px rgba(124,90,246,0.38)",
                transition: "all 0.15s ease",
              }}
            >
              {isCreating
                ? <><Loader2 style={{ width: 13, height: 13, animation: "attn-spin 0.8s linear infinite" }} />Creating…</>
                : <><Plus style={{ width: 13, height: 13 }} />Create Session</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SessionItem ───────────────────────────────────────────────────────────────
function SessionItem({ session, isActive, onSelect, onDelete, isDeleting }: {
  session: ClassSession; isActive: boolean;
  onSelect: () => void; onDelete: () => void; isDeleting: boolean;
}) {
  const isToday = sessionDateISO(session.session_date) === getTodayISO();
  return (
    <div
      onClick={onSelect}
      style={{ padding: "10px 12px", borderRadius: 11, cursor: "pointer", background: isActive ? T.purpleDim : "transparent", border: `1px solid ${isActive ? T.purpleBdr : "transparent"}`, transition: "all 0.13s ease", marginBottom: 2 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: session.is_completed ? T.green : T.amber }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? T.purple : T.text }}>{isToday ? "Today" : shortDate(session.session_date)}</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          style={{ width: 20, height: 20, borderRadius: 6, background: "transparent", border: "none", cursor: isDeleting ? "not-allowed" : "pointer", color: T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}
        >
          {isDeleting ? <Loader2 style={{ width: 10, height: 10, animation: "attn-spin 0.8s linear infinite" }} /> : <Trash2 style={{ width: 10, height: 10 }} />}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: session.branch === "All Branches" ? T.purple : T.blue, background: session.branch === "All Branches" ? T.purpleDim : T.blueDim, padding: "1px 7px", borderRadius: 99 }}>{session.branch}</span>
        {session.course && <span style={{ fontSize: 10, color: T.textMuted, background: T.surface2, padding: "1px 7px", borderRadius: 99 }}>{session.course}</span>}
        {session.level  && <span style={{ fontSize: 10, color: T.textMuted, background: T.surface2, padding: "1px 7px", borderRadius: 99 }}>{session.level}</span>}
        {session.topic  && <span style={{ fontSize: 10, color: T.textMuted, fontStyle: "italic", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.topic}</span>}
      </div>
    </div>
  );
}

// ── StatusToggle — tap cycles through states; same-status tap = unmark ──────
// P cycle: null → present → present+shirt → null
// A / B / L cycle: null → marked → null
function StatusToggle({ status, tShirt, onChange, locked }: {
  status: AttendanceStatus | null;
  tShirt: boolean;
  onChange: (s: AttendanceStatus | null, t: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div
      style={{ display: "flex", gap: 3, opacity: locked ? 0.4 : 1 }}
      onClick={e => e.stopPropagation()}
      title={locked ? "Max 3 attendance marks per day reached" : undefined}
    >
      {STATUS_ORDER.map(s => {
        const cfg = STATUS_CFG[s];
        const active = status === s;
        const withShirt = active && s === "present" && tShirt;
        return (
          <button
            key={s}
            disabled={locked}
            onClick={() => {
              if (locked) return;
              if (s === "present") {
                if (status !== "present")       onChange("present", false);  // null → present
                else if (!tShirt)               onChange("present", true);   // present → present+shirt
                else                            onChange(null, false);        // present+shirt → unmark
              } else {
                // Single-tap toggles; same-status tap unmarks
                onChange(active ? null : s, false);
              }
            }}
            title={
              locked ? "Max 3 attendance marks per day reached" :
              s === "present"
                ? status !== "present" ? "Mark present"
                  : tShirt ? "Click to unmark"
                  : "Click again to add t-shirt 👕"
                : active ? `Click to unmark ${cfg.label}` : cfg.label
            }
            style={{
              padding: s === "on_break" ? "4px 7px" : "4px 9px",
              borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: active ? cfg.bg : "rgba(255,255,255,0.04)",
              color: active ? cfg.text : T.textMuted,
              border: `1px solid ${active ? cfg.bdr : "transparent"}`,
              cursor: locked ? "not-allowed" : "pointer", transition: "all 0.1s ease",
              display: "inline-flex", alignItems: "center", gap: 3,
            }}
          >
            {cfg.short}
            {withShirt && <Shirt style={{ width: 9, height: 9 }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── StudentRow ────────────────────────────────────────────────────────────────
type RowState = "idle" | "saving" | "saved" | "error";
function StudentRow({ student, status, tShirt, rowState, isFocused, onFocus, onChange }: {
  student: StudentEntry;
  status: AttendanceStatus | null;
  tShirt: boolean;
  rowState: RowState;
  isFocused: boolean;
  onFocus: () => void;
  onChange: (s: AttendanceStatus | null, t: boolean) => void;
}) {
  const cfg      = status ? STATUS_CFG[status] : null;
  const initials = (student.name || "?").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  return (
    <div
      onClick={onFocus}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 11,
        background: isFocused ? "rgba(124,90,246,0.06)" : cfg ? `${cfg.bg}55` : "transparent",
        border: `1px solid ${isFocused ? T.purpleBdr : cfg ? `${cfg.bdr}44` : "transparent"}`,
        cursor: "pointer", transition: "all 0.1s ease",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: cfg ? cfg.bg : T.surface2, border: `1px solid ${cfg ? cfg.bdr : T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: cfg ? cfg.text : T.textMuted,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {student.name}
          {status === "present" && tShirt && (
            <Shirt style={{ display: "inline", marginLeft: 4, width: 10, height: 10, color: T.orange, verticalAlign: -1 }} />
          )}
        </p>
        <p style={{ fontSize: 10, color: T.textMuted }}>
          {student.public_id ?? `#${student.student_profile_id}`}
          {student.course && ` · ${student.course}`}
          {student.today_attendance_count > 0 && (
            <span
              title={`Marked ${student.today_attendance_count}× today across sessions`}
              style={{
                marginLeft: 5,
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 700,
                background: student.today_attendance_count >= 3 ? "rgba(248,113,113,0.2)" : "rgba(245,158,11,0.2)",
                color: student.today_attendance_count >= 3 ? T.red : T.amber,
                border: `1px solid ${student.today_attendance_count >= 3 ? "rgba(248,113,113,0.35)" : "rgba(245,158,11,0.35)"}`,
              }}
            >
              {student.today_attendance_count}× today
            </span>
          )}
        </p>
      </div>
      <StatusToggle
        status={status}
        tShirt={tShirt}
        onChange={onChange}
        locked={student.today_attendance_count >= 3 && student.attendance_record_id === null}
      />
      <div style={{ width: 14, flexShrink: 0, display: "flex", justifyContent: "center" }}>
        {rowState === "saving" && <Loader2 style={{ width: 11, height: 11, color: T.textMuted, animation: "attn-spin 0.8s linear infinite" }} />}
        {rowState === "saved"  && <CheckCircle2 style={{ width: 11, height: 11, color: T.green }} />}
        {rowState === "error"  && <AlertTriangle style={{ width: 11, height: 11, color: T.red }} />}
      </div>
    </div>
  );
}

// ── FloatingSaveBar ───────────────────────────────────────────────────────────
function FloatingSaveBar({ phase, pendingCount, markedCount, onRetry, onFlushNow }: {
  phase: "idle" | "saving" | "saved" | "error";
  pendingCount: number;
  markedCount: number;
  onRetry: () => void;
  onFlushNow: () => void;
}) {
  if (phase === "idle" && pendingCount === 0) return null;
  let bg: string = T.surface2, bdr: string = T.border, color: string = T.textSub, msg = "";
  if      (phase === "saving")                      { bg = T.amberDim; bdr = "rgba(245,158,11,0.3)";  color = T.amber; msg = `Saving ${pendingCount} change${pendingCount !== 1 ? "s" : ""}…`; }
  else if (phase === "saved" || pendingCount === 0) { bg = T.greenDim; bdr = "rgba(34,197,94,0.3)";   color = T.green; msg = `✓ All saved${markedCount > 0 ? ` · ${markedCount} marked` : ""}`; }
  else if (phase === "error")                       { bg = T.redDim;   bdr = "rgba(248,113,113,0.3)"; color = T.red;   msg = `${pendingCount} change${pendingCount !== 1 ? "s" : ""} not saved`; }
  else                                              { bg = T.amberDim; bdr = "rgba(245,158,11,0.3)";  color = T.amber; msg = `${pendingCount} pending…`; }

  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 150, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, background: bg, border: `1px solid ${bdr}`, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color }}>{msg}</span>
      {phase === "error" && (
        <button onClick={onRetry} style={{ fontSize: 11, fontWeight: 600, color: T.red, background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 7, padding: "3px 10px", cursor: "pointer" }}>Retry</button>
      )}
      {pendingCount > 0 && phase !== "saving" && phase !== "error" && (
        <button onClick={onFlushNow} style={{ fontSize: 11, fontWeight: 600, color: T.purple, background: T.purpleDim, border: `1px solid ${T.purpleBdr}`, borderRadius: 7, padding: "3px 10px", cursor: "pointer" }}>Save now</button>
      )}
    </div>
  );
}

// ── SheetPanel ────────────────────────────────────────────────────────────────
type LocalRec   = { status: AttendanceStatus | null; tShirt: boolean };
type TabFilter  = "all" | "unmarked" | "present" | "absent" | "on_break" | "leave";

function SheetPanel({ session, isOnline, onSessionClose }: {
  session: ClassSession;
  isOnline: boolean;
  onSessionClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: sheet, isLoading, isError, refetch } = useQuery<AttendanceSheet>({
    queryKey: ["attn-sheet", session.id],
    queryFn:  () => getAttendanceSheet(session.id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [localData,    setLocalData]    = useState<Map<number, LocalRec>>(new Map());
  const [rowStates,    setRowStates]    = useState<Map<number, RowState>>(new Map());
  const [savePhase,    setSavePhase]    = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [markedCount,  setMarkedCount]  = useState(0);
  const [tab,          setTab]          = useState<TabFilter>("all");
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState<"id" | "name" | "unmarked">("id");
  const [focusedIdx,   setFocusedIdx]   = useState<number | null>(null);
  const [isClosing,    setIsClosing]    = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  // Refs for stale-closure safety
  const pendingRef   = useRef(new Map<number, BulkAttendanceItem>());
  const localDataRef = useRef(new Map<number, LocalRec>());
  const filteredRef  = useRef<StudentEntry[]>([]);
  const batchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(session.id);
  const initRef      = useRef(false);

  // Always current
  sessionIdRef.current = session.id;
  localDataRef.current = localData;

  // ─ Init from server data ─
  useEffect(() => {
    if (!sheet || initRef.current) return;
    initRef.current = true;
    const initial = new Map<number, LocalRec>();
    sheet.students.forEach(s => {
      initial.set(s.student_profile_id, { status: s.status, tShirt: s.t_shirt_worn });
    });
    // Layer 3: crash recovery from localStorage queue
    const queued = readQueue().find(q => q.sessionId === session.id);
    if (queued) {
      queued.payload.attendance_data.forEach(item => {
        initial.set(item.student_profile_id, { status: item.status, tShirt: item.t_shirt_worn ?? false });
      });
      setTimeout(() => { doFlush(queued.payload.attendance_data); clearQueueSession(session.id); }, 800);
    }
    setLocalData(initial);
    setMarkedCount(sheet.summary.marked);
  }, [sheet]); // eslint-disable-line

  // Reset when session changes
  useEffect(() => {
    initRef.current = false;
    pendingRef.current = new Map();
    setPendingCount(0);
    setSavePhase("idle");
    setSearch("");
    setTab("all");
    setFocusedIdx(null);
  }, [session.id]);

  // ─ Core flush ─
  const doFlush = useCallback(async (items?: BulkAttendanceItem[]) => {
    const toSave = items ?? Array.from(pendingRef.current.values());
    if (!toSave.length) return;
    setSavePhase("saving");
    setRowStates(prev => { const n = new Map(prev); toSave.forEach(i => n.set(i.student_profile_id, "saving")); return n; });
    try {
      await bulkMarkAttendance({ session_id: sessionIdRef.current, attendance_data: toSave });
      pendingRef.current = new Map();
      setPendingCount(0);
      setSavePhase("saved");
      setRowStates(prev => { const n = new Map(prev); toSave.forEach(i => n.set(i.student_profile_id, "saved")); return n; });
      setTimeout(() => {
        setSavePhase("idle");
        setRowStates(prev => { const n = new Map(prev); toSave.forEach(i => { if (n.get(i.student_profile_id) === "saved") n.set(i.student_profile_id, "idle"); }); return n; });
      }, 2500);
    } catch {
      setSavePhase("error");
      setRowStates(prev => { const n = new Map(prev); toSave.forEach(i => n.set(i.student_profile_id, "error")); return n; });
      writeQueue([...readQueue().filter(q => q.sessionId !== sessionIdRef.current), { sessionId: sessionIdRef.current, payload: { session_id: sessionIdRef.current, attendance_data: toSave }, savedAt: Date.now() }]);
    }
  }, []);

  const scheduleBatch = useCallback(() => {
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(() => doFlush(), 400);
  }, [doFlush]);

  // ─ Layer 1: visibilitychange flush; Layer 2: pagehide localStorage backup ─
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        if (batchTimer.current) clearTimeout(batchTimer.current);
        doFlush();
      }
    };
    const onUnload = () => {
      const pending = Array.from(pendingRef.current.values());
      if (pending.length) {
        writeQueue([...readQueue().filter(q => q.sessionId !== sessionIdRef.current), { sessionId: sessionIdRef.current, payload: { session_id: sessionIdRef.current, attendance_data: pending }, savedAt: Date.now() }]);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [doFlush]);

  // Flush on unmount / session switch
  useEffect(() => () => {
    if (batchTimer.current) clearTimeout(batchTimer.current);
    const pending = Array.from(pendingRef.current.values());
    if (pending.length) doFlush(pending);
  }, [session.id, doFlush]);

  // ─ Status change (supports null = unmark) ─
  const MAX_DAILY = 3;
  const handleChange = useCallback((studentId: number, status: AttendanceStatus | null, tShirt: boolean) => {
    // Enforce daily limit: only block when CREATING a new record (no attendance_record_id)
    if (status !== null && sheet) {
      const studentEntry = sheet.students.find(s => s.student_profile_id === studentId);
      if (studentEntry && studentEntry.attendance_record_id === null && studentEntry.today_attendance_count >= MAX_DAILY) {
        return; // silently blocked — badge already shows the cap
      }
    }
    setLocalData(prev => { const n = new Map(prev); n.set(studentId, { status, tShirt }); return n; });
    if (status === null) {
      // Unmark: cancel any pending mark, then delete the server record (404 is OK)
      pendingRef.current.delete(studentId);
      setPendingCount(pendingRef.current.size);
      setRowStates(prev => { const n = new Map(prev); n.set(studentId, "saving"); return n; });
      deleteAttendanceRecord(sessionIdRef.current, studentId)
        .then(() => { setRowStates(prev => { const n = new Map(prev); n.set(studentId, "idle"); return n; }); })
        .catch(() => { setRowStates(prev => { const n = new Map(prev); n.set(studentId, "idle"); return n; }); });
    } else {
      const item: BulkAttendanceItem = { session_id: sessionIdRef.current, student_profile_id: studentId, status, t_shirt_worn: tShirt };
      pendingRef.current.set(studentId, item);
      setPendingCount(pendingRef.current.size);
      setRowStates(prev => { const n = new Map(prev); n.set(studentId, "saving"); return n; });
      scheduleBatch();
    }
  }, [scheduleBatch]);

  // ─ Bulk mark ─
  const bulkMark = useCallback(async (status: AttendanceStatus | null) => {
    if (!sheet) return;
    if (status === null) {
      const cleared = new Map<number, LocalRec>();
      sheet.students.forEach(s => cleared.set(s.student_profile_id, { status: null, tShirt: false }));
      setLocalData(cleared);
      pendingRef.current = new Map();
      setPendingCount(0);
      return;
    }
    // Filter out students already at their daily limit who have no record in this session
    const items: BulkAttendanceItem[] = sheet.students
      .filter(s => !(s.attendance_record_id === null && s.today_attendance_count >= MAX_DAILY))
      .map(s => ({ session_id: sessionIdRef.current, student_profile_id: s.student_profile_id, status, t_shirt_worn: false }));
    setLocalData(() => { const m = new Map<number, LocalRec>(); sheet.students.forEach(s => m.set(s.student_profile_id, { status, tShirt: false })); return m; });
    items.forEach(i => pendingRef.current.set(i.student_profile_id, i));
    setPendingCount(pendingRef.current.size);
    await doFlush(items);
  }, [sheet, doFlush]);

  // ─ Filtered & sorted students ─
  const filteredStudents = useMemo(() => {
    if (!sheet) return [];
    return sheet.students
      .filter(s => {
        const st = localData.get(s.student_profile_id)?.status ?? null;
        if (tab === "all")      return true;
        if (tab === "unmarked") return st === null;
        return st === tab;
      })
      .filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.public_id?.toLowerCase().includes(q) ?? false);
      })
      .sort((a, b) => {
        if (sortBy === "name")     return a.name.localeCompare(b.name);
        if (sortBy === "unmarked") {
          const au = !localData.get(a.student_profile_id)?.status ? 0 : 1;
          const bu = !localData.get(b.student_profile_id)?.status ? 0 : 1;
          return au - bu;
        }
        const ai = a.public_id ? parseInt(a.public_id.split("-")[1] || "0") : 9999;
        const bi = b.public_id ? parseInt(b.public_id.split("-")[1] || "0") : 9999;
        return ai - bi;
      });
  }, [sheet, localData, tab, search, sortBy]);
  filteredRef.current = filteredStudents;

  // ─ Keyboard navigation ─
  useEffect(() => {
    // 'b' / 'B' map to on_break (button now shows "B"); 'o'/'O' kept for backward compat
    const KEY_MAP: Record<string, AttendanceStatus> = { p: "present", P: "present", a: "absent", A: "absent", b: "on_break", B: "on_break", o: "on_break", O: "on_break", l: "leave", L: "leave" };
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (focusedIdx === null) return;
      const students = filteredRef.current;
      const student  = students[focusedIdx];
      if (!student) return;
      const sid = student.student_profile_id;
      const cur = localDataRef.current.get(sid);
      const ks  = KEY_MAP[e.key];
      if (ks) {
        e.preventDefault();
        if (ks === "present") {
          // P cycle: null → present → present+shirt → null
          if (cur?.status !== "present")       handleChange(sid, "present", false);
          else if (!cur.tShirt)               handleChange(sid, "present", true);
          else                                handleChange(sid, null, false);
        } else {
          // Same-status tap = unmark; otherwise mark and advance
          if (cur?.status === ks) {
            handleChange(sid, null, false);
          } else {
            handleChange(sid, ks, false);
            if (focusedIdx < students.length - 1) setFocusedIdx(fi => fi !== null ? fi + 1 : 0);
          }
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault(); setFocusedIdx(fi => Math.min(students.length - 1, (fi ?? -1) + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault(); setFocusedIdx(fi => Math.max(0, (fi ?? 0) - 1));
      } else if (e.key === "Escape") {
        setFocusedIdx(null);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [focusedIdx, handleChange]);

  // ─ Summary ─
  const summary = useMemo(() => {
    if (!sheet) return null;
    let p = 0, a = 0, ob = 0, lv = 0, u = 0, ts = 0;
    sheet.students.forEach(s => {
      const rec = localData.get(s.student_profile_id);
      if (!rec?.status) { u++; return; }
      if      (rec.status === "present")  { p++;  if (rec.tShirt) ts++; }
      else if (rec.status === "absent")   a++;
      else if (rec.status === "on_break") ob++;
      else if (rec.status === "leave")    lv++;
    });
    return { present: p, absent: a, on_break: ob, leave: lv, unmarked: u, tshirt: ts, total: sheet.students.length };
  }, [sheet, localData]);

  const tabCounts: Record<TabFilter, number> = {
    all:      sheet?.students.length ?? 0,
    unmarked: summary?.unmarked ?? 0,
    present:  summary?.present  ?? 0,
    absent:   summary?.absent   ?? 0,
    on_break: summary?.on_break ?? 0,
    leave:    summary?.leave    ?? 0,
  };

  // ─ Close session ─
  const handleClose = async () => {
    setIsClosing(true);
    if (batchTimer.current) clearTimeout(batchTimer.current);
    await doFlush();
    try {
      await closeSession(session.id);
      queryClient.invalidateQueries({ queryKey: ["attn-sessions"] });
    } catch { /* still proceed */ }
    setIsClosing(false);
    setShowConfirm(false);
    onSessionClose();
  };

  const isToday = sessionDateISO(session.session_date) === getTodayISO();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: T.amberDim, borderBottom: "1px solid rgba(245,158,11,0.25)", padding: "7px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <WifiOff style={{ width: 13, height: 13, color: T.amber, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: T.amber }}>You're offline — changes saved locally, will sync when reconnected</span>
        </div>
      )}

      {/* Session header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${T.borderSub}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: session.branch === "All Branches" ? T.purple : T.blue, background: session.branch === "All Branches" ? T.purpleDim : T.blueDim, padding: "2px 8px", borderRadius: 99 }}>{session.branch}</span>
              {session.course && <span style={{ fontSize: 10, color: T.textMuted, background: T.surface2, padding: "2px 8px", borderRadius: 99 }}>{session.course}</span>}
              {session.level  && <span style={{ fontSize: 10, color: T.textMuted, background: T.surface2, padding: "2px 8px", borderRadius: 99 }}>{session.level}</span>}
            </div>
            <p style={{ fontSize: 12, color: T.textMuted }}>
              {isToday ? "Today" : shortDate(session.session_date)}
              {session.topic && ` · ${session.topic}`}
            </p>
            {summary && (
              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                {[
                  { l: "P",        v: summary.present,  c: T.green  },
                  { l: "A",        v: summary.absent,   c: T.red    },
                  { l: "OB",       v: summary.on_break, c: T.amber  },
                  { l: "L",        v: summary.leave,    c: T.blue   },
                  { l: "Unmarked", v: summary.unmarked, c: T.textMuted },
                ].filter(x => x.v > 0).map(({ l, v, c }) => (
                  <span key={l} style={{ fontSize: 11, color: c }}><span style={{ fontWeight: 700 }}>{v}</span> {l}</span>
                ))}
                {summary.tshirt > 0 && (
                  <span style={{ fontSize: 11, color: T.orange, display: "flex", alignItems: "center", gap: 3 }}>
                    <Shirt style={{ width: 10, height: 10 }} /><span style={{ fontWeight: 700 }}>{summary.tshirt}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => !session.is_completed && setShowConfirm(true)}
            disabled={isClosing || session.is_completed}
            style={{
              padding: "7px 14px", borderRadius: 10,
              cursor: session.is_completed ? "default" : "pointer",
              background: session.is_completed ? T.greenDim : T.purpleDim,
              border: `1px solid ${session.is_completed ? "rgba(34,197,94,0.3)" : T.purpleBdr}`,
              color: session.is_completed ? T.green : T.purple,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {isClosing ? <Loader2 style={{ width: 12, height: 12, animation: "attn-spin 0.8s linear infinite" }} /> : <Check style={{ width: 12, height: 12 }} />}
            {session.is_completed ? "Completed" : "Submit"}
          </button>
        </div>
        {/* Bulk actions */}
        <div style={{ display: "flex", gap: 5, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Bulk</span>
          {([
            { label: "All Present", s: "present"  as AttendanceStatus },
            { label: "All Absent",  s: "absent"   as AttendanceStatus },
            { label: "Clear",       s: null },
          ] as { label: string; s: AttendanceStatus | null }[]).map(({ label, s }) => (
            <button key={label} onClick={() => bulkMark(s)} style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", background: T.surface2, border: `1px solid ${T.border}`, color: T.textSub }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 2, padding: "8px 16px 0", borderBottom: `1px solid ${T.borderSub}`, overflowX: "auto", flexShrink: 0 }}>
        {([
          ["all",      "All"],
          ["unmarked", "Unmarked"],
          ["present",  "Present"],
          ["absent",   "Absent"],
          ["on_break", "Break"],
          ["leave",    "Leave"],
        ] as [TabFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "5px 11px", borderRadius: "8px 8px 0 0", fontSize: 11, fontWeight: 500, cursor: "pointer",
              background: tab === key ? T.surface2 : "transparent",
              color: tab === key ? T.text : T.textMuted,
              border: `1px solid ${tab === key ? T.border : "transparent"}`,
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.1s ease",
            }}
          >
            {label}
            {tabCounts[key] > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: tab === key ? T.purple : T.textMuted }}>{tabCounts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ padding: "8px 16px", display: "flex", gap: 7, flexShrink: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: T.textMuted, pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or ID…"
            style={{ width: "100%", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 9px 7px 28px", color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as "id" | "name" | "unmarked")} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 9px", color: T.textSub, fontSize: 11, outline: "none", cursor: "pointer" }}>
          <option value="id">ID order</option>
          <option value="name">Name A–Z</option>
          <option value="unmarked">Unmarked first</option>
        </select>
      </div>

      {/* Keyboard hint */}
      {focusedIdx !== null && (
        <div style={{ padding: "3px 16px 5px", display: "flex", gap: 10, flexShrink: 0, borderBottom: `1px solid ${T.borderSub}` }}>
          {[["P", "Present · tap again = +shirt"], ["A", "Absent"], ["O", "Break"], ["L", "Leave"], ["↑↓", "Navigate"], ["Esc", "Exit"]].map(([k, l]) => (
            <span key={k} style={{ fontSize: 10, color: T.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 5px", fontSize: 10, color: T.textSub }}>{k}</kbd>
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Student list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 100px" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>
            <Loader2 style={{ width: 22, height: 22, animation: "attn-spin 0.8s linear infinite", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13 }}>Loading students…</p>
          </div>
        ) : isError ? (
          <div style={{ padding: 28, textAlign: "center" }}>
            <p style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>Failed to load attendance sheet</p>
            <button onClick={() => refetch()} style={{ fontSize: 12, color: T.purple, background: T.purpleDim, border: `1px solid ${T.purpleBdr}`, borderRadius: 9, padding: "7px 16px", cursor: "pointer" }}>Retry</button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: T.textMuted, fontSize: 12 }}>
            {search ? `No students match "${search}"` : `No students in "${tab}" tab`}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {filteredStudents.map((student, idx) => {
              const rec = localData.get(student.student_profile_id) ?? { status: null, tShirt: false };
              return (
                <StudentRow
                  key={student.student_profile_id}
                  student={student}
                  status={rec.status}
                  tShirt={rec.tShirt}
                  rowState={rowStates.get(student.student_profile_id) ?? "idle"}
                  isFocused={focusedIdx === idx}
                  onFocus={() => setFocusedIdx(idx)}
                  onChange={(s, t) => handleChange(student.student_profile_id, s, t)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Floating save bar */}
      <FloatingSaveBar phase={savePhase} pendingCount={pendingCount} markedCount={markedCount} onRetry={() => doFlush()} onFlushNow={() => doFlush()} />

      {/* Submit confirmation */}
      {showConfirm && summary && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", padding: 16 }}
          onClick={() => setShowConfirm(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#0c0d1a", border: `1px solid ${T.border}`, borderRadius: 20, width: "100%", maxWidth: 360, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 5 }}>Submit Session</h3>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 18 }}>Mark this session as complete. You can still edit records afterwards.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Present",  val: summary.present,  c: T.green,    bg: T.greenDim  },
                { label: "Absent",   val: summary.absent,   c: T.red,      bg: T.redDim    },
                { label: "Unmarked", val: summary.unmarked, c: T.textMuted, bg: T.surface2  },
              ].map(({ label, val, c, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: "10px 0", textAlign: "center", border: `1px solid ${T.borderSub}` }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>
            {summary.tshirt > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "8px 12px", background: "rgba(249,115,22,0.08)", borderRadius: 10, border: "1px solid rgba(249,115,22,0.2)" }}>
                <Shirt style={{ width: 13, height: 13, color: T.orange, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.textMuted }}>
                  <span style={{ color: T.orange, fontWeight: 600 }}>{summary.tshirt}</span> student{summary.tshirt !== 1 ? "s" : ""} wore t-shirts
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: T.surface2, border: `1px solid ${T.border}`, color: T.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleClose} disabled={isClosing} style={{ flex: 2, padding: "10px 0", borderRadius: 10, background: T.purple, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {isClosing ? <><Loader2 style={{ width: 13, height: 13, animation: "attn-spin 0.8s linear infinite" }} />Submitting…</> : "Submit & Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AttendancMetricsBar — today + month at-a-glance ──────────────────────────
function AttendanceMetricsBar({ filterBranch, filterCourse }: {
  filterBranch: string; filterCourse: string;
}) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["attn-metrics", filterBranch, filterCourse],
    queryFn:  () => getAttendanceMetrics({
      branch: filterBranch || undefined,
      course: filterCourse || undefined,
    }),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (isLoading || !metrics) {
    return (
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ height: 46, borderRadius: 10, background: "rgba(255,255,255,0.03)", animation: "attn-pulse 1.4s ease infinite" }} />
      </div>
    );
  }

  const todayPct  = metrics.date_stats.attendance_percentage;
  const monthPct  = metrics.monthly_stats.attendance_percentage;
  const todayTotal = metrics.date_stats.total_marked;
  const todayPresent = metrics.date_stats.present;
  const monthPresent = metrics.monthly_stats.present;
  const monthTotal   = metrics.monthly_stats.total;

  // Donut ring helper
  const Ring = ({ pct, size = 38, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 8, fontWeight: 700, fill: color }}>
          {pct < 1 && pct > 0 ? "<1" : Math.round(pct)}%
        </text>
      </svg>
    );
  };

  return (
    <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 8 }}>
      {/* Today */}
      <div style={{ flex: 1, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 11, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <Ring pct={todayPct} color={T.green} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Today</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.green, lineHeight: 1 }}>{todayPresent}<span style={{ color: T.textMuted, fontWeight: 400, fontSize: 10 }}>/{todayTotal}</span></p>
          <p style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>present</p>
        </div>
      </div>
      {/* Month */}
      <div style={{ flex: 1, background: "rgba(124,90,246,0.06)", border: "1px solid rgba(124,90,246,0.15)", borderRadius: 11, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <Ring pct={monthPct} color={T.purple} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>This Month</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.purple, lineHeight: 1 }}>{monthPresent}<span style={{ color: T.textMuted, fontWeight: 400, fontSize: 10 }}>/{monthTotal}</span></p>
          <p style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>present</p>
        </div>
      </div>
    </div>
  );
}

// ── MiniCalendar — month view with session day indicators ─────────────────────
function MiniCalendar({ sessions }: { sessions: ClassSession[] }) {
  const [viewDate,   setViewDate]   = useState(() => new Date());

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Build a date→sessions lookup from the sessions prop
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    sessions.forEach(s => {
      const key = sessionDateISO(s.session_date);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    });
    return map;
  }, [sessions]);

  const todayISO = getTodayISO();

  // Calendar grid helpers
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first: 0=Mon…6=Sun
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = viewDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ padding: "12px 12px 8px" }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeft style={{ width: 12, height: 12 }} />
        </button>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.textSub }}>{monthName}</p>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronRight style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 3 }}>
        {DOW_LABELS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: T.textMuted, letterSpacing: "0.04em" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const daySessions = sessionsByDay.get(iso) ?? [];
          const hasSession  = daySessions.length > 0;
          const allDone     = hasSession && daySessions.every(s => s.is_completed);
          const isToday     = iso === todayISO;

          return (
            <div
              key={day}
              title={hasSession ? `${daySessions.length} session${daySessions.length > 1 ? "s" : ""}` : undefined}
              style={{
                position: "relative",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: 28, borderRadius: 7,
                background: isToday
                  ? "rgba(124,90,246,0.25)"
                  : hasSession ? (allDone ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)") : "transparent",
                border: `1px solid ${isToday ? "rgba(124,90,246,0.5)" : hasSession ? (allDone ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)") : "transparent"}`,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 500, color: isToday ? T.purple : hasSession ? (allDone ? T.green : T.amber) : T.textMuted, lineHeight: 1 }}>
                {day}
              </span>
              {hasSession && (
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {daySessions.slice(0, 3).map((_, si) => (
                    <div key={si} style={{ width: 3, height: 3, borderRadius: "50%", background: allDone ? T.green : T.amber }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          { color: T.green, label: "Completed" },
          { color: T.amber, label: "Open" },
          { color: T.purple, label: "Today" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: T.textMuted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OrgPanel — slide-over drawer for organisation settings & invite links ─────
function OrgPanel({ org, onClose }: { org: OrgResponse; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  const { data: inviteLinks = [], isLoading: linksLoading } = useQuery<InviteLinkResponse[]>({
    queryKey: ["org-invite-links", org.id],
    queryFn:  () => listInviteLinks(org.id),
    staleTime: 30_000,
  });

  const createLinkMut = useMutation({
    mutationFn: (data: InviteLinkCreate) => createInviteLink(org.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-invite-links", org.id] });
      setCreatingLink(false);
    },
    onError: () => setCreatingLink(false),
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(buildInviteUrl(code)).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const tier = org.subscription_tier?.toLowerCase() ?? "free";
  const tierCfg = TIER_COLORS[tier] ?? TIER_COLORS.free;

  const activeLinkCount = inviteLinks.filter(l => l.is_active).length;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 440, background: "#0a0b1a",
          borderLeft: "1px solid rgba(124,90,246,0.2)", display: "flex", flexDirection: "column",
          boxShadow: "-32px 0 80px rgba(0,0,0,0.6)",
          overflowY: "auto",
        }}
      >
        {/* Gradient accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #7c5af6 0%, #a78bfa 100%)" }} />

        {/* Header */}
        <div style={{ padding: "24px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, marginTop: 3 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(124,90,246,0.15)", border: "1px solid rgba(124,90,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 style={{ width: 19, height: 19, color: T.purple }} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{org.name}</h2>
                <p style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>@{org.slug}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: tierCfg.bg, color: tierCfg.text, border: `1px solid ${tierCfg.border}` }}>
              {TIER_LABELS[tier] ?? tier} Plan
            </span>
            {org.is_verified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: T.green, border: "1px solid rgba(34,197,94,0.3)" }}>
                <Shield style={{ width: 10, height: 10 }} />Verified
              </span>
            )}
            <span style={{ fontSize: 11, color: T.textMuted, padding: "3px 10px", borderRadius: 99, background: T.surface2, border: `1px solid ${T.border}` }}>
              Up to {org.max_students} students
            </span>
            {org.id_prefix && (
              <span style={{ fontSize: 11, color: T.textMuted, padding: "3px 10px", borderRadius: 99, background: T.surface2, border: `1px solid ${T.border}` }}>
                Prefix: {org.id_prefix}
              </span>
            )}
          </div>

          {/* Optional contact info */}
          {(org.contact_email || org.city || org.website_url) && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
              {org.contact_email && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
                  <MessageSquare style={{ width: 11, height: 11, flexShrink: 0 }} />
                  {org.contact_email}
                </div>
              )}
              {org.city && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
                  <MapPin style={{ width: 11, height: 11, flexShrink: 0 }} />
                  {org.city}
                </div>
              )}
              {org.website_url && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
                  <Globe style={{ width: 11, height: 11, flexShrink: 0 }} />
                  <a href={org.website_url} target="_blank" rel="noopener noreferrer" style={{ color: T.blue, textDecoration: "none" }}>{org.website_url}</a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invite links section */}
        <div style={{ flex: 1, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Invite Links</p>
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                Share a link so students can join your organisation
              </p>
            </div>
            <button
              onClick={() => {
                setCreatingLink(true);
                createLinkMut.mutate({ role: "student", max_uses: 100 });
              }}
              disabled={createLinkMut.isPending || creatingLink}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 9, background: T.purple, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: createLinkMut.isPending ? "not-allowed" : "pointer", opacity: createLinkMut.isPending ? 0.65 : 1 }}
            >
              {createLinkMut.isPending
                ? <Loader2 style={{ width: 12, height: 12, animation: "attn-spin 0.8s linear infinite" }} />
                : <Plus style={{ width: 12, height: 12 }} />}
              New Link
            </button>
          </div>

          {linksLoading ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <Loader2 style={{ width: 18, height: 18, color: T.textMuted, animation: "attn-spin 0.8s linear infinite", margin: "0 auto" }} />
            </div>
          ) : inviteLinks.length === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center" }}>
              <Link style={{ width: 28, height: 28, color: T.textMuted, margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: 13, color: T.textSub, fontWeight: 500 }}>No invite links yet</p>
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Create one above to start inviting students</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeLinkCount > 0 && (
                <p style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Active ({activeLinkCount})</p>
              )}
              {inviteLinks.map(link => (
                <div
                  key={link.id}
                  style={{
                    background: link.is_active ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                    border: `1px solid ${link.is_active ? "rgba(124,90,246,0.2)" : T.borderSub}`,
                    borderRadius: 12, padding: "13px 14px",
                    opacity: link.is_active ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: link.is_active ? T.text : T.textMuted, letterSpacing: "0.03em" }}>{link.code}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: link.role === "student" ? "rgba(96,165,250,0.12)" : "rgba(245,158,11,0.12)", color: link.role === "student" ? T.blue : T.amber, border: `1px solid ${link.role === "student" ? "rgba(96,165,250,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                        {link.role}
                      </span>
                    </div>
                    {link.is_active && (
                      <button
                        onClick={() => handleCopy(link.code)}
                        title="Copy join link"
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: copied === link.code ? "rgba(34,197,94,0.1)" : T.surface2, border: `1px solid ${copied === link.code ? "rgba(34,197,94,0.3)" : T.border}`, color: copied === link.code ? T.green : T.textSub, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease" }}
                      >
                        {copied === link.code
                          ? <><CheckCheck style={{ width: 11, height: 11 }} />Copied!</>
                          : <><Copy style={{ width: 11, height: 11 }} />Copy Link</>}
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      <span style={{ color: T.text, fontWeight: 600 }}>{link.uses_count}</span> / {link.max_uses} uses
                    </span>
                    {link.expires_at && (
                      <span style={{ fontSize: 11, color: T.textMuted }}>
                        Expires {new Date(link.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {!link.is_active && (
                      <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AdminAttendance — Main page ───────────────────────────────────────────────
export default function AdminAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const [activeSession,      setActiveSession]      = useState<ClassSession | null>(null);
  const [showCreateModal,    setShowCreateModal]    = useState(false);
  const [createDefaults,     setCreateDefaults]     = useState<CreateModalDefaults>({});
  const [filterBranch,       setFilterBranch]       = useState("");
  const [filterCourse,       setFilterCourse]       = useState("");
  const [deletingId,         setDeletingId]         = useState<number | null>(null);
  const [startingScheduleId, setStartingScheduleId] = useState<number | null>(null);
  const [showOrgPanel,       setShowOrgPanel]       = useState(false);

  if (user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: T.textMuted, fontSize: 14 }}>Admin access only</p>
      </div>
    );
  }

  // Queries
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ClassSession[]>({
    queryKey: ["attn-sessions", filterBranch, filterCourse],
    queryFn:  () => getSessions({ branch: filterBranch || undefined, course: filterCourse || undefined }),
    staleTime: 30_000,
  });

  const { data: schedules = [] } = useQuery<ClassSchedule[]>({
    queryKey: ["attn-schedules"],
    queryFn:  () => getSchedules(),
    staleTime: 5 * 60_000,
  });

  // Org data — gracefully returns null if admin has no org yet
  const { data: orgData } = useQuery<OrgResponse | null>({
    queryKey: ["org-mine"],
    queryFn:  () => getMyOrg(),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const todayDow       = todayDOW();
  const todayStr       = getTodayISO();
  const todaySchedules = schedules.filter(s => s.schedule_days.includes(todayDow));
  const todaySessions  = sessions.filter(s => sessionDateISO(s.session_date) === todayStr);
  const recentSessions = sessions.filter(s => sessionDateISO(s.session_date) !== todayStr).slice(0, 4);

  // Mutations
  const createMut = useMutation({
    mutationFn: createSession,
    onSuccess: newSession => {
      queryClient.invalidateQueries({ queryKey: ["attn-sessions"] });
      setShowCreateModal(false);
      setActiveSession(newSession);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["attn-sessions"] });
      if (activeSession?.id === id) setActiveSession(null);
    },
  });

  const startTodayMut = useMutation({
    mutationFn: startTodaySession,
    onSuccess: session => {
      queryClient.invalidateQueries({ queryKey: ["attn-sessions"] });
      setActiveSession(session);
      setStartingScheduleId(null);
    },
    onError: () => setStartingScheduleId(null),
  });

  const activeSessionId  = activeSession?.id ?? -1; // stable ref

  return (
    <div style={{ minHeight: "100vh", height: "100vh", background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes attn-spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        select option { background: #141729; color: #f1f5f9; }
        .attn-modal-field:focus { border-color: rgba(124,90,246,0.55) !important; box-shadow: 0 0 0 3px rgba(124,90,246,0.12) !important; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: "rgba(7,7,15,0.97)", borderBottom: `1px solid ${T.border}`, padding: "12px 20px", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1 }}>Attendance</h1>
            {orgData && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: T.purpleDim, border: `1px solid ${T.purpleBdr}`, padding: "2px 9px", borderRadius: 99, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                {orgData.name}
              </span>
            )}
            {orgData?.is_verified && (
              <span title="Verified Organisation" style={{ display: "inline-flex", alignItems: "center" }}>
                <Shield style={{ width: 12, height: 12, color: T.green }} />
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Manage class sessions</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {orgData && (
            <button
              onClick={() => setShowOrgPanel(true)}
              title="Organisation Settings"
              style={{ width: 34, height: 34, borderRadius: 9, background: T.surface2, border: `1px solid ${T.border}`, color: T.textSub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Building2 style={{ width: 15, height: 15 }} />
            </button>
          )}
          <button
            onClick={() => { setCreateDefaults({}); setShowCreateModal(true); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 15px", borderRadius: 10, cursor: "pointer", background: T.purple, border: "none", color: "#fff", fontSize: 13, fontWeight: 600 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> New Session
          </button>
          {!isOnline && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: T.amber }}>
              <WifiOff style={{ width: 13, height: 13 }} /><span style={{ fontSize: 11 }}>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Content — always 2-column split */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left sidebar */}
          <div style={{ width: 290, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Filters */}
            <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${T.borderSub}`, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", color: filterBranch ? T.text : T.textMuted, fontSize: 11, outline: "none", cursor: "pointer" }}>
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
                <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", color: filterCourse ? T.text : T.textMuted, fontSize: 11, outline: "none", cursor: "pointer" }}>
                  <option value="">All Courses</option>
                  {COURSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Attendance metrics strip */}
            <AttendanceMetricsBar filterBranch={filterBranch} filterCourse={filterCourse} />

            {/* Scrollable section */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* Calendar */}
              <MiniCalendar sessions={sessions} />

              <div style={{ padding: "0 12px 10px" }}>
              {/* Today's class cards */}
              {todaySchedules.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Today's Classes</p>
                  {todaySchedules.map(sched => {
                    const existing   = todaySessions.find(s => s.branch === sched.branch && (!sched.course || s.course === sched.course));
                    const isStarting = startingScheduleId === sched.id;
                    return (
                      <div key={sched.id} style={{ background: T.surface, border: `1px solid ${existing ? T.purpleBdr : T.border}`, borderRadius: 11, padding: "9px 10px", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {sched.branch}{sched.course ? ` · ${sched.course}` : ""}
                            </p>
                            {sched.batch_name && <p style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{sched.batch_name}</p>}
                          </div>
                          {existing ? (
                            <button onClick={() => setActiveSession(existing)} style={{ padding: "4px 11px", borderRadius: 7, background: T.purpleDim, border: `1px solid ${T.purpleBdr}`, color: T.purple, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                              Open ↗
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setStartingScheduleId(sched.id);
                                startTodayMut.mutate({ branch: sched.branch, course: sched.course ?? undefined, level: sched.level ?? undefined, batch_name: sched.batch_name ?? undefined, schedule_id: sched.id });
                              }}
                              disabled={isStarting}
                              style={{ padding: "4px 11px", borderRadius: 7, background: T.purple, border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: isStarting ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              {isStarting ? <Loader2 style={{ width: 10, height: 10, animation: "attn-spin 0.8s linear infinite" }} /> : <Zap style={{ width: 10, height: 10 }} />}
                              Start
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Repeat recent */}
              {recentSessions.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Repeat Recent</p>
                  {recentSessions.map(s => (
                    <div key={s.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 10px", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.branch}{s.course ? ` · ${s.course}` : ""}
                        </p>
                        <p style={{ fontSize: 10, color: T.textMuted }}>{shortDate(s.session_date)}</p>
                      </div>
                      <button
                        onClick={() => {
                          setCreateDefaults({ branch: s.branch, course: s.course ?? undefined, level: s.level ?? undefined, batch_name: s.batch_name ?? undefined, topic: s.topic ?? undefined, teacher_remarks: s.teacher_remarks ?? undefined });
                          setShowCreateModal(true);
                        }}
                        style={{ padding: "3px 9px", borderRadius: 7, fontSize: 10, fontWeight: 500, cursor: "pointer", background: T.surface2, border: `1px solid ${T.border}`, color: T.textSub, whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}
                      >
                        <RotateCcw style={{ width: 9, height: 9 }} /> Repeat
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* All sessions */}
              {sessionsLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: T.textMuted }}>
                  <Loader2 style={{ width: 16, height: 16, animation: "attn-spin 0.8s linear infinite", margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 12 }}>Loading…</p>
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center" }}>
                  <Calendar style={{ width: 24, height: 24, color: T.textMuted, margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>No sessions yet</p>
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>Create one to get started</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>All Sessions</p>
                  {sessions.map(s => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={activeSessionId === s.id}
                      onSelect={() => setActiveSession(s)}
                      onDelete={() => {
                        if (!window.confirm(`Delete attendance session for ${shortDate(s.session_date)}? All records will be removed.`)) return;
                        setDeletingId(s.id);
                        deleteMut.mutate(s.id, { onSettled: () => setDeletingId(null) });
                      }}
                      isDeleting={deletingId === s.id}
                    />
                  ))}
                </>
              )}
              </div>{/* /padding-div */}
            </div>{/* /scrollable */}
          </div>{/* /left-sidebar */}

          {/* Right panel — attendance sheet when session active, empty state otherwise */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {activeSession ? (
              <SheetPanel session={activeSession} isOnline={isOnline} onSessionClose={() => setActiveSession(null)} />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                <div style={{ textAlign: "center", maxWidth: 300 }}>
                  <div style={{ width: 62, height: 62, borderRadius: 18, background: T.purpleDim, border: `1px solid ${T.purpleBdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <Users style={{ width: 26, height: 26, color: T.purple }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>Select a Session</h2>
                  <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
                    Choose a session from the left to take attendance, or start today's class with one tap.
                  </p>
                  <button
                    onClick={() => { setCreateDefaults({}); setShowCreateModal(true); }}
                    style={{ marginTop: 20, padding: "10px 24px", borderRadius: 12, background: T.purple, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Plus style={{ width: 14, height: 14 }} /> Create Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Create session modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={data => createMut.mutate(data)}
          isCreating={createMut.isPending}
          defaults={createDefaults}
        />
      )}

      {/* Org settings panel */}
      {showOrgPanel && orgData && (
        <OrgPanel org={orgData} onClose={() => setShowOrgPanel(false)} />
      )}
    </div>
  );
}
