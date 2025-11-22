
import React, { useState } from 'react';
import { Building2, Car, Briefcase, Utensils, ArrowLeft, Sparkles, ShoppingBag, Calendar, Hotel, Key, Tag } from 'lucide-react';
import { BusinessConfig, MarketplaceDomain } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BusinessOnboardingProps {
  onComplete: (config: BusinessConfig) => void;
  onExit: () => void;
}

type Step = 'intro' | 'domain_select' | 'sub_type' | 'details';

const DOMAIN_OPTIONS = [
  { 
    id: 'Real Estate', 
    icon: Building2, 
    label: 'Real Estate',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    border: 'hover:border-rose-200'
  },
  { 
    id: 'Cars', 
    icon: Car, 
    label: 'Cars & Vehicles',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'hover:border-blue-200'
  },
  { 
    id: 'Marketplace', 
    icon: ShoppingBag, 
    label: 'Marketplace',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'hover:border-indigo-200'
  },
  { 
    id: 'Events', 
    icon: Calendar, 
    label: 'Events',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'hover:border-pink-200'
  },
  { 
    id: 'Restaurants', 
    icon: Utensils, 
    label: 'Restaurants',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'hover:border-orange-200'
  },
  { 
    id: 'Services', 
    icon: Briefcase, 
    label: 'Services',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'hover:border-teal-200'
  },
  { 
    id: 'Hotels', 
    icon: Hotel, 
    label: 'Hotels & Stays',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'hover:border-emerald-200'
  },
  { 
    id: 'Health & Beauty', 
    icon: Sparkles, 
    label: 'Health & Beauty',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'hover:border-violet-200'
  }
];

const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({ onComplete, onExit }) => {
  const [step, setStep] = useState<Step>('intro');
  const [config, setConfig] = useState<BusinessConfig>({ domain: null, subType: null, businessName: '' });
  const { user } = useAuth();

  const generateBusinessId = () => {
    const uid = user?.id || 'anon';
    return `biz_${uid}_${Date.now()}`;
  };

  const handleDomainSelect = (domain: MarketplaceDomain) => {
    setConfig({ ...config, domain });
    if (domain === 'Cars') {
       setStep('sub_type');
    } else {
       setStep('details');
    }
  };

  const handleFinish = () => {
    if (config.businessName && config.domain) {
        const finalConfig: BusinessConfig = {
          ...config,
          id: config.id || generateBusinessId(),
          ownerUid: user?.id
        };
        onComplete(finalConfig);
    }
  };

  return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <div className="p-6">
          <button onClick={onExit} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors">
            <ArrowLeft size={20} /> Back to Consumer App
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
           <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[500px] flex flex-col">
              
              {step === 'intro' && (
                <div className="p-12 text-center flex flex-col items-center justify-center flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-slate-200">
                      <Building2 size={48} />
                   </div>
                   <h2 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">Welcome to Business</h2>
                   <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
                     The AI-first operating system for island businesses. Manage listings, automate CRM, and reach global travelers.
                   </p>
                   <button 
                     onClick={() => setStep('domain_select')} 
                     className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 text-lg"
                   >
                     Launch Your Business
                   </button>
                </div>
              )}

              {step === 'domain_select' && (
                <div className="p-8 md:p-12 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                   <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Select Your Industry</h2>
                   <p className="text-slate-500 text-center mb-8">What kind of business are you launching today?</p>
                   
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {DOMAIN_OPTIONS.map(d => (
                        <button
                          key={d.id}
                          onClick={() => handleDomainSelect(d.id as MarketplaceDomain)}
                          className={`p-4 border border-slate-100 rounded-2xl transition-all flex flex-col items-center text-center group aspect-square justify-center gap-3 bg-white hover:shadow-lg ${d.border}`}
                        >
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${d.bg} ${d.color}`}>
                             <d.icon size={28} />
                          </div>
                          <div className="font-bold text-slate-900 text-sm group-hover:text-slate-700">{d.label}</div>
                        </button>
                      ))}
                   </div>
                   <div className="mt-auto text-center">
                      <button onClick={() => setStep('intro')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Back to Intro</button>
                   </div>
                </div>
              )}

              {step === 'sub_type' && (
                 <div className="p-8 md:p-12 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Business Model</h2>
                    <p className="text-slate-500 text-center mb-8">How do you operate your automotive business?</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
                       <button
                          onClick={() => { setConfig({ ...config, subType: 'rental' }); setStep('details'); }}
                          className="p-8 border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group flex flex-col gap-4 bg-white shadow-sm hover:shadow-md"
                       >
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Key size={32} />
                          </div>
                          <div>
                             <h3 className="text-xl font-bold text-slate-900 mb-1">Rent-a-Car</h3>
                             <p className="text-sm text-slate-500">I rent out vehicles on a daily or weekly basis.</p>
                          </div>
                       </button>

                       <button
                          onClick={() => { setConfig({ ...config, subType: 'sale' }); setStep('details'); }}
                          className="p-8 border-2 border-slate-100 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group flex flex-col gap-4 bg-white shadow-sm hover:shadow-md"
                       >
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Tag size={32} />
                          </div>
                          <div>
                             <h3 className="text-xl font-bold text-slate-900 mb-1">Car Dealership</h3>
                             <p className="text-sm text-slate-500">I sell new or used vehicles.</p>
                          </div>
                       </button>
                    </div>
                    
                    <div className="mt-auto text-center">
                       <button onClick={() => setStep('domain_select')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Back</button>
                    </div>
                 </div>
              )}

              {step === 'details' && (
                 <div className="p-12 flex flex-col items-center justify-center flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="w-full max-w-md">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Name Your Business</h2>
                        <p className="text-slate-500 text-center mb-8">This is how customers will see you on the marketplace.</p>
                        
                        <div className="space-y-6 mb-10">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Business Name</label>
                              <input 
                                type="text" 
                                value={config.businessName}
                                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                                className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none text-lg font-medium transition-all placeholder:text-slate-300"
                                placeholder={config.domain === 'Cars' ? "Kyrenia Rent A Car" : "Kyrenia Luxury Estates"}
                                autoFocus
                              />
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <button 
                              onClick={() => setStep(config.domain === 'Cars' ? 'sub_type' : 'domain_select')} 
                              className="flex-1 py-4 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                          >
                              Back
                          </button>
                          <button 
                              onClick={handleFinish}
                              disabled={!config.businessName}
                              className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all shadow-lg"
                          >
                              Open Dashboard
                          </button>
                        </div>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
  );
};

export default BusinessOnboarding;
