/**
 * StudentRewards — main page combining all reward components.
 * Route: /rewards
 */

import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Flame, Trophy, Clock, BarChart3 } from "lucide-react";
import RewardsSummaryBar from "../components/rewards/RewardsSummaryBar";
import StreakDisplay from "../components/rewards/StreakDisplay";
import BadgeGrid from "../components/rewards/BadgeGrid";
import WeeklySummaryCard from "../components/rewards/WeeklySummaryCard";
import LeaderboardTable from "../components/rewards/LeaderboardTable";
import PointsHistoryList from "../components/rewards/PointsHistoryList";
import SuperJourneySection from "../components/rewards/SuperJourneySection";

type Tab = "badges" | "streak" | "leaderboard" | "history" | "weekly";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "badges", label: "Badges", icon: <Award className="w-4 h-4" /> },
  { key: "streak", label: "Streak", icon: <Flame className="w-4 h-4" /> },
  {
    key: "leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="w-4 h-4" />,
  },
  { key: "weekly", label: "Weekly", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "history", label: "History", icon: <Clock className="w-4 h-4" /> },
];

export default function StudentRewards({
  currentUserId,
}: {
  currentUserId?: number;
}) {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const tabSectionRef = useRef<HTMLDivElement>(null);
  const VALID_TABS: Tab[] = ["badges", "streak", "leaderboard", "weekly", "history"];
  const tabParam = new URLSearchParams(search).get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "badges"
  );

  // Sync tab when URL search changes (e.g. navbar streak click while already on /rewards)
  useEffect(() => {
    const p = new URLSearchParams(search).get("tab") as Tab | null;
    if (p && VALID_TABS.includes(p)) {
      setActiveTab(p);
      // Small delay lets the layout settle before scrolling
      setTimeout(() => {
        tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setLocation(`/rewards?tab=${tab}`, { replace: true });
    setTimeout(() => {
      tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6" style={{ background: '#07070F' }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1
          className="text-2xl md:text-3xl font-extrabold text-white tracking-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Rewards &amp; Achievements
        </h1>
        <p className="text-sm text-zinc-500">
          Track your progress, earn badges, and climb the leaderboard.
        </p>
      </motion.div>

      {/* Summary bar */}
      <RewardsSummaryBar onTabChange={handleTabChange} />

      {/* SUPER Journey */}
      <SuperJourneySection />

      {/* Tab nav */}
      <div ref={tabSectionRef} className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="rewards-tab-bg"
                className="absolute inset-0 bg-zinc-800 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === "badges" && <BadgeGrid />}
          {activeTab === "streak" && <StreakDisplay />}
          {activeTab === "leaderboard" && (
            <LeaderboardTable currentUserId={currentUserId} />
          )}
          {activeTab === "weekly" && <WeeklySummaryCard />}
          {activeTab === "history" && <PointsHistoryList />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
