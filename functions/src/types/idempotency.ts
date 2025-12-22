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

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// IDEMPOTENCY OPERATIONS
// ============================================

export type IdempotencyOperation =
    | 'createDraft'
    | 'createHold'
    | 'confirmTransaction'
    | 'releaseHold'
    | 'cancelTransaction'
    | 'whatsappInbound'
    | 'notificationSend';

// ============================================
// IDEMPOTENCY RECORD
// ============================================

export interface IdempotencyRecord {
    key: string;                    // Document ID (composite key)
    op: IdempotencyOperation;
    scopeId: string;                // e.g., transactionId, messageId
    resultRef?: string;             // e.g., transactionId, eventId
    result?: {
        success: boolean;
        data?: Record<string, any>; // Stored result to return on retry
    };
    createdAt: Timestamp;
    expiresAt: Timestamp;           // For TTL cleanup (not correctness)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate an idempotency key for transaction operations.
 * Format: tx_{op}:{transactionId}:{userKey}
 */
export function generateTxIdempotencyKey(
    op: 'hold' | 'confirm' | 'cancel' | 'release',
    transactionId: string,
    userKey: string
): string {
    return `tx_${op}:${transactionId}:${userKey}`;
}

/**
 * Generate an idempotency key for WhatsApp inbound messages.
 * Format: wa_in:{phoneE164}:{messageSid}
 */
export function generateWhatsAppIdempotencyKey(
    phoneE164: string,
    messageSid: string
): string {
    return `wa_in:${phoneE164}:${messageSid}`;
}

/**
 * Generate an idempotency key for notification sends.
 * Format: notify:{type}:{transactionId}:{eventId}
 */
export function generateNotificationIdempotencyKey(
    notificationType: string,
    transactionId: string,
    eventId: string
): string {
    return `notify:${notificationType}:${transactionId}:${eventId}`;
}

// ============================================
// DEFAULT TTL (for cleanup, not correctness)
// ============================================

/**
 * Default TTL for idempotency records: 24 hours.
 * This is for cleanup only - the scheduled expiry worker handles correctness.
 */
export const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Calculate expiry timestamp for idempotency record.
 */
export function calculateIdempotencyExpiry(hoursFromNow: number = IDEMPOTENCY_TTL_HOURS): Date {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}
