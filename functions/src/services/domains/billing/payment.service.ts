import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../../config/firebase";
import { getErrorMessage } from '../../../utils/errors';

// Lazily initialize Stripe so importing this module never crashes tests or cold-start paths.
// Invariant: external clients must never be created at module scope.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Stripe not configured: STRIPE_SECRET_KEY is missing");
  }

  _stripe = new Stripe(apiKey, { apiVersion: "2025-12-15.clover" });
  return _stripe;
}

export const paymentService = {
  // 1. Create Payment Intent (The "Invoice")
  createPaymentIntent: async (bookingId: string, userId: string) => {
    // Fetch booking to get the REAL price. Never trust the client.
    const bookingRef = db.collection("bookings").doc(bookingId);
    logger.debug("[Payment] Fetching booking", bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      console.error("[Payment] Booking not found in Firestore:", bookingId);
      throw new Error("Booking not found");
    }

    const booking = bookingSnap.data();

    // Security Check: Ensure the user requesting payment owns the booking
    if (booking?.userId !== userId) {
      throw new Error("Unauthorized: You do not own this booking");
    }

    if (booking?.status === "confirmed") {
      throw new Error("Booking already paid");
    }

    // Create Intent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking?.totalPrice * 100), // Stripe expects cents (e.g. £10.00 = 1000)
      currency: (booking?.currency || "gbp").toLowerCase(),
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
      amount: booking?.totalPrice,
      currency: booking?.currency,
    };
  },

  // 2. Handle Webhook (The "Receipt")
  handleWebhook: async (signature: string, rawBody: Buffer) => {
    const stripe = getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret!,
      );
    } catch (err: unknown) {
      console.error(`⚠️  Webhook signature verification failed.`, getErrorMessage(err));
      throw new Error("Webhook Error");
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata.bookingId;

      logger.debug(`💰 Payment succeeded for Booking ${bookingId}`);

      // ATOMIC UPDATE: Mark booking as confirmed
      await db.collection("bookings").doc(bookingId).update({
        status: "confirmed",
        paymentId: paymentIntent.id,
        paymentStatus: "paid",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { received: true };
  },
};
