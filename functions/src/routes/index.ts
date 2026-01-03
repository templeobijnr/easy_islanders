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
import { getListingImages } from "../controllers/listingImages.controller";
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
router.get("/listings/:id/images", getListingImages); // Public endpoint (read-only)

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
router.post("/whatsapp/webhook", (_req: Request, res: Response) => {
  // IMPORTANT: This legacy WhatsApp webhook is intentionally disabled.
  // Canonical WhatsApp ingress must use the signed FAST-ACK Twilio controller
  // + async task worker (threads/* + unified orchestrator).
  res.status(410).send("Deprecated. Use the signed Twilio WhatsApp webhook endpoint.");
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

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE API ROUTES (v1)
// ═══════════════════════════════════════════════════════════════════════════

import { CatalogController } from "../modules/catalog/catalog.controller";
import { ConnectController } from "../modules/connect/connect.controller";
import { NotificationsService } from "../modules/notifications/notifications.service";
import type { AuthContext } from "../modules/identity/identity.schema";

// Helper: Convert Express req.user to AuthContext
function toAuthContext(user: Express.Request["user"]): AuthContext {
  if (!user) throw new Error("No user in request");
  return {
    uid: user.uid,
    email: user.email,
    role: user.role === "admin" ? "admin" : user.role === "business" ? "provider" : "user",
    isAdmin: user.role === "admin",
  };
}

// Helper: Standard error response
function sendError(res: Response, code: string, message: string, status: number, traceId?: string) {
  res.status(status).json({
    error: {
      code,
      message,
      traceId: traceId || `trace-${Date.now()}`,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) CATALOG LISTINGS
// GET /v1/catalog/listings?type=&region=&category=&approved=&limit=
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: This router is mounted at `/v1` in `functions/src/app.ts`.
// Define paths WITHOUT the `/v1` prefix here.
router.get("/catalog/listings", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ctx = toAuthContext(req.user);
    const allowedTypes = new Set(["place", "activity", "event", "stay", "experience"] as const);
    const rawType = req.query.type as string | undefined;
    const type = rawType && allowedTypes.has(rawType as any) ? (rawType as any) : undefined;
    const query = {
      type,
      region: req.query.region as string | undefined,
      category: req.query.category as string | undefined,
      approved: req.query.approved === "true" ? true : req.query.approved === "false" ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    };

    const listings = await CatalogController.getListings(ctx, query);
    res.json({
      listings,
      total: listings.length,
      hasMore: false,
      cursor: null,
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error.code || "INTERNAL_ERROR";
    const message = error.message || "Failed to fetch listings";
    const status = code === "PERMISSION_DENIED" ? 403 : code === "INVALID_INPUT" ? 400 : 500;
    sendError(res, code, message, status);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) LISTING DETAIL
// GET /v1/catalog/listings/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/catalog/listings/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ctx = toAuthContext(req.user);
    const listing = await CatalogController.getListing(ctx, req.params.id);

    if (!listing) {
      sendError(res, "NOT_FOUND", "Listing not found", 404);
      return;
    }

    res.json({ listing });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error.code || "INTERNAL_ERROR";
    const message = error.message || "Failed to fetch listing";
    const status = code === "PERMISSION_DENIED" ? 403 : code === "NOT_FOUND" ? 404 : 500;
    sendError(res, code, message, status);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) CONNECT FEED
// GET /v1/connect/feed?region=&limit=
// ─────────────────────────────────────────────────────────────────────────────
router.get("/connect/feed", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ctx = toAuthContext(req.user);
    const query = {
      region: req.query.region as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    };

    const items = await ConnectController.getActiveFeed(ctx, query);
    res.json({
      items,
      hasMore: false,
      cursor: null,
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error.code || "INTERNAL_ERROR";
    const message = error.message || "Failed to fetch feed";
    const status = code === "INVALID_INPUT" ? 400 : 500;
    sendError(res, code, message, status);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) CONNECT LIVE VENUES
// GET /v1/connect/live-venues?region=
// ─────────────────────────────────────────────────────────────────────────────
router.get("/connect/live-venues", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ctx = toAuthContext(req.user);
    const query = {
      region: req.query.region as string | undefined,
    };

    const venues = await ConnectController.getLiveVenues(ctx, query);
    res.json({ venues });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error.code || "INTERNAL_ERROR";
    const message = error.message || "Failed to fetch live venues";
    const status = code === "INVALID_INPUT" ? 400 : 500;
    sendError(res, code, message, status);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) CHECK-IN
// POST /v1/connect/checkin
// ─────────────────────────────────────────────────────────────────────────────
router.post("/connect/checkin", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ctx = toAuthContext(req.user);
    const { pinId, pinType } = req.body;

    if (!pinId || !pinType) {
      sendError(res, "INVALID_INPUT", "pinId and pinType are required", 400);
      return;
    }

    await ConnectController.checkIn(ctx, { pinId, pinType });
    res.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error.code || "INTERNAL_ERROR";
    const message = error.message || "Failed to check in";
    const status = code === "INVALID_INPUT" ? 400 : 500;
    sendError(res, code, message, status);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6) NOTIFICATIONS
// GET /v1/notifications?limit=&unreadOnly=
// GET /v1/notifications/unread-count
// POST /v1/notifications/:id/read
// ─────────────────────────────────────────────────────────────────────────────
router.get("/notifications", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const query = {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      unreadOnly: req.query.unreadOnly === "true",
    };

    const [notifications, unreadCount] = await Promise.all([
      NotificationsService.getNotificationsForUser(userId, query),
      NotificationsService.getUnreadCount(userId),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    sendError(res, "INTERNAL_ERROR", error.message || "Failed to fetch notifications", 500);
  }
});

router.get("/notifications/unread-count", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const unreadCount = await NotificationsService.getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    sendError(res, "INTERNAL_ERROR", error.message || "Failed to fetch unread count", 500);
  }
});

router.post("/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user!.uid;

    // Verify ownership before marking as read
    const notification = await NotificationsService.getNotification(notificationId);
    if (!notification) {
      sendError(res, "NOT_FOUND", "Notification not found", 404);
      return;
    }
    if (notification.userId !== userId) {
      sendError(res, "PERMISSION_DENIED", "Not your notification", 403);
      return;
    }

    await NotificationsService.markAsRead(notificationId);
    res.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    sendError(res, "INTERNAL_ERROR", error.message || "Failed to mark as read", 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7) PUSH TOKEN REGISTRATION
// POST /v1/users/push-token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/users/push-token", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { token, platform } = req.body;

    if (!token || !platform) {
      sendError(res, "INVALID_INPUT", "token and platform are required", 400);
      return;
    }

    if (!["ios", "android"].includes(platform)) {
      sendError(res, "INVALID_INPUT", "platform must be 'ios' or 'android'", 400);
      return;
    }

    // Store push token
    await db.collection("pushTokens").doc(userId).set(
      {
        token,
        platform,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    sendError(res, "INTERNAL_ERROR", error.message || "Failed to save push token", 500);
  }
});

export default router;
