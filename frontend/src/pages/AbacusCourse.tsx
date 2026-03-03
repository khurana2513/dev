import { useState, useEffect, useRef } from "react";

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(end: number, duration = 1800, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setCount(Math.floor(start));
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, active]);
  return count;
}

// ─── FADE WRAPPER ────────────────────────────────────────────────────────────
function FadeIn({
  children, className = "", delay = 0, direction = "up",
}: {
  children: React.ReactNode; className?: string; delay?: number;
  direction?: "up" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView();
  const off: Record<string, string> = { up: "translateY(32px)", left: "translateX(-32px)", right: "translateX(32px)", none: "none" };
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : off[direction],
      transition: `opacity 0.7s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.7s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>{children}</div>
  );
}

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
function AbacusStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=JetBrains+Mono:wght@400;500;600&display=swap');

      :root {
        --ab-bg:      #06070F;
        --ab-bg2:     #090B18;
        --ab-surface: #0E1023;
        --ab-surface2:#131628;
        --ab-border:  rgba(255,255,255,0.06);
        --ab-border2: rgba(255,255,255,0.1);
        --ab-p:       #7B5CE5;
        --ab-p2:      #9D7FF0;
        --ab-p3:      #C4ADFF;
        --ab-pglow:   rgba(123,92,229,0.22);
        --ab-white:   #F0F2FF;
        --ab-white2:  #B8BDD8;
        --ab-muted:   #5A5F7A;
        --ab-gold:    #E8A820;
        --ab-teal:    #0FB8A0;
        --ab-font-d:  'Playfair Display', Georgia, serif;
        --ab-font-b:  'DM Sans', sans-serif;
        --ab-font-m:  'JetBrains Mono', monospace;
      }

      .ab-page { background: var(--ab-bg); color: var(--ab-white); font-family: var(--ab-font-b); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
      .ab-page ::selection { background: var(--ab-pglow); }

      @keyframes ab-float    { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(1deg); } }
      @keyframes ab-float2   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes ab-bead-in  { 0% { transform: translateX(-24px) scale(0.8); opacity: 0; } 100% { transform: none; opacity: 1; } }
      @keyframes ab-shimmer  { 0% { background-position: -400% center; } 100% { background-position: 400% center; } }
      @keyframes ab-pulse    { 0%,100%{ box-shadow:0 0 0 0 rgba(123,92,229,.5); } 70%{ box-shadow:0 0 0 9px rgba(123,92,229,0); } }
      @keyframes ab-marquee  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes ab-spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ab-pop-in   { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:none; } }
      @keyframes ab-line-grow{ from { width:0; } to { width:100%; } }
      @keyframes ab-glow-orb { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:.8; transform:scale(1.08); } }
      @keyframes ab-bead-bounce { 0%,100%{transform:translateY(0);} 40%{transform:translateY(-6px);} }
      @keyframes ab-scan     { 0%{top:0%;opacity:0;} 10%{opacity:1;} 90%{opacity:1;} 100%{top:100%;opacity:0;} }

      .ab-grad-text {
        background: linear-gradient(135deg, var(--ab-p2) 0%, #C084FC 45%, var(--ab-p) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .ab-gold-text {
        background: linear-gradient(135deg, var(--ab-gold), #f5d060, var(--ab-gold));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .ab-shimmer-text {
        background: linear-gradient(90deg,var(--ab-white2) 0%,var(--ab-white) 25%,var(--ab-p2) 50%,var(--ab-white) 75%,var(--ab-white2) 100%);
        background-size: 400% auto;
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        animation: ab-shimmer 5s linear infinite;
      }
      .ab-lbl {
        font-family: var(--ab-font-m); font-size: 10px; font-weight: 600;
        letter-spacing: .16em; text-transform: uppercase; color: var(--ab-p2);
        display: inline-flex; align-items: center; gap: 10px;
      }
      .ab-lbl::before { content:''; display:block; width:20px; height:1px; background:var(--ab-p2); }
      .ab-btn-p {
        background: linear-gradient(135deg, var(--ab-p), #5535c0);
        color: #fff; border: none; padding: 14px 28px; border-radius: 12px;
        font-family: var(--ab-font-b); font-size: 15px; font-weight: 600;
        cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
      }
      .ab-btn-p::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.13),transparent); opacity:0; transition:opacity .25s; }
      .ab-btn-p:hover { transform:translateY(-2px); box-shadow:0 14px 36px rgba(123,92,229,.42); }
      .ab-btn-p:hover::after { opacity:1; }
      .ab-btn-s {
        background: transparent; color: var(--ab-white2); border: 1px solid var(--ab-border2);
        padding: 14px 26px; border-radius: 12px; font-family: var(--ab-font-b); font-size: 15px;
        font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap;
      }
      .ab-btn-s:hover { border-color:rgba(123,92,229,.5); background:rgba(123,92,229,.09); color:var(--ab-white); transform:translateY(-2px); }
      .ab-card {
        background: var(--ab-surface); border: 1px solid var(--ab-border); border-radius: 20px;
        transition: all .35s cubic-bezier(.4,0,.2,1);
      }
      .ab-card:hover { border-color:rgba(123,92,229,.3); transform:translateY(-5px); box-shadow:0 24px 64px rgba(0,0,0,.38), 0 0 32px rgba(123,92,229,.07); }
      .ab-level-btn { cursor:pointer; transition:all .25s ease; text-align:left; width:100%; box-sizing:border-box; }
      .ab-level-btn:hover { color: var(--ab-white) !important; }

      /* Abacus bead grid */
      .ab-rod-line { position:absolute; left:0; right:0; height:2px; background:rgba(123,92,229,.2); top:50%; transform:translateY(-50%); border-radius:1px; }
      .ab-bead { border-radius:7px; transition:all .3s ease; position:relative; z-index:1; }
      .ab-bead.active { animation: ab-bead-bounce 2.4s ease-in-out infinite; }

      /* Diagonal section divider */
      .ab-divider { position:relative; height:64px; overflow:hidden; }
      .ab-divider::after { content:''; position:absolute; inset:0; background: inherit; clip-path:polygon(0 0,100% 0,100% 40%,0 100%); }

      /* Particle dots */
      .ab-particle { position:absolute; border-radius:50%; pointer-events:none; animation: ab-glow-orb 4s ease-in-out infinite; }
    `}</style>
  );
}

