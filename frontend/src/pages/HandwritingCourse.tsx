import { motion } from "framer-motion";
import { 
  Brain, Zap, Target, Activity, PenTool
} from "lucide-react";
import OptimizedImage from "../components/OptimizedImage";

export default function HandwritingCourse() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30 overflow-x-hidden">
      <section className="relative pt-48 pb-24 px-6">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.1),transparent)] pointer-events-none" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-3/5 space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.3em]">
                <Activity className="w-3 h-3" /> Motor Precision Lab
              </div>
              <h1 className="text-7xl md:text-[9rem] font-black italic uppercase tracking-tighter leading-[0.85]">
                Precision <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Stroke</span><br />
                Mental <span className="text-purple-500 underline decoration-white/10 underline-offset-8">Rhythm</span>
              </h1>
              <p className="max-w-xl text-slate-400 text-lg font-medium leading-relaxed">
                Handwriting improvement classes designed to align fine motor control with cognitive clarity. Precision, speed, and elegance engineered into every stroke.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button className="px-10 py-5 bg-white text-black rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all shadow-2xl">
                  <PenTool className="w-4 h-4" /> Start Training
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
                  src="/handwriting.png" 
                  alt="Handwriting Mastery" 
                  className="w-full h-full object-cover grayscale transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="container mx-auto max-w-6xl">
           <div className="text-center mb-24">
              <h2 className="text-xs font-black uppercase tracking-[0.5em] text-purple-500">The Handwriting DNA</h2>
              <p className="text-5xl font-black italic uppercase tracking-tighter mt-4">Precision Pillars</p>
           </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: PenTool, title: "Neuromotor Precision", text: "Fine motor control meets muscle memory." },
              { icon: Brain, title: "Cognitive Alignment", text: "Handwriting wired to thinking clarity." },
              { icon: Zap, title: "Speed without Mess", text: "Faster writing, cleaner output." },
              { icon: Target, title: "Exam Readiness", text: "Legible under time pressure." }
            ].map((p, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 rounded-[2.5rem] bg-slate-900 border border-white/5 space-y-6"
              >
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400">
                  <p.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-black uppercase italic tracking-tighter text-xl">{p.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white text-black rounded-[5rem]">
         <div className="container mx-auto max-w-4xl text-center space-y-12">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Bilingual Mastery</h2>
            <div className="grid grid-cols-2 gap-8">
               <div className="p-12 bg-slate-50 rounded-[3rem] border border-black/5 space-y-4 group hover:bg-purple-600 transition-all duration-500">
                  <p className="text-6xl font-black italic group-hover:text-white">Aa</p>
                  <p className="font-black uppercase tracking-widest text-xs group-hover:text-white/60">English Track</p>
               </div>
               <div className="p-12 bg-slate-50 rounded-[3rem] border border-black/5 space-y-4 group hover:bg-purple-600 transition-all duration-500">
                  <p className="text-6xl font-black italic group-hover:text-white">अ</p>
                  <p className="font-black uppercase tracking-widest text-xs group-hover:text-white/60">Hindi Track</p>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
