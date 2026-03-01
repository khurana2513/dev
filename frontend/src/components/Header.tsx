import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, LogOut, BarChart3, Shield, GraduationCap, Calculator, BookOpen, PenTool, Rocket, Menu, X, Brain, FileText, Sparkles, Trophy, User, Moon, Sun, ArrowRight, Lock, Zap, Calendar } from "lucide-react";
import { useAuthSafe } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function Header() {
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [createPaperOpen, setCreatePaperOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const coursesDropdownRef = useRef<HTMLDivElement>(null);
  const createPaperDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const coursesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const createPaperTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const auth = useAuthSafe();
  const user = auth?.user ?? null;
  const logout = auth?.logout ?? (() => {});
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isAdmin = auth?.isAdmin ?? false;
  const { theme, toggleTheme } = useTheme();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle logo click
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setLocation("/");
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  };

  // Handle courses dropdown
  const handleCoursesMouseEnter = () => {
    if (coursesTimeoutRef.current) {
      clearTimeout(coursesTimeoutRef.current);
      coursesTimeoutRef.current = null;
    }
    setCoursesOpen(true);
  };

  const handleCoursesMouseLeave = () => {
    coursesTimeoutRef.current = setTimeout(() => {
      setCoursesOpen(false);
    }, 200);
  };

  // Handle create paper dropdown
  const handleCreatePaperMouseEnter = () => {
    if (createPaperTimeoutRef.current) {
      clearTimeout(createPaperTimeoutRef.current);
      createPaperTimeoutRef.current = null;
    }
    setCreatePaperOpen(true);
  };

  const handleCreatePaperMouseLeave = () => {
    createPaperTimeoutRef.current = setTimeout(() => {
      setCreatePaperOpen(false);
    }, 200);
  };


  // Handle user menu
  const handleUserMenuEnter = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current);
      userMenuTimeoutRef.current = null;
    }
    setUserMenuOpen(true);
  };

  const handleUserMenuLeave = () => {
    userMenuTimeoutRef.current = setTimeout(() => {
      setUserMenuOpen(false);
    }, 200);
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (coursesTimeoutRef.current) clearTimeout(coursesTimeoutRef.current);
      if (createPaperTimeoutRef.current) clearTimeout(createPaperTimeoutRef.current);
      if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
    };
  }, []);

  const isActive = (path: string) => location === path || location.startsWith(path + "/");

  // Debug: Log theme on render
  useEffect(() => {
    console.log("🌙 [HEADER] Current theme:", theme);
    console.log("🌙 [HEADER] HTML has dark class:", document.documentElement.classList.contains("dark"));
  }, [theme]);

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled 
          ? "py-4 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg" 
          : "py-6 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo + Tagline */}
          <Link 
            href="/" 
            onClick={handleLogoClick}
            className="flex items-center gap-3 group cursor-pointer z-10"
          >
            <div className="relative">
              <img 
                src="/imagesproject/logo.ico.jpg" 
                alt="Talent Hub Logo" 
                className="w-11 h-11 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-purple-600 to-primary items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105 hidden">
                <GraduationCap className="w-5.5 h-5.5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors tracking-tight">
                Talent Hub
              </div>
              <div className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase leading-tight">
                Excellence Lab
              </div>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          <nav className="hidden lg:flex items-center gap-2 bg-secondary/50 backdrop-blur-md p-1.5 rounded-full border border-border/50 absolute left-1/2 transform -translate-x-1/2">
            {/* Courses Dropdown */}
            <div 
              ref={coursesDropdownRef}
              className="relative"
              onMouseEnter={handleCoursesMouseEnter}
              onMouseLeave={handleCoursesMouseLeave}
            >
              <button className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/courses")
                  ? "text-primary bg-card/70 shadow-sm"
                  : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                Courses
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${coursesOpen ? 'rotate-180' : ''}`} />
              </button>

              {coursesOpen && (
                <div 
                  className="absolute top-full left-0 mt-3 w-72 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.95) 100%)',
                    boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={handleCoursesMouseEnter}
                  onMouseLeave={handleCoursesMouseLeave}
                >
                  <div className="p-1.5">
                    <Link href="/courses/abacus">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/courses/abacus")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <Calculator className="w-4 h-4" />
                        Study Abacus
                      </div>
                    </Link>
                    <Link href="/courses/vedic-maths">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/courses/vedic-maths")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <BookOpen className="w-4 h-4" />
                        Vedic Maths
                      </div>
                    </Link>
                    <Link href="/courses/handwriting">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/courses/handwriting")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <PenTool className="w-4 h-4" />
                        Handwriting
                      </div>
                    </Link>
                    <Link href="/courses/stem">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/courses/stem")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <Rocket className="w-4 h-4" />
                        STEM
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Create Paper Dropdown */}
            <div 
              ref={createPaperDropdownRef}
              className="relative"
              onMouseEnter={handleCreatePaperMouseEnter}
              onMouseLeave={handleCreatePaperMouseLeave}
            >
              <button className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/create") || isActive("/vedic-maths")
                  ? "text-primary bg-card/70 shadow-sm"
                  : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                <FileText className="w-4 h-4" />
                Papers
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${createPaperOpen ? 'rotate-180' : ''}`} />
              </button>

              {createPaperOpen && (
                <div 
                  className="absolute top-full left-0 mt-3 w-72 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.95) 100%)',
                    boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={handleCreatePaperMouseEnter}
                  onMouseLeave={handleCreatePaperMouseLeave}
                >
                  <div className="p-1.5">
                    <div className="px-4 py-2 text-[10px] font-black text-primary/70 uppercase tracking-[0.2em]">
                      Abacus
                    </div>
                    <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 rounded-xl ${
                      "text-card-foreground/50 opacity-60 cursor-not-allowed"
                    }`}>
                      <Lock className="w-4 h-4" />
                      <span>Junior Level</span>
                      <span className="text-[10px] font-normal text-muted-foreground ml-auto">Coming Soon</span>
                    </div>
                    <Link href="/create/basic">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/create/basic")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <BookOpen className="w-4 h-4" />
                        Basic Level
                      </div>
                    </Link>
                    <Link href="/create/advanced">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/create/advanced")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <Trophy className="w-4 h-4" />
                        Advanced Level
                      </div>
                    </Link>
                    <div className="mt-2 pt-2 px-4 py-2 text-[10px] font-black text-primary/70 uppercase tracking-[0.2em] border-t-2 border-border/50">
                      Vedic Maths
                    </div>
                    <Link href="/vedic-maths/level-1">
                      <div className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer rounded-xl ${
                        isActive("/vedic-maths")
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-card-foreground hover:bg-primary/10 hover:shadow-sm"
                      }`}>
                        <BookOpen className="w-4 h-4" />
                        Vedic Maths
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Mental Math Button */}
            <Link href="/mental">
              <button className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 ${
                isActive("/mental")
                  ? "text-primary bg-card/70 shadow-sm"
                  : "text-foreground/70 hover:text-primary hover:bg-card/60"
              }`}>
                <Brain className="w-4 h-4" />
                Mental Math
              </button>
            </Link>

            {/* Burst Mode Button */}
            <Link href="/burst">
              <button className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 relative ${
                isActive("/burst")
                  ? "text-amber-600 dark:text-amber-400 bg-card/70 shadow-sm"
                  : "text-foreground/70 hover:text-amber-500 hover:bg-card/60"
              }`}>
                <Zap className="w-4 h-4" />
                Burst
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                </span>
              </button>
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                console.log("🌙 [HEADER] Toggle clicked, current theme:", theme);
                toggleTheme();
                console.log("🌙 [HEADER] Theme after toggle:", theme === "dark" ? "light" : "dark");
              }}
              className="p-3 rounded-2xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            
            {isAuthenticated && user ? (
              <>
                {/*
                  Always show display_name (if set) everywhere in UI.
                  Backend returns `display_name` on /users/me and login; fall back to `name`.
                */}
                {(() => {
                  const displayName = (user as any).display_name || user.name;
                  return (
                <div 
                  ref={userMenuRef}
                  className="relative"
                  onMouseEnter={handleUserMenuEnter}
                  onMouseLeave={handleUserMenuLeave}
                >
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
                    <div 
                      className="absolute right-0 top-full mt-2 w-64 bg-card backdrop-blur-2xl border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.95) 100%)',
                        boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={handleUserMenuEnter}
                      onMouseLeave={handleUserMenuLeave}
                    >
                      <div className="p-4 border-b-2 border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="font-semibold text-card-foreground text-sm">{displayName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-primary">{user.total_points} points</span>
                        </div>
                      </div>
                      
                      <div className="p-1.5">
                        <Link href="/dashboard">
                          <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-primary/10 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                            <BarChart3 className="w-4 h-4" />
                            Dashboard
                          </div>
                        </Link>
                        
                        <Link href="/profile">
                          <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-primary/10 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                            <User className="w-4 h-4" />
                            Student Profile
                          </div>
                        </Link>

                        <Link href="/attendance">
                          <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-primary/10 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                            <Calendar className="w-4 h-4" />
                            My Attendance
                          </div>
                        </Link>
                        
                        {isAdmin && (
                          <>
                            <Link href="/admin">
                              <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                <Shield className="w-4 h-4" />
                                Admin Dashboard
                              </div>
                            </Link>
                            <Link href="/admin/attendance">
                              <div className="px-4 py-3 text-sm font-medium text-card-foreground hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:shadow-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl">
                                <Calendar className="w-4 h-4" />
                                Attendance
                              </div>
                            </Link>
                          </>
                        )}
                      </div>
                      
                      <div className="p-1.5 border-t-2 border-border/50">
                        <button
                          onClick={logout}
                          className="w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:shadow-sm flex items-center gap-2 text-left transition-all rounded-xl"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
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
                  <ArrowRight className="w-4 h-4" />
                  Sign In
                </button>
              </Link>
            )}
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary/80 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border pt-4 pb-4 mt-2">
            <div className="flex flex-col gap-1">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courses</div>
              <Link href="/courses/abacus" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <Calculator className="w-4 h-4" />
                  Study Abacus
                </div>
              </Link>
              <Link href="/courses/vedic-maths" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <BookOpen className="w-4 h-4" />
                  Vedic Maths
                </div>
              </Link>
              <Link href="/courses/handwriting" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <PenTool className="w-4 h-4" />
                  Handwriting
                </div>
              </Link>
              <Link href="/courses/stem" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                  <Rocket className="w-4 h-4" />
                  STEM
                </div>
              </Link>
              <div className="border-t border-border my-2"></div>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Create Paper</div>
              <div className="px-2 py-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abacus</div>
                <div className="px-4 py-2 text-sm font-medium text-card-foreground opacity-60 cursor-not-allowed rounded-lg flex items-center gap-3">
                  <Lock className="w-4 h-4" />
                  <span>Junior Level</span>
                  <span className="text-[10px] font-normal text-muted-foreground ml-auto">Coming Soon</span>
                </div>
                <Link href="/create/basic" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Basic Level
                  </div>
                </Link>
                <Link href="/create/advanced" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                    <Trophy className="w-4 h-4" />
                    Advanced Level
                  </div>
                </Link>
                <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vedic Maths</div>
                <Link href="/vedic-maths/level-1" onClick={() => setMobileMenuOpen(false)}>
                  <div className="px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg flex items-center gap-3 transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Vedic Maths
                  </div>
                </Link>
              </div>
              <Link href="/mental" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg transition-colors flex items-center gap-3">
                  <Brain className="w-4 h-4" />
                  Mental Math
                </div>
              </Link>
              <Link href="/burst" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-secondary rounded-lg transition-colors flex items-center gap-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Burst Mode</span>
                  <span className="ml-auto relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                </div>
              </Link>
              {!isAuthenticated && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="mx-4 w-auto px-5 py-2.5 text-sm font-semibold text-primary-foreground premium-gradient rounded-lg shadow-md hover:shadow-lg transition-all">
                      Sign In
                    </button>
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
