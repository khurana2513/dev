import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowRight, Trophy, Zap, BarChart3, Flame, FileText,
  Target, Brain, Medal, Globe, Calendar, Heart,
  Calculator, BookOpen, PenTool, Rocket, Phone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const handler = () => setY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return y;
}

// ─────────────────────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────────────────────
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ─────────────────────────────────────────────────────────────
// IN-VIEW WRAPPER
// ─────────────────────────────────────────────────────────────
function InView({ children, className = "", delay = 0, direction = "up" }: {
  children: React.ReactNode; className?: string; delay?: number; direction?: "up" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView();
  const transforms: Record<string, string> = {
    up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none",
  };
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : transforms[direction],
      transition: `opacity 0.7s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.7s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700;1,800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

    :root {
      --th-bg: #07080F;
      --th-bg2: #0D0F1C;
      --th-bg3: #131629;
      --th-surface: #0F1120;
      --th-surface2: #151829;
      --th-border: rgba(255,255,255,0.06);
      --th-border2: rgba(255,255,255,0.1);
      --th-purple: #7C3AED;
      --th-purple2: #A855F7;
      --th-purple-mid: #9D7FF0;
      --th-purple-dim: rgba(124,58,237,0.12);
      --th-purple-glow: rgba(124,58,237,0.25);
      --th-gold: #F59E0B;
      --th-gold-dim: rgba(245,158,11,0.12);
      --th-teal: #0FB8A0;
      --th-orange: #EA580C;
      --th-white: #F8FAFC;
      --th-white2: #94A3B8;
      --th-muted: #475569;
      --th-muted2: #636888;
      --th-font-display: 'Playfair Display', Georgia, serif;
      --th-font-body: 'Inter', system-ui, sans-serif;
      --th-font-mono: 'Space Grotesk', monospace;
    }

    .th-gradient-text {
      background: linear-gradient(135deg, var(--th-purple2) 0%, #C084FC 50%, var(--th-purple) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .th-gold-text {
      background: linear-gradient(135deg, var(--th-gold) 0%, #FCD34D 50%, var(--th-gold) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .th-shimmer-text {
      background: linear-gradient(90deg, var(--th-white2) 0%, var(--th-white) 25%, var(--th-purple2) 50%, var(--th-white) 75%, var(--th-white2) 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: th-shimmer 4s linear infinite;
    }
    .th-section-label {
      font-family: var(--th-font-mono);
      font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--th-purple2);
      display: inline-flex; align-items: center; gap: 8px;
    }
    .th-section-label::before {
      content: ''; display: block; width: 18px; height: 1px; background: var(--th-purple2);
    }
    .th-card-hover {
      transition: all 0.35s cubic-bezier(.4,0,.2,1);
    }
    .th-card-hover:hover {
      transform: translateY(-5px);
      border-color: rgba(124,58,237,0.4) !important;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 48px rgba(124,58,237,0.08) !important;
    }
    .th-btn-primary {
      background: linear-gradient(135deg, var(--th-purple) 0%, #5b21b6 100%);
      color: white; border: none; padding: 14px 28px; border-radius: 14px;
      font-family: var(--th-font-body); font-size: 15px; font-weight: 600;
      cursor: pointer; transition: all 0.25s ease;
      display: inline-flex; align-items: center; gap: 8px;
      white-space: nowrap; position: relative; overflow: hidden;
    }
    .th-btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 40px rgba(124,58,237,0.5); }
    .th-btn-primary:active { transform: scale(0.98); }
    .th-btn-secondary {
      background: transparent; color: var(--th-white2);
      border: 1px solid var(--th-border2); padding: 14px 28px; border-radius: 14px;
      font-family: var(--th-font-body); font-size: 15px; font-weight: 500;
      cursor: pointer; transition: all 0.25s ease;
      display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
    }
    .th-btn-secondary:hover {
      border-color: rgba(124,58,237,0.5); background: rgba(124,58,237,0.08);
      color: var(--th-white); transform: translateY(-2px);
    }
    .th-noise {
      position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: 0.02;
    }
    .th-noise::after {
      content: ''; position: absolute; inset: -50%;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      animation: th-grain 0.5s steps(1) infinite;
    }
    .th-glow-line {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--th-purple-glow), transparent);
    }

    @keyframes th-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    @keyframes th-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
    @keyframes th-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes th-grain {
      0%, 100% { transform: translate(0,0); } 10% { transform: translate(-2%,-3%); }
      20% { transform: translate(3%,2%); } 30% { transform: translate(-1%,4%); }
      40% { transform: translate(2%,-1%); } 50% { transform: translate(-3%,2%); }
    }
    @keyframes th-burst-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(234,88,12,0.4); }
      50% { box-shadow: 0 0 0 10px rgba(234,88,12,0); }
    }
    @keyframes th-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .th-hide-mobile { display: none !important; }
    }
    @media (min-width: 769px) {
      .th-hide-desktop { display: none !important; }
    }
  `}</style>
);

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "National Olympiad Winners", "Mental Calculation Champions",
  "18+ Years of Excellence", "900+ Students Shaped",
  "Abacus · Vedic Maths · Handwriting · STEM",
  "Certificates & Medals at Every Level", "Monthly Assessments",
  "Institute Leaderboard · Real-Time Rankings",
];

