/**
 * usePlaceFormHandlers - Handlers for PlaceForm
 */
import { useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import type { LocationValue } from '@/components/admin/Shared/LocationPicker';
import { GoogleImportService } from '@/services/integrations/google/google-import.client';
import { normalizeLocation } from '@/utils/LocationNormalizer';
import { PLACES_PROXY_URL, PLACE_CATEGORIES } from '../constants';
import type { PlaceFormState, ImportSuggestion } from '../types';
import type { NormalizationResult, RegionConfig } from '@/types/adminConfig';

interface UsePlaceFormHandlersOptions {
    form: PlaceFormState;
    setForm: React.Dispatch<React.SetStateAction<PlaceFormState>>;
    setNormalizationResult: (result: NormalizationResult | null) => void;
    setImportSuggestions: (suggestions: ImportSuggestion[]) => void;
    setIsImporting: (importing: boolean) => void;
    setImportSearchQuery: (query: string) => void;
}

export function usePlaceFormHandlers({
    form,
    setForm,
    setNormalizationResult,
    setImportSuggestions,
    setIsImporting,
    setImportSearchQuery,
}: UsePlaceFormHandlersOptions) {
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLocationChange = useCallback(
        (location: LocationValue) => {
            setForm((prev) => ({
                ...prev,
                lat: location.lat,
                lng: location.lng,
                address: location.address,
                googlePlaceId: location.placeId || prev.googlePlaceId,
            }));
        },
        [setForm]
    );

    const handleImportSearch = useCallback(
        async (query: string) => {
            setImportSearchQuery(query);

            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            if (query.length < 3) {
                setImportSuggestions([]);
                return;
            }

            searchTimeoutRef.current = setTimeout(async () => {
                setIsImporting(true);
                try {
                    const res = await fetch(
                        `${PLACES_PROXY_URL}?action=autocomplete&input=${encodeURIComponent(query)}&region=cy`
                    );
                    const data = await res.json();
                    if (data.predictions) {
                        setImportSuggestions(
                            data.predictions.map((p: any) => ({
                                id: p.place_id,
                                primary: p.structured_formatting?.main_text || p.description,
                                secondary: p.structured_formatting?.secondary_text || '',
                            }))
                        );
                    }
                } catch (err) {
                    console.error('Import search failed:', err);
                } finally {
                    setIsImporting(false);
                }
            }, 300);
        },
        [setImportSearchQuery, setImportSuggestions, setIsImporting]
    );

    const handleImportPlace = useCallback(
        async (placeId: string) => {
            setIsImporting(true);
            setImportSuggestions([]);
            setImportSearchQuery('');

            try {
                const details = await GoogleImportService.getPlaceDetails(placeId);
                if (!details) {
                    return { error: 'Failed to fetch place details' };
                }

                const mapped = GoogleImportService.mapToActivity(details);

                let importedImages: string[] = [];
                if (details.photos?.length) {
                    try {
                        importedImages = await GoogleImportService.importImages(
                            details.photos.slice(0, 5),
                            placeId
                        );
                    } catch (err) {
                        console.warn('Image import failed:', err);
                    }
                }

                // Run location normalization
                const lat = details.geometry?.location?.lat;
                const lng = details.geometry?.location?.lng;
                const normResult = await normalizeLocation({
                    lat,
                    lng,
                    address: details.formatted_address,
                    addressComponents: (details as any).address_components,
                });

                setNormalizationResult(normResult);

                let detectedRegion = form.region;
                let detectedSubregion = '';

                if (normResult.match) {
                    detectedRegion = normResult.match.regionLabel;
                    if (normResult.match.subRegionLabel) {
                        detectedSubregion = normResult.match.subRegionLabel;
                    }
                    logger.debug(
                        `[LocationNormalizer] Matched: ${detectedRegion}/${detectedSubregion} (${normResult.match.method}, ${normResult.match.confidence}%)`
                    );
                }

                setForm((prev) => ({
                    ...prev,
                    title: mapped.title || prev.title,
                    description: mapped.description || prev.description,
                    address: details.formatted_address || mapped.region || prev.address,
                    lat: lat || prev.lat,
                    lng: lng || prev.lng,
                    region: detectedRegion,
                    subregion: detectedSubregion,
                    phone: details.international_phone_number || prev.phone,
                    website: details.website || prev.website,
                    rating: details.rating || prev.rating,
                    priceLevel: details.price_level || prev.priceLevel,
                    openingHours: details.opening_hours?.weekday_text || prev.openingHours,
                    images: importedImages.length > 0 ? importedImages : prev.images,
                    googlePlaceId: placeId,
                }));

                return { success: true };
            } catch (err) {
                console.error('Import failed:', err);
                return { error: 'Failed to import place details' };
            } finally {
                setIsImporting(false);
            }
        },
        [form.region, setForm, setIsImporting, setImportSuggestions, setImportSearchQuery, setNormalizationResult]
    );

    const handleBrowseCategory = useCallback(async () => {
        const categoryConfig = PLACE_CATEGORIES.find((c) => c.value === form.category);
        if (!categoryConfig) return;

        setIsImporting(true);
        try {
            const location = form.subregion || form.region;
            const query = `${categoryConfig.searchKeyword} in ${location}, North Cyprus`;
            const res = await fetch(
                `${PLACES_PROXY_URL}?action=textsearch&query=${encodeURIComponent(query)}&region=cy`
            );
            const data = await res.json();

            if (data.results) {
                setImportSuggestions(
                    data.results.map((r: any) => ({
                        id: r.place_id,
                        primary: r.name,
                        secondary: r.formatted_address,
                    }))
                );
            }
        } catch (err) {
            console.error('Browse failed:', err);
        } finally {
            setIsImporting(false);
        }
    }, [form.category, form.subregion, form.region, setIsImporting, setImportSuggestions]);

    return {
        handleLocationChange,
        handleImportSearch,
        handleImportPlace,
        handleBrowseCategory,
    };
}
