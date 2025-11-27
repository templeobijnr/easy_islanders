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
Object.defineProperty(exports, "__esModule", { value: true });
const toolService_1 = require("../services/toolService");
async function testTaxiDispatch() {
    var _a, _b, _c, _d, _e, _f;
    console.log('🚕 ═══════════════════════════════════════════════════');
    console.log('🚕   Testing Taxi Dispatch with Real WhatsApp');
    console.log('🚕 ═══════════════════════════════════════════════════\n');
    // Test 1: Kyrenia Marina Pickup (Should select Kyrenia Premium Taxi)
    console.log('📍 Test 1: Kyrenia Marina to Bellapais\n');
    try {
        const result = await toolService_1.toolResolvers.dispatchTaxi({
            pickupLocation: 'Kyrenia Marina',
            destination: 'Bellapais Abbey',
            pickupLat: 35.3369,
            pickupLng: 33.3249,
            // Note: destinationLat/Lng removed - not needed in new system
            customerContact: 'whatsapp:+905488639394', // Your test number
            customerName: 'City OS Test User',
            notes: 'This is a test dispatch from City OS'
        }, 'test-user-123');
        console.log('\n✅ Taxi Dispatch Result:');
        console.log(JSON.stringify(result, null, 2));
        if (result.success) {
            console.log('\n🎉 SUCCESS!');
            console.log(`📱 WhatsApp sent to taxi driver: ${(_a = result.booking.taxiInfo) === null || _a === void 0 ? void 0 : _a.name}`);
            console.log(`🚗 Vehicle: ${(_b = result.booking.taxiInfo) === null || _b === void 0 ? void 0 : _b.vehicle}`);
            console.log(`🔢 Plate: ${(_c = result.booking.taxiInfo) === null || _c === void 0 ? void 0 : _c.plateNumber}`);
            console.log(`⭐ Rating: ${(_d = result.booking.taxiInfo) === null || _d === void 0 ? void 0 : _d.rating}/5`);
            console.log(`\n💬 Check your WhatsApp (+905488639394) for the booking request!`);
            console.log(`\n📲 To test bi-directional sync:`);
            console.log(`   1. Reply "OK, 5 minutes" via WhatsApp`);
            console.log(`   2. Check the booking status in Firestore (taxiBookings collection)`);
            console.log(`   3. The webhook will update the status automatically`);
        }
        else {
            console.log('\n❌ FAILED:');
            console.log(result.error);
        }
    }
    catch (error) {
        console.error('\n❌ Error:', error);
    }
    console.log('\n───────────────────────────────────────────────────────\n');
    // Test 2: Generic request (Should select any available taxi)
    console.log('📍 Test 2: Generic Taxi Request (Airport)\n');
    try {
        const result2 = await toolService_1.toolResolvers.dispatchTaxi({
            pickupLocation: 'Ercan Airport',
            destination: 'Kyrenia Center',
            customerContact: 'whatsapp:+905488639394',
            customerName: 'Airport Passenger',
            notes: 'Luggage: 2 suitcases'
        }, 'test-user-456');
        console.log('\n✅ Taxi Dispatch Result:');
        console.log(JSON.stringify(result2, null, 2));
        if (result2.success) {
            console.log('\n🎉 SUCCESS!');
            console.log(`📱 WhatsApp sent to: ${(_e = result2.booking.taxiInfo) === null || _e === void 0 ? void 0 : _e.name}`);
            console.log(`🚗 Vehicle: ${(_f = result2.booking.taxiInfo) === null || _f === void 0 ? void 0 : _f.vehicle}`);
        }
    }
    catch (error) {
        console.error('\n❌ Error:', error);
    }
    console.log('\n🏁 ═══════════════════════════════════════════════════');
    console.log('🏁   Test Complete!');
    console.log('🏁 ═══════════════════════════════════════════════════\n');
    process.exit(0);
}
// Run the test
if (require.main === module) {
    testTaxiDispatch().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=testTaxiDispatch.js.map