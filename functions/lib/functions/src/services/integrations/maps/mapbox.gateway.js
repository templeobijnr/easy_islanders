"use strict";
/**
 * Mapbox Gateway
 *
 * Pure HTTP gateway for Mapbox Geocoding API.
 * No LLM, no business logic. Just HTTP, parsing, and error handling.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMapboxPlaces = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const axios_1 = __importDefault(require("axios"));
const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
const BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const searchMapboxPlaces = async (query, options = {}) => {
    if (!MAPBOX_TOKEN) {
        console.error("🔴 [Mapbox] Missing VITE_MAPBOX_TOKEN");
        return [];
    }
    try {
        // Default to Cyprus bounding box if not specified to keep results relevant
        // Approx Cyprus BBox: 32.2,34.5,34.6,35.7
        const defaultBBox = "32.2,34.5,34.6,35.7";
        const params = new URLSearchParams({
            access_token: MAPBOX_TOKEN,
            limit: (options.limit || 10).toString(),
            country: "cy,tr", // Prioritize Cyprus and Turkey (North Cyprus often falls under TR in some datasets or just generic)
            bbox: options.bbox || defaultBBox,
        });
        if (options.types)
            params.append("types", options.types);
        if (options.proximity)
            params.append("proximity", options.proximity);
        const url = `${BASE_URL}/${encodeURIComponent(query)}.json?${params.toString()}`;
        logger.debug(`🌍 [Mapbox] Fetching: ${url}`);
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
            context: f.context,
        }));
    }
    catch (error) {
        console.error("🔴 [Mapbox] API Error:", error);
        return [];
    }
};
exports.searchMapboxPlaces = searchMapboxPlaces;
//# sourceMappingURL=mapbox.gateway.js.map