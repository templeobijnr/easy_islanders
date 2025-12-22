
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Hash, Award, Trophy, Check, Edit3, ArrowRight, Sparkles, Shield, MessageSquare, Stamp, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, PassportStamp } from '../../types';
import { PASSPORT_LOCATIONS } from '../../components/constants';
import { formatDate } from '../../utils/formatters';

const INTERESTS = ['Hiking', 'Tech', 'Crypto', 'Dining', 'Nightlife', 'Sailing', 'Tennis', 'Gaming', 'Photography', 'Nature', 'History'];

const ProfileView: React.FC = () => {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'islander' | 'passport'>('personal');
  
  // Local State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.profile?.location || ''
  });

  const [isJoiningConnect, setIsJoiningConnect] = useState(false);
  const [connectStep, setConnectStep] = useState(1);
  const [islanderForm, setIslanderForm] = useState<UserProfile>({
    socialHandle: user?.profile?.socialHandle || '',
    bio: user?.profile?.bio || '',
    interests: user?.profile?.interests || []
  });

  const [isLoggingVisit, setIsLoggingVisit] = useState(false);

  const handleSavePersonal = () => {
    if (!user) return;
    const updatedUser = {
      ...user,
      name: personalForm.name,
      phone: personalForm.phone,
      profile: {
        ...user.profile,
        location: personalForm.location
      }
    };
    login(updatedUser); 
    setIsEditingPersonal(false);
  };

  const toggleInterest = (interest: string) => {
    setIslanderForm(prev => {
      const current = prev.interests || [];
      if (current.includes(interest)) {
        return { ...prev, interests: current.filter(i => i !== interest) };
      } else {
        return { ...prev, interests: [...current, interest] };
      }
    });
  };

  const handleJoinConnect = () => {
    if (!user) return;
    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        ...islanderForm,
        isIslander: true,
        joinDate: new Date().toISOString()
      }
    };
    login(updatedUser);
    setIsJoiningConnect(false);
    setConnectStep(1);
  };

  const handleAddStamp = (location: typeof PASSPORT_LOCATIONS[0]) => {
     if (!user) return;
     const newStamp: PassportStamp = {
        id: `stamp-${Date.now()}`,
        locationName: location.name,
        category: location.category as any,
        date: new Date().toISOString(),
        icon: location.icon
     };
     
     // Check if already stamped
     if (user.profile?.passportStamps?.some(s => s.locationName === location.name)) return;

     const updatedUser = {
        ...user,
        profile: {
           ...user.profile,
           passportStamps: [...(user.profile?.passportStamps || []), newStamp]
        }
     };
     login(updatedUser);
     setIsLoggingVisit(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        
        {/* Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden mb-8">
           <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
           </div>
           <div className="px-8 pb-8">
              <div className="relative -mt-16 flex flex-col md:flex-row items-end md:items-center gap-6 mb-6">
                 <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-md">
                       {user?.avatar ? (
                         <img src={user.avatar} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <User size={48} />
                         </div>
                       )}
                    </div>
                    <button className="absolute bottom-2 right-2 p-2 bg-slate-900 text-white rounded-full hover:bg-teal-600 transition-colors shadow-md">
                       <Camera size={16} />
                    </button>
                 </div>
                 <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900">{user?.name}</h1>
                    <p className="text-slate-500 flex items-center gap-2">
                       {user?.type === 'business' ? 'Business Account' : 'Personal Account'} 
                       {user?.profile?.isIslander && (
                          <span className="flex items-center gap-1 text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full text-xs font-bold">
                             <Check size={12} /> Islander
                          </span>
                       )}
                    </p>
                 </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
                 <button 
                   onClick={() => setActiveTab('personal')}
                   className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'personal' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                    Personal Details
                 </button>
                 <button 
                   onClick={() => setActiveTab('islander')}
                   className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'islander' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                    Islander Identity {user?.profile?.isIslander && <Sparkles size={12} />}
                 </button>
                 <button 
                   onClick={() => setActiveTab('passport')}
                   className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'passport' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                    Passport & Stamps {user?.profile?.isIslander && <span className="bg-amber-100 text-amber-800 px-1.5 rounded text-[10px]">{user.profile.passportStamps?.length || 0}</span>}
                 </button>
              </div>
           </div>
        </div>

        {/* TAB: PERSONAL */}
        {activeTab === 'personal' && (
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                 {!isEditingPersonal ? (
                    <button onClick={() => setIsEditingPersonal(true)} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-bold">
                       <Edit3 size={16} /> Edit
                    </button>
                 ) : (
                    <div className="flex gap-2">
                       <button onClick={() => setIsEditingPersonal(false)} className="text-slate-500 px-4 py-2 text-sm font-bold">Cancel</button>
                       <button onClick={handleSavePersonal} className="bg-slate-900 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-slate-800">Save</button>
                    </div>
                 )}
              </div>
              {/* ... (Input fields same as before) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <input 
                      disabled={!isEditingPersonal}
                      value={personalForm.name}
                      onChange={(e) => setPersonalForm({...personalForm, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 outline-none focus:ring-2 focus:ring-slate-900"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                    <input 
                      disabled={true}
                      value={personalForm.email}
                      className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                    <input 
                      disabled={!isEditingPersonal}
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm({...personalForm, phone: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 outline-none focus:ring-2 focus:ring-slate-900"
                    />
                 </div>
              </div>
           </div>
        )}

        {/* TAB: PASSPORT */}
        {activeTab === 'passport' && (
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-in fade-in">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <div>
                     <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Stamp size={24} className="text-amber-600"/> My Travel Log
                     </h2>
                     <p className="text-slate-500 text-sm">Collect stamps by visiting iconic locations across North Cyprus.</p>
                  </div>
                  <button 
                     onClick={() => setIsLoggingVisit(!isLoggingVisit)}
                     className="bg-amber-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center gap-2"
                  >
                     {isLoggingVisit ? 'Cancel' : 'Log New Visit'}
                  </button>
               </div>

               {/* Log Visit Modal Area */}
               {isLoggingVisit && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 animate-in slide-in-from-top-4">
                     <h3 className="font-bold text-slate-900 mb-4">Where have you been recently?</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {PASSPORT_LOCATIONS.map(loc => {
                           const isCollected = user?.profile?.passportStamps?.some(s => s.locationName === loc.name);
                           return (
                              <button 
                                 key={loc.name}
                                 disabled={isCollected}
                                 onClick={() => handleAddStamp(loc)}
                                 className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    isCollected 
                                    ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                                    : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                                 }`}
                              >
                                 <span className="text-2xl">{loc.icon}</span>
                                 <span className="text-xs font-bold text-slate-700 text-center">{loc.name}</span>
                                 {isCollected && <span className="text-[9px] text-green-600 font-bold">Collected</span>}
                              </button>
                           )
                        })}
                     </div>
                  </div>
               )}

               {/* Stamps Grid */}
               {(!user?.profile?.passportStamps || user.profile.passportStamps.length === 0) ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                     <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Stamp size={32}/>
                     </div>
                     <h3 className="text-slate-900 font-bold">No stamps yet</h3>
                     <p className="text-slate-500 text-sm">Start exploring to fill your passport!</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                     {user.profile.passportStamps.map(stamp => (
                        <div key={stamp.id} className="aspect-square bg-amber-50 rounded-full border-4 border-double border-amber-200 flex flex-col items-center justify-center p-4 transform hover:rotate-6 transition-transform cursor-pointer shadow-sm relative group">
                           <span className="text-4xl mb-1">{stamp.icon}</span>
                           <span className="text-xs font-bold text-amber-900 text-center leading-tight">{stamp.locationName}</span>
                           <span className="text-[9px] text-amber-700 mt-1 font-mono">
                              {formatDate(stamp.date, { year: 'numeric', month: 'short', day: 'numeric' })}
                           </span>
                           
                           {/* Ink effect overlay */}
                           <div className="absolute inset-0 rounded-full border-[6px] border-amber-900/10 pointer-events-none"></div>
                        </div>
                     ))}
                  </div>
               )}
           </div>
        )}

        {/* TAB: ISLANDER IDENTITY (Keep existing content) */}
        {activeTab === 'islander' && (
           <div className="animate-in fade-in">
              {!user?.profile?.isIslander ? (
                 <div className="text-center p-10 bg-slate-900 rounded-3xl text-white">
                    <h2 className="text-2xl font-bold mb-4">Join the Community</h2>
                    <button onClick={() => {setIsJoiningConnect(true); setActiveTab('islander');}} className="bg-teal-500 px-6 py-3 rounded-full font-bold">Unlock Islander Profile</button>
                 </div>
              ) : (
                 <div className="bg-white p-8 rounded-3xl border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="p-3 bg-teal-50 text-teal-700 rounded-xl"><Trophy size={24}/></div>
                       <div>
                          <h3 className="font-bold text-slate-900 text-lg">Rank: {user.profile.rank || 'Explorer'}</h3>
                          <p className="text-slate-500 text-sm">150 Points</p>
                       </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {user.profile.interests?.map(i => <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold">#{i}</span>)}
                    </div>
                 </div>
              )}
           </div>
        )}

      </div>
    </div>
  );
};

export default ProfileView;
