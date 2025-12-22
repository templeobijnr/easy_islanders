"use strict";
/**
 * Auth Admin Middleware (V1)
 *
 * Admin endpoints are separate from owner endpoints.
 * Admin can perform manual recovery / dev tooling actions, but these must never
 * weaken owner-route invariants (owner routes remain claims-only).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const admin = __importStar(require("firebase-admin"));
const log_1 = require("../../utils/log");
async function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        if (decodedToken.admin !== true) {
            res.status(403).json({
                error: 'Admin privileges required',
                code: 'NOT_ADMIN'
            });
            return;
        }
        req.user = decodedToken;
        next();
    }
    catch (error) {
        log_1.log.error('[AuthAdmin] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}
//# sourceMappingURL=auth-admin.js.map