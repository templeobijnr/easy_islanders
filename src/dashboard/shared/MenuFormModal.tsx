
import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Utensils, Loader2, Layers, DollarSign, 
    Image as ImageIcon, UploadCloud, Trash2, Star, Tag, 
    Check, Sparkles, AlignLeft, Info
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: any) => Promise<void>;
  initialData?: any;
  isEditMode?: boolean;
}

type FormTab = 'details' | 'dietary' | 'media' | 'import';

const COURSES = ['Starter', 'Main Course', 'Dessert', 'Side', 'Drink', 'Alcohol', 'Special'];
const DIETARY_TAGS = [
    { id: 'veg', label: 'Vegetarian', color: 'bg-green-100 text-green-700' },
    { id: 'vegan', label: 'Vegan', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'gf', label: 'Gluten Free', color: 'bg-orange-100 text-orange-700' },
    { id: 'halal', label: 'Halal', color: 'bg-blue-100 text-blue-700' },
    { id: 'spicy', label: 'Spicy', color: 'bg-red-100 text-red-700' },
    { id: 'nut_free', label: 'Nut Free', color: 'bg-slate-100 text-slate-700' }
];

const MenuFormModal: React.FC<MenuFormModalProps> = ({ isOpen, onClose, onSave, initialData, isEditMode }) => {
  const [activeTab, setActiveTab] = useState<FormTab>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [rawMenuText, setRawMenuText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>(initialData || {
    title: '', description: '', price: 0, currency: 'GBP', 
    category: 'Main Course', dietary: [], ingredients: '',
    stock: 50, status: 'active', images: [], imageUrl: ''
  });

  useEffect(() => {
    if (isOpen) {
        setForm(initialData || {
            title: '', description: '', price: 0, currency: 'GBP', 
            category: 'Main Course', dietary: [], ingredients: '',
            stock: 50, status: 'active', images: [], imageUrl: ''
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

  const toggleDietary = (tagId: string) => {
      setForm((prev: any) => {
          const current = prev.dietary || [];
          if (current.includes(tagId)) {
              return { ...prev, dietary: current.filter((t: string) => t !== tagId) };
          }
          return { ...prev, dietary: [...current, tagId] };
      });
  };

  const handleAiImport = async () => {
      if (!rawMenuText) return;
      setIsAiProcessing(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse this menu item text into JSON. If multiple items, just take the first one. 
            Return format: { title, description, price (number only), category (guess from Starter/Main/Dessert/Drink), dietary (array of strings like 'veg','vegan','gf') }.
            
            Text: "${rawMenuText}"`,
          });
          
          const text = response.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setForm((prev: any) => ({
                  ...prev,
                  title: parsed.title || prev.title,
                  description: parsed.description || prev.description,
                  price: parsed.price || prev.price,
                  category: parsed.category || prev.category,
                  dietary: parsed.dietary || prev.dietary
              }));
              setActiveTab('details');
          }
      } catch (e) {
          console.error("AI Parse failed", e);
          alert("Could not parse text. Please fill manually.");
      } finally {
          setIsAiProcessing(false);
      }
  };

  const handleSave = async () => {
      setIsSaving(true);
      const finalForm = {
          ...form,
          domain: 'Restaurants', // Explicitly tag as Restaurant item
          type: 'menu_item'
      };
      await onSave(finalForm);
      setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20}/></button>

            {/* HEADER */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400 border border-orange-500/30">
                        <Utensils size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{isEditMode ? 'Edit Dish' : 'Add Menu Item'}</h3>
                        <p className="text-xs text-slate-400">Curate your culinary offerings</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-orange-600 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-900/20 transition-all">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <span className="flex items-center gap-2"><Check size={16}/> Save Item</span>}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'details', label: 'Dish Details', icon: AlignLeft },
                    { id: 'dietary', label: 'Dietary & Tags', icon: Tag },
                    { id: 'media', label: 'Photos', icon: ImageIcon },
                    { id: 'import', label: 'AI Import', icon: Sparkles }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as FormTab)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-600 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-white p-8">
                <div className="max-w-xl mx-auto">
                    
                    {activeTab === 'details' && (
                        <div className="space-y-6 animate-in fade-in">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dish Name</label>
                               <input className="w-full p-4 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Truffle Mushroom Risotto" />
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Course / Category</label>
                                   <select 
                                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" 
                                      value={form.category} 
                                      onChange={e => setForm({...form, category: e.target.value})}
                                   >
                                       {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (£)</label>
                                   <div className="relative">
                                       <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                       <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold text-lg" 
                                              value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} />
                                   </div>
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                               <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none h-[100px] focus:ring-2 focus:ring-orange-500 text-sm leading-relaxed resize-none" 
                                         value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the flavors, texture, and key ingredients..." />
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ingredients (Optional)</label>
                               <input className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm" 
                                      value={form.ingredients} onChange={e => setForm({...form, ingredients: e.target.value})} placeholder="e.g. Arborio rice, truffle oil, parmesan..." />
                           </div>
                           
                           <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                               <div>
                                   <div className="font-bold text-slate-900 text-sm">Daily Availability</div>
                                   <div className="text-xs text-slate-500">Is this item in stock for today?</div>
                               </div>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={form.status === 'active'} onChange={(e) => setForm({...form, status: e.target.checked ? 'active' : 'out_of_stock'})} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                               </label>
                           </div>
                        </div>
                    )}

                    {activeTab === 'dietary' && (
                        <div className="space-y-6 animate-in fade-in">
                           <div className="grid grid-cols-2 gap-4">
                               {DIETARY_TAGS.map(tag => {
                                   const isSelected = form.dietary?.includes(tag.id);
                                   return (
                                       <button
                                          key={tag.id}
                                          onClick={() => toggleDietary(tag.id)}
                                          className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${isSelected ? `border-orange-500 ${tag.color} ring-1 ring-orange-500` : 'border-slate-200 hover:border-orange-300 bg-white'}`}
                                       >
                                           <span className="font-bold text-sm">{tag.label}</span>
                                           {isSelected && <Check size={16} />}
                                       </button>
                                   )
                               })}
                           </div>
                           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                               <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5"/>
                               <p className="text-xs text-blue-800 leading-relaxed">
                                   Accurate dietary tags help customers with allergies and preferences find your food faster.
                               </p>
                           </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-all group" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                {isUploading ? <Loader2 size={32} className="animate-spin text-orange-600"/> : <UploadCloud size={40} className="mx-auto text-slate-300 mb-4 group-hover:text-orange-500 transition-colors"/>}
                                <p className="font-bold text-slate-700">Upload Dish Photo</p>
                                <p className="text-xs text-slate-400 mt-1">High quality food photography increases sales by 30%</p>
                            </div>
                            
                            {form.imageUrl && (
                                <div className="relative aspect-video rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                    <img src={form.imageUrl} className="w-full h-full object-cover" />
                                    <button onClick={() => setForm({...form, imageUrl: '', images: []})} className="absolute top-2 right-2 p-2 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 transition-colors">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'import' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-center">
                                <Sparkles size={32} className="mx-auto text-purple-600 mb-3"/>
                                <h3 className="font-bold text-purple-900 mb-2">AI Menu Parser</h3>
                                <p className="text-sm text-purple-700 mb-6">Paste a description of your dish below, and our AI will fill out the details automatically.</p>
                                
                                <textarea 
                                    value={rawMenuText}
                                    onChange={(e) => setRawMenuText(e.target.value)}
                                    className="w-full p-4 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] text-sm bg-white mb-4"
                                    placeholder='e.g. "Spaghetti Carbonara - £14. Classic Italian pasta with pancetta, egg yolk, and pecorino cheese. Contains gluten and dairy."'
                                />
                                
                                <button 
                                    onClick={handleAiImport}
                                    disabled={isAiProcessing || !rawMenuText.trim()}
                                    className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                                >
                                    {isAiProcessing ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>} 
                                    Auto-Fill Details
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

export default MenuFormModal;
