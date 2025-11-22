
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Building2, Car, Calendar as CalendarIcon, 
  ShoppingBag, Briefcase, Sparkles, Utensils, 
  Plus, TrendingUp, Users, ChevronRight, 
  Settings, LogOut, MapPin, Check, X, 
  ArrowLeft, ArrowRight, UploadCloud, Zap,
  MessageSquare, RefreshCw, Loader2, Home, Send,
  Layers, FileText, List, Image as ImageIcon, Key, Ruler,
  Trash2, Star
} from 'lucide-react';
import { MarketplaceDomain, UnifiedItem, Listing, Client, Campaign, BusinessConfig } from '../types';
import { StorageService } from '../services/storageService';
import { importPropertyFromUrl } from '../services/geminiService';

interface BusinessDashboardProps {
  onExit: () => void;
}

// --- ONBOARDING TYPES ---
type Step = 'intro' | 'domain_select' | 'sub_type' | 'details' | 'dashboard';

type DashboardModule = 'overview' | 'listings' | 'crm' | 'inbox' | 'bookings' | 'marketing' | 'settings';

// --- FORM TYPES & CONSTANTS ---
type FormTab = 'essentials' | 'specs' | 'legal' | 'amenities' | 'media';

const PROPERTY_TYPES = ['Villa', 'Apartment', 'Penthouse', 'Bungalow', 'Townhouse', 'Land', 'Commercial'];
const RENTAL_TYPES = [
  { id: 'sale', label: 'For Sale' },
  { id: 'short-term', label: 'Daily / Holiday' },
  { id: 'long-term', label: 'Long Term Rental' },
  { id: 'project', label: 'Off-Plan Project' }
];
const FURNISHING_STATUS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
const DEED_TYPES = ['Exchange Title', 'Turkish Title', 'TMD Title', 'Leasehold'];
const AMENITY_OPTIONS = [
  'Swimming Pool', 'Private Garden', 'Sea View', 'Mountain View', 'Garage', 
  'Central Heating', 'Air Conditioning', 'Solar Panels', 'Fireplace', 
  'Gated Community', 'Security 24/7', 'Gym', 'Generator', 'Smart Home',
  'BBQ Area', 'Jacuzzi', 'Elevator', 'White Goods'
];
const LOCATIONS = ['Kyrenia (Girne)', 'Bellapais', 'Catalkoy', 'Esentepe', 'Lapta', 'Alsancak', 'Nicosia (Lefkosa)', 'Famagusta', 'Iskele', 'Bogaz'];

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ onExit }) => {
  const [step, setStep] = useState<Step>('intro');
  const [config, setConfig] = useState<BusinessConfig>({ domain: null, subType: null, businessName: '' });
  const [activeModule, setActiveModule] = useState<DashboardModule>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // State for CRM
  const [clients, setClients] = useState<Client[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Add Property State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<FormTab>('essentials');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newProperty, setNewProperty] = useState<Partial<Listing>>({
    title: '',
    description: '',
    price: 0,
    currency: 'GBP',
    category: 'Apartment',
    rentalType: 'sale',
    location: 'Kyrenia (Girne)',
    bedrooms: 2,
    bathrooms: 1,
    livingRooms: 1,
    squareMeters: 0,
    plotSize: 0,
    buildYear: 2024,
    furnishedStatus: 'Unfurnished',
    titleDeedType: 'Exchange Title',
    vatStatus: 'Not Paid',
    amenities: [],
    imageUrl: '',
    images: []
  });

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [l, c, camp, savedConfig] = await Promise.all([
        StorageService.getListings(),
        StorageService.getClients(),
        StorageService.getCampaigns(),
        StorageService.getBusinessConfig()
      ]);
      
      // Cast UnifiedItems to Listings for dashboard type safety (in real app, we'd filter by domain)
      setListings(l as Listing[]);
      setClients(c);
      setCampaigns(camp);
      
      // If we have a saved config, skip the onboarding wizard
      if (savedConfig && savedConfig.domain) {
        setConfig(savedConfig);
        setStep('dashboard');
      }
      
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleFinishOnboarding = async (finalConfig: BusinessConfig) => {
    setConfig(finalConfig);
    await StorageService.saveBusinessConfig(finalConfig);
    setStep('dashboard');
  };

  const handleImport = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    
    const data = await importPropertyFromUrl(importUrl);
    
    if (data) {
      // Check if we got images
      let importedImages = data.images || [];
      // Fallback logic if no images array but we have an imageUrl? 
      // Usually scraping provides array.

      setNewProperty(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        price: data.price || prev.price,
        currency: data.currency || 'GBP',
        location: data.location || prev.location,
        bedrooms: data.bedrooms || prev.bedrooms,
        bathrooms: data.bathrooms || prev.bathrooms,
        category: data.category || prev.category,
        images: [...(prev.images || []), ...importedImages],
        imageUrl: importedImages.length > 0 ? importedImages[0] : prev.imageUrl
      }));
      
      // Jump to media tab if images found so user can see them
      if (importedImages.length > 0) {
          setActiveFormTab('media');
      }

    } else {
      alert("Could not extract details automatically. Please ensure the URL is valid or fill details manually.");
    }
    
    setIsImporting(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsUploadingImage(true);
          
          // Convert FileList to Array
          const files = Array.from(e.target.files);
          
          // Simulate upload delay for "Real Feel"
          setTimeout(() => {
             const newImageUrls = files.map(file => URL.createObjectURL(file));
             
             setNewProperty(prev => {
                 const updatedImages = [...(prev.images || []), ...newImageUrls];
                 return {
                     ...prev,
                     images: updatedImages,
                     imageUrl: prev.imageUrl || updatedImages[0] // Set cover if empty
                 };
             });
             setIsUploadingImage(false);
          }, 1500);
      }
  };

  const removeImage = (indexToRemove: number) => {
     setNewProperty(prev => {
        const newImages = (prev.images || []).filter((_, idx) => idx !== indexToRemove);
        return {
           ...prev,
           images: newImages,
           // If we removed the cover image, set a new one
           imageUrl: prev.imageUrl === prev.images?.[indexToRemove] ? (newImages[0] || '') : prev.imageUrl
        };
     });
  };

  const setCoverImage = (url: string) => {
     setNewProperty(prev => ({ ...prev, imageUrl: url }));
  };

  const handleSaveProperty = async () => {
    setIsSaving(true);
    const item: any = {
      ...newProperty,
      id: Date.now().toString(),
      domain: config.domain || 'Real Estate',
      tags: ['New', newProperty.rentalType === 'sale' ? 'For Sale' : 'Rental'],
      views: 0,
      leads: 0,
      isBoosted: true
    };
    
    await StorageService.saveListing(item);
    const updated = await StorageService.getListings();
    setListings(updated as Listing[]);
    
    setIsSaving(false);
    setIsAddModalOpen(false);
    
    // Reset Form
    setNewProperty({
        title: '', description: '', price: 0, currency: 'GBP', category: 'Apartment', 
        rentalType: 'sale', location: 'Kyrenia (Girne)', bedrooms: 2, bathrooms: 1, 
        squareMeters: 0, plotSize: 0, furnishedStatus: 'Unfurnished',
        amenities: [], imageUrl: '', images: []
    });
    setActiveFormTab('essentials');
  };

  const toggleAmenity = (amenity: string) => {
    setNewProperty(prev => {
       const current = prev.amenities || [];
       if (current.includes(amenity)) {
          return { ...prev, amenities: current.filter(a => a !== amenity) };
       } else {
          return { ...prev, amenities: [...current, amenity] };
       }
    });
  };

  // --- RENDER HELPERS ---
  const renderTabButton = (id: FormTab, label: string, icon: any) => {
      const isActive = activeFormTab === id;
      const Icon = icon;
      return (
          <button 
            onClick={() => setActiveFormTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
                isActive ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
      );
  };

  if (isLoading) {
     return <div className="min-h-screen flex items-center justify-center text-teal-600"><Loader2 size={40} className="animate-spin"/></div>;
  }

  // 1. ONBOARDING WIZARD
  if (step !== 'dashboard') {
    // ... (Keep Onboarding logic same as previous)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="p-6">
          <button onClick={onExit} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium">
            <ArrowLeft size={20} /> Back to Consumer App
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
           <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
              
              {step === 'intro' && (
                <div className="p-12 text-center">
                   <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Building2 size={32} />
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to Easy Islanders Business</h2>
                   <p className="text-lg text-slate-600 mb-8">
                     The AI-first operating system for island businesses. Manage listings, automate CRM, and reach global travelers.
                   </p>
                   <button onClick={() => setStep('domain_select')} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:scale-105">
                     Get Started
                   </button>
                </div>
              )}

              {step === 'domain_select' && (
                <div className="p-12">
                   <h2 className="text-2xl font-bold text-slate-900 mb-6">What type of business do you run?</h2>
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      {[
                        { id: 'Real Estate', icon: Building2, label: 'Real Estate' },
                        { id: 'Cars', icon: Car, label: 'Car Rental / Sales' },
                        { id: 'Services', icon: Briefcase, label: 'Services' },
                        { id: 'Restaurants', icon: Utensils, label: 'Restaurant' }
                      ].map(d => (
                        <button
                          key={d.id}
                          onClick={() => {
                             setConfig({ ...config, domain: d.id as MarketplaceDomain });
                             setStep('details');
                          }}
                          className="p-6 border border-slate-200 rounded-2xl hover:border-teal-500 hover:bg-teal-50 hover:shadow-md transition-all text-left group"
                        >
                          <d.icon size={32} className="text-slate-400 group-hover:text-teal-600 mb-4" />
                          <div className="font-bold text-slate-900 group-hover:text-teal-800">{d.label}</div>
                        </button>
                      ))}
                   </div>
                   <button onClick={() => setStep('intro')} className="text-slate-400 hover:text-slate-600 text-sm">Back</button>
                </div>
              )}

              {step === 'details' && (
                 <div className="p-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Business Details</h2>
                    <div className="space-y-6 mb-8">
                       <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Business Name</label>
                          <input 
                            type="text" 
                            value={config.businessName}
                            onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="e.g. Kyrenia Luxury Estates"
                          />
                       </div>
                    </div>
                    <div className="flex justify-between items-center">
                       <button onClick={() => setStep('domain_select')} className="text-slate-500 hover:text-slate-700">Back</button>
                       <button 
                          onClick={() => handleFinishOnboarding(config)}
                          disabled={!config.businessName}
                          className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all"
                       >
                          Launch Dashboard
                       </button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  // 2. MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full z-20">
         <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
               <Building2 size={20} className="text-white" />
            </div>
            <div>
               <div className="font-bold text-lg leading-none">{config.businessName}</div>
               <div className="text-xs text-slate-400 mt-1">Business Admin</div>
            </div>
         </div>

         <nav className="space-y-2 flex-1">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { id: 'listings', icon: Home, label: 'Listings' },
              { id: 'crm', icon: Users, label: 'CRM & Leads' },
              { id: 'bookings', icon: CalendarIcon, label: 'Bookings' },
              { id: 'marketing', icon: Send, label: 'Campaigns' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map(item => (
               <button
                 key={item.id}
                 onClick={() => setActiveModule(item.id as DashboardModule)}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeModule === item.id ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <item.icon size={18} />
                 {item.label}
               </button>
            ))}
         </nav>

         <div className="pt-6 border-t border-white/10">
            <button onClick={onExit} className="flex items-center gap-3 text-slate-400 hover:text-white text-sm px-2">
               <LogOut size={16} /> Exit to App
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
         <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
               <div>
                  <h1 className="text-3xl font-bold text-slate-900 capitalize">{activeModule}</h1>
                  <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
               </div>
               
               {activeModule === 'listings' && (
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                  >
                     <Plus size={18} /> Add Property
                  </button>
               )}
            </div>

            {/* OVERVIEW */}
            {activeModule === 'overview' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                     { label: 'Total Listings', value: listings.length, icon: Home, color: 'bg-blue-500' },
                     { label: 'Active Leads', value: '24', icon: Users, color: 'bg-purple-500' },
                     { label: 'Revenue (M)', value: '£12.5k', icon: TrendingUp, color: 'bg-emerald-500' },
                  ].map((stat, idx) => (
                     <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-md`}>
                           <stat.icon size={24} />
                        </div>
                        <div>
                           <div className="text-slate-500 text-sm font-medium">{stat.label}</div>
                           <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {/* LISTINGS */}
            {activeModule === 'listings' && (
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="text-left p-4 font-bold text-slate-600 text-sm">Property</th>
                           <th className="text-left p-4 font-bold text-slate-600 text-sm">Price</th>
                           <th className="text-left p-4 font-bold text-slate-600 text-sm">Status</th>
                           <th className="text-left p-4 font-bold text-slate-600 text-sm">Stats</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {listings.map(listing => (
                           <tr key={listing.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                              <td className="p-4 flex items-center gap-4">
                                 <img src={listing.imageUrl} className="w-16 h-12 rounded-lg object-cover" />
                                 <div>
                                    <div className="font-bold text-slate-900 line-clamp-1">{listing.title}</div>
                                    <div className="text-xs text-slate-500">{listing.location} · {listing.bedrooms} Bed · {listing.squareMeters}m²</div>
                                 </div>
                              </td>
                              <td className="p-4 text-sm font-medium">£{listing.price.toLocaleString()}</td>
                              <td className="p-4">
                                 <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                                    {listing.rentalType}
                                 </span>
                              </td>
                              <td className="p-4 text-xs text-slate-500">
                                 {listing.views || 0} Views
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
            {/* Other modules placeholders can be kept simple */}
         </div>
      </div>

      {/* --- ADD PROPERTY MODAL (Redesigned) --- */}
      {isAddModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl z-10 overflow-hidden flex flex-col h-full max-h-[90vh]">
               
               {/* Modal Header */}
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-white/10 rounded-lg"><Building2 size={20} /></div>
                     <div>
                       <h3 className="text-xl font-bold">Add New Property</h3>
                       <p className="text-xs text-slate-300">Fill in details or use AI import</p>
                     </div>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
               </div>
               
               {/* AI Import Bar */}
               <div className="bg-teal-50 p-4 border-b border-teal-100 flex flex-col md:flex-row gap-3 items-center">
                  <div className="flex items-center gap-2 text-teal-800 font-bold whitespace-nowrap">
                    <Sparkles size={18} /> Quick Import:
                  </div>
                  <div className="flex-1 w-full flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Paste URL from 101evler, Sahibinden, etc..." 
                      className="flex-1 bg-white border border-teal-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                    />
                    <button 
                      onClick={handleImport}
                      disabled={isImporting}
                      className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 shadow-sm hover:bg-teal-700 transition-colors"
                    >
                      {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} 
                      Auto-Fill
                    </button>
                  </div>
               </div>

               {/* Tab Navigation */}
               <div className="px-6 pt-4 bg-white border-b border-slate-100 flex items-end gap-2 overflow-x-auto scrollbar-hide">
                  {renderTabButton('essentials', 'Essentials', Layers)}
                  {renderTabButton('specs', 'Specifications', Ruler)}
                  {renderTabButton('legal', 'Legal & Status', FileText)}
                  {renderTabButton('amenities', 'Amenities', List)}
                  {renderTabButton('media', 'Media', ImageIcon)}
               </div>

               {/* Form Content Area */}
               <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                  <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                     
                     {/* TAB 1: ESSENTIALS */}
                     {activeFormTab === 'essentials' && (
                       <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Title</label>
                                <input 
                                   type="text" 
                                   value={newProperty.title}
                                   onChange={e => setNewProperty({...newProperty, title: e.target.value})}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium" 
                                   placeholder="e.g. Luxury Villa with Infinity Pool"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Market Status</label>
                                <select 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                  value={newProperty.rentalType}
                                  onChange={e => setNewProperty({...newProperty, rentalType: e.target.value as any})}
                                >
                                   {RENTAL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Type</label>
                                <select 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                  value={newProperty.category}
                                  onChange={e => setNewProperty({...newProperty, category: e.target.value})}
                                >
                                   {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Price</label>
                                <div className="relative">
                                   <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                                   <input 
                                      type="number" 
                                      value={newProperty.price}
                                      onChange={e => setNewProperty({...newProperty, price: parseInt(e.target.value)})}
                                      className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold" 
                                   />
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Location</label>
                                <select 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                  value={newProperty.location}
                                  onChange={e => setNewProperty({...newProperty, location: e.target.value})}
                                >
                                   {LOCATIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                             </div>

                             <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                                <textarea 
                                   rows={5}
                                   value={newProperty.description}
                                   onChange={e => setNewProperty({...newProperty, description: e.target.value})}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" 
                                   placeholder="Describe the property highlights..."
                                />
                             </div>
                          </div>
                       </div>
                     )}

                     {/* TAB 2: SPECIFICATIONS */}
                     {activeFormTab === 'specs' && (
                       <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                          <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Interior & Dimensions</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bedrooms</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                   <button onClick={() => setNewProperty({...newProperty, bedrooms: Math.max(0, (newProperty.bedrooms || 0) - 1)})} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-100"><X size={14}/></button>
                                   <span className="flex-1 text-center font-bold">{newProperty.bedrooms}</span>
                                   <button onClick={() => setNewProperty({...newProperty, bedrooms: (newProperty.bedrooms || 0) + 1})} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-teal-600 hover:bg-teal-50"><Plus size={14}/></button>
                                </div>
                             </div>
                             
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bathrooms</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                   <button onClick={() => setNewProperty({...newProperty, bathrooms: Math.max(0, (newProperty.bathrooms || 0) - 1)})} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-100"><X size={14}/></button>
                                   <span className="flex-1 text-center font-bold">{newProperty.bathrooms}</span>
                                   <button onClick={() => setNewProperty({...newProperty, bathrooms: (newProperty.bathrooms || 0) + 1})} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-teal-600 hover:bg-teal-50"><Plus size={14}/></button>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Living Rooms</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                   <button onClick={() => setNewProperty({...newProperty, livingRooms: Math.max(0, (newProperty.livingRooms || 0) - 1)})} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-100"><X size={14}/></button>
                                   <span className="flex-1 text-center font-bold">{newProperty.livingRooms || 1}</span>
                                   <button onClick={() => setNewProperty({...newProperty, livingRooms: (newProperty.livingRooms || 1) + 1})} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-teal-600 hover:bg-teal-50"><Plus size={14}/></button>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Closed Area (m²)</label>
                                <input 
                                   type="number" 
                                   value={newProperty.squareMeters}
                                   onChange={e => setNewProperty({...newProperty, squareMeters: parseInt(e.target.value)})}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono" 
                                />
                             </div>
                             
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Plot (m²)</label>
                                <input 
                                   type="number" 
                                   value={newProperty.plotSize}
                                   onChange={e => setNewProperty({...newProperty, plotSize: parseInt(e.target.value)})}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono" 
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Build Year</label>
                                <input 
                                   type="number" 
                                   value={newProperty.buildYear}
                                   onChange={e => setNewProperty({...newProperty, buildYear: parseInt(e.target.value)})}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono" 
                                />
                             </div>
                          </div>
                       </div>
                     )}

                     {/* TAB 3: LEGAL */}
                     {activeFormTab === 'legal' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Furnishing Status</label>
                                 <div className="space-y-2">
                                    {FURNISHING_STATUS.map(status => (
                                       <div 
                                          key={status}
                                          onClick={() => setNewProperty({...newProperty, furnishedStatus: status as any})}
                                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                             newProperty.furnishedStatus === status ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-200'
                                          }`}
                                       >
                                          <span className="text-sm font-medium">{status}</span>
                                          {newProperty.furnishedStatus === status && <Check size={16} className="text-teal-600" />}
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title Deed Type</label>
                                 <select 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    value={newProperty.titleDeedType}
                                    onChange={e => setNewProperty({...newProperty, titleDeedType: e.target.value as any})}
                                 >
                                    {DEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                                 <p className="text-[10px] text-slate-400 mt-2">Specify the legal status of the land.</p>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* TAB 4: AMENITIES */}
                     {activeFormTab === 'amenities' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {AMENITY_OPTIONS.map(amenity => {
                                 const isSelected = newProperty.amenities?.includes(amenity);
                                 return (
                                    <button
                                       key={amenity}
                                       onClick={() => toggleAmenity(amenity)}
                                       className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                          isSelected 
                                             ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                             : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                       }`}
                                    >
                                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-white' : 'border-slate-300'}`}>
                                          {isSelected && <Check size={12} className="text-slate-900" />}
                                       </div>
                                       <span className="text-sm font-bold">{amenity}</span>
                                    </button>
                                 )
                              })}
                           </div>
                        </div>
                     )}

                     {/* TAB 5: MEDIA (ENHANCED) */}
                     {activeFormTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                           
                           {/* Upload Zone */}
                           <div 
                              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isUploadingImage ? 'bg-teal-50 border-teal-300' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                              onClick={() => fileInputRef.current?.click()}
                           >
                              <input 
                                 type="file" 
                                 ref={fileInputRef}
                                 className="hidden"
                                 accept="image/*"
                                 multiple
                                 onChange={handleImageUpload}
                              />
                              
                              {isUploadingImage ? (
                                 <div className="flex flex-col items-center">
                                    <Loader2 size={40} className="animate-spin text-teal-600 mb-4" />
                                    <p className="font-bold text-teal-800">Optimizing images...</p>
                                 </div>
                              ) : (
                                 <div className="flex flex-col items-center cursor-pointer group">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                       <UploadCloud size={24} className="text-slate-500 group-hover:text-teal-600" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-700">Click to upload photos</p>
                                    <p className="text-sm text-slate-400 mt-1">or drag and drop here (JPG, PNG)</p>
                                 </div>
                              )}
                           </div>

                           {/* Image Grid */}
                           {newProperty.images && newProperty.images.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                                 {newProperty.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                       <img src={img} className="w-full h-full object-cover" />
                                       
                                       {/* Overlay Actions */}
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button 
                                             onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                             className="p-2 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                             title="Remove"
                                          >
                                             <Trash2 size={16} />
                                          </button>
                                          <button 
                                             onClick={(e) => { e.stopPropagation(); setCoverImage(img); }}
                                             className={`p-2 rounded-full transition-colors ${newProperty.imageUrl === img ? 'bg-yellow-400 text-white' : 'bg-white text-slate-400 hover:text-yellow-400'}`}
                                             title="Set as Cover"
                                          >
                                             <Star size={16} className={newProperty.imageUrl === img ? 'fill-white' : ''} />
                                          </button>
                                       </div>

                                       {/* Cover Label */}
                                       {newProperty.imageUrl === img && (
                                          <div className="absolute top-2 left-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded shadow-sm text-slate-900">
                                             Cover
                                          </div>
                                       )}
                                    </div>
                                 ))}
                              </div>
                           )}

                           {(!newProperty.images || newProperty.images.length === 0) && (
                              <div className="text-center py-10 text-slate-400">
                                 <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                 <p>No images uploaded yet.</p>
                              </div>
                           )}
                        </div>
                     )}

                  </div>
               </div>

               {/* Footer Actions */}
               <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center z-20">
                  <button onClick={() => setIsAddModalOpen(false)} className="font-bold text-slate-500 hover:text-slate-800 px-4">Cancel</button>
                  <div className="flex gap-3">
                      {activeFormTab !== 'essentials' && (
                         <button 
                           onClick={() => {
                              if (activeFormTab === 'media') setActiveFormTab('amenities');
                              if (activeFormTab === 'amenities') setActiveFormTab('legal');
                              if (activeFormTab === 'legal') setActiveFormTab('specs');
                              if (activeFormTab === 'specs') setActiveFormTab('essentials');
                           }}
                           className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                         >
                            Back
                         </button>
                      )}
                      {activeFormTab !== 'media' ? (
                         <button 
                           onClick={() => {
                              if (activeFormTab === 'essentials') setActiveFormTab('specs');
                              if (activeFormTab === 'specs') setActiveFormTab('legal');
                              if (activeFormTab === 'legal') setActiveFormTab('amenities');
                              if (activeFormTab === 'amenities') setActiveFormTab('media');
                           }}
                           className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 flex items-center gap-2 shadow-lg"
                         >
                            Next Step <ArrowRight size={18} />
                         </button>
                      ) : (
                         <button 
                            onClick={handleSaveProperty}
                            disabled={isSaving || !newProperty.title}
                            className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 flex items-center gap-2 shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:shadow-none"
                         >
                            {isSaving && <Loader2 size={18} className="animate-spin"/>}
                            Publish Listing
                         </button>
                      )}
                  </div>
               </div>

            </div>
         </div>
      )}
    </div>
  );
};

export default BusinessDashboard;
