/**
 * Scheduled Invariant Checkers
 * 
 * Self-checking system that continuously validates system invariants.
 * Runs on schedule and alerts when violations are detected.
 * 
 * Reference: DDIA reliability principles - "the system can constantly
 * check itself while it is running and raise an alert if a discrepancy is found"
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logSystem } from '../utils/txLogger';
import type { SystemAlert } from '../types/invariants';

const db = getFirestore();

// ============================================
// ALERT HELPER
// ============================================

async function createAlert(alert: Omit<SystemAlert, 'id'>): Promise<void> {
    await db.collection('systemAlerts').add({
        ...alert,
        detectedAt: Timestamp.fromDate(alert.detectedAt),
        acknowledged: false,
    });

    logSystem('ALERT_CREATED', {
        type: alert.type,
        invariant: alert.invariant,
        severity: alert.severity,
    });
}

// ============================================
// INVARIANT 1: HOLD COUNT CHECKER
// ============================================

/**
 * Check: For each lockKey, at most 1 transaction can be in 'hold' status.
 * Runs: Every 10 minutes
 * Severity: CRITICAL (indicates race condition)
 */
export const checkHoldInvariant = onSchedule(
    {
        schedule: 'every 10 minutes',
        region: 'europe-west1',
        timeoutSeconds: 120,
    },
    async () => {
        logSystem('INVARIANT_CHECK_START', { invariant: 'SINGLE_HOLD_PER_LOCK' });

        try {
            // Get all held locks across all businesses
            // Note: This requires a composite index on resourceLocks collectionGroup
            // Index: collectionGroup=resourceLocks, fields=[status (ASC), expiresAt (ASC)]
            // Deploy with: firebase deploy --only firestore:indexes
            let locksSnap;
            try {
                locksSnap = await db.collectionGroup('resourceLocks')
                    .where('status', '==', 'held')
                    .get();
            } catch (queryError: any) {
                // Handle FAILED_PRECONDITION - index might not be ready
                if (queryError?.code === 9 || queryError?.message?.includes('FAILED_PRECONDITION')) {
                    logger.warn({
                        severity: 'WARNING',
                        message: '[Invariant] Firestore index not ready for resourceLocks query',
                        error: queryError.message,
                        hint: 'Run: firebase deploy --only firestore:indexes'
                    });
                    // Skip this check cycle - will retry on next schedule
                    return;
                }
                throw queryError;
            }

            // Group by lockKey to find duplicates
            const locksByKey = new Map<string, Array<{ txId: string; businessId: string; docPath: string }>>();

            for (const doc of locksSnap.docs) {
                const data = doc.data();
                const lockKey = data.lockKey;
                const txId = data.transactionId;
                const businessId = doc.ref.parent.parent?.id || 'unknown';

                if (!locksByKey.has(lockKey)) {
                    locksByKey.set(lockKey, []);
                }
                locksByKey.get(lockKey)!.push({ txId, businessId, docPath: doc.ref.path });
            }

            // Check for violations
            let violations = 0;
            for (const [lockKey, entries] of locksByKey) {
                if (entries.length > 1) {
                    violations++;

                    logger.error({
                        severity: 'CRITICAL',
                        message: '[INVARIANT VIOLATION] Multiple holds for same lockKey',
                        lockKey,
                        txIds: entries.map(e => e.txId),
                        count: entries.length,
                    });

                    await createAlert({
                        type: 'INVARIANT_VIOLATION',
                        invariant: 'SINGLE_HOLD_PER_LOCK',
                        severity: 'CRITICAL',
                        message: `Multiple holds (${entries.length}) for lockKey: ${lockKey}`,
                        details: { lockKey, entries },
                        detectedAt: new Date(),
                    });
                }
            }

            if (violations === 0) {
                logSystem('INVARIANT_CHECK_PASS', {
                    invariant: 'SINGLE_HOLD_PER_LOCK',
                    locksChecked: locksSnap.size
                });
            }

        } catch (err: unknown) {
            logger.error('[Invariant] Hold check failed:', err);
        }
    }
);

// ============================================
// INVARIANT 2: EVENT CONSISTENCY CHECKER
// ============================================

/**
 * Check: Every confirmed transaction has exactly 1 'confirmed' event.
 * Runs: Every 30 minutes
 * Severity: ERROR (indicates missing event append)
 */
