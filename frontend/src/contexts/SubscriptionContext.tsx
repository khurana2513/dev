import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchMySubscriptionStatus } from "../lib/subscriptionApi";
import type { MySubscriptionStatus } from "../types/subscription";

interface SubscriptionContextType {
  status: MySubscriptionStatus | null;
  isLoading: boolean;
  canAccessTools: boolean;
  canAccessHistory: boolean;
  isInGrace: boolean;
  graceDaysRemaining: number | null;
  daysUntilExpiry: number | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let lastFetchedAt = 0;
let cachedStatus: MySubscriptionStatus | null = null;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<MySubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedStatus && now - lastFetchedAt < CACHE_TTL_MS) {
      setStatus(cachedStatus);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchMySubscriptionStatus();
      cachedStatus = data;
      lastFetchedAt = Date.now();
      setStatus(data);
    } catch {
      // Non-fatal: just leave status as null
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadStatus();
    } else if (!isAuthenticated) {
      setStatus(null);
      cachedStatus = null;
      lastFetchedAt = 0;
    }
  }, [isAuthenticated, authLoading, loadStatus]);

  const refresh = useCallback(() => loadStatus(true), [loadStatus]);

  const canAccessTools = status?.can_access_tools ?? false;
  const canAccessHistory = status?.can_access_history ?? true;
  const isInGrace = status?.status === "grace";
  const graceDaysRemaining = status?.grace_days_remaining ?? null;
  const daysUntilExpiry = status?.days_remaining ?? null;

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isLoading,
        canAccessTools,
        canAccessHistory,
        isInGrace,
        graceDaysRemaining,
        daysUntilExpiry,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used inside <SubscriptionProvider>");
  return ctx;
}
