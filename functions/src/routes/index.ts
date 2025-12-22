import * as logger from "firebase-functions/logger";
import { Router } from "express";
import { handleChatMessage } from "../controllers/chat.controller";
import { searchListings } from "../controllers/search.controller";
import {
  createListing,
  deleteListing,
  getListingById,
  getUserListings,
  importListingFromUrl,
  updateListing,
} from "../controllers/listing.controller";
import { getErrorMessage } from "../utils/errors";
import { importPropertyFromUrl } from "../controllers/import.controller";
import { Request, Response } from "express";
import { sendTaxiRequest } from "../services/twilio.service";
import { db } from "../config/firebase";
import { availabilityRepository } from "../repositories/availability.repository";
import { messageRepository } from "../repositories/message.repository";
import { populateDatabase } from "../controllers/populate.controller";
import { getNearbyUsers } from "../controllers/user.controller";
import { isAuthenticated } from "../middleware/auth";
import { requireBusinessMatch } from "../middleware/requireBusinessMatch";

const router = Router();

// Chat (Platform Agent) - DO NOT MODIFY
router.post("/chat/message", isAuthenticated, handleChatMessage);

// Business Chat (Business Agents) - NEW
import { handleBusinessChatMessage } from "../controllers/business-chat.controller";
router.post(
  "/business-chat/message",
  isAuthenticated,
  requireBusinessMatch,
  handleBusinessChatMessage,
);

// Search
router.post("/search", searchListings);

// Listings CRUD
router.post("/listings", isAuthenticated, createListing);
router.put("/listings/:id", isAuthenticated, updateListing);
router.delete("/listings/:id", isAuthenticated, deleteListing);
router.get("/listings", isAuthenticated, getUserListings);
router.get("/listings/:id", getListingById); // Public endpoint

// Listings Import
router.post("/listings/import", isAuthenticated, importListingFromUrl);

// Property Import (AI-powered)
router.post("/import/property", isAuthenticated, importPropertyFromUrl);

// Availability endpoints
router.get(
  "/listings/:id/availability",
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { start, end } = req.query;
    const slots = await availabilityRepository.list(
      id,
      start as string | undefined,
      end as string | undefined,
    );
    res.json(slots);
  },
);

router.post(
  "/listings/:id/availability",
  isAuthenticated,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { slotId, slot } = req.body;
    const saved = await availabilityRepository.upsert(id, slotId, slot);
    res.json(saved);
  },
);

// Listing messages endpoints
router.get(
  "/listings/:id/messages",
  isAuthenticated,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit } = req.query;
    const messages = await messageRepository.list(
      id,
      limit ? parseInt(limit as string, 10) : 50,
    );
    res.json(messages);
  },
);

router.post("/listings/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
  const { id } = req.params;
  const msg = req.body;
  const created = await messageRepository.create(id, msg);
  res.json(created);
});

// Taxi Dispatch System
import * as taxiController from "../controllers/taxi.controller";
router.post("/taxi/request", isAuthenticated, taxiController.requestTaxi);
router.post("/taxi/webhook", taxiController.webhookTwilio); // Twilio WhatsApp callback

// WhatsApp outbound for taxi requests (Legacy)
router.post("/whatsapp/taxi-request", async (req: Request, res: Response) => {
  try {
    const { to, customerContact, pickup, destination, notes } = req.body;
    const resp = await sendTaxiRequest(to, {
      customerContact,
      pickup,
      destination,
      notes,
    });
    // Persist request log
    await db.collection("taxiRequests").add({
      to,
      customerContact,
      pickup,
      destination,
      notes: notes || "",
      sentAt: new Date().toISOString(),
      sid: resp.sid,
      status: resp.status,
    });
    res.json({ success: true, sid: resp.sid, status: resp.status });
  } catch (err: unknown) {
    res
      .status(500)
      .json({ error: getErrorMessage(err) || "Failed to send taxi request" });
  }
});

