/**
 * ToolContext Tests
 *
 * Verifies MarketContext enforcement per architecture doc section 14.2 invariants:
 * 1. marketId is REQUIRED - fail fast if missing
 * 2. Compile-time enforcement via TypeScript
 */

import {
    asToolContext,
    requireToolUserId,
    requireToolMarketId,
    type ToolContext,
} from '../toolContext';

describe('ToolContext', () => {
    describe('asToolContext', () => {
        it('should create ToolContext from legacy userId string with default marketId', () => {
            const ctx = asToolContext('user-123', 'session-456');

            expect(ctx.marketId).toBe('north-cyprus');
            expect(ctx.userId).toBe('user-123');
            expect(ctx.sessionId).toBe('session-456');
        });

        it('should preserve marketId from existing ToolContext', () => {
            const inputCtx: ToolContext = {
                marketId: 'north-cyprus',
                userId: 'user-123',
                channel: 'whatsapp',
            };

            const ctx = asToolContext(inputCtx, 'session-456');

            expect(ctx.marketId).toBe('north-cyprus');
            expect(ctx.userId).toBe('user-123');
            expect(ctx.sessionId).toBe('session-456');
            expect(ctx.channel).toBe('whatsapp');
        });

        it('should throw if ToolContext is passed without marketId', () => {
            // This simulates a legacy or malformed ToolContext
            const badCtx = {
                userId: 'user-123',
                sessionId: 'session-456',
            } as unknown as ToolContext;

            expect(() => asToolContext(badCtx)).toThrow('ToolContext.marketId is required');
        });

        it('should use provided defaultMarketId for legacy path', () => {
            const ctx = asToolContext('user-123', 'session-456', 'north-cyprus');

            expect(ctx.marketId).toBe('north-cyprus');
        });
    });

    describe('requireToolUserId', () => {
        it('should return userId if present', () => {
            const ctx: ToolContext = {
                marketId: 'north-cyprus',
                userId: 'user-123',
            };

            expect(requireToolUserId(ctx, 'testTool')).toBe('user-123');
        });

        it('should throw if userId is missing', () => {
            const ctx: ToolContext = {
                marketId: 'north-cyprus',
            };

            expect(() => requireToolUserId(ctx, 'testTool')).toThrow(
                'Unauthorized: testTool requires a userId'
            );
        });
    });

    describe('requireToolMarketId', () => {
        it('should return marketId if present and valid', () => {
            const ctx: ToolContext = {
                marketId: 'north-cyprus',
                userId: 'user-123',
            };

            expect(requireToolMarketId(ctx, 'testTool')).toBe('north-cyprus');
        });

        it('should throw if marketId is missing', () => {
            // Force a context without marketId (simulating malformed data)
            const ctx = {
                userId: 'user-123',
            } as unknown as ToolContext;

            expect(() => requireToolMarketId(ctx, 'testTool')).toThrow(
                'testTool requires a marketId in ToolContext'
            );
        });

        it('should throw if marketId is invalid', () => {
            // Force an invalid marketId
            const ctx = {
                marketId: 'unknown-market' as any,
                userId: 'user-123',
            } as ToolContext;

            expect(() => requireToolMarketId(ctx, 'testTool')).toThrow(
                "testTool: invalid marketId 'unknown-market'"
            );
        });
    });
});
