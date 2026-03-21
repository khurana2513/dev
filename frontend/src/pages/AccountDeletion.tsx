import { useEffect } from "react";
import { Link } from "wouter";

export default function AccountDeletion() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const S = {
    bg: "#07080F",
    surface: "#0F1120",
    border: "rgba(255,255,255,0.07)",
    white: "#F8FAFC",
    white2: "rgba(248,250,252,0.70)",
    muted: "rgba(248,250,252,0.40)",
    purple: "#7C3AED",
  };

  return (
    <div
      style={{
        background: S.bg,
        minHeight: "100vh",
        color: S.white,
        fontFamily: "'DM Sans','Outfit',system-ui,sans-serif",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "80px 24px 120px" }}>
        <Link href="/">
          <a
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: S.muted,
              textDecoration: "none",
              fontSize: 14,
              marginBottom: 48,
              transition: "color .2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = S.white2)}
            onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
          >
            ← Back to Home
          </a>
        </Link>

        <div style={{ marginBottom: 56 }}>
          <div
            style={{
              fontFamily: "'DM Mono','JetBrains Mono',monospace",
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: S.purple,
              marginBottom: 14,
            }}
          >
            Account And Data
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: "clamp(32px,5vw,56px)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Account Deletion Request
          </h1>
          <p style={{ color: S.muted, fontSize: 14 }}>Last updated: March 2026</p>
        </div>

        <div style={{ height: 1, background: S.border, marginBottom: 40 }} />

        <div style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: "clamp(18px,2.5vw,24px)",
              fontWeight: 700,
              marginBottom: 12,
              color: S.white,
            }}
          >
            How to request deletion
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: S.white2 }}>
            To request deletion of your account and associated data, send an email from your
            registered account email address to{" "}
            <a href="mailto:ayushkhurana47@gmail.com" style={{ color: S.purple, textDecoration: "none" }}>
              ayushkhurana47@gmail.com
            </a>{" "}
            with the subject line <strong>Account Deletion Request</strong>.
          </p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: "clamp(18px,2.5vw,24px)",
              fontWeight: 700,
              marginBottom: 12,
              color: S.white,
            }}
          >
            Details to include
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: S.white2, lineHeight: 1.9, fontSize: 15 }}>
            <li>Registered email address</li>
            <li>Student name and profile details (if available)</li>
            <li>Public ID (if assigned)</li>
          </ul>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: "clamp(18px,2.5vw,24px)",
              fontWeight: 700,
              marginBottom: 12,
              color: S.white,
            }}
          >
            What is deleted and retained
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: S.white2, marginBottom: 10 }}>
            We delete account profile data and associated learning data, including practice history,
            rewards progress, and leaderboard associations tied to your account.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: S.white2 }}>
            We may retain minimal records required for legal, security, and fraud-prevention
            purposes. Such retained records are removed within 90 days unless a longer retention
            period is required by law.
          </p>
        </div>

        <div style={{ marginTop: 56, padding: "24px", background: S.surface, borderRadius: 16, border: `1px solid ${S.border}` }}>
          <p style={{ fontSize: 13.5, color: S.muted, lineHeight: 1.7, margin: 0 }}>
            Requests are processed by the admin team. Typical completion timeline: 7-30 days.
          </p>
        </div>
      </div>
    </div>
  );
}
