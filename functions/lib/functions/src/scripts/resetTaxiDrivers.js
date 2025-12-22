"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Reset taxi drivers - delete all and recreate with same phone
 */
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const DRIVERS_COLLECTION = "taxi_drivers";
const TAXI_PHONE = "+905488639394"; // All drivers use the same number
async function resetDrivers() {
    logger.debug("🗑️  Deleting existing drivers...\n");
    // Delete all existing drivers
    const allDrivers = await firebase_1.db.collection(DRIVERS_COLLECTION).get();
    const deletePromises = allDrivers.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);
    logger.debug(`✅ Deleted ${allDrivers.size} drivers\n`);
    logger.debug("Creating new test drivers with phone:", TAXI_PHONE, "\n");
    const testDrivers = [
        {
            name: "Mehmet Ali",
            phone: TAXI_PHONE,
            status: "available",
            currentLocation: {
                district: "Girne",
                lat: 35.3369,
                lng: 33.3249,
            },
            vehicleType: "Mercedes E-Class",
            vehiclePlate: "35-AA-1234",
            rating: 4.8,
            completedRides: 127,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: "Ahmet Yılmaz",
            phone: TAXI_PHONE,
            status: "available",
            currentLocation: {
                district: "Girne",
                lat: 35.335,
                lng: 33.32,
            },
            vehicleType: "Toyota Camry",
            vehiclePlate: "35-BB-5678",
            rating: 4.5,
            completedRides: 89,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: "Can Demir",
            phone: TAXI_PHONE,
            status: "available",
            currentLocation: {
                district: "Girne",
                lat: 35.338,
                lng: 33.326,
            },
            vehicleType: "Volkswagen Passat",
            vehiclePlate: "35-CC-9012",
            rating: 4.9,
            completedRides: 203,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: "Emre Kaya",
            phone: TAXI_PHONE,
            status: "available",
            currentLocation: {
                district: "Lefkosa",
                lat: 35.1856,
                lng: 33.3823,
            },
            vehicleType: "Honda Accord",
            vehiclePlate: "99-DD-3456",
            rating: 4.6,
            completedRides: 145,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];
    for (const driver of testDrivers) {
        const docRef = await firebase_1.db.collection(DRIVERS_COLLECTION).add(driver);
        logger.debug(`✅ Created: ${driver.name} - ${driver.vehicleType} - ${driver.phone} (${docRef.id})`);
    }
    logger.debug("\n✨ All drivers reset successfully!");
}
// Run the reset
resetDrivers()
    .then(() => {
    logger.debug("\n✅ Done!");
    process.exit(0);
})
    .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
});
//# sourceMappingURL=resetTaxiDrivers.js.map