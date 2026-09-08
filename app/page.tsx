"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Zap, Users, ShieldCheck, KeyRound, Loader2, BarChart3, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError("Please enter a 6-digit Quiz PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/pin?code=${encodeURIComponent(cleanPin)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Quiz not found. Check your PIN.");
      }

      router.push(`/test/${data.testId}`);
    } catch (err: any) {
      setError(err.message || "Failed to join quiz.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-young-purple selection:text-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-young-purple/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-young-green/10 blur-[130px] rounded-full pointer-events-none"></div>

      {/* Navigation */}
      <nav className="p-4 md:p-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center backdrop-blur-xl bg-black/40 border border-white/10 rounded-full px-6 py-4 shadow-2xl">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-young-purple flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] group-hover:scale-110 transition-transform">
              <Zap size={16} />
            </div>
            <span>
              <span className="text-white">YOUNG</span>
              <span className="text-gray-500">&amp;</span>
              <span className="text-young-purple">TEST</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-young-purple/50 text-white font-bold text-sm transition-all shadow-lg hover:scale-105"
            >
              Teacher Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-24 relative z-10 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-young-purple/10 border border-young-purple/30 text-young-purple px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-8 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        >
          <Sparkles size={14} className="animate-spin" /> AI-Powered Classroom Assessments
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6"
        >
          Where Young Minds Make <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-young-green via-white to-young-purple bg-clip-text text-transparent">
            Big Knowledge.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 font-medium mb-12 max-w-2xl leading-relaxed"
        >
          Generate intelligent, interactive quizzes in seconds from any lesson, article, or topic. Students join instantly with a 6-digit code.
        </motion.p>

        {/* Student PIN Entry Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md bg-[#141414]/90 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative mb-12"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-young-green via-young-purple to-young-orange"></div>
          
          <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-young-green mb-3">
            <KeyRound size={16} /> Student Quick Join
          </div>
          <h2 className="text-xl font-bold text-white mb-6">Enter 6-Digit Quiz PIN</h2>

          <form onSubmit={handleJoinQuiz} className="space-y-4">
            <div>
              <input 
                type="text"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. 482 195"
                className="w-full text-center text-3xl md:text-4xl font-black tracking-widest py-4 px-6 bg-white/5 border border-white/10 rounded-2xl focus:border-young-green focus:ring-4 focus:ring-young-green/20 outline-none transition-all placeholder:text-gray-600 text-young-green font-mono"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 py-2 px-4 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-young-green to-[#22c55e] text-young-black font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(74,222,128,0.4)] hover:shadow-[0_0_40px_rgba(74,222,128,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Entering Quiz Room...</>
              ) : (
                <>Join Quiz <ArrowRight size={20} className="stroke-[3]" /></>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 font-medium mt-4">
            Teachers: Create or manage your tests in the{" "}
            <Link href="/dashboard" className="text-young-purple hover:underline font-bold">
              Teacher Dashboard →
            </Link>
          </p>
        </motion.div>
      </header>

      {/* Feature Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full relative z-10">
        <div className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest text-young-purple mb-2">Built for Modern Classrooms</p>
          <h2 className="text-3xl md:text-5xl font-black text-white">Everything You Need to Assess &amp; Engage</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Instant AI Creation",
              desc: "Paste lesson text, notes, or web articles. Gemini 3.8 crafts custom multiple choice & true/false quizzes in 3 seconds.",
              icon: <Zap size={24} className="text-young-purple" />,
              badge: "Gemini 3.8"
            },
            {
              title: "6-Digit Game PINs",
              desc: "No long complicated links. Project a memorable 6-digit PIN on the classroom whiteboard for immediate student entry.",
              icon: <KeyRound size={24} className="text-young-green" />,
              badge: "Instant Join"
            },
            {
              title: "Anti-Cheat Telemetry",
              desc: "Automatic tab-switch proctoring monitors browser focus and alerts teachers of potential distraction or cheating.",
              icon: <ShieldCheck size={24} className="text-young-orange" />,
              badge: "Proctored"
            },
            {
              title: "Live Grade Analytics",
              desc: "Instant score distributions, question difficulty stats, and one-click export to CSV spreadsheets or printable PDF.",
              icon: <BarChart3 size={24} className="text-white" />,
              badge: "CSV Export"
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#121212] p-8 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 shadow-lg relative group overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
                {feature.icon}
              </div>
              <div className="inline-block text-[10px] font-black uppercase tracking-wider text-gray-400 bg-white/5 px-2.5 py-1 rounded-full mb-3 border border-white/5">
                {feature.badge}
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Teacher Callout */}
      <section className="py-16 px-6 max-w-4xl mx-auto w-full relative z-10">
        <div className="bg-gradient-to-r from-young-purple/20 via-[#161616] to-young-green/10 p-8 md:p-12 rounded-[3rem] border border-white/10 text-center relative overflow-hidden shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">Ready to create your next quiz?</h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto mb-8 font-medium">
            Join hundreds of educators building interactive classroom assessments with intelligent grading and full privacy.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              href="/dashboard" 
              className="w-full sm:w-auto px-8 py-4 bg-young-purple hover:bg-young-purple/90 text-white font-bold rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              Open Teacher Dashboard <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-xs font-medium text-gray-500 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; 2026 Young&amp;Test. Powered by Gemini 3.8 &amp; Supabase.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Teacher Login</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