export const checkEventConsistency = onSchedule(
    {
        schedule: 'every 30 minutes',
        region: 'europe-west1',
        timeoutSeconds: 300,
    },
    async () => {
        logSystem('INVARIANT_CHECK_START', { invariant: 'CONFIRMED_EVENT_COUNT' });

        try {
            // Get confirmed transactions (paginated)
            const txSnap = await db.collectionGroup('transactions')
                .where('status', '==', 'confirmed')
                .limit(200)
                .get();

            let violations = 0;
            const violationDetails: any[] = [];

            for (const doc of txSnap.docs) {
                const eventsSnap = await doc.ref.collection('events')
                    .where('type', '==', 'confirmed')
                    .get();

                if (eventsSnap.size !== 1) {
                    violations++;
                    violationDetails.push({
                        txId: doc.id,
                        expectedEvents: 1,
                        actualEvents: eventsSnap.size,
                        path: doc.ref.path,
                    });

                    logger.error({
                        severity: 'ERROR',
                        message: '[INVARIANT VIOLATION] Confirmed tx has wrong event count',
                        txId: doc.id,
                        expectedEvents: 1,
                        actualEvents: eventsSnap.size,
                    });
                }
            }

            if (violations > 0) {
                await createAlert({
                    type: 'DATA_INCONSISTENCY',
                    invariant: 'CONFIRMED_EVENT_COUNT',
                    severity: 'ERROR',
                    message: `${violations} confirmed transactions have wrong event count`,
                    details: { violations, samples: violationDetails.slice(0, 5) },
                    detectedAt: new Date(),
                });
            } else {
                logSystem('INVARIANT_CHECK_PASS', {
                    invariant: 'CONFIRMED_EVENT_COUNT',
                    checked: txSnap.size
                });
            }

        } catch (err: unknown) {
            logger.error('[Invariant] Event consistency check failed:', err);
        }
    }
);

// ============================================
// INVARIANT 3: ORPHAN LOCK CHECKER (with Auto-Heal)
// ============================================

/**
 * Check: Every lock references a real transaction.
 * Runs: Every 1 hour
 * Severity: WARNING (can auto-heal)
 * Auto-heal: Delete orphan locks
 */
export const checkOrphanLocks = onSchedule(
    {
        schedule: 'every 1 hours',
        region: 'europe-west1',
        timeoutSeconds: 300,
    },
    async () => {
        logSystem('INVARIANT_CHECK_START', { invariant: 'NO_ORPHAN_LOCKS' });

        try {
            const locksSnap = await db.collectionGroup('resourceLocks')
                .where('status', '==', 'held')
                .get();

            let orphans = 0;
            let healed = 0;

            for (const doc of locksSnap.docs) {
                const data = doc.data();
                const txId = data.transactionId;
                const businessId = doc.ref.parent.parent?.id;

                if (!businessId) continue;

                // Check if referenced transaction exists
                const txDoc = await db.doc(`businesses/${businessId}/transactions/${txId}`).get();

                if (!txDoc.exists) {
                    orphans++;

                    logger.warn({
                        severity: 'WARNING',
                        message: '[INVARIANT VIOLATION] Orphan lock found',
                        lockKey: data.lockKey,
                        txId,
                        businessId,
                    });

                    // Auto-heal: Delete orphan lock
                    try {
                        await doc.ref.delete();
                        healed++;
                        logSystem('AUTO_HEAL', {
                            action: 'DELETE_ORPHAN_LOCK',
                            lockKey: data.lockKey,
                            txId,
                        });
                    } catch (healErr) {
                        logger.error('[AutoHeal] Failed to delete orphan lock:', healErr);
                    }
                }
            }

            if (orphans > 0) {
                await createAlert({
                    type: 'AUTO_HEAL',
                    invariant: 'NO_ORPHAN_LOCKS',
                    severity: 'WARNING',
                    message: `Found ${orphans} orphan locks, healed ${healed}`,
                    details: { orphans, healed, checked: locksSnap.size },
                    detectedAt: new Date(),
                });
            } else {
                logSystem('INVARIANT_CHECK_PASS', {
                    invariant: 'NO_ORPHAN_LOCKS',
                    checked: locksSnap.size
                });
            }

        } catch (err: unknown) {
            logger.error('[Invariant] Orphan lock check failed:', err);
        }
    }
);

