/**
 * superLetterStore — Zustand store for queuing SUPER letter unlock cinematics.
 *
 * When a practice session unlocks a super_letter_* badge, the letter is pushed
 * into this queue. SuperLetterCinematic (mounted at App root) shows each one.
 */

import { create } from "zustand";

export interface SuperLetterEvent {
  letter: string;         // "S" | "U" | "P" | "E" | "R"
  badge_key: string;
  isAllDone: boolean;     // true if this completes the full SUPER word
}

interface SuperLetterState {
  queue: SuperLetterEvent[];
  current: SuperLetterEvent | null;
  enqueue: (events: SuperLetterEvent[]) => void;
  dismiss: () => void;
}

export const useSuperLetterStore = create<SuperLetterState>((set, get) => ({
  queue: [],
  current: null,

  enqueue: (events) => {
    if (!events.length) return;
    set((state) => {
      const newQueue = [...state.queue, ...events];
      if (state.current === null) {
        return { queue: newQueue.slice(1), current: newQueue[0] };
      }
      return { queue: newQueue };
    });
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      set({ current: queue[0], queue: queue.slice(1) });
    } else {
      set({ current: null });
    }
  },
}));
