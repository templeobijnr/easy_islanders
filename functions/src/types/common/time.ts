/**
 * Common Time Types
 * 
 * Date/time primitives used across domains.
 * These are JSON-safe (no Firestore Timestamp).
 */

// ============================================
// ISO DATE STRINGS
// ============================================

/** ISO 8601 date string: YYYY-MM-DD */
export type ISODate = string;

/** ISO 8601 datetime string: YYYY-MM-DDTHH:mm:ss.sssZ */
export type ISODateTime = string;

/** Time string: HH:mm (24-hour) */
export type TimeString = string;

// ============================================
// TIME WINDOW
// ============================================

/**
 * A time window (JSON-safe, for contracts).
 * For Firestore models, use Timestamp directly.
 */
export interface TimeWindow {
    start: ISODateTime;
    end: ISODateTime;
    timezone?: string; // e.g., 'Europe/Istanbul'
}

// ============================================
// HELPERS
// ============================================

/** Get current ISO date string */
export function nowISODate(): ISODate {
    return new Date().toISOString().split('T')[0];
}

/** Get current ISO datetime string */
export function nowISODateTime(): ISODateTime {
    return new Date().toISOString();
}

/** Convert Date to ISODate */
export function toISODate(date: Date): ISODate {
    return date.toISOString().split('T')[0];
}

/** Convert Date to ISODateTime */
export function toISODateTime(date: Date): ISODateTime {
    return date.toISOString();
}

/** Parse ISODate to Date */
export function fromISODate(isoDate: ISODate): Date {
    return new Date(isoDate);
}
