"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachRequestContext = attachRequestContext;
const request_context_1 = require("../../utils/request-context");
/**
 * Attach a per-request correlation id (requestId) and store it in AsyncLocalStorage.
 * All logs should include requestId via utils/log.ts.
 */
function attachRequestContext(req, res, next) {
    const requestId = (0, request_context_1.getOrCreateRequestId)(req.header('x-request-id') || undefined);
    res.setHeader('x-request-id', requestId);
    req.requestId = requestId;
    (0, request_context_1.runWithRequestContext)({ requestId }, () => next());
}
//# sourceMappingURL=request-context.middleware.js.map