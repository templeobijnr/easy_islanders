/**
 * Test Vendor Reply - Simulates WhatsApp Webhook Response
 *
 * This simulates you replying as a taxi driver via WhatsApp
 * and tests the complete bi-directional sync flow.
 */

import { handleVendorReply } from '../services/vendorReply.service';
import { db } from '../config/firebase';

async function testVendorReply() {
    console.log('📱 ═══════════════════════════════════════════════════');
    console.log('📱   Testing Vendor Reply (Bi-Directional Sync)');
    console.log('📱 ═══════════════════════════════════════════════════\n');

    // Get the most recent pending taxi booking
    const pendingBookings = await db.collection('taxiBookings')
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
    console.log(`   Created: ${bookingData.createdAt?.toDate?.() || 'Unknown'}\n`);

    // Simulate vendor reply
    const vendorPhone = 'whatsapp:+905488639394';
    const vendorMessage = 'OK, 5 minutes';

    console.log('💬 Simulating Vendor Reply:');
    console.log(`   From: ${vendorPhone}`);
    console.log(`   Message: "${vendorMessage}"\n`);

    console.log('🔄 Processing reply through handleVendorReply...\n');

    try {
        const wasHandled = await handleVendorReply(vendorPhone, vendorMessage);

        if (wasHandled) {
            console.log('✅ Reply was handled as vendor response!\n');

            // Check updated booking
            const updatedBooking = await db.collection('taxiBookings').doc(booking.id).get();
            const updatedData = updatedBooking.data();

            console.log('📊 Updated Booking Status:');
            console.log(`   Status: ${bookingData.status} → ${updatedData?.status}`);
            console.log(`   Driver Message: "${updatedData?.driverLastMessage}"`);
            console.log(`   Confirmed At: ${updatedData?.driverConfirmedAt?.toDate?.()}\n`);

            if (updatedData?.status === 'confirmed') {
                console.log('🎉 SUCCESS! Booking confirmed!\n');
                console.log('✅ What happened:');
                console.log('   1. Webhook intercepted vendor reply');
                console.log('   2. handleVendorReply matched phone number to booking');
                console.log('   3. Status updated: pending → confirmed');
                console.log('   4. WhatsApp sent to customer (check your phone!)');
                console.log('   5. System message injected into chat context\n');

                // Check for system message in chat
                const chatSessions = await db.collection('chatSessions')
                    .where('userId', '==', bookingData.userId)
                    .orderBy('lastMessageAt', 'desc')
                    .limit(1)
                    .get();

                if (!chatSessions.empty) {
                    const sessionId = chatSessions.docs[0].id;
                    const recentMessages = await db.collection('chatSessions')
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
            } else {
                console.log('⚠️ Status not confirmed. Current status:', updatedData?.status);
            }
        } else {
            console.log('❌ Reply was NOT handled as vendor response.');
            console.log('   This might mean:');
            console.log('   - Phone number doesn\'t match any pending orders');
            console.log('   - Booking status is not \'pending\'');
            console.log('   - Database query issue');
        }
    } catch (error) {
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
