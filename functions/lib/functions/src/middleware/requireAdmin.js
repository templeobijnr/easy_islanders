"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const firebase_1 = require("../config/firebase");
async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const token = authHeader.slice('Bearer '.length);
        const decodedToken = await firebase_1.auth.verifyIdToken(token);
        if (!decodedToken.admin) {
            res.status(403).json({ error: 'Forbidden - Admin only' });
            return;
        }
        req.user = decodedToken;
        next();
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid token' });
    }
}
//# sourceMappingURL=requireAdmin.js.map