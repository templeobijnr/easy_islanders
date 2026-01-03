/**
 * Async Handler Wrapper (RUN-04)
 *
 * Wraps express handlers to catch unhandled promise rejections.
 *
 * INVARIANTS:
 * - No unhandled promise rejections.
 * - All errors forwarded to next() with AppError normalization.
 * - Errors logged with traceId.
 *
 * @see Living Document Section 18.4 for invariants.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError, isAppError } from '../utils/errors';
import { getTraceId } from '../middleware/traceId.middleware';

/**
 * Async request handler type.
 */
type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async express handler to catch errors.
 *
 * @param fn - Async handler function.
 * @returns Wrapped handler that forwards errors to next().
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            // Normalize to AppError if not already
            if (!isAppError(err)) {
                err = new AppError(
                    'INTERNAL',
                    err instanceof Error ? err.message : 'Handler error'
                );
            }

            next(err);
        });
    };
}

/**
 * Get HTTP status code from error.
 */
function getHttpStatus(err: Error): number {
    if (isAppError(err)) {
        switch (err.code) {
            case 'NOT_FOUND': return 404;
            case 'PERMISSION_DENIED': return 403;
            case 'INVALID_INPUT': return 400;
            case 'ALREADY_EXISTS': return 409;
            default: return 500;
        }
    }
    return 500;
}

/**
 * Convert error to response object.
 */
function toErrorResponse(err: Error, traceId?: string) {
    return {
        error: {
            message: err.message || 'Internal server error',
            code: isAppError(err) ? err.code : 'INTERNAL',
            traceId,
        }
    };
}

/**
 * Global error handler middleware.
 * Use as the last middleware in the chain.
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    const traceId = getTraceId(req);
    const httpStatus = getHttpStatus(err);
    const errorResponse = toErrorResponse(err, traceId);

    res.status(httpStatus).json(errorResponse);
}
