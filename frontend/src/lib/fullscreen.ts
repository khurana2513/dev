/**
 * Cross-platform fullscreen utility.
 * Uses the Fullscreen API on web, falls back to a CSS-based
 * approach on Capacitor/native where the API isn't available.
 */
import { Capacitor } from "@capacitor/core";

const FS_CLASS = "app-fullscreen";

/** Check whether browser fullscreen or CSS-based fullscreen is active */
export function isFullscreen(): boolean {
  return !!document.fullscreenElement || document.documentElement.classList.contains(FS_CLASS);
}

/** Request fullscreen — uses Fullscreen API on web, CSS class on native */
export async function enterFullscreen(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add(FS_CLASS);
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new Event("fullscreenchange"));
    return;
  }
  try {
    await document.documentElement.requestFullscreen();
  } catch (_) {
    // Fallback to CSS-based approach if Fullscreen API fails
    document.documentElement.classList.add(FS_CLASS);
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new Event("fullscreenchange"));
  }
}

/** Exit fullscreen */
export async function exitFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch (_) {}
  }
  if (document.documentElement.classList.contains(FS_CLASS)) {
    document.documentElement.classList.remove(FS_CLASS);
    document.body.style.overflow = "";
    window.dispatchEvent(new Event("fullscreenchange"));
  }
}

/** Toggle fullscreen */
export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
}
