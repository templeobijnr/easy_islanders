/**
 * AmenitiesTab - Amenity selection grid
 */
import React from 'react';
import { AMENITY_OPTIONS } from '../constants';
import type { PropertyFormData } from '../types';

interface AmenitiesTabProps {
    form: PropertyFormData;
    setForm: React.Dispatch<React.SetStateAction<PropertyFormData>>;
}

const AmenitiesTab: React.FC<AmenitiesTabProps> = ({ form, setForm }) => {
    const toggleAmenity = (amenity: string) => {
        const current = form.amenities || [];
        if (current.includes(amenity)) {
            setForm({ ...form, amenities: current.filter((a) => a !== amenity) });
        } else {
            setForm({ ...form, amenities: [...current, amenity] });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Select Amenities</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AMENITY_OPTIONS.map((amenity) => (
                    <div
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${form.amenities?.includes(amenity)
                                ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                                : 'border-slate-200 hover:border-slate-400 bg-white text-slate-700'
                            }`}
                    >
                        <span className="text-sm font-medium">{amenity}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">
                    Selected ({form.amenities?.length || 0})
                </div>
                <div className="flex flex-wrap gap-2">
                    {(form.amenities || []).map((a) => (
                        <span
                            key={a}
                            className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold"
                        >
                            {a}
                        </span>
                    ))}
                    {(!form.amenities || form.amenities.length === 0) && (
                        <span className="text-slate-400 text-sm">No amenities selected</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AmenitiesTab;
