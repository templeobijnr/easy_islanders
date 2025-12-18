import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { db } from "../config/firebase";

/**
 * Generic email provider webhook receiver.
 * Configure your email service to POST delivery/reply events here.
 */
export const handleEmailWebhook = async (req: Request, res: Response) => {
  const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;
  const providedSecret =
    req.get("x-email-webhook-secret") || req.get("x-webhook-secret") || "";

  if (!expectedSecret) {
    console.error("❌ [Email Webhook] EMAIL_WEBHOOK_SECRET is not configured");
    res.status(500).send("Server misconfigured");
    return;
  }

  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  const secretsMatch =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);

  if (!secretsMatch) {
    res.status(403).send("Invalid webhook secret");
    return;
  }

  try {
    logger.debug("📥 [Email Webhook] Incoming email event");

    const safeHeaders = { ...req.headers } as Record<string, unknown>;
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;
    delete safeHeaders["set-cookie"];
    delete safeHeaders["x-email-webhook-secret"];
    delete safeHeaders["x-webhook-secret"];

    await db.collection("email_logs").add({
      payload: req.body,
      headers: safeHeaders,
      receivedAt: new Date(),
    });

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ [Email Webhook] Error:", err);
    res.status(500).send("Error");
  }
};
