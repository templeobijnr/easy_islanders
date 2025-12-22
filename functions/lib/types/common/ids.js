"use strict";
/**
 * Common ID Types
 *
 * Branded string types for type-safe IDs across the system.
 * These prevent accidental mixing of different ID types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.asKnowledgeDocId = exports.asListingId = exports.asSessionId = exports.asTransactionId = exports.asUserId = exports.asBusinessId = void 0;
// ============================================
// ID HELPERS
// ============================================
/** Create a BusinessId from a string (no runtime validation) */
const asBusinessId = (id) => id;
exports.asBusinessId = asBusinessId;
/** Create a UserId from a string */
const asUserId = (id) => id;
exports.asUserId = asUserId;
/** Create a TransactionId from a string */
const asTransactionId = (id) => id;
exports.asTransactionId = asTransactionId;
/** Create a SessionId from a string */
const asSessionId = (id) => id;
exports.asSessionId = asSessionId;
/** Create a ListingId from a string */
const asListingId = (id) => id;
exports.asListingId = asListingId;
/** Create a KnowledgeDocId from a string */
const asKnowledgeDocId = (id) => id;
exports.asKnowledgeDocId = asKnowledgeDocId;
//# sourceMappingURL=ids.js.map