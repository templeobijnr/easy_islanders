"use strict";
/**
 * Test Vendor Reply - Simulates WhatsApp Webhook Response
 *
 * This simulates you replying as a taxi driver via WhatsApp
 * and tests the complete bi-directional sync flow.
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
const vendorReply_service_1 = require("../services/vendorReply.service");
const firebase_1 = require("../config/firebase");
async function testVendorReply() {
    var _a, _b, _c, _d;
    logger.debug("📱 ═══════════════════════════════════════════════════");
    logger.debug("📱   Testing Vendor Reply (Bi-Directional Sync)");
    logger.debug("📱 ═══════════════════════════════════════════════════\n");
    // Get the most recent pending taxi booking
    const pendingBookings = await firebase_1.db
        .collection("taxiBookings")
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    if (pendingBookings.empty) {
        logger.debug("❌ No pending taxi bookings found.");
        logger.debug("   Run testTaxiDispatch.ts first to create a booking.");
        process.exit(1);
    }
    const booking = pendingBookings.docs[0];
    const bookingData = booking.data();
    logger.debug("📋 Found Pending Booking:");
    logger.debug(`   ID: ${booking.id}`);
    logger.debug(`   Taxi: ${bookingData.taxiTitle}`);
    logger.debug(`   Customer: ${bookingData.customerName}`);
    logger.debug(`   Pickup: ${bookingData.pickupLocation}`);
    logger.debug(`   Destination: ${bookingData.destination}`);
    logger.debug(`   Status: ${bookingData.status}`);
    logger.debug(`   Created: ${((_b = (_a = bookingData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || "Unknown"}\n`);
    // Simulate vendor reply
    const vendorPhone = "whatsapp:+905488639394";
    const vendorMessage = "OK, 5 minutes";
    logger.debug("💬 Simulating Vendor Reply:");
    logger.debug(`   From: ${vendorPhone}`);
    logger.debug(`   Message: "${vendorMessage}"\n`);
    logger.debug("🔄 Processing reply through handleVendorReply...\n");
    try {
        const wasHandled = await (0, vendorReply_service_1.handleVendorReply)(vendorPhone, vendorMessage);
        if (wasHandled) {
            logger.debug("✅ Reply was handled as vendor response!\n");
            // Check updated booking
            const updatedBooking = await firebase_1.db
                .collection("taxiBookings")
                .doc(booking.id)
                .get();
            const updatedData = updatedBooking.data();
            logger.debug("📊 Updated Booking Status:");
            logger.debug(`   Status: ${bookingData.status} → ${updatedData === null || updatedData === void 0 ? void 0 : updatedData.status}`);
            logger.debug(`   Driver Message: "${updatedData === null || updatedData === void 0 ? void 0 : updatedData.driverLastMessage}"`);
            logger.debug(`   Confirmed At: ${(_d = (_c = updatedData === null || updatedData === void 0 ? void 0 : updatedData.driverConfirmedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)}\n`);
            if ((updatedData === null || updatedData === void 0 ? void 0 : updatedData.status) === "confirmed") {
                logger.debug("🎉 SUCCESS! Booking confirmed!\n");
                logger.debug("✅ What happened:");
                logger.debug("   1. Webhook intercepted vendor reply");
                logger.debug("   2. handleVendorReply matched phone number to booking");
                logger.debug("   3. Status updated: pending → confirmed");
                logger.debug("   4. WhatsApp sent to customer (check your phone!)");
                logger.debug("   5. System message injected into chat context\n");
                // Check for system message in chat
                const chatSessions = await firebase_1.db
                    .collection("chatSessions")
                    .where("userId", "==", bookingData.userId)
                    .orderBy("lastMessageAt", "desc")
                    .limit(1)
                    .get();
                if (!chatSessions.empty) {
                    const sessionId = chatSessions.docs[0].id;
                    const recentMessages = await firebase_1.db
                        .collection("chatSessions")
                        .doc(sessionId)
                        .collection("messages")
                        .where("source", "==", "vendor_reply")
                        .orderBy("timestamp", "desc")
                        .limit(1)
                        .get();
                    if (!recentMessages.empty) {
                        const systemMsg = recentMessages.docs[0].data();
                        logger.debug("💬 System Message Injected:");
                        logger.debug(`   "${systemMsg.parts[0].text}"\n`);
                    }
                }
                logger.debug("🧪 Next Steps:");
                logger.debug("   1. Check your WhatsApp for confirmation message");
                logger.debug('   2. In your app, ask the AI: "Where\'s my taxi?"');
                logger.debug("   3. AI should respond with: \"Your taxi is confirmed! Driver said: 'OK, 5 minutes'\"");
            }
            else {
                logger.debug("⚠️ Status not confirmed. Current status:", updatedData === null || updatedData === void 0 ? void 0 : updatedData.status);
            }
        }
        else {
            logger.debug("❌ Reply was NOT handled as vendor response.");
            logger.debug("   This might mean:");
            logger.debug("   - Phone number doesn't match any pending orders");
            logger.debug("   - Booking status is not 'pending'");
            logger.debug("   - Database query issue");
        }
    }
    catch (error) {
        console.error("❌ Error processing vendor reply:", error);
    }
    logger.debug("\n🏁 ═══════════════════════════════════════════════════");
    logger.debug("🏁   Test Complete!");
    logger.debug("🏁 ═══════════════════════════════════════════════════\n");
    process.exit(0);
}
// Run the test
if (require.main === module) {
    testVendorReply().catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=testVendorReply.js.map