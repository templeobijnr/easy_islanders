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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asToolContext = asToolContext;
exports.requireToolUserId = requireToolUserId;
exports.requireToolMarketId = requireToolMarketId;
var shared_1 = require("@askmerve/shared");
/**
 * Converts legacy userId/sessionId to full ToolContext.
 * For new code, pass a full ToolContext directly.
 *
 * @param userIdOrContext - Legacy userId string or full ToolContext
 * @param sessionId - Optional session ID (legacy support)
 * @param defaultMarketId - Market to use if not provided in context
 */
function asToolContext(userIdOrContext, sessionId, defaultMarketId) {
    var _a;
    if (defaultMarketId === void 0) { defaultMarketId = 'north-cyprus'; }
    if (typeof userIdOrContext === 'object' && userIdOrContext !== null) {
        // Already a ToolContext - validate marketId exists
        if (!userIdOrContext.marketId) {
            throw new Error('ToolContext.marketId is required');
        }
        return __assign(__assign({}, userIdOrContext), { sessionId: (_a = userIdOrContext.sessionId) !== null && _a !== void 0 ? _a : sessionId });
    }
    // Legacy path: construct ToolContext from userId string
    return {
        marketId: defaultMarketId,
        userId: userIdOrContext,
        sessionId: sessionId,
    };
}
/**
 * Fail-fast: extracts and validates userId from context.
 * Throws if userId is missing or invalid.
 */
function requireToolUserId(ctx, toolName) {
    if (!ctx.userId || typeof ctx.userId !== 'string') {
        throw new Error("Unauthorized: ".concat(toolName, " requires a userId"));
    }
    return ctx.userId;
}
/**
 * Fail-fast: extracts and validates marketId from context.
 * Throws if marketId is missing or invalid.
 */
function requireToolMarketId(ctx, toolName) {
    if (!ctx.marketId) {
        throw new Error("".concat(toolName, " requires a marketId in ToolContext"));
    }
    // Validate it's a known market
    var result = shared_1.MarketIdSchema.safeParse(ctx.marketId);
    if (!result.success) {
        throw new Error("".concat(toolName, ": invalid marketId '").concat(ctx.marketId, "'"));
    }
    return result.data;
}
