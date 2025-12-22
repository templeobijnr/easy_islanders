"use strict";
/**
 * GET /v1/merchant/jobs - Get Jobs for Merchant
 *
 * Returns jobs targeted at the merchant's listing.
 * Requires valid merchant session JWT.
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
exports.getMerchantJobs = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const middleware_1 = require("../../../lib/middleware");
exports.getMerchantJobs = (0, middleware_1.asyncHandler)(async (req, res) => {
    const traceId = req.traceId;
    const session = req.merchantSession;
    if (!(session === null || session === void 0 ? void 0 : session.listingId)) {
        throw middleware_1.Errors.forbidden("Invalid session");
    }
    const db = admin.firestore();
    // Query jobs where merchantTarget.listingId matches
    const jobsSnapshot = await db
        .collection("jobs")
        .where("merchantTarget.listingId", "==", session.listingId)
        .where("status", "in", ["dispatched", "confirmed", "cancelled"])
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    const jobs = jobsSnapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    logger.debug(`[Merchant] Fetched jobs`, {
        traceId,
        listingId: session.listingId,
        count: jobs.length,
    });
    res.status(200).json({
        success: true,
        data: jobs,
    });
});
//# sourceMappingURL=jobs.js.map