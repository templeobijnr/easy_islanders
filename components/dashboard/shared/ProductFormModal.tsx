
import React, { useState, useRef, useEffect } from 'react';
import { 
    X, ShoppingBag, Loader2, Layers, DollarSign, 
    Image as ImageIcon, UploadCloud, Trash2, Star, Tag, 
    Box, ArrowLeft, Check, Archive
} from 'lucide-react';
import { Product } from '../../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => Promise<void>;
  initialData?: Product;
  isEditMode?: boolean;
}

type FormTab = 'essentials' | 'inventory' | 'media';

// EXPANDED CATEGORIES as requested
const PRODUCT_CATEGORIES = [
  { label: 'Electronics & Appliances', options: ['Televisions', 'Refrigerators', 'Microwaves', 'Fans', 'Air Conditioners', 'Laptops', 'Phones', 'Audio', 'Smart Home'] },
  { label: 'Fashion', options: ['Fashion Accessories', 'Men\'s Clothing', 'Women\'s Clothing', 'Kids', 'Shoes', 'Jewelry', 'Watches', 'Bags'] },
  { label: 'Home & Garden', options: ['Furniture', 'Decor', 'Kitchenware', 'Bedding', 'Lighting', 'Garden Tools', 'Plants'] },
  { label: 'Beauty & Health', options: ['Skincare', 'Makeup', 'Fragrance', 'Hair Care', 'Supplements'] },
  { label: 'Sports & Outdoors', options: ['Gym Equipment', 'Camping', 'Cycling', 'Water Sports', 'Team Sports'] },
  { label: 'Toys & Hobbies', options: ['Board Games', 'Action Figures', 'Arts & Crafts', 'Musical Instruments'] },
  { label: 'Pets', options: ['Pet Food', 'Pet Accessories', 'Grooming'] }
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Refurbished'];

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, initialData, isEditMode }) => {
  const [activeFormTab, setActiveFormTab] = useState<FormTab>('essentials');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>(initialData || {
    title: '', description: '', price: 0, currency: 'GBP', 
    category: 'Electronics & Appliances', subCategory: 'Televisions', condition: 'New', 
    stock: 1, sku: '', location: 'Kyrenia', status: 'active',
    images: [], imageUrl: ''
  });

  useEffect(() => {
    if (isOpen) {
        setForm(initialData || {
            title: '', description: '', price: 0, currency: 'GBP', 
            category: 'Electronics & Appliances', subCategory: 'Televisions', condition: 'New', 
            stock: 1, sku: '', location: 'Kyrenia', status: 'active',
            images: [], imageUrl: ''
        });
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
          domain: 'Marketplace',
          title: form.title || 'Untitled Product'
      };
      await onSave(finalForm);
      setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20}/></button>

            {/* HEADER */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Product' : 'Add Product'}</h3>
                        <p className="text-xs text-slate-500">Manage your retail inventory</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-800 shadow-lg">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <span className="flex items-center gap-2"><Check size={16}/> Save Product</span>}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="px-6 pt-2 bg-white border-b border-slate-100 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'essentials', label: 'Product Details', icon: Layers },
                    { id: 'inventory', label: 'Inventory & Stock', icon: Box },
                    { id: 'media', label: 'Photos', icon: ImageIcon }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveFormTab(tab.id as FormTab)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeFormTab === tab.id ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    
                    {activeFormTab === 'essentials' && (
                        <div className="space-y-6 animate-in fade-in">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Title</label>
                               <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-teal-500" 
                                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Samsung 55' 4K Smart TV" />
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                   <select 
                                      className="w-full p-3 border border-slate-200 rounded-xl outline-none" 
                                      value={form.category} 
                                      onChange={e => setForm({...form, category: e.target.value, subCategory: PRODUCT_CATEGORIES.find(c => c.label === e.target.value)?.options[0]})}
                                   >
                                       {PRODUCT_CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sub-Category</label>
                                   <select 
                                      className="w-full p-3 border border-slate-200 rounded-xl outline-none" 
                                      value={form.subCategory} 
                                      onChange={e => setForm({...form, subCategory: e.target.value})}
                                   >
                                       {PRODUCT_CATEGORIES.find(c => c.label === form.category)?.options.map(opt => (
                                           <option key={opt} value={opt}>{opt}</option>
                                       ))}
                                   </select>
                               </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (£)</label>
                                   <div className="relative">
                                       <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                       <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold" 
                                              value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} />
                                   </div>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condition</label>
                                   <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                                       {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                               <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none h-32 focus:ring-2 focus:ring-teal-500" 
                                         value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Product features, specs, condition details..." />
                           </div>
                        </div>
                    )}

                    {activeFormTab === 'inventory' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Quantity</label>
                               <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU / Item ID</label>
                               <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-mono uppercase" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="e.g. TV-SAM-55" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location / Warehouse</label>
                               <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                               <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                   <option value="active">Active</option>
                                   <option value="draft">Draft</option>
                                   <option value="out_of_stock">Out of Stock</option>
                               </select>
                           </div>
                        </div>
                    )}

                    {activeFormTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-teal-50 hover:border-teal-300 transition-all" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                {isUploading ? <div className="flex flex-col items-center"><Loader2 size={40} className="animate-spin text-teal-600"/></div> : <><UploadCloud size={48} className="mx-auto text-slate-300 mb-4"/><p className="font-bold text-slate-700">Upload Product Photos</p></>}
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

export default ProductFormModal;
