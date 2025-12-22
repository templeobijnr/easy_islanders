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
const errors_1 = require("../utils/errors");
/**
 * Test script to debug taxi webhook
 * Simulates a driver replying "YES D2EU" to a taxi request
 */
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const taxi_service_1 = require("../services/taxi.service");
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
    const driverSnap = await firebase_1.db
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
    const requestsSnap = await firebase_1.db
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
        var _a, _b, _c, _d;
        const data = doc.data();
        logger.debug(`      ${index + 1}. ID: ${doc.id.slice(-6)}`);
        logger.debug(`         From: ${((_a = data.pickup) === null || _a === void 0 ? void 0 : _a.address) || "N/A"}`);
        logger.debug(`         To: ${((_b = data.dropoff) === null || _b === void 0 ? void 0 : _b.address) || "N/A"}`);
        logger.debug(`         Broadcast to: ${((_c = data.broadcastSentTo) === null || _c === void 0 ? void 0 : _c.length) || 0} drivers`);
        logger.debug(`         Driver in list: ${((_d = data.broadcastSentTo) === null || _d === void 0 ? void 0 : _d.includes(driver.id)) ? "YES" : "NO"}`);
    });
    // Test handleDriverReply
    logger.debug(`\n4️⃣ Testing handleDriverReply function...`);
    try {
        const reply = await (0, taxi_service_1.handleDriverReply)(testPhone, testMessage);
        logger.debug(`\n📬 Response from handleDriverReply:`);
        logger.debug(`   ${reply}`);
        // Check if request was updated
        const updatedRequest = await firebase_1.db
            .collection("taxi_requests")
            .doc(requestsSnap.docs[0].id)
            .get();
        const updatedData = updatedRequest.data();
        logger.debug(`\n5️⃣ Request status after reply:`);
        logger.debug(`   Status: ${updatedData === null || updatedData === void 0 ? void 0 : updatedData.status}`);
        logger.debug(`   Assigned to: ${(updatedData === null || updatedData === void 0 ? void 0 : updatedData.driverName) || "N/A"}`);
    }
    catch (error) {
        console.error(`\n❌ Error in handleDriverReply:`, error);
        console.error(`   Message: ${(0, errors_1.getErrorMessage)(error)}`);
        if (error instanceof Error && error.stack) {
            console.error(`   Stack: ${error.stack}`);
        }
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
//# sourceMappingURL=testTaxiWebhook.js.map