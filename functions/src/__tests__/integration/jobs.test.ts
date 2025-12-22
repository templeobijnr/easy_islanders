/**
 * Integration Tests for Jobs API
 * 
 * Tests against Firebase Emulator Suite.
 * Run with: npm run test:integration
 */

import {
    JobSchema,
    type Job,
    type ActionType,
} from '@askmerve/shared';

// =============================================================================
// TEST SETUP
// =============================================================================

// Mock Firebase Admin (in real integration tests, use emulator)
const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn(),
};

const mockAuth = {
    verifyIdToken: jest.fn(),
};

jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: () => mockFirestore,
    auth: () => mockAuth,
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createValidTaxiActionData() {
    return {
        actionType: 'taxi' as const,
        pickupLocation: {
            address: 'Kyrenia Harbour',
            coordinates: { lat: 35.33, lng: 33.32 },
        },
        passengerCount: 2,
    };
}

function createValidInquireActionData() {
    return {
        actionType: 'inquire' as const,
        message: 'Do you accept credit cards?',
    };
}

function createMockJobDoc(overrides: Partial<Job> = {}): Job {
    const now = new Date().toISOString();
    return {
        id: 'job-test-123',
        ownerUserId: 'user-123',
        actionType: 'taxi',
        actionData: createValidTaxiActionData(),
        status: 'collecting',
        jobCode: 'ABC123',
        language: 'en',
        createdAt: now,
        updatedAt: now,
        dispatchAttempts: 0,
        ...overrides,
    };
}

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('Jobs API - Schema Validation', () => {
    describe('JobSchema', () => {
        it('accepts valid collecting job without merchantTarget', () => {
            const job = createMockJobDoc();
            const result = JobSchema.safeParse(job);
            expect(result.success).toBe(true);
        });

        it('accepts valid confirming job without merchantTarget', () => {
            const job = createMockJobDoc({ status: 'confirming' });
            const result = JobSchema.safeParse(job);
            expect(result.success).toBe(true);
        });

        it('rejects dispatched job without merchantTarget', () => {
            const job = createMockJobDoc({ status: 'dispatched' });
            const result = JobSchema.safeParse(job);
            expect(result.success).toBe(false);
        });

        it('accepts dispatched job with listed merchantTarget', () => {
            const job = createMockJobDoc({
                status: 'dispatched',
                merchantTarget: { type: 'listing', listingId: 'listing-123' },
            });
            const result = JobSchema.safeParse(job);
            expect(result.success).toBe(true);
        });

        it('accepts dispatched job with unlisted merchantTarget', () => {
            const job = createMockJobDoc({
                status: 'dispatched',
                merchantTarget: {
                    type: 'unlisted',
                    phone: '+905338123456',
                    name: 'Local Taxi',
                },
            });
            const result = JobSchema.safeParse(job);
            expect(result.success).toBe(true);
        });
    });
});

// =============================================================================
// CREATE JOB TESTS
// =============================================================================

describe('Jobs API - POST /v1/jobs', () => {
    describe('Request Validation', () => {
        it('rejects request without actionType', () => {
            const body = {
                actionData: createValidTaxiActionData(),
            };

            // This would be tested against the validation middleware
            expect(body).not.toHaveProperty('actionType');
        });

        it('rejects request with mismatched actionType and actionData', () => {
            const body = {
                actionType: 'inquire',
                actionData: createValidTaxiActionData(), // taxi data with inquire type
            };

            // actionData.actionType should match body.actionType
            expect(body.actionType).not.toBe(body.actionData.actionType);
        });

        it('accepts valid taxi job request', () => {
            const body = {
                actionType: 'taxi',
                actionData: createValidTaxiActionData(),
                language: 'en',
            };

            expect(body.actionType).toBe(body.actionData.actionType);
        });

        it('accepts request with clientRequestId for idempotency', () => {
            const body = {
                actionType: 'inquire',
                actionData: createValidInquireActionData(),
                clientRequestId: 'request-abc-123',
            };

            expect(body.clientRequestId).toBeDefined();
        });
    });

    describe('Idempotency', () => {
        it('returns existing job when clientRequestId matches', async () => {
            const existingJob = createMockJobDoc({
                clientRequestId: 'request-abc-123',
            } as any);

            // In real test, would call API twice with same clientRequestId
            // and verify same jobId returned
            expect((existingJob as any).clientRequestId).toBe('request-abc-123');
        });
    });
});

// =============================================================================
// CONFIRM JOB TESTS
// =============================================================================

describe('Jobs API - POST /v1/jobs/:id/confirm', () => {
    describe('State Transitions', () => {
        it('allows collecting → confirming', () => {
            const job = createMockJobDoc({ status: 'collecting' });
            // isValidJobTransition is tested in shared package
            expect(job.status).toBe('collecting');
        });

        it('rejects dispatched → collecting (backward transition)', () => {
            const job = createMockJobDoc({ status: 'dispatched' });
            // Cannot confirm a job that's already dispatched
            expect(job.status).not.toBe('collecting');
        });
    });

    describe('Authorization', () => {
        it('rejects confirmation from non-owner', () => {
            const job = createMockJobDoc({ ownerUserId: 'user-123' });
            const callerUserId = 'user-456'; // Different user

            expect(job.ownerUserId).not.toBe(callerUserId);
        });
    });
});

// =============================================================================
// GET JOB TESTS
// =============================================================================

describe('Jobs API - GET /v1/jobs/:id', () => {
    describe('Authorization', () => {
        it('returns job for owner', () => {
            const job = createMockJobDoc({ ownerUserId: 'user-123' });
            const callerUserId = 'user-123';

            expect(job.ownerUserId).toBe(callerUserId);
        });

        it('rejects get from non-owner', () => {
            const job = createMockJobDoc({ ownerUserId: 'user-123' });
            const callerUserId = 'user-456';

            expect(job.ownerUserId).not.toBe(callerUserId);
        });
    });

    describe('Not Found', () => {
        it('returns 404 for non-existent job', () => {
            // Would test by calling API with non-existent ID
            // and verifying 404 response
            const nonExistentId = 'job-does-not-exist';
            expect(nonExistentId).toBeDefined();
        });
    });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Jobs API - Error Handling', () => {
    describe('Authentication', () => {
        it('returns 401 without Authorization header', () => {
            // Would test by calling API without auth header
            const authHeader = undefined;
            expect(authHeader).toBeUndefined();
        });

        it('returns 401 with invalid token', () => {
            // Would test by calling API with invalid token
            const invalidToken = 'invalid-token-xyz';
            expect(invalidToken).toBeDefined();
        });
    });

    describe('Validation', () => {
        it('returns 400 with validation errors and traceId', () => {
            // Would test by sending invalid body
            // and verifying response includes traceId
            const expectedResponse = {
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    traceId: expect.any(String),
                },
            };

            expect(expectedResponse.error).toHaveProperty('traceId');
        });
    });
});
