/**
 * StayForm - Composer
 */
import React from "react";
import { Loader2, Save, Phone, ChevronDown } from "lucide-react";
import ImageUploader from "../../../Shared/ImageUploader";
import LocationPicker from "../../../Shared/LocationPicker";
import { useStayForm } from "./hooks/useStayForm";
import { STAY_CATEGORIES, STAY_AMENITIES, PROPERTY_TYPES, REGIONS, REGIONS_WITH_SUBREGIONS, CURRENCIES } from "./constants";
import type { StayFormProps } from "./types";

const StayForm: React.FC<StayFormProps> = (props) => {
    const vm = useStayForm(props);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">{props.initialValue ? "Edit Stay" : "Add Stay"}</h2>
                {props.onCancel && <button onClick={props.onCancel} className="text-slate-400 hover:text-slate-600">Cancel</button>}
            </div>

            <div className="p-6 space-y-6">
                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <div className="relative">
                        <select value={vm.form.category} onChange={(e) => vm.updateForm({ category: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white appearance-none">
                            {STAY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Name *</label>
                    <input type="text" value={vm.form.title} onChange={(e) => vm.updateForm({ title: e.target.value })} placeholder="Property name" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea value={vm.form.description} onChange={(e) => vm.updateForm({ description: e.target.value })} placeholder="Describe the property..." rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 resize-none" />
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
                        <div className="relative">
                            <select value={vm.form.propertyType} onChange={(e) => vm.updateForm({ propertyType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white appearance-none">
                                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label>
                        <input type="number" min="0" value={vm.form.bedrooms} onChange={(e) => vm.updateForm({ bedrooms: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label>
                        <input type="number" min="0" value={vm.form.bathrooms} onChange={(e) => vm.updateForm({ bathrooms: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
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

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Price per Night</label>
                        <input type="number" min="0" value={vm.form.pricePerNight} onChange={(e) => vm.updateForm({ pricePerNight: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                        <div className="relative">
                            <select value={vm.form.currency} onChange={(e) => vm.updateForm({ currency: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white appearance-none">
                                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cleaning Fee</label>
                        <input type="number" min="0" value={vm.form.cleaningFee} onChange={(e) => vm.updateForm({ cleaningFee: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <LocationPicker value={{ lat: vm.form.lat, lng: vm.form.lng, address: vm.form.address }} onChange={vm.handleLocationChange} />
                </div>

                {/* Amenities */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Amenities</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                        {STAY_AMENITIES.map((amenity) => (
                            <button key={amenity} onClick={() => vm.toggleAmenity(amenity)} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${vm.form.amenities.includes(amenity) ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                                {amenity}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Images */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Images</label>
                    <ImageUploader images={vm.form.images} onChange={(images) => vm.updateForm({ images })} maxImages={20} />
                </div>

                {/* Host Info */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Host Name</label>
                        <input type="text" value={vm.form.hostName} onChange={(e) => vm.updateForm({ hostName: e.target.value })} placeholder="Host name" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Host Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="tel" value={vm.form.hostPhone} onChange={(e) => vm.updateForm({ hostPhone: e.target.value })} placeholder="+90 542 123 4567" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Host Email</label>
                        <input type="email" value={vm.form.hostEmail} onChange={(e) => vm.updateForm({ hostEmail: e.target.value })} placeholder="host@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                </div>

                {/* Options */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={vm.form.bookingEnabled} onChange={(e) => vm.updateForm({ bookingEnabled: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-emerald-500" />
                    <span className="text-slate-700">Enable booking</span>
                </label>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                {props.onCancel && <button onClick={props.onCancel} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>}
                <button onClick={vm.handleSubmit} disabled={vm.isSaving || !vm.form.title} className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                    {vm.isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {vm.isSaving ? "Saving..." : "Save Stay"}
                </button>
            </div>
        </div>
    );
};

export default StayForm;
