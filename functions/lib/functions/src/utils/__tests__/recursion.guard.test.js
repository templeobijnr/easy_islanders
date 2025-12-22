"use strict";
/**
 * Recursion Guard Tests (RUN-03)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const recursion_guard_1 = require("../recursion.guard");
(0, vitest_1.describe)('recursion.guard', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, recursion_guard_1.clearRecursionCache)();
    });
    (0, vitest_1.describe)('checkRecursion', () => {
        (0, vitest_1.it)('should allow first execution (depth 1)', () => {
            const ctx = {
                eventId: 'event-1',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc1',
            };
            const result = (0, recursion_guard_1.checkRecursion)(ctx);
            (0, vitest_1.expect)(result.halt).toBe(false);
            (0, vitest_1.expect)(result.depth).toBe(1);
        });
        (0, vitest_1.it)('should allow second execution (depth 2)', () => {
            const ctx = {
                eventId: 'event-2',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc2',
            };
            // First call
            (0, recursion_guard_1.checkRecursion)(ctx);
            // Second call
            const result = (0, recursion_guard_1.checkRecursion)(ctx);
            (0, vitest_1.expect)(result.halt).toBe(false);
            (0, vitest_1.expect)(result.depth).toBe(2);
        });
        (0, vitest_1.it)('should HALT on third execution (depth 3)', () => {
            const ctx = {
                eventId: 'event-3',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc3',
            };
            // First call (depth 1)
            (0, recursion_guard_1.checkRecursion)(ctx);
            // Second call (depth 2)
            (0, recursion_guard_1.checkRecursion)(ctx);
            // Third call (depth 3) - should halt
            const result = (0, recursion_guard_1.checkRecursion)(ctx);
            (0, vitest_1.expect)(result.halt).toBe(true);
            (0, vitest_1.expect)(result.depth).toBe(3);
            (0, vitest_1.expect)(result.reason).toContain('exceeds maximum');
        });
        (0, vitest_1.it)('should track different events separately', () => {
            const ctx1 = {
                eventId: 'event-a',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc1',
            };
            const ctx2 = {
                eventId: 'event-b',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc2',
            };
            // Call ctx1 twice
            (0, recursion_guard_1.checkRecursion)(ctx1);
            (0, recursion_guard_1.checkRecursion)(ctx1);
            // Call ctx2 once - should be depth 1
            const result = (0, recursion_guard_1.checkRecursion)(ctx2);
            (0, vitest_1.expect)(result.halt).toBe(false);
            (0, vitest_1.expect)(result.depth).toBe(1);
        });
    });
    (0, vitest_1.describe)('assertRecursionSafe', () => {
        (0, vitest_1.it)('should not throw on first execution', () => {
            const ctx = {
                eventId: 'event-assert-1',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc1',
            };
            (0, vitest_1.expect)(() => (0, recursion_guard_1.assertRecursionSafe)(ctx)).not.toThrow();
        });
        (0, vitest_1.it)('should throw when recursion limit exceeded', () => {
            const ctx = {
                eventId: 'event-assert-2',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc2',
            };
            // Exhaust the limit
            (0, recursion_guard_1.checkRecursion)(ctx);
            (0, recursion_guard_1.checkRecursion)(ctx);
            (0, recursion_guard_1.checkRecursion)(ctx);
            // Fourth call should throw
            (0, vitest_1.expect)(() => (0, recursion_guard_1.assertRecursionSafe)(ctx)).toThrow('Recursion guard halted');
        });
    });
    (0, vitest_1.describe)('cache management', () => {
        (0, vitest_1.it)('should track cache size correctly', () => {
            (0, vitest_1.expect)((0, recursion_guard_1.getRecursionCacheSize)()).toBe(0);
            (0, recursion_guard_1.checkRecursion)({
                eventId: 'event-cache-1',
                triggerName: 'test',
                documentPath: 'test/doc',
            });
            (0, vitest_1.expect)((0, recursion_guard_1.getRecursionCacheSize)()).toBe(1);
            (0, recursion_guard_1.checkRecursion)({
                eventId: 'event-cache-2',
                triggerName: 'test',
                documentPath: 'test/doc',
            });
            (0, vitest_1.expect)((0, recursion_guard_1.getRecursionCacheSize)()).toBe(2);
        });
        (0, vitest_1.it)('should clear cache correctly', () => {
            (0, recursion_guard_1.checkRecursion)({
                eventId: 'event-clear-1',
                triggerName: 'test',
                documentPath: 'test/doc',
            });
            (0, vitest_1.expect)((0, recursion_guard_1.getRecursionCacheSize)()).toBe(1);
            (0, recursion_guard_1.clearRecursionCache)();
            (0, vitest_1.expect)((0, recursion_guard_1.getRecursionCacheSize)()).toBe(0);
        });
    });
});
//# sourceMappingURL=recursion.guard.test.js.map