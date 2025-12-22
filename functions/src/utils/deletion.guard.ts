/**
 * Deletion Guard (HUM-01)
 *
 * Prevents catastrophic collection-level deletions without explicit authorization.
 *
 * INVARIANTS:
 * - All bulk/collection deletes MUST use this guard.
 * - Deletion requires: ALLOW_DESTRUCTIVE_OPS=true env var.
 * - Every deletion attempt is logged with collection, document, and caller.
 * - Direct deletes bypassing this guard are FORBIDDEN.
 *
 * FAILURE MODE:
 * - Unauthorized deletion attempts are BLOCKED and logged.
 * - Guard fails CLOSED: if env var is missing, deletion is denied.
 *
 * @see Living Document Section 17.2 for invariants.
 */

import * as logger from 'firebase-functions/logger';

/**
 * Result of a deletion authorization check.
 */
export interface DeletionAuthResult {
    authorized: boolean;
    reason: string;
}

/**
 * Context for a deletion operation.
 */
export interface DeletionContext {
    collection: string;
    documentId?: string;
    caller: string;
    reason: string;
}

/**
 * Checks if destructive operations are allowed in the current environment.
 * FAIL CLOSED: Returns false if env var is missing or not "true".
 */
function isDestructiveOpsAllowed(): boolean {
    const envValue = process.env.ALLOW_DESTRUCTIVE_OPS;
    return envValue === 'true';
}

/**
 * Authorizes a deletion operation.
 *
 * @param ctx - Context describing the deletion operation.
 * @returns Authorization result with reason.
 */
export function authorizeDeletion(ctx: DeletionContext): DeletionAuthResult {
    // Log every attempt, regardless of outcome
    logger.info('Deletion authorization requested', {
        collection: ctx.collection,
        documentId: ctx.documentId || '*',
        caller: ctx.caller,
        reason: ctx.reason,
    });

    // Check environment guard
    if (!isDestructiveOpsAllowed()) {
        logger.warn('Deletion BLOCKED: ALLOW_DESTRUCTIVE_OPS not set', {
            collection: ctx.collection,
            documentId: ctx.documentId || '*',
            caller: ctx.caller,
        });

        return {
            authorized: false,
            reason: 'ALLOW_DESTRUCTIVE_OPS environment variable is not set to "true".',
        };
    }

    // Check caller is provided
    if (!ctx.caller || ctx.caller.trim() === '') {
        logger.warn('Deletion BLOCKED: No caller identified', {
            collection: ctx.collection,
            documentId: ctx.documentId || '*',
        });

        return {
            authorized: false,
            reason: 'Caller must be identified for deletion operations.',
        };
    }

    // Check reason is provided
    if (!ctx.reason || ctx.reason.trim() === '') {
        logger.warn('Deletion BLOCKED: No reason provided', {
            collection: ctx.collection,
            documentId: ctx.documentId || '*',
            caller: ctx.caller,
        });

        return {
            authorized: false,
            reason: 'A reason must be provided for deletion operations.',
        };
    }

    // Authorization granted
    logger.info('Deletion AUTHORIZED', {
        collection: ctx.collection,
        documentId: ctx.documentId || '*',
        caller: ctx.caller,
        reason: ctx.reason,
    });

    return {
        authorized: true,
        reason: 'Deletion authorized.',
    };
}

/**
 * Protected list of collections that require additional confirmation.
 * Deleting from these collections requires explicit acknowledgment.
 */
const PROTECTED_COLLECTIONS = new Set([
    'users',
    'jobs',
    'listings',
    'businesses',
    'orders',
    'payments',
]);

/**
 * Checks if a collection is protected (requires extra confirmation).
 */
export function isProtectedCollection(collection: string): boolean {
    return PROTECTED_COLLECTIONS.has(collection);
}

/**
 * Authorizes deletion from a protected collection.
 * Requires explicit confirmation flag in addition to standard checks.
 *
 * @param ctx - Deletion context.
 * @param confirmed - Explicit confirmation flag.
 */
export function authorizeProtectedDeletion(
    ctx: DeletionContext,
    confirmed: boolean
): DeletionAuthResult {
    // Standard authorization first
    const baseAuth = authorizeDeletion(ctx);
    if (!baseAuth.authorized) {
        return baseAuth;
    }

    // Check if collection is protected
    if (isProtectedCollection(ctx.collection)) {
        if (!confirmed) {
            logger.warn('Protected deletion BLOCKED: Not confirmed', {
                collection: ctx.collection,
                documentId: ctx.documentId || '*',
                caller: ctx.caller,
            });

            return {
                authorized: false,
                reason: `Collection "${ctx.collection}" is protected. Explicit confirmation required.`,
            };
        }

        logger.info('Protected deletion AUTHORIZED with confirmation', {
            collection: ctx.collection,
            documentId: ctx.documentId || '*',
            caller: ctx.caller,
            reason: ctx.reason,
        });
    }

    return {
        authorized: true,
        reason: 'Deletion authorized.',
    };
}

/**
 * Asserts that deletion is authorized. Throws if not.
 * Use this in scripts and admin tools to fail-fast.
 *
 * @param ctx - Deletion context.
 * @param confirmed - Explicit confirmation for protected collections.
 * @throws Error if deletion is not authorized.
 */
export function assertDeletionAuthorized(
    ctx: DeletionContext,
    confirmed: boolean = false
): void {
    const result = isProtectedCollection(ctx.collection)
        ? authorizeProtectedDeletion(ctx, confirmed)
        : authorizeDeletion(ctx);

    if (!result.authorized) {
        throw new Error(`Deletion denied: ${result.reason}`);
    }
}
