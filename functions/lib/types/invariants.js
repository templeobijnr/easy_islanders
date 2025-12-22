"use strict";
/**
 * SYSTEM INVARIANTS
 *
 * These are the guarantees that must ALWAYS hold true in our system.
 * Invariant checkers run on schedule and alert when violations are detected.
 *
 * Reference: DDIA Chapter 1 - Reliability principles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_INVARIANTS = exports.PROCESSING_SLA_INVARIANT = exports.EXPIRY_SLA_INVARIANT = exports.ORPHAN_INVARIANT = exports.EVENT_APPEND_INVARIANT = exports.IDEMPOTENCY_INVARIANT = exports.TRANSITION_INVARIANT = exports.HOLD_COUNT_INVARIANT = void 0;
// ============================================
// INVARIANT DEFINITIONS
// ============================================
/**
 * INVARIANT 1: HOLD COUNT (Single Lock Per Resource)
 *
 * For any lockKey, at most 1 transaction can be in 'hold' status.
 *
 * Collection: businesses/{businessId}/resourceLocks/{lockKey}
 * Verified by: Exactly 1 doc per lockKey with status='held'
 *
 * Violation indicates: Race condition in createHold() or failed transaction rollback
 */
exports.HOLD_COUNT_INVARIANT = {
    name: 'SINGLE_HOLD_PER_LOCK',
    description: 'At most 1 transaction can hold a resource at a time',
    severity: 'CRITICAL',
    checkInterval: 'every 10 minutes',
};
/**
 * INVARIANT 2: STATE TRANSITION (Valid State Machine)
 *
 * Transactions must follow valid state transitions:
 *   - draft → hold → confirmed (happy path)
 *   - draft → hold → cancelled (user cancels)
 *   - draft → hold → expired (timeout)
 *   - NEVER: confirmed → cancelled (requires explicit policy)
 *   - NEVER: expired → confirmed
 *   - NEVER: cancelled → confirmed
 *
 * Violation indicates: Bug in transition logic or manual DB tampering
 */
exports.TRANSITION_INVARIANT = {
    name: 'VALID_STATE_TRANSITIONS',
    description: 'Transaction status changes follow defined state machine',
    severity: 'ERROR',
    validTransitions: {
        draft: ['hold', 'failed'],
        hold: ['confirmed', 'cancelled', 'expired'],
        confirmed: [], // Terminal (or 'refunded' with explicit policy)
        cancelled: [], // Terminal
        expired: [], // Terminal
        failed: [], // Terminal
    },
};
/**
 * INVARIANT 3: IDEMPOTENCY (Exactly-Once Semantics)
 *
 * Same idempotency key + same operation = same result.
 * Second call NEVER mutates state.
 *
 * Collection: idempotency/{scope}:{key}
 *
 * Violation indicates: Broken idempotency check or race condition
 */
exports.IDEMPOTENCY_INVARIANT = {
    name: 'EXACTLY_ONCE_PROCESSING',
    description: 'Duplicate operations with same key return cached result',
    severity: 'CRITICAL',
    checkInterval: 'on-demand (not scheduled)',
};
/**
 * INVARIANT 4: EVENT APPEND-ONLY (Immutable Audit Trail)
 *
 * Events are immutable after creation.
 * Event count for a transaction can only increase.
 *
 * Collection: businesses/{businessId}/transactions/{txId}/events/{eventId}
 *
 * Verified by:
 *   - confirmed tx has exactly 1 'confirmed' event
 *   - cancelled tx has exactly 1 'cancelled' event
 *   - Every tx has at least 1 'draft_created' event
 *
 * Violation indicates: Missing event append or double-append
 */
exports.EVENT_APPEND_INVARIANT = {
    name: 'IMMUTABLE_EVENT_TRAIL',
    description: 'Every state change produces exactly one event',
    severity: 'ERROR',
    checkInterval: 'every 30 minutes',
};
/**
 * INVARIANT 5: ORPHAN RESOURCES (Referential Integrity)
 *
 * Every lock references a real transaction.
 * Every pending action references a real transaction.
 *
 * Violation indicates: Partial write failure or failed cleanup
 */
exports.ORPHAN_INVARIANT = {
    name: 'NO_ORPHAN_RESOURCES',
    description: 'All references point to existing documents',
    severity: 'WARNING',
    checkInterval: 'every 1 hours',
    autoHeal: true,
};
/**
 * INVARIANT 6: EXPIRY SLA (Timely Cleanup)
 *
 * No hold should remain in 'held' status past its expiresAt.
 * Maximum drift: 2 minutes (expiry worker runs every 1 minute).
 *
 * Violation indicates: Expiry worker failure or clock drift
 */
exports.EXPIRY_SLA_INVARIANT = {
    name: 'HOLD_EXPIRY_SLA',
    description: 'Expired holds are cleaned up within 2 minutes',
    severity: 'WARNING',
    checkInterval: 'every 5 minutes',
    maxDriftMinutes: 2,
};
/**
 * INVARIANT 7: PROCESSING SLA (Message Processing)
 *
 * Every inbound message reaches a terminal outcome within SLA:
 *   - WhatsApp: 60 seconds
 *   - App chat: 10 seconds
 *
 * Terminal outcomes: responded | failed | dropped | requires_human
 *
 * Violation indicates: Stuck processing, agent timeout, or dropped message
 */
exports.PROCESSING_SLA_INVARIANT = {
    name: 'MESSAGE_PROCESSING_SLA',
    description: 'All messages processed within channel SLA',
    severity: 'ERROR',
    slaByChannel: {
        whatsapp: 60, // seconds
        app_chat: 10,
        discover_chat: 10,
    },
};
// ============================================
// INVARIANT REGISTRY
// ============================================
exports.ALL_INVARIANTS = [
    exports.HOLD_COUNT_INVARIANT,
    exports.TRANSITION_INVARIANT,
    exports.IDEMPOTENCY_INVARIANT,
    exports.EVENT_APPEND_INVARIANT,
    exports.ORPHAN_INVARIANT,
    exports.EXPIRY_SLA_INVARIANT,
    exports.PROCESSING_SLA_INVARIANT,
];
//# sourceMappingURL=invariants.js.map