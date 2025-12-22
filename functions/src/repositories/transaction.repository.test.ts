/**
 * Transaction Repository Tests
 * 
 * Run with: npm test -- --testPathPatterns=transaction.repository.test
 * 
 * These tests verify:
 * 1. State machine guards (draft → hold → confirmed)
 * 2. Concurrency control (lock acquisition)
 * 3. Idempotency (duplicate calls return same result)
 * 4. Expiry handling
 */

import type { CreateDraftParams, CreateHoldParams } from '../types/transaction';

// ============================================
// MOCK SETUP
// ============================================

// Track doc paths for conditional mock responses
let mockDocResponses: Record<string, any> = {};

const mockTransaction = {
    get: jest.fn((ref: any) => {
        const path = ref?.id || ref?.path || '';
        // Return based on path
        for (const [pattern, response] of Object.entries(mockDocResponses)) {
            if (path.includes(pattern) || pattern === '*') {
                return Promise.resolve(response);
            }
        }
        return Promise.resolve({ exists: false });
    }),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

const createMockDoc = (id: string) => ({
    id,
    get: jest.fn().mockResolvedValue({ exists: false }),
    set: jest.fn(),
});

const mockCollection = {
    doc: jest.fn((id?: string) => createMockDoc(id || 'auto-id')),
    add: jest.fn().mockResolvedValue({ id: 'event123' }),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
};

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => ({
        collection: jest.fn(() => mockCollection),
        collectionGroup: jest.fn(() => mockCollection),
        runTransaction: jest.fn(async (callback) => callback(mockTransaction)),
        batch: jest.fn(() => ({
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        })),
    })),
    Timestamp: {
        now: jest.fn(() => ({
            toMillis: () => Date.now(),
            toDate: () => new Date(),
        })),
        fromMillis: jest.fn((ms) => ({
            toMillis: () => ms,
            toDate: () => new Date(ms),
        })),
        fromDate: jest.fn((date) => ({
            toMillis: () => date.getTime(),
            toDate: () => date,
        })),
    },
    FieldValue: {
        delete: jest.fn(() => '__DELETE__'),
        serverTimestamp: jest.fn(() => '__SERVER_TIMESTAMP__'),
    },
}));

// Import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transactionRepository } = require('./transaction.repository');

