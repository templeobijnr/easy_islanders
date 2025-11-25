"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twilio_service_1 = require("../services/twilio.service");
async function testWhatsAppMessage() {
    const testNumber = '+905488639394';
    console.log('📱 Testing WhatsApp message to:', testNumber);
    try {
        // Test 1: Simple message
        console.log('\n🧪 Test 1: Sending simple message...');
        const result1 = await (0, twilio_service_1.sendWhatsApp)(testNumber, '👋 Hello! This is a test message from Easy Islanders AI Assistant. ' +
            'Your WhatsApp integration is working correctly!');
        console.log('✅ Simple message sent:', result1);
        // Test 2: Taxi request format
        console.log('\n🧪 Test 2: Sending taxi request message...');
        const result2 = await (0, twilio_service_1.sendTaxiRequest)(testNumber, {
            customerContact: testNumber,
            customerName: 'Test User',
            pickup: 'Girne Marina',
            destination: 'Kyrenia Gate',
            pickupLat: 35.3387,
            pickupLng: 33.3156,
            destinationLat: 35.3429,
            destinationLng: 33.3195,
            pickupTime: 'now',
            notes: 'This is a test booking'
        });
        console.log('✅ Taxi request sent:', result2);
        console.log('\n🎉 All tests completed successfully!');
    }
    catch (error) {
        console.error('❌ Error sending WhatsApp message:', error.message);
        console.error('\n⚠️  Make sure you have configured your Twilio credentials in .env:');
        console.error('   - TWILIO_ACCOUNT_SID');
        console.error('   - TWILIO_AUTH_TOKEN');
        console.error('   - TWILIO_WHATSAPP_FROM');
        process.exit(1);
    }
}
testWhatsAppMessage();
//# sourceMappingURL=testWhatsApp.js.map