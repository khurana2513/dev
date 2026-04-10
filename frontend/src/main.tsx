import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// Permanently dark mode — apply before render to avoid any flash
document.documentElement.classList.add("dark");

// Unregister any previously installed service workers in development.
// An active SW can intercept API requests and serve stale cached responses,
// causing dashboard/rewards/profile to appear stuck in loading state.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Initialize Google Auth as early as possible.
// On native (Android/iOS) the plugin reads serverClientId from capacitor.config.json.
// On web it needs the explicit clientId to render the GSI button.
GoogleAuth.initialize({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  scopes: ["profile", "email"],
  grantOfflineAccess: true,
});

// Register service worker. autoUpdate: the SW updates silently on reload.
// We still expose an `updateSW` trigger so the app can prompt the user.
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch a custom event so any component can listen and show the prompt
    window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { updateSW } }));
  },
  onOfflineReady() {
    console.log("✓ [PWA] App is ready to work offline");
  },
  onRegisteredSW(swUrl, r) {
    // Check for SW updates every hour while the tab is open
    if (r) {
      setInterval(async () => {
        if (!(!r.installing && navigator.onLine)) return;
        const resp = await fetch(swUrl, {
          cache: "no-store",
          headers: { "cache": "no-store", "cache-control": "no-cache" },
        });
        if (resp?.status === 200) r.update();
      }, 60 * 60 * 1000);
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);

