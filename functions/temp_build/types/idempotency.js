"use strict";
/**
 * Idempotency Types - Per-Operation Deduplication
 *
 * Each operation (createHold, confirmTransaction, etc.) gets its own
 * idempotency record. This prevents duplicate processing on retries
 * without the "last key wins" problem.
 *
 * Lives at: idempotency/{opScope}:{idempotencyKey}
 *
 * Examples:
 *   - tx_hold:TX123:abc123
 *   - tx_confirm:TX123:def456
 *   - whatsapp_inbound:+90555...:SMxxxx
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDEMPOTENCY_TTL_HOURS = void 0;
exports.generateTxIdempotencyKey = generateTxIdempotencyKey;
exports.generateWhatsAppIdempotencyKey = generateWhatsAppIdempotencyKey;
exports.generateNotificationIdempotencyKey = generateNotificationIdempotencyKey;
exports.calculateIdempotencyExpiry = calculateIdempotencyExpiry;
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Generate an idempotency key for transaction operations.
 * Format: tx_{op}:{transactionId}:{userKey}
 */
function generateTxIdempotencyKey(op, transactionId, userKey) {
    return "tx_".concat(op, ":").concat(transactionId, ":").concat(userKey);
}
/**
 * Generate an idempotency key for WhatsApp inbound messages.
 * Format: wa_in:{phoneE164}:{messageSid}
 */
function generateWhatsAppIdempotencyKey(phoneE164, messageSid) {
    return "wa_in:".concat(phoneE164, ":").concat(messageSid);
}
/**
 * Generate an idempotency key for notification sends.
 * Format: notify:{type}:{transactionId}:{eventId}
 */
function generateNotificationIdempotencyKey(notificationType, transactionId, eventId) {
    return "notify:".concat(notificationType, ":").concat(transactionId, ":").concat(eventId);
}
// ============================================
// DEFAULT TTL (for cleanup, not correctness)
// ============================================
/**
 * Default TTL for idempotency records: 24 hours.
 * This is for cleanup only - the scheduled expiry worker handles correctness.
 */
exports.IDEMPOTENCY_TTL_HOURS = 24;
/**
 * Calculate expiry timestamp for idempotency record.
 */
function calculateIdempotencyExpiry(hoursFromNow) {
    if (hoursFromNow === void 0) { hoursFromNow = exports.IDEMPOTENCY_TTL_HOURS; }
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}
