
import React, { useState, useEffect } from 'react';
import { X, Share, Minus, Plus, MapPin, Check, ShieldCheck, Trophy, MessageCircle, CreditCard, Lock, Loader2, User, Phone, Mail, Car, Utensils, Wine, Compass, ArrowRight, Bitcoin, Copy, Sparkles } from 'lucide-react';
import { Listing, UnifiedItem, UpsellService, UserDetails, Booking } from '../../types';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, isPriceValid } from '../../utils/formatters';

interface BookingModalProps {
   listing: Listing | UnifiedItem;
   onClose: () => void;
}

const UPSELL_OPTIONS: UpsellService[] = [
   { id: 'taxi', label: 'Airport Taxi Transfer', description: 'Luxury Mercedes V-Class from Ercan', price: 50, iconName: 'Car', selected: false },
   { id: 'food', label: 'Welcome Food Hamper', description: 'Local wine, cheese, fruits & bread', price: 35, iconName: 'Utensils', selected: false },
   { id: 'tour', label: 'Kyrenia Boat Tour', description: 'Sunset cruise with dinner included', price: 45, iconName: 'Compass', selected: false },
   { id: 'wine', label: 'Wine Tasting', description: 'Visit to Gillham Vineyard', price: 60, iconName: 'Wine', selected: false },
];

