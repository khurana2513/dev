/* ═══════════════════════════════════════════════════════════════
   QuotationMaker — Premium 5-step wizard + Profile + Courses
   ═══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Building2, Palette, GraduationCap, Users, Tags, FileText,
  CreditCard, Eye, ChevronRight, ChevronLeft, Plus, Trash2,
  Search, X, Check, Edit2, Copy, HelpCircle, Save, Download,
  Send, Share2, Zap, MapPin, Monitor, Wifi,
  AlertTriangle, Star,
  UserPlus, ArrowRight, Calendar, ToggleLeft, ToggleRight,
  Layers, Settings2,
} from "lucide-react";
import { useQuotationStore } from "../stores/quotationStore";
import {
  computeQuoteSummary, totalSavings, getSeedData,
} from "../lib/quotationEngine";
import QuotationPreview from "../components/quotation/QuotationPreview";
import type {
  Course, PricingTier, WizardStep,
  DiscountPreset, Installment,
} from "../types/quotation";
import {
  formatINR, monthlyEquivalent, uid, BILLING_LABELS,
} from "../types/quotation";

// ─── Animation variants ──────────────────────────────────────
const fadeSlide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.25, ease: "easeInOut" },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

// ─── Shared UI atoms ─────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <HelpCircle
        size={14}
        className="text-zinc-500 hover:text-zinc-300 cursor-help transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

function Input({ label, tooltip, error, className, type, onFocus, ...props }: any) {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === "number") e.target.select();
    onFocus?.(e);
  };
  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      {label && (
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          {label} {tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <input
        type={type}
        className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all w-full"
        onFocus={handleFocus}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function Select({ label, tooltip, children, className, ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      {label && (
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          {label} {tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <select
        className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-500/50 transition-all w-full"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100 transition"
    >
      <div className={`w-9 h-5 rounded-full relative transition-colors ${checked ? "bg-violet-500" : "bg-zinc-700"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </div>
      {label}
    </button>
  );
}

function Badge({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    zinc: "bg-zinc-700/50 text-zinc-300 border-zinc-600/50",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorMap[color] || colorMap.zinc}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-violet-400">{icon}</span>}
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Step Progress Bar ───────────────────────────────────────
const STEPS: { label: string; icon: React.ReactNode }[] = [
  { label: "Students", icon: <Users size={16} /> },
  { label: "Courses", icon: <GraduationCap size={16} /> },
  { label: "Discounts", icon: <Tags size={16} /> },
  { label: "Terms", icon: <CreditCard size={16} /> },
  { label: "Review", icon: <Eye size={16} /> },
];

function StepBar({ step, onStep }: { step: WizardStep; onStep: (s: WizardStep) => void }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const num = (i + 1) as WizardStep;
        const active = step === num;
        const done = step > num;
        return (
          <button
            key={i}
            onClick={() => onStep(num)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap
              ${active
                ? "bg-violet-500/15 border border-violet-500/40 text-violet-300"
                : done
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {done ? <Check size={14} /> : s.icon}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Animated total display ──────────────────────────────────
function AnimatedTotal({ amount, label, color = "text-violet-400" }: { amount: number; label: string; color?: string }) {
  return (
    <motion.div key={amount} initial={{ scale: 0.95, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="text-right">
      <div className={`text-xl sm:text-2xl font-black tracking-tight font-mono ${color}`}>{formatINR(amount)}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: Students
// ═══════════════════════════════════════════════════════════════

function Step1Students() {
  const { draftStudents, addStudent, removeStudent, updateStudent: updateStudentAction } = useQuotationStore();

  // Mark as used for future per-student inline actions
  void updateStudentAction;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-100">Student Details</h2>
        <button
          onClick={addStudent}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-500/10 border border-violet-500/25 text-violet-400 rounded-xl text-xs font-bold hover:bg-violet-500/20 transition"
        >
          <UserPlus size={14} /> Add Student
        </button>
      </div>

      {draftStudents.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/8 border border-blue-500/20 rounded-xl text-xs text-blue-400">
          <Users size={14} />
          <span className="font-semibold">{draftStudents.length} students</span> — Sibling/family discounts may apply in Step 3
        </div>
      )}

      <AnimatePresence>
        {draftStudents.map((student, idx) => (
          <motion.div
            key={student.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-zinc-200">
                  {idx === 0 ? "Primary Student" : "Student " + (idx + 1)}
                </span>
                {idx > 0 && (
                  <Select
                    value={student.relationship}
                    onChange={(e: any) => updateStudentAction(student.id, { relationship: e.target.value })}
                    className="!flex-row !items-center !gap-2"
                  >
                    <option value="sibling">Sibling</option>
                    <option value="cousin">Cousin</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </Select>
                )}
              </div>
              {draftStudents.length > 1 && (
                <button onClick={() => removeStudent(student.id)} className="text-zinc-500 hover:text-red-400 transition p-1">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Student Name" placeholder="Full name" value={student.name}
                onChange={(e: any) => updateStudentAction(student.id, { name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Age" placeholder="8" value={student.age}
                  onChange={(e: any) => updateStudentAction(student.id, { age: e.target.value })} />
                <Input label="Grade/Class" placeholder="3rd" value={student.grade}
                  onChange={(e: any) => updateStudentAction(student.id, { grade: e.target.value })} />
              </div>
              <Input label="Parent/Guardian Name" placeholder="Full name" value={student.parentName}
                onChange={(e: any) => updateStudentAction(student.id, { parentName: e.target.value })} />
              <Input label="Phone" placeholder="+91 98765 43210" value={student.parentPhone}
                onChange={(e: any) => updateStudentAction(student.id, { parentPhone: e.target.value })} />
              <Input label="Email" placeholder="parent@email.com" type="email" value={student.parentEmail}
                onChange={(e: any) => updateStudentAction(student.id, { parentEmail: e.target.value })} />
              <Input label="Address (optional)" placeholder="City, Area" value={student.address}
                onChange={(e: any) => updateStudentAction(student.id, { address: e.target.value })} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Course Selection
// ═══════════════════════════════════════════════════════════════

function Step2Courses() {
  const { draftStudents, courses, addCourseSelection, removeCourseSelection, updateCourseSelection, multiCourseDiscount } = useQuotationStore();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const activeCourses = courses.filter((c) => c.isActive);
  const categories = [...new Set(activeCourses.map((c) => c.category))];

  const filtered = activeCourses.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchCat = !catFilter || c.category === catFilter;
    return matchSearch && matchCat;
  });

  const modeIcon = (m: string) => {
    if (m === "online") return <Wifi size={12} />;
    if (m === "hybrid") return <Monitor size={12} />;
    return <MapPin size={12} />;
  };

  return (
    <div className="flex flex-col gap-5">
      {draftStudents.map((student, si) => (
        <div key={student.id} className="flex flex-col gap-4">
          {draftStudents.length > 1 && (
            <div className="flex items-center gap-2 text-sm font-bold text-violet-400 border-b border-zinc-800 pb-2">
              <span className="w-6 h-6 rounded-md bg-violet-500/15 flex items-center justify-center text-xs">{si + 1}</span>
              {student.name || "Student " + (si + 1)}
            </div>
          )}

          {/* Selected courses */}
          {student.courseSelections.length > 0 && (
            <div className="flex flex-col gap-2">
              {student.courseSelections.map((sel) => {
                const course = courses.find((c) => c.id === sel.courseId);
                if (!course) return null;
                const tier = course.pricingTiers.find((t) => t.id === sel.selectedTierId) || course.pricingTiers[0];
                return (
                  <motion.div key={sel.id} layout className="bg-zinc-900/80 border border-zinc-700/60 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-bold text-zinc-100">{course.name}</div>
                        <div className="text-xs text-zinc-500">{course.duration} · {course.classesPerWeek}×/wk</div>
                      </div>
                      <button onClick={() => removeCourseSelection(student.id, sel.id)} className="text-zinc-500 hover:text-red-400 transition">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {/* Billing tier */}
                      <Select
                        label="Billing"
                        value={sel.selectedTierId}
                        onChange={(e: any) => updateCourseSelection(student.id, sel.id, { selectedTierId: e.target.value })}
                      >
                        {course.pricingTiers.map((t) => {
                          const me = monthlyEquivalent(t);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.customLabel || BILLING_LABELS[t.billingMode]} — {formatINR(t.amount)}
                              {me ? ` (${formatINR(me)}/mo)` : ""}
                            </option>
                          );
                        })}
                      </Select>
                      <div className="flex items-end">
                        <div className="text-right w-full">
                          <div className="text-lg font-black text-violet-400 font-mono">{formatINR(tier?.amount ?? 0)}</div>
                          <div className="text-[10px] text-zinc-500">{tier?.customLabel || BILLING_LABELS[tier?.billingMode ?? "monthly"]}</div>
                        </div>
                      </div>
                    </div>

                    {/* Fee toggles */}
                    <div className="flex flex-wrap gap-4">
                      {course.registrationFee > 0 && (
                        <Toggle
                          checked={sel.includeRegistration}
                          onChange={(v) => updateCourseSelection(student.id, sel.id, { includeRegistration: v })}
                          label={`Registration ${formatINR(course.registrationFee)}`}
                        />
                      )}
                      {course.materialFee > 0 && (
                        <Toggle
                          checked={sel.includeMaterial}
                          onChange={(v) => updateCourseSelection(student.id, sel.id, { includeMaterial: v })}
                          label={`Material ${formatINR(course.materialFee)}`}
                        />
                      )}
                      {course.examFee > 0 && (
                        <Toggle
                          checked={sel.includeExam}
                          onChange={(v) => updateCourseSelection(student.id, sel.id, { includeExam: v })}
                          label={`Exam ${formatINR(course.examFee)}`}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Multi-course prompt */}
          {multiCourseDiscount.enabled && student.courseSelections.length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
              <Zap size={14} />
              Multi-course discount will auto-apply — {student.courseSelections.length} courses selected!
            </div>
          )}

          {/* Course catalogue */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/50 transition"
                placeholder="Search courses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {categories.length > 1 && (
              <select
                className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">All Levels</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((course) => {
              const alreadyAdded = student.courseSelections.some((cs) => cs.courseId === course.id);
              return (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -2 }}
                  className={`bg-zinc-900/50 border rounded-xl p-4 cursor-pointer transition-all ${alreadyAdded ? "border-violet-500/40 bg-violet-500/5" : "border-zinc-800 hover:border-zinc-600"}`}
                  onClick={() => {
                    if (!alreadyAdded) {
                      addCourseSelection(student.id, {
                        id: uid(),
                        courseId: course.id,
                        selectedTierId: course.pricingTiers[0]?.id ?? "",
                        includeRegistration: false,
                        includeMaterial: false,
                        includeExam: false,
                        discount: course.defaultDiscount ? {
                          type: course.defaultDiscount.type,
                          value: course.defaultDiscount.value,
                          label: course.defaultDiscount.label,
                        } : null,
                      });
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-bold text-zinc-100 leading-tight">{course.name}</div>
                    {alreadyAdded && <Check size={16} className="text-violet-400 flex-shrink-0" />}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge color="violet">{course.category}</Badge>
                    <Badge color="cyan">
                      {modeIcon(course.mode)} {course.mode}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500 mb-2">{course.duration} · {course.classesPerWeek}×/wk · {course.classDuration}</div>
                  <div className="text-sm font-bold text-violet-400 font-mono">
                    {formatINR(course.pricingTiers[0]?.amount ?? 0)}
                    <span className="text-zinc-500 font-normal text-xs ml-1">/{BILLING_LABELS[course.pricingTiers[0]?.billingMode ?? "monthly"]}</span>
                  </div>
                  {course.pricingTiers.length > 1 && (
                    <div className="text-[10px] text-zinc-500 mt-1">{course.pricingTiers.length} pricing tiers available</div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {si < draftStudents.length - 1 && <div className="border-t border-zinc-800 my-2" />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: Discounts
// ═══════════════════════════════════════════════════════════════

function Step3Discounts() {
  const {
    draftStudents, courses, draftDiscounts, addDraftDiscount, removeDraftDiscount,
    siblingDiscount, multiCourseDiscount, discountPresets,
  } = useQuotationStore();
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<"flat" | "percentage">("flat");
  const [customValue, setCustomValue] = useState("");

  const summary = computeQuoteSummary(draftStudents, courses, draftDiscounts, siblingDiscount, multiCourseDiscount);
  const savings = totalSavings(summary);

  const addPreset = (preset: DiscountPreset) => {
    if (draftDiscounts.some((d) => d.presetId === preset.id)) return;
    addDraftDiscount({
      id: uid(),
      presetId: preset.id,
      name: preset.name,
      type: preset.type,
      value: preset.value,
      appliesTo: preset.appliesTo,
      calculatedAmount: 0,
    });
  };

  const addCustomDiscount = () => {
    if (!customName || !customValue) return;
    addDraftDiscount({
      id: uid(),
      name: customName,
      type: customType,
      value: parseFloat(customValue),
      appliesTo: "grand_total",
      calculatedAmount: 0,
    });
    setCustomName("");
    setCustomValue("");
    setShowCustom(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-zinc-100">Discounts & Offers</h2>

      {/* Auto-detected */}
      {(siblingDiscount.enabled && draftStudents.length >= 2) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
          <Users size={16} className="text-emerald-400" />
          <div className="flex-1">
            <div className="text-sm font-bold text-emerald-400">Family/Sibling Discount</div>
            <div className="text-xs text-zinc-400">{draftStudents.length} students detected — discount auto-calculated</div>
          </div>
          {summary.siblingDiscountAmount > 0 && (
            <div className="text-sm font-bold text-emerald-400 font-mono">−{formatINR(summary.siblingDiscountAmount)}</div>
          )}
        </div>
      )}

      {summary.totalMultiCourseDiscounts > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
          <Layers size={16} className="text-emerald-400" />
          <div className="flex-1">
            <div className="text-sm font-bold text-emerald-400">Multi-Course Discount</div>
            <div className="text-xs text-zinc-400">Students with 2+ courses get automatic discount</div>
          </div>
          <div className="text-sm font-bold text-emerald-400 font-mono">−{formatINR(summary.totalMultiCourseDiscounts)}</div>
        </div>
      )}

      {/* Presets */}
      {discountPresets.length > 0 && (
        <SectionCard title="Available Offers" icon={<Tags size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {discountPresets.map((p) => {
              const applied = draftDiscounts.some((d) => d.presetId === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (applied) {
                      const existing = draftDiscounts.find((d) => d.presetId === p.id);
                      if (existing) removeDraftDiscount(existing.id);
                    } else {
                      addPreset(p);
                    }
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${applied ? "bg-violet-500/10 border-violet-500/30" : "bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600"}`}
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.type === "flat" ? formatINR(p.value) : `${p.value}%`} off · {p.appliesTo.replace(/_/g, " ")}</div>
                  </div>
                  {applied ? <Check size={16} className="text-violet-400" /> : <Plus size={16} className="text-zinc-500" />}
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Applied discounts */}
      {draftDiscounts.length > 0 && (
        <SectionCard title="Applied Discounts" icon={<Star size={16} />}>
          <div className="flex flex-col gap-2">
            {draftDiscounts.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{d.name}</div>
                  <div className="text-xs text-zinc-500">{d.type === "flat" ? formatINR(d.value) : `${d.value}%`} off</div>
                </div>
                <button onClick={() => removeDraftDiscount(d.id)} className="text-zinc-500 hover:text-red-400 transition">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Custom discount */}
      {showCustom ? (
        <SectionCard title="Custom Discount">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Discount Name" placeholder="e.g. Special Offer" value={customName} onChange={(e: any) => setCustomName(e.target.value)} />
            <Select label="Type" value={customType} onChange={(e: any) => setCustomType(e.target.value)}>
              <option value="flat">Flat (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </Select>
            <Input label="Value" type="number" placeholder="500" value={customValue} onChange={(e: any) => setCustomValue(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addCustomDiscount} className="px-4 py-2 bg-violet-500 text-white text-sm font-bold rounded-xl hover:bg-violet-600 transition">Apply</button>
            <button onClick={() => setShowCustom(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-xl hover:bg-zinc-700 transition">Cancel</button>
          </div>
        </SectionCard>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900/40 border border-dashed border-zinc-700 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition"
        >
          <Plus size={16} /> Add Custom Discount
        </button>
      )}

      {/* Savings summary */}
      {savings > 0 && (
        <motion.div {...fadeUp} className="px-5 py-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl text-center">
          <div className="text-xs text-emerald-500/60 uppercase tracking-wider font-bold mb-1">Total Savings</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{formatINR(savings)}</div>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: Payment Terms
// ═══════════════════════════════════════════════════════════════

function Step4PaymentTerms() {
  const {
    draftPaymentTerms, setDraftPaymentTerms,
    draftTermsAndConditions, setDraftTC,
    draftValidUntil, setDraftValidUntil,
    tcTemplates, profile,
  } = useQuotationStore();

  const pt = draftPaymentTerms;

  useEffect(() => {
    if (!draftValidUntil) {
      setDraftValidUntil(
        new Date(Date.now() + profile.defaultValidityDays * 86400000).toISOString().slice(0, 10)
      );
    }
    if (!draftTermsAndConditions && tcTemplates.length > 0) {
      setDraftTC(tcTemplates[0].content);
    }
  }, []);

  const toggleMode = (mode: string) => {
    const modes = pt.acceptedModes.includes(mode)
      ? pt.acceptedModes.filter((m) => m !== mode)
      : [...pt.acceptedModes, mode];
    setDraftPaymentTerms({ acceptedModes: modes });
  };

  const addInstallment = () => {
    setDraftPaymentTerms({
      installments: [...pt.installments, { amount: 0, dueDate: "", label: `Installment ${pt.installments.length + 1}` }],
    });
  };

  const updateInstallment = (idx: number, data: Partial<Installment>) => {
    const inst = [...pt.installments];
    inst[idx] = { ...inst[idx], ...data };
    setDraftPaymentTerms({ installments: inst });
  };

  const removeInstallment = (idx: number) => {
    setDraftPaymentTerms({
      installments: pt.installments.filter((_, i) => i !== idx),
    });
  };

  const PAYMENT_MODES = ["cash", "upi", "bank_transfer", "cheque", "online"];

  const TC_SNIPPETS = [
    "Fees once paid are non-refundable.",
    "Minimum 75% attendance is required.",
    "Fees are subject to revision annually.",
    "Certificate issued only upon completion.",
  ];

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-zinc-100">Payment Terms & Conditions</h2>

      {/* Payment structure */}
      <SectionCard title="Payment" icon={<CreditCard size={16} />}>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <Toggle checked={pt.fullPayment} onChange={(v) => setDraftPaymentTerms({ fullPayment: v, partPayment: !v })} label="Full Payment" />
            <Toggle checked={pt.partPayment} onChange={(v) => setDraftPaymentTerms({ partPayment: v, fullPayment: !v })} label="Part Payment / Installments" />
          </div>

          {pt.partPayment && (
            <div className="flex flex-col gap-3 pl-2 border-l-2 border-zinc-700/60 ml-2">
              {pt.installments.map((inst, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <Input label={`Label`} placeholder={`At joining`} value={inst.label}
                    onChange={(e: any) => updateInstallment(i, { label: e.target.value })} />
                  <Input label="Amount (₹)" type="number" value={inst.amount || ""}
                    onChange={(e: any) => updateInstallment(i, { amount: parseFloat(e.target.value) || 0 })} />
                  <div className="flex gap-2 items-end">
                    <Input label="Due Date" type="date" value={inst.dueDate}
                      onChange={(e: any) => updateInstallment(i, { dueDate: e.target.value })} />
                    <button onClick={() => removeInstallment(i)} className="text-zinc-500 hover:text-red-400 transition mb-2.5"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <button onClick={addInstallment} className="text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1 mt-1">
                <Plus size={14} /> Add Installment
              </button>
            </div>
          )}

          <Input label="Payment Due Date" type="date" value={pt.dueDate}
            onChange={(e: any) => setDraftPaymentTerms({ dueDate: e.target.value })}
            className="max-w-xs" />

          {/* Payment modes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Accepted Payment Modes</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => toggleMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${pt.acceptedModes.includes(mode) ? "bg-violet-500/15 border-violet-500/30 text-violet-400" : "bg-zinc-800/40 border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}
                >
                  {mode.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <Input label="Late Fee Clause (optional)"
            placeholder="Late fee of ₹100 per week after due date."
            value={pt.lateFeeClause}
            onChange={(e: any) => setDraftPaymentTerms({ lateFeeClause: e.target.value })} />
        </div>
      </SectionCard>

      {/* Terms & Conditions */}
      <SectionCard title="Terms & Conditions" icon={<FileText size={16} />}>
        <div className="flex flex-col gap-3">
          {/* T&C template selector */}
          {tcTemplates.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {tcTemplates.map((t) => (
                <button key={t.id} onClick={() => setDraftTC(t.content)}
                  className="px-3 py-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:border-violet-500/30 transition">
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <textarea
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 h-40 resize-y outline-none focus:border-violet-500/50 transition"
            value={draftTermsAndConditions}
            onChange={(e) => setDraftTC(e.target.value)}
            placeholder="Enter terms and conditions…"
          />
          {/* Quick snippets */}
          <div className="flex flex-wrap gap-1.5">
            {TC_SNIPPETS.map((snippet, i) => (
              <button key={i}
                onClick={() => setDraftTC(draftTermsAndConditions ? draftTermsAndConditions + "\n" + `${(draftTermsAndConditions.split("\n").filter(Boolean).length + 1)}. ${snippet}` : `1. ${snippet}`)}
                className="px-2.5 py-1 bg-zinc-800/40 border border-zinc-700/50 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition truncate max-w-[200px]">
                + {snippet}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Validity */}
      <SectionCard title="Quote Validity" icon={<Calendar size={16} />}>
        <Input label="Valid Until" type="date" value={draftValidUntil}
          onChange={(e: any) => setDraftValidUntil(e.target.value)}
          className="max-w-xs" />
        {draftValidUntil && (
          <div className="text-xs text-zinc-500 mt-2">
            {Math.max(0, Math.ceil((new Date(draftValidUntil).getTime() - Date.now()) / 86400000))} days from today
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: Review & Finalise
// ═══════════════════════════════════════════════════════════════

function Step5Review() {
  const store = useQuotationStore();
  const {
    profile, draftStudents, courses, draftDiscounts, draftPaymentTerms,
    draftTermsAndConditions, draftValidUntil, draftNotes, setDraftNotes,
    siblingDiscount, multiCourseDiscount, editingQuoteId, saveQuotation, nextQuoteSeq,
  } = store;

  const previewRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const summary = computeQuoteSummary(draftStudents, courses, draftDiscounts, siblingDiscount, multiCourseDiscount);
  const quoteNumber = editingQuoteId
    ? store.quotations.find((q) => q.id === editingQuoteId)?.quoteNumber ?? ""
    : `${profile.quotePrefix}-${String(nextQuoteSeq).padStart(3, "0")}`;

  // Warnings
  const warnings: string[] = [];
  if (draftStudents.some((s) => !s.name)) warnings.push("Some students have no name.");
  if (draftStudents.every((s) => s.courseSelections.length === 0)) warnings.push("No courses selected.");
  if (summary.grandTotal === 0 && draftStudents.some((s) => s.courseSelections.length > 0))
    warnings.push("Total is ₹0. Review discounts.");
  const totalDiscounts = totalSavings(summary);
  if (totalDiscounts > summary.grandGross) warnings.push("Discount exceeds total fees. Please review.");

  const handleSave = () => {
    setSaving(true);
    const q = saveQuotation();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    return q;
  };

  const handlePDF = async () => {
    const el = previewRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height / canvas.width) * pdfW;
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(`${quoteNumber}.pdf`);
  };

  const handleWhatsApp = () => {
    const studentNames = draftStudents.map((s) => s.name || "Student").join(", ");
    const text = encodeURIComponent(
      `Hi, here is the fee quotation (${quoteNumber}) for ${studentNames} from ${profile.orgName}.\nTotal: ${formatINR(summary.grandTotal)}\nValid until: ${draftValidUntil}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-zinc-100">Review & Finalise</h2>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle size={13} /> {w}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-violet-400">{draftStudents.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Students</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-blue-400">{draftStudents.reduce((s, st) => s + st.courseSelections.length, 0)}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Courses</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-emerald-400 font-mono">−{formatINR(totalDiscounts)}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Discount</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-violet-400 font-mono">{formatINR(summary.grandTotal)}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Net Payable</div>
        </div>
      </div>

      {/* Notes */}
      <Input label="Internal Notes (not shown on quote)" placeholder="Follow up, reminders…"
        value={draftNotes} onChange={(e: any) => setDraftNotes(e.target.value)} />

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-sm font-bold rounded-xl hover:bg-violet-600 transition disabled:opacity-50">
          <Save size={16} /> {saved ? "Saved!" : editingQuoteId ? "Update Quote" : "Save as Draft"}
        </button>
        <button onClick={handlePDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl hover:bg-zinc-700 transition">
          <Download size={16} /> Download PDF
        </button>
        <button onClick={handleWhatsApp}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl hover:bg-emerald-600/30 transition">
          <Share2 size={16} /> WhatsApp
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/60 border border-zinc-700 text-zinc-400 text-sm rounded-xl hover:text-zinc-200 transition">
          Print
        </button>
      </div>

      {/* Live preview */}
      <div className="mt-2 overflow-x-auto">
        <div className="bg-white rounded-xl shadow-2xl mx-auto" style={{ width: "fit-content" }}>
          <QuotationPreview
            ref={previewRef}
            profile={profile}
            students={draftStudents}
            summary={summary}
            quoteNumber={quoteNumber}
            date={new Date().toLocaleDateString("en-IN")}
            validUntil={draftValidUntil}
            termsAndConditions={draftTermsAndConditions}
            paymentTerms={draftPaymentTerms}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILE SETUP VIEW
// ═══════════════════════════════════════════════════════════════

function ProfileSetup({ onDone }: { onDone: () => void }) {
  const { profile, setProfile } = useQuotationStore();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logoDataUrl" | "signatureDataUrl"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert("File too large. Max 500KB."); return; }
    const reader = new FileReader();
    reader.onload = () => setProfile({ [field]: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <motion.div {...fadeUp} className="flex flex-col gap-5 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
        <Building2 size={20} className="text-violet-400" /> Institute Profile & Branding
      </h2>
      <p className="text-sm text-zinc-400">Set up once — auto-populates every quotation.</p>

      <SectionCard title="Organisation" icon={<Building2 size={16} />}>
        <div className="flex flex-col gap-3">
          <Input label="Organisation Name" placeholder="Brightmind Academy" value={profile.orgName}
            onChange={(e: any) => setProfile({ orgName: e.target.value })} />
          <Input label="Tagline" placeholder="Unlocking Mathematical Genius" value={profile.tagline}
            onChange={(e: any) => setProfile({ tagline: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Phone" placeholder="+91 98765 43210" value={profile.phone}
              onChange={(e: any) => setProfile({ phone: e.target.value })} />
            <Input label="Email" placeholder="info@academy.com" value={profile.email}
              onChange={(e: any) => setProfile({ email: e.target.value })} />
          </div>
          <Input label="Address" placeholder="42, MG Road, Delhi" value={profile.address}
            onChange={(e: any) => setProfile({ address: e.target.value })} />
          <Input label="Website" placeholder="www.academy.com" value={profile.website}
            onChange={(e: any) => setProfile({ website: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Branding" icon={<Palette size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Logo</label>
            <div className="flex items-center gap-3">
              {profile.logoDataUrl ? (
                <img src={profile.logoDataUrl} alt="Logo" className="w-14 h-14 object-contain rounded-lg border border-zinc-700" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 text-xs">No logo</div>
              )}
              <button onClick={() => logoInputRef.current?.click()} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-700 transition">Upload</button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, "logoDataUrl")} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={profile.brandColor} onChange={(e) => setProfile({ brandColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer" />
              <span className="text-sm font-mono text-zinc-400">{profile.brandColor}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Quote Settings" icon={<Settings2 size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Quote Number Prefix" placeholder="BMA"
            tooltip="e.g. BMA → quotes numbered BMA-001, BMA-002…"
            value={profile.quotePrefix}
            onChange={(e: any) => setProfile({ quotePrefix: e.target.value.toUpperCase() })} />
          <Input label="Default Validity (days)" type="number" value={profile.defaultValidityDays}
            onChange={(e: any) => setProfile({ defaultValidityDays: parseInt(e.target.value) || 15 })} />
          <Input label="GST Number (optional)" placeholder="22AAAAA0000A1Z5"
            value={profile.gstNumber}
            onChange={(e: any) => setProfile({ gstNumber: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Payment Details (shown on quote)" icon={<CreditCard size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bank Details</label>
            <textarea className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 h-24 resize-y outline-none focus:border-violet-500/50 transition"
              value={profile.bankDetails} onChange={(e) => setProfile({ bankDetails: e.target.value })}
              placeholder="Bank Name, A/C, IFSC" />
          </div>
          <div className="flex flex-col gap-3">
            <Input label="UPI ID" placeholder="academy@upi" value={profile.upiId}
              onChange={(e: any) => setProfile({ upiId: e.target.value })} />
            <Input label="Signature Text" placeholder="Authorised Signatory" value={profile.signatureText}
              onChange={(e: any) => setProfile({ signatureText: e.target.value })} />
          </div>
        </div>
      </SectionCard>

      <button onClick={onDone}
        className="w-full py-3 bg-violet-500 text-white text-sm font-bold rounded-xl hover:bg-violet-600 transition flex items-center justify-center gap-2">
        <Check size={16} /> Save Profile & Continue
      </button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COURSE CATALOGUE VIEW
// ═══════════════════════════════════════════════════════════════

function CourseCatalogue({ onDone }: { onDone: () => void }) {
  const { courses, addCourse, updateCourse, deleteCourse, toggleCourseActive } = useQuotationStore();
  const [editing, setEditing] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blankCourse = (): Course => ({
    id: uid(),
    name: "", description: "", category: "Beginner",
    duration: "3 months", classesPerWeek: 2, classDuration: "60 min",
    mode: "offline",
    pricingTiers: [{ id: uid(), billingMode: "monthly", amount: 0 }],
    registrationFee: 0, materialFee: 0, examFee: 0,
    defaultDiscount: null, isActive: true, createdAt: new Date().toISOString(),
  });

  const [form, setForm] = useState<Course>(blankCourse());

  const openNew = () => { setForm(blankCourse()); setEditing(null); setShowForm(true); };
  const openEdit = (c: Course) => { setForm({ ...c }); setEditing(c); setShowForm(true); };

  const addTier = () => {
    setForm((f) => ({
      ...f,
      pricingTiers: [...f.pricingTiers, { id: uid(), billingMode: "quarterly", amount: 0 }],
    }));
  };
  const removeTier = (i: number) => {
    setForm((f) => ({
      ...f,
      pricingTiers: f.pricingTiers.filter((_, idx) => idx !== i),
    }));
  };
  const updateTier = (i: number, data: Partial<PricingTier>) => {
    setForm((f) => ({
      ...f,
      pricingTiers: f.pricingTiers.map((t, idx) => idx === i ? { ...t, ...data } : t),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateCourse(editing.id, form);
    } else {
      addCourse(form);
    }
    setShowForm(false);
  };

  return (
    <motion.div {...fadeUp} className="flex flex-col gap-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <GraduationCap size={20} className="text-violet-400" /> Course Catalogue
        </h2>
        <div className="flex gap-2">
          <button onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white text-xs font-bold rounded-xl hover:bg-violet-600 transition">
            <Plus size={14} /> New Course
          </button>
          <button onClick={onDone}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl hover:bg-zinc-700 transition">
            Done <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Course form modal — portal to avoid CSS transform containing block issues */}
      {createPortal(
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 pt-16 overflow-y-auto"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl my-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-zinc-100">{editing ? "Edit" : "New"} Course</h3>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <Input label="Course Name" placeholder="Abacus Level 1" value={form.name}
                    onChange={(e: any) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  <Input label="Description" placeholder="What's included" value={form.description}
                    onChange={(e: any) => setForm((f) => ({ ...f, description: e.target.value }))} />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input label="Category" placeholder="Beginner" value={form.category}
                      onChange={(e: any) => setForm((f) => ({ ...f, category: e.target.value }))} />
                    <Input label="Duration" placeholder="6 months" value={form.duration}
                      onChange={(e: any) => setForm((f) => ({ ...f, duration: e.target.value }))} />
                    <Input label="Classes/Week" type="number" value={form.classesPerWeek}
                      onChange={(e: any) => setForm((f) => ({ ...f, classesPerWeek: parseInt(e.target.value) || 0 }))} />
                    <Input label="Class Duration" placeholder="60 min" value={form.classDuration}
                      onChange={(e: any) => setForm((f) => ({ ...f, classDuration: e.target.value }))} />
                  </div>

                  <Select label="Mode" value={form.mode}
                    onChange={(e: any) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </Select>

                  {/* Pricing tiers */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pricing Tiers</label>
                      <button onClick={addTier} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus size={12} /> Add Tier</button>
                    </div>
                    {form.pricingTiers.map((tier, i) => (
                      <div key={tier.id} className="flex gap-2 items-end">
                        <Select label={i === 0 ? "Billing" : undefined} value={tier.billingMode}
                          onChange={(e: any) => updateTier(i, { billingMode: e.target.value })}>
                          <option value="one_time">One-Time</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="half_yearly">Half-Yearly</option>
                          <option value="annually">Annually</option>
                          <option value="per_class">Per Class</option>
                          <option value="custom">Custom</option>
                        </Select>
                        <Input label={i === 0 ? "Amount (₹)" : undefined} type="number" value={tier.amount}
                          onChange={(e: any) => updateTier(i, { amount: parseFloat(e.target.value) || 0 })} />
                        {tier.billingMode === "custom" && (
                          <Input label={i === 0 ? "Label" : undefined} placeholder="₹2,500 for 3 months" value={tier.customLabel || ""}
                            onChange={(e: any) => updateTier(i, { customLabel: e.target.value })} />
                        )}
                        {form.pricingTiers.length > 1 && (
                          <button onClick={() => removeTier(i)} className="text-zinc-500 hover:text-red-400 mb-2.5"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Additional fees */}
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <Input label="Registration Fee" tooltip="One-time admission fee" type="number" value={form.registrationFee}
                      onChange={(e: any) => setForm((f) => ({ ...f, registrationFee: parseFloat(e.target.value) || 0 }))} />
                    <Input label="Material/Kit Fee" type="number" value={form.materialFee}
                      onChange={(e: any) => setForm((f) => ({ ...f, materialFee: parseFloat(e.target.value) || 0 }))} />
                    <Input label="Exam Fee" type="number" value={form.examFee}
                      onChange={(e: any) => setForm((f) => ({ ...f, examFee: parseFloat(e.target.value) || 0 }))} />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button onClick={handleSave}
                      className="flex-1 py-2.5 bg-violet-500 text-white text-sm font-bold rounded-xl hover:bg-violet-600 transition">
                      {editing ? "Update" : "Create"} Course
                    </button>
                    <button onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm rounded-xl hover:bg-zinc-700 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">No courses yet. Create your first course!</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <motion.div key={course.id} layout
              className={`bg-zinc-900/60 border rounded-xl p-4 flex items-center gap-4 ${course.isActive ? "border-zinc-800" : "border-zinc-800/50 opacity-60"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-zinc-100 truncate">{course.name}</span>
                  <Badge color={course.isActive ? "emerald" : "zinc"}>{course.isActive ? "Active" : "Inactive"}</Badge>
                  <Badge color="violet">{course.category}</Badge>
                </div>
                <div className="text-xs text-zinc-500">{course.duration} · {course.classesPerWeek}×/wk · {course.classDuration} · {course.mode}</div>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {course.pricingTiers.map((t) => (
                    <span key={t.id} className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">
                      {formatINR(t.amount)}/{t.customLabel || BILLING_LABELS[t.billingMode]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(course)} className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 transition"><Edit2 size={14} /></button>
                <button onClick={() => toggleCourseActive(course.id)} className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition">
                  {course.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
                <button onClick={() => { if (window.confirm(`Delete "${course.name}"?`)) deleteCourse(course.id); }}
                  className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN QuotationMaker PAGE
// ═══════════════════════════════════════════════════════════════

type View = "wizard" | "profile" | "courses" | "dashboard";

export default function QuotationMaker() {
  const store = useQuotationStore();
  const [, _navigate] = useLocation();
  const {
    profile, courses, seeded, applySeed, wizardStep, setWizardStep, nextStep, prevStep,
    draftStudents, draftDiscounts, siblingDiscount, multiCourseDiscount, resetWizard,
  } = store;

  const [view, setView] = useState<View>("wizard");

  // Seed on first load
  useEffect(() => {
    if (!seeded) {
      applySeed(getSeedData());
    }
  }, [seeded, applySeed]);

  // Running total
  const summary = useMemo(
    () => computeQuoteSummary(draftStudents, courses, draftDiscounts, siblingDiscount, multiCourseDiscount),
    [draftStudents, courses, draftDiscounts, siblingDiscount, multiCourseDiscount]
  );

  // Autosave draft (30s)
  useEffect(() => {
    // Zustand persist handles this automatically
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quotation-preview, #quotation-preview * { visibility: visible; }
          #quotation-preview { position: absolute; left: 0; top: 0; width: 210mm; }
        }
      `}</style>

      {/* Top nav */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Quotation Maker</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">{profile.orgName || "Setup Required"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(["wizard", "profile", "courses", "dashboard"] as View[]).map((v) => {
              const labels: Record<View, { icon: React.ReactNode; label: string }> = {
                wizard: { icon: <Zap size={14} />, label: "New Quote" },
                profile: { icon: <Building2 size={14} />, label: "Profile" },
                courses: { icon: <GraduationCap size={14} />, label: "Courses" },
                dashboard: { icon: <Layers size={14} />, label: "Quotes" },
              };
              const { icon, label } = labels[v];
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === v ? "bg-violet-500/15 text-violet-400 border border-violet-500/25" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {view === "profile" && (
            <motion.div key="profile" {...fadeSlide}>
              <ProfileSetup onDone={() => setView("wizard")} />
            </motion.div>
          )}

          {view === "courses" && (
            <motion.div key="courses" {...fadeSlide}>
              <CourseCatalogue onDone={() => setView("wizard")} />
            </motion.div>
          )}

          {view === "dashboard" && (
            <motion.div key="dashboard" {...fadeSlide}>
              <QuoteDashboardInline onNewQuote={() => { resetWizard(); setView("wizard"); }} onEdit={(id) => { store.loadQuoteForEdit(id); setView("wizard"); }} />
            </motion.div>
          )}

          {view === "wizard" && (
            <motion.div key="wizard" {...fadeSlide}>
              {/* Step bar + running total */}
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <StepBar step={wizardStep} onStep={setWizardStep} />
                <AnimatedTotal amount={summary.grandTotal} label="Running Total" />
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                  <motion.div key="s1" {...fadeSlide}>
                    <Step1Students />
                  </motion.div>
                )}
                {wizardStep === 2 && (
                  <motion.div key="s2" {...fadeSlide}>
                    <Step2Courses />
                  </motion.div>
                )}
                {wizardStep === 3 && (
                  <motion.div key="s3" {...fadeSlide}>
                    <Step3Discounts />
                  </motion.div>
                )}
                {wizardStep === 4 && (
                  <motion.div key="s4" {...fadeSlide}>
                    <Step4PaymentTerms />
                  </motion.div>
                )}
                {wizardStep === 5 && (
                  <motion.div key="s5" {...fadeSlide}>
                    <Step5Review />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={prevStep}
                  disabled={wizardStep === 1}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/60 border border-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl hover:bg-zinc-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                {wizardStep < 5 ? (
                  <button
                    onClick={nextStep}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-sm font-bold rounded-xl hover:bg-violet-600 transition"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Inline Dashboard (embedded in QuotationMaker )
// ═══════════════════════════════════════════════════════════════

function QuoteDashboardInline({ onNewQuote, onEdit }: { onNewQuote: () => void; onEdit: (id: string) => void }) {
  const { quotations, updateQuotationStatus, deleteQuotation, duplicateQuotation, courses, siblingDiscount, multiCourseDiscount } = useQuotationStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = quotations.filter((q) => {
    const matchSearch = !search ||
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.students.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const thisMonth = quotations.filter((q) => {
    const d = new Date(q.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const acceptedCount = quotations.filter((q) => q.status === "accepted").length;

  const getTotal = (q: typeof quotations[0]): number => {
    return computeQuoteSummary(q.students, courses, q.appliedDiscounts, siblingDiscount, multiCourseDiscount).grandTotal;
  };

  const totalValue = thisMonth.reduce((s, q) => s + getTotal(q), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Layers size={20} className="text-violet-400" /> Quotations
        </h2>
        <button onClick={onNewQuote}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white text-xs font-bold rounded-xl hover:bg-violet-600 transition">
          <Plus size={14} /> New Quote
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-violet-400">{thisMonth.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase">This Month</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-emerald-400 font-mono">{formatINR(totalValue)}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Total Value</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xl font-black text-blue-400">{quotations.length > 0 ? Math.round(acceptedCount / quotations.length * 100) : 0}%</div>
          <div className="text-[10px] text-zinc-500 uppercase">Acceptance</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/50 transition"
            placeholder="Search by name or quote #…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">{quotations.length === 0 ? "No quotations yet. Create your first!" : "No quotes match your filters."}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((q) => {
            const cfg = {
              draft: { color: "text-zinc-400", bg: "bg-zinc-700/30", label: "Draft" },
              sent: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Sent" },
              accepted: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Accepted" },
              expired: { color: "text-red-400", bg: "bg-red-500/10", label: "Expired" },
              revised: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Revised" },
            }[q.status];
            const total = getTotal(q);
            return (
              <motion.div key={q.id} layout
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition cursor-pointer"
                onClick={() => onEdit(q.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-zinc-100 font-mono">{q.quoteNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {q.version > 1 && <Badge color="amber">v{q.version}</Badge>}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {q.students.map((s) => s.name || "—").join(", ")} · {q.students.reduce((s, st) => s + st.courseSelections.length, 0)} courses
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    {q.validUntil && ` · Valid until ${new Date(q.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-black text-violet-400 font-mono">{formatINR(total)}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button title="Duplicate" onClick={() => duplicateQuotation(q.id)}
                    className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition"><Copy size={13} /></button>
                  {q.status === "draft" && (
                    <button title="Mark as Sent" onClick={() => updateQuotationStatus(q.id, "sent")}
                      className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition"><Send size={13} /></button>
                  )}
                  {q.status === "sent" && (
                    <button title="Mark as Accepted" onClick={() => updateQuotationStatus(q.id, "accepted")}
                      className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition"><Check size={13} /></button>
                  )}
                  <button title="Delete" onClick={() => { if (window.confirm("Delete this quote?")) deleteQuotation(q.id); }}
                    className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition"><Trash2 size={13} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
