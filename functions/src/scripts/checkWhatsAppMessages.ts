/**
 * Check recent WhatsApp messages
 */

import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";

async function checkMessages() {
  logger.debug("📨 Checking for recent WhatsApp messages...\n");

  // Get recent inbound messages (no orderBy to avoid index requirement)
  const messages = await db
    .collection("whatsappMessages")
    .where("direction", "==", "inbound")
    .limit(10)
    .get();

  if (messages.empty) {
    logger.debug("❌ No inbound messages found.");
  } else {
    logger.debug(`✅ Found ${messages.size} inbound message(s):\n`);

    const sortedDocs = messages.docs.sort((a, b) => {
      const aTime = a.data().receivedAt || "";
      const bTime = b.data().receivedAt || "";
      return bTime.localeCompare(aTime);
    });

    sortedDocs.forEach((doc, idx) => {
      const data = doc.data();
      logger.debug(`Message ${idx + 1}:`);
      logger.debug(`  From: ${data.from}`);
      logger.debug(`  Body: "${data.body}"`);
      logger.debug(`  Received: ${data.receivedAt}`);
      logger.debug(`  Message SID: ${data.messageSid || "N/A"}`);
      logger.debug(`  Doc ID: ${doc.id}\n`);
    });
  }

  // Also check taxi bookings status
  logger.debug("\n🚕 Checking taxi booking statuses...\n");

  const bookings = await db.collection("taxiBookings").limit(10).get();

  if (!bookings.empty) {
    logger.debug(`Found ${bookings.size} taxi booking(s):\n`);

    bookings.docs.forEach((doc, idx) => {
      const data = doc.data();
      logger.debug(`Booking ${idx + 1}:`);
      logger.debug(`  ID: ${doc.id}`);
      logger.debug(`  Status: ${data.status}`);
      logger.debug(`  Taxi: ${data.taxiInfo?.name || "Unknown"}`);
      logger.debug(`  Driver Message: ${data.driverLastMessage || "N/A"}`);
      logger.debug(`  Created: ${data.createdAt?.toDate?.() || "Unknown"}`);
      logger.debug(
        `  Confirmed: ${data.driverConfirmedAt?.toDate?.() || "N/A"}\n`,
      );
    });
  }

  process.exit(0);
}

if (require.main === module) {
  checkMessages().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}
