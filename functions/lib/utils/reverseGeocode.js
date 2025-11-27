"use strict";
/**
 * Reverse Geocoding Utility
 * Convert coordinates to human-readable addresses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseGeocodeMapbox = reverseGeocodeMapbox;
exports.reverseGeocodeGoogle = reverseGeocodeGoogle;
exports.reverseGeocode = reverseGeocode;
/**
 * Reverse geocode coordinates to get address using Mapbox
 */
async function reverseGeocodeMapbox(lat, lng) {
    const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN;
    if (!MAPBOX_TOKEN) {
        console.warn('⚠️ Mapbox token not configured');
        return null;
    }
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,place&language=en`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error('❌ Mapbox API error:', response.statusText);
            return null;
        }
        const data = await response.json();
        if (!data.features || data.features.length === 0) {
            console.warn('⚠️ No address found for coordinates:', lat, lng);
            return null;
        }
        // Get the most relevant result (first one is usually best)
        const feature = data.features[0];
        const address = feature.place_name;
        console.log(`✅ [Reverse Geocode] ${lat},${lng} → ${address}`);
        return address;
    }
    catch (error) {
        console.error('❌ [Reverse Geocode] Error:', error);
        return null;
    }
}
/**
 * Reverse geocode coordinates to get address using Google Maps
 * Fallback option if Mapbox is not available
 */
async function reverseGeocodeGoogle(lat, lng) {
    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_API_KEY) {
        console.warn('⚠️ Google API key not configured');
        return null;
    }
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error('❌ Google Geocoding API error:', response.statusText);
            return null;
        }
        const data = await response.json();
        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            console.warn('⚠️ No address found for coordinates:', lat, lng);
            return null;
        }
        const address = data.results[0].formatted_address;
        console.log(`✅ [Reverse Geocode] ${lat},${lng} → ${address}`);
        return address;
    }
    catch (error) {
        console.error('❌ [Reverse Geocode] Error:', error);
        return null;
    }
}
/**
 * Main reverse geocoding function
 * Tries Mapbox first, falls back to Google
 */
async function reverseGeocode(lat, lng) {
    // Try Mapbox first
    let address = await reverseGeocodeMapbox(lat, lng);
    // Fallback to Google if Mapbox fails
    if (!address) {
        address = await reverseGeocodeGoogle(lat, lng);
    }
    // If both fail, return formatted coordinates
    if (!address) {
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return address;
}
//# sourceMappingURL=reverseGeocode.js.map