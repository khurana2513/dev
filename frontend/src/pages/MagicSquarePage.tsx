import { useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import { MagicSquareGame } from "../tools/gridmaster/games/MagicSquareGame";
import { ToastContainer } from "../tools/gridmaster/components/ToastContainer";
import { useToast } from "../tools/gridmaster/hooks/useToast";

const CSS_VARS = `
  .magic-page {
    --bg: #07070F;
    --surface: #120D07;
    --surface2: #1A1106;
    --surface3: #201608;
    --gm-border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.12);
    --text: #F0F2FF;
    --text2: #B8BDD8;
    --text3: #525870;
    --teal: #F97316;
    --gold: #F97316;
    --purple: #FB923C;
    --success: #10B981;
    --coral: #EF4444;
    --r: 16px;
    --r-sm: 10px;
  }
  @keyframes ms-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(25px,-18px) scale(1.07)} }
  @keyframes ms-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,20px) scale(1.05)} }
  @keyframes ms-panel-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ms-fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .ms-info-btn:hover { background: rgba(249,115,22,0.18) !important; border-color: rgba(249,115,22,0.5) !important; }
  .ms-back-btn:hover { color: rgba(255,255,255,0.75) !important; background: rgba(255,255,255,0.06) !important; }
  .ms-info-panel { animation: ms-panel-in 0.28s cubic-bezier(0.22,1,0.36,1) both; }
  .ms-game-wrap { animation: ms-fade-in 0.4s ease 0.1s both; }
  .ms-panel-close:hover { background: rgba(255,255,255,0.1) !important; }
`;

export default function MagicSquarePage() {
  const { toasts, add: addToast } = useToast();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <style>{CSS_VARS}</style>

      <div
        className="magic-page"
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
        <div aria-hidden style={{ position:"fixed",top:"-10%",right:"-5%",width:"50vw",height:"50vw",maxWidth:480,maxHeight:480,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,0.07) 0%,transparent 65%)",pointerEvents:"none",animation:"ms-orb1 9s ease-in-out infinite",zIndex:0 }} />
        <div aria-hidden style={{ position:"fixed",bottom:"-8%",left:"-4%",width:"44vw",height:"44vw",maxWidth:420,maxHeight:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(251,146,60,0.06) 0%,transparent 65%)",pointerEvents:"none",animation:"ms-orb2 12s ease-in-out infinite",zIndex:0 }} />

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
                className="ms-back-btn"
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
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#FED7AA" }}>
                Magic Square
              </span>
              <span style={{
                padding: "2px 10px",
                borderRadius: 20,
                background: "rgba(249,115,22,0.12)",
                border: "1px solid rgba(249,115,22,0.28)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "#FB923C",
              }}>
                Number Logic
              </span>
            </div>

            {/* Info button */}
            <button
              className="ms-info-btn"
              onClick={() => setInfoOpen(o => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 10,
                border: "1px solid rgba(249,115,22,0.28)",
                background: "rgba(249,115,22,0.08)",
                color: "#FB923C",
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
              className="ms-info-panel"
              style={{
                position: "fixed",
                top: 58,
                right: 0,
                bottom: 0,
                width: "min(420px, 100vw)",
                background: "linear-gradient(180deg, #140D04 0%, #0A0804 100%)",
                borderLeft: "1px solid rgba(249,115,22,0.22)",
                zIndex: 40,
                overflowY: "auto",
                padding: "28px 28px 48px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FED7AA", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
                    Magic Square
                  </h2>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#FB923C" }}>
                    Number Logic
                  </span>
                </div>
                <button
                  className="ms-panel-close"
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
                Fill the grid so that <strong style={{ color: "#F0F2FF" }}>every row, column, and both diagonals</strong> sum to the same magic constant. Live indicators update as you type — green means correct, red means keep trying.
              </p>

              {[
                { emoji: "🔲", title: "Fill the grid", desc: "Type numbers into every empty cell. Every row, every column, and both diagonals must sum to the magic sum." },
                { emoji: "🔢", title: "1 to N²", desc: "Each number from 1 to n² must appear exactly once. Duplicates highlight in orange to warn you." },
                { emoji: "📊", title: "Live sums", desc: "Running totals update in real time — green means the line is correct, red means adjust your numbers." },
                { emoji: "🧩", title: "Minimum clues", desc: "The puzzle starts with the fewest clues needed for a valid, unique solution. Use them wisely." },
                { emoji: "💡", title: "3 hints total", desc: "Stuck? Each hint auto-fills one incorrect cell. Use up to 3 hints per game." },
                { emoji: "⚡", title: "Double-digits & negatives", desc: "Multi-digit numbers and negative numbers are fully supported — type freely." },
              ].map(({ emoji, title, desc }) => (
                <div key={title} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(249,115,22,0.15)",
                    border: "1px solid rgba(249,115,22,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, flexShrink: 0,
                  }}>{emoji}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#FED7AA", margin: "0 0 3px" }}>{title}</p>
                    <p style={{ fontSize: 13, color: "#7E86A6", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: 8,
                padding: "16px 18px",
                borderRadius: 14,
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.22)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#FB923C", margin: "0 0 6px", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                  🔢 Magic Sum Formula
                </p>
                <p style={{ fontSize: 13, color: "#B8BDD8", margin: 0, lineHeight: 1.6 }}>
                  For an n×n grid: <strong style={{ color: "#FED7AA", fontFamily: "'JetBrains Mono', monospace" }}>n(n²+1)/2</strong>
                  <br />3×3 → 15 · 4×4 → 34 · 5×5 → 65
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Game Area ── */}
        <div
          className="ms-game-wrap"
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
              background: "rgba(18,13,7,0.7)",
              border: "1px solid rgba(249,115,22,0.18)",
              borderRadius: 20,
              padding: "clamp(16px,3vw,28px) clamp(14px,2.5vw,24px)",
              boxShadow: "0 4px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
              backdropFilter: "blur(8px)",
            }}
          >
            <MagicSquareGame onToast={addToast} />
          </div>
        </div>

        {/* ── Toast Notifications ── */}
        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}
