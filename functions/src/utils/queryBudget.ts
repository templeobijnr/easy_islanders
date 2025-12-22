/**
 * Query Budget Enforcement (ARCH-04)
 *
 * Enforces read/latency/size budgets at the API boundary.
 *
 * INVARIANTS:
 * - Budgets enforced before query execution.
 * - Exceeded = 429 QUERY_BUDGET_EXCEEDED (fail closed).
 * - All budget checks logged with traceId + actuals.
 * - Non-critical paths can degrade instead of fail.
 *
 * @see Living Document Section 18.3 for invariants.
 */

import * as logger from 'firebase-functions/logger';

/**
 * Query budget configuration.
 */
export interface QueryBudget {
    maxReads: number;
    maxMs: number;
    maxBytes: number;
}

/**
 * Budget check options.
 */
export interface BudgetCheckOptions {
    budget: QueryBudget;
    traceId: string;
    collection: string;
    queryName: string;
    isCritical?: boolean;
}

/**
 * Budget tracking for a request.
 */
export interface BudgetTracker {
    readsUsed: number;
    msUsed: number;
    bytesUsed: number;
    startTime: number;
}

/**
 * Budget exceeded error.
 */
export class QueryBudgetExceededError extends Error {
    public readonly code = 'QUERY_BUDGET_EXCEEDED';
    public readonly httpStatus = 429;
    public readonly retryable = true;

    constructor(
        public readonly resource: 'reads' | 'latency' | 'bytes',
        public readonly limit: number,
        public readonly used: number,
        public readonly traceId: string
    ) {
        super(`Query budget exceeded: ${resource} (${used}/${limit})`);
        this.name = 'QueryBudgetExceededError';
    }
}

/**
 * Default budgets by query type.
 */
export const DEFAULT_BUDGETS: Record<string, QueryBudget> = {
    discovery: { maxReads: 100, maxMs: 3000, maxBytes: 500_000 },
    search: { maxReads: 50, maxMs: 2000, maxBytes: 200_000 },
    detail: { maxReads: 10, maxMs: 1000, maxBytes: 50_000 },
    list: { maxReads: 50, maxMs: 2000, maxBytes: 200_000 },
    default: { maxReads: 25, maxMs: 1500, maxBytes: 100_000 },
};

/**
 * Creates a new budget tracker.
 */
export function createBudgetTracker(): BudgetTracker {
    return {
        readsUsed: 0,
        msUsed: 0,
        bytesUsed: 0,
        startTime: Date.now(),
    };
}

/**
 * Records reads used.
 */
export function recordReads(tracker: BudgetTracker, count: number): void {
    tracker.readsUsed += count;
}

/**
 * Records bytes used.
 */
export function recordBytes(tracker: BudgetTracker, bytes: number): void {
    tracker.bytesUsed += bytes;
}

/**
 * Updates latency from start time.
 */
export function updateLatency(tracker: BudgetTracker): void {
    tracker.msUsed = Date.now() - tracker.startTime;
}

/**
 * Asserts budget is not exceeded.
 * Throws QueryBudgetExceededError if exceeded.
 *
 * @param options - Budget check options.
 * @param tracker - Current budget usage.
 */
export function assertQueryBudget(
    options: BudgetCheckOptions,
    tracker: BudgetTracker
): void {
    const { budget, traceId, collection, queryName, isCritical = true } = options;

    updateLatency(tracker);

    const exceeded: Array<{ resource: 'reads' | 'latency' | 'bytes'; limit: number; used: number }> = [];

    if (tracker.readsUsed > budget.maxReads) {
        exceeded.push({ resource: 'reads', limit: budget.maxReads, used: tracker.readsUsed });
    }

    if (tracker.msUsed > budget.maxMs) {
        exceeded.push({ resource: 'latency', limit: budget.maxMs, used: tracker.msUsed });
    }

    if (tracker.bytesUsed > budget.maxBytes) {
        exceeded.push({ resource: 'bytes', limit: budget.maxBytes, used: tracker.bytesUsed });
    }

    if (exceeded.length === 0) {
        logger.info('QueryBudget: Within limits', {
            component: 'queryBudget',
            event: 'budget_ok',
            traceId,
            collection,
            queryName,
            budget,
            actuals: {
                reads: tracker.readsUsed,
                ms: tracker.msUsed,
                bytes: tracker.bytesUsed,
            },
        });
        return;
    }

    logger.warn('QueryBudget: Budget exceeded', {
        component: 'queryBudget',
        event: 'budget_exceeded',
        traceId,
        collection,
        queryName,
        budget,
        actuals: {
            reads: tracker.readsUsed,
            ms: tracker.msUsed,
            bytes: tracker.bytesUsed,
        },
        exceeded,
        isCritical,
    });

    if (isCritical) {
        const first = exceeded[0];
        throw new QueryBudgetExceededError(first.resource, first.limit, first.used, traceId);
    }
}

/**
 * Gets budget for a query type.
 */
export function getBudget(queryType: string): QueryBudget {
    return DEFAULT_BUDGETS[queryType] || DEFAULT_BUDGETS.default;
}

/**
 * Wraps a query function with budget enforcement.
 */
export async function withQueryBudget<T>(
    options: BudgetCheckOptions,
    fn: (tracker: BudgetTracker) => Promise<T>
): Promise<T> {
    const tracker = createBudgetTracker();

    try {
        const result = await fn(tracker);
        assertQueryBudget(options, tracker);
        return result;
    } catch (error) {
        if (error instanceof QueryBudgetExceededError) {
            throw error;
        }

        // Log and rethrow other errors
        logger.error('QueryBudget: Query failed', {
            component: 'queryBudget',
            event: 'query_failed',
            traceId: options.traceId,
            queryName: options.queryName,
            error: String(error),
        });

        throw error;
    }
}
