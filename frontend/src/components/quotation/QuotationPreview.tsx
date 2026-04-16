/* ═══════════════════════════════════════════════════════════════
   QuotationPreview — The document that prints / exports as PDF.
   Rendered as a white, print-optimised document.
   ═══════════════════════════════════════════════════════════════ */

import { forwardRef } from "react";
import type { QuoteSummary, InstituteProfile, QuoteStudent, Quotation, QuoteStatus, StudentSummary, CourseLineItem, AppliedDiscount, Installment } from "../../types/quotation";
import { formatINR } from "../../types/quotation";
import { totalSavings } from "../../lib/quotationEngine";

interface Props {
  profile: InstituteProfile;
  students: QuoteStudent[];
  summary: QuoteSummary;
  quoteNumber: string;
  date: string;
  validUntil: string;
  termsAndConditions: string;
  paymentTerms: Quotation["paymentTerms"];
  status?: QuoteStatus;
}

const QuotationPreview = forwardRef<HTMLDivElement, Props>(
  ({ profile, students, summary, quoteNumber, date, validUntil, termsAndConditions, paymentTerms, status }, ref) => {
    const brand = profile.brandColor || "#7c3aed";
    const isExpired = status === "expired";

    return (
      <div
        ref={ref}
        id="quotation-preview"
        className="relative"
        style={{
          fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          color: "#1a1a2e",
          background: "#fff",
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm 18mm",
          fontSize: "11px",
          lineHeight: 1.5,
          boxSizing: "border-box",
        }}
      >
        {/* EXPIRED watermark */}
        {isExpired && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 10,
          }}>
            <span style={{
              fontSize: "80px", fontWeight: 900, color: "rgba(239,68,68,0.12)",
              transform: "rotate(-30deg)", letterSpacing: "0.1em",
            }}>EXPIRED</span>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {profile.logoDataUrl ? (
              <img src={profile.logoDataUrl} alt="Logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8 }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 10, background: brand,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 22, fontWeight: 900,
              }}>
                {profile.orgName.charAt(0) || "Q"}
              </div>
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: brand, letterSpacing: "-0.02em" }}>
                {profile.orgName || "Your Institute"}
              </div>
              {profile.tagline && (
                <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{profile.tagline}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#555", lineHeight: 1.6 }}>
            {profile.phone && <div>{profile.phone}</div>}
            {profile.email && <div>{profile.email}</div>}
            {profile.website && <div>{profile.website}</div>}
          </div>
        </div>
        {profile.address && (
          <div style={{ fontSize: 9, color: "#777", marginBottom: 8 }}>{profile.address}</div>
        )}
        <div style={{ height: 2, background: brand, marginBottom: 16, borderRadius: 1 }} />

        {/* ── Quote Meta ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: brand, marginBottom: 4 }}>QUOTATION</div>
            <div><strong>No:</strong> {quoteNumber}</div>
            <div><strong>Date:</strong> {date || new Date().toLocaleDateString("en-IN")}</div>
            <div><strong>Valid Until:</strong> {validUntil || "—"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Addressed To</div>
            {students.map((st, i) => (
              <div key={st.id}>
                <div style={{ fontWeight: 600 }}>{st.name || "Student"}{students.length > 1 ? ` (${i + 1})` : ""}</div>
                {st.parentName && <div>c/o {st.parentName}</div>}
              </div>
            ))}
            {students[0]?.parentPhone && <div>Ph: {students[0].parentPhone}</div>}
            {students[0]?.parentEmail && <div>{students[0].parentEmail}</div>}
          </div>
        </div>

        {profile.gstNumber && (
          <div style={{ fontSize: 9, color: "#777", marginBottom: 12 }}>GSTIN: {profile.gstNumber}</div>
        )}

        {/* ── Course Tables (per student) ── */}
        {summary.students.map((ss: StudentSummary, _si: number) => (
          <div key={ss.studentId} style={{ marginBottom: 18 }}>
            {summary.students.length > 1 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: brand, marginBottom: 6, paddingBottom: 3, borderBottom: `1px solid ${brand}33` }}>
                {ss.studentName}
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ background: `${brand}12` }}>
                  {["#", "Course", "Duration/Mode", "Billing", "Fee", "Discount", "Net"].map((h, hi) => (
                    <th key={hi} style={{
                      padding: "7px 8px", textAlign: hi >= 4 ? "right" : "left",
                      fontWeight: 700, fontSize: 9, color: brand,
                      borderBottom: `1.5px solid ${brand}40`, letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ss.lineItems.map((li: CourseLineItem, idx: number) => {
                  return (
                    <tr key={li.courseId}>
                      <td style={cellStyle}>{idx + 1}</td>
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600 }}>{li.courseName}</div>
                      </td>
                      <td style={cellStyle}>{li.billingLabel}</td>
                      <td style={cellStyle}>{li.billingLabel}</td>
                      <td style={{ ...cellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatINR(li.tuitionFee)}
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right", color: li.discountAmount > 0 ? "#059669" : "#999" }}>
                        {li.discountAmount > 0 ? `−${formatINR(li.discountAmount)}` : "—"}
                        {li.discountLabel && li.discountAmount > 0 && (
                          <div style={{ fontSize: 8, color: "#059669" }}>{li.discountLabel}</div>
                        )}
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                        {li.netTotal === 0 ? "Complimentary" : formatINR(li.netTotal)}
                      </td>
                    </tr>
                  );
                })}
                {/* Sub-rows for registration, material, exam */}
                {ss.subtotalRegistration > 0 && (
                  <tr style={{ background: "#fafafa" }}>
                    <td style={subCellStyle} />
                    <td style={subCellStyle} colSpan={3}>
                      <span style={{ color: "#888", paddingLeft: 12 }}>↳ Registration Fee</span>
                    </td>
                    <td style={{ ...subCellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(ss.subtotalRegistration)}</td>
                    <td style={subCellStyle} />
                    <td style={{ ...subCellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(ss.subtotalRegistration)}</td>
                  </tr>
                )}
                {ss.subtotalMaterial > 0 && (
                  <tr style={{ background: "#fafafa" }}>
                    <td style={subCellStyle} />
                    <td style={subCellStyle} colSpan={3}>
                      <span style={{ color: "#888", paddingLeft: 12 }}>↳ Study Material / Kit</span>
                    </td>
                    <td style={{ ...subCellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(ss.subtotalMaterial)}</td>
                    <td style={subCellStyle} />
                    <td style={{ ...subCellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(ss.subtotalMaterial)}</td>
                  </tr>
                )}
                {ss.subtotalExam > 0 && (
                  <tr style={{ background: "#fafafa" }}>
                    <td style={subCellStyle} />
                    <td style={subCellStyle} colSpan={3}>
                      <span style={{ color: "#888", paddingLeft: 12 }}>↳ Exam / Assessment Fee</span>
                    </td>
                    <td style={{ ...subCellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(ss.subtotalExam)}</td>
                    <td style={subCellStyle} />
                    <td style={{ ...subCellStyle, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(ss.subtotalExam)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* Multi-course discount */}
            {ss.multiCourseDiscountAmount > 0 && (
              <div style={{ textAlign: "right", fontSize: 10, color: "#059669", fontWeight: 600, marginTop: 4 }}>
                {ss.multiCourseDiscountLabel}: −{formatINR(ss.multiCourseDiscountAmount)}
              </div>
            )}
            {/* Student subtotal */}
            {summary.students.length > 1 && (
              <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, marginTop: 6, paddingTop: 4, borderTop: "1px solid #e5e5e5" }}>
                Subtotal for {ss.studentName}: {formatINR(ss.netTotal)}
              </div>
            )}
          </div>
        ))}

        {/* ── Totals ── */}
        <div style={{
          marginTop: 8, padding: "12px 16px",
          background: `${brand}08`, border: `1px solid ${brand}20`,
          borderRadius: 6,
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              <TotalRow label="Gross Total" amount={summary.grandGross} />
              {summary.totalCourseDiscounts > 0 && (
                <TotalRow label="Course Discounts" amount={-summary.totalCourseDiscounts} isDiscount />
              )}
              {summary.totalMultiCourseDiscounts > 0 && (
                <TotalRow label="Multi-Course Discounts" amount={-summary.totalMultiCourseDiscounts} isDiscount />
              )}
              {summary.siblingDiscountAmount > 0 && (
                <TotalRow label={summary.siblingDiscountLabel} amount={-summary.siblingDiscountAmount} isDiscount />
              )}
              {summary.quoteLevelDiscounts.filter((d: AppliedDiscount) => d.calculatedAmount > 0).map((d: AppliedDiscount) => (
                <TotalRow key={d.id} label={d.name} amount={-d.calculatedAmount} isDiscount />
              ))}
              {summary.gstAmount > 0 && (
                <TotalRow label={`GST (${summary.gstRate}%)`} amount={summary.gstAmount} />
              )}
              <tr>
                <td colSpan={2} style={{ borderTop: `2px solid ${brand}`, paddingTop: 8 }} />
              </tr>
              <tr>
                <td style={{ padding: "4px 0", fontSize: 14, fontWeight: 800, color: brand }}>Net Payable</td>
                <td style={{ padding: "4px 0", fontSize: 16, fontWeight: 900, textAlign: "right", color: brand, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatINR(summary.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
          {totalSavings(summary) > 0 && (
            <div style={{ fontSize: 9, color: "#059669", fontWeight: 600, textAlign: "right", marginTop: 4 }}>
              You save {formatINR(totalSavings(summary))} with applied discounts!
            </div>
          )}
        </div>

        {/* ── Payment Terms ── */}
        {(paymentTerms.acceptedModes.length > 0 || paymentTerms.installments.length > 0) && (
          <div style={{ marginTop: 16, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6, color: brand }}>Payment Terms</div>
            {paymentTerms.installments.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>Installment Schedule:</div>
                {paymentTerms.installments.map((inst: Installment, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span>{inst.label || `Installment ${i + 1}`}</span>
                    <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{formatINR(inst.amount)} — due {inst.dueDate}</span>
                  </div>
                ))}
              </div>
            )}
            {paymentTerms.dueDate && <div><strong>Due Date:</strong> {paymentTerms.dueDate}</div>}
            {paymentTerms.acceptedModes.length > 0 && (
              <div><strong>Accepted:</strong> {paymentTerms.acceptedModes.map((m: string) => m.replace("_", " ")).map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(" · ")}</div>
            )}
            {paymentTerms.lateFeeClause && (
              <div style={{ color: "#b91c1c", marginTop: 4 }}>{paymentTerms.lateFeeClause}</div>
            )}
          </div>
        )}

        {/* ── Terms & Conditions ── */}
        {termsAndConditions && (
          <div style={{ marginTop: 16, fontSize: 9, color: "#555" }}>
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, color: "#333" }}>Terms & Conditions</div>
            {termsAndConditions.split("\n").filter(Boolean).map((line, i) => (
              <div key={i} style={{ paddingLeft: 4, marginBottom: 2 }}>{line}</div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: 24, borderTop: "1px solid #e5e5e5", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#777" }}>
          <div>
            {profile.bankDetails && (
              <div style={{ whiteSpace: "pre-line", marginBottom: 6 }}>
                <strong>Bank Details:</strong><br />{profile.bankDetails}
              </div>
            )}
            {profile.upiId && <div><strong>UPI:</strong> {profile.upiId}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            {profile.signatureDataUrl ? (
              <img src={profile.signatureDataUrl} alt="Signature" style={{ height: 36, marginBottom: 4 }} />
            ) : (
              <div style={{ height: 36, marginBottom: 4 }} />
            )}
            <div style={{ fontWeight: 600, color: "#333", borderTop: "1px solid #ccc", paddingTop: 4, minWidth: 150, textAlign: "center" }}>
              {profile.signatureText || "Authorised Signatory"}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 8, color: "#aaa", textAlign: "center" }}>
          This is a computer-generated quotation. · {profile.orgName}
        </div>
      </div>
    );
  }
);

QuotationPreview.displayName = "QuotationPreview";
export default QuotationPreview;

// ─── Helpers ─────────────────────────────────────────────────

const cellStyle: React.CSSProperties = {
  padding: "7px 8px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

const subCellStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderBottom: "1px solid #f5f5f5",
  fontSize: 9,
};

function TotalRow({ label, amount, isDiscount }: { label: string; amount: number; isDiscount?: boolean }) {
  return (
    <tr>
      <td style={{ padding: "3px 0", color: isDiscount ? "#059669" : "#333" }}>{label}</td>
      <td style={{
        padding: "3px 0", textAlign: "right", fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        color: isDiscount ? "#059669" : "#333",
      }}>
        {isDiscount ? "−" : ""}{formatINR(Math.abs(amount))}
      </td>
    </tr>
  );
}
