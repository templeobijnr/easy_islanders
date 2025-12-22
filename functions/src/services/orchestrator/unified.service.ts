import { getErrorMessage } from '../../utils/errors';
/**
 * Unified Orchestrator
 * 
 * Channel-agnostic processing entrypoint.
 * All channels (WhatsApp, App, Discover) use this single path:
 * 
 * inbound message → thread append → processInbound() → outbound append → send
 * 
 * Channels become adapters only - they never call LLM directly.
 */

import * as logger from 'firebase-functions/logger';
import {
    getThread,
    getThreadMessages,
    appendMessage,
    updateThreadState,
} from '../domains/conversations';
import { emitUserEvent } from '../domains/events/emitUserEvent';
import { transactionRepository } from '../../repositories/transaction.repository';
import { Thread, ThreadMessage, ThreadType } from '../../types/thread.types';

// ============================================
// TYPES
// ============================================

export interface ProcessInboundRequest {
    threadId: string;
    inboundMessageId: string;
}

export interface OutboundMessage {
    text: string;
    role: 'assistant' | 'system';
}

export interface ProcessInboundResult {
    success: boolean;
    outboundMessages: OutboundMessage[];
    error?: string;
}

// ============================================
// CONFIRMATION GATE (THREAD-BASED)
// ============================================

interface ConfirmationResult {
    handled: boolean;
    outbound?: OutboundMessage;
    clearPendingAction?: boolean;
}

/**
 * Check if thread has pending confirmation and handle YES/NO.
 * Uses thread.state and thread.pendingAction instead of session.
 */
async function runThreadConfirmationGate(
    thread: Thread,
    inboundText: string
): Promise<ConfirmationResult> {
    // Only handle if awaiting confirmation
    if (thread.state !== 'awaiting_confirmation' || !thread.pendingAction) {
        return { handled: false };
    }

    const pending = thread.pendingAction;
    const normalized = inboundText.toLowerCase().trim();

    // Yes words
    const yesWords = ['yes', 'y', 'confirm', 'ok', 'okay', 'yep', 'sure', 'evet', 'tamam'];
    const isYes = yesWords.some(w => normalized === w || normalized.startsWith(w + ' ') || normalized.startsWith(w + ',') || normalized.startsWith(w + '.'));

    // No words
    const noWords = ['no', 'n', 'cancel', 'stop', 'nevermind', 'hayır', 'iptal'];
    const isNo = noWords.some(w => normalized === w || normalized.startsWith(w + ' ') || normalized.startsWith(w + ',') || normalized.startsWith(w + '.'));

    // Check expiry (with 30s buffer)
    const EXPIRY_BUFFER_MS = 30 * 1000;
    const expiresAt = pending.expiresAt.toMillis();
    const isExpired = expiresAt - Date.now() < EXPIRY_BUFFER_MS;

    if (isYes) {
        // Confirm transaction
        const idempotencyKey = `confirm:${pending.refId}:${thread.actorId}`;

        // Different confirm logic based on action kind
        if (pending.kind === 'confirm_transaction') {
            const result = await transactionRepository.confirmTransaction({
                transactionId: pending.refId,
                businessId: thread.businessId!,
                actorType: 'user',
                actorId: thread.actorId,
            }, idempotencyKey);

            if (!result.success) {
                if (result.errorCode === 'HOLD_EXPIRED') {
                    return {
                        handled: true,
                        clearPendingAction: true,
                        outbound: {
                            text: '⏰ That reservation expired. Would you like me to try booking again?',
                            role: 'assistant',
                        },
                    };
                }
                return {
                    handled: true,
                    clearPendingAction: true,
                    outbound: {
                        text: `Unable to confirm: ${result.error}`,
                        role: 'assistant',
                    },
                };
            }

            return {
                handled: true,
                clearPendingAction: true,
                outbound: {
                    text: `✅ Confirmed! Your confirmation code is **${result.confirmationCode}**. You'll receive a message shortly.`,
                    role: 'assistant',
                },
            };
        }

        // Other action kinds (ops_proposal, dispatch_accept) - extend as needed
        return {
            handled: true,
            clearPendingAction: true,
            outbound: {
                text: '✅ Confirmed!',
                role: 'assistant',
            },
        };
    }

    if (isNo) {
        // Cancel/release
        if (pending.kind === 'confirm_transaction' && thread.businessId) {
            const idempotencyKey = `release:${pending.refId}:${thread.actorId}`;
            await transactionRepository.releaseHold(
                thread.businessId,
                pending.refId,
                'User cancelled',
                idempotencyKey
            );
        }

        return {
            handled: true,
            clearPendingAction: true,
            outbound: {
                text: "Okay, I've cancelled that. Is there anything else I can help with?",
                role: 'assistant',
            },
        };
    }

    // Not YES or NO - remind user
    if (!isExpired) {
        return {
            handled: true,
            outbound: {
                text: `I'm still waiting for your confirmation:\n\n> ${pending.summary}\n\nPlease reply **YES** to confirm or **NO** to cancel.`,
                role: 'assistant',
            },
        };
    }

    // Expired - clear and continue to normal processing
    return {
        handled: false,
        clearPendingAction: true,
    };
}

