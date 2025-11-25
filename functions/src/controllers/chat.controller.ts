import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ALL_TOOL_DEFINITIONS } from '../utils/agentTools';
import { toolResolvers } from '../services/toolService';
import { chatRepository } from '../repositories/chat.repository';
import { memoryService } from '../services/memory.service';
import { db } from '../config/firebase';
import { getLiteContext } from '../services/user.service';

// Initialize Gemini with API Key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

import { getSystemInstruction } from '../utils/systemPrompts';

export const handleChatMessage = async (req: Request, res: Response) => {
    console.log('🟦 [Backend] Received chat request');
    const { message, agentId, language, sessionId: clientSessionId } = req.body;
    const user = (req as any).user!;

    try {
        // Extract location data from message if present
        let userLocation: { lat: number; lng: number } | null = null;
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
        const sessionId = await chatRepository.getOrCreateSession(clientSessionId, user.uid, agentId);

        const [history, userMemory, userDoc, liteContext] = await Promise.all([
            chatRepository.getHistory(sessionId, 10), // Load last 10 turns
            memoryService.getContext(user.uid, agentId),
            db.collection('users').doc(user.uid).get(),
            getLiteContext(user.uid)
        ]);

        const userData = userDoc.data() || {};
        const userName = userData.displayName || user.email || user.uid || 'Guest';
        const persona = userData.persona || userData.type || liteContext.role || 'user';

        // Persist latest location to user profile for cross-turn usage
        if (userLocation) {
            try {
                await db.collection('users').doc(user.uid).set({
                    lastLocation: {
                        lat: userLocation.lat,
                        lng: userLocation.lng,
                        updatedAt: new Date().toISOString()
                    }
                }, { merge: true });
            } catch (locErr: any) {
                console.error('⚠️ [Backend] Failed to persist lastLocation:', locErr.message || locErr);
            }
        }

        // Effective location = current turn location, or last known one from profile
        const lastLocation = (userData as any).lastLocation as { lat: number; lng: number; updatedAt?: string } | undefined;
        const effectiveLocation = userLocation || lastLocation || null;

        // 2. Construct Contextual System Prompt
        const now = new Date();
        const timeString = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const memoryContext = `
            [USER LONG-TERM MEMORY]
            - Preferences: ${JSON.stringify(userMemory)}
        `;

        const liteFacts = liteContext.facts && liteContext.facts.length > 0 ? liteContext.facts.join('; ') : 'None';
        const liteProbe = liteContext.missing?.length ? `We are missing: ${liteContext.missing.join(', ')}` : 'Profile complete.';
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
            ${getSystemInstruction(agentId, language)}

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
            - If you have a pickup (user shared location or specified) AND a destination, CALL the dispatchTaxi tool immediately. Do not reply with text instead of calling the tool.

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
        const model = genAI.getGenerativeModel(
            {
                model: 'gemini-2.0-flash-exp',
                systemInstruction: contextPrompt,
                tools: [{ functionDeclarations: ALL_TOOL_DEFINITIONS }]
            },
            { apiVersion: 'v1beta' }
        );

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

        let listings: any[] = [];
        let booking = null;
        let payment = null;
        let viewingRequest = null;
        let mapLocation = null;

        // Loop while there are function calls
        let functionCalls = response.functionCalls();
        while (functionCalls && functionCalls.length > 0) {
            // Log "Thinking" if there is text accompanying the tool call
            try {
                const thinking = response.text();
                if (thinking) {
                    console.log('🧠 [Backend] Agent Thinking:', thinking);
                }
            } catch (e) {
                // Ignore if no text is present with the function call
            }

            const functionResponseParts: any[] = [];

            for (const call of functionCalls) {
                const fnName = call.name;
                const fnArgs = call.args;
                console.log(`🛠️ [Backend] Decision: calling tool '${fnName}' with args ${JSON.stringify(fnArgs)}`);

                let toolResult: any = {};

                try {
                    if (fnName === 'searchMarketplace' || fnName === 'searchLocalPlaces' || fnName === 'searchEvents') {
                        const resolver = (toolResolvers as any)[fnName];
                        const items = await resolver({
                            ...fnArgs
                            // Intentionally do NOT scope by ownerUid; agent should see all listings
                        });
                        listings = items || []; // Store for frontend
                        const simplifiedItems = (items || []).map((i: any) => ({
                            id: i.id,
                            title: i.title,
                            price: i.price,
                            location: i.location,
                            amenities: i.amenities || i.features
                        }));
                        toolResult = { results: simplifiedItems, count: simplifiedItems.length };
                    }
                    else if (fnName === 'initiateBooking') {
                        const res = await toolResolvers.createBooking(fnArgs, user.uid);
                        booking = res; // Store full booking for frontend
                        toolResult = { success: true, bookingId: res.id, receipt: res.receipt };
                    }
                    else if (fnName === 'createPaymentIntent') {
                        const res = await toolResolvers.createPaymentIntent(fnArgs, user.uid);
                        payment = res.payment;
                        toolResult = res;
                    }
                    else if (fnName === 'scheduleViewing') {
                        const res = await toolResolvers.scheduleViewing(fnArgs, user.uid);
                        viewingRequest = res;
                        toolResult = res;
                    }
                    else if (fnName === 'consultEncyclopedia') {
                        toolResult = await toolResolvers.consultEncyclopedia(fnArgs);
                    }
                    else if (fnName === 'getRealTimeInfo') {
                        toolResult = await toolResolvers.getRealTimeInfo(fnArgs);
                    }
                    else if (fnName === 'sendWhatsAppMessage') {
                        toolResult = await toolResolvers.sendWhatsAppMessage(fnArgs);
                    }
                    else if (fnName === 'dispatchTaxi') {
                        // Auto-inject user location (current or last known) if available
                        const enrichedArgs: any = { ...fnArgs };
                        const locationForTaxi = effectiveLocation || userLocation;

                        if (locationForTaxi && !enrichedArgs.pickupLat && !enrichedArgs.pickupLng) {
                            enrichedArgs.pickupLat = locationForTaxi.lat;
                            enrichedArgs.pickupLng = locationForTaxi.lng;
                            console.log('📍 [Backend] Auto-injected user location into dispatchTaxi:', locationForTaxi);
                        }

                        // If pickupLocation is missing or too generic, label it clearly for the driver
                        if (!enrichedArgs.pickupLocation || /^current location$/i.test(enrichedArgs.pickupLocation)) {
                            enrichedArgs.pickupLocation = 'Current location (see map link)';
                        }

                        toolResult = await toolResolvers.dispatchTaxi(enrichedArgs, user.uid);
                    }
                    else if (fnName === 'orderHouseholdSupplies') {
                        toolResult = await toolResolvers.orderHouseholdSupplies(fnArgs, user.uid);
                    }
                    else if (fnName === 'requestService') {
                        toolResult = await toolResolvers.requestService(fnArgs, user.uid);
                    }
                    else if (fnName === 'createConsumerRequest') {
                        toolResult = await toolResolvers.createConsumerRequest(fnArgs);
                    }
                    else if (fnName === 'showMap') {
                        toolResult = await toolResolvers.showMap(fnArgs);
                        // Store map location for frontend response
                        mapLocation = toolResult;
                    }
                    else {
                        const resolver = (toolResolvers as any)[fnName];
                        if (!resolver) {
                            throw new Error(`Tool not implemented: ${fnName}`);
                        }
                        // Pass user uid when resolver expects it (second argument)
                        toolResult = resolver.length >= 2
                            ? await resolver(fnArgs, user.uid)
                            : await resolver(fnArgs);
                    }

                    console.log(`   Result:`, JSON.stringify(toolResult).substring(0, 200) + (JSON.stringify(toolResult).length > 200 ? '...' : ''));

                } catch (toolErr: any) {
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
        } catch (textError: any) {
            console.error('⚠️ [Backend] Error getting response text:', textError.message);

            // Log raw response for debugging
            console.log('🔍 [Backend] Raw response candidates:', JSON.stringify({
                candidates: response.candidates?.map((c: any) => ({
                    finishReason: c.finishReason,
                    safetyRatings: c.safetyRatings,
                    content: c.content
                }))
            }, null, 2));

            // Check if response was blocked
            const candidate = response.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY') {
                text = "I apologize, but I cannot process that request due to safety filters. Could you rephrase your question?";
            } else if (candidate?.finishReason === 'RECITATION') {
                text = "I apologize, but I cannot provide that specific information. Let me help you in a different way.";
            } else if (!text || text.trim() === '') {
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
        await Promise.all([
            chatRepository.saveMessage(sessionId, 'user', [{ text: cleanMessage }], { userId: user.uid, agentId }),
            chatRepository.saveMessage(sessionId, 'model', [{ text: text }], { userId: user.uid, agentId })
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

    } catch (error) {
        console.error("🔴 [Backend] AI Controller Error:", error);
        console.error("🔴 [Backend] Error stack:", (error as Error).stack);
        res.status(500).send('Internal Server Error');
    }
};

export const reindexListings = async (req: Request, res: Response) => {
    try {
        console.log("🔄 [Reindex] Starting manual reindex...");
        const { upsertListing, initializeCollection } = await import('../services/typesense.service');
        const { listingRepository } = await import('../repositories/listing.repository');

        await initializeCollection();
        const { initializeUserCollection } = await import('../services/typesense.service');
        await initializeUserCollection();

        const domainFilter = typeof req.query.domain === 'string' ? req.query.domain : undefined;
        console.log(`[Reindex] Domain filter: ${domainFilter || 'ALL'}`);

        const allItems = await listingRepository.getAllActive(domainFilter ? { domain: domainFilter } : undefined); // Get filtered or ALL items
        console.log(`🔄 [Reindex] Found ${allItems.length} items in Firestore.`);

        let count = 0;
        for (const item of allItems) {
            const itemAny = item as any;
            const searchRecord = {
                id: item.id,
                title: item.title,
                description: item.description,
                price: item.price,
                domain: item.domain,
                category: itemAny.category,
                subCategory: itemAny.subCategory || itemAny.rentalType || itemAny.type || (itemAny.domain === 'Cars' && itemAny.category?.toLowerCase() === 'rental' ? 'rental' : null), // Fallback for legacy data
                location: item.location,
                type: itemAny.type || itemAny.rentalType,
                rating: item.rating,
                ownerId: itemAny.ownerUid || 'system',
                metadata: {
                    amenities: itemAny.amenities,
                    imageUrl: item.imageUrl,
                    bedrooms: itemAny.bedrooms || itemAny.metadata?.bedrooms,
                    bathrooms: itemAny.bathrooms || itemAny.metadata?.bathrooms,
                    area: itemAny.squareMeters || itemAny.area || itemAny.metadata?.area
                },
                createdAt: Math.floor(Date.now() / 1000)
            };

            await upsertListing(searchRecord);
            count++;
        }

        console.log(`✅ [Reindex] Successfully indexed ${count} items.`);
        res.json({ success: true, count });

    } catch (error) {
        console.error("🔴 [Reindex] Error:", error);
        res.status(500).send('Reindex Failed');
    }
};
