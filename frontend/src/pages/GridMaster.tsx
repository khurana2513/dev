import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { GridGame } from "../tools/gridmaster/games/GridGame";
import { MagicSquareGame } from "../tools/gridmaster/games/MagicSquareGame";
import { ToastContainer } from "../tools/gridmaster/components/ToastContainer";
import { useToast } from "../tools/gridmaster/hooks/useToast";

/* ── CSS variables injected into .gridmaster-page scope ─────────────────────
   --teal remapped to project purple (#7B5CE5) so GridGame.module.css and
   MagicSquareGame.module.css automatically use the project palette.
   --gold remapped to project orange (#F97316) accent.
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
`;

type Tab = "grid" | "magic";

export default function GridMaster() {
  const [location] = useLocation();
  const activeTab: Tab = location === "/tools/gridmaster/magic" ? "magic" : "grid";
  const { toasts, add: addToast } = useToast();

  const isGrid = activeTab === "grid";
  const accentColor  = isGrid ? "#9D7FF0" : "#F97316";
  const accentGlow   = isGrid ? "rgba(123,92,229,0.16)" : "rgba(249,115,22,0.14)";
  const accentBorder = isGrid ? "rgba(123,92,229,0.28)" : "rgba(249,115,22,0.28)";
  const heroGradient = isGrid
    ? "linear-gradient(180deg, #0C0918 0%, #07070F 100%)"
    : "linear-gradient(180deg, #100C07 0%, #07070F 100%)";

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
        }}
      >
        {/* ── Sticky Nav ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(7,7,15,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              padding: "0 clamp(12px,3vw,24px)",
              height: 60,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Link href="/">
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#B8BDD8",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#F0F2FF";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#B8BDD8";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            </Link>

            {/* ── Tab pills ── */}
            <div style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center" }}>
              {([
                { tab: "grid",  href: "/tools/gridmaster",       emoji: "🔢", label: "Vedic Grid" },
                { tab: "magic", href: "/tools/gridmaster/magic", emoji: "✨", label: "Magic Square" },
              ] as const).map(({ tab, href, emoji, label }) => {
                const active    = activeTab === tab;
                const tabAccent = tab === "grid" ? "#9D7FF0" : "#F97316";
                const tabBorder = tab === "grid" ? "rgba(123,92,229,0.4)" : "rgba(249,115,22,0.4)";
                const tabBg     = tab === "grid" ? "rgba(123,92,229,0.1)" : "rgba(249,115,22,0.1)";
                return (
                  <Link key={tab} href={href}>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "7px 18px",
                        borderRadius: 10,
                        border: active ? `1px solid ${tabBorder}` : "1px solid rgba(255,255,255,0.07)",
                        background: active ? tabBg : "transparent",
                        color: active ? tabAccent : "#525870",
                        fontSize: 14,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{emoji}</span>
                      {label}
                    </button>
                  </Link>
                );
              })}
            </div>

            <div style={{ width: 80, flexShrink: 0 }} />
          </div>
        </div>

        {/* ── Hero Section ── */}
        <div
          style={{
            background: heroGradient,
            borderBottom: `1px solid ${accentBorder}`,
            padding: "clamp(28px,5vw,52px) clamp(16px,4vw,32px) clamp(24px,4vw,44px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600, height: 300,
            background: `radial-gradient(ellipse, ${accentGlow} 0%, transparent 70%)`,
            filter: "blur(50px)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Icon badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 70,
              height: 70,
              borderRadius: 22,
              background: accentGlow,
              border: `1px solid ${accentBorder}`,
              marginBottom: 18,
              boxShadow: `0 8px 32px ${accentGlow}`,
            }}>
              <span style={{ fontSize: 34 }}>{isGrid ? "🔢" : "✨"}</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(26px,5vw,42px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              background: isGrid
                ? "linear-gradient(135deg, #C4B5FD 0%, #9D7FF0 50%, #7B5CE5 100%)"
                : "linear-gradient(135deg, #FED7AA 0%, #FB923C 50%, #F97316 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 12px",
            }}>
              {isGrid ? "Vedic Grid Builder" : "Magic Square Puzzle"}
            </h1>

            {/* Badge */}
            <div style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: 20,
              background: accentGlow,
              border: `1px solid ${accentBorder}`,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
              color: accentColor,
              marginBottom: 18,
            }}>
              {isGrid ? "🧮 Siamese Method" : "🎯 Number Logic Game"}
            </div>

            {/* Description */}
            <p style={{
              fontSize: "clamp(14px,2vw,16px)",
              color: "#B8BDD8",
              maxWidth: 580,
              margin: "0 auto",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {isGrid ? (
                <>
                  Build an odd-order magic square step-by-step using the{" "}
                  <strong style={{ color: "#F0F2FF" }}>ancient Siamese method</strong>.
                  {" "}Click cells to place numbers in sequence — the algorithm guides you to the correct position automatically!
                </>
              ) : (
                <>
                  Fill in the missing numbers to complete the magic square.{" "}
                  <strong style={{ color: "#F0F2FF" }}>Every row, column and diagonal</strong>{" "}
                  must add up to the same magic constant. Live sum indicators track your progress!
                </>
              )}
            </p>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(24px,4vw,36px) clamp(12px,3vw,24px) 80px" }}>

          {/* ── Game Container ── */}
          <div
            style={{
              background: "#0F1120",
              border: `1px solid ${accentBorder}`,
              borderRadius: 20,
              padding: "clamp(16px,3vw,28px) clamp(14px,2.5vw,24px)",
              boxShadow: `0 4px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)`,
            }}
          >
            {activeTab === "grid" ? (
              <GridGame onToast={addToast} />
            ) : (
              <MagicSquareGame onToast={addToast} />
            )}
          </div>
        </div>

        {/* ── Toast Notifications ── */}
        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}
