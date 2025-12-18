import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Only load .env for local development/emulator
// In production, secrets are provided by Firebase Secrets Manager
if (process.env.FUNCTIONS_EMULATOR === "true" || !process.env.K_SERVICE) {
  require("dotenv").config();
}

import app from "./app";
import { v1App } from "./api/app";
// import { paymentService } from "./services/payment.service"; // Commented out - Stripe not ready

import { requireAdmin } from "./middleware/requireAdmin";
import { apiLimiter } from "./middleware/rateLimiter";

const runMiddleware = (req: any, res: any, fn: any) =>
  new Promise<void>((resolve, reject) => {
    let settled = false;
    const next = (result?: unknown) => {
      if (settled) return;
      settled = true;
      if (result instanceof Error) reject(result);
      else resolve();
    };

    try {
      const maybePromise = fn(req, res, next);
      Promise.resolve(maybePromise)
        .then(() => {
          if (settled) return;
          // Middleware ended the response without calling next()
          if (res.headersSent || res.writableEnded) resolve();
        })
        .catch((err: unknown) => next(err));
    } catch (err) {
      next(err);
    }
  });

// 1. The Main API (Express) - Legacy
export const api = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    cors: true,
    // Keep legacy deployable without external secrets (Twilio/Typesense/etc).
    secrets: ["GEMINI_API_KEY"],
  },
  app,
);

// 1b. V1 Multi-Tenant API (Express) - New
// Endpoints: /claim/*, /owner/*, /public-chat/*
export const apiV1 = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    cors: true,
    secrets: ["GEMINI_API_KEY"],
  },
  v1App,
);

// 1c. Jobs API (Express) - AskMerve V1
// Endpoints: /v1/jobs/*
import { apiApp } from "./http/api";
export const jobsApi = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    cors: true,
  },
  apiApp,
);

// 2. Stripe Webhook
// TODO: Uncomment when Stripe integration is ready
// See: services/payment.service.ts for the handler implementation

// 3. Database Triggers
export * from "./triggers/onListingWrite";
export * from "./triggers/intelligence.triggers";
export * from "./triggers/auth.triggers";
export * from "./triggers/user.triggers";
export * from "./triggers/taxi.triggers";
export * from "./notifications/bookingNotifications";
export * from "./triggers/catalog-ingest.triggers";
// Disabled for V1 - knowledge ingestion not needed for launch
// export * from './triggers/knowledge.triggers';
export * from "./triggers/transaction-events.triggers";

// 3b. Scheduled Workers
export * from "./scheduled/expiry.scheduled";
export * from "./scheduled/invariants.scheduled";

// 4. Manual Reindex Endpoint
import { reindexListings } from "./controllers/chat.controller";
export const reindex = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (req, res) => {
    req.app?.set("trust proxy", true);
    await runMiddleware(req, res, apiLimiter);
    if (res.headersSent) return;
    await runMiddleware(req, res, requireAdmin);
    if (res.headersSent) return;
    return reindexListings(req as any, res as any);
  },
);

