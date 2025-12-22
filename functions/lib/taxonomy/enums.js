"use strict";
/**
 * Catalog Taxonomy Enums
 *
 * System-controlled enums for catalog items and listings.
 * These are FIXED - do not modify without migration plan.
 *
 * @version nc_v1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_VALUES = exports.CURRENCIES = exports.PRICE_TYPE_VALUES = exports.PRICE_TYPES = exports.ENTITY_TYPE_VALUES = exports.ENTITY_TYPES = exports.ACTION_TYPE_VALUES = exports.ACTION_TYPES = exports.OFFERING_TYPE_VALUES = exports.OFFERING_TYPES = exports.INDUSTRY_DOMAIN_VALUES = exports.INDUSTRY_DOMAINS = void 0;
exports.isValidIndustryDomain = isValidIndustryDomain;
exports.isValidOfferingType = isValidOfferingType;
exports.isValidActionType = isValidActionType;
exports.isValidEntityType = isValidEntityType;
exports.isValidPriceType = isValidPriceType;
exports.isValidCurrency = isValidCurrency;
// ============================================================================
// INDUSTRY DOMAINS (What type of business is this?)
// ============================================================================
exports.INDUSTRY_DOMAINS = {
    FOOD: 'food',
    BEAUTY: 'beauty',
    HEALTH: 'health',
    ELECTRONICS: 'electronics',
    FASHION: 'fashion',
    HOME: 'home',
    AUTOMOTIVE: 'automotive',
    HOSPITALITY: 'hospitality',
    ACTIVITIES: 'activities',
    ATTRACTIONS: 'attractions',
    PROFESSIONAL: 'professional',
    RETAIL: 'retail',
};
exports.INDUSTRY_DOMAIN_VALUES = Object.values(exports.INDUSTRY_DOMAINS);
// ============================================================================
// OFFERING TYPES (What is being sold?)
// ============================================================================
exports.OFFERING_TYPES = {
    PRODUCT: 'product',
    SERVICE: 'service',
    TICKET: 'ticket',
    RENTAL: 'rental',
    MEMBERSHIP: 'membership',
};
exports.OFFERING_TYPE_VALUES = Object.values(exports.OFFERING_TYPES);
// ============================================================================
// ACTION TYPES (How is it fulfilled?)
// ============================================================================
exports.ACTION_TYPES = {
    BUY: 'buy',
    BOOK: 'book',
    RESERVE: 'reserve',
    VISIT: 'visit',
    QUOTE: 'quote',
    CALL: 'call',
};
exports.ACTION_TYPE_VALUES = Object.values(exports.ACTION_TYPES);
// ============================================================================
// ENTITY TYPES (How is it discovered? - For listings)
// ============================================================================
exports.ENTITY_TYPES = {
    PLACE: 'place',
    STAY: 'stay',
    ACTIVITY: 'activity',
    EVENT: 'event',
    EXPERIENCE: 'experience',
};
exports.ENTITY_TYPE_VALUES = Object.values(exports.ENTITY_TYPES);
// ============================================================================
// PRICE TYPES (How is pricing structured?)
// ============================================================================
exports.PRICE_TYPES = {
    FIXED: 'fixed',
    FROM: 'from',
    HOURLY: 'hourly',
    PER_PERSON: 'per_person',
    FREE: 'free',
    UNKNOWN: 'unknown', // Price not specified in source
};
exports.PRICE_TYPE_VALUES = Object.values(exports.PRICE_TYPES);
// ============================================================================
// CURRENCIES
// ============================================================================
exports.CURRENCIES = {
    TRY: 'TRY',
    GBP: 'GBP',
    EUR: 'EUR',
    USD: 'USD',
};
exports.CURRENCY_VALUES = Object.values(exports.CURRENCIES);
// ============================================================================
// VALIDATION HELPERS
// ============================================================================
function isValidIndustryDomain(value) {
    return exports.INDUSTRY_DOMAIN_VALUES.includes(value);
}
function isValidOfferingType(value) {
    return exports.OFFERING_TYPE_VALUES.includes(value);
}
function isValidActionType(value) {
    return exports.ACTION_TYPE_VALUES.includes(value);
}
function isValidEntityType(value) {
    return exports.ENTITY_TYPE_VALUES.includes(value);
}
function isValidPriceType(value) {
    return exports.PRICE_TYPE_VALUES.includes(value);
}
function isValidCurrency(value) {
    return exports.CURRENCY_VALUES.includes(value);
}
//# sourceMappingURL=enums.js.map