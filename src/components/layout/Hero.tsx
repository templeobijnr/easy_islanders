
import React from 'react';
import { ArrowDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface HeroProps {
  onStartChat: () => void;
  onExplore?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStartChat, onExplore }) => {
  const { t } = useLanguage();

  return (
    <section className="relative h-[95vh] w-full overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2670&auto=format&fit=crop" 
          alt="Tropical Island" 
          className="w-full h-full object-cover scale-105 animate-slow-zoom"
          style={{ animation: 'zoom 20s infinite alternate linear' }}
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-50/90"></div>
      </div>

      <div className="relative h-full container mx-auto px-6 flex flex-col justify-center items-center text-center pt-20">
        <div className="space-y-6 max-w-5xl animate-float">
          <span className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-md text-teal-50 border border-white/20 text-xs font-bold tracking-[0.2em] uppercase mb-4 shadow-lg">
            {t('hero_tag')}
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.1] drop-shadow-xl">
            {t('hero_title')}<br />
            <span className="text-teal-200">{t('hero_experts')}</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-200 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            {t('hero_subtitle')}
          </p>
          
          <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
            <button 
              onClick={onStartChat}
              className="group relative px-8 py-4 bg-white text-teal-950 rounded-full font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('hero_cta_agent')}
                <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {t('live')}
                </span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <button
              onClick={onExplore}
              className="px-8 py-4 bg-white/5 backdrop-blur-md text-white rounded-full font-semibold text-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              {t('hero_cta_explore')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes zoom {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }
      `}</style>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce cursor-pointer hover:text-white transition-colors" onClick={() => window.scrollTo({ top: 800, behavior: 'smooth'})}>
        <ArrowDown size={32} />
      </div>
    </section>
  );
};

export default Hero;
