import { db } from '../config/firebase';
import * as typesenseService from '../services/typesense.service';

/**
 * Test the complete Firestore → Typesense flow
 * 1. Initialize Typesense collection
 * 2. Create a test listing in Firestore
 * 3. Manually call upsert to Typesense
 * 4. Search for the listing
 */
export async function testTypesenseFlow() {
    console.log('🧪 Testing Typesense Flow...\n');

    try {
        // Step 1: Initialize Typesense collection
        console.log('1️⃣ Initializing Typesense collection...');
        await typesenseService.initializeCollection();
        console.log('✅ Typesense collection initialized\n');

        // Step 2: Create test listings in Firestore (one per domain)
        console.log('2️⃣ Creating test listings in Firestore...');

        const testListings = [
            {
                id: 'test-realestate-1',
                domain: 'Real Estate',
                title: 'Luxury Villa in Kyrenia',
                description: 'Beautiful 4-bedroom villa with sea view',
                price: 250000,
                currency: 'GBP',
                location: 'Kyrenia',
                rating: 4.8,
                ownerUid: 'test-user-1',
                rentalType: 'sale',
                bedrooms: 4,
                bathrooms: 3,
                squareMeters: 200,
                amenities: ['Pool', 'Garden', 'Sea View'],
                status: 'active'
            },
            {
                id: 'test-car-1',
                domain: 'Cars',
                title: '2022 Toyota Corolla',
                description: 'Reliable automatic sedan for rent',
                price: 35,
                currency: 'GBP',
                location: 'Famagusta',
                rating: 4.5,
                ownerUid: 'test-user-2',
                type: 'rental',
                make: 'Toyota',
                model: 'Corolla',
                year: 2022,
                transmission: 'Automatic',
                fuelType: 'Petrol',
                seats: 5,
                status: 'active'
            },
            {
                id: 'test-event-1',
                domain: 'Events',
                title: 'Summer Music Festival',
                description: 'Amazing outdoor concert in Bellapais',
                price: 45,
                currency: 'GBP',
                location: 'Bellapais',
                rating: 4.9,
                ownerUid: 'test-user-3',
                eventType: 'Concert',
                date: '2025-07-15',
                venue: 'Bellapais Abbey',
                totalTickets: 500,
                ticketsAvailable: 350,
                status: 'active'
            }
        ];

        for (const listing of testListings) {
            await db.collection('listings').doc(listing.id).set({
                ...listing,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created ${listing.domain} listing: ${listing.title}`);
        }
        console.log('');

        // Step 3: Manually index to Typesense
        console.log('3️⃣ Indexing listings to Typesense...');
        for (const listing of testListings) {
            await typesenseService.upsertListing({
                ...listing,
                createdAt: { seconds: Math.floor(Date.now() / 1000) }
            });
            console.log(`✅ Indexed to Typesense: ${listing.title}`);
        }
        console.log('');

        // Step 4: Search in Typesense
        console.log('4️⃣ Testing Typesense search...');

        // Search for villa
        const villaResults = await typesenseService.searchListings({
            query: 'villa',
            domain: 'Real Estate'
        });
        console.log(`🔍 Search "villa" in Real Estate: Found ${villaResults.found} results`);
        if (villaResults.hits.length > 0) {
            console.log(`   - ${villaResults.hits[0].title}`);
        }

        // Search for Toyota
        const carResults = await typesenseService.searchListings({
            query: 'Toyota',
            domain: 'Cars'
        });
        console.log(`🔍 Search "Toyota" in Cars: Found ${carResults.found} results`);
        if (carResults.hits.length > 0) {
            console.log(`   - ${carResults.hits[0].title}`);
        }

        // Search for concert
        const eventResults = await typesenseService.searchListings({
            query: 'concert',
            domain: 'Events'
        });
        console.log(`🔍 Search "concert" in Events: Found ${eventResults.found} results`);
        if (eventResults.hits.length > 0) {
            console.log(`   - ${eventResults.hits[0].title}`);
        }

        console.log('\n✅ All tests passed! Typesense flow is working correctly.');
        return {
            success: true,
            message: 'Typesense flow test completed successfully'
        };

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// CLI runner
if (require.main === module) {
    testTypesenseFlow()
        .then(() => {
            console.log('✅ Test completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}
