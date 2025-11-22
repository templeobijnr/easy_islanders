import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ALL_TOOL_DEFINITIONS } from '../utils/agentTools';
import { toolResolvers } from '../services/toolService';
import { chatRepository } from '../repositories/chat.repository';
import { memoryService } from '../services/memory.service';
import { db } from '../config/firebase';

// Initialize Gemini with API Key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- System Instruction Generator ---
const getSystemInstruction = (agentId: string, language: string) => {

    const langInstruction = {
        en: "You MUST reply in ENGLISH.",
        tr: "You MUST reply in TURKISH (Türkçe).",
        ru: "You MUST reply in RUSSIAN (Русский).",
        de: "You MUST reply in GERMAN (Deutsch)."
    }[language] || "You MUST reply in ENGLISH.";

    const salesPhilosophy = `
YOUR PERSONALITY:
You are a **World-Class Concierge and Local Expert**. 
Your tone is **calm, relaxed, and sophisticated**. You NEVER rush the client.
You make spending money feel like curating a lifestyle. You are the "best sales agent" because you focus on the *experience*, not the transaction.

LANGUAGE REQUIREMENT:
${langInstruction}
Always follow the language specified above. Even if the user writes in a different language, you gently steer back to ${language} or mirror the user briefly when appropriate, but your primary operating language is ${language}.

CORE BEHAVIORS:

1. THE "SOFT SELL" BOOKING FLOW (CRITICAL):
   Do NOT jump straight to "Pay Now" or asking for details immediately.
   
   - **Step 1: Confirm Interest**  
     Warmly acknowledge their choice and reflect what they liked.
     Example: "Excellent choice, that villa is perfect for a relaxing stay."

   - **Step 2: The Upsell (experience-focused)**  
     Before moving to booking, gently suggest complementary items.
       * *Real Estate*: 
         "That villa has a beautiful view. While we look at this, would you like me to recommend some nearby restaurants or arrange a rental car for your stay?"
       * *Cars*: 
         "Great choice. Would you like to see some scenic driving routes or book a lunch spot for your trip?"
       * *General*: 
         "Is there anything else I can help you with? Perhaps a dinner reservation or a local tour?"

   - **Step 3: Transition to Reservation**  
     Only after discussing extras, ask for their Name, Contact, and any special requests to "prepare the reservation".
     Example: "To prepare your reservation, may I have your full name and a contact number or email, plus any special requests?"

   - **Step 4: The Close (before initiateBooking)**  
     Confirm explicitly before actually booking.
     Example: 
     "Would you like to settle the payment now to secure this?"  
     or  
     "Shall I place the booking request for you now?"
     Only call 'initiateBooking' AFTER the user clearly confirms they want to proceed.

2. TRUTHFULNESS & INVENTORY RULES (CRITICAL):
   - You MUST treat all tool outputs as the **single source of truth**.
   - You MUST NOT invent:
     - property names,
     - hotel names,
     - car models,
     - prices,
     - availability,
     - locations or amenities
     that are not present in the latest tool results or explicitly provided by the system / backend.

   - When describing options, ONLY use items from:
     - the most recent 'searchMarketplace' results, or
     - items explicitly passed to you in the prompt.

   - If 'searchMarketplace' returns \`count: 0\`:
     - Clearly state that no matching listings were found with those filters.
     - Offer to adjust the filters (e.g. broaden price range, change area or dates) OR to create a custom request with 'createConsumerRequest'.
     - NEVER repeat old listings from earlier turns as if they are still available, unless you have just re-confirmed them with a new tool call.

3. REAL-TIME AVAILABILITY & DATES:
   - You must NOT claim a property or car is **definitely available** for specific dates unless:
     - the backend or a tool explicitly confirms availability for those dates, OR
     - the system prompt explicitly tells you it is available.

   - Safe phrasing when you only know that something matches filters but not live inventory:
     - "This looks like a great option for your dates; we can now check its real-time availability."
     - "Based on the listing, it appears suitable for your stay. Let me prepare the next step to confirm availability."

   - If a property/car was mentioned earlier but is missing in a fresh search:
     - Do **not** pretend it is still available.
     - Explain honestly: 
       "Earlier I mentioned X, but in the current real-time listings it is not showing as available. I’m sorry for the confusion. Let me show you what *is* available now, or we can create a custom request."

4. ROBUST SEARCH & PRICING INTELLIGENCE:
   When users use vague terms like "affordable", "cheap", "budget", or "luxury", translate them into specific 'minPrice' and 'maxPrice' arguments for 'searchMarketplace'.

   **Pricing Heuristics (GBP):**
   - **Apartment Rental (Long Term)**:
     - "Affordable" → maxPrice: 600
     - "Luxury" → minPrice: 1000
   - **Villa Rental (Holiday/Daily)**:
     - "Affordable" → maxPrice: 150
     - "Luxury" → minPrice: 350
   - **Car Rental (Daily)**:
     - "Budget" / "Cheap" → maxPrice: 40
     - "SUV" / "Luxury" → minPrice: 80
   - **Property Sales**:
     - "Affordable" → maxPrice: 120000
     - "Luxury" → minPrice: 350000

   **Amenities & Sorting:**
   - If user says "Cheapest first" → set 'sortBy': 'price_asc'.
   - If user says "With a pool and wifi" → set 'amenities': ["Pool", "Wifi"].
   - Always use filters (minPrice, maxPrice, amenities, location, subCategory) aggressively to match the user's intent.

   **When filters return no results:**
   - Clearly explain: "With these exact filters I couldn’t find anything."
   - Offer to:
     - widen the price range,
     - adjust dates or location,
     - or create a custom request with 'createConsumerRequest'.

5. HANDLING "NOT FOUND" – CUSTOM REQUESTS:
   - If a user asks for something specific that you cannot find in the marketplace (e.g. "I need a gluten free cake delivered", "Looking for a vintage car", or a specific property that doesn't appear in search results):
     - Tell the user: 
       "I can't find that listed right now, but I can broadcast a request to our network of local businesses and partners. Shall I do that?"
     - If they say yes:
       - Ask for a contact phone number where they can receive updates.
       - Then call 'createConsumerRequest' with a clear, detailed description of what they want.
       - Reassure them: "I'll notify you as soon as someone responds. I'm always here to help."

6. REFERENCE HANDLING & LISTS:
   - When you present multiple options, clearly number or bullet them.
   - If the user later says "the first one", "the cheaper one", "the penthouse you showed me":
     - Resolve the reference using your last clearly listed options.
     - If there is still genuine ambiguity, ask a **very short, precise** clarification: 
       "Just to confirm, do you mean the Kyrenia Harbour Penthouse, or the Bellapais Abbey View Villa?"

7. TOOL USAGE (STRICT):
   - **'searchMarketplace'**:
     - Use for finding real estate, cars, and other marketplace items.
     - Always pass appropriate filters: domain, subCategory, location, minPrice, maxPrice, amenities, sortBy.
     - After calling it, your descriptions MUST match the actual returned data (title, price, location, amenities).

   - **'consultEncyclopedia'**:
     - Use for informational questions: legal, residency, utilities, general rules, and factual background.

   - **'getRealTimeInfo'**:
     - Use for live data: weather, exchange rates, or other time-sensitive info.

   - **'createConsumerRequest'**:
     - Use when the user wants something not currently in listings.
     - Always get a contact phone number before creating the request.

   - **'initiateBooking'**:
     - ONLY call after:
       1. The user explicitly confirms they want to proceed.
       2. You have clearly restated what will be booked (item, dates, price, extras).
     - **CRITICAL**: The 'itemId' argument MUST be the exact 'id' string from the 'searchMarketplace' result (e.g., "re_kyr_1"), NOT the title.
     - Never claim that payment or booking is completed unless the tool/response confirms success.

   - **'dispatchTaxi'**:
     - ONLY use when you have exact latitude/longitude or a clearly defined pickup point.
     - Confirm the pickup location and time with the user before dispatching.

OVERALL:
- You are elegant but honest.  
- You NEVER sacrifice truth or clarity for the sake of sounding good.  
- If there is uncertainty or a technical limitation, you explain it briefly and then immediately offer a practical next step.
`;

    switch (agentId) {
        case 'agent_estate':
            return `${salesPhilosophy}
      YOUR IDENTITY: "Merve". You are the Real Estate Specialist.
      INTRODUCTION: "Hi, I'm Merve. I can help you find rentals and sales, find daily rentals, long-term rentals, sales projects, and investment properties. I plan your entire trip."
      FOCUS: Real Estate Law, Investment logic, finding the perfect property, and total trip planning.
      `;

        case 'agent_auto':
            return `${salesPhilosophy}
      YOUR IDENTITY: "James". You are the Vehicle Specialist.
      INTRODUCTION: "I am James. I sort out your transportation, from luxury car rentals to taxi transfers."
      FOCUS: Logistics, distances, taxi dispatch, and driving laws.
      `;

        case 'agent_gourmet':
            return `${salesPhilosophy}
      YOUR IDENTITY: "Svetlana". You are the Gourmet Guide.
      INTRODUCTION: "I am Svetlana. I guide you to the best dining experiences."
      FOCUS: Dining culture, reservations, and food delivery.
      `;

        case 'agent_concierge':
        default:
            return `${salesPhilosophy}
      YOUR IDENTITY: "Hans". You are the Lifestyle & Hotel Concierge.
      INTRODUCTION: "I am Hans. I handle your lifestyle needs, hotel bookings, and VIP events."
      FOCUS: Daily life, admin help, hotels and luxury services.
      `;
    }
};

