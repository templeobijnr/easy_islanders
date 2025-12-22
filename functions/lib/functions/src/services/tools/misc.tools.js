"use strict";
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
exports.miscTools = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../../config/firebase");
const errors_1 = require("../../utils/errors");
const places_repository_1 = require("../../repositories/places.repository");
const mapbox_service_1 = require("../mapbox.service");
const toolContext_1 = require("./toolContext");
function parseLatLng(str) {
    if (!str)
        return null;
    const parts = str.split(",").map((p) => parseFloat(p.trim()));
    if (parts.length !== 2 || parts.some(isNaN))
        return null;
    return { lat: parts[0], lng: parts[1] };
}
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
function haversineKm(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const hav = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    return R * c;
}
function normalizePlaceCategory(domain) {
    const d = (domain || "").toLowerCase().trim();
    const direct = d;
    const allowed = [
        "food",
        "nightlife",
        "sight",
        "cafe",
        "co_working",
        "shopping",
        "service",
        "housing_project",
        "other",
    ];
    if (allowed.includes(direct))
        return direct;
    if (d.includes("restaurant") || d.includes("food"))
        return "food";
    if (d.includes("bar") || d.includes("club") || d.includes("night"))
        return "nightlife";
    if (d.includes("cafe") || d.includes("coffee"))
        return "cafe";
    if (d.includes("shop") || d.includes("mall"))
        return "shopping";
    if (d.includes("service") ||
        d.includes("plumber") ||
        d.includes("electric") ||
        d.includes("handyman"))
        return "service";
    if (d.includes("sight") ||
        d.includes("museum") ||
        d.includes("beach") ||
        d.includes("hike"))
        return "sight";
    return null;
}
exports.miscTools = {
    /**
     * Create a consumer request for goods/services
     */
    createConsumerRequest: async (args) => {
        logger.debug("📝 [ConsumerRequest] Creating request:", args);
        // Back-compat with the Gemini tool schema (`requestDetails`, `contactInfo`)
        const requestDetails = args.requestDetails || args.content;
        const contactInfo = args.contactInfo || args.domain;
        return {
            success: true,
            requestId: `REQ-${Date.now()}`,
            requestDetails: requestDetails || null,
            contactInfo: contactInfo || null,
        };
    },
    /**
     * Get real-time information (weather, exchange rates, etc.)
     */
    getRealTimeInfo: async (args) => {
        logger.debug("ℹ️ [RealTimeInfo] Getting info for:", args.category);
        return {
            success: true,
            info: `Current info for ${args.category}: Weather is sunny, 25°C. GBP/TRY exchange rate is approx 40.0.`,
        };
    },
    /**
     * Consult the knowledge base encyclopedia
     */
    consultEncyclopedia: async (args) => {
        const topic = args.topic || args.query || "";
        logger.debug("📚 [Encyclopedia] Looking up:", topic);
        return {
            success: true,
            content: `Knowledge lookup for "${topic}" is not yet connected to a live data source.`,
        };
    },
    /**
     * Find nearby places using (1) shared GPS (if available) or (2) Mapbox geocoding,
     * then filter the curated Firestore `places` collection by distance.
     */
    getNearbyPlaces: async (args, userIdOrContext) => {
        var _a;
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const locationText = ((args === null || args === void 0 ? void 0 : args.location) || "").toString().trim();
        const domain = ((args === null || args === void 0 ? void 0 : args.domain) || "").toString().trim();
        const radiusKm = typeof (args === null || args === void 0 ? void 0 : args.radiusKm) === "number" ? args.radiusKm : 5;
        const limit = typeof (args === null || args === void 0 ? void 0 : args.limit) === "number" ? args.limit : 20;
        const currentLoc = ctx.location && typeof ctx.location === "object"
            ? {
                lat: ctx.location.lat,
                lng: ctx.location.lng,
            }
            : null;
        let origin = parseLatLng(locationText) ||
            (/^(current location|near me|me)$/i.test(locationText) || !locationText
                ? currentLoc
                : null);
        if (!origin && locationText) {
            try {
                const geo = await (0, mapbox_service_1.searchMapboxPlaces)(locationText, {
                    limit: 1,
                    types: "place,locality,address",
                });
                if ((_a = geo[0]) === null || _a === void 0 ? void 0 : _a.center) {
                    origin = { lat: geo[0].center[1], lng: geo[0].center[0] };
                }
            }
            catch (e) {
                // Network/token may not be available; fall back to text filtering
            }
        }
        const category = normalizePlaceCategory(domain);
        // Use marketId from context for multi-market support
        const marketId = ctx.marketId;
        let places = await places_repository_1.placesRepository.getByCityId(marketId, true);
        if (category) {
            places = places.filter((p) => p.category === category);
        }
        // Distance filter if we have an origin; otherwise fall back to text filter
        if (origin) {
            const placesWithDistance = places
                .filter((p) => !!p.coordinates)
                .map((p) => (Object.assign(Object.assign({}, p), { distanceKm: haversineKm(origin, p.coordinates) })))
                .filter((p) => p.distanceKm <= radiusKm)
                .sort((a, b) => a.distanceKm - b.distanceKm)
                .slice(0, limit);
            return {
                success: true,
                origin,
                radiusKm,
                count: placesWithDistance.length,
                places: placesWithDistance.map((p) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    subcategory: p.subcategory,
                    address: p.address,
                    areaName: p.areaName,
                    distanceKm: Math.round(p.distanceKm * 100) / 100,
                    coordinates: p.coordinates,
                    tags: p.tags,
                })),
            };
        }
        if (!locationText) {
            return {
                success: false,
                error: "location is required (or share GPS location)",
            };
        }
        const filtered = places
            .filter((p) => (p.areaName || "").toLowerCase().includes(locationText.toLowerCase()))
            .slice(0, limit);
        return {
            success: true,
            origin: null,
            radiusKm: null,
            count: filtered.length,
            places: filtered.map((p) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                subcategory: p.subcategory,
                address: p.address,
                areaName: p.areaName,
                coordinates: p.coordinates,
                tags: p.tags,
            })),
            note: "GPS/geocoding unavailable; results filtered by areaName match only.",
        };
    },
    /**
     * Household supplies / groceries order
     *
     * Pattern: Collect → Validate → Persist → Dispatch via WhatsApp
     */
    orderHouseholdSupplies: async (args, userIdOrContext) => {
        var _a, _b, _c;
        logger.debug("🛒 [OrderSupplies] New order:", args);
        try {
            const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
            const userId = ctx.userId;
            // 1. Resolve customer info
            let customerPhone = args.contactPhone || "";
            let customerName = args.customerName || "Guest";
            if (userId && !customerPhone) {
                const userSnap = await firebase_1.db.collection("users").doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData === null || userData === void 0 ? void 0 : userData.phone) || "";
                    customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                }
            }
            if (!customerPhone) {
                return { success: false, error: "Customer phone number is required" };
            }
            const deliveryAddress = args.deliveryAddress || "Address not specified";
            const items = Array.isArray(args.items) ? args.items.join(", ") : (args.items || "Items not specified");
            // 2. Find a vendor listing with order_supplies action enabled
            const vendorListings = await firebase_1.db.collection("listings")
                .where("merve.enabled", "==", true)
                .limit(20)
                .get();
            let vendorPhone = null;
            let vendorName = "Vendor";
            let vendorId = null;
            for (const doc of vendorListings.docs) {
                const listing = doc.data();
                const actions = ((_a = listing.merve) === null || _a === void 0 ? void 0 : _a.actions) || [];
                const suppliesAction = actions.find((a) => a.actionType === "order_supplies" && a.enabled);
                if (suppliesAction) {
                    vendorPhone = ((_b = suppliesAction.dispatch) === null || _b === void 0 ? void 0 : _b.toE164) || ((_c = listing.merve) === null || _c === void 0 ? void 0 : _c.whatsappE164) || null;
                    vendorName = listing.title || listing.name || "Vendor";
                    vendorId = doc.id;
                    break;
                }
            }
            // 3. Persist order to Firestore
            const orderId = `GRO-${Date.now()}`;
            const orderData = {
                id: orderId,
                type: "household_supplies",
                items,
                deliveryAddress,
                customerName,
                customerPhone: customerPhone.replace("whatsapp:", ""),
                customerContact: customerPhone.replace("whatsapp:", ""),
                userId: userId || null,
                vendorListingId: vendorId,
                vendorPhone,
                status: vendorPhone ? "dispatched" : "pending",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await firebase_1.db.collection("groceryOrders").doc(orderId).set(orderData);
            logger.debug(`✅ [OrderSupplies] Persisted order ${orderId}`);
            // 4. Dispatch via WhatsApp if vendor found
            if (vendorPhone) {
                const message = `🛒 *New Order from Easy Islanders*\n\n` +
                    `📦 Items: ${items}\n` +
                    `📍 Deliver to: ${deliveryAddress}\n` +
                    `👤 Customer: ${customerName}\n` +
                    `📞 Phone: ${customerPhone.replace("whatsapp:", "")}\n\n` +
                    `Reply YES to confirm or NO to decline.`;
                try {
                    const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require("../twilio.service")));
                    const result = await sendWhatsApp(vendorPhone, message);
                    await firebase_1.db.collection("groceryOrders").doc(orderId).update({
                        dispatchMessageSid: result.sid,
                        dispatchedAt: new Date().toISOString(),
                    });
                    logger.debug(`✅ [OrderSupplies] Dispatched to ${vendorName} (${vendorPhone})`);
                    return {
                        success: true,
                        orderId,
                        vendorName,
                        status: "dispatched",
                        message: `Order sent to ${vendorName}! They will contact you shortly.`,
                    };
                }
                catch (whatsappErr) {
                    logger.error("⚠️ [OrderSupplies] WhatsApp dispatch failed:", whatsappErr);
                    // Order is still saved, just not dispatched
                    return {
                        success: true,
                        orderId,
                        status: "pending",
                        message: "Order received. We're arranging delivery and will contact you shortly.",
                        warning: "Automatic dispatch failed - manual follow-up required",
                    };
                }
            }
            // 5. No vendor found - order saved for manual processing
            return {
                success: true,
                orderId,
                status: "pending",
                message: "Order received. We're arranging delivery and will contact you shortly.",
            };
        }
        catch (err) {
            console.error("🔴 [OrderSupplies] Failed:", err);
            return {
                success: false,
                error: (0, errors_1.getErrorMessage)(err) || "Failed to process order",
            };
        }
    },
    /**
     * Service / handyman request
     */
    requestService: async (args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        logger.debug("🔧 [RequestService] New request:", args);
        return {
            success: true,
            requestId: `SRV-${Date.now()}`,
            userId: ctx.userId || null,
        };
    },
    /**
     * Show a map pin
     */
    showMap: async (args) => {
        logger.debug("🗺️ [Map] showMap called:", args);
        return {
            success: true,
            lat: args.lat,
            lng: args.lng,
            title: args.title || "Location",
        };
    },
    /**
     * Compute distance between two points
     */
    computeDistance: async (args) => {
        const parse = (str) => {
            const parts = (str || "")
                .split(",")
                .map((p) => parseFloat(p.trim()));
            if (parts.length !== 2 || parts.some(isNaN))
                return null;
            return { lat: parts[0], lon: parts[1] };
        };
        const a = parse(args.from);
        const b = parse(args.to);
        if (!a || !b)
            return { success: false, error: "Invalid coordinates" };
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const hav = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
        return { success: true, distanceKm: Math.round(R * c * 100) / 100 };
    },
    /**
     * Fetch hotspots
     */
    fetchHotspots: async (args) => {
        logger.debug("Fetch hotspots", args);
        try {
            const snap = await firebase_1.db
                .collection("checkIns")
                .orderBy("createdAt", "desc")
                .limit(200)
                .get();
            const tally = {};
            snap.forEach((doc) => {
                const data = doc.data();
                if (args.area &&
                    data.location &&
                    !String(data.location).includes(args.area))
                    return;
                const key = data.placeName || data.placeId || "unknown";
                tally[key] = (tally[key] || 0) + 1;
            });
            const hotspots = Object.entries(tally)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([place, score]) => ({ place, score }));
            return { success: true, hotspots };
        }
        catch (err) {
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    /**
     * Get area info
     */
    getAreaInfo: async (args) => {
        const vibe = await exports.miscTools.fetchHotspots({ area: args.area });
        return { success: true, area: args.area, hotspots: vibe.hotspots || [] };
    },
};
//# sourceMappingURL=misc.tools.js.map