const STATS = [
  { value: 18, suffix: "+", label: "Years of Excellence" },
  { value: 900, suffix: "+", label: "Students Guided" },
  { value: 4, suffix: "", label: "Programs Offered" },
  { value: 3, suffix: "", label: "Branches in Delhi NCR" },
];

const COURSES = [
  {
    id: "abacus", name: "Study Abacus", tag: "Ages 5–15 · 10 Levels",
    tagline: "Mental Visualization Engine",
    desc: "From counting beads to performing complex multi-digit calculations entirely in the mind. Abacus rewires how children think — permanently.",
    color: "#7C3AED", dimColor: "rgba(124,58,237,0.10)", glowColor: "rgba(124,58,237,0.20)", borderColor: "rgba(124,58,237,0.25)",
    icon: Calculator,
    outcomes: ["Mental calculation speed", "Focus & concentration", "Visual memory", "Math confidence"],
    stat: "10 Levels · 4 Months Each",
    image: "/imagesproject/homepage/abacus.png", path: "/courses/abacus",
  },
  {
    id: "vedic", name: "Vedic Maths", tag: "Ages 10+ · 4 Levels",
    tagline: "Ancient Speed. Modern Edge.",
    desc: "16 sacred sutras from ancient Indian mathematics. Solve 997 × 998 in seconds. Competitive exam prep unlike anything taught in school.",
    color: "#F59E0B", dimColor: "rgba(245,158,11,0.10)", glowColor: "rgba(245,158,11,0.20)", borderColor: "rgba(245,158,11,0.25)",
    icon: BookOpen,
    outcomes: ["Exam speed tactics", "Complex mental arithmetic", "LCM, GCD, roots", "Competitive edge"],
    stat: "4 Levels · 4 Months Each",
    image: "/imagesproject/homepage/Vedic-Maths.png", path: "/courses/vedic-maths",
  },
  {
    id: "handwriting", name: "Handwriting", tag: "All Ages · 3 Months",
    tagline: "Precision. Clarity. Confidence.",
    desc: "English and Hindi tracks. Fine motor control meets cognitive rhythm. Students see measurable improvement within weeks.",
    color: "#0FB8A0", dimColor: "rgba(15,184,160,0.10)", glowColor: "rgba(15,184,160,0.20)", borderColor: "rgba(15,184,160,0.25)",
    icon: PenTool,
    outcomes: ["Legibility & speed", "English & Hindi tracks", "Creative calligraphy", "Exam handwriting"],
    stat: "1 Level · 3 Months",
    image: "/imagesproject/homepage/handwriting.png", path: "/courses/handwriting",
  },
  {
    id: "stem", name: "STEM", tag: "Ages 4–18 · 5 Courses",
    tagline: "Engineers Start Here.",
    desc: "From paper circuits at age 4 to drone engineering at 18. Five progressive courses under the Black Monkey umbrella. Hands-on, project-based, real.",
    color: "#EA580C", dimColor: "rgba(234,88,12,0.10)", glowColor: "rgba(234,88,12,0.20)", borderColor: "rgba(234,88,12,0.25)",
    icon: Rocket,
    outcomes: ["Robotics & IoT", "Drone engineering", "AI & Machine learning", "Real-world projects"],
    stat: "5 Courses · 8–12 Weeks Each",
    image: "/imagesproject/homepage/stem.png", path: "/courses/stem",
    external: true, externalLabel: "Powered by Black Monkey ↗",
  },
];

const WHY_ITEMS = [
  {
    icon: Brain, label: "COGNITIVE REWIRING",
    title: "Not just math — it's brain training.",
    desc: "Abacus and Vedic Maths develop the visualization, focus, and working memory that improve performance across every subject — permanently. Not a shortcut. A rewire.",
    color: "#7C3AED", stat: "2× Faster", statLabel: "average mental calculation speed after Level 3",
  },
  {
    icon: Trophy, label: "PROVEN RESULTS",
    title: "18 years. 900+ students. Medals to prove it.",
    desc: "Every year, our students compete in national and international olympiads — and win. Tablets, cycles, cash prizes, and the confidence that comes from beating your best self.",
    color: "#F59E0B", stat: "900+", statLabel: "students guided across 18 years",
  },
  {
    icon: Target, label: "STRUCTURED PROGRESSION",
    title: "Every level earned, never given.",
    desc: "Monthly tests, level completions with certificates and medals, and regular activities that make practice genuinely engaging — not the rote drilling found elsewhere.",
    color: "#0FB8A0", stat: "100%", statLabel: "structured curriculum with monthly assessment",
  },
];

