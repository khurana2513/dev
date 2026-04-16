import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowRight, FileText, Swords, GraduationCap, Sparkles, ChevronLeft } from "lucide-react";

/**
 * UniversalCode — single entry point for all live/real-time activities.
 * Code format: 6 chars where first char is a prefix:
 *   P = Practice Paper  (→ /paper/shared/{code})
 *   D = Duel Mode       (→ /duel/{code})
 *   E = Exam            (→ /exam/{code})
 *
 * Route: /enter-code
 */

// ── Type configuration ────────────────────────────────────────────────────
const CODE_TYPES = {
  P: {
    label: "Practice Paper",
    sublabel: "Open a shared practice worksheet",
    Icon: FileText,
    color: "#3B82F6",
    colorDim: "rgba(59,130,246,0.18)",
    colorBorder: "rgba(59,130,246,0.45)",
    colorGlow: "rgba(59,130,246,0.35)",
    colorText: "#93C5FD",
    emoji: "📄",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(37,99,235,0.10) 100%)",
    gradientBtn: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    shadowBtn: "0 8px 32px rgba(59,130,246,0.45)",
  },
  D: {
    label: "Duel Mode",
    sublabel: "Join a live head-to-head math battle",
    Icon: Swords,
    color: "#7C3AED",
    colorDim: "rgba(124,58,237,0.18)",
    colorBorder: "rgba(139,92,246,0.45)",
    colorGlow: "rgba(124,58,237,0.35)",
    colorText: "#C4B5FD",
    emoji: "⚔️",
    gradient: "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(109,40,217,0.10) 100%)",
    gradientBtn: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
    shadowBtn: "0 8px 32px rgba(124,58,237,0.45)",
  },
  E: {
    label: "Exam",
    sublabel: "Enter a scheduled live examination",
    Icon: GraduationCap,
    color: "#F59E0B",
    colorDim: "rgba(245,158,11,0.18)",
    colorBorder: "rgba(245,158,11,0.45)",
    colorGlow: "rgba(245,158,11,0.35)",
    colorText: "#FCD34D",
    emoji: "📝",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.10) 100%)",
    gradientBtn: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    shadowBtn: "0 8px 32px rgba(245,158,11,0.45)",
  },
} as const;

type CodePrefix = keyof typeof CODE_TYPES;

function detectPrefix(val: string): CodePrefix | null {
  const c = val.replace(/-/g, "").toUpperCase().charAt(0);
  if (c === "P" || c === "D" || c === "E") return c as CodePrefix;
  return null;
}

function routeForCode(code: string): string | null {
  const prefix = code.charAt(0) as CodePrefix;
  if (prefix === "P") return `/paper/shared/${code}`;
  if (prefix === "D") return `/duel/${code}`;
  if (prefix === "E") return `/exam/${code}`;
  return null;
}

