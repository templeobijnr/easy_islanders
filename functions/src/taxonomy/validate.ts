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

import {
    isValidIndustryDomain,
    isValidOfferingType,
    isValidActionType,
    isValidPriceType,
    isValidCurrency,
} from './enums';
import {
    TAXONOMY_VERSION,
    getDefaultOfferingType,
    getDefaultActionType,
} from './canonical';
import { CatalogItemInput } from '../types/catalog';

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

/**
 * Validate a CatalogItemInput before saving
 */
export function validateCatalogItem(input: Partial<CatalogItemInput>): ValidationResult {
    const errors: ValidationError[] = [];

    // Required string fields
    if (!input.businessId?.trim()) {
        errors.push({ field: 'businessId', message: 'Business ID is required' });
    }
    if (!input.marketId?.trim()) {
        errors.push({ field: 'marketId', message: 'Market ID is required' });
    }
    if (!input.section?.trim()) {
        errors.push({ field: 'section', message: 'Section is required' });
    }
    if (!input.name?.trim()) {
        errors.push({ field: 'name', message: 'Name is required' });
    }

    // Industry domain
    if (!input.industryDomain) {
        errors.push({ field: 'industryDomain', message: 'Industry domain is required' });
    } else if (!isValidIndustryDomain(input.industryDomain)) {
        errors.push({ field: 'industryDomain', message: `Invalid industry domain: ${input.industryDomain}` });
    }

    // Offering type
    if (!input.offeringType) {
        errors.push({ field: 'offeringType', message: 'Offering type is required' });
    } else if (!isValidOfferingType(input.offeringType)) {
        errors.push({ field: 'offeringType', message: `Invalid offering type: ${input.offeringType}` });
    }

    // Action type
    if (!input.actionType) {
        errors.push({ field: 'actionType', message: 'Action type is required' });
    } else if (!isValidActionType(input.actionType)) {
        errors.push({ field: 'actionType', message: `Invalid action type: ${input.actionType}` });
    }

    // Price (null allowed when priceType === 'unknown')
    if (input.priceType !== 'unknown') {
        if (input.price === undefined) {
            errors.push({ field: 'price', message: 'Price is required (or set priceType to unknown)' });
        } else if (input.price !== null && (typeof input.price !== 'number' || input.price < 0)) {
            errors.push({ field: 'price', message: 'Price must be a non-negative number or null' });
        }
    }

    // Currency (null allowed when not specified)
    if (input.currency !== null && input.currency !== undefined && !isValidCurrency(input.currency)) {
        errors.push({ field: 'currency', message: `Invalid currency: ${input.currency}` });
    }

    // Price type
    if (!input.priceType) {
        errors.push({ field: 'priceType', message: 'Price type is required' });
    } else if (!isValidPriceType(input.priceType)) {
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
export function normalizeCatalogItem(input: CatalogItemInput): CatalogItemInput & {
    nameNormalized: string;
    taxonomyVersion: string;
} {
    return {
        ...input,
        name: input.name.trim(),
        section: input.section.trim(),
        subsection: input.subsection?.trim(),
        description: input.description?.trim(),
        nameNormalized: input.name.trim().toLowerCase(),
        taxonomyVersion: TAXONOMY_VERSION,
        isAvailable: input.isAvailable ?? true,
        // Use industry defaults if not explicitly provided
        offeringType: input.offeringType || getDefaultOfferingType(input.industryDomain),
        actionType: input.actionType || getDefaultActionType(input.industryDomain),
    };
}
