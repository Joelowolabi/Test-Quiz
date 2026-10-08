"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Get origin safely on client side
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
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
            <KeyRound size={12} className="text-[#f59e0b]" /> Security
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-[#0c1322]">
            Reset Password
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm mb-7">Enter your email to receive a password recovery link.</p>

          {success ? (
            <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-200 text-center space-y-2.5">
              <p className="font-bold text-sm">Reset link sent!</p>
              <p className="text-xs text-slate-600">Please check your email inbox and spam folder for instructions.</p>
              <div className="pt-3">
                <Link href="/login" className="text-[#0c1322] text-xs font-bold hover:underline">
                  Back to Log In →
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
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
                {loading ? <><Loader2 size={16} className="animate-spin text-[#fbbf24]" /> Sending link...</> : <>Send Reset Link <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-slate-500 text-xs font-medium">
              Remembered your password? <Link href="/login" className="text-[#0c1322] font-bold hover:underline">Log in</Link>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
