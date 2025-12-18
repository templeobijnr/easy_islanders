/**
 * POST /v1/merchant/session - Exchange Token for Session
 *
 * Exchanges a raw magic link token for a short-lived session JWT.
 *
 * Flow:
 * 1. Client sends { rawToken }
 * 2. Server hashes rawToken -> tokenHash
 * 3. Server looks up valid, non-expired token in Firestore
 * 4. Server signs JWT with listingId and scopes
 *
 * Public endpoint (no auth required).
 */

import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import {
  ExchangeTokenRequestSchema,
  MerchantToken,
  type ExchangeTokenRequest,
} from "@askmerve/shared";
import { asyncHandler, Errors } from "../../../lib/middleware";

// =============================================================================
// CONFIG
// =============================================================================

const JWT_SECRET =
  process.env.MERCHANT_JWT_SECRET || "dev-secret-do-not-use-in-prod";
const SESSION_EXPIRY = "15m";

// =============================================================================
// HELPER: HASHING
// =============================================================================

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// =============================================================================
// HANDLER
// =============================================================================

export const exchangeMerchantToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = (req as any).traceId;
    const body = req.body as ExchangeTokenRequest;

    // ==========================================================================
    // 1. HASH & LOOKUP
    // ==========================================================================
    const tokenHash = hashToken(body.rawToken);

    const db = admin.firestore();
    const tokensSnapshot = await db
      .collection("merchantTokens")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (tokensSnapshot.empty) {
      // Return 401 for valid-looking but incorrect/expired tokens to avoid enumeration?
      // Or 404? 401 is safer.
      throw Errors.forbidden("Invalid or expired token");
    }

    const tokenDoc = tokensSnapshot.docs[0];
    const token = { id: tokenDoc.id, ...tokenDoc.data() } as MerchantToken;

    // ==========================================================================
    // 2. VALIDATE STATUS
    // ==========================================================================
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);

    if (!token.active) {
      throw Errors.forbidden("Token has been deactivated");
    }

    if (now > expiresAt) {
      throw Errors.forbidden("Token has expired");
    }

    // ==========================================================================
    // 3. MINT JWT
    // ==========================================================================
    const payload = {
      sid: token.id,
      listingId: token.listingId,
      scopes: token.scopes,
      jobId: token.jobId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: SESSION_EXPIRY,
      subject: token.listingId, // The "user" of this session is the listing
      audience: "askmerve-merchant",
    });

    logger.debug(`[Merchant] Session created`, {
      traceId,
      tokenId: token.id,
      listingId: token.listingId,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        listingId: token.listingId,
        scopes: token.scopes,
      },
    });
  },
);

export { ExchangeTokenRequestSchema };
