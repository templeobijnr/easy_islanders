import { getErrorMessage } from '../utils/errors';
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

import { getFirestore, Timestamp, FieldValue, DocumentSnapshot, DocumentReference, Transaction as FirestoreTransaction } from 'firebase-admin/firestore';
import type {
    Transaction,
    TxEvent,
    ResourceLock,
    CreateDraftParams,
    CreateDraftResult,
    CreateHoldParams,
    CreateHoldResult,
    ConfirmTransactionParams,
    ConfirmResult,
    CancelTransactionParams,
    CancelResult,
} from '../types/transaction';
import type { IdempotencyRecord, IdempotencyOperation } from '../types/idempotency';
import { calculateIdempotencyExpiry } from '../types/idempotency';

/**
 * Firestore accessor (lazy).
 *
 * Why:
 * - Avoid module-scope initialization crashes in unit tests (and align with
 *   "no module-scope side effects" where possible).
 * - Allow Jest to mock `getFirestore()` cleanly.
 */
function getDb() {
    return getFirestore();
}

// Proxy the Firestore instance so existing `db.*` usage stays readable without eager init.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = new Proxy(
    {},
    {
        get(_target, prop) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (getDb() as any)[prop as any];
        },
    }
);

// ============================================
// COLLECTION PATH HELPERS
// ============================================

const getTransactionsPath = (businessId: string) =>
    `businesses/${businessId}/transactions`;

const getEventsPath = (businessId: string, txId: string) =>
    `businesses/${businessId}/transactions/${txId}/events`;

const getLocksPath = (businessId: string) =>
    `businesses/${businessId}/resourceLocks`;

const IDEMPOTENCY_COLLECTION = 'idempotency';

// ============================================
// CONFIRMATION CODE GENERATOR
// ============================================

