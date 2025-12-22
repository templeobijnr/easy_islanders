"use strict";
/**
 * Test Taxi Dispatch - Sends Real WhatsApp Message
 *
 * This script simulates a taxi dispatch and sends an actual WhatsApp message
 * to test the complete flow.
 *
 * Run with:
 * GCLOUD_PROJECT="easy-islanders" \
 * npx ts-node -r esbuild-register src/scripts/testTaxiDispatch.ts
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
const logger = __importStar(require("firebase-functions/logger"));
const tool_service_1 = require("../services/agent/tool.service");
async function testTaxiDispatch() {
    var _a, _b, _c, _d, _e, _f;
    logger.debug("🚕 ═══════════════════════════════════════════════════");
    logger.debug("🚕   Testing Taxi Dispatch with Real WhatsApp");
    logger.debug("🚕 ═══════════════════════════════════════════════════\n");
    // Test 1: Kyrenia Marina Pickup (Should select Kyrenia Premium Taxi)
    logger.debug("📍 Test 1: Kyrenia Marina to Bellapais\n");
    try {
        const result = (await tool_service_1.toolResolvers.dispatchTaxi({
            pickupLocation: "Kyrenia Marina",
            destination: "Bellapais Abbey",
            pickupLat: 35.3369,
            pickupLng: 33.3249,
            // Note: destinationLat/Lng removed - not needed in new system
            customerContact: "whatsapp:+905488639394", // Your test number
            customerName: "City OS Test User",
            notes: "This is a test dispatch from City OS",
        }, "test-user-123"));
        logger.debug("\n✅ Taxi Dispatch Result:");
        logger.debug(JSON.stringify(result, null, 2));
        if (result.success) {
            logger.debug("\n🎉 SUCCESS!");
            logger.debug(`📱 WhatsApp sent to taxi driver: ${(_a = result.booking.taxiInfo) === null || _a === void 0 ? void 0 : _a.name}`);
            logger.debug(`🚗 Vehicle: ${(_b = result.booking.taxiInfo) === null || _b === void 0 ? void 0 : _b.vehicle}`);
            logger.debug(`🔢 Plate: ${(_c = result.booking.taxiInfo) === null || _c === void 0 ? void 0 : _c.plateNumber}`);
            logger.debug(`⭐ Rating: ${(_d = result.booking.taxiInfo) === null || _d === void 0 ? void 0 : _d.rating}/5`);
            logger.debug(`\n💬 Check your WhatsApp (+905488639394) for the booking request!`);
            logger.debug(`\n📲 To test bi-directional sync:`);
            logger.debug(`   1. Reply "OK, 5 minutes" via WhatsApp`);
            logger.debug(`   2. Check the booking status in Firestore (taxiBookings collection)`);
            logger.debug(`   3. The webhook will update the status automatically`);
        }
        else {
            logger.debug("\n❌ FAILED:");
            logger.debug(result.error);
        }
    }
    catch (error) {
        console.error("\n❌ Error:", error);
    }
    logger.debug("\n───────────────────────────────────────────────────────\n");
    // Test 2: Generic request (Should select any available taxi)
    logger.debug("📍 Test 2: Generic Taxi Request (Airport)\n");
    try {
        const result2 = (await tool_service_1.toolResolvers.dispatchTaxi({
            pickupLocation: "Ercan Airport",
            destination: "Kyrenia Center",
            customerContact: "whatsapp:+905488639394",
            customerName: "Airport Passenger",
            notes: "Luggage: 2 suitcases",
        }, "test-user-456"));
        logger.debug("\n✅ Taxi Dispatch Result:");
        logger.debug(JSON.stringify(result2, null, 2));
        if (result2.success) {
            logger.debug("\n🎉 SUCCESS!");
            logger.debug(`📱 WhatsApp sent to: ${(_e = result2.booking.taxiInfo) === null || _e === void 0 ? void 0 : _e.name}`);
            logger.debug(`🚗 Vehicle: ${(_f = result2.booking.taxiInfo) === null || _f === void 0 ? void 0 : _f.vehicle}`);
        }
    }
    catch (error) {
        console.error("\n❌ Error:", error);
    }
    logger.debug("\n🏁 ═══════════════════════════════════════════════════");
    logger.debug("🏁   Test Complete!");
    logger.debug("🏁 ═══════════════════════════════════════════════════\n");
    process.exit(0);
}
// Run the test
if (require.main === module) {
    testTaxiDispatch().catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=testTaxiDispatch.js.map