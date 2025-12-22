"use strict";
/**
 * Firebase Auth Middleware for Express
 *
 * Verifies Firebase ID tokens and attaches user info to request.
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
exports.authenticateUser = authenticateUser;
exports.getUserId = getUserId;
const admin = __importStar(require("firebase-admin"));
/**
 * Middleware that verifies Firebase ID token from Authorization header.
 * Expects: Authorization: Bearer <ID_TOKEN>
 *
 * On success, attaches req.user with uid and claims.
 * On failure, returns 401.
 */
async function authenticateUser(req, res, next) {
    var _a;
    const traceId = req.traceId || 'unknown';
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: {
                code: 'MISSING_AUTH_TOKEN',
                message: 'Authorization header with Bearer token is required',
                traceId,
            },
        });
        return;
    }
    const idToken = authHeader.slice(7); // Remove 'Bearer '
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            phone: decodedToken.phone_number,
            emailVerified: (_a = decodedToken.email_verified) !== null && _a !== void 0 ? _a : false,
        };
        next();
    }
    catch (error) {
        console.error('[Auth] Token verification failed:', error);
        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_AUTH_TOKEN',
                message: 'Invalid or expired authentication token',
                traceId,
            },
        });
    }
}
/**
 * Extracts user UID from authenticated request.
 * Throws if not authenticated (use after authenticateUser middleware).
 */
function getUserId(req) {
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user.uid)) {
        throw new Error('User not authenticated');
    }
    return user.uid;
}
//# sourceMappingURL=auth.js.map