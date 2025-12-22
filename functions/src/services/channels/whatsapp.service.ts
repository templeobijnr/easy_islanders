import { getErrorMessage } from '../../utils/errors';
/**
 * WhatsApp Chat Service
 * 
 * Routes consumer WhatsApp messages to Merve (general agent).
 * Uses the same Merve orchestrator as app chat for unified experience.
 * 
 * Pattern: Async processing with Twilio REST API for responses.
 */

import { db } from '../../config/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { sendWhatsApp } from '../../services/twilio.service';
import {
    getOrCreateThread,
    appendMessage,
} from '../domains/conversations';

// ============================================
// TYPES
// ============================================

interface WhatsAppSession {
    phoneE164: string;
    userId?: string;
    businessId?: string;  // If in business-scoped chat
    pendingAction?: {
        txId: string;
        businessId: string;
        holdExpiresAt: Timestamp;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get or create a WhatsApp chat session for a phone number.
 */
async function getOrCreateSession(phoneE164: string): Promise<{ sessionId: string; session: WhatsAppSession }> {
    const sessionId = `wa:${phoneE164.replace(/\+/g, '')}`;
    const sessionRef = db.collection('whatsappSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (sessionDoc.exists) {
        return { sessionId, session: sessionDoc.data() as WhatsAppSession };
    }

    // Try to link to existing user by phone
    const userQuery = await db.collection('users')
        .where('phone', '==', phoneE164)
        .limit(1)
        .get();

    const userId = userQuery.empty ? undefined : userQuery.docs[0].id;

    const newSession: WhatsAppSession = {
        phoneE164,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
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
export async function handleConsumerMessage(
    phoneE164: string,
    message: string,
    opts?: { messageSid?: string | null }
): Promise<void> {
    logger.info(`[WhatsAppChat] Processing message from ${phoneE164}`);

    try {
        // Legacy session management (parallel with threads for compat period)
        const { sessionId, session } = await getOrCreateSession(phoneE164);
        const actorId = session.userId || `wa:${phoneE164.replace(/\+/g, '')}`;

        const messageSid = opts?.messageSid || null;
        if (messageSid) {
            const replyRef = db.collection('webhookIdempotency').doc(`twilio:wa:consumer:${messageSid}`);
            const replySnap = await replyRef.get();

            if (replySnap.exists && replySnap.data()?.state === 'sent') {
                logger.info(`[WhatsAppChat] Duplicate inbound MessageSid ignored`, { messageSid, phoneE164 });
                return;
            }

            await replyRef.set(
                {
                    provider: 'twilio',
                    channel: 'whatsapp',
                    type: 'consumer_reply',
                    messageSid,
                    phoneE164,
                    sessionId,
                    state: 'processing',
                    attempts: FieldValue.increment(1),
                    updatedAt: Timestamp.now(),
                    createdAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
        }

        // ============================================
        // NEW: Write to canonical threads collection
        // ============================================
        let thread;
        try {
            thread = await getOrCreateThread({
                threadType: 'general',
                actorId,
                channel: 'whatsapp',
            });

            // Append inbound message (idempotent via channelMessageId)
            await appendMessage({
                threadId: thread.id,
                direction: 'inbound',
                role: 'user',
                actorId,
                channel: 'whatsapp',
                channelMessageId: messageSid || undefined,
                text: message,
            });

            logger.info(`[WhatsAppChat] Thread message appended`, { threadId: thread.id, actorId });
        } catch (threadErr) {
            // Don't fail the request if thread write fails (compat period)
            logger.error(`[WhatsAppChat] Failed to write to thread`, threadErr);
        }
        // ============================================

        // Import orchestrator dynamically to avoid circular deps
        const { processMessage } = await import('../../services/agent/orchestrator.service');

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
        await sendWhatsApp(phoneE164, response.text);

        // ============================================
        // NEW: Append outbound message to thread
        // ============================================
        if (thread) {
            try {
                await appendMessage({
                    threadId: thread.id,
                    direction: 'outbound',
                    role: 'assistant',
                    actorId: 'merve',
                    channel: 'whatsapp',
                    text: response.text,
                });
            } catch (threadErr) {
                logger.error(`[WhatsAppChat] Failed to append outbound to thread`, threadErr);
            }
        }
        // ============================================

        if (messageSid) {
            await db.collection('webhookIdempotency')
                .doc(`twilio:wa:consumer:${messageSid}`)
                .set(
                    {
                        state: 'sent',
                        responsePreview: response.text.slice(0, 250),
                        sentAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    },
                    { merge: true }
                );
        }

        // If there's a pending action from orchestrator, store it in WA session too
        // (for the local confirmation gate as a backup)
        if (response.booking?.awaitingConfirmation) {
            logger.info(`[WhatsAppChat] Pending action set for ${phoneE164}`);
        }

    } catch (error: unknown) {
        logger.error(`[WhatsAppChat] Error handling message:`, error);
        const messageSid = opts?.messageSid || null;
        if (messageSid) {
            await db.collection('webhookIdempotency')
                .doc(`twilio:wa:consumer:${messageSid}`)
                .set(
                    { state: 'failed', error: getErrorMessage(error) || String(error), updatedAt: Timestamp.now() },
                    { merge: true }
                );
        }
        await sendWhatsApp(phoneE164, "Sorry, I encountered an error. Please try again shortly.");
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
export async function routeWhatsAppMessage(
    phoneE164: string,
    _message: string
): Promise<'host' | 'driver' | 'consumer'> {
    // Import new router dynamically to avoid circular deps
    const { routeInbound } = await import('./whatsapp/whatsapp.router');
    const decision = await routeInbound({ fromE164: phoneE164, text: _message });

    // Map new route types to legacy types
    switch (decision.route) {
        case 'business_ops': return 'host';
        case 'driver': return 'driver';
        default: return 'consumer';
    }
}
