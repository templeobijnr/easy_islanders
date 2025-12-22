/**
 * Store Budget (STATE-04)
 *
 * Enforces hard caps on arrays and cached entities with deterministic eviction.
 *
 * INVARIANTS:
 * - Max items per collection enforced via FIFO eviction.
 * - Eviction logged with before/after counts.
 * - Deterministic behavior (timestamp-based).
 *
 * @see Living Document Section 18.4 for invariants.
 */

/**
 * Default limits per store key.
 */
export const DEFAULT_LIMITS: Record<string, number> = {
    messages: 500,
    listings: 200,
    conversations: 50,
    searchResults: 100,
    cache: 500,
};

/**
 * Store eviction result.
 */
export interface EvictionResult {
    storeKey: string;
    beforeCount: number;
    afterCount: number;
    evictedCount: number;
    evictedIds?: string[];
}

/**
 * Logs eviction event.
 */
function logEviction(
    result: EvictionResult,
    traceId: string
): void {
    console.log('[StoreBudget] Eviction occurred', {
        ...result,
        traceId,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Enforces budget on an array with FIFO eviction.
 *
 * @param items - Array of items.
 * @param limit - Maximum allowed items.
 * @param storeKey - Key for logging.
 * @param traceId - Trace ID.
 * @param getId - Optional function to get item ID for logging.
 * @returns Trimmed array and eviction result.
 */
export function enforceBudget<T>(
    items: T[],
    limit: number,
    storeKey: string,
    traceId: string,
    getId?: (item: T) => string
): { items: T[]; result: EvictionResult } {
    const beforeCount = items.length;

    if (beforeCount <= limit) {
        return {
            items,
            result: {
                storeKey,
                beforeCount,
                afterCount: beforeCount,
                evictedCount: 0,
            },
        };
    }

    // FIFO: keep last N items (newest)
    const evictedCount = beforeCount - limit;
    const evictedItems = items.slice(0, evictedCount);
    const keptItems = items.slice(evictedCount);

    const result: EvictionResult = {
        storeKey,
        beforeCount,
        afterCount: keptItems.length,
        evictedCount,
        evictedIds: getId ? evictedItems.map(getId) : undefined,
    };

    logEviction(result, traceId);

    return { items: keptItems, result };
}

/**
 * Enforces budget on a Map with LRU eviction.
 */
export function enforceBudgetMap<K, V>(
    map: Map<K, V & { lastAccess?: number }>,
    limit: number,
    storeKey: string,
    traceId: string
): EvictionResult {
    const beforeCount = map.size;

    if (beforeCount <= limit) {
        return {
            storeKey,
            beforeCount,
            afterCount: beforeCount,
            evictedCount: 0,
        };
    }

    // LRU: sort by lastAccess, remove oldest
    const entries = Array.from(map.entries()).sort(
        (a, b) => (a[1].lastAccess ?? 0) - (b[1].lastAccess ?? 0)
    );

    const evictCount = beforeCount - limit;
    const evictedKeys: K[] = [];

    for (let i = 0; i < evictCount; i++) {
        const [key] = entries[i];
        map.delete(key);
        evictedKeys.push(key);
    }

    const result: EvictionResult = {
        storeKey,
        beforeCount,
        afterCount: map.size,
        evictedCount: evictedKeys.length,
        evictedIds: evictedKeys.map(String),
    };

    logEviction(result, traceId);

    return result;
}

/**
 * Gets limit for a store key.
 */
export function getLimit(storeKey: string): number {
    return DEFAULT_LIMITS[storeKey] ?? DEFAULT_LIMITS.cache;
}

/**
 * Creates a budgeted store wrapper.
 */
export function createBudgetedStore<T>(
    storeKey: string,
    getId: (item: T) => string
): {
    items: T[];
    add: (item: T, traceId: string) => void;
    addMany: (newItems: T[], traceId: string) => void;
    clear: () => void;
} {
    let items: T[] = [];
    const limit = getLimit(storeKey);

    return {
        get items() {
            return items;
        },
        add(item: T, traceId: string) {
            items = [...items, item];
            const result = enforceBudget(items, limit, storeKey, traceId, getId);
            items = result.items;
        },
        addMany(newItems: T[], traceId: string) {
            items = [...items, ...newItems];
            const result = enforceBudget(items, limit, storeKey, traceId, getId);
            items = result.items;
        },
        clear() {
            items = [];
        },
    };
}
