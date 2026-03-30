import { Capacitor } from "@capacitor/core";

const DEFAULT_NATIVE_API_BASE = "https://hi-test.up.railway.app";
const DEFAULT_WEB_API_BASE = "/api";
const API_BASE_STORAGE_KEY = "th_active_api_base";
const NATIVE_API_FALLBACKS = [
  "https://th.blackmonkey.in/api",
  "https://talenthub.blackmonkey.in/api",
];
const DISABLED_NATIVE_API_BASES = new Set([
  "https://th.blackmonkey.in/api",
]);

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function ensureProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `https://${value}`;
}

export function resolveApiBase(): string {
  const storedValue = getStoredApiBase();
  if (storedValue) {
    return storedValue;
  }

  const isNative = Capacitor.isNativePlatform();
  const rawValue = isNative
    ? (import.meta.env.VITE_API_BASE_NATIVE || DEFAULT_NATIVE_API_BASE)
    : (import.meta.env.VITE_API_BASE || DEFAULT_WEB_API_BASE);
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return isNative ? DEFAULT_NATIVE_API_BASE : DEFAULT_WEB_API_BASE;
  }

  if (trimmedValue.startsWith("/")) {
    return stripTrailingSlash(trimmedValue) || "/";
  }

  return stripTrailingSlash(ensureProtocol(trimmedValue));
}

export function getApiBaseCandidates(): string[] {
  const isNative = Capacitor.isNativePlatform();
  const envNative = stripTrailingSlash(ensureProtocol(import.meta.env.VITE_API_BASE_NATIVE || DEFAULT_NATIVE_API_BASE));
  const envWeb = import.meta.env.VITE_API_BASE?.trim();
  const candidates = [
    envNative,
    DEFAULT_NATIVE_API_BASE,
    ...NATIVE_API_FALLBACKS,
  ];

  if (envWeb && /^https?:\/\//i.test(envWeb)) {
    candidates.unshift(stripTrailingSlash(ensureProtocol(envWeb)));
  }

  if (!isNative) {
    candidates.unshift(resolveApiBase());
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function getStoredApiBase(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(API_BASE_STORAGE_KEY);
  if (!value) {
    return null;
  }
  const normalizedValue = stripTrailingSlash(value);
  if (DISABLED_NATIVE_API_BASES.has(normalizedValue)) {
    window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    return null;
  }
  return normalizedValue;
}

export function setActiveApiBase(apiBase: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!apiBase) {
    window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(API_BASE_STORAGE_KEY, stripTrailingSlash(apiBase));
}

export function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${resolveApiBase()}${normalizedEndpoint}`;
}

export function looksLikeHtmlDocument(payload: string): boolean {
  const trimmed = payload.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}
