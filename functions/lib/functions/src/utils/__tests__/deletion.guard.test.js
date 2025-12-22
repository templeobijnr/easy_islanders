"use strict";
/**
 * Deletion Guard Tests (HUM-01)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const deletion_guard_1 = require("../deletion.guard");
(0, vitest_1.describe)('deletion.guard', () => {
    const originalEnv = process.env;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        process.env = Object.assign({}, originalEnv);
    });
    (0, vitest_1.afterEach)(() => {
        process.env = originalEnv;
    });
    (0, vitest_1.describe)('authorizeDeletion', () => {
        (0, vitest_1.it)('should DENY deletion when ALLOW_DESTRUCTIVE_OPS is not set', () => {
            delete process.env.ALLOW_DESTRUCTIVE_OPS;
            const ctx = {
                collection: 'test',
                caller: 'test-user',
                reason: 'unit test',
            };
            const result = (0, deletion_guard_1.authorizeDeletion)(ctx);
            (0, vitest_1.expect)(result.authorized).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('ALLOW_DESTRUCTIVE_OPS');
        });
        (0, vitest_1.it)('should DENY deletion when caller is missing', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';
            const ctx = {
                collection: 'test',
                caller: '',
                reason: 'unit test',
            };
            const result = (0, deletion_guard_1.authorizeDeletion)(ctx);
            (0, vitest_1.expect)(result.authorized).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('Caller');
        });
        (0, vitest_1.it)('should DENY deletion when reason is missing', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';
            const ctx = {
                collection: 'test',
                caller: 'test-user',
                reason: '',
            };
            const result = (0, deletion_guard_1.authorizeDeletion)(ctx);
            (0, vitest_1.expect)(result.authorized).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('reason');
        });
        (0, vitest_1.it)('should AUTHORIZE deletion when all requirements met', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';
            const ctx = {
                collection: 'test',
                caller: 'test-user',
                reason: 'unit test cleanup',
            };
            const result = (0, deletion_guard_1.authorizeDeletion)(ctx);
            (0, vitest_1.expect)(result.authorized).toBe(true);
        });
    });
    (0, vitest_1.describe)('isProtectedCollection', () => {
        (0, vitest_1.it)('should identify protected collections', () => {
            (0, vitest_1.expect)((0, deletion_guard_1.isProtectedCollection)('users')).toBe(true);
            (0, vitest_1.expect)((0, deletion_guard_1.isProtectedCollection)('jobs')).toBe(true);
            (0, vitest_1.expect)((0, deletion_guard_1.isProtectedCollection)('listings')).toBe(true);
        });
        (0, vitest_1.it)('should allow non-protected collections', () => {
            (0, vitest_1.expect)((0, deletion_guard_1.isProtectedCollection)('temp_data')).toBe(false);
            (0, vitest_1.expect)((0, deletion_guard_1.isProtectedCollection)('logs')).toBe(false);
        });
    });
    (0, vitest_1.describe)('authorizeProtectedDeletion', () => {
        (0, vitest_1.it)('should DENY protected deletion without confirmation', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';
            const ctx = {
                collection: 'users',
                caller: 'test-user',
                reason: 'cleanup',
            };
            const result = (0, deletion_guard_1.authorizeProtectedDeletion)(ctx, false);
            (0, vitest_1.expect)(result.authorized).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('confirmation');
        });
        (0, vitest_1.it)('should AUTHORIZE protected deletion with confirmation', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';
            const ctx = {
                collection: 'users',
                caller: 'test-user',
                reason: 'cleanup',
            };
            const result = (0, deletion_guard_1.authorizeProtectedDeletion)(ctx, true);
            (0, vitest_1.expect)(result.authorized).toBe(true);
        });
    });
    (0, vitest_1.describe)('assertDeletionAuthorized', () => {
        (0, vitest_1.it)('should throw when deletion is not authorized', () => {
            delete process.env.ALLOW_DESTRUCTIVE_OPS;
            const ctx = {
                collection: 'test',
                caller: 'test-user',
                reason: 'cleanup',
            };
            (0, vitest_1.expect)(() => (0, deletion_guard_1.assertDeletionAuthorized)(ctx)).toThrow('Deletion denied');
        });
        (0, vitest_1.it)('should not throw when deletion is authorized', () => {
            process.env.ALLOW_DESTRUCTIVE_OPS = 'true';
            const ctx = {
                collection: 'test',
                caller: 'test-user',
                reason: 'cleanup',
            };
            (0, vitest_1.expect)(() => (0, deletion_guard_1.assertDeletionAuthorized)(ctx)).not.toThrow();
        });
    });
});
//# sourceMappingURL=deletion.guard.test.js.map