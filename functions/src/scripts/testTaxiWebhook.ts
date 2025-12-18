/**
 * Test script to debug taxi webhook
 * Simulates a driver replying "YES D2EU" to a taxi request
 */

import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";
import { handleDriverReply } from "../services/taxi.service";

async function testWebhook() {
  logger.debug("\n🧪 Testing Taxi Webhook Flow\n");
  logger.debug("=".repeat(50));

  // Test data - simulating Twilio webhook payload
  const testPhone = "whatsapp:+905488639394";
  const testMessage = "YES D2EU";

  logger.debug(`\n1️⃣ Simulating incoming message:`);
  logger.debug(`   From: ${testPhone}`);
  logger.debug(`   Body: ${testMessage}`);

  // Check if driver exists
  logger.debug(`\n2️⃣ Checking if driver exists...`);
  const driverSnap = await db
    .collection("taxi_drivers")
    .where("phone", "==", "+905488639394")
    .limit(1)
    .get();

  if (driverSnap.empty) {
    console.error(`   ❌ No driver found with phone +905488639394`);
    return;
  }

  const driver = driverSnap.docs[0];
  logger.debug(`   ✅ Driver found: ${driver.data().name} (ID: ${driver.id})`);

  // Check for pending requests
  logger.debug(`\n3️⃣ Checking for pending requests...`);
  const requestsSnap = await db
    .collection("taxi_requests")
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  if (requestsSnap.empty) {
    console.error(`   ❌ No pending taxi requests found`);
    return;
  }

  logger.debug(`   ✅ Found ${requestsSnap.size} pending request(s):`);
  requestsSnap.docs.forEach((doc, index) => {
    const data = doc.data();
    logger.debug(`      ${index + 1}. ID: ${doc.id.slice(-6)}`);
    logger.debug(`         From: ${data.pickup?.address || "N/A"}`);
    logger.debug(`         To: ${data.dropoff?.address || "N/A"}`);
    logger.debug(
      `         Broadcast to: ${data.broadcastSentTo?.length || 0} drivers`,
    );
    logger.debug(
      `         Driver in list: ${data.broadcastSentTo?.includes(driver.id) ? "YES" : "NO"}`,
    );
  });

  // Test handleDriverReply
  logger.debug(`\n4️⃣ Testing handleDriverReply function...`);
  try {
    const reply = await handleDriverReply(testPhone, testMessage);
    logger.debug(`\n📬 Response from handleDriverReply:`);
    logger.debug(`   ${reply}`);

    // Check if request was updated
    const updatedRequest = await db
      .collection("taxi_requests")
      .doc(requestsSnap.docs[0].id)
      .get();

    const updatedData = updatedRequest.data();
    logger.debug(`\n5️⃣ Request status after reply:`);
    logger.debug(`   Status: ${updatedData?.status}`);
    logger.debug(`   Assigned to: ${updatedData?.driverName || "N/A"}`);
  } catch (error: any) {
    console.error(`\n❌ Error in handleDriverReply:`, error);
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }

  logger.debug(`\n${"=".repeat(50)}\n`);
}

// Run the test
testWebhook()
  .then(() => {
    logger.debug("✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
