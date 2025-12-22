/**
 * Token Refresh Manager (AUTH-03)
 *
 * Single-flight token refresh to prevent concurrent refresh stampedes.
 *
 * INVARIANTS:
 * - Only one refresh per user at a time.
 * - Concurrent calls queue behind in-flight refresh.
 * - Backoff on transient errors.
 * - Hard stop on deterministic errors.
 *
 * @see Living Document Section 18.5 for invariants.
 */

import { User } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * In-flight refresh promises keyed by uid.
 */
const inflightRefreshes = new Map<string, Promise<string>>();

/**
 * Auth error codes that require re-authentication (non-retryable).
 */
const REAUTH_REQUIRED_CODES = new Set([
    'auth/invalid-user-token',
    'auth/user-disabled',
    'auth/user-token-expired',
    'auth/invalid-credential',
]);

/**
 * Logs refresh event.
 */
function logRefresh(
    event: 'refresh_start' | 'refresh_ok' | 'refresh_fail' | 'refresh_queued',
    details: Record<string, unknown>
): void {
    console.log(`[RefreshManager] ${event}`, {
        ...details,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Hashes uid for privacy-safe logging.
 */
function hashUid(uid: string): string {
    // Simple hash for logging (not cryptographic)
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        const char = uid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `uid_${Math.abs(hash).toString(16).slice(0, 8)}`;
}

/**
 * Gets a valid ID token, refreshing if needed.
 * Uses single-flight pattern to prevent concurrent refreshes.
 *
 * @param options - Options for token retrieval.
 * @param options.forceRefresh - Force token refresh to pick up new claims.
 * @param options.traceId - Trace ID for logging.
 * @returns Valid ID token.
 * @throws Error if refresh fails.
 */
export async function getValidIdToken(options: {
    forceRefresh?: boolean;
    traceId: string;
}): Promise<string> {
    const { forceRefresh = false, traceId } = options;
    const user = auth.currentUser;

    if (!user) {
        throw new Error('AUTH_NO_USER');
    }

    const uid = user.uid;
    const uidHash = hashUid(uid);

    // If no force refresh and token is valid, return quickly
    if (!forceRefresh) {
        try {
            const token = await user.getIdToken(false);
            return token;
        } catch {
            // Fall through to force refresh
        }
    }

    // Check for in-flight refresh
    const inflight = inflightRefreshes.get(uid);
    if (inflight) {
        logRefresh('refresh_queued', {
            traceId,
            uidHash,
        });
        return inflight;
    }

    // Start new refresh
    const startTime = Date.now();

    logRefresh('refresh_start', {
        traceId,
        uidHash,
        forceRefresh,
    });

    const refreshPromise = executeRefresh(user, traceId, uidHash, startTime);

    // Store in-flight promise
    inflightRefreshes.set(uid, refreshPromise);

    try {
        const token = await refreshPromise;
        return token;
    } finally {
        // Cleanup in-flight
        inflightRefreshes.delete(uid);
    }
}

/**
 * Executes the actual refresh with retry logic.
 */
async function executeRefresh(
    user: User,
    traceId: string,
    uidHash: string,
    startTime: number
): Promise<string> {
    const maxAttempts = 3;
    const baseDelay = 500;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const token = await user.getIdToken(true);
            const durationMs = Date.now() - startTime;

            logRefresh('refresh_ok', {
                traceId,
                uidHash,
                durationMs,
                attempt: attempt + 1,
            });

            return token;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorCode = (error as { code?: string }).code;

            // Check for deterministic failures
            if (errorCode && REAUTH_REQUIRED_CODES.has(errorCode)) {
                logRefresh('refresh_fail', {
                    traceId,
                    uidHash,
                    failureCode: errorCode,
                    durationMs: Date.now() - startTime,
                    reauth_required: true,
                });

                throw new Error(`AUTH_REAUTH_REQUIRED:${errorCode}`);
            }

            // Transient error - retry with backoff
            if (attempt < maxAttempts - 1) {
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    logRefresh('refresh_fail', {
        traceId,
        uidHash,
        failureCode: lastError?.message,
        durationMs: Date.now() - startTime,
        attempts: maxAttempts,
    });

    throw lastError || new Error('AUTH_REFRESH_FAILED');
}

/**
 * Checks if user is currently refreshing.
 */
export function isRefreshing(uid: string): boolean {
    return inflightRefreshes.has(uid);
}

/**
 * Gets count of in-flight refreshes (for monitoring).
 */
export function getInflightCount(): number {
    return inflightRefreshes.size;
}
