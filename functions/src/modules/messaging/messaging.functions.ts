/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 */

import { onRequest } from "firebase-functions/v2/https";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import * as logger from "firebase-functions/logger";
import { MessagingController } from "./messaging.controller";

// ─────────────────────────────────────────────────────────────────────────────
// REGION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const REGION = "europe-west1";

// ─────────────────────────────────────────────────────────────────────────────
// TWILIO WEBHOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Twilio inbound webhook for WhatsApp messages.
 * POST /twilioInboundWebhook
 *
 * Uses FAST ACK pattern:
 * - Parse → Receipt → Enqueue → 200
 * - Target: <300ms response time
 */
export const twilioInboundWebhook = onRequest(
    {
        region: REGION,
        maxInstances: 100,
        timeoutSeconds: 30,
    },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        // Cast to Express types for controller compatibility
        await MessagingController.handleTwilioInboundWebhook(
            req as unknown as import("express").Request,
            res as unknown as import("express").Response
        );
    }
);

/**
 * Twilio status callback webhook.
 * POST /twilioStatusWebhook
 *
 * Called when message status changes (sent, delivered, read, failed).
 */
export const twilioStatusWebhook = onRequest(
    {
        region: REGION,
        maxInstances: 50,
        timeoutSeconds: 30,
    },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        // Cast to Express types for controller compatibility
        await MessagingController.handleTwilioStatusCallback(
            req as unknown as import("express").Request,
            res as unknown as import("express").Response
        );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD TASKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process WhatsApp inbound message task.
 * Called async after FAST ACK.
 *
 * Cloud Task: processWhatsAppInbound
 */
export const processWhatsAppInbound = onTaskDispatched(
    {
        region: REGION,
        retryConfig: {
            maxAttempts: 3,
            maxBackoffSeconds: 600,
        },
        rateLimits: {
            maxConcurrentDispatches: 50,
        },
    },
    async (req) => {
        const payload = req.data as { messageSid: string };

        if (!payload?.messageSid) {
            logger.error("[Messaging] Task missing messageSid");
            return;
        }

        await MessagingController.processWhatsAppInboundTask(payload);
    }
);
