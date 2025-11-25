import Typesense from 'typesense';
import * as logger from 'firebase-functions/logger';

// Initialize Typesense client
const client = new Typesense.Client({
    nodes: [{
        host: process.env.TYPESENSE_HOST || 'localhost',
        port: parseInt(process.env.TYPESENSE_PORT || '8108'),
        protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY || '',
    connectionTimeoutSeconds: 2
});

const COLLECTION_NAME = 'listings';
const USERS_COLLECTION = 'users';

// Collection schema
const listingsSchema: any = {
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

const usersSchema: any = {
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
export async function initializeCollection() {
    try {
        await client.collections(COLLECTION_NAME).retrieve();
        logger.info(`✅ Collection '${COLLECTION_NAME}' already exists`);
    } catch (error: any) {
        if (error.httpStatus === 404) {
            await client.collections().create(listingsSchema as any);
            logger.info(`✅ Created collection '${COLLECTION_NAME}'`);
        } else {
            logger.error('❌ Error checking/creating collection:', error);
            throw error;
        }
    }
}

export async function initializeUserCollection() {
    try {
        await client.collections(USERS_COLLECTION).retrieve();
        logger.info(`✅ Collection '${USERS_COLLECTION}' already exists`);
    } catch (error: any) {
        if (error.httpStatus === 404) {
            await client.collections().create(usersSchema as any);
            logger.info(`✅ Created collection '${USERS_COLLECTION}'`);
        } else {
            logger.error('❌ Error checking/creating user collection:', error);
            throw error;
        }
    }
}

/**
 * Index or update a listing in Typesense
 */
export async function upsertListing(listing: any) {
    try {
        const document: any = {
            id: listing.id,
            title: listing.title,
            description: listing.description || '',
            price: listing.price,
            domain: listing.domain,
            category: listing.category,
            subCategory: (() => {
                // Normalize subCategory for all domains to enable consistent filtering
                if (listing.subCategory) return listing.subCategory;

                // Real Estate: rentalType
                if (listing.rentalType) return listing.rentalType;

                // Cars: type (rental, sale, taxi)
                if (listing.domain === 'Cars' && listing.type) return listing.type;

                // Hotels: hotelType
                if (listing.domain === 'Hotels' && listing.hotelType) return listing.hotelType;

                // Events: eventType
                if (listing.domain === 'Events' && listing.eventType) return listing.eventType;

                // Restaurants: category (RestaurantType)
                if (listing.domain === 'Restaurants' && listing.category) return listing.category;

                // Services: category (ServiceType)
                if ((listing.domain === 'Services' || listing.domain === 'Health & Beauty') && listing.category) {
                    return listing.category;
                }

                // Generic type fallback
                if (listing.type) return listing.type;

                return null;
            })(),
            location: listing.location,
            type: listing.type,
            rating: listing.rating,
            ownerId: listing.ownerId || listing.ownerUid || 'system',
            createdAt: listing.createdAt?.seconds || Math.floor(Date.now() / 1000),

            // Real Estate specific
            bedrooms: listing.bedrooms || listing.metadata?.bedrooms,
            bathrooms: listing.bathrooms || listing.metadata?.bathrooms,
            area: listing.squareMeters || listing.area || listing.metadata?.area,

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
    } catch (error) {
        logger.error(`❌ Error indexing listing ${listing.id}:`, error);
        throw error;
    }
}

/**
 * Delete a listing from Typesense
 */
export async function deleteListing(listingId: string) {
    try {
        await client.collections(COLLECTION_NAME).documents(listingId).delete();
        logger.info(`✅ Deleted listing from index: ${listingId}`);
    } catch (error: any) {
        if (error.httpStatus === 404) {
            logger.warn(`⚠️ Listing ${listingId} not found in index`);
        } else {
            logger.error(`❌ Error deleting listing ${listingId}:`, error);
            throw error;
        }
    }
}

export async function upsertUserIntelligence(uid: string, intel: any) {
    try {
        const flat = {
            id: uid,
            role: intel.attributes?.role?.value || null,
            university: intel.attributes?.university?.value || null,
            has_car: intel.attributes?.has_car?.value === true,
            budget_tier: intel.attributes?.budget_tier?.value || null,
            interests: intel.segments || [],
            location_geohash: intel.attributes?.location_geohash?.value || null,
            trust_score: intel.attributes?.trust_score?.value || null
        };
        await client.collections(USERS_COLLECTION).documents().upsert(flat);
        logger.info(`✅ Upserted user intelligence for ${uid}`);
    } catch (error) {
        logger.error('❌ Error upserting user intelligence:', error);
        throw error;
    }
}

/**
 * Search listings with filters
 */
export async function searchListings(params: {
    query: string;
    domain?: string;
    category?: string;
    subCategory?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    type?: string;
    page?: number;
    perPage?: number;
}) {
    try {
        const filterBy: string[] = [];

        if (params.domain) filterBy.push(`domain:=${params.domain}`);
        if (params.category) filterBy.push(`category:=${params.category}`);
        if (params.subCategory) filterBy.push(`subCategory:=${params.subCategory}`);
        // Location handled as text query for flexible matching
        if (params.type) filterBy.push(`type:=${params.type}`);
        if (params.minPrice != null) filterBy.push(`price:>=${params.minPrice}`);
        if (params.maxPrice != null) filterBy.push(`price:<=${params.maxPrice}`);

        // Construct query: combine explicit query with location if provided
        let queryText = params.query || '*';
        if (params.location) {
            if (queryText === '*') {
                queryText = params.location;
            } else {
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
                logger.warn(`[Typesense] Sample docs in index`, sample.hits?.map((h: any) => h.document));
            } catch (e) {
                logger.error(`[Typesense] Failed sampling index`, e);
            }
            // Fallback: if a subCategory was provided and we got nothing, retry without subCategory to surface other items in the domain
            if (params.subCategory) {
                logger.warn(`[Typesense] Retrying without subCategory filter`);
                const retryParams = { ...searchParams, filter_by: filterBy.filter(f => !f.startsWith('subCategory:=')).join(' && ') || undefined };
                const retry = await client.collections(COLLECTION_NAME).documents().search(retryParams);
                return {
                    hits: retry.hits?.map((hit: any) => hit.document) || [],
                    found: retry.found || 0,
                    page: retry.page || 1
                };
            }
        } else {
            logger.info(`🔍 Search query: "${params.query}", found ${results.found} results`);
        }

        return {
            hits: results.hits?.map((hit: any) => hit.document) || [],
            found: results.found || 0,
            page: results.page || 1
        };
    } catch (error) {
        logger.error('❌ Search error:', error);
        throw error;
    }
}

export { client };
