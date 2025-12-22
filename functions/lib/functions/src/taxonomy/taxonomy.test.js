"use strict";
/**
 * Taxonomy Module Unit Tests
 *
 * Tests enum validation and industry defaults.
 * Categories are business-defined, not tested here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("./enums");
const canonical_1 = require("./canonical");
describe('Taxonomy Enums', () => {
    describe('IndustryDomain', () => {
        it('should have 12 industry domains', () => {
            expect(enums_1.INDUSTRY_DOMAIN_VALUES).toHaveLength(12);
        });
        it('should include expected domains', () => {
            expect(enums_1.INDUSTRY_DOMAIN_VALUES).toContain('food');
            expect(enums_1.INDUSTRY_DOMAIN_VALUES).toContain('beauty');
            expect(enums_1.INDUSTRY_DOMAIN_VALUES).toContain('health');
            expect(enums_1.INDUSTRY_DOMAIN_VALUES).toContain('electronics');
        });
        it('should validate valid domain', () => {
            expect((0, enums_1.isValidIndustryDomain)('food')).toBe(true);
            expect((0, enums_1.isValidIndustryDomain)('beauty')).toBe(true);
        });
        it('should reject invalid domain', () => {
            expect((0, enums_1.isValidIndustryDomain)('invalid')).toBe(false);
            expect((0, enums_1.isValidIndustryDomain)('')).toBe(false);
        });
    });
    describe('OfferingType validation', () => {
        it('should validate product and service', () => {
            expect((0, enums_1.isValidOfferingType)('product')).toBe(true);
            expect((0, enums_1.isValidOfferingType)('service')).toBe(true);
            expect((0, enums_1.isValidOfferingType)('ticket')).toBe(true);
        });
        it('should reject invalid types', () => {
            expect((0, enums_1.isValidOfferingType)('unknown')).toBe(false);
        });
    });
    describe('ActionType validation', () => {
        it('should validate buy, book, visit', () => {
            expect((0, enums_1.isValidActionType)('buy')).toBe(true);
            expect((0, enums_1.isValidActionType)('book')).toBe(true);
            expect((0, enums_1.isValidActionType)('visit')).toBe(true);
        });
        it('should reject invalid actions', () => {
            expect((0, enums_1.isValidActionType)('purchase')).toBe(false);
        });
    });
    describe('EntityType validation', () => {
        it('should validate place, stay, activity', () => {
            expect((0, enums_1.isValidEntityType)('place')).toBe(true);
            expect((0, enums_1.isValidEntityType)('stay')).toBe(true);
            expect((0, enums_1.isValidEntityType)('activity')).toBe(true);
        });
    });
    describe('PriceType validation', () => {
        it('should validate fixed, from, free', () => {
            expect((0, enums_1.isValidPriceType)('fixed')).toBe(true);
            expect((0, enums_1.isValidPriceType)('from')).toBe(true);
            expect((0, enums_1.isValidPriceType)('free')).toBe(true);
        });
    });
    describe('Currency validation', () => {
        it('should validate TRY, GBP, EUR, USD', () => {
            expect((0, enums_1.isValidCurrency)('TRY')).toBe(true);
            expect((0, enums_1.isValidCurrency)('GBP')).toBe(true);
            expect((0, enums_1.isValidCurrency)('EUR')).toBe(true);
            expect((0, enums_1.isValidCurrency)('USD')).toBe(true);
        });
        it('should reject invalid currency', () => {
            expect((0, enums_1.isValidCurrency)('JPY')).toBe(false);
        });
    });
});
describe('Industry Defaults', () => {
    describe('TAXONOMY_VERSION', () => {
        it('should be nc_v1', () => {
            expect(canonical_1.TAXONOMY_VERSION).toBe('nc_v1');
        });
    });
    describe('getAllIndustries', () => {
        it('should return 12 industries', () => {
            const industries = (0, canonical_1.getAllIndustries)();
            expect(industries).toHaveLength(12);
        });
        it('should include food and beauty', () => {
            const industries = (0, canonical_1.getAllIndustries)();
            const domains = industries.map(i => i.industryDomain);
            expect(domains).toContain('food');
            expect(domains).toContain('beauty');
        });
    });
    describe('getIndustryDefaults', () => {
        it('should return defaults for food', () => {
            const defaults = (0, canonical_1.getIndustryDefaults)('food');
            expect(defaults.industryDomain).toBe('food');
            expect(defaults.label).toBe('Food & Beverage');
            expect(defaults.defaultOfferingType).toBe('product');
            expect(defaults.defaultActionType).toBe('buy');
        });
        it('should return defaults for beauty', () => {
            const defaults = (0, canonical_1.getIndustryDefaults)('beauty');
            expect(defaults.industryDomain).toBe('beauty');
            expect(defaults.defaultOfferingType).toBe('service');
            expect(defaults.defaultActionType).toBe('book');
        });
        it('should return defaults for attractions', () => {
            const defaults = (0, canonical_1.getIndustryDefaults)('attractions');
            expect(defaults.defaultOfferingType).toBe('ticket');
            expect(defaults.defaultActionType).toBe('visit');
        });
    });
    describe('getDefaultOfferingType', () => {
        it('should return product for food', () => {
            expect((0, canonical_1.getDefaultOfferingType)('food')).toBe('product');
        });
        it('should return service for beauty', () => {
            expect((0, canonical_1.getDefaultOfferingType)('beauty')).toBe('service');
        });
        it('should return rental for hospitality', () => {
            expect((0, canonical_1.getDefaultOfferingType)('hospitality')).toBe('rental');
        });
    });
    describe('getDefaultActionType', () => {
        it('should return buy for food', () => {
            expect((0, canonical_1.getDefaultActionType)('food')).toBe('buy');
        });
        it('should return book for beauty', () => {
            expect((0, canonical_1.getDefaultActionType)('beauty')).toBe('book');
        });
        it('should return visit for attractions', () => {
            expect((0, canonical_1.getDefaultActionType)('attractions')).toBe('visit');
        });
        it('should return quote for professional', () => {
            expect((0, canonical_1.getDefaultActionType)('professional')).toBe('quote');
        });
    });
    describe('isValidIndustry', () => {
        it('should return true for valid industries', () => {
            expect((0, canonical_1.isValidIndustry)('food')).toBe(true);
            expect((0, canonical_1.isValidIndustry)('beauty')).toBe(true);
        });
        it('should return false for invalid industries', () => {
            expect((0, canonical_1.isValidIndustry)('invalid')).toBe(false);
            expect((0, canonical_1.isValidIndustry)('')).toBe(false);
        });
    });
    describe('Industry consistency', () => {
        it('all industries should have required fields', () => {
            const industries = (0, canonical_1.getAllIndustries)();
            for (const industry of industries) {
                expect(industry.industryDomain).toBeTruthy();
                expect(industry.label).toBeTruthy();
                expect(industry.defaultOfferingType).toBeTruthy();
                expect(industry.defaultActionType).toBeTruthy();
                expect(industry.description).toBeTruthy();
            }
        });
        it('all industries should have valid enum values', () => {
            const industries = (0, canonical_1.getAllIndustries)();
            for (const industry of industries) {
                expect((0, enums_1.isValidIndustryDomain)(industry.industryDomain)).toBe(true);
                expect((0, enums_1.isValidOfferingType)(industry.defaultOfferingType)).toBe(true);
                expect((0, enums_1.isValidActionType)(industry.defaultActionType)).toBe(true);
            }
        });
    });
});
//# sourceMappingURL=taxonomy.test.js.map