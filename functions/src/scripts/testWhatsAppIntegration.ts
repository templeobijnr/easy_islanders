/**
 * Test script to send a WhatsApp message via Twilio and monitor for replies
 * Run: npm run tsx src/scripts/testWhatsAppIntegration.ts
 */

import * as logger from "firebase-functions/logger";
import { sendWhatsApp } from "../services/twilio.service";
import * as taxiService from "../services/taxi.service";

async function testWhatsAppIntegration() {
  logger.debug("🧪 Testing Twilio WhatsApp Integration\n");

  const testPhoneNumber = "+905488639394";

  try {
    // Test 1: Send a simple WhatsApp message
    logger.debug("📤 Test 1: Sending test WhatsApp message...");
    const result = await sendWhatsApp(
      testPhoneNumber,
      `🧪 *Test Message from Easy Islanders*\n\nThis is a test of the Twilio WhatsApp integration.\n\nPlease reply with "TEST OK" to confirm you received this message.\n\nTime: ${new Date().toLocaleString()}`,
    );

    logger.debug("✅ Message sent successfully!");
    logger.debug(`   SID: ${result.sid}`);
    logger.debug(`   Status: ${result.status}`);

    logger.debug("\n📱 Waiting for your reply...");
    logger.debug("   To test the webhook, you have two options:");
    logger.debug(
      "   1. Deploy to Firebase (webhook will be: https://YOUR_PROJECT.cloudfunctions.net/api/taxi/webhook)",
    );
    logger.debug("   2. Use ngrok to expose local webhook:");
    logger.debug("      - Run: ngrok http 5001");
    logger.debug("      - Configure Twilio webhook with ngrok URL");
    logger.debug(
      "\n   The webhook handler will process your reply and execute handleDriverReply()",
    );

    // Test 2: Simulate a driver reply (for testing the handler logic)
    logger.debug("\n📤 Test 2: Simulating driver reply handler...");
    const simulatedReply = await taxiService.handleDriverReply(
      testPhoneNumber,
      "YES A123",
    );
    logger.debug("   Handler response:", simulatedReply);

    logger.debug("\n✅ All tests completed!");
    logger.debug("\nNext steps:");
    logger.debug("1. Check your WhatsApp for the test message");
    logger.debug("2. Reply to test the webhook (requires public endpoint)");
    logger.debug("3. Run seedTaxiDrivers.ts to add test drivers");
    logger.debug("4. Test full flow with a taxi request");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  testWhatsAppIntegration()
    .then(() => {
      logger.debug("\n👋 Test script completed. Press Ctrl+C to exit.");
      // Keep process alive to monitor (in case webhook is configured)
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testWhatsAppIntegration };
