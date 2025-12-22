"use strict";
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
exports.SEARCH_LIMITS = void 0;
exports.executeSearch = executeSearch;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * Hard limits for search queries.
 */
exports.SEARCH_LIMITS = {
    /** Maximum documents per request */
    MAX_DOCS: 50,
    /** Maximum pages per session */
    MAX_PAGES: 10,
    /** Maximum query runtime (ms) */
    MAX_RUNTIME_MS: 10000,
    /** Rate limit window (ms) */
    RATE_WINDOW_MS: 60000,
    /** Max requests per window per user */
    MAX_REQUESTS_PER_USER: 100,
    /** Max requests per window per IP */
    MAX_REQUESTS_PER_IP: 200,
};
/**
 * Rate limit tracking.
 */
const rateLimits = new Map();
/**
 * Checks rate limits for a user/IP.
 */
function checkRateLimit(key, maxRequests) {
    const now = Date.now();
    const entry = rateLimits.get(key);
    if (!entry || now - entry.windowStart > exports.SEARCH_LIMITS.RATE_WINDOW_MS) {
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
function decodePageToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    }
    catch (_a) {
        return null;
    }
}
/**
 * Encodes a pagination token.
 */
function encodePageToken(docId, page) {
    return Buffer.from(JSON.stringify({ docId, page })).toString('base64');
}
/**
 * Executes a search query with limits enforced.
 */
async function executeSearch(options) {
    const startTime = Date.now();
    const { collection, filters = [], orderBy, limit = exports.SEARCH_LIMITS.MAX_DOCS, pageToken, traceId, userId, clientIp, } = options;
    const partialOutageFlags = [];
    // Enforce hard limit
    const effectiveLimit = Math.min(limit, exports.SEARCH_LIMITS.MAX_DOCS);
    // Check rate limits
    if (userId && !checkRateLimit(`user:${userId}`, exports.SEARCH_LIMITS.MAX_REQUESTS_PER_USER)) {
        logger.warn('SearchBroker: User rate limit exceeded', {
            component: 'searchBroker',
            event: 'rate_limit_user',
            traceId,
            userId,
        });
        throw new Error('Rate limit exceeded');
    }
    if (clientIp && !checkRateLimit(`ip:${clientIp}`, exports.SEARCH_LIMITS.MAX_REQUESTS_PER_IP)) {
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
    let startAfterDoc = null;
    if (pageToken) {
        const decoded = decodePageToken(pageToken);
        if (decoded) {
            currentPage = decoded.page;
            // Enforce max pages
            if (currentPage > exports.SEARCH_LIMITS.MAX_PAGES) {
                logger.warn('SearchBroker: Max pages exceeded', {
                    component: 'searchBroker',
                    event: 'max_pages_exceeded',
                    traceId,
                    currentPage,
                    maxPages: exports.SEARCH_LIMITS.MAX_PAGES,
                });
                throw new Error('Maximum pagination limit reached');
            }
            // Get start-after document
            try {
                startAfterDoc = await firebase_1.db.collection(collection).doc(decoded.docId).get();
            }
            catch (_a) {
                partialOutageFlags.push('pagination_cursor_failed');
            }
        }
    }
    // Build query
    let query = firebase_1.db.collection(collection);
    for (const filter of filters) {
        query = query.where(filter.field, filter.op, filter.value);
    }
    if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
    }
    if (startAfterDoc === null || startAfterDoc === void 0 ? void 0 : startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
    }
    query = query.limit(effectiveLimit + 1); // +1 to check for more
    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), exports.SEARCH_LIMITS.MAX_RUNTIME_MS));
    let snapshot;
    try {
        snapshot = await Promise.race([query.get(), timeoutPromise]);
    }
    catch (error) {
        if (error.message === 'Query timeout') {
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
    const results = docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    // Generate next page token
    let nextPageToken;
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
            startAfter: startAfterDoc === null || startAfterDoc === void 0 ? void 0 : startAfterDoc.id,
        },
        partialOutageFlags,
        executionTimeMs,
    };
}
//# sourceMappingURL=searchBroker.js.map