"use strict";
/**
 * Test Vendor Reply - Simulates WhatsApp Webhook Response
 *
 * This simulates you replying as a taxi driver via WhatsApp
 * and tests the complete bi-directional sync flow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vendorReply_service_1 = require("../services/vendorReply.service");
const firebase_1 = require("../config/firebase");
async function testVendorReply() {
    var _a, _b, _c, _d;
    console.log('📱 ═══════════════════════════════════════════════════');
    console.log('📱   Testing Vendor Reply (Bi-Directional Sync)');
    console.log('📱 ═══════════════════════════════════════════════════\n');
    // Get the most recent pending taxi booking
    const pendingBookings = await firebase_1.db.collection('taxiBookings')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (pendingBookings.empty) {
        console.log('❌ No pending taxi bookings found.');
        console.log('   Run testTaxiDispatch.ts first to create a booking.');
        process.exit(1);
    }
    const booking = pendingBookings.docs[0];
    const bookingData = booking.data();
    console.log('📋 Found Pending Booking:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   Taxi: ${bookingData.taxiTitle}`);
    console.log(`   Customer: ${bookingData.customerName}`);
    console.log(`   Pickup: ${bookingData.pickupLocation}`);
    console.log(`   Destination: ${bookingData.destination}`);
    console.log(`   Status: ${bookingData.status}`);
    console.log(`   Created: ${((_b = (_a = bookingData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || 'Unknown'}\n`);
    // Simulate vendor reply
    const vendorPhone = 'whatsapp:+905488639394';
    const vendorMessage = 'OK, 5 minutes';
    console.log('💬 Simulating Vendor Reply:');
    console.log(`   From: ${vendorPhone}`);
    console.log(`   Message: "${vendorMessage}"\n`);
    console.log('🔄 Processing reply through handleVendorReply...\n');
    try {
        const wasHandled = await (0, vendorReply_service_1.handleVendorReply)(vendorPhone, vendorMessage);
        if (wasHandled) {
            console.log('✅ Reply was handled as vendor response!\n');
            // Check updated booking
            const updatedBooking = await firebase_1.db.collection('taxiBookings').doc(booking.id).get();
            const updatedData = updatedBooking.data();
            console.log('📊 Updated Booking Status:');
            console.log(`   Status: ${bookingData.status} → ${updatedData === null || updatedData === void 0 ? void 0 : updatedData.status}`);
            console.log(`   Driver Message: "${updatedData === null || updatedData === void 0 ? void 0 : updatedData.driverLastMessage}"`);
            console.log(`   Confirmed At: ${(_d = (_c = updatedData === null || updatedData === void 0 ? void 0 : updatedData.driverConfirmedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)}\n`);
            if ((updatedData === null || updatedData === void 0 ? void 0 : updatedData.status) === 'confirmed') {
                console.log('🎉 SUCCESS! Booking confirmed!\n');
                console.log('✅ What happened:');
                console.log('   1. Webhook intercepted vendor reply');
                console.log('   2. handleVendorReply matched phone number to booking');
                console.log('   3. Status updated: pending → confirmed');
                console.log('   4. WhatsApp sent to customer (check your phone!)');
                console.log('   5. System message injected into chat context\n');
                // Check for system message in chat
                const chatSessions = await firebase_1.db.collection('chatSessions')
                    .where('userId', '==', bookingData.userId)
                    .orderBy('lastMessageAt', 'desc')
                    .limit(1)
                    .get();
                if (!chatSessions.empty) {
                    const sessionId = chatSessions.docs[0].id;
                    const recentMessages = await firebase_1.db.collection('chatSessions')
                        .doc(sessionId)
                        .collection('messages')
                        .where('source', '==', 'vendor_reply')
                        .orderBy('timestamp', 'desc')
                        .limit(1)
                        .get();
                    if (!recentMessages.empty) {
                        const systemMsg = recentMessages.docs[0].data();
                        console.log('💬 System Message Injected:');
                        console.log(`   "${systemMsg.parts[0].text}"\n`);
                    }
                }
                console.log('🧪 Next Steps:');
                console.log('   1. Check your WhatsApp for confirmation message');
                console.log('   2. In your app, ask the AI: "Where\'s my taxi?"');
                console.log('   3. AI should respond with: "Your taxi is confirmed! Driver said: \'OK, 5 minutes\'"');
            }
            else {
                console.log('⚠️ Status not confirmed. Current status:', updatedData === null || updatedData === void 0 ? void 0 : updatedData.status);
            }
        }
        else {
            console.log('❌ Reply was NOT handled as vendor response.');
            console.log('   This might mean:');
            console.log('   - Phone number doesn\'t match any pending orders');
            console.log('   - Booking status is not \'pending\'');
            console.log('   - Database query issue');
        }
    }
    catch (error) {
        console.error('❌ Error processing vendor reply:', error);
    }
    console.log('\n🏁 ═══════════════════════════════════════════════════');
    console.log('🏁   Test Complete!');
    console.log('🏁 ═══════════════════════════════════════════════════\n');
    process.exit(0);
}
// Run the test
if (require.main === module) {
    testVendorReply().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=testVendorReply.js.map