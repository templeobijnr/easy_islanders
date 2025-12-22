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

import { GoogleGenerativeAI, FunctionCallingMode, Content } from '@google/generative-ai';
import { db } from '../../config/firebase';
import * as logger from 'firebase-functions/logger';
import { chatRepository } from '../../repositories/chat.repository';
import { transactionRepository } from '../../repositories/transaction.repository';
import { memoryService } from './memory.service';
import { getErrorMessage } from '../../utils/errors';
import { getLiteContext } from './liteContext.service';
import { ALL_TOOL_DEFINITIONS } from '../../utils/tools';
import { toolResolvers } from './tool.service';
import { getSystemInstruction } from '../../utils/systemPrompts';
import { merveConfigRepository } from '../../repositories/merveConfig.repository';

// ============================================
// TYPES
// ============================================

export interface ChatActor {
    userId: string;
    name?: string;
    phoneE164?: string;
    channel: 'app' | 'whatsapp' | 'discover';
}

export interface ChatRequest {
    message: string;
    actor: ChatActor;
    sessionId?: string;
    agentId?: string;
    location?: { lat: number; lng: number };
    marketId?: string;  // For merve config lookup, defaults to 'nc'
}

export interface ChatResponse {
    text: string;
    sessionId: string;
    toolCalls?: string[];
    booking?: {
        transactionId: string;
        confirmationCode?: string;
        awaitingConfirmation?: boolean;
        holdExpiresAt?: string;
    };
    awaitingConfirmation?: boolean;
    expired?: boolean;
    error?: boolean;
}

// ============================================
// GEMINI INITIALIZATION
// ============================================

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

// ============================================
// CONFIRMATION GATE
// ============================================

interface GateResult {
    handled: boolean;
    response?: ChatResponse;
}

async function runConfirmationGate(
    sessionId: string,
    actor: ChatActor,
    message: string
): Promise<GateResult> {
    const pendingAction = await chatRepository.getPendingAction(sessionId, actor.userId);

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
        await chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId });

        // Dispatch based on kind
        let confirmResult: { success: boolean; error?: string; confirmationCode?: string; message?: string };

        switch (pendingAction.kind) {
            case 'confirm_transaction':
                // Legacy booking ledger flow
                const idempotencyKey = `confirm:${pendingAction.txId}:${actor.userId}`;
                confirmResult = await transactionRepository.confirmTransaction({
                    transactionId: pendingAction.txId!,
                    businessId: pendingAction.businessId!,
                    actorType: 'user',
                    actorId: actor.userId,
                }, idempotencyKey);
                break;

            case 'confirm_order':
                // V1 Food order confirmation
                const { foodTools } = await import('../tools/food.tools');
                confirmResult = await foodTools.confirmFoodOrder(pendingAction.orderId!);
                break;

            case 'confirm_service':
                // V1 Service request confirmation
                const { serviceTools } = await import('../tools/service.tools');
                confirmResult = await serviceTools.confirmServiceRequest(pendingAction.requestId!);
                break;

            default:
                confirmResult = { success: false, error: `Unknown action kind: ${pendingAction.kind}` };
        }

        await chatRepository.clearPendingAction(sessionId);

        if (!confirmResult.success) {
            if ((confirmResult as any).errorCode === 'HOLD_EXPIRED' || isExpiredLocally) {
                const expiredText = '⏰ That reservation expired. Would you like me to try again?';
                await chatRepository.saveMessage(sessionId, 'model', [{ text: expiredText }], { userId: actor.userId });

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
            await chatRepository.saveMessage(sessionId, 'model', [{ text: errorText }], { userId: actor.userId });

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
        await chatRepository.saveMessage(sessionId, 'model', [{ text: confirmText }], { userId: actor.userId });

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
        await chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId });

        // Cancel based on kind
        if (pendingAction.kind === 'confirm_transaction' && pendingAction.txId && pendingAction.businessId) {
            const idempotencyKey = `release:${pendingAction.txId}:${actor.userId}`;
            await transactionRepository.releaseHold(
                pendingAction.businessId,
                pendingAction.txId,
                'User cancelled',
                idempotencyKey
            );
        }
        // For confirm_order and confirm_service, orders stay in 'pending' state (no dispatch happened)

        await chatRepository.clearPendingAction(sessionId);

        const cancelText = "Okay, I've cancelled that. Is there anything else I can help you with?";
        await chatRepository.saveMessage(sessionId, 'model', [{ text: cancelText }], { userId: actor.userId });

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
        await chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId });
        const reminderText = `I'm still waiting for your confirmation:\n\n> ${pendingAction.summary}\n\nPlease reply **YES** to confirm or **NO** to cancel.`;
        await chatRepository.saveMessage(sessionId, 'model', [{ text: reminderText }], { userId: actor.userId });

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
    await chatRepository.clearPendingAction(sessionId);
    return { handled: false };
}