// ============================================
// AGENT ROUTING
// ============================================

type AgentType = 'merve' | 'business' | 'ops' | 'dispatch';

function getAgentType(threadType: ThreadType): AgentType {
    switch (threadType) {
        case 'general':
            return 'merve';
        case 'business_public':
            return 'business';
        case 'business_ops':
            return 'ops';
        case 'dispatch':
            return 'dispatch';
        default:
            return 'merve';
    }
}

// ============================================
// AGENT HANDLERS
// ============================================

/**
 * Run the appropriate agent based on thread type.
 * Returns outbound messages to be appended and sent.
 */
async function runAgent(
    thread: Thread,
    inboundMessage: ThreadMessage,
    historyContext: ThreadMessage[]
): Promise<OutboundMessage[]> {
    const agentType = getAgentType(thread.threadType);

    logger.info('[Orchestrator] Running agent', {
        threadId: thread.id,
        agentType,
        threadType: thread.threadType,
    });

    switch (agentType) {
        case 'merve':
            return runMerveAgent(thread, inboundMessage, historyContext);
        case 'business':
            return runBusinessAgent(thread, inboundMessage, historyContext);
        case 'ops':
            return runOpsAgent(thread, inboundMessage, historyContext);
        case 'dispatch':
            return runDispatchHandler(thread, inboundMessage);
        default:
            return [{ text: "I'm not sure how to help with that.", role: 'assistant' }];
    }
}

/**
 * Merve agent for general consumer conversations.
 */
async function runMerveAgent(
    thread: Thread,
    inbound: ThreadMessage,
    _history: ThreadMessage[]
): Promise<OutboundMessage[]> {
    // Import existing orchestrator for Merve logic
    // NOTE: Use `require()` instead of dynamic `import()` so Jest can mock the module
    // and unit tests don't require Node VM module flags.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { processMessage } = require('../agent/orchestrator.service');

    const response = await processMessage({
        message: inbound.text || '',
        actor: {
            userId: thread.actorId,
            channel: inbound.channel as any,
        },
        sessionId: thread.id, // Use threadId as sessionId for compatibility
    });

    return [{
        text: response.text,
        role: 'assistant',
    }];
}

/**
 * Business agent for consumer ↔ business public chats.
 */
async function runBusinessAgent(
    thread: Thread,
    inbound: ThreadMessage,
    _history: ThreadMessage[]
): Promise<OutboundMessage[]> {
    // For now, use Merve with business context
    // Future: specialized business agent
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { processMessage } = require('../agent/orchestrator.service');

    const response = await processMessage({
        message: inbound.text || '',
        actor: {
            userId: thread.actorId,
            channel: inbound.channel as any,
        },
        sessionId: thread.id,
        agentId: 'business',
    });

    return [{
        text: response.text,
        role: 'assistant',
    }];
}

