"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRepository = void 0;
exports.appendEvent = appendEvent;
const errors_1 = require("../utils/errors");
/**
 * Transaction Repository - Execution Ledger Core
 *
 * Implements atomic state transitions with:
 * - Firestore transactions for consistency
 * - Lock documents for concurrency control
 * - Per-operation idempotency for retry safety
 *
 * Collection paths:
 * - businesses/{businessId}/transactions/{txId}
 * - businesses/{businessId}/transactions/{txId}/events/{eventId}
 * - businesses/{businessId}/resourceLocks/{lockKey}
 * - idempotency/{key}
 */
const firestore_1 = require("firebase-admin/firestore");
const idempotency_1 = require("../types/idempotency");
const db = (0, firestore_1.getFirestore)();
// ============================================
// COLLECTION PATH HELPERS
// ============================================
const getTransactionsPath = (businessId) => `businesses/${businessId}/transactions`;
const getEventsPath = (businessId, txId) => `businesses/${businessId}/transactions/${txId}/events`;
const getLocksPath = (businessId) => `businesses/${businessId}/resourceLocks`;
const IDEMPOTENCY_COLLECTION = 'idempotency';
// ============================================
// CONFIRMATION CODE GENERATOR
// ============================================
function generateConfirmationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
// ============================================
// REPOSITORY
// ============================================
exports.transactionRepository = {
    // ──────────────────────────────────────────────────────────────────────────
    // CREATE DRAFT
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Create a new transaction in draft status.
     * Draft transactions are not yet held and don't affect availability.
     */
    createDraft: async (params, idempotencyKey) => {
        const { businessId } = params;
        const txRef = db.collection(getTransactionsPath(businessId)).doc();
        const txId = txRef.id;
        const now = firestore_1.Timestamp.now();
        // Check idempotency if key provided
        if (idempotencyKey) {
            const idempKey = `tx_draft:${businessId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                // Return the previously created transaction
                const existingTx = await exports.transactionRepository.getById(businessId, existing.resultRef);
                return { success: true, transaction: existingTx };
            }
        }
        // Calculate totals
        const subtotal = params.lineItems.reduce((sum, item) => sum + item.subtotal, 0);
        const fees = 0; // Can be calculated based on business rules
        const total = subtotal + fees;
        const transaction = {
            id: txId,
            businessId,
            type: params.type,
            status: 'draft',
            channel: params.channel,
            actor: params.actor,
            lineItems: params.lineItems,
            timeWindow: params.timeWindow ? {
                start: firestore_1.Timestamp.fromDate(params.timeWindow.start),
                end: firestore_1.Timestamp.fromDate(params.timeWindow.end),
                timezone: params.timeWindow.timezone,
            } : undefined,
            currency: params.currency || 'TRY',
            subtotal,
            fees,
            total,
            sessionId: params.sessionId,
            createdAt: now,
            updatedAt: now,
        };
        // Write transaction and event
        const batch = db.batch();
        batch.set(txRef, transaction);
        const eventRef = db.collection(getEventsPath(businessId, txId)).doc();
        const event = {
            type: 'draft_created',
            actorType: 'system',
            idempotencyKey,
            createdAt: now,
            data: { channel: params.channel },
        };
        batch.set(eventRef, event);
        // Store idempotency record if key provided
        if (idempotencyKey) {
            const idempKey = `tx_draft:${businessId}:${idempotencyKey}`;
            await storeIdempotency(idempKey, 'createDraft', businessId, txId);
        }
        await batch.commit();
        return { success: true, transaction };
    },
    // ──────────────────────────────────────────────────────────────────────────
    // CREATE HOLD (Atomic with Lock Acquisition)
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Create a hold on a draft transaction.
     * Atomically:
     * 1. Verify transaction is in 'draft' status
     * 2. Acquire resource lock (fail if already held/confirmed)
     * 3. Transition to 'hold' status
     * 4. Append hold_created event
     */
    createHold: async (params, idempotencyKey) => {
        var _a;
        const { transactionId, businessId, lockKey, holdDurationMinutes = 10 } = params;
        const now = firestore_1.Timestamp.now();
        const holdExpiresAt = firestore_1.Timestamp.fromMillis(now.toMillis() + holdDurationMinutes * 60 * 1000);
        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_hold:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                const existingTx = await exports.transactionRepository.getById(businessId, transactionId);
                return {
                    success: true,
                    alreadyProcessed: true,
                    transaction: existingTx,
                    holdExpiresAt: (_a = existingTx === null || existingTx === void 0 ? void 0 : existingTx.holdExpiresAt) === null || _a === void 0 ? void 0 : _a.toDate(),
                };
            }
        }
        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
        const lockRef = db.collection(getLocksPath(businessId)).doc(lockKey);
        try {
            const result = await db.runTransaction(async (transaction) => {
                // Read transaction
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' };
                }
                const txData = txDoc.data();
                // Guard: must be in draft status
                if (txData.status !== 'draft') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE',
                        error: `Cannot hold: transaction is in '${txData.status}' status`
                    };
                }
                // Check lock
                const lockDoc = await transaction.get(lockRef);
                if (lockDoc.exists) {
                    const lockData = lockDoc.data();
                    // If lock is held and not expired, fail
                    if (lockData.status === 'held') {
                        if (lockData.expiresAt && lockData.expiresAt.toMillis() > now.toMillis()) {
                            return {
                                success: false,
                                errorCode: 'RESOURCE_UNAVAILABLE',
                                error: 'Slot is already held by another transaction'
                            };
                        }
                        // Lock expired, we can take it
                    }
                    else if (lockData.status === 'confirmed') {
                        return {
                            success: false,
                            errorCode: 'RESOURCE_UNAVAILABLE',
                            error: 'Slot is already booked'
                        };
                    }
                }
                // Acquire lock
                const lock = {
                    lockKey,
                    transactionId,
                    status: 'held',
                    expiresAt: holdExpiresAt,
                    createdAt: now,
                    updatedAt: now,
                };
                transaction.set(lockRef, lock);
                // Update transaction
                transaction.update(txRef, {
                    status: 'hold',
                    holdExpiresAt,
                    holdDurationMinutes,
                    updatedAt: now,
                });
                return {
                    success: true,
                    holdExpiresAt: holdExpiresAt.toDate(),
                };
            });
            if (!result.success) {
                return result;
            }
            // Append event (outside transaction for simplicity)
            await appendEvent(businessId, transactionId, {
                type: 'hold_created',
                actorType: 'system',
                idempotencyKey,
                createdAt: firestore_1.Timestamp.now(),
                data: { lockKey, holdDurationMinutes },
            });
            // Store idempotency
            if (idempotencyKey) {
                const idempKey = `tx_hold:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'createHold', transactionId, transactionId);
            }
            const updatedTx = await exports.transactionRepository.getById(businessId, transactionId);
            return {
                success: true,
                transaction: updatedTx,
                holdExpiresAt: result.holdExpiresAt,
            };
        }
        catch (err) {
            console.error('[Transaction] createHold failed:', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    // ──────────────────────────────────────────────────────────────────────────
    // CONFIRM TRANSACTION
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Confirm a held transaction.
     * Atomically:
     * 1. Verify transaction is in 'hold' status
     * 2. Verify hold has not expired
     * 3. Transition to 'confirmed' status
     * 4. Update lock to 'confirmed'
     * 5. Append confirmed event
     */
    confirmTransaction: async (params, idempotencyKey) => {
        var _a;
        const { transactionId, businessId, actorType, actorId } = params;
        const now = firestore_1.Timestamp.now();
        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_confirm:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing === null || existing === void 0 ? void 0 : existing.result) {
                const existingTx = await exports.transactionRepository.getById(businessId, transactionId);
                return {
                    success: true,
                    alreadyProcessed: true,
                    confirmationCode: (_a = existing.result.data) === null || _a === void 0 ? void 0 : _a.confirmationCode,
                    transaction: existingTx,
                };
            }
        }
        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
        const confirmationCode = generateConfirmationCode();
        try {
            const result = await db.runTransaction(async (transaction) => {
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' };
                }
                const txData = txDoc.data();
                // Guard: must be in hold status
                if (txData.status !== 'hold') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE',
                        error: `Cannot confirm: transaction is in '${txData.status}' status`
                    };
                }
                // Guard: hold must not be expired
                if (txData.holdExpiresAt && txData.holdExpiresAt.toMillis() <= now.toMillis()) {
                    return {
                        success: false,
                        errorCode: 'HOLD_EXPIRED',
                        error: 'Hold has expired'
                    };
                }
                // Update transaction
                transaction.update(txRef, {
                    status: 'confirmed',
                    confirmationCode,
                    confirmedAt: now,
                    updatedAt: now,
                });
                // Find and update the lock
                const locksSnap = await db.collection(getLocksPath(businessId))
                    .where('transactionId', '==', transactionId)
                    .where('status', '==', 'held')
                    .limit(1)
                    .get();
                if (!locksSnap.empty) {
                    const lockRef = locksSnap.docs[0].ref;
                    transaction.update(lockRef, {
                        status: 'confirmed',
                        expiresAt: firestore_1.FieldValue.delete(),
                        updatedAt: now,
                    });
                }
                return { success: true };
            });
            if (!result.success) {
                return result;
            }
            // Append event
            await appendEvent(businessId, transactionId, {
                type: 'confirmed',
                actorType,
                actorId,
                idempotencyKey,
                createdAt: firestore_1.Timestamp.now(),
                data: { confirmationCode },
            });
            // Store idempotency with result
            if (idempotencyKey) {
                const idempKey = `tx_confirm:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'confirmTransaction', transactionId, transactionId, {
                    success: true,
                    data: { confirmationCode },
                });
            }
            const updatedTx = await exports.transactionRepository.getById(businessId, transactionId);
            return {
                success: true,
                confirmationCode,
                transaction: updatedTx,
            };
        }
        catch (err) {
            console.error('[Transaction] confirmTransaction failed:', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    // ──────────────────────────────────────────────────────────────────────────
    // RELEASE HOLD
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Release a hold without confirming.
     * Moves transaction to 'cancelled' and releases the lock.
     */
    releaseHold: async (businessId, transactionId, reason, idempotencyKey) => {
        const now = firestore_1.Timestamp.now();
        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_release:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                return { success: true, alreadyProcessed: true };
            }
        }
        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
        try {
            const result = await db.runTransaction(async (transaction) => {
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' };
                }
                const txData = txDoc.data();
                // Guard: must be in hold status
                if (txData.status !== 'hold') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE',
                        error: `Cannot release: transaction is in '${txData.status}' status`
                    };
                }
                // Update transaction
                transaction.update(txRef, {
                    status: 'cancelled',
                    cancelledAt: now,
                    updatedAt: now,
                });
                // Release the lock
                const locksSnap = await db.collection(getLocksPath(businessId))
                    .where('transactionId', '==', transactionId)
                    .limit(1)
                    .get();
                if (!locksSnap.empty) {
                    transaction.delete(locksSnap.docs[0].ref);
                }
                return { success: true };
            });
            if (!result.success) {
                return result;
            }
            // Append event
            await appendEvent(businessId, transactionId, {
                type: 'hold_released',
                actorType: 'system',
                idempotencyKey,
                createdAt: firestore_1.Timestamp.now(),
                data: { reason },
            });
            // Store idempotency
            if (idempotencyKey) {
                const idempKey = `tx_release:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'releaseHold', transactionId, transactionId);
            }
            return { success: true };
        }
        catch (err) {
            console.error('[Transaction] releaseHold failed:', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL TRANSACTION
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Cancel a confirmed transaction.
     * Does NOT delete the lock (keep for audit).
     */
    cancelTransaction: async (params, idempotencyKey) => {
        const { transactionId, businessId, reason, actorType, actorId } = params;
        const now = firestore_1.Timestamp.now();
        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_cancel:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                return { success: true, alreadyProcessed: true };
            }
        }
        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
        try {
            const result = await db.runTransaction(async (transaction) => {
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' };
                }
                const txData = txDoc.data();
                // Guard: can cancel from hold or confirmed
                if (txData.status !== 'hold' && txData.status !== 'confirmed') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE',
                        error: `Cannot cancel: transaction is in '${txData.status}' status`
                    };
                }
                // Update transaction
                transaction.update(txRef, {
                    status: 'cancelled',
                    cancelledAt: now,
                    updatedAt: now,
                });
                return { success: true };
            });
            if (!result.success) {
                return result;
            }
            // Append event
            await appendEvent(businessId, transactionId, {
                type: 'cancelled',
                actorType,
                actorId,
                idempotencyKey,
                createdAt: firestore_1.Timestamp.now(),
                data: { reason },
            });
            // Store idempotency
            if (idempotencyKey) {
                const idempKey = `tx_cancel:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'cancelTransaction', transactionId, transactionId);
            }
            return { success: true };
        }
        catch (err) {
            console.error('[Transaction] cancelTransaction failed:', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    // ──────────────────────────────────────────────────────────────────────────
    // EXPIRE HOLD (Called by scheduled worker)
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Expire a held transaction.
     * Called by the scheduled expiry worker, not directly by agents.
     */
    expireHold: async (businessId, transactionId) => {
        const now = firestore_1.Timestamp.now();
        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
        await db.runTransaction(async (transaction) => {
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists)
                return;
            const txData = txDoc.data();
            // Only expire if still in hold
            if (txData.status !== 'hold')
                return;
            // Update transaction
            transaction.update(txRef, {
                status: 'expired',
                expiredAt: now,
                updatedAt: now,
            });
            // Release the lock
            const locksSnap = await db.collection(getLocksPath(businessId))
                .where('transactionId', '==', transactionId)
                .limit(1)
                .get();
            if (!locksSnap.empty) {
                transaction.delete(locksSnap.docs[0].ref);
            }
        });
        // Append event
        await appendEvent(businessId, transactionId, {
            type: 'expired',
            actorType: 'system',
            createdAt: firestore_1.Timestamp.now(),
            data: { reason: 'Hold expired without confirmation' },
        });
    },
    // ──────────────────────────────────────────────────────────────────────────
    // READ OPERATIONS
    // ──────────────────────────────────────────────────────────────────────────
    getById: async (businessId, transactionId) => {
        const doc = await db.collection(getTransactionsPath(businessId)).doc(transactionId).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    },
    getExpiredHolds: async (limit = 100) => {
        const now = firestore_1.Timestamp.now();
        // Query across all businesses (requires collection group index)
        const snapshot = await db.collectionGroup('transactions')
            .where('status', '==', 'hold')
            .where('holdExpiresAt', '<=', now)
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => {
            // Path: businesses/{businessId}/transactions/{txId}
            const pathParts = doc.ref.path.split('/');
            return {
                businessId: pathParts[1],
                txId: doc.id,
            };
        });
    },
    getEvents: async (businessId, transactionId) => {
        const snapshot = await db.collection(getEventsPath(businessId, transactionId))
            .orderBy('createdAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
};
// ============================================
// INTERNAL HELPERS
// ============================================
async function appendEvent(businessId, transactionId, event) {
    const eventRef = await db.collection(getEventsPath(businessId, transactionId)).add(event);
    return eventRef.id;
}
async function checkIdempotency(key) {
    const doc = await db.collection(IDEMPOTENCY_COLLECTION).doc(key).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
async function storeIdempotency(key, op, scopeId, resultRef, result) {
    const record = {
        key,
        op,
        scopeId,
        resultRef,
        result,
        createdAt: firestore_1.Timestamp.now(),
        expiresAt: firestore_1.Timestamp.fromDate((0, idempotency_1.calculateIdempotencyExpiry)()),
    };
    await db.collection(IDEMPOTENCY_COLLECTION).doc(key).set(record);
}
//# sourceMappingURL=transaction.repository.js.map