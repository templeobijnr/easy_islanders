"use strict";
/**
 * POST /v1/jobs - Create a new Job
 *
 * Creates a job in 'collecting' status. Enforces ownerUserId from auth token.
 * Supports idempotent creation via optional clientRequestId.
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
exports.createJob = exports.CreateJobRequestSchema = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const zod_1 = require("zod");
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@askmerve/shared");
const middleware_1 = require("../../../lib/middleware");
// =============================================================================
// REQUEST SCHEMA
// =============================================================================
/**
 * Request body schema for creating a job.
 * ownerUserId is NOT in request - comes from auth token.
 */
exports.CreateJobRequestSchema = zod_1.z.object({
    actionType: shared_1.ActionTypeSchema,
    actionData: shared_1.ActionDataSchema,
    merchantTarget: shared_1.MerchantTargetSchema.optional(),
    language: zod_1.z.enum(["en", "tr", "ru"]).optional().default("en"),
    /** Optional client-generated ID for idempotent creation */
    clientRequestId: zod_1.z.string().max(100).optional(),
    /** Reference to conversation where this job originated */
    conversationId: zod_1.z.string().optional(),
});
// =============================================================================
// HANDLER
// =============================================================================
exports.createJob = (0, middleware_1.asyncHandler)(async (req, res) => {
    var _a;
    const traceId = req.traceId;
    const userId = (0, middleware_1.getUserId)(req);
    const body = req.body;
    const db = admin.firestore();
    // ==========================================================================
    // IDEMPOTENCY CHECK
    // If clientRequestId provided, check for existing job by this user
    // ==========================================================================
    if (body.clientRequestId) {
        const existingJobQuery = await db
            .collection("jobs")
            .where("ownerUserId", "==", userId)
            .where("clientRequestId", "==", body.clientRequestId)
            .limit(1)
            .get();
        if (!existingJobQuery.empty) {
            const existingDoc = existingJobQuery.docs[0];
            const existingJob = Object.assign({ id: existingDoc.id }, existingDoc.data());
            logger.debug(`[CreateJob] Idempotent return for clientRequestId=${body.clientRequestId}`, {
                traceId,
                userId,
                jobId: existingJob.id,
            });
            res.status(200).json({
                success: true,
                data: existingJob,
                idempotent: true,
            });
            return;
        }
    }
    // ==========================================================================
    // VALIDATE ACTION DATA MATCHES ACTION TYPE
    // ==========================================================================
    if (body.actionData.actionType !== body.actionType) {
        throw middleware_1.Errors.badRequest(`actionData.actionType '${body.actionData.actionType}' does not match actionType '${body.actionType}'`);
    }
    // ==========================================================================
    // CREATE JOB DOCUMENT
    // ==========================================================================
    const now = new Date().toISOString();
    const jobCode = (0, shared_1.generateJobCode)();
    const jobRef = db.collection("jobs").doc();
    const jobData = Object.assign({ ownerUserId: userId, conversationId: body.conversationId, actionType: body.actionType, actionData: body.actionData, merchantTarget: body.merchantTarget, status: "collecting", jobCode, language: (_a = body.language) !== null && _a !== void 0 ? _a : "en", createdAt: now, updatedAt: now, dispatchAttempts: 0 }, (body.clientRequestId && { clientRequestId: body.clientRequestId })); // Type assertion needed for optional clientRequestId
    await jobRef.set(jobData);
    const job = Object.assign({ id: jobRef.id }, jobData);
    logger.debug(`[CreateJob] Created job`, {
        traceId,
        userId,
        jobId: job.id,
        jobCode,
        actionType: job.actionType,
        hasClientRequestId: !!body.clientRequestId,
    });
    res.status(201).json({
        success: true,
        data: job,
    });
});
//# sourceMappingURL=create.js.map