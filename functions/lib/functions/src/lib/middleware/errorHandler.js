"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.AppError = void 0;
exports.attachTraceId = attachTraceId;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const errors_1 = require("../../utils/errors");
const uuid_1 = require("uuid");
/**
 * Application error with structured error code.
 */
class AppError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
/**
 * Common application errors.
 */
exports.Errors = {
    notFound: (resource) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
    forbidden: (message = 'You do not have permission to access this resource') => new AppError(403, 'FORBIDDEN', message),
    conflict: (message) => new AppError(409, 'CONFLICT', message),
    badRequest: (message, details) => new AppError(400, 'BAD_REQUEST', message, details),
    invalidTransition: (from, to) => new AppError(400, 'INVALID_TRANSITION', `Cannot transition from '${from}' to '${to}'`),
};
/**
 * Middleware that attaches a unique traceId to every request.
 * Must be applied early in the middleware chain.
 */
function attachTraceId(req, _res, next) {
    req.traceId = (0, uuid_1.v4)();
    next();
}
/**
 * Global error handler middleware.
 * Must be applied after all routes.
 */
function errorHandler(err, req, res, _next) {
    const traceId = req.traceId || 'unknown';
    // Log error with trace context
    console.error(`[Error] traceId=${traceId}`, {
        name: err.name,
        message: (0, errors_1.getErrorMessage)(err),
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
                message: (0, errors_1.getErrorMessage)(err),
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
function asyncHandler(fn) {
    return (req, res, next) => {
        return Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.js.map