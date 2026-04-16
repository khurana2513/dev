import { useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import { GridGame } from "../tools/gridmaster/games/GridGame";
import { ToastContainer } from "../tools/gridmaster/components/ToastContainer";
import { useToast } from "../tools/gridmaster/hooks/useToast";

/* ── CSS variables injected into .gridmaster-page scope ─────────────────────
   --teal remapped to project purple (#7B5CE5) so GridGame.module.css
   automatically uses the project palette.
──────────────────────────────────────────────────────────────────────────── */
const CSS_VARS = `
  .gridmaster-page {
    --bg: #07070F;
    --surface: #0F1120;
    --surface2: #141729;
    --surface3: #1A1F38;
    --gm-border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.12);
    --text: #F0F2FF;
    --text2: #B8BDD8;
    --text3: #525870;
    --teal: #7B5CE5;
    --gold: #F97316;
    --purple: #9D7FF0;
    --success: #10B981;
    --coral: #EF4444;
    --r: 16px;
    --r-sm: 10px;
  }
  @keyframes gm-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(28px,-18px) scale(1.07)} }
  @keyframes gm-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-18px,22px) scale(1.05)} }
  @keyframes gm-panel-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes gm-fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .gm-info-btn:hover { background: rgba(123,92,229,0.18) !important; border-color: rgba(123,92,229,0.5) !important; }
  .gm-back-btn:hover { color: rgba(255,255,255,0.75) !important; background: rgba(255,255,255,0.06) !important; }
  .gm-info-panel { animation: gm-panel-in 0.28s cubic-bezier(0.22,1,0.36,1) both; }
  .gm-game-wrap { animation: gm-fade-in 0.4s ease 0.1s both; }
  .gm-panel-close:hover { background: rgba(255,255,255,0.1) !important; }
`;

export default function GridMaster() {
  const { toasts, add: addToast } = useToast();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <style>{CSS_VARS}</style>

      <div
        className="gridmaster-page"
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
        <div aria-hidden style={{ position:"fixed",top:"-12%",left:"-6%",width:"52vw",height:"52vw",maxWidth:500,maxHeight:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(123,92,229,0.07) 0%,transparent 65%)",pointerEvents:"none",animation:"gm-orb1 10s ease-in-out infinite",zIndex:0 }} />
        <div aria-hidden style={{ position:"fixed",bottom:"-10%",right:"-4%",width:"46vw",height:"46vw",maxWidth:440,maxHeight:440,borderRadius:"50%",background:"radial-gradient(circle,rgba(157,127,240,0.06) 0%,transparent 65%)",pointerEvents:"none",animation:"gm-orb2 13s ease-in-out infinite",zIndex:0 }} />

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
                className="gm-back-btn"
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
                Vedic Grid
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
                Siamese Method
              </span>
            </div>

            {/* Info button */}
            <button
              className="gm-info-btn"
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
              How to Play
            </button>
          </div>
        </div>

        {/* ── Slide-in Info Panel ── */}
        {infoOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setInfoOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 30, backdropFilter: "blur(2px)" }}
            />
            {/* Panel */}
            <div
              className="gm-info-panel"
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
                    Vedic Grid
                  </h2>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9D7FF0" }}>
                    Siamese Method
                  </span>
                </div>
                <button
                  className="gm-panel-close"
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
                Master the <strong style={{ color: "#F0F2FF" }}>ancient Siamese method</strong> to build a perfect magic square — click each cell in the correct sequence and every row, column, and diagonal will sum to the same magic constant.
              </p>

              {[
                { emoji: "1️⃣", title: "Start is set for you", desc: "Number 1 is pre-placed in the middle cell of the top row. The Siamese method always begins there." },
                { emoji: "↗️", title: "Move Up & Right", desc: "Each next number goes one step UP and one step RIGHT. Both axes wrap around the edges." },
                { emoji: "⬇️", title: "Blocked? Go Below", desc: "If the target cell is already filled, place the number directly BELOW the last placed number instead." },
                { emoji: "🔲", title: "Click to place", desc: "Tap the correct cell to drop the next number — no typing needed. Wrong cell? A red flash lets you know." },
                { emoji: "💡", title: "Use hints wisely", desc: "3 hints per game. Each hint highlights the correct next cell in purple for 8 seconds." },
                { emoji: "✨", title: "Magic property", desc: "When complete, every row, every column, and both diagonals sum to the exact same magic constant." },
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
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9D7FF0", margin: "0 0 8px", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                  📌 Wrap Example (5×5)
                </p>
                <p style={{ fontSize: 13, color: "#B8BDD8", margin: 0, lineHeight: 1.7 }}>
                  Number 15 is at top-right (row 1, col 5). Moving up+right wraps to bottom-left (row 5, col 1). Since 11 is already there, 16 goes <strong style={{ color: "#E2DAFF" }}>directly below 15</strong> at row 2, col 5.
                </p>
              </div>

              <div style={{
                marginTop: 16,
                padding: "16px 18px",
                borderRadius: 14,
                background: "rgba(249,115,22,0.07)",
                border: "1px solid rgba(249,115,22,0.22)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#F97316", margin: "0 0 6px", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                  Magic Constant Formula
                </p>
                <p style={{ fontSize: 13, color: "#B8BDD8", margin: 0, lineHeight: 1.6 }}>
                  For an n×n grid: <strong style={{ color: "#E2DAFF", fontFamily: "'JetBrains Mono', monospace" }}>n(n²+1)/2</strong>
                  <br />3×3 → 15 · 5×5 → 65 · 7×7 → 175
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Game Area ── */}
        <div
          className="gm-game-wrap"
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1040,
            margin: "0 auto",
            padding: "clamp(20px,3.5vw,32px) clamp(14px,3vw,28px) 80px",
          }}
        >
          <div
            style={{
              background: "rgba(15,17,32,0.7)",
              border: "1px solid rgba(123,92,229,0.18)",
              borderRadius: 20,
              padding: "clamp(16px,3vw,28px) clamp(14px,2.5vw,24px)",
              boxShadow: "0 4px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
              backdropFilter: "blur(8px)",
            }}
          >
            <GridGame onToast={addToast} />
          </div>
        </div>

        {/* ── Toast Notifications ── */}
        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}
