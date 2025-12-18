/**
 * Taxi Status Change Trigger
 * Fires when taxi request status changes and notifies the agent to respond
 */
import * as logger from "firebase-functions/logger";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "../config/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini lazily
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return null;
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Trigger when taxi_requests/{requestId} is updated
 * When status changes to "assigned", notify the customer via agent
 */
export const onTaxiStatusChange = onDocumentUpdated(
  {
    document: "taxi_requests/{requestId}",
    region: "europe-west1",
    secrets: ["GEMINI_API_KEY"],
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.debug("⚠️ [Taxi Trigger] Missing data");
      return;
    }

    const beforeStatus = beforeData.status;
    const afterStatus = afterData.status;

    logger.debug(
      `🔄 [Taxi Trigger] Status change: ${beforeStatus} → ${afterStatus}`,
    );

    // Only trigger when status changes from "pending" to "assigned"
    if (beforeStatus === "pending" && afterStatus === "assigned") {
      const requestId = event.params.requestId;
      const userId = afterData.userId;
      const driverName = afterData.driverName;
      const driverPhone = afterData.driverPhone;
      const vehicleType = afterData.vehicleType;
      const rating = afterData.rating;

      logger.debug(`✅ [Taxi Trigger] Driver assigned to request ${requestId}`);
      logger.debug(`   Driver: ${driverName}, Vehicle: ${vehicleType}`);

      try {
        const client = getGenAI();
        if (!client) {
          console.warn(
            "⚠️ [Taxi Trigger] GEMINI_API_KEY missing; skipping proactive message",
          );
          return;
        }
        // Find the user's active chat session
        const sessionsSnap = await db
          .collection("chat_sessions")
          .where("userId", "==", userId)
          .where("status", "==", "active")
          .orderBy("lastMessageAt", "desc")
          .limit(1)
          .get();

        if (sessionsSnap.empty) {
          logger.debug(
            `⚠️ [Taxi Trigger] No active session for user: ${userId}`,
          );
          return;
        }

        const sessionDoc = sessionsSnap.docs[0];
        const sessionId = sessionDoc.id;
        const sessionData = sessionDoc.data();

        logger.debug(`📍 [Taxi Trigger] Found session: ${sessionId}`);

        // Check if this session has a pending taxi request
        const pendingRequestId = sessionData.pendingTaxiRequestId;
        if (pendingRequestId !== requestId) {
          logger.debug(
            `⚠️ [Taxi Trigger] Session taxi request mismatch: ${pendingRequestId} !== ${requestId}`,
          );
          // Still proceed - the request belongs to this user
        }

        // Generate agent proactive response
        await generateAgentResponse(sessionId, {
          requestId,
          driverName,
          driverPhone,
          vehicleType,
          rating,
          pickupAddress: afterData.pickup?.address,
          dropoffAddress: afterData.dropoff?.address,
        });

        // Clear pending request from session
        await db.collection("chat_sessions").doc(sessionId).update({
          pendingTaxiRequestId: null,
          lastMessageAt: new Date(),
        });

        logger.debug(
          `✅ [Taxi Trigger] Agent notified for session: ${sessionId}`,
        );
      } catch (error) {
        console.error(`❌ [Taxi Trigger] Error:`, error);
      }
    }
  },
);

/**
 * Generate agent proactive response about taxi confirmation
 */
async function generateAgentResponse(
  sessionId: string,
  taxiInfo: {
    requestId: string;
    driverName?: string;
    driverPhone?: string;
    vehicleType?: string;
    rating?: number;
    pickupAddress?: string;
    dropoffAddress?: string;
  },
): Promise<void> {
  try {
    logger.debug(
      `🤖 [Agent Response] Generating response for session: ${sessionId}`,
    );

    // Verify session exists
    const sessionDoc = await db
      .collection("chat_sessions")
      .doc(sessionId)
      .get();
    if (!sessionDoc.exists) {
      throw new Error("Session not found");
    }

    // Create context for the agent
    const systemPrompt = `You are a helpful concierge assistant. A taxi that the user requested has just been confirmed.

TAXI DETAILS:
- Driver: ${taxiInfo.driverName || "Unknown"}
- Vehicle: ${taxiInfo.vehicleType || "Unknown"}
- Rating: ${taxiInfo.rating || "N/A"}/5
- Phone: ${taxiInfo.driverPhone || "N/A"}
- Pickup: ${taxiInfo.pickupAddress || "N/A"}
- Destination: ${taxiInfo.dropoffAddress || "N/A"}

Generate a friendly, enthusiastic message to inform the user that their taxi has been confirmed. Include the driver's name and key details. Keep it conversational and reassuring. Do NOT ask any questions - just inform them.`;

    const client = getGenAI();
    if (!client) {
      console.warn(
        "⚠️ [Agent Response] GEMINI_API_KEY missing; skipping proactive response",
      );
      return;
    }

    const model = client.getGenerativeModel(
      {
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
        systemInstruction: systemPrompt,
      },
      { apiVersion: "v1beta" },
    );

    const result = await model.generateContent(
      "Generate the confirmation message.",
    );
    const response = await result.response;
    const messageText = response.text();

    logger.debug(
      `💬 [Agent Response] Generated: ${messageText.substring(0, 100)}...`,
    );

    // Add agent message to chat history
    const agentMessage = {
      role: "model",
      parts: [
        {
          text: messageText,
        },
      ],
      timestamp: new Date(),
      metadata: {
        type: "taxi_confirmation",
        requestId: taxiInfo.requestId,
        driverName: taxiInfo.driverName,
        proactiveResponse: true,
      },
    };

    await db
      .collection("chat_sessions")
      .doc(sessionId)
      .collection("messages")
      .add(agentMessage);

    // Update session
    await db.collection("chat_sessions").doc(sessionId).update({
      lastMessageAt: new Date(),
      hasUnreadMessages: true,
    });

    logger.debug(`✅ [Agent Response] Message added to session: ${sessionId}`);
  } catch (error) {
    console.error(`❌ [Agent Response] Error:`, error);
    throw error;
  }
}