const TOOLKIT_ITEMS = [
  {
    icon: FileText, title: "Live Paper Attempt",
    desc: "Exam practice with Abacus and Vedic Maths papers. Timed, scored, and reviewed instantly.",
    color: "#7C3AED", cta: "Attempt Now", path: "/create", featured: true,
  },
  {
    icon: Brain, title: "Mental Math Practice",
    desc: "Targeted drills by operation, level, and difficulty. Track accuracy and speed across sessions.",
    color: "#7C3AED", cta: "Practice", path: "/mental", featured: true,
  },
  {
    icon: Zap, title: "Burst Mode",
    desc: "60 seconds. Maximum questions. Compete against yourself and the institute leaderboard.",
    color: "#EA580C", cta: "Start Burst", path: "/burst", featured: true, pulse: true,
  },
  {
    icon: BarChart3, title: "Progress Dashboard",
    desc: "Detailed analytics on accuracy, speed, and consistency. See exactly where to improve.",
    color: "#0FB8A0", cta: "View Dashboard", path: "/dashboard", featured: false,
  },
  {
    icon: Trophy, title: "Leaderboard",
    desc: "Institute-wide rankings updated in real time. Compete for the top spot every week.",
    color: "#F59E0B", cta: "See Rankings", path: "/leaderboard", featured: false, comingSoon: true,
  },
  {
    icon: Flame, title: "Streaks & Rewards",
    desc: "Daily streaks, badges, and milestone rewards. Consistency becomes its own motivation.",
    color: "#7C3AED", cta: "View Badges", path: "/rewards", featured: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "Abacus is a very good and effective technique to speed up calculations. It has great advantages as it helps in perfecting the brain as a whole. The brain is sharpened which is not only useful for maths but other subjects as well.",
    name: "Neha Khanna", role: "Parent · Rohini Sector 16", initials: "NK", course: "Abacus", courseColor: "#7C3AED", stars: 5,
  },
  {
    quote: "Very good institute for Abacus and vedic maths. My son's numeracy skills have considerably developed under the guidance of Ms. Sunita Khurana. Personal attention is given to each kid and visible difference can be seen in the performance level at school.",
    name: "Shikha Khandelwal", role: "Parent · Rohini Sector 16", initials: "SK", course: "Abacus", courseColor: "#7C3AED", stars: 5,
  },
  {
    quote: "My child has learnt a lot from Sunita ma'am. She is one of the finest teachers at Talent Hub. Now Lavya can calculate orally bigger numbers too. Thanks ma'am for your support and dedication towards kids.",
    name: "Lavya Singal", role: "Parent · Rohini Sector 16", initials: "LS", course: "Abacus", courseColor: "#0FB8A0", stars: 5,
  },
  {
    quote: "I really want to thank Sunita ma'am for her efforts and guidance. Due to her hard work and support my son has developed a good understanding of the concepts and he has shown remarkable progress over the course.",
    name: "Neha Sachdeva", role: "Parent · Rohini Sector 16", initials: "NS", course: "Vedic Maths", courseColor: "#F59E0B", stars: 5,
  },
  {
    quote: "Children are being nurtured well, thanks for that. I hope that Talent Hub and parents continuously make sure that the children do not get prize-oriented alone, and are continually made aware of the need for practising human values.",
    name: "Yash", role: "Student · Rohini Sector 16", initials: "Y", course: "Abacus", courseColor: "#7C3AED", stars: 5,
  },
  {
    quote: "My Class 2 child enjoys attending abacus classes and has shown clear improvement in calculation speed, focus, and confidence in maths. The teacher is patient and explains concepts in a simple, engaging way. Highly recommend.",
    name: "Mehak Garg", role: "Parent · Rohini Sector 16", initials: "MG", course: "Abacus", courseColor: "#EA580C", stars: 5,
  },
];

const ACHIEVEMENTS = [
  { title: "National & International Olympiads", desc: "Compete and win at prestigious math olympiads every year", icon: Globe, image: "/imagesproject/homepage/olympiads.jpeg" },
  { title: "Medals & Certificates", desc: "Earn recognition for achievements and milestones at every level", icon: Medal, image: "/imagesproject/homepage/medals_certificates.jpeg" },
  { title: "Monthly Tests", desc: "Regular assessments every last Sunday to track precise progress", icon: Calendar, image: "/imagesproject/homepage/monthly_tests.jpeg" },
  { title: "Fun & Co-curricular Activities", desc: "Engaging activities that make the learning journey enjoyable", icon: Heart, image: "/imagesproject/homepage/fun_activities.jpeg" },
];

