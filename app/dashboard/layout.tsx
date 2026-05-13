"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = sessionStorage.getItem("teacher_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be a server-side check.
    // For this MVP, we use a simple hardcoded check (or match env var if we could pass it to client, 
    // but NEXT_PUBLIC vars are visible. We'll just hardcode 'admin123' for the demo).
    if (password === "admin123") {
      sessionStorage.setItem("teacher_auth", "true");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-young-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-young-purple/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-young-green/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="bg-young-black/50 backdrop-blur-2xl border border-white/10 p-8 w-full max-w-md text-center rounded-[2rem] shadow-[0_0_50px_rgba(99,102,241,0.15)] relative z-10">
          <div className="w-20 h-20 bg-young-purple/10 text-young-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-young-purple/20">
            <Lock size={32} className="drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
          </div>
          <h1 className="text-3xl font-black mb-2 text-white tracking-tight">Teacher Portal</h1>
          <p className="text-gray-400 mb-8 font-medium">Enter your access key to continue.</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Key (admin123)"
                className="w-full px-5 py-4 rounded-xl border border-white/10 focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none bg-black/40 text-white placeholder-gray-500 transition-all font-medium text-center tracking-widest"
              />
            </div>
            {error && <p className="text-red-400 font-medium text-sm bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
            <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-young-purple to-[#818cf8] text-white font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] transition-all">
              Initialize Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative text-gray-200">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <nav className="p-4 md:p-6 sticky top-0 z-50 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-between items-center backdrop-blur-xl bg-black/40 border border-white/10 rounded-full px-6 py-4 shadow-2xl pointer-events-auto">
          <div className="font-black text-xl tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-young-purple flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Lock size={14} />
            </div>
            <span><span className="text-white">YOUNG</span><span className="text-gray-500">&amp;</span><span className="text-young-purple">TEST</span></span>
          </div>
          <button 
            onClick={() => {
              sessionStorage.removeItem("teacher_auth");
              setIsAuthenticated(false);
            }}
            className="text-sm font-bold px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/5"
          >
            Disconnect
          </button>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-20 relative z-10">
        {children}
      </main>
    </div>
  );
}
