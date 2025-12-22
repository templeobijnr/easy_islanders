"use strict";
/**
 * Tool Context
 *
 * Carries request-scoped context through all tool/service layers.
 * MarketContext is resolved ONCE at the API boundary and propagated here.
 *
 * INVARIANTS (architecture doc section 14.2):
 * 1. marketId is REQUIRED - fail fast if missing.
 * 2. Single resolution point at API boundary.
 * 3. Compile-time enforcement via TypeScript.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.asToolContext = asToolContext;
exports.requireToolUserId = requireToolUserId;
exports.requireToolMarketId = requireToolMarketId;
const shared_1 = require("@askmerve/shared");
/**
 * Converts legacy userId/sessionId to full ToolContext.
 * For new code, pass a full ToolContext directly.
 *
 * @param userIdOrContext - Legacy userId string or full ToolContext
 * @param sessionId - Optional session ID (legacy support)
 * @param defaultMarketId - Market to use if not provided in context
 */
function asToolContext(userIdOrContext, sessionId, defaultMarketId = 'north-cyprus') {
    var _a;
    if (typeof userIdOrContext === 'object' && userIdOrContext !== null) {
        // Already a ToolContext - validate marketId exists
        if (!userIdOrContext.marketId) {
            throw new Error('ToolContext.marketId is required');
        }
        return Object.assign(Object.assign({}, userIdOrContext), { sessionId: (_a = userIdOrContext.sessionId) !== null && _a !== void 0 ? _a : sessionId });
    }
    // Legacy path: construct ToolContext from userId string
    return {
        marketId: defaultMarketId,
        userId: userIdOrContext,
        sessionId,
    };
}
/**
 * Fail-fast: extracts and validates userId from context.
 * Throws if userId is missing or invalid.
 */
function requireToolUserId(ctx, toolName) {
    if (!ctx.userId || typeof ctx.userId !== 'string') {
        throw new Error(`Unauthorized: ${toolName} requires a userId`);
    }
    return ctx.userId;
}
/**
 * Fail-fast: extracts and validates marketId from context.
 * Throws if marketId is missing or invalid.
 */
function requireToolMarketId(ctx, toolName) {
    if (!ctx.marketId) {
        throw new Error(`${toolName} requires a marketId in ToolContext`);
    }
    // Validate it's a known market
    const result = shared_1.MarketIdSchema.safeParse(ctx.marketId);
    if (!result.success) {
        throw new Error(`${toolName}: invalid marketId '${ctx.marketId}'`);
    }
    return result.data;
}
//# sourceMappingURL=toolContext.js.map