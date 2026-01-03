import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { GoogleGenerativeAI, FunctionCallingMode } from "@google/generative-ai";
import { ALL_TOOL_DEFINITIONS } from "../utils/tools";
import { toolResolvers } from "../services/agent/tool.service";
import { chatRepository } from "../repositories/chat.repository";
import { memoryService } from "../services/memory.service";
import { db } from "../config/firebase";
import { getLiteContext } from "../services/user.service";
import { transactionRepository } from "../repositories/transaction.repository";
import { createHeldBooking, resolveBusinessId } from "../services/tools/booking-ledger.tools";
import { getErrorMessage } from "../utils/errors";

// Initialize Gemini lazily
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
};

import { getSystemInstruction } from "../utils/systemPrompts";

// ─────────────────────────────────────────────────────────────────────────────
// TOOL ENFORCEMENT: Intent Detection + Repair System
// ─────────────────────────────────────────────────────────────────────────────

interface DetectedIntent {
  requiresTool: boolean;
  suggestedTool: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects if a user message likely requires a tool call.
 * Used to trigger repair loop if Gemini fails to call a tool.
 */
function detectActionIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();

  // Stay/Property keywords → searchStays
  const stayPatterns = [
    /\b(rent|rental|rentals|villa|villas|apartment|apartments)\b/,
    /\b(stay|stays|accommodation|daily rental|short-term|long-term)\b/,
    /\b(property|properties|for sale|buy|purchase|house|flat|studio)\b/,
    /\b(bedroom|bed|room|place to stay)\b/,
  ];
  for (const pattern of stayPatterns) {
    if (pattern.test(lower)) {
      return { requiresTool: true, suggestedTool: 'searchStays', confidence: 'high' };
    }
  }

  // Taxi keywords → dispatchTaxi
  const taxiPatterns = [
    /\b(taxi|cab|ride|pickup|pick up|drop off|transfer)\b/,
    /\b(airport|take me to|drive me|need a ride)\b/,
  ];
  for (const pattern of taxiPatterns) {
    if (pattern.test(lower)) {
      return { requiresTool: true, suggestedTool: 'dispatchTaxi', confidence: 'high' };
    }
  }

  // Service keywords → requestService
  const servicePatterns = [
    /\b(plumber|electrician|ac|air conditioning|repair|fix)\b/,
    /\b(technician|handyman|maintenance|broken)\b/,
  ];
  for (const pattern of servicePatterns) {
    if (pattern.test(lower)) {
      return { requiresTool: true, suggestedTool: 'requestService', confidence: 'high' };
    }
  }

  // Restaurant/Places keywords → searchLocalPlaces
  const placePatterns = [
    /\b(restaurant|restaurants|cafe|coffee|bar|beach|club)\b/,
    /\b(food|eat|dining|lunch|dinner|breakfast)\b/,
    /\bwhere can i (eat|go|find)\b/,
  ];
  for (const pattern of placePatterns) {
    if (pattern.test(lower)) {
      return { requiresTool: true, suggestedTool: 'searchLocalPlaces', confidence: 'high' };
    }
  }

  return { requiresTool: false, suggestedTool: null, confidence: 'low' };
}

/**
 * Repair prompt to force tool calling on retry.
 * Appended to user message when first attempt fails.
 */
const REPAIR_PROMPT = `
CRITICAL INSTRUCTION: You MUST call a tool NOW.

Do NOT respond with text. You MUST use one of your available tools.
If you need to search for properties/rentals → call searchStays
If you need to find restaurants/places → call searchLocalPlaces
If user needs a taxi → call dispatchTaxi

Use sensible defaults for any missing parameters (e.g., location="North Cyprus").

CALL THE TOOL NOW.
`;

