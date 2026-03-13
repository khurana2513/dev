/**
 * RewardsSummaryBar — compact top bar for the rewards page.
 * Shows total points, streak, badges earned, and live rank.
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Coins, Flame, Award, Trophy } from "lucide-react";
import { fetchRewardsSummary } from "../../lib/rewardsApi";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  delay: number;
  onClick?: () => void;
}

function StatCard({ icon, label, value, accent, delay, onClick }: StatCardProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex items-center gap-3 rounded-xl border bg-zinc-900/60 px-4 py-3 w-full text-left transition-all hover:brightness-125 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${accent}`}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-800/80">
        {icon}
      </div>
      <div>
        <p className="text-lg font-extrabold text-white leading-none">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
      </div>
    </motion.button>
  );
}

export default function RewardsSummaryBar({
  onTabChange,
}: {
  onTabChange?: (tab: "history" | "streak" | "badges" | "leaderboard") => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["rewards-summary"],
    queryFn: fetchRewardsSummary,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-zinc-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<Coins className="w-5 h-5 text-yellow-400" />}
        label="Total Points"
        value={data.total_points}
        accent="border-yellow-500/20"
        delay={0}
        onClick={() => onTabChange?.("history")}
      />
      <StatCard
        icon={<Flame className="w-5 h-5 text-orange-400" />}
        label="Day Streak"
        value={data.current_streak}
        accent="border-orange-500/20"
        delay={0.05}
        onClick={() => onTabChange?.("streak")}
      />
      <StatCard
        icon={<Award className="w-5 h-5 text-violet-400" />}
        label="Badges Earned"
        value={data.badges_earned}
        accent="border-violet-500/20"
        delay={0.1}
        onClick={() => onTabChange?.("badges")}
      />
      <StatCard
        icon={<Trophy className="w-5 h-5 text-emerald-400" />}
        label="Current Rank"
        value={data.leaderboard_rank ? `#${data.leaderboard_rank}` : "—"}
        accent="border-emerald-500/20"
        delay={0.15}
        onClick={() => onTabChange?.("leaderboard")}
      />
    </div>
  );
}
