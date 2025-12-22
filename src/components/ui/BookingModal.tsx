
import React, { useState, useEffect } from 'react';
import { X, Share, Heart, Star, Minus, Plus, MapPin, Wifi, Check, ShieldCheck, Trophy, MessageCircle, Calendar, CreditCard, Lock, Loader2, User, Phone, Mail, Bell, Car, Utensils, Wine, Compass, ChevronRight, ArrowRight, Bitcoin, Copy, Wallet, Sparkles } from 'lucide-react';
import { Listing, UnifiedItem, UpsellService, UserDetails } from '../types';

interface BookingModalProps {
  listing: Listing | UnifiedItem;
  onClose: () => void;
}

// --- MOCK UPSELLS ---
const UPSELL_OPTIONS: UpsellService[] = [
  { id: 'taxi', label: 'Airport Taxi Transfer', description: 'Luxury Mercedes V-Class from Ercan', price: 50, iconName: 'Car', selected: false },
  { id: 'food', label: 'Welcome Food Hamper', description: 'Local wine, cheese, fruits & bread', price: 35, iconName: 'Utensils', selected: false },
  { id: 'tour', label: 'Kyrenia Boat Tour', description: 'Sunset cruise with dinner included', price: 45, iconName: 'Compass', selected: false },
  { id: 'wine', label: 'Wine Tasting', description: 'Visit to Gillham Vineyard', price: 60, iconName: 'Wine', selected: false },
];

