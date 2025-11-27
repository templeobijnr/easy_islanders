/**
 * Test script to debug taxi webhook
 * Simulates a driver replying "YES D2EU" to a taxi request
 */

import { db } from '../config/firebase';
import { handleDriverReply } from '../services/taxi.service';

async function testWebhook() {
    console.log('\n🧪 Testing Taxi Webhook Flow\n');
    console.log('=' .repeat(50));

    // Test data - simulating Twilio webhook payload
    const testPhone = 'whatsapp:+905488639394';
    const testMessage = 'YES D2EU';

    console.log(`\n1️⃣ Simulating incoming message:`);
    console.log(`   From: ${testPhone}`);
    console.log(`   Body: ${testMessage}`);

    // Check if driver exists
    console.log(`\n2️⃣ Checking if driver exists...`);
    const driverSnap = await db.collection('taxi_drivers')
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
    const requestsSnap = await db.collection('taxi_requests')
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
        const data = doc.data();
        console.log(`      ${index + 1}. ID: ${doc.id.slice(-6)}`);
        console.log(`         From: ${data.pickup?.address || 'N/A'}`);
        console.log(`         To: ${data.dropoff?.address || 'N/A'}`);
        console.log(`         Broadcast to: ${data.broadcastSentTo?.length || 0} drivers`);
        console.log(`         Driver in list: ${data.broadcastSentTo?.includes(driver.id) ? 'YES' : 'NO'}`);
    });

    // Test handleDriverReply
    console.log(`\n4️⃣ Testing handleDriverReply function...`);
    try {
        const reply = await handleDriverReply(testPhone, testMessage);
        console.log(`\n📬 Response from handleDriverReply:`);
        console.log(`   ${reply}`);

        // Check if request was updated
        const updatedRequest = await db.collection('taxi_requests')
            .doc(requestsSnap.docs[0].id)
            .get();

        const updatedData = updatedRequest.data();
        console.log(`\n5️⃣ Request status after reply:`);
        console.log(`   Status: ${updatedData?.status}`);
        console.log(`   Assigned to: ${updatedData?.driverName || 'N/A'}`);

    } catch (error: any) {
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
