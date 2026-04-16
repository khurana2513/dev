import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown, LogOut, BarChart3, Shield, GraduationCap,
  Calculator, Menu, X, Brain, FileText,
  User, ArrowRight, Zap, Calendar, Grid3X3,
  Gamepad2, Sparkles, Award, Hash, Swords, IndianRupee, Receipt, Building2, BookOpen,
  AlertCircle
} from "lucide-react";
import { useAuthSafe } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import StreakBadge from "./StreakBadge";

export default function Header() {
  const [practiceOpen, setPracticeOpen]       = useState(false);
  const [gamesOpen, setGamesOpen]             = useState(false);
  const [userMenuOpen, setUserMenuOpen]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [scrolled, setScrolled]               = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  const [location, setLocation] = useLocation();

  const practiceDropdownRef = useRef<HTMLDivElement>(null);
  const gamesDropdownRef    = useRef<HTMLDivElement>(null);
  const userMenuRef         = useRef<HTMLDivElement>(null);

  const practiceTimeoutRef    = useRef<NodeJS.Timeout | null>(null);
  const gamesTimeoutRef       = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef    = useRef<NodeJS.Timeout | null>(null);

  const auth            = useAuthSafe();
  const user            = auth?.user ?? null;
  const logout          = auth?.logout ?? (() => {});
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isAdmin         = auth?.isAdmin ?? false;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onFSChange = () => setIsFullscreenActive(
      !!document.fullscreenElement || document.documentElement.classList.contains("app-fullscreen")
    );
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setLocation("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  const clearRef = (r: React.MutableRefObject<NodeJS.Timeout | null>) => {
    if (r.current) { clearTimeout(r.current); r.current = null; }
  };

  const handlePracticeEnter = () => { clearRef(practiceTimeoutRef); setPracticeOpen(true); };
  const handlePracticeLeave = () => {
    practiceTimeoutRef.current = setTimeout(() => setPracticeOpen(false), 200);
  };

  const handleGamesEnter = () => { clearRef(gamesTimeoutRef); setGamesOpen(true); };
  const handleGamesLeave = () => {
    gamesTimeoutRef.current = setTimeout(() => setGamesOpen(false), 200);
  };

  const handleUserMenuEnter = () => { clearRef(userMenuTimeoutRef); setUserMenuOpen(true); };
  const handleUserMenuLeave = () => {
    userMenuTimeoutRef.current = setTimeout(() => setUserMenuOpen(false), 200);
  };
  const toggleUserMenu = () => setUserMenuOpen(prev => !prev);

  // Click outside to close user menu (supports both mobile tap and desktop click)
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    return () => {
      [practiceTimeoutRef, gamesTimeoutRef, userMenuTimeoutRef]
        .forEach(r => { if (r.current) clearTimeout(r.current); });
    };
  }, []);

  const isActive = (path: string) => location === path || location.startsWith(path + "/");
  const isActiveExact = (path: string) => location === path;

  // Hide header completely on the sign-in page — Login is a full-screen overlay
  // Also hide during browser fullscreen (practice sessions)
  if (isFullscreenActive) return null;

  const CARD_STYLE = {
    background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)/0.95) 100%)",
    boxShadow: "0 20px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
  };

  const navItem = (active: boolean, amber = false) =>
    amber
      ? `px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
          active ? "text-amber-500 bg-amber-500/10 shadow-sm" : "text-card-foreground hover:bg-amber-500/10 hover:shadow-sm"}`
      : `px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
          active ? "text-primary bg-primary/10 shadow-sm" : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"}`;

  return (
    <>
<style>{`
  @keyframes nav-ring-spin { to { transform: rotate(360deg); } }
  .nav-pill-ring {
    position: absolute;
    inset: -1.5px;
    border-radius: 9999px;
    pointer-events: none;
    z-index: 0;
    padding: 1.5px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 338deg,
      rgba(167, 139, 250, 0.2) 348deg,
      rgba(192, 168, 255, 0.85) 356deg,
      rgba(167, 139, 250, 0.2) 360deg
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: nav-ring-spin 4s linear infinite;
  }
`}</style>
    <header
      className={`sticky top-0 z-[200] transition-all duration-500 backdrop-blur-md ${
        scrolled
          ? "shadow-lg"
          : ""
      }`}
      style={{
        background: scrolled ? "rgba(7,8,15,0.92)" : "rgba(7,8,15,0.72)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative z-[195]">

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 group cursor-pointer z-10">
            <div className="relative">
              <img
                src="/imagesproject/logo.ico.jpg"
                alt="BlackMonkey Logo"
                className="w-11 h-11 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = "none";
                  const fb = t.nextElementSibling as HTMLElement;
                  if (fb) fb.style.display = "flex";
                }}
              />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-purple-600 to-primary items-center justify-center shadow-md transition-all duration-300 hidden">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            {/* <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }} className="text-foreground group-hover:text-primary transition-colors">BlackMonkey</div>
            </div> */}
          </Link>

          {/* ── Center Nav Pill (Desktop) ─────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-2 bg-secondary/90 backdrop-blur-md p-1.5 rounded-full absolute left-1/2 -translate-x-1/2 z-[10]">
            <div className="nav-pill-ring" aria-hidden="true" />

            {/* PRACTICE */}
            <div ref={practiceDropdownRef} className="relative" onMouseEnter={handlePracticeEnter} onMouseLeave={handlePracticeLeave}>
              <button className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/create") || isActive("/vedic-maths") || isActive("/mental") || isActive("/burst")
                  ? "text-primary bg-card/70 shadow-sm" : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                <Brain className="w-3.5 h-3.5" />Practice
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${practiceOpen ? "rotate-180" : ""}`} />
              </button>
              {practiceOpen && (
                <div className="absolute top-full left-0 mt-3 w-60 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl z-[200]"
                  style={{ ...CARD_STYLE, overflow: "visible" }} onMouseEnter={handlePracticeEnter} onMouseLeave={handlePracticeLeave}>
                  <div className="p-1.5">

                    {/* Create Paper — direct link */}
                    <Link href="/create/basic">
                      <div className={navItem(isActive("/create") || isActive("/vedic-maths"))} onClick={() => setPracticeOpen(false)}>
                        <FileText className="w-4 h-4" />Create Paper
                      </div>
                    </Link>

                    <Link href="/mental">
                      <div className={navItem(isActive("/mental"))} onClick={() => setPracticeOpen(false)}>
                        <Brain className="w-4 h-4" />Mental Math
                      </div>
                    </Link>
                    <Link href="/burst">
                      <div className={navItem(isActive("/burst"))} onClick={() => setPracticeOpen(false)}>
                        <Zap className="w-4 h-4 text-amber-500" />Burst Mode
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* GAMES */}
            <div ref={gamesDropdownRef} className="relative" onMouseEnter={handleGamesEnter} onMouseLeave={handleGamesLeave}>
              <button className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/tools") ? "text-primary bg-card/70 shadow-sm" : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                <Gamepad2 className="w-3.5 h-3.5" />Games
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${gamesOpen ? "rotate-180" : ""}`} />
              </button>
              {gamesOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden z-[200]"
                  style={CARD_STYLE} onMouseEnter={handleGamesEnter} onMouseLeave={handleGamesLeave}>
                  <div className="p-1.5">
                    <Link href="/tools/soroban">
                      <div className={navItem(isActive("/tools/soroban") && !isActive("/tools/soroban/flashcards"))} onClick={() => setGamesOpen(false)}>
                        <Calculator className="w-4 h-4" />Abacus Soroban
                      </div>
                    </Link>
                    <Link href="/tools/gridmaster">
                      <div className={navItem(isActiveExact("/tools/gridmaster"))} onClick={() => setGamesOpen(false)}>
                        <Grid3X3 className="w-4 h-4" />Vedic Grid
                      </div>
                    </Link>
                    <Link href="/tools/gridmaster/magic">
                      <div className={navItem(isActiveExact("/tools/gridmaster/magic"))} onClick={() => setGamesOpen(false)}>
                        <Sparkles className="w-4 h-4" />Magic Square
                      </div>
                    </Link>
                    <Link href="/tools/soroban/flashcards">
                      <div className={navItem(isActive("/tools/soroban/flashcards"))} onClick={() => setGamesOpen(false)}>
                        <BookOpen className="w-4 h-4" />Abacus Flashcards
                        <span className="ml-auto relative flex h-2.5 w-2.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
                        </span>
                      </div>
                    </Link>
                    {isAdmin ? (
                      <Link href="/tools/number-ninja">
                        <div className={navItem(isActive("/tools/number-ninja"))} onClick={() => setGamesOpen(false)}>
                          <Swords className="w-4 h-4" />Number Ninja
                          <span className="ml-auto relative flex h-2.5 w-2.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div className={navItem(false)} style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}>
                        <Swords className="w-4 h-4" />Number Ninja
                        <span className="ml-auto text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded border" style={{ color: 'rgb(251 191 36 / 0.7)', background: 'rgb(245 158 11 / 0.1)', borderColor: 'rgb(245 158 11 / 0.2)' }}>SOON</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DUEL MODE — standalone violet pill button */}
            <Link href="/duel">
              <button className={`relative flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/duel")
                  ? "text-violet-300 bg-violet-500/20 shadow-lg shadow-violet-500/10"
                  : "text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/10"
              }`}>
                <Swords className="w-3.5 h-3.5" />
                Duel
                <span className="relative flex h-1.5 w-1.5 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500" />
                </span>
              </button>
            </Link>

            {/* ENTER CODE — standalone pill button */}
            <Link href="/enter-code">
              <button className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/enter-code")
                  ? "text-primary bg-card/70 shadow-sm"
                  : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                <Hash className="w-3.5 h-3.5" />Enter Code
              </button>
            </Link>

          </nav>

          {/* ── Right side ───────────────────────────────────────────── */}
          <div className="flex items-center gap-3">

            {isAuthenticated && user ? (
              <>
                {/* ── Points pill ────────────────────────────────── */}
                <motion.button
                  onClick={() => setLocation("/rewards?tab=history")}
                  title={`${user.total_points} total points — click to view history`}
                  whileHover={{ scale: 1.07, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.2rem 0.3rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.18, 1] }}
                    transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
                    style={{ fontSize: "0.88rem", lineHeight: 1, filter: "drop-shadow(0 0 5px rgba(250,204,21,0.9))" }}
                  >✦</motion.span>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#facc15",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    textShadow: "0 0 12px rgba(250,204,21,0.55)",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {user.total_points.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "0.66rem", color: "rgba(250,204,21,0.4)", fontWeight: 600, letterSpacing: "0.04em" }}>pts</span>
                </motion.button>

                {/* ── Streak Fire Badge ─────────────────────────────── */}
                <StreakBadge streak={(user as any).current_streak ?? 0} />

                {(() => {
                  const displayName = (user as any).display_name || user.name;
                  return (
                    <div ref={userMenuRef} className="relative hidden lg:block" onMouseEnter={handleUserMenuEnter} onMouseLeave={handleUserMenuLeave}>
                      <button onClick={toggleUserMenu} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/80 transition-colors">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={displayName} className="w-9 h-9 rounded-full ring-2 ring-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full premium-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm ring-2 ring-border">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </button>
                      {userMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden z-[200]"
                          style={CARD_STYLE} onMouseEnter={handleUserMenuEnter} onMouseLeave={handleUserMenuLeave}>
                          <div className="p-4 border-b-2 border-border/50" style={{ background: "rgba(124,58,237,0.06)" }}>
                            <div style={{ color: "#e2e8f0", fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{displayName}</div>
                            <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 12, marginBottom: 10 }}>{user.email}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
                              {user.public_id && <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.13)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, padding: "2px 9px" }}>{user.public_id}</span>}
                              {user.course && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 9px" }}>{user.course}</span>}
                              {user.level && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 9px" }}>Lvl {user.level}</span>}
                            </div>
                          </div>
                          <div className="p-1.5">
                            <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}>
                              <div className={navItem(isActive("/dashboard"))}><BarChart3 className="w-4 h-4" />Dashboard</div>
                            </Link>
                            <Link href="/profile" onClick={() => setUserMenuOpen(false)}>
                              <div className={navItem(isActive("/profile"))}><User className="w-4 h-4" />Student Profile</div>
                            </Link>
                            <Link href="/rewards" onClick={() => setUserMenuOpen(false)}>
                              <div className={navItem(isActive("/rewards"))}><Award className="w-4 h-4" />Rewards</div>
                            </Link>
                            {isAdmin ? (
                              <Link href="/fees" onClick={() => setUserMenuOpen(false)}>
                                <div className={navItem(isActive("/fees"))}><IndianRupee className="w-4 h-4" />My Fees</div>
                              </Link>
                            ) : (
                              <div className={navItem(false)} style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}>
                                <IndianRupee className="w-4 h-4" />My Fees
                                <span className="ml-auto text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded border" style={{ color: 'rgb(251 191 36 / 0.7)', background: 'rgb(245 158 11 / 0.1)', borderColor: 'rgb(245 158 11 / 0.2)' }}>SOON</span>
                              </div>
                            )}
                            {isAdmin && (
                              <>
                                <div className="mx-4 my-1 border-t border-border/50" />
                                <Link href="/admin" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Shield className="w-4 h-4" />Admin Dashboard
                                  </div>
                                </Link>
                                <Link href="/admin/attendance" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Calendar className="w-4 h-4" />Attendance
                                  </div>
                                </Link>
                                <Link href="/admin/exams" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <FileText className="w-4 h-4" />Exam Management
                                  </div>
                                </Link>
                                <Link href="/admin/fees" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <IndianRupee className="w-4 h-4" />Fee Management
                                  </div>
                                </Link>
                                <Link href="/admin/quotations" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Receipt className="w-4 h-4" />Quotations
                                  </div>
                                </Link>
                                <Link href="/admin/orgs" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Building2 className="w-4 h-4" />Org Management
                                  </div>
                                </Link>
                              </>
                            )}
                          </div>
                          <div className="p-1.5 border-t-2 border-border/50">
                            <button onClick={() => { setUserMenuOpen(false); logout(); }}
                              className="w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2 text-left transition-all rounded-xl">
                              <LogOut className="w-4 h-4" />Logout
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <Link href="/login">
                <button className="hidden sm:flex items-center gap-2 px-8 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground rounded-full premium-gradient hover:scale-105 transition-all shadow-lg shadow-primary/20">
                  <ArrowRight className="w-4 h-4" />Sign In
                </button>
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hidden p-2 rounded-lg hover:bg-secondary/80 transition-colors" aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu — fixed overlay so only IT scrolls, background is locked ── */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-[190]"
            style={{ top: 0 }}
          >
            {/* Dark backdrop — click to close */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            {/* Scrollable drawer from top, positioned below header */}
            <div
              className="absolute left-0 right-0 overflow-y-auto"
              style={{
                top: `calc(env(safe-area-inset-top, 0px) + 64px)`,
                maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 64px - env(safe-area-inset-bottom, 0px))",
                background: "rgba(7,8,15,0.97)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                WebkitOverflowScrolling: "touch",
              }}
            >
            <div className="flex flex-col gap-1 px-2 py-3">
              {/* Enter Code — prominent top action */}
              <Link href="/enter-code" onClick={() => setMobileMenuOpen(false)}>
                <div style={{
                  margin: "4px 0 8px",
                  padding: "14px 18px",
                  borderRadius: 14,
                  background: isActive("/enter-code")
                    ? "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))"
                    : "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.08))",
                  border: `1.5px solid ${isActive("/enter-code") ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.2)"}`,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Hash style={{ width: 16, height: 16, color: "white" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#E2E8F0" }}>Enter Code</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Paper · Duel · Exam</div>
                  </div>
                  <ArrowRight style={{ width: 15, height: 15, color: "rgba(139,92,246,0.6)", marginLeft: "auto", flexShrink: 0 }} />
                </div>
              </Link>
              <div className="border-t border-border my-2" />
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Practice</div>
              <Link href="/create/basic" onClick={() => setMobileMenuOpen(false)}>
                <div className={`px-4 py-2.5 text-sm font-medium rounded-lg flex items-center gap-3 transition-colors ${
                  isActive("/create") || isActive("/vedic-maths")
                    ? "text-primary bg-primary/10" : "text-card-foreground hover:bg-secondary"
                }`}><FileText className="w-4 h-4" />Create Paper</div>
              </Link>
              <Link href="/mental" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Brain className="w-4 h-4" />Mental Math</div>
              </Link>
              <Link href="/burst" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <Zap className="w-4 h-4 text-amber-500" /><span>Burst Mode</span>
                </div>
              </Link>
              <Link href="/duel" onClick={() => setMobileMenuOpen(false)}>
                <div style={{margin:"4px 0 8px",padding:"14px 18px",borderRadius:14,background:isActive("/duel")?"linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.18))":"linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.06))",border:`1.5px solid ${isActive("/duel")?"rgba(167,139,250,0.5)":"rgba(167,139,250,0.2)"}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#7C3AED,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Swords style={{width:16,height:16,color:"white"}} />
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:"#E2E8F0"}}>Duel Mode</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>Real-time · Multiplayer · Live</div>
                  </div>
                  <ArrowRight style={{width:15,height:15,color:"rgba(167,139,250,0.6)",marginLeft:"auto",flexShrink:0}} />
                </div>
              </Link>
              {isAuthenticated && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rewards</div>
                  <Link href="/rewards" onClick={() => setMobileMenuOpen(false)}>
                    <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Award className="w-4 h-4" />My Rewards</div>
                  </Link>
                  {isAdmin ? (
                    <Link href="/fees" onClick={() => setMobileMenuOpen(false)}>
                      <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><IndianRupee className="w-4 h-4" />My Fees</div>
                    </Link>
                  ) : (
                    <div className="px-4 py-2.5 text-sm font-medium rounded-lg flex items-center gap-3" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                      <IndianRupee className="w-4 h-4" />My Fees
                      <span className="ml-auto text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded border" style={{ color: 'rgb(251 191 36 / 0.7)', background: 'rgb(245 158 11 / 0.1)', borderColor: 'rgb(245 158 11 / 0.2)' }}>SOON</span>
                    </div>
                  )}
                  {isAdmin && (
                    <>
                      <div className="border-t border-border my-2" />
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</div>
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Shield className="w-4 h-4" />Dashboard</div>
                      </Link>
                      <Link href="/admin/attendance" onClick={() => setMobileMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Calendar className="w-4 h-4" />Attendance</div>
                      </Link>
                      <Link href="/admin/exams" onClick={() => setMobileMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><FileText className="w-4 h-4" />Exam Management</div>
                      </Link>
                      <Link href="/admin/fees" onClick={() => setMobileMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><IndianRupee className="w-4 h-4" />Fee Management</div>
                      </Link>
                      <Link href="/admin/quotations" onClick={() => setMobileMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Receipt className="w-4 h-4" />Quotations</div>
                      </Link>
                      <Link href="/admin/orgs" onClick={() => setMobileMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Building2 className="w-4 h-4" />Org Management</div>
                      </Link>
                    </>
                  )}
                </>
              )}
              <div className="border-t border-border my-2" />
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Games</div>
              <Link href="/tools/soroban" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Calculator className="w-4 h-4" />Abacus Soroban</div>
              </Link>
              <Link href="/tools/gridmaster" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Grid3X3 className="w-4 h-4" />Vedic Grid</div>
              </Link>
              <Link href="/tools/gridmaster/magic" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Sparkles className="w-4 h-4" />Magic Square</div>
              </Link>
              <Link href="/tools/soroban/flashcards" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <BookOpen className="w-4 h-4" />Abacus Flashcards
                  <span className="ml-auto relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
                  </span>
                </div>
              </Link>
              {isAdmin ? (
                <Link href="/tools/number-ninja" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                    <Swords className="w-4 h-4" />Number Ninja
                    <span className="ml-auto relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="px-4 py-2.5 text-sm font-medium rounded-lg flex items-center gap-3" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                  <Swords className="w-4 h-4" />Number Ninja
                  <span className="ml-auto text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded border" style={{ color: 'rgb(251 191 36 / 0.7)', background: 'rgb(245 158 11 / 0.1)', borderColor: 'rgb(245 158 11 / 0.2)' }}>SOON</span>
                </div>
              )}
              {!isAuthenticated && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="mx-4 w-auto px-5 py-2.5 text-sm font-semibold text-primary-foreground premium-gradient rounded-lg shadow-md hover:shadow-lg transition-all">Sign In</button>
                  </Link>
                </div>
              )}
              {/* Bottom safe-area spacer */}
              <div style={{ height: "env(safe-area-inset-bottom, 0px)", minHeight: 16 }} />
            </div>
            </div>
          </div>
        )}
      </div>
    </header>
    </>
  );
}
