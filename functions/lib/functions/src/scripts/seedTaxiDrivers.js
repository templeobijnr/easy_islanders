"use strict";
/**
 * Seed script to populate test taxi drivers in Firestore
 * Run: npm run tsx src/scripts/seedTaxiDrivers.ts
 */
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
exports.seedTaxiDrivers = seedTaxiDrivers;
const logger = __importStar(require("firebase-functions/logger"));
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
            lng: 33.32,
        },
        rating: 4.9,
        totalRides: 45,
        vehicleType: "sedan",
    },
    {
        name: "Ali Demir",
        phone: "+905339876543", // Replace with your test number
        whatsappId: "+905339876543",
        status: "available",
        currentLocation: {
            district: "Girne",
            lat: 35.34,
            lng: 33.31,
        },
        rating: 4.7,
        totalRides: 32,
        vehicleType: "van",
    },
    {
        name: "Emre Kaya",
        phone: "+905335555555", // Replace with your test number
        whatsappId: "+905335555555",
        status: "available",
        currentLocation: {
            district: "Lefkosa",
            lat: 35.18,
            lng: 33.38,
        },
        rating: 5.0,
        totalRides: 78,
        vehicleType: "luxury",
    },
    {
        name: "Can Ozturk",
        phone: "+905337777777", // Replace with your test number
        whatsappId: "+905337777777",
        status: "available",
        currentLocation: {
            district: "Famagusta",
            lat: 35.12,
            lng: 33.95,
        },
        rating: 4.8,
        totalRides: 56,
        vehicleType: "sedan",
    },
];
async function seedTaxiDrivers() {
    logger.debug("🚕 Seeding taxi drivers...");
    try {
        for (const driver of testDrivers) {
            const docRef = await firebase_1.db.collection("taxi_drivers").add(driver);
            logger.debug(`✅ Added driver: ${driver.name} (${docRef.id})`);
        }
        logger.debug(`\n🎉 Successfully added ${testDrivers.length} taxi drivers!`);
        logger.debug("\nNext steps:");
        logger.debug("1. Update phone numbers with real test numbers");
        logger.debug("2. Configure Twilio webhook: /api/taxi/webhook");
        logger.debug("3. Test with: POST /api/taxi/request");
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