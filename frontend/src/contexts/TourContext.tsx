import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourStep {
  /** CSS selector for the element to highlight (e.g. "[data-tour='hero']") */
  target: string;
  /** Short title displayed on the tooltip */
  title: string;
  /** Body text — keep it short and kid-friendly */
  content: string;
  /** Emoji icon shown next to title */
  icon?: string;
  /** Preferred tooltip placement relative to the target */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Extra padding around the spotlight cutout (px). Default 8 */
  spotlightPadding?: number;
  /** Border-radius for the spotlight cutout (px). Default 12 */
  spotlightRadius?: number;
  /** If true, user must click the highlighted element to advance (interactive step) */
  advanceOnClick?: boolean;
  /** Optional accent color override for this step */
  accent?: string;
}

export interface TourConfig {
  /** Unique tour ID — used as localStorage key */
  id: string;
  /** The ordered steps */
  steps: TourStep[];
  /** Called when the tour finishes or is skipped */
  onComplete?: () => void;
  /** Accent color theme. Default "#F97316" (orange) */
  accent?: string;
}

interface TourState {
  /** Currently running tour config, or null */
  activeTour: TourConfig | null;
  /** Current step index */
  currentStep: number;
  /** Whether a tour is active */
  isActive: boolean;
}

interface TourContextValue extends TourState {
  /** Start a tour. If the tour has already been seen (localStorage) and force=false, it won't start. Returns true if started. */
  startTour: (config: TourConfig, force?: boolean) => boolean;
  /** Advance to the next step, or finish if on last step */
  nextStep: () => void;
  /** Go back one step */
  prevStep: () => void;
  /** Jump to a specific step index */
  goToStep: (idx: number) => void;
  /** End the tour immediately (skip) */
  endTour: () => void;
  /** Check if a tour has been completed before */
  hasSeenTour: (tourId: string) => boolean;
  /** Reset a specific tour (so it shows again) */
  resetTour: (tourId: string) => void;
  /** Reset ALL tours */
  resetAllTours: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "bm_tour_seen_";

function markSeen(tourId: string) {
  try { localStorage.setItem(`${STORAGE_PREFIX}${tourId}`, "1"); } catch {}
}
function isSeen(tourId: string): boolean {
  try { return localStorage.getItem(`${STORAGE_PREFIX}${tourId}`) === "1"; } catch { return false; }
}
function removeSeen(tourId: string) {
  try { localStorage.removeItem(`${STORAGE_PREFIX}${tourId}`); } catch {}
}
function clearAllSeen() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>({
    activeTour: null,
    currentStep: 0,
    isActive: false,
  });

  // Ref to always have latest state in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  const startTour = useCallback((config: TourConfig, force = false): boolean => {
    if (!force && isSeen(config.id)) return false;
    if (config.steps.length === 0) return false;
    setState({ activeTour: config, currentStep: 0, isActive: true });
    return true;
  }, []);

  const endTour = useCallback(() => {
    const { activeTour } = stateRef.current;
    if (activeTour) {
      markSeen(activeTour.id);
      activeTour.onComplete?.();
    }
    setState({ activeTour: null, currentStep: 0, isActive: false });
  }, []);

  const nextStep = useCallback(() => {
    const { activeTour, currentStep } = stateRef.current;
    if (!activeTour) return;
    if (currentStep >= activeTour.steps.length - 1) {
      // Last step — finish
      endTour();
    } else {
      setState(s => ({ ...s, currentStep: s.currentStep + 1 }));
    }
  }, [endTour]);

  const prevStep = useCallback(() => {
    setState(s => ({ ...s, currentStep: Math.max(0, s.currentStep - 1) }));
  }, []);

  const goToStep = useCallback((idx: number) => {
    setState(s => {
      if (!s.activeTour) return s;
      const clamped = Math.max(0, Math.min(idx, s.activeTour.steps.length - 1));
      return { ...s, currentStep: clamped };
    });
  }, []);

  const hasSeenTour = useCallback((tourId: string) => isSeen(tourId), []);
  const resetTour = useCallback((tourId: string) => removeSeen(tourId), []);
  const resetAllTours = useCallback(() => clearAllSeen(), []);

  return (
    <TourContext.Provider value={{
      ...state,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      endTour,
      hasSeenTour,
      resetTour,
      resetAllTours,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
