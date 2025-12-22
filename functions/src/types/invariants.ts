/**
 * SYSTEM INVARIANTS
 * 
 * These are the guarantees that must ALWAYS hold true in our system.
 * Invariant checkers run on schedule and alert when violations are detected.
 * 
 * Reference: DDIA Chapter 1 - Reliability principles
 */

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
export const HOLD_COUNT_INVARIANT = {
    name: 'SINGLE_HOLD_PER_LOCK',
    description: 'At most 1 transaction can hold a resource at a time',
    severity: 'CRITICAL' as const,
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
export const TRANSITION_INVARIANT = {
    name: 'VALID_STATE_TRANSITIONS',
    description: 'Transaction status changes follow defined state machine',
    severity: 'ERROR' as const,
    validTransitions: {
        draft: ['hold', 'failed'],
        hold: ['confirmed', 'cancelled', 'expired'],
        confirmed: [], // Terminal (or 'refunded' with explicit policy)
        cancelled: [], // Terminal
        expired: [],   // Terminal
        failed: [],    // Terminal
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
export const IDEMPOTENCY_INVARIANT = {
    name: 'EXACTLY_ONCE_PROCESSING',
    description: 'Duplicate operations with same key return cached result',
    severity: 'CRITICAL' as const,
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
export const EVENT_APPEND_INVARIANT = {
    name: 'IMMUTABLE_EVENT_TRAIL',
    description: 'Every state change produces exactly one event',
    severity: 'ERROR' as const,
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
export const ORPHAN_INVARIANT = {
    name: 'NO_ORPHAN_RESOURCES',
    description: 'All references point to existing documents',
    severity: 'WARNING' as const,
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
export const EXPIRY_SLA_INVARIANT = {
    name: 'HOLD_EXPIRY_SLA',
    description: 'Expired holds are cleaned up within 2 minutes',
    severity: 'WARNING' as const,
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
export const PROCESSING_SLA_INVARIANT = {
    name: 'MESSAGE_PROCESSING_SLA',
    description: 'All messages processed within channel SLA',
    severity: 'ERROR' as const,
    slaByChannel: {
        whatsapp: 60,      // seconds
        app_chat: 10,
        discover_chat: 10,
    },
};

// ============================================
// INVARIANT REGISTRY
// ============================================

export const ALL_INVARIANTS = [
    HOLD_COUNT_INVARIANT,
    TRANSITION_INVARIANT,
    IDEMPOTENCY_INVARIANT,
    EVENT_APPEND_INVARIANT,
    ORPHAN_INVARIANT,
    EXPIRY_SLA_INVARIANT,
    PROCESSING_SLA_INVARIANT,
];

// ============================================
// ALERT TYPES
// ============================================

export type AlertSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

export interface SystemAlert {
    id?: string;
    type: 'INVARIANT_VIOLATION' | 'DATA_INCONSISTENCY' | 'SLA_BREACH' | 'AUTO_HEAL';
    invariant: string;
    severity: AlertSeverity;
    message: string;
    details: Record<string, any>;
    detectedAt: Date;
    resolvedAt?: Date;
    acknowledged?: boolean;
}
