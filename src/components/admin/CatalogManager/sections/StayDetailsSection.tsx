import React from "react";
import {
  PROPERTY_TYPES,
  STAY_AMENITIES,
} from "../unifiedListingForm.constants";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface StayDetailsSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const StayDetailsSection: React.FC<StayDetailsSectionProps> = ({
  form,
  setForm,
}) => {
  if (form.type !== "stay") return null;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-bold text-lg">🏠 Stay Details</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">
            Property Type
          </label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.propertyType}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, propertyType: e.target.value }))
            }
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Bedrooms</label>
          <input
            type="number"
            min={0}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.bedrooms}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                bedrooms: parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Bathrooms</label>
          <input
            type="number"
            min={0}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.bathrooms}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                bathrooms: parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">
            Price per Night
          </label>
          <input
            type="number"
            min={0}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            placeholder="0"
            value={form.pricePerNight || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                pricePerNight: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Currency</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.currency}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, currency: e.target.value }))
            }
          >
            <option value="GBP">£ GBP</option>
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
            <option value="TRY">₺ TRY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">
            Cleaning Fee
          </label>
          <input
            type="number"
            min={0}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            placeholder="0"
            value={form.cleaningFee || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                cleaningFee: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <input
          type="text"
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
          placeholder="Host Name"
          value={form.hostName}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hostName: e.target.value }))
          }
        />
        <input
          type="text"
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
          placeholder="Host Phone"
          value={form.hostPhone}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hostPhone: e.target.value }))
          }
        />
        <input
          type="email"
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
          placeholder="Host Email"
          value={form.hostEmail}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hostEmail: e.target.value }))
          }
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Amenities</label>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {STAY_AMENITIES.map((amenity) => (
            <label
              key={amenity}
              className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs cursor-pointer hover:border-cyan-500/50"
            >
              <input
                type="checkbox"
                checked={form.amenities.includes(amenity)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setForm((prev) => ({
                      ...prev,
                      amenities: [...prev.amenities, amenity],
                    }));
                  } else {
                    setForm((prev) => ({
                      ...prev,
                      amenities: prev.amenities.filter((a) => a !== amenity),
                    }));
                  }
                }}
                className="h-3 w-3 rounded border-slate-700 bg-slate-900 text-cyan-500"
              />
              <span className="text-slate-300">{amenity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StayDetailsSection;
