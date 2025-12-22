"use strict";
/**
 * POST /v1/merchant/jobs/:id/accept - Accept a Job
 * POST /v1/merchant/jobs/:id/decline - Decline a Job
 *
 * Merchant actions on dispatched jobs.
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
exports.declineJob = exports.acceptJob = exports.DeclineJobRequestSchema = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const zod_1 = require("zod");
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@askmerve/shared");
const middleware_1 = require("../../../lib/middleware");
// =============================================================================
// DECLINE REQUEST SCHEMA
// =============================================================================
exports.DeclineJobRequestSchema = zod_1.z
    .object({
    reason: zod_1.z.string().max(500).optional(),
})
    .optional();
// =============================================================================
// HANDLERS
// =============================================================================
exports.acceptJob = (0, middleware_1.asyncHandler)(async (req, res) => {
    var _a;
    const traceId = req.traceId;
    const session = req.merchantSession;
    const jobId = req.params.id;
    if (!(session === null || session === void 0 ? void 0 : session.listingId)) {
        throw middleware_1.Errors.forbidden("Invalid session");
    }
    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
        throw middleware_1.Errors.notFound("Job");
    }
    const job = Object.assign({ id: jobDoc.id }, jobDoc.data());
    // Verify this job belongs to the merchant's listing
    if (((_a = job.merchantTarget) === null || _a === void 0 ? void 0 : _a.type) !== "listing" ||
        job.merchantTarget.listingId !== session.listingId) {
        throw middleware_1.Errors.forbidden("This job is not assigned to your listing");
    }
    // Validate state transition
    if (!(0, shared_1.isValidJobTransition)(job.status, "confirmed")) {
        throw middleware_1.Errors.invalidTransition(job.status, "confirmed");
    }
    const now = new Date().toISOString();
    const updateData = {
        status: "confirmed",
        confirmedByMerchantAt: now,
        updatedAt: now,
    };
    await jobRef.update(updateData);
    logger.debug(`[Merchant] Job accepted`, {
        traceId,
        jobId,
        listingId: session.listingId,
    });
    res.status(200).json({
        success: true,
        data: Object.assign(Object.assign({}, job), updateData),
    });
});
exports.declineJob = (0, middleware_1.asyncHandler)(async (req, res) => {
    var _a;
    const traceId = req.traceId;
    const session = req.merchantSession;
    const jobId = req.params.id;
    const body = req.body || {};
    if (!(session === null || session === void 0 ? void 0 : session.listingId)) {
        throw middleware_1.Errors.forbidden("Invalid session");
    }
    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
        throw middleware_1.Errors.notFound("Job");
    }
    const job = Object.assign({ id: jobDoc.id }, jobDoc.data());
    // Verify this job belongs to the merchant's listing
    if (((_a = job.merchantTarget) === null || _a === void 0 ? void 0 : _a.type) !== "listing" ||
        job.merchantTarget.listingId !== session.listingId) {
        throw middleware_1.Errors.forbidden("This job is not assigned to your listing");
    }
    // Validate state transition
    if (!(0, shared_1.isValidJobTransition)(job.status, "cancelled")) {
        throw middleware_1.Errors.invalidTransition(job.status, "cancelled");
    }
    const now = new Date().toISOString();
    const updateData = {
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: "merchant",
        cancellationReason: body.reason,
        updatedAt: now,
    };
    await jobRef.update(updateData);
    logger.debug(`[Merchant] Job declined`, {
        traceId,
        jobId,
        listingId: session.listingId,
        reason: body.reason,
    });
    res.status(200).json({
        success: true,
        data: Object.assign(Object.assign({}, job), updateData),
    });
});
//# sourceMappingURL=actions.js.map