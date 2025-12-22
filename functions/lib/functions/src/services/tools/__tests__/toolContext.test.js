"use strict";
/**
 * ToolContext Tests
 *
 * Verifies MarketContext enforcement per architecture doc section 14.2 invariants:
 * 1. marketId is REQUIRED - fail fast if missing
 * 2. Compile-time enforcement via TypeScript
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const toolContext_1 = require("../toolContext");
(0, vitest_1.describe)('ToolContext', () => {
    (0, vitest_1.describe)('asToolContext', () => {
        (0, vitest_1.it)('should create ToolContext from legacy userId string with default marketId', () => {
            const ctx = (0, toolContext_1.asToolContext)('user-123', 'session-456');
            (0, vitest_1.expect)(ctx.marketId).toBe('north-cyprus');
            (0, vitest_1.expect)(ctx.userId).toBe('user-123');
            (0, vitest_1.expect)(ctx.sessionId).toBe('session-456');
        });
        (0, vitest_1.it)('should preserve marketId from existing ToolContext', () => {
            const inputCtx = {
                marketId: 'north-cyprus',
                userId: 'user-123',
                channel: 'whatsapp',
            };
            const ctx = (0, toolContext_1.asToolContext)(inputCtx, 'session-456');
            (0, vitest_1.expect)(ctx.marketId).toBe('north-cyprus');
            (0, vitest_1.expect)(ctx.userId).toBe('user-123');
            (0, vitest_1.expect)(ctx.sessionId).toBe('session-456');
            (0, vitest_1.expect)(ctx.channel).toBe('whatsapp');
        });
        (0, vitest_1.it)('should throw if ToolContext is passed without marketId', () => {
            // This simulates a legacy or malformed ToolContext
            const badCtx = {
                userId: 'user-123',
                sessionId: 'session-456',
            };
            (0, vitest_1.expect)(() => (0, toolContext_1.asToolContext)(badCtx)).toThrow('ToolContext.marketId is required');
        });
        (0, vitest_1.it)('should use provided defaultMarketId for legacy path', () => {
            const ctx = (0, toolContext_1.asToolContext)('user-123', 'session-456', 'north-cyprus');
            (0, vitest_1.expect)(ctx.marketId).toBe('north-cyprus');
        });
    });
    (0, vitest_1.describe)('requireToolUserId', () => {
        (0, vitest_1.it)('should return userId if present', () => {
            const ctx = {
                marketId: 'north-cyprus',
                userId: 'user-123',
            };
            (0, vitest_1.expect)((0, toolContext_1.requireToolUserId)(ctx, 'testTool')).toBe('user-123');
        });
        (0, vitest_1.it)('should throw if userId is missing', () => {
            const ctx = {
                marketId: 'north-cyprus',
            };
            (0, vitest_1.expect)(() => (0, toolContext_1.requireToolUserId)(ctx, 'testTool')).toThrow('Unauthorized: testTool requires a userId');
        });
    });
    (0, vitest_1.describe)('requireToolMarketId', () => {
        (0, vitest_1.it)('should return marketId if present and valid', () => {
            const ctx = {
                marketId: 'north-cyprus',
                userId: 'user-123',
            };
            (0, vitest_1.expect)((0, toolContext_1.requireToolMarketId)(ctx, 'testTool')).toBe('north-cyprus');
        });
        (0, vitest_1.it)('should throw if marketId is missing', () => {
            // Force a context without marketId (simulating malformed data)
            const ctx = {
                userId: 'user-123',
            };
            (0, vitest_1.expect)(() => (0, toolContext_1.requireToolMarketId)(ctx, 'testTool')).toThrow('testTool requires a marketId in ToolContext');
        });
        (0, vitest_1.it)('should throw if marketId is invalid', () => {
            // Force an invalid marketId
            const ctx = {
                marketId: 'unknown-market',
                userId: 'user-123',
            };
            (0, vitest_1.expect)(() => (0, toolContext_1.requireToolMarketId)(ctx, 'testTool')).toThrow("testTool: invalid marketId 'unknown-market'");
        });
    });
});
//# sourceMappingURL=toolContext.test.js.map