function generateConfirmationCode(): string {
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

export const transactionRepository = {
    // ──────────────────────────────────────────────────────────────────────────
    // CREATE DRAFT
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Create a new transaction in draft status.
     * Draft transactions are not yet held and don't affect availability.
     */
    createDraft: async (
        params: CreateDraftParams,
        idempotencyKey?: string
    ): Promise<CreateDraftResult> => {
        const { businessId } = params;
        const txRef = db.collection(getTransactionsPath(businessId)).doc();
        const txId = txRef.id;
        const now = Timestamp.now();

        // Check idempotency if key provided
        if (idempotencyKey) {
            const idempKey = `tx_draft:${businessId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                // Return the previously created transaction
                const existingTx = await transactionRepository.getById(businessId, existing.resultRef!);
                return { success: true, transaction: existingTx! };
            }
        }

        // Calculate totals
        const subtotal = params.lineItems.reduce((sum, item) => sum + item.subtotal, 0);
        const fees = 0; // Can be calculated based on business rules
        const total = subtotal + fees;

        const transaction: Transaction = {
            id: txId,
            businessId,
            type: params.type,
            status: 'draft',
            channel: params.channel,
            actor: params.actor,
            lineItems: params.lineItems,
            timeWindow: params.timeWindow ? {
                start: Timestamp.fromDate(params.timeWindow.start),
                end: Timestamp.fromDate(params.timeWindow.end),
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
        const event: Omit<TxEvent, 'id'> = {
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
    createHold: async (
        params: CreateHoldParams,
        idempotencyKey?: string
    ): Promise<CreateHoldResult> => {
        const { transactionId, businessId, lockKey, holdDurationMinutes = 10 } = params;
        const now = Timestamp.now();
        const holdExpiresAt = Timestamp.fromMillis(now.toMillis() + holdDurationMinutes * 60 * 1000);

        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_hold:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                const existingTx = await transactionRepository.getById(businessId, transactionId);
                return {
                    success: true,
                    alreadyProcessed: true,
                    transaction: existingTx!,
                    holdExpiresAt: existingTx?.holdExpiresAt?.toDate(),
                };
            }
        }

        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId) as DocumentReference;
        const lockRef = db.collection(getLocksPath(businessId)).doc(lockKey) as DocumentReference;

        try {
            const result = await db.runTransaction(async (transaction: FirestoreTransaction) => {
                // Read transaction
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' as const };
                }

                const txData = txDoc.data() as Transaction;

                // Guard: must be in draft status
                if (txData.status !== 'draft') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE' as const,
                        error: `Cannot hold: transaction is in '${txData.status}' status`
                    };
                }

                // Check lock
                const lockDoc = await transaction.get(lockRef);
                if (lockDoc.exists) {
                    const lockData = lockDoc.data() as ResourceLock;

                    // If lock is held and not expired, fail
                    if (lockData.status === 'held') {
                        if (lockData.expiresAt && lockData.expiresAt.toMillis() > now.toMillis()) {
                            return {
                                success: false,
                                errorCode: 'RESOURCE_UNAVAILABLE' as const,
                                error: 'Slot is already held by another transaction'
                            };
                        }
                        // Lock expired, we can take it
                    } else if (lockData.status === 'confirmed') {
                        return {
                            success: false,
                            errorCode: 'RESOURCE_UNAVAILABLE' as const,
                            error: 'Slot is already booked'
                        };
                    }
                }

                // Acquire lock
                const lock: ResourceLock = {
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
                return result as CreateHoldResult;
            }

            // Append event (outside transaction for simplicity)
            await appendEvent(businessId, transactionId, {
                type: 'hold_created',
                actorType: 'system',
                idempotencyKey,
                createdAt: Timestamp.now(),
                data: { lockKey, holdDurationMinutes },
            });

            // Store idempotency
            if (idempotencyKey) {
                const idempKey = `tx_hold:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'createHold', transactionId, transactionId);
            }

            const updatedTx = await transactionRepository.getById(businessId, transactionId);
            return {
                success: true,
                transaction: updatedTx!,
                holdExpiresAt: result.holdExpiresAt,
            };

        } catch (err: unknown) {
            console.error('[Transaction] createHold failed:', err);
            return { success: false, error: getErrorMessage(err) };
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
    confirmTransaction: async (
        params: ConfirmTransactionParams,
        idempotencyKey?: string
    ): Promise<ConfirmResult> => {
        const { transactionId, businessId, actorType, actorId } = params;
        const now = Timestamp.now();

        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_confirm:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing?.result) {
                const existingTx = await transactionRepository.getById(businessId, transactionId);
                return {
                    success: true,
                    alreadyProcessed: true,
                    confirmationCode: existing.result.data?.confirmationCode,
                    transaction: existingTx!,
                };
            }
        }

        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId) as DocumentReference;
        const confirmationCode = generateConfirmationCode();

        try {
            const result = await db.runTransaction(async (transaction: FirestoreTransaction) => {
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' as const };
                }

                const txData = txDoc.data() as Transaction;

                // Guard: must be in hold status
                if (txData.status !== 'hold') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE' as const,
                        error: `Cannot confirm: transaction is in '${txData.status}' status`
                    };
                }

                // Guard: hold must not be expired
                if (txData.holdExpiresAt && txData.holdExpiresAt.toMillis() <= now.toMillis()) {
                    return {
                        success: false,
                        errorCode: 'HOLD_EXPIRED' as const,
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
                        expiresAt: FieldValue.delete(),
                        updatedAt: now,
                    });
                }

                return { success: true };
            });

            if (!result.success) {
                return result as ConfirmResult;
            }

            // Append event
            await appendEvent(businessId, transactionId, {
                type: 'confirmed',
                actorType,
                actorId,
                idempotencyKey,
                createdAt: Timestamp.now(),
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

            const updatedTx = await transactionRepository.getById(businessId, transactionId);
            return {
                success: true,
                confirmationCode,
                transaction: updatedTx!,
            };

        } catch (err: unknown) {
            console.error('[Transaction] confirmTransaction failed:', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // RELEASE HOLD
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Release a hold without confirming.
     * Moves transaction to 'cancelled' and releases the lock.
     */
    releaseHold: async (
        businessId: string,
        transactionId: string,
        reason: string,
        idempotencyKey?: string
    ): Promise<CancelResult> => {
        const now = Timestamp.now();

        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_release:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                return { success: true, alreadyProcessed: true };
            }
        }

        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId) as DocumentReference;

        try {
            const result = await db.runTransaction(async (transaction: FirestoreTransaction) => {
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' as const };
                }

                const txData = txDoc.data() as Transaction;

                // Guard: must be in hold status
                if (txData.status !== 'hold') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE' as const,
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
                createdAt: Timestamp.now(),
                data: { reason },
            });

            // Store idempotency
            if (idempotencyKey) {
                const idempKey = `tx_release:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'releaseHold', transactionId, transactionId);
            }

            return { success: true };

        } catch (err: unknown) {
            console.error('[Transaction] releaseHold failed:', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL TRANSACTION
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Cancel a confirmed transaction.
     * Does NOT delete the lock (keep for audit).
     */
    cancelTransaction: async (
        params: CancelTransactionParams,
        idempotencyKey?: string
    ): Promise<CancelResult> => {
        const { transactionId, businessId, reason, actorType, actorId } = params;
        const now = Timestamp.now();

        // Check idempotency
        if (idempotencyKey) {
            const idempKey = `tx_cancel:${transactionId}:${idempotencyKey}`;
            const existing = await checkIdempotency(idempKey);
            if (existing) {
                return { success: true, alreadyProcessed: true };
            }
        }

        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId) as DocumentReference;

        try {
            const result = await db.runTransaction(async (transaction: FirestoreTransaction) => {
                const txDoc = await transaction.get(txRef);
                if (!txDoc.exists) {
                    return { success: false, errorCode: 'TRANSACTION_NOT_FOUND' as const };
                }

                const txData = txDoc.data() as Transaction;

                // Guard: can cancel from hold or confirmed
                if (txData.status !== 'hold' && txData.status !== 'confirmed') {
                    return {
                        success: false,
                        errorCode: 'INVALID_STATE' as const,
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
                createdAt: Timestamp.now(),
                data: { reason },
            });

            // Store idempotency
            if (idempotencyKey) {
                const idempKey = `tx_cancel:${transactionId}:${idempotencyKey}`;
                await storeIdempotency(idempKey, 'cancelTransaction', transactionId, transactionId);
            }

            return { success: true };

        } catch (err: unknown) {
            console.error('[Transaction] cancelTransaction failed:', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // EXPIRE HOLD (Called by scheduled worker)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Expire a held transaction.
     * Called by the scheduled expiry worker, not directly by agents.
     */
    expireHold: async (businessId: string, transactionId: string): Promise<void> => {
        const now = Timestamp.now();
        const txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId) as DocumentReference;

        await db.runTransaction(async (transaction: FirestoreTransaction) => {
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists) return;

            const txData = txDoc.data() as Transaction;

            // Only expire if still in hold
            if (txData.status !== 'hold') return;

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
            createdAt: Timestamp.now(),
            data: { reason: 'Hold expired without confirmation' },
        });
    },

    // ──────────────────────────────────────────────────────────────────────────
    // READ OPERATIONS
    // ──────────────────────────────────────────────────────────────────────────

    getById: async (businessId: string, transactionId: string): Promise<Transaction | null> => {
        const doc = await db.collection(getTransactionsPath(businessId)).doc(transactionId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Transaction;
    },

    getExpiredHolds: async (limit: number = 100): Promise<Array<{ businessId: string; txId: string }>> => {
        const now = Timestamp.now();
        // Query across all businesses (requires collection group index)
        const snapshot = await db.collectionGroup('transactions')
            .where('status', '==', 'hold')
            .where('holdExpiresAt', '<=', now)
            .limit(limit)
            .get();

        return snapshot.docs.map((doc: DocumentSnapshot) => {
            // Path: businesses/{businessId}/transactions/{txId}
            const pathParts = doc.ref.path.split('/');
            return {
                businessId: pathParts[1],
                txId: doc.id,
            };
        });
    },

    getEvents: async (businessId: string, transactionId: string): Promise<TxEvent[]> => {
        const snapshot = await db.collection(getEventsPath(businessId, transactionId))
            .orderBy('createdAt', 'asc')
            .get();

        return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() } as TxEvent));
    },
};

// ============================================
// INTERNAL HELPERS
// ============================================

async function appendEvent(
    businessId: string,
    transactionId: string,
    event: Omit<TxEvent, 'id'>
): Promise<string> {
    const eventRef = await db.collection(getEventsPath(businessId, transactionId)).add(event);
    return eventRef.id;
}

async function checkIdempotency(key: string): Promise<IdempotencyRecord | null> {
    const doc = await db.collection(IDEMPOTENCY_COLLECTION).doc(key).get();
    if (!doc.exists) return null;
    return doc.data() as IdempotencyRecord;
}

async function storeIdempotency(
    key: string,
    op: IdempotencyOperation,
    scopeId: string,
    resultRef: string,
    result?: IdempotencyRecord['result']
): Promise<void> {
    const record: IdempotencyRecord = {
        key,
        op,
        scopeId,
        resultRef,
        result,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(calculateIdempotencyExpiry()),
    };
    await db.collection(IDEMPOTENCY_COLLECTION).doc(key).set(record);
}

export { appendEvent };
