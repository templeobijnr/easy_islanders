/**
 * Manual Vendor Reply Test - bypasses index requirement
 * Tests vendor reply matching without complex queries
 */
import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";
import { sendWhatsApp } from "../services/twilio.service";

async function manualTestVendorReply() {
  logger.debug("🧪 Manual Vendor Reply Test (No Index Required)\n");

  const vendorPhone = "+905488639394";
  const vendorMessage = "OK, 5 minutes";

  logger.debug(`Vendor: ${vendorPhone}`);
  logger.debug(`Message: "${vendorMessage}"\n`);

  // Get ALL taxi bookings (no index needed)
  const allBookings = await db.collection("taxiBookings").get();

  logger.debug(`📋 Found ${allBookings.size} total taxi bookings\n`);

  // Filter pending bookings manually
  const pendingBookings = allBookings.docs.filter((doc) => {
    const data = doc.data();
    return data.status === "pending";
  });

  logger.debug(`⏳ ${pendingBookings.length} pending bookings\n`);

  // Find booking from this vendor
  for (const bookingDoc of pendingBookings) {
    const booking = bookingDoc.data();

    logger.debug(`Checking booking ${bookingDoc.id}...`);
    logger.debug(`  Taxi Listing ID: ${booking.taxiListingId}`);
    logger.debug(`  Created: ${booking.createdAt?.toDate()}`);

    if (!booking.taxiListingId) {
      logger.debug(`  ❌ No taxiListingId\n`);
      continue;
    }

    // Get taxi listing
    const taxiListing = await db
      .collection("listings")
      .doc(booking.taxiListingId)
      .get();

    if (!taxiListing.exists) {
      logger.debug(`  ❌ Taxi listing not found\n`);
      continue;
    }

    const taxiData = taxiListing.data();
    const taxiPhone = (taxiData?.agentPhone || "")
      .replace("whatsapp:", "")
      .replace("+", "");
    const cleanVendorPhone = vendorPhone.replace("+", "");

    logger.debug(`  Taxi Phone: ${taxiData?.agentPhone}`);
    logger.debug(`  Comparing: "${taxiPhone}" === "${cleanVendorPhone}"`);

    if (taxiPhone === cleanVendorPhone) {
      logger.debug(`  ✅ MATCH! This is the driver!\n`);

      // Update booking
      await bookingDoc.ref.update({
        status: "confirmed",
        driverLastMessage: vendorMessage,
        driverConfirmedAt: new Date(),
        updatedAt: new Date(),
      });

      logger.debug(`✅ Booking ${bookingDoc.id} updated to "confirmed"\n`);

      // Send confirmation to customer
      if (booking.customerContact) {
        const confirmMsg = `✅ *Taxi Confirmed!*\n\nYour taxi (${taxiData?.title || "Unknown"}) confirmed!\n\nDriver said: "${vendorMessage}"\n\nWe'll notify you when they arrive.`;

        await sendWhatsApp(booking.customerContact, confirmMsg);
        logger.debug(
          `📱 Confirmation sent to customer: ${booking.customerContact}\n`,
        );
      }

      logger.debug(`🎉 SUCCESS! Vendor reply processed.\n`);
      process.exit(0);
    } else {
      logger.debug(`  ❌ No match\n`);
    }
  }

  logger.debug(`❌ No matching booking found for vendor ${vendorPhone}\n`);
  process.exit(1);
}

if (require.main === module) {
  manualTestVendorReply().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
