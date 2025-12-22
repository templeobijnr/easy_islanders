/**
 * Catalog Taxonomy Enums
 *
 * System-controlled enums for catalog items and listings.
 * These are FIXED - do not modify without migration plan.
 *
 * @version nc_v1
 */

// ============================================================================
// INDUSTRY DOMAINS (What type of business is this?)
// ============================================================================
export const INDUSTRY_DOMAINS = {
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
} as const;

export type IndustryDomain = typeof INDUSTRY_DOMAINS[keyof typeof INDUSTRY_DOMAINS];

export const INDUSTRY_DOMAIN_VALUES = Object.values(INDUSTRY_DOMAINS);

// ============================================================================
// OFFERING TYPES (What is being sold?)
// ============================================================================
export const OFFERING_TYPES = {
    PRODUCT: 'product',
    SERVICE: 'service',
    TICKET: 'ticket',
    RENTAL: 'rental',
    MEMBERSHIP: 'membership',
} as const;

export type OfferingType = typeof OFFERING_TYPES[keyof typeof OFFERING_TYPES];

export const OFFERING_TYPE_VALUES = Object.values(OFFERING_TYPES);

// ============================================================================
// ACTION TYPES (How is it fulfilled?)
// ============================================================================
export const ACTION_TYPES = {
    BUY: 'buy',
    BOOK: 'book',
    RESERVE: 'reserve',
    VISIT: 'visit',
    QUOTE: 'quote',
    CALL: 'call',
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];

export const ACTION_TYPE_VALUES = Object.values(ACTION_TYPES);

// ============================================================================
// ENTITY TYPES (How is it discovered? - For listings)
// ============================================================================
export const ENTITY_TYPES = {
    PLACE: 'place',
    STAY: 'stay',
    ACTIVITY: 'activity',
    EVENT: 'event',
    EXPERIENCE: 'experience',
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

export const ENTITY_TYPE_VALUES = Object.values(ENTITY_TYPES);

// ============================================================================
// PRICE TYPES (How is pricing structured?)
// ============================================================================
export const PRICE_TYPES = {
    FIXED: 'fixed',
    FROM: 'from',
    HOURLY: 'hourly',
    PER_PERSON: 'per_person',
    FREE: 'free',
    UNKNOWN: 'unknown',  // Price not specified in source
} as const;

export type PriceType = typeof PRICE_TYPES[keyof typeof PRICE_TYPES];

export const PRICE_TYPE_VALUES = Object.values(PRICE_TYPES);

// ============================================================================
// CURRENCIES
// ============================================================================
export const CURRENCIES = {
    TRY: 'TRY',
    GBP: 'GBP',
    EUR: 'EUR',
    USD: 'USD',
} as const;

export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];

export const CURRENCY_VALUES = Object.values(CURRENCIES);

// ============================================================================
// VALIDATION HELPERS
// ============================================================================
export function isValidIndustryDomain(value: string): value is IndustryDomain {
    return INDUSTRY_DOMAIN_VALUES.includes(value as IndustryDomain);
}

export function isValidOfferingType(value: string): value is OfferingType {
    return OFFERING_TYPE_VALUES.includes(value as OfferingType);
}

export function isValidActionType(value: string): value is ActionType {
    return ACTION_TYPE_VALUES.includes(value as ActionType);
}

export function isValidEntityType(value: string): value is EntityType {
    return ENTITY_TYPE_VALUES.includes(value as EntityType);
}

export function isValidPriceType(value: string): value is PriceType {
    return PRICE_TYPE_VALUES.includes(value as PriceType);
}

export function isValidCurrency(value: string): value is Currency {
    return CURRENCY_VALUES.includes(value as Currency);
}
