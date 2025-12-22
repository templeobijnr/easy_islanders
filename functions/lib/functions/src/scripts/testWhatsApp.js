"use strict";
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
const logger = __importStar(require("firebase-functions/logger"));
const twilio_service_1 = require("../services/twilio.service");
const errors_1 = require("../utils/errors");
async function testWhatsAppMessage() {
    const testNumber = "+905488639394";
    logger.debug("📱 Testing WhatsApp message to:", testNumber);
    try {
        // Test 1: Simple message
        logger.debug("\n🧪 Test 1: Sending simple message...");
        const result1 = await (0, twilio_service_1.sendWhatsApp)(testNumber, "👋 Hello! This is a test message from Easy Islanders AI Assistant. " +
            "Your WhatsApp integration is working correctly!");
        logger.debug("✅ Simple message sent:", result1);
        // Test 2: Taxi request format
        logger.debug("\n🧪 Test 2: Sending taxi request message...");
        const result2 = await (0, twilio_service_1.sendTaxiRequest)(testNumber, {
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
    }
    catch (error) {
        console.error("❌ Error sending WhatsApp message:", (0, errors_1.getErrorMessage)(error));
        console.error("\n⚠️  Make sure you have configured your Twilio credentials in .env:");
        console.error("   - TWILIO_ACCOUNT_SID");
        console.error("   - TWILIO_AUTH_TOKEN");
        console.error("   - TWILIO_WHATSAPP_FROM");
        process.exit(1);
    }
}
testWhatsAppMessage();
//# sourceMappingURL=testWhatsApp.js.map