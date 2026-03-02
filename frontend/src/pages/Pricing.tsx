import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Check, ChevronDown, Shield, Zap, RefreshCcw, GraduationCap,
  X, Loader2, CreditCard, Smartphone, Lock, Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { fetchPlans, initiatePayment, verifyPayment } from "../lib/subscriptionApi";
import type { SubscriptionPlan, PaymentGateway } from "../types/subscription";

// ---------------------------------------------------------------------------
// Font injection
// ---------------------------------------------------------------------------
function usePricingFonts() {
  useEffect(() => {
    if (document.getElementById("pricing-fonts")) return;
    const link = document.createElement("link");
    link.id = "pricing-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://api.fontshare.com/v2/css?f[]=clash-display@700,600&f[]=cabinet-grotesk@400,500,600,800&display=swap";
    document.head.appendChild(link);
    const monoLink = document.createElement("link");
    monoLink.rel = "stylesheet";
    monoLink.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap";
    document.head.appendChild(monoLink);
  }, []);
}

// ---------------------------------------------------------------------------
// Helper: format paise → ₹ string
// ---------------------------------------------------------------------------
const formatPrice = (paise: number) =>
  `₹${Math.floor(paise / 100).toLocaleString("en-IN")}`;

const formatMonthlyEquiv = (plan: SubscriptionPlan) => {
  const months = plan.duration_days / 30;
  const monthly = plan.price_inr / months;
  return formatPrice(Math.round(monthly));
};

