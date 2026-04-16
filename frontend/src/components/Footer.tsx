import type { CSSProperties, ReactNode, MouseEvent as RMouseEvent } from "react";
import { Link } from "wouter";
import { GraduationCap, Phone, Instagram, Calculator, Brain, Zap, FileText, Grid3X3, Sparkles, Swords, Hash } from "lucide-react";

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
    fontSize: 13, color: D.white2, textDecoration: "none",
    marginBottom: 3, fontFamily: fontBody, transition: "color 0.2s",
    lineHeight: 1.4,
  };

  const sectionLabel: CSSProperties = {
    fontFamily: fontMono, fontSize: 10, fontWeight: 600,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: D.muted, marginBottom: 8,
  };

  const contactIcon: CSSProperties = {
    color: D.muted, textDecoration: "none",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, transition: "color 0.18s, transform 0.18s",
    padding: 0,
  };

  const makeConHandlers = (glowColor: string) => ({
    onMouseEnter: (e: RMouseEvent<HTMLAnchorElement>) => {
      const el = e.currentTarget;
      el.style.color = glowColor;
      el.style.transform = "translateY(-2px)";
    },
    onMouseLeave: (e: RMouseEvent<HTMLAnchorElement>) => {
      const el = e.currentTarget;
      el.style.color = D.muted;
      el.style.transform = "none";
    },
  });

  const onLinkEnter = (e: RMouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = D.white;
  };
  const onLinkLeave = (e: RMouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = D.white2;
  };

  return (
    <footer style={{ background: D.bg, borderTop: `1px solid ${D.border}`, fontFamily: fontBody, overflowX: "hidden", boxSizing: "border-box" }}
      className="px-5 pt-3 pb-2.5 w-full">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Main grid — 2 cols on mobile, 3 on sm, full 4-col on lg */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-x-6"
          style={{ marginBottom: 10 }}>

          {/* Brand — spans full width on mobile, 1 col on lg */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8, textDecoration:"none" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img
                  src="/imagesproject/logo.ico.jpg"
                  alt="BlackMonkey Logo"
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
                <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: D.white, lineHeight: 1.1 }}>BlackMonkey</div>
              </div>
            </Link>

            {/* Contact icons */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {([
                ["tel:+919718325064", "📞 Call", <Phone size={16} key="p" />, "rgba(56,189,248,0.9)"],
                ["https://wa.me/919718325064", "💬 WhatsApp", <svg key="wa" width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>, "rgba(34,197,94,0.9)"],
                ["https://www.instagram.com/blackmonkey.ai", "📸 Instagram", <Instagram size={16} key="i" />, "rgba(232,121,249,0.9)"],
              ] as [string, string, ReactNode, string][]).map(([href, title, icon, glowColor]) => (
                <a key={title} href={href} style={contactIcon} title={title}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  {...makeConHandlers(glowColor)}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Practice */}
          <div>
            <div style={sectionLabel}>Practice</div>
            {([
              [FileText, "Create Papers",  "/create"],
              [Brain,    "Mental Math",    "/mental"],
              [Zap,      "Burst Mode",     "/burst"],
              [Sparkles, "Vedic Maths",    "/vedic-maths"],
            ] as [any, string, string][]).map(([Icon, label, href]) => (
              <Link href={href} key={label} style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                <Icon size={13} style={{ flexShrink: 0, opacity: 0.65 }} />{label}
              </Link>
            ))}
          </div>

          {/* Games */}
          <div>
            <div style={sectionLabel}>Games</div>
            {([
              [Calculator, "Soroban Abacus",  "/tools/soroban"],
              [Grid3X3,    "Vedic Grid",       "/tools/gridmaster"],
              [Swords,     "Duel Mode",        "/duel"],
              [Brain,      "Number Ninja",     "/number-ninja"],
            ] as [any, string, string][]).map(([Icon, label, href]) => (
              <Link href={href} key={label} style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                <Icon size={13} style={{ flexShrink: 0, opacity: 0.65 }} />{label}
              </Link>
            ))}
          </div>

          {/* Platform */}
          <div>
            <div style={sectionLabel}>Platform</div>
            {([
              [Hash,      "Enter Code",    "/enter-code"],
              [Grid3X3,   "Dashboard",     "/dashboard"],
              [Sparkles,  "Hall of Fame",  "/hall-of-fame"],
              [FileText,  "Shared Papers", "/paper/shared"],
            ] as [any, string, string][]).map(([Icon, label, href]) => (
              <Link href={href} key={label} style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                <Icon size={13} style={{ flexShrink: 0, opacity: 0.65 }} />{label}
              </Link>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${D.border} 20%,${D.border} 80%,transparent)`, marginBottom: 8 }} />

        {/* Bottom bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center" style={{ paddingBottom: 2 }}>
          <div style={{ fontFamily: fontMono, fontSize: 12, color: D.muted }}>
            © {new Date().getFullYear()} BlackMonkey. Made with ❤️ &amp; consistency.
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
