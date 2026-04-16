/**
 * BetaBanner
 *
 * A dismissable notification bar that slides down from the very top of the
 * page ~1.6 s after mount.  Tells visitors the site is in a testing / trial
 * phase and lets them quickly report issues or contact the developer.
 *
 * ── YOUR CONTACT DETAILS — replace before going live ────────────────────
 *   WHATSAPP_NUMBER  → country code + number, no + or spaces
 *                      e.g. "919876543210"
 *   PHONE_NUMBER     → display string  e.g. "+91 98765 43210"
 *   PHONE_HREF       → tel: URI        e.g. "tel:+919876543210"
 *   INSTAGRAM_HANDLE → handle without @ e.g. "talenthublive"
 * ────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Phone, Instagram, ExternalLink, AlertCircle } from "lucide-react";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EDIT THESE — replace placeholder values before going live             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const WHATSAPP_NUMBER  = "+919718325064";      // country code + number, no spaces
const PHONE_NUMBER     = "+919718325064";   // display string
const PHONE_HREF       = "tel:+919718325064"; // tel: URI
const INSTAGRAM_HANDLE = "blackmonkey.ai";     // handle without @
// ═══════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────
interface ContactLink {
  icon: React.ReactNode;
  label: string;
  sub: string;
  href: string;
  accent: string;
  bg: string;
  border: string;
}

/* ── Contact Modal ───────────────────────────────────────────────────────── */
function ContactModal({ onClose }: { onClose: () => void }) {
  const links: ContactLink[] = [
    {
      icon: <MessageCircle size={17} />,
      label: "WhatsApp",
      sub: PHONE_NUMBER,
      href: `https://wa.me/${WHATSAPP_NUMBER}`,
      accent: "#22c55e",
      bg: "rgba(34,197,94,0.07)",
      border: "rgba(34,197,94,0.2)",
    },
    {
      icon: <Phone size={17} />,
      label: "Phone Call",
      sub: PHONE_NUMBER,
      href: PHONE_HREF,
      accent: "#38bdf8",
      bg: "rgba(56,189,248,0.07)",
      border: "rgba(56,189,248,0.2)",
    },
    {
      icon: <Instagram size={17} />,
      label: "Instagram",
      sub: `@${INSTAGRAM_HANDLE}`,
      href: `https://instagram.com/${INSTAGRAM_HANDLE}`,
      accent: "#e879f9",
      bg: "rgba(232,121,249,0.07)",
      border: "rgba(232,121,249,0.2)",
    },
  ];

  return (
    <motion.div
      key="beta-contact-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 20px",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 14 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        role="dialog"
        aria-modal="true"
        aria-label="Contact developer"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "rgba(9,7,22,0.98)",
          border: "1px solid rgba(124,58,237,0.28)",
          borderRadius: 22,
          padding: "26px 22px 22px",
          width: "100%", maxWidth: 340,
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.65), " +
            "0 0 0 1px rgba(124,58,237,0.06), " +
            "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Subtle top gradient line inside modal */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(167,139,250,0.55), transparent)",
          }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 13, right: 13,
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          <X size={13} />
        </button>

        {/* Header */}
        <h3
          style={{
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15.5, fontWeight: 800,
            letterSpacing: "-0.025em",
            margin: "0 0 5px",
          }}
        >
          Contact the Developer
        </h3>
        <p
          style={{
            color: "rgba(255,255,255,0.36)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12.5, margin: "0 0 18px", lineHeight: 1.55,
          }}
        >
          Found a bug or need help? Reach out directly.
        </p>

        {/* Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((l) => (
            <motion.a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.975 }}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "9px 12px",
                background: l.bg,
                border: `1px solid ${l.border}`,
                borderRadius: 9,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                  background: `${l.accent}14`,
                  border: `1px solid ${l.accent}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: l.accent,
                  boxShadow: `0 0 8px ${l.accent}22`,
                }}
              >
                {l.icon}
              </span>
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: "block", color: "#e2e8f0",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  {l.label}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11.5,
                  }}
                >
                  {l.sub}
                </span>
              </span>
              <ExternalLink size={11} color="rgba(255,255,255,0.18)" />
            </motion.a>
          ))}
        </div>

        <p
          style={{
            margin: "14px 0 0",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, textAlign: "center",
          }}
        >
          Tap outside to close
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Banner ─────────────────────────────────────────────────────────── */
export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible]     = useState(false);
  const [contactOpen, setContact] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 1600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setDismissed(true);
  };

  return (
    <>
      {/* ── Full-width below-navbar bar ────────────────────────────── */}
      <AnimatePresence>
        {visible && !dismissed && (
          <motion.div
            key="beta-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden", width: "100%", flexShrink: 0 }}
          >
            <div
              style={{
                position: "relative", overflow: "hidden",
                background: "linear-gradient(135deg, rgba(7,5,20,0.98) 0%, rgba(10,7,24,0.98) 100%)",
                borderBottom: "1px solid rgba(124,58,237,0.18)",
              }}
            >
              {/* Shimmer line at very top */}
              <div
                aria-hidden="true"
                className="th-beta-shimmer"
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1,
                  background: "linear-gradient(90deg, transparent 0%, #7c3aed 25%, #a78bfa 50%, #7c3aed 75%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
              />

              {/* Inner max-width row */}
              <div
                style={{
                  maxWidth: 1280, margin: "0 auto",
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "7px 16px 8px",
                  justifyContent: "space-between",
                }}
              >
              {/* ── Left: badge + message ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                {/* BETA pill */}
                <span
                  aria-label="Beta"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2.5px 8px 2.5px 5px",
                    borderRadius: 99, flexShrink: 0,
                    background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.08))",
                    border: "1px solid rgba(124,58,237,0.32)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="th-beta-dot"
                    style={{
                      display: "inline-block",
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#a78bfa",
                      boxShadow: "0 0 5px rgba(167,139,250,0.65)",
                    }}
                  />
                  <span
                    style={{
                      color: "#c4b5fd",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10, fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    Beta
                  </span>
                </span>

                {/* Message */}
                <span
                  style={{
                    color: "rgba(255,255,255,0.48)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12.5, lineHeight: 1.45,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  Trial version — things might get bumpy, help us improve!
                </span>
              </div>

              {/* ── Right: action buttons ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>

                {/* Report — amber, matches navbar style */}
                <a
                  href="/report-issue"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 9px", borderRadius: 8,
                    background: "transparent", border: "none",
                    color: "rgba(251,191,36,0.7)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11.5, fontWeight: 700,
                    cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                    e.currentTarget.style.color = "#fbbf24";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(251,191,36,0.7)";
                  }}
                >
                  <AlertCircle size={12} />
                  Report
                </a>

                {/* Slim separator */}
                <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)", flexShrink: 0 }} />

                {/* Contact Dev */}
                <button
                  onClick={() => setContact(true)}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "5px 9px", borderRadius: 8,
                    background: "transparent", border: "none",
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11.5, fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.35)";
                  }}
                >
                  Contact
                </button>

                {/* Slim separator */}
                <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)", flexShrink: 0 }} />

                {/* Dismiss — no box, no border, pure icon */}
                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  style={{
                    background: "none", border: "none",
                    cursor: "pointer", padding: "5px 8px",
                    display: "flex", alignItems: "center",
                    color: "rgba(255,255,255,0.2)",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
                >
                  <X size={13} />
                </button>
              </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contact modal ── */}
      <AnimatePresence>
        {contactOpen && <ContactModal onClose={() => setContact(false)} />}
      </AnimatePresence>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes th-beta-shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .th-beta-shimmer {
          animation: th-beta-shimmer 3.5s linear infinite;
        }
        @keyframes th-beta-dot {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.45; transform: scale(0.72); }
        }
        .th-beta-dot {
          animation: th-beta-dot 2.4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
