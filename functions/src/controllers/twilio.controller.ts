/**
 * Twilio Webhook Controller
 *
 * Handles incoming WhatsApp messages with FAST ACK pattern:
 * 1. Parse inbound payload
 * 2. Create receipt (idempotent)
 * 3. Enqueue processing task
 * 4. Return 200 immediately
 *
 * Actual processing happens async in whatsappInbound.task.ts
 */
import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { db } from "../config/firebase";
import { normalizeTwilioWhatsAppPayload } from "../services/channels/whatsapp";
import { createIfAbsent } from "../services/domains/channels/whatsappInbound.repository";
import { getFunctions } from "firebase-admin/functions";
import twilio from "twilio";

function getPublicUrl(req: Request): string {
  const proto =
    (req.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
  const host = req.get("x-forwarded-host") || req.get("host") || "";
  return `${proto}://${host}${req.originalUrl}`;
}

function getTwilioParams(req: Request): Record<string, any> {
  const body = req.body as any;
  if (body && typeof body === "object") return body;
  if (typeof body === "string")
    return Object.fromEntries(new URLSearchParams(body));
  if (Buffer.isBuffer(body))
    return Object.fromEntries(new URLSearchParams(body.toString("utf8")));
  return {};
}

function verifyTwilioSignature(req: Request, res: Response): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("❌ [Twilio Webhook] TWILIO_AUTH_TOKEN is not configured");
    res.status(500).send("Server misconfigured");
    return false;
  }

  const signature = req.get("x-twilio-signature");
  if (!signature) {
    res.status(403).send("Missing Twilio signature");
    return false;
  }

  const url = getPublicUrl(req);
  const params = getTwilioParams(req);
  const isValid = twilio.validateRequest(authToken, signature, url, params);

  if (!isValid) {
    res.status(403).send("Invalid Twilio signature");
    return false;
  }

  return true;
}

/**
 * Webhook endpoint for incoming WhatsApp messages.
 *
 * FAST ACK pattern:
 * - Parse → Receipt → Enqueue → 200
 * - No routing, no LLM, no blocking network calls
 * - Target: <300ms response time
 */
export const handleIncomingWhatsApp = async (req: Request, res: Response) => {
  const startTime = Date.now();

  if (!verifyTwilioSignature(req, res)) {
    return;
  }

  try {
    // 1. Parse inbound payload
    const normalized = normalizeTwilioWhatsAppPayload(req.body);
    const messageSid = normalized.messageId;

    if (!messageSid) {
      console.error("⚠️ [Twilio Webhook] Missing MessageSid");
      res.status(400).send("Missing MessageSid");
      return;
    }

    if (!normalized.text && normalized.mediaUrls.length === 0) {
      console.error("⚠️ [Twilio Webhook] Missing message body and media");
      res.status(400).send("Missing required fields");
      return;
    }

    logger.debug(`📥 [Twilio Webhook] Received`, {
      messageSid,
      from: normalized.fromE164,
      bodyPreview: normalized.text?.slice(0, 50),
    });

    // 2. Create receipt (idempotent)
    const { created, receipt } = await createIfAbsent({
      messageSid,
      fromE164: normalized.fromE164,
      toE164: normalized.toE164 || undefined,
      body: normalized.text,
      mediaUrls:
        normalized.mediaUrls.length > 0 ? normalized.mediaUrls : undefined,
      location: normalized.location
        ? {
            lat: normalized.location.lat,
            lng: normalized.location.lng,
            address: normalized.location.address ?? undefined,
            label: normalized.location.label ?? undefined,
          }
        : undefined,
    });

    if (!created) {
      // Duplicate message - already queued/processing/processed
      logger.debug(`⚡ [Twilio Webhook] Duplicate, status=${receipt.status}`, {
        messageSid,
      });
      res.status(200).send("OK");
      return;
    }

    // 3. Enqueue processing task
    try {
      const queue = getFunctions().taskQueue("processWhatsAppInbound");
      await queue.enqueue(
        { messageSid },
        {
          dispatchDeadlineSeconds: 300, // 5 min deadline
        },
      );
      logger.debug(`📤 [Twilio Webhook] Enqueued task`, { messageSid });
    } catch (enqueueErr) {
      console.error("⚠️ [Twilio Webhook] Failed to enqueue task", enqueueErr);
      // Still return 200 - task can be retried via cron/manual
    }

    // 4. Return 200 immediately
    const elapsed = Date.now() - startTime;
    logger.debug(`✅ [Twilio Webhook] Responded in ${elapsed}ms`, {
      messageSid,
    });
    res.status(200).send("OK");
  } catch (error: unknown) {
    console.error("❌ [Twilio Webhook] Error:", error);
    // Return 200 to prevent Twilio retries on parsing errors
    res.status(200).send("OK");
  }
};

/**
 * Webhook endpoint for Twilio message status callbacks.
 * Called when message status changes (sent, delivered, read, failed).
 */
export const handleMessageStatus = async (req: Request, res: Response) => {
  if (!verifyTwilioSignature(req, res)) {
    return;
  }

  try {
    logger.debug("📊 [Twilio Status] Message status update:", req.body);

    const {
      MessageSid: messageSid,
      MessageStatus: status,
      To: to,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
    } = req.body;

    // Log to Firestore for tracking
    await db.collection("whatsapp_logs").add({
      messageSid,
      status,
      to,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null,
      timestamp: new Date(),
    });

    logger.debug(
      `✅ [Twilio Status] Logged status: ${status} for ${messageSid}`,
    );
    res.status(200).send("OK");
  } catch (error: unknown) {
    console.error("❌ [Twilio Status] Error:", error);
    res.status(500).send("Error");
  }
};
