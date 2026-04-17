import { useEffect, useRef, useState } from "react";

interface Props {
  message?: string;
}

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  dur: 6 + Math.random() * 10,
  delay: Math.random() * 8,
  opacity: 0.12 + Math.random() * 0.18,
}));

const GEARS = [
  { size: 96,  x: "6%",  y: "12%", dur: 22, dir: 1  },
  { size: 56,  x: "14%", y: "25%", dur: 14, dir: -1 },
  { size: 76,  x: "88%", y: "8%",  dur: 18, dir: -1 },
  { size: 48,  x: "80%", y: "22%", dur: 11, dir: 1  },
  { size: 64,  x: "92%", y: "72%", dur: 20, dir: 1  },
  { size: 40,  x: "4%",  y: "80%", dur: 13, dir: -1 },
];

function GearSVG({ size, color = "rgba(124,90,246,0.22)" }: { size: number; color?: string }) {
  const r = size / 2 - 4;
  const teeth = 8;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2 - Math.PI / teeth;
    const a1 = a0 + (0.35 / teeth) * Math.PI * 2;
    const a2 = a1 + (0.15 / teeth) * Math.PI * 2;
    const a3 = a2 + (0.35 / teeth) * Math.PI * 2;
    const ro = r * 1.0; const ri = r * 0.72;
    const c = size / 2;
    pts.push(
      `${c + ri * Math.cos(a0)},${c + ri * Math.sin(a0)}`,
      `${c + ro * Math.cos(a1)},${c + ro * Math.sin(a1)}`,
      `${c + ro * Math.cos(a2)},${c + ro * Math.sin(a2)}`,
      `${c + ri * Math.cos(a3)},${c + ri * Math.sin(a3)}`,
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill={color} xmlns="http://www.w3.org/2000/svg">
      <polygon points={pts.join(" ")} />
      <circle cx={size / 2} cy={size / 2} r={r * 0.32} fill="transparent" stroke={color} strokeWidth={3} />
    </svg>
  );
}

export default function MaintenancePage({ message }: Props) {
  const [dots, setDots] = useState(".");
  const [elapsed, setElapsed] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    interval.current = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
      setElapsed((e) => e + 1);
    }, 600);
    return () => clearInterval(interval.current);
  }, []);

  const mins = Math.floor(elapsed / 10);
  const etaText = mins < 2 ? "just a moment" : mins < 30 ? `~${mins} min` : "soon";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes gear-cw  { to { transform: rotate(360deg);  } }
        @keyframes gear-ccw { to { transform: rotate(-360deg); } }
        @keyframes float-up { 0%,100% { transform: translateY(0); opacity: var(--op); } 50% { transform: translateY(-18px); opacity: calc(var(--op) * 1.5); } }
        @keyframes pulse-ring { 0%,100% { transform: scale(1);   opacity: 0.25; } 50% { transform: scale(1.12); opacity: 0.08; } }
        @keyframes bar-fill   { from { width: 0%; } to { width: 72%; } }
        @keyframes shimmer    { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes blink      { 0%,100% { opacity: 1; } 50% { opacity: 0.35 } }
        @keyframes slide-up   { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .maint-bar {
          background: linear-gradient(90deg, #7c5af6 0%, #a78bfa 60%, #7c5af6 100%);
          background-size: 400px 100%;
          animation: bar-fill 3.2s cubic-bezier(.4,0,.2,1) forwards, shimmer 2.4s linear infinite;
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#07070F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif", overflow: "hidden" }}>

        {/* Floating particles */}
        {PARTICLES.map((p) => (
          <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: "rgba(124,90,246,0.55)", ["--op" as any]: p.opacity, animation: `float-up ${p.dur}s ${p.delay}s ease-in-out infinite`, opacity: p.opacity, pointerEvents: "none" }} />
        ))}

        {/* Animated gears */}
        {GEARS.map((g, i) => (
          <div key={i} style={{ position: "absolute", left: g.x, top: g.y, animation: `${g.dir === 1 ? "gear-cw" : "gear-ccw"} ${g.dur}s linear infinite`, pointerEvents: "none" }}>
            <GearSVG size={g.size} />
          </div>
        ))}

        {/* Radial glow */}
        <div style={{ position: "absolute", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,90,246,0.12) 0%, transparent 70%)", animation: "pulse-ring 4s ease-in-out infinite", pointerEvents: "none" }} />

        {/* Card */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: 560, width: "calc(100% - 40px)", animation: "slide-up 0.7s cubic-bezier(.4,0,.2,1) both" }}>
          {/* Logo area */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#7c5af6,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 24, fontWeight: 900, color: "#e2e8f0", letterSpacing: "-0.01em" }}>BlackMonkey</span>
            </div>
          </div>

          {/* Main card */}
          <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 28, padding: "44px 44px 40px", backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)" }}>

            {/* Top badge */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 18px", borderRadius: 100, background: "rgba(124,90,246,0.15)", border: "1px solid rgba(124,90,246,0.35)", color: "#a78bfa", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "blink 1.4s ease-in-out infinite" }} />
                Under Maintenance
              </span>
            </div>

            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(2rem,5vw,2.8rem)", fontWeight: 900, color: "#e2e8f0", textAlign: "center", margin: "0 0 18px", lineHeight: 1.2 }}>
              We'll be right<br />
              <span style={{ background: "linear-gradient(90deg,#7c5af6,#a78bfa,#7c5af6)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>back{dots}</span>
            </h1>

            <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 15.5, lineHeight: 1.65, textAlign: "center", margin: "0 0 36px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              {message ?? "We're upgrading BlackMonkey to bring you an even better learning experience."}
            </p>

            {/* Progress bar */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", letterSpacing: "0.05em", fontWeight: 500 }}>PROGRESS</span>
                <span style={{ fontSize: 12, color: "rgba(167,139,250,0.8)", fontWeight: 600 }}>ETA {etaText}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
                <div className="maint-bar" style={{ height: "100%", borderRadius: 100 }} />
              </div>
            </div>

            {/* Status pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 8 }}>
              {[
                { label: "Database", ok: true },
                { label: "API", ok: true },
                { label: "Web App", ok: false },
                { label: "CDN", ok: true },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 100, background: ok ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.1)", border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.3)"}`, fontSize: 12, color: ok ? "rgba(134,239,172,0.9)" : "#fbbf24", fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#4ade80" : "#fbbf24", animation: ok ? undefined : "blink 1.2s ease-in-out infinite" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: "center", marginTop: 24, color: "rgba(255,255,255,0.22)", fontSize: 13 }}>
            Questions? Contact <span style={{ color: "rgba(167,139,250,0.7)" }}>ayushkhurana47@gmail.com</span>
          </p>
        </div>
      </div>
    </>
  );
}
