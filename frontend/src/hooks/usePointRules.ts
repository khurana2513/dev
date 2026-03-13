/**
 * usePointRules — TanStack Query hook for fetching point rules from the API.
 *
 * Rules are public (no auth), cached for 10 minutes, and shared across components.
 */
import { useQuery } from "@tanstack/react-query";
import { getPointRules, resolvePoints, type PointRule, type ResolvedPoints } from "../lib/userApi";

/**
 * Fetch all rules for a specific tool (and optionally operation).
 * Rules are relatively static — 10-minute stale time.
 */
export function usePointRules(tool?: string, operation?: string) {
  return useQuery<PointRule[]>({
    queryKey: ["point-rules", tool ?? "all", operation ?? "all"],
    queryFn: () => getPointRules(tool, operation),
    staleTime: 10 * 60 * 1000,    // 10 minutes
    gcTime: 30 * 60 * 1000,       // 30 minutes cache
    refetchOnWindowFocus: false,
  });
}

/**
 * Resolve point value for a specific configuration.
 * Disabled unless all required parameters are present.
 */
export function useResolvePoints(
  tool: string,
  operation: string,
  configMode: string,
  presetKey?: string,
  rowCount?: number,
  enabled: boolean = true,
) {
  return useQuery<ResolvedPoints>({
    queryKey: ["point-rules-resolve", tool, operation, configMode, presetKey ?? "", rowCount ?? ""],
    queryFn: () => resolvePoints(tool, operation, configMode, presetKey, rowCount),
    enabled: enabled && !!tool && !!operation,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Helper to build a lookup map from PointRule[] for fast client-side resolution.
 * Key format: `${operation}:${preset_key}`
 */
export function buildPointsLookup(rules: PointRule[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rule of rules) {
    if (rule.mode === "preset" && rule.preset_key) {
      map.set(`${rule.operation}:${rule.preset_key}`, rule.points_correct);
    }
  }
  return map;
}
