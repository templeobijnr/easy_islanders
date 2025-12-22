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
 * Check and create taxi drivers in Firestore
 */
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const DRIVERS_COLLECTION = "taxi_drivers";
async function checkDrivers() {
    logger.debug("🔍 Checking taxi_drivers collection...\n");
    // Check all drivers
    const allDrivers = await firebase_1.db.collection(DRIVERS_COLLECTION).get();
    logger.debug(`📊 Total drivers in collection: ${allDrivers.size}`);
    if (allDrivers.empty) {
        logger.debug("⚠️  No drivers found! Creating test drivers...\n");
        await createTestDrivers();
        return;
    }
    // Show all drivers
    logger.debug("\n📋 Current drivers:");
    allDrivers.forEach((doc) => {
        var _a;
        const data = doc.data();
        logger.debug(`\nDriver ID: ${doc.id}`);
        logger.debug(`  Name: ${data.name}`);
        logger.debug(`  Phone: ${data.phone}`);
        logger.debug(`  Status: ${data.status}`);
        logger.debug(`  District: ${((_a = data.currentLocation) === null || _a === void 0 ? void 0 : _a.district) || "MISSING"}`);
        logger.debug(`  Vehicle: ${data.vehicleType}`);
        logger.debug(`  Rating: ${data.rating}`);
    });
    // Check available drivers in Girne
    const girneDrivers = await firebase_1.db
        .collection(DRIVERS_COLLECTION)
        .where("status", "==", "available")
        .where("currentLocation.district", "==", "Girne")
        .get();
    logger.debug(`\n✅ Available drivers in Girne: ${girneDrivers.size}`);
    if (girneDrivers.empty) {
        logger.debug("\n⚠️  No available drivers in Girne!");
        logger.debug("Run createTestDrivers() to add test drivers.");
    }
}
async function createTestDrivers() {
    logger.debug("Creating test taxi drivers...\n");
    const TAXI_PHONE = "+905488639394"; // All drivers use the same number for testing
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
        logger.debug(`✅ Created driver: ${driver.name} (${docRef.id})`);
    }
    logger.debug("\n✨ Test drivers created successfully!");
}
// Run the check
checkDrivers()
    .then(() => {
    logger.debug("\n✅ Done!");
    process.exit(0);
})
    .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
});
//# sourceMappingURL=checkTaxiDrivers.js.map