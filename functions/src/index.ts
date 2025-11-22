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

// 4. Manual Reindex Endpoint
import { reindexListings } from "./controllers/chat.controller";
export const reindex = onRequest(
    { region: "europe-west1", memory: "512MiB" },
    reindexListings
);
