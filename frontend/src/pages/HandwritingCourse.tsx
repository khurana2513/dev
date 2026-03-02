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

function useCounter(end: number, duration = 1600, active = false) {
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

function FadeIn({
  children, className = "", delay = 0, dir = "up",
}: {
  children: React.ReactNode; className?: string; delay?: number;
  dir?: "up" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView();
  const off: Record<string, string> = {
    up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none",
  };
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : off[dir],
      transition: `opacity 0.7s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.7s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>{children}</div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
function HandwritingStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

      .hw-page {
        --hw-bg:      #F7F4EF;
        --hw-bg2:     #EDEAE2;
        --hw-bg3:     #E5E0D5;
        --hw-dark:    #0C0B09;
        --hw-dark2:   #171612;
        --hw-dark3:   #221F1A;
        --hw-surface: #FFFFFF;
        --hw-surfaced:#1C1B17;
        --hw-border:  rgba(12,11,9,0.1);
        --hw-bdark:   rgba(255,255,255,0.07);
        --hw-ink:     #28261F;
        --hw-ink2:    #58564F;
        --hw-teal:    #0A7A6A;
        --hw-teal2:   #0C9A80;
        --hw-teal3:   #3EBBA6;
        --hw-tealfade:rgba(10,122,106,0.1);
        --hw-tealfade2:rgba(10,122,106,0.2);
        --hw-red-rule:rgba(210,48,48,0.07);
        --hw-cream:   #FDF9F2;
        --hw-font-s:  'Cormorant Garamond', Georgia, serif;
        --hw-font-d:  'Playfair Display', Georgia, serif;
        --hw-font-b:  'DM Sans', sans-serif;
        --hw-font-m:  'JetBrains Mono', monospace;
        background: var(--hw-bg);
        color: var(--hw-ink);
        font-family: var(--hw-font-b);
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }
      .hw-page ::selection { background: rgba(10,122,106,.18); }
      .hw-page ::-webkit-scrollbar { width: 3px; }
      .hw-page ::-webkit-scrollbar-thumb { background: var(--hw-teal); border-radius: 2px; }

      @keyframes hw-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes hw-float-rev { 0%,100%{transform:translateY(0)} 50%{transform:translateY(9px)} }
      @keyframes hw-shimmer   { 0%{background-position:-400% center} 100%{background-position:400% center} }
      @keyframes hw-word-in   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      @keyframes hw-pop-in    { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
      @keyframes hw-step-in   { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
      @keyframes hw-marquee   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      @keyframes hw-rule-in   { from{transform:scaleX(0);transform-origin:left} to{transform:scaleX(1)} }
      @keyframes hw-bar-fill  { from{width:0} to{width:var(--hw-bar-w)} }
      @keyframes hw-draw-nib  { from{stroke-dashoffset:220} to{stroke-dashoffset:0} }
      @keyframes hw-reveal    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      @keyframes hw-pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(10,122,106,.5)} 70%{box-shadow:0 0 0 8px rgba(10,122,106,0)} }
      @keyframes hw-scan      { 0%{top:0%;opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{top:100%;opacity:0} }
      @keyframes hw-blink     { 0%,100%{opacity:1} 50%{opacity:0} }

      .hw-teal-text {
        background: linear-gradient(135deg, var(--hw-teal) 0%, var(--hw-teal3) 50%, var(--hw-teal2) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .hw-shimmer-teal {
        background: linear-gradient(90deg, var(--hw-ink2) 0%, var(--hw-ink) 25%, var(--hw-teal2) 50%, var(--hw-ink) 75%, var(--hw-ink2) 100%);
        background-size: 400% auto;
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        animation: hw-shimmer 5s linear infinite;
      }
      .hw-shimmer-light {
        background: linear-gradient(90deg, rgba(255,255,255,.5) 0%, white 25%, var(--hw-teal3) 50%, white 75%, rgba(255,255,255,.5) 100%);
        background-size: 400% auto;
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        animation: hw-shimmer 5s linear infinite;
      }
      .hw-lbl {
        font-family: var(--hw-font-m); font-size: 10px; font-weight: 600;
        letter-spacing: .16em; text-transform: uppercase; color: var(--hw-teal);
        display: inline-flex; align-items: center; gap: 8px;
      }
      .hw-lbl::before { content: ''; display: block; width: 18px; height: 1px; background: var(--hw-teal); }
      .hw-lbl-d {
        font-family: var(--hw-font-m); font-size: 10px; font-weight: 600;
        letter-spacing: .16em; text-transform: uppercase; color: var(--hw-teal3);
        display: inline-flex; align-items: center; gap: 8px;
      }
      .hw-lbl-d::before { content: ''; display: block; width: 18px; height: 1px; background: var(--hw-teal3); }
      .hw-btn-teal {
        background: linear-gradient(135deg, var(--hw-teal), #054d40);
        color: #fff; border: none; padding: 13px 26px; border-radius: 10px;
        font-family: var(--hw-font-b); font-size: 15px; font-weight: 600;
        cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
        text-decoration: none;
      }
      .hw-btn-teal::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.14),transparent); opacity:0; transition:opacity .25s; }
      .hw-btn-teal:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(10,122,106,.35); }
      .hw-btn-teal:hover::after { opacity: 1; }
      .hw-btn-outline {
        background: transparent; color: var(--hw-ink2); border: 1px solid var(--hw-border);
        padding: 13px 24px; border-radius: 10px; font-family: var(--hw-font-b); font-size: 15px;
        font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; text-decoration: none;
      }
      .hw-btn-outline:hover { border-color: rgba(10,122,106,.4); background: rgba(10,122,106,.06); color: var(--hw-ink); transform: translateY(-2px); }
      .hw-btn-ghost-d {
        background: transparent; color: rgba(255,255,255,.65); border: 1px solid rgba(255,255,255,.13);
        padding: 13px 24px; border-radius: 10px; font-family: var(--hw-font-b); font-size: 15px;
        font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; text-decoration: none;
      }
      .hw-btn-ghost-d:hover { border-color: rgba(10,153,128,.45); background: rgba(10,122,106,.12); color: white; transform: translateY(-2px); }
      .hw-card-l {
        background: var(--hw-surface); border: 1px solid var(--hw-border); border-radius: 18px;
        transition: all .35s cubic-bezier(.4,0,.2,1);
      }
      .hw-card-l:hover { border-color: rgba(10,122,106,.26); transform: translateY(-5px); box-shadow: 0 20px 56px rgba(0,0,0,.09), 0 0 28px rgba(10,122,106,.04); }
      .hw-card-d {
        background: var(--hw-surfaced); border: 1px solid rgba(255,255,255,.06); border-radius: 18px;
        transition: all .35s cubic-bezier(.4,0,.2,1);
      }
      .hw-card-d:hover { border-color: rgba(10,153,128,.28); transform: translateY(-5px); box-shadow: 0 20px 56px rgba(0,0,0,.3); }
      .hw-ruled {
        background-image: repeating-linear-gradient(transparent, transparent 31px, rgba(10,122,106,.09) 31px, rgba(10,122,106,.09) 32px);
        background-size: 100% 32px;
      }
      .hw-paper {
        background: var(--hw-cream);
        background-image:
          radial-gradient(ellipse at 20% 30%, rgba(10,122,106,.03) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 70%, rgba(28,46,74,.03) 0%, transparent 55%);
      }
    `}</style>
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ENGLISH_CURRICULUM = [
  { week:"Weeks 1–2",   topic:"Letter Formation Fundamentals",   detail:"Correct grip, posture, baseline alignment, and uniform sizing. Building the muscle-memory foundation before any speed." },
  { week:"Weeks 3–4",   topic:"Lowercase Fluency",               detail:"All 26 lowercase letters. Consistent stroke direction, entry and exit strokes, letter-spacing principles." },
  { week:"Weeks 5–6",   topic:"Uppercase Mastery",               detail:"All 26 uppercase with correct proportions. Mixed case writing and beginning sentence-level composition." },
  { week:"Weeks 7–8",   topic:"Joined Writing & Word Flow",      detail:"Cursive joining techniques, word-level fluency, eliminating pen lifts, building a natural writing rhythm." },
  { week:"Weeks 9–10",  topic:"Speed & Legibility Balance",      detail:"Increasing pace while maintaining consistency. Timed paragraphs, self-assessment, targeted correction." },
  { week:"Weeks 11–12", topic:"Calligraphy & Final Polish",      detail:"Decorative letterforms, greeting card writing, creative calligraphy strokes. Presentation handwriting for exams." },
];
const HINDI_CURRICULUM = [
  { week:"Weeks 1–2",   topic:"मात्राएँ और वर्णमाला",           detail:"Devanagari script foundations. Correct stroke sequence for all vowels and consonants. Shirorekha (header line) mastery." },
  { week:"Weeks 3–4",   topic:"व्यंजन — पूर्ण अक्षर",           detail:"All 36 consonants in their complete form. Proportional sizing, uniform spacing, balanced stroke weight." },
  { week:"Weeks 5–6",   topic:"संयुक्त अक्षर",                  detail:"Conjunct consonants — the most challenging aspect of Hindi handwriting. Systematic, step-by-step practice." },
  { week:"Weeks 7–8",   topic:"शब्द और वाक्य लेखन",             detail:"Word-level writing. Proper spacing between words, line consistency, accurate matra placement." },
  { week:"Weeks 9–10",  topic:"गति और सुंदरता",                 detail:"Speed writing exercises while maintaining full legibility. Hindi paragraph writing, dictation practice." },
  { week:"Weeks 11–12", topic:"सुलेख और कैलिग्राफी",            detail:"Decorative Devanagari calligraphy, artistic letterforms, certificate-quality presentation writing." },
];
const BEFORE_AFTER = [
  { label:"Letter Size",    pct:88, before:"Inconsistent — varies 2× within same word",      after:"Uniform, proportional to line height throughout" },
  { label:"Baseline",       pct:91, before:"Words drift above or below the line",             after:"Consistent alignment across full sentences" },
  { label:"Spacing",        pct:85, before:"Random gaps between letters and words",           after:"Even, deliberate spacing as a permanent habit" },
  { label:"Stroke Quality", pct:94, before:"Shaky, uneven pressure, hesitation visible",      after:"Confident, smooth, consistent weight" },
  { label:"Speed",          pct:80, before:"Either slow-careful or fast-illegible",           after:"Balanced — readable at full comfortable pace" },
];
const OUTCOMES = [
  { icon:"✍️", title:"Legibility in Weeks",     desc:"Visible improvement in letter consistency and baseline alignment within the first 3 weeks — before any habit changes have fully taken root." },
  { icon:"⚡", title:"Speed Without Sacrifice",  desc:"The course trains the exact balance between speed and clarity that matters in examinations — the skill that separates good handwriting from great." },
  { icon:"🔤", title:"Bilingual Mastery",        desc:"English and Hindi tracks. Both run on the same stroke-first methodology, applied to each script's unique structural requirements." },
  { icon:"🎨", title:"Creative Calligraphy",     desc:"The final module introduces decorative writing — for greetings, certificates, and the pure joy of beautiful, intentional letterforms." },
  { icon:"🧠", title:"Fine Motor Improvement",   desc:"Improving handwriting measurably strengthens the neural pathways used in drawing, instrument playing, and spatial reasoning tasks." },
  { icon:"📜", title:"Certificate on Completion",desc:"Students who complete the 3-month course receive a Talent Hub certificate — a formal, documented record of the improvement journey." },
];
const FAQS = [
  { q:"Is this course for any age?", a:"Yes. We offer it for children from Class 1 upwards and for adults. The methodology adapts by age — younger students focus on formation fundamentals, older students on speed and presentation quality." },
  { q:"Can a student take both English and Hindi tracks?", a:"Absolutely. Many students enroll in both. The courses run simultaneously or sequentially — completely independently, no prerequisite for either track." },
  { q:"How long before improvement is visible?", a:"Most students and parents notice visible change in letter consistency and baseline within 3–4 weeks. The transformation accelerates significantly by the 6-week mark." },
  { q:"Is there any practice at home?", a:"Yes — 10–15 minutes of daily practice is part of the course structure. We provide guided practice sheets for each week, designed to reinforce exactly what was taught in class." },
  { q:"What is the creative calligraphy module?", a:"The final module introduces decorative letterforms — artistic variations of the same letters students have practised throughout the course. It adds creative depth and teaches students to take genuine pride in their writing." },
];
const MARQUEE_ITEMS = [
  "English & Hindi", "✦", "All Ages", "✦", "Class 1 Onwards", "✦",
  "3-Month Programme", "✦", "Visible Results in 3 Weeks", "✦", "Fine Motor Precision", "✦",
  "Cursive Mastery", "✦", "Devanagari Script", "✦", "Exam Speed Advantage", "✦",
  "Creative Calligraphy", "✦", "Certificate on Completion", "✦",
];
const WORD_SAMPLES_EN = ["Beautiful", "Excellence", "Precision", "Confidence"];
const WORD_SAMPLES_HI = ["सुंदर", "उत्कृष्टता", "स्पष्टता", "विश्वास"];

// ─── MARQUEE BAR ──────────────────────────────────────────────────────────────
function MarqueeBar() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ background:"rgba(10,122,106,.07)", borderTop:"1px solid rgba(10,122,106,.14)", borderBottom:"1px solid rgba(10,122,106,.14)", overflow:"hidden", padding:"13px 0" }}>
      <div style={{ display:"flex", gap:28, animation:"hw-marquee 30s linear infinite", width:"max-content" }}>
        {items.map((t, i) => (
          <span key={i} style={{
            fontFamily: "var(--hw-font-m)", fontSize:11, letterSpacing:".13em",
            color: t==="✦" ? "rgba(10,122,106,.35)" : "var(--hw-ink2)",
            whiteSpace:"nowrap", fontWeight:t==="✦"?400:600,
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatCell({ end, suffix="", label, last=false }: { end:number; suffix?:string; label:string; last?:boolean }) {
  const { ref, inView } = useInView();
  const count = useCounter(end, 1400, inView);
  return (
    <div ref={ref} style={{ textAlign:"center", padding:"26px 20px", borderRight:last?"none":"1px solid var(--hw-border)" }}>
      <div style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(26px,3.5vw,40px)", fontWeight:700, letterSpacing:"-.02em", lineHeight:1 }} className="hw-teal-text">
        {count}{suffix}
      </div>
      <div style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:"var(--hw-ink2)", letterSpacing:".13em", textTransform:"uppercase", marginTop:7 }}>{label}</div>
    </div>
  );
}
function StatsBar() {
  return (
    <div style={{ background:"var(--hw-surface)", border:"1px solid var(--hw-border)", borderRadius:18, display:"grid", gridTemplateColumns:"repeat(4,1fr)", overflow:"hidden" }}>
      <StatCell end={12}  suffix=" wks" label="Programme Length" />
      <StatCell end={2}   label="Script Languages" />
      <StatCell end={3}   suffix=" wks" label="Visible Results In" />
      <StatCell end={500} suffix="+" label="Students Improved" last />
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % WORD_SAMPLES_EN.length), 2800);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setShowCursor(c => !c), 520);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", overflow:"hidden", background:"var(--hw-bg)" }}>
      {/* Ruled line overlay */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(transparent, transparent 47px, rgba(10,122,106,.07) 47px, rgba(10,122,106,.07) 48px)", backgroundSize:"100% 48px", pointerEvents:"none" }} />
      {/* Margin rule */}
      <div style={{ position:"absolute", top:0, bottom:0, left:"20%", width:1, background:"rgba(210,48,48,.07)", pointerEvents:"none" }} />
      {/* Soft teal glow */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 55% at 70% 50%, rgba(10,122,106,.05) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Floating ink particles */}
      {[
        { w:6,  h:6,  top:"18%", left:"6%",   c:"rgba(10,122,106,.25)", d:"0s",   dur:"5s" },
        { w:4,  h:4,  top:"72%", left:"4%",   c:"rgba(60,187,166,.2)",  d:"1.6s", dur:"7s" },
        { w:8,  h:8,  top:"25%", right:"6%",  c:"rgba(10,122,106,.18)", d:"0.8s", dur:"6s" },
        { w:5,  h:5,  top:"80%", right:"10%", c:"rgba(60,187,166,.22)", d:"2.2s", dur:"4.5s" },
      ].map((p, i) => (
        <div key={i} style={{ position:"absolute", width:p.w, height:p.h, borderRadius:"50%", background:p.c, top:p.top, left:(p as any).left||"auto", right:(p as any).right||"auto", animation:`hw-float ${p.dur} ease-in-out infinite ${p.d}`, pointerEvents:"none" }} />
      ))}

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"80px 24px", width:"100%", display:"grid", gridTemplateColumns:"52% 48%", gap:56, alignItems:"center" }}>

        {/* ── LEFT ── */}
        <div>
          <div style={{ opacity:loaded?1:0, transform:loaded?"none":"translateY(14px)", transition:"all .5s ease .08s", display:"inline-flex", alignItems:"center", gap:8, background:"rgba(10,122,106,.09)", border:"1px solid rgba(10,122,106,.18)", borderRadius:100, padding:"7px 16px", marginBottom:30 }}>
            <span style={{ fontFamily:"var(--hw-font-m)", fontSize:11, color:"var(--hw-teal)", letterSpacing:".06em" }}>English & Hindi · 3 Months · All Ages · Class 1+</span>
          </div>

          <h1 style={{ fontFamily:"var(--hw-font-s)", fontWeight:700, lineHeight:1.0, letterSpacing:"-.01em", marginBottom:16, opacity:loaded?1:0, transform:loaded?"none":"translateY(22px)", transition:"all .72s cubic-bezier(.4,0,.2,1) .18s" }}>
            <span style={{ display:"block", fontSize:"clamp(44px,5.5vw,76px)", color:"var(--hw-ink)", fontStyle:"italic" }}>Precision.</span>
            <span style={{ display:"block", fontSize:"clamp(44px,5.5vw,76px)", fontWeight:700 }} className="hw-teal-text">Stroke.</span>
            <span style={{ display:"block", fontSize:"clamp(44px,5.5vw,76px)", color:"var(--hw-ink)", fontStyle:"italic" }}>Rhythm.</span>
          </h1>

          <div style={{ width:60, height:2, background:"linear-gradient(90deg,var(--hw-teal),transparent)", borderRadius:2, marginBottom:24, opacity:loaded?1:0, transition:"opacity .7s ease .48s" }} />

          <p style={{ fontSize:17, lineHeight:1.82, color:"var(--hw-ink2)", maxWidth:460, marginBottom:36, fontWeight:300, opacity:loaded?1:0, transform:loaded?"none":"translateY(14px)", transition:"all .7s ease .3s" }}>
            Handwriting is not just penmanship — it's fine motor precision, cognitive rhythm, and the first impression every student leaves on every page. In 12 weeks, we rebuild it from the ground up.
          </p>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", opacity:loaded?1:0, transition:"opacity .7s ease .42s" }}>
            <button className="hw-btn-teal">Enroll in Handwriting →</button>
            <button className="hw-btn-outline">Book Free Trial</button>
          </div>

          <div style={{ display:"flex", gap:30, marginTop:40, paddingTop:30, borderTop:"1px solid rgba(12,11,9,.1)", opacity:loaded?1:0, transition:"opacity .8s ease .55s" }}>
            {[["12","Weeks"],["2","Languages"],["3","Weeks to Visible Change"],["All","Ages, Class 1+"]].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontFamily:"var(--hw-font-s)", fontSize:26, fontWeight:700, color:"var(--hw-ink)" }}>{v}</div>
                <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"var(--hw-ink2)", letterSpacing:".1em", textTransform:"uppercase", marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — writing showcase card ── */}
        <div style={{ opacity:loaded?1:0, transform:loaded?"none":"translateX(32px)", transition:"all .9s cubic-bezier(.4,0,.2,1) .28s", position:"relative" }}>
          <div className="hw-paper hw-ruled" style={{ borderRadius:26, padding:"36px", position:"relative", overflow:"hidden", border:"1px solid rgba(12,11,9,.1)", boxShadow:"0 28px 80px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)" }}>
            {/* Paper corner fold decoration */}
            <div style={{ position:"absolute", top:14, right:14, fontFamily:"var(--hw-font-m)", fontSize:9, color:"rgba(10,122,106,.35)", letterSpacing:".1em" }}>TALENT HUB · HANDWRITING</div>
            {/* Subtle left binding shadow */}
            <div style={{ position:"absolute", top:0, left:0, bottom:0, width:28, background:"linear-gradient(90deg,rgba(0,0,0,.04),transparent)", borderRight:"1px solid rgba(12,11,9,.06)", pointerEvents:"none" }} />
            {/* Scan line */}
            <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(10,122,106,.25),transparent)", animation:"hw-scan 4s ease-in-out infinite", pointerEvents:"none" }} />

            <div className="hw-lbl" style={{ marginBottom:22 }}>Writing Progress Demo</div>

            {/* Before */}
            <div style={{ marginBottom:26 }}>
              <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"rgba(12,11,9,.3)", letterSpacing:".14em", textTransform:"uppercase", marginBottom:9 }}>Before — Week 1</div>
              <div style={{ fontFamily:"'Courier New',monospace", fontSize:"clamp(22px,2.8vw,32px)", color:"rgba(12,11,9,.22)", letterSpacing:".1em", lineHeight:2.2, paddingBottom:2, borderBottom:"1px solid rgba(10,122,106,.1)", filter:"blur(.4px)" }}>
                {WORD_SAMPLES_EN[wordIdx]}
              </div>
            </div>

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:"rgba(10,122,106,.15)" }} />
              <span style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:"var(--hw-teal)", letterSpacing:".12em", whiteSpace:"nowrap" }}>12 WEEKS LATER →</span>
              <div style={{ flex:1, height:1, background:"rgba(10,122,106,.15)" }} />
            </div>

            {/* After — polished serif */}
            <div style={{ marginBottom:22 }}>
              <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"var(--hw-teal)", letterSpacing:".14em", textTransform:"uppercase", marginBottom:9 }}>After — Week 12</div>
              <div key={wordIdx} style={{ display:"flex", alignItems:"baseline", gap:0, lineHeight:2.1, paddingBottom:2, borderBottom:"2px solid rgba(10,122,106,.22)", animation:"hw-word-in .4s ease both" }}>
                <span style={{ fontFamily:"var(--hw-font-s)", fontStyle:"italic", fontWeight:600, fontSize:"clamp(26px,3.2vw,40px)", color:"var(--hw-ink)", letterSpacing:".02em" }}>
                  {WORD_SAMPLES_EN[wordIdx]}
                </span>
                <span style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(24px,2.8vw,36px)", color:"var(--hw-teal2)", opacity:showCursor?1:0, transition:"opacity .1s", marginLeft:1 }}>|</span>
              </div>
            </div>

            {/* Hindi row */}
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"rgba(10,122,106,.06)", borderRadius:12, border:"1px solid rgba(10,122,106,.12)" }}>
              <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"var(--hw-teal)", letterSpacing:".1em", textTransform:"uppercase", writingMode:"vertical-rl", transform:"rotate(180deg)", flexShrink:0, lineHeight:1 }}>हिंदी</div>
              <div key={`h${wordIdx}`} style={{ fontFamily:"var(--hw-font-s)", fontStyle:"italic", fontWeight:600, fontSize:"clamp(20px,2.5vw,30px)", color:"var(--hw-ink)", animation:"hw-word-in .4s ease .12s both", opacity:0 }}>
                {WORD_SAMPLES_HI[wordIdx]}
              </div>
            </div>

            {/* Word dots */}
            <div style={{ display:"flex", gap:6, marginTop:20, justifyContent:"center" }}>
              {WORD_SAMPLES_EN.map((_, i) => (
                <div key={i} style={{ width:i===wordIdx?20:6, height:6, borderRadius:3, background:i===wordIdx?"var(--hw-teal)":"rgba(10,122,106,.2)", transition:"all .3s ease" }} />
              ))}
            </div>
          </div>

          {/* Float badge — top right */}
          <div style={{ position:"absolute", top:-18, right:-18, background:"var(--hw-teal)", borderRadius:14, padding:"10px 16px", animation:"hw-float 4s ease-in-out infinite", boxShadow:"0 8px 28px rgba(10,122,106,.3)", zIndex:10 }}>
            <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"rgba(255,255,255,.7)", letterSpacing:".1em", textTransform:"uppercase" }}>Duration</div>
            <div style={{ fontFamily:"var(--hw-font-d)", fontSize:14, fontWeight:700, color:"white" }}>3 Months</div>
          </div>

          {/* Float badge — bottom left */}
          <div style={{ position:"absolute", bottom:64, left:-24, background:"var(--hw-dark2)", backdropFilter:"blur(16px)", border:"1px solid rgba(10,153,128,.2)", borderRadius:14, padding:"12px 16px", animation:"hw-float-rev 5.2s ease-in-out infinite 1.2s", boxShadow:"0 8px 28px rgba(0,0,0,.22)", zIndex:10 }}>
            <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"var(--hw-teal3)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:4 }}>Visible Change</div>
            <div style={{ fontFamily:"var(--hw-font-d)", fontSize:14, fontWeight:700, color:"white" }}>Within 3 Weeks</div>
          </div>

          {/* Float badge — bottom right */}
          <div style={{ position:"absolute", bottom:-14, right:20, background:"rgba(10,122,106,.1)", border:"1px solid rgba(10,122,106,.22)", backdropFilter:"blur(12px)", borderRadius:12, padding:"9px 14px", animation:"hw-float 6s ease-in-out infinite 0.6s", zIndex:10 }}>
            <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"var(--hw-teal2)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:3 }}>Tracks Available</div>
            <div style={{ fontFamily:"var(--hw-font-d)", fontSize:13, fontWeight:700, color:"var(--hw-ink)" }}>English + हिंदी</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BILINGUAL CURRICULUM TIMELINE ───────────────────────────────────────────
