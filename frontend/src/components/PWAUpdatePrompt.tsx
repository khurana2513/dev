/**
 * PWAUpdatePrompt
 * Listens for the "pwa-update-available" custom event (fired from main.tsx)
 * and shows a banner asking the user to reload for the new version.
 */
import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export function PWAUpdatePrompt() {
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { updateSW: () => Promise<void> };
      setUpdateSW(() => detail.updateSW);
      setDismissed(false);
    };
    window.addEventListener("pwa-update-available", handler);
    return () => window.removeEventListener("pwa-update-available", handler);
  }, []);

  if (!updateSW || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm
                 flex items-center gap-3 px-4 py-3
                 bg-[#1e1b4b] border border-violet-500/40 rounded-xl shadow-2xl
                 text-sm text-slate-200"
    >
      <RefreshCw size={18} className="text-violet-400 flex-shrink-0" />
      <span className="flex-1">A new version of BlackMonkey is available.</span>
      <button
        onClick={() => updateSW()}
        className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white
                   font-semibold text-xs transition-colors focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        Update
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notification"
        className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200
                   transition-colors focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-violet-400"
      >
        <X size={14} />
      </button>
    </div>
  );
}
