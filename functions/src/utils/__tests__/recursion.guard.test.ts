/**
 * Recursion Guard Tests (RUN-03)
 */

import {
    checkRecursion,
    assertRecursionSafe,
    clearRecursionCache,
    getRecursionCacheSize,
    type RecursionContext,
} from '../recursion.guard';

describe('recursion.guard', () => {
    beforeEach(() => {
        clearRecursionCache();
    });

    describe('checkRecursion', () => {
        it('should allow first execution (depth 1)', () => {
            const ctx: RecursionContext = {
                eventId: 'event-1',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc1',
            };

            const result = checkRecursion(ctx);

            expect(result.halt).toBe(false);
            expect(result.depth).toBe(1);
        });

        it('should allow second execution (depth 2)', () => {
            const ctx: RecursionContext = {
                eventId: 'event-2',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc2',
            };

            // First call
            checkRecursion(ctx);

            // Second call
            const result = checkRecursion(ctx);

            expect(result.halt).toBe(false);
            expect(result.depth).toBe(2);
        });

        it('should HALT on third execution (depth 3)', () => {
            const ctx: RecursionContext = {
                eventId: 'event-3',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc3',
            };

            // First call (depth 1)
            checkRecursion(ctx);

            // Second call (depth 2)
            checkRecursion(ctx);

            // Third call (depth 3) - should halt
            const result = checkRecursion(ctx);

            expect(result.halt).toBe(true);
            expect(result.depth).toBe(3);
            expect(result.reason).toContain('exceeds maximum');
        });

        it('should track different events separately', () => {
            const ctx1: RecursionContext = {
                eventId: 'event-a',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc1',
            };

            const ctx2: RecursionContext = {
                eventId: 'event-b',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc2',
            };

            // Call ctx1 twice
            checkRecursion(ctx1);
            checkRecursion(ctx1);

            // Call ctx2 once - should be depth 1
            const result = checkRecursion(ctx2);

            expect(result.halt).toBe(false);
            expect(result.depth).toBe(1);
        });
    });

    describe('assertRecursionSafe', () => {
        it('should not throw on first execution', () => {
            const ctx: RecursionContext = {
                eventId: 'event-assert-1',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc1',
            };

            expect(() => assertRecursionSafe(ctx)).not.toThrow();
        });

        it('should throw when recursion limit exceeded', () => {
            const ctx: RecursionContext = {
                eventId: 'event-assert-2',
                triggerName: 'testTrigger',
                documentPath: 'collection/doc2',
            };

            // Exhaust the limit
            checkRecursion(ctx);
            checkRecursion(ctx);
            checkRecursion(ctx);

            // Fourth call should throw
            expect(() => assertRecursionSafe(ctx)).toThrow('Recursion guard halted');
        });
    });

    describe('cache management', () => {
        it('should track cache size correctly', () => {
            expect(getRecursionCacheSize()).toBe(0);

            checkRecursion({
                eventId: 'event-cache-1',
                triggerName: 'test',
                documentPath: 'test/doc',
            });

            expect(getRecursionCacheSize()).toBe(1);

            checkRecursion({
                eventId: 'event-cache-2',
                triggerName: 'test',
                documentPath: 'test/doc',
            });

            expect(getRecursionCacheSize()).toBe(2);
        });

        it('should clear cache correctly', () => {
            checkRecursion({
                eventId: 'event-clear-1',
                triggerName: 'test',
                documentPath: 'test/doc',
            });

            expect(getRecursionCacheSize()).toBe(1);

            clearRecursionCache();

            expect(getRecursionCacheSize()).toBe(0);
        });
    });
});
