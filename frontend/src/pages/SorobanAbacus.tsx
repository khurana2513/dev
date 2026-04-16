import { useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import Soroban from "../tools/soroban/Soroban";

/**
 * Override Soroban's internal CSS variables to match the project's design
 * language. We inject overrides at the :root level so the scoped CSS inside
 * Soroban.tsx picks them up without any changes to that component.
 */
const SOROBAN_OVERRIDES = `
  :root {
    --font-ui:   'DM Sans', 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  }
  .app { background: #07070F !important; }
  body { background: #07070F !important; }
`;

const PAGE_STYLES = `
  @keyframes sb-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(22px,-16px) scale(1.06)} }
  @keyframes sb-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-16px,20px) scale(1.04)} }
  @keyframes sb-panel-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes sb-fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .sb-info-btn:hover { background: rgba(123,92,229,0.18) !important; border-color: rgba(123,92,229,0.5) !important; }
  .sb-back-btn:hover { color: rgba(255,255,255,0.75) !important; background: rgba(255,255,255,0.06) !important; }
  .sb-info-panel { animation: sb-panel-in 0.28s cubic-bezier(0.22,1,0.36,1) both; }
  .sb-game-wrap { animation: sb-fade-in 0.4s ease 0.1s both; }
  .sb-panel-close:hover { background: rgba(255,255,255,0.1) !important; }
`;

export default function SorobanAbacus() {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <style>{SOROBAN_OVERRIDES}</style>
      <style>{PAGE_STYLES}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#07070F",
          fontFamily: "'DM Sans', sans-serif",
          color: "#F0F2FF",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Ambient orbs ── */}
        <div aria-hidden style={{ position:"fixed",top:"-12%",left:"-6%",width:"52vw",height:"52vw",maxWidth:500,maxHeight:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(123,92,229,0.07) 0%,transparent 65%)",pointerEvents:"none",animation:"sb-orb1 10s ease-in-out infinite",zIndex:0 }} />
        <div aria-hidden style={{ position:"fixed",bottom:"-8%",right:"-4%",width:"44vw",height:"44vw",maxWidth:420,maxHeight:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(157,127,240,0.05) 0%,transparent 65%)",pointerEvents:"none",animation:"sb-orb2 13s ease-in-out infinite",zIndex:0 }} />

        {/* ── Sticky Nav ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(7,7,15,0.88)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            style={{
              maxWidth: 1040,
              margin: "0 auto",
              padding: "0 clamp(14px,3vw,28px)",
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* Back */}
            <Link href="/">
              <button
                className="sb-back-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "color .2s, background .2s",
                  flexShrink: 0,
                }}
              >
                ← Home
              </button>
            </Link>

            {/* Title */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#C4B5FD" }}>
                Abacus Soroban
              </span>
              <span style={{
                padding: "2px 10px",
                borderRadius: 20,
                background: "rgba(123,92,229,0.12)",
                border: "1px solid rgba(123,92,229,0.28)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "#9D7FF0",
              }}>
                Japanese Method
              </span>
            </div>

            {/* Info button */}
            <button
              className="sb-info-btn"
              onClick={() => setInfoOpen(o => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 10,
                border: "1px solid rgba(123,92,229,0.28)",
                background: "rgba(123,92,229,0.08)",
                color: "#9D7FF0",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background .2s, border-color .2s",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15 }}>ℹ</span>
              How to Use
            </button>
          </div>
        </div>

        {/* ── Slide-in Info Panel ── */}
        {infoOpen && (
          <>
            <div
              onClick={() => setInfoOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 30, backdropFilter: "blur(2px)" }}
            />
            <div
              className="sb-info-panel"
              style={{
                position: "fixed",
                top: 58,
                right: 0,
                bottom: 0,
                width: "min(420px, 100vw)",
                background: "linear-gradient(180deg, #0E0B1A 0%, #09091A 100%)",
                borderLeft: "1px solid rgba(123,92,229,0.25)",
                zIndex: 40,
                overflowY: "auto",
                padding: "28px 28px 48px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#C4B5FD", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
                    Abacus Soroban
                  </h2>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9D7FF0" }}>
                    Japanese Method
                  </span>
                </div>
                <button
                  className="sb-panel-close"
                  onClick={() => setInfoOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#B8BDD8", cursor: "pointer",
                    transition: "background .2s",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 14, color: "#B8BDD8", lineHeight: 1.75, marginBottom: 24 }}>
                The soroban (算盤) is the Japanese abacus. Each rod has one <strong style={{ color: "#F0F2FF" }}>heaven bead</strong> (worth 5) and four <strong style={{ color: "#F0F2FF" }}>earth beads</strong> (worth 1 each). Beads pushed toward the centre bar are active.
              </p>

              {[
                { emoji: "⬆️", title: "Heaven Bead", desc: "Slide DOWN toward the bar to count 5. One per rod." },
                { emoji: "⬇️", title: "Earth Beads", desc: "Slide UP toward the bar. Each bead counts as 1. Four per rod." },
                { emoji: "🔴", title: "Red Dot", desc: "Marks the ones column — your anchor for place value." },
                { emoji: "🔵", title: "Blue Dots", desc: "Mark every ×1000 boundary, making large numbers easier to read." },
              ].map(({ emoji, title, desc }) => (
                <div key={title} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(123,92,229,0.15)",
                    border: "1px solid rgba(123,92,229,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, flexShrink: 0,
                  }}>{emoji}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#E2DAFF", margin: "0 0 3px" }}>{title}</p>
                    <p style={{ fontSize: 13, color: "#7E86A6", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: 8,
                padding: "16px 18px",
                borderRadius: 14,
                background: "rgba(123,92,229,0.08)",
                border: "1px solid rgba(123,92,229,0.22)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9D7FF0", margin: "0 0 10px", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                  Friends Technique
                </p>
                {[
                  { icon: "🔵", label: "Big Friends", desc: "Pairs that sum to 10. Can't add? Remove the partner from ones and gain a TEN." },
                  { icon: "🟡", label: "Small Friends", desc: "Pairs that sum to 5. Can't add? Remove the partner and gain a FIVE." },
                  { icon: "🟠", label: "Mix Friends", desc: "Big + Small combined — the most powerful technique for speed calculation." },
                ].map(({ icon, label, desc }) => (
                  <div key={label} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#E2DAFF", margin: "0 0 2px" }}>{label}</p>
                      <p style={{ fontSize: 12, color: "#7E86A6", lineHeight: 1.5, margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Soroban Component ── */}
        <div
          className="sb-game-wrap"
          style={{ position: "relative", zIndex: 1 }}
        >
          <Soroban />
        </div>
      </div>
    </>
  );
}

