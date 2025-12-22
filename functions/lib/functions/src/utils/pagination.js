"use strict";
/**
 * Pagination Contract (DB-02)
 *
 * Cursor-based pagination with deterministic ordering.
 *
 * INVARIANTS:
 * - Limit max 50 per request.
 * - Cursor is opaque (base64 encoded).
 * - Deterministic ordering: if orderBy is not unique, enforce __name__ tie-breaker.
 * - Cursor shape validated before use.
 * - All pagination ops logged with traceId.
 *
 * @see Living Document Section 18.3 for invariants.
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
exports.paginateQuery = paginateQuery;
exports.validateLimit = validateLimit;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * Maximum items per page.
 */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
/**
 * Encodes cursor data to opaque string.
 */
function encodeCursor(data) {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}
/**
 * Decodes cursor string to data.
 * Validates shape and returns null if invalid.
 */
function decodeCursor(cursor) {
    try {
        // Validate size (prevent large cursors)
        if (cursor.length > 2000) {
            return null;
        }
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const data = JSON.parse(decoded);
        // Validate shape
        if (typeof data !== 'object' ||
            !Array.isArray(data.values) ||
            typeof data.docId !== 'string' ||
            typeof data.version !== 'number') {
            return null;
        }
        // Validate version
        if (data.version !== 1) {
            return null;
        }
        return data;
    }
    catch (_a) {
        return null;
    }
}
/**
 * Executes a paginated query.
 *
 * @param options - Pagination options.
 * @returns Pagination result with items and cursor.
 */
async function paginateQuery(options) {
    const { collection, orderBy, limit = DEFAULT_LIMIT, cursor, filters = [], queryName, traceId, } = options;
    // Enforce max limit
    const effectiveLimit = Math.min(limit, MAX_LIMIT);
    // Ensure deterministic ordering with __name__ tie-breaker
    const orderByWithTieBreaker = ensureDeterministicOrder(orderBy);
    logger.info('Pagination: Query started', {
        component: 'pagination',
        event: 'query_started',
        traceId,
        queryName,
        collection,
        limit: effectiveLimit,
        cursorPresent: !!cursor,
        orderByFields: orderByWithTieBreaker.map((o) => o.field),
    });
    // Build base query
    let query = firebase_1.db.collection(collection);
    // Apply filters
    for (const filter of filters) {
        query = query.where(filter.field, filter.op, filter.value);
    }
    // Apply ordering
    for (const order of orderByWithTieBreaker) {
        query = query.orderBy(order.field, order.direction);
    }
    // Apply cursor if present
    if (cursor) {
        const cursorData = decodeCursor(cursor);
        if (!cursorData) {
            logger.warn('Pagination: Invalid cursor, starting from beginning', {
                component: 'pagination',
                event: 'invalid_cursor',
                traceId,
                queryName,
            });
        }
        else {
            // Use startAfter with document reference for stability
            const docRef = firebase_1.db.collection(collection).doc(cursorData.docId);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                query = query.startAfter(docSnap);
            }
        }
    }
    // Fetch one extra to determine hasMore
    query = query.limit(effectiveLimit + 1);
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, effectiveLimit);
    const hasMore = snapshot.docs.length > effectiveLimit;
    // Build items
    const items = docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    // Build next cursor
    let nextCursor;
    if (hasMore && docs.length > 0) {
        const lastDoc = docs[docs.length - 1];
        const cursorValues = orderByWithTieBreaker.map((o) => o.field === '__name__' ? lastDoc.id : lastDoc.data()[o.field]);
        nextCursor = encodeCursor({
            values: cursorValues,
            docId: lastDoc.id,
            version: 1,
        });
    }
    logger.info('Pagination: Query completed', {
        component: 'pagination',
        event: 'query_completed',
        traceId,
        queryName,
        collection,
        limit: effectiveLimit,
        resultCount: items.length,
        hasMore,
        cursorPresent: !!cursor,
    });
    return {
        items,
        nextCursor,
        hasMore,
        resultCount: items.length,
    };
}
/**
 * Ensures ordering has a deterministic tie-breaker.
 */
function ensureDeterministicOrder(orderBy) {
    var _a, _b;
    // Check if __name__ is already in ordering
    const hasNameOrder = orderBy.some((o) => o.field === '__name__');
    if (hasNameOrder) {
        return orderBy;
    }
    // Add __name__ as tie-breaker
    const lastDirection = (_b = (_a = orderBy[orderBy.length - 1]) === null || _a === void 0 ? void 0 : _a.direction) !== null && _b !== void 0 ? _b : 'asc';
    return [...orderBy, { field: '__name__', direction: lastDirection }];
}
/**
 * Validates pagination limit.
 */
function validateLimit(limit) {
    if (limit === undefined)
        return DEFAULT_LIMIT;
    if (limit < 1)
        return DEFAULT_LIMIT;
    if (limit > MAX_LIMIT)
        return MAX_LIMIT;
    return limit;
}
//# sourceMappingURL=pagination.js.map