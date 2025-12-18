import React from "react";
import type { ListingFormState } from "../hooks/useListingForm";

interface HoursSectionProps {
  form: ListingFormState;
}

const HoursSection: React.FC<HoursSectionProps> = ({ form }) => {
  if (form.openingHours.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
      <h3 className="text-white font-bold text-lg">🕐 Opening Hours</h3>
      {form.openingHours.map((line, i) => (
        <p key={i} className="text-sm text-slate-400">
          {line}
        </p>
      ))}
    </div>
  );
};

export default HoursSection;