// ============================================
// MAIN ORCHESTRATION
// ============================================

/**
 * Process a chat message through Merve.
 * This is the unified entry point for all channels.
 */
export async function processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, actor, agentId = 'merve' } = request;

    logger.info(`[Merve] Processing message`, {
        channel: actor.channel,
        userId: actor.userId,
        messageLength: message.length
    });

    try {
        // 1. Get or create session
        const sessionId = await chatRepository.getOrCreateSession(
            request.sessionId,
            actor.userId,
            agentId
        );

        // Market ID for Merve config lookup (defaults to 'nc')
        const marketId = request.marketId || 'nc';

        // 2. Run confirmation gate FIRST
        const gateResult = await runConfirmationGate(sessionId, actor, message);
        if (gateResult.handled && gateResult.response) {
            return gateResult.response;
        }

        // 3. Load context (parallel)
        const [history, userMemory, userDoc, liteContext] = await Promise.all([
            chatRepository.getHistory(sessionId, 10),
            memoryService.getContext(actor.userId, agentId),
            db.collection('users').doc(actor.userId).get(),
            getLiteContext(actor.userId),
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

        const language =
            (userData.language ||
                userData.preferredLanguage ||
                userData.locale ||
                userData.lang ||
                'en') as string;

        const systemInstruction = `${getSystemInstruction(agentId, language)}\n\n${contextBlock}`;

        // 5. Initialize Gemini
        const model = getGenAI().getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            systemInstruction,
            tools: [{ functionDeclarations: ALL_TOOL_DEFINITIONS as any }],
            toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        });

        // 6. Start chat with history
        const chat = model.startChat({ history: history as Content[] });

        // 7. Send message and get response
        const result = await chat.sendMessage(message);
        let response = result.response;
        let responseText = response.text();
        const toolCalls: string[] = [];

        // 8. Handle function calls (tool loop)
        let functionCalls = response.functionCalls();

        while (functionCalls && functionCalls.length > 0) {
            const toolResults = [];

            for (const call of functionCalls) {
                const toolName = call.name;
                toolCalls.push(toolName);
                logger.info(`[Merve] Executing tool: ${toolName}`);

                try {
                    const resolver = (toolResolvers as Record<string, any>)[toolName];
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
                    const isEnabled = await merveConfigRepository.isToolEnabled(marketId, toolName);
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
                    const toolResult = await resolver(call.args as any, {
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
                    if (toolResult?.pendingAction) {
                        await chatRepository.setPendingAction(sessionId, toolResult.pendingAction);
                    }

                } catch (toolError: unknown) {
                    logger.error(`[Merve] Tool error: ${toolName}`, toolError);
                    toolResults.push({
                        functionResponse: {
                            name: toolName,
                            response: { error: getErrorMessage(toolError) || 'Tool execution failed' }
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
        await chatRepository.saveMessage(sessionId, 'user', [{ text: message }], { userId: actor.userId, agentId });
        await chatRepository.saveMessage(sessionId, 'model', [{ text: responseText }], { userId: actor.userId, agentId });

        // 10. Update memory (async, don't block response)
        memoryService.extractAndPersist(actor.userId, agentId, message, responseText).catch((err: unknown) => {
            logger.warn('[Merve] Memory extraction failed', err);
        });

        return {
            text: responseText,
            sessionId,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };

    } catch (error: unknown) {
        logger.error('[Merve] Orchestration error', error);
        throw error;
    }
}
