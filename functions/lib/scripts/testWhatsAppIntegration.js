"use strict";
/**
 * Test script to send a WhatsApp message via Twilio and monitor for replies
 * Run: npm run tsx src/scripts/testWhatsAppIntegration.ts
 */
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
exports.testWhatsAppIntegration = testWhatsAppIntegration;
const twilio_service_1 = require("../services/twilio.service");
const taxiService = __importStar(require("../services/taxi.service"));
async function testWhatsAppIntegration() {
    console.log("🧪 Testing Twilio WhatsApp Integration\n");
    const testPhoneNumber = "+905488639394";
    try {
        // Test 1: Send a simple WhatsApp message
        console.log("📤 Test 1: Sending test WhatsApp message...");
        const result = await (0, twilio_service_1.sendWhatsApp)(testPhoneNumber, `🧪 *Test Message from Easy Islanders*\n\nThis is a test of the Twilio WhatsApp integration.\n\nPlease reply with "TEST OK" to confirm you received this message.\n\nTime: ${new Date().toLocaleString()}`);
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
        const simulatedReply = await taxiService.handleDriverReply(testPhoneNumber, "YES A123");
        console.log("   Handler response:", simulatedReply);
        console.log("\n✅ All tests completed!");
        console.log("\nNext steps:");
        console.log("1. Check your WhatsApp for the test message");
        console.log("2. Reply to test the webhook (requires public endpoint)");
        console.log("3. Run seedTaxiDrivers.ts to add test drivers");
        console.log("4. Test full flow with a taxi request");
    }
    catch (error) {
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
//# sourceMappingURL=testWhatsAppIntegration.js.map