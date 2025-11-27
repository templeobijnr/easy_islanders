
import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Briefcase, Loader2, Layers, DollarSign, 
    Image as ImageIcon, UploadCloud, Check, MapPin, 
    Clock, Wrench, Shield, User, Settings
} from 'lucide-react';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: any) => Promise<void>;
  initialData?: any;
  isEditMode?: boolean;
}

type FormTab = 'details' | 'pricing' | 'media' | 'area';

// Expanded Categories Map
const SERVICE_CATEGORIES: Record<string, string[]> = {
  "Home Maintenance": ["Plumbing", "Electrician", "Repair", "Handyman", "HVAC"],
  "Construction & Renovation": ["Renovation", "Construction", "Architecture", "Project Consulting", "Painting"],
  "Outdoors": ["Gardening", "Landscape", "Pool Maintenance", "Pest Control"],
  "Cleaning Services": ["House Cleaning", "Deep Cleaning", "Window Cleaning", "Carpet Cleaning"],
  "Care Services": ["Elderly Care", "Baby Care", "Nanny", "Pet Services", "Dog Walking"],
  "Events & Lifestyle": ["Weddings", "Event Planning", "Catering", "Photography", "DJ/Music"],
  "Vehicle Services": ["Mechanic", "Car Wash", "Detailing", "Tire Service"],
  "Professional": ["Digital Services", "Legal", "Accounting", "Translation"],
  "Specialized": ["Textile & Handicrafts", "Security", "Tailoring"]
};

