/* ═══════════════════════════════════════════════════════════════
   Quotation Maker — Calculation Engine + Seed Data
   ═══════════════════════════════════════════════════════════════ */

import type {
  Course, QuoteStudent, CourseSelection, AppliedDiscount,
  SiblingDiscountConfig, MultiCourseDiscountConfig,
  QuoteSummary, StudentSummary, CourseLineItem,
  InstituteProfile, DiscountPreset, TCTemplate, Quotation,
} from "../types/quotation";
import { BILLING_LABELS, formatINR, uid } from "../types/quotation";

// ─── Per-Course Line Item ────────────────────────────────────
export function computeLineItem(
  sel: CourseSelection,
  courses: Course[],
): CourseLineItem | null {
  const course = courses.find((c) => c.id === sel.courseId);
  if (!course) return null;

  const tier = course.pricingTiers.find((t) => t.id === sel.selectedTierId)
    ?? course.pricingTiers[0];
  if (!tier) return null;

  const tuition = tier.amount;
  const reg = sel.includeRegistration ? course.registrationFee : 0;
  const mat = sel.includeMaterial ? course.materialFee : 0;
  const exam = sel.includeExam ? course.examFee : 0;
  const gross = tuition + reg + mat + exam;

  let discountAmt = 0;
  let discountLabel = "";

  // Apply per-course discount
  const disc = sel.discount ?? course.defaultDiscount;
  if (disc && disc.value > 0) {
    let base = tuition;
    const appliesTo = "appliesTo" in disc ? (disc as any).appliesTo : undefined;
    if (appliesTo === "all" || appliesTo === undefined) {
      base = gross;
      if ("excludeRegistration" in disc && (disc as any).excludeRegistration) base -= reg;
      if ("excludeMaterial" in disc && (disc as any).excludeMaterial) base -= mat;
    }
    if (disc.type === "flat") {
      discountAmt = Math.min(disc.value, base);
    } else {
      discountAmt = Math.round(base * disc.value / 100);
    }
    discountLabel = disc.label || `${disc.value}${disc.type === "percentage" ? "%" : "₹"} off`;
  }

  return {
    courseId: course.id,
    courseName: course.name,
    billingLabel: tier.customLabel || BILLING_LABELS[tier.billingMode],
    tuitionFee: tuition,
    registrationFee: reg,
    materialFee: mat,
    examFee: exam,
    grossTotal: gross,
    discountLabel,
    discountAmount: discountAmt,
    netTotal: Math.max(0, gross - discountAmt),
  };
}

// ─── Per-Student Summary ─────────────────────────────────────
export function computeStudentSummary(
  student: QuoteStudent,
  courses: Course[],
  multiCourseConfig: MultiCourseDiscountConfig,
): StudentSummary {
  const lineItems: CourseLineItem[] = [];
  for (const sel of (student.courseSelections ?? [])) {
    const li = computeLineItem(sel, courses);
    if (li) lineItems.push(li);
  }

  const subtotalTuition = lineItems.reduce((s, l) => s + l.tuitionFee, 0);
  const subtotalRegistration = lineItems.reduce((s, l) => s + l.registrationFee, 0);
  const subtotalMaterial = lineItems.reduce((s, l) => s + l.materialFee, 0);
  const subtotalExam = lineItems.reduce((s, l) => s + l.examFee, 0);
  const grossTotal = lineItems.reduce((s, l) => s + l.grossTotal, 0);
  const courseDiscountsTotal = lineItems.reduce((s, l) => s + l.discountAmount, 0);

  // Multi-course discount
  let mcDiscount = 0;
  let mcLabel = "";
  if (multiCourseConfig.enabled && lineItems.length >= 2) {
    const sorted = [...(multiCourseConfig?.tiers ?? [])].sort((a, b) => b.courseCount - a.courseCount);
    const tier = sorted.find((t) => lineItems.length >= t.courseCount);
    if (tier) {
      if (tier.type === "percentage") {
        mcDiscount = Math.round(subtotalTuition * tier.value / 100);
        mcLabel = `Multi-course ${tier.value}% (${lineItems.length} courses)`;
      } else {
        mcDiscount = tier.value;
        mcLabel = `Multi-course ${formatINR(tier.value)} off`;
      }
    }
  }

  const netTotal = Math.max(0, grossTotal - courseDiscountsTotal - mcDiscount);

  return {
    studentId: student.id,
    studentName: student.name || "Student",
    lineItems,
    subtotalTuition,
    subtotalRegistration,
    subtotalMaterial,
    subtotalExam,
    grossTotal,
    multiCourseDiscountAmount: mcDiscount,
    multiCourseDiscountLabel: mcLabel,
    courseDiscountsTotal,
    netTotal,
  };
}

