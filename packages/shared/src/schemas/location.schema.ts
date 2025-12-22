/**
 * Location Types & Utilities for AskMerve V1
 * 
 * These types represent location data for jobs and provide utilities
 * for generating Google Maps links.
 */

import { z } from 'zod';

// =============================================================================
// LOCATION SCHEMAS
// =============================================================================

/**
 * Geographic coordinates (WGS84)
 */
export const CoordinatesSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

/**
 * Full location object with address and optional coordinates
 */
export const LocationSchema = z.object({
    /** Human-readable address */
    address: z.string().min(1),
    /** Coordinates for mapping */
    coordinates: CoordinatesSchema.optional(),
    /** Google Place ID if resolved from Maps */
    placeId: z.string().optional(),
    /** Short place name (e.g., "Kyrenia Harbour") */
    placeName: z.string().optional(),
    /** Additional directions or notes */
    notes: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

// =============================================================================
// LOCATION UTILITIES
// =============================================================================

/**
 * Creates a Google Maps link that opens Maps and drops a pin at the location.
 * 
 * @see https://developers.google.com/maps/documentation/urls/get-started
 * 
 * @example
 * createGoogleMapsLink(35.33, 33.32)
 * // => "https://maps.google.com/?q=35.33,33.32"
 */
export function createGoogleMapsLink(lat: number, lng: number): string {
    if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
    }
    if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180.`);
    }
    return `https://maps.google.com/?q=${lat},${lng}`;
}

/**
 * Creates a Google Maps link from a Location object.
 * Returns undefined if no coordinates are available.
 */
export function createGoogleMapsLinkFromLocation(location: Location): string | undefined {
    if (!location.coordinates) {
        return undefined;
    }
    return createGoogleMapsLink(location.coordinates.lat, location.coordinates.lng);
}

/**
 * Creates a Google Maps directions link from origin to destination.
 * 
 * @example
 * createGoogleMapsDirectionsLink(
 *   { lat: 35.33, lng: 33.32 },
 *   { lat: 35.18, lng: 33.36 }
 * )
 * // => "https://www.google.com/maps/dir/?api=1&origin=35.33,33.32&destination=35.18,33.36"
 */
export function createGoogleMapsDirectionsLink(
    origin: Coordinates,
    destination: Coordinates
): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
}
