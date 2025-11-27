"use strict";
/**
 * Test script to debug taxi webhook
 * Simulates a driver replying "YES D2EU" to a taxi request
 */
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../config/firebase");
const taxi_service_1 = require("../services/taxi.service");
async function testWebhook() {
    console.log('\n🧪 Testing Taxi Webhook Flow\n');
    console.log('='.repeat(50));
    // Test data - simulating Twilio webhook payload
    const testPhone = 'whatsapp:+905488639394';
    const testMessage = 'YES D2EU';
    console.log(`\n1️⃣ Simulating incoming message:`);
    console.log(`   From: ${testPhone}`);
    console.log(`   Body: ${testMessage}`);
    // Check if driver exists
    console.log(`\n2️⃣ Checking if driver exists...`);
    const driverSnap = await firebase_1.db.collection('taxi_drivers')
        .where('phone', '==', '+905488639394')
        .limit(1)
        .get();
    if (driverSnap.empty) {
        console.error(`   ❌ No driver found with phone +905488639394`);
        return;
    }
    const driver = driverSnap.docs[0];
    console.log(`   ✅ Driver found: ${driver.data().name} (ID: ${driver.id})`);
    // Check for pending requests
    console.log(`\n3️⃣ Checking for pending requests...`);
    const requestsSnap = await firebase_1.db.collection('taxi_requests')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    if (requestsSnap.empty) {
        console.error(`   ❌ No pending taxi requests found`);
        return;
    }
    console.log(`   ✅ Found ${requestsSnap.size} pending request(s):`);
    requestsSnap.docs.forEach((doc, index) => {
        var _a, _b, _c, _d;
        const data = doc.data();
        console.log(`      ${index + 1}. ID: ${doc.id.slice(-6)}`);
        console.log(`         From: ${((_a = data.pickup) === null || _a === void 0 ? void 0 : _a.address) || 'N/A'}`);
        console.log(`         To: ${((_b = data.dropoff) === null || _b === void 0 ? void 0 : _b.address) || 'N/A'}`);
        console.log(`         Broadcast to: ${((_c = data.broadcastSentTo) === null || _c === void 0 ? void 0 : _c.length) || 0} drivers`);
        console.log(`         Driver in list: ${((_d = data.broadcastSentTo) === null || _d === void 0 ? void 0 : _d.includes(driver.id)) ? 'YES' : 'NO'}`);
    });
    // Test handleDriverReply
    console.log(`\n4️⃣ Testing handleDriverReply function...`);
    try {
        const reply = await (0, taxi_service_1.handleDriverReply)(testPhone, testMessage);
        console.log(`\n📬 Response from handleDriverReply:`);
        console.log(`   ${reply}`);
        // Check if request was updated
        const updatedRequest = await firebase_1.db.collection('taxi_requests')
            .doc(requestsSnap.docs[0].id)
            .get();
        const updatedData = updatedRequest.data();
        console.log(`\n5️⃣ Request status after reply:`);
        console.log(`   Status: ${updatedData === null || updatedData === void 0 ? void 0 : updatedData.status}`);
        console.log(`   Assigned to: ${(updatedData === null || updatedData === void 0 ? void 0 : updatedData.driverName) || 'N/A'}`);
    }
    catch (error) {
        console.error(`\n❌ Error in handleDriverReply:`, error);
        console.error(`   Message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
    }
    console.log(`\n${'='.repeat(50)}\n`);
}
// Run the test
testWebhook()
    .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=testTaxiWebhook.js.map