// ─── Full Quote Summary ──────────────────────────────────────
export function computeQuoteSummary(
  students: QuoteStudent[],
  courses: Course[],
  appliedDiscounts: AppliedDiscount[],
  siblingConfig: SiblingDiscountConfig,
  multiCourseConfig: MultiCourseDiscountConfig,
  gstRate: number = 0,
): QuoteSummary {
  const studentSummaries = students.map((st) =>
    computeStudentSummary(st, courses, multiCourseConfig)
  );

  const grandGross = studentSummaries.reduce((s, st) => s + st.grossTotal, 0);
  const totalCourseDiscounts = studentSummaries.reduce(
    (s, st) => s + st.courseDiscountsTotal, 0
  );
  const totalMultiCourseDiscounts = studentSummaries.reduce(
    (s, st) => s + st.multiCourseDiscountAmount, 0
  );

  // Sibling discount
  let siblingAmt = 0;
  let siblingLabel = "";
  if (siblingConfig.enabled && students.length >= 2) {
    const sorted = [...(siblingConfig?.tiers ?? [])].sort((a, b) => b.studentCount - a.studentCount);
    const tier = sorted.find((t) => students.length >= t.studentCount);
    if (tier) {
      const base = studentSummaries.reduce((s, st) => s + st.netTotal, 0);
      if (tier.type === "percentage") {
        siblingAmt = Math.round(base * tier.value / 100);
        siblingLabel = `Family discount ${tier.value}% (${students.length} students)`;
      } else {
        siblingAmt = tier.value;
        siblingLabel = `Family discount ${formatINR(tier.value)}`;
      }
    }
  }

  // Quote-level discounts
  const afterStudents = studentSummaries.reduce((s, st) => s + st.netTotal, 0) - siblingAmt;
  let quoteLevelTotal = 0;
  const resolvedQuoteDiscounts: AppliedDiscount[] = appliedDiscounts.map((d) => {
    let amt = 0;
    const base = d.appliesTo === "grand_total"
      ? afterStudents - quoteLevelTotal
      : studentSummaries.reduce((s, st) => s + st.subtotalTuition, 0);
    if (d.type === "flat") {
      amt = Math.min(d.value, Math.max(0, base));
    } else {
      amt = Math.round(base * d.value / 100);
    }
    quoteLevelTotal += amt;
    return { ...d, calculatedAmount: amt };
  });

  const preGst = Math.max(0, afterStudents - quoteLevelTotal);
  const gstAmount = gstRate > 0 ? Math.round(preGst * gstRate / 100) : 0;
  const grandTotal = preGst + gstAmount;

  return {
    students: studentSummaries,
    grandGross,
    totalCourseDiscounts,
    totalMultiCourseDiscounts,
    siblingDiscountAmount: siblingAmt,
    siblingDiscountLabel: siblingLabel,
    quoteLevelDiscounts: resolvedQuoteDiscounts,
    quoteLevelDiscountsTotal: quoteLevelTotal,
    gstRate,
    gstAmount,
    grandTotal,
  };
}

// ─── Savings calculator ──────────────────────────────────────
export function totalSavings(summary: QuoteSummary): number {
  return (
    summary.totalCourseDiscounts +
    summary.totalMultiCourseDiscounts +
    summary.siblingDiscountAmount +
    summary.quoteLevelDiscountsTotal
  );
}

// ═══════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════

