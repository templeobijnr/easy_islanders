"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMapboxPlaces = void 0;
const axios_1 = __importDefault(require("axios"));
const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
const BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const searchMapboxPlaces = async (query, options = {}) => {
    if (!MAPBOX_TOKEN) {
        console.error("🔴 [Mapbox] Missing VITE_MAPBOX_TOKEN");
        return [];
    }
    try {
        // Default to Cyprus bounding box if not specified to keep results relevant
        // Approx Cyprus BBox: 32.2,34.5,34.6,35.7
        const defaultBBox = '32.2,34.5,34.6,35.7';
        const params = new URLSearchParams({
            access_token: MAPBOX_TOKEN,
            limit: (options.limit || 10).toString(),
            country: 'cy,tr', // Prioritize Cyprus and Turkey (North Cyprus often falls under TR in some datasets or just generic)
            bbox: options.bbox || defaultBBox
        });
        if (options.types)
            params.append('types', options.types);
        if (options.proximity)
            params.append('proximity', options.proximity);
        const url = `${BASE_URL}/${encodeURIComponent(query)}.json?${params.toString()}`;
        console.log(`🌍 [Mapbox] Fetching: ${url}`);
        const response = await axios_1.default.get(url);
        if (!response.data || !response.data.features) {
            return [];
        }
        return response.data.features.map((f) => ({
            id: f.id,
            text: f.text,
            place_name: f.place_name,
            center: f.center,
            properties: f.properties || {},
            context: f.context
        }));
    }
    catch (error) {
        console.error("🔴 [Mapbox] API Error:", error);
        return [];
    }
};
exports.searchMapboxPlaces = searchMapboxPlaces;
//# sourceMappingURL=mapbox.service.js.map