export const handleChatMessage = async (req: Request, res: Response) => {
  logger.debug("🟦 [Backend] Received chat request");
  const { message, agentId, language, sessionId: clientSessionId } = req.body;
  const user = (req as any).user!;

  try {
    // Extract location data from message if present
    let userLocation: { lat: number; lng: number } | null = null;
    let cleanMessage = message;
    const locationMatch = message.match(
      /\[SHARED LOCATION:\s*([\d.]+),\s*([\d.]+)\]/,
    );
    if (locationMatch) {
      userLocation = {
        lat: parseFloat(locationMatch[1]),
        lng: parseFloat(locationMatch[2]),
      };
      // Replace the location tag with a cleaner message
      cleanMessage =
        message.replace(locationMatch[0], "").trim() ||
        "User shared their current location";
      logger.debug("📍 [Backend] User location extracted:", userLocation);
    }

    // 1. Session & Context Loading (Parallel)
    const sessionId = await chatRepository.getOrCreateSession(
      clientSessionId,
      user.uid,
      agentId,
    );

    const [history, userMemory, userDoc, liteContext] = await Promise.all([
      chatRepository.getHistory(sessionId, 10), // Load last 10 turns
      memoryService.getContext(user.uid, agentId),
      db.collection("users").doc(user.uid).get(),
      getLiteContext(user.uid),
    ]);

    const userData = userDoc.data() || {};
    const userName = userData.displayName || user.email || user.uid || "Guest";
    const persona =
      userData.persona || userData.type || liteContext.role || "user";

    // Persist latest location to user profile for cross-turn usage
    if (userLocation) {
      try {
        await db
          .collection("users")
          .doc(user.uid)
          .set(
            {
              lastLocation: {
                lat: userLocation.lat,
                lng: userLocation.lng,
                updatedAt: new Date().toISOString(),
              },
            },
            { merge: true },
          );
      } catch (locErr: unknown) {
        console.error(
          "⚠️ [Backend] Failed to persist lastLocation:",
          getErrorMessage(locErr) || locErr,
        );
      }
    }

    // Effective location = current turn location, or last known one from profile
    const lastLocation = (userData as any).lastLocation as
      | { lat: number; lng: number; updatedAt?: string }
      | undefined;
    const effectiveLocation = userLocation || lastLocation || null;

    // ════════════════════════════════════════════════════════════════════════
    // CONFIRMATION GATE - Check for pending action BEFORE LLM processing
    // ════════════════════════════════════════════════════════════════════════
    const pendingAction = await chatRepository.getPendingAction(
      sessionId,
      user.uid,
    );

    if (pendingAction) {
      const normalizedMessage = cleanMessage.toLowerCase().trim();
      const isYes = [
        "yes",
        "y",
        "confirm",
        "ok",
        "okay",
        "yep",
        "sure",
        "evet",
      ].includes(normalizedMessage);
      const isNo = [
        "no",
        "n",
        "cancel",
        "stop",
        "nevermind",
        "hayır",
        "iptal",
      ].includes(normalizedMessage);

      // Fast expiry check with 30s buffer (UX optimization - ledger is still authority)
      // Don't attempt confirm if < 30s remaining to avoid race conditions
      const EXPIRY_BUFFER_MS = 30 * 1000;
      const timeRemaining = pendingAction.holdExpiresAt.getTime() - Date.now();
      const isExpiredLocally = timeRemaining < EXPIRY_BUFFER_MS;

      if (isYes) {
        // Only handle confirm_transaction here - other kinds handled by orchestrator
        if (
          pendingAction.kind !== "confirm_transaction" ||
          !pendingAction.txId ||
          !pendingAction.businessId
        ) {
          // Let orchestrator handle other kinds (confirm_order, confirm_service)
          // Fall through to normal processing - orchestrator will handle
        } else {
          // Use deterministic idempotency key: confirm:{txId}:{userId}
          const idempotencyKey = `confirm:${pendingAction.txId}:${user.uid}`;
          const confirmResult = await transactionRepository.confirmTransaction(
            {
              transactionId: pendingAction.txId,
              businessId: pendingAction.businessId,
              actorType: "user",
              actorId: user.uid,
            },
            idempotencyKey,
          );

          await chatRepository.clearPendingAction(sessionId);

          if (!confirmResult.success) {
            if (confirmResult.errorCode === "HOLD_EXPIRED") {
              await chatRepository.saveMessage(
                sessionId,
                "user",
                [{ text: cleanMessage }],
                { userId: user.uid, agentId },
              );
              await chatRepository.saveMessage(
                sessionId,
                "model",
                [
                  {
                    text: "That reservation expired. Would you like me to try booking again?",
                  },
                ],
                { userId: user.uid, agentId },
              );
              res.json({
                text: "⏰ That reservation expired. Would you like me to try booking again?",
                sessionId,
                expired: true,
              });
              return;
            }
            res.json({
              text: `Unable to confirm: ${confirmResult.error}`,
              sessionId,
              error: true,
            });
            return;
          }

          await chatRepository.saveMessage(
            sessionId,
            "user",
            [{ text: cleanMessage }],
            { userId: user.uid, agentId },
          );
          const confirmText = `✅ Confirmed! Your confirmation code is **${confirmResult.confirmationCode}**. You'll receive a message shortly.`;
          await chatRepository.saveMessage(
            sessionId,
            "model",
            [{ text: confirmText }],
            { userId: user.uid, agentId },
          );

          res.json({
            text: confirmText,
            sessionId,
            booking: {
              transactionId: pendingAction.txId,
              confirmationCode: confirmResult.confirmationCode,
            },
          });
          return;
        }
      }

      if (isNo) {
        // Only handle confirm_transaction here
        if (
          pendingAction.kind === "confirm_transaction" &&
          pendingAction.txId &&
          pendingAction.businessId
        ) {
          // Use deterministic idempotency key: release:{txId}:{userId}
          const idempotencyKey = `release:${pendingAction.txId}:${user.uid}`;
          await transactionRepository.releaseHold(
            pendingAction.businessId,
            pendingAction.txId,
            "User cancelled",
            idempotencyKey,
          );
          await chatRepository.clearPendingAction(sessionId);

          await chatRepository.saveMessage(
            sessionId,
            "user",
            [{ text: cleanMessage }],
            { userId: user.uid, agentId },
          );
          const cancelText =
            "Okay, I've cancelled that reservation. Is there anything else I can help you with?";
          await chatRepository.saveMessage(
            sessionId,
            "model",
            [{ text: cancelText }],
            { userId: user.uid, agentId },
          );

          res.json({
            text: cancelText,
            sessionId,
            cancelled: true,
          });
          return;
        }
        // Non-transaction kinds: clear and let orchestrator handle
        await chatRepository.clearPendingAction(sessionId);
      }

      // User sent something else - remind them
      // But if expired, clear and let them continue
      if (isExpiredLocally) {
        await chatRepository.clearPendingAction(sessionId);
        // Fall through to normal LLM processing
      } else {
        await chatRepository.saveMessage(
          sessionId,
          "user",
          [{ text: cleanMessage }],
          { userId: user.uid, agentId },
        );
        const reminderText = `I'm still waiting for your confirmation:\n\n> ${pendingAction.summary}\n\nPlease reply **YES** to confirm or **NO** to cancel.`;
        await chatRepository.saveMessage(
          sessionId,
          "model",
          [{ text: reminderText }],
          { userId: user.uid, agentId },
        );

        res.json({
          text: reminderText,
          sessionId,
          awaitingConfirmation: true,
        });
        return;
      }
    }
    // ════════════════════════════════════════════════════════════════════════
    // END CONFIRMATION GATE
    // ════════════════════════════════════════════════════════════════════════

    // 2. Construct Contextual System Prompt
    const now = new Date();
    const timeString = now.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const memoryContext = `
            [USER LONG-TERM MEMORY]
            - Preferences: ${JSON.stringify(userMemory)}
        `;

    const liteFacts =
      liteContext.facts && liteContext.facts.length > 0
        ? liteContext.facts.join("; ")
        : "None";
    const liteProbe = liteContext.missing?.length
      ? `We are missing: ${liteContext.missing.join(", ")}`
      : "Profile complete.";
    const liteContextBlock = `
            [USER PROFILE LITE]
            - Facts: ${liteFacts}
            - Missing Info: ${liteProbe}
            - Persona/Role: ${persona}
        `;

    const locationContext = effectiveLocation
      ? `
            [USER CURRENT LOCATION]
            - GPS Coordinates: ${effectiveLocation.lat}, ${effectiveLocation.lng}
            - When dispatching taxis or providing navigation, use pickupLat=${effectiveLocation.lat} and pickupLng=${effectiveLocation.lng}
            - User's pickup location is "Current location" with these exact coordinates
        `
      : "";

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
            ${userLocation ? `- IMPORTANT: User has shared their current location (${userLocation.lat}, ${userLocation.lng}). When calling dispatchTaxi, include pickupLat and pickupLng with these exact values.` : ""}
        `;

    logger.debug("🟦 [Backend] Initializing Gemini...");

    // 3. Initialize Model with History
    // Use v1beta API for experimental models with tool support
    // Use stable Gemini 2.5 Flash - NOT experimental models
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    logger.debug(`🤖 Using model: ${modelName}`);
    logger.debug(`📝 Raw env GEMINI_MODEL: ${process.env.GEMINI_MODEL}`);

    // DEBUG: Log all tool names to verify searchMarketplace is NOT in definitions
    const toolNames = ALL_TOOL_DEFINITIONS.map((t: any) => t.name);
    logger.info(`🔧 [DEBUG] Tool definitions (${toolNames.length}): ${toolNames.join(', ')}`);
    if (toolNames.includes('searchMarketplace')) {
      logger.error(`🚨 [CRITICAL] searchMarketplace is STILL in tool definitions!`);
    }

    const model = getGenAI().getGenerativeModel(
      {
        model: modelName,
        systemInstruction: contextPrompt,
        tools: [{ functionDeclarations: ALL_TOOL_DEFINITIONS }],
        toolConfig: {
          functionCallingConfig: {
            // AUTO = model decides when tools are needed (correct for conversational + action intents)
            // ANY = model MUST call a tool (only for pure action intents - causes loops on "hello")
            mode: FunctionCallingMode.AUTO,
          },
        },
      },
      { apiVersion: "v1beta" },
    );

    // Ensure history starts with a user message
    let validHistory = history.map((h) => ({
      role: h.role,
      parts: h.parts,
    }));

    if (validHistory.length > 0 && validHistory[0].role !== "user") {
      validHistory = validHistory.slice(1);
    }

    const chat = model.startChat({
      history: validHistory,
    });

    logger.debug("🟦 [Backend] Sending message to Gemini:", cleanMessage);

    // 4. Send Message & Handle Multi-Turn Loop
    let result = await chat.sendMessage(cleanMessage);
    let response = await result.response;

    let listings: any[] = [];
    let booking = null;
    let payment = null;
    let viewingRequest = null;
    let mapLocation = null;
    let taxiRequestId: string | null = null;

    // Loop while there are function calls
    let functionCalls = response.functionCalls();

    // ─────────────────────────────────────────────────────────────────────────
    // TOOL ENFORCEMENT: Retry with repair prompt if intent detected but no tool called
    // ─────────────────────────────────────────────────────────────────────────
    const detectedIntent = detectActionIntent(cleanMessage);

    if (detectedIntent.requiresTool && (!functionCalls || functionCalls.length === 0)) {
      logger.warn(
        `⚠️ [Enforcement] Tool required but none called. Intent: ${detectedIntent.suggestedTool} (${detectedIntent.confidence}). Retrying...`
      );

      // Retry with repair prompt appended
      const repairMessage = `${cleanMessage}\n\n${REPAIR_PROMPT}\nSuggested tool to use: ${detectedIntent.suggestedTool}`;
      result = await chat.sendMessage(repairMessage);
      response = await result.response;
      functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        logger.info(`✅ [Enforcement] Retry successful - tool called: ${functionCalls[0].name}`);
      } else {
        logger.warn(`❌ [Enforcement] Retry failed - no tool called. Falling back to text response.`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Circuit breaker: prevent infinite tool loops (max 5 iterations per request)
    const MAX_TOOL_ITERATIONS = 5;
    let toolIterationCount = 0;

    while (functionCalls && functionCalls.length > 0) {
      // Circuit breaker check
      toolIterationCount++;
      if (toolIterationCount > MAX_TOOL_ITERATIONS) {
        logger.warn(`⚠️ [CircuitBreaker] Max tool iterations (${MAX_TOOL_ITERATIONS}) exceeded. Breaking loop.`);
        break;
      }
      // Log "Thinking" if there is text accompanying the tool call
      try {
        const thinking = response.text();
        if (thinking) {
          logger.debug("🧠 [Backend] Agent Thinking:", thinking);
        }
      } catch (e) {
        // Ignore if no text is present with the function call
      }

      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        const fnName = call.name;
        const fnArgs = call.args;
        logger.debug(
          `🛠️ [Backend] Decision: calling tool '${fnName}' with args ${JSON.stringify(fnArgs)}`,
        );

        let toolResult: any = {};

        try {
          if (
            // NOTE: searchMarketplace REMOVED - deprecated
            fnName === "searchLocalPlaces" ||
            fnName === "searchEvents" ||
            fnName === "searchStays" ||
            fnName === "searchHousingListings"
          ) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/7207ff65-c9c6-4873-a824-51b8bedf5d3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.controller.ts:579',message:'BEFORE calling search tool resolver',data:{fnName,resolverExists:!!(toolResolvers as any)[fnName],resolverType:typeof (toolResolvers as any)[fnName]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const resolver = (toolResolvers as any)[fnName];
            const items = await resolver({
              ...fnArgs,
              // Intentionally do NOT scope by ownerUid; agent should see all listings
            });
            listings = items || []; // Store for frontend
            const simplifiedItems = (items || []).map((i: any) => ({
              id: i.id,
              title: i.title,
              price: i.price,
              location: i.location,
              amenities: i.amenities || i.features,
            }));
            toolResult = {
              results: simplifiedItems,
              count: simplifiedItems.length,
            };
          } else if (fnName === "initiateBooking") {
            // Use transaction ledger: draft -> hold -> await confirmation
            const itemId = (fnArgs as any).itemId;

            // Fail closed: require explicit businessId resolution
            const businessResult = await resolveBusinessId(itemId);
            if (!businessResult.success) {
              toolResult = {
                success: false,
                error: businessResult.error,
                errorCode: businessResult.errorCode,
              };
            } else {
              const holdResult = await createHeldBooking({
                businessId: businessResult.businessId!,
                offeringId: itemId,
                offeringName: (fnArgs as any).itemTitle || "Booking",
                channel: "app_chat",
                actor: { userId: user.uid, name: userName },
                date:
                  (fnArgs as any).date ||
                  (fnArgs as any).checkInDate ||
                  new Date().toISOString().split("T")[0],
                time: (fnArgs as any).time || "12:00",
                partySize: (fnArgs as any).guests || 1,
                notes: (fnArgs as any).specialRequests,
                idempotencyKey: `booking:${sessionId}:${itemId}:${(fnArgs as any).date || "now"}`,
              });

              if (!holdResult.success) {
                toolResult = {
                  success: false,
                  error: holdResult.error,
                  unavailable: holdResult.errorCode === "RESOURCE_UNAVAILABLE",
                };
              } else {
                // Store pending action for confirmation gate
                await chatRepository.setPendingAction(
                  sessionId,
                  holdResult.pendingAction!,
                );

                booking = {
                  transactionId: holdResult.txId,
                  awaitingConfirmation: true,
                  holdExpiresAt: holdResult.holdExpiresAt,
                };
                toolResult = {
                  success: true,
                  awaitingConfirmation: true,
                  confirmationPrompt: holdResult.confirmationPrompt,
                };
              }
            }
          } else if (fnName === "createPaymentIntent") {
            const res = await toolResolvers.createPaymentIntent(
              fnArgs as any,
              user.uid,
            );
            payment = res.payment;
            toolResult = res;
          } else if (fnName === "scheduleViewing") {
            const res = await toolResolvers.scheduleViewing(
              fnArgs as any,
              user.uid,
            );
            viewingRequest = res;
            toolResult = res;
          } else if (fnName === "consultEncyclopedia") {
            toolResult = await toolResolvers.consultEncyclopedia(fnArgs as any);
          } else if (fnName === "getRealTimeInfo") {
            toolResult = await toolResolvers.getRealTimeInfo(fnArgs as any);
          } else if (fnName === "sendWhatsAppMessage") {
            toolResult = await toolResolvers.sendWhatsAppMessage(fnArgs as any);
          } else if (fnName === "dispatchTaxi" || fnName === "requestTaxi") {
            // Auto-inject user location (current or last known) if available
            const enrichedArgs: any = { ...fnArgs };
            const locationForTaxi = effectiveLocation || userLocation;

            if (
              locationForTaxi &&
              !enrichedArgs.pickupLat &&
              !enrichedArgs.pickupLng
            ) {
              enrichedArgs.pickupLat = locationForTaxi.lat;
              enrichedArgs.pickupLng = locationForTaxi.lng;
              logger.debug(
                `📍 [Backend] Auto-injected user location into ${fnName}:`,
                locationForTaxi,
              );
            }

            // If pickupLocation is missing or too generic, label it clearly for the driver
            if (
              !enrichedArgs.pickupLocation ||
              /^current location$/i.test(enrichedArgs.pickupLocation)
            ) {
              enrichedArgs.pickupLocation = "Current location (see map link)";
            }

            const resolver =
              fnName === "dispatchTaxi"
                ? toolResolvers.dispatchTaxi
                : (toolResolvers as any).requestTaxi;
            toolResult = await resolver(enrichedArgs, user.uid, sessionId);

            // Capture requestId for frontend tracking
            if (toolResult.success && toolResult.requestId) {
              taxiRequestId = toolResult.requestId;
              logger.debug(
                `🚕 [Backend] Captured taxi requestId: ${taxiRequestId}`,
              );
            }
          } else if (fnName === "orderHouseholdSupplies") {
            toolResult = await (toolResolvers as any).orderHouseholdSupplies(
              fnArgs as any,
              user.uid,
            );
          } else if (fnName === "requestService") {
            toolResult = await (toolResolvers as any).requestService(
              fnArgs as any,
              user.uid,
            );
          } else if (fnName === "createConsumerRequest") {
            toolResult = await toolResolvers.createConsumerRequest(
              fnArgs as any,
            );
          } else if (fnName === "showMap") {
            toolResult = await (toolResolvers as any).showMap(fnArgs as any);
            // Store map location for frontend response
            mapLocation = toolResult;
          } else {
            const resolver = (toolResolvers as any)[fnName];
            if (!resolver) {
              throw new Error(`Tool not implemented: ${fnName}`);
            }
            // Pass user uid when resolver expects it (second argument)
            toolResult =
              resolver.length >= 2
                ? await resolver(fnArgs, user.uid)
                : await resolver(fnArgs);
          }

          logger.debug(
            `   Result:`,
            JSON.stringify(toolResult).substring(0, 200) +
            (JSON.stringify(toolResult).length > 200 ? "..." : ""),
          );
        } catch (toolErr: unknown) {
          const errorMessage = getErrorMessage(toolErr) || "Unknown error occurred";
          console.error(`🔴 [Backend] AI Controller Error: ${errorMessage}`);
          if (toolErr instanceof Error && toolErr.stack) {
            console.error(`🔴 [Backend] Error stack:`, toolErr.stack);
          }

          // Return error details to the AI agent so it can handle it gracefully
          toolResult = {
            error: true,
            message: errorMessage,
            toolName: fnName,
          };
        }

        functionResponseParts.push({
          functionResponse: {
            name: fnName,
            response: toolResult,
          },
        });
      }

      // Send tool outputs back to Gemini
      logger.debug("🟦 [Backend] Sending tool outputs back to Gemini...");
      result = await chat.sendMessage(functionResponseParts);
      response = await result.response;
      functionCalls = response.functionCalls();
    }
    if (!functionCalls || functionCalls.length === 0) {
      console.warn("⚠️ [Backend] No tool calls returned for this turn.");
    }

    // Extract text, handle empty responses
    let text = "";
    try {
      text = response.text();
      logger.debug("🟢 [Backend] Final Gemini response:", text);
    } catch (textError: unknown) {
      console.error(
        "⚠️ [Backend] Error getting response text:",
        getErrorMessage(textError),
      );

      // Log raw response for debugging
      logger.debug(
        "🔍 [Backend] Raw response candidates:",
        JSON.stringify(
          {
            candidates: response.candidates?.map((c: any) => ({
              finishReason: c.finishReason,
              safetyRatings: c.safetyRatings,
              content: c.content,
            })),
          },
          null,
          2,
        ),
      );

      // Check if response was blocked
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        text =
          "I apologize, but I cannot process that request due to safety filters. Could you rephrase your question?";
      } else if (candidate?.finishReason === "RECITATION") {
        text =
          "I apologize, but I cannot provide that specific information. Let me help you in a different way.";
      } else if (!text || text.trim() === "") {
        // Empty response - this might be a model issue
        text = "I understand. Let me search for available options for you.";
        console.warn(
          "⚠️ [Backend] Empty response detected, providing fallback message",
        );
      }
    }

    // If still empty after all checks, provide a default response
    if (!text || text.trim() === "") {
      text = "I've processed your request. How else can I help you?";
      console.warn("⚠️ [Backend] Final fallback used for empty response");
    }

    // 6. Persistence (Save both sides)
    const modelMessageMeta: any = { userId: user.uid, agentId };

    // Add taxi requestId to metadata for frontend tracking
    if (taxiRequestId) {
      modelMessageMeta.taxiRequestId = taxiRequestId;
    }

    await Promise.all([
      chatRepository.saveMessage(sessionId, "user", [{ text: cleanMessage }], {
        userId: user.uid,
        agentId,
      }),
      chatRepository.saveMessage(
        sessionId,
        "model",
        [{ text: text }],
        modelMessageMeta,
      ),
    ]);

    logger.debug(
      "📤 [Backend] Sending response. Has mapLocation?",
      !!mapLocation,
      mapLocation,
    );

    const responseData = {
      text: text,
      listings,
      booking,
      payment,
      viewingRequest,
      mapLocation,
      sessionId: sessionId,
    };

    res.json(responseData);
  } catch (error) {
    console.error("🔴 [Backend] AI Controller Error:", error);
    console.error("🔴 [Backend] Error stack:", (error as Error).stack);
    res.status(500).send("Internal Server Error");
  }
};

export const reindexListings = async (req: Request, res: Response) => {
  try {
    logger.debug("🔄 [Reindex] Starting manual reindex...");
    // NOTE: Use `require()` instead of dynamic `import()` to keep this code
    // compatible with Jest's default VM execution environment (no vm module flags).
    // This remains lazy-loaded (no module-scope side effects).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { upsertListing, initializeCollection, initializeUserCollection } = require("../services/typesense.service");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { listingRepository } = require("../repositories/listing.repository");

    await initializeCollection();
    await initializeUserCollection();

    const domainFilter =
      typeof req.query.domain === "string" ? req.query.domain : undefined;
    logger.debug(`[Reindex] Domain filter: ${domainFilter || "ALL"}`);

    const allItems = await listingRepository.getAllActive(
      domainFilter ? { domain: domainFilter } : undefined,
    ); // Get filtered or ALL items
    logger.debug(`🔄 [Reindex] Found ${allItems.length} items in Firestore.`);

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
        subCategory:
          itemAny.subCategory ||
          itemAny.rentalType ||
          itemAny.type ||
          (itemAny.domain === "Cars" &&
            itemAny.category?.toLowerCase() === "rental"
            ? "rental"
            : null), // Fallback for legacy data
        location: item.location,
        type: itemAny.type || itemAny.rentalType,
        rating: item.rating,
        ownerId: itemAny.ownerUid || "system",
        metadata: {
          amenities: itemAny.amenities,
          imageUrl: item.imageUrl,
          bedrooms: itemAny.bedrooms || itemAny.metadata?.bedrooms,
          bathrooms: itemAny.bathrooms || itemAny.metadata?.bathrooms,
          area: itemAny.squareMeters || itemAny.area || itemAny.metadata?.area,
        },
        createdAt: Math.floor(Date.now() / 1000),
      };

      await upsertListing(searchRecord);
      count++;
    }

    logger.debug(`✅ [Reindex] Successfully indexed ${count} items.`);
    res.json({ success: true, count });
  } catch (error) {
    console.error("🔴 [Reindex] Error:", error);
    res.status(500).send("Reindex Failed");
  }
};
