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

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Maximum items per page.
 */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * Cursor structure (encoded as base64 JSON).
 */
interface CursorData {
    values: unknown[];
    docId: string;
    version: number;
}

/**
 * Pagination options.
 */
export interface PaginationOptions {
    collection: string;
    orderBy: Array<{ field: string; direction: 'asc' | 'desc' }>;
    limit?: number;
    cursor?: string;
    filters?: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }>;
    queryName: string;
    traceId: string;
}

/**
 * Pagination result.
 */
export interface PaginationResult<T> {
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
    resultCount: number;
}

/**
 * Encodes cursor data to opaque string.
 */
function encodeCursor(data: CursorData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decodes cursor string to data.
 * Validates shape and returns null if invalid.
 */
function decodeCursor(cursor: string): CursorData | null {
    try {
        // Validate size (prevent large cursors)
        if (cursor.length > 2000) {
            return null;
        }

        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const data = JSON.parse(decoded);

        // Validate shape
        if (
            typeof data !== 'object' ||
            !Array.isArray(data.values) ||
            typeof data.docId !== 'string' ||
            typeof data.version !== 'number'
        ) {
            return null;
        }

        // Validate version
        if (data.version !== 1) {
            return null;
        }

        return data as CursorData;
    } catch {
        return null;
    }
}

/**
 * Executes a paginated query.
 *
 * @param options - Pagination options.
 * @returns Pagination result with items and cursor.
 */
export async function paginateQuery<T>(
    options: PaginationOptions
): Promise<PaginationResult<T>> {
    const {
        collection,
        orderBy,
        limit = DEFAULT_LIMIT,
        cursor,
        filters = [],
        queryName,
        traceId,
    } = options;

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
    let query: FirebaseFirestore.Query = db.collection(collection);

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
        } else {
            // Use startAfter with document reference for stability
            const docRef = db.collection(collection).doc(cursorData.docId);
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
    const items = docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);

    // Build next cursor
    let nextCursor: string | undefined;
    if (hasMore && docs.length > 0) {
        const lastDoc = docs[docs.length - 1];
        const cursorValues = orderByWithTieBreaker.map((o) =>
            o.field === '__name__' ? lastDoc.id : lastDoc.data()[o.field]
        );

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
function ensureDeterministicOrder(
    orderBy: Array<{ field: string; direction: 'asc' | 'desc' }>
): Array<{ field: string; direction: 'asc' | 'desc' }> {
    // Check if __name__ is already in ordering
    const hasNameOrder = orderBy.some((o) => o.field === '__name__');

    if (hasNameOrder) {
        return orderBy;
    }

    // Add __name__ as tie-breaker
    const lastDirection = orderBy[orderBy.length - 1]?.direction ?? 'asc';
    return [...orderBy, { field: '__name__', direction: lastDirection }];
}

/**
 * Validates pagination limit.
 */
export function validateLimit(limit: number | undefined): number {
    if (limit === undefined) return DEFAULT_LIMIT;
    if (limit < 1) return DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) return MAX_LIMIT;
    return limit;
}
