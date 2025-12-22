"use strict";
/**
 * Seed Script: North Cyprus City Data
 * Run this script to populate initial North Cyprus data
 *
 * Usage: npx ts-node src/scripts/seed-north-cyprus.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedNorthCyprus = seedNorthCyprus;
const repositories_1 = require("../repositories");
async function seedNorthCyprus() {
    console.log('🌍 Starting North Cyprus seed data...\n');
    // ============================================================================
    // 1. Create North Cyprus City
    // ============================================================================
    console.log('📍 Creating North Cyprus city...');
    const northCyprusCity = {
        name: 'North Cyprus',
        country: 'Cyprus',
        timeZone: 'Europe/Nicosia',
        bounds: {
            north: 35.7067,
            south: 35.0833,
            east: 34.5917,
            west: 32.2833,
        },
        center: { lat: 35.1856, lng: 33.3823 }, // Nicosia
        isActive: true,
        defaultCurrency: 'TRY',
        primaryLanguage: 'en',
        supportedUserTypes: ['student', 'expat', 'traveller', 'local'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const city = await repositories_1.citiesRepository.create(northCyprusCity);
    console.log(`✅ Created city: ${city.name} (${city.id})\n`);
    // ============================================================================
    // 2. Create Sample Places
    // ============================================================================
    console.log('🍽️  Creating sample places...');
    const samplePlaces = [
        // Restaurants
        {
            cityId: city.id,
            name: 'Petek Pastahanesi',
            category: 'food',
            subcategory: 'turkish',
            coordinates: { lat: 35.3381, lng: 33.3264 },
            address: 'Girne, Cyprus',
            areaName: 'Girne',
            descriptionShort: 'Traditional Turkish pastry shop and restaurant',
            descriptionLong: 'Famous local pastry shop serving traditional Turkish breakfast, börek, and pastries. A student favorite for affordable and delicious meals.',
            tags: ['turkish', 'breakfast', 'pastries', 'affordable', 'student-friendly'],
            phone: '+90 392 815 xxxx',
            bookingType: 'none',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: false,
                activityBookingEnabled: false,
            },
            averagePriceLevel: 2,
            isActive: true,
            createdBy: 'seed-script',
        },
        {
            cityId: city.id,
            name: 'Niazi\'s Restaurant',
            category: 'food',
            subcategory: 'mediterranean',
            coordinates: { lat: 35.3367, lng: 33.3215 },
            address: 'Girne Harbour, Cyprus',
            areaName: 'Girne',
            descriptionShort: 'Seafood restaurant at Girne Harbor',
            descriptionLong: 'Iconic harbor-side restaurant offering fresh seafood, meze, and stunning sunset views. Great for special occasions and group dinners.',
            tags: ['seafood', 'harbor', 'mediterranean', 'romantic', 'views'],
            phone: '+90 392 815 xxxx',
            whatsapp: '+90 548 xxx xxxx',
            bookingType: 'whatsapp',
            bookingTarget: '+90 548 xxx xxxx',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: true,
                activityBookingEnabled: false,
            },
            averagePriceLevel: 3,
            isActive: true,
            createdBy: 'seed-script',
        },
        // Cafes
        {
            cityId: city.id,
            name: 'Gloria Jean\'s Coffees',
            category: 'cafe',
            subcategory: 'coffee-shop',
            coordinates: { lat: 35.1467, lng: 33.9042 },
            address: 'Eastern Mediterranean University, Famagusta',
            areaName: 'EMU Campus',
            descriptionShort: 'Popular coffee chain on EMU campus',
            descriptionLong: 'The go-to coffee spot for EMU students. Offers good WiFi, comfortable seating, and a full menu of coffee drinks and snacks.',
            tags: ['coffee', 'student', 'wifi', 'study-spot', 'campus'],
            phone: '+90 392 xxx xxxx',
            bookingType: 'none',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: false,
                activityBookingEnabled: false,
                serviceTypes: ['study', 'meetup'],
            },
            averagePriceLevel: 2,
            isActive: true,
            createdBy: 'seed-script',
        },
        // Nightlife
        {
            cityId: city.id,
            name: 'The Venue',
            category: 'nightlife',
            subcategory: 'nightclub',
            coordinates: { lat: 35.3333, lng: 33.3200 },
            address: 'Girne, Cyprus',
            areaName: 'Girne',
            descriptionShort: 'Popular nightclub and live music venue',
            descriptionLong: 'North Cyprus\'s premier nightlife destination featuring international DJs, live performances, and themed nights. Popular with students and expats.',
            tags: ['nightclub', 'live-music', 'dj', 'dancing', 'late-night'],
            phone: '+90 392 xxx xxxx',
            whatsapp: '+90 548 xxx xxxx',
            instagram: '@thevenuecyprus',
            bookingType: 'whatsapp',
            bookingTarget: '+90 548 xxx xxxx',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: true,
                activityBookingEnabled: true,
            },
            averagePriceLevel: 3,
            isActive: true,
            createdBy: 'seed-script',
        },
        // Sights
        {
            cityId: city.id,
            name: 'Kyrenia Castle',
            category: 'sight',
            subcategory: 'historical',
            coordinates: { lat: 35.3414, lng: 33.3194 },
            address: 'Girne Harbour, Cyprus',
            areaName: 'Girne',
            descriptionShort: 'Historic castle and shipwreck museum',
            descriptionLong: 'Medieval castle dating back to Byzantine times, housing a famous shipwreck museum. Must-visit historical landmark with stunning harbor views.',
            tags: ['historical', 'museum', 'castle', 'sightseeing', 'culture'],
            bookingType: 'none',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: false,
                activityBookingEnabled: false,
            },
            isActive: true,
            createdBy: 'seed-script',
        },
        {
            cityId: city.id,
            name: 'Bellapais Abbey',
            category: 'sight',
            subcategory: 'historical',
            coordinates: { lat: 35.3197, lng: 33.3606 },
            address: 'Bellapais Village, Cyprus',
            areaName: 'Bellapais',
            descriptionShort: 'Gothic abbey ruins with mountain views',
            descriptionLong: '13th-century Gothic monastery ruins set in the mountains. Offers breathtaking views and hosts occasional concerts. Perfect for a peaceful afternoon.',
            tags: ['historical', 'monastery', 'views', 'architecture', 'peaceful'],
            bookingType: 'none',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: false,
                activityBookingEnabled: false,
            },
            isActive: true,
            createdBy: 'seed-script',
        },
        // Services
        {
            cityId: city.id,
            name: 'Lemar Supermarket',
            category: 'shopping',
            subcategory: 'supermarket',
            coordinates: { lat: 35.1450, lng: 33.9100 },
            address: 'Famagusta, Cyprus',
            areaName: 'Famagusta',
            descriptionShort: 'Large supermarket chain',
            descriptionLong: 'Main supermarket for students and residents. Offers groceries, household items, and affordable prices. Multiple locations across North Cyprus.',
            tags: ['supermarket', 'groceries', 'shopping', 'affordable'],
            phone: '+90 392 xxx xxxx',
            bookingType: 'none',
            actions: {
                taxiEnabled: true,
                reservationsEnabled: false,
                activityBookingEnabled: false,
                serviceTypes: ['groceries', 'delivery'],
            },
            isActive: true,
            createdBy: 'seed-script',
        },
    ];
    for (const placeData of samplePlaces) {
        const place = await repositories_1.placesRepository.create(placeData);
        console.log(`  ✅ Created place: ${place.name}`);
    }
    console.log(`\n✅ Created ${samplePlaces.length} sample places\n`);
    // ============================================================================
    // 3. Create Sample Service Providers
    // ============================================================================
    console.log('🚕 Creating sample service providers...');
    const sampleProviders = [
        {
            cityId: city.id,
            name: 'Cyprus Taxi Services',
            type: 'taxi_company',
            contact: {
                phone: '+90 548 863 9394',
                whatsapp: '+90 548 863 9394',
            },
            serviceCategories: ['airport-transfer', 'city-taxi', 'inter-city'],
            areaNames: ['Girne', 'Famagusta', 'Nicosia'],
            notes: 'Reliable 24/7 taxi service covering all major areas',
            isActive: true,
        },
        {
            cityId: city.id,
            name: 'EMU Student Taxis',
            type: 'driver',
            contact: {
                whatsapp: '+90 533 xxx xxxx',
            },
            serviceCategories: ['campus-pickup', 'city-taxi'],
            areaNames: ['Famagusta', 'EMU Campus'],
            notes: 'Student-friendly taxi service, affordable rates for EMU students',
            isActive: true,
        },
        {
            cityId: city.id,
            name: 'North Cyprus Water Delivery',
            type: 'water_vendor',
            contact: {
                phone: '+90 392 xxx xxxx',
                whatsapp: '+90 548 xxx xxxx',
            },
            serviceCategories: ['water-delivery', 'bulk-water'],
            areaNames: ['Girne', 'Famagusta', 'Nicosia', 'Lefke'],
            notes: '19L water bottle delivery service',
            isActive: true,
        },
        {
            cityId: city.id,
            name: 'Cyprus Gas Distributors',
            type: 'gas_vendor',
            contact: {
                phone: '+90 392 xxx xxxx',
                whatsapp: '+90 548 xxx xxxx',
            },
            serviceCategories: ['gas-delivery', 'cylinder-exchange'],
            areaNames: ['Girne', 'Famagusta', 'Nicosia'],
            notes: 'LPG gas cylinder delivery and exchange',
            isActive: true,
        },
    ];
    for (const providerData of sampleProviders) {
        const provider = await repositories_1.serviceProvidersRepository.create(providerData);
        console.log(`  ✅ Created provider: ${provider.name} (${provider.type})`);
    }
    console.log(`\n✅ Created ${sampleProviders.length} sample service providers\n`);
    // ============================================================================
    // Summary
    // ============================================================================
    console.log('🎉 North Cyprus seed data completed!\n');
    console.log('Summary:');
    console.log(`  - City: ${city.name} (${city.id})`);
    console.log(`  - Places: ${samplePlaces.length}`);
    console.log(`  - Service Providers: ${sampleProviders.length}`);
    console.log('\nYou can now:');
    console.log('  1. Test chat agent tools (searchPlaces, etc.)');
    console.log('  2. View places on Connect map');
    console.log('  3. Create requests and assign to service providers\n');
    return { city, places: samplePlaces.length, providers: sampleProviders.length };
}
// Run if executed directly
if (require.main === module) {
    seedNorthCyprus()
        .then(() => {
        console.log('✅ Seed completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=seed-north-cyprus.js.map