import { Link } from "wouter";
import { useSubscription } from "../contexts/SubscriptionContext";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

/**
 * Persistent grace-period banner — mounts above everything (at app layout level).
 * Shown when isInGrace = true. Non-dismissable during the current page session,
 * but we allow a soft hide (session only) for UX comfort.
 */
export default function GraceBanner() {
  const { isInGrace, graceDaysRemaining, status } = useSubscription();
  const [hidden, setHidden] = useState(false);

  if (!isInGrace || hidden) return null;

  const isExpired = status?.status === "expired";
  const days = graceDaysRemaining ?? 0;

  const bannerText = isExpired
    ? "Your subscription has expired. Renew to continue practicing."
    : days === 0
    ? "Your subscription expired today. Renew now before practice tools are paused."
    : `Your subscription expires in ${days} day${days === 1 ? "" : "s"}. Renew now to keep your streak and practice access.`;

  return (
    <div
      role="alert"
      className="w-full z-50 relative flex items-center justify-between gap-3 px-4 py-2.5
        bg-amber-950/80 border-b border-amber-800
        dark:bg-amber-950/80 dark:border-amber-800
        light:bg-amber-50 light:border-amber-200"
      style={{
        background: "var(--grace-bg, rgba(69, 26, 3, 0.85))",
        borderBottom: "1px solid rgba(217, 119, 6, 0.4)",
      }}
    >
      {/* Amber bg override for light mode via parent class */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <AlertTriangle
          className="shrink-0 text-amber-400"
          style={{ width: 16, height: 16 }}
        />
        <p className="text-sm font-medium text-amber-200 truncate">
          ⚠️ {bannerText}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link href="/pricing">
          <span className="text-xs font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-2 cursor-pointer whitespace-nowrap transition-colors">
            Renew Now →
          </span>
        </Link>
        <button
          onClick={() => setHidden(true)}
          aria-label="Dismiss banner"
          className="text-amber-500 hover:text-amber-200 transition-colors"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

/**
 * Expired subscription banner — rose variant shown on pricing page / dashboard.
 */
export function ExpiredBanner() {
  const { status } = useSubscription();
  if (status?.status !== "expired") return null;

  return (
    <div
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        background: "rgba(127, 29, 29, 0.85)",
        borderBottom: "1px solid rgba(239, 68, 68, 0.35)",
      }}
    >
      <p className="text-sm font-medium text-rose-200">
        🔴 Your subscription has expired. Renew to continue practicing.
      </p>
      <Link href="/pricing">
        <span className="text-xs font-semibold text-rose-300 hover:text-rose-100 underline cursor-pointer">
          Renew →
        </span>
      </Link>
    </div>
  );
}
