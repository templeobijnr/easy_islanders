/**
 * Test Taxi Dispatch - Sends Real WhatsApp Message
 *
 * This script simulates a taxi dispatch and sends an actual WhatsApp message
 * to test the complete flow.
 *
 * Run with:
 * GCLOUD_PROJECT="easy-islanders" \
 * npx ts-node -r esbuild-register src/scripts/testTaxiDispatch.ts
 */

import * as logger from "firebase-functions/logger";
import { toolResolvers } from "../services/agent/tool.service";

async function testTaxiDispatch() {
  logger.debug("🚕 ═══════════════════════════════════════════════════");
  logger.debug("🚕   Testing Taxi Dispatch with Real WhatsApp");
  logger.debug("🚕 ═══════════════════════════════════════════════════\n");

  // Test 1: Kyrenia Marina Pickup (Should select Kyrenia Premium Taxi)
  logger.debug("📍 Test 1: Kyrenia Marina to Bellapais\n");

  try {
    const result = (await toolResolvers.dispatchTaxi(
      {
        pickupLocation: "Kyrenia Marina",
        destination: "Bellapais Abbey",
        pickupLat: 35.3369,
        pickupLng: 33.3249,
        // Note: destinationLat/Lng removed - not needed in new system
        customerContact: "whatsapp:+905488639394", // Your test number
        customerName: "City OS Test User",
        notes: "This is a test dispatch from City OS",
      },
      "test-user-123",
    )) as any;

    logger.debug("\n✅ Taxi Dispatch Result:");
    logger.debug(JSON.stringify(result, null, 2));

    if (result.success) {
      logger.debug("\n🎉 SUCCESS!");
      logger.debug(
        `📱 WhatsApp sent to taxi driver: ${result.booking.taxiInfo?.name}`,
      );
      logger.debug(`🚗 Vehicle: ${result.booking.taxiInfo?.vehicle}`);
      logger.debug(`🔢 Plate: ${result.booking.taxiInfo?.plateNumber}`);
      logger.debug(`⭐ Rating: ${result.booking.taxiInfo?.rating}/5`);
      logger.debug(
        `\n💬 Check your WhatsApp (+905488639394) for the booking request!`,
      );
      logger.debug(`\n📲 To test bi-directional sync:`);
      logger.debug(`   1. Reply "OK, 5 minutes" via WhatsApp`);
      logger.debug(
        `   2. Check the booking status in Firestore (taxiBookings collection)`,
      );
      logger.debug(`   3. The webhook will update the status automatically`);
    } else {
      logger.debug("\n❌ FAILED:");
      logger.debug(result.error);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }

  logger.debug("\n───────────────────────────────────────────────────────\n");

  // Test 2: Generic request (Should select any available taxi)
  logger.debug("📍 Test 2: Generic Taxi Request (Airport)\n");

  try {
    const result2 = (await toolResolvers.dispatchTaxi(
      {
        pickupLocation: "Ercan Airport",
        destination: "Kyrenia Center",
        customerContact: "whatsapp:+905488639394",
        customerName: "Airport Passenger",
        notes: "Luggage: 2 suitcases",
      },
      "test-user-456",
    )) as any;

    logger.debug("\n✅ Taxi Dispatch Result:");
    logger.debug(JSON.stringify(result2, null, 2));

    if (result2.success) {
      logger.debug("\n🎉 SUCCESS!");
      logger.debug(`📱 WhatsApp sent to: ${result2.booking.taxiInfo?.name}`);
      logger.debug(`🚗 Vehicle: ${result2.booking.taxiInfo?.vehicle}`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }

  logger.debug("\n🏁 ═══════════════════════════════════════════════════");
  logger.debug("🏁   Test Complete!");
  logger.debug("🏁 ═══════════════════════════════════════════════════\n");

  process.exit(0);
}

// Run the test
if (require.main === module) {
  testTaxiDispatch().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
