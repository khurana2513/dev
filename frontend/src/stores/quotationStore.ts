/* ═══════════════════════════════════════════════════════════════
   Quotation Maker — Zustand Store
   All state persisted to localStorage per teacher.
   ═══════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  InstituteProfile, Course, DiscountPreset, Quotation, QuoteStudent,
  CourseSelection, AppliedDiscount, PaymentTerms, TCTemplate, QuoteTemplate,
  SiblingDiscountConfig, MultiCourseDiscountConfig, WizardStep, QuoteStatus,
} from "../types/quotation";
import { uid } from "../types/quotation";

// ─── Defaults ────────────────────────────────────────────────

const DEFAULT_PROFILE: InstituteProfile = {
  id: "default",
  orgName: "",
  tagline: "",
  logoDataUrl: null,
  phone: "",
  email: "",
  address: "",
  website: "",
  brandColor: "#7c3aed",
  quotePrefix: "QT",
  defaultValidityDays: 15,
  gstNumber: "",
  bankDetails: "",
  upiId: "",
  signatureText: "",
  signatureDataUrl: null,
};

const DEFAULT_PAYMENT_TERMS: PaymentTerms = {
  fullPayment: true,
  partPayment: false,
  installments: [],
  dueDate: "",
  acceptedModes: ["cash", "upi", "bank_transfer"],
  lateFeeClause: "",
};

const EMPTY_STUDENT: () => QuoteStudent = () => ({
  id: uid(),
  name: "",
  age: "",
  grade: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  address: "",
  relationship: "primary",
  courseSelections: [],
});

// ─── Store Interface ─────────────────────────────────────────

interface QuotationStore {
  // ── Data ──
  profile: InstituteProfile;
  courses: Course[];
  discountPresets: DiscountPreset[];
  siblingDiscount: SiblingDiscountConfig;
  multiCourseDiscount: MultiCourseDiscountConfig;
  quotations: Quotation[];
  tcTemplates: TCTemplate[];
  quoteTemplates: QuoteTemplate[];
  nextQuoteSeq: number;
  seeded: boolean;

  // ── Wizard State ──
  wizardStep: WizardStep;
  draftStudents: QuoteStudent[];
  draftDiscounts: AppliedDiscount[];
  draftPaymentTerms: PaymentTerms;
  draftTermsAndConditions: string;
  draftValidUntil: string;
  draftNotes: string;
  editingQuoteId: string | null; // null = new quote

  // ── Profile ──
  setProfile: (p: Partial<InstituteProfile>) => void;

  // ── Courses ──
  addCourse: (c: Course) => void;
  updateCourse: (id: string, c: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  toggleCourseActive: (id: string) => void;

  // ── Discount Presets ──
  addDiscountPreset: (d: DiscountPreset) => void;
  updateDiscountPreset: (id: string, d: Partial<DiscountPreset>) => void;
  deleteDiscountPreset: (id: string) => void;
  setSiblingDiscount: (c: Partial<SiblingDiscountConfig>) => void;
  setMultiCourseDiscount: (c: Partial<MultiCourseDiscountConfig>) => void;

  // ── T&C Templates ──
  addTCTemplate: (t: TCTemplate) => void;
  deleteTCTemplate: (id: string) => void;

  // ── Wizard Navigation ──
  setWizardStep: (s: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // ── Wizard — Students ──
  addStudent: () => void;
  removeStudent: (id: string) => void;
  updateStudent: (id: string, data: Partial<QuoteStudent>) => void;
  addCourseSelection: (studentId: string, sel: CourseSelection) => void;
  updateCourseSelection: (studentId: string, selId: string, data: Partial<CourseSelection>) => void;
  removeCourseSelection: (studentId: string, selId: string) => void;

  // ── Wizard — Discounts ──
  setDraftDiscounts: (d: AppliedDiscount[]) => void;
  addDraftDiscount: (d: AppliedDiscount) => void;
  removeDraftDiscount: (id: string) => void;

  // ── Wizard — Terms ──
  setDraftPaymentTerms: (t: Partial<PaymentTerms>) => void;
  setDraftTC: (tc: string) => void;
  setDraftValidUntil: (d: string) => void;
  setDraftNotes: (n: string) => void;

  // ── Quotation Actions ──
  saveQuotation: () => Quotation;
  updateQuotationStatus: (id: string, status: QuoteStatus) => void;
  duplicateQuotation: (id: string) => void;
  deleteQuotation: (id: string) => void;
  loadQuoteForEdit: (id: string) => void;
  resetWizard: () => void;

  // ── Quick Quote ──
  startQuickQuote: (studentName: string, courseIds: string[], tierIds: string[]) => void;

  // ── Seed ──
  applySeed: (data: {
    profile: InstituteProfile;
    courses: Course[];
    discountPresets: DiscountPreset[];
    siblingDiscount: SiblingDiscountConfig;
    multiCourseDiscount: MultiCourseDiscountConfig;
    tcTemplates: TCTemplate[];
    quotations: Quotation[];
    nextQuoteSeq: number;
  }) => void;
}

// ─── Store Implementation ────────────────────────────────────

export const useQuotationStore = create<QuotationStore>()(
  persist(
    (set, get) => ({
      // ─ Data ─
      profile: DEFAULT_PROFILE,
      courses: [],
      discountPresets: [],
      siblingDiscount: { enabled: false, tiers: [], appliesTo: "second_onwards" },
      multiCourseDiscount: { enabled: false, tiers: [] },
      quotations: [],
      tcTemplates: [],
      quoteTemplates: [],
      nextQuoteSeq: 1,
      seeded: false,

      // ─ Wizard ─
      wizardStep: 1,
      draftStudents: [EMPTY_STUDENT()],
      draftDiscounts: [],
      draftPaymentTerms: { ...DEFAULT_PAYMENT_TERMS },
      draftTermsAndConditions: "",
      draftValidUntil: "",
      draftNotes: "",
      editingQuoteId: null,

      // ── Profile ──
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      // ── Courses ──
      addCourse: (c) => set((s) => ({ courses: [...s.courses, c] })),
      updateCourse: (id, data) =>
        set((s) => ({
          courses: s.courses.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      deleteCourse: (id) => set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),
      toggleCourseActive: (id) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          ),
        })),

      // ── Discount Presets ──
      addDiscountPreset: (d) => set((s) => ({ discountPresets: [...s.discountPresets, d] })),
      updateDiscountPreset: (id, d) =>
        set((s) => ({
          discountPresets: s.discountPresets.map((p) =>
            p.id === id ? { ...p, ...d } : p
          ),
        })),
      deleteDiscountPreset: (id) =>
        set((s) => ({ discountPresets: s.discountPresets.filter((p) => p.id !== id) })),
      setSiblingDiscount: (c) =>
        set((s) => ({ siblingDiscount: { ...s.siblingDiscount, ...c } })),
      setMultiCourseDiscount: (c) =>
        set((s) => ({ multiCourseDiscount: { ...s.multiCourseDiscount, ...c } })),

      // ── T&C Templates ──
      addTCTemplate: (t) => set((s) => ({ tcTemplates: [...s.tcTemplates, t] })),
      deleteTCTemplate: (id) =>
        set((s) => ({ tcTemplates: s.tcTemplates.filter((t) => t.id !== id) })),

      // ── Wizard Navigation ──
      setWizardStep: (step) => set({ wizardStep: step }),
      nextStep: () =>
        set((s) => ({ wizardStep: Math.min(5, s.wizardStep + 1) as WizardStep })),
      prevStep: () =>
        set((s) => ({ wizardStep: Math.max(1, s.wizardStep - 1) as WizardStep })),

      // ── Wizard — Students ──
      addStudent: () =>
        set((s) => ({
          draftStudents: [
            ...s.draftStudents,
            { ...EMPTY_STUDENT(), relationship: "sibling" },
          ],
        })),
      removeStudent: (id) =>
        set((s) => ({
          draftStudents: s.draftStudents.filter((st) => st.id !== id),
        })),
      updateStudent: (id, data) =>
        set((s) => ({
          draftStudents: s.draftStudents.map((st) =>
            st.id === id ? { ...st, ...data } : st
          ),
        })),
      addCourseSelection: (studentId, sel) =>
        set((s) => ({
          draftStudents: s.draftStudents.map((st) =>
            st.id === studentId
              ? { ...st, courseSelections: [...(st.courseSelections ?? []), sel] }
              : st
          ),
        })),
      updateCourseSelection: (studentId, selId, data) =>
        set((s) => ({
          draftStudents: s.draftStudents.map((st) =>
            st.id === studentId
              ? {
                  ...st,
                  courseSelections: (st.courseSelections ?? []).map((cs) =>
                    cs.id === selId ? { ...cs, ...data } : cs
                  ),
                }
              : st
          ),
        })),
      removeCourseSelection: (studentId, selId) =>
        set((s) => ({
          draftStudents: s.draftStudents.map((st) =>
            st.id === studentId
              ? {
                  ...st,
                  courseSelections: (st.courseSelections ?? []).filter((cs) => cs.id !== selId),
                }
              : st
          ),
        })),

      // ── Wizard — Discounts ──
      setDraftDiscounts: (d) => set({ draftDiscounts: d }),
      addDraftDiscount: (d) =>
        set((s) => ({ draftDiscounts: [...s.draftDiscounts, d] })),
      removeDraftDiscount: (id) =>
        set((s) => ({
          draftDiscounts: s.draftDiscounts.filter((d) => d.id !== id),
        })),

      // ── Wizard — Terms ──
      setDraftPaymentTerms: (t) =>
        set((s) => ({ draftPaymentTerms: { ...s.draftPaymentTerms, ...t } })),
      setDraftTC: (tc) => set({ draftTermsAndConditions: tc }),
      setDraftValidUntil: (d) => set({ draftValidUntil: d }),
      setDraftNotes: (n) => set({ draftNotes: n }),

      // ── Save Quotation ──
      saveQuotation: () => {
        const s = get();
        const isEdit = !!s.editingQuoteId;
        const existing = isEdit
          ? s.quotations.find((q) => q.id === s.editingQuoteId)
          : null;

        const seq = isEdit ? 0 : s.nextQuoteSeq;
        const quoteNumber = isEdit
          ? existing?.quoteNumber ?? `${s.profile.quotePrefix}-${String(seq).padStart(3, "0")}`
          : `${s.profile.quotePrefix}-${String(seq).padStart(3, "0")}`;

        const now = new Date().toISOString();
        const quote: Quotation = {
          id: isEdit ? s.editingQuoteId! : uid(),
          quoteNumber,
          version: existing ? existing.version + 1 : 1,
          status: "draft",
          students: s.draftStudents,
          appliedDiscounts: s.draftDiscounts,
          paymentTerms: s.draftPaymentTerms,
          termsAndConditions: s.draftTermsAndConditions,
          validUntil: s.draftValidUntil,
          notes: s.draftNotes,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        set((st) => ({
          quotations: isEdit
            ? st.quotations.map((q) => (q.id === quote.id ? quote : q))
            : [quote, ...st.quotations],
          nextQuoteSeq: isEdit ? st.nextQuoteSeq : st.nextQuoteSeq + 1,
          editingQuoteId: null,
        }));

        // reset wizard
        get().resetWizard();
        return quote;
      },

      updateQuotationStatus: (id, status) =>
        set((s) => ({
          quotations: s.quotations.map((q) =>
            q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
          ),
        })),

      duplicateQuotation: (id) => {
        const s = get();
        const orig = s.quotations.find((q) => q.id === id);
        if (!orig) return;
        // Load into wizard for editing
        set({
          editingQuoteId: null,
          wizardStep: 1,
          draftStudents: orig.students.map((st) => ({
            ...st,
            id: uid(),
            name: "",
            courseSelections: (st.courseSelections ?? []).map((cs) => ({ ...cs, id: uid() })),
          })),
          draftDiscounts: orig.appliedDiscounts.map((d) => ({ ...d, id: uid() })),
          draftPaymentTerms: { ...orig.paymentTerms },
          draftTermsAndConditions: orig.termsAndConditions,
          draftValidUntil: "",
          draftNotes: "",
        });
      },

      deleteQuotation: (id) =>
        set((s) => ({
          quotations: s.quotations.filter((q) => q.id !== id),
        })),

      loadQuoteForEdit: (id) => {
        const s = get();
        const q = s.quotations.find((q) => q.id === id);
        if (!q) return;
        set({
          editingQuoteId: id,
          wizardStep: 1,
          draftStudents: q.students,
          draftDiscounts: q.appliedDiscounts,
          draftPaymentTerms: q.paymentTerms,
          draftTermsAndConditions: q.termsAndConditions,
          draftValidUntil: q.validUntil,
          draftNotes: q.notes,
        });
      },

      resetWizard: () =>
        set({
          wizardStep: 1,
          draftStudents: [EMPTY_STUDENT()],
          draftDiscounts: [],
          draftPaymentTerms: { ...DEFAULT_PAYMENT_TERMS },
          draftTermsAndConditions: "",
          draftValidUntil: "",
          draftNotes: "",
          editingQuoteId: null,
        }),

      // ── Quick Quote ──
      startQuickQuote: (studentName, courseIds, tierIds) => {
        const s = get();
        const selections: CourseSelection[] = courseIds.map((cid, i) => ({
          id: uid(),
          courseId: cid,
          selectedTierId: tierIds[i] || "",
          includeRegistration: false,
          includeMaterial: false,
          includeExam: false,
          discount: null,
        }));
        set({
          editingQuoteId: null,
          wizardStep: 5, // jump to review
          draftStudents: [{
            ...EMPTY_STUDENT(),
            name: studentName,
            courseSelections: selections,
          }],
          draftDiscounts: [],
          draftPaymentTerms: { ...DEFAULT_PAYMENT_TERMS },
          draftTermsAndConditions: s.tcTemplates[0]?.content ?? "",
          draftValidUntil: new Date(Date.now() + s.profile.defaultValidityDays * 86400000)
            .toISOString().slice(0, 10),
          draftNotes: "",
        });
      },

      // ── Seed ──
      applySeed: (data) =>
        set({
          ...data,
          seeded: true,
        }),
    }),
    {
      name: "talenthub-quotation-store",
      version: 1,
    }
  )
);
