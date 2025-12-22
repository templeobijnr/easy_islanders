"use strict";
/**
 * GET /v1/jobs/:id - Get a Job by ID
 *
 * Returns job details if caller is the owner.
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
exports.getJob = exports.GetJobParamsSchema = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const zod_1 = require("zod");
const admin = __importStar(require("firebase-admin"));
const middleware_1 = require("../../../lib/middleware");
// =============================================================================
// REQUEST SCHEMA
// =============================================================================
/**
 * URL params schema.
 */
exports.GetJobParamsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
// =============================================================================
// HANDLER
// =============================================================================
exports.getJob = (0, middleware_1.asyncHandler)(async (req, res) => {
    const traceId = req.traceId;
    const userId = (0, middleware_1.getUserId)(req);
    const jobId = req.params.id;
    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);
    // ==========================================================================
    // FETCH JOB
    // ==========================================================================
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
        throw middleware_1.Errors.notFound("Job");
    }
    const job = Object.assign({ id: jobDoc.id }, jobDoc.data());
    // ==========================================================================
    // AUTHORIZATION CHECK
    // ==========================================================================
    if (job.ownerUserId !== userId) {
        throw middleware_1.Errors.forbidden("You do not have permission to access this job");
    }
    logger.debug(`[GetJob] Job fetched`, {
        traceId,
        userId,
        jobId,
        status: job.status,
    });
    res.status(200).json({
        success: true,
        data: job,
    });
});
//# sourceMappingURL=get.js.map