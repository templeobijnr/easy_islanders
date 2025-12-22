"use strict";
/**
 * OSM Gateway
 *
 * Pure HTTP gateway for OpenStreetMap APIs (Overpass + Nominatim).
 * No LLM, no business logic. Just HTTP, parsing, and error handling.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMService = void 0;
const axios_1 = __importDefault(require("axios"));
class OSMService {
    /**
     * Search for places by category using Overpass API
     * @param category - 'food', 'nightlife', 'sights', etc.
     * @param lat - Latitude
     * @param lng - Longitude
     * @param radius - Radius in meters (default 5000)
     */
    static async searchNearby(category, lat, lng, radius = 5000) {
        try {
            // Map categories to OSM tags
            const tagMap = {
                'food': '["amenity"~"restaurant|cafe|fast_food|bar|pub"]',
                'nightlife': '["amenity"~"bar|pub|nightclub|casino"]',
                'sights': '["tourism"~"museum|viewpoint|attraction|artwork"]["historic"]',
                'shopping': '["shop"]',
                'all': '["amenity"]["tourism"]'
            };
            const tagFilter = tagMap[category] || tagMap['all'];
            // Overpass QL Query
            const query = `
                [out:json][timeout:25];
                (
                  node${tagFilter}(around:${radius},${lat},${lng});
                  way${tagFilter}(around:${radius},${lat},${lng});
                );
                out center 20;
            `;
            const response = await axios_1.default.get(this.OVERPASS_URL, {
                params: { data: query }
            });
            if (!response.data.elements)
                return [];
            return response.data.elements.map((el) => {
                var _a, _b;
                const tags = el.tags || {};
                const latitude = el.lat || ((_a = el.center) === null || _a === void 0 ? void 0 : _a.lat);
                const longitude = el.lon || ((_b = el.center) === null || _b === void 0 ? void 0 : _b.lon);
                if (!latitude || !longitude)
                    return null;
                // Determine simplified category
                let cat = 'Place';
                if (tags.amenity === 'restaurant' || tags.amenity === 'cafe')
                    cat = 'Restaurant';
                if (tags.amenity === 'bar' || tags.amenity === 'nightclub')
                    cat = 'Nightlife';
                if (tags.tourism)
                    cat = 'Attraction';
                return {
                    id: `osm_${el.id}`,
                    name: tags.name || tags['name:en'] || 'Unnamed Place',
                    address: tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}` : 'Cyprus',
                    category: cat,
                    location: { lat: latitude, lng: longitude },
                    type: category
                };
            }).filter((p) => p !== null && p.name !== 'Unnamed Place');
        }
        catch (error) {
            console.error("🔴 [OSM] Overpass Search Error:", error);
            return [];
        }
    }
    /**
     * Search for specific places by text using Nominatim
     * @param query - Search query (e.g., "Kyrenia Castle")
     */
    static async searchByText(query) {
        try {
            const response = await axios_1.default.get(this.NOMINATIM_URL, {
                params: {
                    q: query,
                    format: 'json',
                    addressdetails: 1,
                    limit: 10,
                    countrycodes: 'cy' // Limit to Cyprus
                },
                headers: {
                    'User-Agent': 'EasyIslanders/1.0' // Required by Nominatim
                }
            });
            return response.data.map((item) => ({
                id: `osm_${item.osm_id}`,
                name: item.name || item.display_name.split(',')[0],
                address: item.display_name,
                category: item.type,
                location: {
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                },
                type: 'search_result'
            }));
        }
        catch (error) {
            console.error("🔴 [OSM] Nominatim Search Error:", error);
            return [];
        }
    }
}
exports.OSMService = OSMService;
OSMService.OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
OSMService.NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
//# sourceMappingURL=osm.gateway.js.map