function BilingualTracks() {
  const [track, setTrack] = useState<"english"|"hindi">("english");
  const curriculum = track === "english" ? ENGLISH_CURRICULUM : HINDI_CURRICULUM;

  return (
    <section style={{ padding:"100px 24px", background:"var(--hw-dark)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"55%", height:1, background:"linear-gradient(90deg,transparent,rgba(10,153,128,.35),transparent)" }} />
      {/* Ruled lines on dark */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(transparent, transparent 47px, rgba(10,122,106,.04) 47px, rgba(10,122,106,.04) 48px)", backgroundSize:"100% 48px", pointerEvents:"none" }} />
      {/* Margin rule */}
      <div style={{ position:"absolute", top:0, bottom:0, left:"6%", width:1, background:"rgba(200,40,40,.08)", pointerEvents:"none" }} />

      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"flex-end", marginBottom:52 }}>
            <div>
              <div className="hw-lbl-d" style={{ marginBottom:16 }}>Course Structure</div>
              <h2 style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(28px,3.5vw,52px)", fontWeight:700, letterSpacing:"-.02em", lineHeight:1.1, color:"white", fontStyle:"italic" }}>
                The <span className="hw-teal-text">12-Week</span><br />Journey
              </h2>
            </div>
            <p style={{ color:"rgba(255,255,255,.4)", fontSize:15, lineHeight:1.78, fontWeight:300 }}>
              Both tracks follow the same stroke-first methodology — beginning with formation mechanics, progressing through fluency, and completing with calligraphic expression.
            </p>
          </div>
        </FadeIn>

        {/* Track toggle */}
        <FadeIn delay={0.1}>
          <div style={{ display:"flex", gap:14, marginBottom:44, flexWrap:"wrap" }}>
            {(["english","hindi"] as const).map(t => (
              <button key={t} onClick={() => setTrack(t)} style={{ padding:"14px 26px", borderRadius:14, border:`1px solid ${track===t?"rgba(10,153,128,.38)":"rgba(255,255,255,.08)"}`, background:track===t?"rgba(10,122,106,.14)":"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"all .25s ease", boxShadow:track===t?"0 0 28px rgba(10,122,106,.06)":"none" }}>
                <span style={{ fontFamily:"var(--hw-font-s)", fontSize:22, fontWeight:700, color:track===t?"var(--hw-teal3)":"rgba(255,255,255,.4)", fontStyle:"italic" }}>{t==="english"?"Aa":"अ"}</span>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontFamily:"var(--hw-font-d)", fontSize:15, fontWeight:700, color:track===t?"white":"rgba(255,255,255,.5)" }}>{t==="english"?"English Track":"हिंदी ट्रैक"}</div>
                  <div style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:track===t?"var(--hw-teal3)":"rgba(255,255,255,.25)", letterSpacing:".06em" }}>{t==="english"?"Roman script · Cursive · Calligraphy":"Devanagari script · संयुक्त · सुलेख"}</div>
                </div>
                {track===t && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--hw-teal3)", animation:"hw-pulse-dot 2s infinite", flexShrink:0 }} />}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Timeline */}
        <div key={track} style={{ position:"relative" }}>
          <div style={{ position:"absolute", left:20, top:0, bottom:0, width:1, background:"rgba(10,153,128,.18)" }} />
          <div style={{ display:"flex", flexDirection:"column" }}>
            {curriculum.map((item, i) => (
              <FadeIn key={i} delay={i*0.07}>
                <div style={{ display:"grid", gridTemplateColumns:"170px 1fr", gap:24, padding:"20px 0 20px 54px", position:"relative", borderBottom:i<curriculum.length-1?"1px solid rgba(255,255,255,.04)":"none", cursor:"default", animation:`hw-step-in .35s ease ${i*0.07}s both` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(10,122,106,.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                  {/* Timeline dot */}
                  <div style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", width:9, height:9, borderRadius:"50%", background:i<2?"var(--hw-teal2)":i<4?"rgba(10,153,128,.5)":"rgba(10,153,128,.22)", border:"1px solid rgba(10,153,128,.3)", boxShadow:i<2?"0 0 10px rgba(10,153,128,.4)":"none", transition:"all .2s ease" }} />
                  {/* Milestone badge for final week */}
                  {i===5 && <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", fontFamily:"var(--hw-font-m)", fontSize:9, color:"var(--hw-teal3)", letterSpacing:".1em", border:"1px solid rgba(10,153,128,.25)", borderRadius:8, padding:"4px 9px" }}>CERTIFICATE →</div>}

                  <div style={{ fontFamily:"var(--hw-font-m)", fontSize:11, fontWeight:600, color:"rgba(10,153,128,.65)", letterSpacing:".05em", paddingTop:2 }}>{item.week}</div>
                  <div>
                    <div style={{ fontFamily:"var(--hw-font-d)", fontSize:16, fontWeight:700, color:"white", marginBottom:5 }}>{item.topic}</div>
                    <div style={{ fontFamily:"var(--hw-font-b)", fontSize:14, color:"rgba(255,255,255,.38)", lineHeight:1.62, fontWeight:300 }}>{item.detail}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BEFORE / AFTER ───────────────────────────────────────────────────────────
function BeforeAfter() {
  return (
    <section style={{ padding:"100px 24px", background:"var(--hw-bg2)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div className="hw-lbl" style={{ justifyContent:"center", marginBottom:16 }}>Measurable Change</div>
            <h2 style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(28px,3.5vw,48px)", fontWeight:700, letterSpacing:"-.02em", fontStyle:"italic", color:"var(--hw-ink)" }}>
              What Actually <span className="hw-teal-text">Improves</span>
            </h2>
          </div>
        </FadeIn>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* Header row */}
          <div style={{ display:"grid", gridTemplateColumns:"190px 1fr 1fr 90px", gap:20, padding:"0 20px 12px", borderBottom:"2px solid rgba(12,11,9,.1)" }}>
            <span style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:"var(--hw-ink2)", letterSpacing:".12em", textTransform:"uppercase" }}>Aspect</span>
            <span style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:"rgba(12,11,9,.3)", letterSpacing:".12em", textTransform:"uppercase" }}>Before</span>
            <span style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:"var(--hw-teal)", letterSpacing:".12em", textTransform:"uppercase" }}>After 12 Weeks</span>
            <span style={{ fontFamily:"var(--hw-font-m)", fontSize:10, color:"rgba(12,11,9,.3)", letterSpacing:".12em", textTransform:"uppercase", textAlign:"right" }}>Match</span>
          </div>

          {BEFORE_AFTER.map((row, i) => (
            <FadeIn key={i} delay={i*0.08}>
              <div className="hw-card-l" style={{ display:"grid", gridTemplateColumns:"190px 1fr 1fr 90px", gap:20, padding:"18px 20px", alignItems:"center" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(10,122,106,.22)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--hw-border)"; }}>
                <div style={{ fontFamily:"var(--hw-font-d)", fontSize:14, fontWeight:700, color:"var(--hw-ink)" }}>{row.label}</div>
                <div style={{ fontSize:14, color:"rgba(12,11,9,.4)", lineHeight:1.6, fontStyle:"italic" }}>{row.before}</div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:14, color:"var(--hw-ink)", lineHeight:1.6 }}>
                  <span style={{ color:"var(--hw-teal)", fontSize:11, marginTop:3, flexShrink:0 }}>✓</span>{row.after}
                </div>
                {/* Progress bar */}
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"var(--hw-font-m)", fontSize:11, color:"var(--hw-teal)", fontWeight:600, marginBottom:5 }}>{row.pct}%</div>
                  <div style={{ height:4, background:"rgba(10,122,106,.12)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,var(--hw-teal),var(--hw-teal3))", width:`${row.pct}%`, transition:"width 1.2s ease" }} />
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── OUTCOMES ─────────────────────────────────────────────────────────────────
function Outcomes() {
  return (
    <section style={{ padding:"100px 24px", background:"var(--hw-dark2)", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"55%", height:1, background:"linear-gradient(90deg,transparent,rgba(10,153,128,.28),transparent)" }} />
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:52, flexWrap:"wrap", gap:20 }}>
            <div>
              <div className="hw-lbl-d" style={{ marginBottom:16 }}>Outcomes</div>
              <h2 style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(28px,3.5vw,50px)", fontWeight:700, letterSpacing:"-.02em", lineHeight:1.1, color:"white", fontStyle:"italic" }}>
                Beyond Better <span className="hw-teal-text">Handwriting</span>
              </h2>
            </div>
            <p style={{ color:"rgba(255,255,255,.32)", fontSize:15, maxWidth:300, lineHeight:1.72, fontWeight:300 }}>
              The benefits extend well past the pen — to cognition, confidence, and how students present themselves academically.
            </p>
          </div>
        </FadeIn>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {OUTCOMES.map((o, i) => (
            <FadeIn key={i} delay={i*0.08}>
              <div className="hw-card-d" style={{ padding:"28px" }}>
                <div style={{ fontSize:30, marginBottom:14 }}>{o.icon}</div>
                <h3 style={{ fontFamily:"var(--hw-font-s)", fontSize:18, fontWeight:700, fontStyle:"italic", marginBottom:10, color:"white", letterSpacing:"-.01em" }}>{o.title}</h3>
                <p style={{ fontSize:13, lineHeight:1.72, color:"rgba(255,255,255,.42)", fontWeight:300 }}>{o.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number|null>(0);
  return (
    <section style={{ padding:"100px 24px", background:"var(--hw-bg)" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div className="hw-lbl" style={{ justifyContent:"center", marginBottom:16 }}>Questions</div>
            <h2 style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(26px,3vw,44px)", fontWeight:700, letterSpacing:"-.02em", fontStyle:"italic", color:"var(--hw-ink)" }}>
              Everything You Want to <span className="hw-teal-text">Know</span>
            </h2>
          </div>
        </FadeIn>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {FAQS.map((f, i) => (
            <FadeIn key={i} delay={i*0.06}>
              <div style={{ background:open===i?"var(--hw-surface)":"transparent", border:`1px solid ${open===i?"rgba(10,122,106,.22)":"var(--hw-border)"}`, borderRadius:16, overflow:"hidden", transition:"all .3s ease" }}>
                <button onClick={() => setOpen(open===i?null:i)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}>
                  <span style={{ fontFamily:"var(--hw-font-s)", fontSize:16, fontWeight:700, color:"var(--hw-ink)", fontStyle:"italic" }}>{f.q}</span>
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background:open===i?"rgba(10,122,106,.1)":"var(--hw-bg2)", border:`1px solid ${open===i?"rgba(10,122,106,.24)":"var(--hw-border)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .25s ease", transform:open===i?"rotate(45deg)":"none", color:open===i?"var(--hw-teal)":"var(--hw-ink2)", fontSize:16 }}>+</div>
                </button>
                {open===i && (
                  <div style={{ padding:"0 24px 20px", fontSize:15, lineHeight:1.78, color:"var(--hw-ink2)", fontWeight:300, animation:"hw-reveal .3s ease both" }}>{f.a}</div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA BANNER ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding:"80px 24px", background:"var(--hw-dark)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ position:"relative", borderRadius:26, overflow:"hidden", border:"1px solid rgba(10,153,128,.18)", padding:"68px 56px", background:"var(--hw-dark2)", boxShadow:"0 40px 100px rgba(0,0,0,.4)", backgroundImage:"repeating-linear-gradient(transparent, transparent 47px, rgba(10,122,106,.04) 47px, rgba(10,122,106,.04) 48px)", backgroundSize:"100% 48px" }}>
            {/* Margin rule inside CTA */}
            <div style={{ position:"absolute", top:0, bottom:0, left:"7%", width:1, background:"rgba(200,40,40,.09)" }} />
            {/* Glows */}
            <div style={{ position:"absolute", top:-80, right:-80, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(10,122,106,.1),transparent 70%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:-60, left:-60, width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle,rgba(10,122,106,.06),transparent 70%)", pointerEvents:"none" }} />

            <div style={{ position:"relative", display:"grid", gridTemplateColumns:"1fr 1fr", gap:56, alignItems:"center" }}>
              {/* Left */}
              <div>
                <div className="hw-lbl-d" style={{ marginBottom:20 }}>English & Hindi Available</div>
                <h2 style={{ fontFamily:"var(--hw-font-s)", fontSize:"clamp(28px,3.5vw,52px)", fontWeight:700, fontStyle:"italic", letterSpacing:"-.02em", lineHeight:1.02, marginBottom:20, color:"white" }}>
                  Write With<br /><span className="hw-shimmer-light">Confidence.</span>
                </h2>
                <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", lineHeight:1.78, fontWeight:300, marginBottom:28 }}>
                  A 12-week course that permanently changes how students feel about putting pen to paper. One free session to experience the difference first-hand.
                </p>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  <button className="hw-btn-teal">Book Free Session →</button>
                  <a href="tel:+919266117055" className="hw-btn-ghost-d">📞 +91 92661 17055</a>
                </div>
                <div style={{ marginTop:18, display:"flex", gap:20, flexWrap:"wrap" }}>
                  {["Free trial class","Both tracks available","All ages welcome"].map(t => (
                    <span key={t} style={{ fontFamily:"var(--hw-font-m)", fontSize:11, color:"rgba(10,153,128,.45)", letterSpacing:".04em" }}>✓ {t}</span>
                  ))}
                </div>
              </div>

              {/* Right — track cards */}
              <div>
                <div style={{ background:"rgba(10,122,106,.07)", border:"1px solid rgba(10,153,128,.14)", borderRadius:18, padding:"24px", marginBottom:20 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {[["Aa","English Track","Roman script · Cursive"],["अ","Hindi Track","Devanagari · सुलेख"]].map(([sym,name,sub]) => (
                      <div key={name} style={{ textAlign:"center", padding:"18px 12px", background:"rgba(10,122,106,.1)", border:"1px solid rgba(10,153,128,.14)", borderRadius:12, transition:"all .25s ease" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(10,153,128,.35)"; (e.currentTarget as HTMLElement).style.background="rgba(10,122,106,.18)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(10,153,128,.14)"; (e.currentTarget as HTMLElement).style.background="rgba(10,122,106,.1)"; }}>
                        <div style={{ fontFamily:"var(--hw-font-s)", fontSize:30, fontWeight:700, color:"var(--hw-teal3)", marginBottom:6, fontStyle:"italic" }}>{sym}</div>
                        <div style={{ fontFamily:"var(--hw-font-d)", fontSize:13, fontWeight:700, color:"white", marginBottom:3 }}>{name}</div>
                        <div style={{ fontFamily:"var(--hw-font-m)", fontSize:9, color:"rgba(255,255,255,.28)", letterSpacing:".06em" }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Proof points */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[["✍️","12-week structured programme with weekly milestones"],["📜","Certificate awarded on successful completion"],["👁","Visible improvement typically within first 3 weeks"]].map(([ico,txt]) => (
                    <div key={txt} style={{ display:"flex", alignItems:"flex-start", gap:10, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, padding:"10px 14px" }}>
                      <span style={{ fontSize:14, flexShrink:0 }}>{ico}</span>
                      <span style={{ fontFamily:"var(--hw-font-b)", fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.5, fontWeight:300 }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function HandwritingCourse() {
  return (
    <div className="hw-page">
      <HandwritingStyles />
      <Hero />
      <MarqueeBar />
      <div style={{ padding:"72px 24px 0", background:"var(--hw-bg)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <FadeIn><StatsBar /></FadeIn>
        </div>
      </div>
      <BilingualTracks />
      <BeforeAfter />
      <Outcomes />
      <FAQSection />
      <CTABanner />
    </div>
  );
}
