import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import MapMini from './MapMini';

// ============================================================================
// LOCATION PICKER - Shared component for map + address search
// ============================================================================

const PLACES_PROXY_URL =
    import.meta.env.VITE_PLACES_PROXY_URL ||
    (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') + '/googlePlacesProxy'
        : '');

// Types
export interface LocationValue {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
}

export interface PlaceSuggestion {
    id: string;
    primary: string;
    secondary: string;
}

export interface LocationPickerProps {
    value: LocationValue;
    onChange: (value: LocationValue) => void;
    onPlaceSelected?: (suggestion: PlaceSuggestion) => void;
    showSearchInput?: boolean;
    height?: string;
    disabled?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    onPlaceSelected,
    showSearchInput = true,
    height = 'h-64',
    disabled = false,
}) => {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle address search with debounce
    const handleSearch = async (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(
                    `${PLACES_PROXY_URL}?action=autocomplete&input=${encodeURIComponent(query)}&region=cy`
                );
                const data = await res.json();
                if (data.predictions) {
                    const mapped = data.predictions.map((p: any) => ({
                        id: p.place_id,
                        primary: p.structured_formatting?.main_text || p.description,
                        secondary: p.structured_formatting?.secondary_text || '',
                    }));
                    setSuggestions(mapped);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error('Location search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    // Handle suggestion selection
    const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);

        // Fetch place details to get coordinates
        try {
            setIsSearching(true);
            const res = await fetch(
                `${PLACES_PROXY_URL}?action=details&placeId=${suggestion.id}`
            );
            const data = await res.json();

            if (data.result) {
                const newLocation: LocationValue = {
                    lat: data.result.geometry?.location?.lat || value.lat,
                    lng: data.result.geometry?.location?.lng || value.lng,
                    address: data.result.formatted_address || `${suggestion.primary}, ${suggestion.secondary}`,
                    placeId: suggestion.id,
                };
                onChange(newLocation);

                // Notify parent about the full selection (for optional import)
                if (onPlaceSelected) {
                    onPlaceSelected(suggestion);
                }
            }
        } catch (err) {
            console.error('Failed to fetch place details:', err);
            // Still update with what we have
            onChange({
                ...value,
                address: `${suggestion.primary}, ${suggestion.secondary}`,
                placeId: suggestion.id,
            });
        } finally {
            setIsSearching(false);
        }
    };

    // Handle map marker drag
    const handleMapChange = (lat: number, lng: number) => {
        onChange({
            ...value,
            lat,
            lng,
        });
    };

    // Handle manual address input
    const handleAddressChange = (address: string) => {
        onChange({
            ...value,
            address,
        });
        // Also trigger search for suggestions
        handleSearch(address);
    };

    return (
        <div className="space-y-4" ref={containerRef}>
            {/* Map */}
            <div className={`${height} rounded-xl overflow-hidden`}>
                <MapMini
                    lat={value.lat}
                    lng={value.lng}
                    onChange={handleMapChange}
                />
            </div>

            {/* Address Input with Search */}
            {showSearchInput && (
                <div className="relative">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 text-slate-500" size={16} />
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 pr-10 focus:border-cyan-500 focus:outline-none text-white disabled:opacity-50"
                            placeholder="Address - type to search or enter manually"
                            value={searchQuery || value.address}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            onFocus={() => {
                                if (suggestions.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                            disabled={disabled}
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3 top-3.5 text-cyan-500 animate-spin" size={16} />
                        )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {suggestions.map((s) => (
                                <div
                                    key={s.id}
                                    className="px-4 py-3 hover:bg-slate-800 cursor-pointer"
                                    onClick={() => handleSelectSuggestion(s)}
                                >
                                    <p className="text-white text-sm font-medium">{s.primary}</p>
                                    <p className="text-slate-400 text-xs">{s.secondary}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationPicker;
