/**
 * BookingsDeck - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useBookingsDeck.ts
 * - Extracted components: BookingCard
 * - Behavior preserved: yes (no UI change)
 */
import React from "react";
import { Calendar, Loader2 } from "lucide-react";
import { useBookingsDeck } from "./hooks/useBookingsDeck";
import { BookingCard } from "./components";
import BookingMessagesModal from "../BookingMessagesModal";

const BookingsDeck: React.FC = () => {
    const vm = useBookingsDeck();

    if (vm.isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                    <Calendar className="text-blue-600" size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Bookings</h2>
                    <p className="text-sm text-slate-500">{vm.bookings.length} total bookings</p>
                </div>
            </div>

            {/* Bookings Grid */}
            {vm.bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No bookings yet</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vm.bookings.map((booking) => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            notes={vm.editingNotes[booking.id]}
                            onNotesChange={(value) => vm.setEditingNotes((prev) => ({ ...prev, [booking.id]: value }))}
                            onNotesBlur={() => vm.handleNotesBlur(booking.id)}
                            onStatusChange={(status) => vm.updateStatus(booking.id, status)}
                            onOpenMessages={() => vm.openMessages(booking.id)}
                        />
                    ))}
                </div>
            )}

            {/* Messages Modal */}
            {vm.showMessagesModal && vm.selectedBookingId && (
                <BookingMessagesModal bookingId={vm.selectedBookingId} onClose={vm.closeMessages} />
            )}
        </div>
    );
};

export default BookingsDeck;