const BookingModal: React.FC<BookingModalProps> = ({ listing: item, onClose }) => {
   const { user } = useAuth();
   const listing = item as any;
   const [isClosing, setIsClosing] = useState(false);
   const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

   const [guestCount, setGuestCount] = useState(1);
   const [userDetails, setUserDetails] = useState<UserDetails>({
      firstName: '', lastName: '', email: '', phone: '',
      whatsappPreferred: true, trackingPreference: 'personalized', notes: ''
   });
   const [availableUpsells, setAvailableUpsells] = useState<UpsellService[]>(UPSELL_OPTIONS);
   const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'crypto' | null>(null);
   const [processingStatus, setProcessingStatus] = useState<'idle' | 'verifying' | 'success'>('idle');

   useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'auto'; };
   }, []);

   const handleClose = () => {
      setIsClosing(true);
      setTimeout(onClose, 300);
   };

   const isShortTerm = listing.rentalType === 'short-term' || (listing.domain === 'Cars' && listing.type === 'rental');

   const basePrice = isPriceValid(listing?.price) ? (listing.price as number) : null;

   const toggleUpsell = (id: string) => {
      setAvailableUpsells(prev => prev.map(u => u.id === id ? { ...u, selected: !u.selected } : u));
   };

   const getTotalPrice = (): number | null => {
      if (basePrice == null) return null;
      const upsellTotal = availableUpsells.filter(u => u.selected).reduce((acc, curr) => acc + curr.price, 0);
      return basePrice + upsellTotal;
   };

   const handleNextStep = () => { if (step < 4) setStep(prev => (prev + 1) as any); };

   const handleFinalAction = () => {
      setProcessingStatus('verifying');

      // Simulate API Call & Save
      setTimeout(async () => {
         const total = getTotalPrice();
         if (total == null) {
            setProcessingStatus('idle');
            alert('Price is not available for this listing. Please contact the host to confirm pricing.');
            return;
         }

         const newBooking: Booking = {
            id: `ORD-${Date.now()}`,
            userId: user?.id || 'guest', // Fallback for unauthenticated users
            itemId: listing.id,
            itemTitle: listing.title,
            stayTitle: listing.title, // Ensure title is available for MessagesView
            itemImage: listing.imageUrl,
            domain: listing.domain,
            customerName: `${userDetails.firstName} ${userDetails.lastName}`,
            customerContact: userDetails.email || userDetails.phone,
            status: isShortTerm ? 'confirmed' : 'viewing_requested',
            totalPrice: total,
            date: new Date().toISOString(),
            specialRequests: userDetails.notes,
            paymentMethod: selectedPaymentMethod || undefined,
            userDetails: userDetails,
            selectedUpsells: availableUpsells.filter(u => u.selected),
            guests: guestCount
         };

         await StorageService.saveBooking(newBooking);
         setProcessingStatus('success');
      }, 2000);
   };

   const renderIcon = (name: string) => {
      switch (name) {
         case 'Car': return <Car size={18} />;
         case 'Utensils': return <Utensils size={18} />;
         case 'Wine': return <Wine size={18} />;
         case 'Compass': return <Compass size={18} />;
         default: return <Sparkles size={18} />;
      }
   };

   const renderGuestDetails = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
         <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Who is this booking for?</h2>
            <p className="text-slate-500">We need your details to secure the best experience.</p>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1 space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
               <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input type="text" value={userDetails.firstName} onChange={e => setUserDetails({ ...userDetails, firstName: e.target.value })} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. James" />
               </div>
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
               <input type="text" value={userDetails.lastName} onChange={e => setUserDetails({ ...userDetails, lastName: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. Bond" />
            </div>
         </div>

         <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Contact Info</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input type="email" value={userDetails.email} onChange={e => setUserDetails({ ...userDetails, email: e.target.value })} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Email Address" />
               </div>
               <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input type="tel" value={userDetails.phone} onChange={e => setUserDetails({ ...userDetails, phone: e.target.value })} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Phone Number" />
               </div>
            </div>
         </div>

         <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
               Concierge Requests <Sparkles size={12} className="text-purple-500" />
            </label>
            <textarea value={userDetails.notes} onChange={e => setUserDetails({ ...userDetails, notes: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px] text-sm" placeholder="e.g. Please stock the fridge with water and fruits." />
         </div>
      </div>
   );

   const renderUpsell = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
         <div className="text-center mb-6">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
               <Trophy size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Enhance Your Stay</h2>
            <p className="text-slate-500">Exclusive services curated for {listing.location}.</p>
         </div>
         <div className="grid grid-cols-1 gap-3">
            {availableUpsells.map((item) => (
               <div key={item.id} onClick={() => toggleUpsell(item.id)} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${item.selected ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-100 bg-white hover:border-purple-200'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${item.selected ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                     {renderIcon(item.iconName)}
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-center">
                        <h4 className={`font-bold ${item.selected ? 'text-purple-900' : 'text-slate-900'}`}>{item.label}</h4>
                        <span className="font-bold text-slate-900">£{item.price}</span>
                     </div>
                     <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                  <div className={`ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.selected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'}`}>
                     {item.selected && <Check size={14} className="text-white" />}
                  </div>
               </div>
            ))}
         </div>
      </div>
   );

   const renderPayment = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
         {processingStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
               <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce"><Check size={40} /></div>
               <h2 className="text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
               <p className="text-slate-600 max-w-md mb-6">We have emailed you the details.</p>
               <button onClick={onClose} className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300">Close</button>
            </div>
         ) : (
            <>
               <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Select Payment Method</h2>
                  <p className="text-slate-500">
                     {getTotalPrice() == null ? 'Price on request' : `Secure transaction for ${formatMoney(getTotalPrice(), '£')}`}
                  </p>
               </div>
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <button onClick={() => setSelectedPaymentMethod('card')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPaymentMethod === 'card' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-300'}`}>
                     <CreditCard size={24} />
                     <span className="font-bold text-sm">Credit Card</span>
                  </button>
                  <button onClick={() => setSelectedPaymentMethod('crypto')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPaymentMethod === 'crypto' ? 'border-green-600 bg-green-600 text-white' : 'border-slate-200 hover:border-slate-300'}`}>
                     <Bitcoin size={24} />
                     <span className="font-bold text-sm">Crypto</span>
                  </button>
               </div>
               {!isShortTerm && (
                  <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                     <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><MessageCircle size={18} /></div>
                     <div>
                        <h4 className="font-bold text-blue-900 text-sm">Agent Connection</h4>
                        <p className="text-xs text-blue-700 mt-1">By confirming, you agree to share your contact details with the agent to arrange a viewing.</p>
                     </div>
                  </div>
               )}
            </>
         )}
      </div>
   );

   return (
      <div className={`fixed inset-0 z-[60] flex items-center justify-center ${isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`}>
         <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}></div>

         <div className={`relative w-full h-full md:w-[90%] md:h-[90%] bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
               <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
               <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map(i => (
                     <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-slate-900' : i < step ? 'w-2 bg-green-500' : 'w-2 bg-slate-200'}`}></div>
                  ))}
               </div>
               <button className="p-2 hover:bg-slate-100 rounded-full text-slate-700"><Share size={18} /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
               <div className={`w-full md:w-1/3 bg-slate-50 p-6 flex flex-col ${step > 1 ? 'hidden md:flex' : 'block'}`}>
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg mb-6">
                     <img src={listing.imageUrl} className="w-full h-full object-cover" alt={listing.title} />
                     <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 backdrop-blur rounded-lg text-xs font-bold shadow-sm">
                        {basePrice == null ? 'Price on request' : formatMoney(basePrice, '£')}
                     </div>
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 mb-2">{listing.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mb-4"><MapPin size={14} /> {listing.location}</div>
                  <p className="text-sm text-slate-600 line-clamp-4 md:line-clamp-none">{listing.description}</p>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                  <div className="max-w-2xl mx-auto h-full flex flex-col">
                     {step === 1 && (
                        <div className="space-y-6 animate-in fade-in">
                           <h2 className="text-3xl font-bold text-slate-900">Review Details</h2>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                 <div className="text-xs font-bold text-slate-400 uppercase mb-1">Type</div>
                                 <div className="font-medium capitalize">{listing.category || listing.domain}</div>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                 <div className="text-xs font-bold text-slate-400 uppercase mb-1">Guests</div>
                                 <div className="flex items-center gap-3">
                                    <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-6 h-6 bg-white rounded border flex items-center justify-center hover:bg-slate-100"><Minus size={12} /></button>
                                    <span className="font-bold">{guestCount}</span>
                                    <button onClick={() => setGuestCount(guestCount + 1)} className="w-6 h-6 bg-white rounded border flex items-center justify-center hover:bg-slate-100"><Plus size={12} /></button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {step === 2 && renderGuestDetails()}
                     {step === 3 && renderUpsell()}
                     {step === 4 && renderPayment()}

                     <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
                        {step > 1 && processingStatus !== 'success' && (
                           <button onClick={() => setStep(prev => (prev - 1) as any)} className="text-slate-500 font-bold hover:text-slate-800">Back</button>
                        )}
                        <div className="flex-1"></div>
                        {processingStatus !== 'success' && (
                           <button
                              onClick={step === 4 ? handleFinalAction : handleNextStep}
                              disabled={processingStatus === 'verifying' || (step === 2 && !userDetails.firstName) || (step === 4 && !selectedPaymentMethod)}
                              className={`px-8 py-3 text-white font-bold rounded-full disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 ${selectedPaymentMethod === 'crypto' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                           >
                              {processingStatus === 'verifying' ? (
                                 <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                              ) : (
                                 <>
                                    {step === 4 ? (selectedPaymentMethod === 'crypto' ? "I Have Sent Payment" : "Pay Securely") : "Continue"}
                                    {step < 4 && <ArrowRight size={18} />}
                                 </>
                              )}
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default BookingModal;
