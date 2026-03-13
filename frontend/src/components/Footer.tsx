import type { CSSProperties, ReactNode, MouseEvent as RMouseEvent } from "react";
import { Link } from "wouter";
import { GraduationCap, Phone, Instagram, MapPin, Calculator, BookOpen, PenTool, Rocket, Brain, Zap, FileText, Grid3X3, Sparkles } from "lucide-react";

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
    <footer style={{ background: D.bg, borderTop: `1px solid ${D.border}`, fontFamily: fontBody, overflowX: "hidden", boxSizing: "border-box" }}
      className="px-5 pt-10 pb-6 w-full">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Main grid — 2 cols on mobile, 3 on sm, full 5-col on lg */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] lg:gap-x-7"
          style={{ marginBottom: 32 }}>

          {/* Brand — spans full width on mobile, 1 col on lg */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, textDecoration:"none" }}>
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
            </Link>

            <p style={{ fontSize: 13.5, color: D.white2, lineHeight: 1.72, marginBottom: 18 }}
              className="max-w-[260px]">
              Transforming how children learn and think through proven, structured, and genuinely engaging programs since 2008.
            </p>

            {/* Contact buttons — wrap on very small screens */}
            <div className="flex flex-wrap gap-2">
              {([
                ["tel:+919266117055", "📞 Call", <Phone size={15} key="p" />],
                ["https://wa.me/919266117055", "💬 WhatsApp", <svg key="wa" width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>],
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
              <div key={b.name} style={{ display: "flex", gap: 7, marginBottom: 14 }}>
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

        {/* Bottom bar — stacks on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div style={{ fontFamily: fontMono, fontSize: 12, color: D.muted }}>
            © {new Date().getFullYear()} Talent Hub. Made with ❤️ &amp; consistency.
          </div>
          <div className="flex flex-wrap gap-4">
            {([
              ["Privacy Policy",   "/privacy-policy"],
              ["Terms of Service", "/terms-of-service"],
              ["About Us",         "/about"],
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
