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

import { seedTaxis } from './seedTaxiListings';
import { seedMarkets, seedServices } from './seedMarketsAndServices';

async function main() {
    console.log('🌟 ═══════════════════════════════════════════════════════');
    console.log('🌟   City OS V1 - Complete Database Seeding');
    console.log('🌟 ═══════════════════════════════════════════════════════\n');

    try {
        // Seed Taxis
        console.log('📍 Phase 1: Seeding Taxi Listings...\n');
        await seedTaxis();
        console.log('\n✅ Phase 1 Complete!\n');
        console.log('─────────────────────────────────────────────────────\n');

        // Seed Markets
        console.log('📍 Phase 2: Seeding Markets...\n');
        await seedMarkets();
        console.log('\n✅ Phase 2 Complete!\n');
        console.log('─────────────────────────────────────────────────────\n');

        // Seed Services
        console.log('📍 Phase 3: Seeding Service Providers...\n');
        await seedServices();
        console.log('\n✅ Phase 3 Complete!\n');
        console.log('─────────────────────────────────────────────────────\n');

        // Final Summary
        console.log('🎉 ═══════════════════════════════════════════════════════');
        console.log('🎉   CITY OS V1 IS NOW FULLY OPERATIONAL!');
        console.log('🎉 ═══════════════════════════════════════════════════════\n');
        console.log('📊 Total Data Seeded:');
        console.log('   🚕 15 Taxi listings (Kyrenia, Nicosia, Famagusta, Iskele)');
        console.log('   🛒 3 Market listings (Kyrenia, Lapta, Bellapais)');
        console.log('   🔧 7 Service providers (All trades covered)');
        console.log('\n📱 All vendors configured with test phone numbers');
        console.log('\n🎯 Ready to test! Try these commands:');
        console.log('   1. "I need a taxi to the harbor"');
        console.log('   2. "Send me 2 bottles of water to my hotel"');
        console.log('   3. "My AC is broken, need help now"');
        console.log('   4. "Find me a plumber in Kyrenia"');
        console.log('\n💬 Remember to reply as vendor via WhatsApp to test bi-directional sync!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { main as seedCityOS };
