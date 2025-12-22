/**
 * ActivityContactSection - Contact info fields
 */
import React from "react";
import { Phone, Globe } from "lucide-react";
import type { ActivityFormState } from "../types";

interface ActivityContactSectionProps {
    form: ActivityFormState;
    onUpdate: (updates: Partial<ActivityFormState>) => void;
}

const ActivityContactSection: React.FC<ActivityContactSectionProps> = ({ form, onUpdate }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>

            {/* Phone */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => onUpdate({ phone: e.target.value })}
                        placeholder="+90 542 123 4567"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                    type="email"
                    value={form.email}
                    onChange={(e) => onUpdate({ email: e.target.value })}
                    placeholder="contact@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            {/* Website */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="url"
                        value={form.website}
                        onChange={(e) => onUpdate({ website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>
        </div>
    );
};

export default ActivityContactSection;
