/**
 * BookingCard - Single booking card display
 */
import React from "react";
import { CheckCircle, XCircle, Calendar, MapPin, Users, Phone, Mail, MessageCircle } from "lucide-react";
import { formatDate } from "@/utils/formatters";
import type { BookingWithStay, Booking } from "../types";

interface BookingCardProps {
    booking: BookingWithStay;
    notes: string | undefined;
    onNotesChange: (value: string) => void;
    onNotesBlur: () => void;
    onStatusChange: (status: Booking["status"]) => void;
    onOpenMessages: () => void;
}

const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
};

const BookingCard: React.FC<BookingCardProps> = ({
    booking,
    notes,
    onNotesChange,
    onNotesBlur,
    onStatusChange,
    onOpenMessages,
}) => {
    const title = booking.itemTitle || booking.stayTitle || "Booking";
    const guestName = booking.guestDetails ? `${booking.guestDetails.firstName || ""} ${booking.guestDetails.lastName || ""}`.trim() : "Guest";

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <div className="text-sm text-slate-500">{guestName}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status || "pending"]}`}>
                    {booking.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                {booking.checkIn && (
                    <div className="flex items-center gap-1 text-slate-600">
                        <Calendar size={14} /> {formatDate(booking.checkIn)} {booking.checkOut && `→ ${formatDate(booking.checkOut)}`}
                    </div>
                )}
                {booking.guests && (
                    <div className="flex items-center gap-1 text-slate-600">
                        <Users size={14} /> {booking.guests} guests
                    </div>
                )}
                {booking.guestDetails?.phone && (
                    <div className="flex items-center gap-1 text-slate-600">
                        <Phone size={14} /> {booking.guestDetails.phone}
                    </div>
                )}
                {booking.guestDetails?.email && (
                    <div className="flex items-center gap-1 text-slate-600">
                        <Mail size={14} /> {booking.guestDetails.email}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mb-3">
                <button onClick={() => onStatusChange("confirmed")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <CheckCircle size={14} /> Confirm
                </button>
                <button onClick={() => onStatusChange("cancelled")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                    <XCircle size={14} /> Cancel
                </button>
                <button onClick={onOpenMessages} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <MessageCircle size={14} /> Messages
                </button>
            </div>

            <textarea
                value={notes ?? (booking as any).adminNotes ?? ""}
                onChange={(e) => onNotesChange(e.target.value)}
                onBlur={onNotesBlur}
                placeholder="Admin notes..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
            />
        </div>
    );
};

export default BookingCard;
