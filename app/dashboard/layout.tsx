"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, Zap } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
        } else {
          const auth = sessionStorage.getItem("teacher_auth");
          if (auth !== "true") {
            router.push("/login");
            return;
          }
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Session check error", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else if (sessionStorage.getItem("teacher_auth") !== "true") {
        setIsAuthenticated(false);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
    }
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
    <div className="min-h-screen bg-[#f8fafc] relative text-slate-800 font-sans selection:bg-[#fbbf24] selection:text-slate-900">
      <nav className="p-4 md:p-6 sticky top-0 z-50 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-between items-center backdrop-blur-xl bg-white/90 border border-slate-200 rounded-full px-6 py-3.5 shadow-sm pointer-events-auto">
          <Link href="/" className="font-black text-lg tracking-tight flex items-center gap-2 text-[#0c1322]">
            <div className="w-8 h-8 rounded-full bg-[#0c1322] flex items-center justify-center text-white shadow-sm">
              <Zap size={15} className="text-[#fbbf24] fill-[#fbbf24]" />
            </div>
            <span>
              Young<span className="text-[#f59e0b]">&amp;</span>Test
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
              Teacher
            </span>
          </Link>
          <button 
            onClick={handleSignOut}
            className="text-xs font-bold px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200/60"
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
