"use strict";
/**
 * Common Result Types
 *
 * Standard Result pattern for operations that can fail.
 * Used across all domains for consistent error handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.fail = fail;
exports.isOk = isOk;
exports.isFail = isFail;
exports.unwrap = unwrap;
exports.unwrapOr = unwrapOr;
// ============================================
// HELPERS
// ============================================
/** Create a success result */
function ok(data) {
    return { success: true, data };
}
/** Create a failure result */
function fail(code, message, details) {
    return {
        success: false,
        error: { code, message, details },
    };
}
/** Check if result is success */
function isOk(result) {
    return result.success === true;
}
/** Check if result is failure */
function isFail(result) {
    return result.success === false;
}
/** Unwrap result or throw */
function unwrap(result) {
    if (result.success) {
        return result.data;
    }
    throw new Error(`${result.error.code}: ${result.error.message}`);
}
/** Unwrap result or return default */
function unwrapOr(result, defaultValue) {
    if (result.success) {
        return result.data;
    }
    return defaultValue;
}
//# sourceMappingURL=result.js.map