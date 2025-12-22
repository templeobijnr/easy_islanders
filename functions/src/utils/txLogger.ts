/**
 * Structured Transaction Logger
 * 
 * Provides consistent, searchable logs for transaction lifecycle events.
 * All logs include correlation IDs for tracing.
 * 
 * Usage:
 *   logTx(txId, businessId, 'HOLD_CREATED', { lockKey, holdExpiresAt });
 *   logTx(txId, businessId, 'CONFIRM_SUCCESS', { confirmationCode });
 */

import * as logger from 'firebase-functions/logger';

// ============================================
// LOG EVENT TYPES
// ============================================

export type TxLogEvent =
    // Lifecycle events
    | 'DRAFT_CREATED'
    | 'HOLD_CREATED'
    | 'HOLD_FAILED'
    | 'CONFIRM_SUCCESS'
    | 'CONFIRM_FAILED'
    | 'RELEASE_SUCCESS'
    | 'RELEASE_FAILED'
    | 'EXPIRED'
    | 'CANCELLED'
    // Gate events
    | 'GATE_YES'
    | 'GATE_NO'
    | 'GATE_REMINDER'
    | 'GATE_EXPIRED'
    // Notification events
    | 'NOTIFICATION_SENT'
    | 'NOTIFICATION_FAILED'
    | 'NOTIFICATION_SKIPPED';

export type SystemLogEvent =
    | 'INVARIANT_CHECK_START'
    | 'INVARIANT_CHECK_PASS'
    | 'INVARIANT_VIOLATION'
    | 'AUTO_HEAL'
    | 'ALERT_CREATED'
    | 'METRICS_COLLECTED';

// ============================================
// TRANSACTION LOGGER
// ============================================

/**
 * Log a transaction lifecycle event with full context.
 * Structured for Cloud Logging queries.
 */
export function logTx(
    txId: string,
    businessId: string,
    event: TxLogEvent,
    data?: Record<string, any>
): void {
    const logEntry = {
        severity: getLogSeverity(event),
        message: `[TX] ${event}`,
        txId,
        businessId,
        event,
        ...data,
        timestamp: new Date().toISOString(),
    };

    if (isErrorEvent(event)) {
        logger.error(logEntry);
    } else if (isWarningEvent(event)) {
        logger.warn(logEntry);
    } else {
        logger.info(logEntry);
    }
}

/**
 * Log a system-level event (invariant checks, metrics, etc.)
 */
export function logSystem(
    event: SystemLogEvent,
    data?: Record<string, any>
): void {
    const logEntry = {
        severity: event === 'INVARIANT_VIOLATION' ? 'CRITICAL' : 'INFO',
        message: `[SYSTEM] ${event}`,
        event,
        ...data,
        timestamp: new Date().toISOString(),
    };

    if (event === 'INVARIANT_VIOLATION') {
        logger.error(logEntry);
    } else {
        logger.info(logEntry);
    }
}

/**
 * Log a request with correlation ID for tracing.
 */
export function logRequest(
    requestId: string,
    channel: string,
    event: string,
    data?: Record<string, any>
): void {
    logger.info({
        severity: 'INFO',
        message: `[REQUEST] ${event}`,
        requestId,
        channel,
        event,
        ...data,
        timestamp: new Date().toISOString(),
    });
}

// ============================================
// HELPERS
// ============================================

function getLogSeverity(event: TxLogEvent): string {
    if (isErrorEvent(event)) return 'ERROR';
    if (isWarningEvent(event)) return 'WARNING';
    return 'INFO';
}

function isErrorEvent(event: TxLogEvent): boolean {
    return [
        'HOLD_FAILED',
        'CONFIRM_FAILED',
        'RELEASE_FAILED',
        'NOTIFICATION_FAILED',
    ].includes(event);
}

function isWarningEvent(event: TxLogEvent): boolean {
    return [
        'EXPIRED',
        'GATE_EXPIRED',
        'NOTIFICATION_SKIPPED',
    ].includes(event);
}
