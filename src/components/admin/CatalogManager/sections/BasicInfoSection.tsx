import React from "react";
import {
  LISTING_CATEGORIES,
  REGIONS,
  REGIONS_WITH_SUBREGIONS,
} from "../unifiedListingForm.constants";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";
import GoogleImportSection from "./GoogleImportSection";

interface BasicInfoSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
  onCategoryChange: (newCategory: string) => void;
  setError: (msg: string) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  setForm,
  onCategoryChange,
  setError,
}) => {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-bold text-lg">📍 Listing Details</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Category</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.category}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {LISTING_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Region</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.region}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                region: e.target.value,
                subregion: "",
              }))
            }
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {REGIONS_WITH_SUBREGIONS[form.region]?.length > 0 && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">
            Sub-region / Area
          </label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
            value={form.subregion}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, subregion: e.target.value }))
            }
          >
            <option value="">All areas in {form.region}</option>
            {REGIONS_WITH_SUBREGIONS[form.region].map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      <GoogleImportSection
        category={form.category}
        region={form.region}
        subregion={form.subregion}
        setForm={setForm}
        setError={setError}
      />

      <input
        type="text"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
        placeholder="Title / Business Name"
        value={form.title}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, title: e.target.value }))
        }
      />
      <textarea
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white h-24 resize-none"
        placeholder="Description..."
        value={form.description}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, description: e.target.value }))
        }
      />

      <input
        type="text"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
        placeholder="Subcategory (e.g., Italian, Thai Massage...)"
        value={form.subcategory}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, subcategory: e.target.value }))
        }
      />
    </div>
  );
};

export default BasicInfoSection;
