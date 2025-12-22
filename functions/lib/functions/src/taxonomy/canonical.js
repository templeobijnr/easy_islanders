"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDUSTRY_DEFAULTS = exports.TAXONOMY_VERSION = void 0;
exports.getIndustryDefaults = getIndustryDefaults;
exports.getDefaultOfferingType = getDefaultOfferingType;
exports.getDefaultActionType = getDefaultActionType;
exports.getAllIndustries = getAllIndustries;
exports.isValidIndustry = isValidIndustry;
const enums_1 = require("./enums");
exports.TAXONOMY_VERSION = 'nc_v1';
exports.INDUSTRY_DEFAULTS = {
    [enums_1.INDUSTRY_DOMAINS.FOOD]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.FOOD,
        label: 'Food & Beverage',
        defaultOfferingType: enums_1.OFFERING_TYPES.PRODUCT,
        defaultActionType: enums_1.ACTION_TYPES.BUY,
        description: 'Restaurants, cafes, bars, bakeries',
    },
    [enums_1.INDUSTRY_DOMAINS.BEAUTY]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.BEAUTY,
        label: 'Beauty & Wellness',
        defaultOfferingType: enums_1.OFFERING_TYPES.SERVICE,
        defaultActionType: enums_1.ACTION_TYPES.BOOK,
        description: 'Salons, spas, barbers, massage',
    },
    [enums_1.INDUSTRY_DOMAINS.HEALTH]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.HEALTH,
        label: 'Health & Medical',
        defaultOfferingType: enums_1.OFFERING_TYPES.SERVICE,
        defaultActionType: enums_1.ACTION_TYPES.BOOK,
        description: 'Hospitals, clinics, dentists, pharmacies',
    },
    [enums_1.INDUSTRY_DOMAINS.ELECTRONICS]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.ELECTRONICS,
        label: 'Electronics',
        defaultOfferingType: enums_1.OFFERING_TYPES.PRODUCT,
        defaultActionType: enums_1.ACTION_TYPES.BUY,
        description: 'Phone shops, electronics stores',
    },
    [enums_1.INDUSTRY_DOMAINS.FASHION]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.FASHION,
        label: 'Fashion & Accessories',
        defaultOfferingType: enums_1.OFFERING_TYPES.PRODUCT,
        defaultActionType: enums_1.ACTION_TYPES.BUY,
        description: 'Clothing, jewelry, watches',
    },
    [enums_1.INDUSTRY_DOMAINS.HOME]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.HOME,
        label: 'Home & Furnishings',
        defaultOfferingType: enums_1.OFFERING_TYPES.PRODUCT,
        defaultActionType: enums_1.ACTION_TYPES.BUY,
        description: 'Furniture, appliances, home decor',
    },
    [enums_1.INDUSTRY_DOMAINS.AUTOMOTIVE]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.AUTOMOTIVE,
        label: 'Automotive',
        defaultOfferingType: enums_1.OFFERING_TYPES.RENTAL,
        defaultActionType: enums_1.ACTION_TYPES.BOOK,
        description: 'Car rentals, repairs, sales',
    },
    [enums_1.INDUSTRY_DOMAINS.HOSPITALITY]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.HOSPITALITY,
        label: 'Hospitality',
        defaultOfferingType: enums_1.OFFERING_TYPES.RENTAL,
        defaultActionType: enums_1.ACTION_TYPES.BOOK,
        description: 'Hotels, villas, apartments',
    },
    [enums_1.INDUSTRY_DOMAINS.ACTIVITIES]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.ACTIVITIES,
        label: 'Activities & Tours',
        defaultOfferingType: enums_1.OFFERING_TYPES.SERVICE,
        defaultActionType: enums_1.ACTION_TYPES.BOOK,
        description: 'Tours, sports, recreation',
    },
    [enums_1.INDUSTRY_DOMAINS.ATTRACTIONS]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.ATTRACTIONS,
        label: 'Attractions & Heritage',
        defaultOfferingType: enums_1.OFFERING_TYPES.TICKET,
        defaultActionType: enums_1.ACTION_TYPES.VISIT,
        description: 'Beaches, museums, historic sites',
    },
    [enums_1.INDUSTRY_DOMAINS.PROFESSIONAL]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.PROFESSIONAL,
        label: 'Professional Services',
        defaultOfferingType: enums_1.OFFERING_TYPES.SERVICE,
        defaultActionType: enums_1.ACTION_TYPES.QUOTE,
        description: 'Legal, financial, real estate',
    },
    [enums_1.INDUSTRY_DOMAINS.RETAIL]: {
        industryDomain: enums_1.INDUSTRY_DOMAINS.RETAIL,
        label: 'Retail',
        defaultOfferingType: enums_1.OFFERING_TYPES.PRODUCT,
        defaultActionType: enums_1.ACTION_TYPES.BUY,
        description: 'General retail, grocery, florists',
    },
};
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Get industry defaults
 */
function getIndustryDefaults(domain) {
    return exports.INDUSTRY_DEFAULTS[domain];
}
/**
 * Get default offering type for an industry
 */
function getDefaultOfferingType(domain) {
    var _a, _b;
    return (_b = (_a = exports.INDUSTRY_DEFAULTS[domain]) === null || _a === void 0 ? void 0 : _a.defaultOfferingType) !== null && _b !== void 0 ? _b : enums_1.OFFERING_TYPES.PRODUCT;
}
/**
 * Get default action type for an industry
 */
function getDefaultActionType(domain) {
    var _a, _b;
    return (_b = (_a = exports.INDUSTRY_DEFAULTS[domain]) === null || _a === void 0 ? void 0 : _a.defaultActionType) !== null && _b !== void 0 ? _b : enums_1.ACTION_TYPES.BUY;
}
/**
 * Get all industry domains
 */
function getAllIndustries() {
    return Object.values(exports.INDUSTRY_DEFAULTS);
}
/**
 * Check if an industry domain is valid
 */
function isValidIndustry(domain) {
    return domain in exports.INDUSTRY_DEFAULTS;
}
// ============================================================================
// DEPRECATED - These were removed because categories should be business-defined
// ============================================================================
// The old TAXONOMY object with food.mains.chicken, beauty.hair.cut, etc.
// has been removed. Categories are now free-text, defined by businesses.
//
// OLD: taxonomyId: "food.mains.chicken"
// NEW: section: "Starters" (business-defined), industryDomain: "food"
//# sourceMappingURL=canonical.js.map