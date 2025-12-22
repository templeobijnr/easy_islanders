"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageStatus = exports.handleIncomingWhatsApp = void 0;
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
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const whatsapp_1 = require("../services/channels/whatsapp");
const whatsappInbound_repository_1 = require("../services/domains/channels/whatsappInbound.repository");
const functions_1 = require("firebase-admin/functions");
const twilio_1 = __importDefault(require("twilio"));
function getPublicUrl(req) {
    var _a;
    const proto = ((_a = (req.get("x-forwarded-proto") || "https").split(",")[0]) === null || _a === void 0 ? void 0 : _a.trim()) || "https";
    const host = req.get("x-forwarded-host") || req.get("host") || "";
    return `${proto}://${host}${req.originalUrl}`;
}
function getTwilioParams(req) {
    const body = req.body;
    if (body && typeof body === "object")
        return body;
    if (typeof body === "string")
        return Object.fromEntries(new URLSearchParams(body));
    if (Buffer.isBuffer(body))
        return Object.fromEntries(new URLSearchParams(body.toString("utf8")));
    return {};
}
function verifyTwilioSignature(req, res) {
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
    const isValid = twilio_1.default.validateRequest(authToken, signature, url, params);
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
const handleIncomingWhatsApp = async (req, res) => {
    var _a, _b, _c;
    const startTime = Date.now();
    if (!verifyTwilioSignature(req, res)) {
        return;
    }
    try {
        // 1. Parse inbound payload
        const normalized = (0, whatsapp_1.normalizeTwilioWhatsAppPayload)(req.body);
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
            bodyPreview: (_a = normalized.text) === null || _a === void 0 ? void 0 : _a.slice(0, 50),
        });
        // 2. Create receipt (idempotent)
        const { created, receipt } = await (0, whatsappInbound_repository_1.createIfAbsent)({
            messageSid,
            fromE164: normalized.fromE164,
            toE164: normalized.toE164 || undefined,
            body: normalized.text,
            mediaUrls: normalized.mediaUrls.length > 0 ? normalized.mediaUrls : undefined,
            location: normalized.location
                ? {
                    lat: normalized.location.lat,
                    lng: normalized.location.lng,
                    address: (_b = normalized.location.address) !== null && _b !== void 0 ? _b : undefined,
                    label: (_c = normalized.location.label) !== null && _c !== void 0 ? _c : undefined,
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
            const queue = (0, functions_1.getFunctions)().taskQueue("processWhatsAppInbound");
            await queue.enqueue({ messageSid }, {
                dispatchDeadlineSeconds: 300, // 5 min deadline
            });
            logger.debug(`📤 [Twilio Webhook] Enqueued task`, { messageSid });
        }
        catch (enqueueErr) {
            console.error("⚠️ [Twilio Webhook] Failed to enqueue task", enqueueErr);
            // Still return 200 - task can be retried via cron/manual
        }
        // 4. Return 200 immediately
        const elapsed = Date.now() - startTime;
        logger.debug(`✅ [Twilio Webhook] Responded in ${elapsed}ms`, {
            messageSid,
        });
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("❌ [Twilio Webhook] Error:", error);
        // Return 200 to prevent Twilio retries on parsing errors
        res.status(200).send("OK");
    }
};
exports.handleIncomingWhatsApp = handleIncomingWhatsApp;
/**
 * Webhook endpoint for Twilio message status callbacks.
 * Called when message status changes (sent, delivered, read, failed).
 */
const handleMessageStatus = async (req, res) => {
    if (!verifyTwilioSignature(req, res)) {
        return;
    }
    try {
        logger.debug("📊 [Twilio Status] Message status update:", req.body);
        const { MessageSid: messageSid, MessageStatus: status, To: to, ErrorCode: errorCode, ErrorMessage: errorMessage, } = req.body;
        // Log to Firestore for tracking
        await firebase_1.db.collection("whatsapp_logs").add({
            messageSid,
            status,
            to,
            errorCode: errorCode || null,
            errorMessage: errorMessage || null,
            timestamp: new Date(),
        });
        logger.debug(`✅ [Twilio Status] Logged status: ${status} for ${messageSid}`);
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("❌ [Twilio Status] Error:", error);
        res.status(500).send("Error");
    }
};
exports.handleMessageStatus = handleMessageStatus;
//# sourceMappingURL=twilio.controller.js.map