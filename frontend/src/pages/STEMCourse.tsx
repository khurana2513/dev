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

function FadeIn({ children, delay = 0, dir = "up", className = "" }: {
  children: React.ReactNode; delay?: number; dir?: "up" | "left" | "right" | "none"; className?: string;
}) {
  const { ref, inView } = useInView();
  const off: Record<string, string> = { up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none" };
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : off[dir],
      transition: `opacity .65s cubic-bezier(.4,0,.2,1) ${delay}s, transform .65s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>{children}</div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
function STEMStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

      .st-page {
        --st-bg:    #07060A;
        --st-bg2:   #0B0A11;
        --st-bg3:   #0E0D18;
        --st-surf:  #111019;
        --st-surf2: #171524;
        --st-bdr:   rgba(255,255,255,0.06);
        --st-bdr2:  rgba(255,255,255,0.1);
        --st-o:     #E05C28;
        --st-o2:    #F07840;
        --st-o3:    #FFAB7A;
        --st-og:    rgba(224,92,40,0.1);
        --st-og2:   rgba(224,92,40,0.18);
        --st-teal:  #00D9C0;
        --st-tealg: rgba(0,217,192,0.1);
        --st-p:     #7B5CE5;
        --st-pg:    rgba(123,92,229,0.12);
        --st-amber: #F59E0B;
        --st-red:   #EF4444;
        --st-white: #EDE8F8;
        --st-white2:#9B96B8;
        --st-muted: #524E68;
        --st-font-d:'Playfair Display', Georgia, serif;
        --st-font-b:'DM Sans', sans-serif;
        --st-font-m:'JetBrains Mono', monospace;
        background: var(--st-bg);
        color: var(--st-white);
        font-family: var(--st-font-b);
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }
      .st-page ::selection { background: rgba(224,92,40,.2); }
      .st-page ::-webkit-scrollbar { width: 3px; }
      .st-page ::-webkit-scrollbar-thumb { background: var(--st-o); border-radius: 2px; }

      @keyframes st-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes st-float-r  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(9px)} }
      @keyframes st-shimmer  { 0%{background-position:-400% center} 100%{background-position:400% center} }
      @keyframes st-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
      @keyframes st-marquee  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      @keyframes st-boot-bar { from{width:0} to{width:100%} }
      @keyframes st-slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      @keyframes st-pop      { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:none} }
      @keyframes st-pulse-o  { 0%,100%{box-shadow:0 0 0 0 rgba(224,92,40,.5)} 70%{box-shadow:0 0 0 8px rgba(224,92,40,0)} }
      @keyframes st-reveal   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

      .st-orange-text {
        background: linear-gradient(135deg, var(--st-o2) 0%, var(--st-o3) 40%, var(--st-o) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .st-teal-text {
        background: linear-gradient(135deg, var(--st-teal) 0%, #80EEE2 50%, var(--st-teal) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .st-scan-text {
        background: linear-gradient(90deg, var(--st-white2) 0%, var(--st-white) 25%, var(--st-o3) 50%, var(--st-white) 75%, var(--st-white2) 100%);
        background-size: 400% auto;
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        animation: st-shimmer 5s linear infinite;
      }
      .st-lbl {
        font-family: var(--st-font-m); font-size: 10px; font-weight: 600;
        letter-spacing: .16em; text-transform: uppercase; color: var(--st-o2);
        display: inline-flex; align-items: center; gap: 8px;
      }
      .st-lbl::before { content:''; display:block; width:18px; height:1px; background:var(--st-o2); }
      .st-lbl-t {
        font-family: var(--st-font-m); font-size: 10px; font-weight: 600;
        letter-spacing: .16em; text-transform: uppercase; color: var(--st-teal);
        display: inline-flex; align-items: center; gap: 8px;
      }
      .st-lbl-t::before { content:''; display:block; width:18px; height:1px; background:var(--st-teal); }
      .st-btn-o {
        background: linear-gradient(135deg, var(--st-o), #b83e10);
        color: #fff; border: none; padding: 13px 26px; border-radius: 10px;
        font-family: var(--st-font-b); font-size: 15px; font-weight: 600;
        cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
        text-decoration: none;
      }
      .st-btn-o::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.12),transparent); opacity:0; transition:opacity .25s; }
      .st-btn-o:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(224,92,40,.45); }
      .st-btn-o:hover::after { opacity: 1; }
      .st-btn-s {
        background: transparent; color: var(--st-white2); border: 1px solid var(--st-bdr2);
        padding: 13px 24px; border-radius: 10px; font-family: var(--st-font-b); font-size: 15px;
        font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        transition: all .25s ease; white-space: nowrap; text-decoration: none;
      }
      .st-btn-s:hover { border-color: rgba(224,92,40,.45); background: rgba(224,92,40,.08); color: var(--st-white); transform: translateY(-2px); }
      .st-card {
        background: var(--st-surf); border: 1px solid var(--st-bdr); border-radius: 18px;
        transition: all .35s cubic-bezier(.4,0,.2,1);
      }
      .st-card:hover { border-color: rgba(224,92,40,.28); transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.4), 0 0 28px rgba(224,92,40,.06); }
      .st-circuit {
        background-image: linear-gradient(rgba(224,92,40,.07) 1px,transparent 1px), linear-gradient(90deg,rgba(224,92,40,.07) 1px,transparent 1px);
        background-size: 48px 48px;
      }
      .st-scanlines::after {
        content:''; position:absolute; inset:0; pointer-events:none;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px);
      }
    `}</style>
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const COURSES = [
  {
    code:"SHUNYA", level:"01", name:"Paper Circuits",     tagline:"Light up your mind",
    ages:"4–7 Years",  dur:"8 Weeks",  cat:"Electronics",  icon:"⚡",
    color:"#00D9C0",   dim:"rgba(0,217,192,0.1)",   bdr:"rgba(0,217,192,0.25)",
    desc:"Discover the magic of electricity through hands-on paper circuit projects. Create glowing artwork, interactive greeting cards, and learn fundamental electronics using conductive tape, LEDs, and raw creativity.",
    learn:["LED basics & circuit fundamentals","Conductive tape mastery","Series and parallel circuits","Interactive greeting card project"],
    outcomes:["Electrical intuition","Hand-eye confidence","Creative problem-solving","Circuit design basics"],
  },
  {
    code:"CHAKRA", level:"02", name:"Robotics Foundations", tagline:"Command robots that build the future",
    ages:"8–11 Years", dur:"8 Weeks",  cat:"Robotics",      icon:"🤖",
    color:"#E05C28",   dim:"rgba(224,92,40,0.1)",   bdr:"rgba(224,92,40,0.28)",
    desc:"Enter the world of robotics by building and programming your own machines. Learn to make robots move, sense, and respond. From basic motors to complex behaviors — become a robotics engineer.",
    learn:["Build a custom robot chassis","Motor control & movement logic","Ultrasonic & IR sensor integration","Block-based programming (Scratch/Blockly)"],
    outcomes:["Mechanical construction","Programming logic","Sensor+actuator mastery","Computational thinking"],
  },
  {
    code:"YANTRA", level:"03", name:"Internet of Things",  tagline:"Connect the world through smart devices",
    ages:"12–14 Years",dur:"12 Weeks", cat:"IoT",           icon:"🌐",
    color:"#7B5CE5",   dim:"rgba(123,92,229,0.1)",  bdr:"rgba(123,92,229,0.28)",
    desc:"Build smart connected devices that communicate with each other and the internet. Learn how everyday objects become intelligent through sensors, microcontrollers, and cloud connectivity.",
    learn:["ESP32/NodeMCU programming in MicroPython","Sensor networks: temp, humidity, motion","Cloud dashboards via ThingSpeak & Blynk","Smart home automation final project"],
    outcomes:["IoT architecture mastery","Microcontroller programming","APIs & cloud services","Real-world solutions"],
  },
  {
    code:"ANANTA", level:"04", name:"Advanced IoT & AI",   tagline:"Master edge computing & machine learning",
    ages:"14–16 Years",dur:"12 Weeks", cat:"AI / Edge",     icon:"🧠",
    color:"#F59E0B",   dim:"rgba(245,158,11,0.1)",  bdr:"rgba(245,158,11,0.28)",
    desc:"Take IoT to the next level with machine learning, edge computing, and advanced sensor fusion. Build systems that learn, predict, and make autonomous decisions at the hardware level.",
    learn:["Edge computing with Raspberry Pi","Training & deploying ML models","Computer vision applications","MQTT & industrial protocols"],
    outcomes:["ML on edge devices","Advanced Python","Data security","Production-ready systems"],
  },
  {
    code:"GARUDA", level:"05", name:"Drone Engineering",   tagline:"Soar to new heights",
    ages:"14–18 Years",dur:"8 Weeks",  cat:"Aerospace",     icon:"🚁",
    color:"#EF4444",   dim:"rgba(239,68,68,0.1)",   bdr:"rgba(239,68,68,0.28)",
    desc:"Design, build, and fly autonomous drones. Learn aerodynamics, flight controllers, GPS navigation, and aerial photography. From manual first-flight to fully autonomous GPS waypoint missions.",
    learn:["Drone construction & electronics","Flight controller programming","GPS waypoint navigation","FPV flying & aerial photography"],
    outcomes:["Flight dynamics","Autonomous mission design","Drone programming","Commercial certifications"],
  },
];

const DIFFERENTIATORS = [
  { icon:"🔧", title:"100% Hands-On",         desc:"Every session is project-based. Students build real working devices — no theoretical lectures, no worksheets, no passive learning." },
  { icon:"📈", title:"Progressive Pathways",  desc:"Five levels, each unlocking new complexity. Paper circuits → robotics → IoT → AI → drones. Nothing is skipped, everything builds." },
  { icon:"🏗",  title:"Real Project Showcase", desc:"Each course ends with a showcase where students present their final project. Parents watch their child's creation in live action." },
  { icon:"🎓", title:"Competition Exposure",  desc:"Robotics tournaments, drone demos, IoT hackathons — students encounter the professional world early and leave prepared for it." },
];

const MARQUEE_ITEMS = [
  "5 Courses", "✦", "Ages 4–18", "✦", "Electronics", "✦", "Robotics", "✦",
  "IoT", "✦", "AI & Edge Computing", "✦", "Drone Engineering", "✦",
  "Black Monkey × BlackMonkey", "✦", "Hands-On Every Session", "✦",
  "Live Project Showcase", "✦", "3 Delhi Branches", "✦",
];

const BOOT_LINES = [
  "> initializing BLACK MONKEY OS v2.0...",
  "> loading STEM curriculum engine — 5 levels...",
  "> calibrating course pathways [⚡🤖🌐🧠🚁]...",
  "> system ready. engineers, step forward.",
];

// ─── MARQUEE BAR ──────────────────────────────────────────────────────────────
function MarqueeBar() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ background:"rgba(224,92,40,.06)", borderTop:"1px solid rgba(224,92,40,.14)", borderBottom:"1px solid rgba(224,92,40,.14)", overflow:"hidden", padding:"13px 0" }}>
      <div style={{ display:"flex", gap:28, animation:"st-marquee 32s linear infinite", width:"max-content" }}>
        {items.map((t, i) => (
          <span key={i} style={{
            fontFamily:"var(--st-font-m)", fontSize:11, letterSpacing:".12em",
            color:t==="✦"?"rgba(224,92,40,.3)":"var(--st-white2)",
            whiteSpace:"nowrap", fontWeight:t==="✦"?400:600,
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatCell({ end, suffix="", label, last=false }: { end:number;suffix?:string;label:string;last?:boolean }) {
  const { ref, inView } = useInView();
  const count = useCounter(end, 1400, inView);
  return (
    <div ref={ref} style={{ textAlign:"center", padding:"22px 12px", borderRight:last?"none":"1px solid var(--st-bdr)" }}>
      <div style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(20px,2.4vw,30px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.1 }} className="st-orange-text">
        {count}{suffix}
      </div>
      <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:6 }}>{label}</div>
    </div>
  );
}
function StatsBar() {
  return (
    <div className="rsp-stats-grid" style={{ background:"var(--st-surf)", border:"1px solid var(--st-bdr)", borderRadius:18, display:"grid", gridTemplateColumns:"repeat(4,1fr)", overflow:"hidden" }}>
      <StatCell end={5} label="Courses Available" />
      <div style={{ textAlign:"center", padding:"22px 12px", borderRight:"1px solid var(--st-bdr)" }}>
        <div style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(20px,2.4vw,30px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.1 }} className="st-orange-text">4–18 yrs</div>
        <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:6 }}>Age Span</div>
      </div>
      <div style={{ textAlign:"center", padding:"22px 12px", borderRight:"1px solid var(--st-bdr)" }}>
        <div style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(20px,2.4vw,30px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.1 }} className="st-orange-text">AI/ML</div>
        <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:6 }}>Driven Curriculum</div>
      </div>
      <div style={{ textAlign:"center", padding:"22px 12px" }}>
        <div style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(20px,2.4vw,30px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.1 }} className="st-orange-text">8–12wk</div>
        <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", letterSpacing:".14em", textTransform:"uppercase", marginTop:6 }}>Per Course</div>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (tick >= BOOT_LINES.length - 1) return;
    const t = setTimeout(() => setTick(n => n + 1), 860);
    return () => clearTimeout(t);
  }, [tick]);

  return (
    <section style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", overflow:"hidden", background:"var(--st-bg)" }}>
      {/* Circuit grid */}
      <div className="st-circuit" style={{ position:"absolute", inset:0, opacity:.45, maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)" }} />
      {/* Glow spots */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 65% 55% at 32% 55%, rgba(224,92,40,.07) 0%, transparent 62%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 45% 45% at 82% 25%, rgba(0,217,192,.04) 0%, transparent 65%)", pointerEvents:"none" }} />
      {/* Scanline sweep */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", opacity:.025 }}>
        <div style={{ position:"absolute", left:0, right:0, height:80, background:"linear-gradient(to bottom, transparent, rgba(224,92,40,.8), transparent)", animation:"st-scanline 9s linear infinite" }} />
      </div>
      {/* Floating particles */}
      {[
        { w:6, h:6, top:"18%", left:"7%",   c:"rgba(224,92,40,.3)",  d:"0s",  dur:"5s" },
        { w:4, h:4, top:"75%", left:"5%",   c:"rgba(0,217,192,.25)", d:"2s",  dur:"7s" },
        { w:8, h:8, top:"22%", right:"8%",  c:"rgba(224,92,40,.2)",  d:"1s",  dur:"6s" },
        { w:5, h:5, top:"78%", right:"12%", c:"rgba(0,217,192,.2)",  d:"2.8s",dur:"4.5s" },
      ].map((p, i) => (
        <div key={i} style={{ position:"absolute", width:p.w, height:p.h, borderRadius:"50%", background:p.c, top:p.top, left:(p as any).left||"auto", right:(p as any).right||"auto", animation:`st-float ${p.dur} ease-in-out infinite ${p.d}`, pointerEvents:"none" }} />
      ))}

      <div className="rsp-hero-grid" style={{ maxWidth:1200, margin:"0 auto", padding:"10px 56px 80px 24px", width:"100%", display:"grid", gridTemplateColumns:"55% 45%", gap:56, alignItems:"center" }}>
        {/* ── LEFT ── */}
        <div>
          {/* Terminal boot block */}
          <div style={{ opacity:loaded?1:0, transform:loaded?"none":"translateY(16px)", transition:"all .5s ease .1s", display:"inline-flex", flexDirection:"column", gap:5, background:"rgba(0,0,0,.55)", border:"1px solid rgba(224,92,40,.22)", borderRadius:12, padding:"14px 18px", marginBottom:32, minWidth:360, fontFamily:"var(--st-font-m)", fontSize:11, color:"var(--st-o3)", letterSpacing:".04em" }}>
            {BOOT_LINES.slice(0, tick + 1).map((line, i) => (
              <div key={i} style={{ opacity:i===tick?1:.45, animation:i===tick?"st-slide-up .3s ease both":"none", display:"flex", gap:0 }}>
                {line}
                {i===tick && tick < BOOT_LINES.length - 1 && <span style={{ marginLeft:1, opacity:1, animation:"st-slide-up .5s steps(1,end) infinite" }}>▌</span>}
              </div>
            ))}
          </div>

          <h1 style={{ fontFamily:"var(--st-font-d)", fontWeight:800, lineHeight:1.0, letterSpacing:"-.04em", opacity:loaded?1:0, transform:loaded?"none":"translateY(24px)", transition:"all .72s cubic-bezier(.4,0,.2,1) .2s", marginBottom:12 }}>
            <span style={{ display:"block", fontSize:"clamp(44px,5.2vw,76px)", color:"var(--st-white)" }}>Built for</span>
            <span style={{ display:"block", fontSize:"clamp(44px,5.2vw,76px)" }} className="st-orange-text">The Creators</span>
            <span style={{ display:"block", fontSize:"clamp(44px,5.2vw,76px)", color:"var(--st-white)" }}>of Tomorrow.</span>
          </h1>

          <div style={{ width:60, height:3, background:"linear-gradient(90deg,var(--st-o),transparent)", borderRadius:2, marginBottom:24, opacity:loaded?1:0, transition:"opacity .7s ease .5s" }} />

          <p style={{ fontSize:17, lineHeight:1.78, color:"var(--st-white2)", maxWidth:460, marginBottom:36, fontWeight:300, opacity:loaded?1:0, transform:loaded?"none":"translateY(16px)", transition:"all .7s ease .34s" }}>
                  Robotics, IoT, AI, and Drone Building — unlocked for ages 4 to 18. Five progressive courses under Black Monkey, available at BlackMonkey. Where engineers are made, not born.
          </p>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", opacity:loaded?1:0, transition:"opacity .7s ease .44s" }}>
            <button className="st-btn-o" onClick={() => document.getElementById('st-begin')?.scrollIntoView({behavior:'smooth'})}>Enroll in STEM →</button>
            <button className="st-btn-s">View Demo</button>
          </div>


        </div>

        {/* ── RIGHT — course pathway card ── */}
        <div className="rsp-hero-right" style={{ opacity:loaded?1:0, transform:loaded?"none":"translateX(32px)", transition:"all .9s cubic-bezier(.4,0,.2,1) .3s", position:"relative" }}>
          <div className="st-scanlines" style={{ background:"linear-gradient(145deg,var(--st-surf2),var(--st-bg2))", border:"1px solid var(--st-bdr2)", borderRadius:28, padding:"32px", position:"relative", overflow:"hidden", boxShadow:"0 40px 100px rgba(0,0,0,.65), 0 0 60px rgba(224,92,40,.07)" }}>
            {/* Top glow stripe */}
            <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(224,92,40,.14),transparent 70%)", pointerEvents:"none" }} />
            <div className="st-lbl" style={{ marginBottom:20 }}>Mission Control — 5 Pathways</div>

            {COURSES.map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, marginBottom:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", transition:"all .25s ease", cursor:"default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=c.dim; (e.currentTarget as HTMLElement).style.borderColor=c.bdr; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.05)"; }}>
                <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", letterSpacing:".1em", minWidth:22 }}>L{c.level}</div>
                <div style={{ width:28, height:28, borderRadius:8, background:c.dim, border:`1px solid ${c.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{c.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, fontWeight:700, color:c.color, letterSpacing:".1em", textTransform:"uppercase" }}>{c.code}</div>
                  <div style={{ fontFamily:"var(--st-font-d)", fontSize:14, fontWeight:700, color:"var(--st-white)", lineHeight:1.2 }}>{c.name}</div>
                </div>
                <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", textAlign:"right", lineHeight:1.6 }}>
                  <div>{c.ages}</div>
                  <div>{c.dur}</div>
                </div>
              </div>
            ))}

            {/* Progress boot bar */}
            <div style={{ marginTop:18, background:"rgba(255,255,255,.04)", borderRadius:6, height:4, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,var(--st-o),var(--st-teal))", borderRadius:6, animation:"st-boot-bar 2.5s ease .5s both" }} />
            </div>
            <div style={{ fontFamily:"var(--st-font-m)", fontSize:10, color:"var(--st-muted)", marginTop:7, letterSpacing:".08em" }}>
              5/5 PATHWAYS LOADED · SYSTEM ACTIVE
            </div>
          </div>


          <a href="https://blackmonkey.in" target="_blank" rel="noopener noreferrer" style={{ position:"absolute", bottom:60, left:-24, background:"rgba(7,6,10,.95)", backdropFilter:"blur(16px)", border:"1px solid rgba(224,92,40,.22)", borderRadius:14, padding:"12px 16px", animation:"st-float-r 5.5s ease-in-out infinite 1.5s", boxShadow:"0 8px 28px rgba(0,0,0,.5)", zIndex:10, textDecoration:"none" }}>
            <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-o2)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:4 }}>Available At</div>
            <div style={{ fontFamily:"var(--st-font-d)", fontSize:14, fontWeight:700, color:"white" }}>blackmonkey.in ↗</div>
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── COURSE DETAILS ────────────────────────────────────────────────────────────
function CourseDetails() {
  const [active, setActive] = useState(1);
  const c = COURSES[active];
  return (
    <section style={{ padding:"100px 24px", background:"var(--st-bg)", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"50%", height:1, background:"linear-gradient(90deg,transparent,rgba(224,92,40,.35),transparent)" }} />
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom:44 }}>
            <div className="st-lbl" style={{ marginBottom:16 }}>The 5 Pathways</div>
            <h2 style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(28px,3.8vw,52px)", fontWeight:800, letterSpacing:"-.03em", lineHeight:1.1, marginBottom:14 }}>
              From Sparks to <span className="st-orange-text">Soaring Drones</span>
            </h2>
            <p style={{ color:"var(--st-white2)", fontSize:16, maxWidth:520, lineHeight:1.72, fontWeight:300 }}>
              Each course is a self-contained progression. Join at the level right for your age — or start from SHUNYA and build to GARUDA.
            </p>
          </div>
        </FadeIn>

        {/* Course tabs */}
        <FadeIn delay={0.1}>
          <div style={{ display:"flex", gap:8, marginBottom:28, flexWrap:"wrap" }}>
            {COURSES.map((tab, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ padding:"10px 16px", borderRadius:10, border:`1px solid ${active===i?tab.bdr:"var(--st-bdr)"}`, background:active===i?tab.dim:"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .25s ease", boxShadow:active===i?`0 0 22px ${tab.dim}`:"none" }}>
                <span style={{ fontSize:16 }}>{tab.icon}</span>
                <span style={{ fontFamily:"var(--st-font-m)", fontSize:11, fontWeight:700, color:active===i?tab.color:"var(--st-muted)", letterSpacing:".08em" }}>{tab.code}</span>
                <span style={{ fontFamily:"var(--st-font-b)", fontSize:13, color:active===i?"var(--st-white)":"var(--st-muted)" }}>{tab.name}</span>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Detail panel */}
        <div key={active} className="rsp-2col" style={{ animation:"st-pop .35s ease both", display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          {/* Main */}
          <div style={{ background:"var(--st-surf)", borderRadius:24, padding:"36px", border:`1px solid ${c.bdr}`, position:"relative", overflow:"hidden", boxShadow:`0 0 60px ${c.dim}` }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${c.color},transparent)` }} />
            <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle,${c.dim},transparent 70%)`, pointerEvents:"none" }} />

            <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:22 }}>
              <div style={{ width:52, height:52, borderRadius:16, fontSize:24, background:c.dim, border:`1px solid ${c.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{c.icon}</div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontFamily:"var(--st-font-m)", fontSize:10, fontWeight:700, letterSpacing:".12em", color:c.color, background:c.dim, border:`1px solid ${c.bdr}`, borderRadius:6, padding:"3px 8px" }}>{c.code} · LEVEL {c.level}</span>
                  <span style={{ fontFamily:"var(--st-font-m)", fontSize:10, color:"var(--st-muted)", letterSpacing:".08em" }}>{c.cat}</span>
                </div>
                <h3 style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(20px,2.4vw,28px)", fontWeight:800, letterSpacing:"-.03em", color:"var(--st-white)", lineHeight:1.1 }}>{c.name}</h3>
                <p style={{ fontFamily:"var(--st-font-b)", fontSize:14, color:c.color, marginTop:4, opacity:.9 }}>{c.tagline}</p>
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
              {[`🎯 ${c.ages}`,`⏱ ${c.dur}`].map(p => (
                <div key={p} style={{ background:"rgba(255,255,255,.05)", border:"1px solid var(--st-bdr)", borderRadius:8, padding:"6px 12px", fontFamily:"var(--st-font-m)", fontSize:12, color:"var(--st-white2)" }}>{p}</div>
              ))}
            </div>

            <p style={{ fontSize:15, lineHeight:1.78, color:"var(--st-white2)", marginBottom:24, fontWeight:300 }}>{c.desc}</p>

            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <a href="https://blackmonkey.in" target="_blank" rel="noopener noreferrer" className="st-btn-o" style={{ background:`linear-gradient(135deg,${c.color},${c.color}99)`, textDecoration:"none" }}>Enroll in {c.code} →</a>
            </div>
          </div>

          {/* Learn + Outcomes */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="st-card" style={{ padding:"26px", flex:1 }}>
              <div className="st-lbl" style={{ color:c.color, marginBottom:14 }}>What You'll Build & Learn</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {c.learn.map((item, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"var(--st-surf2)", border:"1px solid var(--st-bdr)", borderRadius:10 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:c.color, flexShrink:0 }} />
                    <span style={{ fontSize:14, color:"var(--st-white2)", fontWeight:300 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="st-card" style={{ padding:"22px" }}>
              <div className="st-lbl" style={{ color:c.color, marginBottom:12 }}>Key Outcomes</div>
              <div className="rsp-stem-skill-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {c.outcomes.map((o, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--st-white2)", fontWeight:300 }}>
                    <span style={{ color:c.color, fontSize:10 }}>✓</span>{o}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}

