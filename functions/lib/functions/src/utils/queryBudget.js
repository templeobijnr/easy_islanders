"use strict";
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
exports.DEFAULT_BUDGETS = exports.QueryBudgetExceededError = void 0;
exports.createBudgetTracker = createBudgetTracker;
exports.recordReads = recordReads;
exports.recordBytes = recordBytes;
exports.updateLatency = updateLatency;
exports.assertQueryBudget = assertQueryBudget;
exports.getBudget = getBudget;
exports.withQueryBudget = withQueryBudget;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Budget exceeded error.
 */
class QueryBudgetExceededError extends Error {
    constructor(resource, limit, used, traceId) {
        super(`Query budget exceeded: ${resource} (${used}/${limit})`);
        this.resource = resource;
        this.limit = limit;
        this.used = used;
        this.traceId = traceId;
        this.code = 'QUERY_BUDGET_EXCEEDED';
        this.httpStatus = 429;
        this.retryable = true;
        this.name = 'QueryBudgetExceededError';
    }
}
exports.QueryBudgetExceededError = QueryBudgetExceededError;
/**
 * Default budgets by query type.
 */
exports.DEFAULT_BUDGETS = {
    discovery: { maxReads: 100, maxMs: 3000, maxBytes: 500000 },
    search: { maxReads: 50, maxMs: 2000, maxBytes: 200000 },
    detail: { maxReads: 10, maxMs: 1000, maxBytes: 50000 },
    list: { maxReads: 50, maxMs: 2000, maxBytes: 200000 },
    default: { maxReads: 25, maxMs: 1500, maxBytes: 100000 },
};
/**
 * Creates a new budget tracker.
 */
function createBudgetTracker() {
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
function recordReads(tracker, count) {
    tracker.readsUsed += count;
}
/**
 * Records bytes used.
 */
function recordBytes(tracker, bytes) {
    tracker.bytesUsed += bytes;
}
/**
 * Updates latency from start time.
 */
function updateLatency(tracker) {
    tracker.msUsed = Date.now() - tracker.startTime;
}
/**
 * Asserts budget is not exceeded.
 * Throws QueryBudgetExceededError if exceeded.
 *
 * @param options - Budget check options.
 * @param tracker - Current budget usage.
 */
function assertQueryBudget(options, tracker) {
    const { budget, traceId, collection, queryName, isCritical = true } = options;
    updateLatency(tracker);
    const exceeded = [];
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
function getBudget(queryType) {
    return exports.DEFAULT_BUDGETS[queryType] || exports.DEFAULT_BUDGETS.default;
}
/**
 * Wraps a query function with budget enforcement.
 */
async function withQueryBudget(options, fn) {
    const tracker = createBudgetTracker();
    try {
        const result = await fn(tracker);
        assertQueryBudget(options, tracker);
        return result;
    }
    catch (error) {
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
//# sourceMappingURL=queryBudget.js.map