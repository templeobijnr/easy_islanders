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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingTools = void 0;
const errors_1 = require("../../utils/errors");
/**
 * Booking & Reservation Tools
 *
 * Handles property viewings, booking creation, and payment processing.
 */
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const listing_repository_1 = require("../../repositories/listing.repository");
const firebase_1 = require("../../config/firebase");
const booking_ledger_tools_1 = require("./booking-ledger.tools");
const toolContext_1 = require("./toolContext");
const now = firestore_1.FieldValue.serverTimestamp;
function mapToLedgerChannel(channel) {
    if (channel === "whatsapp")
        return "whatsapp";
    if (channel === "discover")
        return "discover_chat";
    return "app_chat";
}
exports.bookingTools = {
    /**
     * Create a booking for a listing (short-term stay, car rental, etc.)
     * Persists a booking document and returns a receipt payload.
     */
    createBooking: async (args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized: User ID required",
            };
        }
        const item = await listing_repository_1.listingRepository.getById(args.itemId);
        if (!item) {
            return {
                success: false,
                error: `Item not found: ${args.itemId}`,
            };
        }
        const bookingId = `ORD-${Date.now()}`;
        const confirmationNumber = `CFM-${Date.now()}`;
        const itemData = item;
        const currency = itemData.currency || "GBP";
        const totalPrice = typeof itemData.price === "number"
            ? itemData.price
            : parseFloat(String(itemData.price)) || 0;
        const extArgs = args;
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
            specialRequests: args.specialRequests || "",
            needsPickup: extArgs.needsPickup || false,
            checkIn: extArgs.checkInDate || args.checkIn || null,
            checkOut: extArgs.checkOutDate || args.checkOut || null,
            viewingTime: extArgs.viewingSlot || null,
            status: "payment_pending",
            confirmationNumber,
            createdAt: now(),
            updatedAt: now(),
        };
        await firebase_1.db.collection("bookings").doc(bookingId).set(bookingData);
        logger.debug(`✅ Booking created: ${bookingId} for ${item.title}`);
        return Object.assign(Object.assign({ success: true }, bookingData), { receipt: {
                bookingId,
                confirmationNumber,
                itemTitle: item.title,
                category: itemData.category || itemData.subCategory || item.domain,
                total: totalPrice,
                currency,
            } });
    },
    /**
     * Schedule a property viewing with the owner/agent
     */
    scheduleViewing: async (args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized: User ID required",
            };
        }
        try {
            const item = await listing_repository_1.listingRepository.getById(args.listingId);
            if (!item) {
                return {
                    success: false,
                    error: `Listing not found: ${args.listingId}`,
                };
            }
            const vrId = `VR-${Date.now()}`;
            const itemData = item;
            const ownerContact = itemData.agentPhone ||
                itemData.ownerContact ||
                itemData.whatsappNumber;
            const payload = {
                id: vrId,
                listingId: args.listingId,
                listingTitle: item.title,
                listingLocation: item.location,
                listingOwnerContact: ownerContact,
                customerName: args.customerName,
                customerContact: args.customerContact,
                preferredSlot: args.preferredSlot,
                notes: args.notes || "",
                userId: userId,
                status: "pending",
                createdAt: now(),
            };
            await firebase_1.db.collection("viewingRequests").doc(vrId).set(payload);
            // Send WhatsApp notification to owner/agent if contact is available
            if (ownerContact) {
                try {
                    const { sendViewingRequest } = await Promise.resolve().then(() => __importStar(require("../twilio.service")));
                    await sendViewingRequest(ownerContact, {
                        listingTitle: item.title,
                        listingId: args.listingId,
                        listingLocation: item.location,
                        customerName: args.customerName,
                        customerContact: args.customerContact,
                        preferredSlot: args.preferredSlot,
                        notes: args.notes,
                    });
                    logger.debug(`✅ Viewing request sent via WhatsApp to ${ownerContact}`);
                }
                catch (err) {
                    console.error("⚠️ Failed to send WhatsApp notification:", err);
                    // Don't fail the whole request if WhatsApp fails
                }
            }
            return {
                success: true,
                viewingRequest: payload,
            };
        }
        catch (err) {
            console.error("🔴 [ScheduleViewing] Failed:", err);
            return {
                success: false,
                error: (0, errors_1.getErrorMessage)(err) || "Failed to schedule viewing",
            };
        }
    },
    /**
     * Create a payment intent for a booking
     */
    createPaymentIntent: async (args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized: User ID required",
            };
        }
        if (!args.bookingId) {
            return {
                success: false,
                error: "bookingId is required",
            };
        }
        try {
            const { paymentService } = await Promise.resolve().then(() => __importStar(require("../payment.service")));
            const intent = await paymentService.createPaymentIntent(args.bookingId, userId);
            return {
                success: true,
                bookingId: args.bookingId,
                payment: intent,
            };
        }
        catch (err) {
            console.error("🔴 [CreatePaymentIntent] Failed:", err);
            return {
                success: false,
                error: (0, errors_1.getErrorMessage)(err) || "Failed to create payment intent",
            };
        }
    },
    /**
     * Initiate a booking using the execution ledger (draft → hold).
     * Returns a pendingAction that must be confirmed via YES/NO gate.
     *
     * This is the channel-agnostic equivalent of the controller-specific booking flow.
     */
    initiateBooking: async (args, userIdOrContext) => {
        var _a, _b;
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return { success: false, error: "Unauthorized: User ID required" };
        }
        const itemId = (args === null || args === void 0 ? void 0 : args.itemId) || (args === null || args === void 0 ? void 0 : args.listingId) || (args === null || args === void 0 ? void 0 : args.offeringId);
        if (!itemId) {
            return { success: false, error: "itemId is required" };
        }
        const businessResult = await (0, booking_ledger_tools_1.resolveBusinessId)(itemId);
        if (!businessResult.success) {
            return {
                success: false,
                error: businessResult.error,
                errorCode: businessResult.errorCode,
            };
        }
        const today = new Date().toISOString().split("T")[0];
        const date = (args === null || args === void 0 ? void 0 : args.date) || (args === null || args === void 0 ? void 0 : args.checkInDate) || today;
        const time = (args === null || args === void 0 ? void 0 : args.time) || "12:00";
        const partySize = (args === null || args === void 0 ? void 0 : args.guests) || (args === null || args === void 0 ? void 0 : args.partySize) || 1;
        const holdResult = await (0, booking_ledger_tools_1.createHeldBooking)({
            businessId: businessResult.businessId,
            offeringId: itemId,
            offeringName: (args === null || args === void 0 ? void 0 : args.itemTitle) || (args === null || args === void 0 ? void 0 : args.offeringName) || "Booking",
            channel: mapToLedgerChannel(ctx.channel),
            actor: {
                userId,
                name: args.customerName,
                phoneE164: (_a = ctx.actor) === null || _a === void 0 ? void 0 : _a.phoneE164,
            },
            date,
            time,
            partySize,
            notes: (args === null || args === void 0 ? void 0 : args.specialRequests) || (args === null || args === void 0 ? void 0 : args.notes),
            idempotencyKey: `booking:${ctx.sessionId || "no-session"}:${itemId}:${date}:${time}`,
        });
        if (!holdResult.success) {
            return {
                success: false,
                error: holdResult.error,
                errorCode: holdResult.errorCode,
                unavailable: holdResult.errorCode === "RESOURCE_UNAVAILABLE",
            };
        }
        return {
            success: true,
            awaitingConfirmation: true,
            transactionId: holdResult.txId,
            holdExpiresAt: (_b = holdResult.holdExpiresAt) === null || _b === void 0 ? void 0 : _b.toISOString(),
            confirmationPrompt: holdResult.confirmationPrompt,
            pendingAction: holdResult.pendingAction,
        };
    },
};
//# sourceMappingURL=booking.tools.js.map