// ============================================
// INVARIANT 4: EXPIRY SLA CHECKER
// ============================================

/**
 * Check: No hold should remain 'held' past its expiresAt by more than 2 minutes.
 * Runs: Every 5 minutes
 * Severity: WARNING (indicates expiry worker delay)
 */
export const checkExpirySLA = onSchedule(
    {
        schedule: 'every 5 minutes',
        region: 'europe-west1',
        timeoutSeconds: 120,
    },
    async () => {
        logSystem('INVARIANT_CHECK_START', { invariant: 'HOLD_EXPIRY_SLA' });

        try {
            const now = Date.now();
            const maxDriftMs = 2 * 60 * 1000; // 2 minutes
            const slaThreshold = Timestamp.fromMillis(now - maxDriftMs);

            // Find locks that are held but should have expired
            const overdueSnap = await db.collectionGroup('resourceLocks')
                .where('status', '==', 'held')
                .where('expiresAt', '<', slaThreshold)
                .get();

            if (overdueSnap.size > 0) {
                const overdueDetails = overdueSnap.docs.map(doc => ({
                    lockKey: doc.data().lockKey,
                    txId: doc.data().transactionId,
                    expiresAt: doc.data().expiresAt?.toDate()?.toISOString(),
                    overdueMs: now - doc.data().expiresAt?.toMillis(),
                }));

                logger.warn({
                    severity: 'WARNING',
                    message: '[SLA BREACH] Holds overdue for expiry',
                    count: overdueSnap.size,
                    samples: overdueDetails.slice(0, 5),
                });

                await createAlert({
                    type: 'SLA_BREACH',
                    invariant: 'HOLD_EXPIRY_SLA',
                    severity: 'WARNING',
                    message: `${overdueSnap.size} holds overdue for expiry (>2 min past expiresAt)`,
                    details: { count: overdueSnap.size, samples: overdueDetails.slice(0, 5) },
                    detectedAt: new Date(),
                });
            } else {
                logSystem('INVARIANT_CHECK_PASS', { invariant: 'HOLD_EXPIRY_SLA' });
            }

        } catch (err: unknown) {
            logger.error('[Invariant] Expiry SLA check failed:', err);
        }
    }
);

// ============================================
// INVARIANT 5: STUCK PENDING ACTIONS CHECKER
// ============================================

/**
 * Check: No pending action should exist past its holdExpiresAt.
 * Runs: Every 10 minutes
 * Auto-heal: Clear expired pending actions
 */
export const checkStuckPendingActions = onSchedule(
    {
        schedule: 'every 10 minutes',
        region: 'europe-west1',
        timeoutSeconds: 120,
    },
    async () => {
        logSystem('INVARIANT_CHECK_START', { invariant: 'NO_STUCK_PENDING_ACTIONS' });

        try {
            const now = Timestamp.now();

            // Find sessions with expired pending actions
            const sessionsSnap = await db.collection('chatSessions')
                .where('pendingAction.holdExpiresAt', '<', now)
                .limit(100)
                .get();

            let stuck = 0;
            let healed = 0;

            for (const doc of sessionsSnap.docs) {
                const pending = doc.data().pendingAction;
                if (!pending) continue;

                stuck++;

                // Auto-heal: Clear the stuck pending action
                try {
                    await doc.ref.update({
                        pendingAction: null,
                        lastAutoHealAt: Timestamp.now(),
                    });
                    healed++;

                    logSystem('AUTO_HEAL', {
                        action: 'CLEAR_STUCK_PENDING_ACTION',
                        sessionId: doc.id,
                        txId: pending.txId,
                    });
                } catch (healErr) {
                    logger.error('[AutoHeal] Failed to clear stuck pending action:', healErr);
                }
            }

            if (stuck > 0) {
                await createAlert({
                    type: 'AUTO_HEAL',
                    invariant: 'NO_STUCK_PENDING_ACTIONS',
                    severity: 'WARNING',
                    message: `Found ${stuck} stuck pending actions, healed ${healed}`,
                    details: { stuck, healed },
                    detectedAt: new Date(),
                });
            } else {
                logSystem('INVARIANT_CHECK_PASS', { invariant: 'NO_STUCK_PENDING_ACTIONS' });
            }

        } catch (err: unknown) {
            logger.error('[Invariant] Stuck pending actions check failed:', err);
        }
    }
);
