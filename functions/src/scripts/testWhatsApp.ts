import * as logger from "firebase-functions/logger";
import { sendWhatsApp, sendTaxiRequest } from "../services/twilio.service";
import { getErrorMessage } from '../utils/errors';

async function testWhatsAppMessage() {
  const testNumber = "+905488639394";

  logger.debug("📱 Testing WhatsApp message to:", testNumber);

  try {
    // Test 1: Simple message
    logger.debug("\n🧪 Test 1: Sending simple message...");
    const result1 = await sendWhatsApp(
      testNumber,
      "👋 Hello! This is a test message from Easy Islanders AI Assistant. " +
        "Your WhatsApp integration is working correctly!",
    );
    logger.debug("✅ Simple message sent:", result1);

    // Test 2: Taxi request format
    logger.debug("\n🧪 Test 2: Sending taxi request message...");
    const result2 = await sendTaxiRequest(testNumber, {
      customerContact: testNumber,
      customerName: "Test User",
      pickup: "Girne Marina",
      destination: "Kyrenia Gate",
      pickupLat: 35.3387,
      pickupLng: 33.3156,
      destinationLat: 35.3429,
      destinationLng: 33.3195,
      pickupTime: "now",
      notes: "This is a test booking",
    });
    logger.debug("✅ Taxi request sent:", result2);

    logger.debug("\n🎉 All tests completed successfully!");
  } catch (error: unknown) {
    console.error("❌ Error sending WhatsApp message:", getErrorMessage(error));
    console.error(
      "\n⚠️  Make sure you have configured your Twilio credentials in .env:",
    );
    console.error("   - TWILIO_ACCOUNT_SID");
    console.error("   - TWILIO_AUTH_TOKEN");
    console.error("   - TWILIO_WHATSAPP_FROM");
    process.exit(1);
  }
}

testWhatsAppMessage();
