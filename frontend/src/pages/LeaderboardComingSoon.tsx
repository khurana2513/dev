import { useLocation } from "wouter";
import { Trophy, ArrowLeft, Clock, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaderboardComingSoon() {
  const [, setLocation] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07080F",
        color: "#f0f0f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans','Outfit',system-ui,sans-serif",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glows */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "20%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 560, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Icon */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 26,
              background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))",
              border: "1px solid rgba(245,158,11,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: "0 0 48px rgba(245,158,11,0.12)",
            }}
          >
            <Trophy size={40} color="#F59E0B" strokeWidth={1.5} />
          </div>

          {/* Coming soon badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 100,
              padding: "5px 14px",
              marginBottom: 22,
            }}
          >
            <Clock size={12} color="#F59E0B" />
            <span
              style={{
                fontFamily: "'DM Mono','JetBrains Mono',monospace",
                fontSize: 11,
                color: "#F59E0B",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Coming Soon
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: "clamp(34px, 5vw, 54px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 18,
              color: "#f0f0f8",
            }}
          >
            Leaderboard is{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              in the works
            </span>
          </h1>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.72,
              color: "rgba(240,240,248,0.60)",
              maxWidth: 420,
              margin: "0 auto 36px",
            }}
          >
            Institute-wide rankings, weekly challenges, and real-time scores — all launching soon.
            Keep practising to be ready for the top spot.
          </p>

          {/* Feature hints */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 40,
            }}
          >
            {[
              { icon: Trophy, label: "Weekly Rankings" },
              { icon: Zap, label: "Live Scores" },
              { icon: Star, label: "Achievement Badges" },
            ].map((feat) => (
              <div
                key={feat.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: 13,
                  color: "rgba(240,240,248,0.55)",
                }}
              >
                <feat.icon size={13} strokeWidth={1.6} />
                {feat.label}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 11, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setLocation("/")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "none",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "12px 22px",
                fontSize: 14,
                fontWeight: 500,
                color: "rgba(240,240,248,0.7)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
                (e.currentTarget as HTMLButtonElement).style.color = "#f0f0f8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,240,248,0.7)";
              }}
            >
              <ArrowLeft size={14} />
              Back to Home
            </button>
            <button
              onClick={() => setLocation("/burst")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "linear-gradient(135deg, #7C3AED, #5b21b6)",
                border: "none",
                borderRadius: 12,
                padding: "12px 22px",
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 8px 32px rgba(124,58,237,0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px rgba(124,58,237,0.45)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.3)";
              }}
            >
              <Zap size={14} /> Try Burst Mode
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
