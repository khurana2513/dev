/**
 * Streak Celebration Store — triggers a full-screen celebration
 * when the user earns / extends their daily streak.
 */

import { create } from "zustand";

export interface StreakNewBadge {
  name: string;
  days: number;
  emoji: string;
}

interface StreakCelebrationState {
  visible: boolean;
  streakCount: number;
  prevStreak: number;
  pointsEarned: number;
  newBadge: StreakNewBadge | null;
  /** Call this when streak has been confirmed increased */
  trigger: (
    count: number,
    opts?: {
      prevStreak?: number;
      pointsEarned?: number;
      newBadge?: StreakNewBadge | null;
    }
  ) => void;
  dismiss: () => void;
}

export const useStreakCelebrationStore = create<StreakCelebrationState>((set) => ({
  visible: false,
  streakCount: 0,
  prevStreak: 0,
  pointsEarned: 0,
  newBadge: null,
  trigger: (count, opts = {}) =>
    set({
      visible: true,
      streakCount: count,
      prevStreak: opts.prevStreak ?? 0,
      pointsEarned: opts.pointsEarned ?? 0,
      newBadge: opts.newBadge ?? null,
    }),
  dismiss: () => set({ visible: false }),
}));
