"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Users, 
  ShieldCheck, 
  KeyRound, 
  Loader2, 
  BarChart3, 
  CheckCircle2, 
  FileText, 
  Clock, 
  ChevronDown, 
  ShieldAlert,
  GraduationCap,
  BookOpen,
  Laptop
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const handleJoinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().replace(/\s+/g, "");
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

  const faqs = [
    {
      q: "Do students need to create an account or download an app?",
      a: "No. Students never have to sign up, create passwords, or download anything. They simply enter the 6-digit PIN on any smartphone, tablet, or browser to jump straight into the assessment."
    },
    {
      q: "How does the anti-tab switching proctoring work?",
      a: "The assessment HUD uses active focus tracking (visibility and window blur events). If a student navigates away, opens another browser tab, or switches to another application, they receive an active on-screen strike. On the 3rd strike, the test is automatically locked and submitted."
    },
    {
      q: "Can I generate questions from website links and lecture PDFs?",
      a: "Yes! Teachers can paste raw lesson notes, enter public website URLs (such as Wikipedia or educational articles), or upload PDF lecture slides. Gemini AI extracts the learning objectives and creates up to 80 calibrated multiple-choice questions in under 3 seconds."
    },
    {
      q: "How does the platform prevent students from restarting the test to cheat?",
      a: "Submissions and test sessions are tracked in real-time. If a student attempts to refresh or re-enter with the same email, the system automatically restores their active session or displays their final graded score and leaderboard ranking instead of allowing a restart."
    },
    {
      q: "Can I export student scores to my school's gradebook?",
      a: "Yes. From your Teacher Dashboard, you can download a full CSV report with student names, email addresses, scores, accuracy percentages, and logged tab-switch counts with a single click."
    }
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] text-slate-900 font-sans selection:bg-[#fbbf24] selection:text-slate-950 flex flex-col antialiased">
      
      {/* 1. TOP NAVBAR */}
      <nav className="w-full bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-[#0c1322] flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform">
              <Zap size={18} className="text-[#fbbf24] fill-[#fbbf24]" />
            </div>
            <div className="flex items-center tracking-tight font-black text-xl text-[#0c1322]">
              Young<span className="text-[#f59e0b]">&amp;</span>Test
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#pin-join" className="hover:text-slate-900 transition-colors">Student PIN Join</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a 
              href="#pin-join" 
              className="hidden sm:inline-flex px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Enter PIN
            </a>
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-full bg-[#0c1322] hover:bg-[#182542] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              Teacher Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="pt-16 pb-14 md:pt-24 md:pb-20 px-4 md:px-6 max-w-5xl mx-auto text-center relative">
        
        {/* Eyebrow Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-[#fffbeb] border border-[#fde68a] text-[#b45309] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 shadow-sm"
        >
          <Sparkles size={13} className="text-[#f59e0b]" /> AI-Powered Classroom Assessments
        </motion.div>

        {/* Professional, Education-Focused Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#0c1322] leading-[1.08] mb-6"
        >
          Intelligent quizzes in seconds. <br className="hidden sm:block" />
          Effortless classroom grading.
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 font-medium leading-relaxed"
        >
          Turn lesson notes, web articles, and lecture PDFs into interactive assessments with instant 6-digit PIN access, live focus proctoring, and automated gradebook analytics.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6"
        >
          <a 
            href="#pin-join" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0c1322] hover:bg-[#16233f] text-white font-bold text-sm transition-all shadow-lg shadow-slate-900/15 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            Enter 6-Digit PIN <ArrowRight size={16} />
          </a>
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            Create a Quiz (Teacher Dashboard)
          </Link>
        </motion.div>

        {/* Trust Badges */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-4 flex-wrap"
        >
          <span>⚡ 100% Free for Educators</span>
          <span>•</span>
          <span>🔒 3-Strike Tab Proctoring</span>
          <span>•</span>
          <span>🎯 Instant Classroom PINs</span>
        </motion.p>
      </header>

      {/* 3. DUAL SHOWCASE CARDS */}
      <section className="px-4 md:px-6 max-w-6xl mx-auto w-full mb-20">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          
          {/* Left Card: Dark Navy Interactive Hub */}
          <div className="bg-[#0c1322] text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#fbbf24]">AI-Powered Assessment</span>
              <h3 className="text-2xl font-bold mt-1 text-white">Curriculum to Questions in 3 Seconds</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Generate up to 80 calibrated questions from text, educational URLs, or lecture handouts with custom difficulty levels.
              </p>
            </div>

            {/* Orbiting Satellite Diagram */}
            <div className="my-8 py-4 relative z-10 flex items-center justify-center">
              <div className="relative w-64 h-52 flex items-center justify-center">
                {/* Center Node */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#16233f] to-[#0c1322] border-2 border-[#fbbf24] shadow-[0_0_30px_rgba(251,191,36,0.3)] flex flex-col items-center justify-center z-10 text-center">
                  <span className="text-xl">🏆</span>
                  <span className="text-[10px] font-black tracking-tight text-white mt-0.5">EXAM HUB</span>
                </div>

                {/* Orbiting Satellites */}
                <div className="absolute -top-1 left-2 bg-[#16233f] border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-200 flex items-center gap-1.5 shadow-lg">
                  <span>🧠</span> Gemini 2.5 AI
                </div>

                <div className="absolute -top-1 right-2 bg-[#16233f] border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-200 flex items-center gap-1.5 shadow-lg">
                  <span>🎯</span> 6-Digit PIN
                </div>

                <div className="absolute -bottom-1 left-4 bg-[#16233f] border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-200 flex items-center gap-1.5 shadow-lg">
                  <span>🔒</span> Tab Guard
                </div>

                <div className="absolute -bottom-1 right-4 bg-[#16233f] border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-200 flex items-center gap-1.5 shadow-lg">
                  <span>📊</span> Analytics
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Automated Scoring &amp; Answer Keys</span>
              <span className="text-[#fbbf24] font-bold">Zero Student Signup →</span>
            </div>
          </div>

          {/* Right Card: Clean White Student Assessment HUD Preview */}
          <div className="bg-[#f8fafc] border border-slate-200/90 rounded-[2.5rem] p-8 md:p-10 shadow-lg shadow-slate-100 flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#0c1322] bg-slate-200/70 px-3 py-1 rounded-full">
                  Student Testing HUD
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1">
                  ● Proctored Session
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#0c1322]">Distraction-Free Exam Interface</h3>
              <p className="text-slate-500 text-xs mt-1">
                Equipped with keyboard shortcuts (1-4 / A-D), live countdown timer, and automatic progress saving.
              </p>
            </div>

            {/* Authentic Curriculum Question Preview */}
            <div className="my-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                <span>Question 3 of 15</span>
                <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded">⏱️ 12:45 remaining</span>
              </div>
              <p className="text-sm font-bold text-[#0c1322]">
                Which cellular process produces the majority of ATP in eukaryotic cells during aerobic respiration?
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl">
                  <span>A. Glycolysis</span>
                </div>
                <div className="p-2.5 bg-[#0c1322] text-white rounded-xl flex items-center justify-between">
                  <span>B. Oxidative Phosphorylation</span>
                  <CheckCircle2 size={14} className="text-[#fbbf24]" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <ShieldCheck size={14} /> 3-Strike Focus Active
              </span>
              <span className="font-bold text-[#0c1322]">Automatic Session Recovery</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. OVERLAPPING DIAGONAL MARQUEE TAPE */}
      <section className="relative my-10 py-10 overflow-hidden bg-slate-50 border-y border-slate-100">
        
        {/* Tape 1: Golden Yellow Ribbon */}
        <div className="transform -rotate-2 -translate-y-2 bg-[#fbbf24] text-slate-950 font-black text-xs md:text-sm uppercase tracking-widest py-3.5 shadow-md overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex gap-8 items-center">
            <span>★ 6-DIGIT CLASSROOM PINS</span>
            <span>★ GEMINI 2.5 FLASH ENGINE</span>
            <span>★ 3-STRIKE TAB MONITORING</span>
            <span>★ FORCE SUBMIT CAPABILITY</span>
            <span>★ AUTOMATIC GRADING &amp; LEADERBOARD</span>
            <span>★ CSV GRADEBOOK EXPORT</span>
            <span>★ 6-DIGIT CLASSROOM PINS</span>
            <span>★ GEMINI 2.5 FLASH ENGINE</span>
            <span>★ 3-STRIKE TAB MONITORING</span>
            <span>★ FORCE SUBMIT CAPABILITY</span>
            <span>★ AUTOMATIC GRADING &amp; LEADERBOARD</span>
            <span>★ CSV GRADEBOOK EXPORT</span>
          </div>
        </div>

        {/* Tape 2: Midnight Navy Ribbon */}
        <div className="transform rotate-1 translate-y-2 bg-[#0c1322] text-[#fbbf24] font-black text-xs md:text-sm uppercase tracking-widest py-3.5 shadow-xl overflow-hidden mt-1">
          <div className="animate-marquee-reverse whitespace-nowrap flex gap-8 items-center">
            <span>★ PASTE LESSON NOTES</span>
            <span>★ LIVE WEB URL SCRAPER</span>
            <span>★ PDF LECTURE SLIDE UPLOADS</span>
            <span>★ UP TO 80 QUESTIONS PER QUIZ</span>
            <span>★ NO STUDENT SIGNUP NEEDED</span>
            <span>★ 100% FREE FOR EDUCATORS</span>
            <span>★ PASTE LESSON NOTES</span>
            <span>★ LIVE WEB URL SCRAPER</span>
            <span>★ PDF LECTURE SLIDE UPLOADS</span>
            <span>★ UP TO 80 QUESTIONS PER QUIZ</span>
            <span>★ NO STUDENT SIGNUP NEEDED</span>
            <span>★ 100% FREE FOR EDUCATORS</span>
          </div>
        </div>
      </section>

      {/* 5. "HOW IT WORKS" SECTION */}
      <section id="how-it-works" className="py-20 px-4 md:px-6 max-w-5xl mx-auto w-full text-center">
        <span className="text-xs font-black uppercase tracking-widest text-[#f59e0b] bg-[#fffbeb] px-3.5 py-1.5 rounded-full border border-[#fde68a]">
          Simple Workflow
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#0c1322] tracking-tight mt-4 mb-3">
          How it works
        </h2>
        <p className="text-slate-600 text-sm md:text-base max-w-lg mx-auto mb-16 font-medium">
          From lesson material to a live classroom assessment in four simple steps.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              step: "1",
              title: "Input Material",
              desc: "Paste lesson notes, enter any educational web URL, or upload lecture PDFs.",
              icon: "📝"
            },
            {
              step: "2",
              title: "AI Generates Quiz",
              desc: "Gemini AI crafts calibrated multiple-choice questions with answer keys in 3 seconds.",
              icon: "⚡"
            },
            {
              step: "3",
              title: "Share 6-Digit PIN",
              desc: "Project the PIN on your whiteboard; students join instantly from any device.",
              icon: "🎯"
            },
            {
              step: "4",
              title: "Review Gradebook",
              desc: "Automated scoring, class score distributions, and 1-click CSV spreadsheet download.",
              icon: "📊"
            }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-[#0c1322] text-white flex items-center justify-center text-2xl shadow-lg shadow-slate-900/10 mb-5 group-hover:scale-110 transition-transform relative">
                <span>{item.icon}</span>
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#fbbf24] text-slate-950 font-black text-xs flex items-center justify-center shadow">
                  {item.step}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-[#0c1322] mb-2">{item.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[210px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. "STUDENT QUICK JOIN / PIN & PLAY" SECTION */}
      <section id="pin-join" className="py-16 px-4 md:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-black uppercase tracking-widest text-[#0c1322] bg-slate-100 px-3.5 py-1.5 rounded-full">
            Student Portal
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0c1322] tracking-tight mt-3">
            Join with classroom PIN
          </h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto mt-2">
            No student account or password required. Enter the 6-digit code provided by your teacher.
          </p>
        </div>

        {/* Two-Column Card Container */}
        <div className="grid md:grid-cols-2 rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden bg-white">
          
          {/* Left Column: Dark Navy Status Card */}
          <div className="bg-[#0c1322] text-white p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-8">
                <span className="uppercase tracking-widest font-bold">Classroom Session</span>
                <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Ready to Start
                </span>
              </div>

              <div className="mb-8">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Sample Active PIN</p>
                <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-[#fbbf24]">
                  954 266
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-6 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Supported Devices</span>
                  <span className="font-bold text-white">Phones, Tablets, Laptops</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Academic Proctoring</span>
                  <span className="font-bold text-white">3-Strike Tab Guard</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Session Resumption</span>
                  <span className="font-bold text-white">Automatic Progress Save</span>
                </div>
              </div>
            </div>

            <div className="pt-8 text-xs text-slate-400 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#fbbf24]" />
              <span>Questions lock to your student session automatically.</span>
            </div>
          </div>

          {/* Right Column: Clean White PIN Entry Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
            <h3 className="text-2xl font-bold text-[#0c1322] mb-2">Enter 6-Digit PIN</h3>
            <p className="text-xs text-slate-500 mb-8">
              Type the code shown on your classroom whiteboard or shared by your teacher.
            </p>

            <form onSubmit={handleJoinQuiz} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Classroom PIN
                </label>
                <input 
                  type="text"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="e.g. 954 266"
                  className="w-full text-center text-3xl md:text-4xl font-black tracking-widest py-4 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#0c1322] focus:bg-white outline-none transition-all placeholder:text-slate-300 text-[#0c1322] font-mono shadow-inner"
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 py-2.5 px-4 rounded-xl flex items-center gap-2"
                >
                  <ShieldAlert size={15} /> {error}
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-[#0c1322] hover:bg-[#182542] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-slate-900/15 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Entering Quiz Room...</>
                ) : (
                  <>Enter Assessment <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6 font-medium">
              Are you a teacher?{" "}
              <Link href="/dashboard" className="text-[#0c1322] hover:underline font-bold">
                Open Teacher Dashboard →
              </Link>
            </p>
          </div>

        </div>
      </section>

      {/* 7. THREE SOFT PASTEL FEATURE CARDS */}
      <section id="features" className="py-20 px-4 md:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-3 text-2xl">
            <span>📚</span> <span>⚡</span> <span>📊</span>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-[#f59e0b]">Assessment Suite</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0c1322] tracking-tight mt-2">
            Built for modern educators
          </h2>
          <p className="text-slate-600 text-sm md:text-base max-w-md mx-auto mt-2 font-medium">
            Everything designed around speed, academic integrity, and student clarity.
          </p>
        </div>

        {/* 3 Pastel Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Card 1: Soft Indigo/Blue Pastel */}
          <div className="bg-[#eff6ff] border border-blue-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-3 py-1 rounded-full">
                AI Creation
              </span>
              <h3 className="text-2xl font-bold text-[#0c1322] mt-4 mb-2">Multi-Source Question Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                Generate up to 80 multiple choice or True/False questions in under 3 seconds from lesson notes, web articles, or lecture PDFs.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-8">
                <span className="text-[10px] font-bold bg-white text-blue-900 border border-blue-200/80 px-2.5 py-1 rounded-lg">Web URLs</span>
                <span className="text-[10px] font-bold bg-white text-blue-900 border border-blue-200/80 px-2.5 py-1 rounded-lg">PDF Upload</span>
                <span className="text-[10px] font-bold bg-white text-blue-900 border border-blue-200/80 px-2.5 py-1 rounded-lg">Up to 80 Qs</span>
              </div>
            </div>

            <div className="pt-4 border-t border-blue-200/60 flex items-center justify-between text-xs font-bold text-blue-900">
              <span>Gemini 2.5 Flash Engine</span>
              <span>Fast AI →</span>
            </div>
          </div>

          {/* Card 2: Soft Amber/Yellow Pastel */}
          <div className="bg-[#fffbeb] border border-amber-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full">
                Academic Integrity
              </span>
              <h3 className="text-2xl font-bold text-[#0c1322] mt-4 mb-2">3-Strike Tab Guard</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                Dual focus monitoring warns students who switch browser tabs and automatically locks and submits the assessment on the 3rd strike.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-8">
                <span className="text-[10px] font-bold bg-white text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg">Window Blur Guard</span>
                <span className="text-[10px] font-bold bg-white text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg">Auto-Submit Lock</span>
                <span className="text-[10px] font-bold bg-white text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg">Telemetry Audit</span>
              </div>
            </div>

            <div className="pt-4 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-900">
              <span>Proctored Assessment</span>
              <span>Integrity First →</span>
            </div>
          </div>

          {/* Card 3: Soft Mint/Green Pastel */}
          <div className="bg-[#ecfdf5] border border-emerald-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full">
                Real-Time Data
              </span>
              <h3 className="text-2xl font-bold text-[#0c1322] mt-4 mb-2">Gradebook &amp; CSV Export</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                Live classroom leaderboards, score distributions, hardest question analytics, and 1-click CSV spreadsheet download.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-8">
                <span className="text-[10px] font-bold bg-white text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-lg">Live Leaderboard</span>
                <span className="text-[10px] font-bold bg-white text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-lg">CSV Spreadsheet</span>
                <span className="text-[10px] font-bold bg-white text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-lg">Score Charts</span>
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-200/60 flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>Instant Reports</span>
              <span>View Analytics →</span>
            </div>
          </div>

        </div>
      </section>

      {/* 8. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-20 px-4 md:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0c1322] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Everything you need to know about setting up and running classroom assessments.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* FAQ Accordion List */}
          <div className="md:col-span-2 space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = activeFaq === i;

              return (
                <div 
                  key={i} 
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full py-5 px-6 text-left font-bold text-sm md:text-base text-[#0c1322] flex justify-between items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-[#0c1322]' : ''}`} 
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-5 pt-1 text-xs md:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right Help Card */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-3xl p-8 flex flex-col justify-between text-left h-fit">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#0c1322] text-[#fbbf24] flex items-center justify-center mb-4 shadow">
                <GraduationCap size={20} />
              </div>
              <h4 className="text-lg font-bold text-[#0c1322] mb-1">Teacher Resources</h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Ready to create your first assessment or manage existing classroom question banks?
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="w-full py-3 bg-[#0c1322] hover:bg-[#182542] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                Go to Teacher Dashboard <ArrowRight size={14} />
              </Link>
              <a
                href="#pin-join"
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center transition-colors"
              >
                Student PIN Join
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 9. BOTTOM DARK BANNER */}
      <section className="px-4 md:px-6 max-w-5xl mx-auto w-full mb-20">
        <div className="bg-[#0c1322] text-white rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          
          <div className="absolute top-6 left-8 w-6 h-6 rounded-full bg-[#fbbf24] pointer-events-none"></div>
          <div className="absolute top-8 right-12 w-8 h-8 rounded-xl bg-blue-600/60 rotate-12 pointer-events-none"></div>
          <div className="absolute bottom-6 left-12 w-7 h-7 bg-[#f59e0b] transform rotate-45 pointer-events-none"></div>
          <div className="absolute bottom-8 right-10 w-9 h-9 rounded-2xl bg-blue-500/40 pointer-events-none"></div>

          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Ready to upgrade your classroom assessments?
            </h2>
            <p className="text-slate-400 text-sm md:text-base font-medium mb-8">
              Save hours of manual quiz writing and deliver engaging, proctored tests to your students.
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
            >
              Open Teacher Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. MINIMALIST FOOTER */}
      <footer className="w-full border-t border-slate-100 py-12 bg-white text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#0c1322] flex items-center justify-center text-white">
              <Zap size={14} className="text-[#fbbf24] fill-[#fbbf24]" />
            </div>
            <span className="font-extrabold text-sm text-[#0c1322]">Young &amp; Test</span>
          </div>

          <p className="text-slate-400 text-center sm:text-left">
            &copy; 2026 Young &amp; Test. All rights reserved. Powered by Gemini 2.5 &amp; Supabase.
          </p>

          <div className="flex items-center gap-6 font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#pin-join" className="hover:text-slate-900 transition-colors">Student PIN</a>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Teacher Portal</Link>
          </div>

        </div>
      </footer>

    </div>
  );
}
