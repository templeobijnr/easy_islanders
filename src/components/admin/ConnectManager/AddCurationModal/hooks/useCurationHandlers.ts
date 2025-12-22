/**
 * useCurationHandlers - Handlers for AddCurationModal
 *
 * Save logic extracted to utils/saveCuration.ts
 */
import { useCallback } from "react";
import { UnifiedListingsService } from "@/services/unifiedListingsService";
import {
    uploadImage,
    validateImageFile,
} from "@/services/infrastructure/storage/image-upload.service";
import { MAPBOX_TOKEN } from "../constants";
import { saveCuration } from "../utils/saveCuration";
import type { Venue, GeocodingResult } from "../../curationTypes";

interface CurationState {
    mode: "quick" | "create";
    locationMode: "venue" | "search" | "manual";
    selectedVenue: Venue | null;
    selectedLocation: GeocodingResult | null;
    manualAddress: string;
    manualLat: string;
    manualLng: string;
    eventTitle: string;
    eventDesc: string;
    eventCategory: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    region: string;
    uploadedImages: string[];
    enabledActions: Record<string, boolean>;
    actionUrls: Record<string, string>;
    selectedSections: string[];
}

interface CurationHandlersOptions {
    state: CurationState;
    setVenues: (venues: Venue[]) => void;
    setIsLoading: (loading: boolean) => void;
    setManualLat: (lat: string) => void;
    setManualLng: (lng: string) => void;
    setManualAddress: (addr: string) => void;
    setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
    setUploadingImages: React.Dispatch<
        React.SetStateAction<{ file: File; progress: number }[]>
    >;
    onSuccess: () => void;
    onClose: () => void;
}

export function useCurationHandlers({
    state,
    setVenues,
    setIsLoading,
    setManualLat,
    setManualLng,
    setManualAddress,
    setUploadedImages,
    setUploadingImages,
    onSuccess,
    onClose,
}: CurationHandlersOptions) {
    const loadVenues = useCallback(async () => {
        try {
            const listings = await UnifiedListingsService.getForMap();
            setVenues(
                listings.map((l) => ({
                    id: l.id,
                    title: l.title,
                    category: l.category,
                    region: l.region,
                    images: l.images || [],
                    type: l.type,
                    lat: l.lat,
                    lng: l.lng,
                }))
            );
        } catch (err) {
            console.error("Failed to load venues:", err);
        }
    }, [setVenues]);

    const handleGetCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setManualLat(latitude.toString());
                setManualLng(longitude.toString());

                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
                    );
                    const data = await response.json();
                    if (data.features?.[0]) {
                        setManualAddress(data.features[0].place_name);
                    }
                } catch (err) {
                    console.error("Reverse geocoding failed:", err);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Failed to get current location");
            }
        );
    }, [setManualLat, setManualLng, setManualAddress]);

    const handleImageUpload = useCallback(
        async (files: FileList) => {
            const validFiles: File[] = [];

            for (const file of Array.from(files)) {
                const validation = validateImageFile(file);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    alert(validation.error);
                }
            }

            if (validFiles.length === 0) return;

            const newUploading = validFiles.map((file) => ({ file, progress: 0 }));
            setUploadingImages((prev) => [...prev, ...newUploading]);

            for (const file of validFiles) {
                try {
                    const url = await uploadImage(file, "events", (progress) => {
                        setUploadingImages((prev) =>
                            prev.map((u) =>
                                u.file === file ? { ...u, progress: progress.progress } : u
                            )
                        );
                    });

                    setUploadedImages((prev) => [...prev, url]);
                    setUploadingImages((prev) => prev.filter((u) => u.file !== file));
                } catch (err) {
                    console.error("Upload failed:", err);
                    setUploadingImages((prev) => prev.filter((u) => u.file !== file));
                }
            }
        },
        [setUploadedImages, setUploadingImages]
    );

    const removeImage = useCallback(
        (index: number) => {
            setUploadedImages((prev) => prev.filter((_, i) => i !== index));
        },
        [setUploadedImages]
    );

    const getLocationData = useCallback(() => {
        const {
            locationMode,
            selectedVenue,
            selectedLocation,
            manualAddress,
            manualLat,
            manualLng,
        } = state;

        if (locationMode === "venue" && selectedVenue) {
            return {
                locationName: selectedVenue.title,
                locationAddress: selectedVenue.region,
                lat: selectedVenue.lat || 0,
                lng: selectedVenue.lng || 0,
                venueId: selectedVenue.id,
                venueName: selectedVenue.title,
                venueImage: selectedVenue.images?.[0],
            };
        } else if (locationMode === "search" && selectedLocation) {
            return {
                locationName: selectedLocation.text,
                locationAddress: selectedLocation.place_name,
                lat: selectedLocation.center[1],
                lng: selectedLocation.center[0],
                venueId: null,
                venueName: selectedLocation.text,
                venueImage: null,
            };
        } else if (locationMode === "manual" && manualAddress) {
            return {
                locationName: manualAddress.split(",")[0],
                locationAddress: manualAddress,
                lat: parseFloat(manualLat) || 0,
                lng: parseFloat(manualLng) || 0,
                venueId: null,
                venueName: manualAddress.split(",")[0],
                venueImage: null,
            };
        }
        return null;
    }, [state]);

    const canSave = useCallback(() => {
        const { mode, locationMode, selectedVenue, selectedLocation, manualAddress, eventTitle } =
            state;

        if (mode === "quick") {
            return selectedVenue !== null;
        }

        const hasLocation =
            (locationMode === "venue" && selectedVenue) ||
            (locationMode === "search" && selectedLocation) ||
            (locationMode === "manual" && manualAddress);

        return eventTitle.trim() && hasLocation;
    }, [state]);

    const handleSave = useCallback(async () => {
        if (!canSave()) return;

        setIsLoading(true);
        try {
            await saveCuration({
                ...state,
                locationData: getLocationData(),
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to save:", err);
            alert("Failed to save. Check console.");
        } finally {
            setIsLoading(false);
        }
    }, [canSave, getLocationData, state, setIsLoading, onSuccess, onClose]);

    return {
        loadVenues,
        handleGetCurrentLocation,
        handleImageUpload,
        removeImage,
        canSave,
        handleSave,
    };
}
