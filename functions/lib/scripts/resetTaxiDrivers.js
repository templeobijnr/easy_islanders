"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Reset taxi drivers - delete all and recreate with same phone
 */
const firebase_1 = require("../config/firebase");
const DRIVERS_COLLECTION = 'taxi_drivers';
const TAXI_PHONE = '+905488639394'; // All drivers use the same number
async function resetDrivers() {
    console.log('🗑️  Deleting existing drivers...\n');
    // Delete all existing drivers
    const allDrivers = await firebase_1.db.collection(DRIVERS_COLLECTION).get();
    const deletePromises = allDrivers.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`✅ Deleted ${allDrivers.size} drivers\n`);
    console.log('Creating new test drivers with phone:', TAXI_PHONE, '\n');
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
        console.log(`✅ Created: ${driver.name} - ${driver.vehicleType} - ${driver.phone} (${docRef.id})`);
    }
    console.log('\n✨ All drivers reset successfully!');
}
// Run the reset
resetDrivers()
    .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
//# sourceMappingURL=resetTaxiDrivers.js.map