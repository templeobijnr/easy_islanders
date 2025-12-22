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
exports.onListingWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const typesenseService = __importStar(require("../services/typesense.service"));
exports.onListingWrite = (0, firestore_1.onDocumentWritten)({
    document: "listings/{listingId}",
    database: "easy-db",
    region: "europe-west1"
}, async (event) => {
    var _a;
    if (!process.env.TYPESENSE_API_KEY) {
        logger.info(`[onListingWrite] TYPESENSE_API_KEY not set; skipping index sync`);
        return;
    }
    const listingId = event.params.listingId;
    const newDoc = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    // 1. Document Deleted
    if (!newDoc) {
        logger.info(`🗑️ Listing ${listingId} deleted from Firestore.`);
        try {
            await typesenseService.deleteListing(listingId);
        }
        catch (error) {
            logger.error(`Failed to delete from Typesense:`, error);
        }
        return;
    }
    // 2. Document Created or Updated
    logger.info(`🔄 Syncing Listing ${listingId} to Search Index...`, { title: newDoc.title, domain: newDoc.domain, location: newDoc.location });
    // Transform data for Search Engine - pass all domain-specific fields
    const searchRecord = {
        id: listingId,
        // Common fields
        title: newDoc.title,
        description: newDoc.description,
        price: newDoc.price,
        domain: newDoc.domain,
        category: newDoc.category,
        subCategory: newDoc.subCategory,
        location: newDoc.location,
        type: newDoc.type,
        rating: newDoc.rating,
        ownerId: newDoc.ownerId || newDoc.ownerUid,
        createdAt: newDoc.createdAt,
        // Real Estate fields
        rentalType: newDoc.rentalType,
        bedrooms: newDoc.bedrooms,
        bathrooms: newDoc.bathrooms,
        squareMeters: newDoc.squareMeters,
        amenities: newDoc.amenities,
        // Cars fields
        make: newDoc.make,
        model: newDoc.model,
        year: newDoc.year,
        transmission: newDoc.transmission,
        fuelType: newDoc.fuelType,
        seats: newDoc.seats,
        mileage: newDoc.mileage,
        // Hotels fields
        hotelType: newDoc.hotelType,
        stars: newDoc.stars,
        breakfastIncluded: newDoc.breakfastIncluded,
        roomTypes: newDoc.roomTypes,
        // Restaurants fields
        restaurantName: newDoc.restaurantName,
        cuisine: newDoc.cuisine,
        ingredients: newDoc.ingredients,
        // Events fields
        eventType: newDoc.eventType,
        date: newDoc.date,
        venue: newDoc.venue,
        totalTickets: newDoc.totalTickets,
        ticketsAvailable: newDoc.ticketsAvailable,
        // Services fields
        pricingModel: newDoc.pricingModel,
        durationMinutes: newDoc.durationMinutes,
        providerName: newDoc.providerName,
        serviceArea: newDoc.serviceArea,
        // Marketplace fields
        condition: newDoc.condition,
        stock: newDoc.stock,
        sellerName: newDoc.sellerName
    };
    try {
        await typesenseService.upsertListing(searchRecord);
        logger.info(`✅ Synced to Typesense:`, searchRecord);
    }
    catch (error) {
        logger.error(`Failed to sync to Typesense:`, error);
    }
});
//# sourceMappingURL=onListingWrite.js.map