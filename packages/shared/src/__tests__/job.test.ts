/**
 * Unit tests for Job schema
 */

import { describe, it, expect } from 'vitest';
import {
    JobSchema,
    JobStatusSchema,
    CreateJobInputSchema,
    MerchantTargetSchema,
    isValidJobTransition,
    validateJobForDispatch,
    generateJobCode,
} from '../schemas/job.schema';

describe('JobStatusSchema', () => {
    it('accepts all valid statuses', () => {
        const statuses = ['collecting', 'confirming', 'dispatched', 'confirmed', 'cancelled'];
        for (const status of statuses) {
            const result = JobStatusSchema.safeParse(status);
            expect(result.success).toBe(true);
        }
    });

    it('rejects invalid status', () => {
        const result = JobStatusSchema.safeParse('invalid');
        expect(result.success).toBe(false);
    });
});

describe('MerchantTargetSchema', () => {
    it('accepts listed merchant target', () => {
        const result = MerchantTargetSchema.safeParse({
            type: 'listing',
            listingId: 'listing123',
        });
        expect(result.success).toBe(true);
    });

    it('accepts unlisted merchant target with phone', () => {
        const result = MerchantTargetSchema.safeParse({
            type: 'unlisted',
            phone: '+905338123456',
            name: 'Local Taxi',
        });
        expect(result.success).toBe(true);
    });

    it('rejects unlisted target without phone', () => {
        const result = MerchantTargetSchema.safeParse({
            type: 'unlisted',
            name: 'Local Taxi',
        });
        expect(result.success).toBe(false);
    });

    it('rejects unlisted target with invalid phone format', () => {
        const result = MerchantTargetSchema.safeParse({
            type: 'unlisted',
            phone: '05338123456', // Missing + prefix
        });
        expect(result.success).toBe(false);
    });
});

describe('JobSchema', () => {
    const baseJob = {
        id: 'job123',
        ownerUserId: 'user123',
        actionType: 'taxi',
        actionData: {
            actionType: 'taxi',
            pickupLocation: { address: 'Kyrenia Harbour' },
            passengerCount: 2,
        },
        status: 'collecting',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    it('accepts job without merchantTarget in collecting status', () => {
        const result = JobSchema.safeParse(baseJob);
        expect(result.success).toBe(true);
    });

    it('accepts job without merchantTarget in confirming status', () => {
        const result = JobSchema.safeParse({
            ...baseJob,
            status: 'confirming',
        });
        expect(result.success).toBe(true);
    });

    it('rejects job without merchantTarget in dispatched status', () => {
        const result = JobSchema.safeParse({
            ...baseJob,
            status: 'dispatched',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('merchantTarget');
        }
    });

    it('rejects job without merchantTarget in confirmed status', () => {
        const result = JobSchema.safeParse({
            ...baseJob,
            status: 'confirmed',
        });
        expect(result.success).toBe(false);
    });

    it('accepts dispatched job with merchantTarget', () => {
        const result = JobSchema.safeParse({
            ...baseJob,
            status: 'dispatched',
            merchantTarget: {
                type: 'listing',
                listingId: 'listing123',
            },
        });
        expect(result.success).toBe(true);
    });

    it('accepts dispatched job with unlisted merchantTarget', () => {
        const result = JobSchema.safeParse({
            ...baseJob,
            status: 'dispatched',
            merchantTarget: {
                type: 'unlisted',
                phone: '+905338123456',
            },
        });
        expect(result.success).toBe(true);
    });
});

describe('CreateJobInputSchema', () => {
    it('accepts valid create input', () => {
        const result = CreateJobInputSchema.safeParse({
            ownerUserId: 'user123',
            actionType: 'taxi',
            actionData: {
                actionType: 'taxi',
                pickupLocation: { address: 'Kyrenia Harbour' },
            },
        });
        expect(result.success).toBe(true);
    });

    it('accepts optional merchantTarget', () => {
        const result = CreateJobInputSchema.safeParse({
            ownerUserId: 'user123',
            actionType: 'inquire',
            actionData: {
                actionType: 'inquire',
                message: 'Do you have availability tomorrow?',
            },
            merchantTarget: {
                type: 'listing',
                listingId: 'listing123',
            },
        });
        expect(result.success).toBe(true);
    });
});

describe('isValidJobTransition', () => {
    it('allows collecting → confirming', () => {
        expect(isValidJobTransition('collecting', 'confirming')).toBe(true);
    });

    it('allows collecting → cancelled', () => {
        expect(isValidJobTransition('collecting', 'cancelled')).toBe(true);
    });

    it('allows confirming → dispatched', () => {
        expect(isValidJobTransition('confirming', 'dispatched')).toBe(true);
    });

    it('allows dispatched → confirmed', () => {
        expect(isValidJobTransition('dispatched', 'confirmed')).toBe(true);
    });

    it('disallows collecting → dispatched', () => {
        expect(isValidJobTransition('collecting', 'dispatched')).toBe(false);
    });

    it('disallows cancelled → anything', () => {
        expect(isValidJobTransition('cancelled', 'collecting')).toBe(false);
        expect(isValidJobTransition('cancelled', 'confirmed')).toBe(false);
    });

    it('disallows confirmed → dispatched (backward)', () => {
        expect(isValidJobTransition('confirmed', 'dispatched')).toBe(false);
    });
});

describe('validateJobForDispatch', () => {
    const baseJob = {
        id: 'job123',
        ownerUserId: 'user123',
        actionType: 'taxi' as const,
        actionData: {
            actionType: 'taxi' as const,
            pickupLocation: { address: 'Kyrenia Harbour' },
            passengerCount: 1,
        },
        status: 'confirming' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        language: 'en' as const,
        dispatchAttempts: 0,
    };

    it('returns error if job not in confirming status', () => {
        const job = { ...baseJob, status: 'collecting' as const };
        const error = validateJobForDispatch(job);
        expect(error).toContain('confirming');
    });

    it('returns error if no merchantTarget', () => {
        const error = validateJobForDispatch(baseJob);
        expect(error).toContain('merchantTarget');
    });

    it('returns null when ready for dispatch', () => {
        const job = {
            ...baseJob,
            merchantTarget: { type: 'listing' as const, listingId: 'listing123' },
        };
        const error = validateJobForDispatch(job);
        expect(error).toBeNull();
    });
});

describe('generateJobCode', () => {
    it('generates 6-character code', () => {
        const code = generateJobCode();
        expect(code).toHaveLength(6);
    });

    it('only contains allowed characters', () => {
        const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let i = 0; i < 100; i++) {
            const code = generateJobCode();
            for (const char of code) {
                expect(allowedChars).toContain(char);
            }
        }
    });

    it('generates unique codes', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 1000; i++) {
            codes.add(generateJobCode());
        }
        // With 34^6 combinations, 1000 codes should all be unique
        expect(codes.size).toBe(1000);
    });
});
