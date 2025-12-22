
import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Calendar, MapPin, Clock, Users, Ticket, Video, 
    Image as ImageIcon, UploadCloud, Check, DollarSign, 
    Share2, Globe, Instagram, Megaphone, Loader2, ArrowLeft
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: any) => Promise<void>;
  initialData?: any;
  isEditMode?: boolean;
}

type FormTab = 'essentials' | 'media' | 'logistics' | 'tickets' | 'marketing';

const EVENT_TYPES = ['Concert', 'Party', 'Festival', 'Networking', 'Cultural', 'Workshop', 'Dinner Show', 'Sports'];

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialData, isEditMode }) => {
  const [activeTab, setActiveTab] = useState<FormTab>('essentials');
  const [isSaving, setIsSaving] = useState(false);
  
  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video Upload State
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>(initialData || {
    title: '', description: '', eventType: 'Party', 
    date: '', startTime: '20:00', endTime: '02:00', setupTime: '16:00',
    venue: '', capacity: 200, 
    price: 20, currency: 'GBP', billingType: 'pre-paid',
    videoUrl: '', uploadedVideo: '', imageUrl: '', images: [],
    promotionChannels: { app: true, social: false, agents: true },
    status: 'active'
  });

  useEffect(() => {
    if (isOpen) {
        setForm(initialData || {
            title: '', description: '', eventType: 'Party', 
            date: '', startTime: '20:00', endTime: '02:00', setupTime: '16:00',
            venue: '', capacity: 200, 
            price: 20, currency: 'GBP', billingType: 'pre-paid',
            videoUrl: '', uploadedVideo: '', imageUrl: '', images: [],
            promotionChannels: { app: true, social: false, agents: true },
            status: 'active'
        });
        setActiveTab('essentials');
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setIsVideoUploading(true);
        const file = e.target.files[0];
        // Simulate upload delay
        setTimeout(() => {
            const videoUrl = URL.createObjectURL(file);
            setForm((prev: any) => ({
                ...prev,
                uploadedVideo: videoUrl,
                videoUrl: '' // Clear external link if uploading file
            }));
            setIsVideoUploading(false);
        }, 2000);
    }
  };

  const removeVideo = (e: React.MouseEvent) => {
      e.stopPropagation();
      setForm((prev: any) => ({ ...prev, uploadedVideo: '' }));
      if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSave = async () => {
      setIsSaving(true);
      const finalForm = {
          ...form,
          domain: 'Events',
          ticketsAvailable: form.capacity, // Reset availability on save for now
          totalTickets: form.capacity
      };
      await onSave(finalForm);
      setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20}/></button>

            {/* HEADER */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/30">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{isEditMode ? 'Edit Event' : 'Create New Event'}</h3>
                        <p className="text-xs text-slate-400">Manage details, ticketing, and promotion</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-900/20 transition-all">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <span className="flex items-center gap-2"><Check size={16}/> Publish Event</span>}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'essentials', label: 'The Hype', icon: Megaphone },
                    { id: 'media', label: 'Media & Video', icon: ImageIcon },
                    { id: 'logistics', label: 'Logistics', icon: MapPin },
                    { id: 'tickets', label: 'Box Office', icon: Ticket },
                    { id: 'marketing', label: 'Marketing', icon: Share2 }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as FormTab)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-white p-8">
                <div className="max-w-3xl mx-auto">
                    
                    {/* TAB 1: ESSENTIALS */}
                    {activeTab === 'essentials' && (
                        <div className="space-y-6 animate-in fade-in">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Name</label>
                               <input className="w-full p-4 border border-slate-200 rounded-xl font-bold text-xl outline-none focus:ring-2 focus:ring-purple-500" 
                                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Neon Sunset Party" />
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                   <select 
                                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" 
                                      value={form.eventType} 
                                      onChange={e => setForm({...form, eventType: e.target.value})}
                                   >
                                       {EVENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description & Lineup</label>
                                   <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none h-[120px] focus:ring-2 focus:ring-purple-500 text-sm leading-relaxed resize-none" 
                                             value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the vibe, lineup, and what to expect..." />
                               </div>
                           </div>
                        </div>
                    )}

                    {/* TAB 2: MEDIA (NEW) */}
                    {activeTab === 'media' && (
                        <div className="space-y-8 animate-in fade-in">
                           {/* VIDEO UPLOAD SECTION */}
                           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                               <label className="block text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                   <Video size={18} className="text-purple-600"/> Event Teaser / Promo Video
                               </label>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   {/* File Upload */}
                                   <div 
                                       className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3 transition-all ${form.uploadedVideo ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50'}`}
                                       onClick={() => !form.uploadedVideo && videoInputRef.current?.click()}
                                   >
                                       <input type="file" ref={videoInputRef} className="hidden" accept="video/mp4,video/mov" onChange={handleVideoUpload} />
                                       {isVideoUploading ? (
                                           <Loader2 size={32} className="animate-spin text-purple-600"/>
                                       ) : form.uploadedVideo ? (
                                           <>
                                              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1">
                                                 <Check size={24} />
                                              </div>
                                              <span className="text-sm font-bold text-green-700">Video Uploaded Successfully</span>
                                              <button 
                                                 onClick={removeVideo}
                                                 className="mt-2 px-4 py-2 bg-white border border-red-100 text-red-600 text-xs font-bold rounded-full hover:bg-red-50 shadow-sm"
                                              >
                                                 Remove Video
                                              </button>
                                           </>
                                       ) : (
                                           <>
                                              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-1">
                                                 <UploadCloud size={24}/>
                                              </div>
                                              <span className="text-sm font-bold text-slate-700">Upload Video File</span>
                                              <span className="text-xs text-slate-400">MP4 or MOV (Max 50MB)</span>
                                           </>
                                       )}
                                   </div>

                                   {/* External Link */}
                                   <div className="flex flex-col justify-center space-y-4">
                                       <div className="relative">
                                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                               <Globe size={16} className="text-slate-400"/>
                                           </div>
                                           <input 
                                               className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400" 
                                               value={form.videoUrl} 
                                               onChange={e => setForm({...form, videoUrl: e.target.value, uploadedVideo: ''})} 
                                               placeholder="Or paste YouTube/Vimeo Link"
                                               disabled={!!form.uploadedVideo}
                                           />
                                       </div>
                                       
                                       {/* Preview Player */}
                                       <div className="rounded-xl overflow-hidden bg-black aspect-video relative shadow-md border border-slate-200 flex items-center justify-center">
                                           {(form.uploadedVideo || form.videoUrl) ? (
                                               form.uploadedVideo ? (
                                                   <video src={form.uploadedVideo} controls className="w-full h-full object-contain" />
                                               ) : (
                                                   <div className="text-center text-white p-4">
                                                       <Video size={24} className="mx-auto mb-2 opacity-80"/>
                                                       <p className="text-xs">External Video Linked</p>
                                                   </div>
                                               )
                                           ) : (
                                               <div className="text-center text-slate-500">
                                                   <p className="text-xs font-medium">No Video Selected</p>
                                               </div>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           </div>

                           {/* Image Upload */}
                           <div>
                              <label className="block text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                 <ImageIcon size={18} className="text-purple-600"/> Cover Image / Flyer
                              </label>
                              <div className="grid grid-cols-3 gap-4">
                                 <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all flex flex-col items-center justify-center h-32" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    {isUploading ? <Loader2 size={24} className="animate-spin text-purple-600"/> : <UploadCloud size={24} className="text-slate-400 mb-2"/>}
                                    <span className="text-xs text-slate-500 font-bold">Add Photos</span>
                                 </div>
                                 {form.images.map((img: string, i: number) => (
                                    <div key={i} className="relative rounded-xl overflow-hidden h-32 border border-slate-200 group">
                                       <img src={img} className="w-full h-full object-cover" />
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => setForm({...form, imageUrl: img})}>
                                          {form.imageUrl === img ? <Check className="text-white"/> : <span className="text-white text-xs font-bold">Set Cover</span>}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                    )}

                    {/* TAB 3: LOGISTICS */}
                    {activeTab === 'logistics' && (
                        <div className="space-y-8 animate-in fade-in">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="col-span-2">
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Venue / Location</label>
                                   <div className="relative">
                                       <MapPin className="absolute left-3 top-3 text-slate-400" size={18}/>
                                       <input className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" 
                                              value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} placeholder="e.g. Kyrenia Amphitheatre" />
                                   </div>
                               </div>
                               
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Date</label>
                                   <input type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" 
                                          value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                               </div>
                               
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Capacity</label>
                                   <div className="relative">
                                       <Users className="absolute left-3 top-3 text-slate-400" size={18}/>
                                       <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" 
                                              value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} />
                                   </div>
                               </div>
                           </div>

                           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock size={18}/> Schedule</h4>
                              <div className="grid grid-cols-3 gap-4">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setup Time</label>
                                     <input type="time" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm" 
                                            value={form.setupTime} onChange={e => setForm({...form, setupTime: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                                     <input type="time" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm font-bold" 
                                            value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                                     <input type="time" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm" 
                                            value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
                                 </div>
                              </div>
                           </div>
                        </div>
                    )}

                    {/* TAB 4: TICKETS */}
                    {activeTab === 'tickets' && (
                        <div className="space-y-8 animate-in fade-in">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ticket Price</label>
                                   <div className="relative">
                                       <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                       <input type="number" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold text-lg" 
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

                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Billing Method</label>
                               <div className="grid grid-cols-3 gap-4">
                                  {['pre-paid', 'pay-at-door', 'free'].map(method => (
                                     <button 
                                       key={method}
                                       onClick={() => setForm({...form, billingType: method})}
                                       className={`p-4 border rounded-xl text-sm font-bold capitalize transition-all ${form.billingType === method ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-purple-200'}`}
                                     >
                                        {method.replace('-', ' ')}
                                     </button>
                                  ))}
                               </div>
                           </div>

                           <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl">
                              <h4 className="font-bold text-purple-900 mb-2">Estimated Revenue</h4>
                              <div className="text-3xl font-bold text-purple-700">
                                 {form.currency === 'GBP' ? '£' : form.currency}
                                 {formatNumber(
                                    typeof form.price === 'number' && typeof form.capacity === 'number'
                                      ? form.price * form.capacity
                                      : null
                                 )}
                              </div>
                              <p className="text-xs text-purple-600 mt-1">Based on {form.capacity} attendees at full capacity.</p>
                           </div>
                        </div>
                    )}

                    {/* TAB 5: MARKETING */}
                    {activeTab === 'marketing' && (
                        <div className="space-y-8 animate-in fade-in">
                           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                              <h4 className="font-bold text-slate-900 mb-4">Distribution Channels</h4>
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                       <div className="p-2 bg-white rounded-lg shadow-sm"><Globe size={18} className="text-blue-500"/></div>
                                       <span className="text-sm font-bold text-slate-700">Easy Islanders App</span>
                                    </div>
                                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                       <input type="checkbox" checked={form.promotionChannels.app} readOnly className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                       <label className="toggle-label block overflow-hidden h-6 rounded-full bg-green-400 cursor-pointer"></label>
                                    </div>
                                 </div>

                                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                       <div className="p-2 bg-white rounded-lg shadow-sm"><Instagram size={18} className="text-pink-500"/></div>
                                       <span className="text-sm font-bold text-slate-700">Push to Social Media</span>
                                    </div>
                                    <button 
                                       onClick={() => setForm({...form, promotionChannels: {...form.promotionChannels, social: !form.promotionChannels.social}})}
                                       className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${form.promotionChannels.social ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                                    >
                                       {form.promotionChannels.social ? 'Active' : 'Enable'}
                                    </button>
                                 </div>

                                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                       <div className="p-2 bg-white rounded-lg shadow-sm"><Users size={18} className="text-orange-500"/></div>
                                       <span className="text-sm font-bold text-slate-700">Agent Network Broadcast</span>
                                    </div>
                                    <button 
                                       onClick={() => setForm({...form, promotionChannels: {...form.promotionChannels, agents: !form.promotionChannels.agents}})}
                                       className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${form.promotionChannels.agents ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                                    >
                                       {form.promotionChannels.agents ? 'Active' : 'Enable'}
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    </div>
  );
};

export default EventFormModal;
