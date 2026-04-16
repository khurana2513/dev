/**
 * AdminFees — Premium fee management cockpit.
 * Tabs: Overview · Students · Plans · Transactions
 */

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Users, FileText, ArrowDownCircle, Search,
  Plus, CheckCircle2, AlertTriangle, RefreshCw, X,
  Wallet, CreditCard, TrendingUp, Calendar, ChevronDown,
  Clock, IndianRupee, Filter, Eye, Edit2, Trash2, Check,
  ChevronRight, Download, Flame,
} from "lucide-react";
import {
  fetchFeeDashboardStats, fetchFeeStudents, fetchStudentFeeSummary,
  fetchFeePlans, createFeePlan, updateFeePlan, deleteFeePlan,
  createFeeAssignment, recordFeePayment, fetchFeeTransactions,
  fetchMonthlyCollection, updateFeeAssignment,
} from "../lib/feesApi";
import { getStudentsForAttendance } from "../lib/attendanceApi";
import type {
  FeePlan, FeeTransaction, StudentFeeSummary, CreateFeePlanPayload,
  CreateFeeAssignmentPayload, RecordPaymentPayload, PaymentMode,
} from "../types/fees";
import {
  getFeeStatus, STATUS_CONFIG, PAYMENT_MODE_CONFIG,
  formatINR, formatDuration,
} from "../types/fees";

