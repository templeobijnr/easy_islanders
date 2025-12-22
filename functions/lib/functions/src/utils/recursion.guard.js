"use strict";
/**
 * Recursion Guard (RUN-03)
 *
 * Prevents infinite or runaway Firestore trigger loops by tracking execution depth.
 *
 * INVARIANTS:
 * - All Firestore triggers MUST call `recursionGuard.check()` before processing.
 * - Maximum recursion depth: 2 (initial + 1 retry/cascade allowed).
 * - Depth tracked via eventId in a short-lived in-memory cache.
 * - Exceeding depth halts execution and logs: trigger name, doc ID, depth.
 *
 * FAILURE MODE:
 * - Exceeding depth returns `{ halt: true }`.
 * - Caller MUST exit early if `halt === true`.
 * - Guard fails CLOSED: unknown state = halt.
 *
 * @see Living Document Section 17.2 for invariants.
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
exports.checkRecursion = checkRecursion;
exports.assertRecursionSafe = assertRecursionSafe;
exports.withRecursionGuard = withRecursionGuard;
exports.clearRecursionCache = clearRecursionCache;
exports.getRecursionCacheSize = getRecursionCacheSize;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Maximum allowed recursion depth for triggers.
 * Depth 1 = original event.
 * Depth 2 = one level of cascade/retry.
 * Depth 3+ = potential infinite loop, HALT.
 */
const MAX_RECURSION_DEPTH = 2;
/**
 * Cache TTL in milliseconds.
 * Events older than this are considered expired.
 * Set to 60 seconds to handle retry scenarios.
 */
const CACHE_TTL_MS = 60000;
/**
 * In-memory cache for event IDs and their depth.
 * Key: eventId, Value: { depth, timestamp }
 */
const eventCache = new Map();
/**
 * Cleans up expired entries from the cache.
 * Called periodically to prevent memory leaks.
 */
function cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    eventCache.forEach((value, key) => {
        if (now - value.timestamp > CACHE_TTL_MS) {
            expiredKeys.push(key);
        }
    });
    expiredKeys.forEach((key) => eventCache.delete(key));
}
/**
 * Checks if the current trigger execution exceeds the recursion limit.
 *
 * @param ctx - Context for the recursion check.
 * @returns RecursionCheckResult indicating whether to halt.
 */
function checkRecursion(ctx) {
    // Clean up old entries periodically
    if (Math.random() < 0.1) {
        cleanupCache();
    }
    const { eventId, triggerName, documentPath } = ctx;
    // Check if we've seen this event before
    const existing = eventCache.get(eventId);
    const now = Date.now();
    if (existing) {
        // Increment depth
        const newDepth = existing.depth + 1;
        // Update cache
        eventCache.set(eventId, { depth: newDepth, timestamp: now });
        // Check if we've exceeded the limit
        if (newDepth > MAX_RECURSION_DEPTH) {
            logger.error('RECURSION LIMIT EXCEEDED - HALTING', {
                eventId,
                triggerName,
                documentPath,
                depth: newDepth,
                maxDepth: MAX_RECURSION_DEPTH,
            });
            return {
                halt: true,
                depth: newDepth,
                reason: `Recursion depth ${newDepth} exceeds maximum ${MAX_RECURSION_DEPTH}`,
            };
        }
        // Log warning but allow execution
        logger.warn('Recursion detected', {
            eventId,
            triggerName,
            documentPath,
            depth: newDepth,
        });
        return {
            halt: false,
            depth: newDepth,
        };
    }
    // First time seeing this event
    eventCache.set(eventId, { depth: 1, timestamp: now });
    return {
        halt: false,
        depth: 1,
    };
}
/**
 * Asserts that recursion is within limits. Throws if not.
 * Use this for fail-fast behavior in triggers.
 *
 * @param ctx - Recursion context.
 * @throws Error if recursion limit exceeded.
 */
function assertRecursionSafe(ctx) {
    const result = checkRecursion(ctx);
    if (result.halt) {
        throw new Error(`Recursion guard halted execution: ${result.reason}. ` +
            `Trigger: ${ctx.triggerName}, Doc: ${ctx.documentPath}`);
    }
}
/**
 * Creates a recursion guard wrapper for Firestore triggers.
 * Automatically checks recursion and halts if limit exceeded.
 *
 * @param triggerName - Name of the trigger function.
 * @param handler - The actual trigger handler.
 * @returns Wrapped handler that checks recursion first.
 */
function withRecursionGuard(triggerName, handler) {
    return async (change, context) => {
        const result = checkRecursion({
            eventId: context.eventId,
            triggerName,
            documentPath: change.ref.path,
        });
        if (result.halt) {
            logger.error('Recursion guard halted trigger execution', {
                triggerName,
                documentPath: change.ref.path,
                depth: result.depth,
            });
            return; // Exit early, do not execute handler
        }
        return handler(change, context);
    };
}
/**
 * Clears the recursion cache (for testing only).
 */
function clearRecursionCache() {
    eventCache.clear();
}
/**
 * Gets the current cache size (for monitoring).
 */
function getRecursionCacheSize() {
    return eventCache.size;
}
//# sourceMappingURL=recursion.guard.js.map