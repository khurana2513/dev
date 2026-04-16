/**
 * ══════════════════════════════════════════════════════════════════════════
 *  QUOTATION ENGINE — Comprehensive Unit Tests
 *
 *  Tests every exported function in quotationEngine.ts + types/quotation.ts.
 *  Covers normal operation, boundary conditions, and adversarial edge cases
 *  that would catch any miscalculation before a real invoice hits a parent.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  computeLineItem,
  computeStudentSummary,
  computeQuoteSummary,
  totalSavings,
} from "../lib/quotationEngine";
import {
  formatINR,
  monthlyEquivalent,
  uid,
  BILLING_LABELS,
  BILLING_MONTHS,
} from "../types/quotation";
import type {
  Course,
  QuoteStudent,
  CourseSelection,
  AppliedDiscount,
  SiblingDiscountConfig,
  MultiCourseDiscountConfig,
  PricingTier,
} from "../types/quotation";

// ─── Test Fixtures ────────────────────────────────────────────────────────

const mkTier = (billingMode: any, amount: number, id = "t1"): PricingTier => ({
  id,
  billingMode,
  amount,
});

const ABACUS_L1: Course = {
  id: "c1",
  name: "Abacus Level 1",
  description: "Foundation abacus",
  category: "Beginner",
  duration: "6 months",
  classesPerWeek: 2,
  classDuration: "60 min",
  mode: "offline",
  pricingTiers: [
    mkTier("monthly", 1200, "t1"),
    mkTier("quarterly", 3300, "t2"),
    mkTier("half_yearly", 6000, "t3"),
  ],
  registrationFee: 500,
  materialFee: 800,
  examFee: 200,
  defaultDiscount: null,
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const VEDIC_ADVANCED: Course = {
  id: "c4",
  name: "Vedic Maths Advanced",
  description: "Advanced vedic",
  category: "Advanced",
  duration: "6 months",
  classesPerWeek: 3,
  classDuration: "60 min",
  mode: "online",
  pricingTiers: [mkTier("monthly", 1500, "t4")],
  registrationFee: 500,
  materialFee: 1200,
  examFee: 300,
  // 10% early-bird on tuition only
  defaultDiscount: {
    type: "percentage",
    value: 10,
    label: "Early Bird",
    appliesTo: "tuition",
    excludeRegistration: true,
    excludeMaterial: true,
  },
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const FREE_COURSE: Course = {
  id: "c0",
  name: "Free Trial",
  description: "Free",
  category: "Beginner",
  duration: "1 month",
  classesPerWeek: 1,
  classDuration: "30 min",
  mode: "online",
  pricingTiers: [mkTier("monthly", 0, "t0")],
  registrationFee: 0,
  materialFee: 0,
  examFee: 0,
  defaultDiscount: null,
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const ALL_COURSES = [ABACUS_L1, VEDIC_ADVANCED, FREE_COURSE];

const mkSelection = (
  courseId: string,
  tierId = "t1",
  opts: Partial<CourseSelection> = {}
): CourseSelection => ({
  id: uid(),
  courseId,
  selectedTierId: tierId,
  includeRegistration: false,
  includeMaterial: false,
  includeExam: false,
  discount: null,
  ...opts,
});

const mkStudent = (
  courseSelections: CourseSelection[],
  name = "Arjun Sharma"
): QuoteStudent => ({
  id: uid(),
  name,
  age: "8",
  grade: "3rd",
  parentName: "Rajesh Sharma",
  parentPhone: "9876543210",
  parentEmail: "rajesh@example.com",
  address: "Delhi",
  relationship: "primary",
  courseSelections,
});

const NO_SIBLING: SiblingDiscountConfig = {
  enabled: false,
  tiers: [],
};

const NO_MULTI: MultiCourseDiscountConfig = {
  enabled: false,
  tiers: [],
};

const SIBLING_CONFIG: SiblingDiscountConfig = {
  enabled: true,
  tiers: [
    { studentCount: 2, type: "percentage", value: 5 },
    { studentCount: 3, type: "percentage", value: 10 },
  ],
};

const MULTI_COURSE_CONFIG: MultiCourseDiscountConfig = {
  enabled: true,
  tiers: [
    { courseCount: 2, type: "percentage", value: 5 },
    { courseCount: 3, type: "percentage", value: 10 },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// 1. formatINR
// ════════════════════════════════════════════════════════════════════════════

describe("formatINR — Indian number formatting", () => {
  it("formats zero", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("formats below 1000 — no separator", () => {
    expect(formatINR(999)).toBe("₹999");
  });

  it("formats exactly 1000", () => {
    expect(formatINR(1000)).toBe("₹1,000");
  });

  it("formats 10000 as ₹10,000 (not ₹10.000)", () => {
    expect(formatINR(10000)).toBe("₹10,000");
  });

  it("formats 100000 as ₹1,00,000 — Indian lakh system", () => {
    expect(formatINR(100000)).toBe("₹1,00,000");
  });

  it("formats 1200000 as ₹12,00,000 — Indian crore system", () => {
    expect(formatINR(1200000)).toBe("₹12,00,000");
  });

  it("formats 1500 correctly", () => {
    expect(formatINR(1500)).toBe("₹1,500");
  });

  it("does NOT use western comma (12,000 not 1,20,00)", () => {
    // 120000 = 1 lakh 20 thousand → ₹1,20,000
    expect(formatINR(120000)).toBe("₹1,20,000");
  });

  it("handles negative values gracefully (no crash)", () => {
    // Negative amounts should not appear in production but must not throw
    expect(() => formatINR(-500)).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. monthlyEquivalent
// ════════════════════════════════════════════════════════════════════════════

describe("monthlyEquivalent", () => {
  it("returns null for one-time billing (no monthly equiv possible)", () => {
    expect(monthlyEquivalent(mkTier("one_time", 5000))).toBeNull();
  });

  it("returns same amount for monthly", () => {
    expect(monthlyEquivalent(mkTier("monthly", 1200))).toBe(1200);
  });

  it("returns ¼ of quarterly amount", () => {
    // 3300 / 3 = 1100
    expect(monthlyEquivalent(mkTier("quarterly", 3300))).toBe(1100);
  });

  it("returns ⅙ of half-yearly amount", () => {
    // 6000 / 6 = 1000
    expect(monthlyEquivalent(mkTier("half_yearly", 6000))).toBe(1000);
  });

  it("returns 1/12 of annual amount", () => {
    // 12000 / 12 = 1000
    expect(monthlyEquivalent(mkTier("annually", 12000))).toBe(1000);
  });

  it("returns null for per_class billing (no monthly equiv possible)", () => {
    expect(monthlyEquivalent(mkTier("per_class", 200))).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. uid
// ════════════════════════════════════════════════════════════════════════════

describe("uid — unique ID generator", () => {
  it("generates a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(4);
  });

  it("generates unique IDs across 1000 calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, uid));
    expect(ids.size).toBe(1000);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. computeLineItem
// ════════════════════════════════════════════════════════════════════════════

describe("computeLineItem — per-course calculation", () => {
  it("returns null for a course that doesn't exist", () => {
    const sel = mkSelection("nonexistent");
    expect(computeLineItem(sel, ALL_COURSES)).toBeNull();
  });

  it("returns null if course has no pricing tiers", () => {
    const emptyTierCourse: Course = { ...ABACUS_L1, id: "cX", pricingTiers: [] };
    const sel = mkSelection("cX");
    expect(computeLineItem(sel, [emptyTierCourse])).toBeNull();
  });

  // ── baseline (no fees, no discount) ──────────────────────────────────────

  it("computes basic tuition — no optional fees, no discount", () => {
    const sel = mkSelection("c1", "t1");
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.tuitionFee).toBe(1200);
    expect(li.registrationFee).toBe(0);
    expect(li.materialFee).toBe(0);
    expect(li.examFee).toBe(0);
    expect(li.grossTotal).toBe(1200);
    expect(li.discountAmount).toBe(0);
    expect(li.netTotal).toBe(1200);
  });

  // ── optional fee toggles ─────────────────────────────────────────────────

  it("includes registration fee when toggled", () => {
    const sel = mkSelection("c1", "t1", { includeRegistration: true });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.registrationFee).toBe(500);
    expect(li.grossTotal).toBe(1700); // 1200 + 500
  });

  it("includes material fee when toggled", () => {
    const sel = mkSelection("c1", "t1", { includeMaterial: true });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.materialFee).toBe(800);
    expect(li.grossTotal).toBe(2000); // 1200 + 800
  });

  it("includes exam fee when toggled", () => {
    const sel = mkSelection("c1", "t1", { includeExam: true });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.examFee).toBe(200);
    expect(li.grossTotal).toBe(1400); // 1200 + 200
  });

  it("includes ALL fees when all toggled", () => {
    const sel = mkSelection("c1", "t1", {
      includeRegistration: true,
      includeMaterial: true,
      includeExam: true,
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.grossTotal).toBe(2700); // 1200 + 500 + 800 + 200
  });

  // ── custom discount on selection ─────────────────────────────────────────

  it("applies flat discount from selection", () => {
    const sel = mkSelection("c1", "t1", {
      discount: { type: "flat", value: 200, label: "Diwali" },
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.discountAmount).toBe(200);
    expect(li.netTotal).toBe(1000);
  });

  it("applies percentage discount from selection", () => {
    const sel = mkSelection("c1", "t1", {
      discount: { type: "percentage", value: 10, label: "10% off" },
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    // 10% of 1200 = 120
    expect(li.discountAmount).toBe(120);
    expect(li.netTotal).toBe(1080);
  });

  it("applies course default discount when selection has no discount", () => {
    // VEDIC_ADVANCED has 10% Early Bird on tuition only
    const sel = mkSelection("c4", "t4");
    const li = computeLineItem(sel, ALL_COURSES)!;
    // 10% of 1500 = 150
    expect(li.discountAmount).toBe(150);
    expect(li.netTotal).toBe(1350);
  });

  it("selection-level discount overrides course default discount", () => {
    // Course default is 10%, selection overrides to flat ₹100
    const sel = mkSelection("c4", "t4", {
      discount: { type: "flat", value: 100, label: "Override" },
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.discountAmount).toBe(100);
    expect(li.netTotal).toBe(1400);
  });

  // ── edge: discount exceeds gross ─────────────────────────────────────────

  it("caps flat discount at gross total — never negative", () => {
    const sel = mkSelection("c1", "t1", {
      discount: { type: "flat", value: 99999, label: "Massive" },
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    // netTotal must be ≥ 0
    expect(li.netTotal).toBeGreaterThanOrEqual(0);
    expect(li.discountAmount).toBeLessThanOrEqual(li.grossTotal);
  });

  it("caps 100% percentage discount correctly", () => {
    const sel = mkSelection("c1", "t1", {
      discount: { type: "percentage", value: 100, label: "Full" },
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.netTotal).toBeGreaterThanOrEqual(0);
  });

  it("caps >100% percentage discount — no negative net", () => {
    const sel = mkSelection("c1", "t1", {
      discount: { type: "percentage", value: 150, label: "Overgenerous" },
    });
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.netTotal).toBeGreaterThanOrEqual(0);
  });

  // ── free course ───────────────────────────────────────────────────────────

  it("handles zero-fee course — all amounts zero", () => {
    const sel = mkSelection("c0", "t0");
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.tuitionFee).toBe(0);
    expect(li.grossTotal).toBe(0);
    expect(li.discountAmount).toBe(0);
    expect(li.netTotal).toBe(0);
  });

  // ── tier fallback ─────────────────────────────────────────────────────────

  it("falls back to first tier if selectedTierId is unknown", () => {
    const sel = mkSelection("c1", "NONEXISTENT_TIER");
    const li = computeLineItem(sel, ALL_COURSES)!;
    // Should not crash; fall back to first tier (monthly ₹1200)
    expect(li.tuitionFee).toBe(1200);
  });

  // ── billing label ─────────────────────────────────────────────────────────

  it("returns correct billing label for monthly tier", () => {
    const sel = mkSelection("c1", "t1");
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.billingLabel).toBe("Monthly");
  });

  it("returns correct billing label for quarterly tier", () => {
    const sel = mkSelection("c1", "t2");
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.billingLabel).toBe("Quarterly");
    expect(li.tuitionFee).toBe(3300);
  });

  it("returns correct billing label for half-yearly tier", () => {
    const sel = mkSelection("c1", "t3");
    const li = computeLineItem(sel, ALL_COURSES)!;
    expect(li.billingLabel).toBe("Half-Yearly");
    expect(li.tuitionFee).toBe(6000);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. computeStudentSummary — multi-course + multi-course discount
// ════════════════════════════════════════════════════════════════════════════

describe("computeStudentSummary", () => {
  it("student with no courses returns all zeros", () => {
    const student = mkStudent([]);
    const ss = computeStudentSummary(student, ALL_COURSES, NO_MULTI);
    expect(ss.grossTotal).toBe(0);
    expect(ss.netTotal).toBe(0);
    expect(ss.lineItems.length).toBe(0);
  });

  it("aggregates one course correctly", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const ss = computeStudentSummary(student, ALL_COURSES, NO_MULTI);
    expect(ss.grossTotal).toBe(1200);
    expect(ss.netTotal).toBe(1200);
    expect(ss.lineItems.length).toBe(1);
    expect(ss.multiCourseDiscountAmount).toBe(0);
  });

  it("aggregates two courses: tuition, fees summed", () => {
    const s1 = mkSelection("c1", "t1", { includeRegistration: true });
    const s2 = mkSelection("c4", "t4", { includeMaterial: true });
    const student = mkStudent([s1, s2]);
    const ss = computeStudentSummary(student, ALL_COURSES, NO_MULTI);
    // c1: 1200 + 500reg = 1700; c4: 1500 - 150(early bird) + 1200mat = net 2550
    expect(ss.grossTotal).toBe(1700 + 2700); // 4400
    expect(ss.subtotalRegistration).toBe(500);
    expect(ss.subtotalMaterial).toBe(1200);
  });

  // ── multi-course discount ─────────────────────────────────────────────────

  it("does not apply multi-course when only 1 course", () => {
    const s1 = mkSelection("c1", "t1");
    const student = mkStudent([s1]);
    const ss = computeStudentSummary(student, ALL_COURSES, MULTI_COURSE_CONFIG);
    expect(ss.multiCourseDiscountAmount).toBe(0);
  });

  it("applies 5% multi-course discount at 2 courses", () => {
    const s1 = mkSelection("c1", "t1");
    const s2 = mkSelection("c4", "t4");
    const student = mkStudent([s1, s2]);
    const ss = computeStudentSummary(student, ALL_COURSES, MULTI_COURSE_CONFIG);
    // 5% on subtotalTuition: (1200 + 1500) * 5% = 135
    expect(ss.multiCourseDiscountAmount).toBe(135);
    // multi-course discount INCLUDED in netTotal
    expect(ss.netTotal).toBeLessThan(ss.grossTotal - ss.courseDiscountsTotal);
  });

  it("applies correct tier at each course count boundary", () => {
    // 2 courses → 5%, 3+ courses → 10%
    const twoCourseCfg: MultiCourseDiscountConfig = {
      enabled: true,
      tiers: [
        { courseCount: 2, type: "percentage", value: 5 },
        { courseCount: 3, type: "percentage", value: 10 },
      ],
    };
    const s1 = mkSelection("c1", "t1");
    const s2 = mkSelection("c4", "t4");
    const s3 = mkSelection("c0", "t0");
    const student = mkStudent([s1, s2, s3]);
    const ss = computeStudentSummary(student, ALL_COURSES, twoCourseCfg);
    // 3 courses → highest qualifying tier = 10%
    // tuition: 1200 + 1500 + 0 = 2700; 10% of 2700 = 270
    expect(ss.multiCourseDiscountAmount).toBe(270);
  });

  it("does not apply multi-course if config disabled", () => {
    const s1 = mkSelection("c1", "t1");
    const s2 = mkSelection("c4", "t4");
    const student = mkStudent([s1, s2]);
    const disabledCfg: MultiCourseDiscountConfig = { enabled: false, tiers: [{ courseCount: 2, type: "percentage", value: 20 }] };
    const ss = computeStudentSummary(student, ALL_COURSES, disabledCfg);
    expect(ss.multiCourseDiscountAmount).toBe(0);
  });

  it("student name falls back to 'Student' when blank", () => {
    const student = mkStudent([], "");
    const ss = computeStudentSummary(student, ALL_COURSES, NO_MULTI);
    expect(ss.studentName).toBe("Student");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. computeQuoteSummary — full quote with all discount layers
// ════════════════════════════════════════════════════════════════════════════

describe("computeQuoteSummary", () => {
  it("empty quote → all zeros", () => {
    const summary = computeQuoteSummary([], ALL_COURSES, [], NO_SIBLING, NO_MULTI);
    expect(summary.grandGross).toBe(0);
    expect(summary.grandTotal).toBe(0);
    expect(totalSavings(summary)).toBe(0);
  });

  it("single student, single course, no discounts", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const summary = computeQuoteSummary([student], ALL_COURSES, [], NO_SIBLING, NO_MULTI);
    expect(summary.grandGross).toBe(1200);
    expect(summary.grandTotal).toBe(1200);
    expect(summary.gstAmount).toBe(0);
    expect(totalSavings(summary)).toBe(0);
  });

  // ── sibling discount ──────────────────────────────────────────────────────

  it("single student → NO sibling discount", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const summary = computeQuoteSummary([student], ALL_COURSES, [], SIBLING_CONFIG, NO_MULTI);
    expect(summary.siblingDiscountAmount).toBe(0);
  });

  it("two students → 5% sibling discount applied on correct base", () => {
    const s1 = mkStudent([mkSelection("c1", "t1")], "Student 1");
    const s2 = mkStudent([mkSelection("c4", "t4")], "Student 2");
    const summary = computeQuoteSummary([s1, s2], ALL_COURSES, [], SIBLING_CONFIG, NO_MULTI);
    // s1 net: 1200; c4 has 10% default discount → 1500-150=1350
    // combined net before sibling = 1200 + 1350 = 2550
    // 5% of 2550 = 127.5 → 127 (Math.round or Math.floor?)
    // Our engine uses Math.round
    expect(summary.siblingDiscountAmount).toBe(Math.round(2550 * 5 / 100));
    expect(summary.grandTotal).toBeLessThan(2550);
  });

  it("three students → escalates to 10% sibling tier", () => {
    const threeTierCfg: SiblingDiscountConfig = {
      enabled: true,
      tiers: [
        { studentCount: 2, type: "percentage", value: 5 },
        { studentCount: 3, type: "percentage", value: 10 },
      ],
    };
    const s1 = mkStudent([mkSelection("c1", "t1")], "S1");
    const s2 = mkStudent([mkSelection("c1", "t1")], "S2");
    const s3 = mkStudent([mkSelection("c1", "t1")], "S3");
    const summary = computeQuoteSummary([s1, s2, s3], ALL_COURSES, [], threeTierCfg, NO_MULTI);
    // each net: 1200; combined: 3600; 10% = 360
    expect(summary.siblingDiscountAmount).toBe(360);
  });

  it("sibling discount disabled → no sibling deduction", () => {
    const s1 = mkStudent([mkSelection("c1", "t1")], "S1");
    const s2 = mkStudent([mkSelection("c1", "t1")], "S2");
    const disabledSibling: SiblingDiscountConfig = {
      enabled: false,
      tiers: [{ studentCount: 2, type: "percentage", value: 50 }],
    };
    const summary = computeQuoteSummary([s1, s2], ALL_COURSES, [], disabledSibling, NO_MULTI);
    expect(summary.siblingDiscountAmount).toBe(0);
  });

  // ── quote-level discounts ─────────────────────────────────────────────────

  it("applies flat quote-level discount", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const discount: AppliedDiscount = {
      id: uid(),
      name: "Diwali Offer",
      type: "flat",
      value: 300,
      appliesTo: "grand_total",
      calculatedAmount: 0,
    };
    const summary = computeQuoteSummary([student], ALL_COURSES, [discount], NO_SIBLING, NO_MULTI);
    expect(summary.quoteLevelDiscounts[0].calculatedAmount).toBe(300);
    expect(summary.grandTotal).toBe(900); // 1200 - 300
  });

  it("applies percentage quote-level discount", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const discount: AppliedDiscount = {
      id: uid(),
      name: "10% Off",
      type: "percentage",
      value: 10,
      appliesTo: "grand_total",
      calculatedAmount: 0,
    };
    const summary = computeQuoteSummary([student], ALL_COURSES, [discount], NO_SIBLING, NO_MULTI);
    expect(summary.quoteLevelDiscounts[0].calculatedAmount).toBe(120); // 10% of 1200
    expect(summary.grandTotal).toBe(1080);
  });

  it("stacks multiple quote-level discounts sequentially", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const d1: AppliedDiscount = { id: uid(), name: "Offer A", type: "flat", value: 200, appliesTo: "grand_total", calculatedAmount: 0 };
    const d2: AppliedDiscount = { id: uid(), name: "Offer B", type: "flat", value: 100, appliesTo: "grand_total", calculatedAmount: 0 };
    const summary = computeQuoteSummary([student], ALL_COURSES, [d1, d2], NO_SIBLING, NO_MULTI);
    // After d1: 1200 - 200 = 1000; after d2: 1000 - 100 = 900
    expect(summary.grandTotal).toBe(900);
    expect(summary.quoteLevelDiscountsTotal).toBe(300);
  });

  it("quote-level discount cannot produce negative grand total", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const bigDiscount: AppliedDiscount = {
      id: uid(),
      name: "Free Pass",
      type: "flat",
      value: 999999,
      appliesTo: "grand_total",
      calculatedAmount: 0,
    };
    const summary = computeQuoteSummary([student], ALL_COURSES, [bigDiscount], NO_SIBLING, NO_MULTI);
    expect(summary.grandTotal).toBeGreaterThanOrEqual(0);
  });

  // ── GST ───────────────────────────────────────────────────────────────────

  it("computes 0 GST when rate is 0", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const summary = computeQuoteSummary([student], ALL_COURSES, [], NO_SIBLING, NO_MULTI, 0);
    expect(summary.gstAmount).toBe(0);
  });

  it("computes 18% GST on pre-GST amount", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const summary = computeQuoteSummary([student], ALL_COURSES, [], NO_SIBLING, NO_MULTI, 18);
    // pre-GST = 1200; 18% = 216
    expect(summary.gstAmount).toBe(216);
    expect(summary.grandTotal).toBe(1416);
  });

  it("GST applies AFTER all discounts", () => {
    const sel = mkSelection("c1", "t1");
    const student = mkStudent([sel]);
    const discount: AppliedDiscount = {
      id: uid(), name: "Off", type: "flat", value: 200, appliesTo: "grand_total", calculatedAmount: 0,
    };
    // pre-discount total = 1200, post-discount = 1000
    // 18% GST on 1000 = 180, grandTotal = 1180
    const summary = computeQuoteSummary([student], ALL_COURSES, [discount], NO_SIBLING, NO_MULTI, 18);
    expect(summary.gstAmount).toBe(180);
    expect(summary.grandTotal).toBe(1180);
  });

  // ── discount stacking order ───────────────────────────────────────────────

  it("discount layers stack in correct priority: course→multi-course→sibling→quote-level", () => {
    // Course c1 monthly ₹1200, 10% course discount = ₹1080 per student
    // 2 students → sibling 5%
    // 1 quote-level ₹100 flat
    const s1_sel = mkSelection("c1", "t1", {
      discount: { type: "percentage", value: 10, label: "Course" },
    });
    const s2_sel = mkSelection("c1", "t1", {
      discount: { type: "percentage", value: 10, label: "Course" },
    });
    const s1 = mkStudent([s1_sel], "S1");
    const s2 = mkStudent([s2_sel], "S2");
    const qDiscount: AppliedDiscount = { id: uid(), name: "QL", type: "flat", value: 100, appliesTo: "grand_total", calculatedAmount: 0 };

    const summary = computeQuoteSummary([s1, s2], ALL_COURSES, [qDiscount], SIBLING_CONFIG, NO_MULTI);

    // Course discounts: 120 + 120 = 240
    expect(summary.totalCourseDiscounts).toBe(240);
    // After course discounts: 1080 + 1080 = 2160
    // Sibling 5% of 2160 = 108
    expect(summary.siblingDiscountAmount).toBe(108);
    // After sibling: 2160 - 108 = 2052
    // Quote-level: ₹100 flat → 2052 - 100 = 1952
    expect(summary.grandTotal).toBe(1952);
  });

  // ── totalSavings ──────────────────────────────────────────────────────────

  it("totalSavings sums all discount types", () => {
    const s1_sel = mkSelection("c1", "t1", {
      discount: { type: "percentage", value: 10, label: "10% off" },
    });
    const s2_sel = mkSelection("c1", "t1");
    const s1 = mkStudent([s1_sel], "S1");
    const s2 = mkStudent([s2_sel], "S2");
    const qd: AppliedDiscount = { id: uid(), name: "QL", type: "flat", value: 50, appliesTo: "grand_total", calculatedAmount: 0 };
    const summary = computeQuoteSummary([s1, s2], ALL_COURSES, [qd], SIBLING_CONFIG, NO_MULTI);

    const savings = totalSavings(summary);
    const expectedSavings =
      summary.totalCourseDiscounts +
      summary.totalMultiCourseDiscounts +
      summary.siblingDiscountAmount +
      summary.quoteLevelDiscountsTotal;
    expect(savings).toBe(expectedSavings);
    expect(savings).toBeGreaterThan(0);
  });

  it("totalSavings is 0 when no discounts applied", () => {
    const student = mkStudent([mkSelection("c1", "t1")]);
    const summary = computeQuoteSummary([student], ALL_COURSES, [], NO_SIBLING, NO_MULTI);
    expect(totalSavings(summary)).toBe(0);
  });

  // ── real-world scenario ───────────────────────────────────────────────────

  it("REAL SCENARIO: 2 siblings, 2 courses each, sibling+multi-course discounts, ₹500 flat offer", () => {
    // Child 1: Abacus L1 monthly (₹1200) + Vedic Advanced monthly (₹1500)
    //   - c4 has 10% early bird → 1500 - 150 = 1350
    //   - multi-course: 5% of tuition (1200+1500) = 135 off
    //   - student 1 net: (1200 + 1350) - 135 = 2415

    // Child 2: Same courses
    //   - same calculation → 2415

    // Combined net before sibling: 4830
    // Sibling 5% of 4830 = 241.5 → 242 (Math.round)
    // After sibling: 4830 - 242 = 4588
    // Quote-level ₹500 flat: 4588 - 500 = 4088

    const mkSiblingSel = () => [
      mkSelection("c1", "t1"),
      mkSelection("c4", "t4"), // has 10% default discount
    ];
    const child1 = mkStudent(mkSiblingSel(), "Child 1");
    const child2 = mkStudent(mkSiblingSel(), "Child 2");
    const offer: AppliedDiscount = { id: uid(), name: "Flat Offer", type: "flat", value: 500, appliesTo: "grand_total", calculatedAmount: 0 };

    const summary = computeQuoteSummary(
      [child1, child2], ALL_COURSES, [offer], SIBLING_CONFIG, MULTI_COURSE_CONFIG
    );

    // Sanity: grand total < grand gross
    expect(summary.grandTotal).toBeLessThan(summary.grandGross);
    // Total savings must be > 0
    expect(totalSavings(summary)).toBeGreaterThan(0);
    // Grand total must be positive
    expect(summary.grandTotal).toBeGreaterThan(0);
    // Check the quote-level discount was applied
    expect(summary.quoteLevelDiscounts[0].calculatedAmount).toBe(500);
  });

  // ── multi-course with sibling ─────────────────────────────────────────────

  it("multi-course applies per-student (not globally)", () => {
    // One student takes 2 courses → gets multi-course
    // Another student takes 1 course → does NOT get multi-course
    const s1 = mkStudent([mkSelection("c1", "t1"), mkSelection("c4", "t4")], "S1"); // 2 courses
    const s2 = mkStudent([mkSelection("c1", "t1")], "S2");                            // 1 course
    const summary = computeQuoteSummary([s1, s2], ALL_COURSES, [], NO_SIBLING, MULTI_COURSE_CONFIG);
    // Only s1 should have multiCourseDiscountAmount > 0
    expect(summary.students[0].multiCourseDiscountAmount).toBeGreaterThan(0);
    expect(summary.students[1].multiCourseDiscountAmount).toBe(0);
  });

  // ── student with no valid courses ─────────────────────────────────────────

  it("student whose courseId references missing course — does not crash", () => {
    const badSel = mkSelection("course_DOES_NOT_EXIST");
    const student = mkStudent([badSel]);
    expect(() =>
      computeQuoteSummary([student], ALL_COURSES, [], NO_SIBLING, NO_MULTI)
    ).not.toThrow();
    const summary = computeQuoteSummary([student], ALL_COURSES, [], NO_SIBLING, NO_MULTI);
    expect(summary.grandTotal).toBe(0);
  });

  // ── BILLING_LABELS coverage ───────────────────────────────────────────────

  it("BILLING_LABELS covers all BillingMode values", () => {
    const modes = ["one_time", "monthly", "quarterly", "half_yearly", "annually", "per_class", "custom"];
    modes.forEach((mode) => {
      expect(BILLING_LABELS[mode as any]).toBeTruthy();
    });
  });

  it("BILLING_MONTHS is defined for all BillingMode values", () => {
    const modes = ["one_time", "monthly", "quarterly", "half_yearly", "annually", "per_class", "custom"];
    modes.forEach((mode) => {
      expect(BILLING_MONTHS[mode as any]).toBeGreaterThanOrEqual(0);
    });
  });
});
