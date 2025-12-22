"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageStatus = exports.handleIncomingWhatsApp = void 0;
const firebase_1 = require("../config/firebase");
const whatsapp_1 = require("../services/channels/whatsapp");
const whatsappInbound_repository_1 = require("../services/domains/channels/whatsappInbound.repository");
const functions_1 = require("firebase-admin/functions");
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
    try {
        // 1. Parse inbound payload
        const normalized = (0, whatsapp_1.normalizeTwilioWhatsAppPayload)(req.body);
        const messageSid = normalized.messageId;
        if (!messageSid) {
            console.error('⚠️ [Twilio Webhook] Missing MessageSid');
            res.status(400).send('Missing MessageSid');
            return;
        }
        if (!normalized.text && normalized.mediaUrls.length === 0) {
            console.error('⚠️ [Twilio Webhook] Missing message body and media');
            res.status(400).send('Missing required fields');
            return;
        }
        console.log(`📥 [Twilio Webhook] Received`, {
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
            location: normalized.location ? {
                lat: normalized.location.lat,
                lng: normalized.location.lng,
                address: (_b = normalized.location.address) !== null && _b !== void 0 ? _b : undefined,
                label: (_c = normalized.location.label) !== null && _c !== void 0 ? _c : undefined,
            } : undefined,
        });
        if (!created) {
            // Duplicate message - already queued/processing/processed
            console.log(`⚡ [Twilio Webhook] Duplicate, status=${receipt.status}`, { messageSid });
            res.status(200).send('OK');
            return;
        }
        // 3. Enqueue processing task
        try {
            const queue = (0, functions_1.getFunctions)().taskQueue('processWhatsAppInbound');
            await queue.enqueue({ messageSid }, {
                dispatchDeadlineSeconds: 300, // 5 min deadline
            });
            console.log(`📤 [Twilio Webhook] Enqueued task`, { messageSid });
        }
        catch (enqueueErr) {
            console.error('⚠️ [Twilio Webhook] Failed to enqueue task', enqueueErr);
            // Still return 200 - task can be retried via cron/manual
        }
        // 4. Return 200 immediately
        const elapsed = Date.now() - startTime;
        console.log(`✅ [Twilio Webhook] Responded in ${elapsed}ms`, { messageSid });
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('❌ [Twilio Webhook] Error:', error);
        // Return 200 to prevent Twilio retries on parsing errors
        res.status(200).send('OK');
    }
};
exports.handleIncomingWhatsApp = handleIncomingWhatsApp;
/**
 * Webhook endpoint for Twilio message status callbacks.
 * Called when message status changes (sent, delivered, read, failed).
 */
const handleMessageStatus = async (req, res) => {
    try {
        console.log('📊 [Twilio Status] Message status update:', req.body);
        const { MessageSid: messageSid, MessageStatus: status, To: to, ErrorCode: errorCode, ErrorMessage: errorMessage } = req.body;
        // Log to Firestore for tracking
        await firebase_1.db.collection('whatsapp_logs').add({
            messageSid,
            status,
            to,
            errorCode: errorCode || null,
            errorMessage: errorMessage || null,
            timestamp: new Date()
        });
        console.log(`✅ [Twilio Status] Logged status: ${status} for ${messageSid}`);
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('❌ [Twilio Status] Error:', error);
        res.status(500).send('Error');
    }
};
exports.handleMessageStatus = handleMessageStatus;
//# sourceMappingURL=twilio.controller.js.map