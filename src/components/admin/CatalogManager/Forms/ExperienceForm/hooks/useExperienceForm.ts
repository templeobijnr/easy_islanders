/**
 * useExperienceForm - State and handlers hook
 */
import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, Timestamp, collection } from "firebase/firestore";
import { db } from "../../../../../../services/firebaseConfig";
import type { UnifiedListing } from "../../../../../../types";
import type { LocationValue } from "../../../../Shared/LocationPicker";
import type { ExperienceFormProps, ExperienceFormState } from "../types";
import { DEFAULT_EXPERIENCE_STATE } from "../types";
import { EXPERIENCE_CATEGORIES, PLACES_PROXY_URL } from "../constants";

export function useExperienceForm({ initialValue, onSave }: ExperienceFormProps) {
    const [form, setForm] = useState<ExperienceFormState>(DEFAULT_EXPERIENCE_STATE);
    const [isSaving, setIsSaving] = useState(false);
    const [importResults, setImportResults] = useState<any[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [showImportPanel, setShowImportPanel] = useState(false);

    useEffect(() => {
        if (initialValue) {
            setForm({
                ...DEFAULT_EXPERIENCE_STATE,
                category: initialValue.category || "tours",
                subcategory: initialValue.subcategory || "",
                title: initialValue.title || initialValue.name || "",
                description: initialValue.description || "",
                address: initialValue.address || "",
                lat: initialValue.coordinates?.lat || 0,
                lng: initialValue.coordinates?.lng || 0,
                region: initialValue.region || "",
                subregion: initialValue.subregion || "",
                phone: initialValue.phone || "",
                email: initialValue.email || "",
                website: initialValue.website || "",
                images: initialValue.images || [],
                rating: initialValue.rating || 0,
                displayPrice: initialValue.displayPrice || "",
                googlePlaceId: initialValue.googlePlaceId || "",
                showOnMap: initialValue.showOnMap !== false,
                bookingEnabled: initialValue.bookingEnabled || false,
                merveConfig: initialValue.merveConfig || { enabled: false, actions: [] },
            });
        }
    }, [initialValue]);

    const updateForm = useCallback((updates: Partial<ExperienceFormState>) => setForm((prev) => ({ ...prev, ...updates })), []);

    const handleLocationChange = useCallback((location: LocationValue) => {
        updateForm({ lat: location.lat, lng: location.lng, address: location.address || form.address, region: location.region || form.region });
    }, [form.address, form.region, updateForm]);

    const handleImportSearch = useCallback(async (query: string) => {
        if (!query.trim() || !PLACES_PROXY_URL) return;
        setImportLoading(true);
        try {
            const res = await fetch(`${PLACES_PROXY_URL}?action=textSearch&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            setImportResults(data.results || []);
        } catch (err) { setImportResults([]); }
        finally { setImportLoading(false); }
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
                });
                setShowImportPanel(false);
                setImportResults([]);
            }
        } catch (err) { console.error("Import failed:", err); }
        finally { setImportLoading(false); }
    }, [updateForm]);

    const handleBrowseCategory = useCallback(async () => {
        const category = EXPERIENCE_CATEGORIES.find((c) => c.value === form.category);
        if (category && form.region) {
            const regionName = form.region.charAt(0).toUpperCase() + form.region.slice(1);
            const query = `${category.label.replace(/[^\w\s]/g, "")} in ${regionName}, Northern Cyprus`;
            await handleImportSearch(query);
            setShowImportPanel(true);
        }
    }, [form.category, form.region, handleImportSearch]);

    const handleSubmit = useCallback(async () => {
        if (!form.title.trim()) return;
        setIsSaving(true);
        try {
            const listingData: UnifiedListing = {
                id: initialValue?.id || "",
                type: "experience",
                category: form.category,
                title: form.title,
                name: form.title,
                description: form.description,
                address: form.address,
                coordinates: form.lat && form.lng ? { lat: form.lat, lng: form.lng } : undefined,
                region: form.region as any,
                subregion: form.subregion || undefined,
                phone: form.phone || undefined,
                email: form.email || undefined,
                website: form.website || undefined,
                images: form.images,
                rating: form.rating || undefined,
                displayPrice: form.displayPrice || undefined,
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
        } catch (err) { console.error("Save failed:", err); }
        finally { setIsSaving(false); }
    }, [form, initialValue, onSave]);

    return { form, updateForm, isSaving, importResults, importLoading, showImportPanel, setShowImportPanel, handleLocationChange, handleImportSearch, handleImportPlace, handleBrowseCategory, handleSubmit };
}
