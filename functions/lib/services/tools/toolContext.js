"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asToolContext = asToolContext;
exports.requireToolUserId = requireToolUserId;
function asToolContext(userIdOrContext, sessionId) {
    var _a;
    if (typeof userIdOrContext === 'object' && userIdOrContext !== null) {
        return Object.assign(Object.assign({}, userIdOrContext), { sessionId: (_a = userIdOrContext.sessionId) !== null && _a !== void 0 ? _a : sessionId });
    }
    return { userId: userIdOrContext, sessionId };
}
function requireToolUserId(ctx, toolName) {
    if (!ctx.userId || typeof ctx.userId !== 'string') {
        throw new Error(`Unauthorized: ${toolName} requires a userId`);
    }
    return ctx.userId;
}
//# sourceMappingURL=toolContext.js.map