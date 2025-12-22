
import React from 'react';
import { ShieldCheck, MessageCircle, Sparkles } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-100/50 rounded-full blur-[100px] -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[80px] -ml-20 -mb-20"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Left: Visuals */}
          <div className="w-full lg:w-1/2 relative">
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 transform hover:rotate-1 transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1590665510909-c30f14541919?q=80&w=2670&auto=format&fit=crop"
                alt="Bellapais Abbey"
                className="w-full h-auto object-cover"
              />

              {/* Floating Badge */}
              <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50 max-w-[200px] animate-float">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">+2k</div>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-700">Trusted by 2,000+ travelers this month.</p>
              </div>
            </div>

            {/* Abstract Shapes */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-orange-400 rounded-full opacity-20"></div>
            <div className="absolute -bottom-8 -right-8 w-48 h-48 border-4 border-teal-500/20 rounded-full"></div>
          </div>

          {/* Right: Content */}
          <div className="w-full lg:w-1/2">
            <span className="inline-block px-4 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-bold tracking-wide uppercase mb-6">
              The Islander Way
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Not a Search Engine. <br />
              <span className="text-teal-600">Your Local Friend.</span>
            </h2>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              Traditional booking sites give you filters. We give you experts.
              Our AI agents are trained on local knowledge, hidden gems, and real-time availability,
              giving you the "local connection" instantly.
            </p>

            <div className="space-y-6">
              {[
                { icon: MessageCircle, title: "Conversational Discovery", desc: "Just ask for what you want. No more 50 tab browsing sessions." },
                { icon: ShieldCheck, title: "Verified Locals", desc: "Every listing is vetted by our ground team in North Cyprus." },
                { icon: Sparkles, title: "Tailored to You", desc: "We remember your preferences to curate the perfect island stay." }
              ].map((feature, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-teal-600 shrink-0">
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{feature.title}</h4>
                    <p className="text-slate-500 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;
