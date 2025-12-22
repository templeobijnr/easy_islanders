"use strict";
/**
 * Internal Twilio Handlers
 *
 * Extracted from twilio.controller.ts to avoid circular dependencies.
 * Used by business ops handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHostBookingReply = handleHostBookingReply;
const firebase_1 = require("../config/firebase");
/**
 * Handle structured booking reply from business.
 * Format: YES CODE [PRICE] or NO CODE
 */
async function handleHostBookingReply(from, body) {
    const text = body.trim();
    // Match: YES A1B2 80 (with optional price) or NO A1B2
    const match = text.match(/^(YES|NO)\s+([A-Za-z0-9]{4,})\s*(\d+(?:\.\d{2})?)?$/i);
    if (!match) {
        return null;
    }
    const verb = match[1].toUpperCase();
    const bookingCode = match[2]; // Could be shortCode (4 chars) or full bookingId
    const price = match[3] ? parseFloat(match[3]) : undefined;
    try {
        // First try to find by shortCode in bookingRequests collection (new unified system)
        let bookingRef = null;
        let bookingDoc = null;
        // Check new bookingRequests collection first
        const requestQuery = await firebase_1.db.collection('bookingRequests')
            .where('shortCode', '==', bookingCode.toUpperCase())
            .where('status', '==', 'pending')
            .limit(1)
            .get();
        if (!requestQuery.empty) {
            bookingDoc = requestQuery.docs[0];
            bookingRef = bookingDoc.ref;
        }
        else {
            // Fallback to old bookings collection by ID
            const directRef = firebase_1.db.collection('bookings').doc(bookingCode);
            const directSnap = await directRef.get();
            if (directSnap.exists) {
                bookingDoc = directSnap;
                bookingRef = directRef;
            }
        }
        if (!bookingRef || !bookingDoc) {
            return `We couldn't find booking ${bookingCode}. Please double-check the reference.`;
        }
        const booking = bookingDoc.data();
        const guestUserId = (booking === null || booking === void 0 ? void 0 : booking.userId) || null;
        const status = verb === 'YES' ? 'confirmed' : 'declined';
        // Update booking with response
        const updateData = {
            status,
            businessMessage: body,
            respondedAt: new Date().toISOString(),
        };
        // If confirmed with price, store it
        if (verb === 'YES' && price !== undefined) {
            updateData.confirmedPrice = price;
        }
        // Also add legacy fields for backwards compatibility
        updateData.hostReplyStatus = verb === 'YES' ? 'accepted' : 'declined';
        updateData.hostReplyBody = body;
        updateData.hostLastReplyAt = new Date().toISOString();
        await bookingRef.set(updateData, { merge: true });
        // Log communication
        await firebase_1.db.collection('bookingCommunications').add({
            bookingId: bookingDoc.id,
            userId: guestUserId,
            channel: 'whatsapp',
            direction: 'inbound',
            senderRole: 'business',
            from,
            body,
            parsedIntent: status,
            parsedPrice: price || null,
            createdAt: new Date(),
        });
        // Build confirmation message
        if (verb === 'YES') {
            const priceMsg = price ? ` Price: $${price}` : '';
            return `✅ Booking ${bookingCode} confirmed!${priceMsg} We'll notify the customer.`;
        }
        else {
            return `❌ Booking ${bookingCode} declined. We'll notify the customer.`;
        }
    }
    catch (err) {
        console.error('❌ [Twilio Webhook] Failed to handle booking reply:', err);
        return 'Sorry, we could not record your response. Please contact Easy Islanders.';
    }
}
//# sourceMappingURL=twilio.controller.internal.js.map