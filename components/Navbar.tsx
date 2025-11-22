
import React, { useState, useEffect, useRef } from 'react';
import { Palmtree, Search, User, Menu, Globe, LogOut, HelpCircle, LayoutDashboard, Users } from 'lucide-react';

interface NavbarProps {
  onOpenDashboard?: () => void;
  onOpenConnect?: () => void;
  activeView?: 'home' | 'connect';
}

const Navbar: React.FC<NavbarProps> = ({ onOpenDashboard, onOpenConnect, activeView }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Force white background if in Connect View (non-hero page)
  const isSolidBackground = scrolled || activeView === 'connect';
  const textColor = isSolidBackground ? 'text-slate-900' : 'text-white';
  const navBg = isSolidBackground ? 'bg-white/80 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="container mx-auto px-6 flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.href = '/'}>
          <div className={`p-2 rounded-full transition-colors duration-300 ${
            isSolidBackground ? 'bg-teal-50 text-teal-600 group-hover:bg-teal-100' : 'bg-white/20 text-white backdrop-blur-sm group-hover:bg-white/30'
          }`}>
             <Palmtree size={24} />
          </div>
          <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${textColor}`}>
            Easy Islanders
          </span>
        </div>

        {/* Middle Links */}
        <div className={`hidden md:flex items-center gap-8 font-medium transition-colors duration-300 ${isSolidBackground ? 'text-slate-600' : 'text-white/90'}`}>
          <a href="#explore" onClick={(e) => { if (activeView === 'connect') { e.preventDefault(); window.location.href = '/'; } }} className="hover:text-teal-500 transition-colors">Explore</a>
          
          <button 
             onClick={onOpenConnect}
             className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${activeView === 'connect' ? 'bg-teal-50 text-teal-700 font-bold' : 'hover:text-teal-500'}`}
          >
             <Users size={18} /> Connect
          </button>

          <a href="#agent" className="hover:text-teal-500 transition-colors">Concierge</a>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenDashboard}
            className={`hidden md:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
              isSolidBackground ? 'text-slate-900 hover:bg-slate-100' : 'text-white hover:bg-white/20'
            }`}
          >
            <LayoutDashboard size={16} />
            Business Dashboard
          </button>
          
          <button className={`p-2 rounded-full transition-colors ${
            isSolidBackground ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-white'
          }`}>
            <Globe size={20} />
          </button>

          {/* User Menu Dropdown Trigger */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                isSolidBackground 
                  ? 'border-slate-200 bg-white hover:shadow-md text-slate-500' 
                  : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
              } ${isMenuOpen ? 'shadow-md ring-2 ring-teal-500/20' : ''}`}
            >
              <div className="pl-2">
                <Menu size={18} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isSolidBackground ? 'bg-slate-100 text-slate-500' : 'bg-white/20 text-white'
              }`}>
                <User size={16} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-4 py-3 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-900 cursor-pointer hover:text-teal-600">Sign up</p>
                  <p className="text-sm text-slate-500 hover:text-slate-800 cursor-pointer mt-2">Log in</p>
                </div>
                
                <a href="#explore" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  Explore Islands
                </a>
                <div onClick={() => { setIsMenuOpen(false); onOpenConnect?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer">
                  Connect
                </div>
                <div 
                  onClick={() => { setIsMenuOpen(false); onOpenDashboard?.(); }}
                  className="block px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                >
                  Switch to Business
                </div>
                
                <div className="my-1 border-t border-slate-100"></div>
                
                <div className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-2">
                   <HelpCircle size={16} /> Help Center
                </div>
                <div className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-2">
                   <LogOut size={16} /> Log out
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
