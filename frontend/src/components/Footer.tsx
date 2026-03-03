import type { CSSProperties, ReactNode, MouseEvent as RMouseEvent } from "react";
import { Link } from "wouter";
import { GraduationCap, Phone, Mail, Instagram, MapPin, Calculator, BookOpen, PenTool, Rocket, Brain, Zap, FileText, Grid3X3, Sparkles } from "lucide-react";

/** Dark premium footer — always-dark design that works on any page. */
export default function Footer() {
  const D = {
    bg:      "#09090f",
    border:  "rgba(255,255,255,0.07)",
    white:   "#f0f0f8",
    white2:  "rgba(240,240,248,0.70)",
    muted:   "rgba(240,240,248,0.38)",
    muted2:  "rgba(240,240,248,0.22)",
    purple2: "#a78bfa",
  };

  const fontDisplay = "'Playfair Display',Georgia,serif";
  const fontMono    = "'DM Mono','JetBrains Mono',monospace";
  const fontBody    = "'DM Sans','Outfit',system-ui,sans-serif";

  const linkStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: 7,
    fontSize: 13.5, color: D.white2, textDecoration: "none",
    marginBottom: 8, fontFamily: fontBody, transition: "color 0.2s",
  };

  const sectionLabel: CSSProperties = {
    fontFamily: fontMono, fontSize: 10, fontWeight: 600,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: D.muted, marginBottom: 14,
  };

  const contactBtn: CSSProperties = {
    width: 36, height: 36, borderRadius: 10,
    border: `1px solid ${D.border}`,
    background: "rgba(255,255,255,0.04)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: D.muted, textDecoration: "none",
    transition: "all 0.2s ease",
  };

  const onConEnter = (e: RMouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    el.style.background = "rgba(124,58,237,0.15)";
    el.style.borderColor = "rgba(124,58,237,0.35)";
    el.style.color = D.purple2;
    el.style.transform = "translateY(-2px)";
  };
  const onConLeave = (e: RMouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    el.style.background = "rgba(255,255,255,0.04)";
    el.style.borderColor = D.border;
    el.style.color = D.muted;
    el.style.transform = "none";
  };

  const onLinkEnter = (e: RMouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = D.white;
  };
  const onLinkLeave = (e: RMouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = D.white2;
  };

  return (
    <footer style={{ background: D.bg, borderTop: `1px solid ${D.border}`, padding: "40px 24px 20px", fontFamily: fontBody }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "32px 28px", marginBottom: 32 }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img
                  src="/imagesproject/logo.ico.jpg"
                  alt="Talent Hub Logo"
                  style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = "none";
                    const fb = t.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                  display: "none", alignItems: "center", justifyContent: "center",
                }}>
                  <GraduationCap size={18} color="white" />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: D.white, lineHeight: 1.1 }}>Talent Hub</div>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: D.white2, lineHeight: 1.72, maxWidth: 260, marginBottom: 18 }}>
              Transforming how children learn and think through proven, structured, and genuinely engaging programs since 2006.
            </p>

            {/* Contact buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {([
                ["tel:+919266117055", "📞 Call", <Phone size={15} key="p" />],
                ["mailto:ayushkhurana47@gmail.com", "📧 Mail", <Mail size={15} key="m" />],
                ["https://www.instagram.com/talenthub16?igsh=NzRkcHpyY2N2bTVh", "📸 Instagram", <Instagram size={15} key="i" />],
                ["https://share.google/FtlKId4blBwgX9Q0w", "📍 Directions", <MapPin size={15} key="d" />],
              ] as [string, string, ReactNode][]).map(([href, title, icon]) => (
                <a key={title} href={href} style={contactBtn} title={title}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  onMouseEnter={onConEnter} onMouseLeave={onConLeave}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Programs */}
          <div>
            <div style={sectionLabel}>Programs</div>
            {([
              [Calculator, "Study Abacus",  "/courses/abacus"],
              [BookOpen,   "Vedic Maths",   "/courses/vedic-maths"],
              [PenTool,    "Handwriting",   "/courses/handwriting"],
              [Rocket,     "STEM",          "/courses/stem"],
            ] as [any, string, string][]).map(([Icon, label, href]) => (
              <Link href={href} key={href}>
                <a style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                  <Icon size={13} style={{ flexShrink: 0, opacity: 0.65 }} />{label}
                </a>
              </Link>
            ))}
          </div>

          {/* Practice */}
          <div>
            <div style={sectionLabel}>Practice</div>
            {([
              [FileText, "Create Papers",  "/create"],
              [Brain,    "Mental Math",    "/mental"],
              [Zap,      "Burst Mode",     "/burst"],
            ] as [any, string, string][]).map(([Icon, label, href]) => (
              <Link href={href} key={label}>
                <a style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                  <Icon size={13} style={{ flexShrink: 0, opacity: 0.65 }} />{label}
                </a>
              </Link>
            ))}
          </div>

          {/* Games */}
          <div>
            <div style={sectionLabel}>Games</div>
            {([
              [Calculator, "Soroban Abacus",  "/tools/soroban"],
              [Grid3X3,    "Vedic Grid",       "/tools/gridmaster"],
              [Sparkles,   "Magic Square",    "/tools/gridmaster?tab=magic"],
            ] as [any, string, string][]).map(([Icon, label, href]) => (
              <Link href={href} key={label}>
                <a style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                  <Icon size={13} style={{ flexShrink: 0, opacity: 0.65 }} />{label}
                </a>
              </Link>
            ))}
          </div>

          {/* Branches */}
          <div>
            <div style={sectionLabel}>Branches</div>
            {[
              { name: "Rohini Sector 16", city: "New Delhi" },
              { name: "Rohini Sector 11", city: "New Delhi" },
              { name: "Gurgaon",          city: "Haryana" },
            ].map((b) => (
              <div key={b.name} style={{ display: "flex", gap: 7, marginBottom: 16 }}>
                <MapPin size={13} color={D.purple2} style={{ marginTop: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13.5, color: D.white2, lineHeight: 1.3 }}>{b.name}</div>
                  <div style={{ fontFamily: fontMono, fontSize: 10.5, color: D.muted, marginTop: 2 }}>{b.city}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${D.border} 20%,${D.border} 80%,transparent)`, marginBottom: 16 }} />

        {/* Bottom bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontFamily: fontMono, fontSize: 12, color: D.muted }}>
            © {new Date().getFullYear()} Talent Hub. Made with ❤️ &amp; consistency.
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {([
              ["Privacy Policy",   "#"],
              ["Terms of Service", "#"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={label} href={href}
                style={{ fontFamily: fontMono, fontSize: 11.5, color: D.muted, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = D.white2}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = D.muted}
              >{label}</a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
