import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown, ChevronRight, LogOut, BarChart3, Shield, GraduationCap,
  Calculator, BookOpen, PenTool, Rocket, Menu, X, Brain, FileText,
  Trophy, User, Moon, Sun, ArrowRight, Lock, Zap, Calendar, Grid3X3,
  Gamepad2, Sparkles
} from "lucide-react";
import { useAuthSafe } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function Header() {
  const [coursesOpen, setCoursesOpen]         = useState(false);
  const [practiceOpen, setPracticeOpen]       = useState(false);
  const [practiceSubOpen, setPracticeSubOpen] = useState(false);
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
  const practiceSubTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gamesTimeoutRef       = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef    = useRef<NodeJS.Timeout | null>(null);

  const auth            = useAuthSafe();
  const user            = auth?.user ?? null;
  const logout          = auth?.logout ?? (() => {});
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isAdmin         = auth?.isAdmin ?? false;
  const { theme, toggleTheme } = useTheme();

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
    practiceTimeoutRef.current = setTimeout(() => { setPracticeOpen(false); setPracticeSubOpen(false); }, 200);
  };

  const handlePracticeSubEnter = () => {
    clearRef(practiceSubTimeoutRef);
    clearRef(practiceTimeoutRef);
    setPracticeSubOpen(true);
  };
  const handlePracticeSubLeave = () => {
    practiceSubTimeoutRef.current = setTimeout(() => setPracticeSubOpen(false), 150);
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
      [coursesTimeoutRef, practiceTimeoutRef, practiceSubTimeoutRef, gamesTimeoutRef, userMenuTimeoutRef]
        .forEach(r => { if (r.current) clearTimeout(r.current); });
    };
  }, []);

  const isActive = (path: string) => location === path || location.startsWith(path + "/");

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
      className={`sticky top-0 z-[200] transition-all duration-500 ${
        scrolled
          ? "py-4 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg"
          : "py-6 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
            <div>
              <div className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors tracking-tight">Talent Hub</div>
              <div className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase leading-tight">Excellence Lab</div>
            </div>
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

                    {/* Create Paper — nested flyout */}
                    <div className="relative" onMouseEnter={handlePracticeSubEnter} onMouseLeave={handlePracticeSubLeave}>
                      <div className={`px-4 py-3 text-sm font-medium flex items-center justify-between gap-2 cursor-default rounded-xl ${
                        isActive("/create") || isActive("/vedic-maths")
                          ? "text-primary bg-primary/10 shadow-sm" : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <div className="flex items-center gap-2"><FileText className="w-4 h-4" />Create Paper</div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                      </div>
                      {practiceSubOpen && (
                        <div className="absolute left-full top-0 ml-2 w-64 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl z-[210] overflow-hidden"
                          style={CARD_STYLE} onMouseEnter={handlePracticeSubEnter} onMouseLeave={handlePracticeSubLeave}>
                          <div className="p-1.5">
                            <div className="px-4 py-2 text-[10px] font-black text-primary/70 uppercase tracking-[0.2em]">Abacus</div>
                            <div className="px-4 py-3 text-sm font-medium flex items-center gap-2 rounded-xl text-card-foreground/40 cursor-not-allowed select-none">
                              <Lock className="w-4 h-4 flex-shrink-0" /><span>Junior Level</span>
                              <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">Coming Soon</span>
                            </div>
                            <Link href="/create/basic">
                              <div className={navItem(isActive("/create/basic"))} onClick={() => { setPracticeOpen(false); setPracticeSubOpen(false); }}>
                                <BookOpen className="w-4 h-4" />Basic Level
                              </div>
                            </Link>
                            <Link href="/create/advanced">
                              <div className={navItem(isActive("/create/advanced"))} onClick={() => { setPracticeOpen(false); setPracticeSubOpen(false); }}>
                                <Trophy className="w-4 h-4" />Advanced Level
                              </div>
                            </Link>
                            <div className="mt-1 pt-2 mx-4 border-t-2 border-border/50" />
                            <div className="px-4 py-2 text-[10px] font-black text-primary/70 uppercase tracking-[0.2em]">Vedic Maths</div>
                            <Link href="/vedic-maths/level-1">
                              <div className={navItem(isActive("/vedic-maths"))} onClick={() => { setPracticeOpen(false); setPracticeSubOpen(false); }}>
                                <BookOpen className="w-4 h-4" />Vedic Maths
                              </div>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

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
                        <Grid3X3 className="w-4 h-4" />⊞ Vedic Grid
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
            <button onClick={toggleTheme}
              className="p-3 rounded-2xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle dark mode">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated && user ? (
              <>
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
                            {isAdmin && (
                              <>
                                <div className="mx-4 my-1 border-t border-border/50" />
                                <Link href="/admin">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Shield className="w-4 h-4" />Admin Dashboard
                                  </div>
                                </Link>
                                <Link href="/admin/attendance">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Calendar className="w-4 h-4" />Attendance
                                  </div>
                                </Link>
                                <Link href="/admin/access-control">
                                  <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                    <Lock className="w-4 h-4" />Access Control
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
              <div className="px-2 py-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abacus</div>
                <div className="px-4 py-2 text-sm font-medium text-card-foreground opacity-50 cursor-not-allowed rounded-lg flex items-center gap-3">
                  <Lock className="w-4 h-4" /><span>Junior Level</span><span className="text-[10px] text-muted-foreground ml-auto">Coming Soon</span>
                </div>
                <Link href="/create/basic" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><BookOpen className="w-4 h-4" />Basic Level</div>
                </Link>
                <Link href="/create/advanced" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><Trophy className="w-4 h-4" />Advanced Level</div>
                </Link>
                <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vedic Maths</div>
                <Link href="/vedic-maths/level-1" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors"><BookOpen className="w-4 h-4" />Vedic Maths</div>
                </Link>
              </div>
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
