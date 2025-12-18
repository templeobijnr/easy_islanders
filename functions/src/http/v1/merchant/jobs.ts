/**
 * GET /v1/merchant/jobs - Get Jobs for Merchant
 *
 * Returns jobs targeted at the merchant's listing.
 * Requires valid merchant session JWT.
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { asyncHandler, Errors } from "../../../lib/middleware";

export const getMerchantJobs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const session = (req as any).merchantSession;

    if (!session?.listingId) {
      throw Errors.forbidden("Invalid session");
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

    const jobs = jobsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.debug(`[Merchant] Fetched jobs`, {
      traceId,
      listingId: session.listingId,
      count: jobs.length,
    });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  },
);
