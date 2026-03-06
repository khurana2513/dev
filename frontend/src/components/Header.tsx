import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown, LogOut, BarChart3, Shield, GraduationCap,
  Calculator, BookOpen, PenTool, Rocket, Menu, X, Brain, FileText,
  User, ArrowRight, Lock, Zap, Calendar, Grid3X3,
  Gamepad2, Sparkles, Award
} from "lucide-react";
import { useAuthSafe } from "../contexts/AuthContext";
import { motion } from "framer-motion";

export default function Header() {
  const [coursesOpen, setCoursesOpen]         = useState(false);
  const [practiceOpen, setPracticeOpen]       = useState(false);
  const [gamesOpen, setGamesOpen]             = useState(false);
  const [userMenuOpen, setUserMenuOpen]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [scrolled, setScrolled]               = useState(false);

  const [location, setLocation] = useLocation();

  const coursesDropdownRef  = useRef<HTMLDivElement>(null);
  const practiceDropdownRef = useRef<HTMLDivElement>(null);
  const gamesDropdownRef    = useRef<HTMLDivElement>(null);
  const userMenuRef         = useRef<HTMLDivElement>(null);

  const coursesTimeoutRef     = useRef<NodeJS.Timeout | null>(null);
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
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleCoursesEnter = () => { clearRef(coursesTimeoutRef); setCoursesOpen(true); };
  const handleCoursesLeave = () => {
    coursesTimeoutRef.current = setTimeout(() => setCoursesOpen(false), 200);
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

  useEffect(() => {
    return () => {
      [coursesTimeoutRef, practiceTimeoutRef, gamesTimeoutRef, userMenuTimeoutRef]
        .forEach(r => { if (r.current) clearTimeout(r.current); });
    };
  }, []);

  const isActive = (path: string) => location === path || location.startsWith(path + "/");

  // Hide header completely on the sign-in page — Login is a full-screen overlay

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
    <header
      className={`sticky top-0 z-[200] py-4 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 group cursor-pointer z-10">
            <div className="relative">
              <img
                src="/imagesproject/logo.ico.jpg"
                alt="Talent Hub Logo"
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
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }} className="text-foreground group-hover:text-primary transition-colors">Talent Hub</div>
            </div> */}
          </Link>

          {/* ── Center Nav Pill (Desktop) ─────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-2 bg-secondary/50 backdrop-blur-md p-1.5 rounded-full border border-border/50 absolute left-1/2 transform -translate-x-1/2">

            {/* COURSES */}
            <div ref={coursesDropdownRef} className="relative" onMouseEnter={handleCoursesEnter} onMouseLeave={handleCoursesLeave}>
              <button className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/courses") ? "text-primary bg-card/70 shadow-sm" : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                Courses
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${coursesOpen ? "rotate-180" : ""}`} />
              </button>
              {coursesOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden z-[200]"
                  style={CARD_STYLE} onMouseEnter={handleCoursesEnter} onMouseLeave={handleCoursesLeave}>
                  <div className="p-1.5">
                    <Link href="/courses/abacus">
                      <div className={navItem(isActive("/courses/abacus"))}><Calculator className="w-4 h-4" />Study Abacus</div>
                    </Link>
                    <Link href="/courses/vedic-maths">
                      <div className={navItem(isActive("/courses/vedic-maths"))}><BookOpen className="w-4 h-4" />Vedic Maths</div>
                    </Link>
                    <Link href="/courses/handwriting">
                      <div className={navItem(isActive("/courses/handwriting"))}><PenTool className="w-4 h-4" />Handwriting</div>
                    </Link>
                    <Link href="/courses/stem">
                      <div className={navItem(isActive("/courses/stem"))}><Rocket className="w-4 h-4" />STEM</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

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
                      <div className={navItem(isActive("/tools/gridmaster"))} onClick={() => setGamesOpen(false)}>
                        <Grid3X3 className="w-4 h-4" />Vedic Grid
                      </div>
                    </Link>
                    <Link href="/tools/gridmaster?tab=magic">
                      <div className={navItem(isActive("/tools/gridmaster"))} onClick={() => setGamesOpen(false)}>
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
                      <button className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/80 transition-colors">
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
                          <div className="p-4 border-b-2 border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                            <div className="font-semibold text-card-foreground text-sm">{displayName}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                            <div className="mt-2"><span className="text-xs font-medium text-primary">{user.total_points} points</span></div>
                          </div>
                          <div className="p-1.5">
                            <Link href="/dashboard">
                              <div className={navItem(isActive("/dashboard"))}><BarChart3 className="w-4 h-4" />Dashboard</div>
                            </Link>
                            <Link href="/profile">
                              <div className={navItem(isActive("/profile"))}><User className="w-4 h-4" />Student Profile</div>
                            </Link>
                            <Link href="/rewards">
                              <div className={navItem(isActive("/rewards"))}><Award className="w-4 h-4" />Rewards</div>
                            </Link>
                            {isAdmin && (
                              <>
                                <div className="mx-4 my-1 border-t border-border/50" />
                                <Link href="/admin">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Shield className="w-4 h-4" />Admin Dashboard
                                  </div>
                                </Link>
                                <Link href="/admin/attendance">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Calendar className="w-4 h-4" />Attendance
                                  </div>
                                </Link>
                                <Link href="/admin/access-control">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Lock className="w-4 h-4" />Access Control
                                  </div>
                                </Link>
                                <Link href="/admin/rewards">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground  hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Award className="w-4 h-4" />Rewards Admin
                                  </div>
                                </Link>
                              </>
                            )}
                          </div>
                          <div className="p-1.5 border-t-2 border-border/50">
                            <button onClick={logout}
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

        {/* ── Mobile Menu ───────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border pt-4 pb-4 mt-2">
            <div className="flex flex-col gap-1">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courses</div>
              <Link href="/courses/abacus" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Calculator className="w-4 h-4" />Study Abacus</div>
              </Link>
              <Link href="/courses/vedic-maths" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><BookOpen className="w-4 h-4" />Vedic Maths</div>
              </Link>
              <Link href="/courses/handwriting" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><PenTool className="w-4 h-4" />Handwriting</div>
              </Link>
              <Link href="/courses/stem" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Rocket className="w-4 h-4" />STEM</div>
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
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Grid3X3 className="w-4 h-4" />⊞ Vedic Grid</div>
              </Link>
              <Link href="/tools/gridmaster?tab=magic" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Sparkles className="w-4 h-4" />Magic Square</div>
              </Link>
              {!isAuthenticated && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="mx-4 w-auto px-5 py-2.5 text-sm font-semibold text-primary-foreground premium-gradient rounded-lg shadow-md hover:shadow-lg transition-all">Sign In</button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
