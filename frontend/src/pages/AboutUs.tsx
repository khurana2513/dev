import { useEffect } from "react";

export default function AboutUs() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: "#07070F", color: "#fff", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <section style={{ padding: "120px 24px 80px", textAlign: "center", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: 100, padding: "7px 18px", marginBottom: 28 }}>
          <span style={{ color: "#a78bfa", fontSize: 11 }}>✦</span>
          <span style={{ fontFamily: "var(--th-font-mono, 'JetBrains Mono', monospace)", fontSize: 12, fontWeight: 500, color: "#a78bfa", letterSpacing: "0.04em" }}>Est. 2006</span>
        </div>
        <h1 style={{ fontSize: "clamp(38px, 5.5vw, 72px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 22 }}>
          About{" "}
          <span style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Talent Hub
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.75, color: "rgba(255,255,255,0.55)", maxWidth: 620, margin: "0 auto" }}>
          For nearly two decades, Talent Hub has been shaping young minds through structured, skill-based learning in Abacus, Vedic Maths, Handwriting, and STEM — nurturing thinkers, problem-solvers, and confident learners.
        </p>
      </section>

      {/* Mission / Vision */}
      <section style={{ padding: "0 24px 90px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            {
              icon: "🎯",
              title: "Our Mission",
              text: "To make foundational skills — maths fluency, fine motor writing, logical reasoning — accessible to every child through expert-led, structured programmes.",
            },
            {
              icon: "🌟",
              title: "Our Vision",
              text: "To be India's most trusted after-school enrichment platform, where every learner leaves more capable, more confident, and more curious.",
            },
            {
              icon: "💡",
              title: "Our Approach",
              text: "Skill-first, competition-second. We focus on genuine understanding, consistent practice, and milestone-based progression that parents and students can see.",
            },
          ].map(({ icon, title, text }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 28px" }}>
              <div style={{ fontSize: 32, marginBottom: 18 }}>{icon}</div>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12, color: "#e2e8f0" }}>{title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.72, color: "rgba(255,255,255,0.5)" }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "0 24px 90px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { value: "18+", label: "Years of Excellence" },
            { value: "5000+", label: "Students Nurtured" },
            { value: "4", label: "Core Programmes" },
            { value: "50+", label: "Branches Nationwide" },
          ].map(({ value, label }) => (
            <div key={label} style={{ background: "#07070F", padding: "36px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, letterSpacing: "-0.04em", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10 }}>{value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section style={{ padding: "0 24px 90px", maxWidth: 780, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 28, color: "#e2e8f0" }}>
          Our Story
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            "Talent Hub was founded with a simple belief: every child has latent potential waiting to be structured and expressed. The founders — passionate educators with backgrounds in cognitive skill development — launched the first centre in 2006, offering Abacus training when the subject was barely known outside specialist circles.",
            "Over the years, Talent Hub expanded its curriculum to include Vedic Maths, Handwriting improvement, and a forward-looking STEM programme powered by AI/ML concepts — all designed around what children genuinely need to succeed in a fast-changing world.",
            "Today, Talent Hub serves thousands of students across multiple branches, and our digital platform allows learners to practice, track progress, and celebrate achievements from anywhere — while our in-person centres remain the heartbeat of everything we do.",
          ].map((para, i) => (
            <p key={i} style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.52)" }}>{para}</p>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 120px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 24, padding: "52px 40px" }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>Ready to join Talent Hub?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Explore our courses and enrol your child today.</p>
          <a href="/courses/abacus" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: "14px 28px", borderRadius: 14, fontSize: 15, fontWeight: 600, textDecoration: "none", letterSpacing: "-0.01em" }}>
            Explore Courses →
          </a>
        </div>
      </section>
    </div>
  );
}
