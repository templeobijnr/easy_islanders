"use strict";
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
/**
 * Tests for POST /v1/jobs/:id/confirm endpoint
 */
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@askmerve/shared");
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
jest.mock('@askmerve/shared', () => (Object.assign(Object.assign({}, jest.requireActual('@askmerve/shared')), { isValidJobTransition: jest.fn() })));
// Mock lib middleware with proper error classes
const mockErrors = {
    notFound: jest.fn((name) => {
        const err = new Error(`${name} not found`);
        err.statusCode = 404;
        return err;
    }),
    forbidden: jest.fn((msg) => {
        const err = new Error(msg);
        err.statusCode = 403;
        return err;
    }),
    invalidTransition: jest.fn((from, to) => {
        const err = new Error(`Cannot transition from ${from} to ${to}`);
        err.statusCode = 400;
        return err;
    }),
};
jest.mock('../../../../lib/middleware', () => ({
    getUserId: jest.fn(() => 'user-123'),
    asyncHandler: (fn) => fn, // Unwrap for testing
    Errors: mockErrors,
}));
const confirm_1 = require("../confirm");
describe('Job Confirmation Endpoint', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockJobRef;
    beforeEach(() => {
        jest.clearAllMocks();
        mockJobRef = admin._mockJobRef;
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
            const result = confirm_1.ConfirmJobParamsSchema.safeParse({ id: 'job-123' });
            expect(result.success).toBe(true);
        });
        it('should reject empty job id', () => {
            const result = confirm_1.ConfirmJobParamsSchema.safeParse({ id: '' });
            expect(result.success).toBe(false);
        });
    });
    describe('ConfirmJobRequestSchema', () => {
        it('should accept empty body', () => {
            const result = confirm_1.ConfirmJobRequestSchema.safeParse(undefined);
            expect(result.success).toBe(true);
        });
        it('should accept optional note', () => {
            const result = confirm_1.ConfirmJobRequestSchema.safeParse({ note: 'Please hurry!' });
            expect(result.success).toBe(true);
        });
    });
    describe('confirmJob handler', () => {
        it('should throw 404 if job does not exist', async () => {
            mockJobRef.get.mockResolvedValue({ exists: false });
            await expect((0, confirm_1.confirmJob)(mockReq, mockRes, mockNext)).rejects.toThrow('Job not found');
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
            await expect((0, confirm_1.confirmJob)(mockReq, mockRes, mockNext)).rejects.toThrow('permission');
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
            shared_1.isValidJobTransition.mockReturnValue(false);
            await expect((0, confirm_1.confirmJob)(mockReq, mockRes, mockNext)).rejects.toThrow('Cannot transition');
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
            shared_1.isValidJobTransition.mockReturnValue(true);
            await (0, confirm_1.confirmJob)(mockReq, mockRes, mockNext);
            expect(mockJobRef.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'confirming',
            }));
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    status: 'confirming',
                }),
            }));
        });
    });
});
//# sourceMappingURL=confirm.test.js.map