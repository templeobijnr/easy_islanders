import { getErrorMessage } from '../../utils/errors';
/**
 * Public Chat Service
 * 
 * Handles the full chat pipeline:
 * 1. Session validation
 * 2. Message cap enforcement
 * 3. RAG retrieval
 * 4. Gemini generation
 * 5. Message persistence
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { businessRepository } from '../../repositories/business.repository';
import { businessChatRepository } from '../../repositories/businessChat.repository';
import { leadRepository } from '../../repositories/lead.repository';
import { ragService, ContextSource } from './rag.service';
import { DEFAULT_LIMITS } from '../../types/limits';
import { log } from '../../utils/log';

/**
 * Response from sending a message.
 */
export interface SendMessageResult {
    success: boolean;
    text: string;
    sources: ContextSource[];
    messageCount: number;
    limitReached: boolean;
    latencyMs: number;
    error?: string;
}

/**
 * Get Gemini AI instance.
 */
function getGenAI(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Process a message in a public chat session.
 */
export async function processMessage(
    businessId: string,
    sessionId: string,
    userUid: string,
    text: string
): Promise<SendMessageResult> {
    const startTime = Date.now();

    try {
        // 1. Verify session exists and belongs to user
        const session = await businessChatRepository.getSession(businessId, sessionId);
        if (!session) {
            return {
                success: false,
                text: '',
                sources: [],
                messageCount: 0,
                limitReached: false,
                latencyMs: Date.now() - startTime,
                error: 'Session not found'
            };
        }

        if (session.anonUid !== userUid && session.userId !== userUid) {
            return {
                success: false,
                text: '',
                sources: [],
                messageCount: 0,
                limitReached: false,
                latencyMs: Date.now() - startTime,
                error: 'Session access denied'
            };
        }

        // 2. Check message cap + persist user message transactionally
        const capResult = await businessChatRepository.appendUserMessageWithCap(
            businessId,
            sessionId,
            userUid,
            text,
            DEFAULT_LIMITS.maxPublicMessagesPerSession
        );

        if (!capResult.allowed) {
            const limitText = "You've reached the message limit for this session. Please leave your contact information and we'll get back to you!";

            // Save the limit message
            await businessChatRepository.saveMessage(businessId, sessionId, {
                role: 'assistant',
                text: limitText
            });

            return {
                success: true,
                text: limitText,
                sources: [],
                messageCount: capResult.newCount,
                limitReached: true,
                latencyMs: Date.now() - startTime
            };
        }

        // 3. Get business info for prompt (with listings fallback)
        const business = await businessRepository.getByIdWithListingFallback(businessId);
        const businessContext = {
            name: business?.displayName || 'this business',
            category: (business as any)?.category,
            description: (business as any)?.description,
            location: (business as any)?.location
        };

        // 4. Retrieve context via RAG
        const retrieval = await ragService.retrieveContext(businessId, text);
        log.info('[ChatService] RAG retrieval', { hasContext: retrieval.hasContext, chunkCount: retrieval.sources.length });

        // 5. Build prompt with business context
        const systemPrompt = ragService.buildSystemPrompt(businessContext);
        const fullPrompt = ragService.buildPromptWithContext(
            systemPrompt,
            retrieval.contextText,
            text,
            businessContext
        );

        // 6. Generate response
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7
            }
        });

        const generateStart = Date.now();
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        const generateLatency = Date.now() - generateStart;

        log.info('[ChatService] Generated response', { generateLatencyMs: generateLatency });

        // 8. Check if we should prompt for lead capture
        let finalText = responseText;
        const isLowConfidence = !retrieval.hasContext || responseText.toLowerCase().includes("don't have");

        if (isLowConfidence && !session.leadCaptured) {
            finalText += "\n\nWould you like to leave your contact details so we can follow up with you?";
        }

        // 9. Save assistant message with sources
        await businessChatRepository.saveMessage(businessId, sessionId, {
            role: 'assistant',
            text: finalText,
            sources: retrieval.sources.map(s => ({
                docId: s.docId,
                chunkId: s.chunkId,
                sourceName: s.sourceName,
                score: s.score
            })),
            meta: {
                model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                latencyMs: generateLatency
            }
        });

        return {
            success: true,
            text: finalText,
            sources: retrieval.sources,
            messageCount: capResult.newCount,
            limitReached: capResult.newCount >= DEFAULT_LIMITS.maxPublicMessagesPerSession,
            latencyMs: Date.now() - startTime
        };

    } catch (error: unknown) {
        log.error('[ChatService] processMessage failed', error);
        return {
            success: false,
            text: '',
            sources: [],
            messageCount: 0,
            limitReached: false,
            latencyMs: Date.now() - startTime,
            error: getErrorMessage(error) || 'Failed to process message'
        };
    }
}

/**
 * Create a new chat session.
 */
export async function createChatSession(
    businessId: string,
    userUid: string,
    isAnonymous: boolean
): Promise<{ success: boolean; sessionId?: string; greeting?: string; error?: string }> {
    try {
        // Verify business exists (with listings fallback for backward compatibility)
        const business = await businessRepository.getByIdWithListingFallback(businessId);
        if (!business) {
            return { success: false, error: 'Business not found' };
        }

        // Create session
        const session = await businessChatRepository.createSession(
            businessId,
            'public',
            isAnonymous ? userUid : undefined,
            isAnonymous ? undefined : userUid
        );

        // TODO: Get greeting from business config
        const greeting = `Hello! I'm the AI assistant for ${business.displayName}. How can I help you today?`;

        return {
            success: true,
            sessionId: session.id,
            greeting
        };

    } catch (error: unknown) {
        log.error('[ChatService] createChatSession failed', error);
        return { success: false, error: getErrorMessage(error) || 'Failed to create session' };
    }
}

/**
 * Capture a lead from a chat session.
 */
export async function captureLead(
    businessId: string,
    sessionId: string,
    userUid: string,
    leadData: {
        name: string;
        phoneE164: string;
        email?: string;
        message?: string;
    }
): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
        // Verify session exists and belongs to user
        const session = await businessChatRepository.getSession(businessId, sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        if (session.anonUid !== userUid && session.userId !== userUid) {
            return { success: false, error: 'Session access denied' };
        }

        // Create lead
        const lead = await leadRepository.create(businessId, {
            sessionId,
            ...leadData
        });

        // Mark session as lead captured
        await businessChatRepository.markLeadCaptured(businessId, sessionId, lead.id);

        // TODO: Notify owner via WhatsApp/email

        return {
            success: true,
            leadId: lead.id
        };

    } catch (error: unknown) {
        log.error('[ChatService] captureLead failed', error);
        return { success: false, error: getErrorMessage(error) || 'Failed to capture lead' };
    }
}

export const publicChatService = {
    processMessage,
    createChatSession,
    captureLead
};
