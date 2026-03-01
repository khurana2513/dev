import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, Rocket, Bot, CircuitBoard, 
  Box, Zap, Activity
} from "lucide-react";
import OptimizedImage from "../components/OptimizedImage";

export default function STEMCourse() {
  const [activeLevel, setActiveLevel] = useState(0);

  const levels = [
    { 
      id: "SHUNYA",
      title: "Paper Circuits", 
      desc: "Light up your mind with paper circuits. Discover the magic of electricity through hands-on paper circuit projects.",
      age: "4-7 Years",
      duration: "8 Weeks",
      icon: CircuitBoard,
      accent: "from-orange-400 to-red-400"
    },
    { 
      id: "CHAKRA",
      title: "Robotics Foundations", 
      desc: "Command robots that build the future. Learn to make machines move, sense, and respond.",
      age: "8-11 years",
      duration: "8 weeks",
      icon: Bot,
      accent: "from-blue-400 to-indigo-400"
    },
    { 
      id: "YANTRA",
      title: "Internet of Things", 
      desc: "Connect the world through smart devices. Build smart connected devices that communicate with each other.",
      age: "12-14 years",
      duration: "12 weeks",
      icon: Box,
      accent: "from-purple-400 to-pink-400"
    },
    { 
      id: "ANANTA",
      title: "Advanced AI", 
      desc: "Master advanced IoT and AI integration. Take IoT to the next level with machine learning.",
      age: "14-16 years",
      duration: "12 weeks",
      icon: Zap,
      accent: "from-emerald-400 to-teal-400"
    },
    { 
      id: "GARUDA",
      title: "Drone Engineering", 
      desc: "Soar to new heights with drone technology. Design, build, and fly autonomous drones.",
      age: "14-18 years",
      duration: "8 weeks",
      icon: Rocket,
      accent: "from-rose-400 to-orange-400"
    }
  ];

  const CurrentActiveIcon = levels[activeLevel].icon;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-orange-500/30 overflow-x-hidden">
      <section className="relative pt-48 pb-24 px-6">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_50%_20%,rgba(249,115,22,0.1),transparent)] pointer-events-none" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-3/5 space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.3em]">
                <Activity className="w-3 h-3" /> Engineering Excellence Lab
              </div>
              <h1 className="text-7xl md:text-[9rem] font-black italic uppercase tracking-tighter leading-[0.85]">
                Built for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Creators</span><br />
                Of <span className="text-orange-500 underline decoration-white/10 underline-offset-8">Tomorrow</span>
              </h1>
              <p className="max-w-xl text-slate-400 text-lg font-medium leading-relaxed">
                Robotics, IoT, and aerospace engineering — <span className="text-white italic">unlocked.</span> Where curiosity meets the rigor of modern technology.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button className="px-10 py-5 bg-white text-black rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-orange-500/10">
                  Initialize Lab
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:w-2/5 relative"
            >
              <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden border border-white/10 shadow-3xl bg-slate-900">
                <OptimizedImage
                  src="/stem.png" 
                  alt="STEM Lab" 
                  className="w-full h-full object-cover opacity-60 grayscale transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
             <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.5em] text-orange-500">The STEM Matrix</h2>
                <p className="text-5xl font-black italic uppercase tracking-tighter">Level Progression</p>
             </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {levels.map((l, i) => {
              const Icon = l.icon;
              return (
                <motion.div 
                  key={i}
                  onMouseEnter={() => setActiveLevel(i)}
                  className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer flex flex-col items-center text-center space-y-6 ${
                    activeLevel === i ? 'bg-white text-black border-white scale-105 z-10' : 'bg-slate-900 border-white/5 text-white opacity-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${l.accent} flex items-center justify-center text-white`}>
                     <Icon className="w-6 h-6" />
                  </div>
                  <div>
                     <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{l.id}</span>
                     <h4 className="text-lg font-black uppercase italic tracking-tighter leading-tight mt-1">{l.title}</h4>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={activeLevel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 bg-white/5 border border-white/10 rounded-[3rem] p-12 flex flex-col md:flex-row items-center gap-12"
            >
               <div className="md:w-1/3">
                  <div className={`aspect-square rounded-[2rem] bg-gradient-to-br ${levels[activeLevel].accent} flex items-center justify-center`}>
                     <CurrentActiveIcon className="w-24 h-24 text-white" />
                  </div>
               </div>
               <div className="md:w-2/3 space-y-8">
                  <div className="flex items-center gap-4">
                     <span className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest">{levels[activeLevel].age}</span>
                     <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest">{levels[activeLevel].duration}</span>
                  </div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter">{levels[activeLevel].title}</h3>
                  <p className="text-slate-400 font-medium text-lg leading-relaxed">{levels[activeLevel].desc}</p>
                  <button className="px-8 py-4 bg-orange-600 text-white rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">Initialize Phase</button>
               </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
