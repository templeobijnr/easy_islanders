"use strict";
/**
 * Common Error Types
 *
 * Shared error codes and base error types used across all domains.
 * This prevents fragmentation of error handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorToStatus = errorToStatus;
exports.appError = appError;
exports.httpError = httpError;
// ============================================
// ERROR HELPERS
// ============================================
/** Map error code to HTTP status */
function errorToStatus(code) {
    switch (code) {
        case 'NOT_FOUND':
            return 404;
        case 'UNAUTHORIZED':
        case 'TOKEN_EXPIRED':
            return 401;
        case 'FORBIDDEN':
            return 403;
        case 'VALIDATION_FAILED':
        case 'INVALID_INPUT':
        case 'MISSING_REQUIRED':
        case 'INVALID_STATE':
            return 400;
        case 'RESOURCE_UNAVAILABLE':
        case 'LOCK_HELD':
        case 'CONCURRENT_MODIFICATION':
            return 409;
        case 'ALREADY_EXISTS':
        case 'IDEMPOTENCY_CONFLICT':
            return 409;
        case 'RATE_LIMITED':
            return 429;
        case 'HOLD_EXPIRED':
        case 'TRANSITION_DENIED':
            return 422;
        case 'TIMEOUT':
        case 'EXTERNAL_SERVICE_ERROR':
            return 502;
        case 'NOT_IMPLEMENTED':
            return 501;
        case 'INTERNAL':
        default:
            return 500;
    }
}
/** Create an AppError */
function appError(code, message, details) {
    return { code, message, details };
}
/** Create an HttpError */
function httpError(code, message, details) {
    return {
        code,
        message,
        details,
        status: errorToStatus(code),
    };
}
//# sourceMappingURL=errors.js.map