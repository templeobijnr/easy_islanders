"use strict";
/**
 * POST /v1/jobs/:id/dispatch - Dispatch Job to Merchant
 *
 * Sends WhatsApp message to merchant based on merchantTarget type:
 * - Listed: Magic Link
 * - Unlisted: Text with YES/NO instructions
 *
 * Idempotent: If dispatchMessageId exists, returns immediately.
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
exports.dispatchJob = exports.DispatchJobParamsSchema = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const zod_1 = require("zod");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const shared_1 = require("@askmerve/shared");
const middleware_1 = require("../../../lib/middleware");
const twilio_service_1 = require("../../../services/twilio.service");
// =============================================================================
// REQUEST SCHEMA
// =============================================================================
exports.DispatchJobParamsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
// =============================================================================
// HELPERS
// =============================================================================
/**
 * Generate a secure token for listed merchants.
 */
function generateSecureToken() {
    return crypto.randomBytes(32).toString("base64url");
}
function hashToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}
/**
 * Build job summary for WhatsApp message.
 * Uses `any` for flexible property access across different action types.
 */
function buildJobSummary(job) {
    var _a, _b;
    const lines = [];
    // Cast to any for flexible property access (actionData is a discriminated union)
    const data = job.actionData;
    lines.push(`📋 New ${job.actionType.replace(/_/g, " ")} request`);
    lines.push(`🔖 Code: ${job.jobCode || "N/A"}`);
    if (data.items && Array.isArray(data.items)) {
        const itemList = data.items
            .slice(0, 3)
            .map((i) => `${i.quantity}x ${i.name}`)
            .join(", ");
        lines.push(`📦 ${itemList}`);
    }
    if (data.passengerCount) {
        lines.push(`👥 ${data.passengerCount} passengers`);
    }
    if (data.guestCount) {
        lines.push(`👥 ${data.guestCount} guests`);
    }
    if ((_a = data.pickupLocation) === null || _a === void 0 ? void 0 : _a.address) {
        lines.push(`📍 From: ${data.pickupLocation.address}`);
    }
    if ((_b = data.deliveryLocation) === null || _b === void 0 ? void 0 : _b.address) {
        lines.push(`📍 To: ${data.deliveryLocation.address}`);
    }
    if (data.dateTime) {
        lines.push(`📅 ${new Date(data.dateTime).toLocaleString()}`);
    }
    return lines.join("\n");
}
// =============================================================================
// HANDLER
// =============================================================================
exports.dispatchJob = (0, middleware_1.asyncHandler)(async (req, res) => {
    var _a;
    const traceId = req.traceId;
    const userId = (0, middleware_1.getUserId)(req);
    const jobId = req.params.id;
    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);
    // ==========================================================================
    // 1. FETCH AND VALIDATE JOB
    // ==========================================================================
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
        throw middleware_1.Errors.notFound("Job");
    }
    const job = Object.assign({ id: jobDoc.id }, jobDoc.data());
    // Owner check
    if (job.ownerUserId !== userId) {
        throw middleware_1.Errors.forbidden("You do not have permission to dispatch this job");
    }
    // ==========================================================================
    // 2. IDEMPOTENCY CHECK
    // ==========================================================================
    if (job.dispatchMessageId) {
        logger.debug(`[Dispatch] Idempotent return - already dispatched`, {
            traceId,
            jobId,
            existingMessageId: job.dispatchMessageId,
        });
        res.status(200).json({
            success: true,
            data: job,
            idempotent: true,
        });
        return;
    }
    // ==========================================================================
    // 3. STATE VALIDATION
    // ==========================================================================
    const currentStatus = job.status;
    const targetStatus = "dispatched";
    if (!(0, shared_1.isValidJobTransition)(currentStatus, targetStatus)) {
        throw middleware_1.Errors.invalidTransition(currentStatus, targetStatus);
    }
    // merchantTarget is required for dispatch
    if (!job.merchantTarget) {
        throw middleware_1.Errors.badRequest("Job must have merchantTarget before dispatch");
    }
    // ==========================================================================
    // 4. RESOLVE TARGET & SEND MESSAGE
    // ==========================================================================
    let messageId;
    let dispatchedVia = "whatsapp";
    const jobSummary = buildJobSummary(job);
    const webUrl = process.env.VITE_WEB_URL || "https://askmerve.app";
    if (job.merchantTarget.type === "listing") {
        // Listed Merchant: Generate Magic Link
        // Keep existing logic - will integrate with NotificationService in Sprint 3
        const rawToken = generateSecureToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        // Store token
        const tokenRef = db.collection("merchantTokens").doc();
        await tokenRef.set({
            id: tokenRef.id,
            tokenHash,
            listingId: job.merchantTarget.listingId,
            scopes: ["confirm_job"],
            jobId: job.id,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            active: true,
            createdBy: "system:dispatch",
        });
        // Fetch listing to get phone number
        const listingDoc = await db
            .collection("listings")
            .doc(job.merchantTarget.listingId)
            .get();
        if (!listingDoc.exists) {
            throw middleware_1.Errors.badRequest("Listing not found for merchantTarget");
        }
        const listing = listingDoc.data();
        const merchantPhone = (listing === null || listing === void 0 ? void 0 : listing.phone) || ((_a = listing === null || listing === void 0 ? void 0 : listing.contact) === null || _a === void 0 ? void 0 : _a.phone);
        if (!merchantPhone) {
            throw middleware_1.Errors.badRequest("Listing has no phone number for dispatch");
        }
        const magicLink = `${webUrl}/m?token=${rawToken}`;
        const message = `${jobSummary}\n\n🔗 Accept or decline:\n${magicLink}`;
        const result = await (0, twilio_service_1.sendWhatsApp)(merchantPhone, message, {
            role: "merchant",
        });
        messageId = (result === null || result === void 0 ? void 0 : result.sid) || `local-${Date.now()}`;
        dispatchedVia = "whatsapp";
        logger.debug(`[Dispatch] Listed merchant - Magic link sent`, {
            traceId,
            jobId,
            listingId: job.merchantTarget.listingId,
            tokenId: tokenRef.id,
        });
    }
    else {
        // Unlisted Merchant: Direct text
        const merchantPhone = job.merchantTarget.phone;
        const merchantName = job.merchantTarget.name || "Merchant";
        const message = `${jobSummary}\n\nHi ${merchantName}, please reply:\n✅ YES to accept\n❌ NO to decline\n\n(Job Code: ${job.jobCode})`;
        const result = await (0, twilio_service_1.sendWhatsApp)(merchantPhone, message, {
            role: "merchant",
        });
        messageId = (result === null || result === void 0 ? void 0 : result.sid) || `local-${Date.now()}`;
        dispatchedVia = "whatsapp";
        logger.debug(`[Dispatch] Unlisted merchant - Text sent`, {
            traceId,
            jobId,
            phone: merchantPhone.slice(0, 6) + "****",
        });
    }
    // ==========================================================================
    // 5. UPDATE JOB
    // ==========================================================================
    const now = new Date().toISOString();
    const updateData = {
        status: targetStatus,
        dispatchedAt: now,
        dispatchMessageId: messageId,
        dispatchedVia, // New field: track which channel was used
        dispatchAttempts: (job.dispatchAttempts || 0) + 1,
        updatedAt: now,
    };
    await jobRef.update(updateData);
    const updatedJob = Object.assign(Object.assign({}, job), updateData);
    logger.debug(`[Dispatch] Job dispatched successfully`, {
        traceId,
        jobId,
        messageId,
        dispatchedVia,
        targetType: job.merchantTarget.type,
    });
    res.status(200).json({
        success: true,
        data: updatedJob,
    });
});
// DispatchJobParamsSchema already exported at declaration
//# sourceMappingURL=dispatch.js.map