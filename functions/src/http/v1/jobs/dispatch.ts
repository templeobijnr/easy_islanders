/**
 * POST /v1/jobs/:id/dispatch - Dispatch Job to Merchant
 *
 * Sends WhatsApp message to merchant based on merchantTarget type:
 * - Listed: Magic Link
 * - Unlisted: Text with YES/NO instructions
 *
 * Idempotent: If dispatchMessageId exists, returns immediately.
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {
  isValidJobTransition,
  type Job,
  type JobStatus,
} from "@askmerve/shared";
import { getUserId, asyncHandler, Errors } from "../../../lib/middleware";
import { sendWhatsApp } from "../../../services/twilio.service";

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

export const DispatchJobParamsSchema = z.object({
  id: z.string().min(1),
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a secure token for listed merchants.
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Build job summary for WhatsApp message.
 * Uses `any` for flexible property access across different action types.
 */
function buildJobSummary(job: Job): string {
  const lines: string[] = [];
  // Cast to any for flexible property access (actionData is a discriminated union)
  const data = job.actionData as Record<string, any>;

  lines.push(`📋 New ${job.actionType.replace(/_/g, " ")} request`);
  lines.push(`🔖 Code: ${job.jobCode || "N/A"}`);

  if (data.items && Array.isArray(data.items)) {
    const itemList = data.items
      .slice(0, 3)
      .map((i: any) => `${i.quantity}x ${i.name}`)
      .join(", ");
    lines.push(`📦 ${itemList}`);
  }

  if (data.passengerCount) {
    lines.push(`👥 ${data.passengerCount} passengers`);
  }

  if (data.guestCount) {
    lines.push(`👥 ${data.guestCount} guests`);
  }

  if (data.pickupLocation?.address) {
    lines.push(`📍 From: ${data.pickupLocation.address}`);
  }

  if (data.deliveryLocation?.address) {
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

export const dispatchJob = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const userId = getUserId(req);
    const jobId = req.params.id;

    const db = admin.firestore();
    const jobRef = db.collection("jobs").doc(jobId);

    // ==========================================================================
    // 1. FETCH AND VALIDATE JOB
    // ==========================================================================
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      throw Errors.notFound("Job");
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as Job;

    // Owner check
    if (job.ownerUserId !== userId) {
      throw Errors.forbidden("You do not have permission to dispatch this job");
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
    const targetStatus: JobStatus = "dispatched";

    if (!isValidJobTransition(currentStatus, targetStatus)) {
      throw Errors.invalidTransition(currentStatus, targetStatus);
    }

    // merchantTarget is required for dispatch
    if (!job.merchantTarget) {
      throw Errors.badRequest("Job must have merchantTarget before dispatch");
    }

    // ==========================================================================
    // 4. RESOLVE TARGET & SEND MESSAGE
    // ==========================================================================
    let messageId: string;
    let dispatchedVia: "push" | "whatsapp" | "sms" = "whatsapp";
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
        throw Errors.badRequest("Listing not found for merchantTarget");
      }

      const listing = listingDoc.data();
      const merchantPhone = listing?.phone || listing?.contact?.phone;

      if (!merchantPhone) {
        throw Errors.badRequest("Listing has no phone number for dispatch");
      }

      const magicLink = `${webUrl}/m?token=${rawToken}`;
      const message = `${jobSummary}\n\n🔗 Accept or decline:\n${magicLink}`;

      const result = await sendWhatsApp(merchantPhone, message, {
        role: "merchant",
      });
      messageId = result?.sid || `local-${Date.now()}`;
      dispatchedVia = "whatsapp";

      logger.debug(`[Dispatch] Listed merchant - Magic link sent`, {
        traceId,
        jobId,
        listingId: job.merchantTarget.listingId,
        tokenId: tokenRef.id,
      });
    } else {
      // Unlisted Merchant: Direct text
      const merchantPhone = job.merchantTarget.phone;
      const merchantName = job.merchantTarget.name || "Merchant";

      const message = `${jobSummary}\n\nHi ${merchantName}, please reply:\n✅ YES to accept\n❌ NO to decline\n\n(Job Code: ${job.jobCode})`;

      const result = await sendWhatsApp(merchantPhone, message, {
        role: "merchant",
      });
      messageId = result?.sid || `local-${Date.now()}`;
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
    const updateData: Partial<Job> & { dispatchedVia: string } = {
      status: targetStatus,
      dispatchedAt: now,
      dispatchMessageId: messageId,
      dispatchedVia, // New field: track which channel was used
      dispatchAttempts: (job.dispatchAttempts || 0) + 1,
      updatedAt: now,
    };

    await jobRef.update(updateData);

    const updatedJob = {
      ...job,
      ...updateData,
    };

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
  },
);

// DispatchJobParamsSchema already exported at declaration
