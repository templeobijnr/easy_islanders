/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + orchestration. NO direct Firestore access.
 *
 * Discovery Notes:
 * ─────────────────
 * 1. Inbound Flow: webhook → normalize → receipt → enqueue task → FAST ACK
 * 2. Task Flow: mark processing → route → domain handler → orchestrator → outbound → mark processed
 * 3. Outbound Flow: validate → derive key → reserve → create pending → send → mark sent
 * 4. Status Flow: callback → log → update canonical outbound record
 *
 * Collections touched:
 * - whatsappInbound (receipts)
 * - whatsappOutbound (canonical outbound)
 * - whatsapp_logs (status logs, legacy compat)
 * - outboundIdempotency (dedupe keys)
 * - messageCorrelation (linking messages to entities)
 */

import type { Request, Response } from "express";
import * as logger from "firebase-functions/logger";
import twilio from "twilio";
import { getFunctions } from "firebase-admin/functions";
import { MessagingService } from "./messaging.service";
import {
    InboundWhatsAppPayloadSchema,
    SendMessageInputSchema,
    StatusCallbackInputSchema,
    deriveOutboundIdempotencyKey,
    mapTwilioStatus,
} from "./messaging.schema";
import type {
    InboundWhatsAppPayload,
    SendMessageInput,
    OutboundMessage,
    MessageCorrelation,
} from "./messaging.schema";
import { AppError } from "../../utils/errors";

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function getPublicUrl(req: Request): string {
    const proto =
        (req.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
    const host = req.get("x-forwarded-host") || req.get("host") || "";
    return `${proto}://${host}${req.originalUrl}`;
}

function getTwilioParams(req: Request): Record<string, string> {
    const body = req.body;
    if (body && typeof body === "object") return body;
    if (typeof body === "string") return Object.fromEntries(new URLSearchParams(body));
    if (Buffer.isBuffer(body)) return Object.fromEntries(new URLSearchParams(body.toString("utf8")));
    return {};
}

function verifyTwilioSignature(req: Request): { valid: boolean; error?: string } {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
        return { valid: false, error: "TWILIO_AUTH_TOKEN not configured" };
    }

    const signature = req.get("x-twilio-signature");
    if (!signature) {
        return { valid: false, error: "Missing Twilio signature" };
    }

    const url = getPublicUrl(req);
    const params = getTwilioParams(req);
    const isValid = twilio.validateRequest(authToken, signature, url, params);

    if (!isValid) {
        return { valid: false, error: "Invalid Twilio signature" };
    }

    return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYLOAD NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize Twilio webhook payload.
 * Reuses existing normalization logic pattern.
 */
function normalizeTwilioPayload(body: Record<string, unknown>): InboundWhatsAppPayload {
    const messageId = (body.MessageSid as string) || "";
    const fromE164 = ((body.From as string) || "").replace("whatsapp:", "");
    const toE164 = ((body.To as string) || "").replace("whatsapp:", "");
    const text = (body.Body as string) || "";

    // Media URLs
    const mediaUrls: string[] = [];
    const numMedia = parseInt((body.NumMedia as string) || "0", 10);
    for (let i = 0; i < numMedia; i++) {
        const url = body[`MediaUrl${i}`] as string;
        if (url) mediaUrls.push(url);
    }

    // Location
    let location: InboundWhatsAppPayload["location"];
    const lat = parseFloat((body.Latitude as string) || "");
    const lng = parseFloat((body.Longitude as string) || "");
    if (!isNaN(lat) && !isNaN(lng)) {
        location = {
            lat,
            lng,
            address: (body.Address as string) || undefined,
            label: (body.Label as string) || undefined,
        };
    }

    return { messageId, fromE164, toE164, text, mediaUrls, location };
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND WEBHOOK HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle Twilio inbound webhook.
 * FAST ACK pattern: parse → receipt → enqueue → 200
 */
async function handleTwilioInboundWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    // 1. Validate signature
    const sigResult = verifyTwilioSignature(req);
    if (!sigResult.valid) {
        logger.warn(`[Messaging] Signature validation failed: ${sigResult.error}`);
        res.status(403).send(sigResult.error);
        return;
    }

    try {
        // 2. Normalize payload
        const normalized = normalizeTwilioPayload(req.body);

        if (!normalized.messageId) {
            res.status(400).send("Missing MessageSid");
            return;
        }

        if (!normalized.text && normalized.mediaUrls.length === 0 && !normalized.location) {
            res.status(400).send("Missing message content");
            return;
        }

        logger.debug(`[Messaging] Inbound received`, {
            messageSid: normalized.messageId,
            from: normalized.fromE164,
            preview: normalized.text?.slice(0, 50),
        });

        // 3. Create idempotent receipt
        const { created, receipt } = await MessagingService.createInboundReceiptIdempotent({
            messageSid: normalized.messageId,
            fromE164: normalized.fromE164,
            toE164: normalized.toE164 || undefined,
            body: normalized.text || "",
            mediaUrls: normalized.mediaUrls.length > 0 ? normalized.mediaUrls : undefined,
            location: normalized.location,
        });

        if (!created) {
            logger.debug(`[Messaging] Duplicate inbound, status=${receipt.status}`, {
                messageSid: normalized.messageId,
            });
            res.status(200).send("OK");
            return;
        }

        // 4. Enqueue processing task
        try {
            const queue = getFunctions().taskQueue("processWhatsAppInbound");
            await queue.enqueue(
                { messageSid: normalized.messageId },
                { dispatchDeadlineSeconds: 300 }
            );
            logger.debug(`[Messaging] Enqueued task`, { messageSid: normalized.messageId });
        } catch (enqueueErr) {
            logger.warn(`[Messaging] Failed to enqueue task`, enqueueErr);
            // Still return 200 - can retry via cron
        }

        // 5. FAST ACK
        const elapsed = Date.now() - startTime;
        logger.debug(`[Messaging] Responded in ${elapsed}ms`, { messageSid: normalized.messageId });
        res.status(200).send("OK");
    } catch (error) {
        logger.error(`[Messaging] Inbound error:`, error);
        // Return 200 to prevent Twilio retries on parse errors
        res.status(200).send("OK");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND TASK PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process WhatsApp inbound message (Cloud Task handler).
 * Called async after FAST ACK.
 */
async function processWhatsAppInboundTask(payload: { messageSid: string }): Promise<void> {
    const { messageSid } = payload;

    // 1. Mark processing (guarded transition)
    const canProcess = await MessagingService.markInboundProcessing(messageSid);
    if (!canProcess) {
        logger.debug(`[Messaging] Skipping already processed/processing`, { messageSid });
        return;
    }

    // 2. Get receipt
    const receipt = await MessagingService.getInboundReceipt(messageSid);
    if (!receipt) {
        logger.error(`[Messaging] Receipt not found`, { messageSid });
        return;
    }

    try {
        // 3. Route and process using existing infrastructure
        // Import dynamically to avoid circular deps and use existing router
        const { routeInbound } = await import("../../services/channels/whatsapp/whatsapp.router");
        const { handleConsumerMessage } = await import("../../services/channels/whatsapp.service");

        const routeDecision = await routeInbound({
            fromE164: receipt.fromE164,
            text: receipt.body,
        });

        let threadId = "";

        // Route to appropriate handler
        switch (routeDecision.route) {
            case "consumer":
                // Use existing consumer handler which handles orchestration
                await handleConsumerMessage(receipt.fromE164, receipt.body, {
                    messageSid: receipt.messageSid,
                });
                threadId = `wa:${receipt.fromE164.replace(/\+/g, "")}`;
                break;

            case "business_ops":
                // Existing business ops handler
                const { handleBusinessOpsMessage } = await import(
                    "../../services/channels/whatsapp/whatsapp.business-ops"
                );
                await handleBusinessOpsMessage({
                    actorId: `wa:${receipt.fromE164.replace(/\+/g, "")}`,
                    businessId: "unknown", // Will be resolved by the handler
                    phoneE164: receipt.fromE164,
                    text: receipt.body,
                    messageSid: receipt.messageSid,
                });
                threadId = `ops:${receipt.fromE164.replace(/\+/g, "")}`;
                break;

            case "driver":
                // Existing taxi driver handler
                const { handleDriverReply } = await import(
                    "../../services/domains/dispatch/taxi.service"
                );
                await handleDriverReply(receipt.fromE164, receipt.body);
                threadId = `driver:${receipt.fromE164.replace(/\+/g, "")}`;
                break;

            default:
                threadId = `unrouted:${receipt.fromE164.replace(/\+/g, "")}`;
        }

        // 4. Create correlation record
        const correlationId = `${messageSid}`;
        const correlation: MessageCorrelation = {
            id: correlationId,
            channel: "whatsapp",
            fromE164: receipt.fromE164,
            toE164: receipt.toE164,
            direction: "inbound",
            messageSid,
            threadId,
            correlationType: routeDecision.route === "driver" ? "taxi" :
                routeDecision.route === "business_ops" ? "ops" : "thread",
            createdAt: new Date().toISOString(),
        };
        await MessagingService.upsertCorrelation(correlation);

        // 5. Mark processed
        await MessagingService.markInboundProcessed(messageSid, {
            threadId,
            route: routeDecision.route,
        });

        logger.info(`[Messaging] Processed inbound`, {
            messageSid,
            route: routeDecision.route,
            threadId,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await MessagingService.markInboundFailed(messageSid, errorMessage);
        logger.error(`[Messaging] Processing failed`, { messageSid, error: errorMessage });
        throw error; // Re-throw for Cloud Tasks retry
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CALLBACK HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle Twilio status callback.
 */
async function handleTwilioStatusCallback(req: Request, res: Response): Promise<void> {
    // 1. Validate signature
    const sigResult = verifyTwilioSignature(req);
    if (!sigResult.valid) {
        res.status(403).send(sigResult.error);
        return;
    }

    try {
        const parseResult = StatusCallbackInputSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).send("Invalid payload");
            return;
        }

        const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = parseResult.data;

        logger.debug(`[Messaging] Status callback`, { MessageSid, MessageStatus });

        // 2. Log to legacy collection
        await MessagingService.logStatusCallback({
            messageSid: MessageSid,
            status: MessageStatus,
            to: To,
            errorCode: ErrorCode,
            errorMessage: ErrorMessage,
        });

        // 3. Update canonical outbound record
        const status = mapTwilioStatus(MessageStatus);
        await MessagingService.updateOutboundStatus(MessageSid, status, {
            errorCode: ErrorCode,
            errorMessage: ErrorMessage,
        });

        res.status(200).send("OK");
    } catch (error) {
        logger.error(`[Messaging] Status callback error:`, error);
        res.status(500).send("Error");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENT OUTBOUND SEND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send WhatsApp message with idempotency.
 * Returns existing message if already sent.
 */
async function sendWhatsAppIdempotent(input: SendMessageInput): Promise<OutboundMessage> {
    // 1. Validate input
    const parseResult = SendMessageInputSchema.safeParse(input);
    if (!parseResult.success) {
        throw new AppError("INVALID_INPUT", parseResult.error.message);
    }

    const { to, body, templateKey, correlationId, correlationType } = parseResult.data;

    // 2. Derive idempotency key
    const idempotencyKey = input.idempotencyKey || deriveOutboundIdempotencyKey(
        to,
        correlationId,
        templateKey
    );

    // 3. Reserve/check idempotency
    const { reserved, existingMessageId } = await MessagingService.reserveOutboundIdempotency(
        idempotencyKey
    );

    if (!reserved && existingMessageId) {
        // Already sent - return existing
        const existing = await MessagingService.getOutboundByIdempotency(idempotencyKey);
        if (existing) {
            logger.debug(`[Messaging] Returning existing outbound`, {
                idempotencyKey,
                messageId: existing.id,
            });
            return existing;
        }
    }

    // 4. Create pending outbound record
    const fromE164 = process.env.TWILIO_WHATSAPP_FROM?.replace("whatsapp:", "") || "";
    const message = await MessagingService.createOutboundPending({
        idempotencyKey,
        fromE164,
        toE164: to.replace("whatsapp:", ""),
        body,
        templateKey,
        correlationId,
        correlationType,
    });

    // 5. Send via Twilio gateway
    try {
        const { sendWhatsApp } = await import("../../services/twilio.service");
        const result = await sendWhatsApp(to, body);

        // 6. Mark sent
        await MessagingService.markOutboundSent(message.id, result.sid);

        logger.info(`[Messaging] Sent outbound`, {
            messageId: message.id,
            twilioSid: result.sid,
            to,
        });

        return {
            ...message,
            status: "sent",
            twilioSid: result.sid,
            sentAt: new Date().toISOString(),
        };
    } catch (error) {
        // 7. Mark failed
        const errorMessage = error instanceof Error ? error.message : String(error);
        await MessagingService.markOutboundFailed(message.id, { errorMessage });

        logger.error(`[Messaging] Send failed`, { messageId: message.id, error: errorMessage });
        throw new AppError("INTERNAL", `Failed to send message: ${errorMessage}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const MessagingController = {
    handleTwilioInboundWebhook,
    processWhatsAppInboundTask,
    handleTwilioStatusCallback,
    sendWhatsAppIdempotent,
};
