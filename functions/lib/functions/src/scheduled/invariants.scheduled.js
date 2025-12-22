"use strict";
/**
 * Scheduled Invariant Checkers
 *
 * Self-checking system that continuously validates system invariants.
 * Runs on schedule and alerts when violations are detected.
 *
 * Reference: DDIA reliability principles - "the system can constantly
 * check itself while it is running and raise an alert if a discrepancy is found"
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStuckPendingActions = exports.checkExpirySLA = exports.checkOrphanLocks = exports.checkEventConsistency = exports.checkHoldInvariant = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const txLogger_1 = require("../utils/txLogger");
const db = (0, firestore_1.getFirestore)();
// ============================================
// ALERT HELPER
// ============================================
async function createAlert(alert) {
    await db.collection('systemAlerts').add(Object.assign(Object.assign({}, alert), { detectedAt: firestore_1.Timestamp.fromDate(alert.detectedAt), acknowledged: false }));
    (0, txLogger_1.logSystem)('ALERT_CREATED', {
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
exports.checkHoldInvariant = (0, scheduler_1.onSchedule)({
    schedule: 'every 10 minutes',
    region: 'europe-west1',
    timeoutSeconds: 120,
}, async () => {
    var _a;
    (0, txLogger_1.logSystem)('INVARIANT_CHECK_START', { invariant: 'SINGLE_HOLD_PER_LOCK' });
    try {
        // Get all held locks across all businesses
        const locksSnap = await db.collectionGroup('resourceLocks')
            .where('status', '==', 'held')
            .get();
        // Group by lockKey to find duplicates
        const locksByKey = new Map();
        for (const doc of locksSnap.docs) {
            const data = doc.data();
            const lockKey = data.lockKey;
            const txId = data.transactionId;
            const businessId = ((_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id) || 'unknown';
            if (!locksByKey.has(lockKey)) {
                locksByKey.set(lockKey, []);
            }
            locksByKey.get(lockKey).push({ txId, businessId, docPath: doc.ref.path });
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
            (0, txLogger_1.logSystem)('INVARIANT_CHECK_PASS', {
                invariant: 'SINGLE_HOLD_PER_LOCK',
                locksChecked: locksSnap.size
            });
        }
    }
    catch (err) {
        logger.error('[Invariant] Hold check failed:', err);
    }
});
// ============================================
// INVARIANT 2: EVENT CONSISTENCY CHECKER
// ============================================
/**
 * Check: Every confirmed transaction has exactly 1 'confirmed' event.
 * Runs: Every 30 minutes
 * Severity: ERROR (indicates missing event append)
 */
exports.checkEventConsistency = (0, scheduler_1.onSchedule)({
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    timeoutSeconds: 300,
}, async () => {
    (0, txLogger_1.logSystem)('INVARIANT_CHECK_START', { invariant: 'CONFIRMED_EVENT_COUNT' });
    try {
        // Get confirmed transactions (paginated)
        const txSnap = await db.collectionGroup('transactions')
            .where('status', '==', 'confirmed')
            .limit(200)
            .get();
        let violations = 0;
        const violationDetails = [];
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
        }
        else {
            (0, txLogger_1.logSystem)('INVARIANT_CHECK_PASS', {
                invariant: 'CONFIRMED_EVENT_COUNT',
                checked: txSnap.size
            });
        }
    }
    catch (err) {
        logger.error('[Invariant] Event consistency check failed:', err);
    }
});
// ============================================
// INVARIANT 3: ORPHAN LOCK CHECKER (with Auto-Heal)
// ============================================
/**
 * Check: Every lock references a real transaction.
 * Runs: Every 1 hour
 * Severity: WARNING (can auto-heal)
 * Auto-heal: Delete orphan locks
 */
