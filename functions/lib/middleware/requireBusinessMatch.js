"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBusinessMatch = requireBusinessMatch;
/**
 * Legacy safety net (P0): prevent cross-tenant access on routes that still accept a
 * businessId in params/body.
 *
 * Required behavior:
 * - If request includes businessId and it does not match request.auth.token.businessId → 403.
 */
function requireBusinessMatch(req, res, next) {
    var _a, _b, _c, _d;
    const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
    const claimedBusinessId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.businessId;
    // Admin bypass for legacy/admin tooling.
    if (role === 'admin') {
        next();
        return;
    }
    const businessIdFromParams = (_c = req.params) === null || _c === void 0 ? void 0 : _c.businessId;
    const businessIdFromBody = (_d = req.body) === null || _d === void 0 ? void 0 : _d.businessId;
    const requestedBusinessId = businessIdFromParams || businessIdFromBody;
    if (!requestedBusinessId) {
        next();
        return;
    }
    if (!claimedBusinessId) {
        res.status(403).json({ error: 'Forbidden: Missing businessId claim' });
        return;
    }
    if (claimedBusinessId !== requestedBusinessId) {
        res.status(403).json({ error: 'Forbidden: businessId mismatch' });
        return;
    }
    next();
}
//# sourceMappingURL=requireBusinessMatch.js.map