
import React, { useState, useEffect } from 'react';
import { Store, UploadCloud, Eye, Check, Palette, LayoutGrid, EyeOff, Layers, Utensils, Music, Info } from 'lucide-react';
import { BusinessConfig, Listing } from '../../../types';
import BusinessStorefront from '../../storefront/BusinessStorefront';
import { StorageService } from '../../../services/storageService';
import ModuleHeader from '../shared/ModuleHeader';

const COLORS = [
  { id: 'teal', label: 'Islander Teal', class: 'bg-teal-600' },
  { id: 'blue', label: 'Ocean Blue', class: 'bg-blue-600' },
  { id: 'purple', label: 'Royal Purple', class: 'bg-purple-600' },
  { id: 'orange', label: 'Sunset Orange', class: 'bg-orange-500' },
  { id: 'slate', label: 'Minimal Slate', class: 'bg-slate-900' },
];

const CUISINES = ['Mediterranean', 'Italian', 'Turkish', 'Steakhouse', 'Seafood', 'Sushi', 'Cafe', 'Bar & Grill'];
const AMBIANCES = ['Romantic', 'Family Friendly', 'Beach Bar', 'Fine Dining', 'Casual', 'Live Music'];

const StorefrontModule: React.FC<{ config: BusinessConfig }> = ({ config }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'inventory'>('branding');
  const [listings, setListings] = useState<Listing[]>([]);
  
  const [storeData, setStoreData] = useState({
     name: config.businessName,
     bio: "Welcome to our official collection on Easy Islanders.",
     coverImage: "https://images.unsplash.com/photo-1512918760532-3ed868d86b5d?q=80&w=2670&auto=format&fit=crop",
     themeColor: 'teal',
     cuisine: 'Mediterranean',
     ambiance: 'Casual'
  });

  // Mock "Visibility" state for listings
  const [hiddenListingIds, setHiddenListingIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
       const data = await StorageService.getListings();
       setListings(data as Listing[]);
    };
    load();
  }, []);

  const toggleVisibility = (id: string) => {
    setHiddenListingIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isPreview) {
     return (
        <div className="animate-in fade-in">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Storefront Preview</h2>
              <button onClick={() => setIsPreview(false)} className="text-slate-500 hover:text-slate-800 font-bold underline">Close Preview</button>
           </div>
           <div className="border-4 border-slate-900 rounded-xl overflow-hidden shadow-2xl">
               {/* Pass filtered listings to preview if component supported it, for now just visual check */}
               <BusinessStorefront config={config} customData={storeData} />
           </div>
        </div>
     );
  }

  return (
     <div className="max-w-4xl mx-auto animate-in fade-in">
        <ModuleHeader 
           title="Storefront Settings" 
           description="Customize your public profile. Choose your brand colors, update your cover photo, and curate which products are visible to customers."
           action={
              <button 
                onClick={() => setIsPreview(true)} 
                className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all"
              >
                 <Eye size={18} /> View Live Store
              </button>
           }
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
           <button 
             onClick={() => setActiveTab('branding')}
             className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'branding' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
              <Palette size={16}/> Branding & Appearance
           </button>
           <button 
             onClick={() => setActiveTab('inventory')}
             className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
              <LayoutGrid size={16}/> Product Visibility
           </button>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
           
           {activeTab === 'branding' && (
             <div className="space-y-8 animate-in fade-in">
                {/* Color Theme */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Brand Theme</label>
                   <div className="flex gap-4">
                      {COLORS.map(color => (
                         <button
                           key={color.id}
                           onClick={() => setStoreData({...storeData, themeColor: color.id})}
                           className={`group relative w-12 h-12 rounded-full ${color.class} flex items-center justify-center transition-transform hover:scale-110 ${storeData.themeColor === color.id ? 'ring-4 ring-offset-2 ring-slate-200 scale-110' : ''}`}
                           title={color.label}
                         >
                            {storeData.themeColor === color.id && <Check size={20} className="text-white" />}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Display Name</label>
                      <input 
                         type="text" 
                         value={storeData.name} 
                         onChange={e => setStoreData({...storeData, name: e.target.value})}
                         className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tagline</label>
                      <input 
                         type="text" 
                         className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                         placeholder="e.g. Best Villas in Kyrenia"
                      />
                   </div>
                </div>

                {/* Restaurant Specifics */}
                {config.domain === 'Restaurants' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-orange-50 rounded-xl border border-orange-100">
                        <div>
                            <label className="block text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-2"><Utensils size={14}/> Cuisine Type</label>
                            <select 
                                className="w-full p-3 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                value={storeData.cuisine}
                                onChange={e => setStoreData({...storeData, cuisine: e.target.value})}
                            >
                                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-2"><Music size={14}/> Ambiance</label>
                            <select 
                                className="w-full p-3 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                value={storeData.ambiance}
                                onChange={e => setStoreData({...storeData, ambiance: e.target.value})}
                            >
                                {AMBIANCES.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bio / Description</label>
                   <textarea 
                      value={storeData.bio} 
                      onChange={e => setStoreData({...storeData, bio: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px] transition-all"
                   />
                </div>

                {/* Cover Photo */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cover Photo</label>
                   <div className="relative aspect-[3/1] rounded-xl overflow-hidden bg-slate-100 group cursor-pointer border-2 border-dashed border-slate-300 hover:border-teal-500 transition-colors">
                      <img src={storeData.coverImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full font-bold text-slate-900 flex items-center gap-2 shadow-lg">
                            <UploadCloud size={18}/> Change Cover
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'inventory' && (
              <div className="space-y-4 animate-in fade-in">
                 <p className="text-sm text-slate-500 mb-4">Toggle the switch to hide products from your storefront without deleting them.</p>
                 {listings.map(item => {
                    const isHidden = hiddenListingIds.includes(item.id);
                    return (
                       <div key={item.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isHidden ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:border-teal-200 hover:shadow-sm'}`}>
                          <div className="flex items-center gap-4">
                             <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-slate-200" />
                             <div>
                                <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                                <div className="text-xs text-slate-500">{item.category} • £{item.price}</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className={`text-xs font-bold ${isHidden ? 'text-slate-400' : 'text-green-600'}`}>
                                {isHidden ? 'Hidden' : 'Visible'}
                             </span>
                             <button 
                               onClick={() => toggleVisibility(item.id)}
                               className={`w-12 h-6 rounded-full relative transition-colors ${isHidden ? 'bg-slate-300' : 'bg-teal-600'}`}
                             >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isHidden ? 'left-1' : 'left-7'}`}></div>
                             </button>
                          </div>
                       </div>
                    )
                 })}
                 {listings.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                       <Layers size={40} className="mx-auto mb-2 opacity-20"/>
                       <p>No listings found.</p>
                    </div>
                 )}
              </div>
           )}

           <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 flex items-center gap-2 transition-all transform hover:scale-105">
                 <Check size={18} /> Save Changes
              </button>
           </div>
        </div>
     </div>
  );
};

export default StorefrontModule;
