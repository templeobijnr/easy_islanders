import React from "react";
import LocationPicker, {
  type LocationValue,
} from "../../Shared/LocationPicker";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface LocationSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const LocationSection: React.FC<LocationSectionProps> = ({ form, setForm }) => {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-bold text-lg">📍 Location</h3>
      <LocationPicker
        value={{
          lat: form.lat,
          lng: form.lng,
          address: form.address,
          placeId: form.googlePlaceId,
        }}
        onChange={(location: LocationValue) => {
          setForm((prev) => ({
            ...prev,
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            googlePlaceId: location.placeId || prev.googlePlaceId,
          }));
        }}
      />

      <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
        <input
          type="checkbox"
          checked={form.showOnMap}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, showOnMap: e.target.checked }))
          }
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
        />
        <div className="flex-1">
          <span className="text-sm text-white font-medium">🗺️ Show on Map</span>
          <p className="text-xs text-slate-500">
            Display a pin for this listing on the Connect map
          </p>
        </div>
      </label>
    </div>
  );
};

export default LocationSection;
