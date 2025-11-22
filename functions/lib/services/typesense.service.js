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
exports.upsertListing = upsertListing;
exports.deleteListing = deleteListing;
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
// Collection schema
const listingsSchema = {
    name: COLLECTION_NAME,
    fields: [
        { name: 'id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'price', type: 'float' },
        { name: 'domain', type: 'string', facet: true },
        { name: 'category', type: 'string', facet: true, optional: true },
        { name: 'subCategory', type: 'string', facet: true, optional: true },
        { name: 'location', type: 'string', facet: true },
        { name: 'type', type: 'string', facet: true, optional: true },
        { name: 'bedrooms', type: 'int32', optional: true },
        { name: 'bathrooms', type: 'int32', optional: true },
        { name: 'area', type: 'float', optional: true },
        { name: 'rating', type: 'float', optional: true },
        { name: 'ownerId', type: 'string' },
        { name: 'createdAt', type: 'int64' }
    ],
    default_sorting_field: 'createdAt'
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
            subCategory: listing.subCategory,
            location: listing.location,
            type: listing.type,
            bedrooms: (_a = listing.metadata) === null || _a === void 0 ? void 0 : _a.bedrooms,
            bathrooms: (_b = listing.metadata) === null || _b === void 0 ? void 0 : _b.bathrooms,
            area: (_c = listing.metadata) === null || _c === void 0 ? void 0 : _c.area,
            rating: listing.rating,
            ownerId: listing.ownerId,
            createdAt: ((_d = listing.createdAt) === null || _d === void 0 ? void 0 : _d.seconds) || Math.floor(Date.now() / 1000)
        };
        await client.collections(COLLECTION_NAME).documents().upsert(document);
        logger.info(`✅ Indexed listing: ${listing.id}`);
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
/**
 * Search listings with filters
 */
async function searchListings(params) {
    var _a;
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
        if (params.minPrice !== undefined)
            filterBy.push(`price:>=${params.minPrice}`);
        if (params.maxPrice !== undefined)
            filterBy.push(`price:<=${params.maxPrice}`);
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
        const results = await client.collections(COLLECTION_NAME).documents().search(searchParams);
        logger.info(`🔍 Search query: "${params.query}", found ${results.found} results`);
        return {
            hits: ((_a = results.hits) === null || _a === void 0 ? void 0 : _a.map((hit) => hit.document)) || [],
            found: results.found || 0,
            page: results.page || 1
        };
    }
    catch (error) {
        logger.error('❌ Search error:', error);
        throw error;
    }
}
//# sourceMappingURL=typesense.service.js.map