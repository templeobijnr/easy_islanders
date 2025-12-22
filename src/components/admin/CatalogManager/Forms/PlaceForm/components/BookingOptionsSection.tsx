/**
 * BookingOptionsSection - Booking toggle with collapsible options
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlaceFormState } from '../types';

interface BookingOptionsSectionProps {
    form: PlaceFormState;
    setForm: React.Dispatch<React.SetStateAction<PlaceFormState>>;
    showBookingOptions: boolean;
    setShowBookingOptions: (show: boolean) => void;
}

const BookingOptionsSection: React.FC<BookingOptionsSectionProps> = ({
    form,
    setForm,
    showBookingOptions,
    setShowBookingOptions,
}) => {
    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowBookingOptions(!showBookingOptions)}
            >
                <h3 className="text-white font-bold text-lg">📅 Booking Options</h3>
                <ChevronDown
                    className={`text-slate-400 transition-transform ${showBookingOptions ? 'rotate-180' : ''
                        }`}
                />
            </div>

            <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.bookingEnabled}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            bookingEnabled: e.target.checked,
                        }))
                    }
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-sm text-white">Enable booking requests</span>
            </label>
        </div>
    );
};

export default BookingOptionsSection;
