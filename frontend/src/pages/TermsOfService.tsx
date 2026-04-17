import { useEffect } from "react";
import { Link } from "wouter";

export default function TermsOfService() {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const S = {
    bg:      "#07080F",
    surface: "#0F1120",
    border:  "rgba(255,255,255,0.07)",
    white:   "#F8FAFC",
    white2:  "rgba(248,250,252,0.70)",
    muted:   "rgba(248,250,252,0.40)",
    purple:  "#7C3AED",
  };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", color: S.white, fontFamily: "'DM Sans','Outfit',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "80px 24px 120px" }}>

        {/* Back link */}
        <Link href="/">
          <a style={{ display: "inline-flex", alignItems: "center", gap: 8, color: S.muted, textDecoration: "none", fontSize: 14, marginBottom: 48, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = S.white2)}
            onMouseLeave={e => (e.currentTarget.style.color = S.muted)}>
            ← Back to Home
          </a>
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: "'DM Mono','JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: S.purple, marginBottom: 14 }}>
            Legal
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
            Terms of Service
          </h1>
          <p style={{ color: S.muted, fontSize: 14 }}>Last updated: January 2025</p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: S.border, marginBottom: 48 }} />

        {/* Content */}
        {[
          {
            title: "Acceptance of Terms",
            body: "By accessing and using BlackMonkey's services, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our services.",
          },
          {
            title: "Description of Services",
            body: "BlackMonkey provides a digital math education platform including Abacus training and Mental Maths practice for students and institutes. Our services are delivered through our digital platform, practice tools, and gamification systems.",
          },
          {
            title: "Enrollment and Fees",
            body: "Enrollment in courses is subject to availability. Fees are due as specified at the time of enrollment. We reserve the right to modify fee structures with reasonable advance notice to existing students.",
          },
          {
            title: "Attendance and Participation",
            body: "Regular attendance is important for progress. Students are expected to attend scheduled classes and complete assigned practice work. Missed classes may be made up subject to instructor availability.",
          },
          {
            title: "Intellectual Property",
            body: "All course materials, worksheets, digital content, and proprietary teaching methodologies are the intellectual property of BlackMonkey. Students and institutes may not reproduce, distribute, or share these materials without prior written consent.",
          },
          {
            title: "Code of Conduct",
            body: "Students are expected to behave respectfully within the platform. BlackMonkey reserves the right to suspend or discontinue services to any user who violates these terms or community standards.",
          },
          {
            title: "Limitation of Liability",
            body: "BlackMonkey's liability is limited to the fees paid for the specific service in question. We are not liable for indirect, incidental, or consequential damages arising from the use of our services.",
          },
          {
            title: "Cancellation and Refunds",
            body: "Cancellation policies vary by program. Please contact us directly to discuss refund eligibility. Generally, fees paid for completed classes are non-refundable.",
          },
          {
            title: "Modifications to Terms",
            body: "BlackMonkey reserves the right to modify these terms at any time. Continued use of our services following notification of changes constitutes acceptance of the updated terms.",
          },
          {
            title: "Contact",
            body: "For questions about these Terms of Service, please contact us at: BlackMonkey. Email: ayushkhurana47@gmail.com.",
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700, marginBottom: 12, color: S.white }}>
              {title}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.85, color: S.white2 }}>{body}</p>
          </div>
        ))}

        {/* Footer note */}
        <div style={{ marginTop: 64, padding: "24px", background: S.surface, borderRadius: 16, border: `1px solid ${S.border}` }}>
          <p style={{ fontSize: 13.5, color: S.muted, lineHeight: 1.7, margin: 0 }}>
            These terms govern your use of BlackMonkey services. For questions, reach us at{" "}
            <a href="mailto:ayushkhurana47@gmail.com" style={{ color: S.purple, textDecoration: "none" }}>ayushkhurana47@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
