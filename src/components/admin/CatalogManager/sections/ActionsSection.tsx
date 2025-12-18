import React from "react";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface ActionsSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const ActionsSection: React.FC<ActionsSectionProps> = ({ form, setForm }) => {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-bold text-lg">⚡ Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "call", label: "📞 Call" },
          { key: "navigate", label: "🗺️ Navigate" },
          { key: "book", label: "📅 Book" },
          { key: "whatsapp", label: "💬 WhatsApp" },
          { key: "website", label: "🌐 Website" },
          { key: "share", label: "📤 Share" },
        ].map((action) => (
          <label
            key={action.key}
            className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={(form.actions as any)[action.key]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  actions: { ...prev.actions, [action.key]: e.target.checked },
                }))
              }
              className="h-3 w-3 rounded border-slate-700 bg-slate-900 text-cyan-500"
            />
            <span className="text-slate-300">{action.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ActionsSection;
