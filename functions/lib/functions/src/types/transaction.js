"use strict";
/**
 * Transaction Types - Execution Ledger Core Schema
 *
 * The transaction is the canonical record of all bookings/orders/rentals.
 * Lives at: businesses/{businessId}/transactions/{transactionId}
 * Events at: businesses/{businessId}/transactions/{transactionId}/events/{eventId}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTableLockKey = generateTableLockKey;
exports.generateOfferingLockKey = generateOfferingLockKey;
// ============================================
// LOCK KEY HELPERS
// ============================================
/**
 * Generate a lock key for restaurant table booking.
 * Format: table:{YYYY-MM-DD}:{HH:MM}
 */
function generateTableLockKey(date, slotTime) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return `table:${dateStr}:${slotTime}`;
}
/**
 * Generate a lock key for a specific offering at a time.
 * Format: {offeringId}:{YYYY-MM-DD}:{HH:MM}
 */
function generateOfferingLockKey(offeringId, date, slotTime) {
    const dateStr = date.toISOString().split('T')[0];
    return `${offeringId}:${dateStr}:${slotTime}`;
}
//# sourceMappingURL=transaction.js.map