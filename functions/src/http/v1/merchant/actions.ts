/**
 * POST /v1/merchant/jobs/:id/accept - Accept a Job
 * POST /v1/merchant/jobs/:id/decline - Decline a Job
 *
 * Merchant actions on dispatched jobs.
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
import { asyncHandler, Errors } from "../../../lib/middleware";

// =============================================================================
// DECLINE REQUEST SCHEMA
// =============================================================================

export const DeclineJobRequestSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional();

// =============================================================================
// HANDLERS
// =============================================================================

export const acceptJob = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const session = (req as any).merchantSession;
    const jobId = req.params.id;

    if (!session?.listingId) {
      throw Errors.forbidden("Invalid session");
    }

    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      throw Errors.notFound("Job");
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as Job;

    // Verify this job belongs to the merchant's listing
    if (
      job.merchantTarget?.type !== "listing" ||
      job.merchantTarget.listingId !== session.listingId
    ) {
      throw Errors.forbidden("This job is not assigned to your listing");
    }

    // Validate state transition
    if (!isValidJobTransition(job.status, "confirmed")) {
      throw Errors.invalidTransition(job.status, "confirmed");
    }

    const now = new Date().toISOString();
    const updateData: Partial<Job> = {
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
      data: { ...job, ...updateData },
    });
  },
);

export const declineJob = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const session = (req as any).merchantSession;
    const jobId = req.params.id;
    const body = req.body || {};

    if (!session?.listingId) {
      throw Errors.forbidden("Invalid session");
    }

    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      throw Errors.notFound("Job");
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as Job;

    // Verify this job belongs to the merchant's listing
    if (
      job.merchantTarget?.type !== "listing" ||
      job.merchantTarget.listingId !== session.listingId
    ) {
      throw Errors.forbidden("This job is not assigned to your listing");
    }

    // Validate state transition
    if (!isValidJobTransition(job.status, "cancelled")) {
      throw Errors.invalidTransition(job.status, "cancelled");
    }

    const now = new Date().toISOString();
    const updateData: Partial<Job> = {
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
      data: { ...job, ...updateData },
    });
  },
);
