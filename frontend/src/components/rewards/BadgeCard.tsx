/**
 * BadgeCard — single badge display with tier-aware styling.
 * Shows earned state with glow effect, or locked state with progress bar.
 */

import { motion } from "framer-motion";
import type { BadgeStatus } from "../../types/rewards";
import { TIER_COLORS } from "../../types/rewards";

interface Props {
  badge: BadgeStatus;
  onClick?: () => void;
}

export default function BadgeCard({ badge, onClick }: Props) {
  const tier = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
  const earned = badge.is_earned;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative flex flex-col items-center gap-2 p-4 rounded-2xl border
        transition-all duration-300 cursor-pointer text-center w-full
        ${earned
          ? `${tier.bg} ${tier.border} shadow-lg ${tier.glow}`
          : "bg-zinc-800/40 border-zinc-700/40 opacity-60 hover:opacity-80"
        }
      `}
    >
      {/* Tier glow ring */}
      {earned && (
        <div className={`absolute inset-0 rounded-2xl ${tier.glow} shadow-2xl blur-sm -z-10`} />
      )}

      {/* Icon */}
      <span className="text-3xl leading-none select-none">
        {badge.icon_emoji || "🏅"}
      </span>

      {/* Name */}
      <h4
        className={`text-sm font-semibold leading-tight ${
          earned ? tier.text : "text-zinc-400"
        }`}
      >
        {badge.name}
      </h4>

      {/* Description */}
      <p className="text-xs text-zinc-500 leading-snug line-clamp-2">
        {badge.description}
      </p>

      {/* Earned date or progress */}
      {earned && badge.earned_at ? (
        <span className="text-[10px] text-zinc-500 mt-auto">
          {new Date(badge.earned_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ) : !earned && badge.progress_pct != null ? (
        <div className="w-full mt-auto">
          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${badge.progress_pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                badge.progress_pct >= 75
                  ? "bg-emerald-400"
                  : badge.progress_pct >= 40
                  ? "bg-amber-400"
                  : "bg-zinc-500"
              }`}
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            {badge.progress}
          </span>
        </div>
      ) : null}

      {/* Tier label */}
      <span
        className={`absolute top-2 right-2 text-[9px] uppercase tracking-wider font-bold ${tier.text}`}
      >
        {badge.tier}
      </span>
    </motion.button>
  );
}
