/**
 * Common Error Types
 * 
 * Shared error codes and base error types used across all domains.
 * This prevents fragmentation of error handling.
 */

// ============================================
// ERROR CODES
// ============================================

/**
 * Standard error codes used across the system.
 * Add new codes here, not in domain-specific files.
 */
export type ErrorCode =
    // Resource errors
    | 'NOT_FOUND'
    | 'RESOURCE_UNAVAILABLE'
    | 'ALREADY_EXISTS'
    // State errors
    | 'INVALID_STATE'
    | 'HOLD_EXPIRED'
    | 'TRANSITION_DENIED'
    // Auth errors
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'TOKEN_EXPIRED'
    // Validation errors
    | 'VALIDATION_FAILED'
    | 'INVALID_INPUT'
    | 'MISSING_REQUIRED'
    // Concurrency errors
    | 'IDEMPOTENCY_CONFLICT'
    | 'CONCURRENT_MODIFICATION'
    | 'LOCK_HELD'
    // Integration errors
    | 'EXTERNAL_SERVICE_ERROR'
    | 'TIMEOUT'
    | 'RATE_LIMITED'
    // System errors
    | 'INTERNAL'
    | 'NOT_IMPLEMENTED';

// ============================================
// ERROR TYPES
// ============================================

/**
 * Standard application error structure.
 * Used in Result.error and API error responses.
 */
export interface AppError {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Extended error with HTTP status for API responses.
 */
export interface HttpError extends AppError {
    status: number;
}

// ============================================
// ERROR HELPERS
// ============================================

/** Map error code to HTTP status */
export function errorToStatus(code: ErrorCode): number {
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
export function appError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
): AppError {
    return { code, message, details };
}

/** Create an HttpError */
export function httpError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
): HttpError {
    return {
        code,
        message,
        details,
        status: errorToStatus(code),
    };
}
