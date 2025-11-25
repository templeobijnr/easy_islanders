import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as dotenv from 'dotenv';
dotenv.config();

import app from "./app";
import { paymentService } from "./services/payment.service";

// 1. The Main API (Express)
export const api = onRequest(
    { region: "europe-west1", memory: "512MiB", cors: true },
    app
);

// 2. The Stripe Webhook (Raw Request Handler)
export const stripeWebhook = onRequest(
    { region: "europe-west1", memory: "256MiB" },
    async (req, res) => {
        const signature = req.headers['stripe-signature'] as string;

        try {
            // In Cloud Functions, req.rawBody is available
            await paymentService.handleWebhook(signature, (req as any).rawBody);
            res.json({ received: true });
        } catch (err) {
            logger.error(err);
            res.status(400).send('Webhook Error');
        }
    }
);

// 3. Database Triggers
export * from "./triggers/onListingWrite";
export * from "./triggers/intelligence.triggers";
export * from "./triggers/taxi.triggers";

// 4. Manual Reindex Endpoint
import { reindexListings } from "./controllers/chat.controller";
export const reindex = onRequest(
    { region: "europe-west1", memory: "512MiB", timeoutSeconds: 300 },
    reindexListings
);

// 5. Database Population Endpoint
import { populateDatabase } from "./controllers/populate.controller";
export const populate = onRequest(
    { region: "europe-west1", memory: "1GiB", timeoutSeconds: 540 },
    populateDatabase
);

// 6. Google Places Proxy (CORS-free)
export const googlePlacesProxy = onRequest(
    { region: "europe-west1", memory: "256MiB", cors: true },
    async (req, res) => {
        const { lat, lng, type, radius = 5000 } = req.query;
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!apiKey) {
            res.status(500).json({ error: "Google Places API key not configured" });
            return;
        }

        if (!lat || !lng) {
            res.status(400).json({ error: "Missing lat/lng parameters" });
            return;
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type || 'restaurant'}&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            res.json(data);
        } catch (error) {
            logger.error("Google Places API error:", error);
            res.status(500).json({ error: "Failed to fetch places" });
        }
    }
);

// 7. Test Typesense Flow
import { testTypesenseFlow } from "./scripts/testTypesenseFlow";
export const testTypesense = onRequest(
    { region: "europe-west1", memory: "512MiB", timeoutSeconds: 60 },
    async (req, res) => {
        try {
            const result = await testTypesenseFlow();
            res.json(result);
        } catch (error: any) {
            logger.error('Test failed:', error);
            res.status(500).json({ error: error.message });
        }
    }
);
