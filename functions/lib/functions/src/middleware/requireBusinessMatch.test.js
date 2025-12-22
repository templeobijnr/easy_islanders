"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requireBusinessMatch_1 = require("./requireBusinessMatch");
function createRes() {
    const res = {
        statusCode: 200,
        body: undefined,
        status: (code) => {
            res.statusCode = code;
            return res;
        },
        json: (payload) => {
            res.body = payload;
            return res;
        },
    };
    return res;
}
describe('requireBusinessMatch', () => {
    test('returns 403 when businessId mismatches claim (params)', () => {
        const req = {
            params: { businessId: 'biz_999' },
            body: {},
            user: { uid: 'u1', role: 'owner', businessId: 'biz_123' }
        };
        const res = createRes();
        const next = jest.fn();
        (0, requireBusinessMatch_1.requireBusinessMatch)(req, res, next);
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });
    test('returns 403 when businessId mismatches claim (body)', () => {
        const req = {
            params: {},
            body: { businessId: 'biz_999' },
            user: { uid: 'u1', role: 'owner', businessId: 'biz_123' }
        };
        const res = createRes();
        const next = jest.fn();
        (0, requireBusinessMatch_1.requireBusinessMatch)(req, res, next);
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });
    test('calls next when businessId matches claim', () => {
        const req = {
            params: { businessId: 'biz_123' },
            body: {},
            user: { uid: 'u1', role: 'owner', businessId: 'biz_123' }
        };
        const res = createRes();
        const next = jest.fn();
        (0, requireBusinessMatch_1.requireBusinessMatch)(req, res, next);
        expect(res.statusCode).toBe(200);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=requireBusinessMatch.test.js.map