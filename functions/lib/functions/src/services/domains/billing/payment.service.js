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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const stripe_1 = __importDefault(require("stripe"));
require("firebase-admin/firestore");
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../../../config/firebase");
const errors_1 = require("../../../utils/errors");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-12-15.clover",
});
exports.paymentService = {
    // 1. Create Payment Intent (The "Invoice")
    createPaymentIntent: async (bookingId, userId) => {
        // Fetch booking to get the REAL price. Never trust the client.
        const bookingRef = firebase_1.db.collection("bookings").doc(bookingId);
        logger.debug("[Payment] Fetching booking", bookingId);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) {
            console.error("[Payment] Booking not found in Firestore:", bookingId);
            throw new Error("Booking not found");
        }
        const booking = bookingSnap.data();
        // Security Check: Ensure the user requesting payment owns the booking
        if ((booking === null || booking === void 0 ? void 0 : booking.userId) !== userId) {
            throw new Error("Unauthorized: You do not own this booking");
        }
        if ((booking === null || booking === void 0 ? void 0 : booking.status) === "confirmed") {
            throw new Error("Booking already paid");
        }
        // Create Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round((booking === null || booking === void 0 ? void 0 : booking.totalPrice) * 100), // Stripe expects cents (e.g. £10.00 = 1000)
            currency: ((booking === null || booking === void 0 ? void 0 : booking.currency) || "gbp").toLowerCase(),
            metadata: {
                bookingId: bookingId, // CRITICAL: Links payment back to Firestore
                userId: userId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            amount: booking === null || booking === void 0 ? void 0 : booking.totalPrice,
            currency: booking === null || booking === void 0 ? void 0 : booking.currency,
        };
    },
    // 2. Handle Webhook (The "Receipt")
    handleWebhook: async (signature, rawBody) => {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
        }
        catch (err) {
            console.error(`⚠️  Webhook signature verification failed.`, (0, errors_1.getErrorMessage)(err));
            throw new Error("Webhook Error");
        }
        // Handle the event
        if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object;
            const bookingId = paymentIntent.metadata.bookingId;
            logger.debug(`💰 Payment succeeded for Booking ${bookingId}`);
            // ATOMIC UPDATE: Mark booking as confirmed
            await firebase_1.db.collection("bookings").doc(bookingId).update({
                status: "confirmed",
                paymentId: paymentIntent.id,
                paymentStatus: "paid",
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        return { received: true };
    },
};
//# sourceMappingURL=payment.service.js.map