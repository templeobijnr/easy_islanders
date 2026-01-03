import Typesense from 'typesense';
import * as logger from 'firebase-functions/logger';

// Lazy initialization - only create client when actually needed
// This prevents Typesense from blocking function startup if not configured
let client: InstanceType<typeof Typesense.Client> | null = null;

function getClient(): InstanceType<typeof Typesense.Client> | null {
    // If Typesense is not configured, return null immediately
    const typesenseApiKey = process.env.TYPESENSE_API_KEY;
    if (!typesenseApiKey) {
        return null; // Typesense disabled - no warning needed
    }

    // Initialize client lazily on first use
    if (!client) {
        const typesenseHost = process.env.TYPESENSE_HOST || 'localhost';
        const typesensePort = parseInt(process.env.TYPESENSE_PORT || '8108');
        const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || 'http';

        if (!typesenseHost || typesenseHost === 'localhost') {
            logger.warn('⚠️ [Typesense] TYPESENSE_HOST not configured, using localhost (will fail in production)');
        }

        client = new Typesense.Client({
            nodes: [{
                host: typesenseHost,
                port: typesensePort,
                protocol: typesenseProtocol as 'http' | 'https'
            }],
            apiKey: typesenseApiKey,
            connectionTimeoutSeconds: 5,
            numRetries: 1,
            retryIntervalSeconds: 0.1
        });
    }

    return client;
}

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
    const tsClient = getClient();
    if (!tsClient) {
        logger.warn('⚠️ [Typesense] Skipping collection initialization - Typesense not configured');
        return;
    }
    try {
        await tsClient.collections(COLLECTION_NAME).retrieve();
        logger.info(`✅ Collection '${COLLECTION_NAME}' already exists`);
    } catch (error: unknown) {
        const httpStatus =
            typeof error === 'object' && error && 'httpStatus' in error ? (error as any).httpStatus : undefined;
        if (httpStatus === 404) {
            await tsClient.collections().create(listingsSchema as any);
            logger.info(`✅ Created collection '${COLLECTION_NAME}'`);
        } else {
            logger.error('❌ Error checking/creating collection:', error);
            throw error;
        }
    }
}

export async function initializeUserCollection() {
    const tsClient = getClient();
    if (!tsClient) {
        logger.warn('⚠️ [Typesense] Skipping user collection initialization - Typesense not configured');
        return;
    }
    try {
        await tsClient.collections(USERS_COLLECTION).retrieve();
        logger.info(`✅ Collection '${USERS_COLLECTION}' already exists`);
    } catch (error: unknown) {
        const httpStatus =
            typeof error === 'object' && error && 'httpStatus' in error ? (error as any).httpStatus : undefined;
        if (httpStatus === 404) {
            await tsClient.collections().create(usersSchema as any);
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
    const tsClient = getClient();
    if (!tsClient) {
        logger.debug('⚠️ [Typesense] Skipping upsert - Typesense not configured');
        return;
    }
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

        await tsClient.collections(COLLECTION_NAME).documents().upsert(document);
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
    const tsClient = getClient();
    if (!tsClient) {
        logger.debug('⚠️ [Typesense] Skipping delete - Typesense not configured');
        return;
    }
    try {
        await tsClient.collections(COLLECTION_NAME).documents(listingId).delete();
        logger.info(`✅ Deleted listing from index: ${listingId}`);
    } catch (error: unknown) {
        const httpStatus =
            typeof error === 'object' && error && 'httpStatus' in error ? (error as any).httpStatus : undefined;
        if (httpStatus === 404) {
            logger.warn(`⚠️ Listing ${listingId} not found in index`);
        } else {
            logger.error(`❌ Error deleting listing ${listingId}:`, error);
            throw error;
        }
    }
}

export async function upsertUserIntelligence(uid: string, intel: any) {
    const tsClient = getClient();
    if (!tsClient) {
        logger.debug('⚠️ [Typesense] Skipping user intelligence upsert - Typesense not configured');
        return;
    }
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
        await tsClient.collections(USERS_COLLECTION).documents().upsert(flat);
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
    bedrooms?: number;
    bathrooms?: number;
}) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/7207ff65-c9c6-4873-a824-51b8bedf5d3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'typesense.gateway.ts:239',message:'Typesense searchListings CALLED',data:{params,stackTrace:new Error().stack?.split('\n').slice(0,5).join('|')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const tsClient = getClient();
    if (!tsClient) {
        logger.debug('⚠️ [Typesense] searchListings called but Typesense not configured - returning empty results');
        return {
            hits: [],
            found: 0,
            page: 1
        };
    }
    
    try {
        const filterBy: string[] = [];

        if (params.domain) filterBy.push(`domain:=${params.domain}`);
        if (params.category) filterBy.push(`category:=${params.category}`);
        if (params.subCategory) filterBy.push(`subCategory:=${params.subCategory}`);
        // Location handled as text query for flexible matching
        if (params.type) filterBy.push(`type:=${params.type}`);
        if (params.minPrice != null) filterBy.push(`price:>=${params.minPrice}`);
        if (params.type) filterBy.push(`type:=${params.type}`);
        if (params.minPrice != null) filterBy.push(`price:>=${params.minPrice}`);
        if (params.maxPrice != null) filterBy.push(`price:<=${params.maxPrice}`);
        if (params.bedrooms != null) filterBy.push(`bedrooms:=${params.bedrooms}`);
        if (params.bathrooms != null) filterBy.push(`bathrooms:=${params.bathrooms}`);

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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/7207ff65-c9c6-4873-a824-51b8bedf5d3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'typesense.gateway.ts:304',message:'BEFORE Typesense API call',data:{searchParams,aboutToCallTypesense:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        const results = await tsClient.collections(COLLECTION_NAME).documents().search(searchParams);

        if (!results.found || results.found === 0) {
            logger.warn(`⚠️ [Typesense] Zero results`, { query: params.query, location: params.location, filter_by: searchParams.filter_by });
            // Debug: sample first 3 docs to confirm index contents
            try {
                const sample = await tsClient.collections(COLLECTION_NAME).documents().search({
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
                const retry = await tsClient.collections(COLLECTION_NAME).documents().search(retryParams);
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
    } catch (error: any) {
        // Handle DNS resolution errors (ENOTFOUND) gracefully
        if (error?.code === 'ENOTFOUND' || error?.message?.includes('getaddrinfo ENOTFOUND')) {
            const typesenseHost = process.env.TYPESENSE_HOST || 'localhost';
            logger.error('❌ [Typesense] DNS resolution failed - hostname not found:', {
                host: typesenseHost,
                error: error.message,
                hint: 'Check TYPESENSE_HOST environment variable. Should be a valid hostname (e.g., xyz.a1.typesense.net)'
            });
            // Return empty results instead of throwing - allows fallback to Firestore
            return {
                hits: [],
                found: 0,
                page: 1
            };
        }
        // Handle connection errors
        if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
            const typesenseHost = process.env.TYPESENSE_HOST || 'localhost';
            const typesensePort = parseInt(process.env.TYPESENSE_PORT || '8108');
            logger.error('❌ [Typesense] Connection failed:', {
                host: typesenseHost,
                port: typesensePort,
                error: error.message
            });
            return {
                hits: [],
                found: 0,
                page: 1
            };
        }
        logger.error('❌ Search error:', error);
        throw error;
    }
}

// Export getter function instead of direct client to ensure lazy initialization
export function getTypesenseClient() {
    return getClient();
}
