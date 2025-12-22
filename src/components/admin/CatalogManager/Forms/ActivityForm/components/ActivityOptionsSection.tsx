/**
 * ActivityOptionsSection - Toggles and options
 */
import React from "react";
import type { ActivityFormState } from "../types";

interface ActivityOptionsSectionProps {
    form: ActivityFormState;
    onUpdate: (updates: Partial<ActivityFormState>) => void;
}

const ActivityOptionsSection: React.FC<ActivityOptionsSectionProps> = ({ form, onUpdate }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Options</h3>

            {/* Show on Map */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.showOnMap}
                    onChange={(e) => onUpdate({ showOnMap: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-700">Show on map</span>
            </label>

            {/* Booking Enabled */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.bookingEnabled}
                    onChange={(e) => onUpdate({ bookingEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-700">Enable booking</span>
            </label>

            {/* Merve Enabled */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.merveConfig?.enabled || false}
                    onChange={(e) => onUpdate({ merveConfig: { ...form.merveConfig, enabled: e.target.checked } })}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-700">Enable Merve AI agent</span>
            </label>
        </div>
    );
};

export default ActivityOptionsSection;
