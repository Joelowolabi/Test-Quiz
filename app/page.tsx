import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 bg-young-black text-white">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-1">
          <span className="text-young-green">YOUNG</span>&amp;TEST
        </div>
        <div className="hidden md:flex gap-6 font-semibold">
          <Link href="#" className="hover:text-young-green transition-colors">Home</Link>
          <Link href="#" className="hover:text-young-green transition-colors">Stories</Link>
          <Link href="#" className="hover:text-young-green transition-colors">Highlights</Link>
        </div>
        <Link href="/dashboard" className="px-5 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors font-medium text-sm">
          Teacher Portal
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="bg-young-green flex-1 flex flex-col items-center justify-center text-center p-8 md:p-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 text-young-black opacity-50 animate-float"><Sparkles size={40} /></div>
        <div className="absolute bottom-20 right-20 text-young-black opacity-50 animate-float" style={{ animationDelay: '1s'}}><Zap size={48} /></div>
        
        <div className="inline-flex items-center gap-2 bg-young-purple text-white px-4 py-1.5 rounded-full text-sm font-bold mb-6 transform -rotate-2">
          <Sparkles size={16} /> AI Powered
        </div>
        
        <h1 className="heading-primary text-young-black mb-6 max-w-4xl leading-tight">
          Where Young Minds Make <br className="hidden md:block"/> Big <span className="underline decoration-young-purple decoration-8 underline-offset-4">Knowledge</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-young-black/80 font-medium mb-10 max-w-2xl">
          Your launchpad to explore, test, and elevate your learning. Generate AI quizzes from any content in seconds.
        </p>
        
        <Link href="/dashboard" className="btn-primary text-lg px-10 py-4">
          Create a Quiz Now <ArrowRight size={20} />
        </Link>
      </header>

      {/* Features Section */}
      <section className="bg-white py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-secondary text-young-black mb-4">Why Join Us?</h2>
            <div className="w-24 h-2 bg-young-orange mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "AI Generated", desc: "Turn any article into a quiz instantly.", icon: <Zap size={32} className="text-young-purple" /> },
              { title: "Instant Feedback", desc: "Get your score the moment you finish.", icon: <Sparkles size={32} className="text-young-green" /> },
              { title: "Teacher Dashboard", desc: "Track performance and analytics easily.", icon: <Users size={32} className="text-young-orange" /> },
              { title: "Dynamic Design", desc: "No more boring black and white tests.", icon: <Sparkles size={32} className="text-young-black" /> }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 text-center group">
                <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-500 font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-young-purple text-white py-24 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 squiggle-bg opacity-10"></div>
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <h2 className="heading-primary mb-6">Ready to Make Headlines?</h2>
          <p className="text-xl opacity-90 mb-10 font-medium">Jump in, generate your test, and let the world hear YOU.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard" className="btn-secondary bg-white text-young-purple border-none hover:bg-young-green hover:text-young-black">
              Teacher Dashboard
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-young-black text-white/60 py-10 text-center text-sm font-medium">
        <p>Made by young minds. For young minds. Powered by passion.</p>
        <p className="mt-2">&copy; 2026 Young&Test. All rights reserved.</p>
      </footer>
    </div>
  );
}
