/**
 * ActivityDetailsSection - Core form fields
 */
import React from "react";
import { ChevronDown } from "lucide-react";
import { ACTIVITY_CATEGORIES, REGIONS, REGIONS_WITH_SUBREGIONS } from "../constants";
import type { ActivityFormState } from "../types";

interface ActivityDetailsSectionProps {
    form: ActivityFormState;
    onUpdate: (updates: Partial<ActivityFormState>) => void;
    onBrowseCategory: () => void;
}

const ActivityDetailsSection: React.FC<ActivityDetailsSectionProps> = ({ form, onUpdate, onBrowseCategory }) => {
    return (
        <div className="space-y-4">
            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select
                            value={form.category}
                            onChange={(e) => onUpdate({ category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        >
                            <option value="">Select category...</option>
                            {ACTIVITY_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                    {form.category && form.region && (
                        <button onClick={onBrowseCategory} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-200 transition-colors">
                            Browse
                        </button>
                    )}
                </div>
            </div>

            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="Activity name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                    value={form.description}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    placeholder="Describe the activity..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
            </div>

            {/* Region & Subregion */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Region *</label>
                    <div className="relative">
                        <select
                            value={form.region}
                            onChange={(e) => onUpdate({ region: e.target.value, subregion: "" })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        >
                            <option value="">Select region...</option>
                            {REGIONS.map((r) => (
                                <option key={r} value={r.toLowerCase()}>{r}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subregion</label>
                    <div className="relative">
                        <select
                            value={form.subregion}
                            onChange={(e) => onUpdate({ subregion: e.target.value })}
                            disabled={!form.region}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none disabled:bg-slate-50"
                        >
                            <option value="">Select subregion...</option>
                            {form.region && REGIONS_WITH_SUBREGIONS[form.region.charAt(0).toUpperCase() + form.region.slice(1)]?.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                </div>
            </div>

            {/* Display Price */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Price</label>
                <input
                    type="text"
                    value={form.displayPrice}
                    onChange={(e) => onUpdate({ displayPrice: e.target.value })}
                    placeholder="e.g., From €50/person"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>
        </div>
    );
};

export default ActivityDetailsSection;
