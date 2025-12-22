"use strict";
/**
 * Auth Anon Middleware
 *
 * Middleware for public routes that accept both anonymous
 * and authenticated users.
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
exports.requireAuth = requireAuth;
exports.authAnon = requireAuth;
exports.requireAnonymous = requireAnonymous;
const admin = __importStar(require("firebase-admin"));
const log_1 = require("../../utils/log");
/**
 * Require some form of authentication (anonymous or full).
 * Accepts Firebase Anonymous Auth tokens.
 */
async function requireAuth(req, res, next) {
    var _a;
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        // Attach user info
        req.user = decodedToken;
        const signInProvider = (_a = decodedToken.firebase) === null || _a === void 0 ? void 0 : _a.sign_in_provider;
        req.isAnonymous = signInProvider === 'anonymous';
        next();
    }
    catch (error) {
        log_1.log.error('[AuthAnon] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}
/**
 * Require anonymous auth specifically.
 * Rejects fully authenticated users (for public-only endpoints if needed).
 */
async function requireAnonymous(req, res, next) {
    var _a;
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const signInProvider = (_a = decodedToken.firebase) === null || _a === void 0 ? void 0 : _a.sign_in_provider;
        if (signInProvider !== 'anonymous') {
            res.status(403).json({
                error: 'This endpoint requires anonymous authentication'
            });
            return;
        }
        req.user = decodedToken;
        req.isAnonymous = true;
        next();
    }
    catch (error) {
        log_1.log.error('[AuthAnon] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}
//# sourceMappingURL=auth-anon.js.map