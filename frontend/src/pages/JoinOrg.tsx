/**
 * JoinOrg — public page at /join?code=XXXXXXXX
 * Anyone can view org info; must be authenticated to join.
 */
import { useState, useEffect } from "react";
import { useSearch, useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2, AlertCircle, ArrowRight, Loader2, LogIn,
  MapPin, Lock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getInviteInfo, joinOrg, InviteInfoResponse } from "../lib/orgApi";

// ─── Tokens ────────────────────────────────────────────────────────────────────
const BG = "#07070F";
const CARD = "#0F1120";
const CARD2 = "#141829";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_MED = "rgba(255,255,255,0.13)";
const TEXT = "#F0F2FF";
const TEXT2 = "rgba(255,255,255,0.62)";
const TEXT3 = "rgba(255,255,255,0.35)";

type Stage =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "info"; data: InviteInfoResponse }
  | { kind: "invalid"; reason: string }
  | { kind: "success"; orgName: string };

export default function JoinOrg() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlCode = params.get("code") ?? "";

  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [code, setCode] = useState(urlCode);
  const [inputCode, setInputCode] = useState("");
  const [stage, setStage] = useState<Stage>(urlCode ? { kind: "loading" } : { kind: "empty" });

  // Fetch invite info whenever code changes
  useEffect(() => {
    if (!code) {
      setStage({ kind: "empty" });
      return;
    }
    setStage({ kind: "loading" });
    getInviteInfo(code)
      .then((data) => {
        if (!data.is_valid) {
          setStage({ kind: "invalid", reason: data.error ?? "This invite link is invalid or has expired." });
        } else {
          setStage({ kind: "info", data });
        }
      })
      .catch(() => setStage({ kind: "invalid", reason: "Unable to fetch invite information. Please try again." }));
  }, [code]);

  const { mutate: doJoin, isPending: joining, error: joinError } = useMutation<void, any, void>({
    mutationFn: () => joinOrg(code).then(() => undefined),
    onSuccess: () => {
      const name = stage.kind === "info" ? stage.data.org_name : "org";
      setStage({ kind: "success", orgName: name });
      setTimeout(() => setLocation("/org-dashboard"), 2200);
    },
    onError: (e: any) => {
      if (e?.status === 409 || String(e?.message).toLowerCase().includes("already")) {
        setStage({ kind: "invalid", reason: "You are already a member of this organization." });
      }
    },
  });

  const submitInputCode = () => {
    const trimmed = inputCode.trim();
    if (trimmed) { setCode(trimmed); setInputCode(""); }
  };

  /* ── Layout wrapper ─────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "DM Sans, system-ui" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes pop { 0% { transform:scale(0.7); opacity:0; } 60% { transform:scale(1.12); } 100% { transform:scale(1); opacity:1; } }
      `}</style>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 460,
        background: CARD, border: `1.5px solid ${BORDER_MED}`,
        borderRadius: 24, boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        animation: "fadeIn 0.35s ease",
        overflow: "hidden",
      }}>
        {/* Header strip */}
        <div style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.09) 100%)", borderBottom: `1px solid ${BORDER}`, padding: "22px 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#7C3AED,#4C1D95)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Building2 style={{ width: 22, height: 22, color: "white" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
                Join an Organization
              </h1>
              <p style={{ fontSize: 12, color: TEXT3, margin: 0, marginTop: 2 }}>
                Enter your invite code or use the link you received
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px 26px" }}>

          {/* ── Empty: enter code manually ── */}
          {stage.kind === "empty" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Invite Code
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitInputCode()}
                  placeholder="e.g. a1b2c3d4"
                  style={{
                    flex: 1, background: CARD2, border: `1.5px solid ${BORDER_MED}`, borderRadius: 11, padding: "11px 14px",
                    color: TEXT, fontSize: 14, outline: "none", fontFamily: "monospace, monospace", letterSpacing: 1,
                  }}
                />
                <button
                  onClick={submitInputCode}
                  disabled={!inputCode.trim()}
                  style={{
                    padding: "11px 18px", borderRadius: 11,
                    background: inputCode.trim() ? "linear-gradient(135deg,#7C3AED,#4C1D95)" : "rgba(124,58,237,0.2)",
                    border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: inputCode.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  }}
                >
                  <ArrowRight style={{ width: 15, height: 15 }} />Look Up
                </button>
              </div>
              <p style={{ fontSize: 12, color: TEXT3, marginTop: 10 }}>
                You should have received a link like{" "}
                <code style={{ color: "#a78bfa", fontSize: 11 }}>{window.location.origin}/join?code=…</code>
              </p>
            </div>
          )}

          {/* ── Loading ── */}
          {stage.kind === "loading" && (
            <div style={{ textAlign: "center", padding: "24px 0", animation: "fadeIn 0.2s ease" }}>
              <Loader2 style={{ width: 32, height: 32, color: "#7C3AED", animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 10 }} />
              <div style={{ fontSize: 14, color: TEXT2 }}>Fetching invite info…</div>
            </div>
          )}

          {/* ── Invalid ── */}
          {stage.kind === "invalid" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <div style={{
                display: "flex", gap: 12, padding: "16px 16px", borderRadius: 14,
                background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", marginBottom: 18,
              }}>
                <AlertCircle style={{ width: 22, height: 22, color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FCA5A5", marginBottom: 3 }}>Invalid Invite</div>
                  <div style={{ fontSize: 13, color: TEXT2 }}>{stage.reason}</div>
                </div>
              </div>
              <button
                onClick={() => { setCode(""); setStage({ kind: "empty" }); }}
                style={{ width: "100%", padding: 12, borderRadius: 11, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Try a Different Code
              </button>
            </div>
          )}

          {/* ── Info / preview ── */}
          {stage.kind === "info" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              {/* Org preview card */}
              <div style={{ background: CARD2, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {stage.data.org_logo_url ? (
                    <img src={stage.data.org_logo_url} alt={stage.data.org_name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "contain", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, hsl(${[...stage.data.org_name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,38%), hsl(${([...stage.data.org_name].reduce((a, c) => a + c.charCodeAt(0), 0) + 45) % 360},60%,30%))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.9)",
                    }}>
                      {stage.data.org_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 4 }}>{stage.data.org_name}</div>
                    {stage.data.org_city && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TEXT3 }}>
                        <MapPin style={{ width: 11, height: 11 }} />{stage.data.org_city}
                      </div>
                    )}
                  </div>
                </div>
                {stage.data.org_description && (
                  <p style={{ fontSize: 13, color: TEXT2, marginTop: 10, marginBottom: 0, lineHeight: 1.55 }}>
                    {stage.data.org_description}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 10px", borderRadius: 6, background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>
                    Role: {stage.data.role}
                  </span>
                  {stage.data.expires_at && (
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 10px", borderRadius: 6, background: "rgba(245,158,11,0.12)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.2)" }}>
                      Expires {new Date(stage.data.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {typeof stage.data.max_uses === "number" && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}>
                      {stage.data.uses_count}/{stage.data.max_uses} used
                    </span>
                  )}
                </div>
              </div>

              {/* Auth gate */}
              {authLoading ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <Loader2 style={{ width: 18, height: 18, color: "#7C3AED", animation: "spin 1s linear infinite", display: "inline-block" }} />
                </div>
              ) : !isAuthenticated ? (
                <div style={{ background: "rgba(59,130,246,0.08)", border: "1.5px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                    <Lock style={{ width: 16, height: 16, color: "#60A5FA", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.5 }}>
                      You need to be signed in to join <strong style={{ color: TEXT }}>{stage.data.org_name}</strong>.
                    </div>
                  </div>
                  <Link href={`/login?next=/join?code=${encodeURIComponent(code)}`}>
                    <button style={{
                      width: "100%", padding: 12, borderRadius: 11,
                      background: "linear-gradient(135deg,#3B82F6,#2563EB)",
                      border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                      <LogIn style={{ width: 16, height: 16 }} />Sign In to Join
                    </button>
                  </Link>
                </div>
              ) : (
                <div>
                  {joinError && !joining && (
                    <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "#FCA5A5", fontSize: 13, marginBottom: 12 }}>
                      <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                      {(joinError as any)?.message ?? "Something went wrong. Please try again."}
                    </div>
                  )}
                  <button
                    onClick={() => doJoin()}
                    disabled={joining}
                    style={{
                      width: "100%", padding: 14, borderRadius: 12,
                      background: joining ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7C3AED,#4C1D95)",
                      border: "none", color: "white", fontSize: 15, fontWeight: 800,
                      cursor: joining ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxShadow: joining ? "none" : "0 6px 24px rgba(124,58,237,0.35)",
                    }}
                  >
                    {joining
                      ? <><Loader2 style={{ width: 17, height: 17, animation: "spin 1s linear infinite" }} />Joining…</>
                      : <><CheckCircle2 style={{ width: 17, height: 17 }} />Join {stage.data.org_name}</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Success ── */}
          {stage.kind === "success" && (
            <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease", padding: "16px 0" }}>
              <div style={{ animation: "pop 0.5s cubic-bezier(.17,.67,.35,1.2)", display: "inline-block", marginBottom: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                  <CheckCircle2 style={{ width: 38, height: 38, color: "#22C55E" }} />
                </div>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>
                You're in!
              </h2>
              <p style={{ fontSize: 14, color: TEXT2, margin: "0 0 20px", lineHeight: 1.5 }}>
                You've successfully joined <strong style={{ color: TEXT }}>{stage.orgName}</strong>.<br />
                Redirecting you to your organization dashboard…
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Loader2 style={{ width: 14, height: 14, color: TEXT3, animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: TEXT3 }}>Redirecting…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back link */}
      <div style={{ marginTop: 20, fontSize: 12, color: TEXT3 }}>
        <Link href="/dashboard">
          <span style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>← Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
