/**
 * ExperienceForm - Composer
 */
import React from "react";
import { Loader2, Save, Search, Phone, Globe, ChevronDown } from "lucide-react";
import ImageUploader from "../../../Shared/ImageUploader";
import LocationPicker from "../../../Shared/LocationPicker";
import { useExperienceForm } from "./hooks/useExperienceForm";
import { EXPERIENCE_CATEGORIES, REGIONS, REGIONS_WITH_SUBREGIONS } from "./constants";
import type { ExperienceFormProps } from "./types";

const ExperienceForm: React.FC<ExperienceFormProps> = (props) => {
    const vm = useExperienceForm(props);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">{props.initialValue ? "Edit Experience" : "Add Experience"}</h2>
                {props.onCancel && <button onClick={props.onCancel} className="text-slate-400 hover:text-slate-600">Cancel</button>}
            </div>

            <div className="p-6 space-y-6">
                {/* Import Panel */}
                {vm.showImportPanel && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Search size={18} className="text-blue-500" />
                            <span className="font-medium text-blue-900">Import from Google Places</span>
                            <button onClick={() => vm.setShowImportPanel(false)} className="ml-auto text-blue-400 hover:text-blue-600 text-sm">Close</button>
                        </div>
                        <input type="text" placeholder="Search for a place..." onKeyDown={(e) => e.key === "Enter" && vm.handleImportSearch((e.target as HTMLInputElement).value)} className="w-full px-4 py-2 rounded-lg border border-blue-200 mb-3" />
                        {vm.importLoading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
                        {vm.importResults.length > 0 && (
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {vm.importResults.map((place: any) => (
                                    <button key={place.place_id} onClick={() => vm.handleImportPlace(place.place_id)} className="w-full text-left p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300">
                                        <div className="font-medium text-slate-900">{place.name}</div>
                                        <div className="text-sm text-slate-500 truncate">{place.formatted_address}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <select value={vm.form.category} onChange={(e) => vm.updateForm({ category: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white appearance-none">
                                {EXPERIENCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                        {vm.form.category && vm.form.region && (
                            <button onClick={vm.handleBrowseCategory} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-200">Browse</button>
                        )}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience Title *</label>
                    <input type="text" value={vm.form.title} onChange={(e) => vm.updateForm({ title: e.target.value })} placeholder="Experience name" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea value={vm.form.description} onChange={(e) => vm.updateForm({ description: e.target.value })} placeholder="Describe the experience..." rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 resize-none" />
                </div>

                {/* Region */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                        <div className="relative">
                            <select value={vm.form.region} onChange={(e) => vm.updateForm({ region: e.target.value, subregion: "" })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white appearance-none">
                                <option value="">Select region...</option>
                                {REGIONS.map((r) => <option key={r} value={r.toLowerCase()}>{r}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subregion</label>
                        <div className="relative">
                            <select value={vm.form.subregion} onChange={(e) => vm.updateForm({ subregion: e.target.value })} disabled={!vm.form.region} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white appearance-none disabled:bg-slate-50">
                                <option value="">Select subregion...</option>
                                {vm.form.region && REGIONS_WITH_SUBREGIONS[vm.form.region.charAt(0).toUpperCase() + vm.form.region.slice(1)]?.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                    </div>
                </div>

                {/* Display Price */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Price</label>
                    <input type="text" value={vm.form.displayPrice} onChange={(e) => vm.updateForm({ displayPrice: e.target.value })} placeholder="e.g., From €100/person" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <LocationPicker value={{ lat: vm.form.lat, lng: vm.form.lng, address: vm.form.address }} onChange={vm.handleLocationChange} />
                </div>

                {/* Images */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Images</label>
                    <ImageUploader images={vm.form.images} onChange={(images) => vm.updateForm({ images })} maxImages={10} />
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="tel" value={vm.form.phone} onChange={(e) => vm.updateForm({ phone: e.target.value })} placeholder="+90 542 123 4567" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="url" value={vm.form.website} onChange={(e) => vm.updateForm({ website: e.target.value })} placeholder="https://example.com" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200" />
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={vm.form.showOnMap} onChange={(e) => vm.updateForm({ showOnMap: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-emerald-500" />
                        <span className="text-slate-700">Show on map</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={vm.form.bookingEnabled} onChange={(e) => vm.updateForm({ bookingEnabled: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-emerald-500" />
                        <span className="text-slate-700">Enable booking</span>
                    </label>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                {props.onCancel && <button onClick={props.onCancel} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>}
                <button onClick={vm.handleSubmit} disabled={vm.isSaving || !vm.form.title} className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                    {vm.isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {vm.isSaving ? "Saving..." : "Save Experience"}
                </button>
            </div>
        </div>
    );
};

export default ExperienceForm;
