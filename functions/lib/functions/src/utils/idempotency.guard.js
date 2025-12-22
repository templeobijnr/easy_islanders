"use strict";
/**
 * Idempotency Guard (NET-02)
 *
 * Prevents duplicate execution of critical operations.
 * Ensures safe retries for webhooks and API calls.
 *
 * INVARIANTS:
 * - All critical writes MUST check idempotency before execution.
 * - Duplicate requests return cached result, do NOT re-execute.
 * - Keys are stored with configurable TTL.
 *
 * FAILURE MODE:
 * - If cache check fails, operation proceeds (fail open for availability).
 * - But logs a warning for monitoring.
 *
 * @see Living Document Section 17.2.1 for invariants.
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
exports.IDEMPOTENCY_TTL = void 0;
exports.checkIdempotency = checkIdempotency;
exports.recordIdempotency = recordIdempotency;
exports.withIdempotency = withIdempotency;
exports.generateIdempotencyKey = generateIdempotencyKey;
const firebase_1 = require("../config/firebase");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Idempotency key TTL configurations (in milliseconds).
 */
exports.IDEMPOTENCY_TTL = {
    /** Webhooks from external services (Twilio, Stripe) */
    WEBHOOK: 24 * 60 * 60 * 1000, // 24 hours
    /** User-initiated API calls */
    API: 60 * 60 * 1000, // 1 hour
    /** Job state transitions */
    JOB: 60 * 60 * 1000, // 1 hour
};
/**
 * Collection for storing idempotency keys.
 */
const IDEMPOTENCY_COLLECTION = 'idempotency_keys';
/**
 * Checks if an operation with the given key has already been executed.
 *
 * @param ctx - Idempotency context with key and type.
 * @returns Check result indicating if this is a duplicate.
 */
async function checkIdempotency(ctx) {
    var _a, _b;
    const { key, type, traceId } = ctx;
    try {
        const docRef = firebase_1.db.collection(IDEMPOTENCY_COLLECTION).doc(key);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            const expiresAt = ((_b = (_a = data === null || data === void 0 ? void 0 : data.expiresAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) || 0;
            // Check if key has expired
            if (Date.now() < expiresAt) {
                logger.info('Idempotency: Duplicate request detected', {
                    key,
                    type,
                    traceId,
                    originalExecutedAt: data === null || data === void 0 ? void 0 : data.executedAt,
                });
                return {
                    isDuplicate: true,
                    cachedResult: data === null || data === void 0 ? void 0 : data.result,
                    key,
                };
            }
            // Key expired, allow re-execution
            logger.info('Idempotency: Expired key, allowing re-execution', {
                key,
                type,
                traceId,
            });
        }
        return {
            isDuplicate: false,
            key,
        };
    }
    catch (error) {
        // FAIL OPEN: If we can't check, allow the operation but warn
        logger.warn('Idempotency: Check failed, failing open', {
            key,
            type,
            traceId,
            error: String(error),
        });
        return {
            isDuplicate: false,
            key,
        };
    }
}
/**
 * Records that an operation has been executed.
 * Call this AFTER successful execution.
 *
 * @param ctx - Idempotency context.
 * @param result - The result to cache for duplicate requests.
 */
async function recordIdempotency(ctx, result) {
    const { key, type, traceId } = ctx;
    const ttl = exports.IDEMPOTENCY_TTL[type];
    try {
        const docRef = firebase_1.db.collection(IDEMPOTENCY_COLLECTION).doc(key);
        await docRef.set({
            key,
            type,
            traceId,
            executedAt: new Date(),
            expiresAt: new Date(Date.now() + ttl),
            result: result !== undefined ? result : null,
        });
        logger.info('Idempotency: Recorded execution', {
            key,
            type,
            traceId,
            ttlMs: ttl,
        });
    }
    catch (error) {
        // Log but don't fail the operation
        logger.error('Idempotency: Failed to record execution', {
            key,
            type,
            traceId,
            error: String(error),
        });
    }
}
/**
 * Wrapper that ensures idempotent execution of an operation.
 *
 * @param ctx - Idempotency context.
 * @param operation - The operation to execute if not duplicate.
 * @returns The result (cached or fresh).
 */
async function withIdempotency(ctx, operation) {
    const check = await checkIdempotency(ctx);
    if (check.isDuplicate) {
        return {
            result: check.cachedResult,
            wasCached: true,
        };
    }
    const result = await operation();
    await recordIdempotency(ctx, result);
    return {
        result,
        wasCached: false,
    };
}
/**
 * Generates an idempotency key from components.
 * Use this for consistent key generation.
 *
 * @param prefix - Service/operation prefix (e.g., 'twilio', 'job')
 * @param ...parts - Key components to join
 */
function generateIdempotencyKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
}
//# sourceMappingURL=idempotency.guard.js.map