import React from "react";
import { Lock } from "lucide-react";
import { Booking } from "../../../types";
import { formatMoney } from "../../../utils/formatters";

interface PaymentCardProps {
  booking: Booking;
  onPaid: () => void;
}

const PaymentCard: React.FC<PaymentCardProps> = ({ booking }) => {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden my-4">
      <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-emerald-400" />
          <span className="font-bold text-sm">Secure Checkout</span>
        </div>
        <span className="text-xs font-mono">IslanderPay™</span>
      </div>

      <div className="p-6">
        <div className="flex gap-4 mb-4">
          <img
            src={booking.itemImage}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <div className="text-sm font-bold text-slate-900">
              {booking.itemTitle}
            </div>
            <div className="text-lg font-bold text-teal-600">
              {formatMoney(booking.totalPrice)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Payment processing is coming soon. For now, bookings are confirmed via WhatsApp or in-app message.
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
