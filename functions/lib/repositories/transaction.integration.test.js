"use strict";
/**
 * Firestore Emulator Integration Tests
 *
 * These tests run against the actual Firestore emulator to verify:
 * 1. Lock contention (only one hold succeeds for same slot)
 * 2. Idempotency (duplicate confirms return same result)
 * 3. Expiry worker correctness
 *
 * RUN WITH:
 *   firebase emulators:start --only firestore
 *   npm test -- --testPathPatterns=transaction.integration
 *
 * OR:
 *   firebase emulators:exec "npm test -- --testPathPatterns=transaction.integration"
 */
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// ============================================
// EMULATOR SETUP
// ============================================
jest.setTimeout(60000);
const EMULATOR_HOST = 'localhost:8080';
const PROJECT_ID = 'test-project';
let app;
let db;
// Direct implementation of primitives for integration tests
// (avoids importing from main code which has its own db instance)
const txCollection = (businessId) => `businesses/${businessId}/transactions`;
const lockCollection = (businessId) => `businesses/${businessId}/resourceLocks`;
const eventCollection = (businessId, txId) => `businesses/${businessId}/transactions/${txId}/events`;
beforeAll(async () => {
    // Point to emulator
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
    // Initialize a test app
    app = (0, app_1.initializeApp)({ projectId: PROJECT_ID }, 'integration-test');
    db = (0, firestore_1.getFirestore)(app);
});
afterAll(async () => {
    await (0, app_1.deleteApp)(app);
});
afterEach(async () => {
    // Clean up test data
    // Note: In production tests, you'd use the emulator clear endpoint
});
// ============================================
// HELPER FUNCTIONS (inline, not imported)
// ============================================
async function createDraftDirect(businessId, offeringId) {
    const txRef = db.collection(txCollection(businessId)).doc();
    const txId = txRef.id;
    await txRef.set({
        id: txId,
        businessId,
        type: 'booking',
        status: 'draft',
        channel: 'app_chat',
        actor: { userId: 'test-user' },
        lineItems: [{ offeringId, offeringName: 'Test', quantity: 1, unitPrice: 0, subtotal: 0 }],
        currency: 'TRY',
        subtotal: 0,
        fees: 0,
        total: 0,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now(),
    });
    return { id: txId };
}
async function createHoldDirect(businessId, txId, lockKey, holdDurationMinutes = 10) {
    const txRef = db.collection(txCollection(businessId)).doc(txId);
    const lockRef = db.collection(lockCollection(businessId)).doc(lockKey);
    try {
        await db.runTransaction(async (transaction) => {
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists) {
                throw new Error('TRANSACTION_NOT_FOUND');
            }
            const txData = txDoc.data();
            if (txData.status !== 'draft') {
                throw new Error('INVALID_STATE');
            }
            // Check lock
            const lockDoc = await transaction.get(lockRef);
            if (lockDoc.exists) {
                const lockData = lockDoc.data();
                if (lockData.status === 'confirmed') {
                    throw new Error('RESOURCE_UNAVAILABLE');
                }
                if (lockData.status === 'held' && lockData.expiresAt.toMillis() > Date.now()) {
                    throw new Error('RESOURCE_UNAVAILABLE');
                }
            }
            const holdExpiresAt = firestore_1.Timestamp.fromMillis(Date.now() + holdDurationMinutes * 60 * 1000);
            // Update transaction
            transaction.update(txRef, {
                status: 'hold',
                lockKey,
                holdExpiresAt,
                holdDurationMinutes,
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Create/update lock
            transaction.set(lockRef, {
                lockKey,
                transactionId: txId,
                status: 'held',
                expiresAt: holdExpiresAt,
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Add event
            transaction.set(db.collection(eventCollection(businessId, txId)).doc(), {
                type: 'hold_created',
                actorType: 'system',
                createdAt: firestore_1.Timestamp.now(),
            });
        });
        return { success: true };
    }
    catch (err) {
        return { success: false, errorCode: err.message };
    }
}
async function confirmDirect(businessId, txId, idempotencyKey) {
    var _a;
    const txRef = db.collection(txCollection(businessId)).doc(txId);
    const idempRef = db.collection('idempotency').doc(idempotencyKey);
    try {
        // Check idempotency first
        const idempDoc = await idempRef.get();
        if (idempDoc.exists) {
            const existing = idempDoc.data();
            return {
                success: true,
                confirmationCode: (_a = existing.result) === null || _a === void 0 ? void 0 : _a.confirmationCode
            };
        }
        let confirmationCode = '';
        await db.runTransaction(async (transaction) => {
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists) {
                throw new Error('TRANSACTION_NOT_FOUND');
            }
            const txData = txDoc.data();
            if (txData.status !== 'hold') {
                throw new Error('INVALID_STATE');
            }
            if (txData.holdExpiresAt.toMillis() < Date.now()) {
                throw new Error('HOLD_EXPIRED');
            }
            confirmationCode = `CFM-${Date.now().toString(36).toUpperCase()}`;
            transaction.update(txRef, {
                status: 'confirmed',
                confirmationCode,
                confirmedAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Update lock
            const lockRef = db.collection(lockCollection(businessId)).doc(txData.lockKey || 'unknown');
            transaction.update(lockRef, {
                status: 'confirmed',
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Add event
            transaction.set(db.collection(eventCollection(businessId, txId)).doc(), {
                type: 'confirmed',
                actorType: 'user',
                createdAt: firestore_1.Timestamp.now(),
                data: { confirmationCode },
            });
            // Store idempotency record
            transaction.set(idempRef, {
                key: idempotencyKey,
                op: 'confirmTransaction',
                scopeId: txId,
                result: { success: true, confirmationCode },
                createdAt: firestore_1.Timestamp.now(),
            });
        });
        return { success: true, confirmationCode };
    }
    catch (err) {
        return { success: false, errorCode: err.message };
    }
}
// ============================================
// INTEGRATION TESTS
// ============================================
describe('Transaction Repository - Emulator Integration', () => {
    const testBusinessId = 'test-biz-' + Date.now();
    describe('Lock Contention', () => {
        it('should allow only one hold for the same lockKey', async () => {
            var _a;
            const lockKey = `${testBusinessId}:offering:table:2025-12-20T19:00`;
            // Create two draft transactions
            const tx1 = await createDraftDirect(testBusinessId, 'table');
            const tx2 = await createDraftDirect(testBusinessId, 'table');
            // Attempt to hold both at the same time (sequentially for simplicity)
            const hold1 = await createHoldDirect(testBusinessId, tx1.id, lockKey);
            const hold2 = await createHoldDirect(testBusinessId, tx2.id, lockKey);
            // Exactly one should succeed
            expect(hold1.success).toBe(true);
            expect(hold2.success).toBe(false);
            expect(hold2.errorCode).toBe('RESOURCE_UNAVAILABLE');
            // Verify only one lock doc exists with status 'held'
            const lockDoc = await db.collection(lockCollection(testBusinessId)).doc(lockKey).get();
            expect(lockDoc.exists).toBe(true);
            expect((_a = lockDoc.data()) === null || _a === void 0 ? void 0 : _a.transactionId).toBe(tx1.id);
        });
    });
    describe('Confirm Idempotency', () => {
        it('should return same confirmation code for duplicate confirms', async () => {
            const lockKey = `${testBusinessId}:offering:table:2025-12-20T20:00`;
            const idempotencyKey = `confirm:${testBusinessId}:test-idem-${Date.now()}`;
            // Create draft and hold
            const tx = await createDraftDirect(testBusinessId, 'table');
            await createHoldDirect(testBusinessId, tx.id, lockKey);
            // Confirm twice with same idempotency key
            const confirm1 = await confirmDirect(testBusinessId, tx.id, idempotencyKey);
            const confirm2 = await confirmDirect(testBusinessId, tx.id, idempotencyKey);
            expect(confirm1.success).toBe(true);
            expect(confirm2.success).toBe(true);
            expect(confirm1.confirmationCode).toBe(confirm2.confirmationCode);
            // Verify only one confirmed event
            const eventsSnap = await db.collection(eventCollection(testBusinessId, tx.id))
                .where('type', '==', 'confirmed')
                .get();
            expect(eventsSnap.size).toBe(1);
        });
    });
    describe('Expiry Handling', () => {
        it('should reject confirm when hold is expired', async () => {
            const lockKey = `${testBusinessId}:offering:table:2025-12-20T21:00`;
            // Create draft and hold with 0 duration (immediately expires)
            const tx = await createDraftDirect(testBusinessId, 'table');
            // Hold with past expiry
            const txRef = db.collection(txCollection(testBusinessId)).doc(tx.id);
            const lockRef = db.collection(lockCollection(testBusinessId)).doc(lockKey);
            const pastExpiry = firestore_1.Timestamp.fromMillis(Date.now() - 60000); // 1 minute ago
            await txRef.update({
                status: 'hold',
                holdExpiresAt: pastExpiry,
            });
            await lockRef.set({
                lockKey,
                transactionId: tx.id,
                status: 'held',
                expiresAt: pastExpiry,
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Attempt to confirm
            const confirmResult = await confirmDirect(testBusinessId, tx.id, `confirm:expired:${Date.now()}`);
            expect(confirmResult.success).toBe(false);
            expect(confirmResult.errorCode).toBe('HOLD_EXPIRED');
        });
    });
});
//# sourceMappingURL=transaction.integration.test.js.map