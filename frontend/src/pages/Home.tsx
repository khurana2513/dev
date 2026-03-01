import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { 
  Sparkles, ArrowRight, Brain, Trophy, Calculator, 
  BookOpen, PenTool, Rocket, Zap, BarChart3, Medal, 
  CheckCircle2, Flame, Star, ChevronRight, Phone, 
  Target, Calendar, Heart, Globe, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shuffledImages, setShuffledImages] = useState<string[]>([]);

  // Static image list (never changes)
  const carouselImages = useMemo(() => [
    "1.jpg","4.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg","11.jpg","12.jpg","13.jpg","14.jpg",
    "0O9A8432.JPG","0O9A8434.JPG","0O9A8502.JPG","0O9A8564.JPG","0O9A8654.JPG","0O9A8660.JPG","0O9A8663.JPG",
    "0O9A8664.JPG","0O9A8666.JPG","0O9A8670.JPG","0O9A8671.JPG","0O9A8673.JPG","2G4A0012.JPG","2G4A0026.JPG",
    "2G4A0060.JPG","2G4A0559.JPG","2G4A0567.JPG","2G4A0742.JPG","773A1293.JPG","773A1317.JPG","773A1605.JPG","773A1606.JPG"
  ], []);

  // Fisher-Yates shuffle (industry standard)
  const shuffleArray = (array: string[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ⭐ Shuffle once on load
  useEffect(() => {
    setShuffledImages(shuffleArray(carouselImages));
  }, [carouselImages]);

  // ⭐ Preload next images (optimized & correct)
// ⭐ Preload next images (optimized & correct)
  useEffect(() => {
    if (!shuffledImages.length) return;

    const preload = (src: string) => {
      const img = new Image();
      img.src = `/imagesproject/${src}`;
    };

    const next1 = (currentImageIndex + 1) % shuffledImages.length;
    const next2 = (currentImageIndex + 2) % shuffledImages.length;

    preload(shuffledImages[next1]);
    preload(shuffledImages[next2]);
  }, [currentImageIndex, shuffledImages.length]);

  // ⭐ Slideshow timer
  useEffect(() => {
    if (!shuffledImages.length) return ;

    const timer = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % shuffledImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [shuffledImages]);



  const reviews = [
    { name: "Shikha Khandelwal", role: "Parent", text: "Very good institute for Abacus and vedic maths. My son's numeracy skills have considerably developed under the guidance of Ms. Sunita Khurana.", rating: 5 },
    { name: "Neha Khanna", role: "Parent", text: "Abacus is a very good and effective technique to speed up calculations. The confidence level of my child is also boosted.", rating: 5 },
    { name: "Yash", role: "Student", text: "Children are being nurtured well thanks for that🙏🏾, and I just request and hope that Talent Hub organisation and Parents continously makes sure that the children do not get prize-oriented alone.", rating: 5 }
  ];

  const courses = [
    { id: "abacus", title: "Study Abacus", icon: Calculator, color: "from-blue-500 to-indigo-600", path: "/courses/abacus", desc: "Age 5-15 • The foundation of mental visualization.", image: "/imagesproject/homepage/abacus.png" },
    { id: "vedic", title: "Vedic Maths", icon: BookOpen, color: "from-purple-500 to-pink-600", path: "/courses/vedic-maths", desc: "Age 10+ • Ancient sutras for modern rapid calculations.", image: "/imagesproject/homepage/Vedic-Maths.png" },
    { id: "handwriting", title: "Handwriting", icon: PenTool, color: "from-emerald-500 to-teal-600", path: "/courses/handwriting", desc: "Develop Clear & Confident handwriting through guided practice.", image: "/imagesproject/homepage/handwriting.png" },
    { id: "stem", title: "STEM", icon: Rocket, color: "from-orange-500 to-red-600", path: "/courses/stem", desc: "Future-ready learning through hands-on science & tech.", image: "/imagesproject/homepage/stem.png" }
  ];

  const tools = [
    { 
      title: "Mental Math Practice", 
      desc: "Timed challenges to sharpen calculation speed. Practice complex operations mentally and track your improvement.", 
      icon: Zap, 
      action: "Try it now", 
      path: "/mental",
      color: "blue"
    },
    { 
      title: "Live Paper Attempt", 
      desc: "Real exam-style practice papers with instant feedback. Simulate actual test conditions and improve performance.", 
      icon: FileText, 
      action: "Create paper", 
      path: "/create",
      color: "purple"
    },
    { 
      title: "Progress Tracking", 
      desc: "Detailed analytics showing your improvement over time. See exactly where you excel and where to focus.", 
      icon: BarChart3, 
      action: "View dashboard", 
      path: "/dashboard",
      color: "emerald"
    },
    { 
      title: "Points & Progress", 
      desc: "Earn points for every practice session. Track your improvement and see how your hard work pays off.", 
      icon: Flame, 
      action: "View dashboard", 
      path: "/dashboard",
      color: "orange"
    },
    { 
      title: "Speed & Accuracy", 
      desc: "Every tool is designed to improve both speed and accuracy. Track your metrics and see real improvement.", 
      icon: Target, 
      action: "Built into every practice", 
      path: "/mental",
      color: "rose"
    }
  ];

  const achievements = [
    { 
      title: "National & International Olympiads", 
      desc: "Participate in prestigious math olympiads every year", 
      icon: Globe,
      image: "/imagesproject/homepage/olympiads.jpeg"
    },
    { 
      title: "Medals & Certificates", 
      desc: "Earn recognition for your achievements and milestones", 
      icon: Medal,
      image: "/imagesproject/homepage/medals_certificates.jpeg"
    },
    { 
      title: "Monthly Tests", 
      desc: "Regular assessments every last Sunday to track progress", 
      icon: Calendar,
      image: "/imagesproject/homepage/monthly_tests.jpeg"
    },
    { 
      title: "Fun & Co-curricular Activities", 
      desc: "Engaging activities that make learning enjoyable", 
      icon: Heart,
      image: "/imagesproject/homepage/fun_activities.jpeg"
    }
  ]; 
  if (!shuffledImages.length) return null;
  return (
    <div className="min-h-screen bg-background text-left">
      {/* Dynamic Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
        </div>

        <div className="container relative z-10 mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-xs font-bold tracking-widest uppercase mb-8">
              <Sparkles className="w-4 h-4 text-primary" /> 18+ Years of Excellence
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
              Crafting <span className="text-gradient">Genius</span> <br />
              One Beat at <br /> a Time.
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-lg leading-relaxed">
              Strong basics, regular practice, and confidence that shows — in class and beyond.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/create">
                <button className="px-10 py-5 bg-primary text-primary-foreground rounded-full font-black text-lg shadow-2xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-3">
                  Start Training <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <button 
                onClick={() => document.getElementById("courses-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-10 py-5 bg-secondary text-secondary-foreground border border-border rounded-full font-black text-lg hover:bg-muted transition-all"
              >
                Explore Programs
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative aspect-square"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-[4rem] blur-2xl" />
            <div className="relative h-full w-full rounded-[4rem] overflow-hidden border border-border bg-card shadow-2xl group">
              <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                <img
                  src={`/imagesproject/${shuffledImages[currentImageIndex]}`}
                  className="w-full h-full object-cover"
                  alt="Talent Hub Excellence"
                  loading={currentImageIndex === 0 ? "eager" : "lazy"}
                  decoding="async"
                  {...(currentImageIndex === 0 ? { fetchpriority: "high" as const } : {})}
                />
              </motion.div>
            </AnimatePresence>

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-12 left-12 right-12">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-xl leading-none">900+ Students</h3>
                    <p className="text-white/60 text-sm mt-1">Guided over the years.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses-section" className="py-32">
        <div className="container mx-auto px-6 text-left">
          <div className="max-w-3xl mb-24">
            <h2 className="text-5xl font-black tracking-tighter mb-8 uppercase italic">Our Programs</h2>
            <p className="text-xl text-muted-foreground">Four structured pathways to sharper thinking. Built for real improvement, not shortcuts.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group relative h-[450px] rounded-[3rem] overflow-hidden border border-border"
              >
                <img 
                  src={c.image} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={c.title}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                    <c.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">{c.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-32 bg-secondary/30">
        <div className="container mx-auto px-6 text-left">
          <div className="max-w-3xl mb-24">
            <h2 className="text-5xl font-black tracking-tighter mb-8 uppercase italic">The Toolkit</h2>
            <p className="text-xl text-muted-foreground">Every tool on this platform is built to track, measure, and improve real learning outcomes.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group p-10 rounded-[2.5rem] bg-card border border-border hover:border-primary/50 transition-all hover:shadow-2xl"
              >
                <div className={`w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all`}>
                  <tool.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{tool.title}</h3>
                <p className="text-muted-foreground mb-10 leading-relaxed text-sm">{tool.desc}</p>
                <Link href={tool.path}>
                  <button className="flex items-center gap-2 font-black text-xs uppercase tracking-widest group-hover:text-primary transition-colors">
                    {tool.action} <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Olympiads & Achievements */}
      <section className="py-32">
        <div className="container mx-auto px-6 text-left">
          <div className="max-w-3xl mb-24">
            <h2 className="text-5xl font-black tracking-tighter mb-8 uppercase italic">Olympiads & Achievements</h2>
            <p className="text-xl text-muted-foreground">Structured assessments and national-level competitions that recognize consistent effort and excellence.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group relative h-[450px] rounded-[3rem] overflow-hidden border border-border"
              >
                <img 
                  src={a.image} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={a.title}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                    <a.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">{a.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{a.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Testimonials */}
      <section className="py-32 bg-slate-950 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-0 left-[20%] w-[1px] h-full bg-white/10" />
          <div className="absolute top-0 left-[40%] w-[1px] h-full bg-white/10" />
          <div className="absolute top-0 left-[60%] w-[1px] h-full bg-white/10" />
          <div className="absolute top-0 left-[80%] w-[1px] h-full bg-white/10" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl text-left">
            <h2 className="text-4xl md:text-6xl font-black mb-24 tracking-tighter italic uppercase">Testimonials</h2>
            <div className="space-y-16">
              {reviews.map((r, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                  viewport={{ once: true }}
                  className="relative pl-12"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />
                  <p className="text-2xl md:text-4xl font-medium mb-10 leading-tight opacity-90 italic">"{r.text}"</p>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-bold text-2xl text-primary border border-primary/30">
                      {r.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-xl uppercase tracking-tight">{r.name}</h4>
                      <p className="text-xs uppercase tracking-[0.3em] text-primary mt-1">{r.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Excellence */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="relative rounded-[4rem] overflow-hidden bg-primary py-24 px-12 text-center border border-white/10 shadow-2xl">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter italic">READY TO BEGIN THE JOURNEY?</h2>
              <p className="text-white/80 text-xl mb-12 font-medium">
                The first step to mathematical mastery begins with a single session. Join the legacy.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link href="/login">
                  <button className="px-12 py-5 bg-white text-primary rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl">
                    Get Started Free
                  </button>
                </Link>
                <a href="tel:+919266117055">
                  <button className="px-12 py-5 bg-transparent border-2 border-white/30 text-white rounded-full font-black text-xl hover:bg-white/10 transition-all flex items-center gap-3">
                    <Phone className="w-6 h-6" /> Connect
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
