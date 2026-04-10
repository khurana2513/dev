import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown, LogOut, BarChart3, Shield, GraduationCap,
  Calculator, Menu, X, Brain, FileText,
  User, ArrowRight, Lock, Zap, Calendar, Grid3X3,
  Gamepad2, Sparkles, Award, Hash
} from "lucide-react";
import { useAuthSafe } from "../contexts/AuthContext";
import { motion } from "framer-motion";

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

  // Track streak changes for the pop-in animation on the badge number
  const [streakAnimKey, setStreakAnimKey] = useState(0);
  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    const currentStreak = (user as any)?.current_streak ?? 0;
    if (prevStreakRef.current !== null && prevStreakRef.current !== currentStreak) {
      setStreakAnimKey((k) => k + 1);
    }
    prevStreakRef.current = currentStreak;
  }, [(user as any)?.current_streak]);

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
      [coursesTimeoutRef, practiceTimeoutRef, gamesTimeoutRef, userMenuTimeoutRef]
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
          ? "border-b border-border/50 shadow-lg"
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

                    {/* Enter shared paper code */}
                    <Link href="/paper/enter-code">
                      <div className={navItem(isActive("/paper/enter-code"))} onClick={() => setPracticeOpen(false)}>
                        <Hash className="w-4 h-4" />Enter Code
                      </div>
                    </Link>

                    <Link href="/mental">
                      <div className={navItem(isActive("/mental"))} onClick={() => setPracticeOpen(false)}>
                        <Brain className="w-4 h-4" />Mental Math
                      </div>
                    </Link>
                    <Link href="/burst">
                      <div className={navItem(isActive("/burst"), true)} onClick={() => setPracticeOpen(false)}>
                        <Zap className="w-4 h-4 text-amber-500" />Burst Mode
                        <span className="ml-auto relative flex h-2.5 w-2.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                        </span>
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
                      <div className={navItem(isActive("/tools/soroban"))} onClick={() => setGamesOpen(false)}>
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
                  </div>
                </div>
              )}
            </div>

          </nav>

          {/* ── Right side ───────────────────────────────────────────── */}
          <div className="flex items-center gap-3">

            {isAuthenticated && user ? (
              <>
                {/* ── Streak Fire Badge ─────────────────────────────── */}
                {(() => {
                  const streak = (user as any).current_streak ?? 0;
                  const hasStreak = streak > 0;
                  const flameColor =
                    streak >= 60 ? "#c084fc" :
                    streak >= 30 ? "#facc15" :
                    streak >= 14 ? "#fb923c" :
                    streak >= 7  ? "#f97316" :
                    streak >= 3  ? "#ef4444" :
                    streak >= 1  ? "#f97316" : "#64748b";
                  return (
                    <motion.button
                      onClick={() => setLocation("/rewards?tab=streak")}
                      title={`${streak}-day streak — click to view`}
                      whileHover={{ scale: 1.08, y: -1 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22 }}
                      className={hasStreak ? "streak-badge-active" : "streak-badge-zero"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.3rem 0.65rem 0.3rem 0.5rem",
                        borderRadius: "999px",
                        border: `1.5px solid ${flameColor}55`,
                        background: hasStreak
                          ? `linear-gradient(135deg, ${flameColor}26 0%, ${flameColor}14 100%)`
                          : "rgba(100,116,139,0.10)",
                        cursor: "pointer",
                        userSelect: "none",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Ambient glow layer */}
                      {hasStreak && (
                        <motion.span
                          animate={{ opacity: [0.12, 0.28, 0.12] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "999px",
                            background: `radial-gradient(circle at 35% 50%, ${flameColor}55 0%, transparent 70%)`,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      {/* Fire icon with flicker animation */}
                      <span
                        className="streak-fire-icon"
                        style={{
                          fontSize: "1.05rem",
                          filter: hasStreak ? `drop-shadow(0 0 5px ${flameColor}cc)` : undefined,
                          lineHeight: 1,
                        }}
                      >
                        🔥
                      </span>
                      {/* Streak number */}
                      <span
                        key={streakAnimKey}
                        className={streakAnimKey > 0 ? "streak-number-pop" : ""}
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 800,
                          color: hasStreak ? flameColor : "#64748b",
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                          textShadow: hasStreak ? `0 0 10px ${flameColor}88` : undefined,
                          fontVariantNumeric: "tabular-nums",
                          minWidth: "1ch",
                        }}
                      >
                        {streak}
                      </span>
                    </motion.button>
                  );
                })()}

                {(() => {
                  const displayName = (user as any).display_name || user.name;
                  return (
                    <div ref={userMenuRef} className="relative" onMouseEnter={handleUserMenuEnter} onMouseLeave={handleUserMenuLeave}>
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
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#a78bfa", background: "rgba(167,139,250,0.13)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, padding: "2px 9px" }}>{user.total_points} pts</span>
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
                                <Link href="/admin/access-control" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Lock className="w-4 h-4" />Access Control
                                  </div>
                                </Link>
                                <Link href="/admin/rewards" onClick={() => setUserMenuOpen(false)}>
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Award className="w-4 h-4" />Rewards Admin
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
              className="lg:hidden p-2 rounded-lg hover:bg-secondary/80 transition-colors" aria-label="Toggle menu">
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
              <div className="border-t border-border my-2" />
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Practice</div>
              <Link href="/create/basic" onClick={() => setMobileMenuOpen(false)}>
                <div className={`px-4 py-2.5 text-sm font-medium rounded-lg flex items-center gap-3 transition-colors ${
                  isActive("/create") || isActive("/vedic-maths")
                    ? "text-primary bg-primary/10" : "text-card-foreground hover:bg-secondary"
                }`}><FileText className="w-4 h-4" />Create Paper</div>
              </Link>
              <Link href="/paper/enter-code" onClick={() => setMobileMenuOpen(false)}>
                <div className={`px-4 py-2.5 text-sm font-medium rounded-lg flex items-center gap-3 transition-colors ${
                  isActive("/paper/enter-code")
                    ? "text-primary bg-primary/10" : "text-card-foreground hover:bg-secondary"
                }`}><Hash className="w-4 h-4" />Enter Code</div>
              </Link>
              <Link href="/mental" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Brain className="w-4 h-4" />Mental Math</div>
              </Link>
              <Link href="/burst" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <Zap className="w-4 h-4 text-amber-500" /><span>Burst Mode</span>
                  <span className="ml-auto relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                </div>
              </Link>
              {isAuthenticated && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rewards</div>
                  <Link href="/rewards" onClick={() => setMobileMenuOpen(false)}>
                    <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Award className="w-4 h-4" />My Rewards</div>
                  </Link>
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
