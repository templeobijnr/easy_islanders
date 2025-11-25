/**
 * Test script to send a WhatsApp message via Twilio and monitor for replies
 * Run: npm run tsx src/scripts/testWhatsAppIntegration.ts
 */

import { sendWhatsApp } from '../services/twilio.service';
import * as taxiService from '../services/taxi.service';

async function testWhatsAppIntegration() {
    console.log("🧪 Testing Twilio WhatsApp Integration\n");

    const testPhoneNumber = "+905488639394";

    try {
        // Test 1: Send a simple WhatsApp message
        console.log("📤 Test 1: Sending test WhatsApp message...");
        const result = await sendWhatsApp(
            testPhoneNumber,
            `🧪 *Test Message from Easy Islanders*\n\nThis is a test of the Twilio WhatsApp integration.\n\nPlease reply with "TEST OK" to confirm you received this message.\n\nTime: ${new Date().toLocaleString()}`
        );

        console.log("✅ Message sent successfully!");
        console.log(`   SID: ${result.sid}`);
        console.log(`   Status: ${result.status}`);

        console.log("\n📱 Waiting for your reply...");
        console.log("   To test the webhook, you have two options:");
        console.log("   1. Deploy to Firebase (webhook will be: https://YOUR_PROJECT.cloudfunctions.net/api/taxi/webhook)");
        console.log("   2. Use ngrok to expose local webhook:");
        console.log("      - Run: ngrok http 5001");
        console.log("      - Configure Twilio webhook with ngrok URL");
        console.log("\n   The webhook handler will process your reply and execute handleDriverReply()");

        // Test 2: Simulate a driver reply (for testing the handler logic)
        console.log("\n📤 Test 2: Simulating driver reply handler...");
        const simulatedReply = await taxiService.handleDriverReply(
            testPhoneNumber,
            "YES A123"
        );
        console.log("   Handler response:", simulatedReply);

        console.log("\n✅ All tests completed!");
        console.log("\nNext steps:");
        console.log("1. Check your WhatsApp for the test message");
        console.log("2. Reply to test the webhook (requires public endpoint)");
        console.log("3. Run seedTaxiDrivers.ts to add test drivers");
        console.log("4. Test full flow with a taxi request");

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    testWhatsAppIntegration()
        .then(() => {
            console.log("\n👋 Test script completed. Press Ctrl+C to exit.");
            // Keep process alive to monitor (in case webhook is configured)
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { testWhatsAppIntegration };
