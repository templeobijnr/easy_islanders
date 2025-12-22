/**
 * useActivityForm - State and handlers hook
 */
import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, Timestamp, collection } from "firebase/firestore";
import { db } from "../../../../../../services/firebaseConfig";
import type { UnifiedListing } from "../../../../../../types";
import type { LocationValue } from "../../../../Shared/LocationPicker";
import type { ActivityFormProps, ActivityFormState } from "../types";
import { DEFAULT_ACTIVITY_STATE, } from "../types";
import { ACTIVITY_CATEGORIES, PLACES_PROXY_URL, REGIONS_WITH_SUBREGIONS } from "../constants";

export function useActivityForm({ initialValue, onSave }: ActivityFormProps) {
    const [form, setForm] = useState<ActivityFormState>(DEFAULT_ACTIVITY_STATE);
    const [isSaving, setIsSaving] = useState(false);
    const [importResults, setImportResults] = useState<any[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [showImportPanel, setShowImportPanel] = useState(false);

    // Initialize from existing value
    useEffect(() => {
        if (initialValue) {
            setForm({
                ...DEFAULT_ACTIVITY_STATE,
                category: initialValue.category || "",
                subcategory: initialValue.subcategory || "",
                title: initialValue.title || initialValue.name || "",
                description: initialValue.description || "",
                address: initialValue.address || "",
                lat: initialValue.coordinates?.lat || 0,
                lng: initialValue.coordinates?.lng || 0,
                region: initialValue.region || "",
                subregion: initialValue.subregion || "",
                cityId: initialValue.cityId || "",
                phone: initialValue.phone || "",
                email: initialValue.email || "",
                website: initialValue.website || "",
                images: initialValue.images || [],
                rating: initialValue.rating || 0,
                priceLevel: initialValue.priceLevel || 0,
                displayPrice: initialValue.displayPrice || "",
                openingHours: initialValue.openingHours || [],
                googlePlaceId: initialValue.googlePlaceId || "",
                showOnMap: initialValue.showOnMap !== false,
                bookingEnabled: initialValue.bookingEnabled || false,
                merveConfig: initialValue.merveConfig || { enabled: false, actions: [] },
            });
        }
    }, [initialValue]);

    const updateForm = useCallback((updates: Partial<ActivityFormState>) => {
        setForm((prev) => ({ ...prev, ...updates }));
    }, []);

    const handleLocationChange = useCallback((location: LocationValue) => {
        updateForm({
            lat: location.lat,
            lng: location.lng,
            address: location.address || form.address,
            region: location.region || form.region,
        });
    }, [form.address, form.region, updateForm]);

    const handleImportSearch = useCallback(async (query: string) => {
        if (!query.trim() || !PLACES_PROXY_URL) return;
        setImportLoading(true);
        try {
            const res = await fetch(`${PLACES_PROXY_URL}?action=textSearch&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            setImportResults(data.results || []);
        } catch (err) {
            console.error("Search failed:", err);
            setImportResults([]);
        } finally {
            setImportLoading(false);
        }
    }, []);

    const handleImportPlace = useCallback(async (placeId: string) => {
        if (!PLACES_PROXY_URL) return;
        setImportLoading(true);
        try {
            const res = await fetch(`${PLACES_PROXY_URL}?action=placeDetails&placeId=${placeId}`);
            const data = await res.json();
            if (data.result) {
                const place = data.result;
                updateForm({
                    title: place.name || "",
                    address: place.formatted_address || "",
                    lat: place.geometry?.location?.lat || 0,
                    lng: place.geometry?.location?.lng || 0,
                    phone: place.formatted_phone_number || "",
                    website: place.website || "",
                    rating: place.rating || 0,
                    googlePlaceId: placeId,
                    openingHours: place.opening_hours?.weekday_text || [],
                });
                setShowImportPanel(false);
                setImportResults([]);
            }
        } catch (err) {
            console.error("Import failed:", err);
        } finally {
            setImportLoading(false);
        }
    }, [updateForm]);

    const handleBrowseCategory = useCallback(async () => {
        const category = ACTIVITY_CATEGORIES.find((c) => c.value === form.category);
        if (category?.searchKeyword && form.region) {
            const regionName = form.region.charAt(0).toUpperCase() + form.region.slice(1);
            const query = `${category.searchKeyword} in ${regionName}, Northern Cyprus`;
            await handleImportSearch(query);
            setShowImportPanel(true);
        }
    }, [form.category, form.region, handleImportSearch]);

    const handleSubmit = useCallback(async () => {
        if (!form.title.trim() || !form.category) return;
        setIsSaving(true);
        try {
            const listingData: UnifiedListing = {
                id: initialValue?.id || "",
                type: "activity",
                category: form.category,
                subcategory: form.subcategory || undefined,
                title: form.title,
                name: form.title,
                description: form.description,
                address: form.address,
                coordinates: form.lat && form.lng ? { lat: form.lat, lng: form.lng } : undefined,
                region: form.region as any,
                subregion: form.subregion || undefined,
                cityId: form.cityId || undefined,
                phone: form.phone || undefined,
                email: form.email || undefined,
                website: form.website || undefined,
                images: form.images,
                rating: form.rating || undefined,
                priceLevel: form.priceLevel || undefined,
                displayPrice: form.displayPrice || undefined,
                openingHours: form.openingHours.length ? form.openingHours : undefined,
                googlePlaceId: form.googlePlaceId || undefined,
                showOnMap: form.showOnMap,
                bookingEnabled: form.bookingEnabled,
                merveConfig: form.merveConfig as any,
                updatedAt: new Date(),
            };

            if (!initialValue?.id) {
                const ref = doc(collection(db, "listings"));
                listingData.id = ref.id;
                listingData.createdAt = new Date();
                await setDoc(ref, { ...listingData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
            } else {
                await setDoc(doc(db, "listings", initialValue.id), { ...listingData, updatedAt: Timestamp.now() }, { merge: true });
            }

            onSave(listingData);
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    }, [form, initialValue, onSave]);

    return {
        form,
        updateForm,
        isSaving,
        importResults,
        importLoading,
        showImportPanel,
        setShowImportPanel,
        handleLocationChange,
        handleImportSearch,
        handleImportPlace,
        handleBrowseCategory,
        handleSubmit,
    };
}
