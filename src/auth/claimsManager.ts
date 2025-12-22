/**
 * Claims Manager (AUTH-01)
 *
 * Handles custom claim propagation with explicit refresh and timeout.
 *
 * INVARIANTS:
 * - Claims fetched with forced token refresh.
 * - Timeout if claims don't appear after refresh.
 * - UI hook for claim gating.
 *
 * @see Living Document Section 18.5 for invariants.
 */

import { useState, useEffect, useCallback } from 'react';
import { auth } from '../config/firebase';
import { getValidIdToken } from './refreshManager';

/**
 * Claim types.
 */
export type ClaimType = 'admin' | 'merchant' | 'businessId';

/**
 * Claims result.
 */
export interface ClaimsResult {
    claims: Record<string, unknown>;
    ready: boolean;
    missingClaims: ClaimType[];
    error?: string;
    claimsCheckedAt: Date;
}

/**
 * Logs claims event.
 */
function logClaims(
    event: 'check_start' | 'check_ok' | 'check_timeout' | 'check_missing',
    details: Record<string, unknown>
): void {
    console.log(`[ClaimsManager] ${event}`, {
        ...details,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Awaits required claims with forced refresh.
 *
 * @param options - Options.
 * @param options.required - Required claims.
 * @param options.timeoutMs - Timeout in milliseconds.
 * @param options.traceId - Trace ID.
 * @returns Claims result.
 */
export async function awaitClaims(options: {
    required: ClaimType[];
    timeoutMs?: number;
    traceId: string;
}): Promise<ClaimsResult> {
    const { required, timeoutMs = 5000, traceId } = options;
    const startTime = Date.now();

    logClaims('check_start', {
        traceId,
        requiredClaims: required,
        timeoutMs,
    });

    const user = auth.currentUser;
    if (!user) {
        return {
            claims: {},
            ready: false,
            missingClaims: required,
            error: 'AUTH_NO_USER',
            claimsCheckedAt: new Date(),
        };
    }

    // Force refresh to get latest claims
    try {
        await getValidIdToken({ forceRefresh: true, traceId });
    } catch (error) {
        return {
            claims: {},
            ready: false,
            missingClaims: required,
            error: String(error),
            claimsCheckedAt: new Date(),
        };
    }

    // Get token result with claims
    const tokenResult = await user.getIdTokenResult();
    const claims = tokenResult.claims;

    // Check required claims
    const missing = required.filter((claim) => !claims[claim]);

    if (missing.length === 0) {
        logClaims('check_ok', {
            traceId,
            requiredClaims: required,
            durationMs: Date.now() - startTime,
        });

        return {
            claims,
            ready: true,
            missingClaims: [],
            claimsCheckedAt: new Date(),
        };
    }

    // Claims still missing after refresh
    const elapsed = Date.now() - startTime;

    if (elapsed >= timeoutMs) {
        logClaims('check_timeout', {
            traceId,
            requiredClaims: required,
            missingClaims: missing,
            durationMs: elapsed,
        });

        return {
            claims,
            ready: false,
            missingClaims: missing,
            error: 'AUTH_CLAIMS_TIMEOUT',
            claimsCheckedAt: new Date(),
        };
    }

    logClaims('check_missing', {
        traceId,
        requiredClaims: required,
        missingClaims: missing,
        durationMs: elapsed,
    });

    return {
        claims,
        ready: false,
        missingClaims: missing,
        claimsCheckedAt: new Date(),
    };
}

/**
 * Hook for claim-gated UI.
 *
 * @param requiredClaims - Claims required for access.
 * @param traceId - Trace ID.
 * @returns Claim gate state.
 */
export function useClaimsGate(
    requiredClaims: ClaimType[],
    traceId: string
): {
    ready: boolean;
    loading: boolean;
    missingClaims: ClaimType[];
    error?: string;
    retry: () => void;
} {
    const [state, setState] = useState<{
        ready: boolean;
        loading: boolean;
        missingClaims: ClaimType[];
        error?: string;
    }>({
        ready: false,
        loading: true,
        missingClaims: [],
    });

    const checkClaims = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: undefined }));

        const result = await awaitClaims({
            required: requiredClaims,
            traceId,
        });

        setState({
            ready: result.ready,
            loading: false,
            missingClaims: result.missingClaims,
            error: result.error,
        });
    }, [requiredClaims, traceId]);

    useEffect(() => {
        checkClaims();
    }, [checkClaims]);

    return {
        ...state,
        retry: checkClaims,
    };
}
