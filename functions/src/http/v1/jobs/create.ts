/**
 * POST /v1/jobs - Create a new Job
 *
 * Creates a job in 'collecting' status. Enforces ownerUserId from auth token.
 * Supports idempotent creation via optional clientRequestId.
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import {
  ActionDataSchema,
  ActionTypeSchema,
  MerchantTargetSchema,
  generateJobCode,
  type Job,
  type CreateJobInput,
} from "@askmerve/shared";
import { getUserId, asyncHandler, Errors } from "../../../lib/middleware";

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

/**
 * Request body schema for creating a job.
 * ownerUserId is NOT in request - comes from auth token.
 */
export const CreateJobRequestSchema = z.object({
  actionType: ActionTypeSchema,
  actionData: ActionDataSchema,
  merchantTarget: MerchantTargetSchema.optional(),
  language: z.enum(["en", "tr", "ru"]).optional().default("en"),
  /** Optional client-generated ID for idempotent creation */
  clientRequestId: z.string().max(100).optional(),
  /** Reference to conversation where this job originated */
  conversationId: z.string().optional(),
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

// =============================================================================
// HANDLER
// =============================================================================

export const createJob = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const userId = getUserId(req);
    const body = req.body as CreateJobRequest;

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
        const existingJob = {
          id: existingDoc.id,
          ...existingDoc.data(),
        } as Job;

        logger.debug(
          `[CreateJob] Idempotent return for clientRequestId=${body.clientRequestId}`,
          {
            traceId,
            userId,
            jobId: existingJob.id,
          },
        );

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
      throw Errors.badRequest(
        `actionData.actionType '${body.actionData.actionType}' does not match actionType '${body.actionType}'`,
      );
    }

    // ==========================================================================
    // CREATE JOB DOCUMENT
    // ==========================================================================
    const now = new Date().toISOString();
    const jobCode = generateJobCode();
    const jobRef = db.collection("jobs").doc();

    const jobData: Omit<Job, "id"> = {
      ownerUserId: userId,
      conversationId: body.conversationId,
      actionType: body.actionType,
      actionData: body.actionData,
      merchantTarget: body.merchantTarget,
      status: "collecting",
      jobCode,
      language: body.language ?? "en",
      createdAt: now,
      updatedAt: now,
      dispatchAttempts: 0,
      // Store clientRequestId for idempotency checks
      ...(body.clientRequestId && { clientRequestId: body.clientRequestId }),
    } as any; // Type assertion needed for optional clientRequestId

    await jobRef.set(jobData);

    const job: Job = {
      id: jobRef.id,
      ...jobData,
    };

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
  },
);