// WhatsApp inbound webhook (Twilio)
router.post("/whatsapp/webhook", async (req: Request, res: Response) => {
  try {
    const { From, Body, To, MessageSid } = req.body;
    const from = (From || "").replace("whatsapp:", "");
    const text = Body || "";

    logger.debug("📨 [WhatsApp Webhook] Received message:", {
      from,
      to: To,
      text,
    });

    // Persist inbound message
    const messageRef = await db.collection("whatsappMessages").add({
      from: From,
      to: To,
      body: text,
      direction: "inbound",
      messageSid: MessageSid,
      receivedAt: new Date().toISOString(),
    });

    // VENDOR REPLY INTERCEPTOR: Check if this is a vendor responding to an order
    const { handleVendorReply } =
      await import("../services/vendorReply.service");
    const isVendorReply = await handleVendorReply(From, text);

    if (isVendorReply) {
      // This was a vendor reply - we've handled it, don't process as user chat
      logger.debug("✅ [WhatsApp Webhook] Message handled as vendor reply");
      res.status(200).send("OK");
      return;
    }

    // If not a vendor reply, continue with normal processing
    logger.debug("ℹ️ [WhatsApp Webhook] Processing as user message");
    const textLower = text.toLowerCase();

    // Handle taxi booking responses
    if (
      textLower.includes("taxi") ||
      textLower.includes("driver") ||
      textLower.includes("pickup")
    ) {
      const taxiBookings = await db
        .collection("taxiBookings")
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      for (const bookingDoc of taxiBookings.docs) {
        const booking = bookingDoc.data();
        const isConfirmed =
          textLower.includes("confirm") ||
          textLower.includes("accept") ||
          textLower.includes("on my way");

        // Update the most recent pending booking
        await bookingDoc.ref.update({
          status: isConfirmed ? "confirmed" : "updated",
          driverResponse: text,
          driverPhone: from,
          respondedAt: new Date().toISOString(),
        });
        logger.debug(
          `✅ Updated taxi booking ${bookingDoc.id} with driver response`,
        );

        // Trigger agent to notify the user
        if (booking.userId) {
          const userSessionId = `session_${booking.userId}_agent_default`;
          const notificationMessage = isConfirmed
            ? `Great news! Your taxi booking has been confirmed. The driver says: "${text}". They should arrive at ${booking.pickupLocation} soon!`
            : `Update on your taxi booking: ${text}`;

          // Add system message to user's chat session
          await db
            .collection("chatSessions")
            .doc(userSessionId)
            .collection("messages")
            .add({
              role: "model",
              parts: [{ text: notificationMessage }],
              userId: booking.userId,
              agentId: "agent_default",
              timestamp: new Date().toISOString(),
              source: "system_notification",
              bookingId: bookingDoc.id,
            });

          // Update session's last message time
          await db.collection("chatSessions").doc(userSessionId).set(
            {
              lastMessageAt: new Date().toISOString(),
            },
            { merge: true },
          );

          // Send WhatsApp to user if they have a phone number
          if (booking.customerContact) {
            try {
              const { sendWhatsApp } =
                await import("../services/twilio.service");
              await sendWhatsApp(booking.customerContact, notificationMessage);
              logger.debug(
                `📱 Sent WhatsApp notification to user ${booking.userId}`,
              );
            } catch (err) {
              console.error("⚠️ Failed to send WhatsApp to user:", err);
            }
          }

          logger.debug(
            `🔔 Notified user ${booking.userId} about taxi booking update`,
          );
        }

        break; // Only update the first (most recent) one
      }
    }

    // Handle viewing request responses
    if (
      textLower.includes("viewing") ||
      textLower.includes("property") ||
      textLower.includes("apartment")
    ) {
      const viewingRequests = await db
        .collection("viewingRequests")
        .where("status", "==", "pending")
        .where("listingOwnerContact", "==", from)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      for (const viewingDoc of viewingRequests.docs) {
        const viewing = viewingDoc.data();
        const isConfirmed =
          textLower.includes("confirm") ||
          textLower.includes("accept") ||
          textLower.includes("yes");

        await viewingDoc.ref.update({
          status: isConfirmed ? "confirmed" : "updated",
          ownerResponse: text,
          respondedAt: new Date().toISOString(),
        });
        logger.debug(
          `✅ Updated viewing request ${viewingDoc.id} with owner response`,
        );

        // Trigger agent to notify the user
        if (viewing.userId) {
          const userSessionId = `session_${viewing.userId}_agent_default`;
          const notificationMessage = isConfirmed
            ? `Excellent! Your viewing request for "${viewing.listingTitle}" has been confirmed. The owner says: "${text}". Viewing scheduled for ${viewing.preferredSlot}.`
            : `Update on your viewing request for "${viewing.listingTitle}": ${text}`;

          // Add system message to user's chat session
          await db
            .collection("chatSessions")
            .doc(userSessionId)
            .collection("messages")
            .add({
              role: "model",
              parts: [{ text: notificationMessage }],
              userId: viewing.userId,
              agentId: "agent_default",
              timestamp: new Date().toISOString(),
              source: "system_notification",
              viewingRequestId: viewingDoc.id,
            });

          // Update session's last message time
          await db.collection("chatSessions").doc(userSessionId).set(
            {
              lastMessageAt: new Date().toISOString(),
            },
            { merge: true },
          );

          // Send WhatsApp to user if they have a phone number
          if (viewing.customerContact) {
            try {
              const { sendWhatsApp } =
                await import("../services/twilio.service");
              await sendWhatsApp(viewing.customerContact, notificationMessage);
              logger.debug(
                `📱 Sent WhatsApp notification to user ${viewing.userId}`,
              );
            } catch (err) {
              console.error("⚠️ Failed to send WhatsApp to user:", err);
            }
          }

          logger.debug(
            `🔔 Notified user ${viewing.userId} about viewing request update`,
          );
        }

        break;
      }
    }

    // Attempt to map to user/session (fallback session per phone)
    let userId: string | null = null;
    const userSnap = await db
      .collection("users")
      .where("phoneNumber", "==", from)
      .limit(1)
      .get();
    if (!userSnap.empty) {
      userId = userSnap.docs[0].id;
    }
    const sessionId = userId ? `whatsapp_${userId}` : `whatsapp_${from}`;

    // Write into chat session so it appears in UI
    await db
      .collection("chatSessions")
      .doc(sessionId)
      .set(
        {
          id: sessionId,
          userId: userId || null,
          agentId: "agent_whatsapp",
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
        },
        { merge: true },
      );

    await db
      .collection("chatSessions")
      .doc(sessionId)
      .collection("messages")
      .add({
        role: "model",
        parts: [{ text }],
        userId: userId || null,
        agentId: "agent_whatsapp",
        timestamp: new Date().toISOString(),
        source: "whatsapp",
        whatsappMessageId: messageRef.id,
      });

    // Acknowledge immediately to Twilio
    res.status(200).send("OK");
  } catch (err: unknown) {
    console.error("❌ [WhatsApp webhook] Error:", err);
    res.status(500).send("ERROR");
  }
});