// 5. Database Population Endpoint
import { populateDatabase } from "./controllers/populate.controller";
export const populate = onRequest(
  {
    region: "europe-west1",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (req, res) => {
    req.app?.set("trust proxy", true);
    await runMiddleware(req, res, apiLimiter);
    if (res.headersSent) return;
    await runMiddleware(req, res, requireAdmin);
    if (res.headersSent) return;
    return populateDatabase(req as any, res as any);
  },
);

// 6. Google Places Proxy (CORS-free)
export const googlePlacesProxy = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cors: true,
    secrets: ["GOOGLE_PLACES_API_KEY_ENV"],
  },
  async (req, res) => {
    req.app?.set("trust proxy", true);
    await runMiddleware(req, res, apiLimiter);
    if (res.headersSent) return;
    await runMiddleware(req, res, requireAdmin);
    if (res.headersSent) return;

    // action: 'nearby' | 'autocomplete' | 'geocode' | 'details' | 'photo'
    const {
      action,
      lat,
      lng,
      type,
      types,
      radius = 5000,
      input,
      place_id,
    } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_ENV;

    if (!apiKey) {
      res.status(500).json({ error: "Google Places API key not configured" });
      return;
    }

    try {
      let url = "";

      if (action === "autocomplete") {
        if (!input) {
          res.status(400).json({ error: "Missing input for autocomplete" });
          return;
        }
        // Bias towards Cyprus if coordinates provided, or general
        const locationBias =
          lat && lng ? `&location=${lat},${lng}&radius=${radius}` : "";
        // Add types filter if provided (e.g., 'spa', 'restaurant')
        const typesFilter = types ? `&types=${types}` : "";
        url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input as string)}&language=en${locationBias}${typesFilter}&key=${apiKey}`;
      } else if (action === "geocode") {
        // Reverse geocoding (lat/lng -> address)
        if (!lat || !lng) {
          res.status(400).json({ error: "Missing lat/lng for geocoding" });
          return;
        }
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${apiKey}`;
      } else if (action === "details") {
        if (!place_id) {
          res.status(400).json({ error: "Missing place_id for details" });
          return;
        }
        // Request rich data for 1-Click Onboarding
        const fields =
          "name,formatted_address,geometry,international_phone_number,website,rating,user_ratings_total,photos,opening_hours,reviews,types,price_level";
        url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=en&key=${apiKey}`;
      } else if (action === "textsearch") {
        // Text Search: Find all businesses matching a query (e.g., "spas in Kyrenia")
        // Useful for browsing by category+region
        const { query } = req.query;
        if (!query) {
          res.status(400).json({ error: "Missing query for textsearch" });
          return;
        }
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query as string)}&language=en&key=${apiKey}`;
      } else if (action === "photo") {
        // Proxy Google Photos to avoid exposing API key and handle CORS
        const { photo_reference, maxwidth = 400 } = req.query;
        if (!photo_reference) {
          res.status(400).json({ error: "Missing photo_reference" });
          return;
        }

        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${photo_reference}&key=${apiKey}`;

        try {
          const photoRes = await fetch(photoUrl);
          if (!photoRes.ok)
            throw new Error(`Photo fetch failed: ${photoRes.statusText}`);

          // Pipe the image data back to the client
          const buffer = await photoRes.arrayBuffer();
          const contentType =
            photoRes.headers.get("content-type") || "image/jpeg";

          res.set("Content-Type", contentType);
          res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
          res.send(Buffer.from(buffer));
          return;
        } catch (err) {
          logger.error("Photo proxy error:", err);
          res.status(500).send("Failed to fetch photo");
          return;
        }
      } else {
        // Default: nearby search
        if (!lat || !lng) {
          res.status(400).json({ error: "Missing lat/lng for nearby search" });
          return;
        }
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type || "restaurant"}&language=en&key=${apiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      logger.error("Google Places API error:", error);
      res.status(500).json({ error: "Failed to fetch places" });
    }
  },
);

// 7. Test Typesense Flow - REMOVED for V1 (dev utility only)
// import { testTypesenseFlow } from "./scripts/testTypesenseFlow";
// export const testTypesense = onRequest(...)

// 8. Twilio WhatsApp Webhook (Incoming Messages)
import {
  handleIncomingWhatsApp,
  handleMessageStatus,
} from "./controllers/twilio.controller";
import { handleEmailWebhook } from "./controllers/emailWebhook.controller";
export const twilioWebhook = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cors: false,
    secrets: ["TWILIO_AUTH_TOKEN"],
  },
  (req, res) => handleIncomingWhatsApp(req as any, res as any),
);

// 9. Twilio Message Status Webhook
export const twilioStatus = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cors: false,
    secrets: ["TWILIO_AUTH_TOKEN"],
  },
  (req, res) => handleMessageStatus(req as any, res as any),
);

// 10.5 Email Webhook (for provider callbacks)
export const emailWebhook = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cors: false,
    secrets: ["EMAIL_WEBHOOK_SECRET"],
  },
  (req, res) => handleEmailWebhook(req as any, res as any),
);

// 10. Connect V1.5 Functions
export * from "./connect/checkinExpiry";
export * from "./connect/onEventCreated";
export * from "./connect/waveNotifications";
export * from "./triggers/checkin.triggers";

// 11. Auth Triggers (Automated Role Management)
export * from "./triggers/auth.triggers";

// 12. Admin Utilities
import { claimAdminRole } from "./controllers/admin.controller";
export const claimAdmin = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cors: true,
  },
  (req, res) => claimAdminRole(req as any, res as any),
);
