"use strict";
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
exports.processInbound = processInbound;
const logger = __importStar(require("firebase-functions/logger"));
const conversations_1 = require("../domains/conversations");
const transaction_repository_1 = require("../../repositories/transaction.repository");
/**
 * Check if thread has pending confirmation and handle YES/NO.
 * Uses thread.state and thread.pendingAction instead of session.
 */
async function runThreadConfirmationGate(thread, inboundText) {
    // Only handle if awaiting confirmation
    if (thread.state !== 'awaiting_confirmation' || !thread.pendingAction) {
        return { handled: false };
    }
    const pending = thread.pendingAction;
    const normalized = inboundText.toLowerCase().trim();
    // Yes words
    const isYes = ['yes', 'y', 'confirm', 'ok', 'okay', 'yep', 'sure', 'evet', 'tamam'].includes(normalized);
    // No words
    const isNo = ['no', 'n', 'cancel', 'stop', 'nevermind', 'hayır', 'iptal'].includes(normalized);
    // Check expiry (with 30s buffer)
    const EXPIRY_BUFFER_MS = 30 * 1000;
    const expiresAt = pending.expiresAt.toMillis();
    const isExpired = expiresAt - Date.now() < EXPIRY_BUFFER_MS;
    if (isYes) {
        // Confirm transaction
        const idempotencyKey = `confirm:${pending.refId}:${thread.actorId}`;
        // Different confirm logic based on action kind
        if (pending.kind === 'confirm_transaction') {
            const result = await transaction_repository_1.transactionRepository.confirmTransaction({
                transactionId: pending.refId,
                businessId: thread.businessId,
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
            await transaction_repository_1.transactionRepository.releaseHold(thread.businessId, pending.refId, 'User cancelled', idempotencyKey);
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
function getAgentType(threadType) {
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
async function runAgent(thread, inboundMessage, historyContext) {
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
async function runMerveAgent(thread, inbound, _history) {
    // Import existing orchestrator for Merve logic
    const { processMessage } = await Promise.resolve().then(() => __importStar(require('./orchestrator.service')));
    const response = await processMessage({
        message: inbound.text || '',
        actor: {
            userId: thread.actorId,
            channel: inbound.channel,
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
async function runBusinessAgent(thread, inbound, _history) {
    // For now, use Merve with business context
    // Future: specialized business agent
    const { processMessage } = await Promise.resolve().then(() => __importStar(require('./orchestrator.service')));
    const response = await processMessage({
        message: inbound.text || '',
        actor: {
            userId: thread.actorId,
            channel: inbound.channel,
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
async function runOpsAgent(thread, inbound, _history) {
    // Import business ops handler
    const { handleBusinessOpsMessage } = await Promise.resolve().then(() => __importStar(require('../channels/whatsapp/whatsapp.business-ops')));
    const text = await handleBusinessOpsMessage({
        actorId: thread.actorId,
        businessId: thread.businessId,
        phoneE164: '', // Not needed for ops processing
        text: inbound.text || '',
    });
    return [{
            text,
            role: 'assistant',
        }];
}
/**
 * Dispatch handler for driver messages.
 */
async function runDispatchHandler(thread, inbound) {
    // Import taxi handler
    const { handleDriverReply } = await Promise.resolve().then(() => __importStar(require('../taxi.service')));
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
async function processInbound(request) {
    const { threadId, inboundMessageId } = request;
    logger.info('[Orchestrator] Processing inbound', { threadId, inboundMessageId });
    try {
        // 1. Load thread
        const thread = await (0, conversations_1.getThread)(threadId);
        if (!thread) {
            return {
                success: false,
                outboundMessages: [],
                error: `Thread not found: ${threadId}`,
            };
        }
        // 2. Load messages (including the inbound one)
        const messages = await (0, conversations_1.getThreadMessages)(threadId, 20);
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
            await (0, conversations_1.updateThreadState)(threadId, {
                state: 'idle',
                pendingAction: null,
            });
        }
        if (gateResult.handled && gateResult.outbound) {
            // Append outbound to thread
            await (0, conversations_1.appendMessage)({
                threadId,
                direction: 'outbound',
                role: gateResult.outbound.role,
                actorId: 'system',
                channel: inbound.channel,
                text: gateResult.outbound.text,
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
            await (0, conversations_1.appendMessage)({
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
    }
    catch (error) {
        logger.error('[Orchestrator] Processing error', error);
        return {
            success: false,
            outboundMessages: [{
                    text: 'Sorry, I encountered an error. Please try again.',
                    role: 'assistant',
                }],
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
        };
    }
}
//# sourceMappingURL=unified-orchestrator.service.js.map