"use strict";
/**
 * POST /v1/merchant/session - Exchange Token for Session
 *
 * Exchanges a raw magic link token for a short-lived session JWT.
 *
 * Flow:
 * 1. Client sends { rawToken }
 * 2. Server hashes rawToken -> tokenHash
 * 3. Server looks up valid, non-expired token in Firestore
 * 4. Server signs JWT with listingId and scopes
 *
 * Public endpoint (no auth required).
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
exports.ExchangeTokenRequestSchema = exports.exchangeMerchantToken = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
const shared_1 = require("@askmerve/shared");
Object.defineProperty(exports, "ExchangeTokenRequestSchema", { enumerable: true, get: function () { return shared_1.ExchangeTokenRequestSchema; } });
const middleware_1 = require("../../../lib/middleware");
// =============================================================================
// CONFIG
// =============================================================================
const JWT_SECRET = process.env.MERCHANT_JWT_SECRET || "dev-secret-do-not-use-in-prod";
const SESSION_EXPIRY = "15m";
// =============================================================================
// HELPER: HASHING
// =============================================================================
function hashToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}
// =============================================================================
// HANDLER
// =============================================================================
exports.exchangeMerchantToken = (0, middleware_1.asyncHandler)(async (req, res) => {
    const traceId = req.traceId;
    const body = req.body;
    // ==========================================================================
    // 1. HASH & LOOKUP
    // ==========================================================================
    const tokenHash = hashToken(body.rawToken);
    const db = admin.firestore();
    const tokensSnapshot = await db
        .collection("merchantTokens")
        .where("tokenHash", "==", tokenHash)
        .limit(1)
        .get();
    if (tokensSnapshot.empty) {
        // Return 401 for valid-looking but incorrect/expired tokens to avoid enumeration?
        // Or 404? 401 is safer.
        throw middleware_1.Errors.forbidden("Invalid or expired token");
    }
    const tokenDoc = tokensSnapshot.docs[0];
    const token = Object.assign({ id: tokenDoc.id }, tokenDoc.data());
    // ==========================================================================
    // 2. VALIDATE STATUS
    // ==========================================================================
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    if (!token.active) {
        throw middleware_1.Errors.forbidden("Token has been deactivated");
    }
    if (now > expiresAt) {
        throw middleware_1.Errors.forbidden("Token has expired");
    }
    // ==========================================================================
    // 3. MINT JWT
    // ==========================================================================
    const payload = {
        sid: token.id,
        listingId: token.listingId,
        scopes: token.scopes,
        jobId: token.jobId,
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: SESSION_EXPIRY,
        subject: token.listingId, // The "user" of this session is the listing
        audience: "askmerve-merchant",
    });
    logger.debug(`[Merchant] Session created`, {
        traceId,
        tokenId: token.id,
        listingId: token.listingId,
    });
    res.status(200).json({
        success: true,
        data: {
            accessToken,
            listingId: token.listingId,
            scopes: token.scopes,
        },
    });
});
//# sourceMappingURL=session.js.map