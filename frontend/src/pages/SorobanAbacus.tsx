import Soroban from "../tools/soroban/Soroban";

/**
 * Override Soroban's internal CSS variables to match the project's design
 * language, and wrap it with a branded hero section.  We inject overrides at
 * the :root level so the scoped CSS inside Soroban.tsx picks them up without
 * any changes to that component.
 */
const SOROBAN_OVERRIDES = `
  :root {
    --font-ui:   'DM Sans', 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  }
  /* Tighten the soroban page background to match the rest of the site */
  .app { background: #07070F !important; }
  body { background: #07070F !important; }
`;

export default function SorobanAbacus() {
  return (
    <>
      <style>{SOROBAN_OVERRIDES}</style>

      {/* ── Hero Section ── */}
      <div
        style={{
          background: "linear-gradient(180deg, #0C0918 0%, #07070F 100%)",
          borderBottom: "1px solid rgba(123,92,229,0.25)",
          padding: "clamp(28px,5vw,52px) clamp(16px,4vw,32px) clamp(24px,4vw,44px)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600, height: 300,
            background: "radial-gradient(ellipse, rgba(123,92,229,0.14) 0%, transparent 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Icon badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 70,
              height: 70,
              borderRadius: 22,
              background: "rgba(123,92,229,0.14)",
              border: "1px solid rgba(123,92,229,0.3)",
              marginBottom: 18,
              boxShadow: "0 8px 32px rgba(123,92,229,0.16)",
            }}
          >
            <span style={{ fontSize: 34 }}>🧮</span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(26px,5vw,42px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #C4B5FD 0%, #9D7FF0 50%, #7B5CE5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 12px",
            }}
          >
            Abacus Soroban
          </h1>

          {/* Badge */}
          <div
            style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: 20,
              background: "rgba(123,92,229,0.12)",
              border: "1px solid rgba(123,92,229,0.3)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
              color: "#9D7FF0",
              marginBottom: 18,
            }}
          >
            🎋 Japanese Soroban · Learn &amp; Practice
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: "clamp(14px,2vw,16px)",
              color: "#B8BDD8",
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Master the ancient Japanese abacus through interactive lessons.{" "}
            <strong style={{ color: "#F0F2FF" }}>Learn Friends</strong> — the clever bead-swap tricks
            that make mental math lightning fast. Works on any device!
          </p>
        </div>
      </div>

      {/* ── Soroban Component ── */}
      <Soroban />
    </>
  );
}
