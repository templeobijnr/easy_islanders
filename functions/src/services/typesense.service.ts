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

// Collection schema
const listingsSchema: any = {
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

/**
 * Index or update a listing in Typesense
 */
export async function upsertListing(listing: any) {
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
            bedrooms: listing.metadata?.bedrooms,
            bathrooms: listing.metadata?.bathrooms,
            area: listing.metadata?.area,
            rating: listing.rating,
            ownerId: listing.ownerId,
            createdAt: listing.createdAt?.seconds || Math.floor(Date.now() / 1000)
        };

        await client.collections(COLLECTION_NAME).documents().upsert(document);
        logger.info(`✅ Indexed listing: ${listing.id}`);
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
        if (params.minPrice !== undefined) filterBy.push(`price:>=${params.minPrice}`);
        if (params.maxPrice !== undefined) filterBy.push(`price:<=${params.maxPrice}`);

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

        const results = await client.collections(COLLECTION_NAME).documents().search(searchParams);

        logger.info(`🔍 Search query: "${params.query}", found ${results.found} results`);

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