const BookingModal: React.FC<BookingModalProps> = ({ listing: item, onClose }) => {
  const listing = item as any; 
  const [isClosing, setIsClosing] = useState(false);
  
  // --- WIZARD STATE ---
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1:Review, 2:GuestInfo, 3:Concierge(Upsell), 4:Payment/Confirm
  
  // --- DATA STATE ---
  const [guestCount, setGuestCount] = useState(1);
  const [userDetails, setUserDetails] = useState<UserDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsappPreferred: true,
    trackingPreference: 'personalized',
    notes: ''
  });
  const [availableUpsells, setAvailableUpsells] = useState<UpsellService[]>(UPSELL_OPTIONS);

  // --- PAYMENT/REQUEST STATE ---
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'crypto' | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'verifying' | 'success'>('idle');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); 
  };

  const isShortTerm = listing.rentalType === 'short-term' || (listing.domain === 'Cars' && listing.type === 'rental');
  const isLongTermOrSale = listing.rentalType === 'long-term' || listing.rentalType === 'sale' || (listing.domain === 'Cars' && listing.type === 'sale');
  const isProject = listing.rentalType === 'project';

  // --- HANDLERS ---
  const toggleUpsell = (id: string) => {
    setAvailableUpsells(prev => prev.map(u => u.id === id ? { ...u, selected: !u.selected } : u));
  };

  const getTotalPrice = () => {
    const upsellTotal = availableUpsells.filter(u => u.selected).reduce((acc, curr) => acc + curr.price, 0);
    return listing.price + upsellTotal;
  };

  const handleNextStep = () => {
    if (step < 4) setStep(prev => (prev + 1) as any);
  };

  const handleFinalAction = () => {
    setProcessingStatus('verifying');
    
    // Simulate Blockchain/API Verification
    setTimeout(() => {
      setProcessingStatus('success');
    }, 3000);
  };

  const handleWhatsAppRedirect = () => {
    // Build a rich message with user details and preferences
    let text = `Hi, I am interested in *${listing.title}*.\n`;
    text += `Type: ${listing.rentalType || listing.domain}\n`;
    text += `Ref: ${listing.id}\n\n`;
    
    text += `*My Details:*\n`;
    text += `Name: ${userDetails.firstName} ${userDetails.lastName}\n`;
    text += `Tracking: ${userDetails.trackingPreference}\n`;
    
    const selected = availableUpsells.filter(u => u.selected);
    if (selected.length > 0) {
      text += `\n*Requested Add-ons:*\n`;
      selected.forEach(u => text += `- ${u.label} (£${u.price})\n`);
    }
    
    if (userDetails.notes) text += `\nNote: ${userDetails.notes}`;

    const phone = listing.agentPhone || '905330000000';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const renderIcon = (name: string) => {
    switch(name) {
      case 'Car': return <Car size={18} />;
      case 'Utensils': return <Utensils size={18} />;
      case 'Wine': return <Wine size={18} />;
      case 'Compass': return <Compass size={18} />;
      default: return <Star size={18} />;
    }
  };

  // --- RENDER STEPS ---

  // STEP 1: REVIEW (Existing Detail View) - Rendered in main layout below
  
  // STEP 2: GUEST DETAILS
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
             <input 
                type="text" 
                value={userDetails.firstName}
                onChange={e => setUserDetails({...userDetails, firstName: e.target.value})}
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                placeholder="e.g. James"
             />
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
          <input 
             type="text" 
             value={userDetails.lastName}
             onChange={e => setUserDetails({...userDetails, lastName: e.target.value})}
             className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
             placeholder="e.g. Bond"
          />
        </div>
      </div>

      <div className="space-y-2">
         <label className="text-xs font-bold text-slate-500 uppercase">Contact Info</label>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
               <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
               <input 
                  type="email" 
                  value={userDetails.email}
                  onChange={e => setUserDetails({...userDetails, email: e.target.value})}
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  placeholder="Email Address"
               />
            </div>
            <div className="relative">
               <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
               <input 
                  type="tel" 
                  value={userDetails.phone}
                  onChange={e => setUserDetails({...userDetails, phone: e.target.value})}
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  placeholder="Phone Number"
               />
            </div>
         </div>
      </div>

      {/* Special Requests / Groceries Form */}
      <div className="space-y-2">
         <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
             Concierge Requests <Sparkles size={12} className="text-purple-500"/>
         </label>
         <textarea 
            value={userDetails.notes}
            onChange={e => setUserDetails({...userDetails, notes: e.target.value})}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px] text-sm"
            placeholder="e.g. Please stock the fridge with water and fruits. I also have a gluten allergy."
         />
      </div>

      {/* Preferences Section */}
      <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
         <div className="flex items-center gap-2 mb-2">
             <ShieldCheck size={16} className="text-teal-700"/>
             <span className="text-sm font-bold text-teal-800">Privacy Preference</span>
         </div>
         <div className="flex gap-2">
            {['minimal', 'personalized', 'none'].map((opt) => (
                <button
                key={opt}
                onClick={() => setUserDetails({...userDetails, trackingPreference: opt as any})}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    userDetails.trackingPreference === opt 
                    ? 'bg-teal-600 text-white shadow-md' 
                    : 'bg-white text-teal-700 hover:bg-teal-100'
                }`}
                >
                {opt}
                </button>
            ))}
         </div>
      </div>
    </div>
  );

  // STEP 3: CONCIERGE & UPSELL
  const renderUpsell = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="text-center mb-6">
         <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy size={24} />
         </div>
         <h2 className="text-2xl font-bold text-slate-900">Enhance Your Stay</h2>
         <p className="text-slate-500">Exclusive services curated for this location ({listing.location}).</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
         {availableUpsells.map((item) => (
            <div 
               key={item.id}
               onClick={() => toggleUpsell(item.id)}
               className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  item.selected 
                  ? 'border-purple-500 bg-purple-50 shadow-md' 
                  : 'border-slate-100 bg-white hover:border-purple-200'
               }`}
            >
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

      <div className="bg-slate-50 p-4 rounded-lg text-center text-sm text-slate-500">
         Want something else? You can ask your AI concierge anytime after booking.
      </div>
    </div>
  );

  // STEP 4: PAYMENT / CONFIRMATION (REDESIGNED)
  const renderPayment = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       
       {/* SUCCESS STATE */}
       {processingStatus === 'success' ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
             <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <Check size={40} />
             </div>
             <h2 className="text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
             <p className="text-slate-600 max-w-md mb-6">
                {selectedPaymentMethod === 'crypto' 
                  ? "Blockchain transaction verified. We have emailed you the receipt and villa access code."
                  : "Payment successful. We've emailed you the receipt and itinerary."
                }
             </p>
             <div className="bg-slate-50 p-4 rounded-xl w-full max-w-md mb-6 text-left">
                <h4 className="font-bold text-slate-900 mb-2">Summary</h4>
                <div className="flex justify-between text-sm mb-1">
                   <span className="text-slate-500">Guest</span>
                   <span className="font-medium">{userDetails.firstName} {userDetails.lastName}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                   <span className="text-slate-500">Method</span>
                   <span className="font-medium uppercase">{selectedPaymentMethod}</span>
                </div>
                {userDetails.notes && (
                   <div className="text-xs text-purple-600 mt-2 italic">
                      " {userDetails.notes} "
                   </div>
                )}
             </div>
             <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300">Close</button>
             </div>
          </div>
       ) : (
          <>
            {/* METHOD SELECTION */}
            <div className="text-center mb-6">
               <h2 className="text-2xl font-bold text-slate-900">Select Payment Method</h2>
               <p className="text-slate-500">Secure transaction for £{getTotalPrice().toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <button 
                 onClick={() => setSelectedPaymentMethod('card')}
                 className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPaymentMethod === 'card' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-300'}`}
               >
                  <CreditCard size={24} />
                  <span className="font-bold text-sm">Credit Card</span>
               </button>
               <button 
                 onClick={() => setSelectedPaymentMethod('crypto')}
                 className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPaymentMethod === 'crypto' ? 'border-green-600 bg-green-600 text-white' : 'border-slate-200 hover:border-slate-300'}`}
               >
                  <Bitcoin size={24} />
                  <span className="font-bold text-sm">Crypto (USDT)</span>
               </button>
            </div>

            {/* CARD FORM */}
            {selectedPaymentMethod === 'card' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                  <div className="relative">
                     <CreditCard size={18} className="absolute left-3 top-3 text-slate-400" />
                     <input type="text" placeholder="Card Number" className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <input type="text" placeholder="MM/YY" className="p-3 bg-white border border-slate-200 rounded-xl outline-none" />
                     <input type="text" placeholder="CVC" className="p-3 bg-white border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 justify-center mt-2">
                     <Lock size={12} /> Secured by Stripe
                  </div>
               </div>
            )}

            {/* CRYPTO FORM */}
            {selectedPaymentMethod === 'crypto' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                  <div className="text-sm font-bold text-slate-500 mb-4">Scan to Pay (TRC20)</div>
                  <div className="bg-white p-4 rounded-xl inline-block shadow-sm mb-4 relative group cursor-pointer">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TVb4....mockaddress" alt="QR" className="w-32 h-32 opacity-90" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 transition-opacity">
                         <span className="text-xs font-bold text-slate-900">Scan with Wallet</span>
                      </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2 mb-4">
                     <div className="text-xs font-mono text-slate-500 truncate max-w-[200px]">T9yKB...mockaddress...XyZ</div>
                     <button className="text-teal-600 hover:bg-teal-50 p-1 rounded"><Copy size={14}/></button>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
                     <span className="flex items-center gap-1"><Check size={12} className="text-green-500"/> TRC20</span>
                     <span className="flex items-center gap-1"><Check size={12} className="text-green-500"/> ERC20</span>
                     <span className="flex items-center gap-1"><Check size={12} className="text-green-500"/> BTC</span>
                  </div>
               </div>
            )}

            {/* Fallback for Long Term (No Payment) */}
            {!isShortTerm && (
               <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><MessageCircle size={18}/></div>
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
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
          
          {/* Progress Stepper */}
          <div className="flex items-center gap-2">
             {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-slate-900' : i < step ? 'w-2 bg-green-500' : 'w-2 bg-slate-200'}`}></div>
             ))}
          </div>

          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-700 flex items-center gap-2 transition-colors text-sm font-medium">
               <Share size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
           
           {/* Left: Image/Summary (Always visible on Desktop, small on Mobile) */}
           <div className={`w-full md:w-1/3 bg-slate-50 p-6 flex flex-col ${step > 1 ? 'hidden md:flex' : 'block'}`}>
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg mb-6">
                 <img src={listing.imageUrl} className="w-full h-full object-cover" alt={listing.title} />
                 <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 backdrop-blur rounded-lg text-xs font-bold shadow-sm">
                    £{listing.price.toLocaleString()}
                 </div>
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">{listing.title}</h3>
              <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                 <MapPin size={14} /> {listing.location}
              </div>
              <p className="text-sm text-slate-600 line-clamp-4 md:line-clamp-none">{listing.description}</p>
           </div>

           {/* Right: Wizard Steps */}
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
                                <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-6 h-6 bg-white rounded border flex items-center justify-center hover:bg-slate-100"><Minus size={12}/></button>
                                <span className="font-bold">{guestCount}</span>
                                <button onClick={() => setGuestCount(guestCount + 1)} className="w-6 h-6 bg-white rounded border flex items-center justify-center hover:bg-slate-100"><Plus size={12}/></button>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h3 className="font-bold text-lg">Included Amenities</h3>
                          <div className="grid grid-cols-2 gap-3">
                             {(listing.amenities || listing.features || ['Wifi', 'Parking', 'AC']).slice(0, 6).map((a: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                   <Check size={16} className="text-green-500" /> {a}
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 )}

                 {step === 2 && renderGuestDetails()}
                 {step === 3 && renderUpsell()}
                 {step === 4 && renderPayment()}

                 {/* Footer Navigation */}
                 <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
                    {step > 1 && processingStatus !== 'success' && (
                       <button onClick={() => setStep(prev => (prev - 1) as any)} className="text-slate-500 font-bold hover:text-slate-800">Back</button>
                    )}
                    <div className="flex-1"></div> {/* Spacer */}
                    
                    {processingStatus !== 'success' && (
                       <button 
                          onClick={step === 4 ? handleFinalAction : handleNextStep}
                          disabled={processingStatus === 'verifying' || (step === 2 && !userDetails.firstName) || (step === 4 && !selectedPaymentMethod)}
                          className={`px-8 py-3 text-white font-bold rounded-full disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 ${
                             selectedPaymentMethod === 'crypto' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'
                          }`}
                       >
                          {processingStatus === 'verifying' ? (
                             <><Loader2 size={18} className="animate-spin"/> Verifying...</>
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
