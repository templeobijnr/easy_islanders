/**
 * Taxonomy Module Index
 *
 * Re-exports all taxonomy components for clean imports.
 */

// Enums and type guards
export {
    INDUSTRY_DOMAINS,
    OFFERING_TYPES,
    ACTION_TYPES,
    ENTITY_TYPES,
    PRICE_TYPES,
    CURRENCIES,
    INDUSTRY_DOMAIN_VALUES,
    OFFERING_TYPE_VALUES,
    ACTION_TYPE_VALUES,
    ENTITY_TYPE_VALUES,
    PRICE_TYPE_VALUES,
    CURRENCY_VALUES,
    isValidIndustryDomain,
    isValidOfferingType,
    isValidActionType,
    isValidEntityType,
    isValidPriceType,
    isValidCurrency,
} from './enums';

export type {
    IndustryDomain,
    OfferingType,
    ActionType,
    EntityType,
    PriceType,
    Currency,
} from './enums';

// Industry defaults (not pre-defined categories)
export {
    TAXONOMY_VERSION,
    INDUSTRY_DEFAULTS,
    getIndustryDefaults,
    getDefaultOfferingType,
    getDefaultActionType,
    getAllIndustries,
    isValidIndustry,
} from './canonical';

export type { IndustryDefaults } from './canonical';

// Validation
export {
    validateCatalogItem,
    normalizeCatalogItem,
} from './validate';

export type { ValidationError, ValidationResult } from './validate';
