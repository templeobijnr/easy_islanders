"use strict";
/**
 * WhatsApp Chat Service
 *
 * Routes consumer WhatsApp messages to Merve (general agent).
 * Uses the same Merve orchestrator as app chat for unified experience.
 *
 * Pattern: Async processing with Twilio REST API for responses.
 */
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
exports.handleConsumerMessage = handleConsumerMessage;
exports.routeWhatsAppMessage = routeWhatsAppMessage;
const firebase_1 = require("../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const twilio_service_1 = require("../../services/twilio.service");
const conversations_1 = require("../domains/conversations");
// ============================================
// SESSION MANAGEMENT
// ============================================
/**
 * Get or create a WhatsApp chat session for a phone number.
 */
async function getOrCreateSession(phoneE164) {
    const sessionId = `wa:${phoneE164.replace(/\+/g, '')}`;
    const sessionRef = firebase_1.db.collection('whatsappSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (sessionDoc.exists) {
        return { sessionId, session: sessionDoc.data() };
    }
    // Try to link to existing user by phone
    const userQuery = await firebase_1.db.collection('users')
        .where('phone', '==', phoneE164)
        .limit(1)
        .get();
    const userId = userQuery.empty ? undefined : userQuery.docs[0].id;
    const newSession = {
        phoneE164,
        userId,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now(),
    };
    await sessionRef.set(newSession);
    logger.info(`[WhatsAppChat] Created new session: ${sessionId}`);
    return { sessionId, session: newSession };
}
// ============================================
// CONSUMER CHAT HANDLER
// ============================================
/**
 * Process a consumer message to Merve.
 * This is called async (not in webhook hot path).
 *
 * Uses the same Merve orchestrator as app chat for unified experience.
 * Now also writes to canonical threads collection (compat period).
 */
async function handleConsumerMessage(phoneE164, message, opts) {
    var _a, _b;
    logger.info(`[WhatsAppChat] Processing message from ${phoneE164}`);
    try {
        // Legacy session management (parallel with threads for compat period)
        const { sessionId, session } = await getOrCreateSession(phoneE164);
        const actorId = session.userId || `wa:${phoneE164.replace(/\+/g, '')}`;
        const messageSid = (opts === null || opts === void 0 ? void 0 : opts.messageSid) || null;
        if (messageSid) {
            const replyRef = firebase_1.db.collection('webhookIdempotency').doc(`twilio:wa:consumer:${messageSid}`);
            const replySnap = await replyRef.get();
            if (replySnap.exists && ((_a = replySnap.data()) === null || _a === void 0 ? void 0 : _a.state) === 'sent') {
                logger.info(`[WhatsAppChat] Duplicate inbound MessageSid ignored`, { messageSid, phoneE164 });
                return;
            }
            await replyRef.set({
                provider: 'twilio',
                channel: 'whatsapp',
                type: 'consumer_reply',
                messageSid,
                phoneE164,
                sessionId,
                state: 'processing',
                attempts: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.Timestamp.now(),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        // ============================================
        // NEW: Write to canonical threads collection
        // ============================================
        let thread;
        try {
            thread = await (0, conversations_1.getOrCreateThread)({
                threadType: 'general',
                actorId,
                channel: 'whatsapp',
            });
            // Append inbound message (idempotent via channelMessageId)
            await (0, conversations_1.appendMessage)({
                threadId: thread.id,
                direction: 'inbound',
                role: 'user',
                actorId,
                channel: 'whatsapp',
                channelMessageId: messageSid || undefined,
                text: message,
            });
            logger.info(`[WhatsAppChat] Thread message appended`, { threadId: thread.id, actorId });
        }
        catch (threadErr) {
            // Don't fail the request if thread write fails (compat period)
            logger.error(`[WhatsAppChat] Failed to write to thread`, threadErr);
        }
        // ============================================
        // Import orchestrator dynamically to avoid circular deps
        const { processMessage } = await Promise.resolve().then(() => __importStar(require('../../services/agent/orchestrator.service')));
        // Use unified orchestrator - handles confirmation gate, LLM, tools
        const response = await processMessage({
            message,
            actor: {
                userId: session.userId || `wa:${phoneE164.replace(/\+/g, '')}`,
                phoneE164,
                channel: 'whatsapp',
            },
            sessionId,
        });
        // Send response via WhatsApp
        await (0, twilio_service_1.sendWhatsApp)(phoneE164, response.text);
        // ============================================
        // NEW: Append outbound message to thread
        // ============================================
        if (thread) {
            try {
                await (0, conversations_1.appendMessage)({
                    threadId: thread.id,
                    direction: 'outbound',
                    role: 'assistant',
                    actorId: 'merve',
                    channel: 'whatsapp',
                    text: response.text,
                });
            }
            catch (threadErr) {
                logger.error(`[WhatsAppChat] Failed to append outbound to thread`, threadErr);
            }
        }
        // ============================================
        if (messageSid) {
            await firebase_1.db.collection('webhookIdempotency')
                .doc(`twilio:wa:consumer:${messageSid}`)
                .set({
                state: 'sent',
                responsePreview: response.text.slice(0, 250),
                sentAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            }, { merge: true });
        }
        // If there's a pending action from orchestrator, store it in WA session too
        // (for the local confirmation gate as a backup)
        if ((_b = response.booking) === null || _b === void 0 ? void 0 : _b.awaitingConfirmation) {
            logger.info(`[WhatsAppChat] Pending action set for ${phoneE164}`);
        }
    }
    catch (error) {
        logger.error(`[WhatsAppChat] Error handling message:`, error);
        const messageSid = (opts === null || opts === void 0 ? void 0 : opts.messageSid) || null;
        if (messageSid) {
            await firebase_1.db.collection('webhookIdempotency')
                .doc(`twilio:wa:consumer:${messageSid}`)
                .set({ state: 'failed', error: (error === null || error === void 0 ? void 0 : error.message) || String(error), updatedAt: firestore_1.Timestamp.now() }, { merge: true });
        }
        await (0, twilio_service_1.sendWhatsApp)(phoneE164, "Sorry, I encountered an error. Please try again shortly.");
    }
}
// ============================================
// ACTOR ROUTING (DEPRECATED)
// ============================================
// NOTE: Actor routing has been moved to whatsapp/whatsapp.router.ts
// The functions below are kept for backward compatibility but are deprecated.
// Use routeInbound() from whatsapp.router.ts instead.
/**
 * @deprecated Use routeInbound() from whatsapp.router.ts instead
 */
async function routeWhatsAppMessage(phoneE164, _message) {
    // Import new router dynamically to avoid circular deps
    const { routeInbound } = await Promise.resolve().then(() => __importStar(require('./whatsapp/whatsapp.router')));
    const decision = await routeInbound({ fromE164: phoneE164, text: _message });
    // Map new route types to legacy types
    switch (decision.route) {
        case 'business_ops': return 'host';
        case 'driver': return 'driver';
        default: return 'consumer';
    }
}
//# sourceMappingURL=whatsapp.service.js.map