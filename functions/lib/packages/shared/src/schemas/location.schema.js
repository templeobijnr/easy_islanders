"use strict";
/**
 * Location Types & Utilities for AskMerve V1
 *
 * These types represent location data for jobs and provide utilities
 * for generating Google Maps links.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationSchema = exports.CoordinatesSchema = void 0;
exports.createGoogleMapsLink = createGoogleMapsLink;
exports.createGoogleMapsLinkFromLocation = createGoogleMapsLinkFromLocation;
exports.createGoogleMapsDirectionsLink = createGoogleMapsDirectionsLink;
const zod_1 = require("zod");
// =============================================================================
// LOCATION SCHEMAS
// =============================================================================
/**
 * Geographic coordinates (WGS84)
 */
exports.CoordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
/**
 * Full location object with address and optional coordinates
 */
exports.LocationSchema = zod_1.z.object({
    /** Human-readable address */
    address: zod_1.z.string().min(1),
    /** Coordinates for mapping */
    coordinates: exports.CoordinatesSchema.optional(),
    /** Google Place ID if resolved from Maps */
    placeId: zod_1.z.string().optional(),
    /** Short place name (e.g., "Kyrenia Harbour") */
    placeName: zod_1.z.string().optional(),
    /** Additional directions or notes */
    notes: zod_1.z.string().optional(),
});
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
function createGoogleMapsLink(lat, lng) {
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
function createGoogleMapsLinkFromLocation(location) {
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
function createGoogleMapsDirectionsLink(origin, destination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
}
//# sourceMappingURL=location.schema.js.map