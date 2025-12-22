/**
 * MapPinActionsSection - Toggle map pin actions
 */
import React from 'react';
import type { PlaceFormState } from '../types';

interface MapPinActionsSectionProps {
    form: PlaceFormState;
    setForm: React.Dispatch<React.SetStateAction<PlaceFormState>>;
}

const MapPinActionsSection: React.FC<MapPinActionsSectionProps> = ({
    form,
    setForm,
}) => {
    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">🗺️ Map Pin Actions</h3>
            <p className="text-xs text-slate-500 -mt-2">
                Toggle which actions users can take on this listing's map pin
            </p>

            <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                    <input
                        type="checkbox"
                        checked={form.allowCheckIn}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                allowCheckIn: e.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span className="text-sm text-white">📍 Check In</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                    <input
                        type="checkbox"
                        checked={form.allowJoin}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                allowJoin: e.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span className="text-sm text-white">🙋 Join</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                    <input
                        type="checkbox"
                        checked={form.allowWave}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                allowWave: e.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span className="text-sm text-white">👋 Wave</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                    <input
                        type="checkbox"
                        checked={form.allowTaxi}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                allowTaxi: e.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span className="text-sm text-white">🚕 Taxi</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50 col-span-2">
                    <input
                        type="checkbox"
                        checked={form.allowNavigate}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                allowNavigate: e.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span className="text-sm text-white">🧭 Navigate (Google Maps)</span>
                </label>
            </div>
        </div>
    );
};

export default MapPinActionsSection;