// ── Animated stars background ─────────────────────────────────────────────
function StarField() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {Array.from({ length: 70 }).map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 0.5;
        const delay = Math.random() * 8;
        const dur = Math.random() * 4 + 3;
        const opacity = Math.random() * 0.5 + 0.1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#ffffff",
              opacity,
              animation: `uc-twinkle ${dur}s ease-in-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function UniversalCode() {
  const [, setLocation] = useLocation();

  // 6 individual cell values
  const [cells, setCells] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null, null, null]);
  const containerRef = useRef<HTMLDivElement>(null);

  const code = cells.join("").toUpperCase();
  const detectedPrefix = code.length > 0 ? detectPrefix(code) : null;
  const typeInfo = detectedPrefix ? CODE_TYPES[detectedPrefix] : null;
  const isComplete = code.length === 6;

  // Inject animations
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "uc-styles";
    style.textContent = `
      @keyframes uc-twinkle { 0%,100%{opacity:var(--op,0.2)} 50%{opacity:calc(var(--op,0.2)*0.3)} }
      @keyframes uc-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
      @keyframes uc-pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
      @keyframes uc-slide-up { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes uc-slide-up-fast { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes uc-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
      @keyframes uc-success-pop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      @keyframes uc-glow-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      @keyframes uc-orb-rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes uc-scan { 0%{backgroundPosition:0% 0%} 100%{backgroundPosition:0% 100%} }
      .uc-cell:focus { outline: none; }
      .uc-cell-wrap:focus-within .uc-cell-inner { border-color: var(--cell-color, rgba(255,255,255,0.3)) !important; box-shadow: 0 0 0 3px var(--cell-glow, rgba(255,255,255,0.1)), 0 0 20px var(--cell-glow, rgba(255,255,255,0.08)) !important; }
      .uc-type-card { transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease; }
      .uc-type-card:hover { transform: translateY(-3px) scale(1.02); }
      .uc-submit-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .uc-submit-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); }
      .uc-submit-btn:active:not(:disabled) { transform: scale(0.97); }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("uc-styles")?.remove();
  }, []);

  // Auto-focus first cell on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  const focusCell = useCallback((idx: number) => {
    inputRefs.current[Math.max(0, Math.min(5, idx))]?.focus();
  }, []);

  const handleCellInput = useCallback((idx: number, raw: string) => {
    setError(null);
    // Strip non-alphanumeric and hyphens
    let cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!cleaned) return;

    // If user pastes a full code like DXXXXX or D-XXXXX
    const stripped = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (stripped.length > 1) {
      // Paste/fill all cells
      const newCells = Array.from({ length: 6 }, (_, i) => stripped[i] || "");
      setCells(newCells);
      // focus last filled or submit cell
      const focusIdx = Math.min(stripped.length, 5);
      setTimeout(() => focusCell(focusIdx), 20);
      return;
    }

    // Single char typed
    const ch = cleaned.charAt(0);
    setCells(prev => {
      const next = [...prev];
      next[idx] = ch;
      return next;
    });
    // Auto-advance
    if (idx < 5) setTimeout(() => focusCell(idx + 1), 20);
  }, [focusCell]);

  const handleCellKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (cells[idx]) {
        // Clear current cell
        setCells(prev => { const n = [...prev]; n[idx] = ""; return n; });
      } else if (idx > 0) {
        // Move back and clear
        setCells(prev => { const n = [...prev]; n[idx - 1] = ""; return n; });
        setTimeout(() => focusCell(idx - 1), 20);
      }
      setError(null);
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusCell(idx - 1);
    } else if (e.key === "ArrowRight" && idx < 5) {
      e.preventDefault();
      focusCell(idx + 1);
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  }, [cells, focusCell]);

  const handleSubmit = useCallback(() => {
    const c = cells.join("").toUpperCase();
    if (c.length < 6) {
      setError("Please enter all 6 characters of the code.");
      // shake
      containerRef.current?.setAttribute("data-shake", "1");
      setTimeout(() => containerRef.current?.removeAttribute("data-shake"), 500);
      focusCell(c.length);
      return;
    }
    const prefix = c.charAt(0) as CodePrefix;
    if (!["P", "D", "E"].includes(prefix)) {
      setError(`Code must start with P (Paper), D (Duel), or E (Exam) — got "${prefix}".`);
      // shake and refocus first cell  
      containerRef.current?.setAttribute("data-shake", "1");
      setTimeout(() => containerRef.current?.removeAttribute("data-shake"), 500);
      focusCell(0);
      return;
    }
    const route = routeForCode(c);
    if (!route) { setError("Invalid code."); return; }
    setSubmitting(true);
    setSuccess(true);
    setTimeout(() => setLocation(route), 500);
  }, [cells, setLocation, focusCell]);

  // Determine active cell color vars
  const cellColor = typeInfo?.colorBorder ?? "rgba(255,255,255,0.25)";
  const cellGlow = typeInfo?.colorGlow ?? "rgba(255,255,255,0.10)";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07070F",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* CSS var injection for cell focus color */}
      <style>{`
        .uc-cell-wrap { --cell-color: ${cellColor}; --cell-glow: ${cellGlow}; }
        [data-shake] .uc-cells-row { animation: uc-shake 0.4s ease; }
      `}</style>

      <StarField />

      {/* Ambient orb */}
      <div style={{
        position: "fixed",
        top: "20%", left: "50%",
        transform: "translate(-50%, 0)",
        width: 500, height: 500,
        borderRadius: "50%",
        background: typeInfo
          ? `radial-gradient(circle, ${typeInfo.colorDim} 0%, transparent 70%)`
          : "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
        transition: "background 0.6s ease",
      }} />

      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        style={{
          position: "fixed", top: 80, left: 20,
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.4)",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          zIndex: 10, transition: "color .2s, background .2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
      >
        <ChevronLeft size={15} />Back
      </button>

      {/* Main card */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxWidth: 520,
          position: "relative",
          zIndex: 10,
          animation: "uc-slide-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Header orb icon */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72, height: 72,
            borderRadius: "50%",
            background: typeInfo
              ? `linear-gradient(135deg, ${typeInfo.color}33, ${typeInfo.color}18)`
              : "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))",
            border: `2px solid ${typeInfo?.colorBorder ?? "rgba(139,92,246,0.35)"}`,
            boxShadow: `0 0 40px ${typeInfo?.colorGlow ?? "rgba(124,58,237,0.25)"}`,
            marginBottom: 16,
            transition: "all 0.5s ease",
            position: "relative",
            animation: "uc-float 4s ease-in-out infinite",
          }}>
            {/* Rotating ring */}
            <div style={{
              position: "absolute", inset: -6,
              borderRadius: "50%",
              border: "1px solid transparent",
              borderTopColor: typeInfo?.color ?? "#7C3AED",
              borderRightColor: typeInfo?.color ?? "#3B82F6",
              opacity: 0.4,
              animation: "uc-orb-rotate 3s linear infinite",
            }} />
            {typeInfo
              ? <typeInfo.Icon size={30} color={typeInfo.color} />
              : <Sparkles size={30} color="#a78bfa" />
            }
          </div>

          <h1 style={{
            fontSize: "clamp(24px, 5vw, 34px)",
            fontWeight: 900,
            color: "#F0F4FF",
            margin: "0 0 8px",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            {typeInfo ? typeInfo.label : "Enter Your Code"}
          </h1>
          <p style={{
            fontSize: 14,
            color: typeInfo ? typeInfo.colorText : "rgba(255,255,255,0.4)",
            margin: 0,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: "color 0.4s ease",
            animation: typeInfo ? "uc-slide-up-fast 0.3s ease both" : undefined,
          }}>
            {typeInfo ? typeInfo.sublabel : "Practice Paper · Duel Room · Exam"}
          </p>
        </div>

        {/* Glass card */}
        <div style={{
          background: typeInfo
            ? `linear-gradient(180deg, ${typeInfo.colorDim} 0%, rgba(255,255,255,0.02) 100%)`
            : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
          border: `1.5px solid ${typeInfo?.colorBorder ?? "rgba(255,255,255,0.10)"}`,
          borderRadius: 24,
          padding: "32px 28px",
          backdropFilter: "blur(24px)",
          boxShadow: typeInfo
            ? `0 24px 80px rgba(0,0,0,0.5), 0 0 60px ${typeInfo.colorGlow}`
            : "0 24px 80px rgba(0,0,0,0.5)",
          transition: "all 0.5s ease",
        }}>

          {/* Top accent bar */}
          <div style={{
            height: 2,
            borderRadius: 2,
            background: typeInfo
              ? `linear-gradient(90deg, ${typeInfo.color}, ${typeInfo.color}80)`
              : "linear-gradient(90deg, rgba(59,130,246,0.6), rgba(124,58,237,0.6), rgba(245,158,11,0.6))",
            marginBottom: 28,
            transition: "background 0.5s ease",
          }} />

          {/* OTP Cells */}
          <div className="uc-cells-row" style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
            {cells.map((ch, i) => (
              <div key={i} className="uc-cell-wrap" style={{ flex: 1, maxWidth: 72 }}>
                <div className="uc-cell-inner" style={{
                  position: "relative",
                  borderRadius: 14,
                  border: `2px solid ${ch
                    ? (typeInfo?.colorBorder ?? "rgba(255,255,255,0.25)")
                    : "rgba(255,255,255,0.10)"}`,
                  background: ch
                    ? (typeInfo?.colorDim ?? "rgba(255,255,255,0.06)")
                    : "rgba(255,255,255,0.03)",
                  transition: "all 0.25s ease",
                  boxShadow: ch && typeInfo
                    ? `0 0 16px ${typeInfo.colorGlow}`
                    : undefined,
                  overflow: "hidden",
                }}>
                  {/* Separator bar after first cell */}
                  {i === 1 && (
                    <div style={{
                      position: "absolute",
                      left: -7, top: "50%",
                      transform: "translateY(-50%)",
                      width: 4, height: 4,
                      borderRadius: "50%",
                      background: typeInfo?.colorBorder ?? "rgba(255,255,255,0.2)",
                      zIndex: 2,
                    }} />
                  )}
                  <input
                    ref={el => { inputRefs.current[i] = el; }}
                    className="uc-cell"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={6}
                    value={ch}
                    onChange={e => handleCellInput(i, e.target.value)}
                    onKeyDown={e => handleCellKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    onPaste={e => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                      const newCells = Array.from({ length: 6 }, (_, ci) => pasted[ci] || "");
                      setCells(newCells);
                      const focused = Math.min(pasted.length, 5);
                      setTimeout(() => focusCell(focused), 20);
                    }}
                    style={{
                      width: "100%",
                      padding: "16px 4px",
                      background: "transparent",
                      border: "none",
                      color: typeInfo
                        ? (i === 0 ? typeInfo.color : typeInfo.colorText)
                        : "#F0F4FF",
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontWeight: 800,
                      fontSize: "clamp(18px, 4vw, 26px)",
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      cursor: "text",
                      caretColor: typeInfo?.color ?? "#7C3AED",
                      textTransform: "uppercase",
                      outline: "none",
                      transition: "color 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Code display hint */}
          <p style={{
            textAlign: "center",
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
            letterSpacing: "0.15em",
            marginBottom: 8,
          }}>
            {detectedPrefix === "P" && "P·PAPER CODE"}
            {detectedPrefix === "D" && "D·DUEL CODE"}
            {detectedPrefix === "E" && "E·EXAM CODE"}
            {!detectedPrefix && "P·PAPER  /  D·DUEL  /  E·EXAM"}
          </p>

          {/* Error message */}
          {error && (
            <div style={{
              marginBottom: 16,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#FCA5A5",
              fontSize: 13,
              fontWeight: 500,
              animation: "uc-slide-up-fast 0.2s ease both",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit button */}
          <button
            className="uc-submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "16px 24px",
              borderRadius: 14,
              border: "none",
              background: success
                ? "linear-gradient(135deg, #10B981, #059669)"
                : typeInfo
                  ? typeInfo.gradientBtn
                  : "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
              boxShadow: typeInfo?.shadowBtn ?? "none",
              color: isComplete ? "#ffffff" : "rgba(255,255,255,0.35)",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 800,
              cursor: isComplete ? "pointer" : "default",
              letterSpacing: "0.01em",
              transition: "all 0.4s ease",
              opacity: submitting ? 0.7 : undefined,
              animation: success ? "uc-success-pop 0.4s ease both" : undefined,
            }}
          >
            {success
              ? <>✓ Launching…</>
              : <>
                  {typeInfo ? `Open ${typeInfo.label}` : "Enter Code"}
                  <ArrowRight size={18} style={{ transition: "transform 0.2s", transform: isComplete ? "translateX(0px)" : "translateX(-4px)", opacity: isComplete ? 1 : 0.4 }} />
                </>
            }
          </button>
        </div>

        {/* Code type legend cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginTop: 20,
          animation: "uc-slide-up 0.6s 0.15s cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {(Object.entries(CODE_TYPES) as [CodePrefix, typeof CODE_TYPES.P][]).map(([prefix, info]) => {
            const isActive = detectedPrefix === prefix;
            return (
              <div
                key={prefix}
                className="uc-type-card"
                onClick={() => {
                  // Set first cell to this prefix and focus second
                  setCells(prev => { const n = [...prev]; n[0] = prefix; return n; });
                  setTimeout(() => focusCell(1), 50);
                }}
                style={{
                  padding: "14px 12px",
                  borderRadius: 16,
                  background: isActive ? info.gradient : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${isActive ? info.colorBorder : "rgba(255,255,255,0.07)"}`,
                  cursor: "pointer",
                  transition: "all 0.35s ease",
                  boxShadow: isActive ? `0 0 24px ${info.colorGlow}` : "none",
                  textAlign: "center",
                }}
              >
                <div style={{
                  fontSize: 22,
                  marginBottom: 6,
                  lineHeight: 1,
                  filter: isActive ? `drop-shadow(0 0 8px ${info.color})` : "none",
                  transition: "filter 0.3s ease",
                }}>
                  {info.emoji}
                </div>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: isActive ? info.color : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                  marginBottom: 2,
                  transition: "color 0.3s ease",
                }}>
                  {prefix}-·····
                </div>
                <div style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: isActive ? info.colorText : "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  transition: "color 0.3s ease",
                  lineHeight: 1.3,
                }}>
                  {info.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Helper text */}
        <p style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 12,
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          lineHeight: 1.6,
        }}>
          Ask your teacher for the code, or paste a link you received. All codes are 6 characters.
        </p>
      </div>
    </div>
  );
}