describe('transactionRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDocResponses = {};
    });

    // =============================================
    // A) STATE MACHINE GUARD TESTS
    // =============================================

    describe('State Machine Guards', () => {
        it('should allow hold from draft status', async () => {
            // Arrange: transaction in draft, no lock
            let callCount = 0;
            mockTransaction.get.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // First call: transaction doc
                    return {
                        exists: true,
                        data: () => ({
                            id: 'tx123',
                            businessId: 'biz1',
                            status: 'draft',
                        }),
                    };
                }
                // Second call: lock doc (doesn't exist)
                return { exists: false };
            });

            // Mock idempotency check to return not found
            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn(),
            });

            const params: CreateHoldParams = {
                transactionId: 'tx123',
                businessId: 'biz1',
                lockKey: 'table:2025-12-20:19:00',
                holdDurationMinutes: 10,
            };

            // Act
            const result = await transactionRepository.createHold(params);

            // Assert
            expect(result.success).toBe(true);
            expect(result.holdExpiresAt).toBeDefined();
        });

        it('should reject hold from confirmed status', async () => {
            // Arrange: transaction in confirmed status
            mockTransaction.get.mockImplementation(async () => ({
                exists: true,
                data: () => ({
                    id: 'tx123',
                    businessId: 'biz1',
                    status: 'confirmed',
                }),
            }));

            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            const params: CreateHoldParams = {
                transactionId: 'tx123',
                businessId: 'biz1',
                lockKey: 'table:2025-12-20:19:00',
            };

            // Act
            const result = await transactionRepository.createHold(params);

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_STATE');
        });

        it('should reject confirm from draft status', async () => {
            // Arrange: transaction in draft status
            mockTransaction.get.mockImplementation(async () => ({
                exists: true,
                data: () => ({
                    id: 'tx123',
                    businessId: 'biz1',
                    status: 'draft',
                }),
            }));

            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            // Act
            const result = await transactionRepository.confirmTransaction({
                transactionId: 'tx123',
                businessId: 'biz1',
                actorType: 'user',
            });

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_STATE');
        });

        it('should reject confirm when hold is expired', async () => {
            const pastTime = Date.now() - 60 * 1000; // 1 minute ago

            mockTransaction.get.mockImplementation(async () => ({
                exists: true,
                data: () => ({
                    id: 'tx123',
                    businessId: 'biz1',
                    status: 'hold',
                    holdExpiresAt: { toMillis: () => pastTime },
                }),
            }));

            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            // Act
            const result = await transactionRepository.confirmTransaction({
                transactionId: 'tx123',
                businessId: 'biz1',
                actorType: 'user',
            });

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('HOLD_EXPIRED');
        });
    });

    // =============================================
    // B) CONCURRENCY TESTS (Lock Acquisition)
    // =============================================

    describe('Concurrency Control', () => {
        it('should fail hold when slot is already held', async () => {
            const futureTime = Date.now() + 5 * 60 * 1000;

            let callCount = 0;
            mockTransaction.get.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // Transaction doc
                    return {
                        exists: true,
                        data: () => ({ status: 'draft' }),
                    };
                }
                // Lock doc - exists and not expired
                return {
                    exists: true,
                    data: () => ({
                        lockKey: 'table:2025-12-20:19:00',
                        transactionId: 'other-tx',
                        status: 'held',
                        expiresAt: { toMillis: () => futureTime },
                    }),
                };
            });

            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            const params: CreateHoldParams = {
                transactionId: 'tx123',
                businessId: 'biz1',
                lockKey: 'table:2025-12-20:19:00',
            };

            // Act
            const result = await transactionRepository.createHold(params);

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('RESOURCE_UNAVAILABLE');
        });

        it('should fail hold when slot is confirmed', async () => {
            let callCount = 0;
            mockTransaction.get.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        exists: true,
                        data: () => ({ status: 'draft' }),
                    };
                }
                return {
                    exists: true,
                    data: () => ({
                        lockKey: 'table:2025-12-20:19:00',
                        transactionId: 'other-tx',
                        status: 'confirmed',
                    }),
                };
            });

            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            const params: CreateHoldParams = {
                transactionId: 'tx123',
                businessId: 'biz1',
                lockKey: 'table:2025-12-20:19:00',
            };

            // Act
            const result = await transactionRepository.createHold(params);

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('RESOURCE_UNAVAILABLE');
        });

        it('should succeed hold when previous hold expired', async () => {
            const pastTime = Date.now() - 60 * 1000;

            let callCount = 0;
            mockTransaction.get.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        exists: true,
                        data: () => ({ status: 'draft' }),
                    };
                }
                // Lock exists but expired
                return {
                    exists: true,
                    data: () => ({
                        lockKey: 'table:2025-12-20:19:00',
                        transactionId: 'expired-tx',
                        status: 'held',
                        expiresAt: { toMillis: () => pastTime },
                    }),
                };
            });

            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            const params: CreateHoldParams = {
                transactionId: 'tx123',
                businessId: 'biz1',
                lockKey: 'table:2025-12-20:19:00',
            };

            // Act
            const result = await transactionRepository.createHold(params);

            // Assert
            expect(result.success).toBe(true);
        });
    });

    // =============================================
    // C) TRANSACTION NOT FOUND
    // =============================================

    describe('Transaction Not Found', () => {
        it('should return TRANSACTION_NOT_FOUND for missing transaction', async () => {
            mockTransaction.get.mockResolvedValue({ exists: false });
            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'missing-tx',
                get: jest.fn().mockResolvedValue({ exists: false }),
            });

            const result = await transactionRepository.createHold({
                transactionId: 'missing-tx',
                businessId: 'biz1',
                lockKey: 'table:2025-12-20:19:00',
            });

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('TRANSACTION_NOT_FOUND');
        });
    });

    // =============================================
    // D) CREATE DRAFT
    // =============================================

    describe('createDraft', () => {
        it('should create a draft transaction with correct totals', async () => {
            mockCollection.doc = jest.fn().mockReturnValue({
                id: 'tx123',
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn(),
            });

            const params: CreateDraftParams = {
                businessId: 'biz1',
                type: 'booking',
                channel: 'app_chat',
                actor: { userId: 'user123', name: 'Test User' },
                lineItems: [
                    {
                        offeringId: 'offering1',
                        offeringName: 'Spa Treatment',
                        quantity: 1,
                        unitPrice: 50,
                        subtotal: 50,
                    },
                ],
                timeWindow: {
                    start: new Date('2025-12-20T19:00:00'),
                    end: new Date('2025-12-20T20:00:00'),
                },
                currency: 'EUR',
            };

            const result = await transactionRepository.createDraft(params);

            expect(result.success).toBe(true);
            expect(result.transaction).toBeDefined();
            expect(result.transaction?.status).toBe('draft');
            expect(result.transaction?.total).toBe(50);
        });
    });
});
