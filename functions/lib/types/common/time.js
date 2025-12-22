"use strict";
/**
 * Common Time Types
 *
 * Date/time primitives used across domains.
 * These are JSON-safe (no Firestore Timestamp).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowISODate = nowISODate;
exports.nowISODateTime = nowISODateTime;
exports.toISODate = toISODate;
exports.toISODateTime = toISODateTime;
exports.fromISODate = fromISODate;
// ============================================
// HELPERS
// ============================================
/** Get current ISO date string */
function nowISODate() {
    return new Date().toISOString().split('T')[0];
}
/** Get current ISO datetime string */
function nowISODateTime() {
    return new Date().toISOString();
}
/** Convert Date to ISODate */
function toISODate(date) {
    return date.toISOString().split('T')[0];
}
/** Convert Date to ISODateTime */
function toISODateTime(date) {
    return date.toISOString();
}
/** Parse ISODate to Date */
function fromISODate(isoDate) {
    return new Date(isoDate);
}
//# sourceMappingURL=time.js.map