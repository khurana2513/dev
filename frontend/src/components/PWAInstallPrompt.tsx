/**
 * PWAInstallPrompt
 * Captures the browser's "beforeinstallprompt" event and shows a tasteful
 * install banner for Android/Chrome.
 *
 * iOS note: iOS does not fire "beforeinstallprompt". Instead it shows an
 * "Add to Home Screen" option in the Safari share sheet. We detect iOS and
 * render manual instructions in that case.
 *
 * The banner is only shown once per session (dismissed state is stored in
 * sessionStorage so it doesn't re-appear on every navigation).
 */
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as MacIntel + touch
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode() {
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("pwa-install-dismissed") === "1"
  );

  useEffect(() => {
    // Already installed as PWA — nothing to show
    if (isInStandaloneMode()) return;

    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install BlackMonkey"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-sm
                 bg-[#0f0c29]/95 backdrop-blur border border-violet-500/30 rounded-2xl
                 shadow-2xl p-4 text-sm text-slate-200"
    >
      <button
        onClick={dismiss}
        aria-label="Close install prompt"
        className="absolute top-3 right-3 p-1 rounded-md hover:bg-white/10 text-slate-400
                   hover:text-slate-200 transition-colors"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <img
          src="/icons/pwa-192x192.png"
          alt="BlackMonkey icon"
          className="w-12 h-12 rounded-xl flex-shrink-0"
        />
        <div>
          <p className="font-semibold text-white">Install BlackMonkey</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Add to your home screen for faster access and an app-like experience — works offline too.
          </p>
        </div>
      </div>

      {deferredPrompt && (
        <button
          onClick={install}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     bg-violet-600 hover:bg-violet-500 text-white font-semibold
                     transition-colors focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-violet-400"
        >
          <Download size={15} />
          Add to Home Screen
        </button>
      )}

      {showIOSHint && (
        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed">
          <p className="flex items-center gap-1.5 font-medium text-slate-200 mb-1">
            <Share size={14} className="text-violet-400" />
            How to install on iOS
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Tap the <strong className="text-slate-300">Share</strong> button in Safari</li>
            <li>Scroll down and tap <strong className="text-slate-300">Add to Home Screen</strong></li>
            <li>Tap <strong className="text-slate-300">Add</strong></li>
          </ol>
        </div>
      )}
    </div>
  );
}
