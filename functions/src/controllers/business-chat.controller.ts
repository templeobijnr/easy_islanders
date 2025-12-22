import { getErrorMessage } from '../utils/errors';
/**
 * Business Chat Controller
 * Handles chat for business-specific AI agents
 * 
 * NOTE: This is SEPARATE from Platform Agent chat (chat.controller.ts)
 * Do NOT modify Platform Agent code.
 */
import { Request, Response } from 'express';
import { GoogleGenerativeAI, FunctionCallingMode, Content } from '@google/generative-ai';
import { db } from '../config/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { getBusinessAgentPrompt, BUSINESS_AGENT_TOOLS, BusinessProfile } from '../utils/businessAgentPrompts';
import { knowledgeService } from '../services/knowledge.service';
import { sendWhatsApp } from '../services/twilio.service';
import { transactionRepository } from '../repositories/transaction.repository';
import { createHeldBooking } from '../services/tools/booking-ledger.tools';

// Lazy-load Gemini
let genAI: GoogleGenerativeAI | null = null;
const getGenAI = () => {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

/**
 * Handle chat messages for business agents
 * POST /v1/business-chat/message
 */
export const handleBusinessChatMessage = async (req: Request, res: Response) => {
    const { businessId, message, sessionId: clientSessionId } = req.body;
    const user = (req as any).user;

    logger.info(`[BusinessChat] Incoming message for business: ${businessId}`);

    try {
        // 1. Validate required fields
        if (!businessId || !message) {
            res.status(400).json({ error: 'businessId and message are required' });
            return;
        }

        // 2. Load business profile
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        if (!businessDoc.exists) {
            // Try loading from listings if businesses collection doesn't have it yet
            const listingDoc = await db.collection('listings').doc(businessId).get();
            if (!listingDoc.exists) {
                res.status(404).json({ error: 'Business not found' });
                return;
            }
            // Use listing data to construct basic business profile
            const listing = listingDoc.data()!;
            logger.info(`[BusinessChat] Using listing as business profile: ${listing.title}`);
        }

        const businessData = businessDoc.exists ? businessDoc.data()! : null;
        const listingDoc = await db.collection('listings').doc(businessData?.listingId || businessId).get();
        const listingData = listingDoc.exists ? listingDoc.data()! : {};

        // Load agent config from business_configs collection (set by dashboard)
        const configDoc = await db.collection('business_configs').doc(businessId).get();
        const agentConfig = configDoc.exists ? configDoc.data()! : null;
        logger.info(`[BusinessChat] Loaded agent config: ${agentConfig ? 'yes' : 'using defaults'}`);

        // Load availability data (blocked dates) if enabled
        let availabilityInfo = undefined;
        if (agentConfig?.availability?.enabled) {
            try {
                const blockedDatesSnap = await db
                    .collection(`business_configs/${businessId}/blocked_dates`)
                    .get();

                availabilityInfo = {
                    enabled: true,
                    workingHours: agentConfig.availability.defaultHours || { open: '09:00', close: '17:00' },
                    blockedDates: blockedDatesSnap.docs.map(d => ({
                        date: d.data().date,
                        allDay: d.data().allDay ?? true,
                        timeBlocks: d.data().timeBlocks || [],
                        reason: d.data().reason
                    }))
                };
                logger.info(`[BusinessChat] Loaded ${blockedDatesSnap.size} blocked dates`);
            } catch (err) {
                logger.warn('[BusinessChat] Failed to load availability, continuing without it');
            }
        }

        // Construct business profile with config overrides
        const business: BusinessProfile = {
            id: businessId,
            name: listingData.title || businessData?.name || 'Business',
            description: listingData.description || businessData?.description || '',
            location: listingData.address || listingData.region || businessData?.location || '',
            phone: listingData.phone || businessData?.phone || '',
            hours: businessData?.hours || '',
            agent: {
                enabled: agentConfig?.isActive ?? businessData?.agent?.enabled ?? true,
                name: agentConfig?.agentName || businessData?.agent?.name || 'AI Assistant',
                tone: agentConfig?.tone || businessData?.agent?.tone || 'friendly',
                greeting: agentConfig?.greetingMessage || businessData?.agent?.greeting ||
                    `Hello! I'm the AI assistant for ${listingData.title || 'this business'}. How can I help you today?`,
                rules: agentConfig?.rules || businessData?.agent?.rules || []
            },
            availability: availabilityInfo
        };

        // 3. Get/Create session
        const sessionId = clientSessionId || `business_${businessId}_${user?.uid || 'guest'}_${Date.now()}`;

        // ════════════════════════════════════════════════════════════════════════
        // CONFIRMATION GATE - Check for pending action BEFORE LLM processing
        // ════════════════════════════════════════════════════════════════════════
        const sessionDoc = await db.collection('business_chat_sessions').doc(sessionId).get();
        const pendingAction = sessionDoc.data()?.pendingAction as {
            txId: string;
            businessId: string;
            holdExpiresAt: Timestamp;
            expectedUserId?: string;
        } | undefined;

        if (pendingAction && user?.uid) {
            const normalizedMessage = message.toLowerCase().trim();
            const isYes = ['yes', 'y', 'confirm', 'ok', 'okay', 'yep', 'sure', 'evet'].includes(normalizedMessage);
            const isNo = ['no', 'n', 'cancel', 'stop', 'nevermind', 'hayır', 'iptal'].includes(normalizedMessage);

            // 30s buffer before treating as expired
            const EXPIRY_BUFFER_MS = 30 * 1000;
            const expiresAt = pendingAction.holdExpiresAt.toDate();
            const timeRemaining = expiresAt.getTime() - Date.now();
            const isExpiredLocally = timeRemaining < EXPIRY_BUFFER_MS;

            if (isYes) {
                const idempotencyKey = `confirm:${pendingAction.txId}:${user.uid}`;
                const confirmResult = await transactionRepository.confirmTransaction({
                    transactionId: pendingAction.txId,
                    businessId: pendingAction.businessId,
                    actorType: 'user',
                    actorId: user.uid,
                }, idempotencyKey);

                // Clear pending action
                await db.collection('business_chat_sessions').doc(sessionId).update({
                    pendingAction: FieldValue.delete(),
                });

                if (!confirmResult.success) {
                    if (confirmResult.errorCode === 'HOLD_EXPIRED') {
                        res.json({
                            text: "⏰ That reservation expired. Would you like me to try booking again?",
                            sessionId,
                            expired: true
                        });
                        return;
                    }
                    res.json({
                        text: `Unable to confirm: ${confirmResult.error}`,
                        sessionId,
                        error: true
                    });
                    return;
                }

                const confirmText = `✅ Confirmed! Your confirmation code is **${confirmResult.confirmationCode}**. You'll receive a message shortly.`;
                res.json({
                    text: confirmText,
                    sessionId,
                    booking: { transactionId: pendingAction.txId, confirmationCode: confirmResult.confirmationCode }
                });
                return;
            }

            if (isNo) {
                const idempotencyKey = `release:${pendingAction.txId}:${user.uid}`;
                await transactionRepository.releaseHold(
                    pendingAction.businessId,
                    pendingAction.txId,
                    'User cancelled',
                    idempotencyKey
                );

                await db.collection('business_chat_sessions').doc(sessionId).update({
                    pendingAction: FieldValue.delete(),
                });

                res.json({
                    text: "Okay, I've cancelled that reservation. Is there anything else I can help you with?",
                    sessionId
                });
                return;
            }

            // Not YES or NO - remind user
            if (!isExpiredLocally) {
                res.json({
                    text: `You have a pending booking. Reply **YES** to confirm or **NO** to cancel.`,
                    sessionId,
                    pendingAction: true
                });
                return;
            }

            // Expired - clear and continue to LLM
            await db.collection('business_chat_sessions').doc(sessionId).update({
                pendingAction: FieldValue.delete(),
            });
        }

        // 4. Load chat history
        const historySnapshot = await db.collection('business_chat_sessions')
            .doc(sessionId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const history: Content[] = historySnapshot.docs.reverse().map(doc => {
            const data = doc.data();
            return {
                role: data.role as 'user' | 'model',
                parts: [{ text: data.text }]
            };
        });

        // 5. Retrieve relevant knowledge (RAG)
        let retrievedKnowledge: string[] = [];
        try {
            retrievedKnowledge = await knowledgeService.retrieveKnowledge(businessId, message, 5);
            logger.info(`[BusinessChat] Retrieved ${retrievedKnowledge.length} knowledge chunks`);
        } catch (err) {
            logger.warn('[BusinessChat] Knowledge retrieval failed, continuing without RAG');
        }

        // 5b. Get product catalog for pricing
        let productContext: string[] = [];
        try {
            const { getProductsForAgent } = await import('./products.controller');
            productContext = await getProductsForAgent(businessId);
            logger.info(`[BusinessChat] Loaded ${productContext.length} products for context`);
        } catch (err) {
            logger.warn('[BusinessChat] Product loading failed, continuing without catalog');
        }

        // Combine knowledge and products for agent context
        const combinedKnowledge = [
            ...retrievedKnowledge,
            ...(productContext.length > 0 ? ['=== PRODUCT CATALOG ===', ...productContext] : [])
        ];

        // 6. Build system prompt
        const systemPrompt = getBusinessAgentPrompt(business, combinedKnowledge);

        // 7. Initialize Gemini
        const model = getGenAI().getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations: BUSINESS_AGENT_TOOLS as any }],
            toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        });

        // 8. Start chat with history
        const chat = model.startChat({ history });

        // 9. Send message and get response
        const result = await chat.sendMessage(message);
        let response = result.response;
        let responseText = response.text();

        // 10. Handle function calls
        const functionCalls = response.functionCalls();
        const toolResults: any[] = [];

        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                logger.info(`[BusinessChat] Executing tool: ${call.name}`);
                const toolResult = await executeBusinessTool(
                    call.name,
                    call.args as Record<string, any>,
                    businessId,
                    business,
                    sessionId,
                    user?.uid
                );
                toolResults.push(toolResult);
            }

            // Send tool results back to Gemini
            const toolResponse = await chat.sendMessage(
                toolResults.map(r => ({
                    functionResponse: {
                        name: r.name,
                        response: r.result
                    }
                }))
            );
            responseText = toolResponse.response.text();
        }

        // 11. Save messages to session
        const messagesRef = db.collection('business_chat_sessions').doc(sessionId).collection('messages');

        await messagesRef.add({
            role: 'user',
            text: message,
            userId: user?.uid || null,
            createdAt: FieldValue.serverTimestamp()
        });

        await messagesRef.add({
            role: 'model',
            text: responseText,
            toolCalls: functionCalls?.map(c => c.name) || [],
            createdAt: FieldValue.serverTimestamp()
        });

        // Update session metadata (for Inbox display)
        await db.collection('business_chat_sessions').doc(sessionId).set({
            businessId,
            userId: user?.uid || null,
            customerName: user?.name || 'Visitor',
            lastMessage: message.slice(0, 100), // Preview of last user message
            lastMessageTime: FieldValue.serverTimestamp(),
            messageCount: FieldValue.increment(2)
        }, { merge: true });

        // 12. Return response
        res.json({
            text: responseText,
            sessionId,
            toolsExecuted: toolResults.map(r => r.name)
        });

    } catch (error: unknown) {
        logger.error('[BusinessChat] Error:', error);
        res.status(500).json({
            error: 'Chat processing failed',
            message: getErrorMessage(error)
        });
    }
};

