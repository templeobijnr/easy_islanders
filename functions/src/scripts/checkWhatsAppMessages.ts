/**
 * Check recent WhatsApp messages
 */

import { db } from '../config/firebase';

async function checkMessages() {
    console.log('📨 Checking for recent WhatsApp messages...\n');

    // Get recent inbound messages (no orderBy to avoid index requirement)
    const messages = await db.collection('whatsappMessages')
        .where('direction', '==', 'inbound')
        .limit(10)
        .get();

    if (messages.empty) {
        console.log('❌ No inbound messages found.');
    } else {
        console.log(`✅ Found ${messages.size} inbound message(s):\n`);

        const sortedDocs = messages.docs.sort((a, b) => {
            const aTime = a.data().receivedAt || '';
            const bTime = b.data().receivedAt || '';
            return bTime.localeCompare(aTime);
        });

        sortedDocs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`Message ${idx + 1}:`);
            console.log(`  From: ${data.from}`);
            console.log(`  Body: "${data.body}"`);
            console.log(`  Received: ${data.receivedAt}`);
            console.log(`  Message SID: ${data.messageSid || 'N/A'}`);
            console.log(`  Doc ID: ${doc.id}\n`);
        });
    }

    // Also check taxi bookings status
    console.log('\n🚕 Checking taxi booking statuses...\n');

    const bookings = await db.collection('taxiBookings')
        .limit(10)
        .get();

    if (!bookings.empty) {
        console.log(`Found ${bookings.size} taxi booking(s):\n`);

        bookings.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`Booking ${idx + 1}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  Status: ${data.status}`);
            console.log(`  Taxi: ${data.taxiInfo?.name || 'Unknown'}`);
            console.log(`  Driver Message: ${data.driverLastMessage || 'N/A'}`);
            console.log(`  Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
            console.log(`  Confirmed: ${data.driverConfirmedAt?.toDate?.() || 'N/A'}\n`);
        });
    }

    process.exit(0);
}

if (require.main === module) {
    checkMessages().catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}
