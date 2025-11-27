"use strict";
/**
 * Booking & Reservation Tools
 *
 * Handles property viewings, booking creation, and payment processing.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingTools = void 0;
const firestore_1 = require("firebase-admin/firestore");
const listing_repository_1 = require("../../repositories/listing.repository");
const firebase_1 = require("../../config/firebase");
const now = firestore_1.FieldValue.serverTimestamp;
exports.bookingTools = {
    /**
     * Create a booking for a listing (short-term stay, car rental, etc.)
     * Persists a booking document and returns a receipt payload.
     */
    createBooking: async (args, userId) => {
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        const item = await listing_repository_1.listingRepository.getById(args.itemId);
        if (!item) {
            return {
                success: false,
                error: `Item not found: ${args.itemId}`
            };
        }
        const bookingId = `ORD-${Date.now()}`;
        const confirmationNumber = `CFM-${Date.now()}`;
        const currency = item.currency || 'GBP';
        const totalPrice = typeof item.price === 'number'
            ? item.price
            : parseFloat(item.price) || 0;
        const bookingData = {
            id: bookingId,
            userId,
            itemId: item.id,
            domain: item.domain,
            itemTitle: item.title,
            itemImage: item.imageUrl,
            totalPrice,
            currency,
            customerName: args.customerName,
            customerContact: args.customerContact,
            specialRequests: args.specialRequests || '',
            needsPickup: args.needsPickup || false,
            checkIn: args.checkInDate || args.checkIn || null,
            checkOut: args.checkOutDate || args.checkOut || null,
            viewingTime: args.viewingSlot || null,
            status: 'payment_pending',
            confirmationNumber,
            createdAt: now(),
            updatedAt: now()
        };
        await firebase_1.db.collection('bookings').doc(bookingId).set(bookingData);
        console.log(`✅ Booking created: ${bookingId} for ${item.title}`);
        return Object.assign(Object.assign({ success: true }, bookingData), { receipt: {
                bookingId,
                confirmationNumber,
                itemTitle: item.title,
                category: item.category || item.subCategory || item.domain,
                total: totalPrice,
                currency
            } });
    },
    /**
     * Schedule a property viewing with the owner/agent
     */
    scheduleViewing: async (args, userId) => {
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        try {
            const item = await listing_repository_1.listingRepository.getById(args.listingId);
            if (!item) {
                return {
                    success: false,
                    error: `Listing not found: ${args.listingId}`
                };
            }
            const vrId = `VR-${Date.now()}`;
            const ownerContact = item.agentPhone || item.ownerContact || item.whatsappNumber;
            const payload = {
                id: vrId,
                listingId: args.listingId,
                listingTitle: item.title,
                listingLocation: item.location,
                listingOwnerContact: ownerContact,
                customerName: args.customerName,
                customerContact: args.customerContact,
                preferredSlot: args.preferredSlot,
                notes: args.notes || '',
                userId: userId,
                status: 'pending',
                createdAt: now()
            };
            await firebase_1.db.collection('viewingRequests').doc(vrId).set(payload);
            // Send WhatsApp notification to owner/agent if contact is available
            if (ownerContact) {
                try {
                    const { sendViewingRequest } = await Promise.resolve().then(() => __importStar(require('../twilio.service')));
                    await sendViewingRequest(ownerContact, {
                        listingTitle: item.title,
                        listingId: args.listingId,
                        listingLocation: item.location,
                        customerName: args.customerName,
                        customerContact: args.customerContact,
                        preferredSlot: args.preferredSlot,
                        notes: args.notes
                    });
                    console.log(`✅ Viewing request sent via WhatsApp to ${ownerContact}`);
                }
                catch (err) {
                    console.error("⚠️ Failed to send WhatsApp notification:", err);
                    // Don't fail the whole request if WhatsApp fails
                }
            }
            return {
                success: true,
                viewingRequest: payload
            };
        }
        catch (err) {
            console.error("🔴 [ScheduleViewing] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to schedule viewing'
            };
        }
    },
    /**
     * Create a payment intent for a booking
     */
    createPaymentIntent: async (args, userId) => {
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        if (!args.bookingId) {
            return {
                success: false,
                error: 'bookingId is required'
            };
        }
        try {
            const { paymentService } = await Promise.resolve().then(() => __importStar(require('../payment.service')));
            const intent = await paymentService.createPaymentIntent(args.bookingId, userId);
            return {
                success: true,
                bookingId: args.bookingId,
                payment: intent
            };
        }
        catch (err) {
            console.error("🔴 [CreatePaymentIntent] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to create payment intent'
            };
        }
    }
};
//# sourceMappingURL=booking.tools.js.map