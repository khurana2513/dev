import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Brain, CheckCircle2, ShieldCheck, Play, Sparkles
} from "lucide-react";
import OptimizedImage from "../components/OptimizedImage";

export default function VedicMathsCourse() {
  const [activeSutra, setActiveSutra] = useState(0);

  const sutras = [
    { title: "Ekadhikena Purvena", desc: "By one more than the previous one.", effect: "Square numbers ending in 5 instantly." },
    { title: "Nikhilam Navatashcaramam Dashatah", desc: "All from 9 and the last from 10.", effect: "Multiplication near bases simplified." },
    { title: "Urdhva-Tiryagbhyam", desc: "Vertically and Cross-wise.", effect: "Universal multiplication method." }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30 overflow-x-hidden">
      <section className="relative pt-48 pb-24 px-6">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,0.1),transparent)] pointer-events-none" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-3/5 space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">
                <Sparkles className="w-3 h-3" /> Ancient Mental Architecture
              </div>
              <h1 className="text-7xl md:text-[9rem] font-black italic uppercase tracking-tighter leading-[0.85]">
                Vedic <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">Sutras</span><br />
                Mental <span className="text-amber-500 underline decoration-white/10 underline-offset-8">Speed</span>
              </h1>
              <p className="max-w-xl text-slate-400 text-lg font-medium leading-relaxed">
                Unlock the speed of ancient Indian mathematics. Solve complex arithmetic faster than a calculator using 16 sacred sutras.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button className="px-10 py-5 bg-white text-black rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-amber-500/10">
                  <Play className="w-4 h-4 fill-current" /> Initialize Sutras
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
                  src="/Vedic-Maths.png" 
                  alt="Vedic Geometry" 
                  className="w-full h-full object-cover opacity-60 grayscale transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
              </div>
              <div className="absolute -bottom-8 -right-8 p-10 bg-amber-500 rounded-[3rem] shadow-3xl z-20 rotate-3">
                 <p className="text-xs font-black uppercase tracking-widest mb-1">Calculation Sync</p>
                 <p className="text-4xl font-black italic">997 x 998</p>
                 <p className="text-xs font-bold text-black/60 uppercase mt-4 italic">Solved in 2 seconds.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
         <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
               <div className="space-y-12">
                  <div className="space-y-4">
                     <h2 className="text-xs font-black uppercase tracking-[0.5em] text-amber-500">The 16 Sutras</h2>
                     <p className="text-5xl font-black italic uppercase tracking-tighter">Architectural Wisdom</p>
                  </div>
                  <div className="space-y-4">
                     {sutras.map((s, i) => (
                        <div 
                           key={i}
                           onMouseEnter={() => setActiveSutra(i)}
                           className={`p-8 rounded-[2rem] border transition-all cursor-pointer ${
                              activeSutra === i ? 'bg-white text-black border-white' : 'bg-slate-900 border-white/5 text-white'
                           }`}
                        >
                           <h4 className="text-xl font-black uppercase italic tracking-tight">{s.title}</h4>
                           <p className={`text-sm mt-2 font-medium ${activeSutra === i ? 'text-slate-600' : 'text-slate-400'}`}>{s.desc}</p>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="bg-slate-900 rounded-[4rem] p-16 border border-white/5 min-h-[500px] flex flex-col justify-center text-center space-y-8 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/sacred-geometry.png')]" />
                  <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                     <Brain className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase text-amber-500 tracking-tighter">{sutras[activeSutra].title}</h3>
                  <p className="text-lg font-bold italic text-slate-300">" {sutras[activeSutra].effect} "</p>
               </div>
            </div>
         </div>
      </section>

      <section className="py-32 px-6 bg-amber-500 text-black rounded-[5rem]">
         <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
               <div className="space-y-8">
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-[0.9]">The Vedic<br />Matrix Program</h2>
                  <div className="space-y-4">
                     {[
                        { l: "Phase 1", t: "Fundamentals of Speed", d: "4 Months" },
                        { l: "Phase 2", t: "Algebraic Visualization", d: "4 Months" },
                        { l: "Phase 3", t: "Advanced Trigonometry", d: "4 Months" },
                        { l: "Phase 4", t: "Mental Mastery", d: "4 Months" }
                     ].map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-6 border-b border-black/10">
                           <span className="font-black italic uppercase tracking-widest text-[10px]">{p.l}</span>
                           <span className="font-black italic uppercase tracking-tight">{p.t}</span>
                           <span className="font-black text-xs">{p.d}</span>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="bg-black text-white p-12 rounded-[3.5rem] space-y-8 shadow-3xl">
                  <ShieldCheck className="w-12 h-12 text-amber-500" />
                  <h3 className="text-2xl font-black italic uppercase">Kit Sync Included</h3>
                  <div className="space-y-4">
                     {["Professional Course Books", "Premium Tech Bag", "Official Academy T-Shirt"].map(item => (
                        <div key={item} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                           <CheckCircle2 className="w-4 h-4 text-amber-500" /> {item}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
