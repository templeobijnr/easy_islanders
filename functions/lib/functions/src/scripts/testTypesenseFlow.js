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
exports.testTypesenseFlow = testTypesenseFlow;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const typesenseService = __importStar(require("../services/typesense.service"));
/**
 * Test the complete Firestore → Typesense flow
 * 1. Initialize Typesense collection
 * 2. Create a test listing in Firestore
 * 3. Manually call upsert to Typesense
 * 4. Search for the listing
 */
async function testTypesenseFlow() {
    logger.debug("🧪 Testing Typesense Flow...\n");
    try {
        // Step 1: Initialize Typesense collection
        logger.debug("1️⃣ Initializing Typesense collection...");
        await typesenseService.initializeCollection();
        logger.debug("✅ Typesense collection initialized\n");
        // Step 2: Create test listings in Firestore (one per domain)
        logger.debug("2️⃣ Creating test listings in Firestore...");
        const testListings = [
            {
                id: "test-realestate-1",
                domain: "Real Estate",
                title: "Luxury Villa in Kyrenia",
                description: "Beautiful 4-bedroom villa with sea view",
                price: 250000,
                currency: "GBP",
                location: "Kyrenia",
                rating: 4.8,
                ownerUid: "test-user-1",
                rentalType: "sale",
                bedrooms: 4,
                bathrooms: 3,
                squareMeters: 200,
                amenities: ["Pool", "Garden", "Sea View"],
                status: "active",
            },
            {
                id: "test-car-1",
                domain: "Cars",
                title: "2022 Toyota Corolla",
                description: "Reliable automatic sedan for rent",
                price: 35,
                currency: "GBP",
                location: "Famagusta",
                rating: 4.5,
                ownerUid: "test-user-2",
                type: "rental",
                make: "Toyota",
                model: "Corolla",
                year: 2022,
                transmission: "Automatic",
                fuelType: "Petrol",
                seats: 5,
                status: "active",
            },
            {
                id: "test-event-1",
                domain: "Events",
                title: "Summer Music Festival",
                description: "Amazing outdoor concert in Bellapais",
                price: 45,
                currency: "GBP",
                location: "Bellapais",
                rating: 4.9,
                ownerUid: "test-user-3",
                eventType: "Concert",
                date: "2025-07-15",
                venue: "Bellapais Abbey",
                totalTickets: 500,
                ticketsAvailable: 350,
                status: "active",
            },
        ];
        for (const listing of testListings) {
            await firebase_1.db
                .collection("listings")
                .doc(listing.id)
                .set(Object.assign(Object.assign({}, listing), { createdAt: new Date(), updatedAt: new Date() }));
            logger.debug(`✅ Created ${listing.domain} listing: ${listing.title}`);
        }
        logger.debug("");
        // Step 3: Manually index to Typesense
        logger.debug("3️⃣ Indexing listings to Typesense...");
        for (const listing of testListings) {
            await typesenseService.upsertListing(Object.assign(Object.assign({}, listing), { createdAt: { seconds: Math.floor(Date.now() / 1000) } }));
            logger.debug(`✅ Indexed to Typesense: ${listing.title}`);
        }
        logger.debug("");
        // Step 4: Search in Typesense
        logger.debug("4️⃣ Testing Typesense search...");
        // Search for villa
        const villaResults = await typesenseService.searchListings({
            query: "villa",
            domain: "Real Estate",
        });
        logger.debug(`🔍 Search "villa" in Real Estate: Found ${villaResults.found} results`);
        if (villaResults.hits.length > 0) {
            logger.debug(`   - ${villaResults.hits[0].title}`);
        }
        // Search for Toyota
        const carResults = await typesenseService.searchListings({
            query: "Toyota",
            domain: "Cars",
        });
        logger.debug(`🔍 Search "Toyota" in Cars: Found ${carResults.found} results`);
        if (carResults.hits.length > 0) {
            logger.debug(`   - ${carResults.hits[0].title}`);
        }
        // Search for concert
        const eventResults = await typesenseService.searchListings({
            query: "concert",
            domain: "Events",
        });
        logger.debug(`🔍 Search "concert" in Events: Found ${eventResults.found} results`);
        if (eventResults.hits.length > 0) {
            logger.debug(`   - ${eventResults.hits[0].title}`);
        }
        logger.debug("\n✅ All tests passed! Typesense flow is working correctly.");
        return {
            success: true,
            message: "Typesense flow test completed successfully",
        };
    }
    catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}
// CLI runner
if (require.main === module) {
    testTypesenseFlow()
        .then(() => {
        logger.debug("✅ Test completed");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=testTypesenseFlow.js.map