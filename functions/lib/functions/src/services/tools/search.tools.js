"use strict";
/**
 * Search & Discovery Tools
 *
 * Handles marketplace search, local places, events, and content discovery.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTools = void 0;
const logger = __importStar(require("firebase-functions/logger"));
[];
// ─────────────────────────────────────────────────────────────────────────────
// Search Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.searchTools = {
    /**
     * Search marketplace listings using TypeSense
     */
    searchMarketplace: async (args) => {
        logger.debug("🔍 [Search] TypeSense Search Args:", args);
        try {
            const { searchListings } = await Promise.resolve().then(() => __importStar(require("../typesense.service")));
            const result = await searchListings({
                query: args.query || "*",
                domain: args.domain,
                category: args.category,
                subCategory: args.subCategory,
                location: args.location,
                minPrice: args.minPrice,
                maxPrice: args.maxPrice,
                perPage: 20,
            });
            logger.debug(`🔍 [Search] Found ${result.found} items via TypeSense`);
            return result.hits.map((hit) => {
                var _a, _b, _c;
                return ({
                    id: hit.id,
                    title: hit.title,
                    price: hit.price,
                    location: hit.location,
                    domain: hit.domain,
                    category: hit.category,
                    subCategory: hit.subCategory,
                    description: hit.description,
                    imageUrl: (_a = hit.metadata) === null || _a === void 0 ? void 0 : _a.imageUrl,
                    amenities: (_b = hit.metadata) === null || _b === void 0 ? void 0 : _b.amenities,
                    rating: (_c = hit.metadata) === null || _c === void 0 ? void 0 : _c.rating,
                });
            });
        }
        catch (error) {
            console.error("🔴 [Search] TypeSense Failed:", error);
            return [];
        }
    },
    /**
     * Search for local places using Mapbox
     */
    searchLocalPlaces: async (args) => {
        logger.debug("🔍 [Search] Local Places (Mapbox):", args);
        try {
            const { searchMapboxPlaces } = await Promise.resolve().then(() => __importStar(require("../mapbox.service")));
            // Construct a query that includes location for better accuracy
            const query = args.location
                ? `${args.query || args.domain || ""} in ${args.location}`
                : args.query || args.domain || "places";
            const places = await searchMapboxPlaces(query, {
                types: "poi",
                limit: 10,
            });
            logger.debug(`🔍 [Search Local] Found ${places.length} items via Mapbox`);
            return places.map((place) => ({
                id: place.id,
                title: place.text,
                price: 0, // Mapbox doesn't provide price
                location: place.place_name,
                amenities: place.properties.category ? [place.properties.category] : [],
                description: place.properties.address || place.place_name,
                imageUrl: null, // Mapbox doesn't provide images directly
                domain: args.domain,
                category: place.properties.category || "Place",
                subCategory: "Mapbox POI",
                type: "venue",
                coordinates: {
                    lat: place.center[1],
                    lng: place.center[0],
                },
            }));
        }
        catch (error) {
            console.error("🔴 [Search Local] Failed:", error);
            return [];
        }
    },
    /**
     * Search for events
     */
    searchEvents: async (args) => {
        logger.debug("🔍 [Search] Events:", args);
        try {
            const { searchListings } = await Promise.resolve().then(() => __importStar(require("../typesense.service")));
            const result = await searchListings({
                query: args.query || "*",
                domain: "Events",
                location: args.location,
                perPage: 20,
            });
            logger.debug(`🔍 [Search Events] Found ${result.found} events`);
            return result.hits.map((hit) => {
                var _a, _b, _c;
                return ({
                    id: hit.id,
                    title: hit.title,
                    price: hit.price,
                    location: hit.location,
                    description: hit.description,
                    imageUrl: (_a = hit.metadata) === null || _a === void 0 ? void 0 : _a.imageUrl,
                    startsAt: (_b = hit.metadata) === null || _b === void 0 ? void 0 : _b.startsAt,
                    endsAt: (_c = hit.metadata) === null || _c === void 0 ? void 0 : _c.endsAt,
                });
            });
        }
        catch (error) {
            console.error("🔴 [Search Events] Failed:", error);
            return [];
        }
    },
    /**
     * Search specifically for housing
     */
    searchHousingListings: async (args, _ctx) => {
        logger.debug("🏠 [Search] Housing:", args);
        const { searchListings } = await Promise.resolve().then(() => __importStar(require("../typesense.service")));
        // Map args to searchListings params
        return searchListings({
            query: "*", // Default to all if no specific query
            domain: "Real Estate", // or 'housing' depending on your index
            category: "housing",
            location: args.areaName, // Map areaName to location
            minPrice: args.budgetMin,
            maxPrice: args.budgetMax,
            bedrooms: args.bedrooms,
            perPage: 10,
        });
    },
    /**
     * Search curated places
     */
    searchPlaces: async (args, _ctx) => {
        logger.debug("📍 [Search] Curated Places:", args);
        // Try Typesense first for curated places
        try {
            const { searchListings } = await Promise.resolve().then(() => __importStar(require("../typesense.service")));
            const result = await searchListings({
                query: args.tag || "*",
                domain: "Places",
                category: args.category,
                perPage: args.limit || 10,
            });
            if (result.found > 0) {
                return result.hits;
            }
        }
        catch (e) {
            console.warn("TypeSense place search failed, falling back to Mapbox", e);
        }
        // Fallback to Mapbox if no curated places found
        const { searchMapboxPlaces } = await Promise.resolve().then(() => __importStar(require("../mapbox.service")));
        const query = `${args.category || ""} ${args.tag || ""}`;
        return searchMapboxPlaces(query, {
            types: "poi",
            limit: args.limit || 10,
        });
    },
};
//# sourceMappingURL=search.tools.js.map