// ─────────────────────────────────────────────────────────────
// MARQUEE BAR
// ─────────────────────────────────────────────────────────────
function MarqueeBar() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid var(--th-border)", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg2)", padding: "13px 0" }}>
      <div style={{ display: "flex", animation: "th-marquee 30s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 20px", fontFamily: "var(--th-font-mono)", fontSize: 12, color: "var(--th-muted)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--th-purple)", opacity: 0.7 }}>✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <section style={{ padding: "72px 24px", background: "var(--th-bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="rsp-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, borderRadius: 20, overflow: "hidden", border: "1px solid var(--th-border)" }}>
          {STATS.map((stat, i) => (
            <InView key={i} delay={i * 0.1}>
              <div style={{ background: "var(--th-surface)", padding: "36px 28px", borderRight: i < 3 ? "1px solid var(--th-border)" : "none", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.15, marginBottom: 8, paddingBottom: "0.1em", overflow: "visible" }} className="th-gradient-text">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{stat.label}</div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRAMS SECTION
// ─────────────────────────────────────────────────────────────
function Programs() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  return (
    <section style={{ padding: "96px 24px", background: "var(--th-bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, var(--th-purple-glow), transparent)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ marginBottom: 56 }}>
            <div className="th-section-label" style={{ marginBottom: 14 }}>What We Teach</div>
            <h2 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 520, color: "var(--th-white)" }}>
              Four Pathways to{" "}
              <span className="th-gradient-text">Sharper Thinking</span>
            </h2>
            <p style={{ color: "var(--th-white2)", fontSize: 17, lineHeight: 1.7, maxWidth: 500, marginTop: 14 }}>
              Structured, progressive, and built for real cognitive growth — not shortcuts.
            </p>
          </div>
        </InView>

        <div className="rsp-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
          {COURSES.map((course, i) => (
            <InView key={course.id} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
              <div
                className="th-card-hover"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setLocation(course.path)}
                style={{
                  background: hovered === i ? `linear-gradient(135deg, ${course.dimColor.replace("0.10","0.18")}, var(--th-surface))` : "var(--th-surface)",
                  border: `1px solid ${hovered === i ? course.borderColor : "var(--th-border)"}`,
                  borderRadius: 22, padding: "32px",
                  boxShadow: hovered === i ? `0 24px 60px rgba(0,0,0,0.45), 0 0 48px ${course.glowColor}` : "none",
                  position: "relative", overflow: "hidden", cursor: "pointer",
                  transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
                }}
              >
                <div style={{ position: "absolute", top: -48, right: -48, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${course.glowColor} 0%, transparent 70%)`, opacity: hovered === i ? 1 : 0, transition: "opacity 0.35s ease", pointerEvents: "none" }} />

                {course.external && (
                  <div style={{ position: "absolute", top: 18, right: 18, background: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.25)", borderRadius: 8, padding: "4px 10px", fontFamily: "var(--th-font-mono)", fontSize: 10, color: "#EA580C", letterSpacing: "0.04em" }}>STEM · 5 Courses</div>
                )}

                <div style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 18, border: `1px solid ${course.borderColor}`, overflow: "hidden", flexShrink: 0, background: course.dimColor }}>
                  {course.image
                    ? <img src={course.image} alt={course.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><course.icon size={28} style={{ color: course.color }} /></div>
                  }
                </div>

                <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: course.color, textTransform: "uppercase", marginBottom: 6 }}>{course.tag}</div>
                <h3 style={{ fontFamily: "var(--th-font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4, color: "var(--th-white)" }}>{course.name}</h3>
                <div style={{ fontFamily: "var(--th-font-body)", fontSize: 13, fontWeight: 500, color: course.color, marginBottom: 14, opacity: 0.85 }}>{course.tagline}</div>
                <p style={{ color: "var(--th-white2)", fontSize: 14, lineHeight: 1.65, marginBottom: 16 }}>{course.desc}</p>


                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, borderTop: "1px solid var(--th-border)" }}>
                  <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-muted)", letterSpacing: "0.05em" }}>{course.stat}</span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: course.color, fontFamily: "var(--th-font-body)", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0, transition: "gap 0.2s ease" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.gap = "10px"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.gap = "6px"}
                  >
                    {course.external ? "Explore STEM" : "Learn More"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// WHY TALENT HUB
// ─────────────────────────────────────────────────────────────
function WhySection() {
  return (
    <section style={{ padding: "96px 24px", background: "var(--th-bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ marginBottom: 56, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="th-section-label" style={{ marginBottom: 14 }}>Why Choose Us</div>
              <h2 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--th-white)" }}>
                The Talent Hub <span className="th-gradient-text">Difference</span>
              </h2>
            </div>
            <p style={{ color: "var(--th-white2)", fontSize: 15, maxWidth: 300, lineHeight: 1.65 }}>
              18 years of refining our methods — here's what makes our students stand apart.
            </p>
          </div>
        </InView>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {WHY_ITEMS.map((item, i) => (
            <InView key={i} delay={i * 0.12}>
              <div className="rsp-why-row" style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 40, alignItems: "center",
                padding: "36px 36px", background: "var(--th-surface)", borderRadius: 20, border: "1px solid var(--th-border)", cursor: "default",
                transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${item.color}50`; el.style.transform = "translateX(5px)"; el.style.background = "var(--th-surface2)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--th-border)"; el.style.transform = "none"; el.style.background = "var(--th-surface)"; }}
              >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 15, background: `linear-gradient(135deg, ${item.color}30, ${item.color}12)`, border: `1px solid ${item.color}35`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>
                    <item.icon size={22} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: item.color }}>{item.label}</div>
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 12, color: "var(--th-white)", lineHeight: 1.2 }}>{item.title}</h3>
                  <p style={{ color: "var(--th-white2)", fontSize: 15, lineHeight: 1.75 }}>{item.desc}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(30px, 3vw, 44px)", fontWeight: 800, letterSpacing: "-0.04em", color: item.color, lineHeight: 1.15, paddingBottom: "0.1em", overflow: "visible" }}>{item.stat}</div>
                  <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-white2)", letterSpacing: "0.04em", marginTop: 6, lineHeight: 1.5 }}>{item.statLabel}</div>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// TOOLKIT SECTION
