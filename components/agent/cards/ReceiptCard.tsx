
import React from 'react';
import { CheckCircle, Download, Smartphone, Mail, CarTaxiFront, StickyNote } from 'lucide-react';
import { Booking } from '../../../types';

const ReceiptCard: React.FC<{ booking: Booking }> = ({ booking }) => (
  <div className="w-full max-w-sm bg-slate-50 rounded-2xl border border-slate-200 p-6 my-4 relative overflow-hidden">
     <div className="absolute top-0 left-0 w-full h-2 bg-teal-500"></div>
     <div className="flex justify-between items-start mb-6">
        <div>
           <h3 className="font-bold text-slate-900 text-lg">Payment Receipt</h3>
           <p className="text-xs text-slate-500">Ref: {booking.id}</p>
        </div>
        <div className="p-2 bg-green-100 text-green-700 rounded-full">
           <CheckCircle size={20} />
        </div>
     </div>
     
     <div className="space-y-3 border-t border-dashed border-slate-300 pt-4 mb-6">
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Item</span>
           <span className="font-medium text-slate-900 max-w-[150px] truncate">{booking.itemTitle}</span>
        </div>
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Date</span>
           <span className="font-medium text-slate-900">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Guest</span>
           <span className="font-medium text-slate-900">{booking.customerName}</span>
        </div>
        {booking.needsPickup && (
          <div className="flex justify-between text-sm text-blue-600">
             <span className="flex items-center gap-1"><CarTaxiFront size={12}/> Pickup</span>
             <span className="font-bold">Included</span>
          </div>
        )}
        {booking.specialRequests && (
          <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded mt-2 flex gap-2 items-start">
             <StickyNote size={12} className="mt-0.5 shrink-0" />
             <span>"{booking.specialRequests}"</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
           <span className="text-slate-500">Total</span>
           <span className="font-bold text-slate-900">£{booking.totalPrice.toLocaleString()}</span>
        </div>
     </div>
     
     <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-green-100 text-green-800 text-[10px] p-2 rounded flex items-center justify-center gap-1">
           <Smartphone size={12} /> Sent to WhatsApp
        </div>
        <div className="flex-1 bg-blue-100 text-blue-800 text-[10px] p-2 rounded flex items-center justify-center gap-1">
           <Mail size={12} /> Sent to Email
        </div>
     </div>

     <button className="w-full py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-colors flex items-center justify-center gap-2">
        <Download size={16} /> Download PDF
     </button>
  </div>
);

export default ReceiptCard;