// ─── DATA ────────────────────────────────────────────────────────────────────
const JUNIOR_LEVELS = [
  { num: 1, name: "Foundation", color: "#7B5CE5", duration: "4 Months", focus: "An exploratory first encounter with the abacus tool. Students learn what each bead represents and perform their first single-digit movements.", skills: ["Abacus anatomy & rod structure", "Upper & lower bead values", "Single-digit addition", "Number recognition 1–99"] },
  { num: 2, name: "Builder",    color: "#8B6CF0", duration: "4 Months", focus: "Two-digit operations enter the picture. The critical mental imaging phase begins — students start forming a visual bead map inside their mind.", skills: ["2-digit addition", "2-digit subtraction", "Carry & borrow logic", "Early mental visualization"] },
  { num: 3, name: "Multiplier", color: "#9D7FF0", duration: "4 Months", focus: "Multiplication is introduced. Bead pattern memory deepens and the number of rows handled simultaneously increases.", skills: ["2×1 digit multiplication", "3-digit operations", "Increased row handling", "Speed habit building"] },
  { num: 4, name: "Architect",  color: "#AE93F5", duration: "4 Months", focus: "Division completes the Junior track. Students receive their first certificate and medal — a real, earned milestone of genuine cognitive growth.", skills: ["Basic division operations", "4-digit mixed calculations", "Full Junior certification", "Olympiad eligibility"] },
];

const REGULAR_LEVELS = [
  { num: 1,  name: "Basic I",      color: "#7B5CE5", duration: "4 Months", focus: "Core addition and subtraction across multiple digits. The foundation of mental abacus image building is set here.", skills: ["Multi-digit addition", "Multi-digit subtraction", "Number visualization", "Accuracy-first drills"] },
  { num: 2,  name: "Basic II",     color: "#8265E8", duration: "4 Months", focus: "Complexity and digit count increase substantially. The mental abacus takes shape for the first time.", skills: ["5-row calculations", "Increased digit range", "Speed introduction", "Focus conditioning"] },
  { num: 3,  name: "Basic III",    color: "#8B6CF0", duration: "4 Months", focus: "Multiplication enters the mental model. Students begin performing calculations mentally — without the physical tool.", skills: ["Mental multiplication", "6-row calculations", "Physical tool removal phase", "Visualization lock-in"] },
  { num: 4,  name: "Basic IV",     color: "#946EF2", duration: "4 Months", focus: "Division and multi-operation calculations. This is the critical phase for building true mental stamina.", skills: ["Mental division", "Mixed operations", "8-row complexity", "Timed challenge sets"] },
  { num: 5,  name: "Basic V",      color: "#9D7FF0", duration: "4 Months", focus: "Decimal numbers and higher digit complexity. Accuracy and speed compound dramatically at this level.", skills: ["Decimal operations", "9-row advanced sets", "High-speed drill sessions", "Competition preparation"] },
  { num: 6,  name: "Basic VI",     color: "#A680F3", duration: "4 Months", focus: "The final Basic level. Students achieve reliable, consistent mental calculation across all four core operations.", skills: ["All basic operations mastered", "10-row calculations", "Level VI certification", "National olympiad ready"] },
  { num: 7,  name: "Advanced I",   color: "#AE93F5", duration: "4 Months", focus: "LCM and HCF are introduced. Analytical reasoning expands beyond pure calculation into number theory.", skills: ["LCM & HCF operations", "Complex mixed ops", "Competitive difficulty sets", "Advanced calculation speed"] },
  { num: 8,  name: "Advanced II",  color: "#B89BF8", duration: "4 Months", focus: "Square roots are mastered. Problem complexity approaches the standard of competitive examination papers.", skills: ["Square root (mental)", "Advanced fractions", "Exam-level speed targets", "Pattern recognition depth"] },
  { num: 9,  name: "Advanced III", color: "#C4ADFF", duration: "4 Months", focus: "Cube roots and compound multi-operation challenges. Only a select few students reach this level — an exceptional milestone.", skills: ["Mental cube root", "Compound operations", "High-complexity problem sets", "National olympiad tier"] },
  { num: 10, name: "Advanced IV",  color: "#D4BFFF", duration: "4 Months", focus: "The Master Level. Every operation, every complexity, every format. The complete certificate, medal, and true cognitive mastery.", skills: ["All operations perfectly mastered", "Expert-level calculation speed", "Master certification & medal", "Champion olympiad tier"] },
];

const OUTCOMES = [
  { icon: "🧠", title: "Mental Speed", metric: "2×", desc: "Average 2× faster mental arithmetic after Level 3. Students solve complex problems faster than a calculator — without one." },
  { icon: "👁", title: "Visual Memory", metric: "↑↑", desc: "The mental abacus trains spatial memory that spills into geometry, science, and reading comprehension year-round." },
  { icon: "🎯", title: "Focus Depth", metric: "3×", desc: "Holding a moving bead image in mind demands intense focus. Students report 3× improvement in sustained attention span." },
  { icon: "🏆", title: "Competition Wins", metric: "🥇", desc: "Regular monthly tests and national/international olympiads give students real competitive exposure — and real wins on their cv." },
  { icon: "📜", title: "Certified Growth", metric: "10", desc: "Every level completed earns a certificate and medal. Tangible milestones that build authentic pride and unstoppable momentum." },
  { icon: "💼", title: "Full Kit Day 1", metric: "✓", desc: "Abacus tool, course books, premium branded bag, and academy t-shirt. Everything needed from the very first class." },
];

