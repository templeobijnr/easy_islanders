import React from "react";
import { Loader2, Search } from "lucide-react";
import type { ListingFormSetState } from "../hooks/useListingForm";
import { useGoogleImport } from "../hooks/useGoogleImport";

interface GoogleImportSectionProps {
  category: string;
  region: string;
  subregion: string;
  setForm: ListingFormSetState;
  setError: (msg: string) => void;
}

const GoogleImportSection: React.FC<GoogleImportSectionProps> = ({
  category,
  region,
  subregion,
  setForm,
  setError,
}) => {
  const {
    searchQuery,
    suggestions,
    isSearching,
    handleLocationSearch,
    handleBrowseCategory,
    handleSelectPlace,
  } = useGoogleImport({ category, region, subregion, setForm, setError });

  return (
    <div className="space-y-2">
      <label className="block text-sm text-slate-400">
        🔍 1-Click Import from Google
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => handleLocationSearch(e.target.value)}
          />
          <Search
            className="absolute left-3 top-3.5 text-slate-500"
            size={18}
          />

          {suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="px-4 py-3 hover:bg-slate-800 cursor-pointer"
                  onClick={() => handleSelectPlace(s.id)}
                >
                  <p className="text-white text-sm font-medium">{s.primary}</p>
                  <p className="text-slate-400 text-xs">{s.secondary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleBrowseCategory}
          disabled={isSearching}
          className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            "Browse"
          )}
        </button>
      </div>
    </div>
  );
};

export default GoogleImportSection;
