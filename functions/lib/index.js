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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimAdmin = exports.emailWebhook = exports.twilioStatus = exports.twilioWebhook = exports.googlePlacesProxy = exports.populate = exports.reindex = exports.apiV1 = exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
// Only load .env for local development/emulator
// In production, secrets are provided by Firebase Secrets Manager
if (process.env.FUNCTIONS_EMULATOR === 'true' || !process.env.K_SERVICE) {
    require('dotenv').config();
}
const app_1 = __importDefault(require("./app"));
const app_2 = require("./api/app");
// import { paymentService } from "./services/payment.service"; // Commented out - Stripe not ready
// 1. The Main API (Express) - Legacy
exports.api = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "512MiB",
    cors: true,
    // Keep legacy deployable without external secrets (Twilio/Typesense/etc).
    secrets: ['GEMINI_API_KEY']
}, app_1.default);
// 1b. V1 Multi-Tenant API (Express) - New
// Endpoints: /claim/*, /owner/*, /public-chat/*
exports.apiV1 = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "512MiB",
    cors: true,
    secrets: [
        'GEMINI_API_KEY'
    ]
}, app_2.v1App);
// 2. Stripe Webhook
// TODO: Uncomment when Stripe integration is ready
// See: services/payment.service.ts for the handler implementation
// 3. Database Triggers
__exportStar(require("./triggers/onListingWrite"), exports);
__exportStar(require("./triggers/intelligence.triggers"), exports);
__exportStar(require("./triggers/auth.triggers"), exports);
__exportStar(require("./triggers/user.triggers"), exports);
__exportStar(require("./triggers/taxi.triggers"), exports);
__exportStar(require("./notifications/bookingNotifications"), exports);
__exportStar(require("./triggers/catalog-ingest.triggers"), exports);
// Disabled for V1 - knowledge ingestion not needed for launch
// export * from './triggers/knowledge.triggers';
__exportStar(require("./triggers/transaction-events.triggers"), exports);
// 3b. Scheduled Workers
__exportStar(require("./scheduled/expiry.scheduled"), exports);
__exportStar(require("./scheduled/invariants.scheduled"), exports);
// 4. Manual Reindex Endpoint
const chat_controller_1 = require("./controllers/chat.controller");
exports.reindex = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300,
}, chat_controller_1.reindexListings);
// 5. Database Population Endpoint
const populate_controller_1 = require("./controllers/populate.controller");
exports.populate = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "1GiB",
    timeoutSeconds: 540,
}, populate_controller_1.populateDatabase);
// 6. Google Places Proxy (CORS-free)
exports.googlePlacesProxy = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "256MiB",
    cors: true,
    // secrets: ['GOOGLE_PLACES_API_KEY']
}, async (req, res) => {
    // action: 'nearby' | 'autocomplete' | 'geocode' | 'details' | 'photo'
    const { action, lat, lng, type, types, radius = 5000, input, place_id } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_ENV;
    if (!apiKey) {
        res.status(500).json({ error: "Google Places API key not configured" });
        return;
    }
    try {
        let url = '';
        if (action === 'autocomplete') {
            if (!input) {
                res.status(400).json({ error: "Missing input for autocomplete" });
                return;
            }
            // Bias towards Cyprus if coordinates provided, or general
            const locationBias = lat && lng ? `&location=${lat},${lng}&radius=${radius}` : '';
            // Add types filter if provided (e.g., 'spa', 'restaurant')
            const typesFilter = types ? `&types=${types}` : '';
            url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=en${locationBias}${typesFilter}&key=${apiKey}`;
        }
        else if (action === 'geocode') {
            // Reverse geocoding (lat/lng -> address)
            if (!lat || !lng) {
                res.status(400).json({ error: "Missing lat/lng for geocoding" });
                return;
            }
            url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${apiKey}`;
        }
        else if (action === 'details') {
            if (!place_id) {
                res.status(400).json({ error: "Missing place_id for details" });
                return;
            }
            // Request rich data for 1-Click Onboarding
            const fields = 'name,formatted_address,geometry,international_phone_number,website,rating,user_ratings_total,photos,opening_hours,reviews,types,price_level';
            url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=en&key=${apiKey}`;
        }
        else if (action === 'textsearch') {
            // Text Search: Find all businesses matching a query (e.g., "spas in Kyrenia")
            // Useful for browsing by category+region
            const { query } = req.query;
            if (!query) {
                res.status(400).json({ error: "Missing query for textsearch" });
                return;
            }
            url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=en&key=${apiKey}`;
        }
        else if (action === 'photo') {
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
                const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
                res.set('Content-Type', contentType);
                res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
                res.send(Buffer.from(buffer));
                return;
            }
            catch (err) {
                logger.error("Photo proxy error:", err);
                res.status(500).send("Failed to fetch photo");
                return;
            }
        }
        else {
            // Default: nearby search
            if (!lat || !lng) {
                res.status(400).json({ error: "Missing lat/lng for nearby search" });
                return;
            }
            url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type || 'restaurant'}&language=en&key=${apiKey}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        logger.error("Google Places API error:", error);
        res.status(500).json({ error: "Failed to fetch places" });
    }
});
// 7. Test Typesense Flow - REMOVED for V1 (dev utility only)
// import { testTypesenseFlow } from "./scripts/testTypesenseFlow";
// export const testTypesense = onRequest(...)
// 8. Twilio WhatsApp Webhook (Incoming Messages)
const twilio_controller_1 = require("./controllers/twilio.controller");
const emailWebhook_controller_1 = require("./controllers/emailWebhook.controller");
exports.twilioWebhook = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "256MiB",
    cors: false,
}, twilio_controller_1.handleIncomingWhatsApp);
// 9. Twilio Message Status Webhook
exports.twilioStatus = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "256MiB",
    cors: false,
}, twilio_controller_1.handleMessageStatus);
// 10.5 Email Webhook (for provider callbacks)
exports.emailWebhook = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "256MiB",
    cors: false,
}, emailWebhook_controller_1.handleEmailWebhook);
// 10. Connect V1.5 Functions
__exportStar(require("./connect/checkinExpiry"), exports);
__exportStar(require("./connect/onEventCreated"), exports);
__exportStar(require("./connect/waveNotifications"), exports);
__exportStar(require("./triggers/checkin.triggers"), exports);
// 11. Auth Triggers (Automated Role Management)
__exportStar(require("./triggers/auth.triggers"), exports);
// 12. Admin Utilities
const admin_controller_1 = require("./controllers/admin.controller");
exports.claimAdmin = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "256MiB",
    cors: true,
}, admin_controller_1.claimAdminRole);
//# sourceMappingURL=index.js.map