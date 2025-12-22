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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWhatsAppInbound = void 0;
const errors_1 = require("../utils/errors");
/**
 * WhatsApp Inbound Task Worker
 *
 * Processes inbound WhatsApp messages asynchronously using unified orchestrator.
 *
 * Flow:
 * 1. Load receipt by MessageSid
 * 2. Guard: skip if already processed
 * 3. Resolve route + thread
 * 4. Append inbound message
 * 5. Call unified orchestrator processInbound()
 * 6. Send outbound messages via Twilio
 * 7. Mark processed
 */
const functions = __importStar(require("firebase-functions/v2"));
const logger = __importStar(require("firebase-functions/logger"));
const whatsappInbound_repository_1 = require("../services/domains/channels/whatsappInbound.repository");
const whatsapp_router_1 = require("../services/channels/whatsapp/whatsapp.router");
const conversations_1 = require("../services/domains/conversations");
const unified_service_1 = require("../services/orchestrator/unified.service");
const twilio_service_1 = require("../services/twilio.service");
// ============================================
// TASK QUEUE CONFIGURATION
// ============================================
const QUEUE_OPTIONS = {
    retryConfig: {
        maxAttempts: 5,
        minBackoffSeconds: 1,
        maxBackoffSeconds: 60,
    },
    rateLimits: {
        maxConcurrentDispatches: 50,
        maxDispatchesPerSecond: 25,
    },
};
// ============================================
// HELPERS
// ============================================
function getThreadType(decision) {
    switch (decision.route) {
        case 'consumer':
            return 'general';
        case 'business_ops':
            return 'business_ops';
        case 'driver':
            return 'dispatch';
        default:
            return 'general';
    }
}
// ============================================
// TASK HANDLER
// ============================================
/**
 * Process a WhatsApp inbound message.
 *
 * Reliable pipeline:
 * - Idempotency for inbound processing (receipts)
 * - Idempotency for outbound sends (dedupeId)
 * - Location persistence
 * - Guaranteed ordering via single worker (mostly)
 */
exports.processWhatsAppInbound = functions.tasks.onTaskDispatched(QUEUE_OPTIONS, async (req) => {
    const { messageSid } = req.data;
    if (!messageSid) {
        logger.error('[WhatsAppTask] Missing messageSid in task data');
        return;
    }
    logger.info('[WhatsAppTask] Processing', { messageSid });
    try {
        // 1. Load receipt
        const receipt = await (0, whatsappInbound_repository_1.getReceipt)(messageSid);
        if (!receipt) {
            logger.error('[WhatsAppTask] Receipt not found', { messageSid });
            return;
        }
        // 2. Guard: check if already processed
        const canProcess = await (0, whatsappInbound_repository_1.markProcessing)(messageSid);
        if (!canProcess) {
            logger.info('[WhatsAppTask] Already processed or in-progress, skipping', { messageSid });
            return;
        }
        // 3. Resolve route
        const decision = await (0, whatsapp_router_1.routeInbound)({
            fromE164: receipt.fromE164,
            text: receipt.body,
            mediaUrls: receipt.mediaUrls,
            location: receipt.location,
        });
        logger.info('[WhatsAppTask] Route decision', { messageSid, route: decision.route });
        // 4. Resolve thread
        const threadType = getThreadType(decision);
        const thread = await (0, conversations_1.getOrCreateThread)({
            threadType,
            actorId: decision.actorId,
            businessId: 'businessId' in decision ? decision.businessId : undefined,
            channel: 'whatsapp',
        });
        // 5. Append inbound message (idempotent via channelMessageId)
        const inboundMessage = await (0, conversations_1.appendMessage)({
            threadId: thread.id,
            direction: 'inbound',
            role: 'user',
            actorId: decision.actorId,
            channel: 'whatsapp',
            channelMessageId: messageSid,
            text: receipt.body,
            mediaUrls: receipt.mediaUrls,
            location: receipt.location,
        });
        // 6. Call unified orchestrator
        const result = await (0, unified_service_1.processInbound)({
            threadId: thread.id,
            inboundMessageId: inboundMessage.id,
        });
        // 7. Send outbound messages (Idempotent!)
        for (let i = 0; i < result.outboundMessages.length; i++) {
            const outbound = result.outboundMessages[i];
            const dedupeId = `${messageSid}:${i}`;
            // Only send if we haven't sent this specific part yet
            const { created } = await (0, conversations_1.ensureOutboundSend)(thread.id, dedupeId, outbound.text);
            if (!created) {
                logger.info('[WhatsAppTask] Skipping duplicate outbound', { threadId: thread.id, dedupeId });
                continue;
            }
            await (0, twilio_service_1.sendWhatsApp)(receipt.fromE164, outbound.text);
        }
        // 8. Mark processed
        await (0, whatsappInbound_repository_1.markProcessed)(messageSid, {
            threadId: thread.id,
            route: decision.route,
        });
        logger.info('[WhatsAppTask] Completed', {
            messageSid,
            threadId: thread.id,
            outboundCount: result.outboundMessages.length,
        });
    }
    catch (error) {
        logger.error('[WhatsAppTask] Failed', { messageSid, error: (0, errors_1.getErrorMessage)(error) || error });
        await (0, whatsappInbound_repository_1.markFailed)(messageSid, (0, errors_1.getErrorMessage)(error) || String(error));
        throw error; // Re-throw to trigger retry (unless markFailed logic stops it)
    }
});
//# sourceMappingURL=whatsappInbound.task.js.map