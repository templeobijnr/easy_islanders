/**
 * POST /v1/admin/merchant-token - Create Merchant Token
 *
 * Generates a persistent "Magic Link" token for a listing.
 * stores: HASH(token)
 * returns: RAW_TOKEN (one-time)
 *
 * Admin Only.
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {
  CreateMerchantTokenRequestSchema,
  MerchantToken,
  type CreateMerchantTokenRequest,
} from "@askmerve/shared";
import { getUserId, asyncHandler, Errors } from "../../../lib/middleware";

// =============================================================================
// HELPER: HASHING
// =============================================================================

/**
 * Creates a distinct SHA-256 hash of the token for storage.
 * We include a pepper/salt approach if strict security needed,
 * but for this V1, straightforward SHA-256 of high-entropy string is sufficient.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a secure random 32-byte token (base64url encoded).
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// =============================================================================
// HANDLER
// =============================================================================

export const createMerchantToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const userId = getUserId(req);
    const body = req.body as CreateMerchantTokenRequest;

    // ==========================================================================
    // 1. ADMIN CHECK
    // ==========================================================================
    const userRecord = await admin.auth().getUser(userId);
    const customClaims = userRecord.customClaims || {};

    if (!customClaims.admin) {
      throw Errors.forbidden("Only admins can generate merchant tokens");
    }

    // ==========================================================================
    // 2. GENERATE TOKEN
    // ==========================================================================
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // ==========================================================================
    // 3. STORE IN FIRESTORE
    // ==========================================================================
    const db = admin.firestore();
    const tokenRef = db.collection("merchantTokens").doc();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + body.expiresInDays * 24 * 60 * 60 * 1000,
    );

    const tokenData: MerchantToken = {
      id: tokenRef.id,
      tokenHash,
      listingId: body.listingId,
      scopes: body.scopes,
      jobId: body.jobId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      active: true,
      createdBy: userId,
    };

    await tokenRef.set(tokenData);

    // ==========================================================================
    // 4. RETURN RAW TOKEN
    // ==========================================================================
    logger.debug(`[Admin] Created merchant token`, {
      traceId,
      adminId: userId,
      listingId: body.listingId,
      scopes: body.scopes,
      tokenId: tokenData.id,
    });

    res.status(201).json({
      success: true,
      data: {
        rawToken,
        expiresAt: tokenData.expiresAt,
        // Helper for frontend/admin console to copy-paste
        magicLinkUrl: process.env.VITE_WEB_URL
          ? `${process.env.VITE_WEB_URL}/m/auth?t=${rawToken}`
          : undefined,
      },
    });
  },
);

export { CreateMerchantTokenRequestSchema };
