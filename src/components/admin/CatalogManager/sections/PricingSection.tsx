import React from "react";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface PricingSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const PricingSection: React.FC<PricingSectionProps> = ({ form, setForm }) => {
  if (form.type === "stay") return null;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-bold text-lg">💰 Pricing</h3>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((level) => (
          <button
            key={level}
            type="button"
            className={`flex-1 py-3 rounded-xl border transition-colors font-bold ${
              form.priceLevel === level
                ? "bg-cyan-500 border-cyan-400 text-black"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-cyan-500/50"
            }`}
            onClick={() => setForm((prev) => ({ ...prev, priceLevel: level }))}
          >
            {"$".repeat(level)}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
        placeholder="Display Price (e.g., 'From $20', 'Free', '$$')"
        value={form.displayPrice}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, displayPrice: e.target.value }))
        }
      />
    </div>
  );
};

export default PricingSection;