// ---------------------------------------------------------------------------
// Aurora background blobs
// ---------------------------------------------------------------------------
function AuroraBackground() {
  const reduced = useReducedMotion();
  const blobs = [
    { x: "2%",  y: "-10%", size: 900, color: "rgba(79,70,229,0.18)",  dur: 10, dx: 40, dy: 30 },
    { x: "35%", y: "-15%", size: 1100, color: "rgba(124,58,237,0.15)", dur: 14, dx: -50, dy: 40 },
    { x: "65%", y: "40%",  size: 800, color: "rgba(14,165,233,0.14)",   dur: 8,  dx: 30, dy: -40 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          animate={reduced ? {} : {
            x: [0, b.dx, -b.dx / 2, 0],
            y: [0, b.dy / 2, -b.dy, 0],
          }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            filter: "blur(120px)",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price display (animated number swap)
// ---------------------------------------------------------------------------
function AnimatedPrice({ plan, show }: { plan: SubscriptionPlan; show: boolean }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={plan.id}
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <span
            className="text-white"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 48, fontWeight: 700, lineHeight: 1 }}
          >
            {formatPrice(plan.price_inr)}
          </span>
          <span className="text-slate-400 text-sm ml-1">/{plan.duration === "monthly" ? "mo" : "total"}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Single pricing card
// ---------------------------------------------------------------------------
interface PricingCardProps {
  plan: SubscriptionPlan;
  visible: boolean;
  delay: number;
  userPlanKey: string | null | undefined;
  subStatus: string | null;
  onSelect: (plan: SubscriptionPlan) => void;
  isLoggedIn: boolean;
}

function PricingCard({ plan, visible, delay, userPlanKey, subStatus, onSelect, isLoggedIn }: PricingCardProps) {
  const reduced = useReducedMotion();
  const isCurrentPlan = userPlanKey === plan.plan_key;
  const isGrace = subStatus === "grace" || subStatus === "expired";

  const ctaLabel = () => {
    if (!isLoggedIn) return "Get Started";
    if (isCurrentPlan) {
      if (isGrace) return "Renew Now";
      return "Your Current Plan";
    }
    if (subStatus === "active" || subStatus === "trial") return "Switch Plan";
    return "Subscribe Now";
  };

  const ctaDisabled = isCurrentPlan && (subStatus === "active" || subStatus === "trial");

  const cardStyle: React.CSSProperties = plan.is_popular
    ? {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(124,58,237,0.6)",
        boxShadow: "0 0 60px rgba(124,58,237,0.35), 0 24px 48px rgba(0,0,0,0.5)",
        borderRadius: 20,
        padding: "2.5rem 2rem 2rem",
        position: "relative",
        transform: "scale(1.03)",
        zIndex: 10,
      }
    : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        padding: "2rem",
        position: "relative",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: plan.is_popular ? 1.03 : 1 }}
          transition={{ delay, duration: 0.45, type: "spring", stiffness: 220, damping: 22 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          style={cardStyle}
        >
          {/* Most Popular badge */}
          {plan.is_popular && (
            <div style={{
              position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
              padding: "4px 16px", borderRadius: 999, whiteSpace: "nowrap",
            }}>
              <motion.span
                animate={reduced ? {} : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}
              >
                ✦ Most Popular
              </motion.span>
            </div>
          )}

          {/* Current plan badge */}
          {isCurrentPlan && subStatus === "active" && (
            <div style={{
              position: "absolute", top: plan.is_popular ? 14 : 12, right: 12,
              background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)",
              padding: "2px 10px", borderRadius: 999,
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#10B981" }}>✓ Current Plan</span>
            </div>
          )}

          {/* Plan name */}
          <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {plan.duration === "monthly" ? "Starter" : plan.duration === "biannual" ? "Popular" : "Best Value"}
          </p>
          <h3 style={{ fontFamily: "Clash Display, sans-serif", fontSize: 24, fontWeight: 600, color: "#fff", marginBottom: 20 }}>
            {plan.display_name}
          </h3>

          {/* Price */}
          <AnimatedPrice plan={plan} show={true} />

          <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6, marginBottom: 16 }}>
            {plan.duration !== "monthly" && `${formatMonthlyEquiv(plan)}/mo equivalent`}
          </p>

          {/* Savings badge */}
          {plan.savings_pct && (
            <div className="flex items-center gap-2 mb-4">
              <span style={{
                background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)",
                padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                fontFamily: "Cabinet Grotesk, sans-serif", color: "#34D399",
              }}>
                Save {plan.savings_pct}%
              </span>
              {plan.original_price_inr && (
                <span style={{ fontSize: 13, color: "#64748B", textDecoration: "line-through", fontFamily: "JetBrains Mono, monospace" }}>
                  {formatPrice(plan.original_price_inr)}
                </span>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />

          {/* Features */}
          <ul className="space-y-2.5 mb-6">
            {plan.features.map((feat, fi) => (
              <li key={fi} className="flex items-start gap-2.5">
                <Check className="shrink-0 mt-0.5" style={{ width: 14, height: 14, color: plan.is_popular ? "#A78BFA" : "#6EE7B7" }} />
                <span style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
                  {feat}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <motion.button
            onClick={() => !ctaDisabled && onSelect(plan)}
            whileHover={ctaDisabled ? {} : { scale: 1.02 }}
            whileTap={ctaDisabled ? {} : { scale: 0.98 }}
            disabled={ctaDisabled}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              cursor: ctaDisabled ? "not-allowed" : "pointer",
              ...(plan.is_popular && !ctaDisabled
                ? {
                    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    color: "#fff",
                    boxShadow: "0 4px 20px rgba(124,58,237,0.5)",
                  }
                : ctaDisabled
                ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }
                : isGrace && isCurrentPlan
                ? { background: "rgba(217,119,6,0.2)", border: "1px solid rgba(217,119,6,0.5)", color: "#FCD34D" }
                : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }),
            }}
          >
            {ctaLabel()}
          </motion.button>

          {ctaDisabled && (
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8, fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Contact admin to switch plans
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// FAQ Accordion
// ---------------------------------------------------------------------------
const FAQS = [
  {
    q: "What happens when my subscription expires?",
    a: "You'll enter a 3-day grace period where you can still access all your history — attendance records, badges, points, and leaderboard position. Practice tools will be paused until you renew. Your data is always safe and never deleted.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. When you upgrade or switch plans, your new subscription starts immediately. Contact your teacher or admin for plan changes.",
  },
  {
    q: "How does payment work?",
    a: "We use Razorpay and Cashfree — two of India's most trusted payment gateways. Your payment is secured with bank-grade encryption. We accept UPI, debit/credit cards, and net banking.",
  },
  {
    q: "Is my data safe if I don't renew?",
    a: "Absolutely. All your practice history, badges, streak records, and attendance data are permanently stored and accessible even without an active subscription — you just can't use the practice tools until you renew.",
  },
  {
    q: "What's the difference between Student and Teacher plans?",
    a: "Student plans give full access to all practice tools, leaderboard, rewards, and your personal attendance view. Teacher plans include everything in student plans plus the ability to create class sessions, manage schedules, and mark attendance for your batches.",
  },
  {
    q: "Is there a free trial?",
    a: "Trial access may be available at your institute's discretion — speak with your admin or teacher. We occasionally run open-access periods for new students to explore the platform.",
  },
];

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const reduced = useReducedMotion();
  return (
    <div
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0" }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left py-5 flex items-center justify-between gap-4"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="shrink-0"
        >
          <ChevronDown style={{ width: 18, height: 18, color: "rgba(255,255,255,0.4)" }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="faq-body"
            initial={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, paddingBottom: 20 }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Modal
// ---------------------------------------------------------------------------
interface PaymentModalProps {
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ plan, onClose, onSuccess }: PaymentModalProps) {
  const { refresh } = useSubscription();
  const [step, setStep] = useState<"confirm" | "gateway" | "processing" | "success" | "error">("confirm");
  const [gateway, setGateway] = useState<PaymentGateway>("razorpay");
  const [errorMsg, setErrorMsg] = useState("");
  const reduced = useReducedMotion();

  const handleProceed = async () => {
    if (!plan) return;
    setStep("processing");
    try {
      const initData = await initiatePayment(plan.id, gateway);

      if (gateway === "razorpay") {
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) {
          // Load script
          await new Promise<void>((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.onload = () => res();
            s.onerror = () => rej(new Error("Failed to load Razorpay SDK"));
            document.body.appendChild(s);
          });
        }
        const rzp = new (window as any).Razorpay({
          key: initData.gateway_key,
          amount: initData.amount,
          currency: initData.currency,
          order_id: initData.gateway_order_id,
          name: "Talent Hub Excellence Lab",
          description: initData.plan_name,
          prefill: { name: initData.user_name, email: initData.user_email },
          theme: { color: "#4F46E5" },
          handler: async (response: any) => {
            try {
              await verifyPayment({
                gateway_order_id: initData.gateway_order_id,
                gateway_payment_id: response.razorpay_payment_id,
                gateway_signature: response.razorpay_signature,
                gateway: "razorpay",
              });
              await refresh();
              setStep("success");
            } catch {
              setErrorMsg("Payment verification failed. Please contact support if money was deducted.");
              setStep("error");
            }
          },
          modal: {
            ondismiss: () => setStep("confirm"),
          },
        });
        rzp.open();
      } else {
        // Cashfree redirect flow
        const { load } = await import("@cashfreepayments/cashfree-js" as any).catch(() => ({ load: null }));
        if (load) {
          const cashfree = await load({ mode: "production" });
          cashfree.checkout({
            paymentSessionId: initData.gateway_order_id,
            returnUrl: `${window.location.origin}/payment/return?order_id=${initData.order_id}`,
          });
        } else {
          setErrorMsg("Cashfree SDK not available. Please use Razorpay.");
          setStep("error");
        }
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Payment initiation failed. Please try again.");
      setStep("error");
    }
  };

  if (!plan) return null;

  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={reduced ? { opacity: 1 } : { y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#0F0F18", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ fontFamily: "Clash Display, sans-serif", fontSize: 18, fontWeight: 600, color: "#fff" }}>
            {step === "success" ? "🎉 Payment Successful!" : "Complete Your Subscription"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="p-5">
          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="space-y-5">
              {/* Plan summary */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1rem" }}>
                <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: "rgba(255,255,255,0.5)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {plan.role === "student" ? "Student Plan" : "Teacher Plan"} · {plan.display_name}
                </p>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 32, fontWeight: 700, color: "#fff" }}>
                  {formatPrice(plan.price_inr)}
                </p>
                {plan.savings_pct && (
                  <p style={{ fontSize: 12, color: "#34D399", fontFamily: "Cabinet Grotesk, sans-serif", marginTop: 4 }}>
                    You save {plan.savings_pct}% vs monthly
                  </p>
                )}
              </div>

              {/* Gateway selection */}
              <div>
                <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Choose payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["razorpay", "cashfree"] as PaymentGateway[]).map((gw) => (
                    <button
                      key={gw}
                      onClick={() => setGateway(gw)}
                      className="py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                      style={{
                        fontFamily: "Cabinet Grotesk, sans-serif",
                        fontWeight: 600,
                        border: gateway === gw ? "1.5px solid #7C3AED" : "1px solid rgba(255,255,255,0.12)",
                        background: gateway === gw ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                        color: gateway === gw ? "#A78BFA" : "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                      }}
                    >
                      {gw === "razorpay" ? <><CreditCard style={{ width: 14, height: 14 }} />Razorpay</> : <><Smartphone style={{ width: 14, height: 14 }} />Cashfree</>}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  UPI · Cards · Net Banking · Wallet
                </p>
              </div>

              {/* Proceed button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProceed}
                className="w-full py-3.5 rounded-xl font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  fontSize: 16,
                  boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Proceed to Pay {formatPrice(plan.price_inr)}
              </motion.button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2">
                <Lock style={{ width: 12, height: 12, color: "rgba(255,255,255,0.3)" }} />
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  Secured by 256-bit SSL encryption
                </p>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: "rgba(255,255,255,0.6)" }}>
                Opening payment gateway...
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center py-8 gap-5">
              {/* Animated checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.2)", border: "2px solid rgba(16,185,129,0.5)" }}
              >
                <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Check className="w-10 h-10 text-emerald-400" />
                </motion.div>
              </motion.div>

              {/* Confetti particles */}
              {!reduced && Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 0,
                    x: (Math.random() - 0.5) * 200,
                    y: -100 - Math.random() * 80,
                  }}
                  transition={{ duration: 0.8 + Math.random() * 0.4, delay: 0.1 * i }}
                  style={{
                    position: "absolute",
                    width: 8, height: 8,
                    borderRadius: Math.random() > 0.5 ? "50%" : 2,
                    background: ["#10B981", "#F59E0B", "#6366F1", "#EC4899", "#3B82F6"][i % 5],
                    top: "40%", left: "50%",
                    pointerEvents: "none",
                  }}
                />
              ))}

              <div className="text-center space-y-1">
                <p style={{ fontFamily: "Clash Display, sans-serif", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                  You're all set!
                </p>
                <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)" }}>
                  Your subscription is now active.
                </p>
              </div>

              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSuccess}
                  className="px-8 py-3 rounded-xl font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    fontFamily: "Cabinet Grotesk, sans-serif",
                    fontSize: 15,
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Start Practicing →
                </motion.button>
              </Link>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
                <X className="w-8 h-8 text-red-400" />
              </div>
              <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: "rgba(255,255,255,0.55)", textAlign: "center", fontSize: 14 }}>
                {errorMsg || "Payment unsuccessful. Please try again."}
              </p>
              <button
                onClick={() => { setStep("confirm"); setErrorMsg(""); }}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", fontFamily: "Cabinet Grotesk, sans-serif" }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Pricing Page
// ---------------------------------------------------------------------------
export default function Pricing() {
  usePricingFonts();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { status: subStatus } = useSubscription();
  const reduced = useReducedMotion();

  // Role toggle
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Scroll to pricing cards ref
  const cardsRef = useRef<HTMLDivElement>(null);

  // Fetch plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans", role],
    queryFn: () => fetchPlans(role),
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      setLocation(`/login?redirect=/pricing&plan=${plan.plan_key}`);
      return;
    }
    setSelectedPlan(plan);
  };

  const scrollToCards = (targetRole: "student" | "teacher") => {
    setRole(targetRole);
    setTimeout(() => cardsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const userPlanKey = subStatus?.plan?.plan_key;
  const statusStr = subStatus?.status ?? null;

  const D = {
    bg: "#07070f",
    text: "#fff",
    sub: "rgba(255,255,255,0.55)",
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: D.bg, overflow: "hidden" }}
    >
      {/* Google Fonts preconnect */}
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />

      {/* ================================================================
          HERO SECTION
      ================================================================ */}
      <section
        className="relative"
        style={{ paddingTop: 120, paddingBottom: 80, textAlign: "center", overflow: "hidden" }}
      >
        <AuroraBackground />

        <div className="relative max-w-3xl mx-auto px-6" style={{ zIndex: 1 }}>
          {/* Pill badge */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Sparkles style={{ width: 13, height: 13, color: "#A78BFA" }} />
            <span style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>
              Simple, Transparent Pricing
            </span>
          </motion.div>

          {/* Headline */}
          <h1 style={{ fontFamily: "Clash Display, sans-serif", fontWeight: 700, lineHeight: 1.1, marginBottom: 24 }}>
            {["Unlock", "Your", "Full"].map((word, i) => (
              <motion.span
                key={word}
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                style={{
                  display: "inline-block",
                  marginRight: 12,
                  fontSize: "clamp(44px, 7vw, 76px)",
                  color: D.text,
                }}
              >
                {word}
              </motion.span>
            ))}
            <br />
            {["Learning", "Potential"].map((word, i) => (
              <motion.span
                key={word}
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 + i * 0.08 }}
                style={{
                  display: "inline-block",
                  marginRight: 12,
                  fontSize: "clamp(44px, 7vw, 76px)",
                  background: "linear-gradient(135deg, #818CF8, #A78BFA, #38BDF8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 18, color: D.sub, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.65 }}
          >
            Practice smarter. Learn faster. Track your progress. Everything you need to master Abacus and Vedic Math — in one place.
          </motion.p>

          {/* Role toggle */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.6 }}
            className="inline-flex rounded-full p-1 mx-auto"
            style={{
              width: 280,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {(["student", "teacher"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="relative flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors"
                style={{
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  cursor: "pointer",
                  border: "none",
                  background: "none",
                  color: role === r ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                {role === r && (
                  <motion.div
                    layoutId="role-toggle-indicator"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 capitalize">{r}</span>
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          PRICING CARDS
      ================================================================ */}
      <section ref={cardsRef} className="relative max-w-5xl mx-auto px-4 pb-16" style={{ zIndex: 1 }}>
        {plansLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div
            className="grid gap-6 items-stretch"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              alignItems: "start",
            }}
          >
            {plans.map((plan, i) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                visible={true}
                delay={plan.is_popular ? 0.2 : i * 0.1}
                userPlanKey={userPlanKey}
                subStatus={statusStr}
                onSelect={handleSelectPlan}
                isLoggedIn={isAuthenticated}
              />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================
          TRUST BAR
      ================================================================ */}
      <motion.section
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-4xl mx-auto px-4 py-12"
        style={{ zIndex: 1 }}
      >
        <div
          className="rounded-2xl px-8 py-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Shield style={{ width: 18, height: 18, color: "#6EE7B7" }} />, text: "Secure Payment" },
              { icon: <Zap style={{ width: 18, height: 18, color: "#FCD34D" }} />, text: "Instant Activation" },
              { icon: <RefreshCcw style={{ width: 18, height: 18, color: "#93C5FD" }} />, text: "Cancel Anytime" },
              { icon: <GraduationCap style={{ width: 18, height: 18, color: "#F0ABFC" }} />, text: "Trusted by 1000+ Students" },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                {icon}
                <span style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ================================================================
          FAQ
      ================================================================ */}
      <motion.section
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-2xl mx-auto px-4 py-12"
        style={{ zIndex: 1 }}
      >
        <h2 style={{ fontFamily: "Clash Display, sans-serif", fontSize: 36, fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: 40 }}>
          Frequently Asked Questions
        </h2>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              q={faq.q}
              a={faq.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </motion.section>

      {/* ================================================================
          CTA FOOTER BANNER
      ================================================================ */}
      <motion.section
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative mx-4 md:mx-8 mb-16 rounded-3xl overflow-hidden"
        style={{
          zIndex: 1,
          background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.12) 50%, rgba(14,165,233,0.10) 100%)",
          border: "1px solid rgba(124,58,237,0.2)",
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: "Clash Display, sans-serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
          Ready to start your journey?
        </h2>
        <p style={{ fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 18, color: "rgba(255,255,255,0.55)", marginBottom: 36 }}>
          Join hundreds of students mastering Abacus and Vedic Math.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => scrollToCards("student")}
            className="px-8 py-3.5 rounded-xl font-semibold text-white"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 16,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              cursor: "pointer", border: "none",
            }}
          >
            Get Student Access
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => scrollToCards("teacher")}
            className="px-8 py-3.5 rounded-xl font-semibold"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif", fontSize: 16,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Get Teacher Access
          </motion.button>
        </div>
      </motion.section>

      {/* ================================================================
          PAYMENT MODAL
      ================================================================ */}
      <AnimatePresence>
        {selectedPlan && (
          <PaymentModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onSuccess={() => setSelectedPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
