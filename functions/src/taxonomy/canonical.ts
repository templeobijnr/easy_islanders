/**
 * Canonical Taxonomy (nc_v1) - SIMPLIFIED
 *
 * DESIGN PRINCIPLE:
 * - Industry domains are FIXED (system-controlled)
 * - Everything else is BUSINESS-DEFINED (free text)
 * - This file only defines defaults per industry, NOT specific categories
 *
 * Categories like "Starters", "Chicken Dishes", "Haircuts" come from:
 * 1. Business uploads (extracted from their documents)
 * 2. Manual entry (business types their own)
 *
 * @version nc_v1
 */

import {
    IndustryDomain,
    OfferingType,
    ActionType,
    INDUSTRY_DOMAINS,
    OFFERING_TYPES,
    ACTION_TYPES,
} from './enums';

export const TAXONOMY_VERSION = 'nc_v1';

// ============================================================================
// INDUSTRY DEFAULTS
// These define the DEFAULT offering and action types for each industry
// Businesses can override these when needed
// ============================================================================
export interface IndustryDefaults {
    industryDomain: IndustryDomain;
    label: string;
    defaultOfferingType: OfferingType;
    defaultActionType: ActionType;
    description: string;
}

export const INDUSTRY_DEFAULTS: Record<IndustryDomain, IndustryDefaults> = {
    [INDUSTRY_DOMAINS.FOOD]: {
        industryDomain: INDUSTRY_DOMAINS.FOOD,
        label: 'Food & Beverage',
        defaultOfferingType: OFFERING_TYPES.PRODUCT,
        defaultActionType: ACTION_TYPES.BUY,
        description: 'Restaurants, cafes, bars, bakeries',
    },
    [INDUSTRY_DOMAINS.BEAUTY]: {
        industryDomain: INDUSTRY_DOMAINS.BEAUTY,
        label: 'Beauty & Wellness',
        defaultOfferingType: OFFERING_TYPES.SERVICE,
        defaultActionType: ACTION_TYPES.BOOK,
        description: 'Salons, spas, barbers, massage',
    },
    [INDUSTRY_DOMAINS.HEALTH]: {
        industryDomain: INDUSTRY_DOMAINS.HEALTH,
        label: 'Health & Medical',
        defaultOfferingType: OFFERING_TYPES.SERVICE,
        defaultActionType: ACTION_TYPES.BOOK,
        description: 'Hospitals, clinics, dentists, pharmacies',
    },
    [INDUSTRY_DOMAINS.ELECTRONICS]: {
        industryDomain: INDUSTRY_DOMAINS.ELECTRONICS,
        label: 'Electronics',
        defaultOfferingType: OFFERING_TYPES.PRODUCT,
        defaultActionType: ACTION_TYPES.BUY,
        description: 'Phone shops, electronics stores',
    },
    [INDUSTRY_DOMAINS.FASHION]: {
        industryDomain: INDUSTRY_DOMAINS.FASHION,
        label: 'Fashion & Accessories',
        defaultOfferingType: OFFERING_TYPES.PRODUCT,
        defaultActionType: ACTION_TYPES.BUY,
        description: 'Clothing, jewelry, watches',
    },
    [INDUSTRY_DOMAINS.HOME]: {
        industryDomain: INDUSTRY_DOMAINS.HOME,
        label: 'Home & Furnishings',
        defaultOfferingType: OFFERING_TYPES.PRODUCT,
        defaultActionType: ACTION_TYPES.BUY,
        description: 'Furniture, appliances, home decor',
    },
    [INDUSTRY_DOMAINS.AUTOMOTIVE]: {
        industryDomain: INDUSTRY_DOMAINS.AUTOMOTIVE,
        label: 'Automotive',
        defaultOfferingType: OFFERING_TYPES.RENTAL,
        defaultActionType: ACTION_TYPES.BOOK,
        description: 'Car rentals, repairs, sales',
    },
    [INDUSTRY_DOMAINS.HOSPITALITY]: {
        industryDomain: INDUSTRY_DOMAINS.HOSPITALITY,
        label: 'Hospitality',
        defaultOfferingType: OFFERING_TYPES.RENTAL,
        defaultActionType: ACTION_TYPES.BOOK,
        description: 'Hotels, villas, apartments',
    },
    [INDUSTRY_DOMAINS.ACTIVITIES]: {
        industryDomain: INDUSTRY_DOMAINS.ACTIVITIES,
        label: 'Activities & Tours',
        defaultOfferingType: OFFERING_TYPES.SERVICE,
        defaultActionType: ACTION_TYPES.BOOK,
        description: 'Tours, sports, recreation',
    },
    [INDUSTRY_DOMAINS.ATTRACTIONS]: {
        industryDomain: INDUSTRY_DOMAINS.ATTRACTIONS,
        label: 'Attractions & Heritage',
        defaultOfferingType: OFFERING_TYPES.TICKET,
        defaultActionType: ACTION_TYPES.VISIT,
        description: 'Beaches, museums, historic sites',
    },
    [INDUSTRY_DOMAINS.PROFESSIONAL]: {
        industryDomain: INDUSTRY_DOMAINS.PROFESSIONAL,
        label: 'Professional Services',
        defaultOfferingType: OFFERING_TYPES.SERVICE,
        defaultActionType: ACTION_TYPES.QUOTE,
        description: 'Legal, financial, real estate',
    },
    [INDUSTRY_DOMAINS.RETAIL]: {
        industryDomain: INDUSTRY_DOMAINS.RETAIL,
        label: 'Retail',
        defaultOfferingType: OFFERING_TYPES.PRODUCT,
        defaultActionType: ACTION_TYPES.BUY,
        description: 'General retail, grocery, florists',
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get industry defaults
 */
export function getIndustryDefaults(domain: IndustryDomain): IndustryDefaults {
    return INDUSTRY_DEFAULTS[domain];
}

/**
 * Get default offering type for an industry
 */
export function getDefaultOfferingType(domain: IndustryDomain): OfferingType {
    return INDUSTRY_DEFAULTS[domain]?.defaultOfferingType ?? OFFERING_TYPES.PRODUCT;
}

/**
 * Get default action type for an industry
 */
export function getDefaultActionType(domain: IndustryDomain): ActionType {
    return INDUSTRY_DEFAULTS[domain]?.defaultActionType ?? ACTION_TYPES.BUY;
}

/**
 * Get all industry domains
 */
export function getAllIndustries(): IndustryDefaults[] {
    return Object.values(INDUSTRY_DEFAULTS);
}

/**
 * Check if an industry domain is valid
 */
export function isValidIndustry(domain: string): domain is IndustryDomain {
    return domain in INDUSTRY_DEFAULTS;
}

// ============================================================================
// DEPRECATED - These were removed because categories should be business-defined
// ============================================================================
// The old TAXONOMY object with food.mains.chicken, beauty.hair.cut, etc.
// has been removed. Categories are now free-text, defined by businesses.
//
// OLD: taxonomyId: "food.mains.chicken"
// NEW: section: "Starters" (business-defined), industryDomain: "food"
