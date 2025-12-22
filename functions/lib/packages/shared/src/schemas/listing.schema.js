"use strict";
/**
 * Listing Schema for AskMerve V1
 *
 * Simplified listing schema for job targeting and merchant resolution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingSchema = exports.PlaceTypeSchema = void 0;
exports.listingSupportsAction = listingSupportsAction;
exports.getListingDispatchPhone = getListingDispatchPhone;
const zod_1 = require("zod");
const location_schema_1 = require("./location.schema");
const action_schema_1 = require("./action.schema");
// =============================================================================
// LISTING SCHEMA
// =============================================================================
/**
 * Place types for categorization.
 */
exports.PlaceTypeSchema = zod_1.z.enum([
    'restaurant',
    'cafe',
    'bar',
    'hotel',
    'apartment',
    'villa',
    'spa',
    'salon',
    'gym',
    'tour_operator',
    'taxi_company',
    'water_gas_vendor',
    'grocery',
    'pharmacy',
    'service_provider',
    'other',
]);
/**
 * Listing document schema.
 */
exports.ListingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    /** Display name */
    name: zod_1.z.string().min(1),
    /** Place type */
    placeType: exports.PlaceTypeSchema,
    /** Description */
    description: zod_1.z.string().optional(),
    /** Address */
    address: zod_1.z.string().optional(),
    /** Coordinates for mapping */
    coordinates: location_schema_1.CoordinatesSchema.optional(),
    /** Cover image URL */
    imageUrl: zod_1.z.string().url().optional(),
    /** Contact info */
    contact: zod_1.z.object({
        phone: zod_1.z.string().optional(),
        whatsapp: zod_1.z.string().optional(), // E.164 format
        email: zod_1.z.string().email().optional(),
        website: zod_1.z.string().url().optional(),
    }).optional(),
    /** Merve integration config */
    merve: zod_1.z.object({
        /** Whether Merve can dispatch to this listing */
        enabled: zod_1.z.boolean().default(false),
        /** Supported action types */
        actions: zod_1.z.array(action_schema_1.ActionTypeSchema).optional(),
        /** Primary WhatsApp for dispatch */
        whatsappE164: zod_1.z.string().regex(/^\+\d{10,15}$/).optional(),
        /** Coverage areas (neighborhoods, etc.) */
        coverageAreas: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    /** Operating hours (simplified) */
    operatingHours: zod_1.z.object({
        monday: zod_1.z.string().optional(),
        tuesday: zod_1.z.string().optional(),
        wednesday: zod_1.z.string().optional(),
        thursday: zod_1.z.string().optional(),
        friday: zod_1.z.string().optional(),
        saturday: zod_1.z.string().optional(),
        sunday: zod_1.z.string().optional(),
    }).optional(),
    /** Tags for search/filtering */
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    /** Active status */
    isActive: zod_1.z.boolean().default(true),
    /** Timestamps */
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
// =============================================================================
// HELPERS
// =============================================================================
/**
 * Checks if a listing supports a specific action type.
 */
function listingSupportsAction(listing, actionType) {
    var _a;
    if (!((_a = listing.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
        return false;
    }
    if (!listing.merve.actions || listing.merve.actions.length === 0) {
        return true; // If no specific actions, assume all supported
    }
    return listing.merve.actions.includes(actionType);
}
/**
 * Gets the dispatch WhatsApp number for a listing.
 */
function getListingDispatchPhone(listing) {
    var _a, _b, _c;
    return (_b = (_a = listing.merve) === null || _a === void 0 ? void 0 : _a.whatsappE164) !== null && _b !== void 0 ? _b : (_c = listing.contact) === null || _c === void 0 ? void 0 : _c.whatsapp;
}
//# sourceMappingURL=listing.schema.js.map