// ─────────────────────────────────────────────────────────────
function Toolkit() {
  const [, setLocation] = useLocation();
  return (
    <section style={{ padding: "96px 24px", background: "var(--th-bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, var(--th-purple-glow), transparent)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="th-section-label" style={{ justifyContent: "center", marginBottom: 14 }}>The Platform</div>
            <h2 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 14, color: "var(--th-white)" }}>
              Practice That <span className="th-gradient-text">Actually Works</span>
            </h2>
            <p style={{ color: "var(--th-white2)", fontSize: 17, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Every tool is engineered to reinforce real learning — not just keep students busy.
            </p>
          </div>
        </InView>

        <div className="rsp-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {TOOLKIT_ITEMS.map((item, i) => (
            <InView key={i} delay={i * 0.08}>
              <div
                onClick={() => setLocation(item.path)}
                style={{
                  background: item.featured ? "linear-gradient(145deg, rgba(124,58,237,0.13), rgba(124,58,237,0.04))" : "var(--th-surface)",
                  border: item.featured ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--th-border)",
                  borderRadius: 20, padding: "26px",
                  cursor: "pointer", position: "relative", overflow: "hidden",
                  boxShadow: item.featured ? "0 0 48px rgba(124,58,237,0.1)" : "none",
                  transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-5px)"; el.style.borderColor = item.featured ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.3)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "none"; el.style.borderColor = item.featured ? "rgba(124,58,237,0.35)" : "var(--th-border)"; }}
              >
                {item.featured && (
                  <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                )}
                <div style={{
                  width: 46, height: 46, borderRadius: 13, marginBottom: 16,
                  background: `linear-gradient(135deg, ${item.color}25, ${item.color}10)`,
                  border: `1px solid ${item.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", color: item.color,
                  animation: (item as any).pulse ? "th-burst-pulse 2s ease-in-out infinite" : "none",
                }}>
                  <item.icon size={20} strokeWidth={1.6} />
                </div>
                <h3 style={{ fontFamily: "var(--th-font-display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8, color: "var(--th-white)" }}>{item.title}</h3>
                <p style={{ color: "var(--th-white2)", fontSize: 14, lineHeight: 1.65, marginBottom: 18 }}>{item.desc}</p>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: item.color, fontFamily: "var(--th-font-body)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0, transition: "gap 0.2s ease" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.gap = "10px"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.gap = "6px"}
                >
                  {item.cta} <ArrowRight size={13} />
                </button>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS SECTION
// ─────────────────────────────────────────────────────────────
function AchievementsSection() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <section style={{ padding: "96px 24px", background: "var(--th-bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ marginBottom: 56 }}>
            <div className="th-section-label" style={{ marginBottom: 14 }}>Compete & Win</div>
            <h2 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--th-white)" }}>
              Olympiads &amp; <span className="th-gradient-text">Achievements</span>
            </h2>
            <p style={{ color: "var(--th-white2)", fontSize: 17, lineHeight: 1.7, maxWidth: 500, marginTop: 14 }}>
              Structured assessments and national-level competitions that recognize consistent effort and excellence.
            </p>
          </div>
        </InView>

        <div className="rsp-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {ACHIEVEMENTS.map((a, i) => (
            <InView key={i} delay={i * 0.1}>
              <div
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="rsp-achieve-card" style={{ position: "relative", height: 360, borderRadius: 22, overflow: "hidden", border: "1px solid var(--th-border)", cursor: "pointer", transition: "all 0.35s cubic-bezier(.4,0,.2,1)", transform: hovered === i ? "translateY(-5px)" : "none", boxShadow: hovered === i ? "0 24px 64px rgba(0,0,0,0.5), 0 0 48px rgba(124,58,237,0.1)" : "none" }}
              >
                <img src={a.image} alt={a.title} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: hovered === i ? "scale(1.06)" : "scale(1)", transition: "transform 0.6s cubic-bezier(.4,0,.2,1)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,8,15,0.95) 0%, rgba(7,8,15,0.4) 50%, transparent 100%)" }} />
                <div style={{ position: "absolute", bottom: 22, left: 22, right: 22 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, color: "white" }}>
                    <a.icon size={16} strokeWidth={1.6} />
                  </div>
                  <h3 style={{ fontFamily: "var(--th-font-display)", fontSize: 15, fontWeight: 700, color: "white", marginBottom: 5, lineHeight: 1.3 }}>{a.title}</h3>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{a.desc}</p>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────────────────────────
function Testimonials() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const current = TESTIMONIALS[active];
  const others = TESTIMONIALS.filter((_, i) => i !== active).slice(0, 2);

  return (
    <section style={{ padding: "96px 24px", background: "var(--th-bg2)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="th-section-label" style={{ justifyContent: "center", marginBottom: 14 }}>Parent Voices</div>
            <h2 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--th-white)" }}>
              What Parents <span className="th-gradient-text">Actually Say</span>
            </h2>
          </div>
        </InView>

        <div className="rsp-test-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {/* Featured quote */}
          <InView direction="left">
            <div style={{ background: "linear-gradient(145deg, var(--th-surface), var(--th-bg3))", border: "1px solid var(--th-border2)", borderRadius: 22, padding: "36px", gridRow: "span 2", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${current.courseColor}, transparent)` }} />
              <div style={{ fontSize: 64, lineHeight: 1, color: "rgba(124,58,237,0.15)", fontFamily: "Georgia,serif", marginBottom: 4 }}>"</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {Array.from({ length: current.stars }).map((_, i) => <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#F59E0B"><path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.5l-3.7 1.8.7-4.1-3-2.9 4.2-.7L7 1z"/></svg>)}
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}
                    style={{ fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.75, color: "var(--th-white)", fontFamily: "var(--th-font-body)", fontWeight: 300 }}>
                    {current.quote}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${current.courseColor}40, ${current.courseColor}20)`, border: `1px solid ${current.courseColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--th-font-display)", fontSize: 15, fontWeight: 800, color: "var(--th-white)" }}>
                  {current.initials}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--th-font-display)", fontSize: 14, fontWeight: 700, color: "var(--th-white)" }}>{current.name}</div>
                  <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-muted)", letterSpacing: "0.04em", marginTop: 2 }}>{current.role}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span style={{ background: `${current.courseColor}20`, border: `1px solid ${current.courseColor}30`, borderRadius: 7, padding: "3px 9px", fontFamily: "var(--th-font-mono)", fontSize: 10, color: current.courseColor, letterSpacing: "0.06em" }}>{current.course}</span>
                </div>
              </div>
              {/* Dots */}
              <div style={{ display: "flex", gap: 5, marginTop: 20 }}>
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)} style={{ width: active === i ? 22 : 6, height: 6, borderRadius: 3, background: active === i ? "var(--th-purple)" : "var(--th-surface2)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s ease" }} />
                ))}
              </div>
            </div>
          </InView>

          {/* Right mini cards */}
          {others.map((t, i) => (
            <InView key={t.name} delay={i * 0.15} direction="right">
              <div onClick={() => setActive(TESTIMONIALS.indexOf(t))}
                style={{ background: "var(--th-surface)", border: "1px solid var(--th-border)", borderRadius: 20, padding: "22px", cursor: "pointer", transition: "all 0.3s ease" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "rgba(124,58,237,0.3)"; el.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--th-border)"; el.style.transform = "none"; }}
              >
                <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                  {Array.from({ length: t.stars }).map((_, si) => <svg key={si} width="13" height="13" viewBox="0 0 14 14" fill="#F59E0B"><path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.5l-3.7 1.8.7-4.1-3-2.9 4.2-.7L7 1z"/></svg>)}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--th-white2)", marginBottom: 18, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.quote}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${t.courseColor}25`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--th-font-display)", fontSize: 12, fontWeight: 800, color: "var(--th-white)" }}>{t.initials}</div>
                  <div>
                    <div style={{ fontFamily: "var(--th-font-display)", fontSize: 13, fontWeight: 700, color: "var(--th-white)" }}>{t.name}</div>
                    <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-muted)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────────────────────
function CTABanner() {
  const [, setLocation] = useLocation();
  return (
    <section style={{ padding: "72px 24px", background: "var(--th-bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div className="rsp-cta-inner" style={{ position: "relative", borderRadius: 26, overflow: "hidden", background: "linear-gradient(135deg, #2d1a6e 0%, #1a1040 40%, #0d0820 100%)", border: "1px solid rgba(124,58,237,0.25)", padding: "64px 56px", boxShadow: "0 48px 100px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

            <div style={{ position: "relative", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "5px 14px", marginBottom: 24 }}>
                <span style={{ fontSize: 13 }}>🎯</span>
                <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", textTransform: "uppercase" }}>One free session. No commitment.</span>
              </div>
              <h2 style={{ fontFamily: "var(--th-font-display)", fontSize: "clamp(30px, 5vw, 58px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: 18, color: "white" }}>
                Ready to Begin{" "}
                <span className="th-shimmer-text">the Journey?</span>
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.62)", lineHeight: 1.7, marginBottom: 36 }}>
                The first step to mathematical mastery begins with a single session. See the difference yourself — before committing to anything.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setLocation("/dashboard")} style={{ background: "white", color: "#1a1040", border: "none", padding: "14px 30px", borderRadius: 13, fontFamily: "var(--th-font-body)", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.25s ease" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(-2px) scale(1.02)"; el.style.boxShadow = "0 14px 40px rgba(255,255,255,0.2)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "none"; el.style.boxShadow = "none"; }}
                >
                  Get Started <ArrowRight size={16} />
                </button>
                <a href="tel:+919266117055" style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "14px 26px", borderRadius: 13, fontFamily: "var(--th-font-body)", fontSize: 16, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", transition: "all 0.25s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <Phone size={16} /> Call Us Now
                </a>
              </div>
            </div>
          </div>
        </InView>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// FOOTER

// ─────────────────────────────────────────────────────────────
// MAIN HOME COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loaded, setLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shuffledImages, setShuffledImages] = useState<string[]>([]);

  const carouselImages = useMemo(() => [
    "1.jpg","4.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg","11.jpg","12.jpg","13.jpg","14.jpg",
    "0O9A8432.JPG","0O9A8434.JPG","0O9A8502.JPG","0O9A8564.JPG","0O9A8654.JPG","0O9A8660.JPG","0O9A8663.JPG",
    "0O9A8664.JPG","0O9A8666.JPG","0O9A8670.JPG","0O9A8671.JPG","0O9A8673.JPG","2G4A0012.JPG","2G4A0026.JPG",
    "2G4A0060.JPG","2G4A0559.JPG","2G4A0567.JPG","2G4A0742.JPG","773A1293.JPG","773A1317.JPG","773A1605.JPG","773A1606.JPG"
  ], []);

  const shuffleArray = (arr: string[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  useEffect(() => { setShuffledImages(shuffleArray(carouselImages)); }, [carouselImages]);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!shuffledImages.length) return;
    const preload = (src: string) => { const img = new Image(); img.src = `/imagesproject/${src}`; };
    preload(shuffledImages[(currentImageIndex + 1) % shuffledImages.length]);
    preload(shuffledImages[(currentImageIndex + 2) % shuffledImages.length]);
  }, [currentImageIndex, shuffledImages]);

  useEffect(() => {
    if (!shuffledImages.length) return;
    const timer = setInterval(() => setCurrentImageIndex(p => (p + 1) % shuffledImages.length), 5000);
    return () => clearInterval(timer);
  }, [shuffledImages]);

  if (!shuffledImages.length) return null;

  return (
    <div style={{ background: "var(--th-bg)", color: "var(--th-white)", fontFamily: "var(--th-font-body)", overflowX: "hidden" }}>
      <GlobalStyles />
      <div className="th-noise" />

      {/* ── HERO SECTION ──────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 1 }}>
        <div style={{ position: "absolute", top: "8%", left: "3%", width: 650, height: 650, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "8%", right: "3%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)" }} />

        <div className="rsp-hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", width: "100%", display: "grid", gridTemplateColumns: "55% 42%", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(14px)", transition: "all 0.6s cubic-bezier(.4,0,.2,1) 0.1s", display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: 100, padding: "7px 14px", marginBottom: 24 }}>
              <span style={{ color: "var(--th-purple2)", fontSize: 11 }}>✦</span>
              <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, fontWeight: 500, color: "var(--th-purple2)", letterSpacing: "0.04em" }}>18+ Years of Excellence</span>
            </div>

            <h1 style={{ fontFamily: "var(--th-font-display)", fontWeight: 800, lineHeight: 1.01, letterSpacing: "-0.03em", marginBottom: 20, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(22px)", transition: "all 0.7s cubic-bezier(.4,0,.2,1) 0.2s" }}>
              <span style={{ display: "block", fontSize: "clamp(48px, 5.8vw, 82px)", color: "var(--th-white)" }}>Crafting</span>
              <span style={{ display: "block", fontSize: "clamp(48px, 5.8vw, 82px)" }} className="th-gradient-text">Genius</span>
              <span style={{ display: "block", fontSize: "clamp(48px, 5.8vw, 82px)", color: "var(--th-white)" }}>One Beat</span>
              <span style={{ display: "block", fontSize: "clamp(48px, 5.8vw, 82px)", color: "var(--th-white)" }}>at a Time.</span>
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.72, color: "var(--th-white2)", maxWidth: 440, marginBottom: 32, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(18px)", transition: "all 0.7s cubic-bezier(.4,0,.2,1) 0.35s" }}>
              Strong basics, regular practice, and the confidence that shows — in class, in exams, and beyond. We build thinkers, not test-takers.
            </p>

            <div style={{ display: "flex", gap: 11, flexWrap: "wrap", opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(14px)", transition: "all 0.7s cubic-bezier(.4,0,.2,1) 0.45s" }}>
              <button className="th-btn-primary" onClick={() => setLocation(isAuthenticated ? "/dashboard" : "/login")} style={{ fontSize: 15, padding: "13px 26px" }}>
                Start Your Journey <ArrowRight size={15} />
              </button>
              <button className="th-btn-secondary" onClick={() => document.getElementById("courses-section")?.scrollIntoView({ behavior: "smooth" })} style={{ fontSize: 15, padding: "13px 26px" }}>
                Explore Programs
              </button>
            </div>

          </div>

          {/* Right visual */}
          <div className="th-hide-mobile" style={{ position: "relative", opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(28px)", transition: "all 0.9s cubic-bezier(.4,0,.2,1) 0.3s", alignSelf: "flex-start", marginTop: 20 }}>
            <div style={{ background: "linear-gradient(145deg, var(--th-surface), var(--th-bg3))", border: "1px solid var(--th-border2)", borderRadius: 26, overflow: "hidden", height: 520, position: "relative", boxShadow: "0 48px 100px rgba(0,0,0,0.55), 0 0 60px rgba(124,58,237,0.12)" }}>
              <AnimatePresence mode="wait">
                <motion.div key={currentImageIndex} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }} style={{ position: "absolute", inset: 0 }}>
                  <img
                    src={`/imagesproject/${shuffledImages[currentImageIndex]}`}
                    className="w-full h-full object-cover"
                    alt="Talent Hub Excellence"
                    loading={currentImageIndex === 0 ? "eager" : "lazy"}
                    decoding="async"
                    {...(currentImageIndex === 0 ? { fetchPriority: "high" } : {})}
                  />
                </motion.div>
              </AnimatePresence>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,8,15,0.75) 0%, rgba(7,8,15,0.1) 50%, transparent 100%)" }} />
            </div>

            <div style={{ position: "absolute", bottom: 22, left: -18, background: "rgba(7,8,15,0.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 13, padding: "11px 14px", animation: "th-float 5s ease-in-out infinite 1.2s", boxShadow: "0 8px 30px rgba(0,0,0,0.4)", zIndex: 2 }}>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 9, color: "var(--th-gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Latest Achievement</div>
              <div style={{ fontFamily: "var(--th-font-display)", fontSize: 14, fontWeight: 700, color: "white" }}>National Olympiad 🥇</div>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: loaded ? 0.35 : 0, transition: "opacity 1s ease 1.4s" }}>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--th-muted)", textTransform: "uppercase" }}>Scroll</div>
          <div style={{ width: 1, height: 36, background: "linear-gradient(to bottom, var(--th-muted), transparent)" }} />
        </div>
      </section>

      {/* ── REST OF SECTIONS ─────────────────────────────────────── */}
      <MarqueeBar />
      <StatsBar />

      <div id="courses-section">
        <Programs />
      </div>

      <WhySection />
      <Toolkit />
      <AchievementsSection />
      <Testimonials />
      <CTABanner />
    </div>
  );
}
