import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Lock, History, RefreshCcw } from "lucide-react";
import { useSubscription } from "../contexts/SubscriptionContext";
import { useAuth } from "../contexts/AuthContext";
import Login from "./Login";

interface SubscriptionGateProps {
  /** If true, only blocks if account suspended / not in allowlist — not for inactive subscriptions */
  softOnly?: boolean;
  children: ReactNode;
}

/**
 * Subscription gate — renders children normally when access is allowed.
 * When blocked, shows an in-place overlay (no redirect) so back-button works naturally.
 *
 * Usage:
 *   <SubscriptionGate>          ← hard gate (active subscription required)
 *   <SubscriptionGate softOnly> ← soft gate (history allowed even when expired)
 */
export default function SubscriptionGate({ softOnly = false, children }: SubscriptionGateProps) {
  const { isAuthenticated, loading } = useAuth();
  const { status, isLoading, canAccessTools, canAccessHistory } = useSubscription();

  // Still loading auth or subscription
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  // Not logged in → show login
  if (!isAuthenticated) return <Login />;

  // Determine block condition
  const isBlocked = softOnly ? !canAccessHistory : !canAccessTools;

  return (
    <div className="relative">
      {/* Always render children (so URL stays the same) */}
      <div
        aria-hidden={isBlocked}
        style={isBlocked ? { filter: "blur(4px)", pointerEvents: "none", userSelect: "none" } : undefined}
      >
        {children}
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {isBlocked && (
          <motion.div
            key="sub-gate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              background: "rgba(9, 9, 15, 0.72)",
              minHeight: "100vh",
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.3, type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-2xl p-8 max-w-md mx-4 text-center"
              style={{
                background: "rgba(15, 15, 25, 0.95)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              }}
            >
              {/* Animated lock icon */}
              <motion.div
                initial={{ rotate: -8 }}
                animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                transition={{ duration: 0.55, delay: 0.3 }}
                className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                <Lock className="w-7 h-7 text-indigo-400" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">
                {status?.status === "suspended"
                  ? "Account Suspended"
                  : status?.status === "grace"
                  ? "Grace Period Ending"
                  : "Subscription Required"}
              </h2>

              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {status?.status === "suspended"
                  ? "Your account has been suspended. Please contact your admin."
                  : "Your progress, badges, and history are all safe. Renew to continue practicing."}
              </p>

              <div className="flex flex-col gap-3">
                {status?.status !== "suspended" && (
                  <Link href="/pricing">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                        boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
                      }}
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Renew Subscription →
                    </motion.button>
                  </Link>
                )}

                <Link href="/attendance">
                  <button className="w-full py-2.5 rounded-xl font-medium text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <History className="w-4 h-4" />
                    View My History →
                  </button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
