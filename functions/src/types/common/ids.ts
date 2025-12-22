/**
 * Common ID Types
 * 
 * Branded string types for type-safe IDs across the system.
 * These prevent accidental mixing of different ID types.
 */

// ============================================
// BRANDED ID TYPES
// ============================================

/** Branded type helper for compile-time safety */
type Brand<T, B> = T & { __brand: B };

/** Business tenant ID */
export type BusinessId = Brand<string, 'BusinessId'>;

/** User account ID */
export type UserId = Brand<string, 'UserId'>;

/** Transaction/booking ID */
export type TransactionId = Brand<string, 'TransactionId'>;

/** Chat session ID */
export type SessionId = Brand<string, 'SessionId'>;

/** Listing/offering ID */
export type ListingId = Brand<string, 'ListingId'>;

/** Knowledge document ID */
export type KnowledgeDocId = Brand<string, 'KnowledgeDocId'>;

// ============================================
// ID HELPERS
// ============================================

/** Create a BusinessId from a string (no runtime validation) */
export const asBusinessId = (id: string): BusinessId => id as BusinessId;

/** Create a UserId from a string */
export const asUserId = (id: string): UserId => id as UserId;

/** Create a TransactionId from a string */
export const asTransactionId = (id: string): TransactionId => id as TransactionId;

/** Create a SessionId from a string */
export const asSessionId = (id: string): SessionId => id as SessionId;

/** Create a ListingId from a string */
export const asListingId = (id: string): ListingId => id as ListingId;

/** Create a KnowledgeDocId from a string */
export const asKnowledgeDocId = (id: string): KnowledgeDocId => id as KnowledgeDocId;
