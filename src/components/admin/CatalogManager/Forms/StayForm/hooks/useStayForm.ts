/**
 * useStayForm - State and handlers hook
 */
import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, Timestamp, collection } from "firebase/firestore";
import { db } from "../../../../../../services/firebaseConfig";
import type { UnifiedListing } from "../../../../../../types";
import type { LocationValue } from "../../../../Shared/LocationPicker";
import type { StayFormProps, StayFormState } from "../types";
import { DEFAULT_STAY_STATE } from "../types";

export function useStayForm({ initialValue, onSave }: StayFormProps) {
    const [form, setForm] = useState<StayFormState>(DEFAULT_STAY_STATE);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialValue) {
            setForm({
                ...DEFAULT_STAY_STATE,
                category: initialValue.category || "stays_villas",
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
                propertyType: initialValue.propertyType || "Villa",
                bedrooms: initialValue.bedrooms || 1,
                bathrooms: initialValue.bathrooms || 1,
                amenities: initialValue.amenities || [],
                pricePerNight: initialValue.pricePerNight || 0,
                currency: initialValue.currency || "EUR",
                cleaningFee: initialValue.cleaningFee || 0,
                hostName: initialValue.hostName || "",
                hostPhone: initialValue.hostPhone || "",
                hostEmail: initialValue.hostEmail || "",
                bookingEnabled: initialValue.bookingEnabled || false,
                merveConfig: initialValue.merveConfig || { enabled: false, actions: [] },
            });
        }
    }, [initialValue]);

    const updateForm = useCallback((updates: Partial<StayFormState>) => setForm((prev) => ({ ...prev, ...updates })), []);

    const handleLocationChange = useCallback((location: LocationValue) => {
        updateForm({ lat: location.lat, lng: location.lng, address: location.address || form.address, region: location.region || form.region });
    }, [form.address, form.region, updateForm]);

    const toggleAmenity = useCallback((amenity: string) => {
        updateForm({ amenities: form.amenities.includes(amenity) ? form.amenities.filter((a) => a !== amenity) : [...form.amenities, amenity] });
    }, [form.amenities, updateForm]);

    const handleSubmit = useCallback(async () => {
        if (!form.title.trim()) return;
        setIsSaving(true);
        try {
            const listingData: UnifiedListing = {
                id: initialValue?.id || "",
                type: "stay",
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
                propertyType: form.propertyType || undefined,
                bedrooms: form.bedrooms || undefined,
                bathrooms: form.bathrooms || undefined,
                amenities: form.amenities.length ? form.amenities : undefined,
                pricePerNight: form.pricePerNight || undefined,
                currency: form.currency || undefined,
                cleaningFee: form.cleaningFee || undefined,
                hostName: form.hostName || undefined,
                hostPhone: form.hostPhone || undefined,
                hostEmail: form.hostEmail || undefined,
                bookingEnabled: form.bookingEnabled,
                merveConfig: form.merveConfig as any,
                showOnMap: true,
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

    return { form, updateForm, isSaving, handleLocationChange, toggleAmenity, handleSubmit };
}
