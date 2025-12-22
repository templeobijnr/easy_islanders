"use strict";
/**
 * Master Seeding Script for City OS V1
 *
 * Seeds all required data:
 * - Taxi listings (15 taxis across all cities)
 * - Market listings (3 markets)
 * - Service provider listings (7 service types)
 *
 * Run with:
 * FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" GCLOUD_PROJECT="easy-islanders" \
 * TEST_VENDOR_PHONE="whatsapp:+905488639394" \
 * npx ts-node -r esbuild-register src/scripts/seedCityOS.ts
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
exports.seedCityOS = main;
const logger = __importStar(require("firebase-functions/logger"));
const seedTaxiListings_1 = require("./seedTaxiListings");
const seedMarketsAndServices_1 = require("./seedMarketsAndServices");
async function main() {
    logger.debug("🌟 ═══════════════════════════════════════════════════════");
    logger.debug("🌟   City OS V1 - Complete Database Seeding");
    logger.debug("🌟 ═══════════════════════════════════════════════════════\n");
    try {
        // Seed Taxis
        logger.debug("📍 Phase 1: Seeding Taxi Listings...\n");
        await (0, seedTaxiListings_1.seedTaxis)();
        logger.debug("\n✅ Phase 1 Complete!\n");
        logger.debug("─────────────────────────────────────────────────────\n");
        // Seed Markets
        logger.debug("📍 Phase 2: Seeding Markets...\n");
        await (0, seedMarketsAndServices_1.seedMarkets)();
        logger.debug("\n✅ Phase 2 Complete!\n");
        logger.debug("─────────────────────────────────────────────────────\n");
        // Seed Services
        logger.debug("📍 Phase 3: Seeding Service Providers...\n");
        await (0, seedMarketsAndServices_1.seedServices)();
        logger.debug("\n✅ Phase 3 Complete!\n");
        logger.debug("─────────────────────────────────────────────────────\n");
        // Final Summary
        logger.debug("🎉 ═══════════════════════════════════════════════════════");
        logger.debug("🎉   CITY OS V1 IS NOW FULLY OPERATIONAL!");
        logger.debug("🎉 ═══════════════════════════════════════════════════════\n");
        logger.debug("📊 Total Data Seeded:");
        logger.debug("   🚕 15 Taxi listings (Kyrenia, Nicosia, Famagusta, Iskele)");
        logger.debug("   🛒 3 Market listings (Kyrenia, Lapta, Bellapais)");
        logger.debug("   🔧 7 Service providers (All trades covered)");
        logger.debug("\n📱 All vendors configured with test phone numbers");
        logger.debug("\n🎯 Ready to test! Try these commands:");
        logger.debug('   1. "I need a taxi to the harbor"');
        logger.debug('   2. "Send me 2 bottles of water to my hotel"');
        logger.debug('   3. "My AC is broken, need help now"');
        logger.debug('   4. "Find me a plumber in Kyrenia"');
        logger.debug("\n💬 Remember to reply as vendor via WhatsApp to test bi-directional sync!\n");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Error during seeding:", error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=seedCityOS.js.map