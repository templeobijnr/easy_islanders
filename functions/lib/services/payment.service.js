"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const stripe_1 = __importDefault(require("stripe"));
require("firebase-admin/firestore");
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../config/firebase");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-11-17.clover', // Updated to match installed types
});
exports.paymentService = {
    // 1. Create Payment Intent (The "Invoice")
    createPaymentIntent: async (bookingId, userId) => {
        // Fetch booking to get the REAL price. Never trust the client.
        const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
        console.log('[Payment] Fetching booking', bookingId);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) {
            console.error('[Payment] Booking not found in Firestore:', bookingId);
            throw new Error('Booking not found');
        }
        const booking = bookingSnap.data();
        // Security Check: Ensure the user requesting payment owns the booking
        if ((booking === null || booking === void 0 ? void 0 : booking.userId) !== userId) {
            throw new Error('Unauthorized: You do not own this booking');
        }
        if ((booking === null || booking === void 0 ? void 0 : booking.status) === 'confirmed') {
            throw new Error('Booking already paid');
        }
        // Create Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round((booking === null || booking === void 0 ? void 0 : booking.totalPrice) * 100), // Stripe expects cents (e.g. £10.00 = 1000)
            currency: ((booking === null || booking === void 0 ? void 0 : booking.currency) || 'gbp').toLowerCase(),
            metadata: {
                bookingId: bookingId, // CRITICAL: Links payment back to Firestore
                userId: userId
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            amount: booking === null || booking === void 0 ? void 0 : booking.totalPrice,
            currency: booking === null || booking === void 0 ? void 0 : booking.currency
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
            console.error(`⚠️  Webhook signature verification failed.`, err.message);
            throw new Error('Webhook Error');
        }
        // Handle the event
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const bookingId = paymentIntent.metadata.bookingId;
            console.log(`💰 Payment succeeded for Booking ${bookingId}`);
            // ATOMIC UPDATE: Mark booking as confirmed
            await firebase_1.db.collection('bookings').doc(bookingId).update({
                status: 'confirmed',
                paymentId: paymentIntent.id,
                paymentStatus: 'paid',
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        }
        return { received: true };
    }
};
//# sourceMappingURL=payment.service.js.map