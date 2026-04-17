import { useState, useEffect, useRef } from "react";

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
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
  children, className = "", delay = 0, dir = "up",
}: {
  children: React.ReactNode; className?: string; delay?: number;
  dir?: "up" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView();
  const off: Record<string, string> = {
    up: "translateY(32px)", left: "translateX(-32px)", right: "translateX(32px)", none: "none",
  };
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : off[dir],
      transition: `opacity 0.72s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.72s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>{children}</div>
  );
}

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
function VedicStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

      :root {
        --vd-bg:      #07060A;
        --vd-bg2:     #0B0A0E;
        --vd-bg3:     #100E14;
        --vd-surface: #141219;
        --vd-s2:      #1A1820;
        --vd-border:  rgba(212,160,23,0.09);
        --vd-b2:      rgba(212,160,23,0.16);
        --vd-gold:    #D4A017;
        --vd-gold2:   #E8B830;
        --vd-gold3:   #F5CC60;
        --vd-goldglow:rgba(212,160,23,0.24);
        --vd-golddim: rgba(212,160,23,0.1);
        --vd-amber:   #B87A10;
        --vd-cream:   #F5EDD8;
        --vd-cream2:  #C8B890;
        --vd-muted:   #5A5038;
        --vd-muted2:  #3A3020;
        --vd-red:     #C0392B;
        --vd-p:       #7B5CE5;
        --vd-font-s:  'Playfair Display', Georgia, serif;
        --vd-font-d:  'Playfair Display', Georgia, serif;
        --vd-font-b:  'DM Sans', sans-serif;
        --vd-font-m:  'JetBrains Mono', monospace;
      }

      .vd-page { background: var(--vd-bg); color: var(--vd-cream); font-family: var(--vd-font-b); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
      .vd-page ::selection { background: var(--vd-goldglow); color: var(--vd-cream); }
      .vd-page ::-webkit-scrollbar { width: 3px; }
      .vd-page ::-webkit-scrollbar-thumb { background: var(--vd-gold); border-radius: 2px; }

      @keyframes vd-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes vd-float-rev  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
      @keyframes vd-shimmer    { 0%{background-position:-400% center} 100%{background-position:400% center} }
      @keyframes vd-glow-pulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.75;transform:scale(1.07)} }
      @keyframes vd-reveal-num { from{opacity:0;transform:scale(.92) translateY(10px)} to{opacity:1;transform:none} }
      @keyframes vd-draw-line  { from{width:0} to{width:100%} }
      @keyframes vd-sanskrit   { 0%{opacity:.04} 50%{opacity:.1} 100%{opacity:.04} }
      @keyframes vd-step-in    { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:none} }
      @keyframes vd-pop-in     { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:none} }
      @keyframes vd-marquee    { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      @keyframes vd-pulse-dot  { 0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)} 70%{box-shadow:0 0 0 9px rgba(212,160,23,0)} }
      @keyframes vd-scan       { 0%{top:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }

      .vd-gold-text {
        background: linear-gradient(135deg, var(--vd-gold2) 0%, var(--vd-gold3) 45%, var(--vd-gold) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .vd-shimmer-gold {
        background: linear-gradient(90deg, var(--vd-cream2) 0%, var(--vd-cream) 25%, var(--vd-gold3) 50%, var(--vd-cream) 75%, var(--vd-cream2) 100%);
        background-size: 400% auto;
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        animation: vd-shimmer 5s linear infinite;
      }
      .vd-lbl {
        font-family: var(--vd-font-m); font-size: 10px; font-weight: 600;
        letter-spacing: .16em; text-transform: uppercase; color: var(--vd-gold2);
        display: inline-flex; align-items: center; gap: 10px;
      }
      .vd-lbl::before { content:''; display:block; width:20px; height:1px; background:var(--vd-gold2); }
      .vd-btn-gold {
        background: linear-gradient(135deg, var(--vd-gold), #8a5e00);
        color: #1a1000; border: none; padding: 14px 28px; border-radius: 12px;
        font-family: var(--vd-font-b); font-size: 15px; font-weight: 700;
        cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
      }
      .vd-btn-gold::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.18),transparent); opacity:0; transition:opacity .25s; }
      .vd-btn-gold:hover { transform:translateY(-2px); box-shadow:0 14px 38px rgba(212,160,23,.42); }
      .vd-btn-gold:hover::after { opacity:1; }
      .vd-btn-outline {
        background: transparent; color: var(--vd-cream2); border: 1px solid var(--vd-b2);
        padding: 14px 26px; border-radius: 12px; font-family: var(--vd-font-b); font-size: 15px;
        font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; text-decoration: none; white-space: nowrap;
      }
      .vd-btn-outline:hover { border-color:rgba(212,160,23,.5); background:rgba(212,160,23,.08); color:var(--vd-cream); transform:translateY(-2px); }
      .vd-card {
        background: var(--vd-surface); border: 1px solid var(--vd-border); border-radius: 20px;
        transition: all .35s cubic-bezier(.4,0,.2,1);
      }
      .vd-card:hover { border-color:rgba(212,160,23,.28); transform:translateY(-5px); box-shadow:0 24px 64px rgba(0,0,0,.4), 0 0 32px rgba(212,160,23,.06); }
      .vd-sutra-btn { cursor:pointer; transition:all .22s ease; text-align:left; width:100%; box-sizing:border-box; }
      .vd-sanskrit-bg {
        position:absolute; inset:0; overflow:hidden; pointer-events:none;
        font-family:var(--vd-font-s); color:var(--vd-gold); opacity:.06; line-height:1;
        display:flex; align-items:center; justify-content:center; user-select:none;
        animation: vd-sanskrit 7s ease-in-out infinite;
      }
    `}</style>
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SUTRAS = [
  { num:"01", name:"Ekadhikena Purvena",            eng:"By one more than the previous one",          use:"Squaring numbers ending in 5, recurring decimals, digit cycles" },
  { num:"02", name:"Nikhilam Navatashcaramam",       eng:"All from 9, last from 10",                   use:"Lightning multiplication near bases — 10, 100, 1000" },
  { num:"03", name:"Urdhva-Tiryagbhyam",             eng:"Vertically and cross-wise",                  use:"General multiplication of any two numbers, any size" },
  { num:"04", name:"Paraavartya Yojayet",             eng:"Transpose and adjust",                       use:"Division by numbers with large digits, polynomial division" },
  { num:"05", name:"Shunyam Saamyasamuccaye",        eng:"When the sum is the same, that sum is zero", use:"Certain linear and quadratic equation types, instant solution" },
  { num:"06", name:"Anurupyena",                     eng:"Proportionately",                            use:"Multiplication and division by proportional base adjustment" },
  { num:"07", name:"Sankalana-Vyavakalanabhyam",     eng:"By addition and by subtraction",             use:"Simultaneous linear equations, specific factoring shortcuts" },
  { num:"08", name:"Puranapuranabhyam",               eng:"By completion or non-completion",            use:"Completing the square, quadratic and cubic equations" },
  { num:"09", name:"Chalana-Kalanabhyam",             eng:"Differences and similarities",               use:"Factorization of polynomials, differential applications" },
  { num:"10", name:"Yaavadunam",                     eng:"Whatever the extent of deficiency",           use:"Squaring numbers, cube roots, higher-power roots" },
  { num:"11", name:"Vyashtisamanstih",                eng:"Part and whole",                             use:"Factorization of polynomials by grouping" },
  { num:"12", name:"Shesanyankena Charamena",        eng:"The remainders by the last digit",           use:"Recurring decimals expressed as exact fractions" },
  { num:"13", name:"Sopaantyadvayamantyam",           eng:"The ultimate and twice the penultimate",     use:"Specific algebraic fraction types, proportional sums" },
  { num:"14", name:"Ekanyunena Purvena",              eng:"By one less than the previous one",          use:"Multiplication by numbers consisting entirely of 9s" },
  { num:"15", name:"Gunitasamuchyah",                eng:"The product of the sum equals sum of products", use:"Verification of results, self-checking technique" },
  { num:"16", name:"Gunakasamuchyah",                eng:"Factors of sum equal the sum of the factors", use:"Verify factorization and multiplication results" },
];

