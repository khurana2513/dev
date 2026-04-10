/**
 * duelApi.ts – HTTP helpers and shared types for Live Duel Mode.
 *
 * The WebSocket itself is managed in DuelMode.tsx via a custom hook.
 * This file handles:
 *   • All REST calls (create room, join, get state, request WS ticket)
 *   • Shared type definitions used across duel UI components
 *   • WS URL construction
 */

import apiClient from "./apiClient";
import { resolveApiBase } from "./apiBase";

// ── Shared types ──────────────────────────────────────────────────────────────

export type BurstOperationType =
  | "burst_tables"
  | "burst_multiplication"
  | "burst_division"
  | "burst_decimal_multiplication"
  | "burst_decimal_division"
  | "burst_lcm"
  | "burst_gcd"
  | "burst_square_root"
  | "burst_cube_root"
  | "burst_percentage";

export interface SelectedCombo {
  opType:      BurstOperationType;
  optionValue: string;
}

export interface DuelConfig {
  type:        "single" | "mix";
  opType?:     BurstOperationType;
  optionValue?: string;
  combos?:     SelectedCombo[];
}

export interface DuelPlayer {
  id:          number;
  name:        string;
  joined_at:   number;
  is_ready:    boolean;
  is_finished: boolean;
}

export interface DuelScore {
  correct:  number;
  wrong:    number;
  points:   number;
  finished: boolean;
}

export interface DuelRoomState {
  code:     string;
  state:    "lobby" | "countdown" | "playing" | "finishing" | "results";
  host_id:  number;
  seed:     number;
  config:   DuelConfig;
  start_ts: number | null;
  players:  DuelPlayer[];
  scores:   Record<number, DuelScore>;
}

export interface DuelRanking {
  userId:   number;
  name:     string;
  rank:     number;
  correct:  number;
  wrong:    number;
  points:   number;
  finished: boolean;
}

// ── WebSocket message union ───────────────────────────────────────────────────

export type DuelMsg =
  | { type: "ROOM_STATE";      payload: DuelRoomState }
  | { type: "PLAYER_JOINED";   payload: { player: { id: number; name: string } } }
  | { type: "PLAYER_LEFT";     payload: { userId: number; players: DuelPlayer[]; newHostId?: number } }
  | { type: "COUNTDOWN";       payload: { n: number } }
  | { type: "GAME_START";      payload: { seed: number; startTimestamp: number } }
  | { type: "LIVE_SCORE";      payload: { userId: number; correct: number; wrong: number } }
  | { type: "PLAYER_FINISHED"; payload: { userId: number } }
  | { type: "ALL_FINISHED";    payload: { rankings: DuelRanking[] } }
  | { type: "ERROR";           payload: { code: string; message: string } }
  | { type: "PONG";            payload: Record<string, never> };

// ── HTTP API helpers ──────────────────────────────────────────────────────────

export async function createDuelRoom(config: DuelConfig): Promise<DuelRoomState> {
  return apiClient.post<DuelRoomState>("/duel/rooms", { config });
}

export async function getDuelRoom(code: string): Promise<DuelRoomState> {
  return apiClient.get<DuelRoomState>(`/duel/rooms/${code.toUpperCase()}`);
}

export async function joinDuelRoom(code: string): Promise<{ code: string; players: DuelPlayer[] }> {
  return apiClient.post(`/duel/rooms/${code.toUpperCase()}/join`, {});
}

export async function requestWsTicket(code: string): Promise<{ ticket: string; expires_in: number }> {
  return apiClient.post(`/duel/rooms/${code.toUpperCase()}/ws-ticket`, {});
}

// ── WebSocket URL construction ────────────────────────────────────────────────

/**
 * Build the WebSocket URL for a duel room.
 *
 * Dev:  Vite proxy handles /api/duel/ws/** with ws:true
 *       → ws://localhost:3000/api/duel/ws/{code}?ticket={ticket}
 *
 * Prod: Same-origin routing (Railway / Nginx)
 *       → wss://app.domain.com/api/duel/ws/{code}?ticket={ticket}
 *
 * Native (Capacitor): uses the explicit VITE_API_BASE_NATIVE
 *       → wss://backend.railway.app/duel/ws/{code}?ticket={ticket}
 */
export function buildDuelWsUrl(code: string, ticket: string): string {
  const apiBase = resolveApiBase();

  // Relative path (web mode) – use window.location host + API base path
  if (apiBase.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${apiBase}/duel/ws/${code.toUpperCase()}?ticket=${ticket}`;
  }

  // Absolute URL (native app or explicit env override) – convert HTTP to WS
  const wsBase = apiBase
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//,  "ws://");
  return `${wsBase}/duel/ws/${code.toUpperCase()}?ticket=${ticket}`;
}
