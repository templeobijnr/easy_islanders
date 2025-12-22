"use strict";
/**
 * Trace ID Middleware Tests (OBS-02)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const traceId_middleware_1 = require("../traceId.middleware");
// Mock express request/response
function createMockReq(headers = {}) {
    return {
        get: ((name) => headers[name]),
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
    };
}
function createMockRes() {
    return {
        setHeader: vitest_1.vi.fn(),
    };
}
(0, vitest_1.describe)('traceId.middleware', () => {
    (0, vitest_1.describe)('traceIdMiddleware', () => {
        (0, vitest_1.it)('should generate traceId when not provided', () => {
            const req = createMockReq();
            const res = createMockRes();
            const next = vitest_1.vi.fn();
            (0, traceId_middleware_1.traceIdMiddleware)(req, res, next);
            (0, vitest_1.expect)(req.traceId).toBeDefined();
            (0, vitest_1.expect)(req.traceId.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(next).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should use existing traceId from header', () => {
            const existingTraceId = 'existing-trace-123';
            const req = createMockReq({ [traceId_middleware_1.TRACE_ID_HEADER]: existingTraceId });
            const res = createMockRes();
            const next = vitest_1.vi.fn();
            (0, traceId_middleware_1.traceIdMiddleware)(req, res, next);
            (0, vitest_1.expect)(req.traceId).toBe(existingTraceId);
        });
        (0, vitest_1.it)('should set response header with traceId', () => {
            const req = createMockReq();
            const res = createMockRes();
            const next = vitest_1.vi.fn();
            (0, traceId_middleware_1.traceIdMiddleware)(req, res, next);
            (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith(traceId_middleware_1.TRACE_ID_HEADER, req.traceId);
        });
    });
    (0, vitest_1.describe)('getTraceId', () => {
        (0, vitest_1.it)('should return traceId from request', () => {
            const req = { traceId: 'test-trace-456' };
            (0, vitest_1.expect)((0, traceId_middleware_1.getTraceId)(req)).toBe('test-trace-456');
        });
        (0, vitest_1.it)('should return fallback when traceId missing', () => {
            const req = {};
            (0, vitest_1.expect)((0, traceId_middleware_1.getTraceId)(req)).toBe('unknown-trace');
        });
    });
    (0, vitest_1.describe)('withTraceContext', () => {
        (0, vitest_1.it)('should add traceId to context object', () => {
            const req = { traceId: 'context-trace-789' };
            const data = { foo: 'bar', count: 42 };
            const result = (0, traceId_middleware_1.withTraceContext)(req, data);
            (0, vitest_1.expect)(result.traceId).toBe('context-trace-789');
            (0, vitest_1.expect)(result.foo).toBe('bar');
            (0, vitest_1.expect)(result.count).toBe(42);
        });
    });
});
//# sourceMappingURL=traceId.middleware.test.js.map