const LEVELS = [
  {
    num:"01", name:"Foundations of Speed", duration:"4 Months", color:"#D4A017",
    desc:"Core sutras for addition, subtraction, and foundational multiplication. Students discover that arithmetic can be blazingly fast and beautiful.",
    topics:["Ekadhikena Purvena","Nikhilam multiplication","Digit sums & casting nines","Divisibility rules","Squaring numbers ending in 5","Base multiplication ×9, ×99, ×999"],
    demo:{ q:"45 × 45", a:"2,025", method:"Ekadhikena: (4+1)×4 = 20, append 25 → 2025", time:"1 sec" },
  },
  {
    num:"02", name:"Algebraic Visualization", duration:"4 Months", color:"#C89010",
    desc:"General multiplication and division methods. Students handle 4–8 digit numbers mentally with consistent, verified accuracy.",
    topics:["Urdhva-Tiryagbhyam general multiplication","Paraavartya division","Square roots mentally","Cube roots of perfect cubes","Percentage calculations","LCM & HCF shortcuts"],
    demo:{ q:"997 × 998", a:"995,006", method:"Nikhilam: deficiencies 3 & 2 → cross-subtract: 997−2 = 995 → product: 3×2 = 06", time:"3 sec" },
  },
  {
    num:"03", name:"Competitive Mathematics", duration:"4 Months", color:"#B87800",
    desc:"Olympiad-tier territory. Long division, complex fractions, and deep pattern recognition for high-stakes competitive examination problems.",
    topics:["Recurring decimals as fractions","Simultaneous equations","Quadratic factorization","Complex division patterns","Advanced percentage shortcuts","Olympiad problem strategies"],
    demo:{ q:"1/19 as decimal", a:"0.052631578…", method:"Ekadhikena: multiply consecutive by oscillator 2 rightward", time:"8 sec" },
  },
  {
    num:"04", name:"Mental Mastery", duration:"4 Months", color:"#A06800",
    desc:"Championship-level application. All 16 sutras in integrated combination. Students achieve reliable mental computation at full examination speed — and win.",
    topics:["All 16 sutras integrated","Polynomial operations","Advanced roots & powers","Competition problem solving","Timed speed drills","National Olympiad preparation"],
    demo:{ q:"√7,921", a:"89", method:"Dwandwa Yoga: pair 79|21, find duplex sequences", time:"4 sec" },
  },
];

