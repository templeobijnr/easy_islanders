import { getErrorMessage } from '../utils/errors';
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

import * as functions from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';
import {
    getReceipt,
    markProcessing,
    markProcessed,
    markFailed,
} from '../services/domains/channels/whatsappInbound.repository';
import { routeInbound, RouteDecision } from '../services/channels/whatsapp/whatsapp.router';
import { getOrCreateThread, appendMessage, ensureOutboundSend } from '../services/domains/conversations';
import { processInbound } from '../services/orchestrator/unified.service';
import { sendWhatsApp } from '../services/twilio.service';
import { ThreadType } from '../types/thread.types';

// ============================================
// TASK QUEUE CONFIGURATION
// ============================================

const QUEUE_OPTIONS: functions.tasks.TaskQueueOptions = {
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

function getThreadType(decision: RouteDecision): ThreadType {
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
export const processWhatsAppInbound = functions.tasks.onTaskDispatched(
    QUEUE_OPTIONS,
    async (req) => {
        const { messageSid } = req.data as { messageSid: string };

        if (!messageSid) {
            logger.error('[WhatsAppTask] Missing messageSid in task data');
            return;
        }

        logger.info('[WhatsAppTask] Processing', { messageSid });

        try {
            // 1. Load receipt
            const receipt = await getReceipt(messageSid);
            if (!receipt) {
                logger.error('[WhatsAppTask] Receipt not found', { messageSid });
                return;
            }

            // 2. Guard: check if already processed
            const canProcess = await markProcessing(messageSid);
            if (!canProcess) {
                logger.info('[WhatsAppTask] Already processed or in-progress, skipping', { messageSid });
                return;
            }

            // 3. Resolve route
            const decision: RouteDecision = await routeInbound({
                fromE164: receipt.fromE164,
                text: receipt.body,
                mediaUrls: receipt.mediaUrls,
                location: receipt.location,
            });

            logger.info('[WhatsAppTask] Route decision', { messageSid, route: decision.route });

            // 4. Resolve thread
            const threadType = getThreadType(decision);
            const thread = await getOrCreateThread({
                threadType,
                actorId: decision.actorId,
                businessId: 'businessId' in decision ? decision.businessId : undefined,
                channel: 'whatsapp',
            });

            // 5. Append inbound message (idempotent via channelMessageId)
            const inboundMessage = await appendMessage({
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
            const result = await processInbound({
                threadId: thread.id,
                inboundMessageId: inboundMessage.id,
            });

            // 7. Send outbound messages (Idempotent!)
            for (let i = 0; i < result.outboundMessages.length; i++) {
                const outbound = result.outboundMessages[i];
                const dedupeId = `${messageSid}:${i}`;

                // Only send if we haven't sent this specific part yet
                const { created } = await ensureOutboundSend(thread.id, dedupeId, outbound.text);
                if (!created) {
                    logger.info('[WhatsAppTask] Skipping duplicate outbound', { threadId: thread.id, dedupeId });
                    continue;
                }

                await sendWhatsApp(receipt.fromE164, outbound.text);
            }

            // 8. Mark processed
            await markProcessed(messageSid, {
                threadId: thread.id,
                route: decision.route,
            });

            logger.info('[WhatsAppTask] Completed', {
                messageSid,
                threadId: thread.id,
                outboundCount: result.outboundMessages.length,
            });

        } catch (error: unknown) {
            logger.error('[WhatsAppTask] Failed', { messageSid, error: getErrorMessage(error) || error });
            await markFailed(messageSid, getErrorMessage(error) || String(error));
            throw error; // Re-throw to trigger retry (unless markFailed logic stops it)
        }
    }
);