export function getSeedData() {
  const mkTier = (mode: any, amt: number, id?: string): any => ({
    id: id || uid(),
    billingMode: mode,
    amount: amt,
  });

  const courses: Course[] = [
    {
      id: "c1", name: "Abacus Level 1", description: "Foundation abacus arithmetic — addition & subtraction on soroban",
      category: "Beginner", duration: "6 months", classesPerWeek: 2, classDuration: "60 min",
      mode: "offline",
      pricingTiers: [
        mkTier("monthly", 1200, "c1t1"),
        mkTier("quarterly", 3300, "c1t2"),
        mkTier("half_yearly", 6000, "c1t3"),
        mkTier("one_time", 7000, "c1t4"),
      ],
      registrationFee: 500, materialFee: 800, examFee: 200,
      defaultDiscount: null, isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: "c2", name: "Abacus Level 2", description: "Intermediate abacus — multiplication, division, decimals",
      category: "Intermediate", duration: "6 months", classesPerWeek: 2, classDuration: "60 min",
      mode: "offline",
      pricingTiers: [
        mkTier("monthly", 1400, "c2t1"),
        mkTier("quarterly", 3900, "c2t2"),
        mkTier("half_yearly", 7200, "c2t3"),
      ],
      registrationFee: 500, materialFee: 1000, examFee: 200,
      defaultDiscount: null, isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: "c3", name: "Vedic Maths Basic", description: "Speed maths tricks, mental calculation techniques",
      category: "Beginner", duration: "4 months", classesPerWeek: 2, classDuration: "45 min",
      mode: "hybrid",
      pricingTiers: [
        mkTier("monthly", 1000, "c3t1"),
        mkTier("quarterly", 2700, "c3t2"),
        mkTier("one_time", 3800, "c3t3"),
      ],
      registrationFee: 300, materialFee: 500, examFee: 150,
      defaultDiscount: null, isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: "c4", name: "Vedic Maths Advanced", description: "Advanced vedic sutras, competitive exam preparation",
      category: "Advanced", duration: "6 months", classesPerWeek: 3, classDuration: "60 min",
      mode: "online",
      pricingTiers: [
        mkTier("monthly", 1500, "c4t1"),
        mkTier("quarterly", 4200, "c4t2"),
        mkTier("half_yearly", 8000, "c4t3"),
      ],
      registrationFee: 500, materialFee: 1200, examFee: 300,
      defaultDiscount: { type: "percentage", value: 10, label: "Early Bird", appliesTo: "tuition", excludeRegistration: true, excludeMaterial: true },
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: "c5", name: "Handwriting Improvement", description: "Cursive and print handwriting improvement programme",
      category: "Beginner", duration: "3 months", classesPerWeek: 3, classDuration: "45 min",
      mode: "offline",
      pricingTiers: [
        mkTier("monthly", 800, "c5t1"),
        mkTier("quarterly", 2100, "c5t2"),
        mkTier("one_time", 2400, "c5t3"),
      ],
      registrationFee: 200, materialFee: 400, examFee: 0,
      defaultDiscount: null, isActive: true, createdAt: new Date().toISOString(),
    },
  ];

  const discountPresets: DiscountPreset[] = [
    {
      id: "dp1", name: "Diwali Offer", type: "percentage", value: 10,
      appliesTo: "total_tuition", excludeRegistration: true, excludeMaterial: true,
      autoApply: false, validUntil: "2026-11-15",
    },
    {
      id: "dp2", name: "Early Joiner Discount", type: "flat", value: 500,
      appliesTo: "grand_total", excludeRegistration: false, excludeMaterial: false,
      autoApply: false,
    },
    {
      id: "dp3", name: "Referral Discount", type: "flat", value: 300,
      appliesTo: "total_tuition", excludeRegistration: true, excludeMaterial: true,
      autoApply: false,
    },
  ];

  const siblingDiscount: SiblingDiscountConfig = {
    enabled: true,
    tiers: [
      { studentCount: 2, type: "percentage", value: 5 },
      { studentCount: 3, type: "percentage", value: 10 },
      { studentCount: 4, type: "percentage", value: 15 },
    ],
    appliesTo: "second_onwards",
  };

  const multiCourseDiscount: MultiCourseDiscountConfig = {
    enabled: true,
    tiers: [
      { courseCount: 2, type: "percentage", value: 5 },
      { courseCount: 3, type: "percentage", value: 10 },
      { courseCount: 4, type: "percentage", value: 20 },
    ],
  };

  const tcTemplates: TCTemplate[] = [
    {
      id: "tc1",
      name: "Standard Terms",
      content:
        "1. Fees once paid are non-refundable.\n2. Minimum 75% attendance is required.\n3. Study material fee is non-refundable even if the student discontinues.\n4. The institute reserves the right to revise fees annually.\n5. Certificate will be issued only upon successful completion of the program.\n6. Parents/guardians must ensure timely payment of fees.\n7. The institute is not responsible for personal belongings.",
    },
    {
      id: "tc2",
      name: "Online Class Terms",
      content:
        "1. Fees once paid are non-refundable.\n2. A stable internet connection is the student's responsibility.\n3. Classes missed without 24h prior notice cannot be rescheduled.\n4. Recording of classes is strictly prohibited.\n5. Study material will be shared digitally via email.\n6. Any technical issues must be reported within 24 hours.",
    },
  ];

  const profile: InstituteProfile = {
    id: "default",
    orgName: "Brightmind Academy",
    tagline: "Unlocking Mathematical Genius",
    logoDataUrl: null,
    phone: "+91 98765 43210",
    email: "info@brightmind.edu",
    address: "42, MG Road, Sector 15, Rohini, New Delhi – 110085",
    website: "www.brightmind.edu",
    brandColor: "#7c3aed",
    quotePrefix: "BMA",
    defaultValidityDays: 15,
    gstNumber: "",
    bankDetails: "Brightmind Academy\nHDFC Bank, Rohini Branch\nA/C: 1234567890\nIFSC: HDFC0001234",
    upiId: "brightmind@upi",
    signatureText: "Authorised Signatory",
    signatureDataUrl: null,
  };

  // Sample quotations
  const now = new Date().toISOString();
  const quotations: Quotation[] = [
    {
      id: "sq1", quoteNumber: "BMA-001", version: 1, status: "sent",
      students: [{
        id: "ss1", name: "Aarav Sharma", age: "8", grade: "3rd",
        parentName: "Rajesh Sharma", parentPhone: "+91 99887 76655",
        parentEmail: "rajesh.sharma@gmail.com", address: "", relationship: "primary",
        courseSelections: [
          { id: "sel1", courseId: "c1", selectedTierId: "c1t2", includeRegistration: true, includeMaterial: true, includeExam: false, discount: null },
          { id: "sel2", courseId: "c3", selectedTierId: "c3t2", includeRegistration: false, includeMaterial: true, includeExam: false, discount: null },
        ],
      }],
      appliedDiscounts: [],
      paymentTerms: { fullPayment: true, partPayment: false, installments: [], dueDate: "2026-04-30", acceptedModes: ["cash", "upi", "bank_transfer"], lateFeeClause: "" },
      termsAndConditions: tcTemplates[0].content,
      validUntil: "2026-04-30",
      notes: "", createdAt: now, updatedAt: now,
    },
    {
      id: "sq2", quoteNumber: "BMA-002", version: 1, status: "draft",
      students: [{
        id: "ss2", name: "Priya Gupta", age: "10", grade: "5th",
        parentName: "Anita Gupta", parentPhone: "+91 88776 55443",
        parentEmail: "anita.g@gmail.com", address: "", relationship: "primary",
        courseSelections: [
          { id: "sel3", courseId: "c2", selectedTierId: "c2t2", includeRegistration: true, includeMaterial: true, includeExam: true, discount: null },
        ],
      }],
      appliedDiscounts: [
        { id: "ad1", presetId: "dp2", name: "Early Joiner Discount", type: "flat", value: 500, appliesTo: "grand_total", calculatedAmount: 500 },
      ],
      paymentTerms: { fullPayment: false, partPayment: true, installments: [{ amount: 3000, dueDate: "2026-04-20", label: "At joining" }, { amount: 2600, dueDate: "2026-05-20", label: "After 1 month" }], dueDate: "2026-04-20", acceptedModes: ["cash", "upi"], lateFeeClause: "Late fee of ₹100 per week after due date." },
      termsAndConditions: tcTemplates[0].content,
      validUntil: "2026-05-01",
      notes: "Follow up after Diwali vacation", createdAt: now, updatedAt: now,
    },
  ];

  return {
    profile,
    courses,
    discountPresets,
    siblingDiscount,
    multiCourseDiscount,
    tcTemplates,
    quotations,
    nextQuoteSeq: 3,
  };
}
