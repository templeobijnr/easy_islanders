
import React, { useState, useEffect } from 'react';
import { Smartphone, Calendar, CheckCircle } from 'lucide-react';
import { Booking } from '../../../types';

const WhatsAppStatusCard: React.FC<{ booking: Booking }> = ({ booking }) => {
   const [step, setStep] = useState<1|2|3|4>(1);
   
   useEffect(() => {
     if (booking.whatsappStatus === 'sent') {
       setStep(2);
       setTimeout(() => setStep(3), 3000);
     } else {
       setTimeout(() => setStep(2), 2500);
     }
   }, [booking.whatsappStatus]);

   useEffect(() => {
      if (step === 3) {
         setTimeout(() => setStep(4), 2000);
      }
   }, [step]);

   return (
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm my-4 p-5 relative overflow-hidden">
         
         <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className={`p-2 rounded-full transition-colors duration-500 ${step === 4 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
               {step === 4 ? <CheckCircle size={20} /> : <Smartphone size={20} className={step < 4 ? 'animate-pulse' : ''} />}
            </div>
            <div>
               <h4 className="font-bold text-slate-900">
                  {step === 1 && "Connecting to Owner..."}
                  {step === 2 && "Request Sent"}
                  {step === 3 && "Confirming Availability..."}
                  {step === 4 && "Viewing Confirmed"}
               </h4>
               <p className="text-xs text-slate-500">
                  {step === 1 && "Initiating WhatsApp Business API"}
                  {step === 2 && `Delivered to Agent (+90...)`}
                  {step === 3 && "Waiting for manual approval"}
                  {step === 4 && "Slot booked. Agent will call you."}
               </p>
            </div>
         </div>

         <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 mb-2 z-10">
            <div className="relative">
               <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-teal-500"></div>
               <p className="text-xs text-slate-500">Viewing requested for:</p>
               <p className="text-xs font-bold text-slate-900">{booking.viewingTime || "Flexible"}</p>
            </div>
            
            <div className={`relative transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
               <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
               <p className="text-xs text-slate-600">Agent notified via WhatsApp</p>
            </div>

            <div className={`relative transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
               <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${step >= 3 ? 'bg-purple-500' : 'bg-slate-200'}`}></div>
               <p className="text-xs text-slate-600">{step >= 3 ? "Availability verified" : "Checking calendar..."}</p>
            </div>
         </div>

         {step === 4 && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800">
               <div className="font-bold flex items-center gap-2 mb-1"><Calendar size={14}/> Appointment Set</div>
               <p className="text-xs">The agent has your number ({booking.customerContact}) and will send location details shortly.</p>
            </div>
         )}
      </div>
   );
};

export default WhatsAppStatusCard;