const OUTCOMES = [
  { icon:"⚡", metric:"10×", title:"Calculation Speed",   desc:"Multiply 8-digit numbers in seconds. Operations that take 2 minutes on paper complete in under 10 seconds mentally." },
  { icon:"🎯", metric:"20⁺", title:"Exam Minutes Saved", desc:"Students consistently finish calculation-heavy exam sections 15–25 minutes early — time to verify, think, and score higher." },
  { icon:"🧮", metric:"∞",   title:"All Operations",     desc:"Addition, subtraction, multiplication, division, LCM, HCF, square roots, cube roots, percentages, fractions — everything." },
  { icon:"🔍", metric:"↑↑",  title:"Pattern Vision",     desc:"The sutras reveal the underlying logic of numbers. Students stop memorizing and start seeing patterns that never fade." },
  { icon:"📜", metric:"3K+", title:"Years of Wisdom",    desc:"Derived from Vedic literature 3,000+ years ago. Rediscovered and systematized by Jagadguru Sri Bharati Krsna Tirthaji." },
  { icon:"🏆", metric:"🥇",  title:"Olympiad Ready",     desc:"Level 4 students compete in national and international olympiads at the highest tier — and they bring home medals." },
];

const FAQS = [
  { q:"What age is right for Vedic Maths?", a:"Vedic Maths is ideal from age 10 onwards (Class 5+), once students have a solid foundation in basic arithmetic. It is particularly powerful for Class 8–12 students preparing for board exams and competitive entrance tests." },
  { q:"Is this just tricks, or real mathematics?", a:"Vedic Maths is derived from ancient Sanskrit sutras — mathematical aphorisms that describe universal number truths. These are not tricks; they are algorithms grounded in number theory. Students who understand the logic behind each sutra gain a lasting, transferable advantage." },
  { q:"How does it help with board exams and JEE?", a:"The speed gains are most felt in Class 10 and 12 boards, JEE, NEET, and Olympiad papers. Students gain 15–25 minutes per exam by computing faster — time they spend verifying answers and attempting the harder questions others skip." },
  { q:"Can a student join mid-course?", a:"Yes, after a brief placement assessment. Level 1 covers the foundational sutras every student must know. If a student has prior exposure, we may place them directly at Level 2 after assessment." },
  { q:"What does the kit include?", a:"Structured course books for each level, a premium BlackMonkey branded bag, and the official academy t-shirt. There is no physical tool for Vedic Maths — the method is entirely and beautifully mental." },
  { q:"Are there monthly tests like Abacus?", a:"Yes. The last Sunday of every month is Assessment Day. Vedic Maths students are tested on the current level's sutras and problem types under timed conditions — the same format as competitive examinations." },
];

const MARQUEE_ITEMS = [
  "16 Sacred Sutras", "✦", "Ages 10+", "✦", "4 Levels of Mastery", "✦",
  "अथर्ववेद", "✦", "Ancient Mental Architecture", "✦", "Exam Speed Advantage", "✦",
  "3 Delhi NCR Branches", "✦", "Olympiad Champions", "✦", "JEE · NEET · Boards", "✦",
  "Calculation in Seconds", "✦", "Certified Progression", "✦",
];

const CALC_DEMOS = [
  { q:"997 × 998", a:"= 995,006",   hint:"Nikhilam · 3 sec",              method:"Deficiencies: 3 & 2 → cross-subtract: 997−2 = 995 → product: 3×2 = 06" },
  { q:"45²",       a:"= 2,025",     hint:"Ekadhikena · 1 sec",             method:"Ends in 5: (4+1)×4 = 20, append 25 → 2025" },
  { q:"√7,921",    a:"= 89",        hint:"Dwandwa Yoga · 4 sec",           method:"Pair digits 79|21, subtract duplex sequences to isolate digits 8, 9" },
  { q:"1 ÷ 19",    a:"= 0.0526…",  hint:"Recurring decimal · 8 sec",      method:"Osculator 2 (Ekadhikena): sequentially multiply remainder by 2 rightward" },
];

