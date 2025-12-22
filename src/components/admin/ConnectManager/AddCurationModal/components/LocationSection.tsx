/**
 * LocationSection - Location mode tabs, venue search, geocoding search, manual entry
 */
import React from "react";
import {
    Search,
    X,
    MapPin,
    Globe,
    Loader2,
    Navigation,
} from "lucide-react";
import type { Venue, GeocodingResult } from "../curationTypes";

interface LocationSectionProps {
    mode: "quick" | "create";
    locationMode: "venue" | "search" | "manual";
    setLocationMode: (mode: "venue" | "search" | "manual") => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filteredVenues: Venue[];
    selectedVenue: Venue | null;
    setSelectedVenue: (v: Venue | null) => void;
    geoSearchQuery: string;
    setGeoSearchQuery: (q: string) => void;
    geoResults: GeocodingResult[];
    isGeoSearching: boolean;
    selectedLocation: GeocodingResult | null;
    setSelectedLocation: (l: GeocodingResult | null) => void;
    manualAddress: string;
    setManualAddress: (a: string) => void;
    manualLat: string;
    setManualLat: (l: string) => void;
    manualLng: string;
    setManualLng: (l: string) => void;
    onGetCurrentLocation: () => void;
}

const LocationSection: React.FC<LocationSectionProps> = ({
    mode,
    locationMode,
    setLocationMode,
    searchQuery,
    setSearchQuery,
    filteredVenues,
    selectedVenue,
    setSelectedVenue,
    geoSearchQuery,
    setGeoSearchQuery,
    geoResults,
    isGeoSearching,
    selectedLocation,
    setSelectedLocation,
    manualAddress,
    setManualAddress,
    manualLat,
    setManualLat,
    manualLng,
    setManualLng,
    onGetCurrentLocation,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
                {mode === "create" ? "Event Location" : "Select Venue"}
                <span className="text-red-400 ml-1">*</span>
            </label>

            {/* Location Mode Tabs (only in create mode) */}
            {mode === "create" && (
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setLocationMode("venue")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${locationMode === "venue"
                                ? "bg-purple-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Our Venues
                    </button>
                    <button
                        onClick={() => setLocationMode("search")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${locationMode === "search"
                                ? "bg-purple-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Search Places
                    </button>
                    <button
                        onClick={() => setLocationMode("manual")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${locationMode === "manual"
                                ? "bg-purple-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Manual Entry
                    </button>
                </div>
            )}

            {/* Venue Search */}
            {(locationMode === "venue" || mode === "quick") && !selectedVenue && (
                <div className="relative z-10">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search our venues..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {filteredVenues.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-xl border border-white/10 shadow-2xl z-20">
                            {filteredVenues.map((venue) => (
                                <button
                                    key={venue.id}
                                    onClick={() => {
                                        setSelectedVenue(venue);
                                        setSearchQuery("");
                                    }}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 text-left transition-colors"
                                >
                                    {venue.images?.[0] ? (
                                        <img
                                            src={venue.images[0]}
                                            className="w-10 h-10 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-slate-600 rounded-lg" />
                                    )}
                                    <div>
                                        <div className="text-white font-medium">{venue.title}</div>
                                        <div className="text-slate-500 text-xs">
                                            {venue.category} • {venue.region}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Geocoding Search */}
            {locationMode === "search" && mode === "create" && !selectedLocation && (
                <div className="relative z-10">
                    <Globe
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                        type="text"
                        value={geoSearchQuery}
                        onChange={(e) => setGeoSearchQuery(e.target.value)}
                        placeholder="Search any place worldwide..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {isGeoSearching && (
                        <Loader2
                            size={18}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin"
                        />
                    )}
                    {geoResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-xl border border-white/10 shadow-2xl z-20">
                            {geoResults.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        setSelectedLocation(result);
                                        setGeoSearchQuery("");
                                    }}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 text-left transition-colors"
                                >
                                    <MapPin size={18} className="text-purple-400 flex-shrink-0" />
                                    <div>
                                        <div className="text-white font-medium">{result.text}</div>
                                        <div className="text-slate-500 text-xs truncate">
                                            {result.place_name}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Manual Entry */}
            {locationMode === "manual" && mode === "create" && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder="Type address or location name..."
                            className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500"
                        />
                        <button
                            onClick={onGetCurrentLocation}
                            className="px-4 py-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors"
                            title="Use current location"
                        >
                            <Navigation size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            placeholder="Latitude (optional)"
                            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500"
                        />
                        <input
                            type="text"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            placeholder="Longitude (optional)"
                            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500"
                        />
                    </div>
                </div>
            )}

            {/* Selected Venue Display */}
            {selectedVenue && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-3">
                    {selectedVenue.images?.[0] && (
                        <img
                            src={selectedVenue.images[0]}
                            className="w-12 h-12 rounded-lg object-cover"
                        />
                    )}
                    <div className="flex-1">
                        <div className="text-white font-medium">{selectedVenue.title}</div>
                        <div className="text-slate-400 text-xs flex items-center gap-2">
                            <MapPin size={12} /> {selectedVenue.region} •{" "}
                            {selectedVenue.category}
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedVenue(null)}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Selected Location Display */}
            {selectedLocation && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-3">
                    <MapPin size={24} className="text-purple-400" />
                    <div className="flex-1">
                        <div className="text-white font-medium">{selectedLocation.text}</div>
                        <div className="text-slate-400 text-xs truncate">
                            {selectedLocation.place_name}
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedLocation(null)}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LocationSection;
