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

import { db } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

/**
 * Idempotency key TTL configurations (in milliseconds).
 */
export const IDEMPOTENCY_TTL = {
    /** Webhooks from external services (Twilio, Stripe) */
    WEBHOOK: 24 * 60 * 60 * 1000, // 24 hours
    /** User-initiated API calls */
    API: 60 * 60 * 1000, // 1 hour
    /** Job state transitions */
    JOB: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Collection for storing idempotency keys.
 */
const IDEMPOTENCY_COLLECTION = 'idempotency_keys';

/**
 * Result of an idempotency check.
 */
export interface IdempotencyCheckResult {
    isDuplicate: boolean;
    cachedResult?: unknown;
    key: string;
}

/**
 * Context for an idempotency check.
 */
export interface IdempotencyContext {
    key: string;
    type: keyof typeof IDEMPOTENCY_TTL;
    traceId?: string;
}

/**
 * Checks if an operation with the given key has already been executed.
 *
 * @param ctx - Idempotency context with key and type.
 * @returns Check result indicating if this is a duplicate.
 */
export async function checkIdempotency(
    ctx: IdempotencyContext
): Promise<IdempotencyCheckResult> {
    const { key, type, traceId } = ctx;

    try {
        const docRef = db.collection(IDEMPOTENCY_COLLECTION).doc(key);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            const expiresAt = data?.expiresAt?.toMillis?.() || 0;

            // Check if key has expired
            if (Date.now() < expiresAt) {
                logger.info('Idempotency: Duplicate request detected', {
                    key,
                    type,
                    traceId,
                    originalExecutedAt: data?.executedAt,
                });

                return {
                    isDuplicate: true,
                    cachedResult: data?.result,
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
    } catch (error) {
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
export async function recordIdempotency(
    ctx: IdempotencyContext,
    result?: unknown
): Promise<void> {
    const { key, type, traceId } = ctx;
    const ttl = IDEMPOTENCY_TTL[type];

    try {
        const docRef = db.collection(IDEMPOTENCY_COLLECTION).doc(key);
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
    } catch (error) {
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
export async function withIdempotency<T>(
    ctx: IdempotencyContext,
    operation: () => Promise<T>
): Promise<{ result: T; wasCached: boolean }> {
    const check = await checkIdempotency(ctx);

    if (check.isDuplicate) {
        return {
            result: check.cachedResult as T,
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
export function generateIdempotencyKey(
    prefix: string,
    ...parts: string[]
): string {
    return `${prefix}:${parts.join(':')}`;
}
