"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Attempt login with the provided credentials
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        // 2. If password is the master "admin123", attempt to automatically register the user
        if (password === "admin123") {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpError) {
            throw signUpError;
          }

          // If signup is successful, proceed to set local states and redirect
          sessionStorage.setItem("teacher_auth", "true");
          router.push("/dashboard");
        } else {
          throw loginError;
        }
      } else {
        sessionStorage.setItem("teacher_auth", "true");
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid login credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <nav className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-xl tracking-tight text-[#0c1322]">
          <div className="w-8 h-8 rounded-full bg-[#0c1322] flex items-center justify-center text-white shadow-sm">
            <span className="text-sm font-bold text-[#fbbf24]">⚡</span>
          </div>
          <span>Young<span className="text-[#f59e0b]">&amp;</span>Test</span>
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 sm:p-11 rounded-[2.5rem] border border-slate-200 w-full max-w-md shadow-sm relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-1.5 bg-[#fffbeb] border border-[#fde68a] text-[#b45309] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles size={12} className="text-[#f59e0b]" /> Teacher Portal
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-[#0c1322]">
            Welcome Back
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm mb-7">Sign in to manage your classroom quizzes.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all font-medium text-sm placeholder:text-slate-400"
                placeholder="teacher@example.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs font-bold text-slate-500 hover:text-[#0c1322]">Forgot password?</Link>
              </div>
              <input 
                type="password" required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all font-medium text-sm placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-700 text-xs font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-[#0c1322] hover:bg-[#182542] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60 text-sm mt-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin text-[#fbbf24]" /> Logging in...</> : <>Log In <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-xs font-medium">
            Don't have an account? <Link href="/signup" className="text-[#0c1322] font-bold hover:underline">Sign up</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
