"use strict";
/**
 * Check recent WhatsApp messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../config/firebase");
async function checkMessages() {
    console.log('📨 Checking for recent WhatsApp messages...\n');
    // Get recent inbound messages (no orderBy to avoid index requirement)
    const messages = await firebase_1.db.collection('whatsappMessages')
        .where('direction', '==', 'inbound')
        .limit(10)
        .get();
    if (messages.empty) {
        console.log('❌ No inbound messages found.');
    }
    else {
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
    const bookings = await firebase_1.db.collection('taxiBookings')
        .limit(10)
        .get();
    if (!bookings.empty) {
        console.log(`Found ${bookings.size} taxi booking(s):\n`);
        bookings.docs.forEach((doc, idx) => {
            var _a, _b, _c, _d, _e;
            const data = doc.data();
            console.log(`Booking ${idx + 1}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  Status: ${data.status}`);
            console.log(`  Taxi: ${((_a = data.taxiInfo) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'}`);
            console.log(`  Driver Message: ${data.driverLastMessage || 'N/A'}`);
            console.log(`  Created: ${((_c = (_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || 'Unknown'}`);
            console.log(`  Confirmed: ${((_e = (_d = data.driverConfirmedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || 'N/A'}\n`);
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
//# sourceMappingURL=checkWhatsAppMessages.js.map