exports.checkOrphanLocks = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    region: 'europe-west1',
    timeoutSeconds: 300,
}, async () => {
    var _a;
    (0, txLogger_1.logSystem)('INVARIANT_CHECK_START', { invariant: 'NO_ORPHAN_LOCKS' });
    try {
        const locksSnap = await db.collectionGroup('resourceLocks')
            .where('status', '==', 'held')
            .get();
        let orphans = 0;
        let healed = 0;
        for (const doc of locksSnap.docs) {
            const data = doc.data();
            const txId = data.transactionId;
            const businessId = (_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
            if (!businessId)
                continue;
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
                    (0, txLogger_1.logSystem)('AUTO_HEAL', {
                        action: 'DELETE_ORPHAN_LOCK',
                        lockKey: data.lockKey,
                        txId,
                    });
                }
                catch (healErr) {
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
        }
        else {
            (0, txLogger_1.logSystem)('INVARIANT_CHECK_PASS', {
                invariant: 'NO_ORPHAN_LOCKS',
                checked: locksSnap.size
            });
        }
    }
    catch (err) {
        logger.error('[Invariant] Orphan lock check failed:', err);
    }
});
// ============================================
// INVARIANT 4: EXPIRY SLA CHECKER
// ============================================
/**
 * Check: No hold should remain 'held' past its expiresAt by more than 2 minutes.
 * Runs: Every 5 minutes
 * Severity: WARNING (indicates expiry worker delay)
 */
exports.checkExpirySLA = (0, scheduler_1.onSchedule)({
    schedule: 'every 5 minutes',
    region: 'europe-west1',
    timeoutSeconds: 120,
}, async () => {
    (0, txLogger_1.logSystem)('INVARIANT_CHECK_START', { invariant: 'HOLD_EXPIRY_SLA' });
    try {
        const now = Date.now();
        const maxDriftMs = 2 * 60 * 1000; // 2 minutes
        const slaThreshold = firestore_1.Timestamp.fromMillis(now - maxDriftMs);
        // Find locks that are held but should have expired
        const overdueSnap = await db.collectionGroup('resourceLocks')
            .where('status', '==', 'held')
            .where('expiresAt', '<', slaThreshold)
            .get();
        if (overdueSnap.size > 0) {
            const overdueDetails = overdueSnap.docs.map(doc => {
                var _a, _b, _c;
                return ({
                    lockKey: doc.data().lockKey,
                    txId: doc.data().transactionId,
                    expiresAt: (_b = (_a = doc.data().expiresAt) === null || _a === void 0 ? void 0 : _a.toDate()) === null || _b === void 0 ? void 0 : _b.toISOString(),
                    overdueMs: now - ((_c = doc.data().expiresAt) === null || _c === void 0 ? void 0 : _c.toMillis()),
                });
            });
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
        }
        else {
            (0, txLogger_1.logSystem)('INVARIANT_CHECK_PASS', { invariant: 'HOLD_EXPIRY_SLA' });
        }
    }
    catch (err) {
        logger.error('[Invariant] Expiry SLA check failed:', err);
    }
});
// ============================================
// INVARIANT 5: STUCK PENDING ACTIONS CHECKER
// ============================================
/**
 * Check: No pending action should exist past its holdExpiresAt.
 * Runs: Every 10 minutes
 * Auto-heal: Clear expired pending actions
 */
exports.checkStuckPendingActions = (0, scheduler_1.onSchedule)({
    schedule: 'every 10 minutes',
    region: 'europe-west1',
    timeoutSeconds: 120,
}, async () => {
    (0, txLogger_1.logSystem)('INVARIANT_CHECK_START', { invariant: 'NO_STUCK_PENDING_ACTIONS' });
    try {
        const now = firestore_1.Timestamp.now();
        // Find sessions with expired pending actions
        const sessionsSnap = await db.collection('chatSessions')
            .where('pendingAction.holdExpiresAt', '<', now)
            .limit(100)
            .get();
        let stuck = 0;
        let healed = 0;
        for (const doc of sessionsSnap.docs) {
            const pending = doc.data().pendingAction;
            if (!pending)
                continue;
            stuck++;
            // Auto-heal: Clear the stuck pending action
            try {
                await doc.ref.update({
                    pendingAction: null,
                    lastAutoHealAt: firestore_1.Timestamp.now(),
                });
                healed++;
                (0, txLogger_1.logSystem)('AUTO_HEAL', {
                    action: 'CLEAR_STUCK_PENDING_ACTION',
                    sessionId: doc.id,
                    txId: pending.txId,
                });
            }
            catch (healErr) {
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
        }
        else {
            (0, txLogger_1.logSystem)('INVARIANT_CHECK_PASS', { invariant: 'NO_STUCK_PENDING_ACTIONS' });
        }
    }
    catch (err) {
        logger.error('[Invariant] Stuck pending actions check failed:', err);
    }
});
//# sourceMappingURL=invariants.scheduled.js.map