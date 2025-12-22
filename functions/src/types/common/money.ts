/**
 * Common Money Types
 * 
 * Currency and monetary value types used across domains.
 */

// ============================================
// CURRENCY
// ============================================

export type Currency = 'TRY' | 'EUR' | 'GBP' | 'USD';

export const DEFAULT_CURRENCY: Currency = 'TRY';

// ============================================
// MONEY VALUE
// ============================================

/**
 * Represents a monetary value with currency.
 * Amount is stored as integer (cents/kuruş) to avoid floating point issues.
 */
export interface Money {
    /** Amount in smallest currency unit (cents/kuruş) */
    amountMinor: number;
    currency: Currency;
}

// ============================================
// HELPERS
// ============================================

/** Convert major units (e.g., 10.50 TRY) to Money */
export function toMoney(amount: number, currency: Currency = 'TRY'): Money {
    return {
        amountMinor: Math.round(amount * 100),
        currency,
    };
}

/** Convert Money to major units for display */
export function fromMoney(money: Money): number {
    return money.amountMinor / 100;
}

/** Format Money for display (e.g., "₺10.50") */
export function formatMoney(money: Money): string {
    const symbols: Record<Currency, string> = {
        TRY: '₺',
        EUR: '€',
        GBP: '£',
        USD: '$',
    };
    return `${symbols[money.currency]}${fromMoney(money).toFixed(2)}`;
}
