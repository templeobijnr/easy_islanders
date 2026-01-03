"use strict";
/**
 * Merchant Token & Session Schemas
 *
 * Defines the data model for the "Magic Link" system.
 * - MerchantToken: Stored in Firestore (hashed)
 * - MerchantSession: JWT payload for authenticated merchant sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeTokenResponseSchema = exports.ExchangeTokenRequestSchema = exports.CreateMerchantTokenResponseSchema = exports.CreateMerchantTokenRequestSchema = exports.MerchantSessionSchema = exports.MerchantTokenSchema = exports.MerchantTokenScopeSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// PERSISTENT TOKEN (Firestore)
// =============================================================================
/**
 * Scopes define what a merchant token can do.
 * - `confirm_job`: Can only confirm/decline a specific job
 * - `manage_listing`: Can manage the entire listing (future/dashboard)
 */
exports.MerchantTokenScopeSchema = zod_1.z.enum([
    'confirm_job',
    'manage_listing'
]);
/**
 * Schema for the stored token document in Firestore.
 * COLLECTION: `merchantTokens`
 *
 * SECURITY: We only store the HASH of the token, never the raw token.
 */
exports.MerchantTokenSchema = zod_1.z.object({
    /** Firestore ID */
    id: zod_1.z.string(),
    /** SHA-256 hash of the raw token string */
    tokenHash: zod_1.z.string(),
    /** Listing ID this token grants access to */
    listingId: zod_1.z.string(),
    /** What this token is allowed to do */
    scopes: zod_1.z.array(exports.MerchantTokenScopeSchema),
    /** If scoped to a specific job (for one-time action links) */
    jobId: zod_1.z.string().optional(),
    /** When the token was created */
    createdAt: zod_1.z.string(), // ISO 8601
    /** When the token expires */
    expiresAt: zod_1.z.string(), // ISO 8601
    /** Whether the token is currently valid */
    active: zod_1.z.boolean().default(true),
    /** Metadata about who created it (e.g., 'admin', 'system') */
    createdBy: zod_1.z.string(),
});
// =============================================================================
// SESSION (JWT)
// =============================================================================
/**
 * Schema for the JWT payload returned after verifying a magic link.
 */
exports.MerchantSessionSchema = zod_1.z.object({
    /** Listing ID */
    listingId: zod_1.z.string(),
    /** Scopes granted by the token */
    scopes: zod_1.z.array(exports.MerchantTokenScopeSchema),
    /** Session ID (could match token ID or be new) */
    sid: zod_1.z.string(),
    /** If scoped to a job */
    jobId: zod_1.z.string().optional(),
});
// =============================================================================
// API DTOs
// =============================================================================
/**
 * Request to create a token (Admin Only)
 */
exports.CreateMerchantTokenRequestSchema = zod_1.z.object({
    listingId: zod_1.z.string().min(1),
    scopes: zod_1.z.array(exports.MerchantTokenScopeSchema).min(1),
    jobId: zod_1.z.string().optional(), // Optional constraint
    expiresInDays: zod_1.z.number().int().positive().default(30),
});
/**
 * Response from create token (contains RAW token - shown only ONCE)
 */
exports.CreateMerchantTokenResponseSchema = zod_1.z.object({
    rawToken: zod_1.z.string(),
    expiresAt: zod_1.z.string(),
    magicLinkUrl: zod_1.z.string().optional(), // Helper for frontend display
});
/**
 * Request to exchange token for session
 */
exports.ExchangeTokenRequestSchema = zod_1.z.object({
    rawToken: zod_1.z.string().min(1),
});
/**
 * Response from exchange (session JWT)
 */
exports.ExchangeTokenResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(), // The JWT
    listingId: zod_1.z.string(),
    scopes: zod_1.z.array(exports.MerchantTokenScopeSchema),
});
//# sourceMappingURL=merchant-token.schema.js.map