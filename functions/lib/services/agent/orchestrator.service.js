"use strict";
/**
 * Merve Orchestrator Service
 *
 * Channel-agnostic AI agent orchestration.
 * Used by: app chat, WhatsApp, Discover (potentially).
 *
 * Responsibilities:
 * - Confirmation gate (check pending holds before LLM)
 * - LLM orchestration with tools
 * - Response generation
 *
 * This service does NOT handle HTTP concerns - it returns structured responses.
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
exports.processMessage = processMessage;
const generative_ai_1 = require("@google/generative-ai");
const firebase_1 = require("../../config/firebase");
const logger = __importStar(require("firebase-functions/logger"));
const chat_repository_1 = require("../../repositories/chat.repository");
const transaction_repository_1 = require("../../repositories/transaction.repository");
const memory_service_1 = require("./memory.service");
const liteContext_service_1 = require("./liteContext.service");
const agentTools_1 = require("../../utils/agentTools");
const tool_service_1 = require("./tool.service");
const systemPrompts_1 = require("../../utils/systemPrompts");
const merveConfig_repository_1 = require("../domains/merve/merveConfig.repository");
// ============================================
// GEMINI INITIALIZATION
// ============================================
let genAI = null;
function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('GEMINI_API_KEY not configured');
        genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    return genAI;
}
async function runConfirmationGate(sessionId, actor, message) {
    const pendingAction = await chat_repository_1.chatRepository.getPendingAction(sessionId, actor.userId);
    if (!pendingAction) {
        return { handled: false };
    }
    const normalized = message.toLowerCase().trim();
    const isYes = ['yes', 'y', 'confirm', 'ok', 'okay', 'yep', 'sure', 'evet'].includes(normalized);
    const isNo = ['no', 'n', 'cancel', 'stop', 'nevermind', 'hayır', 'iptal'].includes(normalized);
    // 30s buffer before treating as expired
    const EXPIRY_BUFFER_MS = 30 * 1000;
    const timeRemaining = pendingAction.holdExpiresAt.getTime() - Date.now();
    const isExpiredLocally = timeRemaining < EXPIRY_BUFFER_MS;
    if (isYes) {
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId });
        // Dispatch based on kind
        let confirmResult;
        switch (pendingAction.kind) {
            case 'confirm_transaction':
                // Legacy booking ledger flow
                const idempotencyKey = `confirm:${pendingAction.txId}:${actor.userId}`;
                confirmResult = await transaction_repository_1.transactionRepository.confirmTransaction({
                    transactionId: pendingAction.txId,
                    businessId: pendingAction.businessId,
                    actorType: 'user',
                    actorId: actor.userId,
                }, idempotencyKey);
                break;
            case 'confirm_order':
                // V1 Food order confirmation
                const { foodTools } = await Promise.resolve().then(() => __importStar(require('../tools/food.tools')));
                confirmResult = await foodTools.confirmFoodOrder(pendingAction.orderId);
                break;
            case 'confirm_service':
                // V1 Service request confirmation
                const { serviceTools } = await Promise.resolve().then(() => __importStar(require('../tools/service.tools')));
                confirmResult = await serviceTools.confirmServiceRequest(pendingAction.requestId);
                break;
            default:
                confirmResult = { success: false, error: `Unknown action kind: ${pendingAction.kind}` };
        }
        await chat_repository_1.chatRepository.clearPendingAction(sessionId);
        if (!confirmResult.success) {
            if (confirmResult.errorCode === 'HOLD_EXPIRED' || isExpiredLocally) {
                const expiredText = '⏰ That reservation expired. Would you like me to try again?';
                await chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: expiredText }], { userId: actor.userId });
                return {
                    handled: true,
                    response: {
                        text: expiredText,
                        sessionId,
                        expired: true,
                    }
                };
            }
            const errorText = `Unable to confirm: ${confirmResult.error}`;
            await chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: errorText }], { userId: actor.userId });
            return {
                handled: true,
                response: {
                    text: errorText,
                    sessionId,
                    error: true,
                }
            };
        }
        const confirmText = confirmResult.message || `✅ Confirmed! Your confirmation code is **${confirmResult.confirmationCode || pendingAction.orderId || pendingAction.requestId}**. You'll receive a message shortly.`;
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: confirmText }], { userId: actor.userId });
        return {
            handled: true,
            response: {
                text: confirmText,
                sessionId,
                booking: pendingAction.txId ? {
                    transactionId: pendingAction.txId,
                    confirmationCode: confirmResult.confirmationCode,
                } : undefined,
            }
        };
    }
    if (isNo) {
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId });
        // Cancel based on kind
        if (pendingAction.kind === 'confirm_transaction' && pendingAction.txId && pendingAction.businessId) {
            const idempotencyKey = `release:${pendingAction.txId}:${actor.userId}`;
            await transaction_repository_1.transactionRepository.releaseHold(pendingAction.businessId, pendingAction.txId, 'User cancelled', idempotencyKey);
        }
        // For confirm_order and confirm_service, orders stay in 'pending' state (no dispatch happened)
        await chat_repository_1.chatRepository.clearPendingAction(sessionId);
        const cancelText = "Okay, I've cancelled that. Is there anything else I can help you with?";
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: cancelText }], { userId: actor.userId });
        return {
            handled: true,
            response: {
                text: cancelText,
                sessionId,
            }
        };
    }
    // Not YES or NO
    if (!isExpiredLocally) {
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId });
        const reminderText = `I'm still waiting for your confirmation:\n\n> ${pendingAction.summary}\n\nPlease reply **YES** to confirm or **NO** to cancel.`;
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: reminderText }], { userId: actor.userId });
        return {
            handled: true,
            response: {
                text: reminderText,
                sessionId,
                awaitingConfirmation: true,
            }
        };
    }
    // Expired - clear and allow LLM processing
    await chat_repository_1.chatRepository.clearPendingAction(sessionId);
    return { handled: false };
}
// ============================================
// MAIN ORCHESTRATION
// ============================================
/**
 * Process a chat message through Merve.
 * This is the unified entry point for all channels.
 */
