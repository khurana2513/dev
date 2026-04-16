/**
 * StudentFees — Student's own fee status and payment history.
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { IndianRupee, Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { fetchMyFeeStatus } from "../lib/feesApi";
import { STATUS_CONFIG, PAYMENT_MODE_CONFIG, formatINR, formatDuration } from "../types/fees";
import type { PaymentMode } from "../types/fees";

const C = {
  bg: "#07070F",
  surface: "rgba(255,255,255,0.025)",
  border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0",
  muted: "rgba(255,255,255,0.4)",
  dim: "rgba(255,255,255,0.22)",
  purple: "#7c3aed",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  mono: "'JetBrains Mono', monospace",
};

export default function StudentFees() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-fee-status"],
    queryFn: fetchMyFeeStatus,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: C.muted, fontSize: 14 }}>Loading your fee details…</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <AlertTriangle size={32} style={{ marginBottom: 12, color: C.amber }} />
          <div style={{ fontSize: 15 }}>Could not load fee information.</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Please contact your teacher or admin.</div>
        </div>
      </div>
    );
  }

  const scfg = STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.no_plan;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans', sans-serif", padding: "32px 20px 80px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column" as const, gap: 20 }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IndianRupee size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>My Fees</div>
            <div style={{ fontSize: 12, color: C.muted }}>Fee status and payment history</div>
          </div>
        </div>

        {/* No plan */}
        {data.status === "no_plan" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "40px 24px", textAlign: "center" as const }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>No fee plan yet</div>
            <div style={{ fontSize: 14, color: C.muted }}>No fee plan has been assigned to you yet.<br />Please contact your teacher.</div>
          </div>
        )}

        {data.status !== "no_plan" && (
          <>
            {/* Status hero card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              style={{
                background: `linear-gradient(135deg, ${scfg.bg}, rgba(0,0,0,0))`,
                border: `1px solid ${scfg.border}`,
                borderRadius: 22, padding: "28px 24px",
                boxShadow: `0 8px 40px ${scfg.dot}20`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 100, background: scfg.bg, border: `1px solid ${scfg.border}`, color: scfg.color, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: scfg.dot }} />
                    {scfg.label}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.05em", color: scfg.color, lineHeight: 1 }}>
                    {formatINR(data.amount_due)}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
                    {data.amount_due === 0 ? "You're all caught up!" : "Total outstanding"}
                  </div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Total Paid</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.green, letterSpacing: "-0.03em" }}>{formatINR(data.total_paid)}</div>
                </div>
              </div>
            </motion.div>

            {/* Plan info */}
            {data.plan_name && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ fontSize: 11, color: C.dim, fontFamily: C.mono, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Active Plan</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>{data.plan_name}</div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.dim }}>Fee</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.purple }}>{formatINR(data.fee_amount)}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>  / {formatDuration(data.fee_duration_days)}</span></div>
                  </div>
                  {data.next_due_date && (
                    <div>
                      <div style={{ fontSize: 11, color: C.dim }}>Next Due</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: data.is_overdue ? C.red : C.text }}>
                        {new Date(data.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  )}
                </div>
                {data.is_overdue && data.overdue_days && (
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10 }}>
                    <AlertTriangle size={14} color={C.red} />
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>
                      You have an overdue payment of {data.overdue_days} day{data.overdue_days !== 1 ? "s" : ""}. Please contact your teacher.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Transaction history */}
            {data.transactions.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: C.dim, fontFamily: C.mono, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Payment History</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                  {data.transactions.map((txn) => {
                    const mcfg = PAYMENT_MODE_CONFIG[txn.payment_mode as PaymentMode] ?? { icon: "?", color: C.muted, label: txn.payment_mode };
                    const isPayment = txn.transaction_type === "payment" && txn.amount > 0;
                    return (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: isPayment ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {mcfg.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                            {txn.transaction_type.charAt(0).toUpperCase() + txn.transaction_type.slice(1)}
                            {" — "}{mcfg.label}
                            {txn.is_partial && <span style={{ marginLeft: 6, fontSize: 10, color: C.amber, background: "rgba(245,158,11,0.1)", padding: "1px 6px", borderRadius: 100 }}>Partial</span>}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            {new Date(txn.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                            {txn.reference_number && <span style={{ marginLeft: 8, fontFamily: C.mono, color: C.dim }}>{txn.reference_number}</span>}
                          </div>
                          {txn.remarks && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{txn.remarks}</div>}
                        </div>
                        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: isPayment ? C.green : C.red, letterSpacing: "-0.02em" }}>
                            {isPayment ? "+" : "−"}{formatINR(Math.abs(txn.amount))}
                          </div>
                          <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Bal: {formatINR(txn.balance_after)}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
