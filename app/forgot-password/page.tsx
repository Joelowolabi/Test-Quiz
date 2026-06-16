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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <nav className="p-6">
        <div className="font-black text-2xl tracking-tighter">
          <span className="text-young-purple">YOUNG</span>&amp;TEST
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] p-8 md:p-12 rounded-[2rem] border border-white/5 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-young-purple to-[#818cf8]"></div>
          
          <h1 className="text-3xl font-black mb-2 text-white flex items-center gap-2">
            Reset Password <KeyRound className="text-young-purple" />
          </h1>
          <p className="text-gray-500 font-medium mb-8">Enter your email to receive a password reset link.</p>

          {success ? (
            <div className="bg-green-500/10 text-green-400 p-6 rounded-xl border border-green-500/20 text-center space-y-3">
              <p className="font-bold">Reset email sent!</p>
              <p className="text-sm text-gray-400">Please check your inbox (and spam folder) for a link to reset your password.</p>
              <div className="pt-4">
                <Link href="/login" className="text-young-purple font-bold hover:underline">
                  Back to Log In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-5 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all font-medium"
                  placeholder="teacher@example.com"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm font-medium bg-red-400/10 py-2 px-3 rounded-lg border border-red-400/20">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-young-purple to-[#818cf8] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? <><Loader2 size={20} className="animate-spin" /> Sending link...</> : <>{'Send Reset Link'} <ArrowRight size={20} /></>}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-gray-500 text-sm font-medium">
              Remembered your password? <Link href="/login" className="text-young-purple hover:underline">Log in</Link>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
