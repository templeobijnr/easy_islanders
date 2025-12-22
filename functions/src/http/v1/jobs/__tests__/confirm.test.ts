/**
 * Tests for POST /v1/jobs/:id/confirm endpoint
 */
// IMPORTANT:
// Import modules AFTER mocks are registered. Static `import` is hoisted and would
// load real modules before Jest mocks apply.

// Mock dependencies before imports
jest.mock('firebase-admin', () => {
    const mockJobRef = {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
    };
    return {
        firestore: jest.fn(() => ({
            collection: jest.fn(() => ({
                doc: jest.fn(() => mockJobRef),
            })),
        })),
        _mockJobRef: mockJobRef, // Expose for tests
    };
});

jest.mock('@askmerve/shared', () => ({
    ...jest.requireActual('@askmerve/shared'),
    isValidJobTransition: jest.fn(),
}));

// Mock lib middleware with proper error classes
const mockErrors = {
    notFound: jest.fn((name: string) => {
        const err = new Error(`${name} not found`);
        (err as any).statusCode = 404;
        return err;
    }),
    forbidden: jest.fn((msg: string) => {
        const err = new Error(msg);
        (err as any).statusCode = 403;
        return err;
    }),
    invalidTransition: jest.fn((from: string, to: string) => {
        const err = new Error(`Cannot transition from ${from} to ${to}`);
        (err as any).statusCode = 400;
        return err;
    }),
};

jest.mock('../../../../lib/middleware', () => ({
    getUserId: jest.fn(() => 'user-123'),
    asyncHandler: (fn: Function) => fn, // Unwrap for testing
    Errors: mockErrors,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isValidJobTransition } = require('@askmerve/shared');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { confirmJob, ConfirmJobParamsSchema, ConfirmJobRequestSchema } = require('../confirm');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getUserId } = require('../../../../lib/middleware');

describe('Job Confirmation Endpoint', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;
    let mockJobRef: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockJobRef = (admin as any)._mockJobRef;

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        mockNext = jest.fn();

        mockReq = {
            params: { id: 'job-123' },
            body: {},
            traceId: 'trace-123',
        };
    });

    describe('ConfirmJobParamsSchema', () => {
        it('should validate valid job id', () => {
            const result = ConfirmJobParamsSchema.safeParse({ id: 'job-123' });
            expect(result.success).toBe(true);
        });

        it('should reject empty job id', () => {
            const result = ConfirmJobParamsSchema.safeParse({ id: '' });
            expect(result.success).toBe(false);
        });
    });

    describe('ConfirmJobRequestSchema', () => {
        it('should accept empty body', () => {
            const result = ConfirmJobRequestSchema.safeParse(undefined);
            expect(result.success).toBe(true);
        });

        it('should accept optional note', () => {
            const result = ConfirmJobRequestSchema.safeParse({ note: 'Please hurry!' });
            expect(result.success).toBe(true);
        });
    });

    describe('confirmJob handler', () => {
        it('should throw 404 if job does not exist', async () => {
            mockJobRef.get.mockResolvedValue({ exists: false });

            await expect(confirmJob(mockReq, mockRes, mockNext)).rejects.toThrow('Job not found');
            expect(mockErrors.notFound).toHaveBeenCalledWith('Job');
        });

        it('should throw 403 if user is not owner', async () => {
            mockJobRef.get.mockResolvedValue({
                exists: true,
                id: 'job-123',
                data: () => ({
                    ownerUserId: 'other-user',
                    status: 'collecting',
                }),
            });

            await expect(confirmJob(mockReq, mockRes, mockNext)).rejects.toThrow('permission');
            expect(mockErrors.forbidden).toHaveBeenCalled();
        });

        it('should throw 400 if invalid state transition', async () => {
            mockJobRef.get.mockResolvedValue({
                exists: true,
                id: 'job-123',
                data: () => ({
                    ownerUserId: 'user-123',
                    status: 'completed', // Cannot transition from completed
                }),
            });
            (isValidJobTransition as jest.Mock).mockReturnValue(false);

            await expect(confirmJob(mockReq, mockRes, mockNext)).rejects.toThrow('Cannot transition');
            expect(mockErrors.invalidTransition).toHaveBeenCalledWith('completed', 'confirming');
        });

        it('should confirm job and return updated job', async () => {
            const existingJob = {
                ownerUserId: 'user-123',
                status: 'collecting',
                actionType: 'taxi',
            };

            mockJobRef.get.mockResolvedValue({
                exists: true,
                id: 'job-123',
                data: () => existingJob,
            });
            (isValidJobTransition as jest.Mock).mockReturnValue(true);

            await confirmJob(mockReq, mockRes, mockNext);

            expect(mockJobRef.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'confirming',
                })
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        status: 'confirming',
                    }),
                })
            );
        });
    });
});
