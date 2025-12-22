/**
 * Search Broker with Exfiltration Limits (CASC-04B)
 *
 * Enforces query limits to prevent mass data exfiltration.
 *
 * INVARIANTS:
 * - Hard limits: maxDocs=50, maxPages=10, maxRuntimeMs=10000.
 * - Per-user + per-IP rate limits.
 * - Pagination tokens required for multi-page results.
 * - Responses include partialOutageFlags + queryPlan.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Hard limits for search queries.
 */
export const SEARCH_LIMITS = {
    /** Maximum documents per request */
    MAX_DOCS: 50,
    /** Maximum pages per session */
    MAX_PAGES: 10,
    /** Maximum query runtime (ms) */
    MAX_RUNTIME_MS: 10_000,
    /** Rate limit window (ms) */
    RATE_WINDOW_MS: 60_000,
    /** Max requests per window per user */
    MAX_REQUESTS_PER_USER: 100,
    /** Max requests per window per IP */
    MAX_REQUESTS_PER_IP: 200,
} as const;

/**
 * Rate limit tracking.
 */
const rateLimits = new Map<string, { count: number; windowStart: number }>();

/**
 * Search query plan for transparency.
 */
export interface QueryPlan {
    collection: string;
    filters: string[];
    orderBy?: string;
    limit: number;
    startAfter?: string;
}

/**
 * Search response with metadata.
 */
export interface SearchResponse<T> {
    results: T[];
    totalCount: number;
    nextPageToken?: string;
    queryPlan: QueryPlan;
    partialOutageFlags: string[];
    executionTimeMs: number;
}

/**
 * Search request options.
 */
export interface SearchOptions {
    collection: string;
    filters?: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }>;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
    limit?: number;
    pageToken?: string;
    traceId: string;
    userId?: string;
    clientIp?: string;
}

/**
 * Checks rate limits for a user/IP.
 */
function checkRateLimit(key: string, maxRequests: number): boolean {
    const now = Date.now();
    const entry = rateLimits.get(key);

    if (!entry || now - entry.windowStart > SEARCH_LIMITS.RATE_WINDOW_MS) {
        // New window
        rateLimits.set(key, { count: 1, windowStart: now });
        return true;
    }

    if (entry.count >= maxRequests) {
        return false;
    }

    entry.count++;
    return true;
}

/**
 * Decodes a pagination token.
 */
function decodePageToken(token: string): { docId: string; page: number } | null {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Encodes a pagination token.
 */
function encodePageToken(docId: string, page: number): string {
    return Buffer.from(JSON.stringify({ docId, page })).toString('base64');
}

/**
 * Executes a search query with limits enforced.
 */
export async function executeSearch<T>(
    options: SearchOptions
): Promise<SearchResponse<T>> {
    const startTime = Date.now();
    const {
        collection,
        filters = [],
        orderBy,
        limit = SEARCH_LIMITS.MAX_DOCS,
        pageToken,
        traceId,
        userId,
        clientIp,
    } = options;

    const partialOutageFlags: string[] = [];

    // Enforce hard limit
    const effectiveLimit = Math.min(limit, SEARCH_LIMITS.MAX_DOCS);

    // Check rate limits
    if (userId && !checkRateLimit(`user:${userId}`, SEARCH_LIMITS.MAX_REQUESTS_PER_USER)) {
        logger.warn('SearchBroker: User rate limit exceeded', {
            component: 'searchBroker',
            event: 'rate_limit_user',
            traceId,
            userId,
        });
        throw new Error('Rate limit exceeded');
    }

    if (clientIp && !checkRateLimit(`ip:${clientIp}`, SEARCH_LIMITS.MAX_REQUESTS_PER_IP)) {
        logger.warn('SearchBroker: IP rate limit exceeded', {
            component: 'searchBroker',
            event: 'rate_limit_ip',
            traceId,
            clientIp,
        });
        throw new Error('Rate limit exceeded');
    }

    // Parse page token
    let currentPage = 1;
    let startAfterDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    if (pageToken) {
        const decoded = decodePageToken(pageToken);
        if (decoded) {
            currentPage = decoded.page;

            // Enforce max pages
            if (currentPage > SEARCH_LIMITS.MAX_PAGES) {
                logger.warn('SearchBroker: Max pages exceeded', {
                    component: 'searchBroker',
                    event: 'max_pages_exceeded',
                    traceId,
                    currentPage,
                    maxPages: SEARCH_LIMITS.MAX_PAGES,
                });
                throw new Error('Maximum pagination limit reached');
            }

            // Get start-after document
            try {
                startAfterDoc = await db.collection(collection).doc(decoded.docId).get();
            } catch {
                partialOutageFlags.push('pagination_cursor_failed');
            }
        }
    }

    // Build query
    let query: FirebaseFirestore.Query = db.collection(collection);

    for (const filter of filters) {
        query = query.where(filter.field, filter.op, filter.value);
    }

    if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
    }

    if (startAfterDoc?.exists) {
        query = query.startAfter(startAfterDoc);
    }

    query = query.limit(effectiveLimit + 1); // +1 to check for more

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), SEARCH_LIMITS.MAX_RUNTIME_MS)
    );

    let snapshot: FirebaseFirestore.QuerySnapshot;
    try {
        snapshot = await Promise.race([query.get(), timeoutPromise]);
    } catch (error) {
        if ((error as Error).message === 'Query timeout') {
            partialOutageFlags.push('query_timeout');
            logger.error('SearchBroker: Query timeout', {
                component: 'searchBroker',
                event: 'query_timeout',
                traceId,
                collection,
            });
        }
        throw error;
    }

    // Process results
    const docs = snapshot.docs.slice(0, effectiveLimit);
    const hasMore = snapshot.docs.length > effectiveLimit;

    const results = docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);

    // Generate next page token
    let nextPageToken: string | undefined;
    if (hasMore && docs.length > 0) {
        const lastDoc = docs[docs.length - 1];
        nextPageToken = encodePageToken(lastDoc.id, currentPage + 1);
    }

    const executionTimeMs = Date.now() - startTime;

    logger.info('SearchBroker: Query executed', {
        component: 'searchBroker',
        event: 'query_executed',
        traceId,
        collection,
        resultCount: results.length,
        hasMore,
        executionTimeMs,
        page: currentPage,
    });

    return {
        results,
        totalCount: results.length,
        nextPageToken,
        queryPlan: {
            collection,
            filters: filters.map((f) => `${f.field} ${f.op} ${String(f.value)}`),
            orderBy: orderBy ? `${orderBy.field} ${orderBy.direction}` : undefined,
            limit: effectiveLimit,
            startAfter: startAfterDoc?.id,
        },
        partialOutageFlags,
        executionTimeMs,
    };
}
