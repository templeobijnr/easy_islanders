import { requireBusinessMatch } from './requireBusinessMatch';

type MockUser = { uid: string; role: string; businessId: string };
type MockReq = {
    params: Record<string, string>;
    body: Record<string, unknown>;
    user: MockUser;
};
type MockRes = {
    statusCode: number;
    body: unknown;
    status: (code: number) => MockRes;
    json: (payload: unknown) => MockRes;
};

function createRes() {
    const res: MockRes = {
        statusCode: 200,
        body: undefined,
        status: (code: number) => {
            res.statusCode = code;
            return res;
        },
        json: (payload: unknown) => {
            res.body = payload;
            return res;
        },
    };
    return res;
}

describe('requireBusinessMatch', () => {
    test('returns 403 when businessId mismatches claim (params)', () => {
        const req: MockReq = {
            params: { businessId: 'biz_999' },
            body: {},
            user: { uid: 'u1', role: 'owner', businessId: 'biz_123' }
        };
        const res = createRes();
        const next = jest.fn();

        requireBusinessMatch(req as any, res as any, next as any);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when businessId mismatches claim (body)', () => {
        const req: MockReq = {
            params: {},
            body: { businessId: 'biz_999' },
            user: { uid: 'u1', role: 'owner', businessId: 'biz_123' }
        };
        const res = createRes();
        const next = jest.fn();

        requireBusinessMatch(req as any, res as any, next as any);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next when businessId matches claim', () => {
        const req: MockReq = {
            params: { businessId: 'biz_123' },
            body: {},
            user: { uid: 'u1', role: 'owner', businessId: 'biz_123' }
        };
        const res = createRes();
        const next = jest.fn();

        requireBusinessMatch(req as any, res as any, next as any);

        expect(res.statusCode).toBe(200);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
