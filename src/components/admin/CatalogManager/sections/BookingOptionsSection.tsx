import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface BookingOptionsSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const BookingOptionsSection: React.FC<BookingOptionsSectionProps> = ({
  form,
  setForm,
}) => {
  const [showBookingOptions, setShowBookingOptions] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowBookingOptions(!showBookingOptions)}
      >
        <h3 className="text-white font-bold text-lg">📅 Booking Options</h3>
        <ChevronDown
          className={`text-slate-400 transition-transform ${showBookingOptions ? "rotate-180" : ""}`}
        />
      </div>

      <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
        <input
          type="checkbox"
          checked={form.bookingEnabled}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, bookingEnabled: e.target.checked }))
          }
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
        />
        <span className="text-sm text-white">Enable booking requests</span>
      </label>

      {showBookingOptions && form.bookingEnabled && (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-slate-500">
            What info to collect when users book:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "needsDate", label: "📅 Date" },
              { key: "needsTime", label: "🕐 Time" },
              { key: "needsGuests", label: "👥 Guests" },
              { key: "needsDuration", label: "⏱️ Duration" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-sm"
              >
                <input
                  type="checkbox"
                  checked={(form.bookingOptions as any)[opt.key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      bookingOptions: {
                        ...prev.bookingOptions,
                        [opt.key]: e.target.checked,
                      },
                    }))
                  }
                  className="h-3 w-3 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-slate-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingOptionsSection;
