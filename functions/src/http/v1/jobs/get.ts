/**
 * GET /v1/jobs/:id - Get a Job by ID
 *
 * Returns job details if caller is the owner.
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import { type Job } from "@askmerve/shared";
import { getUserId, asyncHandler, Errors } from "../../../lib/middleware";

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

/**
 * URL params schema.
 */
export const GetJobParamsSchema = z.object({
  id: z.string().min(1),
});

// =============================================================================
// HANDLER
// =============================================================================

export const getJob = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const userId = getUserId(req);
    const jobId = req.params.id;

    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);

    // ==========================================================================
    // FETCH JOB
    // ==========================================================================
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      throw Errors.notFound("Job");
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as Job;

    // ==========================================================================
    // AUTHORIZATION CHECK
    // ==========================================================================
    if (job.ownerUserId !== userId) {
      throw Errors.forbidden("You do not have permission to access this job");
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
  },
);
