"use strict";
/**
 * Seed script to populate test taxi drivers in Firestore
 * Run: npm run tsx src/scripts/seedTaxiDrivers.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTaxiDrivers = seedTaxiDrivers;
const firebase_1 = require("../config/firebase");
const testDrivers = [
    {
        name: "Mehmet Yilmaz",
        phone: "+905331234567", // Replace with your test number
        whatsappId: "+905331234567",
        status: "available",
        currentLocation: {
            district: "Girne",
            lat: 35.33,
            lng: 33.32
        },
        rating: 4.9,
        totalRides: 45,
        vehicleType: "sedan"
    },
    {
        name: "Ali Demir",
        phone: "+905339876543", // Replace with your test number
        whatsappId: "+905339876543",
        status: "available",
        currentLocation: {
            district: "Girne",
            lat: 35.34,
            lng: 33.31
        },
        rating: 4.7,
        totalRides: 32,
        vehicleType: "van"
    },
    {
        name: "Emre Kaya",
        phone: "+905335555555", // Replace with your test number
        whatsappId: "+905335555555",
        status: "available",
        currentLocation: {
            district: "Lefkosa",
            lat: 35.18,
            lng: 33.38
        },
        rating: 5.0,
        totalRides: 78,
        vehicleType: "luxury"
    },
    {
        name: "Can Ozturk",
        phone: "+905337777777", // Replace with your test number
        whatsappId: "+905337777777",
        status: "available",
        currentLocation: {
            district: "Famagusta",
            lat: 35.12,
            lng: 33.95
        },
        rating: 4.8,
        totalRides: 56,
        vehicleType: "sedan"
    }
];
async function seedTaxiDrivers() {
    console.log("🚕 Seeding taxi drivers...");
    try {
        for (const driver of testDrivers) {
            const docRef = await firebase_1.db.collection('taxi_drivers').add(driver);
            console.log(`✅ Added driver: ${driver.name} (${docRef.id})`);
        }
        console.log(`\n🎉 Successfully added ${testDrivers.length} taxi drivers!`);
        console.log("\nNext steps:");
        console.log("1. Update phone numbers with real test numbers");
        console.log("2. Configure Twilio webhook: /api/taxi/webhook");
        console.log("3. Test with: POST /api/taxi/request");
    }
    catch (error) {
        console.error("❌ Error seeding drivers:", error);
        throw error;
    }
}
// Run if called directly
if (require.main === module) {
    seedTaxiDrivers()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
//# sourceMappingURL=seedTaxiDrivers.js.map