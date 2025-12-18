/**
 * Booking & Reservation Tools
 *
 * Handles property viewings, booking creation, and payment processing.
 */

import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import type {
  ScheduleViewingArgs,
  CreatePaymentIntentArgs,
  CreateBookingArgs,
} from "../../types/tools";
import { listingRepository } from "../../repositories/listing.repository";
import { db } from "../../config/firebase";
import type { Channel } from "../../types/transaction";
import { createHeldBooking, resolveBusinessId } from "./booking-ledger.tools";
import { asToolContext } from "./toolContext";

const now = FieldValue.serverTimestamp;

interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

function mapToLedgerChannel(channel: unknown): Channel {
  if (channel === "whatsapp") return "whatsapp";
  if (channel === "discover") return "discover_chat";
  return "app_chat";
}

export const bookingTools = {
  /**
   * Create a booking for a listing (short-term stay, car rental, etc.)
   * Persists a booking document and returns a receipt payload.
   */
  createBooking: async (
    args: CreateBookingArgs,
    userIdOrContext: any,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    const userId = ctx.userId;
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: User ID required",
      };
    }

    const item = await listingRepository.getById(args.itemId);
    if (!item) {
      return {
        success: false,
        error: `Item not found: ${args.itemId}`,
      };
    }

    const bookingId = `ORD-${Date.now()}`;
    const confirmationNumber = `CFM-${Date.now()}`;
    const currency = (item as any).currency || "GBP";
    const totalPrice =
      typeof (item as any).price === "number"
        ? (item as any).price
        : parseFloat((item as any).price as any) || 0;

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
      needsPickup: (args as any).needsPickup || false,
      checkIn: (args as any).checkInDate || args.checkIn || null,
      checkOut: (args as any).checkOutDate || args.checkOut || null,
      viewingTime: (args as any).viewingSlot || null,
      status: "payment_pending",
      confirmationNumber,
      createdAt: now(),
      updatedAt: now(),
    };

    await db.collection("bookings").doc(bookingId).set(bookingData);
    logger.debug(`✅ Booking created: ${bookingId} for ${item.title}`);

    return {
      success: true,
      ...bookingData,
      receipt: {
        bookingId,
        confirmationNumber,
        itemTitle: item.title,
        category:
          (item as any).category || (item as any).subCategory || item.domain,
        total: totalPrice,
        currency,
      },
    };
  },

  /**
   * Schedule a property viewing with the owner/agent
   */
  scheduleViewing: async (
    args: ScheduleViewingArgs,
    userIdOrContext: any,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    const userId = ctx.userId;
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: User ID required",
      };
    }

    try {
      const item = await listingRepository.getById(args.listingId);
      if (!item) {
        return {
          success: false,
          error: `Listing not found: ${args.listingId}`,
        };
      }

      const vrId = `VR-${Date.now()}`;
      const ownerContact =
        (item as any).agentPhone ||
        (item as any).ownerContact ||
        (item as any).whatsappNumber;

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

      await db.collection("viewingRequests").doc(vrId).set(payload);

      // Send WhatsApp notification to owner/agent if contact is available
      if (ownerContact) {
        try {
          const { sendViewingRequest } = await import("../twilio.service");
          await sendViewingRequest(ownerContact, {
            listingTitle: item.title,
            listingId: args.listingId,
            listingLocation: item.location,
            customerName: args.customerName,
            customerContact: args.customerContact,
            preferredSlot: args.preferredSlot,
            notes: args.notes,
          });
          logger.debug(
            `✅ Viewing request sent via WhatsApp to ${ownerContact}`,
          );
        } catch (err: any) {
          console.error("⚠️ Failed to send WhatsApp notification:", err);
          // Don't fail the whole request if WhatsApp fails
        }
      }

      return {
        success: true,
        viewingRequest: payload,
      };
    } catch (err: any) {
      console.error("🔴 [ScheduleViewing] Failed:", err);
      return {
        success: false,
        error: err.message || "Failed to schedule viewing",
      };
    }
  },

  /**
   * Create a payment intent for a booking
   */
  createPaymentIntent: async (
    args: CreatePaymentIntentArgs,
    userIdOrContext: any,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
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
      const { paymentService } = await import("../payment.service");
      const intent = await paymentService.createPaymentIntent(
        args.bookingId,
        userId,
      );

      return {
        success: true,
        bookingId: args.bookingId,
        payment: intent,
      };
    } catch (err: any) {
      console.error("🔴 [CreatePaymentIntent] Failed:", err);
      return {
        success: false,
        error: err.message || "Failed to create payment intent",
      };
    }
  },

  /**
   * Initiate a booking using the execution ledger (draft → hold).
   * Returns a pendingAction that must be confirmed via YES/NO gate.
   *
   * This is the channel-agnostic equivalent of the controller-specific booking flow.
   */
  initiateBooking: async (
    args: any,
    userIdOrContext: any,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    const userId = ctx.userId;
    if (!userId) {
      return { success: false, error: "Unauthorized: User ID required" };
    }

    const itemId = args?.itemId || args?.listingId || args?.offeringId;
    if (!itemId) {
      return { success: false, error: "itemId is required" };
    }

    const businessResult = await resolveBusinessId(itemId);
    if (!businessResult.success) {
      return {
        success: false,
        error: businessResult.error,
        errorCode: businessResult.errorCode,
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const date = args?.date || args?.checkInDate || today;
    const time = args?.time || "12:00";
    const partySize = args?.guests || args?.partySize || 1;

    const holdResult = await createHeldBooking({
      businessId: businessResult.businessId!,
      offeringId: itemId,
      offeringName: args?.itemTitle || args?.offeringName || "Booking",
      channel: mapToLedgerChannel(ctx.channel),
      actor: {
        userId,
        name: args?.customerName,
        phoneE164: (ctx as any)?.actor?.phoneE164 as any,
      },
      date,
      time,
      partySize,
      notes: args?.specialRequests || args?.notes,
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
      holdExpiresAt: holdResult.holdExpiresAt?.toISOString(),
      confirmationPrompt: holdResult.confirmationPrompt,
      pendingAction: holdResult.pendingAction,
    };
  },
};
