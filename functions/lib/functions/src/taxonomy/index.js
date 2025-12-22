"use strict";
/**
 * Taxonomy Module Index
 *
 * Re-exports all taxonomy components for clean imports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCatalogItem = exports.validateCatalogItem = exports.isValidIndustry = exports.getAllIndustries = exports.getDefaultActionType = exports.getDefaultOfferingType = exports.getIndustryDefaults = exports.INDUSTRY_DEFAULTS = exports.TAXONOMY_VERSION = exports.isValidCurrency = exports.isValidPriceType = exports.isValidEntityType = exports.isValidActionType = exports.isValidOfferingType = exports.isValidIndustryDomain = exports.CURRENCY_VALUES = exports.PRICE_TYPE_VALUES = exports.ENTITY_TYPE_VALUES = exports.ACTION_TYPE_VALUES = exports.OFFERING_TYPE_VALUES = exports.INDUSTRY_DOMAIN_VALUES = exports.CURRENCIES = exports.PRICE_TYPES = exports.ENTITY_TYPES = exports.ACTION_TYPES = exports.OFFERING_TYPES = exports.INDUSTRY_DOMAINS = void 0;
// Enums and type guards
var enums_1 = require("./enums");
Object.defineProperty(exports, "INDUSTRY_DOMAINS", { enumerable: true, get: function () { return enums_1.INDUSTRY_DOMAINS; } });
Object.defineProperty(exports, "OFFERING_TYPES", { enumerable: true, get: function () { return enums_1.OFFERING_TYPES; } });
Object.defineProperty(exports, "ACTION_TYPES", { enumerable: true, get: function () { return enums_1.ACTION_TYPES; } });
Object.defineProperty(exports, "ENTITY_TYPES", { enumerable: true, get: function () { return enums_1.ENTITY_TYPES; } });
Object.defineProperty(exports, "PRICE_TYPES", { enumerable: true, get: function () { return enums_1.PRICE_TYPES; } });
Object.defineProperty(exports, "CURRENCIES", { enumerable: true, get: function () { return enums_1.CURRENCIES; } });
Object.defineProperty(exports, "INDUSTRY_DOMAIN_VALUES", { enumerable: true, get: function () { return enums_1.INDUSTRY_DOMAIN_VALUES; } });
Object.defineProperty(exports, "OFFERING_TYPE_VALUES", { enumerable: true, get: function () { return enums_1.OFFERING_TYPE_VALUES; } });
Object.defineProperty(exports, "ACTION_TYPE_VALUES", { enumerable: true, get: function () { return enums_1.ACTION_TYPE_VALUES; } });
Object.defineProperty(exports, "ENTITY_TYPE_VALUES", { enumerable: true, get: function () { return enums_1.ENTITY_TYPE_VALUES; } });
Object.defineProperty(exports, "PRICE_TYPE_VALUES", { enumerable: true, get: function () { return enums_1.PRICE_TYPE_VALUES; } });
Object.defineProperty(exports, "CURRENCY_VALUES", { enumerable: true, get: function () { return enums_1.CURRENCY_VALUES; } });
Object.defineProperty(exports, "isValidIndustryDomain", { enumerable: true, get: function () { return enums_1.isValidIndustryDomain; } });
Object.defineProperty(exports, "isValidOfferingType", { enumerable: true, get: function () { return enums_1.isValidOfferingType; } });
Object.defineProperty(exports, "isValidActionType", { enumerable: true, get: function () { return enums_1.isValidActionType; } });
Object.defineProperty(exports, "isValidEntityType", { enumerable: true, get: function () { return enums_1.isValidEntityType; } });
Object.defineProperty(exports, "isValidPriceType", { enumerable: true, get: function () { return enums_1.isValidPriceType; } });
Object.defineProperty(exports, "isValidCurrency", { enumerable: true, get: function () { return enums_1.isValidCurrency; } });
// Industry defaults (not pre-defined categories)
var canonical_1 = require("./canonical");
Object.defineProperty(exports, "TAXONOMY_VERSION", { enumerable: true, get: function () { return canonical_1.TAXONOMY_VERSION; } });
Object.defineProperty(exports, "INDUSTRY_DEFAULTS", { enumerable: true, get: function () { return canonical_1.INDUSTRY_DEFAULTS; } });
Object.defineProperty(exports, "getIndustryDefaults", { enumerable: true, get: function () { return canonical_1.getIndustryDefaults; } });
Object.defineProperty(exports, "getDefaultOfferingType", { enumerable: true, get: function () { return canonical_1.getDefaultOfferingType; } });
Object.defineProperty(exports, "getDefaultActionType", { enumerable: true, get: function () { return canonical_1.getDefaultActionType; } });
Object.defineProperty(exports, "getAllIndustries", { enumerable: true, get: function () { return canonical_1.getAllIndustries; } });
Object.defineProperty(exports, "isValidIndustry", { enumerable: true, get: function () { return canonical_1.isValidIndustry; } });
// Validation
var validate_1 = require("./validate");
Object.defineProperty(exports, "validateCatalogItem", { enumerable: true, get: function () { return validate_1.validateCatalogItem; } });
Object.defineProperty(exports, "normalizeCatalogItem", { enumerable: true, get: function () { return validate_1.normalizeCatalogItem; } });
//# sourceMappingURL=index.js.map