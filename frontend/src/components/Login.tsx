import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Loader2, Sparkles, Shield, TrendingUp, Zap, ChevronDown, Activity } from "lucide-react";
import BackendTest from "./BackendTest";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

// Pre-computed star positions — deterministic LCG, zero loop risk.
// The previous do...while used a fixed-seed RNG that produced the same
// x/y on every iteration → guaranteed infinite loop for some stars.
const STAR_DATA = Array.from({ length: 28 }, (_, i) => {
  // Knuth LCG — each star uses a unique seed derived from its index.
  const h = (n: number) => (((n * 1664525 + 1013904223) >>> 0) / 0x100000000);
  return {
    x:       h(i * 97  + 3)  * 100,
    y:       h(i * 53  + 7)  * 100,
    size:    i % 9 === 0 ? 3 : i % 4 === 0 ? 1 : 2,
    dur:     4 + h(i * 31 + 1) * 4,
    delay:   h(i * 67 + 11) * 8,
    isCross: i % 8 === 0,
  };
});

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackendTest, setShowBackendTest] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // true when running inside the Capacitor Android/iOS shell
  const isNative = Capacitor.isNativePlatform();

  // Redirect after successful login
  useEffect(() => {
    if (isAuthenticated) {
      setTimeout(() => {
        const currentPath = window.location.pathname;
        console.log("🟢 [LOGIN] User authenticated, current path:", currentPath);
        if (currentPath === "/login" || currentPath === "/" || !currentPath) {
          setLocation("/");
        } else {
          console.log("🟢 [LOGIN] Staying on current route:", currentPath);
        }
      }, 200);
    }
  }, [isAuthenticated, setLocation]);

  // ── Native (Android/iOS) sign-in via Capacitor Google Auth plugin ──
  const handleNativeSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await GoogleAuth.signIn();
      const idToken = user?.authentication?.idToken;
      if (!idToken) throw new Error("No ID token received from Google");
      await login(idToken);
      setLoading(false);
    } catch (err: any) {
      console.error("❌ [NATIVE GOOGLE] Sign-in error:", err);
      const msg = err?.message || err?.toString() || "Sign-in failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  };

  // ── Web sign-in via Google Identity Services (GSI) script ──
  useEffect(() => {
    if (isNative) return; // native path handled by handleNativeSignIn button

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("Google OAuth script loaded");

      if (window.google && buttonRef.current && !initializedRef.current) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
          setError("Google Client ID not configured. Please check your environment variables.");
          return;
        }

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              console.log("🟢 [GOOGLE] Callback received, has credential:", !!response?.credential);
              setLoading(true);
              setError(null);

              try {
                if (!response?.credential) {
                  console.error("❌ [GOOGLE] No credential in response:", response);
                  throw new Error("No credential received from Google");
                }

                console.log("🟢 [GOOGLE] Calling login function with credential...");
                await login(response.credential);
                console.log("✅ [GOOGLE] Login completed successfully");
                setLoading(false);
              } catch (err: any) {
                console.error("❌ [GOOGLE] Login error:", err);
                let errorMessage = err?.message || err?.toString() || "Login failed. Please try again.";

                if (errorMessage.includes('\n')) {
                  const lines = errorMessage.split('\n');
                  errorMessage = lines[0];
                  if (lines.length > 1) {
                    errorMessage += '\n\n' + lines.slice(1).join('\n');
                  }
                }

                setError(errorMessage);
                setLoading(false);
              }
            },
          });

          if (buttonRef.current) {
            window.google.accounts.id.renderButton(buttonRef.current, {
              theme: "outline",
              size: "large",
              width: 300,
              text: "signin_with",
              shape: "rectangular",
            });
          }

          initializedRef.current = true;
        } catch (err: any) {
          console.error("Google Sign-In initialization error:", err);
          setError("Failed to initialize Google Sign-In. Please refresh the page.");
        }
      }
    };

    script.onerror = () => {
      setError("Failed to load Google Sign-In script. Please check your internet connection.");
    };

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!existingScript) {
      document.head.appendChild(script);
    } else {
      if (window.google) {
        script.onload?.(new Event('load'));
      }
    }

    return () => {
      // Don't remove script on cleanup to avoid reloading
    };
  }, [login, isNative]);

  const stars = STAR_DATA;

  const features = [
    { icon: <TrendingUp style={{ width: 20, height: 20 }} />, label: "Progress" },
    { icon: <Zap        style={{ width: 20, height: 20 }} />, label: "Practice" },
    { icon: <Shield     style={{ width: 20, height: 20 }} />, label: "Secure"   },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --lg-bg:      #07070F;
          --lg-surf:    #0F1120;
          --lg-surf2:   #141729;
          --lg-border:  rgba(255,255,255,0.07);
          --lg-border2: rgba(255,255,255,0.12);
          --lg-purple:  #7B5CE5;
          --lg-purple2: #9D7FF0;
          --lg-purple3: #C4ADFF;
          --lg-pglow:   rgba(123,92,229,0.28);
          --lg-pdim:    rgba(123,92,229,0.10);
          --lg-pink:    #EC4899;
          --lg-white:   #F0F2FF;
          --lg-white2:  #B8BDD8;
          --lg-muted:   #525870;
        }

        @keyframes lg-fade-up      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes lg-fade-in      { from{opacity:0} to{opacity:1} }
        @keyframes lg-scale-in     { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        @keyframes lg-float-gentle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes lg-orb-drift-1  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.08)} }
        @keyframes lg-orb-drift-2  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(1.06)} }
        @keyframes lg-orb-drift-3  { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,30px) scale(1.04)} 66%{transform:translate(-20px,-20px) scale(.97)} }
        @keyframes lg-star-twinkle { 0%,100%{opacity:0;transform:scale(.5)} 50%{opacity:1;transform:scale(1)} }
        @keyframes lg-shimmer-line { 0%{opacity:0;transform:translateX(-100%)} 50%{opacity:1} 100%{opacity:0;transform:translateX(100%)} }
        @keyframes lg-icon-entrance{ from{opacity:0;transform:scale(.6) rotate(-10deg)} to{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes lg-feature-in   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes lg-shimmer-move { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }
        @keyframes lg-pulse-top    { 0%,100%{opacity:.35} 50%{opacity:.8} }

        .lg-card-icon {
          animation:
            lg-icon-entrance .6s cubic-bezier(.34,1.56,.64,1) .2s both,
            lg-float-gentle 5s ease-in-out 1s infinite;
        }

        .lg-feature-item { transition: transform .3s ease; }
        .lg-feature-item:hover { transform: translateY(-3px); }
        .lg-feature-item:hover .lg-feat-box {
          background: rgba(123,92,229,.18) !important;
          border-color: rgba(123,92,229,.4) !important;
          box-shadow: 0 10px 24px rgba(123,92,229,.2);
        }
        .lg-feature-item:hover .lg-feat-icon { color: #C4ADFF !important; }

        .lg-google-wrap {
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,.35);
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .lg-google-wrap:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(0,0,0,.45);
        }

        .lg-conn-pill {
          background: rgba(15,17,32,.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--lg-border2);
          border-radius: 100px;
          padding: 8px 16px;
          display: flex; align-items: center; gap: 8px;
          cursor: pointer;
          transition: all .25s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,.4);
          animation: lg-fade-in .4s ease 1s both;
        }
        .lg-conn-pill:hover {
          border-color: rgba(123,92,229,.3);
          background: rgba(20,23,41,.9);
          box-shadow: 0 10px 30px rgba(0,0,0,.5);
        }
        .lg-conn-expanded {
          border-radius: 16px;
          padding: 4px;
        }
        .lg-conn-expanded .lg-conn-pill {
          border-radius: 12px;
          padding: 10px 16px;
        }

        .lg-headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(34px,5vw,48px);
          font-weight: 800;
          letter-spacing: -.03em;
          text-align: center;
          line-height: 1.0;
          margin-bottom: 14px;
          animation: lg-fade-up .5s ease .2s both;
          background: linear-gradient(135deg, #F0F2FF 30%, #C4ADFF 60%, #F0F2FF 90%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: lg-fade-up .5s ease .2s both, lg-shimmer-move 6s linear 1s infinite;
        }
      `}</style>

      {/* ── Full Page Shell ── */}
      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", zIndex: 10,
        background: "var(--lg-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Layer 1 — Deep space radial */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 120% 100% at 50% 0%, #1A1040 0%, #0D0A24 35%, #07070F 70%)",
          pointerEvents: "none",
        }} />

        {/* Layer 2 — Left purple orb */}
        <div style={{
          position: "absolute",
          width: 700, height: 700, borderRadius: "50%",
          top: -200, left: -200,
          background: "radial-gradient(circle, rgba(123,92,229,.18) 0%, rgba(123,92,229,.06) 50%, transparent 70%)",
          filter: "blur(60px)", pointerEvents: "none",
          animation: "lg-orb-drift-1 18s ease-in-out infinite",
        }} />

        {/* Layer 3 — Right pink/purple orb */}
        <div style={{
          position: "absolute",
          width: 500, height: 500, borderRadius: "50%",
          bottom: -100, right: -100,
          background: "radial-gradient(circle, rgba(236,72,153,.12) 0%, rgba(123,92,229,.08) 40%, transparent 70%)",
          filter: "blur(50px)", pointerEvents: "none",
          animation: "lg-orb-drift-2 22s ease-in-out infinite",
        }} />

        {/* Layer 4 — Centre bloom */}
        <div style={{
          position: "absolute",
          width: 600, height: 400, borderRadius: "50%",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "radial-gradient(ellipse, rgba(123,92,229,.1) 0%, transparent 65%)",
          filter: "blur(40px)", pointerEvents: "none",
          animation: "lg-orb-drift-3 14s ease-in-out infinite",
        }} />

        {/* Layer 5 — Star field */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {stars.map((s, i) =>
            s.isCross ? (
              <svg
                key={i}
                style={{
                  position: "absolute",
                  left: `${s.x}%`, top: `${s.y}%`,
                  width: s.size * 4, height: s.size * 4,
                  overflow: "visible",
                  animation: `lg-star-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                  opacity: 0,
                }}
                viewBox="-4 -4 8 8"
              >
                <line x1="0" y1="-3" x2="0" y2="3" stroke="white" strokeWidth=".8" strokeLinecap="round" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="white" strokeWidth=".8" strokeLinecap="round" />
              </svg>
            ) : (
              <div key={i} style={{
                position: "absolute",
                left: `${s.x}%`, top: `${s.y}%`,
                width: s.size, height: s.size, borderRadius: "50%",
                background: "white",
                animation: `lg-star-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                opacity: 0,
              }} />
            )
          )}
        </div>

        {/* Layer 6 — Faint grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: .18, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(123,92,229,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(123,92,229,.08) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 75%)",
        }} />

        {/* ── Sign-In Card ── */}
        <div style={{
          position: "relative", zIndex: 10,
          width: "min(520px, calc(100vw - 48px))",
          background: "rgba(15,17,32,0.75)",
          backdropFilter: "blur(32px) saturate(1.4)",
          WebkitBackdropFilter: "blur(32px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,.09)",
          borderRadius: 28,
          padding: "52px 48px",
          overflow: "hidden",
          animation: "lg-scale-in .5s cubic-bezier(.4,0,.2,1) both",
          boxShadow: "0 40px 100px rgba(0,0,0,.55), 0 0 0 1px rgba(123,92,229,.08), inset 0 1px 0 rgba(255,255,255,.06)",
        }}>
          {/* Top shimmer sweep (fires once) */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent 0%, rgba(196,173,255,.6) 50%, transparent 100%)",
            animation: "lg-shimmer-line 1.2s ease .4s both",
            pointerEvents: "none",
          }} />

          {/* Top accent bar */}
          <div style={{
            position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(123,92,229,.5), rgba(196,173,255,.7), rgba(123,92,229,.5), transparent)",
            borderRadius: 1,
            animation: "lg-pulse-top 4s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Left inner glow */}
          <div style={{
            position: "absolute", top: -60, left: -60,
            width: 250, height: 250, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,92,229,.12), transparent 65%)",
            pointerEvents: "none",
          }} />

          {/* Bottom-right inner glow */}
          <div style={{
            position: "absolute", bottom: -40, right: -40,
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,72,153,.08), transparent 65%)",
            pointerEvents: "none",
          }} />

          {/* App icon */}
          <div style={{ textAlign: "center", marginBottom: 28, animation: "lg-fade-up .5s ease .1s both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <div
                className="lg-card-icon"
                style={{
                  width: 72, height: 72, borderRadius: 22,
                  background: "linear-gradient(145deg, #7B5CE5 0%, #5B3FBF 40%, #9D3FA8 100%)",
                  boxShadow: "0 16px 48px rgba(123,92,229,.4), 0 0 0 1px rgba(255,255,255,.12) inset, 0 2px 0 rgba(255,255,255,.2) inset",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Sparkles style={{ width: 32, height: 32, color: "white", filter: "drop-shadow(0 0 8px rgba(255,255,255,.5))" }} />
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="lg-headline">Welcome Back</h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300,
            color: "rgba(184,189,216,0.65)", textAlign: "center", lineHeight: 1.65,
            maxWidth: 340, margin: "0 auto 32px",
            animation: "lg-fade-up .5s ease .28s both",
          }}>
            Sign in to track your progress, earn points, and improve your mental math skills
          </p>

          {/* Feature icons */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 28,
            marginBottom: 36, animation: "lg-fade-up .5s ease .35s both",
            alignItems: "center",
          }}>
            {features.map((f, idx) => (
              <>
                {idx > 0 && (
                  <div key={`sep-${idx}`} style={{
                    width: 1, height: 40,
                    background: "rgba(255,255,255,0.07)",
                    alignSelf: "center", flexShrink: 0,
                  }} />
                )}
                <div
                  key={f.label}
                  className="lg-feature-item"
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 10, width: 76,
                    animation: `lg-feature-in .4s ease ${idx * 0.08 + 0.4}s both`,
                    cursor: "default",
                  }}
                >
                  <div
                    className="lg-feat-box"
                    style={{
                      width: 48, height: 48, borderRadius: 15,
                      background: "rgba(123,92,229,.1)",
                      border: "1px solid rgba(123,92,229,.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .3s ease",
                    }}
                  >
                    <span className="lg-feat-icon" style={{ color: "#9D7FF0", display: "flex" }}>{f.icon}</span>
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, fontWeight: 500,
                    letterSpacing: ".04em", color: "#525870",
                    textAlign: "center",
                  }}>
                    {f.label}
                  </span>
                </div>
              </>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginBottom: 20,
              padding: "14px 16px",
              background: "rgba(248,113,113,.1)",
              border: "1px solid rgba(248,113,113,.3)",
              borderRadius: 12,
              animation: "lg-fade-in .3s ease both",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#f87171", marginTop: 5, flexShrink: 0,
                  animation: "lg-pulse-top 1s ease infinite",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    whiteSpace: "pre-line", fontWeight: 500,
                    color: "#fca5a5", fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>{error}</div>
                  {error.includes('Backend') && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(248,113,113,.2)", fontSize: 11, color: "rgba(252,165,165,.7)" }}>
                      💡 Tip: Check the browser console (F12) for detailed error logs
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div style={{ marginBottom: 20, animation: "lg-fade-up .5s ease .45s both" }}>
            {isNative ? (
              /* Native Android/iOS — uses device Google account picker */
              <button
                onClick={handleNativeSignIn}
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  padding: "12px 24px",
                  background: "#fff",
                  border: "1px solid #dadce0",
                  borderRadius: 4,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, fontWeight: 500,
                  color: "#3c4043",
                  boxShadow: "0 1px 3px rgba(60,64,67,.3), 0 4px 8px rgba(60,64,67,.15)",
                  opacity: loading ? 0.7 : 1,
                  transition: "box-shadow .2s ease",
                }}
              >
                {/* Google "G" logo */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Sign in with Google
              </button>
            ) : (
              /* Web — rendered by Google's GSI library */
              <div className="lg-google-wrap">
                <div
                  ref={buttonRef}
                  id="google-signin-button"
                  style={{ width: "100%", display: "flex", justifyContent: "center" }}
                />
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{
              marginTop: 20, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 12,
              animation: "lg-fade-in .3s ease both",
            }}>
              <Loader2 style={{ width: 28, height: 28, color: "#9D7FF0", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13, color: "rgba(184,189,216,.8)", fontFamily: "'DM Sans', sans-serif" }}>
                Signing you in…
              </span>
              <div style={{ width: 160, height: 3, background: "rgba(255,255,255,.07)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: "60%", borderRadius: 99,
                  background: "linear-gradient(90deg, #7B5CE5, #9D7FF0, #EC4899)",
                  animation: "lg-shimmer-move 1.5s linear infinite",
                }} />
              </div>
            </div>
          )}

          {/* Legal */}
          <p style={{
            marginTop: 16, textAlign: "center",
            fontSize: 12, fontWeight: 300,
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(82,88,112,0.7)", lineHeight: 1.6, padding: "0 8px",
            animation: "lg-fade-up .5s ease .5s both",
          }}>
            By signing in, you agree to track your practice progress and earn points
          </p>
        </div>

        {/* ── Connection Status Widget ── */}
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, maxWidth: "calc(100vw - 40px)", width: "min(380px, calc(100vw - 40px))" }}>
          <div className={showBackendTest ? "lg-conn-expanded" : ""} style={{
            background: "rgba(15,17,32,.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: showBackendTest ? 20 : 100,
            boxShadow: "0 8px 24px rgba(0,0,0,.4)",
            overflow: "hidden",
            animation: "lg-fade-in .4s ease 1s both",
            transition: "border-radius .25s ease",
          }}>
            <button
              onClick={() => setShowBackendTest(!showBackendTest)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8, padding: "8px 16px", cursor: "pointer",
                background: "transparent", border: "none",
                transition: "background .25s ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(123,92,229,.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity style={{ width: 14, height: 14, color: "#9D7FF0" }} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, fontWeight: 600,
                  color: "#B8BDD8", letterSpacing: ".04em",
                }}>
                  Connection Status
                </span>
              </div>
              <ChevronDown style={{
                width: 14, height: 14, color: "#525870",
                transition: "transform .25s ease",
                transform: showBackendTest ? "rotate(180deg)" : "none",
              }} />
            </button>

            {showBackendTest && (
              <div style={{
                borderTop: "1px solid rgba(255,255,255,.07)",
                padding: 16,
                maxWidth: 360,
                width: "min(360px, calc(100vw - 56px))",
                overflowX: "hidden",
                animation: "lg-fade-in .2s ease both",
              }}>
                <BackendTest />
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </>
  );
}
