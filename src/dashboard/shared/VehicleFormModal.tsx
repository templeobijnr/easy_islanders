
import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Car, Loader2, Layers, Gauge, DollarSign, 
    Image as ImageIcon, UploadCloud, Trash2, Star, MapPin, 
    ArrowLeft, Check, Zap
} from 'lucide-react';
import { Vehicle } from '../../../types';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: any) => Promise<void>;
  initialData?: Vehicle;
  isEditMode?: boolean;
  initialView?: 'overview' | 'edit';
}

type FormTab = 'essentials' | 'specs' | 'features' | 'media';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Van', 'Truck', 'Luxury'];
const TRANSMISSIONS = ['Automatic', 'Manual', 'Tiptronic'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const MAKES = ['Mercedes', 'BMW', 'Audi', 'Ford', 'Toyota', 'Honda', 'Land Rover', 'Volkswagen', 'Nissan', 'Hyundai'];
const FEATURES_LIST = ['Air Conditioning', 'Bluetooth', 'Navigation', 'Leather Seats', 'Parking Sensors', 'Reverse Camera', 'Sunroof', 'Cruise Control', 'Apple CarPlay', 'Heated Seats'];

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ isOpen, onClose, onSave, initialData, isEditMode, initialView = 'overview' }) => {
  const [viewMode, setViewMode] = useState<'overview' | 'edit'>(!isEditMode ? 'edit' : initialView);
  const [activeFormTab, setActiveFormTab] = useState<FormTab>('essentials');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>(initialData || {
    title: '', description: '', price: 0, currency: 'GBP', 
    type: 'rental', make: 'Mercedes', model: '', year: 2024,
    transmission: 'Automatic', fuelType: 'Diesel', seats: 5,
    features: [], imageUrl: '', images: [], location: 'Kyrenia',
    mileage: 0, status: 'active'
  });

  useEffect(() => {
    if (isOpen) {
        setViewMode(!isEditMode ? 'edit' : initialView);
        setForm(initialData || {
            title: '', description: '', price: 0, currency: 'GBP', 
            type: 'rental', make: 'Mercedes', model: '', year: 2024,
            transmission: 'Automatic', fuelType: 'Diesel', seats: 5,
            features: [], imageUrl: '', images: [], location: 'Kyrenia',
            mileage: 0, status: 'active'
        });
    }
  }, [isOpen, initialData, initialView, isEditMode]);

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
      // Generate a title if empty based on Make/Model
      const finalForm = {
          ...form,
          title: form.title || `${form.year} ${form.make} ${form.model}`,
          domain: 'Cars'
      };
      await onSave(finalForm);
      setIsSaving(false);
  };

  const toggleFeature = (feature: string) => {
      setForm((prev: any) => {
          const current = prev.features || [];
          if (current.includes(feature)) {
              return { ...prev, features: current.filter((f: string) => f !== feature) };
          }
          return { ...prev, features: [...current, feature] };
      });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl z-10 overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-200 relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20}/></button>

            {/* EDIT HEADER */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    {viewMode === 'edit' && isEditMode && (
                        <button onClick={() => setViewMode('overview')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                    )}
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
                        <p className="text-xs text-slate-500">{form.type === 'rental' ? 'Manage Fleet Details' : 'Manage Inventory'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <span className="flex items-center gap-2"><Check size={16}/> Save Vehicle</span>}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="px-6 pt-2 bg-white border-b border-slate-100 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'essentials', label: 'Vehicle Info', icon: Car },
                    { id: 'specs', label: 'Specifications', icon: Gauge },
                    { id: 'features', label: 'Features', icon: Zap },
                    { id: 'media', label: 'Photos', icon: ImageIcon }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveFormTab(tab.id as FormTab)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeFormTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    
                    {activeFormTab === 'essentials' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                           <div className="col-span-2">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Listing Title</label>
                               <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Mercedes C-Class AMG Line" />
                           </div>
                           
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Model</label>
                               <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                   <button onClick={() => setForm({...form, type: 'rental'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.type === 'rental' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Rental</button>
                                   <button onClick={() => setForm({...form, type: 'sale'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.type === 'sale' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>For Sale</button>
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{form.type === 'rental' ? 'Daily Rate (£)' : 'Sale Price (£)'}</label>
                               <div className="relative">
                                   <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                   <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold" 
                                          value={form.price} onChange={e => setForm({...form, price: parseInt(e.target.value)})} />
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Make</label>
                               <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.make} onChange={e => setForm({...form, make: e.target.value})}>
                                   {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                               </select>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
                               <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="e.g. C200" />
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Year</label>
                               <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
                           </div>
                           
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                               <div className="relative">
                                   <MapPin className="absolute left-3 top-3 text-slate-400" size={18}/>
                                   <input type="text" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                               </div>
                           </div>
                        </div>
                    )}

                    {activeFormTab === 'specs' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transmission</label>
                               <div className="grid grid-cols-3 gap-2">
                                   {TRANSMISSIONS.map(t => (
                                       <button key={t} onClick={() => setForm({...form, transmission: t})} className={`py-3 px-2 text-xs font-bold rounded-xl border transition-all ${form.transmission === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                           {t}
                                       </button>
                                   ))}
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuel Type</label>
                               <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                                   {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                               </select>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Body Type</label>
                               <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                   {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                               </select>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seats</label>
                               <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.seats} onChange={e => setForm({...form, seats: parseInt(e.target.value)})} />
                           </div>
                           
                           {form.type === 'sale' && (
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mileage (km)</label>
                                   <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.mileage} onChange={e => setForm({...form, mileage: parseInt(e.target.value)})} />
                               </div>
                           )}
                        </div>
                    )}

                    {activeFormTab === 'features' && (
                        <div className="animate-in fade-in">
                            <h4 className="font-bold text-slate-900 mb-4">Select Features</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {FEATURES_LIST.map(feat => {
                                    const isSelected = form.features?.includes(feat);
                                    return (
                                        <button key={feat} onClick={() => toggleFeature(feat)} className={`p-3 rounded-xl text-left text-sm font-medium border flex items-center gap-2 ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-white' : 'border-slate-300'}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                                            {feat}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {activeFormTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                {isUploading ? <div className="flex flex-col items-center"><Loader2 size={40} className="animate-spin text-blue-600"/></div> : <><UploadCloud size={48} className="mx-auto text-slate-300 mb-4"/><p className="font-bold text-slate-700">Upload Photos</p></>}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {form.images?.map((img: string, idx: number) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                            <button onClick={() => setForm((prev: any) => ({...prev, images: prev.images?.filter((_: any, i: number) => i !== idx)}))} className="p-2 bg-white text-red-500 rounded-full"><Trash2 size={16}/></button>
                                            <button onClick={() => setForm((prev: any) => ({...prev, imageUrl: img}))} className={`p-2 rounded-full ${form.imageUrl === img ? 'bg-yellow-400 text-white' : 'bg-white text-slate-400'}`}><Star size={16}/></button>
                                        </div>
                                        {form.imageUrl === img && <div className="absolute top-2 left-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded text-slate-900">Cover</div>}
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

export default VehicleFormModal;