const ServiceFormModal: React.FC<ServiceFormModalProps> = ({ isOpen, onClose, onSave, initialData, isEditMode }) => {
  const [activeTab, setActiveTab] = useState<FormTab>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>(initialData || {
    title: '', description: '', price: 50, currency: 'GBP', 
    category: 'Home Maintenance', subCategory: 'Plumbing', 
    pricingModel: 'hourly', durationMinutes: 60,
    providerName: '', location: 'Kyrenia', serviceArea: ['Kyrenia'],
    status: 'active', images: [], imageUrl: ''
  });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
        setForm(initialData || {
            title: '', description: '', price: 50, currency: 'GBP', 
            category: 'Home Maintenance', subCategory: 'Plumbing', 
            pricingModel: 'hourly', durationMinutes: 60,
            providerName: '', location: 'Kyrenia', serviceArea: ['Kyrenia'],
            status: 'active', images: [], imageUrl: ''
        });
        setActiveTab('details');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setIsUploading(true);
        const files = Array.from(e.target.files);
        setTimeout(() => {
            const newUrls = files.map(f => URL.createObjectURL(f));
            setForm((prev: any) => ({
                ...prev,
                images: [...(prev.images || []), ...newUrls],
                imageUrl: prev.imageUrl || newUrls[0]
            }));
            setIsUploading(false);
        }, 1000);
    }
  };

  const handleSave = async () => {
      setIsSaving(true);
      const finalForm = {
          ...form,
          domain: 'Services'
      };
      await onSave(finalForm);
      setIsSaving(false);
  };

  const toggleServiceArea = (area: string) => {
      setForm((prev: any) => {
          const current = prev.serviceArea || [];
          if (current.includes(area)) {
              return { ...prev, serviceArea: current.filter((a: string) => a !== area) };
          }
          return { ...prev, serviceArea: [...current, area] };
      });
  };

  const availableSubCategories = SERVICE_CATEGORIES[form.category] || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20}/></button>

            {/* HEADER */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{isEditMode ? 'Edit Service' : 'Add New Service'}</h3>
                        <p className="text-xs text-slate-400">Offer your skills to the island</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <span className="flex items-center gap-2"><Check size={16}/> Save Service</span>}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'details', label: 'Service Info', icon: Wrench },
                    { id: 'pricing', label: 'Pricing & Time', icon: DollarSign },
                    { id: 'area', label: 'Service Area', icon: MapPin },
                    { id: 'media', label: 'Portfolio', icon: ImageIcon }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as FormTab)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-white p-8">
                <div className="max-w-2xl mx-auto">
                    
                    {activeTab === 'details' && (
                        <div className="space-y-6 animate-in fade-in">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Title</label>
                               <input className="w-full p-4 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Emergency Plumbing Service" />
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Main Category</label>
                                   <select 
                                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                      value={form.category} 
                                      onChange={e => setForm({...form, category: e.target.value, subCategory: SERVICE_CATEGORIES[e.target.value]?.[0] || ''})}
                                   >
                                       {Object.keys(SERVICE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialty (Sub-category)</label>
                                   <select 
                                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                      value={form.subCategory} 
                                      onChange={e => setForm({...form, subCategory: e.target.value})}
                                   >
                                       {availableSubCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description of Work</label>
                               <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none h-[120px] focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed resize-none" 
                                         value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe what you do, your experience, and what tools you bring..." />
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Provider Name / Company</label>
                               <div className="relative">
                                   <User className="absolute left-3 top-3 text-slate-400" size={18}/>
                                   <input className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none text-sm" 
                                      value={form.providerName} onChange={e => setForm({...form, providerName: e.target.value})} placeholder="e.g. FixIt Fast Ltd." />
                               </div>
                           </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-6 animate-in fade-in">
                           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Pricing Model</label>
                               <div className="grid grid-cols-3 gap-4 mb-6">
                                   {['hourly', 'fixed', 'quote'].map(model => (
                                       <button
                                          key={model}
                                          onClick={() => setForm({...form, pricingModel: model})}
                                          className={`p-4 rounded-xl border text-center capitalize font-bold text-sm transition-all ${form.pricingModel === model ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                                       >
                                           {model === 'quote' ? 'On Request' : model}
                                       </button>
                                   ))}
                               </div>

                               {form.pricingModel !== 'quote' && (
                                   <div className="grid grid-cols-2 gap-6">
                                       <div>
                                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rate Amount</label>
                                           <div className="relative">
                                               <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                               <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-lg" 
                                                      value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} />
                                           </div>
                                       </div>
                                       <div>
                                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                                           <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                                              <option value="GBP">GBP (£)</option>
                                              <option value="EUR">EUR (€)</option>
                                              <option value="USD">USD ($)</option>
                                              <option value="TRY">TRY (₺)</option>
                                           </select>
                                       </div>
                                   </div>
                               )}
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estimated Duration (Minutes)</label>
                               <div className="relative">
                                   <Clock className="absolute left-3 top-3 text-slate-400" size={18}/>
                                   <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none" 
                                          value={form.durationMinutes} onChange={e => setForm({...form, durationMinutes: parseInt(e.target.value)})} />
                                   <p className="text-xs text-slate-400 mt-1 ml-1">Typical time to complete job (use 60 for 1 hour services)</p>
                               </div>
                           </div>
                        </div>
                    )}

                    {activeTab === 'area' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Primary Location Base</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-400" size={18}/>
                                    <input className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none" 
                                           value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Kyrenia" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Service Areas Covered</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['Kyrenia', 'Nicosia', 'Famagusta', 'Iskele', 'Guzelyurt', 'Lefke', 'Alsancak', 'Lapta', 'Esentepe'].map(area => {
                                        const isSelected = form.serviceArea?.includes(area);
                                        return (
                                            <button 
                                                key={area} 
                                                onClick={() => toggleServiceArea(area)}
                                                className={`p-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-between ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                {area}
                                                {isSelected && <Check size={14} />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                {isUploading ? <Loader2 size={32} className="animate-spin text-blue-600"/> : <UploadCloud size={40} className="mx-auto text-slate-300 mb-4 group-hover:text-blue-500 transition-colors"/>}
                                <p className="font-bold text-slate-700">Upload Work Portfolio</p>
                                <p className="text-xs text-slate-400 mt-1">Show before/after photos or your team in action.</p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {form.images?.map((img: string, idx: number) => (
                                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity cursor-pointer" onClick={() => setForm({...form, imageUrl: img})}>
                                            {form.imageUrl === img ? <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">Cover</span> : <span className="bg-white text-slate-900 px-2 py-1 rounded text-xs font-bold">Set Cover</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    </div>
  );
};

export default ServiceFormModal;
