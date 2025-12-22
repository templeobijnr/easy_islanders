"use strict";
/**
 * Auth Owner Middleware
 *
 * Middleware for owner routes that require authenticated access
 * to a specific business. Derives businessId ONLY from custom claims.
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
exports.isAuthenticated = isAuthenticated;
exports.requireOwner = requireOwner;
exports.authOwner = requireOwner;
const admin = __importStar(require("firebase-admin"));
const request_context_1 = require("../../utils/request-context");
const log_1 = require("../../utils/log");
/**
 * Basic authentication check.
 * Verifies Firebase ID token and attaches user to request.
 */
async function isAuthenticated(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        log_1.log.error('[AuthOwner] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}
/**
 * Owner authentication middleware (V1).
 *
 * Non-negotiable: owner scope is derived ONLY from trusted Auth claims:
 * - request.auth.token.role == 'owner'
 * - request.auth.token.businessId is present
 *
 * NEVER accepts businessId from request body/params for owner routes.
 */
async function requireOwner(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        // Debug: Log claims for troubleshooting
        const roleClaim = decodedToken.role;
        const isAdmin = decodedToken.admin === true;
        const businessId = decodedToken.businessId;
        log_1.log.info('[AuthOwner] Token claims', {
            uid,
            role: roleClaim,
            admin: isAdmin,
            businessId: businessId ? businessId.substring(0, 8) + '...' : 'MISSING',
        });
        // Non-negotiable: owner scope is derived ONLY from trusted Auth claims.
        // Never accept businessId from request body/params for owner routes.
        if (roleClaim !== 'owner') {
            log_1.log.warn('[AuthOwner] NOT_OWNER', { role: roleClaim, uid });
            res.status(403).json({
                error: 'Owner role required',
                code: 'NOT_OWNER',
                hint: 'Your token is missing the owner role. Try logging out and back in, or re-claim your business.'
            });
            return;
        }
        if (!businessId) {
            log_1.log.warn('[AuthOwner] NO_BUSINESS_CLAIM', { uid });
            res.status(403).json({
                error: 'Missing businessId claim',
                code: 'NO_BUSINESS_CLAIM',
                hint: 'Your token is missing businessId. Try logging out and back in, or re-claim your business.'
            });
            return;
        }
        // Attach TenantContext
        const ctx = {
            businessId,
            uid,
            role: 'owner'
        };
        req.user = decodedToken;
        req.tenantContext = ctx;
        (0, request_context_1.setRequestContext)({ businessId });
        next();
    }
    catch (error) {
        log_1.log.error('[AuthOwner] requireOwner failed', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
}
//# sourceMappingURL=auth-owner.js.map