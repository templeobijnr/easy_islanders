"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicChatService = void 0;
exports.processMessage = processMessage;
exports.createChatSession = createChatSession;
exports.captureLead = captureLead;
const errors_1 = require("../../utils/errors");
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
const generative_ai_1 = require("@google/generative-ai");
const business_repository_1 = require("../../repositories/business.repository");
const businessChat_repository_1 = require("../../repositories/businessChat.repository");
const lead_repository_1 = require("../../repositories/lead.repository");
const rag_service_1 = require("./rag.service");
const limits_1 = require("../../types/limits");
const log_1 = require("../../utils/log");
/**
 * Get Gemini AI instance.
 */
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
/**
 * Process a message in a public chat session.
 */
async function processMessage(businessId, sessionId, userUid, text) {
    const startTime = Date.now();
    try {
        // 1. Verify session exists and belongs to user
        const session = await businessChat_repository_1.businessChatRepository.getSession(businessId, sessionId);
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
        const capResult = await businessChat_repository_1.businessChatRepository.appendUserMessageWithCap(businessId, sessionId, userUid, text, limits_1.DEFAULT_LIMITS.maxPublicMessagesPerSession);
        if (!capResult.allowed) {
            const limitText = "You've reached the message limit for this session. Please leave your contact information and we'll get back to you!";
            // Save the limit message
            await businessChat_repository_1.businessChatRepository.saveMessage(businessId, sessionId, {
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
        const business = await business_repository_1.businessRepository.getByIdWithListingFallback(businessId);
        const businessContext = {
            name: (business === null || business === void 0 ? void 0 : business.displayName) || 'this business',
            category: business === null || business === void 0 ? void 0 : business.category,
            description: business === null || business === void 0 ? void 0 : business.description,
            location: business === null || business === void 0 ? void 0 : business.location
        };
        // 4. Retrieve context via RAG
        const retrieval = await rag_service_1.ragService.retrieveContext(businessId, text);
        log_1.log.info('[ChatService] RAG retrieval', { hasContext: retrieval.hasContext, chunkCount: retrieval.sources.length });
        // 5. Build prompt with business context
        const systemPrompt = rag_service_1.ragService.buildSystemPrompt(businessContext);
        const fullPrompt = rag_service_1.ragService.buildPromptWithContext(systemPrompt, retrieval.contextText, text, businessContext);
        // 6. Generate response
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7
            }
        });
        const generateStart = Date.now();
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        const generateLatency = Date.now() - generateStart;
        log_1.log.info('[ChatService] Generated response', { generateLatencyMs: generateLatency });
        // 8. Check if we should prompt for lead capture
        let finalText = responseText;
        const isLowConfidence = !retrieval.hasContext || responseText.toLowerCase().includes("don't have");
        if (isLowConfidence && !session.leadCaptured) {
            finalText += "\n\nWould you like to leave your contact details so we can follow up with you?";
        }
        // 9. Save assistant message with sources
        await businessChat_repository_1.businessChatRepository.saveMessage(businessId, sessionId, {
            role: 'assistant',
            text: finalText,
            sources: retrieval.sources.map(s => ({
                docId: s.docId,
                chunkId: s.chunkId,
                sourceName: s.sourceName,
                score: s.score
            })),
            meta: {
                model: 'gemini-2.0-flash-exp',
                latencyMs: generateLatency
            }
        });
        return {
            success: true,
            text: finalText,
            sources: retrieval.sources,
            messageCount: capResult.newCount,
            limitReached: capResult.newCount >= limits_1.DEFAULT_LIMITS.maxPublicMessagesPerSession,
            latencyMs: Date.now() - startTime
        };
    }
    catch (error) {
        log_1.log.error('[ChatService] processMessage failed', error);
        return {
            success: false,
            text: '',
            sources: [],
            messageCount: 0,
            limitReached: false,
            latencyMs: Date.now() - startTime,
            error: (0, errors_1.getErrorMessage)(error) || 'Failed to process message'
        };
    }
}
/**
 * Create a new chat session.
 */
async function createChatSession(businessId, userUid, isAnonymous) {
    try {
        // Verify business exists (with listings fallback for backward compatibility)
        const business = await business_repository_1.businessRepository.getByIdWithListingFallback(businessId);
        if (!business) {
            return { success: false, error: 'Business not found' };
        }
        // Create session
        const session = await businessChat_repository_1.businessChatRepository.createSession(businessId, 'public', isAnonymous ? userUid : undefined, isAnonymous ? undefined : userUid);
        // TODO: Get greeting from business config
        const greeting = `Hello! I'm the AI assistant for ${business.displayName}. How can I help you today?`;
        return {
            success: true,
            sessionId: session.id,
            greeting
        };
    }
    catch (error) {
        log_1.log.error('[ChatService] createChatSession failed', error);
        return { success: false, error: (0, errors_1.getErrorMessage)(error) || 'Failed to create session' };
    }
}
/**
 * Capture a lead from a chat session.
 */
async function captureLead(businessId, sessionId, userUid, leadData) {
    try {
        // Verify session exists and belongs to user
        const session = await businessChat_repository_1.businessChatRepository.getSession(businessId, sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }
        if (session.anonUid !== userUid && session.userId !== userUid) {
            return { success: false, error: 'Session access denied' };
        }
        // Create lead
        const lead = await lead_repository_1.leadRepository.create(businessId, Object.assign({ sessionId }, leadData));
        // Mark session as lead captured
        await businessChat_repository_1.businessChatRepository.markLeadCaptured(businessId, sessionId, lead.id);
        // TODO: Notify owner via WhatsApp/email
        return {
            success: true,
            leadId: lead.id
        };
    }
    catch (error) {
        log_1.log.error('[ChatService] captureLead failed', error);
        return { success: false, error: (0, errors_1.getErrorMessage)(error) || 'Failed to capture lead' };
    }
}
exports.publicChatService = {
    processMessage,
    createChatSession,
    captureLead
};
//# sourceMappingURL=public-chat.service.js.map