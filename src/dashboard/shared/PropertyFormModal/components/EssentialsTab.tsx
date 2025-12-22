/**
 * EssentialsTab - Title, type, price, status, furnishing, description
 */
import React from 'react';
import {
    LISTING_TYPES,
    PROPERTY_TYPES,
    LOCATIONS,
    FURNISHING_STATUS,
    DEED_TYPES,
} from '../constants';
import type { PropertyFormData } from '../types';

interface EssentialsTabProps {
    form: PropertyFormData;
    setForm: React.Dispatch<React.SetStateAction<PropertyFormData>>;
}

const EssentialsTab: React.FC<EssentialsTabProps> = ({ form, setForm }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                    <input
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-lg"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., Luxury 3-Bed Villa with Pool"
                    />
                </div>

                {/* Property Type */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Type</label>
                    <select
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                        {PROPERTY_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* Listing Type */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Listing Type</label>
                    <select
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={form.rentalType}
                        onChange={(e) => setForm({ ...form, rentalType: e.target.value })}
                    >
                        {LISTING_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* Dynamic Price Field */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        {form.rentalType === 'short-term' && 'Daily Price'}
                        {form.rentalType === 'long-term' && 'Monthly Price'}
                        {form.rentalType === 'sale' && 'Sales Price'}
                        {form.rentalType === 'project' && 'Project Price'}
                        {!form.rentalType && 'Price'}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                        <input
                            type="number"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) })}
                            className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold"
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* Short-term fields */}
                {form.rentalType === 'short-term' && (
                    <>
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <input
                                type="checkbox"
                                id="depositNeeded"
                                checked={form.depositNeeded || false}
                                onChange={(e) => setForm({ ...form, depositNeeded: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                            <label htmlFor="depositNeeded" className="text-sm font-bold text-blue-900 cursor-pointer">
                                Deposit Required?
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cleaning Fee</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                                <input
                                    type="number"
                                    value={form.cleaningFee || 0}
                                    onChange={(e) => setForm({ ...form, cleaningFee: parseInt(e.target.value) })}
                                    className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Long-term fields */}
                {form.rentalType === 'long-term' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monthly Deposit</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                            <input
                                type="number"
                                value={form.monthlyDeposit || 0}
                                onChange={(e) => setForm({ ...form, monthlyDeposit: parseInt(e.target.value) })}
                                className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                placeholder="0"
                            />
                        </div>
                    </div>
                )}

                {/* Sale fields */}
                {form.rentalType === 'sale' && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title Deed Type</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={form.titleDeedType}
                                onChange={(e) => setForm({ ...form, titleDeedType: e.target.value })}
                            >
                                {DEED_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                            <input
                                type="checkbox"
                                id="paymentPlanSale"
                                checked={form.paymentPlanAvailable || false}
                                onChange={(e) => setForm({ ...form, paymentPlanAvailable: e.target.checked })}
                                className="w-5 h-5 text-green-600 rounded"
                            />
                            <label htmlFor="paymentPlanSale" className="text-sm font-bold text-green-900 cursor-pointer">
                                Payment Plan Available?
                            </label>
                        </div>
                    </>
                )}

                {/* Project fields */}
                {form.rentalType === 'project' && (
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <input
                            type="checkbox"
                            id="paymentPlan"
                            checked={form.paymentPlanAvailable || false}
                            onChange={(e) => setForm({ ...form, paymentPlanAvailable: e.target.checked })}
                            className="w-5 h-5 text-purple-600 rounded"
                        />
                        <label htmlFor="paymentPlan" className="text-sm font-bold text-purple-900 cursor-pointer">
                            Payment Plan Available?
                        </label>
                    </div>
                )}

                {/* District */}
                <div className={form.rentalType === 'short-term' || form.rentalType === 'project' ? '' : 'col-span-2'}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">District</label>
                    <select
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                    >
                        {LOCATIONS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>

                {/* Furnishing Status */}
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Furnishing Status</label>
                    <div className="grid grid-cols-3 gap-3">
                        {FURNISHING_STATUS.map((status) => (
                            <div
                                key={status}
                                onClick={() => setForm({ ...form, furnishedStatus: status })}
                                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-center transition-all ${form.furnishedStatus === status
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                        : 'border-slate-200 hover:border-slate-400 bg-white'
                                    }`}
                            >
                                <span className="text-sm font-bold">{status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                    <textarea
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-32 resize-none"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Describe the property features, location highlights, and unique selling points..."
                    />
                </div>
            </div>
        </div>
    );
};

export default EssentialsTab;
