/**
 * BookingsList - List of user's bookings
 */
import React from "react";
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import type { BookingSummary } from "../types";
import { formatDate } from "@/utils/formatters";

interface BookingsListProps {
    bookings: BookingSummary[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    getTitle: (booking: BookingSummary) => string;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    pending: { icon: <Clock size={14} />, color: "text-amber-500" },
    confirmed: { icon: <CheckCircle size={14} />, color: "text-green-500" },
    cancelled: { icon: <XCircle size={14} />, color: "text-red-500" },
    completed: { icon: <CheckCircle size={14} />, color: "text-blue-500" },
};

const BookingsList: React.FC<BookingsListProps> = ({ bookings, selectedId, onSelect, getTitle }) => {
    if (bookings.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4">
                No bookings yet
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {bookings.map((booking) => {
                const isSelected = booking.id === selectedId;
                const status = statusConfig[booking.status || "pending"] || statusConfig.pending;
                const title = getTitle(booking);

                return (
                    <button
                        key={booking.id}
                        onClick={() => onSelect(booking.id)}
                        className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isSelected ? "bg-emerald-50 border-l-4 border-l-emerald-500" : ""
                            }`}
                    >
                        <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-slate-900 truncate flex-1">{title}</span>
                            <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                                {status.icon} {booking.status}
                            </span>
                        </div>
                        {booking.checkIn && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar size={12} />
                                {formatDate(booking.checkIn)}
                                {booking.checkOut && ` → ${formatDate(booking.checkOut)}`}
                            </div>
                        )}
                        {booking.guests && (
                            <div className="text-xs text-slate-400 mt-1">{booking.guests} guests</div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default BookingsList;