async function processMessage(request) {
    const { message, actor, agentId = 'merve' } = request;
    logger.info(`[Merve] Processing message`, {
        channel: actor.channel,
        userId: actor.userId,
        messageLength: message.length
    });
    try {
        // 1. Get or create session
        const sessionId = await chat_repository_1.chatRepository.getOrCreateSession(request.sessionId, actor.userId, agentId);
        // Market ID for Merve config lookup (defaults to 'nc')
        const marketId = request.marketId || 'nc';
        // 2. Run confirmation gate FIRST
        const gateResult = await runConfirmationGate(sessionId, actor, message);
        if (gateResult.handled && gateResult.response) {
            return gateResult.response;
        }
        // 3. Load context (parallel)
        const [history, userMemory, userDoc, liteContext] = await Promise.all([
            chat_repository_1.chatRepository.getHistory(sessionId, 10),
            memory_service_1.memoryService.getContext(actor.userId, agentId),
            firebase_1.db.collection('users').doc(actor.userId).get(),
            (0, liteContext_service_1.getLiteContext)(actor.userId),
        ]);
        const userData = userDoc.data() || {};
        const userName = actor.name || userData.displayName || 'Guest';
        const persona = userData.persona || userData.type || liteContext.role || 'user';
        // 4. Build system prompt
        const now = new Date();
        const timeString = now.toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const contextBlock = `
[CURRENT CONTEXT]
- Time: ${timeString}
- User: ${userName}
- Persona: ${persona}
- Channel: ${actor.channel}
- Location: ${request.location ? `${request.location.lat}, ${request.location.lng}` : 'Not shared'}

[USER MEMORY]
${JSON.stringify(userMemory || {})}
        `.trim();
        const language = (userData.language ||
            userData.preferredLanguage ||
            userData.locale ||
            userData.lang ||
            'en');
        const systemInstruction = `${(0, systemPrompts_1.getSystemInstruction)(agentId, language)}\n\n${contextBlock}`;
        // 5. Initialize Gemini
        const model = getGenAI().getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            systemInstruction,
            tools: [{ functionDeclarations: agentTools_1.ALL_TOOL_DEFINITIONS }],
            toolConfig: { functionCallingConfig: { mode: generative_ai_1.FunctionCallingMode.AUTO } }
        });
        // 6. Start chat with history
        const chat = model.startChat({ history: history });
        // 7. Send message and get response
        const result = await chat.sendMessage(message);
        let response = result.response;
        let responseText = response.text();
        const toolCalls = [];
        // 8. Handle function calls (tool loop)
        let functionCalls = response.functionCalls();
        while (functionCalls && functionCalls.length > 0) {
            const toolResults = [];
            for (const call of functionCalls) {
                const toolName = call.name;
                toolCalls.push(toolName);
                logger.info(`[Merve] Executing tool: ${toolName}`);
                try {
                    const resolver = tool_service_1.toolResolvers[toolName];
                    if (!resolver) {
                        toolResults.push({
                            functionResponse: {
                                name: toolName,
                                response: { error: `Unknown tool: ${toolName}` }
                            }
                        });
                        continue;
                    }
                    // ═══ MERVE CONFIG ENFORCEMENT ═══
                    // Check if tool is enabled before execution
                    const isEnabled = await merveConfig_repository_1.merveConfigRepository.isToolEnabled(marketId, toolName);
                    if (!isEnabled) {
                        logger.warn(`[Merve] Tool disabled by config: ${toolName}`);
                        toolResults.push({
                            functionResponse: {
                                name: toolName,
                                response: {
                                    success: false,
                                    disabled: true,
                                    message: `This feature is currently unavailable. Please try again later or contact support.`
                                }
                            }
                        });
                        continue;
                    }
                    // Execute tool with context
                    const toolResult = await resolver(call.args, {
                        userId: actor.userId,
                        sessionId,
                        channel: actor.channel,
                        actor,
                        location: request.location,
                        marketId,
                    });
                    toolResults.push({
                        functionResponse: {
                            name: toolName,
                            response: toolResult
                        }
                    });
                    // If tool created a pending action, store it
                    if (toolResult === null || toolResult === void 0 ? void 0 : toolResult.pendingAction) {
                        await chat_repository_1.chatRepository.setPendingAction(sessionId, toolResult.pendingAction);
                    }
                }
                catch (toolError) {
                    logger.error(`[Merve] Tool error: ${toolName}`, toolError);
                    toolResults.push({
                        functionResponse: {
                            name: toolName,
                            response: { error: toolError.message || 'Tool execution failed' }
                        }
                    });
                }
            }
            // Send tool results back to Gemini
            const toolResponse = await chat.sendMessage(toolResults);
            response = toolResponse.response;
            responseText = response.text();
            functionCalls = response.functionCalls();
        }
        // 9. Save messages
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId, agentId });
        await chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: responseText }], { userId: actor.userId, agentId });
        // 10. Update memory (async, don't block response)
        memory_service_1.memoryService.extractAndPersist(actor.userId, agentId, message, responseText).catch((err) => {
            logger.warn('[Merve] Memory extraction failed', err);
        });
        return {
            text: responseText,
            sessionId,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
    }
    catch (error) {
        logger.error('[Merve] Orchestration error', error);
        throw error;
    }
}
//# sourceMappingURL=orchestrator.service.js.map