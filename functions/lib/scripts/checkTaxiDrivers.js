"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Check and create taxi drivers in Firestore
 */
const firebase_1 = require("../config/firebase");
const DRIVERS_COLLECTION = 'taxi_drivers';
async function checkDrivers() {
    console.log('🔍 Checking taxi_drivers collection...\n');
    // Check all drivers
    const allDrivers = await firebase_1.db.collection(DRIVERS_COLLECTION).get();
    console.log(`📊 Total drivers in collection: ${allDrivers.size}`);
    if (allDrivers.empty) {
        console.log('⚠️  No drivers found! Creating test drivers...\n');
        await createTestDrivers();
        return;
    }
    // Show all drivers
    console.log('\n📋 Current drivers:');
    allDrivers.forEach((doc) => {
        var _a;
        const data = doc.data();
        console.log(`\nDriver ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Phone: ${data.phone}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  District: ${((_a = data.currentLocation) === null || _a === void 0 ? void 0 : _a.district) || 'MISSING'}`);
        console.log(`  Vehicle: ${data.vehicleType}`);
        console.log(`  Rating: ${data.rating}`);
    });
    // Check available drivers in Girne
    const girneDrivers = await firebase_1.db.collection(DRIVERS_COLLECTION)
        .where('status', '==', 'available')
        .where('currentLocation.district', '==', 'Girne')
        .get();
    console.log(`\n✅ Available drivers in Girne: ${girneDrivers.size}`);
    if (girneDrivers.empty) {
        console.log('\n⚠️  No available drivers in Girne!');
        console.log('Run createTestDrivers() to add test drivers.');
    }
}
async function createTestDrivers() {
    console.log('Creating test taxi drivers...\n');
    const TAXI_PHONE = '+905488639394'; // All drivers use the same number for testing
    const testDrivers = [
        {
            name: 'Mehmet Ali',
            phone: TAXI_PHONE,
            status: 'available',
            currentLocation: {
                district: 'Girne',
                lat: 35.3369,
                lng: 33.3249
            },
            vehicleType: 'Mercedes E-Class',
            vehiclePlate: '35-AA-1234',
            rating: 4.8,
            completedRides: 127,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Ahmet Yılmaz',
            phone: TAXI_PHONE,
            status: 'available',
            currentLocation: {
                district: 'Girne',
                lat: 35.3350,
                lng: 33.3200
            },
            vehicleType: 'Toyota Camry',
            vehiclePlate: '35-BB-5678',
            rating: 4.5,
            completedRides: 89,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Can Demir',
            phone: TAXI_PHONE,
            status: 'available',
            currentLocation: {
                district: 'Girne',
                lat: 35.3380,
                lng: 33.3260
            },
            vehicleType: 'Volkswagen Passat',
            vehiclePlate: '35-CC-9012',
            rating: 4.9,
            completedRides: 203,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Emre Kaya',
            phone: TAXI_PHONE,
            status: 'available',
            currentLocation: {
                district: 'Lefkosa',
                lat: 35.1856,
                lng: 33.3823
            },
            vehicleType: 'Honda Accord',
            vehiclePlate: '99-DD-3456',
            rating: 4.6,
            completedRides: 145,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    for (const driver of testDrivers) {
        const docRef = await firebase_1.db.collection(DRIVERS_COLLECTION).add(driver);
        console.log(`✅ Created driver: ${driver.name} (${docRef.id})`);
    }
    console.log('\n✨ Test drivers created successfully!');
}
// Run the check
checkDrivers()
    .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
//# sourceMappingURL=checkTaxiDrivers.js.map