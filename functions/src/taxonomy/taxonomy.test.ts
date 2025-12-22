/**
 * Taxonomy Module Unit Tests
 *
 * Tests enum validation and industry defaults.
 * Categories are business-defined, not tested here.
 */

import {
    INDUSTRY_DOMAIN_VALUES,
    isValidIndustryDomain,
    isValidOfferingType,
    isValidActionType,
    isValidEntityType,
    isValidPriceType,
    isValidCurrency,
} from './enums';

import {
    TAXONOMY_VERSION,
    getIndustryDefaults,
    getDefaultOfferingType,
    getDefaultActionType,
    getAllIndustries,
    isValidIndustry,
} from './canonical';

describe('Taxonomy Enums', () => {
    describe('IndustryDomain', () => {
        it('should have 12 industry domains', () => {
            expect(INDUSTRY_DOMAIN_VALUES).toHaveLength(12);
        });

        it('should include expected domains', () => {
            expect(INDUSTRY_DOMAIN_VALUES).toContain('food');
            expect(INDUSTRY_DOMAIN_VALUES).toContain('beauty');
            expect(INDUSTRY_DOMAIN_VALUES).toContain('health');
            expect(INDUSTRY_DOMAIN_VALUES).toContain('electronics');
        });

        it('should validate valid domain', () => {
            expect(isValidIndustryDomain('food')).toBe(true);
            expect(isValidIndustryDomain('beauty')).toBe(true);
        });

        it('should reject invalid domain', () => {
            expect(isValidIndustryDomain('invalid')).toBe(false);
            expect(isValidIndustryDomain('')).toBe(false);
        });
    });

    describe('OfferingType validation', () => {
        it('should validate product and service', () => {
            expect(isValidOfferingType('product')).toBe(true);
            expect(isValidOfferingType('service')).toBe(true);
            expect(isValidOfferingType('ticket')).toBe(true);
        });

        it('should reject invalid types', () => {
            expect(isValidOfferingType('unknown')).toBe(false);
        });
    });

    describe('ActionType validation', () => {
        it('should validate buy, book, visit', () => {
            expect(isValidActionType('buy')).toBe(true);
            expect(isValidActionType('book')).toBe(true);
            expect(isValidActionType('visit')).toBe(true);
        });

        it('should reject invalid actions', () => {
            expect(isValidActionType('purchase')).toBe(false);
        });
    });

    describe('EntityType validation', () => {
        it('should validate place, stay, activity', () => {
            expect(isValidEntityType('place')).toBe(true);
            expect(isValidEntityType('stay')).toBe(true);
            expect(isValidEntityType('activity')).toBe(true);
        });
    });

    describe('PriceType validation', () => {
        it('should validate fixed, from, free', () => {
            expect(isValidPriceType('fixed')).toBe(true);
            expect(isValidPriceType('from')).toBe(true);
            expect(isValidPriceType('free')).toBe(true);
        });
    });

    describe('Currency validation', () => {
        it('should validate TRY, GBP, EUR, USD', () => {
            expect(isValidCurrency('TRY')).toBe(true);
            expect(isValidCurrency('GBP')).toBe(true);
            expect(isValidCurrency('EUR')).toBe(true);
            expect(isValidCurrency('USD')).toBe(true);
        });

        it('should reject invalid currency', () => {
            expect(isValidCurrency('JPY')).toBe(false);
        });
    });
});

describe('Industry Defaults', () => {
    describe('TAXONOMY_VERSION', () => {
        it('should be nc_v1', () => {
            expect(TAXONOMY_VERSION).toBe('nc_v1');
        });
    });

    describe('getAllIndustries', () => {
        it('should return 12 industries', () => {
            const industries = getAllIndustries();
            expect(industries).toHaveLength(12);
        });

        it('should include food and beauty', () => {
            const industries = getAllIndustries();
            const domains = industries.map(i => i.industryDomain);
            expect(domains).toContain('food');
            expect(domains).toContain('beauty');
        });
    });

    describe('getIndustryDefaults', () => {
        it('should return defaults for food', () => {
            const defaults = getIndustryDefaults('food');
            expect(defaults.industryDomain).toBe('food');
            expect(defaults.label).toBe('Food & Beverage');
            expect(defaults.defaultOfferingType).toBe('product');
            expect(defaults.defaultActionType).toBe('buy');
        });

        it('should return defaults for beauty', () => {
            const defaults = getIndustryDefaults('beauty');
            expect(defaults.industryDomain).toBe('beauty');
            expect(defaults.defaultOfferingType).toBe('service');
            expect(defaults.defaultActionType).toBe('book');
        });

        it('should return defaults for attractions', () => {
            const defaults = getIndustryDefaults('attractions');
            expect(defaults.defaultOfferingType).toBe('ticket');
            expect(defaults.defaultActionType).toBe('visit');
        });
    });

    describe('getDefaultOfferingType', () => {
        it('should return product for food', () => {
            expect(getDefaultOfferingType('food')).toBe('product');
        });

        it('should return service for beauty', () => {
            expect(getDefaultOfferingType('beauty')).toBe('service');
        });

        it('should return rental for hospitality', () => {
            expect(getDefaultOfferingType('hospitality')).toBe('rental');
        });
    });

    describe('getDefaultActionType', () => {
        it('should return buy for food', () => {
            expect(getDefaultActionType('food')).toBe('buy');
        });

        it('should return book for beauty', () => {
            expect(getDefaultActionType('beauty')).toBe('book');
        });

        it('should return visit for attractions', () => {
            expect(getDefaultActionType('attractions')).toBe('visit');
        });

        it('should return quote for professional', () => {
            expect(getDefaultActionType('professional')).toBe('quote');
        });
    });

    describe('isValidIndustry', () => {
        it('should return true for valid industries', () => {
            expect(isValidIndustry('food')).toBe(true);
            expect(isValidIndustry('beauty')).toBe(true);
        });

        it('should return false for invalid industries', () => {
            expect(isValidIndustry('invalid')).toBe(false);
            expect(isValidIndustry('')).toBe(false);
        });
    });

    describe('Industry consistency', () => {
        it('all industries should have required fields', () => {
            const industries = getAllIndustries();

            for (const industry of industries) {
                expect(industry.industryDomain).toBeTruthy();
                expect(industry.label).toBeTruthy();
                expect(industry.defaultOfferingType).toBeTruthy();
                expect(industry.defaultActionType).toBeTruthy();
                expect(industry.description).toBeTruthy();
            }
        });

        it('all industries should have valid enum values', () => {
            const industries = getAllIndustries();

            for (const industry of industries) {
                expect(isValidIndustryDomain(industry.industryDomain)).toBe(true);
                expect(isValidOfferingType(industry.defaultOfferingType)).toBe(true);
                expect(isValidActionType(industry.defaultActionType)).toBe(true);
            }
        });
    });
});