// ─── MARQUEE BAR ─────────────────────────────────────────────────────────────
function MarqueeBar() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ background:"rgba(212,160,23,.05)", borderTop:"1px solid rgba(212,160,23,.12)", borderBottom:"1px solid rgba(212,160,23,.12)", overflow:"hidden", padding:"14px 0" }}>
      <div style={{ display:"flex", gap:28, animation:"vd-marquee 32s linear infinite", width:"max-content" }}>
        {items.map((t, i) => (
          <span key={i} style={{
            fontFamily: t === "अथर्ववेद" ? "var(--vd-font-s)" : "var(--vd-font-m)",
            fontSize: t === "अथर्ववेद" ? 13 : 11,
            fontStyle: t === "अथर्ववेद" ? "italic" : "normal",
            letterSpacing: ".14em",
            color: t === "✦" ? "rgba(212,160,23,.45)" : t === "अथर्ववेद" ? "var(--vd-gold2)" : "var(--vd-cream2)",
            whiteSpace: "nowrap",
            fontWeight: t === "✦" ? 400 : 600,
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── STATS BAR ───────────────────────────────────────────────────────────────
function CounterCell({ label, end, suffix = "" }: { label: string; end: number; suffix?: string }) {
  const { ref, inView } = useInView();
  const count = useCounter(end, 1600, inView);
  return (
    <div ref={ref} style={{ textAlign:"center", padding:"28px 20px", borderRight:"1px solid var(--vd-border)" }}>
      <div style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-.02em", color:"var(--vd-cream)", lineHeight:1 }} className="vd-gold-text">
        {count}{suffix}
      </div>
      <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:8 }}>{label}</div>
    </div>
  );
}

function StatsBar() {
  return (
    <div className="rsp-stats-grid" style={{ background:"var(--vd-surface)", border:"1px solid var(--vd-border)", borderRadius:20, display:"grid", gridTemplateColumns:"repeat(4,1fr)", overflow:"hidden" }}>
      <CounterCell end={16} label="Sacred Sutras" />
      <CounterCell end={4}  label="Mastery Levels" />
      <CounterCell end={90} suffix="+" label="Concepts" />
      <CounterCell end={4}  label="Appx Months Per Level" />
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [calcStep, setCalcStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCalcStep(s => (s + 1) % CALC_DEMOS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", overflow:"hidden", background:"var(--vd-bg)" }}>
      {/* Ambient warm glows */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 65% 60% at 20% 50%, rgba(212,160,23,.08) 0%, transparent 65%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 50% 50% at 80% 70%, rgba(184,122,16,.05) 0%, transparent 60%)", pointerEvents:"none" }} />
      {/* Warm grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(212,160,23,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.05) 1px,transparent 1px)", backgroundSize:"56px 56px", maskImage:"radial-gradient(ellipse 85% 85% at 50% 50%, black 25%, transparent 80%)", pointerEvents:"none" }} />
      {/* Sanskrit OM watermark */}
      <div className="vd-sanskrit-bg" style={{ fontSize:"clamp(120px,20vw,240px)" }}>ॐ</div>

      {/* Floating glow particles */}
      {[
        { w:8,  h:8,  top:"15%", left:"7%",   color:"rgba(212,160,23,.3)",  delay:"0s",   dur:"5s" },
        { w:5,  h:5,  top:"70%", left:"5%",   color:"rgba(245,204,96,.2)",  delay:"1.8s", dur:"7s" },
        { w:10, h:10, top:"28%", right:"7%",  color:"rgba(212,160,23,.2)",  delay:"0.7s", dur:"6s" },
        { w:6,  h:6,  top:"78%", right:"11%", color:"rgba(184,122,16,.28)", delay:"2.4s", dur:"4.5s" },
        { w:7,  h:7,  top:"52%", left:"14%",  color:"rgba(245,204,96,.15)", delay:"1.2s", dur:"8s" },
      ].map((p, i) => (
        <div key={i} style={{ position:"absolute", width:p.w, height:p.h, borderRadius:"50%", background:p.color, top:p.top, left:(p as any).left||"auto", right:(p as any).right||"auto", animation:`vd-glow-pulse ${p.dur} ease-in-out infinite ${p.delay}`, pointerEvents:"none" }} />
      ))}

      <div className="rsp-hero-grid" style={{ maxWidth:1200, margin:"0 auto", padding:"10px 56px 80px 24px", width:"100%", display:"grid", gridTemplateColumns:"55% 45%", gap:64, alignItems:"center" }}>

        {/* ── LEFT ── */}
        <div>
          {/* Sanskrit + tag pill */}
          <div style={{ opacity:loaded?1:0, transform:loaded?"none":"translateY(14px)", transition:"all .55s ease .08s", display:"inline-flex", alignItems:"center", gap:10, background:"rgba(212,160,23,.1)", border:"1px solid rgba(212,160,23,.22)", borderRadius:100, padding:"8px 18px", marginBottom:32 }}>
            <span style={{ fontFamily:"var(--vd-font-s)", fontSize:15, color:"var(--vd-gold2)", fontStyle:"italic" }}>अथर्ववेद</span>
            <span style={{ width:1, height:12, background:"rgba(212,160,23,.35)" }} />
            <span style={{ fontFamily:"var(--vd-font-m)", fontSize:11, color:"var(--vd-gold2)", letterSpacing:".06em" }}>Ancient Mental Architecture</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily:"var(--vd-font-s)", fontWeight:900, lineHeight:1.0, letterSpacing:"-.02em", marginBottom:16, opacity:loaded?1:0, transform:loaded?"none":"translateY(24px)", transition:"all .72s cubic-bezier(.4,0,.2,1) .18s" }}>
            <span style={{ display:"block", fontSize:"clamp(44px,5.5vw,76px)", color:"var(--vd-cream)", fontStyle:"italic" }}>Vedic</span>
            <span style={{ display:"block", fontSize:"clamp(44px,5.5vw,76px)", fontStyle:"normal" }} className="vd-gold-text">Sutras.</span>
            <span style={{ display:"block", fontSize:"clamp(44px,5.5vw,76px)", color:"var(--vd-cream)", fontStyle:"italic" }}>Mental&nbsp;Speed.</span>
          </h1>

          {/* Gold underline */}
          <div style={{ width:64, height:2, background:"linear-gradient(90deg,var(--vd-gold),transparent)", borderRadius:2, marginBottom:26, opacity:loaded?1:0, transition:"opacity .72s ease .5s" }} />

          <p style={{ fontSize:17, lineHeight:1.82, color:"var(--vd-cream2)", maxWidth:460, marginBottom:38, fontWeight:300, opacity:loaded?1:0, transform:loaded?"none":"translateY(16px)", transition:"all .7s ease .32s" }}>
            16 sacred sutras from Vedic literature. Solve 997 × 998 in three seconds. Finish exam sections twenty minutes early. Mathematics as it was always meant to be — pure, elegant, and blazingly fast.
          </p>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", opacity:loaded?1:0, transition:"opacity .7s ease .42s" }}>
            <button className="vd-btn-gold" onClick={() => document.getElementById('vd-begin')?.scrollIntoView({behavior:'smooth'})}>Enroll in Vedic Maths →</button>
            <a href="/tools/gridmaster" className="vd-btn-outline" style={{ textDecoration:"none" }}>Try Vedic Grid</a>
          </div>


        </div>

        {/* ── RIGHT — Calculation showcase card ── */}
        <div className="rsp-hero-right" style={{ opacity:loaded?1:0, transform:loaded?"none":"translateX(32px)", transition:"all .9s cubic-bezier(.4,0,.2,1) .28s", position:"relative" }}>
          <div style={{ background:"linear-gradient(145deg,var(--vd-s2),var(--vd-bg3))", border:"1px solid var(--vd-b2)", borderRadius:28, padding:"36px", position:"relative", overflow:"hidden", boxShadow:"0 44px 110px rgba(0,0,0,.6), 0 0 70px rgba(212,160,23,.08)" }}>
            {/* Top gold accent */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,var(--vd-gold),transparent)" }} />
            {/* Sanskrit OM inside card */}
            <div style={{ position:"absolute", top:-10, right:10, fontFamily:"var(--vd-font-s)", fontSize:130, color:"var(--vd-gold)", opacity:.04, pointerEvents:"none", userSelect:"none", lineHeight:1 }}>ॐ</div>
            {/* Scan glow */}
            <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(212,160,23,.35),transparent)", animation:"vd-scan 3.8s ease-in-out infinite", pointerEvents:"none" }} />

            <div className="vd-lbl" style={{ marginBottom:22 }}>Calculation - Live Demos</div>

            {/* Main calc display — key forces re-animation on change */}
            <div key={calcStep} style={{ animation:"vd-reveal-num .42s ease both", marginBottom:22 }}>
              <div style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(26px,3vw,42px)", fontWeight:700, color:"var(--vd-cream)", letterSpacing:"-.01em", marginBottom:6, fontStyle:"italic" }}>
                {CALC_DEMOS[calcStep].q}
              </div>
              <div style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(22px,2.5vw,36px)", fontWeight:800, marginBottom:10 }} className="vd-gold-text">
                {CALC_DEMOS[calcStep].a}
              </div>
              <div style={{ fontFamily:"var(--vd-font-m)", fontSize:11, color:"var(--vd-muted)", letterSpacing:".06em" }}>{CALC_DEMOS[calcStep].hint}</div>
            </div>

            {/* Progress bar */}
            <div style={{ height:2, background:"rgba(212,160,23,.12)", borderRadius:2, marginBottom:20, overflow:"hidden" }}>
              <div key={`bar-${calcStep}`} style={{ height:"100%", background:"linear-gradient(90deg,var(--vd-gold),var(--vd-gold3))", borderRadius:2, animation:"vd-draw-line 2.4s linear both" }} />
            </div>

            {/* Method breakdown */}
            <div style={{ background:"rgba(212,160,23,.06)", border:"1px solid rgba(212,160,23,.12)", borderRadius:14, padding:"18px" }}>
              <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:9 }}>Method</div>
              <div style={{ fontFamily:"var(--vd-font-b)", fontSize:14, color:"var(--vd-cream2)", lineHeight:1.65, fontWeight:300 }}>
                {CALC_DEMOS[calcStep].method}
              </div>
            </div>

            {/* Dot navigation */}
            <div style={{ display:"flex", gap:7, marginTop:22, justifyContent:"center" }}>
              {CALC_DEMOS.map((_, i) => (
                <div key={i} onClick={() => setCalcStep(i)} style={{ width:i===calcStep?22:7, height:7, borderRadius:4, background:i===calcStep?"var(--vd-gold)":"rgba(212,160,23,.2)", transition:"all .3s ease", cursor:"pointer" }} />
              ))}
            </div>
          </div>

          {/* Float badge — top right */}
          <div style={{ position:"absolute", top:-22, right:-22, background:"linear-gradient(135deg,#2a1a00,#1a0e00)", border:"1px solid rgba(212,160,23,.3)", borderRadius:16, padding:"12px 18px", animation:"vd-float 4.2s ease-in-out infinite", boxShadow:"0 10px 32px rgba(0,0,0,.55)", zIndex:10 }}>
            <div style={{ fontFamily:"var(--vd-font-m)", fontSize:9, color:"var(--vd-gold2)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:4 }}>Age Range</div>
            <div style={{ fontFamily:"var(--vd-font-s)", fontSize:14, fontWeight:700, color:"var(--vd-cream)", fontStyle:"italic" }}>10+ · Class 5 Onwards</div>
          </div>




        </div>
      </div>
    </section>
  );
}

// ─── 16 SUTRAS SHOWCASE ──────────────────────────────────────────────────────
function SutrasShowcase() {
  const [active, setActive] = useState(0);
  const cur = SUTRAS[active];

  return (
    <section style={{ padding:"100px 0", background:"var(--vd-bg)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"65%", height:1, background:"linear-gradient(90deg,transparent,rgba(212,160,23,.35),transparent)" }} />
      <div style={{ position:"absolute", top:"10%", right:"-5%", width:"40vw", height:"40vw", borderRadius:"50%", background:"radial-gradient(circle,rgba(212,160,23,.05),transparent 70%)", pointerEvents:"none" }} />

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px" }}>
        <FadeIn>
          <div className="rsp-header-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"flex-end", marginBottom:56 }}>
            <div>
              <div className="vd-lbl" style={{ marginBottom:16 }}>The Foundation</div>
              <h2 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(28px,3.5vw,52px)", fontWeight:900, letterSpacing:"-.02em", lineHeight:1.1, color:"var(--vd-cream)" }}>
                The 16 <span className="vd-gold-text">Sacred Sutras</span>
              </h2>
            </div>
            <p style={{ color:"var(--vd-cream2)", fontSize:15, lineHeight:1.78, fontWeight:300, paddingBottom:6 }}>
              Every technique in Vedic Mathematics flows from 16 Sanskrit sutras — aphorisms describing universal mathematical truths. Each sutra is a key. Master all 16 and no calculation problem is beyond you.
            </p>
          </div>
        </FadeIn>

        <div className="rsp-vd-content" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"flex-start" }}>

          {/* Left: scrollable sutra list */}
          <FadeIn dir="left">
            <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:560, overflowY:"auto", paddingRight:6 }}>
              {SUTRAS.map((s, i) => (
                <button key={i} onClick={() => setActive(i)} className="vd-sutra-btn" style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px", background:active===i?"rgba(212,160,23,.1)":"transparent", border:`1px solid ${active===i?"rgba(212,160,23,.28)":"transparent"}`, borderRadius:13, cursor:"pointer", color:active===i?"var(--vd-cream)":"var(--vd-cream2)", transition:"all .2s ease" }}>
                  <span style={{ fontFamily:"var(--vd-font-m)", fontSize:11, color:active===i?"var(--vd-gold2)":"var(--vd-muted)", minWidth:22, letterSpacing:".06em", flexShrink:0 }}>{s.num}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"var(--vd-font-s)", fontSize:13, fontWeight:700, fontStyle:"italic", lineHeight:1.2, color:active===i?"var(--vd-cream)":"var(--vd-cream2)" }}>{s.name}</div>
                    <div style={{ fontFamily:"var(--vd-font-b)", fontSize:11, color:"var(--vd-muted)", marginTop:2, lineHeight:1.3, fontWeight:300 }}>{s.eng}</div>
                  </div>
                  {active===i && <div style={{ width:5, height:5, borderRadius:"50%", background:"var(--vd-gold)", flexShrink:0, animation:"vd-pulse-dot 2s infinite" }} />}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Right: sutra detail panel */}
          <FadeIn dir="right">
            <div key={active} style={{ background:"var(--vd-surface)", border:"1px solid rgba(212,160,23,.22)", borderRadius:24, padding:"40px", position:"relative", overflow:"hidden", animation:"vd-pop-in .38s ease both", boxShadow:"0 0 70px rgba(212,160,23,.05)", minHeight:360 }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,var(--vd-gold),transparent)" }} />
              <div style={{ position:"absolute", bottom:-10, right:0, fontFamily:"var(--vd-font-s)", fontSize:110, color:"var(--vd-gold)", opacity:.04, userSelect:"none", lineHeight:1 }}>{cur.num}</div>
              <div style={{ position:"absolute", top:10, right:20, fontFamily:"var(--vd-font-s)", fontSize:80, color:"var(--vd-gold)", opacity:.04, userSelect:"none", lineHeight:1, fontStyle:"italic" }}>ॐ</div>

              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(212,160,23,.1)", border:"1px solid rgba(212,160,23,.22)", borderRadius:9, padding:"4px 13px", marginBottom:20 }}>
                <span style={{ fontFamily:"var(--vd-font-m)", fontSize:10, fontWeight:700, color:"var(--vd-gold2)", letterSpacing:".14em" }}>SUTRA {cur.num}</span>
              </div>

              <h3 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(20px,2.3vw,30px)", fontWeight:800, fontStyle:"italic", letterSpacing:"-.01em", color:"var(--vd-cream)", marginBottom:10, lineHeight:1.25 }}>
                {cur.name}
              </h3>

              <div style={{ fontFamily:"var(--vd-font-b)", fontSize:15, fontWeight:300, color:"var(--vd-gold2)", marginBottom:26, fontStyle:"italic" }}>
                "{cur.eng}"
              </div>

              <div style={{ background:"rgba(212,160,23,.06)", border:"1px solid rgba(212,160,23,.14)", borderRadius:14, padding:"18px" }}>
                <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:9 }}>Applied In</div>
                <div style={{ fontFamily:"var(--vd-font-b)", fontSize:15, color:"var(--vd-cream2)", lineHeight:1.7, fontWeight:300 }}>{cur.use}</div>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:24 }}>
                {active > 0 && (
                  <button onClick={() => setActive(a => a-1)} style={{ flex:1, background:"rgba(212,160,23,.06)", border:"1px solid rgba(212,160,23,.14)", borderRadius:10, padding:"11px", cursor:"pointer", fontFamily:"var(--vd-font-m)", fontSize:11, color:"var(--vd-muted)", transition:"all .2s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,160,23,.32)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,160,23,.14)"; }}>
                    ← Sutra {SUTRAS[active-1].num}
                  </button>
                )}
                {active < 15 && (
                  <button onClick={() => setActive(a => a+1)} style={{ flex:1, background:"rgba(212,160,23,.06)", border:"1px solid rgba(212,160,23,.14)", borderRadius:10, padding:"11px", cursor:"pointer", fontFamily:"var(--vd-font-m)", fontSize:11, color:"var(--vd-muted)", transition:"all .2s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,160,23,.32)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,160,23,.14)"; }}>
                    Sutra {SUTRAS[active+1].num} →
                  </button>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── LEVELS SECTION ──────────────────────────────────────────────────────────
function LevelsSection() {
  const [active, setActive] = useState(0);
  const cur = LEVELS[active];

  return (
    <section style={{ padding:"100px 24px", background:"var(--vd-bg)", position:"relative" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom:52 }}>
            <div className="vd-lbl" style={{ marginBottom:16 }}>Course Structure</div>
            <h2 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(28px,4vw,54px)", fontWeight:900, letterSpacing:"-.02em", lineHeight:1.05, marginBottom:16, color:"var(--vd-cream)" }}>
              Four Levels. <span className="vd-gold-text">One Mastery.</span>
            </h2>
            <p style={{ color:"var(--vd-cream2)", fontSize:16, maxWidth:520, lineHeight:1.78, fontWeight:300 }}>
              Each level builds on the last — from core sutra mechanics to championship-speed competitive mathematics.
            </p>
          </div>
        </FadeIn>

        {/* Level tabs */}
        <FadeIn delay={0.1}>
          <div className="rsp-vd-tabs" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:32 }}>
            {LEVELS.map((lvl, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ padding:"16px", borderRadius:16, background:active===i?"rgba(212,160,23,.12)":"var(--vd-surface)", border:`1px solid ${active===i?"rgba(212,160,23,.32)":"var(--vd-border)"}`, cursor:"pointer", textAlign:"left", transition:"all .28s ease", boxShadow:active===i?"0 0 32px rgba(212,160,23,.06)":"none" }}>
                <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:active===i?"var(--vd-gold2)":"var(--vd-muted)", letterSpacing:".13em", marginBottom:7 }}>LEVEL {lvl.num}</div>
                <div style={{ fontFamily:"var(--vd-font-s)", fontSize:14, fontWeight:700, color:active===i?"var(--vd-cream)":"var(--vd-cream2)", fontStyle:"italic", lineHeight:1.25, marginBottom:5 }}>{lvl.name}</div>
                <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)" }}>{lvl.duration}</div>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Detail grid */}
        <div key={active} className="rsp-vd-content" style={{ animation:"vd-pop-in .35s ease both", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <FadeIn dir="left">
            <div style={{ background:"var(--vd-surface)", border:"1px solid rgba(212,160,23,.22)", borderRadius:24, padding:"36px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${cur.color},transparent)` }} />
              <div style={{ position:"absolute", bottom:-10, right:0, fontFamily:"var(--vd-font-s)", fontSize:100, color:"var(--vd-gold)", opacity:.04, userSelect:"none", lineHeight:1 }}>{cur.num}</div>

              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <span style={{ background:"rgba(212,160,23,.12)", border:"1px solid rgba(212,160,23,.24)", borderRadius:9, padding:"5px 13px", fontFamily:"var(--vd-font-m)", fontSize:11, fontWeight:700, color:"var(--vd-gold2)", letterSpacing:".1em" }}>LEVEL {cur.num}</span>
                <span style={{ fontFamily:"var(--vd-font-m)", fontSize:11, color:"var(--vd-muted)" }}>{cur.duration}</span>
              </div>

              <h3 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(20px,2.3vw,30px)", fontWeight:800, fontStyle:"italic", letterSpacing:"-.01em", color:"var(--vd-cream)", marginBottom:16, lineHeight:1.2 }}>{cur.name}</h3>
              <p style={{ fontSize:15, lineHeight:1.8, color:"var(--vd-cream2)", fontWeight:300, marginBottom:26 }}>{cur.desc}</p>

              <div style={{ background:"rgba(212,160,23,.07)", border:"1px solid rgba(212,160,23,.16)", borderRadius:14, padding:"22px" }}>
                <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:13 }}>Level {cur.num} Sample Problem</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:10, marginBottom:12 }}>
                  <div>
                    <div style={{ fontFamily:"var(--vd-font-s)", fontSize:26, fontWeight:700, color:"var(--vd-cream)", marginBottom:4, fontStyle:"italic" }}>{cur.demo.q}</div>
                    <div style={{ fontFamily:"var(--vd-font-s)", fontSize:22, fontWeight:800 }} className="vd-gold-text">{cur.demo.a}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)", marginBottom:4 }}>Solved in</div>
                    <div style={{ fontFamily:"var(--vd-font-d)", fontSize:20, fontWeight:800, color:"var(--vd-gold2)" }}>{cur.demo.time}</div>
                  </div>
                </div>
                <div style={{ fontFamily:"var(--vd-font-b)", fontSize:13, color:"var(--vd-muted)", fontStyle:"italic", lineHeight:1.6, fontWeight:300 }}>{cur.demo.method}</div>
              </div>
            </div>
          </FadeIn>

          <FadeIn dir="right">
            <div style={{ background:"var(--vd-surface)", border:"1px solid var(--vd-border)", borderRadius:24, padding:"36px" }}>
              <div className="vd-lbl" style={{ marginBottom:22 }}>Topics Covered</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {cur.topics.map((topic, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 15px", background:"var(--vd-s2)", border:"1px solid var(--vd-border)", borderRadius:11, animation:`vd-step-in .3s ease ${i*0.07}s both` }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:cur.color, flexShrink:0, boxShadow:`0 0 8px ${cur.color}` }} />
                    <span style={{ fontSize:14, color:"var(--vd-cream2)", fontWeight:400, lineHeight:1.4 }}>{topic}</span>
                  </div>
                ))}
              </div>
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
    <section style={{ padding:"100px 24px", background:"var(--vd-bg)", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:"linear-gradient(90deg,transparent,rgba(212,160,23,.3),transparent)" }} />
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div className="vd-lbl" style={{ justifyContent:"center", marginBottom:16 }}>What Students Gain</div>
            <h2 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(26px,3.5vw,50px)", fontWeight:900, letterSpacing:"-.02em", color:"var(--vd-cream)" }}>
              Why Vedic Maths <span className="vd-gold-text">Changes Everything</span>
            </h2>
          </div>
        </FadeIn>
        <div className="rsp-3col" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {OUTCOMES.map((o, i) => (
            <FadeIn key={i} delay={i*0.08}>
              <div className="vd-card" style={{ padding:"30px" }}>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:34 }}>{o.icon}</div>
                </div>
                <h3 style={{ fontFamily:"var(--vd-font-s)", fontSize:17, fontWeight:700, fontStyle:"italic", letterSpacing:"-.01em", marginBottom:10, color:"var(--vd-cream)" }}>{o.title}</h3>
                <p style={{ fontSize:13, lineHeight:1.78, color:"var(--vd-cream2)", fontWeight:300 }}>{o.desc}</p>
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
    <section style={{ padding:"100px 24px", background:"var(--vd-bg)", position:"relative" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div className="vd-lbl" style={{ justifyContent:"center", marginBottom:16 }}>Questions</div>
            <h2 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(26px,3vw,46px)", fontWeight:900, letterSpacing:"-.02em", fontStyle:"italic", color:"var(--vd-cream)" }}>
              Everything You Want to <span className="vd-gold-text">Know</span>
            </h2>
          </div>
        </FadeIn>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {FAQS.map((f, i) => (
            <FadeIn key={i} delay={i*0.06}>
              <div style={{ background:open===i?"var(--vd-surface)":"transparent", border:`1px solid ${open===i?"rgba(212,160,23,.26)":"var(--vd-border)"}`, borderRadius:18, overflow:"hidden", transition:"all .3s ease" }}>
                <button onClick={() => setOpen(open===i?null:i)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}>
                  <span style={{ fontFamily:"var(--vd-font-s)", fontSize:16, fontWeight:700, fontStyle:"italic", color:"var(--vd-cream)" }}>{f.q}</span>
                  <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:open===i?"rgba(212,160,23,.18)":"var(--vd-surface)", border:`1px solid ${open===i?"rgba(212,160,23,.32)":"var(--vd-border)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .25s ease", transform:open===i?"rotate(45deg)":"none", color:open===i?"var(--vd-gold2)":"var(--vd-muted)", fontSize:18, fontWeight:300 }}>+</div>
                </button>
                {open===i && (
                  <div style={{ padding:"0 24px 22px", fontSize:15, lineHeight:1.82, color:"var(--vd-cream2)", fontWeight:300, animation:"vd-pop-in .3s ease both" }}>{f.a}</div>
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
    <section id="vd-begin" style={{ padding:"80px 24px", background:"var(--vd-bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div className="rsp-cta-inner" style={{ position:"relative", borderRadius:28, overflow:"hidden", background:"linear-gradient(135deg,#1a1200 0%,#0e0900 50%,#080600 100%)", border:"1px solid rgba(212,160,23,.22)", padding:"72px 64px", boxShadow:"0 44px 110px rgba(0,0,0,.5)" }}>
            <div style={{ position:"absolute", top:-80, left:-80, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(212,160,23,.2),transparent 70%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:-60, right:-60, width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(212,160,23,.09),transparent 70%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(212,160,23,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.025) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />
            <div style={{ position:"absolute", right:"5%", top:"50%", transform:"translateY(-50%)", fontFamily:"var(--vd-font-s)", fontSize:200, color:"var(--vd-gold)", opacity:.04, userSelect:"none", lineHeight:1 }}>ॐ</div>

            <div style={{ position:"relative", textAlign:"center", maxWidth:640, margin:"0 auto" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:"rgba(212,160,23,.1)", border:"1px solid rgba(212,160,23,.22)", borderRadius:100, padding:"7px 18px", marginBottom:28 }}>
                <span style={{ fontFamily:"var(--vd-font-s)", fontSize:15, color:"var(--vd-gold2)", fontStyle:"italic" }}>अथर्ववेद</span>
                <span style={{ fontFamily:"var(--vd-font-m)", fontSize:10, color:"var(--vd-muted)", letterSpacing:".1em" }}>16 SUTRAS AWAIT</span>
              </div>
              <h2 style={{ fontFamily:"var(--vd-font-s)", fontSize:"clamp(26px,4.5vw,56px)", fontWeight:900, fontStyle:"italic", letterSpacing:"-.02em", lineHeight:1.0, marginBottom:20, color:"var(--vd-cream)" }}>
                Start the Journey<br /><span className="vd-shimmer-gold">into Ancient Speed.</span>
              </h2>
              <p style={{ fontSize:17, color:"rgba(245,237,216,.56)", lineHeight:1.78, marginBottom:44, fontWeight:300 }}>
                One free demo class. Experience the sutra method first-hand and understand why students describe their first session as a genuine revelation.
              </p>
              <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:32 }}>
                <a href="https://wa.me/919718325064" className="vd-btn-gold" style={{ fontSize:15, padding:"15px 32px", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Get in Touch
                </a>
                <a href="tel:+919718325064" className="vd-btn-outline" style={{ borderColor:"rgba(212,160,23,.25)", color:"rgba(245,237,216,.75)", fontSize:15, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  Call Us
                </a>
              </div>
              <div style={{ display:"flex", gap:28, justifyContent:"center", flexWrap:"wrap" }}>
                {["Free trial class","Ages 10 & above","All three branches"].map(t => (
                  <span key={t} style={{ fontFamily:"var(--vd-font-m)", fontSize:11, color:"rgba(212,160,23,.38)", letterSpacing:".06em" }}>✓ {t}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function VedicMathsCourse() {
  return (
    <div className="vd-page">
      <VedicStyles />
      <Hero />
      <MarqueeBar />
      <div style={{ padding:"60px 24px 0", background:"var(--vd-bg)" }}>
        <StatsBar />
      </div>
      <SutrasShowcase />
      <LevelsSection />
      <Outcomes />
      <FAQSection />
      <CTABanner />
    </div>
  );
}
