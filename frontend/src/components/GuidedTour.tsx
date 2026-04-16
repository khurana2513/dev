import { useEffect, useState, useRef, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTour, type TourStep } from "../contexts/TourContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const ANIM_DURATION = 320; // ms — transition between steps
const TOOLTIP_MAX_W = 370;
const TOOLTIP_MIN_W = 260;
const VIEWPORT_PAD = 14; // px from viewport edge

// ─── Rect helper ──────────────────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number; bottom: number; right: number }

function getTargetRect(selector: string, padding: number, radius: number): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    bottom: r.bottom + padding,
    right: r.right + padding,
  };
}

function scrollToTarget(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const viewH = window.innerHeight;
  // Only scroll if element is outside the visible viewport middle zone
  if (r.top < 80 || r.bottom > viewH - 80) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuidedTour() {
  const { activeTour, currentStep, isActive, nextStep, prevStep, endTour, goToStep } = useTour();

  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({ top: 0, left: 0, placement: "bottom" });
  const [transitioning, setTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  const rafRef = useRef<number>(0);

  const step: TourStep | null = activeTour?.steps[currentStep] ?? null;
  const accent = step?.accent ?? activeTour?.accent ?? "#F97316";
  const totalSteps = activeTour?.steps.length ?? 0;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Mount / unmount animation ─────────────────────────────────────────────

  useEffect(() => {
    if (isActive) {
      setExiting(false);
      // Small delay so initial render can capture the element
      const t = setTimeout(() => setMounted(true), 30);
      return () => clearTimeout(t);
    } else if (mounted) {
      setExiting(true);
      const t = setTimeout(() => { setMounted(false); setExiting(false); }, ANIM_DURATION);
      return () => clearTimeout(t);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Measure target and position tooltip ───────────────────────────────────

  const measure = useCallback(() => {
    if (!step) { setRect(null); return; }

    const pad = step.spotlightPadding ?? 8;
    const _radius = step.spotlightRadius ?? 12;
    const r = getTargetRect(step.target, pad, _radius);

    if (step.placement === "center" || !r) {
      // Center-screen mode (no target element or explicit center)
      setRect(null);
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      setTooltipPos({ top: viewH / 2 - 120, left: viewW / 2 - Math.min(TOOLTIP_MAX_W, viewW - 40) / 2, placement: "center" });
      return;
    }

    setRect(r);

    // Tooltip positioning
    const ttW = Math.min(TOOLTIP_MAX_W, window.innerWidth - VIEWPORT_PAD * 2);
    const ttEstH = 250; // conservative estimate to prevent overlap
    const TOOLTIP_GAP = 18; // px gap between spotlight and tooltip
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const preferred = step.placement || "bottom";

    let top = 0;
    let left = 0;
    let placement = preferred;

    // Try preferred, then fallbacks
    const tryPlacement = (p: string): boolean => {
      switch (p) {
        case "bottom":
          top = r.bottom + TOOLTIP_GAP;
          left = r.left + r.width / 2 - ttW / 2;
          return top + ttEstH < viewH - VIEWPORT_PAD;
        case "top":
          top = r.top - ttEstH - TOOLTIP_GAP;
          left = r.left + r.width / 2 - ttW / 2;
          return top > VIEWPORT_PAD;
        case "right":
          top = r.top + r.height / 2 - ttEstH / 2;
          left = r.right + TOOLTIP_GAP;
          return left + ttW < viewW - VIEWPORT_PAD;
        case "left":
          top = r.top + r.height / 2 - ttEstH / 2;
          left = r.left - ttW - TOOLTIP_GAP;
          return left > VIEWPORT_PAD;
        default:
          return false;
      }
    };

    if (!tryPlacement(preferred)) {
      const fallbacks = ["bottom", "top", "right", "left"].filter(p => p !== preferred);
      for (const fb of fallbacks) {
        if (tryPlacement(fb)) { placement = fb; break; }
      }
    } else {
      placement = preferred;
    }

    // Clamp to viewport
    left = Math.max(VIEWPORT_PAD, Math.min(left, viewW - ttW - VIEWPORT_PAD));
    top = Math.max(VIEWPORT_PAD, Math.min(top, viewH - ttEstH - VIEWPORT_PAD));

    // Final overlap guard — if clamping pushed the tooltip into the spotlight rect, flip to opposite side
    {
      const ttBottom = top + ttEstH;
      const ttRight = left + ttW;
      const overlapV = top < r.bottom && ttBottom > r.top;
      const overlapH = left < r.right && ttRight > r.left;
      if (overlapV && overlapH) {
        if (placement === "bottom" || placement === "top") {
          const altTop = placement === "bottom" ? r.top - ttEstH - TOOLTIP_GAP : r.bottom + TOOLTIP_GAP;
          top = Math.max(VIEWPORT_PAD, Math.min(altTop, viewH - ttEstH - VIEWPORT_PAD));
          placement = placement === "bottom" ? "top" : "bottom";
        } else {
          const altLeft = placement === "right" ? r.left - ttW - TOOLTIP_GAP : r.right + TOOLTIP_GAP;
          left = Math.max(VIEWPORT_PAD, Math.min(altLeft, viewW - ttW - VIEWPORT_PAD));
          placement = placement === "right" ? "left" : "right";
        }
      }
    }

    setTooltipPos({ top, left, placement });
  }, [step]);

  // Re-measure on step change, resize, scroll
  useEffect(() => {
    if (!isActive || !step) return;

    // Scroll to target
    if (step.placement !== "center") {
      scrollToTarget(step.target);
    }

    // Small delay to let scroll settle
    const scrollDelay = setTimeout(() => {
      measure();
      setTransitioning(false);
    }, 180);

    const onResize = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(measure); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      clearTimeout(scrollDelay);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isActive, step, currentStep, measure]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { endTour(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { if (!step?.advanceOnClick) nextStep(); }
      else if (e.key === "ArrowLeft") { prevStep(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, nextStep, prevStep, endTour, step]);

  // ── advanceOnClick handling ───────────────────────────────────────────────

  useEffect(() => {
    if (!isActive || !step?.advanceOnClick) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const handler = () => {
      // Small delay so the user's click action can complete first
      setTimeout(() => nextStep(), 200);
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [isActive, step, nextStep, currentStep]);

  // ── Step transition ───────────────────────────────────────────────────────

  const handleNext = () => { setTransitioning(true); setTimeout(() => nextStep(), 60); };
  const handlePrev = () => { setTransitioning(true); setTimeout(() => prevStep(), 60); };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!mounted && !exiting) return null;
  if (!step) return null;

  const spotlightRadius = step.spotlightRadius ?? 12;
  const show = mounted && !exiting && !transitioning;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    transition: `opacity ${ANIM_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    opacity: show ? 1 : 0,
    pointerEvents: show ? "auto" : "none",
  };

  const tooltipStyle: CSSProperties = {
    position: "absolute",
    top: tooltipPos.top,
    left: tooltipPos.left,
    width: Math.min(TOOLTIP_MAX_W, window.innerWidth - VIEWPORT_PAD * 2),
    minWidth: TOOLTIP_MIN_W,
    zIndex: 5,
    pointerEvents: "auto" as const,
    transition: `all ${ANIM_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    opacity: show ? 1 : 0,
    transform: show ? "translateY(0) scale(1)" : "translateY(10px) scale(0.97)",
  };

  const progress = totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100;

  const portal = createPortal(
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* CSS keyframes */}
      <style>{`
        @keyframes tour-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px ${accent}40, 0 0 60px ${accent}15; }
          50% { box-shadow: 0 0 30px ${accent}55, 0 0 80px ${accent}25; }
        }
      `}</style>

      {/* Clickable backdrop layer — catches all clicks outside the spotlight */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }} onClick={e => e.stopPropagation()} />

      {/* Spotlight window — a transparent "hole" with a massive box-shadow acting as the dimmed overlay */}
      {rect ? (
        <div style={{
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: spotlightRadius,
          boxShadow: "0 0 0 9999px rgba(3,3,8,0.82)",
          transition: `all ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
          zIndex: 1,
          pointerEvents: "none",
        }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "rgba(3,3,8,0.82)", zIndex: 1 }} />
      )}

      {/* Glow ring around spotlight */}
      {rect && (
        <div style={{
          position: "absolute",
          top: rect.top - 3,
          left: rect.left - 3,
          width: rect.width + 6,
          height: rect.height + 6,
          borderRadius: spotlightRadius + 3,
          border: `2px solid ${accent}55`,
          animation: "tour-glow-pulse 2.2s ease-in-out infinite",
          transition: `all ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
          pointerEvents: "none",
          zIndex: 2,
        }} />
      )}

      {/* Tooltip card */}
      <div style={tooltipStyle}>
        <div style={{
          background: "linear-gradient(165deg, rgba(18,18,32,0.98) 0%, rgba(10,10,20,0.98) 100%)",
          border: `1px solid ${accent}30`,
          borderRadius: 20,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${accent}12`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
        }}>

          {/* Progress bar at top */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
              borderRadius: 3,
              transition: `width ${ANIM_DURATION}ms ease`,
            }} />
          </div>

          {/* Content */}
          <div style={{ padding: "20px 22px 14px" }}>
            {/* Step badge + skip */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {step.icon && (
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{step.icon}</span>
                )}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: accent,
                  background: `${accent}15`,
                  border: `1px solid ${accent}30`,
                  borderRadius: 100,
                  padding: "3px 10px",
                }}>
                  STEP {currentStep + 1} OF {totalSteps}
                </span>
              </div>
              <button
                onClick={endTour}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "0.04em",
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.09)"; b.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.05)"; b.style.color = "rgba(255,255,255,0.35)"; }}
              >
                SKIP
              </button>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#f1f5f9",
              letterSpacing: "-0.025em",
              margin: "0 0 8px",
              lineHeight: 1.25,
            }}>
              {step.title}
            </h3>

            {/* Body text */}
            <p style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.55)",
              margin: "0 0 4px",
              fontWeight: 400,
            }}>
              {step.content}
            </p>

            {/* Interactive hint */}
            {step.advanceOnClick && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                padding: "5px 12px",
                background: `${accent}12`,
                border: `1px solid ${accent}25`,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                color: accent,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.04em",
              }}>
                👆 Tap the highlighted element to continue
              </div>
            )}
          </div>

          {/* Navigation footer */}
          <div style={{
            padding: "12px 22px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            {/* Dots */}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStep ? 18 : 6,
                    height: 6,
                    borderRadius: 100,
                    background: i === currentStep ? accent : i < currentStep ? `${accent}60` : "rgba(255,255,255,0.12)",
                    transition: `all ${ANIM_DURATION}ms ease`,
                    cursor: "pointer",
                  }}
                  onClick={() => { if (i !== currentStep) { setTransitioning(true); setTimeout(() => { goToStep(i); setTransitioning(false); }, 60); } }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  Back
                </button>
              )}
              {!step.advanceOnClick && (
                <button
                  onClick={handleNext}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: `0 4px 16px ${accent}40`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${accent}55`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 16px ${accent}40`; }}
                >
                  {isLastStep ? "Got it! ✨" : "Next →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return portal;
}

export function GuidedTourWithRef() {
  return <GuidedTour />;
}
