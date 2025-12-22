"use strict";
/**
 * Common Money Types
 *
 * Currency and monetary value types used across domains.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CURRENCY = void 0;
exports.toMoney = toMoney;
exports.fromMoney = fromMoney;
exports.formatMoney = formatMoney;
exports.DEFAULT_CURRENCY = 'TRY';
// ============================================
// HELPERS
// ============================================
/** Convert major units (e.g., 10.50 TRY) to Money */
function toMoney(amount, currency = 'TRY') {
    return {
        amountMinor: Math.round(amount * 100),
        currency,
    };
}
/** Convert Money to major units for display */
function fromMoney(money) {
    return money.amountMinor / 100;
}
/** Format Money for display (e.g., "₺10.50") */
function formatMoney(money) {
    const symbols = {
        TRY: '₺',
        EUR: '€',
        GBP: '£',
        USD: '$',
    };
    return `${symbols[money.currency]}${fromMoney(money).toFixed(2)}`;
}
//# sourceMappingURL=money.js.map