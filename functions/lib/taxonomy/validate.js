"use strict";
/**
 * Catalog Item Validation
 *
 * Validates CatalogItem inputs before saving to Firestore.
 * Ensures all required fields are present and valid.
 *
 * NOTE: Categories (section/subsection) are BUSINESS-DEFINED,
 * so we only validate that they're non-empty strings.
 *
 * IMPORTANT: Import directly from ./enums and ./canonical to avoid
 * circular dependency with ./index.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCatalogItem = validateCatalogItem;
exports.normalizeCatalogItem = normalizeCatalogItem;
const enums_1 = require("./enums");
const canonical_1 = require("./canonical");
/**
 * Validate a CatalogItemInput before saving
 */
function validateCatalogItem(input) {
    var _a, _b, _c, _d;
    const errors = [];
    // Required string fields
    if (!((_a = input.businessId) === null || _a === void 0 ? void 0 : _a.trim())) {
        errors.push({ field: 'businessId', message: 'Business ID is required' });
    }
    if (!((_b = input.marketId) === null || _b === void 0 ? void 0 : _b.trim())) {
        errors.push({ field: 'marketId', message: 'Market ID is required' });
    }
    if (!((_c = input.section) === null || _c === void 0 ? void 0 : _c.trim())) {
        errors.push({ field: 'section', message: 'Section is required' });
    }
    if (!((_d = input.name) === null || _d === void 0 ? void 0 : _d.trim())) {
        errors.push({ field: 'name', message: 'Name is required' });
    }
    // Industry domain
    if (!input.industryDomain) {
        errors.push({ field: 'industryDomain', message: 'Industry domain is required' });
    }
    else if (!(0, enums_1.isValidIndustryDomain)(input.industryDomain)) {
        errors.push({ field: 'industryDomain', message: `Invalid industry domain: ${input.industryDomain}` });
    }
    // Offering type
    if (!input.offeringType) {
        errors.push({ field: 'offeringType', message: 'Offering type is required' });
    }
    else if (!(0, enums_1.isValidOfferingType)(input.offeringType)) {
        errors.push({ field: 'offeringType', message: `Invalid offering type: ${input.offeringType}` });
    }
    // Action type
    if (!input.actionType) {
        errors.push({ field: 'actionType', message: 'Action type is required' });
    }
    else if (!(0, enums_1.isValidActionType)(input.actionType)) {
        errors.push({ field: 'actionType', message: `Invalid action type: ${input.actionType}` });
    }
    // Price (null allowed when priceType === 'unknown')
    if (input.priceType !== 'unknown') {
        if (input.price === undefined) {
            errors.push({ field: 'price', message: 'Price is required (or set priceType to unknown)' });
        }
        else if (input.price !== null && (typeof input.price !== 'number' || input.price < 0)) {
            errors.push({ field: 'price', message: 'Price must be a non-negative number or null' });
        }
    }
    // Currency (null allowed when not specified)
    if (input.currency !== null && input.currency !== undefined && !(0, enums_1.isValidCurrency)(input.currency)) {
        errors.push({ field: 'currency', message: `Invalid currency: ${input.currency}` });
    }
    // Price type
    if (!input.priceType) {
        errors.push({ field: 'priceType', message: 'Price type is required' });
    }
    else if (!(0, enums_1.isValidPriceType)(input.priceType)) {
        errors.push({ field: 'priceType', message: `Invalid price type: ${input.priceType}` });
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Normalize a CatalogItemInput (prepare for storage)
 * Uses industry defaults if offering/action type not provided
 */
function normalizeCatalogItem(input) {
    var _a, _b, _c;
    return Object.assign(Object.assign({}, input), { name: input.name.trim(), section: input.section.trim(), subsection: (_a = input.subsection) === null || _a === void 0 ? void 0 : _a.trim(), description: (_b = input.description) === null || _b === void 0 ? void 0 : _b.trim(), nameNormalized: input.name.trim().toLowerCase(), taxonomyVersion: canonical_1.TAXONOMY_VERSION, isAvailable: (_c = input.isAvailable) !== null && _c !== void 0 ? _c : true, 
        // Use industry defaults if not explicitly provided
        offeringType: input.offeringType || (0, canonical_1.getDefaultOfferingType)(input.industryDomain), actionType: input.actionType || (0, canonical_1.getDefaultActionType)(input.industryDomain) });
}
//# sourceMappingURL=validate.js.map