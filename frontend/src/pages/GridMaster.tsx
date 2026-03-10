import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { GridGame } from "../tools/gridmaster/games/GridGame";
import { MagicSquareGame } from "../tools/gridmaster/games/MagicSquareGame";
import { ToastContainer } from "../tools/gridmaster/components/ToastContainer";
import { useToast } from "../tools/gridmaster/hooks/useToast";

const CSS_VARS = `
  .gridmaster-page {
    --bg: #0a0a0f;
    --surface: #14141c;
    --surface2: #1b1b25;
    --surface3: #23232f;
    --gm-border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --text: #eef0f7;
    --text2: #9896b0;
    --text3: #6d6b85;
    --teal: #4ecdc4;
    --gold: #e8c97e;
    --purple: #9b8cff;
    --success: #56cf8e;
    --coral: #ff6b6b;
    --r: 14px;
    --r-sm: 10px;
  }
`;

type Tab = "grid" | "magic";

export default function GridMaster() {
  const [location] = useLocation();
  const activeTab: Tab = location === "/tools/gridmaster/magic" ? "magic" : "grid";
  const { toasts, add: addToast } = useToast();

  return (
    <>
      <style>{CSS_VARS}</style>

      <div
        className="gridmaster-page"
        style={{
          minHeight: "100vh",
          background: "#07070F",
          fontFamily: "'DM Sans', sans-serif",
          color: "#eef0f7",
        }}
      >
        {/* ── Page Header ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(10,10,15,0.85)",
            backdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              maxWidth: 960,
              margin: "0 auto",
              padding: "0 clamp(12px,3vw,24px)",
              height: "clamp(52px,8vw,64px)",
              display: "flex",
              alignItems: "center",
              gap: "clamp(10px,2vw,16px)",
            }}
          >
            <Link href="/">
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#9896b0",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#eef0f7";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#9896b0";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            </Link>

            <div style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  background: activeTab === "grid"
                    ? "linear-gradient(135deg, #4ecdc4, #35b5ac)"
                    : "linear-gradient(135deg, #e8c97e, #d4a855)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.3px",
                }}
              >
                {activeTab === "grid" ? "Vedic Grid Builder" : "Magic Square Puzzle"}
              </div>
              <div style={{ fontSize: 11, color: "#6d6b85", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 1 }}>
                {activeTab === "grid" ? "Siamese Method" : "Number Logic Game"}
              </div>
            </div>

            <div style={{ width: 80 }} /> {/* spacer to balance back btn */}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(12px,3vw,24px) 64px" }}>

          {/* ── Description ── */}
          <div
            style={{
              marginBottom: 24,
              padding: "clamp(10px,2vw,14px) clamp(14px,3vw,20px)",
              background: "#14141c",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              fontSize: 13,
              color: "#9896b0",
              lineHeight: 1.6,
            }}
          >
            {activeTab === "grid" ? (
              <>
                <span style={{ color: "#4ecdc4", fontWeight: 600 }}>Vedic Grid Builder</span>
                {" — "}Build an odd-order magic square step-by-step using the{" "}
                <strong style={{ color: "#eef0f7" }}>Siamese method</strong>. Click cells to place numbers
                in sequence — the algorithm guides you to the correct position automatically.
              </>
            ) : (
              <>
                <span style={{ color: "#e8c97e", fontWeight: 600 }}>Magic Square Puzzle</span>
                {" — "}Fill in the blanks to complete the magic square. Every row, column, and diagonal
                must sum to the{" "}
                <strong style={{ color: "#eef0f7" }}>magic constant</strong>. Live sum indicators track your progress.
              </>
            )}
          </div>

          {/* ── Game Container ── */}
          <div
            style={{
              background: "#0e0e16",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "clamp(14px,3vw,24px) clamp(12px,2.5vw,20px)",
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
