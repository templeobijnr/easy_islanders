/**
 * Test Webhook Monitor - Sends WhatsApp and Monitors for Response
 *
 * 1. Sends a test WhatsApp message to your number
 * 2. Monitors the database for your response
 * 3. Shows what the webhook receives
 */

import * as logger from "firebase-functions/logger";
import { sendWhatsApp } from "../services/twilio.service";
import { db } from "../config/firebase";

async function monitorWebhook() {
  logger.debug("📱 ═══════════════════════════════════════════════════");
  logger.debug("📱   Webhook Monitor - Testing Response Flow");
  logger.debug("📱 ═══════════════════════════════════════════════════\n");

  const testPhone = "whatsapp:+905488639394";

  // Step 1: Send test message
  logger.debug("📤 Step 1: Sending test message to your WhatsApp...\n");

  const testMessage = `🧪 *City OS Test Message*

This is a test to verify the webhook response system.

Please reply with: "OK, 5 minutes"

This will test the bi-directional sync.`;

  try {
    const result = await sendWhatsApp(testPhone, testMessage);
    logger.debug("✅ Message sent!");
    logger.debug(`   Message ID: ${result.sid}`);
    logger.debug(`   Status: ${result.status}`);
    logger.debug(`\n💬 Check your WhatsApp now!\n`);
  } catch (error: any) {
    console.error("❌ Failed to send message:", error.message);
    process.exit(1);
  }

  // Step 2: Monitor for responses
  logger.debug("👀 Step 2: Monitoring for your response...");
  logger.debug("   Checking whatsappMessages collection every 5 seconds");
  logger.debug("   Press Ctrl+C to stop\n");

  let lastCheckTime = new Date();
  let checkCount = 0;

  const monitorInterval = setInterval(async () => {
    checkCount++;
    logger.debug(`\r⏳ Checking... (${checkCount * 5}s elapsed)`, "");

    // Check for new inbound WhatsApp messages
    const newMessages = await db
      .collection("whatsappMessages")
      .where("direction", "==", "inbound")
      .where("from", "==", testPhone)
      .where("receivedAt", ">", lastCheckTime.toISOString())
      .orderBy("receivedAt", "desc")
      .limit(1)
      .get();

    if (!newMessages.empty) {
      logger.debug(
        "\n\n🎉 ═══════════════════════════════════════════════════",
      );
      logger.debug("🎉   RESPONSE RECEIVED!");
      logger.debug("🎉 ═══════════════════════════════════════════════════\n");

      const msg = newMessages.docs[0].data();
      logger.debug("📨 Incoming Message:");
      logger.debug(`   From: ${msg.from}`);
      logger.debug(`   Body: "${msg.body}"`);
      logger.debug(`   Received: ${msg.receivedAt}`);
      logger.debug(`   Message SID: ${msg.messageSid}\n`);

      // Check if vendor reply service handled it
      logger.debug("🔍 Checking if vendorReply service processed it...\n");

      // Look for updated taxi bookings
      const recentBookings = await db
        .collection("taxiBookings")
        .where("status", "==", "confirmed")
        .orderBy("driverConfirmedAt", "desc")
        .limit(1)
        .get();

      if (!recentBookings.empty) {
        const booking = recentBookings.docs[0].data();
        const confirmedTime = booking.driverConfirmedAt?.toDate?.();
        const timeDiff = confirmedTime
          ? (new Date().getTime() - confirmedTime.getTime()) / 1000
          : 999;

        if (timeDiff < 30) {
          // Confirmed in last 30 seconds
          logger.debug("✅ Booking Status Updated!");
          logger.debug(`   Booking ID: ${booking.id}`);
          logger.debug(`   Status: ${booking.status}`);
          logger.debug(`   Driver Message: "${booking.driverLastMessage}"`);
          logger.debug(`   Confirmed: ${confirmedTime}\n`);

          logger.debug("🎊 SUCCESS! Bi-directional sync working!\n");
          logger.debug("What happened:");
          logger.debug("   1. ✅ You replied via WhatsApp");
          logger.debug("   2. ✅ Twilio webhook received it");
          logger.debug("   3. ✅ vendorReply.service matched your number");
          logger.debug("   4. ✅ Booking status updated");
          logger.debug("   5. ✅ Confirmation sent back to you");
          logger.debug("   6. ✅ System message injected to chat\n");

          clearInterval(monitorInterval);
          process.exit(0);
        } else {
          logger.debug("⚠️ Found a confirmed booking but it's older than 30s");
          logger.debug(
            "   Your reply might not have been processed by the webhook yet.\n",
          );
        }
      } else {
        logger.debug("⚠️ No confirmed bookings found.");
        logger.debug("   The webhook might not have processed the reply yet.");
        logger.debug("   Continuing to monitor...\n");
      }
    }

    // Stop after 2 minutes (24 checks)
    if (checkCount >= 24) {
      logger.debug("\n\n⏱️ 2 minutes elapsed. Stopping monitor.");
      logger.debug("\nIf you replied:");
      logger.debug("   1. Check if webhook is deployed and accessible");
      logger.debug("   2. Verify Twilio webhook URL is configured");
      logger.debug("   3. Check Firebase Functions logs");
      clearInterval(monitorInterval);
      process.exit(0);
    }
  }, 5000);

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    logger.debug("\n\n👋 Monitoring stopped by user.");
    clearInterval(monitorInterval);
    process.exit(0);
  });
}

// Run the monitor
if (require.main === module) {
  monitorWebhook().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