/**
 * Ops agent for business owner/staff operations.
 */
async function runOpsAgent(
    thread: Thread,
    inbound: ThreadMessage,
    _history: ThreadMessage[]
): Promise<OutboundMessage[]> {
    // Import business ops handler (Ops Service)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { opsService } = require('../domains/onboarding/ops.service');

    const text = await opsService.processOpsMessage(thread, inbound);

    return [{
        text,
        role: 'assistant',
    }];
}

/**
 * Dispatch handler for driver messages.
 */
async function runDispatchHandler(
    thread: Thread,
    inbound: ThreadMessage
): Promise<OutboundMessage[]> {
    // Import taxi handler
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleDriverReply } = require('../taxi.service');

    // Need phone for driver handler
    // TODO: get phone from actor record
    const text = await handleDriverReply('', inbound.text || '');

    return [{
        text,
        role: 'system',
    }];
}

// ============================================
// MAIN ENTRYPOINT
// ============================================

/**
 * Process an inbound message through the unified orchestrator.
 * 
 * This is the single entrypoint for all channels.
 * Channels should:
 * 1. Append inbound message to thread
 * 2. Call processInbound({ threadId, inboundMessageId })
 * 3. Send outbound messages returned
 * 4. Append outbound messages to thread
 */
export async function processInbound(
    request: ProcessInboundRequest
): Promise<ProcessInboundResult> {
    const { threadId, inboundMessageId } = request;

    logger.info('[Orchestrator] Processing inbound', { threadId, inboundMessageId });

    try {
        // 1. Load thread
        const thread = await getThread(threadId);
        if (!thread) {
            return {
                success: false,
                outboundMessages: [],
                error: `Thread not found: ${threadId}`,
            };
        }

        // 2. Load messages (including the inbound one)
        const messages = await getThreadMessages(threadId, 20);
        const inbound = messages.find(m => m.id === inboundMessageId);

        if (!inbound) {
            return {
                success: false,
                outboundMessages: [],
                error: `Message not found: ${inboundMessageId}`,
            };
        }

        // 3. Run confirmation gate
        const gateResult = await runThreadConfirmationGate(thread, inbound.text || '');

        if (gateResult.clearPendingAction) {
            await updateThreadState(threadId, {
                state: 'idle',
                pendingAction: null,
            });
        }

        if (gateResult.handled && gateResult.outbound) {
            // Append outbound to thread
            await appendMessage({
                threadId,
                direction: 'outbound',
                role: gateResult.outbound.role,
                actorId: 'system',
                channel: inbound.channel,
                text: gateResult.outbound.text,
            });

            // Secondary delivery: record as in-app notification pointing back to thread.
            // (V1 policy: in-app only; WhatsApp is the chat channel itself.)
            await emitUserEvent({
                threadId,
                userId: thread.actorId,
                eventType: 'general',
                threadText: gateResult.outbound.text,
                correlationId: `${threadId}:${inboundMessageId}:gate`,
                channels: ['in_app'],
                idempotencyKey: `evt:${threadId}:gate:${inboundMessageId}`,
            });

            return {
                success: true,
                outboundMessages: [gateResult.outbound],
            };
        }

        // 4. Run agent
        const historyContext = messages.filter(m => m.id !== inboundMessageId);
        const outboundMessages = await runAgent(thread, inbound, historyContext);

        // 5. Append outbound messages to thread
        for (const outbound of outboundMessages) {
            await appendMessage({
                threadId,
                direction: 'outbound',
                role: outbound.role,
                actorId: getAgentType(thread.threadType),
                channel: inbound.channel,
                text: outbound.text,
            });
        }

        return {
            success: true,
            outboundMessages,
        };

    } catch (error: unknown) {
        logger.error('[Orchestrator] Processing error', error);
        return {
            success: false,
            outboundMessages: [{
                text: 'Sorry, I encountered an error. Please try again.',
                role: 'assistant',
            }],
            error: getErrorMessage(error) || String(error),
        };
    }
}