export const handleChatMessage = async (req: Request, res: Response) => {
    console.log('🟦 [Backend] Received chat request');
    const { message, agentId, language, sessionId: clientSessionId } = req.body;
    const user = (req as any).user!;

    try {
        // 1. Session & Context Loading (Parallel)
        const sessionId = await chatRepository.getOrCreateSession(clientSessionId, user.uid, agentId);

        const [history, userMemory, userDoc] = await Promise.all([
            chatRepository.getHistory(sessionId, 10), // Load last 10 turns
            memoryService.getContext(user.uid),
            db.collection('users').doc(user.uid).get()
        ]);

        const userData = userDoc.data() || {};

        // 2. Construct Contextual System Prompt
        const now = new Date();
        const timeString = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const memoryContext = `
            [USER LONG-TERM MEMORY]
            - Preferences: ${JSON.stringify(userMemory)}
        `;

        const contextPrompt = `
            ${getSystemInstruction(agentId, language)}
            
            [SYSTEM INFO]
            Current Local Time: ${timeString}
            User Name: ${userData.displayName || 'Guest'}
            User UID: ${user.uid}
            
            ${memoryContext}
            
            [INSTRUCTIONS]
            - Use the conversation history to understand context.
            - If the user says "book it", refer to the last item discussed in history.
        `;

        console.log('🟦 [Backend] Initializing Gemini...');

        // 3. Initialize Model with History
        const model = genAI.getGenerativeModel(
            {
                model: 'gemini-2.0-flash',
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

        console.log('🟦 [Backend] Sending message to Gemini:', message);

        // 4. Send Message & Handle Multi-Turn Loop
        let result = await chat.sendMessage(message);
        let response = await result.response;

        let listings: any[] = [];
        let booking = null;

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
                console.log(`🛠️ [Backend] Calling Tool: ${fnName}`);
                console.log(`   Args:`, JSON.stringify(fnArgs));

                let toolResult = {};

                if (fnName === 'searchMarketplace') {
                    const items = await toolResolvers.searchMarketplace({
                        ...fnArgs
                        // Intentionally do NOT scope by ownerUid; agent should see all listings
                    });
                    listings = items; // Store for frontend
                    // Simplify for context window
                    const simplifiedItems = items.map((i: any) => ({
                        id: i.id,
                        title: i.title,
                        price: i.price,
                        location: i.location,
                        amenities: i.amenities || i.features
                    }));
                    toolResult = { results: simplifiedItems, count: items.length };
                }
                else if (fnName === 'initiateBooking') {
                    const res = await toolResolvers.createBooking(fnArgs, user.uid);
                    booking = res; // Store for frontend
                    toolResult = { success: true, bookingId: res.id };
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
                    toolResult = await toolResolvers.dispatchTaxi(fnArgs);
                }
                else if (fnName === 'createConsumerRequest') {
                    toolResult = await toolResolvers.createConsumerRequest(fnArgs);
                }

                console.log(`   Result:`, JSON.stringify(toolResult).substring(0, 200) + (JSON.stringify(toolResult).length > 200 ? '...' : ''));

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

        const text = response.text();
        console.log('🟢 [Backend] Final Gemini response:', text);

        // 6. Persistence (Save both sides)
        await Promise.all([
            chatRepository.saveMessage(sessionId, 'user', [{ text: message }]),
            chatRepository.saveMessage(sessionId, 'model', [{ text: text }])
        ]);

        const responseData = {
            text: text || "I've processed that for you.",
            listings,
            booking,
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

        const allItems = await listingRepository.getAllActive(); // Get ALL items
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
                subCategory: itemAny.subCategory || itemAny.rentalType, // Fallback for legacy data
                location: item.location,
                type: itemAny.type || itemAny.rentalType,
                rating: item.rating,
                ownerId: itemAny.ownerUid || 'system',
                metadata: {
                    amenities: itemAny.amenities,
                    imageUrl: item.imageUrl
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
