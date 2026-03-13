/**
 * Streak Celebration Store — triggers a full-screen fire celebration
 * when the user earns / extends their daily streak.
 */

import { create } from "zustand";

interface StreakCelebrationState {
  visible: boolean;
  streakCount: number;
  /** Call this when the backend confirms streak_updated === true */
  trigger: (count: number) => void;
  dismiss: () => void;
}

export const useStreakCelebrationStore = create<StreakCelebrationState>((set) => ({
  visible: false,
  streakCount: 0,
  trigger: (count) => set({ visible: true, streakCount: count }),
  dismiss: () => set({ visible: false }),
}));
