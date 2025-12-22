/**
 * Merchant Token & Session Schemas
 * 
 * Defines the data model for the "Magic Link" system.
 * - MerchantToken: Stored in Firestore (hashed)
 * - MerchantSession: JWT payload for authenticated merchant sessions
 */

import { z } from 'zod';

// =============================================================================
// PERSISTENT TOKEN (Firestore)
// =============================================================================

/**
 * Scopes define what a merchant token can do.
 * - `confirm_job`: Can only confirm/decline a specific job
 * - `manage_listing`: Can manage the entire listing (future/dashboard)
 */
export const MerchantTokenScopeSchema = z.enum([
    'confirm_job',
    'manage_listing'
]);

export type MerchantTokenScope = z.infer<typeof MerchantTokenScopeSchema>;

/**
 * Schema for the stored token document in Firestore.
 * COLLECTION: `merchantTokens`
 * 
 * SECURITY: We only store the HASH of the token, never the raw token.
 */
export const MerchantTokenSchema = z.object({
    /** Firestore ID */
    id: z.string(),

    /** SHA-256 hash of the raw token string */
    tokenHash: z.string(),

    /** Listing ID this token grants access to */
    listingId: z.string(),

    /** What this token is allowed to do */
    scopes: z.array(MerchantTokenScopeSchema),

    /** If scoped to a specific job (for one-time action links) */
    jobId: z.string().optional(),

    /** When the token was created */
    createdAt: z.string(), // ISO 8601

    /** When the token expires */
    expiresAt: z.string(), // ISO 8601

    /** Whether the token is currently valid */
    active: z.boolean().default(true),

    /** Metadata about who created it (e.g., 'admin', 'system') */
    createdBy: z.string(),
});

export type MerchantToken = z.infer<typeof MerchantTokenSchema>;

// =============================================================================
// SESSION (JWT)
// =============================================================================

/**
 * Schema for the JWT payload returned after verifying a magic link.
 */
export const MerchantSessionSchema = z.object({
    /** Listing ID */
    listingId: z.string(),

    /** Scopes granted by the token */
    scopes: z.array(MerchantTokenScopeSchema),

    /** Session ID (could match token ID or be new) */
    sid: z.string(),

    /** If scoped to a job */
    jobId: z.string().optional(),
});

export type MerchantSession = z.infer<typeof MerchantSessionSchema>;

// =============================================================================
// API DTOs
// =============================================================================

/**
 * Request to create a token (Admin Only)
 */
export const CreateMerchantTokenRequestSchema = z.object({
    listingId: z.string().min(1),
    scopes: z.array(MerchantTokenScopeSchema).min(1),
    jobId: z.string().optional(), // Optional constraint
    expiresInDays: z.number().int().positive().default(30),
});

export type CreateMerchantTokenRequest = z.infer<typeof CreateMerchantTokenRequestSchema>;

/**
 * Response from create token (contains RAW token - shown only ONCE)
 */
export const CreateMerchantTokenResponseSchema = z.object({
    rawToken: z.string(),
    expiresAt: z.string(),
    magicLinkUrl: z.string().optional(), // Helper for frontend display
});

export type CreateMerchantTokenResponse = z.infer<typeof CreateMerchantTokenResponseSchema>;

/**
 * Request to exchange token for session
 */
export const ExchangeTokenRequestSchema = z.object({
    rawToken: z.string().min(1),
});

export type ExchangeTokenRequest = z.infer<typeof ExchangeTokenRequestSchema>;

/**
 * Response from exchange (session JWT)
 */
export const ExchangeTokenResponseSchema = z.object({
    accessToken: z.string(), // The JWT
    listingId: z.string(),
    scopes: z.array(MerchantTokenScopeSchema),
});

export type ExchangeTokenResponse = z.infer<typeof ExchangeTokenResponseSchema>;
