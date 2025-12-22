/**
 * Safe formatting utilities to prevent runtime crashes from undefined values.
 * Use these instead of calling .toLocaleString() directly.
 */

/**
 * Safely format a number with locale-specific grouping.
 * Returns '—' if value is null, undefined, or NaN.
 */
export const formatNumber = (value?: number | null): string => {
    if (value == null || isNaN(value)) return '—';
    return value.toLocaleString();
};

/**
 * Safely format a price with currency symbol.
 * Returns '—' if value is null, undefined, or NaN.
 */
export const formatMoney = (value?: number | null, currency = '£'): string => {
    if (value == null || isNaN(value)) return '—';
    return `${currency}${value.toLocaleString()}`;
};

/**
 * Format money without currency prefix (for use in calculations display).
 * Returns '—' if value is null, undefined, or NaN.
 */
export const formatMoneyRaw = (value?: number | null): string => {
    if (value == null || isNaN(value)) return '—';
    return value.toLocaleString();
};

/**
 * Safely format a number with fixed decimals.
 * Returns '—' if value is null, undefined, or NaN.
 */
export const formatFixed = (value?: number | null, digits = 2): string => {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(digits);
};

/**
 * Safely format money with fixed decimals and currency symbol.
 * Returns '—' if value is null, undefined, or NaN.
 */
export const formatMoneyFixed = (
    value?: number | null,
    currencySymbol = '£',
    digits = 2
): string => {
    if (value == null || Number.isNaN(value)) return '—';
    return `${currencySymbol}${value.toFixed(digits)}`;
};

/**
 * Assert that a required value exists for transactional flows.
 * Throws a user-friendly error if the value is missing.
 * Use this in checkout/booking flows to hard-stop when data is invalid.
 */
export const assertRequired = <T>(
    value: T | null | undefined,
    fieldName: string
): T => {
    if (value == null || (typeof value === 'number' && isNaN(value))) {
        throw new Error(`${fieldName} is missing. Cannot proceed.`);
    }
    return value;
};

/**
 * Check if a price value is valid for checkout.
 * Returns true if the value is a valid number > 0.
 */
export const isPriceValid = (value?: number | null): boolean => {
    return value != null && !isNaN(value) && value > 0;
};

/**
 * Safely format a date for display.
 * Handles Date objects, Firestore Timestamps, ISO strings, and Unix timestamps.
 * Returns '—' if value is invalid.
 */
export const formatDate = (
    value?: Date | { seconds: number } | { _seconds: number } | string | number | null,
    options?: Intl.DateTimeFormatOptions
): string => {
    if (value == null) return '—';

    let date: Date;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'object' && ('seconds' in value || '_seconds' in value)) {
        // Firestore Timestamp
        const seconds = (value as any).seconds ?? (value as any)._seconds;
        date = new Date(seconds * 1000);
    } else if (typeof value === 'string') {
        date = new Date(value);
    } else if (typeof value === 'number') {
        // Unix timestamp (seconds or milliseconds)
        date = new Date(value > 1e12 ? value : value * 1000);
    } else {
        return '—';
    }

    if (isNaN(date.getTime())) return '—';

    return options ? date.toLocaleString(undefined, options) : date.toLocaleString();
};

/**
 * Safely format a date as a short date string (e.g., "Dec 17, 2025").
 */
export const formatShortDate = (
    value?: Date | { seconds: number } | { _seconds: number } | string | number | null
): string => {
    return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Safely format a date as a relative time string (e.g., "2h ago", "3d ago").
 */
export const formatRelativeTime = (
    value?: Date | { seconds: number } | { _seconds: number } | string | number | null
): string => {
    if (value == null) return '—';

    let timestamp: number;

    if (value instanceof Date) {
        timestamp = value.getTime();
    } else if (typeof value === 'object' && ('seconds' in value || '_seconds' in value)) {
        const seconds = (value as any).seconds ?? (value as any)._seconds;
        timestamp = seconds * 1000;
    } else if (typeof value === 'string') {
        timestamp = new Date(value).getTime();
    } else if (typeof value === 'number') {
        timestamp = value > 1e12 ? value : value * 1000;
    } else {
        return '—';
    }

    if (isNaN(timestamp)) return '—';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return formatShortDate(value);
};
