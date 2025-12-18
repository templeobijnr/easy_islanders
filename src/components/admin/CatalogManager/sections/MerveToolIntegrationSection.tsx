import React from "react";
import { Bot, MessageSquare } from "lucide-react";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface MerveToolIntegrationSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const MerveToolIntegrationSection: React.FC<
  MerveToolIntegrationSectionProps
> = ({ form, setForm }) => {
  return (
    <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/60 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Bot className="text-emerald-500" size={20} /> Merve Integration
        </h3>
        <button
          type="button"
          onClick={() =>
            setForm((prev) => ({ ...prev, merveEnabled: !prev.merveEnabled }))
          }
          className={`relative w-12 h-6 rounded-full transition-colors ${form.merveEnabled ? "bg-emerald-600" : "bg-slate-700"}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.merveEnabled ? "left-6" : "left-0.5"}`}
          />
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Enable this listing for Merve AI tools (food ordering, service booking,
        etc.)
      </p>

      {form.merveEnabled && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Tool Type
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none text-white"
                value={form.merveToolType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    merveToolType: e.target.value,
                  }))
                }
              >
                <option value="restaurant">🍽️ Restaurant</option>
                <option value="provider">🔧 Service Provider</option>
                <option value="activity">🎯 Activity</option>
                <option value="stay">🏨 Stay / Accommodation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                WhatsApp E.164
              </label>
              <div className="relative">
                <MessageSquare
                  className="absolute left-3 top-3.5 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-emerald-500 focus:outline-none text-white"
                  placeholder="+905331234567"
                  value={form.merveWhatsappE164}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      merveWhatsappE164: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Coverage Areas
            </label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none text-white"
              placeholder="Kyrenia, Alsancak, Lapta (comma-separated)"
              value={form.merveCoverageAreas}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  merveCoverageAreas: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Tags</label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none text-white"
              placeholder="plumber, electrician, kebab, italian (comma-separated)"
              value={form.merveTags}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, merveTags: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Dispatch Template (optional override)
            </label>
            <textarea
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none text-white font-mono text-sm"
              placeholder="Leave empty to use default template..."
              value={form.merveDispatchTemplate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  merveDispatchTemplate: e.target.value,
                }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MerveToolIntegrationSection;
