/**
 * Deletion Guard Tests (HUM-01)
 */

import {
    authorizeDeletion,
    authorizeProtectedDeletion,
    assertDeletionAuthorized,
    isProtectedCollection,
    type DeletionContext,
} from '../deletion.guard';

describe('deletion.guard', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('authorizeDeletion', () => {
        it('should DENY deletion when ALLOW_DESTRUCTIVE_OPS is not set', () => {
            delete process.env.ALLOW_DESTRUCTIVE_OPS;

            const ctx: DeletionContext = {
                collection: 'test',
                caller: 'test-user',
                reason: 'unit test',
            };

            const result = authorizeDeletion(ctx);

            expect(result.authorized).toBe(false);
            expect(result.reason).toContain('ALLOW_DESTRUCTIVE_OPS');
        });

        it('should DENY deletion when caller is missing', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';

            const ctx: DeletionContext = {
                collection: 'test',
                caller: '',
                reason: 'unit test',
            };

            const result = authorizeDeletion(ctx);

            expect(result.authorized).toBe(false);
            expect(result.reason).toContain('Caller');
        });

        it('should DENY deletion when reason is missing', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';

            const ctx: DeletionContext = {
                collection: 'test',
                caller: 'test-user',
                reason: '',
            };

            const result = authorizeDeletion(ctx);

            expect(result.authorized).toBe(false);
            expect(result.reason).toContain('reason');
        });

        it('should AUTHORIZE deletion when all requirements met', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';

            const ctx: DeletionContext = {
                collection: 'test',
                caller: 'test-user',
                reason: 'unit test cleanup',
            };

            const result = authorizeDeletion(ctx);

            expect(result.authorized).toBe(true);
        });
    });

    describe('isProtectedCollection', () => {
        it('should identify protected collections', () => {
            expect(isProtectedCollection('users')).toBe(true);
            expect(isProtectedCollection('jobs')).toBe(true);
            expect(isProtectedCollection('listings')).toBe(true);
        });

        it('should allow non-protected collections', () => {
            expect(isProtectedCollection('temp_data')).toBe(false);
            expect(isProtectedCollection('logs')).toBe(false);
        });
    });

    describe('authorizeProtectedDeletion', () => {
        it('should DENY protected deletion without confirmation', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';

            const ctx: DeletionContext = {
                collection: 'users',
                caller: 'test-user',
                reason: 'cleanup',
            };

            const result = authorizeProtectedDeletion(ctx, false);

            expect(result.authorized).toBe(false);
            expect(result.reason).toContain('confirmation');
        });

        it('should AUTHORIZE protected deletion with confirmation', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';

            const ctx: DeletionContext = {
                collection: 'users',
                caller: 'test-user',
                reason: 'cleanup',
            };

            const result = authorizeProtectedDeletion(ctx, true);

            expect(result.authorized).toBe(true);
        });
    });

    describe('assertDeletionAuthorized', () => {
        it('should throw when deletion is not authorized', () => {
            delete process.env.ALLOW_DESTRUCTIVE_OPS;

            const ctx: DeletionContext = {
                collection: 'test',
                caller: 'test-user',
                reason: 'cleanup',
            };

            expect(() => assertDeletionAuthorized(ctx)).toThrow('Deletion denied');
        });

        it('should not throw when deletion is authorized', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';

            const ctx: DeletionContext = {
                collection: 'test',
                caller: 'test-user',
                reason: 'cleanup',
            };

            expect(() => assertDeletionAuthorized(ctx)).not.toThrow();
        });
    });
});
