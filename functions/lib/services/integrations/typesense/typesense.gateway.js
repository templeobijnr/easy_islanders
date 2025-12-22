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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
exports.initializeCollection = initializeCollection;
exports.initializeUserCollection = initializeUserCollection;
exports.upsertListing = upsertListing;
exports.deleteListing = deleteListing;
exports.upsertUserIntelligence = upsertUserIntelligence;
exports.searchListings = searchListings;
const typesense_1 = __importDefault(require("typesense"));
const logger = __importStar(require("firebase-functions/logger"));
// Initialize Typesense client
const client = new typesense_1.default.Client({
    nodes: [{
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: parseInt(process.env.TYPESENSE_PORT || '8108'),
            protocol: process.env.TYPESENSE_PROTOCOL || 'http'
        }],
    apiKey: process.env.TYPESENSE_API_KEY || '',
    connectionTimeoutSeconds: 2
});
exports.client = client;
const COLLECTION_NAME = 'listings';
const USERS_COLLECTION = 'users';
// Collection schema
const listingsSchema = {
    name: COLLECTION_NAME,
    fields: [
        // Common fields
        { name: 'id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'price', type: 'float' },
        { name: 'domain', type: 'string', facet: true },
        { name: 'category', type: 'string', facet: true, optional: true },
        { name: 'subCategory', type: 'string', facet: true, optional: true },
        { name: 'location', type: 'string', facet: true },
        { name: 'type', type: 'string', facet: true, optional: true },
        { name: 'rating', type: 'float', optional: true },
        { name: 'ownerId', type: 'string' },
        { name: 'createdAt', type: 'int64' },
        // Real Estate specific
        { name: 'bedrooms', type: 'int32', optional: true, facet: true },
        { name: 'bathrooms', type: 'int32', optional: true, facet: true },
        { name: 'area', type: 'float', optional: true },
        // Cars specific
        { name: 'make', type: 'string', optional: true, facet: true },
        { name: 'model', type: 'string', optional: true },
        { name: 'year', type: 'int32', optional: true },
        { name: 'transmission', type: 'string', optional: true, facet: true },
        { name: 'seats', type: 'int32', optional: true, facet: true },
        // Hotels specific
        { name: 'stars', type: 'int32', optional: true, facet: true },
        // Events specific
        { name: 'date', type: 'string', optional: true },
        { name: 'venue', type: 'string', optional: true },
        // Marketplace specific
        { name: 'condition', type: 'string', optional: true, facet: true }
    ],
    default_sorting_field: 'createdAt'
};
const usersSchema = {
    name: USERS_COLLECTION,
    fields: [
        { name: 'id', type: 'string' },
        { name: 'role', type: 'string', facet: true, optional: true },
        { name: 'university', type: 'string', facet: true, optional: true },
        { name: 'has_car', type: 'bool', facet: true, optional: true },
        { name: 'budget_tier', type: 'string', facet: true, optional: true },
        { name: 'interests', type: 'string[]', facet: true, optional: true },
        { name: 'location_geohash', type: 'string', facet: true, optional: true },
        { name: 'trust_score', type: 'int32', optional: true }
    ]
};
/**
 * Initialize the Typesense collection
 */
async function initializeCollection() {
    try {
        await client.collections(COLLECTION_NAME).retrieve();
        logger.info(`✅ Collection '${COLLECTION_NAME}' already exists`);
    }
    catch (error) {
        if (error.httpStatus === 404) {
            await client.collections().create(listingsSchema);
            logger.info(`✅ Created collection '${COLLECTION_NAME}'`);
        }
        else {
            logger.error('❌ Error checking/creating collection:', error);
            throw error;
        }
    }
}
async function initializeUserCollection() {
    try {
        await client.collections(USERS_COLLECTION).retrieve();
        logger.info(`✅ Collection '${USERS_COLLECTION}' already exists`);
    }
    catch (error) {
        if (error.httpStatus === 404) {
            await client.collections().create(usersSchema);
            logger.info(`✅ Created collection '${USERS_COLLECTION}'`);
        }
        else {
            logger.error('❌ Error checking/creating user collection:', error);
            throw error;
        }
    }
}
/**
 * Index or update a listing in Typesense
 */
async function upsertListing(listing) {
    var _a, _b, _c, _d;
    try {
        const document = {
            id: listing.id,
            title: listing.title,
            description: listing.description || '',
            price: listing.price,
            domain: listing.domain,
            category: listing.category,
            subCategory: (() => {
                // Normalize subCategory for all domains to enable consistent filtering
                if (listing.subCategory)
                    return listing.subCategory;
                // Real Estate: rentalType
                if (listing.rentalType)
                    return listing.rentalType;
                // Cars: type (rental, sale, taxi)
                if (listing.domain === 'Cars' && listing.type)
                    return listing.type;
                // Hotels: hotelType
                if (listing.domain === 'Hotels' && listing.hotelType)
                    return listing.hotelType;
                // Events: eventType
                if (listing.domain === 'Events' && listing.eventType)
                    return listing.eventType;
                // Restaurants: category (RestaurantType)
                if (listing.domain === 'Restaurants' && listing.category)
                    return listing.category;
                // Services: category (ServiceType)
                if ((listing.domain === 'Services' || listing.domain === 'Health & Beauty') && listing.category) {
                    return listing.category;
                }
                // Generic type fallback
                if (listing.type)
                    return listing.type;
                return null;
            })(),
            location: listing.location,
            type: listing.type,
            rating: listing.rating,
            ownerId: listing.ownerId || listing.ownerUid || 'system',
            createdAt: ((_a = listing.createdAt) === null || _a === void 0 ? void 0 : _a.seconds) || Math.floor(Date.now() / 1000),
            // Real Estate specific
            bedrooms: listing.bedrooms || ((_b = listing.metadata) === null || _b === void 0 ? void 0 : _b.bedrooms),
            bathrooms: listing.bathrooms || ((_c = listing.metadata) === null || _c === void 0 ? void 0 : _c.bathrooms),
            area: listing.squareMeters || listing.area || ((_d = listing.metadata) === null || _d === void 0 ? void 0 : _d.area),
            // Cars specific
            make: listing.make,
            model: listing.model,
            year: listing.year,
            transmission: listing.transmission,
            seats: listing.seats,
            // Hotels specific
            stars: listing.stars,
            // Events specific
            date: listing.date,
            venue: listing.venue,
            // Marketplace specific
            condition: listing.condition
        };
        // Remove undefined values to avoid Typesense errors
        Object.keys(document).forEach(key => {
            if (document[key] === undefined) {
                delete document[key];
            }
        });
        await client.collections(COLLECTION_NAME).documents().upsert(document);
        logger.info(`✅ Indexed listing: ${listing.id}`, document);
    }
    catch (error) {
        logger.error(`❌ Error indexing listing ${listing.id}:`, error);
        throw error;
    }
}
/**
 * Delete a listing from Typesense
 */
async function deleteListing(listingId) {
    try {
        await client.collections(COLLECTION_NAME).documents(listingId).delete();
        logger.info(`✅ Deleted listing from index: ${listingId}`);
    }
    catch (error) {
        if (error.httpStatus === 404) {
            logger.warn(`⚠️ Listing ${listingId} not found in index`);
        }
        else {
            logger.error(`❌ Error deleting listing ${listingId}:`, error);
            throw error;
        }
    }
}
async function upsertUserIntelligence(uid, intel) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const flat = {
            id: uid,
            role: ((_b = (_a = intel.attributes) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.value) || null,
            university: ((_d = (_c = intel.attributes) === null || _c === void 0 ? void 0 : _c.university) === null || _d === void 0 ? void 0 : _d.value) || null,
            has_car: ((_f = (_e = intel.attributes) === null || _e === void 0 ? void 0 : _e.has_car) === null || _f === void 0 ? void 0 : _f.value) === true,
            budget_tier: ((_h = (_g = intel.attributes) === null || _g === void 0 ? void 0 : _g.budget_tier) === null || _h === void 0 ? void 0 : _h.value) || null,
            interests: intel.segments || [],
            location_geohash: ((_k = (_j = intel.attributes) === null || _j === void 0 ? void 0 : _j.location_geohash) === null || _k === void 0 ? void 0 : _k.value) || null,
            trust_score: ((_m = (_l = intel.attributes) === null || _l === void 0 ? void 0 : _l.trust_score) === null || _m === void 0 ? void 0 : _m.value) || null
        };
        await client.collections(USERS_COLLECTION).documents().upsert(flat);
        logger.info(`✅ Upserted user intelligence for ${uid}`);
    }
    catch (error) {
        logger.error('❌ Error upserting user intelligence:', error);
        throw error;
    }
}
/**
 * Search listings with filters
 */
