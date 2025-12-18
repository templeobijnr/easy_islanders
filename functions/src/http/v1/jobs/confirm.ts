/**
 * POST /v1/jobs/:id/confirm - Confirm a Job
 *
 * Transitions job from 'collecting' to 'confirming'.
 * Only job owner can confirm.
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import {
  isValidJobTransition,
  type Job,
  type JobStatus,
} from "@askmerve/shared";
import { getUserId, asyncHandler, Errors } from "../../../lib/middleware";

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

/**
 * URL params schema.
 */
export const ConfirmJobParamsSchema = z.object({
  id: z.string().min(1),
});

/**
 * Optional request body for confirm.
 */
export const ConfirmJobRequestSchema = z
  .object({
    /** Optional note from user when confirming */
    note: z.string().max(500).optional(),
  })
  .optional();

// =============================================================================
// HANDLER
// =============================================================================

export const confirmJob = asyncHandler(
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
      throw Errors.forbidden("You do not have permission to confirm this job");
    }

    // ==========================================================================
    // STATE TRANSITION VALIDATION
    // ==========================================================================
    const currentStatus = job.status;
    const targetStatus: JobStatus = "confirming";

    if (!isValidJobTransition(currentStatus, targetStatus)) {
      throw Errors.invalidTransition(currentStatus, targetStatus);
    }

    // ==========================================================================
    // UPDATE JOB
    // ==========================================================================
    const now = new Date().toISOString();

    const updateData: Partial<Job> = {
      status: targetStatus,
      confirmedByUserAt: now,
      updatedAt: now,
    };

    await jobRef.update(updateData);

    const updatedJob: Job = {
      ...job,
      ...updateData,
    };

    logger.debug(`[ConfirmJob] Job confirmed by user`, {
      traceId,
      userId,
      jobId,
      previousStatus: currentStatus,
      newStatus: targetStatus,
    });

    res.status(200).json({
      success: true,
      data: updatedJob,
    });
  },
);