// ─── WHY SECTION ──────────────────────────────────────────────────────────────
function Why() {
  return (
    <section style={{ padding:"100px 24px", background:"var(--st-bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:52, flexWrap:"wrap", gap:20 }}>
            <div>
              <div className="st-lbl" style={{ marginBottom:16 }}>Why Black Monkey</div>
              <h2 style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(28px,3.5vw,48px)", fontWeight:800, letterSpacing:"-.03em", lineHeight:1.1 }}>
                Engineering Education,<br /><span className="st-orange-text">Done Right.</span>
              </h2>
            </div>
            <p style={{ color:"var(--st-muted)", fontSize:15, maxWidth:300, lineHeight:1.68, fontWeight:300 }}>
              Not another coding class. A full-stack engineer's education, built for children from the ground up.
            </p>
          </div>
        </FadeIn>
        <div className="rsp-2col" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
          {DIFFERENTIATORS.map((d, i) => (
            <FadeIn key={i} delay={i*.1} dir={i%2===0?"left":"right"}>
              <div className="st-card" style={{ padding:"30px", display:"flex", gap:20, alignItems:"flex-start" }}>
                <div style={{ width:50, height:50, borderRadius:15, background:"var(--st-og)", border:"1px solid var(--st-og2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{d.icon}</div>
                <div>
                  <h3 style={{ fontFamily:"var(--st-font-d)", fontSize:19, fontWeight:800, letterSpacing:"-.02em", marginBottom:9, color:"var(--st-white)" }}>{d.title}</h3>
                  <p style={{ fontSize:14, lineHeight:1.72, color:"var(--st-white2)", fontWeight:300 }}>{d.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PATHWAY TIMELINE ─────────────────────────────────────────────────────────
function Pathway() {
  return (
    <section style={{ padding:"100px 24px", background:"var(--st-bg)", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"50%", height:1, background:"linear-gradient(90deg,transparent,rgba(224,92,40,.3),transparent)" }} />
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <div className="st-lbl" style={{ justifyContent:"center", marginBottom:16 }}>The Full Path</div>
            <h2 style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(28px,3.5vw,48px)", fontWeight:800, letterSpacing:"-.03em" }}>
              Age 4 to Age 18 —<br /><span className="st-orange-text">One Complete Journey</span>
            </h2>
          </div>
        </FadeIn>

        <div style={{ position:"relative" }}>
          {/* Connecting gradient line */}
          <div style={{ position:"absolute", top:"45%", left:"5%", right:"5%", height:2, background:"linear-gradient(90deg,var(--st-teal),var(--st-o2),var(--st-p),var(--st-amber),var(--st-red))", opacity:.22, pointerEvents:"none" }} />

          <div className="rsp-5col" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, position:"relative" }}>
            {COURSES.map((c, i) => (
              <FadeIn key={i} delay={i*.1}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)", marginBottom:12, letterSpacing:".1em" }}>{c.ages}</div>
                  <div style={{ width:56, height:56, borderRadius:18, fontSize:24, marginBottom:12, background:c.dim, border:`1px solid ${c.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 20px ${c.dim}`, position:"relative", zIndex:1, transition:"all .25s ease", cursor:"default" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="scale(1.14)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 0 32px ${c.bdr}`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="none"; (e.currentTarget as HTMLElement).style.boxShadow=`0 0 20px ${c.dim}`; }}>{c.icon}</div>
                  <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, fontWeight:700, color:c.color, letterSpacing:".12em", marginBottom:4 }}>{c.code}</div>
                  <div style={{ fontFamily:"var(--st-font-d)", fontSize:14, fontWeight:700, color:"var(--st-white)", lineHeight:1.2 }}>{c.name}</div>
                  <div style={{ fontFamily:"var(--st-font-b)", fontSize:12, color:"var(--st-muted)", marginTop:4, fontWeight:300 }}>{c.dur}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.3}>
          <div style={{ textAlign:"center", marginTop:52 }}>
            <p style={{ fontSize:15, color:"var(--st-muted)", marginBottom:20, fontWeight:300 }}>
              Join at any level appropriate for your child's age. Full programme details at{" "}
              <span style={{ color:"var(--st-o2)", fontWeight:600 }}>blackmonkey.in</span>
            </p>
            <a href="https://blackmonkey.in" target="_blank" rel="noopener noreferrer" className="st-btn-o" style={{ textDecoration:"none" }}>Visit blackmonkey.in for Full Details ↗</a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── CTA BANNER ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section id="st-begin" style={{ padding:"80px 24px", background:"var(--st-bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <FadeIn>
          <div className="st-scanlines rsp-cta-inner" style={{ position:"relative", borderRadius:28, overflow:"hidden", background:"linear-gradient(135deg,#1a0e06,#0e0905,var(--st-bg))", border:"1px solid rgba(224,92,40,.22)", padding:"72px 60px", boxShadow:"0 40px 100px rgba(0,0,0,.55)" }}>
            <div className="st-circuit" style={{ position:"absolute", inset:0 }} />
            <div style={{ position:"absolute", top:-80, left:-80, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(224,92,40,.18),transparent 70%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,217,192,.07),transparent 70%)", pointerEvents:"none" }} />

            <div className="rsp-2col" style={{ position:"relative", display:"grid", gridTemplateColumns:"1fr 1fr", gap:56, alignItems:"center" }}>
              {/* Left */}
              <div>
                <div style={{ fontFamily:"var(--st-font-m)", fontSize:10, color:"var(--st-o2)", letterSpacing:".16em", textTransform:"uppercase", marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
                  <span>🐒</span> Available At BlackMonkey
                </div>
                <h2 style={{ fontFamily:"var(--st-font-d)", fontSize:"clamp(26px,3.2vw,46px)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.0, marginBottom:18, color:"white" }}>
                  Start Building<br /><span className="st-scan-text">The Future Today.</span>
                </h2>
                <p style={{ fontSize:16, color:"rgba(255,255,255,.45)", lineHeight:1.75, marginBottom:28, fontWeight:300 }}>
                  STEM courses by Black Monkey are available at all BlackMonkey branches. Walk in, try a free demo session, and let your child discover what they're capable of building.
                </p>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  <a href="https://wa.me/919718325064" className="st-btn-o" style={{ textDecoration:"none" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Get in Touch
                  </a>
                  <a href="tel:+919718325064" className="st-btn-s" style={{ textDecoration:"none" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    Call Us
                  </a>
                </div>
                <div style={{ marginTop:18, display:"flex", gap:20, flexWrap:"wrap" }}>
                  {["Free demo session","Age-appropriate placement","All 5 courses available"].map(t => (
                    <span key={t} style={{ fontFamily:"var(--st-font-m)", fontSize:10, color:"rgba(224,92,40,.42)", letterSpacing:".04em" }}>✓ {t}</span>
                  ))}
                </div>
              </div>

              {/* Right — CTA cards */}
              <div>
                <div style={{ background:"rgba(224,92,40,.07)", border:"1px solid rgba(224,92,40,.16)", borderRadius:18, padding:"22px", marginBottom:18 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                    {COURSES.slice(0, 4).map(tab => (
                      <div key={tab.code} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:tab.dim, border:`1px solid ${tab.bdr}`, borderRadius:12, transition:"all .2s ease" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="none"; }}>
                        <span style={{ fontSize:18 }}>{tab.icon}</span>
                        <div>
                          <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:tab.color, fontWeight:700, letterSpacing:".1em" }}>{tab.code}</div>
                          <div style={{ fontFamily:"var(--st-font-d)", fontSize:12, fontWeight:700, color:"var(--st-white)", lineHeight:1.2 }}>{tab.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:COURSES[4].dim, border:`1px solid ${COURSES[4].bdr}`, borderRadius:12 }}>
                    <span style={{ fontSize:18 }}>{COURSES[4].icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:COURSES[4].color, fontWeight:700, letterSpacing:".1em" }}>{COURSES[4].code}</div>
                      <div style={{ fontFamily:"var(--st-font-d)", fontSize:12, fontWeight:700, color:"var(--st-white)" }}>{COURSES[4].name}</div>
                    </div>
                    <span style={{ fontFamily:"var(--st-font-m)", fontSize:9, color:"var(--st-muted)" }}>{COURSES[4].ages}</span>
                  </div>
                </div>
                {/* Branch list */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["📍 Rohini Sec-16","📍 Rohini Sec-11","📍 Gurgaon"].map(b => (
                    <div key={b} style={{ fontFamily:"var(--st-font-m)", fontSize:11, color:"var(--st-muted)", background:"rgba(255,255,255,.04)", border:"1px solid var(--st-bdr)", borderRadius:8, padding:"7px 12px" }}>{b}</div>
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
export default function STEMCourse() {
  return (
    <div className="st-page">
      <STEMStyles />
      <Hero />
      <MarqueeBar />
      <div style={{ padding:"72px 24px 0", background:"var(--st-bg)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <FadeIn><StatsBar /></FadeIn>
        </div>
      </div>
      <CourseDetails />
      <Why />
      <Pathway />
      <CTABanner />
    </div>
  );
}