async function searchListings(params) {
    var _a, _b, _c;
    try {
        const filterBy = [];
        if (params.domain)
            filterBy.push(`domain:=${params.domain}`);
        if (params.category)
            filterBy.push(`category:=${params.category}`);
        if (params.subCategory)
            filterBy.push(`subCategory:=${params.subCategory}`);
        // Location handled as text query for flexible matching
        if (params.type)
            filterBy.push(`type:=${params.type}`);
        if (params.minPrice != null)
            filterBy.push(`price:>=${params.minPrice}`);
        if (params.type)
            filterBy.push(`type:=${params.type}`);
        if (params.minPrice != null)
            filterBy.push(`price:>=${params.minPrice}`);
        if (params.maxPrice != null)
            filterBy.push(`price:<=${params.maxPrice}`);
        if (params.bedrooms != null)
            filterBy.push(`bedrooms:=${params.bedrooms}`);
        if (params.bathrooms != null)
            filterBy.push(`bathrooms:=${params.bathrooms}`);
        // Construct query: combine explicit query with location if provided
        let queryText = params.query || '*';
        if (params.location) {
            if (queryText === '*') {
                queryText = params.location;
            }
            else {
                queryText += ` ${params.location}`;
            }
        }
        const searchParams = {
            q: queryText,
            query_by: 'title,description,location',
            filter_by: filterBy.join(' && ') || undefined,
            page: params.page || 1,
            per_page: params.perPage || 20,
            sort_by: 'createdAt:desc'
        };
        logger.info(`🔍 [Typesense] Search params`, searchParams);
        const results = await client.collections(COLLECTION_NAME).documents().search(searchParams);
        if (!results.found || results.found === 0) {
            logger.warn(`⚠️ [Typesense] Zero results`, { query: params.query, location: params.location, filter_by: searchParams.filter_by });
            // Debug: sample first 3 docs to confirm index contents
            try {
                const sample = await client.collections(COLLECTION_NAME).documents().search({
                    q: '*',
                    query_by: 'title',
                    per_page: 3
                });
                logger.warn(`[Typesense] Sample docs in index`, (_a = sample.hits) === null || _a === void 0 ? void 0 : _a.map((h) => h.document));
            }
            catch (e) {
                logger.error(`[Typesense] Failed sampling index`, e);
            }
            // Fallback: if a subCategory was provided and we got nothing, retry without subCategory to surface other items in the domain
            if (params.subCategory) {
                logger.warn(`[Typesense] Retrying without subCategory filter`);
                const retryParams = Object.assign(Object.assign({}, searchParams), { filter_by: filterBy.filter(f => !f.startsWith('subCategory:=')).join(' && ') || undefined });
                const retry = await client.collections(COLLECTION_NAME).documents().search(retryParams);
                return {
                    hits: ((_b = retry.hits) === null || _b === void 0 ? void 0 : _b.map((hit) => hit.document)) || [],
                    found: retry.found || 0,
                    page: retry.page || 1
                };
            }
        }
        else {
            logger.info(`🔍 Search query: "${params.query}", found ${results.found} results`);
        }
        return {
            hits: ((_c = results.hits) === null || _c === void 0 ? void 0 : _c.map((hit) => hit.document)) || [],
            found: results.found || 0,
            page: results.page || 1
        };
    }
    catch (error) {
        logger.error('❌ Search error:', error);
        throw error;
    }
}
//# sourceMappingURL=typesense.gateway.js.map