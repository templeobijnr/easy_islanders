"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Manual Vendor Reply Test - bypasses index requirement
 * Tests vendor reply matching without complex queries
 */
const firebase_1 = require("../config/firebase");
const twilio_service_1 = require("../services/twilio.service");
async function manualTestVendorReply() {
    var _a;
    console.log('🧪 Manual Vendor Reply Test (No Index Required)\n');
    const vendorPhone = '+905488639394';
    const vendorMessage = 'OK, 5 minutes';
    console.log(`Vendor: ${vendorPhone}`);
    console.log(`Message: "${vendorMessage}"\n`);
    // Get ALL taxi bookings (no index needed)
    const allBookings = await firebase_1.db.collection('taxiBookings').get();
    console.log(`📋 Found ${allBookings.size} total taxi bookings\n`);
    // Filter pending bookings manually
    const pendingBookings = allBookings.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'pending';
    });
    console.log(`⏳ ${pendingBookings.length} pending bookings\n`);
    // Find booking from this vendor
    for (const bookingDoc of pendingBookings) {
        const booking = bookingDoc.data();
        console.log(`Checking booking ${bookingDoc.id}...`);
        console.log(`  Taxi Listing ID: ${booking.taxiListingId}`);
        console.log(`  Created: ${(_a = booking.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()}`);
        if (!booking.taxiListingId) {
            console.log(`  ❌ No taxiListingId\n`);
            continue;
        }
        // Get taxi listing
        const taxiListing = await firebase_1.db.collection('listings').doc(booking.taxiListingId).get();
        if (!taxiListing.exists) {
            console.log(`  ❌ Taxi listing not found\n`);
            continue;
        }
        const taxiData = taxiListing.data();
        const taxiPhone = ((taxiData === null || taxiData === void 0 ? void 0 : taxiData.agentPhone) || '').replace('whatsapp:', '').replace('+', '');
        const cleanVendorPhone = vendorPhone.replace('+', '');
        console.log(`  Taxi Phone: ${taxiData === null || taxiData === void 0 ? void 0 : taxiData.agentPhone}`);
        console.log(`  Comparing: "${taxiPhone}" === "${cleanVendorPhone}"`);
        if (taxiPhone === cleanVendorPhone) {
            console.log(`  ✅ MATCH! This is the driver!\n`);
            // Update booking
            await bookingDoc.ref.update({
                status: 'confirmed',
                driverLastMessage: vendorMessage,
                driverConfirmedAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`✅ Booking ${bookingDoc.id} updated to "confirmed"\n`);
            // Send confirmation to customer
            if (booking.customerContact) {
                const confirmMsg = `✅ *Taxi Confirmed!*\n\nYour taxi (${(taxiData === null || taxiData === void 0 ? void 0 : taxiData.title) || 'Unknown'}) confirmed!\n\nDriver said: "${vendorMessage}"\n\nWe'll notify you when they arrive.`;
                await (0, twilio_service_1.sendWhatsApp)(booking.customerContact, confirmMsg);
                console.log(`📱 Confirmation sent to customer: ${booking.customerContact}\n`);
            }
            console.log(`🎉 SUCCESS! Vendor reply processed.\n`);
            process.exit(0);
        }
        else {
            console.log(`  ❌ No match\n`);
        }
    }
    console.log(`❌ No matching booking found for vendor ${vendorPhone}\n`);
    process.exit(1);
}
if (require.main === module) {
    manualTestVendorReply().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=manualTestVendorReply.js.map