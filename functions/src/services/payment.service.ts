import Stripe from 'stripe';
import { db } from '../config/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-11-17.clover', // Updated to match installed types
});

export const paymentService = {

    // 1. Create Payment Intent (The "Invoice")
    createPaymentIntent: async (bookingId: string, userId: string) => {
        // Fetch booking to get the REAL price. Never trust the client.
        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            throw new Error('Booking not found');
        }

        const booking = bookingSnap.data();

        // Security Check: Ensure the user requesting payment owns the booking
        if (booking?.userId !== userId) {
            throw new Error('Unauthorized: You do not own this booking');
        }

        if (booking?.status === 'confirmed') {
            throw new Error('Booking already paid');
        }

        // Create Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(booking?.totalPrice * 100), // Stripe expects cents (e.g. £10.00 = 1000)
            currency: (booking?.currency || 'gbp').toLowerCase(),
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
            amount: booking?.totalPrice,
            currency: booking?.currency
        };
    },

    // 2. Handle Webhook (The "Receipt")
    handleWebhook: async (signature: string, rawBody: Buffer) => {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;

        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret!);
        } catch (err: any) {
            console.error(`⚠️  Webhook signature verification failed.`, err.message);
            throw new Error('Webhook Error');
        }

        // Handle the event
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const bookingId = paymentIntent.metadata.bookingId;

            console.log(`💰 Payment succeeded for Booking ${bookingId}`);

            // ATOMIC UPDATE: Mark booking as confirmed
            await db.collection('bookings').doc(bookingId).update({
                status: 'confirmed',
                paymentId: paymentIntent.id,
                paymentStatus: 'paid',
                updatedAt: new Date().toISOString()
            });
        }

        return { received: true };
    }
};
