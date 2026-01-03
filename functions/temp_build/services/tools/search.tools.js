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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTools = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
[];
// ─────────────────────────────────────────────────────────────────────────────
// Search Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.searchTools = {
    /**
     * Search marketplace listings using Firestore directly
     * For: Cars (rentals), Properties for SALE
     * NOT for: Stay rentals (use searchStays instead)
     */
    searchMarketplace: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var startTime, query, snapshot, results, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    startTime = Date.now();
                    logger.info("🔍 [SearchMarketplace] Query:", { args: args, timestamp: new Date().toISOString() });
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    query = firebase_1.db.collection("listings").limit(args.limit || 20);
                    // Map domain to listing type
                    if (args.domain === "Cars" || ((_a = args.domain) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("car"))) {
                        query = query.where("type", "==", "car");
                    }
                    else if (args.domain === "Real Estate" || ((_b = args.domain) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes("sale"))) {
                        // Only properties for SALE, not rentals
                        query = query.where("type", "==", "property");
                        // If no subCategory, assume sale (since rentals should use searchStays)
                        if (!args.subCategory || args.subCategory === "sale") {
                            query = query.where("subCategory", "==", "sale");
                        }
                    }
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _c.sent();
                    results = snapshot.docs.map(function (doc) {
                        var _a;
                        var data = doc.data();
                        return {
                            id: doc.id,
                            title: data.title,
                            price: data.price,
                            currency: data.currency,
                            location: data.region || data.location,
                            domain: args.domain,
                            category: data.category,
                            subCategory: data.subCategory,
                            description: data.description,
                            imageUrl: ((_a = data.images) === null || _a === void 0 ? void 0 : _a[0]) || data.imageUrl,
                            amenities: data.amenities,
                            rating: data.rating,
                            bedrooms: data.bedrooms,
                            bathrooms: data.bathrooms,
                        };
                    });
                    // Apply filters in memory
                    if (args.location) {
                        results = results.filter(function (r) { var _a; return (_a = r.location) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(args.location.toLowerCase()); });
                    }
                    if (args.minPrice) {
                        results = results.filter(function (r) { return r.price >= args.minPrice; });
                    }
                    if (args.maxPrice) {
                        results = results.filter(function (r) { return r.price <= args.maxPrice; });
                    }
                    logger.info("\u2705 [SearchMarketplace] Complete", {
                        queryArgs: args,
                        resultsCount: results.length,
                        durationMs: Date.now() - startTime,
                    });
                    return [2 /*return*/, results];
                case 3:
                    error_1 = _c.sent();
                    logger.error("❌ [SearchMarketplace] Failed:", error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Search for local places using Mapbox
     */
    searchLocalPlaces: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var searchMapboxPlaces, query, places, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("🔍 [Search] Local Places (Mapbox):", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    searchMapboxPlaces = require("../mapbox.service").searchMapboxPlaces;
                    query = args.location
                        ? "".concat(args.query || args.domain || "", " in ").concat(args.location)
                        : args.query || args.domain || "places";
                    return [4 /*yield*/, searchMapboxPlaces(query, {
                            types: "poi",
                            limit: 10,
                        })];
                case 2:
                    places = _a.sent();
                    logger.debug("\uD83D\uDD0D [Search Local] Found ".concat(places.length, " items via Mapbox"));
                    return [2 /*return*/, places.map(function (place) { return ({
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
                        }); })];
                case 3:
                    error_2 = _a.sent();
                    console.error("🔴 [Search Local] Failed:", error_2);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Search for events
     */
    searchEvents: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var searchListings, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("🔍 [Search] Events:", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    searchListings = require("../typesense.service").searchListings;
                    return [4 /*yield*/, searchListings({
                            query: args.query || "*",
                            domain: "Events",
                            location: args.location,
                            perPage: 20,
                        })];
                case 2:
                    result = _a.sent();
                    logger.debug("\uD83D\uDD0D [Search Events] Found ".concat(result.found, " events"));
                    return [2 /*return*/, result.hits.map(function (hit) {
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
                        })];
                case 3:
                    error_3 = _a.sent();
                    console.error("🔴 [Search Events] Failed:", error_3);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Search specifically for housing
     */
    searchHousingListings: function (args, _ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var searchListings;
        return __generator(this, function (_a) {
            logger.debug("🏠 [Search] Housing:", args);
            searchListings = require("../typesense.service").searchListings;
            // Map args to searchListings params
            return [2 /*return*/, searchListings({
                    query: "*", // Default to all if no specific query
                    domain: "Real Estate", // or 'housing' depending on your index
                    category: "housing",
                    location: args.areaName, // Map areaName to location
                    minPrice: args.budgetMin,
                    maxPrice: args.budgetMax,
                    bedrooms: args.bedrooms,
                    perPage: 10,
                })];
        });
    }); },
    /**
     * Search curated places
     */
    searchPlaces: function (args, _ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var searchListings, result, e_1, searchMapboxPlaces, query;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("📍 [Search] Curated Places:", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    searchListings = require("../typesense.service").searchListings;
                    return [4 /*yield*/, searchListings({
                            query: args.tag || "*",
                            domain: "Places",
                            category: args.category,
                            perPage: args.limit || 10,
                        })];
                case 2:
                    result = _a.sent();
                    if (result.found > 0) {
                        return [2 /*return*/, result.hits];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.warn("TypeSense place search failed, falling back to Mapbox", e_1);
                    return [3 /*break*/, 4];
                case 4:
                    searchMapboxPlaces = require("../mapbox.service").searchMapboxPlaces;
                    query = "".concat(args.category || "", " ").concat(args.tag || "").trim();
                    return [2 /*return*/, searchMapboxPlaces(query, {
                            types: "poi",
                            limit: args.limit || 10,
                        })];
            }
        });
    }); },
    /**
     * Search stays/rentals directly from Firestore
     * Supports daily rentals, villas, apartments
     * Uses direct Firestore query for reliability (no Typesense sync needed)
     */
    searchStays: function (args, _ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var startTime, query, snapshot, results, loc_1, t_1, durationMs, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    logger.info("🏠 [SearchStays] Query:", { args: args, timestamp: new Date().toISOString() });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    query = firebase_1.db.collection("listings")
                        .where("type", "==", "stay")
                        .limit(args.limit || 20);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _a.sent();
                    results = snapshot.docs.map(function (doc) {
                        var _a;
                        var data = doc.data();
                        return {
                            id: doc.id,
                            title: data.title || data.name || "Untitled",
                            price: data.displayPrice || data.price,
                            location: data.region || data.address || ((_a = data.location) === null || _a === void 0 ? void 0 : _a.label),
                            domain: "Stays",
                            category: data.category,
                            subCategory: data.subcategory || data.category,
                            description: data.description,
                            imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null,
                            amenities: data.amenities || [],
                            bedrooms: data.bedrooms,
                            bathrooms: data.bathrooms,
                            rating: data.rating,
                        };
                    });
                    // Apply filters
                    if (args.location) {
                        loc_1 = args.location.toLowerCase();
                        results = results.filter(function (r) {
                            return (r.location || "").toLowerCase().includes(loc_1);
                        });
                    }
                    if (args.type) {
                        t_1 = args.type.toLowerCase();
                        results = results.filter(function (r) {
                            return (r.category || "").toLowerCase().includes(t_1) ||
                                (r.subCategory || "").toLowerCase().includes(t_1);
                        });
                    }
                    if (args.minPrice) {
                        results = results.filter(function (r) { return (r.price || 0) >= args.minPrice; });
                    }
                    if (args.maxPrice) {
                        results = results.filter(function (r) { return (r.price || Infinity) <= args.maxPrice; });
                    }
                    if (args.bedrooms) {
                        results = results.filter(function (r) { return (r.bedrooms || 0) >= args.bedrooms; });
                    }
                    durationMs = Date.now() - startTime;
                    logger.info("✅ [SearchStays] Complete", {
                        queryArgs: args,
                        resultsCount: results.length,
                        durationMs: durationMs,
                        timestamp: new Date().toISOString(),
                    });
                    return [2 /*return*/, results];
                case 3:
                    error_4 = _a.sent();
                    logger.error("🔴 [SearchStays] Failed:", error_4);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    }); },
};
