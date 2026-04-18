/**
 * MobileTabBar — Phase 2: Mobile Navigation
 *
 * A permanently-visible bottom tab bar that replaces the hamburger menu on
 * mobile/tablet (< 1024px).  The 5th "More" tab opens a full bottom-sheet
 * with the complete navigation tree, user info, and secondary actions.
 *
 * Architecture:
 *  - Always rendered in the DOM; CSS hides it at lg+ (Tailwind `lg:hidden`)
 *  - Adds `body.has-tab-bar` so the CSS token `--tab-bar-total` can drive
 *    main-content bottom clearance without a JS hook
 *  - Hides itself (and removes the class) when the keyboard is open or the
 *    page is in fullscreen mode (BurstMode, Mental Math etc.)
 *  - "More" sheet is a framer-motion drag-to-dismiss bottom sheet
 */

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  motion, AnimatePresence,
  useDragControls, type PanInfo,
  LayoutGroup,
} from "framer-motion";
import {
  Home, Zap, Swords, BarChart3, LayoutGrid, X,
  User, FileText, Brain, Calculator, Grid3X3, Sparkles,
  BookOpen, Award, IndianRupee, Calendar, Shield, LogOut,
  ArrowRight, Hash, Receipt, Building2, AlertCircle, Gamepad2,
  Mic,
} from "lucide-react";
import { useAuthSafe } from "../contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabDef {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  path: string | null;       // null = "More" tab (handled internally)
  matchPaths?: string[];     // location prefixes that activate this tab
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  {
    key: "home",
    label: "Home",
    Icon: Home,
    path: "/",
    matchPaths: ["/"],        // exact match only
  },
  {
    key: "practice",
    label: "Practice",
    Icon: Zap,
    path: "/burst",
    matchPaths: ["/burst", "/mental", "/create", "/vedic-maths", "/paper", "/enter-code", "/shared-paper"],
  },
  {
    key: "compete",
    label: "Compete",
    Icon: Swords,
    path: "/duel",
    matchPaths: ["/duel", "/tools/number-ninja"],
  },
  {
    key: "progress",
    label: "Progress",
    Icon: BarChart3,
    path: "/dashboard",
    matchPaths: ["/dashboard", "/rewards", "/fees", "/attendance", "/profile", "/admin", "/org-dashboard"],
  },
  {
    key: "more",
    label: "More",
    Icon: LayoutGrid,
    path: null,               // opens the More sheet
  },
];

// ─── Design tokens (mirrors the CSS token system) ─────────────────────────────

const T = {
  bg:       "rgba(7,8,15,0.97)",
  surf:     "#0F1120",
  surf2:    "#141729",
  bdr:      "rgba(255,255,255,0.07)",
  accent:   "#F97316",
  inactive: "rgba(255,255,255,0.38)",
  white:    "#F0F2FF",
  muted:    "#525870",
  ff:       "'DM Sans', sans-serif",
  fm:       "'JetBrains Mono', monospace",
};

// ─── MoreSheet — bottom-sheet navigation drawer ───────────────────────────────

interface MoreSheetProps {
  isOpen:          boolean;
  onClose:         () => void;
  user:            any;
  isAuthenticated: boolean;
  isAdmin:         boolean;
  logout:          () => void;
}

