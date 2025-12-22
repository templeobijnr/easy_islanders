/**
 * Trace ID Middleware (OBS-02)
 *
 * Generates and propagates a traceId for every request.
 * Enables end-to-end request tracing and incident correlation.
 *
 * INVARIANTS:
 * - Every request MUST have a traceId.
 * - traceId is generated at ingress if not provided in X-Trace-ID header.
 * - traceId is attached to req.traceId for downstream access.
 * - All error responses include traceId for debugging.
 *
 * FAILURE MODE:
 * - If crypto fails, falls back to timestamp-based ID.
 * - Never blocks request processing.
 *
 * @see Living Document Section 17.2 for invariants.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import * as logger from 'firebase-functions/logger';

/**
 * Header name for trace ID.
 */
export const TRACE_ID_HEADER = 'X-Trace-ID';

/**
 * Extends Express Request to include traceId.
 */
declare global {
    namespace Express {
        interface Request {
            traceId: string;
        }
    }
}

/**
 * Generates a new trace ID.
 * Uses crypto.randomUUID() with timestamp fallback.
 */
function generateTraceId(): string {
    try {
        return randomUUID();
    } catch {
        // Fallback: timestamp + random suffix
        return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
}

/**
 * Express middleware that ensures every request has a traceId.
 * - Reads from X-Trace-ID header if present.
 * - Generates a new traceId if missing.
 * - Attaches to req.traceId for downstream use.
 * - Sets response header for client correlation.
 */
export function traceIdMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Check for existing trace ID in header
    const existingTraceId = req.get(TRACE_ID_HEADER);

    // Use existing or generate new
    const traceId = existingTraceId || generateTraceId();

    // Attach to request
    req.traceId = traceId;

    // Set response header for client correlation
    res.setHeader(TRACE_ID_HEADER, traceId);

    // Log request start with traceId
    logger.info('Request started', {
        traceId,
        method: req.method,
        path: req.path,
        ip: req.ip,
    });

    next();
}

/**
 * Gets the traceId from a request, with fallback.
 * Use this in handlers that may not have traceId middleware.
 */
export function getTraceId(req: Request): string {
    return req.traceId || 'unknown-trace';
}

/**
 * Creates a structured log context with traceId.
 * Use this to ensure all logs include the traceId.
 */
export function withTraceContext(
    req: Request,
    data: Record<string, unknown>
): Record<string, unknown> {
    return {
        traceId: getTraceId(req),
        ...data,
    };
}

/**
 * Error response helper that includes traceId.
 * Use this for consistent error formatting.
 */
export function sendErrorWithTrace(
    req: Request,
    res: Response,
    statusCode: number,
    message: string,
    code?: string
): void {
    const traceId = getTraceId(req);

    logger.error('Request failed', {
        traceId,
        statusCode,
        message,
        code,
        path: req.path,
    });

    res.status(statusCode).json({
        success: false,
        error: message,
        code: code || 'ERROR',
        traceId,
    });
}