// Database Population (Admin only)
router.post("/admin/populate", populateDatabase);

// Admin Role Management
import {
  syncAdminClaims,
  promoteToAdmin,
  demoteAdmin,
} from "../controllers/admin.controller";
router.post("/admin/sync-claims", isAuthenticated, syncAdminClaims);
router.post("/admin/promote", isAuthenticated, promoteToAdmin);
router.post("/admin/demote", isAuthenticated, demoteAdmin);

// Social / Connect
router.get("/users/nearby", isAuthenticated, getNearbyUsers);

// Places / Venues
import {
  getPlaces,
  getPlaceById,
  getNearbyPlaces,
} from "../controllers/places.controller";
router.get("/places", getPlaces);
router.get("/places/nearby", getNearbyPlaces);
router.get("/places/:id", getPlaceById);

// Knowledge Base / RAG Pipeline
import {
  ingestKnowledge,
  ingestImage,
  retrieveKnowledge,
  clearKnowledge,
  listKnowledge,
  extractProducts,
  updateChunkStatus,
  extractFromUrl,
} from "../controllers/knowledge.controller";
router.get(
  "/knowledge/:businessId",
  isAuthenticated,
  requireBusinessMatch,
  listKnowledge,
);
router.post(
  "/knowledge/ingest",
  isAuthenticated,
  requireBusinessMatch,
  ingestKnowledge,
);
router.post(
  "/knowledge/ingest-image",
  isAuthenticated,
  requireBusinessMatch,
  ingestImage,
);
router.post(
  "/knowledge/extract-url",
  isAuthenticated,
  requireBusinessMatch,
  extractFromUrl,
);
router.post(
  "/knowledge/retrieve",
  isAuthenticated,
  requireBusinessMatch,
  retrieveKnowledge,
);
router.post(
  "/knowledge/extract-products",
  isAuthenticated,
  requireBusinessMatch,
  extractProducts,
);
router.put(
  "/knowledge/chunk/:chunkId/status",
  isAuthenticated,
  updateChunkStatus,
);
router.delete(
  "/knowledge/:businessId",
  isAuthenticated,
  requireBusinessMatch,
  clearKnowledge,
);

// Products / Catalog
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products.controller";
router.get(
  "/products/:businessId",
  isAuthenticated,
  requireBusinessMatch,
  listProducts,
);
router.get(
  "/products/:businessId/:productId",
  isAuthenticated,
  requireBusinessMatch,
  getProduct,
);
router.post(
  "/products/:businessId",
  isAuthenticated,
  requireBusinessMatch,
  createProduct,
);
router.put(
  "/products/:businessId/:productId",
  isAuthenticated,
  requireBusinessMatch,
  updateProduct,
);
router.delete(
  "/products/:businessId/:productId",
  isAuthenticated,
  requireBusinessMatch,
  deleteProduct,
);

// Health Check
router.get("/health", (req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

export default router;
