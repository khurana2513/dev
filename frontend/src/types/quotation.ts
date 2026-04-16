/* ═══════════════════════════════════════════════════════════════
   Quotation Maker — Type Definitions
   ═══════════════════════════════════════════════════════════════ */

// ─── Profile ─────────────────────────────────────────────────
export interface InstituteProfile {
  id: string;
  orgName: string;
  tagline: string;
  logoDataUrl: string | null; // base64
  phone: string;
  email: string;
  address: string;
  website: string;
  brandColor: string;         // hex
  quotePrefix: string;        // "BMA"
  defaultValidityDays: number;
  gstNumber: string;
  bankDetails: string;
  upiId: string;
  signatureText: string;
  signatureDataUrl: string | null;
}

// ─── Course Catalogue ────────────────────────────────────────
export type BillingMode =
  | "one_time"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "annually"
  | "per_class"
  | "custom";

export const BILLING_LABELS: Record<BillingMode, string> = {
  one_time: "One-Time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  annually: "Annually",
  per_class: "Per Class",
  custom: "Custom",
};

/** How many months one cycle covers (for monthly-equiv calc) */
export const BILLING_MONTHS: Record<BillingMode, number> = {
  one_time: 0,
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  annually: 12,
  per_class: 0,
  custom: 0,
};

export interface PricingTier {
  id: string;
  billingMode: BillingMode;
  amount: number;
  customLabel?: string;        // "₹2,500 for 3 months"
  customDurationMonths?: number; // e.g. 3 — for monthly equiv calc
}

export type CourseMode = "offline" | "online" | "hybrid";

export interface CourseDiscount {
  type: "flat" | "percentage";
  value: number;
  label: string;
  appliesTo: "tuition" | "all" | "custom";
  excludeRegistration: boolean;
  excludeMaterial: boolean;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string;
  classesPerWeek: number;
  classDuration: string;
  mode: CourseMode;
  pricingTiers: PricingTier[];
  registrationFee: number;
  materialFee: number;
  examFee: number;
  defaultDiscount: CourseDiscount | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Student & Course Selection ──────────────────────────────
export type Relationship = "primary" | "sibling" | "cousin" | "friend" | "other";

export interface InlineDiscount {
  type: "flat" | "percentage";
  value: number;
  label: string;
}

export interface CourseSelection {
  id: string;           // unique per selection
  courseId: string;
  selectedTierId: string;
  includeRegistration: boolean;
  includeMaterial: boolean;
  includeExam: boolean;
  discount: InlineDiscount | null;
}

export interface QuoteStudent {
  id: string;
  name: string;
  age: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  relationship: Relationship;
  courseSelections: CourseSelection[];
}

// ─── Discount Engine ─────────────────────────────────────────
export type DiscountScope =
  | "total_tuition"
  | "grand_total"
  | "specific_courses";

export interface DiscountPreset {
  id: string;
  name: string;
  type: "flat" | "percentage";
  value: number;
  appliesTo: DiscountScope;
  excludeRegistration: boolean;
  excludeMaterial: boolean;
  autoApply: boolean;
  validUntil?: string;
}

export interface SiblingDiscountTier {
  studentCount: number;
  type: "flat" | "percentage";
  value: number;
}

export interface MultiCourseDiscountTier {
  courseCount: number;
  type: "flat" | "percentage";
  value: number;
}

export interface SiblingDiscountConfig {
  enabled: boolean;
  tiers: SiblingDiscountTier[];
  appliesTo: "lowest" | "all" | "second_onwards";
}

export interface MultiCourseDiscountConfig {
  enabled: boolean;
  tiers: MultiCourseDiscountTier[];
}

export interface AppliedDiscount {
  id: string;
  presetId?: string;
  name: string;
  type: "flat" | "percentage";
  value: number;
  appliesTo: string;
  calculatedAmount: number; // resolved ₹ value
}

// ─── Payment Terms ───────────────────────────────────────────
export interface Installment {
  amount: number;
  dueDate: string;
  label: string;
}

export interface PaymentTerms {
  fullPayment: boolean;
  partPayment: boolean;
  installments: Installment[];
  dueDate: string;
  acceptedModes: string[];
  lateFeeClause: string;
}

// ─── T&C ─────────────────────────────────────────────────────
export interface TCTemplate {
  id: string;
  name: string;
  content: string;
}

// ─── Quote Template ──────────────────────────────────────────
export interface QuoteTemplate {
  id: string;
  name: string;
  courseIds: string[];
  discountPresetIds: string[];
  tcTemplateId: string;
  paymentTerms: PaymentTerms;
}

// ─── Quotation ───────────────────────────────────────────────
export type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "revised";

export const QUOTE_STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  draft:    { label: "Draft",    color: "text-zinc-400",   bg: "bg-zinc-500/10",    border: "border-zinc-500/20" },
  sent:     { label: "Sent",     color: "text-blue-400",   bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  accepted: { label: "Accepted", color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  expired:  { label: "Expired",  color: "text-red-400",    bg: "bg-red-500/10",     border: "border-red-500/20" },
  revised:  { label: "Revised",  color: "text-amber-400",  bg: "bg-amber-500/10",   border: "border-amber-500/20" },
};

export interface Quotation {
  id: string;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;
  students: QuoteStudent[];
  appliedDiscounts: AppliedDiscount[];
  paymentTerms: PaymentTerms;
  termsAndConditions: string;
  validUntil: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Calculation Results ─────────────────────────────────────
export interface CourseLineItem {
  courseId: string;
  courseName: string;
  billingLabel: string;
  tuitionFee: number;
  registrationFee: number;
  materialFee: number;
  examFee: number;
  grossTotal: number;
  discountLabel: string;
  discountAmount: number;
  netTotal: number;
}

export interface StudentSummary {
  studentId: string;
  studentName: string;
  lineItems: CourseLineItem[];
  subtotalTuition: number;
  subtotalRegistration: number;
  subtotalMaterial: number;
  subtotalExam: number;
  grossTotal: number;
  multiCourseDiscountAmount: number;
  multiCourseDiscountLabel: string;
  courseDiscountsTotal: number;
  netTotal: number;
}

export interface QuoteSummary {
  students: StudentSummary[];
  grandGross: number;
  totalCourseDiscounts: number;
  totalMultiCourseDiscounts: number;
  siblingDiscountAmount: number;
  siblingDiscountLabel: string;
  quoteLevelDiscounts: AppliedDiscount[];
  quoteLevelDiscountsTotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
}

// ─── Wizard State ────────────────────────────────────────────
export type WizardStep = 1 | 2 | 3 | 4 | 5;

// ─── Helpers ─────────────────────────────────────────────────

/** Format ₹ with Indian number system (₹1,20,000) */
export function formatINR(amount: number): string {
  if (amount === 0) return "₹0";
  const neg = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const s = abs.toString();
  if (s.length <= 3) return `${neg ? "-" : ""}₹${s}`;
  let result = s.slice(-3);
  let rest = s.slice(0, -3);
  while (rest.length > 2) {
    result = rest.slice(-2) + "," + result;
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) result = rest + "," + result;
  return `${neg ? "-" : ""}₹${result}`;
}

/** Monthly equivalent for a pricing tier */
export function monthlyEquivalent(tier: PricingTier): number | null {
  if (tier.billingMode === "custom" && tier.customDurationMonths && tier.customDurationMonths > 0) {
    return Math.round(tier.amount / tier.customDurationMonths);
  }
  const m = BILLING_MONTHS[tier.billingMode];
  if (m <= 0) return null;
  return Math.round(tier.amount / m);
}

/** Generate a unique ID */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
