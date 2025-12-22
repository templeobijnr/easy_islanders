/**
 * ActivityForm - Composer
 *
 * Thin shell that composes hooks and components for activity editing.
 */
import React from "react";
import { Loader2, Save, Search } from "lucide-react";
import ImageUploader from "../../../Shared/ImageUploader";
import LocationPicker from "../../../Shared/LocationPicker";
import { useActivityForm } from "./hooks/useActivityForm";
import { ActivityDetailsSection, ActivityContactSection, ActivityOptionsSection } from "./components";
import type { ActivityFormProps } from "./types";

const ActivityForm: React.FC<ActivityFormProps> = (props) => {
    const vm = useActivityForm(props);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                    {props.initialValue ? "Edit Activity" : "Add Activity"}
                </h2>
                {props.onCancel && (
                    <button onClick={props.onCancel} className="text-slate-400 hover:text-slate-600">Cancel</button>
                )}
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
                        <input
                            type="text"
                            placeholder="Search for a place..."
                            onKeyDown={(e) => e.key === "Enter" && vm.handleImportSearch((e.target as HTMLInputElement).value)}
                            className="w-full px-4 py-2 rounded-lg border border-blue-200 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {vm.importLoading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
                        {vm.importResults.length > 0 && (
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {vm.importResults.map((place: any) => (
                                    <button key={place.place_id} onClick={() => vm.handleImportPlace(place.place_id)} className="w-full text-left p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                                        <div className="font-medium text-slate-900">{place.name}</div>
                                        <div className="text-sm text-slate-500 truncate">{place.formatted_address}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Details Section */}
                <ActivityDetailsSection form={vm.form} onUpdate={vm.updateForm} onBrowseCategory={vm.handleBrowseCategory} />

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <LocationPicker
                        value={{ lat: vm.form.lat, lng: vm.form.lng, address: vm.form.address }}
                        onChange={vm.handleLocationChange}
                    />
                </div>

                {/* Images */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Images</label>
                    <ImageUploader images={vm.form.images} onChange={(images) => vm.updateForm({ images })} maxImages={10} />
                </div>

                {/* Contact */}
                <ActivityContactSection form={vm.form} onUpdate={vm.updateForm} />

                {/* Options */}
                <ActivityOptionsSection form={vm.form} onUpdate={vm.updateForm} />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                {props.onCancel && (
                    <button onClick={props.onCancel} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                )}
                <button
                    onClick={vm.handleSubmit}
                    disabled={vm.isSaving || !vm.form.title || !vm.form.category}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {vm.isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {vm.isSaving ? "Saving..." : "Save Activity"}
                </button>
            </div>
        </div>
    );
};

export default ActivityForm;
