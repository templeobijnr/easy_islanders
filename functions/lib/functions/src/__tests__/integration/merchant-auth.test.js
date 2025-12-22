"use strict";
/**
 * Integration Tests for Merchant Auth
 *
 * Tests the Magic Link system:
 * 1. Admin generates token (hash stored)
 * 2. Merchant exchanges token (verified against hash)
 * 3. JWT issued
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
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
// =============================================================================
// TEST SETUP MOCKS
// =============================================================================
// Mock Firestore
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockLimit = jest.fn().mockReturnThis();
const mockWhere = jest.fn().mockReturnThis();
const mockCollection = jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
        id: 'token-123',
        set: mockSet,
    }),
    where: mockWhere,
    limit: mockLimit, // Chainable
    get: mockGet,
});
const mockFirestore = {
    collection: mockCollection,
};
// Mock Auth
const mockGetUser = jest.fn();
const mockAuth = {
    getUser: mockGetUser,
};
// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: () => mockFirestore,
    auth: () => mockAuth,
}));
// Import implementations AFTER mocking
const merchant_token_1 = require("../../http/v1/admin/merchant-token");
const session_1 = require("../../http/v1/merchant/session");
// =============================================================================
// TESTS
// =============================================================================
describe('Merchant Auth System', () => {
    const adminUserId = 'admin-user';
    const listingId = 'listing-123';
    let generatedRawToken;
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockResolvedValue({
            customClaims: { admin: true },
        });
    });
    describe('Step 1: Token Generation (Admin)', () => {
        it('generates a token and stores only the hash', async () => {
            // Mock Request/Response
            const req = {
                body: {
                    listingId,
                    scopes: ['confirm_job'],
                    expiresInDays: 30, // Default usually applied by Zod middleware
                },
                // Mock middleware traceId/userId
                traceId: 'test-trace',
            };
            // Mock getUserId middleware result
            // Note: In real app, middleware runs before. Here we simulate the context.
            // But getUserId extracts from req.user. We need to mock that?
            // Or we can rely on the fact that `createMerchantToken` calls `getUserId(req)`.
            // `getUserId` expects `req.user`.
            req.user = { uid: adminUserId };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            await (0, merchant_token_1.createMerchantToken)(req, res, {});
            // Verify Response
            expect(res.status).toHaveBeenCalledWith(201);
            const responseData = res.json.mock.calls[0][0].data;
            expect(responseData).toHaveProperty('rawToken');
            expect(responseData.rawToken).toHaveLength(43); // 32 bytes base64url ~ 43 chars
            generatedRawToken = responseData.rawToken;
            // Verify Storage (Hash only)
            expect(mockSet).toHaveBeenCalledTimes(1);
            const storedData = mockSet.mock.calls[0][0];
            expect(storedData.tokenHash).not.toBe(generatedRawToken);
            expect(storedData.tokenHash).toHaveLength(64); // sha256 hex
            // Verify hash allows verification
            const expectedHash = crypto.createHash('sha256').update(generatedRawToken).digest('hex');
            expect(storedData.tokenHash).toBe(expectedHash);
        });
    });
    describe('Step 2: Token Exchange (Merchant)', () => {
        it('exchanges valid raw token for JWT', async () => {
            // Setup mock data in Firestore
            const rawToken = 'test-raw-token';
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 1000000).toISOString();
            const storedToken = {
                id: 'token-123',
                tokenHash,
                listingId,
                scopes: ['confirm_job'],
                active: true,
                expiresAt,
                createdAt: now.toISOString(),
                createdBy: 'admin',
            };
            // Mock Firestore Query Result
            mockWhere.mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        empty: false,
                        docs: [{ id: 'token-123', data: () => storedToken }],
                    }),
                }),
            });
            const req = {
                body: {
                    rawToken,
                },
                traceId: 'test-trace',
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            await (0, session_1.exchangeMerchantToken)(req, res, {});
            expect(res.status).toHaveBeenCalledWith(200);
            const data = res.json.mock.calls[0][0].data;
            expect(data).toHaveProperty('accessToken');
            expect(data.listingId).toBe(listingId);
            // Verify JWT
            const decoded = jwt.decode(data.accessToken);
            expect(decoded.sub).toBe(listingId);
            expect(decoded.scopes).toEqual(['confirm_job']);
            expect(decoded.sid).toBe('token-123');
        });
    });
});
//# sourceMappingURL=merchant-auth.test.js.map