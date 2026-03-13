/**
 * BadgeGrid — displays all badges in a responsive grid,
 * grouped by category (Practice, Streak, Attendance, Special).
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchBadges } from "../../lib/rewardsApi";
import BadgeCard from "./BadgeCard";
import type { BadgeCategory } from "../../types/rewards";

const CATEGORY_ORDER: { key: BadgeCategory; label: string }[] = [
  { key: "practice", label: "Practice" },
  { key: "streak", label: "Streak" },
  { key: "attendance", label: "Attendance" },
  { key: "special", label: "Special" },
];

export default function BadgeGrid() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["badges"],
    queryFn: fetchBadges,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-2xl bg-zinc-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-zinc-500 text-sm text-center py-8">
        Failed to load badges.
      </p>
    );
  }

  const badgesByCategory = new Map<BadgeCategory, typeof data.badges>();
  for (const cat of CATEGORY_ORDER) {
    badgesByCategory.set(cat.key, []);
  }
  for (const badge of data.badges.filter((b) => !b.badge_key.startsWith("super_"))) {
    const list = badgesByCategory.get(badge.category as BadgeCategory);
    if (list) list.push(badge);
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Badges
        </h3>
        <span className="text-sm text-zinc-400">
          {data.earned_count} / {data.total_count} earned
        </span>
      </div>

      {CATEGORY_ORDER.map(({ key, label }) => {
        const badges = badgesByCategory.get(key) || [];
        if (badges.length === 0) return null;

        return (
          <motion.section
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-semibold">
              {label}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {badges.map((badge) => (
                <BadgeCard key={badge.badge_key} badge={badge} />
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
