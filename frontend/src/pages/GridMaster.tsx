import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Grid3X3, LayoutGrid } from "lucide-react";
import { GridGame } from "../tools/gridmaster/games/GridGame";
import { MagicSquareGame } from "../tools/gridmaster/games/MagicSquareGame";
import { ToastContainer } from "../tools/gridmaster/components/ToastContainer";
import { useToast } from "../tools/gridmaster/hooks/useToast";

const CSS_VARS = `
  :root {
    --bg: #0a0a0f;
    --surface: #14141c;
    --surface2: #1b1b25;
    --surface3: #23232f;
    --border: rgba(255,255,255,0.07);
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
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") === "magic" ? "magic" : "grid";
  });
  const { toasts, add: addToast } = useToast();

  return (
    <>
      <style>{CSS_VARS}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#06070F",
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
              padding: "0 24px",
              height: 64,
              display: "flex",
              alignItems: "center",
              gap: 16,
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
                  background: "linear-gradient(135deg, #9b8cff, #4ecdc4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.3px",
                }}
              >
                GridMaster
              </div>
              <div style={{ fontSize: 11, color: "#6d6b85", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 1 }}>
                Magic Square Games
              </div>
            </div>

            <div style={{ width: 80 }} /> {/* spacer to balance back btn */}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>

          {/* ── Tab Switcher ── */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 28,
              background: "#14141c",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 6,
              width: "fit-content",
            }}
          >
            <TabBtn
              active={activeTab === "grid"}
              onClick={() => setActiveTab("grid")}
              icon={<Grid3X3 size={15} />}
              label="Grid Builder"
              accent="#4ecdc4"
            />
            <TabBtn
              active={activeTab === "magic"}
              onClick={() => setActiveTab("magic")}
              icon={<LayoutGrid size={15} />}
              label="Magic Square"
              accent="#e8c97e"
            />
          </div>

          {/* ── Description ── */}
          <div
            style={{
              marginBottom: 24,
              padding: "14px 20px",
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
                <span style={{ color: "#4ecdc4", fontWeight: 600 }}>Grid Builder</span>
                {" — "}Build an odd-order magic square using the{" "}
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
              padding: "24px 20px",
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

/* ── Tab Button Component ── */
interface TabBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: string;
}

function TabBtn({ active, onClick, icon, label, accent }: TabBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 18px",
        borderRadius: 10,
        border: active ? `1px solid ${accent}40` : "1px solid transparent",
        background: active ? `${accent}18` : "transparent",
        color: active ? accent : "#6d6b85",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        fontFamily: "'DM Sans', sans-serif",
        cursor: "pointer",
        transition: "all 0.18s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = "#9896b0";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = "#6d6b85";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }
      }}
    >
      {icon}
      {label}
    </button>
  );
}
