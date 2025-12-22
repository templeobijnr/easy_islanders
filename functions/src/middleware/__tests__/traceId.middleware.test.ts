/**
 * Trace ID Middleware Tests (OBS-02)
 */

import { Request, Response, NextFunction } from 'express';
import {
    traceIdMiddleware,
    getTraceId,
    withTraceContext,
    TRACE_ID_HEADER,
} from '../traceId.middleware';

// Mock express request/response
function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
    return {
        get: ((name: string) => headers[name]) as Request['get'],
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
    };
}

function createMockRes(): Partial<Response> {
    return {
        setHeader: jest.fn(),
    };
}

describe('traceId.middleware', () => {
    describe('traceIdMiddleware', () => {
        it('should generate traceId when not provided', () => {
            const req = createMockReq() as Request;
            const res = createMockRes() as Response;
            const next = jest.fn() as NextFunction;

            traceIdMiddleware(req, res, next);

            expect(req.traceId).toBeDefined();
            expect(req.traceId.length).toBeGreaterThan(0);
            expect(next).toHaveBeenCalled();
        });

        it('should use existing traceId from header', () => {
            const existingTraceId = 'existing-trace-123';
            const req = createMockReq({ [TRACE_ID_HEADER]: existingTraceId }) as Request;
            const res = createMockRes() as Response;
            const next = jest.fn() as NextFunction;

            traceIdMiddleware(req, res, next);

            expect(req.traceId).toBe(existingTraceId);
        });

        it('should set response header with traceId', () => {
            const req = createMockReq() as Request;
            const res = createMockRes() as Response;
            const next = jest.fn() as NextFunction;

            traceIdMiddleware(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith(TRACE_ID_HEADER, req.traceId);
        });
    });

    describe('getTraceId', () => {
        it('should return traceId from request', () => {
            const req = { traceId: 'test-trace-456' } as Request;

            expect(getTraceId(req)).toBe('test-trace-456');
        });

        it('should return fallback when traceId missing', () => {
            const req = {} as Request;

            expect(getTraceId(req)).toBe('unknown-trace');
        });
    });

    describe('withTraceContext', () => {
        it('should add traceId to context object', () => {
            const req = { traceId: 'context-trace-789' } as Request;
            const data = { foo: 'bar', count: 42 };

            const result = withTraceContext(req, data);

            expect(result.traceId).toBe('context-trace-789');
            expect(result.foo).toBe('bar');
            expect(result.count).toBe(42);
        });
    });
});
