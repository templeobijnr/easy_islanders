"use strict";
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
exports.reindexListings = exports.handleChatMessage = void 0;
const generative_ai_1 = require("@google/generative-ai");
const agentTools_1 = require("../utils/agentTools");
const toolService_1 = require("../services/toolService");
const chat_repository_1 = require("../repositories/chat.repository");
const memory_service_1 = require("../services/memory.service");
const firebase_1 = require("../config/firebase");
const user_service_1 = require("../services/user.service");
// Initialize Gemini with API Key from environment variables
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const systemPrompts_1 = require("../utils/systemPrompts");
const handleChatMessage = async (req, res) => {
    var _a, _b, _c;
    console.log('🟦 [Backend] Received chat request');
    const { message, agentId, language, sessionId: clientSessionId } = req.body;
    const user = req.user;
    try {
        // Extract location data from message if present
        let userLocation = null;
        let cleanMessage = message;
        const locationMatch = message.match(/\[SHARED LOCATION:\s*([\d.]+),\s*([\d.]+)\]/);
        if (locationMatch) {
            userLocation = {
                lat: parseFloat(locationMatch[1]),
                lng: parseFloat(locationMatch[2])
            };
            // Replace the location tag with a cleaner message
            cleanMessage = message.replace(locationMatch[0], '').trim() || 'User shared their current location';
            console.log('📍 [Backend] User location extracted:', userLocation);
        }
        // 1. Session & Context Loading (Parallel)
        const sessionId = await chat_repository_1.chatRepository.getOrCreateSession(clientSessionId, user.uid, agentId);
        const [history, userMemory, userDoc, liteContext] = await Promise.all([
            chat_repository_1.chatRepository.getHistory(sessionId, 10), // Load last 10 turns
            memory_service_1.memoryService.getContext(user.uid, agentId),
            firebase_1.db.collection('users').doc(user.uid).get(),
            (0, user_service_1.getLiteContext)(user.uid)
        ]);
        const userData = userDoc.data() || {};
        const userName = userData.displayName || user.email || user.uid || 'Guest';
        const persona = userData.persona || userData.type || liteContext.role || 'user';
        // Persist latest location to user profile for cross-turn usage
        if (userLocation) {
            try {
                await firebase_1.db.collection('users').doc(user.uid).set({
                    lastLocation: {
                        lat: userLocation.lat,
                        lng: userLocation.lng,
                        updatedAt: new Date().toISOString()
                    }
                }, { merge: true });
            }
            catch (locErr) {
                console.error('⚠️ [Backend] Failed to persist lastLocation:', locErr.message || locErr);
            }
        }
        // Effective location = current turn location, or last known one from profile
        const lastLocation = userData.lastLocation;
        const effectiveLocation = userLocation || lastLocation || null;
        // 2. Construct Contextual System Prompt
        const now = new Date();
        const timeString = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const memoryContext = `
            [USER LONG-TERM MEMORY]
            - Preferences: ${JSON.stringify(userMemory)}
        `;
        const liteFacts = liteContext.facts && liteContext.facts.length > 0 ? liteContext.facts.join('; ') : 'None';
        const liteProbe = ((_a = liteContext.missing) === null || _a === void 0 ? void 0 : _a.length) ? `We are missing: ${liteContext.missing.join(', ')}` : 'Profile complete.';
        const liteContextBlock = `
            [USER PROFILE LITE]
            - Facts: ${liteFacts}
            - Missing Info: ${liteProbe}
            - Persona/Role: ${persona}
        `;
        const locationContext = effectiveLocation ? `
            [USER CURRENT LOCATION]
            - GPS Coordinates: ${effectiveLocation.lat}, ${effectiveLocation.lng}
            - When dispatching taxis or providing navigation, use pickupLat=${effectiveLocation.lat} and pickupLng=${effectiveLocation.lng}
            - User's pickup location is "Current location" with these exact coordinates
        ` : '';
        const contextPrompt = `
            ${(0, systemPrompts_1.getSystemInstruction)(agentId, language)}

            [SYSTEM INFO]
            Current Local Time: ${timeString}
            User Name: ${userName}
            User UID: ${user.uid}

            ${memoryContext}
            ${liteContextBlock}
            ${locationContext}

            [INSTRUCTIONS]
            - Use the conversation history to understand context.
            - If the user says "book it", refer to the last item discussed in history.
            - Use the user's name (${userName}) naturally for a more personal tone when appropriate.
            - If user is already on-island / mobile / has_car / declined pickup, do not upsell airport pickup. Prefer in-island services instead.
            - Be date-aware: convert vague ranges like "next week Thursday to the following Friday" to concrete dates using current time (${timeString}). Avoid re-asking if you can compute dates.

            [CRITICAL - TAXI TOOL USAGE]
            - When you have BOTH a pickup location AND a destination, you MUST call the dispatchTaxi function
            - DO NOT say "I'm dispatching a taxi" or "I'll send a taxi" - ACTUALLY CALL THE TOOL
            - DO NOT respond with text when you should call dispatchTaxi
            - ALWAYS use function calls instead of describing what you're doing
            - If pickup location is "Current location" or user shared location, use the coordinates provided below

            [LOCATION HANDLING - CRITICAL]
            - NEVER ask users for "latitude", "longitude", "GPS coordinates", or any technical location data
            - ALWAYS ask for locations naturally: "Where are you?" or "Which hotel/area are you near?" or "What's your destination?"
            - Accept ANY human-readable location: hotel names, landmarks, neighborhoods, addresses, or "current location"
            - The mobile app automatically provides GPS coordinates in the background - you only need the place name
            - Examples of good questions: "Which hotel are you staying at?", "Where would you like to go?", "What area are you in?"
            ${userLocation ? `- IMPORTANT: User has shared their current location (${userLocation.lat}, ${userLocation.lng}). When calling dispatchTaxi, include pickupLat and pickupLng with these exact values.` : ''}
        `;
        console.log('🟦 [Backend] Initializing Gemini...');
        // 3. Initialize Model with History
        // Use v1beta API for experimental models with tool support
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
        console.log(`🤖 Using model: ${modelName}`);
        console.log(`📝 Raw env GEMINI_MODEL: ${process.env.GEMINI_MODEL}`);
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: contextPrompt,
            tools: [{ functionDeclarations: agentTools_1.ALL_TOOL_DEFINITIONS }],
            toolConfig: {
                functionCallingConfig: {
                    mode: generative_ai_1.FunctionCallingMode.AUTO // Allow model to choose when to call functions
                }
            }
        }, { apiVersion: 'v1beta' });
        // Ensure history starts with a user message
        let validHistory = history.map(h => ({
            role: h.role,
            parts: h.parts
        }));
        if (validHistory.length > 0 && validHistory[0].role !== 'user') {
            validHistory = validHistory.slice(1);
        }
        const chat = model.startChat({
            history: validHistory
        });
        console.log('🟦 [Backend] Sending message to Gemini:', cleanMessage);
        // 4. Send Message & Handle Multi-Turn Loop
        let result = await chat.sendMessage(cleanMessage);
        let response = await result.response;
        let listings = [];
        let booking = null;
        let payment = null;
        let viewingRequest = null;
        let mapLocation = null;
        let taxiRequestId = null;
        // Loop while there are function calls
        let functionCalls = response.functionCalls();
        while (functionCalls && functionCalls.length > 0) {
            // Log "Thinking" if there is text accompanying the tool call
            try {
                const thinking = response.text();
                if (thinking) {
                    console.log('🧠 [Backend] Agent Thinking:', thinking);
                }
            }
            catch (e) {
                // Ignore if no text is present with the function call
            }
            const functionResponseParts = [];
            for (const call of functionCalls) {
                const fnName = call.name;
                const fnArgs = call.args;
                console.log(`🛠️ [Backend] Decision: calling tool '${fnName}' with args ${JSON.stringify(fnArgs)}`);
                let toolResult = {};
                try {
                    if (fnName === 'searchMarketplace' || fnName === 'searchLocalPlaces' || fnName === 'searchEvents') {
                        const resolver = toolService_1.toolResolvers[fnName];
                        const items = await resolver(Object.assign({}, fnArgs
                        // Intentionally do NOT scope by ownerUid; agent should see all listings
                        ));
                        listings = items || []; // Store for frontend
                        const simplifiedItems = (items || []).map((i) => ({
                            id: i.id,
                            title: i.title,
                            price: i.price,
                            location: i.location,
                            amenities: i.amenities || i.features
                        }));
                        toolResult = { results: simplifiedItems, count: simplifiedItems.length };
                    }
                    else if (fnName === 'initiateBooking') {
                        const res = await toolService_1.toolResolvers.createBooking(fnArgs, user.uid);
                        booking = res; // Store full booking for frontend
                        toolResult = { success: true, bookingId: res.id, receipt: res.receipt };
                    }
                    else if (fnName === 'createPaymentIntent') {
                        const res = await toolService_1.toolResolvers.createPaymentIntent(fnArgs, user.uid);
                        payment = res.payment;
                        toolResult = res;
                    }
                    else if (fnName === 'scheduleViewing') {
                        const res = await toolService_1.toolResolvers.scheduleViewing(fnArgs, user.uid);
                        viewingRequest = res;
                        toolResult = res;
                    }
                    else if (fnName === 'consultEncyclopedia') {
                        toolResult = await toolService_1.toolResolvers.consultEncyclopedia(fnArgs);
                    }
                    else if (fnName === 'getRealTimeInfo') {
                        toolResult = await toolService_1.toolResolvers.getRealTimeInfo(fnArgs);
                    }
                    else if (fnName === 'sendWhatsAppMessage') {
                        toolResult = await toolService_1.toolResolvers.sendWhatsAppMessage(fnArgs);
                    }
                    else if (fnName === 'dispatchTaxi' || fnName === 'requestTaxi') {
                        // Auto-inject user location (current or last known) if available
                        const enrichedArgs = Object.assign({}, fnArgs);
                        const locationForTaxi = effectiveLocation || userLocation;
                        if (locationForTaxi && !enrichedArgs.pickupLat && !enrichedArgs.pickupLng) {
                            enrichedArgs.pickupLat = locationForTaxi.lat;
                            enrichedArgs.pickupLng = locationForTaxi.lng;
                            console.log(`📍 [Backend] Auto-injected user location into ${fnName}:`, locationForTaxi);
                        }
                        // If pickupLocation is missing or too generic, label it clearly for the driver
                        if (!enrichedArgs.pickupLocation || /^current location$/i.test(enrichedArgs.pickupLocation)) {
                            enrichedArgs.pickupLocation = 'Current location (see map link)';
                        }
                        const resolver = fnName === 'dispatchTaxi' ? toolService_1.toolResolvers.dispatchTaxi : toolService_1.toolResolvers.requestTaxi;
                        toolResult = await resolver(enrichedArgs, user.uid, sessionId);
                        // Capture requestId for frontend tracking
                        if (toolResult.success && toolResult.requestId) {
                            taxiRequestId = toolResult.requestId;
                            console.log(`🚕 [Backend] Captured taxi requestId: ${taxiRequestId}`);
                        }
                    }
                    else if (fnName === 'orderHouseholdSupplies') {
                        toolResult = await toolService_1.toolResolvers.orderHouseholdSupplies(fnArgs, user.uid);
                    }
                    else if (fnName === 'requestService') {
                        toolResult = await toolService_1.toolResolvers.requestService(fnArgs, user.uid);
                    }
                    else if (fnName === 'createConsumerRequest') {
                        toolResult = await toolService_1.toolResolvers.createConsumerRequest(fnArgs);
                    }
                    else if (fnName === 'showMap') {
                        toolResult = await toolService_1.toolResolvers.showMap(fnArgs);
                        // Store map location for frontend response
                        mapLocation = toolResult;
                    }
                    else {
                        const resolver = toolService_1.toolResolvers[fnName];
                        if (!resolver) {
                            throw new Error(`Tool not implemented: ${fnName}`);
                        }
                        // Pass user uid when resolver expects it (second argument)
                        toolResult = resolver.length >= 2
                            ? await resolver(fnArgs, user.uid)
                            : await resolver(fnArgs);
                    }
                    console.log(`   Result:`, JSON.stringify(toolResult).substring(0, 200) + (JSON.stringify(toolResult).length > 200 ? '...' : ''));
                }
                catch (toolErr) {
                    const errorMessage = toolErr.message || 'Unknown error occurred';
                    console.error(`🔴 [Backend] AI Controller Error: ${errorMessage}`);
                    console.error(`🔴 [Backend] Error stack:`, toolErr.stack);
                    // Return error details to the AI agent so it can handle it gracefully
                    toolResult = {
                        error: true,
                        message: errorMessage,
                        toolName: fnName
                    };
                }
                functionResponseParts.push({
                    functionResponse: {
                        name: fnName,
                        response: toolResult,
                    }
                });
            }
            // Send tool outputs back to Gemini
            console.log('🟦 [Backend] Sending tool outputs back to Gemini...');
            result = await chat.sendMessage(functionResponseParts);
            response = await result.response;
            functionCalls = response.functionCalls();
        }
        if (!functionCalls || functionCalls.length === 0) {
            console.warn('⚠️ [Backend] No tool calls returned for this turn.');
        }
        // Extract text, handle empty responses
        let text = '';
        try {
            text = response.text();
            console.log('🟢 [Backend] Final Gemini response:', text);
        }
        catch (textError) {
            console.error('⚠️ [Backend] Error getting response text:', textError.message);
            // Log raw response for debugging
            console.log('🔍 [Backend] Raw response candidates:', JSON.stringify({
                candidates: (_b = response.candidates) === null || _b === void 0 ? void 0 : _b.map((c) => ({
                    finishReason: c.finishReason,
                    safetyRatings: c.safetyRatings,
                    content: c.content
                }))
            }, null, 2));
            // Check if response was blocked
            const candidate = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0];
            if ((candidate === null || candidate === void 0 ? void 0 : candidate.finishReason) === 'SAFETY') {
                text = "I apologize, but I cannot process that request due to safety filters. Could you rephrase your question?";
            }
            else if ((candidate === null || candidate === void 0 ? void 0 : candidate.finishReason) === 'RECITATION') {
                text = "I apologize, but I cannot provide that specific information. Let me help you in a different way.";
            }
            else if (!text || text.trim() === '') {
                // Empty response - this might be a model issue
                text = "I understand. Let me search for available options for you.";
                console.warn('⚠️ [Backend] Empty response detected, providing fallback message');
            }
        }
        // If still empty after all checks, provide a default response
        if (!text || text.trim() === '') {
            text = "I've processed your request. How else can I help you?";
            console.warn('⚠️ [Backend] Final fallback used for empty response');
        }
        // 6. Persistence (Save both sides)
        const modelMessageMeta = { userId: user.uid, agentId };
        // Add taxi requestId to metadata for frontend tracking
        if (taxiRequestId) {
            modelMessageMeta.taxiRequestId = taxiRequestId;
        }
        await Promise.all([
            chat_repository_1.chatRepository.saveMessage(sessionId, 'user', [{ text: cleanMessage }], { userId: user.uid, agentId }),
            chat_repository_1.chatRepository.saveMessage(sessionId, 'model', [{ text: text }], modelMessageMeta)
        ]);
        console.log('📤 [Backend] Sending response. Has mapLocation?', !!mapLocation, mapLocation);
        const responseData = {
            text: text,
            listings,
            booking,
            payment,
            viewingRequest,
            mapLocation,
            sessionId: sessionId
        };
        res.json(responseData);
    }
    catch (error) {
        console.error("🔴 [Backend] AI Controller Error:", error);
        console.error("🔴 [Backend] Error stack:", error.stack);
        res.status(500).send('Internal Server Error');
    }
};
exports.handleChatMessage = handleChatMessage;
const reindexListings = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        console.log("🔄 [Reindex] Starting manual reindex...");
        const { upsertListing, initializeCollection } = await Promise.resolve().then(() => __importStar(require('../services/typesense.service')));
        const { listingRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/listing.repository')));
        await initializeCollection();
        const { initializeUserCollection } = await Promise.resolve().then(() => __importStar(require('../services/typesense.service')));
        await initializeUserCollection();
        const domainFilter = typeof req.query.domain === 'string' ? req.query.domain : undefined;
        console.log(`[Reindex] Domain filter: ${domainFilter || 'ALL'}`);
        const allItems = await listingRepository.getAllActive(domainFilter ? { domain: domainFilter } : undefined); // Get filtered or ALL items
        console.log(`🔄 [Reindex] Found ${allItems.length} items in Firestore.`);
        let count = 0;
        for (const item of allItems) {
            const itemAny = item;
            const searchRecord = {
                id: item.id,
                title: item.title,
                description: item.description,
                price: item.price,
                domain: item.domain,
                category: itemAny.category,
                subCategory: itemAny.subCategory || itemAny.rentalType || itemAny.type || (itemAny.domain === 'Cars' && ((_a = itemAny.category) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'rental' ? 'rental' : null), // Fallback for legacy data
                location: item.location,
                type: itemAny.type || itemAny.rentalType,
                rating: item.rating,
                ownerId: itemAny.ownerUid || 'system',
                metadata: {
                    amenities: itemAny.amenities,
                    imageUrl: item.imageUrl,
                    bedrooms: itemAny.bedrooms || ((_b = itemAny.metadata) === null || _b === void 0 ? void 0 : _b.bedrooms),
                    bathrooms: itemAny.bathrooms || ((_c = itemAny.metadata) === null || _c === void 0 ? void 0 : _c.bathrooms),
                    area: itemAny.squareMeters || itemAny.area || ((_d = itemAny.metadata) === null || _d === void 0 ? void 0 : _d.area)
                },
                createdAt: Math.floor(Date.now() / 1000)
            };
            await upsertListing(searchRecord);
            count++;
        }
        console.log(`✅ [Reindex] Successfully indexed ${count} items.`);
        res.json({ success: true, count });
    }
    catch (error) {
        console.error("🔴 [Reindex] Error:", error);
        res.status(500).send('Reindex Failed');
    }
};
exports.reindexListings = reindexListings;
//# sourceMappingURL=chat.controller.js.map