import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Play, X,
  Activity, ShieldCheck, CheckCircle2, Clock
} from "lucide-react";
import OptimizedImage from "../components/OptimizedImage";

export default function AbacusCourse() {
  const [showDemo, setShowDemo] = useState(false);
  const [activeLevel, setActiveLevel] = useState(0);

  const categories = [
    { 
      name: "Junior", 
      age: "4 – 5 years", 
      levels: "1 to 4", 
      topics: ["Introduction of Abacus", "Manipulating the beads", "Basic addition", "Subtraction and multiplication"],
      accent: "from-blue-400 to-cyan-400"
    },
    { 
      name: "Basic", 
      age: "6 – 10 years", 
      levels: "1 to 6", 
      topics: ["Basic calculation", "Addition", "Subtraction", "Multiplication and Division", "Mental games"],
      accent: "from-purple-400 to-indigo-400"
    },
    { 
      name: "Advanced", 
      age: "10 – 12 years", 
      levels: "7 to 10", 
      topics: ["Basic Operations", "LCM, HCF, GCD", "Square Root", "Cube Root"],
      accent: "from-rose-400 to-orange-400"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30 overflow-x-hidden">
      <section className="relative pt-48 pb-24 px-6">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-3/5 space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.3em]">
                <Activity className="w-3 h-3" /> Cognitive Performance Lab
              </div>
              <h1 className="text-7xl md:text-[9rem] font-black italic uppercase tracking-tighter leading-[0.85]">
                Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Numbers</span><br />
                With <span className="text-purple-500 underline decoration-white/10 underline-offset-8">Precision</span>
              </h1>
              <p className="max-w-xl text-slate-400 text-lg font-medium leading-relaxed">
                Transform from counting fingers to thinking in neural beads. Our professional Abacus program is engineered for measurable cognitive evolution.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={() => setShowDemo(true)}
                  className="group px-10 py-5 bg-white text-black rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all shadow-2xl"
                >
                  <Play className="w-4 h-4 fill-current" /> Try Challenge
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:w-2/5 relative"
            >
              <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden border border-white/10 shadow-3xl">
                <OptimizedImage
                  src="/abacus.png" 
                  alt="Abacus Master" 
                  className="w-full h-full object-cover grayscale transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
              </div>
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-8 -left-8 p-6 bg-purple-600 rounded-3xl shadow-2xl z-20"
              >
                <span className="text-4xl font-black italic">842</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-24 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.5em] text-purple-500">The Evolution Path</h2>
            <p className="text-5xl font-black italic uppercase tracking-tighter">Structured Growth Tracks</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 hidden lg:block" />
            
            {categories.map((cat, i) => (
              <motion.div 
                key={i}
                onMouseEnter={() => setActiveLevel(i)}
                className={`relative p-12 rounded-[3.5rem] border transition-all duration-500 group ${
                  activeLevel === i ? 'bg-white text-black border-white scale-105 z-10' : 'bg-slate-900 border-white/5 text-white opacity-50'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cat.accent} flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform`}>
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Level {cat.levels}</span>
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter mt-1">{cat.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 py-2 border-y border-current/10">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                       <Clock className="w-3 h-3" /> 4 Months / Level
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {cat.topics.map((t, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs font-bold leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[4rem] p-16 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
            <div className="md:w-1/2 space-y-8 relative z-10">
              <ShieldCheck className="w-16 h-16 text-white opacity-20" />
              <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-[0.9]">The Professional<br />Toolkit Included</h2>
              <div className="flex flex-wrap gap-4">
                {["Books", "Bag", "Tool", "T-Shirt"].map(item => (
                  <span key={item} className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden p-16 relative"
            >
              <button onClick={() => setShowDemo(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X /></button>
              <div className="text-center space-y-12">
                <div className="space-y-4">
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter">Speed Challenge</h3>
                  <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase">Level: Junior Sync</p>
                </div>
                <div className="p-16 bg-slate-950 rounded-[2.5rem] border border-white/5">
                   <p className="text-8xl font-black italic text-purple-500 animate-pulse">12 + 25 - 7</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setShowDemo(false)} className="py-6 bg-white text-black rounded-full font-black text-xs tracking-widest uppercase hover:scale-105 transition-all">30</button>
                   <button onClick={() => setShowDemo(false)} className="py-6 bg-slate-800 text-white rounded-full font-black text-xs tracking-widest uppercase hover:scale-105 transition-all">28</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
