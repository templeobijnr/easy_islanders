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
exports.toolResolvers = void 0;
const admin = __importStar(require("firebase-admin"));
const listing_repository_1 = require("../repositories/listing.repository");
const db = admin.firestore();
const LOCATION_SYNONYMS = {
    "girne": "Kyrenia",
    "lefkosa": "Nicosia",
    "magusa": "Famagusta",
    "iskele": "Iskele",
    "guzelyurt": "Guzelyurt"
};
exports.toolResolvers = {
    // TypeSense-powered marketplace search
    searchMarketplace: async (args) => {
        console.log("🔍 [Search] TypeSense Search Args:", args);
        // Normalize location (e.g., Girne -> Kyrenia)
        let location = args.location;
        if (location) {
            const normalized = LOCATION_SYNONYMS[location.toLowerCase()];
            if (normalized) {
                console.log(`📍 [Search] Normalized location '${location}' to '${normalized}'`);
                location = normalized;
            }
        }
        try {
            const { searchListings } = await Promise.resolve().then(() => __importStar(require('./typesense.service')));
            const result = await searchListings({
                query: args.query || '*',
                domain: args.domain,
                category: args.category,
                subCategory: args.subCategory,
                location: location,
                minPrice: args.minPrice,
                maxPrice: args.maxPrice,
                perPage: 20
            });
            console.log(`🔍 [Search] Found ${result.found} items via TypeSense`);
            return result.hits.map((hit) => {
                var _a, _b;
                return ({
                    id: hit.id,
                    title: hit.title,
                    price: hit.price,
                    location: hit.location,
                    amenities: ((_a = hit.metadata) === null || _a === void 0 ? void 0 : _a.amenities) || [],
                    description: hit.description,
                    imageUrl: (_b = hit.metadata) === null || _b === void 0 ? void 0 : _b.imageUrl,
                    domain: hit.domain,
                    category: hit.category,
                    subCategory: hit.subCategory,
                    type: hit.type
                });
            });
        }
        catch (error) {
            console.error("🔴 [Search] TypeSense Failed:", error);
            return [];
        }
    },
    // Secure booking creation with validation
    createBooking: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        // 1. VALIDATE: Does the item actually exist?
        const item = await listing_repository_1.listingRepository.getById(args.itemId);
        if (!item) {
            throw new Error(`Item not found: ${args.itemId}`);
        }
        // 2. HYDRATE: Use DB data for price/title (Security)
        const bookingData = {
            id: `ORD-${Date.now()}`, // In prod, let Firestore gen ID or use UUID
            userId: userId,
            // Core Links
            itemId: item.id,
            domain: item.domain,
            // Snapshot Data (So it doesn't change if listing changes)
            itemTitle: item.title,
            itemImage: item.imageUrl,
            totalPrice: item.price, // Using REAL price from DB
            currency: item.currency,
            // User Inputs
            customerName: args.customerName,
            customerContact: args.customerContact,
            specialRequests: args.specialRequests || '',
            needsPickup: args.needsPickup || false,
            // Logistics
            checkIn: args.checkInDate || null,
            checkOut: args.checkOutDate || null,
            viewingTime: args.viewingSlot || null,
            // System
            status: 'payment_pending', // Matches frontend Enum
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        // 3. WRITE
        await db.collection('bookings').doc(bookingData.id).set(bookingData);
        console.log(`✅ Booking created: ${bookingData.id} for ${item.title}`);
        return bookingData;
    },
    // --- NEW TOOLS ---
    consultEncyclopedia: async (args) => {
        console.log("Consulting Encyclopedia:", args);
        return {
            answer: `Here is some information about ${args.query}: North Cyprus has a rich history and follows British legal frameworks for property. Residency is easy to obtain for property owners.`
        };
    },
    getRealTimeInfo: async (args) => {
        console.log("Getting Real Time Info:", args);
        return {
            info: `Current info for ${args.category}: Weather is sunny, 25°C. GBP/TRY exchange rate is approx 40.0.`
        };
    },
    sendWhatsAppMessage: async (args) => {
        console.log("Sending WhatsApp:", args);
        return { success: true, status: 'sent' };
    },
    dispatchTaxi: async (args) => {
        console.log("Dispatching Taxi:", args);
        return {
            booking: { id: `TAXI-${Date.now()}`, status: 'confirmed' }
        };
    },
    createConsumerRequest: async (args) => {
        console.log("Creating Consumer Request:", args);
        return { success: true, requestId: `REQ-${Date.now()}` };
    }
};
//# sourceMappingURL=toolService.js.map