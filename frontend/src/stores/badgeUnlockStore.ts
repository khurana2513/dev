/**
 * Badge Unlock Store — Zustand store for queuing badge unlock cinematics.
 *
 * When a practice session or paper submission response contains `reward_data`
 * with `badges_unlocked`, the badges are pushed into a queue.  The
 * BadgeUnlockCinematic component (mounted at App root) polls the queue
 * and shows a full-screen celebration for each badge.
 */

import { create } from "zustand";
import type { BadgeUnlock } from "../types/rewards";

interface BadgeUnlockState {
  /** Queue of badges waiting to be shown. */
  queue: BadgeUnlock[];
  /** The badge currently being shown (null when idle). */
  current: BadgeUnlock | null;
  /** Push one or more badges into the queue. */
  enqueue: (badges: BadgeUnlock[]) => void;
  /** Shift the next badge from the queue into `current`. */
  showNext: () => void;
  /** Dismiss the currently-shown badge. */
  dismiss: () => void;
}

export const useBadgeUnlockStore = create<BadgeUnlockState>((set, get) => ({
  queue: [],
  current: null,

  enqueue: (badges) => {
    if (!badges.length) return;
    set((state) => {
      const newQueue = [...state.queue, ...badges];
      // If nothing is currently showing, auto-pop the first badge
      if (state.current === null) {
        return { queue: newQueue.slice(1), current: newQueue[0] };
      }
      return { queue: newQueue };
    });
  },

  showNext: () => {
    set((state) => {
      if (state.queue.length === 0) {
        return { current: null };
      }
      return { current: state.queue[0], queue: state.queue.slice(1) };
    });
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      // Auto-chain to next badge after a short delay
      set({ current: queue[0], queue: queue.slice(1) });
    } else {
      set({ current: null });
    }
  },
}));
