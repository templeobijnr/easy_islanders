"use strict";
/**
 * POST /v1/admin/merchant-token - Create Merchant Token
 *
 * Generates a persistent "Magic Link" token for a listing.
 * stores: HASH(token)
 * returns: RAW_TOKEN (one-time)
 *
 * Admin Only.
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
exports.CreateMerchantTokenRequestSchema = exports.createMerchantToken = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const shared_1 = require("@askmerve/shared");
Object.defineProperty(exports, "CreateMerchantTokenRequestSchema", { enumerable: true, get: function () { return shared_1.CreateMerchantTokenRequestSchema; } });
const middleware_1 = require("../../../lib/middleware");
// =============================================================================
// HELPER: HASHING
// =============================================================================
/**
 * Creates a distinct SHA-256 hash of the token for storage.
 * We include a pepper/salt approach if strict security needed,
 * but for this V1, straightforward SHA-256 of high-entropy string is sufficient.
 */
function hashToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}
/**
 * Generates a secure random 32-byte token (base64url encoded).
 */
function generateSecureToken() {
    return crypto.randomBytes(32).toString("base64url");
}
// =============================================================================
// HANDLER
// =============================================================================
exports.createMerchantToken = (0, middleware_1.asyncHandler)(async (req, res) => {
    const traceId = req.traceId;
    const userId = (0, middleware_1.getUserId)(req);
    const body = req.body;
    // ==========================================================================
    // 1. ADMIN CHECK
    // ==========================================================================
    const userRecord = await admin.auth().getUser(userId);
    const customClaims = userRecord.customClaims || {};
    if (!customClaims.admin) {
        throw middleware_1.Errors.forbidden("Only admins can generate merchant tokens");
    }
    // ==========================================================================
    // 2. GENERATE TOKEN
    // ==========================================================================
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    // ==========================================================================
    // 3. STORE IN FIRESTORE
    // ==========================================================================
    const db = admin.firestore();
    const tokenRef = db.collection("merchantTokens").doc();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + body.expiresInDays * 24 * 60 * 60 * 1000);
    const tokenData = {
        id: tokenRef.id,
        tokenHash,
        listingId: body.listingId,
        scopes: body.scopes,
        jobId: body.jobId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        active: true,
        createdBy: userId,
    };
    await tokenRef.set(tokenData);
    // ==========================================================================
    // 4. RETURN RAW TOKEN
    // ==========================================================================
    logger.debug(`[Admin] Created merchant token`, {
        traceId,
        adminId: userId,
        listingId: body.listingId,
        scopes: body.scopes,
        tokenId: tokenData.id,
    });
    res.status(201).json({
        success: true,
        data: {
            rawToken,
            expiresAt: tokenData.expiresAt,
            // Helper for frontend/admin console to copy-paste
            magicLinkUrl: process.env.VITE_WEB_URL
                ? `${process.env.VITE_WEB_URL}/m/auth?t=${rawToken}`
                : undefined,
        },
    });
});
//# sourceMappingURL=merchant-token.js.map