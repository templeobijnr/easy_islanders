"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock Firebase Admin
const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin', () => ({
    auth: jest.fn(() => ({
        verifyIdToken: mockVerifyIdToken,
    })),
}));
const auth_1 = require("../auth");
describe('Auth Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            headers: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });
    describe('isAuthenticated', () => {
        it('should reject requests without authorization header', async () => {
            mockReq.headers = {};
            await (0, auth_1.isAuthenticated)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Unauthorized: No token provided',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should reject requests without Bearer prefix', async () => {
            mockReq.headers = { authorization: 'token123' };
            await (0, auth_1.isAuthenticated)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should reject invalid tokens', async () => {
            mockReq.headers = { authorization: 'Bearer invalid-token' };
            mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
            await (0, auth_1.isAuthenticated)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Unauthorized: Invalid token',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should set user on request and call next for valid token', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            mockVerifyIdToken.mockResolvedValue({
                uid: 'user-123',
                email: 'test@example.com',
                role: 'user',
            });
            await (0, auth_1.isAuthenticated)(mockReq, mockRes, mockNext);
            expect(mockReq.user).toEqual({
                uid: 'user-123',
                email: 'test@example.com',
                role: 'user',
                businessId: undefined,
            });
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        it('should default role to "user" if not set', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            mockVerifyIdToken.mockResolvedValue({
                uid: 'user-123',
                email: 'test@example.com',
                // No role in token
            });
            await (0, auth_1.isAuthenticated)(mockReq, mockRes, mockNext);
            expect(mockReq.user.role).toBe('user');
            expect(mockNext).toHaveBeenCalled();
        });
        it('should include businessId from token', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            mockVerifyIdToken.mockResolvedValue({
                uid: 'user-123',
                email: 'biz@example.com',
                role: 'business',
                businessId: 'biz-456',
            });
            await (0, auth_1.isAuthenticated)(mockReq, mockRes, mockNext);
            expect(mockReq.user.businessId).toBe('biz-456');
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('isBusiness', () => {
        it('should reject non-business users', () => {
            mockReq.user = { uid: 'user-123', role: 'user' };
            (0, auth_1.isBusiness)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Forbidden: Business access required',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should allow business users', () => {
            mockReq.user = { uid: 'user-123', role: 'business' };
            (0, auth_1.isBusiness)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        it('should allow admin users', () => {
            mockReq.user = { uid: 'admin-123', role: 'admin' };
            (0, auth_1.isBusiness)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=auth.test.js.map