import { getErrorMessage } from '../../utils/errors';
/**
 * Common Result Types
 * 
 * Standard Result pattern for operations that can fail.
 * Used across all domains for consistent error handling.
 */

import type { AppError, ErrorCode } from './errors';

// ============================================
// RESULT TYPE
// ============================================

/**
 * Success result with data.
 */
export interface Success<T> {
    success: true;
    data: T;
}

/**
 * Failure result with error.
 */
export interface Failure {
    success: false;
    error: AppError;
}

/**
 * Result type - either success with data or failure with error.
 * Use this for all operations that can fail.
 */
export type Result<T> = Success<T> | Failure;

// ============================================
// HELPERS
// ============================================

/** Create a success result */
export function ok<T>(data: T): Success<T> {
    return { success: true, data };
}

/** Create a failure result */
export function fail(code: ErrorCode, message: string, details?: Record<string, unknown>): Failure {
    return {
        success: false,
        error: { code, message, details },
    };
}

/** Check if result is success */
export function isOk<T>(result: Result<T>): result is Success<T> {
    return result.success === true;
}

/** Check if result is failure */
export function isFail<T>(result: Result<T>): result is Failure {
    return result.success === false;
}

/** Unwrap result or throw */
export function unwrap<T>(result: Result<T>): T {
    if (result.success) {
        return result.data;
    }
    throw new Error(`${result.error.code}: ${result.error.message}`);
}

/** Unwrap result or return default */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
    if (result.success) {
        return result.data;
    }
    return defaultValue;
}
