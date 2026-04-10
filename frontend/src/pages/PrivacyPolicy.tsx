import { useEffect } from "react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p style={{ color: S.muted, fontSize: 14 }}>Last updated: January 2025</p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: S.border, marginBottom: 48 }} />

        {/* Content */}
        {[
          {
            title: "Information We Collect",
            body: "We collect information you provide directly to us, such as when you create an account, enroll in a course, or contact us for support. This may include your name, email address, phone number, and your child's age and grade level.",
          },
          {
            title: "How We Use Your Information",
            body: "We use the information we collect to provide, maintain, and improve our educational services; communicate with you about courses, schedules, and progress; send administrative messages; and respond to your inquiries.",
          },
          {
            title: "Information Sharing",
            body: "We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our platform, provided they agree to keep this information confidential.",
          },
          {
            title: "Data Security",
            body: "We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure.",
          },
          {
            title: "Children's Privacy",
            body: "Our services are designed for children with parental supervision. We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you believe we have inadvertently collected such information, please contact us.",
          },
          {
            title: "Cookies",
            body: "We use cookies and similar tracking technologies to track activity on our platform and hold certain information to improve your experience. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.",
          },
          {
            title: "Changes to This Policy",
            body: "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the 'Last updated' date.",
          },
          {
            title: "Account Deletion",
            body: "Users can request account and associated data deletion by emailing ayushkhurana47@gmail.com from their registered account email with the subject 'Account Deletion Request'. We delete account profile and associated learning data. Minimal records may be retained for legal, security, and fraud-prevention purposes and are removed within 90 days unless a longer period is required by law. Deletion instructions are also available at /account-deletion.",
          },
          {
            title: "Contact Us",
            body: "If you have any questions about this Privacy Policy, please contact us at: BlackMonkey. Email: support@blackmonkey.in.",
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
            This is a summary of our privacy practices. For full details or to exercise your rights, contact us at{" "}
            <a href="tel:+919266117055" style={{ color: S.purple, textDecoration: "none" }}>+91 92661 17055</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
