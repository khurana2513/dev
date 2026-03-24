import { Capacitor } from "@capacitor/core";

const DEFAULT_NATIVE_API_BASE = "https://talenthub.blackmonkey.in/api";
const DEFAULT_WEB_API_BASE = "/api";

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

export function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${resolveApiBase()}${normalizedEndpoint}`;
}

export function looksLikeHtmlDocument(payload: string): boolean {
  const trimmed = payload.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}