function MoreSheet({ isOpen, onClose, user, isAuthenticated, isAdmin, logout }: MoreSheetProps) {
  const [, setLocation] = useLocation();
  const dragControls   = useDragControls();
  const sheetRef       = useRef<HTMLDivElement>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const navigate = (path: string) => { setLocation(path); onClose(); };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 400) onClose();
  };

  // ── Sub-components ──────────────────────────────────────────────────────────

  const SectionLabel = ({ title }: { title: string }) => (
    <div style={{
      padding:        "6px 20px 6px",
      fontSize:       11,
      fontWeight:     700,
      letterSpacing:  "0.1em",
      textTransform:  "uppercase",
      color:          T.muted,
      fontFamily:     T.fm,
    }}>
      {title}
    </div>
  );

  const NavItem = ({
    icon, label, path, badge, color,
  }: {
    icon:   React.ReactNode;
    label:  string;
    path:   string;
    badge?: string;
    color?: string;
  }) => (
    <button
      onClick={() => navigate(path)}
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         14,
        padding:     "11px 20px",
        width:       "100%",
        background:  "transparent",
        border:      "none",
        cursor:      "pointer",
        textAlign:   "left",
        minHeight:   "var(--touch-min, 44px)",
        transition:  "background 0.12s",
      }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
      onTouchEnd={e   => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Icon box */}
      <div style={{
        width:          36,
        height:         36,
        borderRadius:   10,
        background:     color ? `${color}14` : "rgba(255,255,255,0.05)",
        border:         `1px solid ${color ? `${color}22` : "rgba(255,255,255,0.07)"}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        color:          color || T.inactive,
      }}>
        {icon}
      </div>

      {/* Label */}
      <span style={{
        fontSize:  15,
        fontWeight: 600,
        color:      T.white,
        flex:       1,
        fontFamily: T.ff,
        lineHeight: 1.3,
      }}>
        {label}
      </span>

      {/* Optional badge */}
      {badge && (
        <span style={{
          fontSize:    9,
          fontWeight:  800,
          fontFamily:  T.fm,
          color:       "#22c55e",
          background:  "rgba(34,197,94,0.12)",
          border:      "1px solid rgba(34,197,94,0.22)",
          borderRadius: "var(--r-full, 9999px)",
          padding:     "2px 7px",
          letterSpacing: "0.06em",
        }}>
          {badge}
        </span>
      )}
    </button>
  );

  const Divider = () => (
    <div style={{
      height: 1,
      background: T.bdr,
      margin: "8px 20px",
    }} />
  );

  // ── Sheet render ────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="more-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position:          "fixed",
              inset:             0,
              background:        "rgba(0,0,0,0.68)",
              backdropFilter:    "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              zIndex:            9990,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="more-sheet"
            ref={sheetRef}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.85 }}
            style={{
              position:      "fixed",
              bottom:        0,
              left:          0,
              right:         0,
              zIndex:        9999,
              background:    T.bg,
              borderRadius:  "22px 22px 0 0",
              border:        `1px solid ${T.bdr}`,
              borderBottom:  "none",
              boxShadow:     "0 -20px 80px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.05)",
              maxHeight:     "88dvh",
              display:       "flex",
              flexDirection: "column",
              overflow:      "hidden",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >

            {/* ── Drag handle strip ───────────────────────────────────── */}
            <div
              style={{ flexShrink: 0, cursor: "grab", userSelect: "none" }}
              onPointerDown={e => dragControls.start(e)}
            >
              {/* Handle indicator */}
              <div style={{
                width:    36,
                height:   4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.14)",
                margin:   "14px auto 10px",
              }} />
            </div>

            {/* ── Close button ────────────────────────────────────────── */}
            <button
              onClick={onClose}
              className="touch-compact"
              aria-label="Close menu"
              style={{
                position:       "absolute",
                top:            12,
                right:          16,
                width:          32,
                height:         32,
                borderRadius:   9,
                background:     "rgba(255,255,255,0.06)",
                border:         "1px solid rgba(255,255,255,0.09)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                cursor:         "pointer",
                color:          T.muted,
              }}
            >
              <X size={15} />
            </button>

            {/* ── Scrollable content ──────────────────────────────────── */}
            <div
              ref={scrollRef}
              style={{
                overflowY:              "auto",
                WebkitOverflowScrolling:"touch" as any,
                flex:                   1,
                paddingTop:             2,
                paddingBottom:          20,
              }}
            >

              {/* User info header (authenticated) */}
              {isAuthenticated && user && (
                <div style={{ padding: "0 16px 16px" }}>
                  <div style={{
                    padding:      "14px 16px",
                    background:   "rgba(255,255,255,0.03)",
                    border:       `1px solid ${T.bdr}`,
                    borderRadius: 16,
                    display:      "flex",
                    alignItems:   "center",
                    gap:          12,
                  }}>
                    {/* Avatar */}
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width:          44,
                        height:         44,
                        borderRadius:   14,
                        background:     "linear-gradient(135deg, #7C3AED, #5B21B6)",
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        fontSize:       18,
                        fontWeight:     800,
                        color:          "#fff",
                        flexShrink:     0,
                        fontFamily:     T.ff,
                      }}>
                        {((user.display_name || user.name || "U") as string).charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700, color: T.white,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: T.ff,
                      }}>
                        {user.display_name || user.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: T.fm }}>
                        {user.course && <span>{user.course} · </span>}
                        {typeof user.total_points === "number" && (
                          <span style={{ color: "#facc15" }}>⭐ {user.total_points.toLocaleString()} pts</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign-in CTA (unauthenticated) */}
              {!isAuthenticated && (
                <div style={{ padding: "0 16px 20px" }}>
                  <button
                    onClick={() => navigate("/login")}
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      gap:            8,
                      width:          "100%",
                      padding:        "15px 20px",
                      borderRadius:   14,
                      background:     "linear-gradient(135deg, #F97316, #C2410C)",
                      border:         "none",
                      color:          "#fff",
                      fontSize:       15,
                      fontWeight:     700,
                      fontFamily:     T.ff,
                      cursor:         "pointer",
                      boxShadow:      "0 8px 24px rgba(249,115,22,0.32)",
                      minHeight:      "var(--touch-std, 48px)",
                    }}
                  >
                    Sign In <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* ── Practice ──────────────────────────────────────────── */}
              <SectionLabel title="Practice" />
              <NavItem icon={<FileText size={16} />}    label="Create Paper"      path="/create/basic"                  color="#7C3AED" />
              <NavItem icon={<Brain size={16} />}       label="Mental Math"        path="/mental"                        color="#3B82F6" />
              <NavItem icon={<Mic size={16} />}         label="Classroom Arena"    path="/mental/classroom"              color="#EC4899" badge="NEW" />
              <NavItem icon={<Zap size={16} />}         label="Burst Mode"         path="/burst"                         color="#F97316" />
              <NavItem icon={<Swords size={16} />}      label="Duel Mode"          path="/duel"                          color="#8B5CF6" badge="LIVE" />
              <NavItem icon={<Hash size={16} />}        label="Enter Code"         path="/enter-code"                    color="#06B6D4" />

              <Divider />

              {/* ── Games ─────────────────────────────────────────────── */}
              <SectionLabel title="Games" />
              <NavItem icon={<Calculator size={16} />}  label="Abacus Soroban"     path="/tools/soroban"                 color="#06B6D4" />
              <NavItem icon={<Grid3X3 size={16} />}     label="Vedic Grid"          path="/tools/gridmaster"              color="#10B981" />
              <NavItem icon={<Sparkles size={16} />}    label="Magic Square"        path="/tools/gridmaster/magic"        color="#F59E0B" />
              <NavItem icon={<BookOpen size={16} />}    label="Abacus Flashcards"   path="/tools/soroban/flashcards"      badge="NEW" />
              {isAdmin
                ? <NavItem icon={<Gamepad2 size={16} />} label="Number Ninja" path="/tools/number-ninja" badge="NEW" />
                : (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", width: "100%", opacity: 0.42, cursor: "not-allowed", boxSizing: "border-box" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: T.inactive }}>
                      <Gamepad2 size={16} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: T.white, flex: 1, fontFamily: T.ff }}>Number Ninja</span>
                    <span style={{ fontSize: 9, fontWeight: 800, fontFamily: T.fm, color: "rgba(251,191,36,0.7)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 9999, padding: "2px 7px", letterSpacing: "0.06em" }}>SOON</span>
                  </div>
                )}

              {/* ── Account (authenticated) ───────────────────────────── */}
              {isAuthenticated && (
                <>
                  <Divider />
                  <SectionLabel title="My Account" />
                  <NavItem icon={<BarChart3 size={16} />}    label="Dashboard"      path="/dashboard"                     color="#06B6D4" />
                  <NavItem icon={<User size={16} />}         label="My Profile"     path="/profile" />
                  <NavItem icon={<Award size={16} />}        label="Rewards"        path="/rewards"                       color="#F59E0B" />
                  {isAdmin
                    ? <NavItem icon={<IndianRupee size={16} />}  label="My Fees"        path="/fees"                          color="#10B981" />
                    : (
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", width: "100%", opacity: 0.42, cursor: "not-allowed", boxSizing: "border-box" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <IndianRupee size={16} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>My Fees</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(251,191,36,0.7)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 9999, padding: "2px 7px", letterSpacing: "0.06em" }}>SOON</span>
                      </div>
                    )}
                  <NavItem icon={<Calendar size={16} />}     label="Attendance"     path="/student-attendance" />
                </>
              )}

              {/* ── Admin (admin only) ────────────────────────────────── */}
              {isAdmin && (
                <>
                  <Divider />
                  <SectionLabel title="Admin" />
                  <NavItem icon={<Shield size={16} />}       label="Admin Dashboard"  path="/admin"              color="#EF4444" />
                  <NavItem icon={<Calendar size={16} />}     label="Attendance Mgmt"  path="/admin/attendance"   color="#F59E0B" />
                  <NavItem icon={<FileText size={16} />}     label="Exam Management"  path="/admin/exams" />
                  <NavItem icon={<IndianRupee size={16} />}  label="Fee Management"   path="/admin/fees"         color="#10B981" />
                  <NavItem icon={<Receipt size={16} />}      label="Quotations"       path="/admin/quotations" />
                  <NavItem icon={<Building2 size={16} />}    label="Org Management"   path="/admin/orgs" />
                </>
              )}

              <Divider />

              {/* ── Misc ──────────────────────────────────────────────── */}
              <NavItem icon={<AlertCircle size={16} />} label="Report an Issue"   path="/report-issue" />

              {/* Logout */}
              {isAuthenticated && (
                <div style={{ padding: "10px 16px 4px" }}>
                  <button
                    onClick={() => { logout(); onClose(); }}
                    style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         12,
                      padding:     "13px 18px",
                      width:       "100%",
                      background:  "rgba(239,68,68,0.07)",
                      border:      "1px solid rgba(239,68,68,0.16)",
                      borderRadius: 12,
                      cursor:      "pointer",
                      color:       "#EF4444",
                      fontSize:    15,
                      fontWeight:  600,
                      fontFamily:  T.ff,
                      minHeight:   "var(--touch-min, 44px)",
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── MobileTabBar ─────────────────────────────────────────────────────────────

export default function MobileTabBar() {
  const [location]         = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isFullscreen, setIsFullscreen]     = useState(false);

  const auth           = useAuthSafe();
  const user           = auth?.user          ?? null;
  const isAuthenticated= auth?.isAuthenticated ?? false;
  const isAdmin        = auth?.isAdmin         ?? false;
  const logout         = auth?.logout          ?? (() => {});

  // ── Keyboard detection via Visual Viewport API ────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      // If visual viewport height is < 75% of window inner height, keyboard is open
      setIsKeyboardOpen(vv.height < window.innerHeight * 0.75);
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  // ── Fullscreen detection ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
        document.documentElement.classList.contains("app-fullscreen")
      );
    };
    document.addEventListener("fullscreenchange",        handler);
    document.addEventListener("webkitfullscreenchange",  handler);
    return () => {
      document.removeEventListener("fullscreenchange",       handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // ── body.has-tab-bar class for CSS content clearance ─────────────────────
  useEffect(() => {
    const hidden = isFullscreen || isKeyboardOpen;
    if (hidden) {
      document.body.classList.remove("has-tab-bar");
    } else {
      document.body.classList.add("has-tab-bar");
    }
    return () => document.body.classList.remove("has-tab-bar");
  }, [isFullscreen, isKeyboardOpen]);

  // ── Active tab detection ─────────────────────────────────────────────────
  const getActiveKey = (): string => {
    for (const tab of TABS.filter(t => t.key !== "more")) {
      if (!tab.matchPaths) continue;
      const matched = tab.matchPaths.some(p => {
        if (p === "/") return location === "/";        // exact match for home
        return location === p || location.startsWith(p + "/");
      });
      if (matched) return tab.key;
    }
    return "more";   // anything that doesn't match a tab lights "More"
  };

  const activeKey = getActiveKey();

  // ── Hide when fullscreen or keyboard open ────────────────────────────────
  if (isFullscreen || isKeyboardOpen) return null;

  return (
    <>
      {/* ── More sheet ──────────────────────────────────────────────── */}
      <MoreSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        logout={logout}
      />

      {/* ── Tab bar (hidden on lg+) ─────────────────────────────────── */}
      <div
        className="lg:hidden"
        style={{
          position:            "fixed",
          bottom:              0,
          left:                0,
          right:               0,
          zIndex:              "var(--z-tab-bar, 300)" as any,
          background:          "rgba(7,8,15,0.93)",
          backdropFilter:      "blur(24px)",
          WebkitBackdropFilter:"blur(24px)",
          borderTop:           "1px solid rgba(255,255,255,0.07)",
          boxShadow:           "0 -4px 30px rgba(0,0,0,0.45)",
          paddingBottom:       "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <LayoutGroup id="mobile-tabs">
          <div
            style={{
              display:     "flex",
              width:       "100%",
              height:      56,
              alignItems:  "stretch",
            }}
          >
            {TABS.map(tab => {
              const isActive = tab.key !== "more" && tab.key === activeKey;
              const isMoreActive = tab.key === "more" && activeKey === "more";
              const visuallyActive = isActive || isMoreActive;

              const tabContent = (
                <motion.div
                  whileTap={{ scale: 0.83 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  style={{
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            3,
                    width:          "100%",
                    height:         "100%",
                    position:       "relative",
                    padding:        "6px 4px 2px",
                  }}
                >
                  {/* Active background glow */}
                  {visuallyActive && (
                    <motion.div
                      layoutId="tab-active-bg"
                      style={{
                        position:     "absolute",
                        top:          6,
                        left:         0,
                        right:        0,
                        marginLeft:   "auto",
                        marginRight:  "auto",
                        width:        40,
                        height:       36,
                        borderRadius: 12,
                        background:   `${T.accent}14`,
                        zIndex:       0,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}

                  {/* Icon */}
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <tab.Icon
                      size={21}
                      color={visuallyActive ? T.accent : T.inactive}
                    />
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize:      10,
                      fontWeight:    visuallyActive ? 700 : 500,
                      fontFamily:    T.ff,
                      lineHeight:    1,
                      color:         visuallyActive ? T.accent : T.inactive,
                      transition:    "color 0.2s",
                      position:      "relative",
                      zIndex:        1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {tab.label}
                  </span>

                  {/* Active indicator dot */}
                  {visuallyActive && (
                    <motion.div
                      layoutId="tab-active-dot"
                      style={{
                        position:     "absolute",
                        bottom:       2,
                        left:         0,
                        right:        0,
                        marginLeft:   "auto",
                        marginRight:  "auto",
                        width:        4,
                        height:       4,
                        borderRadius: 2,
                        background:   T.accent,
                        zIndex:       1,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                </motion.div>
              );

              // Render as <Link> for navigable tabs, <button> for "More"
              if (tab.path !== null) {
                return (
                  <Link
                    key={tab.key}
                    href={tab.path}
                    style={{
                      flex:                  1,
                      display:               "flex",
                      flexDirection:         "column",
                      alignItems:            "center",
                      justifyContent:        "center",
                      textDecoration:        "none",
                      color:                 "inherit",
                      WebkitTapHighlightColor: "transparent",
                      minWidth:              0,
                    }}
                  >
                    {tabContent}
                  </Link>
                );
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => setMoreOpen(true)}
                  aria-label="Open navigation menu"
                  aria-expanded={moreOpen}
                  style={{
                    flex:                  1,
                    display:               "flex",
                    flexDirection:         "column",
                    alignItems:            "center",
                    justifyContent:        "center",
                    background:            "transparent",
                    border:                "none",
                    cursor:                "pointer",
                    WebkitTapHighlightColor: "transparent",
                    minWidth:              0,
                    padding:               0,
                  }}
                  className="touch-compact no-press"
                >
                  {tabContent}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </>
  );
}