/**
 * Execute business agent tools
 */
async function executeBusinessTool(
    toolName: string,
    args: Record<string, any>,
    businessId: string,
    business: BusinessProfile,
    sessionId: string,
    userId?: string
): Promise<{ name: string; result: any }> {
    logger.info(`[BusinessTool] Executing: ${toolName}`, args);

    try {
        switch (toolName) {
            case 'createBooking': {
                // Check if reservations are configured
                if (!business.availability?.enabled) {
                    // Lead capture mode: save as a booking request and notify owner
                    const bookingRequest = {
                        businessId,
                        businessName: business.name,
                        customerName: args.customerName,
                        customerPhone: args.customerPhone,
                        requestedDate: args.date,
                        requestedTime: args.time,
                        partySize: args.partySize || 1,
                        notes: args.notes || '',
                        status: 'lead',
                        source: 'ai_agent',
                        userId: userId || null,
                        createdAt: FieldValue.serverTimestamp()
                    };

                    const requestRef = await db.collection('business_bookings').add(bookingRequest);
                    logger.info(`[BusinessTool] Booking request (lead) captured: ${requestRef.id}`);

                    if (business.phone) {
                        try {
                            await sendWhatsApp(business.phone,
                                `🔔 [${business.name}] New booking request!\n\n` +
                                `Customer: ${args.customerName}\n` +
                                `Phone: ${args.customerPhone}\n` +
                                `Requested: ${args.date} at ${args.time}\n` +
                                `Party size: ${args.partySize || 1}\n\n` +
                                `Reply to confirm or set up online reservations in your dashboard.`
                            );
                        } catch (e) {
                            logger.warn('[BusinessTool] Failed to notify owner via WhatsApp');
                        }
                    }

                    return {
                        name: toolName,
                        result: {
                            success: true,
                            isLeadCapture: true,
                            requestId: requestRef.id,
                            message: `Booking request sent to ${business.name}. They will confirm your reservation shortly.`
                        }
                    };
                }

                // Check if the requested date/time is available (basic checks)
                const dateToBook = args.date;
                const timeToBook = args.time;
                const blockedDate = business.availability.blockedDates?.find(d => d.date === dateToBook);

                if (blockedDate) {
                    if (blockedDate.allDay) {
                        return {
                            name: toolName,
                            result: {
                                success: false,
                                reason: 'date_blocked',
                                message: `Sorry, ${business.name} is fully booked on ${dateToBook}. Would you like to try a different date?`
                            }
                        };
                    }
                    const timeBlocked = blockedDate.timeBlocks?.some(t =>
                        timeToBook >= t.startTime && timeToBook <= t.endTime
                    );
                    if (timeBlocked) {
                        return {
                            name: toolName,
                            result: {
                                success: false,
                                reason: 'time_blocked',
                                message: `Sorry, ${timeToBook} is not available on ${dateToBook}. Would you like a different time?`
                            }
                        };
                    }
                }

                // Check working hours
                const { open, close } = business.availability.workingHours;
                if (timeToBook < open || timeToBook > close) {
                    return {
                        name: toolName,
                        result: {
                            success: false,
                            reason: 'outside_hours',
                            message: `Sorry, ${business.name} is only open from ${open} to ${close}. Would you like to book within those hours?`
                        }
                    };
                }

                // ═══════════════════════════════════════════════════════════════
                // USE LEDGER: Create hold instead of direct confirm
                // ═══════════════════════════════════════════════════════════════
                const holdResult = await createHeldBooking({
                    businessId,
                    offeringId: `booking:${businessId}`,
                    offeringName: `Booking at ${business.name}`,
                    channel: 'discover_chat',
                    actor: {
                        userId: userId || 'guest',
                        name: args.customerName,
                        phoneE164: args.customerPhone,
                    },
                    date: dateToBook,
                    time: timeToBook,
                    partySize: args.partySize || 1,
                    notes: args.notes,
                    idempotencyKey: `biz-booking:${sessionId}:${businessId}:${dateToBook}:${timeToBook}`,
                });

                if (!holdResult.success) {
                    return {
                        name: toolName,
                        result: {
                            success: false,
                            reason: holdResult.errorCode,
                            message: holdResult.error || 'Unable to reserve this slot',
                        }
                    };
                }

                // Store pending action in session
                await db.collection('business_chat_sessions').doc(sessionId).set({
                    pendingAction: holdResult.pendingAction,
                }, { merge: true });

                return {
                    name: toolName,
                    result: {
                        success: true,
                        awaitingConfirmation: true,
                        holdExpiresAt: holdResult.holdExpiresAt?.toISOString(),
                        message: holdResult.confirmationPrompt,
                    }
                };
            }

            case 'sendWhatsAppToOwner': {
                if (!business.phone) {
                    return {
                        name: toolName,
                        result: { success: false, message: 'Business owner phone not configured' }
                    };
                }

                const urgencyEmoji = args.urgency === 'high' ? '🚨' : args.urgency === 'normal' ? '📩' : '💬';
                const fullMessage = `${urgencyEmoji} [${business.name}] New message:\n\n${args.message}${args.bookingId ? `\n\nBooking ID: ${args.bookingId}` : ''}`;

                try {
                    await sendWhatsApp(business.phone, fullMessage);
                    logger.info(`[BusinessTool] WhatsApp sent to owner: ${business.phone}`);
                    return {
                        name: toolName,
                        result: { success: true, message: 'Owner notified via WhatsApp' }
                    };
                } catch (err: unknown) {
                    logger.error('[BusinessTool] WhatsApp to owner failed:', err);
                    return {
                        name: toolName,
                        result: { success: false, message: 'Failed to send WhatsApp' }
                    };
                }
            }

            case 'sendWhatsAppToCustomer': {
                if (!args.customerPhone) {
                    return {
                        name: toolName,
                        result: { success: false, message: 'Customer phone not provided' }
                    };
                }

                try {
                    await sendWhatsApp(args.customerPhone, `[${business.name}] ${args.message}`);
                    logger.info(`[BusinessTool] WhatsApp sent to customer: ${args.customerPhone}`);
                    return {
                        name: toolName,
                        result: { success: true, message: 'Customer notified via WhatsApp' }
                    };
                } catch (err: unknown) {
                    logger.error('[BusinessTool] WhatsApp to customer failed:', err);
                    return {
                        name: toolName,
                        result: { success: false, message: 'Failed to send WhatsApp to customer' }
                    };
                }
            }

            case 'captureEnquiry': {
                const enquiry = {
                    businessId,
                    businessName: business.name,
                    customerName: args.customerName || 'Anonymous',
                    customerPhone: args.customerPhone || null,
                    message: args.message,
                    status: 'new',
                    userId: userId || null,
                    createdAt: FieldValue.serverTimestamp()
                };

                const enquiryRef = await db.collection('business_enquiries').add(enquiry);
                logger.info(`[BusinessTool] Enquiry captured: ${enquiryRef.id}`);

                return {
                    name: toolName,
                    result: {
                        success: true,
                        enquiryId: enquiryRef.id,
                        message: 'Enquiry sent to business owner'
                    }
                };
            }

            case 'getBusinessHours': {
                return {
                    name: toolName,
                    result: {
                        hours: business.hours || 'Operating hours not specified. Please contact the business directly.',
                        success: true
                    }
                };
            }

            case 'checkAvailability': {
                const dateToCheck = args.date;
                const timeToCheck = args.time;

                // If availability not configured, tell the agent
                if (!business.availability?.enabled) {
                    return {
                        name: toolName,
                        result: {
                            available: false,
                            configured: false,
                            message: 'This business has not set up their availability schedule yet. You can still take a booking request and we will notify the owner.'
                        }
                    };
                }

                // Check if date is blocked
                const blockedDate = business.availability.blockedDates?.find(d => d.date === dateToCheck);

                if (blockedDate) {
                    if (blockedDate.allDay) {
                        return {
                            name: toolName,
                            result: {
                                available: false,
                                reason: blockedDate.reason || 'Fully booked',
                                message: `${dateToCheck} is fully blocked.`
                            }
                        };
                    }
                    // Check time blocks
                    if (timeToCheck) {
                        const timeBlocked = blockedDate.timeBlocks?.some(t =>
                            timeToCheck >= t.startTime && timeToCheck <= t.endTime
                        );
                        if (timeBlocked) {
                            return {
                                name: toolName,
                                result: {
                                    available: false,
                                    reason: 'Time slot blocked',
                                    message: `${timeToCheck} is not available on ${dateToCheck}.`
                                }
                            };
                        }
                    }
                }

                // Check working hours
                const { open, close } = business.availability.workingHours;
                if (timeToCheck && (timeToCheck < open || timeToCheck > close)) {
                    return {
                        name: toolName,
                        result: {
                            available: false,
                            reason: 'Outside working hours',
                            workingHours: { open, close },
                            message: `${timeToCheck} is outside working hours (${open} - ${close}).`
                        }
                    };
                }

                // Available!
                return {
                    name: toolName,
                    result: {
                        available: true,
                        workingHours: { open, close },
                        message: timeToCheck
                            ? `${dateToCheck} at ${timeToCheck} is available for booking.`
                            : `${dateToCheck} is available. Working hours are ${open} - ${close}.`
                    }
                };
            }

            default:
                logger.warn(`[BusinessTool] Unknown tool: ${toolName}`);
                return {
                    name: toolName,
                    result: { success: false, message: `Unknown tool: ${toolName}` }
                };
        }
    } catch (error: unknown) {
        logger.error(`[BusinessTool] Error executing ${toolName}:`, error);
        return {
            name: toolName,
            result: { success: false, message: getErrorMessage(error) }
        };
    }
}
