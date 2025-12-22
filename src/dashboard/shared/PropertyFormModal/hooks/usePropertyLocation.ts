/**
 * usePropertyLocation - Geocoding and map handlers
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { MAPBOX_TOKEN, CANONICAL_DISTRICTS } from '../constants';
import type { PropertyFormData, MapboxFeature } from '../types';
import type { Map as MapboxMap, Marker as MapboxMarkerType } from 'mapbox-gl';

interface UsePropertyLocationOptions {
    form: PropertyFormData;
    setForm: React.Dispatch<React.SetStateAction<PropertyFormData>>;
    isOpen: boolean;
    activeFormTab: string;
}

export function usePropertyLocation({
    form,
    setForm,
    isOpen,
    activeFormTab,
}: UsePropertyLocationOptions) {
    const [searchQuery, setSearchQuery] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationSuggestions, setLocationSuggestions] = useState<MapboxFeature[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapboxMap | null>(null);
    const markerRef = useRef<MapboxMarkerType | null>(null);

    // Build location data from Mapbox feature
    const buildLocationFromFeature = useCallback((feature: MapboxFeature) => {
        const [lng, lat] = feature.center || [0, 0];
        const ctx = feature.context || [];
        const district =
            ctx.find((c) => c.id?.startsWith('place') || c.id?.startsWith('locality'))?.text ||
            feature.text;
        const region = ctx.find((c) => c.id?.startsWith('region'))?.text;
        const country = ctx.find((c) => c.id?.startsWith('country'))?.text;
        return {
            latitude: lat,
            longitude: lng,
            location: district || feature.text,
            placeName: feature.place_name,
            formattedAddress: feature.place_name,
            region,
            country,
        };
    }, []);

    // Place marker on map
    const placeMarker = useCallback(
        async (lng?: number, lat?: number) => {
            if (!mapRef.current || !lng || !lat || !MAPBOX_TOKEN) return;
            const mapboxgl = await import('mapbox-gl');
            mapboxgl.default.accessToken = MAPBOX_TOKEN;

            if (!markerRef.current) {
                markerRef.current = new mapboxgl.default.Marker({ color: '#0f172a' })
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);
            } else {
                markerRef.current.setLngLat([lng, lat]);
            }
        },
        []
    );

    // Reverse geocode coordinates
    const reverseGeocode = useCallback(
        async (lng?: number, lat?: number) => {
            if (!MAPBOX_TOKEN || lng === undefined || lat === undefined) return;
            try {
                const resp = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,locality,region&limit=1`
                );
                const data = await resp.json();
                const feature = data.features?.[0];
                if (feature) {
                    const parsed = buildLocationFromFeature(feature);
                    setForm((prev) => ({
                        ...prev,
                        ...parsed,
                    }));
                    setSearchQuery(parsed.formattedAddress);
                }
            } catch (err) {
                console.error('Reverse geocode failed', err);
            }
        },
        [buildLocationFromFeature, setForm]
    );

    // Handle suggestion selection
    const handleSuggestionSelect = useCallback(
        async (feature: MapboxFeature) => {
            const [lng, lat] = feature.center || [0, 0];
            const parsed = buildLocationFromFeature(feature);
            setForm((prev) => ({
                ...prev,
                ...parsed,
            }));
            setSearchQuery(feature.place_name);
            setLocationSuggestions([]);

            if (MAPBOX_TOKEN && mapRef.current) {
                await placeMarker(lng, lat);
                mapRef.current.flyTo({ center: [lng, lat], zoom: 13 });
            }
        },
        [buildLocationFromFeature, setForm, placeMarker]
    );

    // Use current location
    const useMyLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }
        setLocationLoading(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setForm((prev) => ({ ...prev, latitude, longitude }));
                await reverseGeocode(longitude, latitude);
                if (MAPBOX_TOKEN && mapRef.current) {
                    await placeMarker(longitude, latitude);
                    mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13 });
                }
                setLocationLoading(false);
            },
            (err) => {
                console.error(err);
                setLocationError('Unable to fetch location');
                setLocationLoading(false);
            }
        );
    }, [setForm, reverseGeocode, placeMarker]);

    // Fetch suggestions on search query change
    useEffect(() => {
        if (!MAPBOX_TOKEN || searchQuery.trim().length < 3) {
            setLocationSuggestions([]);
            return;
        }
        const controller = new AbortController();
        const fetchSuggestions = async () => {
            try {
                setLocationLoading(true);
                const bbox = '32.0,34.0,35.0,36.8';
                const proximityLng = form.longitude || 33.32;
                const proximityLat = form.latitude || 35.33;
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    searchQuery
                )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=address,place,locality,poi&country=cy,tr&bbox=${bbox}&proximity=${proximityLng},${proximityLat}&language=en`;
                const resp = await fetch(url, { signal: controller.signal });
                const data = await resp.json();
                const features = (data.features || []).filter((f: MapboxFeature) => f.place_name);

                if (features.length === 0) {
                    const fallback = CANONICAL_DISTRICTS.filter((d) =>
                        d.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((d, idx) => ({
                        id: `fallback-${idx}`,
                        text: d,
                        place_name: d,
                        center: [proximityLng, proximityLat] as [number, number],
                        context: [],
                    }));
                    setLocationSuggestions(fallback);
                } else {
                    setLocationSuggestions(features);
                }
            } catch (err) {
                if (!(err instanceof DOMException)) {
                    console.error('Geocode error', err);
                }
            } finally {
                setLocationLoading(false);
            }
        };
        fetchSuggestions();
        return () => controller.abort();
    }, [searchQuery, form.latitude, form.longitude]);

    // Initialize map
    useEffect(() => {
        const initMap = async () => {
            if (!isOpen || activeFormTab !== 'location' || !MAPBOX_TOKEN || !mapContainerRef.current)
                return;
            const mapboxgl = await import('mapbox-gl');
            mapboxgl.default.accessToken = MAPBOX_TOKEN;

            if (!mapRef.current) {
                mapRef.current = new mapboxgl.default.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [form.longitude || 33.32, form.latitude || 35.33],
                    zoom: 11,
                });
                mapRef.current.on('click', async (e) => {
                    setForm((prev) => ({ ...prev, latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
                    await placeMarker(e.lngLat.lng, e.lngLat.lat);
                    reverseGeocode(e.lngLat.lng, e.lngLat.lat);
                });
            } else {
                mapRef.current.setCenter([form.longitude || 33.32, form.latitude || 35.33]);
            }
            await placeMarker(form.longitude, form.latitude);
        };

        initMap();
    }, [isOpen, activeFormTab, form.latitude, form.longitude, setForm, placeMarker, reverseGeocode]);

    return {
        mapContainerRef,
        searchQuery,
        setSearchQuery,
        locationLoading,
        locationSuggestions,
        locationError,
        handleSuggestionSelect,
        useMyLocation,
    };
}
