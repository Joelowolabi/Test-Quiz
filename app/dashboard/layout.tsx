"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("teacher_auth");
    if (auth !== "true") {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router]);

  const handleSignOut = () => {
    sessionStorage.removeItem("teacher_auth");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-young-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin text-young-purple mx-auto mb-4" size={40} />
          <p className="text-gray-400 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
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
            onClick={handleSignOut}
            className="text-sm font-bold px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/5"
          >
            Sign Out
          </button>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-20 relative z-10">
        {children}
      </main>
    </div>
  );
}
