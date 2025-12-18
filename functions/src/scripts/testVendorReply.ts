/**
 * Test Vendor Reply - Simulates WhatsApp Webhook Response
 *
 * This simulates you replying as a taxi driver via WhatsApp
 * and tests the complete bi-directional sync flow.
 */

import * as logger from "firebase-functions/logger";
import { handleVendorReply } from "../services/vendorReply.service";
import { db } from "../config/firebase";

async function testVendorReply() {
  logger.debug("📱 ═══════════════════════════════════════════════════");
  logger.debug("📱   Testing Vendor Reply (Bi-Directional Sync)");
  logger.debug("📱 ═══════════════════════════════════════════════════\n");

  // Get the most recent pending taxi booking
  const pendingBookings = await db
    .collection("taxiBookings")
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (pendingBookings.empty) {
    logger.debug("❌ No pending taxi bookings found.");
    logger.debug("   Run testTaxiDispatch.ts first to create a booking.");
    process.exit(1);
  }

  const booking = pendingBookings.docs[0];
  const bookingData = booking.data();

  logger.debug("📋 Found Pending Booking:");
  logger.debug(`   ID: ${booking.id}`);
  logger.debug(`   Taxi: ${bookingData.taxiTitle}`);
  logger.debug(`   Customer: ${bookingData.customerName}`);
  logger.debug(`   Pickup: ${bookingData.pickupLocation}`);
  logger.debug(`   Destination: ${bookingData.destination}`);
  logger.debug(`   Status: ${bookingData.status}`);
  logger.debug(
    `   Created: ${bookingData.createdAt?.toDate?.() || "Unknown"}\n`,
  );

  // Simulate vendor reply
  const vendorPhone = "whatsapp:+905488639394";
  const vendorMessage = "OK, 5 minutes";

  logger.debug("💬 Simulating Vendor Reply:");
  logger.debug(`   From: ${vendorPhone}`);
  logger.debug(`   Message: "${vendorMessage}"\n`);

  logger.debug("🔄 Processing reply through handleVendorReply...\n");

  try {
    const wasHandled = await handleVendorReply(vendorPhone, vendorMessage);

    if (wasHandled) {
      logger.debug("✅ Reply was handled as vendor response!\n");

      // Check updated booking
      const updatedBooking = await db
        .collection("taxiBookings")
        .doc(booking.id)
        .get();
      const updatedData = updatedBooking.data();

      logger.debug("📊 Updated Booking Status:");
      logger.debug(`   Status: ${bookingData.status} → ${updatedData?.status}`);
      logger.debug(`   Driver Message: "${updatedData?.driverLastMessage}"`);
      logger.debug(
        `   Confirmed At: ${updatedData?.driverConfirmedAt?.toDate?.()}\n`,
      );

      if (updatedData?.status === "confirmed") {
        logger.debug("🎉 SUCCESS! Booking confirmed!\n");
        logger.debug("✅ What happened:");
        logger.debug("   1. Webhook intercepted vendor reply");
        logger.debug("   2. handleVendorReply matched phone number to booking");
        logger.debug("   3. Status updated: pending → confirmed");
        logger.debug("   4. WhatsApp sent to customer (check your phone!)");
        logger.debug("   5. System message injected into chat context\n");

        // Check for system message in chat
        const chatSessions = await db
          .collection("chatSessions")
          .where("userId", "==", bookingData.userId)
          .orderBy("lastMessageAt", "desc")
          .limit(1)
          .get();

        if (!chatSessions.empty) {
          const sessionId = chatSessions.docs[0].id;
          const recentMessages = await db
            .collection("chatSessions")
            .doc(sessionId)
            .collection("messages")
            .where("source", "==", "vendor_reply")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

          if (!recentMessages.empty) {
            const systemMsg = recentMessages.docs[0].data();
            logger.debug("💬 System Message Injected:");
            logger.debug(`   "${systemMsg.parts[0].text}"\n`);
          }
        }

        logger.debug("🧪 Next Steps:");
        logger.debug("   1. Check your WhatsApp for confirmation message");
        logger.debug('   2. In your app, ask the AI: "Where\'s my taxi?"');
        logger.debug(
          "   3. AI should respond with: \"Your taxi is confirmed! Driver said: 'OK, 5 minutes'\"",
        );
      } else {
        logger.debug(
          "⚠️ Status not confirmed. Current status:",
          updatedData?.status,
        );
      }
    } else {
      logger.debug("❌ Reply was NOT handled as vendor response.");
      logger.debug("   This might mean:");
      logger.debug("   - Phone number doesn't match any pending orders");
      logger.debug("   - Booking status is not 'pending'");
      logger.debug("   - Database query issue");
    }
  } catch (error) {
    console.error("❌ Error processing vendor reply:", error);
  }

  logger.debug("\n🏁 ═══════════════════════════════════════════════════");
  logger.debug("🏁   Test Complete!");
  logger.debug("🏁 ═══════════════════════════════════════════════════\n");

  process.exit(0);
}

// Run the test
if (require.main === module) {
  testVendorReply().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
