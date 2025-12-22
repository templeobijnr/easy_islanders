
import React, { useState } from 'react';
import { Bell, Lock, Globe, Shield, Moon, LogOut, ChevronRight, Database, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';

const SettingsView: React.FC = () => {
   const { user, logout } = useAuth();
   const { language, setLanguage } = useLanguage();
   const [activeSection, setActiveSection] = useState('general');

   // Seeding State
   const [isSeeding, setIsSeeding] = useState(false);
   const [seedSuccess, setSeedSuccess] = useState(false);

   // Local settings state (Mock)
   const [notifs, setNotifs] = useState({
      email: true,
      push: true,
      marketing: false
   });

   const [privacy, setPrivacy] = useState('friends');

   const SECTIONS = [
      { id: 'general', label: 'General', icon: Globe },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'privacy', label: 'Privacy & Security', icon: Lock },
      { id: 'developer', label: 'Developer Tools', icon: Database },
   ];

   const handleSeedDatabase = async () => {
      setIsSeeding(true);
      setSeedSuccess(false);
      const success = await StorageService.seedDatabase();
      setIsSeeding(false);
      if (success) {
         setSeedSuccess(true);
         setTimeout(() => setSeedSuccess(false), 3000);
      } else {
         alert("Failed to seed database. Check console for errors.");
      }
   };

   return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-20">
         <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

            <div className="flex flex-col md:flex-row gap-8">

               {/* Sidebar */}
               <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                  {SECTIONS.map(section => (
                     <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeSection === section.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                     >
                        <section.icon size={18} /> {section.label}
                     </button>
                  ))}
                  <div className="border-t border-slate-200 my-4 pt-4"></div>
                  <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all text-sm">
                     <LogOut size={18} /> Log Out
                  </button>
               </div>

               {/* Main Content */}
               <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 min-h-[500px]">

                  {activeSection === 'general' && (
                     <div className="space-y-8 animate-in fade-in">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">General Preferences</h2>

                        <div className="space-y-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Language</label>
                              <select
                                 value={language}
                                 onChange={(e) => setLanguage(e.target.value as any)}
                                 className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                              >
                                 <option value="en">English</option>
                                 <option value="tr">Türkçe</option>
                                 <option value="ru">Русский</option>
                                 <option value="de">Deutsch</option>
                              </select>
                           </div>

                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Currency</label>
                              <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                                 <option value="GBP">GBP (£)</option>
                                 <option value="EUR">EUR (€)</option>
                                 <option value="USD">USD ($)</option>
                                 <option value="TRY">TRY (₺)</option>
                              </select>
                           </div>

                           <div className="pt-4 flex items-center justify-between">
                              <div>
                                 <h4 className="font-bold text-slate-900">Dark Mode</h4>
                                 <p className="text-xs text-slate-500">Switch between light and dark themes.</p>
                              </div>
                              <button className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer transition-colors">
                                 <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"></div>
                              </button>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'notifications' && (
                     <div className="space-y-8 animate-in fade-in">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Notifications</h2>

                        <div className="space-y-6">
                           {[
                              { id: 'email', label: 'Email Notifications', desc: 'Receive booking confirmations and updates via email.' },
                              { id: 'push', label: 'Push Notifications', desc: 'Get real-time alerts about your messages and trips.' },
                              { id: 'marketing', label: 'Marketing & Promotions', desc: 'Receive exclusive deals and island news.' }
                           ].map(opt => (
                              <div key={opt.id} className="flex items-center justify-between">
                                 <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{opt.label}</h4>
                                    <p className="text-xs text-slate-500">{opt.desc}</p>
                                 </div>
                                 <button
                                    onClick={() => setNotifs({ ...notifs, [opt.id]: !(notifs as any)[opt.id] })}
                                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${(notifs as any)[opt.id] ? 'bg-teal-600' : 'bg-slate-200'}`}
                                 >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${(notifs as any)[opt.id] ? 'left-7' : 'left-1'}`}></div>
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {activeSection === 'privacy' && (
                     <div className="space-y-8 animate-in fade-in">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Privacy & Security</h2>

                        <div className="space-y-6">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Profile Visibility</label>
                              <div className="grid grid-cols-3 gap-2">
                                 {['public', 'friends', 'private'].map(opt => (
                                    <button
                                       key={opt}
                                       onClick={() => setPrivacy(opt)}
                                       className={`py-2 rounded-lg text-sm font-bold border capitalize ${privacy === opt ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                                    >
                                       {opt}
                                    </button>
                                 ))}
                              </div>
                           </div>

                           <div className="pt-4">
                              <button className="w-full p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors text-left group">
                                 <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Change Password</h4>
                                    <p className="text-xs text-slate-500">Update your login credentials.</p>
                                 </div>
                                 <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-900" />
                              </button>
                           </div>

                           <div>
                              <button className="w-full p-4 border border-red-200 bg-red-50 rounded-xl flex justify-between items-center hover:bg-red-100 transition-colors text-left group">
                                 <div>
                                    <h4 className="font-bold text-red-700 text-sm">Delete Account</h4>
                                    <p className="text-xs text-red-500">Permanently remove your data.</p>
                                 </div>
                                 <Shield size={16} className="text-red-400 group-hover:text-red-700" />
                              </button>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'developer' && (
                     <div className="space-y-8 animate-in fade-in">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                           <Database size={20} className="text-blue-600" /> Developer Tools
                        </h2>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                           <h4 className="font-bold text-slate-900 mb-2">Database Management</h4>
                           <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                              Use this tool to populate your Firestore database with the initial mock data (Listings, Clients, Campaigns).
                              This is useful if you have just created a new Cloud Firestore project.
                           </p>

                           <button
                              onClick={handleSeedDatabase}
                              disabled={isSeeding}
                              className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${seedSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                           >
                              {isSeeding ? <Loader2 size={18} className="animate-spin" /> : seedSuccess ? <CheckCircle size={18} /> : <Database size={18} />}
                              {isSeeding ? 'Seeding Database...' : seedSuccess ? 'Seed Complete!' : 'Seed Database with Mock Data'}
                           </button>
                        </div>
                     </div>
                  )}

               </div>
            </div>
         </div>
      </div>
   );
};

export default SettingsView;
