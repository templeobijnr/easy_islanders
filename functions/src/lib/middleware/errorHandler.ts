import { getErrorMessage } from '../../utils/errors';
/**
 * Error Handler Middleware for Express
 * 
 * Catches errors and returns consistent JSON error responses with traceId.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Application error with structured error code.
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Common application errors.
 */
export const Errors = {
    notFound: (resource: string) =>
        new AppError(404, 'NOT_FOUND', `${resource} not found`),

    forbidden: (message = 'You do not have permission to access this resource') =>
        new AppError(403, 'FORBIDDEN', message),

    conflict: (message: string) =>
        new AppError(409, 'CONFLICT', message),

    badRequest: (message: string, details?: unknown) =>
        new AppError(400, 'BAD_REQUEST', message, details),

    invalidTransition: (from: string, to: string) =>
        new AppError(400, 'INVALID_TRANSITION', `Cannot transition from '${from}' to '${to}'`),
};

/**
 * Middleware that attaches a unique traceId to every request.
 * Must be applied early in the middleware chain.
 */
export function attachTraceId(req: Request, _res: Response, next: NextFunction): void {
    (req as any).traceId = uuidv4();
    next();
}

/**
 * Global error handler middleware.
 * Must be applied after all routes.
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const traceId = (req as any).traceId || 'unknown';

    // Log error with trace context
    console.error(`[Error] traceId=${traceId}`, {
        name: err.name,
        message: getErrorMessage(err),
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Handle known AppError
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: getErrorMessage(err),
                details: err.details,
                traceId,
            },
        });
        return;
    }

    // Handle unknown errors
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            traceId,
        },
    });
}

/**
 * Async route handler wrapper that catches promise rejections.
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction): Promise<void> => {
        return Promise.resolve(fn(req, res, next)).catch(next);
    };
}
