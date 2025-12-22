/**
 * saveCuration - Save curation to Firestore
 * Extracted from useCurationHandlers to keep module under 300 lines.
 */
import {
    collection,
    writeBatch,
    doc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import type { Venue, GeocodingResult } from "../../curationTypes";

interface LocationData {
    locationName: string;
    locationAddress: string;
    lat: number;
    lng: number;
    venueId: string | null;
    venueName: string;
    venueImage: string | null | undefined;
}

interface SaveCurationParams {
    mode: "quick" | "create";
    selectedVenue: Venue | null;
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
    locationData: LocationData | null;
}

export async function saveCuration(params: SaveCurationParams): Promise<void> {
    const {
        mode,
        selectedVenue,
        eventTitle,
        eventDesc,
        eventCategory,
        startDate,
        startTime,
        endDate,
        endTime,
        region,
        uploadedImages,
        enabledActions,
        actionUrls,
        selectedSections,
        locationData,
    } = params;

    const batch = writeBatch(db);

    let targetItemId: string;
    let targetItemType: string;
    let targetItemTitle: string;
    let targetItemImage: string;

    if (mode === "quick" && selectedVenue) {
        targetItemId = selectedVenue.id;
        targetItemType = selectedVenue.type;
        targetItemTitle = selectedVenue.title;
        targetItemImage = selectedVenue.images?.[0] || "";
    } else {
        const eventRef = doc(collection(db, "events"));
        targetItemId = eventRef.id;
        targetItemType = "event";
        targetItemTitle = eventTitle;
        targetItemImage = uploadedImages[0] || locationData?.venueImage || "";

        const startDateTime = startDate
            ? Timestamp.fromDate(new Date(`${startDate}T${startTime || "00:00"}`))
            : Timestamp.now();
        const endDateTime = endDate
            ? Timestamp.fromDate(new Date(`${endDate}T${endTime || "23:59"}`))
            : null;

        batch.set(eventRef, {
            id: eventRef.id,
            type: "event",
            title: eventTitle,
            description: eventDesc,
            category: eventCategory,
            hostVenueId: locationData?.venueId || null,
            hostVenueName: locationData?.venueName || null,
            locationName: locationData?.locationName,
            locationAddress: locationData?.locationAddress,
            region: region,
            images: uploadedImages,
            startTime: startDateTime,
            endTime: endDateTime,
            isPublic: true,
            approved: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            actions: {
                ...Object.fromEntries(
                    Object.entries(enabledActions).map(([k, v]) => [
                        `allow${k.charAt(0).toUpperCase() + k.slice(1)}`,
                        v,
                    ])
                ),
                urls: actionUrls,
                allowCheckIn: true,
            },
            coordinates: {
                lat: locationData?.lat || 0,
                lng: locationData?.lng || 0,
            },
        });
    }

    const now = Timestamp.now();

    selectedSections.forEach((section) => {
        const curationRef = doc(collection(db, "connectCuration"));

        let expiresAt = null;
        if (section === "today") {
            const midnight = new Date();
            midnight.setHours(23, 59, 59);
            expiresAt = Timestamp.fromDate(midnight);
        }

        batch.set(curationRef, {
            section,
            itemId: targetItemId,
            itemType: targetItemType,
            itemTitle: targetItemTitle,
            itemImage: targetItemImage,
            eventTitle: mode === "create" ? eventTitle : null,
            eventCategory: mode === "create" ? eventCategory : null,
            eventDate:
                mode === "create" && startDate
                    ? Timestamp.fromDate(new Date(`${startDate}T${startTime || "00:00"}`))
                    : null,
            locationName: locationData?.locationName,
            region: region,
            order: 0,
            isActive: true,
            createdAt: now,
            expiresAt: expiresAt,
            actions: {
                ...enabledActions,
                urls: actionUrls,
                checkIn: true,
            },
        });
    });

    await batch.commit();
}