const HOW_STEPS = [
  { n: "01", icon: "🎯", color: "#7B5CE5", title: "Join a Batch", desc: "Morning, evening, or weekend batches at your nearest branch. One completely free demo class before any commitment." },
  { n: "02", icon: "📅", color: "#9D7FF0", title: "Practice Weekly", desc: "Regular structured classes, last-Sunday monthly assessments, and our online practice portal for daily mental drills." },
  { n: "03", icon: "📜", color: "#C4ADFF", title: "Level Up", desc: "Pass the level test, receive your certificate and medal, and advance to the next stage of your personal mastery journey." },
  { n: "04", icon: "🏆", color: "#E8A820", title: "Compete & Win", desc: "Enter the national and international olympiad circuit. Earn tablets, cash prizes, and the deep confidence that only comes from winning." },
];

const KIT_ITEMS = [
  { icon: "🧮", name: "Professional Abacus Tool", desc: "The exact competition-grade instrument used in class and olympiads — durable, child-sized, precision-crafted." },
  { icon: "📚", name: "Level Course Books", desc: "Level-specific structured workbooks: mental math drills, progressive exercises, and official practice sets included." },
  { icon: "🎒", name: "Premium Talent Hub Bag", desc: "Branded premium backpack. Students wear it as a badge of belonging — and it fits every single thing they need." },
  { icon: "👕", name: "Official Academy T-Shirt", desc: "The Talent Hub uniform, issued at day one. Worn with pride during olympiads, monthly tests, and every big event." },
];

const FAQS = [
  { q: "What age can my child start Abacus?", a: "Abacus is ideal from age 5 (Class 1 onwards). We offer a Junior track (Levels 1–4) for students aged 4–5 and the Regular track (Levels 1–10) for Class 3 onwards. The correct track is assessed at your demo class." },
  { q: "How long does each level take?", a: "Each level takes approximately 4 months with regular weekly classes. Progression is fully tested — students advance only when they demonstrate genuine readiness, ensuring no one is lost behind." },
  { q: "Are classes online or offline?", a: "We teach offline at three Delhi NCR branches: Rohini Sector 16, Rohini Sector 11, and Gurgaon. Batch timings are flexible — mornings, evenings, and weekends are all available." },
  { q: "What does the kit include?", a: "Each enrolled student receives: a professional Abacus tool, structured level course books, a premium Talent Hub branded bag, and the official academy t-shirt. Everything is included from Day 1." },
  { q: "How are monthly tests conducted?", a: "The last Sunday of every month is our Assessment Day. Students are tested on the current level's content under timed conditions — the exact same format as the national olympiad competitions." },
  { q: "Can my child participate in olympiads from the start?", a: "Olympiad eligibility is level-based, not duration-based. Once a student completes one full level, they are eligible to compete. We guide every eligible student through the olympiad registration process." },
];

const MARQUEE_ITEMS = [
  "10 Levels of Mastery", "✦", "Ages 5–15", "✦", "3 Delhi NCR Branches", "✦",
  "18+ Years of Excellence", "✦", "National Olympiad Winners", "✦", "4 Months Per Level", "✦",
  "800+ Students Trained", "✦", "Monthly Assessments", "✦", "Full Kit Included", "✦",
  "Junior · Basic · Advanced", "✦", "Mental Math Certified", "✦",
];