// ─── Colour token ─────────────────────────────────────────────────────────────
const C = {
  bg: "#07070F",
  surface: "rgba(255,255,255,0.025)",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  text: "#e2e8f0",
  muted: "rgba(255,255,255,0.4)",
  dim: "rgba(255,255,255,0.22)",
  purple: "#7c3aed",
  purpleGlow: "rgba(124,58,237,0.45)",
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  mono: "'JetBrains Mono', monospace",
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }: { msg: string; type: "ok" | "err"; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      onAnimationComplete={(def) => { if (def === "animate") setTimeout(onDone, 2800); }}
      style={{
        position: "fixed", top: 24, right: 24, zIndex: 9999,
        padding: "12px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600,
        display: "flex", alignItems: "center", gap: 10,
        background: type === "ok" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${type === "ok" ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
        color: type === "ok" ? "#34d399" : "#f87171",
        backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {type === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {msg}
    </motion.div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color, gradient,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; gradient: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
        padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 10,
        boxShadow: "0 2px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 12, background: gradient,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
          }}
        >{icon}</div>
        {sub && <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>{sub}</span>}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{label}</div>
      </div>
    </motion.div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(6px)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#0d0d1a", border: `1px solid ${C.border}`, borderRadius: 22,
            padding: 28, width: "100%", maxWidth: wide ? 760 : 520,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{title}</h3>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}
            ><X size={15} /></button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Text input helper ────────────────────────────────────────────────────────
function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{label}</label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: C.dim }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, color: C.text, outline: "none",
  transition: "border-color 0.15s", width: "100%",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

// ─── Create/Edit Fee Plan Modal ───────────────────────────────────────────────
function PlanFormModal({
  plan, onClose, onSaved,
}: { plan?: FeePlan | null; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateFeePlanPayload>({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    branch: plan?.branch ?? "",
    course: plan?.course ?? "",
    level: plan?.level ?? "",
    fee_amount: plan?.fee_amount ?? 0,
    fee_duration_days: plan?.fee_duration_days ?? 30,
    currency: plan?.currency ?? "INR",
    is_active: plan?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: () =>
      plan
        ? updateFeePlan(plan.id, form)
        : createFeePlan(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-plans"] });
      onSaved();
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Plan name is required";
    if (form.fee_amount <= 0) e.fee_amount = "Amount must be greater than 0";
    if (form.fee_duration_days <= 0) e.fee_duration_days = "Duration must be at least 1 day";
    setErrors(e);
    if (Object.keys(e).length === 0) saveMut.mutate();
  };

  const f = (k: keyof CreateFeePlanPayload, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal title={plan ? "Edit Fee Plan" : "Create Fee Plan"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        <Field label="Plan Name" error={errors.name}>
          <input style={inputStyle} value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="e.g. Monthly Abacus - Rohini" />
        </Field>
        <Field label="Description" >
          <input style={inputStyle} value={form.description ?? ""} onChange={(e) => f("description", e.target.value)} placeholder="Optional short description" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Fee Amount (₹)" error={errors.fee_amount}>
            <input type="number" style={inputStyle} value={form.fee_amount} min={0}
              onChange={(e) => f("fee_amount", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Billing Period" error={errors.fee_duration_days} hint="30 = monthly, 90 = quarterly">
            <select style={selectStyle} value={form.fee_duration_days} onChange={(e) => f("fee_duration_days", parseInt(e.target.value))}>
              <option value={7}>Weekly (7 days)</option>
              <option value={30}>Monthly (30 days)</option>
              <option value={90}>Quarterly (90 days)</option>
              <option value={180}>Half-Yearly (180 days)</option>
              <option value={365}>Annual (365 days)</option>
              <option value={0}>One-Time</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Branch (optional)">
            <input style={inputStyle} value={form.branch ?? ""} onChange={(e) => f("branch", e.target.value)} placeholder="All branches" />
          </Field>
          <Field label="Course (optional)">
            <input style={inputStyle} value={form.course ?? ""} onChange={(e) => f("course", e.target.value)} placeholder="All courses" />
          </Field>
          <Field label="Level (optional)">
            <input style={inputStyle} value={form.level ?? ""} onChange={(e) => f("level", e.target.value)} placeholder="All levels" />
          </Field>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <button
            onClick={() => f("is_active", !form.is_active)}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: form.is_active ? C.green : "rgba(255,255,255,0.1)",
              border: "none", cursor: "pointer", position: "relative" as const,
              transition: "background 0.2s",
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: form.is_active ? 20 : 3,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s",
            }} />
          </button>
          <span style={{ fontSize: 13, color: C.muted }}>Plan is active</span>
        </div>

        {saveMut.isError && (
          <div style={{ fontSize: 13, color: C.red, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
            Failed to save plan. Please try again.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={handleSubmit} disabled={saveMut.isPending}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saveMut.isPending ? 0.6 : 1 }}>
            {saveMut.isPending ? "Saving…" : plan ? "Update Plan" : "Create Plan"}
          </button>
          <button onClick={onClose} style={{ padding: "12px 18px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Assign Plan Modal ─────────────────────────────────────────────────────────
function AssignPlanModal({
  studentProfileId, studentName, onClose, onSaved,
}: { studentProfileId?: number; studentName?: string; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["fee-plans"], queryFn: () => fetchFeePlans({ is_active: true }), staleTime: 60_000 });
  const { data: allStudents = [] } = useQuery({ queryKey: ["students-simple"], queryFn: () => getStudentsForAttendance(), staleTime: 60_000 });

  const [form, setForm] = useState<CreateFeeAssignmentPayload>({
    student_profile_id: studentProfileId ?? 0,
    fee_plan_id: 0,
    discount_amount: 0,
    discount_percentage: 0,
    start_date: new Date().toISOString().slice(0, 10),
  });
  const [customFee, setCustomFee] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedPlan = plans.find((p) => p.id === form.fee_plan_id);
  const baseAmt = customFee ? parseFloat(customFee) : (selectedPlan?.fee_amount ?? 0);
  const discountFixed = form.discount_amount ?? 0;
  const discountPct = form.discount_percentage ?? 0;
  const effective = Math.max(0, baseAmt - discountFixed - (baseAmt * discountPct / 100));

  const mut = useMutation({
    mutationFn: () => createFeeAssignment({
      ...form,
      custom_fee_amount: customFee ? parseFloat(customFee) : undefined,
      remarks: remarks || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-students"] });
      qc.invalidateQueries({ queryKey: ["fee-dashboard"] });
      onSaved();
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!form.student_profile_id) e.student = "Select a student";
    if (!form.fee_plan_id) e.plan = "Select a fee plan";
    if (!form.start_date) e.start_date = "Start date is required";
    setErrors(e);
    if (Object.keys(e).length === 0) mut.mutate();
  };

  return (
    <Modal title={`Assign Fee Plan${studentName ? " — " + studentName : ""}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        {!studentProfileId && (
          <Field label="Student" error={errors.student}>
            <select style={selectStyle} value={form.student_profile_id || ""} onChange={(e) => setForm((p) => ({ ...p, student_profile_id: parseInt(e.target.value) || 0 }))}>
              <option value="">— Select student —</option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name || s.name} {s.public_id ? `(${s.public_id})` : ""}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Fee Plan" error={errors.plan}>
          <select style={selectStyle} value={form.fee_plan_id || ""} onChange={(e) => setForm((p) => ({ ...p, fee_plan_id: parseInt(e.target.value) || 0 }))}>
            <option value="">— Select plan —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatINR(p.fee_amount)} / {formatDuration(p.fee_duration_days)}</option>
            ))}
          </select>
        </Field>
        {selectedPlan && (
          <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: C.muted }}>
            <span style={{ color: C.purple, fontWeight: 700 }}>{selectedPlan.name}</span>
            {" · "}{formatINR(selectedPlan.fee_amount)} per {formatDuration(selectedPlan.fee_duration_days)}
            {selectedPlan.branch && <span style={{ marginLeft: 10, fontSize: 11, background: "rgba(124,58,237,0.12)", padding: "2px 8px", borderRadius: 100, color: "#a78bfa" }}>{selectedPlan.branch}</span>}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Custom Amount (optional)" hint="Override plan amount">
            <input type="number" style={inputStyle} value={customFee} min={0} onChange={(e) => setCustomFee(e.target.value)} placeholder={selectedPlan ? String(selectedPlan.fee_amount) : "Use plan amount"} />
          </Field>
          <Field label="Start Date" error={errors.start_date}>
            <input type="date" style={inputStyle} value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Discount (₹)" hint="Fixed discount amount">
            <input type="number" style={inputStyle} value={form.discount_amount} min={0} onChange={(e) => setForm((p) => ({ ...p, discount_amount: parseFloat(e.target.value) || 0 }))} />
          </Field>
          <Field label="Discount (%)" hint="Percentage discount">
            <input type="number" style={inputStyle} value={form.discount_percentage} min={0} max={100} onChange={(e) => setForm((p) => ({ ...p, discount_percentage: parseFloat(e.target.value) || 0 }))} />
          </Field>
        </div>
        <Field label="Remarks (optional)">
          <input style={inputStyle} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any notes about this assignment" />
        </Field>

        {/* Effective fee preview */}
        {selectedPlan && (
          <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Effective fee per period</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: C.green, letterSpacing: "-0.03em" }}>{formatINR(effective)}</span>
            </div>
            {(discountFixed > 0 || discountPct > 0) && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                Base {formatINR(baseAmt)} − discount {formatINR(discountFixed + baseAmt * discountPct / 100)}
              </div>
            )}
          </div>
        )}

        {mut.isError && (
          <div style={{ fontSize: 13, color: C.red, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
            Failed to assign plan. The student may already have an active plan — it will be replaced.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={handleSubmit} disabled={mut.isPending}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: mut.isPending ? 0.6 : 1 }}>
            {mut.isPending ? "Assigning…" : "Assign Plan"}
          </button>
          <button onClick={onClose} style={{ padding: "12px 18px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Record Payment Modal ──────────────────────────────────────────────────────
function PaymentModal({
  student, onClose, onSaved,
}: { student: StudentFeeSummary; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const assignmentId = student.current_assignment?.id;
  const [form, setForm] = useState<RecordPaymentPayload>({
    assignment_id: assignmentId ?? 0,
    transaction_type: "payment",
    amount: student.cumulative_balance > 0 ? student.cumulative_balance : student.total_due,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_mode: "cash",
  });
  const [ref, setRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: () => recordFeePayment({
      ...form,
      reference_number: ref || undefined,
      remarks: remarks || undefined,
      is_partial: form.transaction_type === "payment" && form.amount < student.cumulative_balance,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-students"] });
      qc.invalidateQueries({ queryKey: ["fee-dashboard"] });
      qc.invalidateQueries({ queryKey: ["fee-summary", student.student_profile_id] });
      onSaved();
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!form.amount || form.amount <= 0) e.amount = "Amount must be greater than 0";
    if (!form.payment_date) e.payment_date = "Date is required";
    setErrors(e);
    if (Object.keys(e).length === 0) mut.mutate();
  };

  const modeBtn = (mode: PaymentMode) => {
    const cfg = PAYMENT_MODE_CONFIG[mode];
    const active = form.payment_mode === mode;
    return (
      <button key={mode} onClick={() => setForm((p) => ({ ...p, payment_mode: mode }))}
        style={{
          flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
          background: active ? `${cfg.color}18` : "rgba(255,255,255,0.03)",
          border: `1px solid ${active ? cfg.color + "50" : C.border}`,
          color: active ? cfg.color : C.muted, fontSize: 12, fontWeight: active ? 700 : 500,
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4,
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
        {cfg.label}
      </button>
    );
  };

  return (
    <Modal title={`Record Payment — ${student.student_name}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        {/* Balance context */}
        {student.cumulative_balance > 0 && (
          <div style={{
            background: student.is_overdue ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
            border: `1px solid ${student.is_overdue ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
            borderRadius: 12, padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>{student.is_overdue ? `Overdue by ${student.overdue_days} days` : "Amount due"}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: student.is_overdue ? C.red : C.amber, letterSpacing: "-0.03em" }}>
                {formatINR(student.cumulative_balance)}
              </div>
              {student.periods_elapsed > 1 && (
                <div style={{ fontSize: 11, color: C.dim }}>{student.periods_elapsed} periods × {formatINR(student.total_due)}</div>
              )}
            </div>
          </div>
        )}

        {/* Transaction type */}
        <Field label="Type">
          <div style={{ display: "flex", gap: 8 }}>
            {(["payment", "adjustment", "refund"] as const).map((t) => (
              <button key={t} onClick={() => setForm((p) => ({ ...p, transaction_type: t }))}
                style={{
                  flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                  background: form.transaction_type === t ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${form.transaction_type === t ? "rgba(124,58,237,0.4)" : C.border}`,
                  color: form.transaction_type === t ? "#a78bfa" : C.muted,
                  fontSize: 12, fontWeight: form.transaction_type === t ? 700 : 500, textTransform: "capitalize" as const,
                }}
              >{t}</button>
            ))}
          </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Amount (₹)" error={errors.amount}>
            <input type="number" style={inputStyle} value={form.amount} min={0}
              onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
          </Field>
          <Field label="Date" error={errors.payment_date}>
            <input type="date" style={inputStyle} value={form.payment_date}
              onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))} />
          </Field>
        </div>

        <Field label="Payment Mode">
          <div style={{ display: "flex", gap: 8 }}>
            {(["cash", "online", "cheque", "bank_transfer"] as const).map(modeBtn)}
          </div>
        </Field>

        {(form.payment_mode === "cheque" || form.payment_mode === "online" || form.payment_mode === "bank_transfer") && (
          <Field label="Reference / Cheque No.">
            <input style={inputStyle} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction ID, cheque number, etc." />
          </Field>
        )}

        <Field label="Remarks (optional)">
          <input style={inputStyle} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any notes" />
        </Field>

        {mut.isError && (
          <div style={{ fontSize: 13, color: C.red, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
            Failed to record payment. Please try again.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={handleSubmit} disabled={mut.isPending}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: mut.isPending ? 0.6 : 1 }}>
            {mut.isPending ? "Saving…" : "Record Payment"}
          </button>
          <button onClick={onClose} style={{ padding: "12px 18px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Student Detail Drawer ─────────────────────────────────────────────────────
function StudentDrawer({ profileId, onClose, onPayment }: { profileId: number; onClose: () => void; onPayment: (s: StudentFeeSummary) => void }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["fee-summary", profileId],
    queryFn: () => fetchStudentFeeSummary(profileId),
    staleTime: 30_000,
  });

  const status = summary ? getFeeStatus(summary) : "no_plan";
  const scfg = STATUS_CONFIG[status];

  return (
    <Modal title="Student Fee Details" onClose={onClose} wide>
      {isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>Loading details…</div>
      )}
      {summary && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 18 }}>
          {/* Header info */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{summary.student_name}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" as const }}>
                {summary.student_public_id && (
                  <span style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 8px" }}>{summary.student_public_id}</span>
                )}
                {summary.branch && <span style={{ fontSize: 11, color: C.cyan, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 100, padding: "2px 8px" }}>{summary.branch}</span>}
                {summary.course && <span style={{ fontSize: 11, color: "#a78bfa", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "2px 8px" }}>{summary.course}</span>}
                {summary.level && <span style={{ fontSize: 11, color: C.amber, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 100, padding: "2px 8px" }}>Level {summary.level}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 100, background: scfg.bg, border: `1px solid ${scfg.border}`, color: scfg.color, fontSize: 12, fontWeight: 700 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: scfg.dot }} />
                {scfg.label}
              </div>
            </div>
          </div>

          {/* Fee summary cards */}
          {summary.current_assignment && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              {[
                { label: "Due This Period", value: formatINR(summary.total_due), color: C.amber },
                { label: "Total Paid", value: formatINR(summary.total_paid), color: C.green },
                { label: "Outstanding", value: formatINR(summary.cumulative_balance), color: summary.cumulative_balance > 0 ? C.red : C.green },
                { label: "Periods", value: String(summary.periods_elapsed), color: C.cyan },
              ].map((c) => (
                <div key={c.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 14px" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: c.color, letterSpacing: "-0.03em" }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Plan info */}
          {summary.current_assignment?.fee_plan && (
            <div style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: C.mono, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Active Plan</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{summary.current_assignment.fee_plan.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                {formatINR(summary.current_assignment.effective_fee_amount)} / {formatDuration(summary.current_assignment.fee_plan.fee_duration_days)}
                {(summary.current_assignment.discount_amount > 0 || summary.current_assignment.discount_percentage > 0) && (
                  <span style={{ marginLeft: 10, color: C.green }}>
                    −{formatINR(summary.current_assignment.discount_amount + summary.current_assignment.effective_fee_amount * summary.current_assignment.discount_percentage / 100)} discount
                  </span>
                )}
              </div>
              {summary.next_due_date && (
                <div style={{ fontSize: 12, color: summary.is_overdue ? C.red : C.muted, marginTop: 6 }}>
                  {summary.is_overdue
                    ? `⚠ Overdue by ${summary.overdue_days} days — was due ${new Date(summary.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                    : `Next due: ${new Date(summary.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                </div>
              )}
            </div>
          )}

          {/* Collect payment button */}
          <button onClick={() => onPayment(summary)}
            style={{ padding: "13px", borderRadius: 13, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <IndianRupee size={15} /> Collect / Record Payment
          </button>

          {/* Transaction history */}
          {summary.transactions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: C.mono, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Payment History</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                {summary.transactions.map((txn) => {
                  const mcfg = PAYMENT_MODE_CONFIG[txn.payment_mode as PaymentMode] ?? { icon: "?", color: C.muted, label: txn.payment_mode };
                  const isPayment = txn.transaction_type === "payment" && txn.amount > 0;
                  return (
                    <div key={txn.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{mcfg.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                          {txn.transaction_type.charAt(0).toUpperCase() + txn.transaction_type.slice(1)}
                          {txn.is_partial && <span style={{ marginLeft: 6, fontSize: 10, color: C.amber, background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: 100 }}>Partial</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          {new Date(txn.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {" · "}{mcfg.label}
                          {txn.reference_number && <span style={{ marginLeft: 6, fontFamily: C.mono }}>{txn.reference_number}</span>}
                        </div>
                        {txn.remarks && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{txn.remarks}</div>}
                      </div>
                      <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: isPayment ? C.green : C.red, letterSpacing: "-0.02em" }}>
                          {isPayment ? "+" : "−"}{formatINR(Math.abs(txn.amount))}
                        </div>
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Bal: {formatINR(txn.balance_after)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!summary.current_assignment && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 14 }}>
              No fee plan assigned to this student yet.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { month_label: string; total: number; cash: number; online: number; cheque: number; bank_transfer: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, paddingBottom: 24, position: "relative" as const }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.total / max) * 100);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, marginBottom: 2 }}>
              {d.total > 0 ? `₹${(d.total / 1000).toFixed(0)}k` : ""}
            </div>
            <div style={{ width: "100%", minHeight: 4, maxHeight: 80, height: `${h}%`, borderRadius: "4px 4px 2px 2px", background: "linear-gradient(180deg, #7c3aed, #4f46e5)", position: "relative" as const, overflow: "hidden" }}>
              {/* cash segment */}
              {d.cash > 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${(d.cash / d.total) * 100}%`, background: "rgba(16,185,129,0.7)" }} />}
            </div>
            <div style={{ fontSize: 9, color: C.dim, fontFamily: C.mono, textAlign: "center" as const, marginTop: 4 }}>{d.month_label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ onRecordPayment }: { onRecordPayment: (s: StudentFeeSummary) => void }) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["fee-dashboard"],
    queryFn: fetchFeeDashboardStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: monthlyData = [] } = useQuery({
    queryKey: ["fee-monthly", 6],
    queryFn: () => fetchMonthlyCollection(6),
    staleTime: 60_000,
  });
  const { data: overdueStudents = [] } = useQuery({
    queryKey: ["fee-students", "overdue"],
    queryFn: () => fetchFeeStudents({ show_overdue_only: true }),
    staleTime: 30_000,
  });

  if (statsLoading) {
    return <div style={{ textAlign: "center", padding: 80, color: C.muted }}>Loading dashboard…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Collected Today" value={formatINR(stats?.total_fee_collected_today ?? 0)}
          icon={<IndianRupee size={18} />} color={C.green} gradient="linear-gradient(135deg,#10b981,#059669)" sub="Today" />
        <StatCard label="This Month" value={formatINR(stats?.total_fee_collected_monthly ?? 0)}
          icon={<Calendar size={18} />} color={C.cyan} gradient="linear-gradient(135deg,#06b6d4,#0891b2)" sub="MTD" />
        <StatCard label="All-Time Collected" value={formatINR(stats?.total_fee_collected_all_time ?? 0)}
          icon={<TrendingUp size={18} />} color={C.purple} gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
        <StatCard label="Outstanding Dues" value={formatINR(stats?.total_fees_due ?? 0)}
          icon={<Clock size={18} />} color={C.amber} gradient="linear-gradient(135deg,#f59e0b,#d97706)" sub="Total" />
        <StatCard label="Active Students" value={String(stats?.total_active_students ?? 0)}
          icon={<Users size={18} />} color={C.text} gradient="linear-gradient(135deg,#334155,#1e293b)" />
        <StatCard label="Overdue" value={String(stats?.overdue_count ?? 0)}
          icon={<AlertTriangle size={18} />} color={C.red} gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
      </div>

      {/* Chart + overdue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Monthly collection chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Monthly Collection</div>
          <MiniBarChart data={monthlyData} />
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            {[{ color: C.purple, label: "Total" }, { color: C.green, label: "Cash segment" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.dim }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />{l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Overdue list */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 14, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 7 }}>
            <Flame size={14} /> Overdue Students
          </div>
          {overdueStudents.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
              No overdue fees right now!
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, maxHeight: 200, overflowY: "auto" }}>
            {overdueStudents.slice(0, 6).map((s) => (
              <div key={s.student_profile_id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.student_name}</div>
                  <div style={{ fontSize: 11, color: C.red }}>{s.overdue_days}d overdue · {s.branch || s.course || "—"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.red }}>{formatINR(s.cumulative_balance)}</div>
                  <button onClick={() => onRecordPayment(s)}
                    style={{ padding: "5px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Collect</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Students Tab ─────────────────────────────────────────────────────────────
function StudentsTab({
  onViewDetail, onRecordPayment, onAssignPlan,
}: {
  onViewDetail: (id: number) => void;
  onRecordPayment: (s: StudentFeeSummary) => void;
  onAssignPlan: (s?: StudentFeeSummary) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ["fee-students", filterBranch, showOverdueOnly],
    queryFn: () => fetchFeeStudents({ branch: filterBranch || undefined, show_overdue_only: showOverdueOnly }),
    staleTime: 30_000,
  });

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.student_name.toLowerCase().includes(q) || (s.student_public_id ?? "").toLowerCase().includes(q);
    const st = getFeeStatus(s);
    const matchStatus = !filterStatus || st === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" as const }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.dim }} />
          <input style={{ ...inputStyle, paddingLeft: 34, maxWidth: "none" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or ID…" />
        </div>
        <select style={{ ...selectStyle, width: 150 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="overdue">Overdue</option>
          <option value="due_soon">Due Soon</option>
          <option value="paid">Paid</option>
          <option value="no_plan">No Plan</option>
        </select>
        <button onClick={() => setShowOverdueOnly((v) => !v)}
          style={{ padding: "9px 14px", borderRadius: 10, cursor: "pointer", background: showOverdueOnly ? "rgba(239,68,68,0.12)" : C.surface, border: `1px solid ${showOverdueOnly ? "rgba(239,68,68,0.35)" : C.border}`, color: showOverdueOnly ? C.red : C.muted, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Flame size={13} /> Overdue Only
        </button>
        <button onClick={() => refetch()} style={{ padding: "9px 12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", color: C.muted }}>
          <RefreshCw size={14} />
        </button>
        <button onClick={() => onAssignPlan(undefined)}
          style={{ padding: "9px 16px", borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Assign Plan
        </button>
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, color: C.dim, fontFamily: C.mono }}>
        {filtered.length} student{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Loading students…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 14 }}>
          {students.length === 0 ? "No students with fee plans yet. Assign a plan to get started." : "No students match your filters."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
          {filtered.map((s) => {
            const st = getFeeStatus(s);
            const scfg = STATUS_CONFIG[st];
            return (
              <motion.div
                key={s.student_profile_id}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
                  cursor: "pointer",
                }}
                onClick={() => onViewDetail(s.student_profile_id)}
              >
                {/* Status dot */}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: scfg.dot, flexShrink: 0, boxShadow: `0 0 8px ${scfg.dot}70` }} />

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{s.student_name}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" as const }}>
                    {s.student_public_id && <span style={{ fontSize: 10, fontFamily: C.mono, color: C.dim }}>{s.student_public_id}</span>}
                    {s.branch && <span style={{ fontSize: 10, color: C.cyan }}>{s.branch}</span>}
                    {s.course && <span style={{ fontSize: 10, color: "#a78bfa" }}>{s.course}</span>}
                    {s.level && <span style={{ fontSize: 10, color: C.amber }}>L{s.level}</span>}
                  </div>
                </div>

                {/* Plan name */}
                <div style={{ width: 140, textAlign: "center" as const }}>
                  {s.current_assignment?.fee_plan ? (
                    <div style={{ fontSize: 12, color: C.muted }}>{s.current_assignment.fee_plan.name}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>No plan</div>
                  )}
                </div>

                {/* Fee amounts */}
                <div style={{ textAlign: "right" as const, width: 110 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: st === "paid" ? C.green : st === "overdue" ? C.red : C.amber, letterSpacing: "-0.03em" }}>
                    {formatINR(s.cumulative_balance)}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                    {s.cumulative_balance === 0 ? "All clear" : st === "overdue" ? `${s.overdue_days}d overdue` : "outstanding"}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 100, background: scfg.bg, border: `1px solid ${scfg.border}`, color: scfg.color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const }}>
                    {scfg.label}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <button title="Collect payment" onClick={() => onRecordPayment(s)}
                    style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.purple }}>
                    <IndianRupee size={14} />
                  </button>
                  <button title="View details" onClick={() => onViewDetail(s.student_profile_id)}
                    style={{ width: 32, height: 32, borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
                    <Eye size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────
function PlansTab({ onEditPlan, onNewPlan }: { onEditPlan: (p: FeePlan) => void; onNewPlan: () => void }) {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({ queryKey: ["fee-plans"], queryFn: () => fetchFeePlans(), staleTime: 60_000 });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteFeePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee-plans"] }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNewPlan}
          style={{ padding: "10px 18px", borderRadius: 11, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
          <Plus size={14} /> New Fee Plan
        </button>
      </div>
      {isLoading && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading plans…</div>}
      {!isLoading && plans.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 14 }}>
          No fee plans yet. Create your first plan to get started.
        </div>
      )}
      {plans.map((plan) => (
        <motion.div key={plan.id} whileHover={{ y: -1 }}
          style={{ background: C.surface, border: `1px solid ${plan.is_active ? "rgba(124,58,237,0.15)" : C.border}`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{plan.name}</div>
              {!plan.is_active && <span style={{ fontSize: 10, color: C.dim, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 8px", fontFamily: C.mono }}>INACTIVE</span>}
            </div>
            {plan.description && <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>{plan.description}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {plan.branch && <span style={{ fontSize: 11, color: C.cyan, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 100, padding: "2px 8px" }}>{plan.branch}</span>}
              {plan.course && <span style={{ fontSize: 11, color: "#a78bfa", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "2px 8px" }}>{plan.course}</span>}
              {plan.level && <span style={{ fontSize: 11, color: C.amber, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 100, padding: "2px 8px" }}>Level {plan.level}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.purple, letterSpacing: "-0.04em" }}>{formatINR(plan.fee_amount)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>per {formatDuration(plan.fee_duration_days)}</div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button onClick={() => onEditPlan(plan)}
              style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.purple }}>
              <Edit2 size={14} />
            </button>
            <button onClick={() => { if (window.confirm(`Deactivate "${plan.name}"?`)) delMut.mutate(plan.id); }}
              style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.red }}>
              <Trash2 size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────
function TransactionsTab() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState("");

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["fee-transactions", startDate, endDate, mode],
    queryFn: () => fetchFeeTransactions({ start_date: startDate, end_date: endDate, payment_mode: mode || undefined }),
    staleTime: 30_000,
  });

  const total = txns.filter((t) => t.transaction_type === "payment" && t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: C.muted }}>From</label>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: C.muted }}>To</label>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <select style={{ ...selectStyle, width: 160 }} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">All Modes</option>
          <option value="cash">Cash</option>
          <option value="online">Online</option>
          <option value="cheque">Cheque</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>

      {/* Summary */}
      <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: C.muted }}>{txns.length} transactions in this period</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.green, letterSpacing: "-0.03em" }}>{formatINR(total)} collected</div>
      </div>

      {isLoading && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading…</div>}

      {txns.length === 0 && !isLoading && (
        <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 14 }}>No transactions found for this period.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
        {txns.map((txn) => {
          const mcfg = PAYMENT_MODE_CONFIG[txn.payment_mode as PaymentMode] ?? { icon: "?", color: C.muted, label: txn.payment_mode };
          const isPayment = txn.transaction_type === "payment" && txn.amount > 0;
          return (
            <div key={txn.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{mcfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {txn.transaction_type.charAt(0).toUpperCase() + txn.transaction_type.slice(1)}
                  {txn.is_partial && <span style={{ marginLeft: 6, fontSize: 10, color: C.amber, background: "rgba(245,158,11,0.1)", padding: "1px 6px", borderRadius: 100 }}>Partial</span>}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {new Date(txn.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {" · "}{mcfg.label}
                  {txn.reference_number && <span style={{ marginLeft: 6, fontFamily: C.mono, fontSize: 10 }}>{txn.reference_number}</span>}
                </div>
                {txn.remarks && <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{txn.remarks}</div>}
              </div>
              <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: isPayment ? C.green : C.red, letterSpacing: "-0.02em" }}>
                  {isPayment ? "+" : "−"}{formatINR(Math.abs(txn.amount))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN AdminFees COMPONENT
// ═══════════════════════════════════════════════════════════════

type Tab = "overview" | "students" | "plans" | "transactions";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview",     label: "Overview",     icon: <BarChart3 size={15} /> },
  { key: "students",     label: "Students",     icon: <Users size={15} /> },
  { key: "plans",        label: "Fee Plans",    icon: <FileText size={15} /> },
  { key: "transactions", label: "Transactions", icon: <ArrowDownCircle size={15} /> },
];

export default function AdminFees() {
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Modal state
  const [planModal, setPlanModal] = useState<"new" | FeePlan | null>(null);
  const [assignModal, setAssignModal] = useState<{ profileId?: number; name?: string } | null>(null);
  const [paymentModal, setPaymentModal] = useState<StudentFeeSummary | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<number | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Toasts */}
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}</AnimatePresence>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(7,7,15,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IndianRupee size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Fee Manager</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>ADMIN · FINANCE</div>
            </div>
          </div>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 10,
                  background: tab === t.key ? "rgba(124,58,237,0.15)" : "transparent",
                  border: `1px solid ${tab === t.key ? "rgba(124,58,237,0.35)" : "transparent"}`,
                  color: tab === t.key ? "#a78bfa" : C.muted, fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                {t.icon}
                <span style={{ display: "none", "@media(min-width:640px)": { display: "inline" } } as any}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {tab === "overview" && (
              <OverviewTab onRecordPayment={(s) => setPaymentModal(s)} />
            )}
            {tab === "students" && (
              <StudentsTab
                onViewDetail={(id) => setDetailDrawer(id)}
                onRecordPayment={(s) => setPaymentModal(s)}
                onAssignPlan={(s) => setAssignModal(s ? { profileId: s.student_profile_id, name: s.student_name } : {})}
              />
            )}
            {tab === "plans" && (
              <PlansTab
                onEditPlan={(p) => setPlanModal(p)}
                onNewPlan={() => setPlanModal("new")}
              />
            )}
            {tab === "transactions" && <TransactionsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      {planModal !== null && (
        <PlanFormModal
          plan={planModal === "new" ? null : planModal as FeePlan}
          onClose={() => setPlanModal(null)}
          onSaved={() => { setPlanModal(null); showToast("Fee plan saved!"); }}
        />
      )}
      {assignModal !== null && (
        <AssignPlanModal
          studentProfileId={assignModal.profileId}
          studentName={assignModal.name}
          onClose={() => setAssignModal(null)}
          onSaved={() => { setAssignModal(null); showToast("Plan assigned successfully!"); }}
        />
      )}
      {paymentModal !== null && (
        <PaymentModal
          student={paymentModal}
          onClose={() => setPaymentModal(null)}
          onSaved={() => { setPaymentModal(null); showToast("Payment recorded!"); }}
        />
      )}
      {detailDrawer !== null && (
        <StudentDrawer
          profileId={detailDrawer}
          onClose={() => setDetailDrawer(null)}
          onPayment={(s) => { setDetailDrawer(null); setPaymentModal(s); }}
        />
      )}
    </div>
  );
}
