/**
 * Provider Linking (AUTH-05)
 *
 * Handles auth provider mismatch and account linking flows.
 *
 * INVARIANTS:
 * - account-exists-with-different-credential handled gracefully.
 * - Clear UI for linking flows.
 * - Stable error codes.
 *
 * @see Living Document Section 18.5 for invariants.
 */

import {
    fetchSignInMethodsForEmail,
    linkWithCredential,
    AuthCredential,
    User,
    AuthError,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Auth error codes.
 */
export const AUTH_ERROR_CODES = {
    PROVIDER_MISMATCH: 'AUTH_PROVIDER_MISMATCH',
    LINK_REQUIRED: 'AUTH_LINK_REQUIRED',
    LINK_FAILED: 'AUTH_LINK_FAILED',
    LINK_SUCCESS: 'AUTH_LINK_SUCCESS',
    NO_USER: 'AUTH_NO_USER',
} as const;

/**
 * Provider mismatch result.
 */
export interface ProviderMismatchResult {
    status: 'link_required' | 'linked' | 'failed';
    email: string;
    existingProviders: string[];
    attemptedProvider?: string;
    error?: string;
}

/**
 * Logs linking event.
 */
function logLinking(
    event: 'mismatch_detected' | 'link_start' | 'link_success' | 'link_failed',
    details: Record<string, unknown>
): void {
    console.log(`[ProviderLinking] ${event}`, {
        ...details,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Hashes email for privacy-safe logging.
 */
function hashEmail(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        const char = email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `email_${Math.abs(hash).toString(16).slice(0, 8)}`;
}

/**
 * Detects provider mismatch from auth error.
 */
export function isProviderMismatchError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const authError = error as AuthError;
    return authError.code === 'auth/account-exists-with-different-credential';
}

/**
 * Gets existing providers for an email.
 *
 * @param email - Email address.
 * @param traceId - Trace ID.
 * @returns List of provider IDs.
 */
export async function getExistingProviders(
    email: string,
    traceId: string
): Promise<string[]> {
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        return methods;
    } catch (error) {
        logLinking('mismatch_detected', {
            traceId,
            emailHash: hashEmail(email),
            error: String(error),
        });
        return [];
    }
}

/**
 * Handles provider mismatch by detecting existing providers.
 *
 * @param error - The auth error.
 * @param attemptedProvider - Provider that was attempted.
 * @param traceId - Trace ID.
 * @returns Mismatch result.
 */
export async function handleProviderMismatch(
    error: AuthError,
    attemptedProvider: string,
    traceId: string
): Promise<ProviderMismatchResult> {
    // Extract email from error
    const email = error.customData?.email as string | undefined;

    if (!email) {
        return {
            status: 'failed',
            email: '',
            existingProviders: [],
            attemptedProvider,
            error: 'No email in error',
        };
    }

    const existingProviders = await getExistingProviders(email, traceId);

    logLinking('mismatch_detected', {
        traceId,
        emailHash: hashEmail(email),
        existingProviders,
        attemptedProvider,
    });

    return {
        status: 'link_required',
        email,
        existingProviders,
        attemptedProvider,
    };
}

/**
 * Links a credential to the current user.
 *
 * @param credential - Credential to link.
 * @param traceId - Trace ID.
 * @returns Success or failure.
 */
export async function linkCredential(
    credential: AuthCredential,
    traceId: string
): Promise<{ success: boolean; error?: string }> {
    const user = auth.currentUser;

    if (!user) {
        return { success: false, error: AUTH_ERROR_CODES.NO_USER };
    }

    logLinking('link_start', {
        traceId,
        providerId: credential.providerId,
    });

    try {
        await linkWithCredential(user, credential);

        logLinking('link_success', {
            traceId,
            providerId: credential.providerId,
        });

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logLinking('link_failed', {
            traceId,
            providerId: credential.providerId,
            error: errorMessage,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Gets user-friendly provider name.
 */
export function getProviderDisplayName(providerId: string): string {
    const names: Record<string, string> = {
        'google.com': 'Google',
        'password': 'Email/Password',
        'facebook.com': 'Facebook',
        'twitter.com': 'Twitter',
        'apple.com': 'Apple',
        'phone': 'Phone',
    };
    return names[providerId] || providerId;
}

/**
 * Generates linking instructions for user.
 */
export function getLinkingInstructions(
    existingProviders: string[],
    attemptedProvider: string
): string {
    const existing = existingProviders.map(getProviderDisplayName).join(' or ');
    const attempted = getProviderDisplayName(attemptedProvider);

    return `This email is already registered with ${existing}. Sign in with ${existing} first, then link your ${attempted} account.`;
}
