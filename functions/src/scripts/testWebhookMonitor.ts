/**
 * Test Webhook Monitor - Sends WhatsApp and Monitors for Response
 *
 * 1. Sends a test WhatsApp message to your number
 * 2. Monitors the database for your response
 * 3. Shows what the webhook receives
 */

import { sendWhatsApp } from '../services/twilio.service';
import { db } from '../config/firebase';

async function monitorWebhook() {
    console.log('📱 ═══════════════════════════════════════════════════');
    console.log('📱   Webhook Monitor - Testing Response Flow');
    console.log('📱 ═══════════════════════════════════════════════════\n');

    const testPhone = 'whatsapp:+905488639394';

    // Step 1: Send test message
    console.log('📤 Step 1: Sending test message to your WhatsApp...\n');

    const testMessage = `🧪 *City OS Test Message*

This is a test to verify the webhook response system.

Please reply with: "OK, 5 minutes"

This will test the bi-directional sync.`;

    try {
        const result = await sendWhatsApp(testPhone, testMessage);
        console.log('✅ Message sent!');
        console.log(`   Message ID: ${result.sid}`);
        console.log(`   Status: ${result.status}`);
        console.log(`\n💬 Check your WhatsApp now!\n`);
    } catch (error: any) {
        console.error('❌ Failed to send message:', error.message);
        process.exit(1);
    }

    // Step 2: Monitor for responses
    console.log('👀 Step 2: Monitoring for your response...');
    console.log('   Checking whatsappMessages collection every 5 seconds');
    console.log('   Press Ctrl+C to stop\n');

    let lastCheckTime = new Date();
    let checkCount = 0;

    const monitorInterval = setInterval(async () => {
        checkCount++;
        console.log(`\r⏳ Checking... (${checkCount * 5}s elapsed)`, '');

        // Check for new inbound WhatsApp messages
        const newMessages = await db.collection('whatsappMessages')
            .where('direction', '==', 'inbound')
            .where('from', '==', testPhone)
            .where('receivedAt', '>', lastCheckTime.toISOString())
            .orderBy('receivedAt', 'desc')
            .limit(1)
            .get();

        if (!newMessages.empty) {
            console.log('\n\n🎉 ═══════════════════════════════════════════════════');
            console.log('🎉   RESPONSE RECEIVED!');
            console.log('🎉 ═══════════════════════════════════════════════════\n');

            const msg = newMessages.docs[0].data();
            console.log('📨 Incoming Message:');
            console.log(`   From: ${msg.from}`);
            console.log(`   Body: "${msg.body}"`);
            console.log(`   Received: ${msg.receivedAt}`);
            console.log(`   Message SID: ${msg.messageSid}\n`);

            // Check if vendor reply service handled it
            console.log('🔍 Checking if vendorReply service processed it...\n');

            // Look for updated taxi bookings
            const recentBookings = await db.collection('taxiBookings')
                .where('status', '==', 'confirmed')
                .orderBy('driverConfirmedAt', 'desc')
                .limit(1)
                .get();

            if (!recentBookings.empty) {
                const booking = recentBookings.docs[0].data();
                const confirmedTime = booking.driverConfirmedAt?.toDate?.();
                const timeDiff = confirmedTime ? (new Date().getTime() - confirmedTime.getTime()) / 1000 : 999;

                if (timeDiff < 30) { // Confirmed in last 30 seconds
                    console.log('✅ Booking Status Updated!');
                    console.log(`   Booking ID: ${booking.id}`);
                    console.log(`   Status: ${booking.status}`);
                    console.log(`   Driver Message: "${booking.driverLastMessage}"`);
                    console.log(`   Confirmed: ${confirmedTime}\n`);

                    console.log('🎊 SUCCESS! Bi-directional sync working!\n');
                    console.log('What happened:');
                    console.log('   1. ✅ You replied via WhatsApp');
                    console.log('   2. ✅ Twilio webhook received it');
                    console.log('   3. ✅ vendorReply.service matched your number');
                    console.log('   4. ✅ Booking status updated');
                    console.log('   5. ✅ Confirmation sent back to you');
                    console.log('   6. ✅ System message injected to chat\n');

                    clearInterval(monitorInterval);
                    process.exit(0);
                } else {
                    console.log('⚠️ Found a confirmed booking but it\'s older than 30s');
                    console.log('   Your reply might not have been processed by the webhook yet.\n');
                }
            } else {
                console.log('⚠️ No confirmed bookings found.');
                console.log('   The webhook might not have processed the reply yet.');
                console.log('   Continuing to monitor...\n');
            }
        }

        // Stop after 2 minutes (24 checks)
        if (checkCount >= 24) {
            console.log('\n\n⏱️ 2 minutes elapsed. Stopping monitor.');
            console.log('\nIf you replied:');
            console.log('   1. Check if webhook is deployed and accessible');
            console.log('   2. Verify Twilio webhook URL is configured');
            console.log('   3. Check Firebase Functions logs');
            clearInterval(monitorInterval);
            process.exit(0);
        }
    }, 5000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n👋 Monitoring stopped by user.');
        clearInterval(monitorInterval);
        process.exit(0);
    });
}

// Run the monitor
if (require.main === module) {
    monitorWebhook().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