// ─── ABACUS BEAD GRID COMPONENT ──────────────────────────────────────────────
function BeadGrid({ activeRow = -1 }: { activeRow?: number }) {
  const ROWS = [
    [1,0,1,1,0,1,1,0,1,0],
    [0,1,1,0,1,0,1,1,0,1],
    [1,1,0,1,0,1,0,1,1,0],
    [0,1,0,1,1,0,1,1,0,1],
    [1,0,1,0,1,1,0,0,1,1],
  ];
  const ROW_COLORS = ["#7B5CE5","#8B6CF0","#9D7FF0","#AE93F5","#C4ADFF"];
  const ROW_SHADOWS = ["rgba(123,92,229,.5)","rgba(139,108,240,.45)","rgba(157,127,240,.4)","rgba(174,147,245,.35)","rgba(196,173,255,.3)"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, position:"relative", padding:"20px 0" }}>
      {/* Outer rails */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:"linear-gradient(90deg,#2a1a6e,var(--ab-p),#2a1a6e)", borderRadius:2 }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"linear-gradient(90deg,#2a1a6e,var(--ab-p),#2a1a6e)", borderRadius:2 }} />
      {ROWS.map((row, ri) => (
        <div key={ri} style={{ display:"flex", gap:6, position:"relative", alignItems:"center" }}>
          <div className="ab-rod-line" />
          {row.map((active, bi) => (
            <div key={bi} className={`ab-bead${active ? " active" : ""}`} style={{
              flex:1, height:28,
              background: active
                ? `linear-gradient(135deg,${ROW_COLORS[ri]},${ROW_COLORS[ri]}99)`
                : "rgba(255,255,255,.05)",
              border: active
                ? `1px solid ${ROW_COLORS[ri]}80`
                : "1px solid rgba(255,255,255,.04)",
              boxShadow: active ? `0 4px 14px ${ROW_SHADOWS[ri]}, inset 0 1px 0 rgba(255,255,255,.15)` : "none",
              animationDelay: `${bi * 0.15 + ri * 0.3}s`,
              animationDuration: `${2.2 + ri * 0.3}s`,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── MARQUEE BAR ─────────────────────────────────────────────────────────────
function MarqueeBar() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ background:"rgba(123,92,229,.06)", borderTop:"1px solid rgba(123,92,229,.12)", borderBottom:"1px solid rgba(123,92,229,.12)", overflow:"hidden", padding:"14px 0", position:"relative" }}>
      <div style={{ display:"flex", gap:28, animation:"ab-marquee 30s linear infinite", width:"max-content" }}>
        {items.map((t, i) => (
          <span key={i} style={{
            fontFamily:"var(--ab-font-m)", fontSize:11, letterSpacing:".14em",
            color: t === "✦" ? "rgba(123,92,229,.5)" : "var(--ab-white2)", whiteSpace:"nowrap",
            fontWeight: t === "✦" ? 400 : 600,
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── STATS BAR ───────────────────────────────────────────────────────────────
function CounterCell({ label, end, suffix = "", delay = 0 }: { label:string; end:number; suffix?:string; delay?:number }) {
  const { ref, inView } = useInView();
  const count = useCounter(end, 1600, inView);
  return (
    <div ref={ref} style={{ textAlign:"center", padding:"28px 20px", borderRight:"1px solid var(--ab-border)" }}>
      <div style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-.04em", color:"var(--ab-white)", lineHeight:1 }}>
        <span className="ab-grad-text">{count}{suffix}</span>
      </div>
      <div style={{ fontFamily:"var(--ab-font-m)", fontSize:10, color:"var(--ab-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:8 }}>{label}</div>
    </div>
  );
}

function StatsBar() {
  return (
    <div className="rsp-stats-grid" style={{ background:"var(--ab-surface)", border:"1px solid var(--ab-border)", borderRadius:20, display:"grid", gridTemplateColumns:"repeat(4,1fr)", overflow:"hidden", margin:"0 24px" }}>
      <CounterCell end={10}  suffix="+"  label="Levels of Mastery" delay={0} />
      <CounterCell end={800} suffix="+"  label="Students Trained"   delay={0.1} />
      <CounterCell end={18}  suffix="yrs" label="Years of Excellence" delay={0.2} />
      <div style={{ textAlign:"center", padding:"28px 20px" }}>
        <div style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-.04em" }}><span className="ab-grad-text">3</span></div>
        <div style={{ fontFamily:"var(--ab-font-m)", fontSize:10, color:"var(--ab-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:8 }}>Delhi NCR Branches</div>
      </div>
    </div>
  );
}

// ─── LEVEL MAP ───────────────────────────────────────────────────────────────
function LevelMap() {
  const [track, setTrack] = useState<"junior"|"regular">("regular");
  const [active, setActive] = useState(0);
  const levels = track === "junior" ? JUNIOR_LEVELS : REGULAR_LEVELS;
  const cur = levels[active];

  return (
    <section style={{ padding:"100px 0", background:"var(--ab-bg2)", position:"relative", overflow:"hidden" }}>
      {/* Top border accent */}
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"70%", height:1, background:"linear-gradient(90deg,transparent,rgba(123,92,229,.4),transparent)" }} />
      {/* BG glow */}
      <div style={{ position:"absolute", top:"-20%", right:"-10%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle,rgba(123,92,229,.06),transparent 70%)", pointerEvents:"none" }} />

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px" }}>
        <FadeIn>
          <div style={{ marginBottom:48 }}>
            <div className="ab-lbl" style={{ marginBottom:16 }}>Course Structure</div>
            <h2 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(32px,4vw,54px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.05, marginBottom:16 }}>
              The <span className="ab-grad-text">Progression</span> Map
            </h2>
            <p style={{ color:"var(--ab-white2)", fontSize:16, maxWidth:520, lineHeight:1.75 }}>
              Every level builds on the last. No skipping, no shortcuts — each milestone is tested and earned through consistent practice.
            </p>
          </div>
        </FadeIn>

        {/* Track toggle */}
        <FadeIn delay={0.1}>
          <div style={{ display:"inline-flex", background:"var(--ab-surface)", border:"1px solid var(--ab-border)", borderRadius:16, padding:5, gap:5, marginBottom:48 }}>
            {(["junior","regular"] as const).map(t => (
              <button key={t} onClick={() => { setTrack(t); setActive(0); }} style={{
                padding:"11px 24px", borderRadius:12, border:"none", cursor:"pointer",
                fontFamily:"var(--ab-font-b)", fontSize:14, fontWeight:600,
                background: track===t ? "linear-gradient(135deg,var(--ab-p),#5535C0)" : "transparent",
                color: track===t ? "white" : "var(--ab-muted)",
                boxShadow: track===t ? "0 4px 18px rgba(123,92,229,.38)" : "none",
                transition:"all .28s ease",
              }}>
                {t==="junior" ? "⭐ Junior Track (Levels 1–4)" : "🏆 Regular Track (Levels 1–10)"}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Main layout */}
        <div className="rsp-levels-grid" style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:24 }}>
          {/* Level list */}
          <FadeIn direction="left">
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {levels.map((lvl, i) => (
                <button key={i} onClick={() => setActive(i)} className="ab-level-btn" style={{
                  display:"flex", alignItems:"center", gap:12, padding:"13px 15px",
                  background: active===i ? "rgba(123,92,229,.13)" : "transparent",
                  border:`1px solid ${active===i ? "rgba(123,92,229,.32)" : "transparent"}`,
                  borderRadius:14, cursor:"pointer",
                  color: active===i ? "var(--ab-white)" : "var(--ab-muted)",
                  transition:"all .2s ease",
                }}>
                  {/* Level badge */}
                  <div style={{
                    width:34, height:34, borderRadius:11, flexShrink:0,
                    background: active===i ? `linear-gradient(135deg,${lvl.color}40,${lvl.color}20)` : "var(--ab-surface)",
                    border:`1px solid ${active===i ? lvl.color+"55" : "var(--ab-border)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"var(--ab-font-m)", fontSize:12, fontWeight:700,
                    color: active===i ? lvl.color : "var(--ab-muted)",
                    transition:"all .2s ease",
                  }}>{String(lvl.num).padStart(2,"0")}</div>
                  {/* Text */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"var(--ab-font-d)", fontSize:13, fontWeight:700, lineHeight:1.2 }}>
                      {track==="regular" ? (lvl.num<=6?"Basic ":"Advanced ") : "Junior "}{lvl.num}
                    </div>
                    <div style={{ fontFamily:"var(--ab-font-m)", fontSize:9, letterSpacing:".06em", opacity:.65, marginTop:2 }}>{lvl.name}</div>
                  </div>
                  {active===i && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--ab-p)", animation:"ab-pulse 2s infinite", flexShrink:0 }} />}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Detail panel */}
          <FadeIn direction="right">
            <div key={`${track}-${active}`} style={{
              background:"var(--ab-surface)", border:`1px solid ${cur.color}30`,
              borderRadius:24, padding:"36px", position:"relative", overflow:"hidden",
              animation:"ab-pop-in .35s ease both",
              boxShadow:`0 0 80px ${cur.color}0A`,
            }}>
              {/* Top accent bar */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${cur.color},${cur.color}44,transparent)` }} />
              {/* BG glow */}
              <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${cur.color}12,transparent 70%)`, pointerEvents:"none" }} />

              {/* Header row */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:16 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ background:`${cur.color}28`, border:`1px solid ${cur.color}42`, borderRadius:9, padding:"5px 13px", fontFamily:"var(--ab-font-m)", fontSize:11, fontWeight:700, color:cur.color }}>
                      Level {String(cur.num).padStart(2,"0")}
                    </span>
                    <span style={{ fontFamily:"var(--ab-font-m)", fontSize:11, color:"var(--ab-muted)", letterSpacing:".08em" }}>{cur.duration}</span>
                  </div>
                  <h3 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(22px,2.5vw,34px)", fontWeight:800, letterSpacing:"-.03em", color:"var(--ab-white)" }}>{cur.name}</h3>
                </div>
                {/* Progress dots */}
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"var(--ab-font-m)", fontSize:9, color:"var(--ab-muted)", letterSpacing:".1em", marginBottom:8 }}>PROGRESS {active+1}/{levels.length}</div>
                  <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                    {levels.map((_,i) => (
                      <div key={i} onClick={() => setActive(i)} style={{ width:i===active?20:6, height:6, borderRadius:3, background:i<=active?cur.color:"var(--ab-surface2)", transition:"all .28s ease", cursor:"pointer" }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Focus text */}
              <p style={{ fontSize:15, lineHeight:1.8, color:"var(--ab-white2)", marginBottom:28 }}>{cur.focus}</p>

              {/* Skills grid */}
              <div>
                <div className="ab-lbl" style={{ marginBottom:16 }}>What You'll Master</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {cur.skills.map((skill, si) => (
                    <div key={si} style={{ display:"flex", alignItems:"center", gap:10, background:"var(--ab-surface2)", border:"1px solid var(--ab-border)", borderRadius:11, padding:"12px 14px" }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:cur.color, flexShrink:0, boxShadow:`0 0 8px ${cur.color}` }} />
                      <span style={{ fontSize:13, color:"var(--ab-white2)", lineHeight:1.45 }}>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next level teaser */}
              {active < levels.length-1 && (
                <div style={{ marginTop:24, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(135deg,${levels[active+1].color}10,transparent)`, border:`1px solid ${levels[active+1].color}22`, borderRadius:13, padding:"14px 18px" }}>
                  <div>
                    <div style={{ fontFamily:"var(--ab-font-m)", fontSize:9, color:"var(--ab-muted)", letterSpacing:".1em", marginBottom:3 }}>NEXT LEVEL →</div>
                    <div style={{ fontFamily:"var(--ab-font-d)", fontSize:14, fontWeight:700, color:"var(--ab-white)" }}>Level {levels[active+1].num}: {levels[active+1].name}</div>
                  </div>
                  <button onClick={() => setActive(a => a+1)} style={{ background:`${levels[active+1].color}22`, border:`1px solid ${levels[active+1].color}33`, borderRadius:9, padding:"8px 15px", cursor:"pointer", fontFamily:"var(--ab-font-b)", fontSize:13, fontWeight:600, color:levels[active+1].color, transition:"all .2s ease" }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.background=`${levels[active+1].color}35`)}
                    onMouseLeave={e => ((e.target as HTMLElement).style.background=`${levels[active+1].color}22`)}>
                    Preview →
                  </button>
                </div>
              )}
              {active === levels.length-1 && (
                <div style={{ marginTop:24, background:`linear-gradient(135deg,${cur.color}18,${cur.color}06)`, border:`1px solid ${cur.color}30`, borderRadius:13, padding:"18px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--ab-font-m)", fontSize:10, color:cur.color, letterSpacing:".12em", marginBottom:6 }}>🏆 FINAL LEVEL</div>
                  <div style={{ fontFamily:"var(--ab-font-d)", fontSize:15, fontWeight:700, color:"var(--ab-white)" }}>Master Certification Awaits</div>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── OUTCOMES ────────────────────────────────────────────────────────────────
function Outcomes() {
  return (
    <section style={{ padding:"100px 24px", background:"var(--ab-bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:56, flexWrap:"wrap", gap:24 }}>
            <div>
              <div className="ab-lbl" style={{ marginBottom:16 }}>Cognitive Impact</div>
              <h2 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(28px,3.5vw,50px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.05 }}>
                What Abacus <span className="ab-grad-text">Actually Does</span>
              </h2>
            </div>
            <p style={{ color:"var(--ab-muted)", fontSize:15, maxWidth:300, lineHeight:1.7 }}>
              The cognitive benefits that compound for a child's entire academic life — far beyond calculation speed.
            </p>
          </div>
        </FadeIn>

        <div className="rsp-3col" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {OUTCOMES.map((o, i) => (
            <FadeIn key={i} delay={i*0.08}>
              <div className="ab-card" style={{ padding:"30px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                  <div style={{ fontSize:36 }}>{o.icon}</div>
                  <div style={{ fontFamily:"var(--ab-font-d)", fontSize:22, fontWeight:800, color:"var(--ab-muted)", letterSpacing:"-.02em" }}>{o.metric}</div>
                </div>
                <h3 style={{ fontFamily:"var(--ab-font-d)", fontSize:17, fontWeight:700, letterSpacing:"-.02em", marginBottom:10, color:"var(--ab-white)" }}>{o.title}</h3>
                <p style={{ fontSize:13, lineHeight:1.75, color:"var(--ab-white2)" }}>{o.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section style={{ padding:"100px 24px", background:"var(--ab-bg2)", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:"linear-gradient(90deg,transparent,rgba(123,92,229,.3),transparent)" }} />
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <div className="ab-lbl" style={{ justifyContent:"center", marginBottom:16 }}>The Journey</div>
            <h2 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(28px,3.5vw,50px)", fontWeight:800, letterSpacing:"-.04em" }}>
              How It <span className="ab-grad-text">Works</span>
            </h2>
          </div>
        </FadeIn>

        <div className="rsp-4col" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, position:"relative" }}>
          {/* Connector */}
          <div style={{ position:"absolute", top:42, left:"12.5%", right:"12.5%", height:1, background:`linear-gradient(90deg,#7B5CE5,#C4ADFF,${HOW_STEPS[3].color})`, opacity:.25, pointerEvents:"none" }} />

          {HOW_STEPS.map((s, i) => (
            <FadeIn key={i} delay={i*0.12}>
              <div className="ab-card" style={{ padding:"28px", textAlign:"center" }}>
                <div style={{ width:54, height:54, borderRadius:16, background:`${s.color}18`, border:`1px solid ${s.color}30`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:22 }}>
                  {s.icon}
                </div>
                <div style={{ fontFamily:"var(--ab-font-m)", fontSize:10, color:"var(--ab-muted)", letterSpacing:".14em", marginBottom:8 }}>STEP {s.n}</div>
                <h4 style={{ fontFamily:"var(--ab-font-d)", fontSize:17, fontWeight:700, marginBottom:10, color:"var(--ab-white)" }}>{s.title}</h4>
                <p style={{ fontSize:13, lineHeight:1.7, color:"var(--ab-white2)" }}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── KIT SECTION ─────────────────────────────────────────────────────────────
function KitSection() {
  return (
    <section style={{ padding:"90px 24px", background:"var(--ab-bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div className="ab-lbl" style={{ justifyContent:"center", marginBottom:16 }}>Included with Every Enrolment</div>
            <h2 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(26px,3vw,46px)", fontWeight:800, letterSpacing:"-.04em" }}>
              The <span className="ab-grad-text">Complete Kit</span>
            </h2>
            <p style={{ color:"var(--ab-white2)", fontSize:15, maxWidth:400, margin:"14px auto 0", lineHeight:1.7 }}>
              Everything in hand from Day 1. No extra purchases, no hidden costs.
            </p>
          </div>
        </FadeIn>

        <div className="rsp-4col" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
          {KIT_ITEMS.map((item, i) => (
            <FadeIn key={i} delay={i*0.1}>
              <div className="ab-card" style={{ padding:"32px 24px", textAlign:"center" }}>
                <div style={{ fontSize:44, marginBottom:18, display:"block", animation:`ab-float ${3.5+i*0.5}s ease-in-out infinite` }}>{item.icon}</div>
                <h4 style={{ fontFamily:"var(--ab-font-d)", fontSize:15, fontWeight:700, marginBottom:10, color:"var(--ab-white)" }}>{item.name}</h4>
                <p style={{ fontSize:13, lineHeight:1.7, color:"var(--ab-muted)" }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number|null>(0);
  return (
    <section style={{ padding:"100px 24px", background:"var(--ab-bg2)" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"50%", height:1, background:"linear-gradient(90deg,transparent,rgba(123,92,229,.3),transparent)" }} />
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div className="ab-lbl" style={{ justifyContent:"center", marginBottom:16 }}>Common Questions</div>
            <h2 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(26px,3vw,46px)", fontWeight:800, letterSpacing:"-.04em" }}>
              Everything You Want to <span className="ab-grad-text">Know</span>
            </h2>
          </div>
        </FadeIn>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {FAQS.map((f, i) => (
            <FadeIn key={i} delay={i*0.06}>
              <div style={{ background: open===i ? "var(--ab-surface)" : "transparent", border:`1px solid ${open===i ? "rgba(123,92,229,.28)" : "var(--ab-border)"}`, borderRadius:18, overflow:"hidden", transition:"all .3s ease" }}>
                <button onClick={() => setOpen(open===i ? null : i)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}>
                  <span style={{ fontFamily:"var(--ab-font-d)", fontSize:16, fontWeight:700, color:"var(--ab-white)", letterSpacing:"-.01em" }}>{f.q}</span>
                  <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:open===i?"rgba(123,92,229,.2)":"var(--ab-surface)", border:`1px solid ${open===i?"rgba(123,92,229,.35)":"var(--ab-border)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .25s ease", transform:open===i?"rotate(45deg)":"none", color:open===i?"var(--ab-p2)":"var(--ab-muted)", fontSize:18, fontWeight:300 }}>+</div>
                </button>
                {open===i && (
                  <div style={{ padding:"0 24px 22px", fontSize:15, lineHeight:1.8, color:"var(--ab-white2)", animation:"ab-pop-in .3s ease both" }}>{f.a}</div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA BANNER ──────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding:"80px 24px", background:"var(--ab-bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div className="rsp-cta-inner" style={{ position:"relative", borderRadius:28, overflow:"hidden", background:"linear-gradient(135deg,#1e1050 0%,#110a38 50%,#0a061f 100%)", border:"1px solid rgba(123,92,229,.25)", padding:"72px 64px", boxShadow:"0 40px 100px rgba(0,0,0,.45)" }}>
            {/* Glows */}
            <div style={{ position:"absolute", top:-80, left:-80, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(123,92,229,.28),transparent 70%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:-60, right:-60, width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(157,127,240,.14),transparent 70%)", pointerEvents:"none" }} />
            {/* Grid overlay */}
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />

            <div style={{ position:"relative", textAlign:"center", maxWidth:620, margin:"0 auto" }}>
              <div className="ab-lbl" style={{ justifyContent:"center", marginBottom:20 }}>Begin Today</div>
              <h2 style={{ fontFamily:"var(--ab-font-d)", fontSize:"clamp(28px,5vw,58px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.0, marginBottom:20, color:"white" }}>
                Start the <span className="ab-shimmer-text">Abacus Journey</span>
              </h2>
              <p style={{ fontSize:17, color:"rgba(255,255,255,.58)", lineHeight:1.75, marginBottom:44 }}>
                One free demo class. Experience the method, meet the teacher, and see 18 years of refined instruction in a single hour.
              </p>
              <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:30 }}>
                <button className="ab-btn-p" style={{ fontSize:15, padding:"15px 32px", background:"white", color:"#190c48", fontWeight:700 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow="0 14px 42px rgba(255,255,255,.18)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="none"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                  Book Free Session →
                </button>
                <a href="tel:+919266117055" className="ab-btn-s" style={{ borderColor:"rgba(255,255,255,.22)", color:"rgba(255,255,255,.8)", textDecoration:"none", fontSize:15 }}>
                  📞 +91 92661 17055
                </a>
              </div>
              <div style={{ display:"flex", gap:28, justifyContent:"center", flexWrap:"wrap" }}>
                {["No commitment required","Free first trial class","All age groups welcome"].map(t => (
                  <span key={t} style={{ fontFamily:"var(--ab-font-m)", fontSize:11, color:"rgba(255,255,255,.32)", letterSpacing:".06em" }}>✓ {t}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);

  return (
    <section style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", overflow:"hidden", background:"var(--ab-bg)" }}>
      {/* Deep background radial glow */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 65% at 65% 45%, rgba(123,92,229,.1) 0%, transparent 65%)", pointerEvents:"none" }} />
      {/* Grid pattern */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)", backgroundSize:"64px 64px", maskImage:"radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 80%)", pointerEvents:"none" }} />
      {/* Floating particles */}
      {[
        { w:8, h:8, top:"18%", left:"8%", color:"rgba(123,92,229,.35)", delay:"0s", dur:"5s" },
        { w:5, h:5, top:"65%", left:"6%", color:"rgba(196,173,255,.25)", delay:"1.5s", dur:"7s" },
        { w:10, h:10, top:"30%", right:"8%", color:"rgba(123,92,229,.25)", delay:"0.8s", dur:"6s" },
        { w:6, h:6, top:"75%", right:"12%", color:"rgba(232,168,32,.3)", delay:"2.2s", dur:"4.5s" },
        { w:7, h:7, top:"50%", left:"15%", color:"rgba(15,184,160,.2)", delay:"1s", dur:"8s" },
      ].map((p, i) => (
        <div key={i} style={{ position:"absolute", width:p.w, height:p.h, borderRadius:"50%", background:p.color, top:p.top, left:(p as any).left||"auto", right:(p as any).right||"auto", animation:`ab-glow-orb ${p.dur} ease-in-out infinite ${p.delay}`, pointerEvents:"none" }} />
      ))}

      <div className="rsp-hero-grid" style={{ maxWidth:1200, margin:"0 auto", padding:"80px 24px", width:"100%", display:"grid", gridTemplateColumns:"55% 45%", gap:64, alignItems:"center" }}>
        {/* ── LEFT ── */}
        <div>
          {/* Tag pill */}
          <div style={{ opacity:loaded?1:0, transform:loaded?"none":"translateY(14px)", transition:"all .55s ease .08s", display:"inline-flex", alignItems:"center", gap:8, background:"rgba(123,92,229,.1)", border:"1px solid rgba(123,92,229,.22)", borderRadius:100, padding:"7px 16px", marginBottom:30 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--ab-p)", animation:"ab-pulse 2s infinite" }} />
            <span style={{ fontFamily:"var(--ab-font-m)", fontSize:11, color:"var(--ab-p2)", letterSpacing:".05em" }}>Ages 5–15 · Class 1 Onwards · 3 Delhi NCR Branches</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily:"var(--ab-font-d)", fontWeight:800, lineHeight:1.0, letterSpacing:"-.04em", marginBottom:14, opacity:loaded?1:0, transform:loaded?"none":"translateY(24px)", transition:"all .7s cubic-bezier(.4,0,.2,1) .18s" }}>
            <span style={{ display:"block", fontSize:"clamp(46px,5.5vw,78px)", color:"var(--ab-white)" }}>Master</span>
            <span style={{ display:"block", fontSize:"clamp(46px,5.5vw,78px)" }} className="ab-grad-text">Numbers</span>
            <span style={{ display:"block", fontSize:"clamp(46px,5.5vw,78px)", color:"var(--ab-white)" }}>With&nbsp;<span className="ab-gold-text">Precision.</span></span>
          </h1>

          {/* Accent underline */}
          <div style={{ width:64, height:3, background:"linear-gradient(90deg,var(--ab-p),transparent)", borderRadius:2, marginBottom:26, opacity:loaded?1:0, transition:"opacity .7s ease .5s" }} />

          <p style={{ fontSize:17, lineHeight:1.8, color:"var(--ab-white2)", maxWidth:460, marginBottom:38, opacity:loaded?1:0, transform:loaded?"none":"translateY(16px)", transition:"all .7s ease .32s" }}>
            The ancient Japanese counting tool reimagined for the modern mind. Abacus training doesn't just build calculation speed — it permanently rewires how children visualize and problem-solve.
          </p>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", opacity:loaded?1:0, transition:"opacity .7s ease .42s" }}>
            <button className="ab-btn-p">Enroll in Abacus →</button>
            <button className="ab-btn-s">Book Free Demo Class</button>
          </div>

          {/* Mini stats */}
          <div style={{ display:"flex", gap:32, marginTop:44, paddingTop:34, borderTop:"1px solid var(--ab-border)", opacity:loaded?1:0, transition:"opacity .8s ease .58s" }}>
            {[["10","Levels"],["4 Mo","Per Level"],["5–15","Age Range"],["800+","Students"]].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontFamily:"var(--ab-font-d)", fontSize:26, fontWeight:800, letterSpacing:"-.04em", color:"var(--ab-white)" }}>{v}</div>
                <div style={{ fontFamily:"var(--ab-font-m)", fontSize:9, color:"var(--ab-muted)", letterSpacing:".12em", textTransform:"uppercase", marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — Abacus visualizer card ── */}
        <div className="rsp-hero-right" style={{ opacity:loaded?1:0, transform:loaded?"none":"translateX(32px)", transition:"all .9s cubic-bezier(.4,0,.2,1) .28s", position:"relative" }}>
          <div style={{ background:"linear-gradient(145deg,var(--ab-surface2),var(--ab-bg2))", border:"1px solid var(--ab-border2)", borderRadius:28, padding:"36px 28px", position:"relative", overflow:"hidden", boxShadow:"0 44px 110px rgba(0,0,0,.55), 0 0 70px rgba(123,92,229,.1)" }}>
            {/* Inner glow */}
            <div style={{ position:"absolute", top:-60, right:-60, width:230, height:230, borderRadius:"50%", background:"radial-gradient(circle,rgba(123,92,229,.22),transparent 70%)", pointerEvents:"none" }} />
            {/* Scan line */}
            <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(123,92,229,.4),transparent)", animation:"ab-scan 3.5s ease-in-out infinite", pointerEvents:"none" }} />

            <div className="ab-lbl" style={{ marginBottom:22 }}>Live Mental Abacus Visualizer</div>

            {/* Bead grid wrapper */}
            <div style={{ background:"rgba(123,92,229,.04)", border:"1px solid rgba(123,92,229,.12)", borderRadius:18, padding:"20px 16px" }}>
              <BeadGrid />
            </div>

            {/* Calculation display */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:24, flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontFamily:"var(--ab-font-m)", fontSize:10, color:"var(--ab-muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:5 }}>Mental Calculation</div>
                <div style={{ fontFamily:"var(--ab-font-d)", fontSize:28, fontWeight:800, letterSpacing:"-.04em" }} className="ab-grad-text">4,827 + 6,394</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"var(--ab-font-m)", fontSize:10, color:"var(--ab-muted)", letterSpacing:".1em", marginBottom:5 }}>Result</div>
                <div style={{ fontFamily:"var(--ab-font-d)", fontSize:24, fontWeight:800, letterSpacing:"-.04em", color:"var(--ab-p3)" }}>= 11,221</div>
              </div>
            </div>
          </div>

          {/* Float badge — gold */}
          <div style={{ position:"absolute", top:-22, right:-22, background:"linear-gradient(135deg,var(--ab-gold),#c47a0e)", borderRadius:16, padding:"12px 18px", fontFamily:"var(--ab-font-d)", fontWeight:700, fontSize:13, color:"#1a0900", boxShadow:"0 10px 32px rgba(232,168,32,.42)", animation:"ab-float 4s ease-in-out infinite", zIndex:10 }}>
            🏅 Level 1–10 Track
          </div>

          {/* Float badge — dark */}
          <div style={{ position:"absolute", bottom:70, left:-28, background:"rgba(6,7,15,.94)", backdropFilter:"blur(18px)", border:"1px solid rgba(123,92,229,.22)", borderRadius:16, padding:"14px 18px", animation:"ab-float2 5s ease-in-out infinite 1.2s", boxShadow:"0 10px 32px rgba(0,0,0,.45)", zIndex:10 }}>
            <div style={{ fontFamily:"var(--ab-font-m)", fontSize:9, color:"var(--ab-p2)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:5 }}>Monthly Test</div>
            <div style={{ fontFamily:"var(--ab-font-d)", fontSize:14, fontWeight:700, color:"white" }}>Last Sunday</div>
          </div>

          {/* Float badge — teal */}
          <div style={{ position:"absolute", bottom:-16, right:20, background:`rgba(15,184,160,.12)`, border:`1px solid rgba(15,184,160,.25)`, backdropFilter:"blur(12px)", borderRadius:14, padding:"10px 16px", animation:"ab-float2 6s ease-in-out infinite 0.6s", zIndex:10 }}>
            <div style={{ fontFamily:"var(--ab-font-m)", fontSize:9, color:"var(--ab-teal)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:4 }}>Olympiad Ready</div>
            <div style={{ fontFamily:"var(--ab-font-d)", fontSize:13, fontWeight:700, color:"white" }}>From Level 1 ✓</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── ROOT PAGE ────────────────────────────────────────────────────────────────
export default function AbacusCourse() {
  return (
    <div className="ab-page">
      <AbacusStyles />
      <Hero />
      <MarqueeBar />
      <div style={{ padding:"60px 24px 0", background:"var(--ab-bg)" }}>
        <StatsBar />
      </div>
      <LevelMap />
      <Outcomes />
      <HowItWorks />
      <KitSection />
      <FAQSection />
      <CTABanner />
    </div>
  );
}
