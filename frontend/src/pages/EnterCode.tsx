import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Hash, ArrowRight, AlertCircle } from "lucide-react";

/**
 * EnterCode – lets a user type in a 6-char share code and jump straight to
 * the shared paper view, without needing the full link.
 *
 * Route: /paper/enter-code
 */
export default function EnterCode() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a paper code.");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length !== 6) {
      setError("The paper code must be exactly 6 characters (e.g. AB12CD).");
      inputRef.current?.focus();
      return;
    }
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
      setError("Only letters (A–Z) and numbers (0–9) are allowed.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setLocation(`/paper/shared/${trimmed}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#07070F",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Card */}
        <div style={{
          background: "#0F1120",
          borderRadius: 20,
          border: "1px solid rgba(59,130,246,0.2)",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Top accent */}
          <div style={{ height: 3, background: "linear-gradient(90deg,#3B82F6,#7B5CE5,#EC4899)" }} />

          <div style={{ padding: "32px 28px" }}>
            {/* Icon + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg,#3B82F6,#2563EB)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
                flexShrink: 0,
              }}>
                <Hash style={{ width: 22, height: 22, color: "white" }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#F0F2FF",
                  fontFamily: "'Playfair Display',Georgia,serif",
                  margin: 0,
                }}>Enter Paper Code</h1>
                <p style={{
                  fontSize: 12,
                  color: "#525870",
                  fontFamily: "DM Sans,sans-serif",
                  margin: "4px 0 0",
                }}>Type the 6-character code shared with you</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={e => {
                    setError(null);
                    // Allow only alphanumeric, max 6 chars
                    const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
                    setCode(val);
                  }}
                  placeholder="e.g. AB12CD"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: "100%",
                    padding: "16px 18px",
                    background: "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 12,
                    color: "#F0F2FF",
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: "0.3em",
                    textAlign: "center",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
                  onBlur={e => { e.target.style.borderColor = error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"; }}
                />

                {/* Character count hint */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}>
                  <span style={{ fontSize: 11, color: "#525870", fontFamily: "DM Sans,sans-serif" }}>
                    Letters and numbers only
                  </span>
                  <span style={{ fontSize: 11, color: code.length === 6 ? "#10B981" : "#525870", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                    {code.length}/6
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10,
                  marginBottom: 16,
                }}>
                  <AlertCircle style={{ width: 15, height: 15, color: "#EF4444", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#FCA5A5", fontFamily: "DM Sans,sans-serif" }}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={code.length !== 6}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "14px",
                  background: code.length === 6
                    ? "linear-gradient(135deg,#3B82F6,#2563EB)"
                    : "rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  border: "none",
                  color: code.length === 6 ? "white" : "#525870",
                  fontFamily: "DM Sans,sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: code.length === 6 ? "pointer" : "not-allowed",
                  boxShadow: code.length === 6 ? "0 4px 16px rgba(59,130,246,0.35)" : "none",
                  transition: "all 0.2s",
                }}
              >
                Open Paper
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </form>

            {/* Hint */}
            <p style={{
              marginTop: 16,
              fontSize: 11,
              color: "#525870",
              fontFamily: "DM Sans,sans-serif",
              textAlign: "center",
              lineHeight: 1.5,
            }}>
              Get this code from the person who shared the paper with you, or use the direct link.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => setLocation("/")}
            style={{
              background: "none",
              border: "none",
              color: "#525870",
              fontFamily: "DM Sans,sans-serif",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationColor: "rgba(82,88,112,0.4)",
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
