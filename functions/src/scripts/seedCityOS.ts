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

import * as logger from "firebase-functions/logger";
import { seedTaxis } from "./seedTaxiListings";
import { seedMarkets, seedServices } from "./seedMarketsAndServices";

async function main() {
  logger.debug("🌟 ═══════════════════════════════════════════════════════");
  logger.debug("🌟   City OS V1 - Complete Database Seeding");
  logger.debug("🌟 ═══════════════════════════════════════════════════════\n");

  try {
    // Seed Taxis
    logger.debug("📍 Phase 1: Seeding Taxi Listings...\n");
    await seedTaxis();
    logger.debug("\n✅ Phase 1 Complete!\n");
    logger.debug("─────────────────────────────────────────────────────\n");

    // Seed Markets
    logger.debug("📍 Phase 2: Seeding Markets...\n");
    await seedMarkets();
    logger.debug("\n✅ Phase 2 Complete!\n");
    logger.debug("─────────────────────────────────────────────────────\n");

    // Seed Services
    logger.debug("📍 Phase 3: Seeding Service Providers...\n");
    await seedServices();
    logger.debug("\n✅ Phase 3 Complete!\n");
    logger.debug("─────────────────────────────────────────────────────\n");

    // Final Summary
    logger.debug("🎉 ═══════════════════════════════════════════════════════");
    logger.debug("🎉   CITY OS V1 IS NOW FULLY OPERATIONAL!");
    logger.debug(
      "🎉 ═══════════════════════════════════════════════════════\n",
    );
    logger.debug("📊 Total Data Seeded:");
    logger.debug(
      "   🚕 15 Taxi listings (Kyrenia, Nicosia, Famagusta, Iskele)",
    );
    logger.debug("   🛒 3 Market listings (Kyrenia, Lapta, Bellapais)");
    logger.debug("   🔧 7 Service providers (All trades covered)");
    logger.debug("\n📱 All vendors configured with test phone numbers");
    logger.debug("\n🎯 Ready to test! Try these commands:");
    logger.debug('   1. "I need a taxi to the harbor"');
    logger.debug('   2. "Send me 2 bottles of water to my hotel"');
    logger.debug('   3. "My AC is broken, need help now"');
    logger.debug('   4. "Find me a plumber in Kyrenia"');
    logger.debug(
      "\n💬 Remember to reply as vendor via WhatsApp to test bi-directional sync!\n",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as seedCityOS };
