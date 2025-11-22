
import React, { useState } from 'react';
import { Lock, CreditCard, Bitcoin, Check, Copy, Loader2, User } from 'lucide-react';
import { Booking } from '../../../types';

interface PaymentCardProps {
   booking: Booking;
   onPaid: () => void;
}

import { auth } from '../../../services/firebaseConfig';

const PaymentCard: React.FC<PaymentCardProps> = ({ booking, onPaid }) => {
   const [processing, setProcessing] = useState(false);
   const [method, setMethod] = useState<'card' | 'crypto'>('card');

   const handlePay = async () => {
      setProcessing(true);
      try {
         // 1. Get Token
         const token = await auth.currentUser?.getIdToken();

         // 2. Call Backend
         const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-intent`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bookingId: booking.id })
         });

         if (!response.ok) throw new Error('Payment init failed');

         const { clientSecret } = await response.json();

         // 3. Confirm with Stripe (Frontend SDK)
         // Note: You need to wrap your app in <Elements> provider for this part to fully work visually.
         // For this Phase 5 Checkpoint, getting the clientSecret proves the backend logic works.
         console.log("Received Client Secret:", clientSecret);

         // SIMULATION FOR NOW (Since we don't have Stripe Frontend UI set up yet):
         onPaid(); // Optimistic update

      } catch (error) {
         console.error(error);
         alert("Payment failed to initialize");
      } finally {
         setProcessing(false);
      }
   };

   return (
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden my-4">
         <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
               <Lock size={16} className="text-emerald-400" />
               <span className="font-bold text-sm">Secure Checkout</span>
            </div>
            <span className="text-xs font-mono">IslanderPay™</span>
         </div>

         <div className="flex border-b border-slate-100">
            <button onClick={() => setMethod('card')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${method === 'card' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}>
               <CreditCard size={14} /> Card
            </button>
            <button onClick={() => setMethod('crypto')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${method === 'crypto' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400'}`}>
               <Bitcoin size={14} /> Crypto
            </button>
         </div>

         <div className="p-6">
            <div className="flex gap-4 mb-4">
               <img src={booking.itemImage} className="w-16 h-16 rounded-lg object-cover" />
               <div>
                  <div className="text-sm font-bold text-slate-900">{booking.itemTitle}</div>
                  <div className="text-lg font-bold text-teal-600">£{booking.totalPrice.toLocaleString()}</div>
               </div>
            </div>

            {method === 'card' ? (
               <div className="space-y-3 mb-6">
                  <div className="relative">
                     <CreditCard size={16} className="absolute left-3 top-3 text-slate-400" />
                     <input type="text" placeholder="Card Number" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <input type="text" placeholder="MM/YY" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                     <input type="text" placeholder="CVC" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
               </div>
            ) : (
               <div className="mb-6 text-center space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 inline-block">
                     <div className="w-24 h-24 bg-slate-200 animate-pulse flex items-center justify-center text-xs text-slate-400">QR Code</div>
                  </div>
                  <p className="text-[10px] text-green-600 font-bold flex items-center justify-center gap-1"><Check size={10} /> TRC20 / ERC20 Supported</p>
               </div>
            )}

            <button
               onClick={handlePay}
               disabled={processing}
               className={`w-full py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${method === 'card' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
               {processing ? <Loader2 size={18} className="animate-spin" /> : (method === 'card' ? "Pay Securely" : "I Have Sent Payment")}
            </button>
         </div>
      </div>
   );
};

export default PaymentCard;
