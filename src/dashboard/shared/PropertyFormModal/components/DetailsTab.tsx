/**
 * DetailsTab - Bedrooms, bathrooms, area, build year
 */
import React from 'react';
import type { PropertyFormData } from '../types';

interface DetailsTabProps {
    form: PropertyFormData;
    setForm: React.Dispatch<React.SetStateAction<PropertyFormData>>;
}

const DetailsTab: React.FC<DetailsTabProps> = ({ form, setForm }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Interior & Dimensions</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bedrooms</label>
                    <input
                        type="number"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                        value={form.bedrooms}
                        onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) })}
                        placeholder="3"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bathrooms</label>
                    <input
                        type="number"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                        value={form.bathrooms}
                        onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) })}
                        placeholder="2"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Area (m²)</label>
                    <input
                        type="number"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                        value={form.squareMeters}
                        onChange={(e) => setForm({ ...form, squareMeters: parseInt(e.target.value) })}
                        placeholder="120"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plot Size (m²)</label>
                    <input
                        type="number"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                        value={form.plotSize}
                        onChange={(e) => setForm({ ...form, plotSize: parseInt(e.target.value) })}
                        placeholder="400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Build Year</label>
                    <input
                        type="number"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                        value={form.buildYear}
                        onChange={(e) => setForm({ ...form, buildYear: parseInt(e.target.value) })}
                        placeholder="2024"
                    />
                </div>
            </div>
        </div>
    );
};

export default DetailsTab;
