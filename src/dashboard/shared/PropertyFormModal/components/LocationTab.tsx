/**
 * LocationTab - Map and address search
 */
import React from 'react';
import { Search, Crosshair, Loader2 } from 'lucide-react';
import type { PropertyFormData, MapboxFeature } from '../types';

interface LocationTabProps {
    form: PropertyFormData;
    mapContainerRef: React.RefObject<HTMLDivElement>;
    searchQuery: string;
    locationLoading: boolean;
    locationSuggestions: MapboxFeature[];
    locationError: string | null;
    onSearchChange: (query: string) => void;
    onSuggestionSelect: (feature: MapboxFeature) => void;
    onUseMyLocation: () => void;
}

const LocationTab: React.FC<LocationTabProps> = ({
    form,
    mapContainerRef,
    searchQuery,
    locationLoading,
    locationSuggestions,
    locationError,
    onSearchChange,
    onSuggestionSelect,
    onUseMyLocation,
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search address or place..."
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                    {locationSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                            {locationSuggestions.map((f) => (
                                <div
                                    key={f.id}
                                    onClick={() => onSuggestionSelect(f)}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                >
                                    <div className="font-medium text-slate-900 text-sm">{f.text}</div>
                                    <div className="text-xs text-slate-500 truncate">{f.place_name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={onUseMyLocation}
                    disabled={locationLoading}
                    className="px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800"
                >
                    {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                    My Location
                </button>
            </div>

            {locationError && (
                <div className="text-xs text-red-600 font-semibold">{locationError}</div>
            )}

            {/* Map */}
            <div
                ref={mapContainerRef}
                className="w-full h-80 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100"
            />

            {/* Coordinates Display */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-xs text-slate-500 font-bold uppercase">Latitude</div>
                    <div className="font-mono font-bold text-slate-900">{form.latitude?.toFixed(6) || 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-xs text-slate-500 font-bold uppercase">Longitude</div>
                    <div className="font-mono font-bold text-slate-900">{form.longitude?.toFixed(6) || 'N/A'}</div>
                </div>
            </div>

            {form.formattedAddress && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-xs text-green-600 font-bold uppercase mb-1">Selected Address</div>
                    <div className="text-green-900 font-medium">{form.formattedAddress}</div>
                </div>
            )}
        </div>
    );
};

export default LocationTab;
