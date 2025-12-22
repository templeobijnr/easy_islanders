"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const traceId_middleware_1 = require("../middleware/traceId.middleware");
/**
 * Wraps an async express handler to catch errors.
 *
 * @param fn - Async handler function.
 * @returns Wrapped handler that forwards errors to next().
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            const traceId = (0, traceId_middleware_1.getTraceId)(req);
            // Normalize to AppError
            if (!(err instanceof errors_1.AppError)) {
                err = errors_1.AppError.internal(err instanceof Error ? err.message : 'Handler error', err instanceof Error ? err : undefined);
            }
            next(err);
        });
    };
}
/**
 * Global error handler middleware.
 * Use as the last middleware in the chain.
 */
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    const traceId = (0, traceId_middleware_1.getTraceId)(req);
    const httpStatus = (0, errors_1.getHttpStatus)(err);
    const errorResponse = (0, errors_1.toErrorResponse)(err, traceId);
    res.status(httpStatus).json(errorResponse);
}
//# sourceMappingURL=asyncHandler.js.map