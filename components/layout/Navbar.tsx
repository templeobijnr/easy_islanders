
import React, { useState, useEffect, useRef } from 'react';
import { Palmtree, User, Menu, Globe, LogOut, HelpCircle, LayoutDashboard, Users, Tag, MessageSquare, Home, Compass, Settings, UserCircle, Bell, X, Lock, Layers } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Language } from '../../constants/translations';
import { StorageService } from '../../services/storageService';
import { UserNotification } from '../../types';

interface NavbarProps {
  onOpenDashboard?: () => void;
  onOpenConnect?: () => void;
  onOpenRequests?: () => void;
  onOpenPromotions?: () => void;
  onOpenExplore?: () => void;
  onOpenHome?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void; // Admin prop
  onOpenAuth: (view: 'login' | 'signup') => void;
  activeView?: string;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onOpenDashboard, onOpenConnect, onOpenRequests, 
  onOpenPromotions, onOpenExplore, onOpenHome, 
  onOpenProfile, onOpenSettings, onOpenAdmin, onOpenAuth, activeView 
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Notification Listener
  useEffect(() => {
    const loadNotifs = () => {
      const all = StorageService.getNotifications();
      setNotifications(all);
      setUnreadCount(all.filter(n => !n.read).length);
    };
    
    loadNotifs();
    const unsubscribe = StorageService.subscribe('notifications', loadNotifs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (langRef.current && !langRef.current.contains(event.target as Node)) setIsLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  const markRead = (id: string) => {
    StorageService.markNotificationRead(id);
  };

  const isSolidBackground = scrolled || activeView !== 'home'; 
  const textColor = isSolidBackground ? 'text-slate-900' : 'text-white';
  const navBg = isSolidBackground ? 'bg-white/80 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6';

  const LANG_FLAGS = { en: '🇬🇧', tr: '🇹🇷', ru: '🇷🇺', de: '🇩🇪' };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="container mx-auto px-6 flex items-center justify-between relative">
        
        {/* LOGO (Left) */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={onOpenHome}>
          <div className={`p-2 rounded-full transition-colors duration-300 ${
            isSolidBackground ? 'bg-teal-50 text-teal-600 group-hover:bg-teal-100' : 'bg-white/20 text-white backdrop-blur-sm group-hover:bg-white/30'
          }`}>
             <Palmtree size={24} />
          </div>
          <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${textColor}`}>
            Easy Islanders
          </span>
        </div>

        {/* MIDDLE LINKS (Simplified) */}
        <div className={`hidden md:flex items-center gap-8 font-medium transition-colors duration-300 ${isSolidBackground ? 'text-slate-600' : 'text-white/90'}`}>
          
          <button 
             onClick={onOpenHome}
             className={`flex items-center gap-2 transition-all text-sm hover:text-teal-500 ${activeView === 'home' ? 'text-teal-500 font-bold' : ''}`}
          >
             {t('chat')}
          </button>

          <button 
             onClick={onOpenExplore}
             className={`flex items-center gap-2 transition-all text-sm hover:text-teal-500 ${activeView === 'explore' ? 'text-teal-500 font-bold' : ''}`}
          >
             {t('explore')}
          </button>
          
          <button 
             onClick={onOpenConnect}
             className={`flex items-center gap-2 transition-all text-sm hover:text-teal-500 ${activeView === 'connect' ? 'text-teal-500 font-bold' : ''}`}
          >
             {t('connect')}
          </button>

        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-4">
          
          {/* Business Dashboard Button - ONLY VISIBLE FOR BUSINESS ACCOUNTS */}
          {isAuthenticated && user?.type === 'business' && (
            <button 
              onClick={onOpenDashboard}
              className={`hidden lg:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
                isSolidBackground ? 'text-slate-900 hover:bg-slate-100' : 'text-white hover:bg-white/20'
              }`}
            >
              <LayoutDashboard size={16} />
              {t('dashboard')}
            </button>
          )}

          {/* NOTIFICATIONS */}
          <div className="relative" ref={notifRef}>
             <button 
               onClick={() => setIsNotifOpen(!isNotifOpen)}
               className={`p-2 rounded-full transition-colors relative ${
                 isSolidBackground ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-white'
               }`}
             >
               <Bell size={20} />
               {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
               )}
             </button>

             {isNotifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                   <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className="text-xs font-bold text-slate-500 uppercase">Notifications</span>
                      {unreadCount > 0 && <span className="text-xs text-teal-600 font-bold">{unreadCount} new</span>}
                   </div>
                   <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? notifications.map(n => (
                         <div 
                           key={n.id} 
                           onClick={() => markRead(n.id)}
                           className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                         >
                            <div className="flex justify-between items-start mb-1">
                               <span className={`text-sm font-bold ${!n.read ? 'text-teal-700' : 'text-slate-800'}`}>{n.title}</span>
                               <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                         </div>
                      )) : (
                         <div className="p-8 text-center text-slate-400 text-xs">No notifications yet.</div>
                      )}
                   </div>
                </div>
             )}
          </div>
          
          {/* Language */}
          <div className="relative" ref={langRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                isSolidBackground ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-white'
              }`}
            >
              <Globe size={20} />
              <span className="text-xs font-bold uppercase">{language}</span>
            </button>
            
            {isLangOpen && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                 {Object.keys(LANG_FLAGS).map((langKey) => (
                   <button 
                      key={langKey}
                      onClick={() => handleLanguageChange(langKey as Language)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${language === langKey ? 'text-teal-600 font-bold bg-teal-50' : 'text-slate-700'}`}
                   >
                      <span className="text-lg">{LANG_FLAGS[langKey as Language]}</span>
                      <span className="uppercase">{langKey}</span>
                   </button>
                 ))}
              </div>
            )}
          </div>

          {/* Main Menu Button */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                isSolidBackground 
                  ? 'border-slate-200 bg-white hover:shadow-md text-slate-500' 
                  : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
              } ${isMenuOpen ? 'shadow-md ring-2 ring-teal-500/20' : ''}`}
            >
              <div className="pl-2"><Menu size={18} /></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isSolidBackground ? 'bg-slate-100 text-slate-500' : 'bg-white/20 text-white'}`}>
                 {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : <User size={16} />}
              </div>
            </button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                
                {/* Auth Section */}
                <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/50">
                  {isAuthenticated ? (
                    <div>
                       <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('my_account')}</div>
                       <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                       <p className="text-xs text-slate-500 capitalize">{user?.type} Account</p>
                    </div>
                  ) : (
                    <div>
                       <div className="text-xs font-bold text-slate-400 uppercase mb-2">{t('my_account')}</div>
                       <button onClick={() => { setIsMenuOpen(false); onOpenAuth('signup'); }} className="block w-full text-left text-sm font-bold text-slate-900 cursor-pointer hover:text-teal-600 mb-2">{t('signup')}</button>
                       <button onClick={() => { setIsMenuOpen(false); onOpenAuth('login'); }} className="block w-full text-left text-sm text-slate-500 hover:text-slate-800 cursor-pointer">{t('login')}</button>
                    </div>
                  )}
                </div>
                
                {/* Authenticated Links */}
                {isAuthenticated && (
                  <>
                    <div onClick={() => { setIsMenuOpen(false); onOpenProfile?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                       <UserCircle size={16} className="text-slate-400" /> Profile
                    </div>
                    <div onClick={() => { setIsMenuOpen(false); onOpenRequests?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                       <MessageSquare size={16} className="text-blue-500" /> {t('requests')}
                    </div>
                    <div onClick={() => { setIsMenuOpen(false); onOpenPromotions?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                       <Tag size={16} className="text-red-500" /> {t('promotions')}
                    </div>
                    <div className="my-1 border-t border-slate-100"></div>
                  </>
                )}

                {/* Navigation */}
                <div onClick={() => { setIsMenuOpen(false); onOpenHome?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                   <Home size={16} /> {t('chat')}
                </div>
                <div onClick={() => { setIsMenuOpen(false); onOpenExplore?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                   <Compass size={16} /> {t('explore')}
                </div>
                <div onClick={() => { setIsMenuOpen(false); onOpenConnect?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                   <Users size={16} /> {t('connect')}
                </div>

                <div className="my-1 border-t border-slate-100"></div>
                
                {/* Admin Link (Hidden for now or available to all for demo) */}
                <div onClick={() => { setIsMenuOpen(false); onOpenAdmin?.(); }} className="block px-4 py-3 text-sm font-bold text-slate-800 bg-slate-50 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer flex items-center gap-3">
                   <Layers size={16} /> Control Tower (Admin)
                </div>

                {isAuthenticated && user?.type === 'business' && (
                   <>
                      <div onClick={() => { setIsMenuOpen(false); onOpenDashboard?.(); }} className="block px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer flex items-center gap-3">
                         <LayoutDashboard size={16} /> {t('dashboard')}
                      </div>
                      <div className="my-1 border-t border-slate-100"></div>
                   </>
                )}

                <div onClick={() => { setIsMenuOpen(false); onOpenSettings?.(); }} className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3">
                   <Settings size={16} className="text-slate-400" /> Settings
                </div>

                <div className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-2"><HelpCircle size={16} /> {t('help')}</div>
                
                {isAuthenticated && (
                  <div onClick={() => { setIsMenuOpen(false); logout(); }} className="block px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"><LogOut size={16} /> {t('logout')}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
