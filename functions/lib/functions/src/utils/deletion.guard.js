"use strict";
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
exports.authorizeDeletion = authorizeDeletion;
exports.isProtectedCollection = isProtectedCollection;
exports.authorizeProtectedDeletion = authorizeProtectedDeletion;
exports.assertDeletionAuthorized = assertDeletionAuthorized;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Checks if destructive operations are allowed in the current environment.
 * FAIL CLOSED: Returns false if env var is missing or not "true".
 */
function isDestructiveOpsAllowed() {
    const envValue = process.env.ALLOW_DESTRUCTIVE_OPS;
    return envValue === 'true';
}
/**
 * Authorizes a deletion operation.
 *
 * @param ctx - Context describing the deletion operation.
 * @returns Authorization result with reason.
 */
function authorizeDeletion(ctx) {
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
function isProtectedCollection(collection) {
    return PROTECTED_COLLECTIONS.has(collection);
}
/**
 * Authorizes deletion from a protected collection.
 * Requires explicit confirmation flag in addition to standard checks.
 *
 * @param ctx - Deletion context.
 * @param confirmed - Explicit confirmation flag.
 */
function authorizeProtectedDeletion(ctx, confirmed) {
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
function assertDeletionAuthorized(ctx, confirmed = false) {
    const result = isProtectedCollection(ctx.collection)
        ? authorizeProtectedDeletion(ctx, confirmed)
        : authorizeDeletion(ctx);
    if (!result.authorized) {
        throw new Error(`Deletion denied: ${result.reason}`);
    }
}
//# sourceMappingURL=deletion.guard.js.map