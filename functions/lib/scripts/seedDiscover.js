"use strict";
/**
 * Seed script for Discover categories: Stays, Activities, Events, Places, Experiences
 * Run: npm run seed:discover
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
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Sample Stays Data
const STAYS = [
    {
        title: "Bellapais Gardens Hotel",
        description: "Luxury boutique hotel with stunning mountain views and Mediterranean garden",
        images: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800"
        ],
        coordinates: { lat: 35.3100, lng: 33.3500 },
        category: "hotel",
        type: "stay",
        region: "Kyrenia",
        price: 150,
        currency: "GBP",
        propertyType: "Hotel",
        bedrooms: 1,
        bathrooms: 1,
        amenities: ["Pool", "WiFi", "Breakfast", "Sea View", "Air Conditioning"],
        billingPeriod: "night",
        actions: { allowBooking: true, allowTaxi: true },
        address: "Bellapais Village, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Kyrenia Harbour Penthouse",
        description: "Modern 3-bedroom penthouse overlooking the historic harbor",
        images: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800"
        ],
        coordinates: { lat: 35.3400, lng: 33.3200 },
        category: "apartment",
        type: "stay",
        region: "Kyrenia",
        price: 200,
        currency: "GBP",
        propertyType: "Apartment",
        bedrooms: 3,
        bathrooms: 2,
        amenities: ["WiFi", "Kitchen", "Balcony", "Harbour View", "Parking"],
        billingPeriod: "night",
        actions: { allowBooking: true, allowTaxi: true },
        address: "Kyrenia Harbour, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Famagusta Beach Villa",
        description: "Private villa with direct beach access and private pool",
        images: [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"
        ],
        coordinates: { lat: 35.1200, lng: 33.9400 },
        category: "villa",
        type: "stay",
        region: "Famagusta",
        price: 350,
        currency: "GBP",
        propertyType: "Villa",
        bedrooms: 5,
        bathrooms: 4,
        amenities: ["Private Pool", "Beach Access", "BBQ", "Garden", "WiFi"],
        billingPeriod: "night",
        actions: { allowBooking: true, allowTaxi: true },
        address: "Silver Beach, Famagusta",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    }
];
// Sample Activities Data
const ACTIVITIES = [
    {
        title: "Scuba Diving at Zenobia Wreck",
        description: "Explore the famous Zenobia shipwreck, one of the world's top dive sites",
        images: [
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
            "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800"
        ],
        coordinates: { lat: 34.9200, lng: 33.6500 },
        category: "water-sports",
        type: "activity",
        region: "Famagusta",
        price: 85,
        currency: "GBP",
        actions: { allowJoin: true, allowBooking: true, allowTaxi: true },
        address: "Larnaca Bay",
        cityId: "north-cyprus",
        approved: true,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "St. Hilarion Castle Hiking Tour",
        description: "Guided hike to the fairy-tale castle with breathtaking mountain views",
        images: [
            "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
        ],
        coordinates: { lat: 35.3100, lng: 33.2800 },
        category: "hiking",
        type: "activity",
        region: "Kyrenia",
        price: 45,
        currency: "GBP",
        actions: { allowJoin: true, allowBooking: true, allowTaxi: true },
        address: "St. Hilarion, Kyrenia",
        cityId: "north-cyprus",
        approved: true,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Karpaz Peninsula Wild Donkey Safari",
        description: "Full-day jeep safari to see wild donkeys and pristine beaches",
        images: [
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
            "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800"
        ],
        coordinates: { lat: 35.6000, lng: 34.4500 },
        category: "safari",
        type: "activity",
        region: "Karpaz",
        price: 95,
        currency: "GBP",
        actions: { allowJoin: true, allowBooking: true, allowTaxi: true },
        address: "Karpaz Peninsula",
        cityId: "north-cyprus",
        approved: true,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Parasailing at Escape Beach",
        description: "Soar above the Mediterranean with stunning coastal views",
        images: [
            "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800"
        ],
        coordinates: { lat: 35.3300, lng: 33.3100 },
        category: "water-sports",
        type: "activity",
        region: "Kyrenia",
        price: 60,
        currency: "GBP",
        actions: { allowJoin: true, allowBooking: true, allowTaxi: true },
        address: "Escape Beach Club, Kyrenia",
        cityId: "north-cyprus",
        approved: true,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    }
];
// Sample Events Data
const EVENTS = [
    {
        title: "Bellapais Music Festival",
        description: "Annual classical music festival in the historic Bellapais Abbey",
        images: [
            "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=800"
        ],
        coordinates: { lat: 35.3100, lng: 33.3500 },
        category: "music",
        type: "event",
        region: "Kyrenia",
        price: 35,
        currency: "GBP",
        startTime: firestore_1.Timestamp.fromDate(new Date('2025-06-15T20:00:00')),
        endTime: firestore_1.Timestamp.fromDate(new Date('2025-06-15T23:00:00')),
        isPublic: true,
        approved: true,
        actions: { allowJoin: true, allowBooking: true },
        address: "Bellapais Abbey, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Famagusta Food & Wine Festival",
        description: "Celebrate local cuisine and Cypriot wines in the old city",
        images: [
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800"
        ],
        coordinates: { lat: 35.1200, lng: 33.9400 },
        category: "food",
        type: "event",
        region: "Famagusta",
        price: 25,
        currency: "GBP",
        startTime: firestore_1.Timestamp.fromDate(new Date('2025-05-20T12:00:00')),
        endTime: firestore_1.Timestamp.fromDate(new Date('2025-05-20T22:00:00')),
        isPublic: true,
        approved: true,
        actions: { allowJoin: true, allowBooking: true },
        address: "Old Town, Famagusta",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Full Moon Beach Party",
        description: "Monthly electronic music party under the stars",
        images: [
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800"
        ],
        coordinates: { lat: 35.3200, lng: 33.3000 },
        category: "nightlife",
        type: "event",
        region: "Kyrenia",
        price: 20,
        currency: "GBP",
        startTime: firestore_1.Timestamp.fromDate(new Date('2025-04-12T21:00:00')),
        endTime: firestore_1.Timestamp.fromDate(new Date('2025-04-13T04:00:00')),
        isPublic: true,
        approved: true,
        actions: { allowJoin: true, allowBooking: true },
        address: "Escape Beach, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    }
];
// Sample Places Data
const PLACES = [
    {
        title: "Niazi's Restaurant",
        description: "Award-winning seafood restaurant on Kyrenia harbour",
        images: [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"
        ],
        coordinates: { lat: 35.3400, lng: 33.3200 },
        category: "restaurant",
        type: "place",
        region: "Kyrenia",
        price: 40,
        currency: "GBP",
        actions: { allowCheckIn: true, allowBooking: true, allowTaxi: true },
        address: "Kyrenia Harbour, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Harbour Club",
        description: "Trendy waterfront bar with live music and craft cocktails",
        images: [
            "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800"
        ],
        coordinates: { lat: 35.3405, lng: 33.3205 },
        category: "bar",
        type: "place",
        region: "Kyrenia",
        price: 15,
        currency: "GBP",
        actions: { allowCheckIn: true, allowTaxi: true },
        address: "Kyrenia Harbour, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Kyrenia Castle",
        description: "Historic Byzantine castle housing the Shipwreck Museum",
        images: [
            "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800"
        ],
        coordinates: { lat: 35.3410, lng: 33.3190 },
        category: "landmark",
        type: "place",
        region: "Kyrenia",
        price: 10,
        currency: "GBP",
        actions: { allowCheckIn: true, allowTaxi: true },
        address: "Kyrenia Harbour, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Ark Lounge & Bar",
        description: "Rooftop bar with panoramic sea views and DJ sets",
        images: [
            "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800"
        ],
        coordinates: { lat: 35.3350, lng: 33.3150 },
        category: "nightlife",
        type: "place",
        region: "Kyrenia",
        price: 12,
        currency: "GBP",
        actions: { allowCheckIn: true, allowTaxi: true },
        address: "Catalkoy, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    }
];
// Sample Experiences Data
const EXPERIENCES = [
    {
        title: "Traditional Cypriot Cooking Class",
        description: "Learn to make authentic meze and halloumi with a local chef",
        images: [
            "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800"
        ],
        coordinates: { lat: 35.3100, lng: 33.3400 },
        category: "culinary",
        type: "experience",
        region: "Kyrenia",
        price: 75,
        currency: "GBP",
        duration: "3 hours",
        difficulty: "easy",
        included: ["Ingredients", "Recipes", "Lunch", "Wine Tasting"],
        requirements: ["Apron provided"],
        actions: { allowBooking: true, allowTaxi: true },
        address: "Bellapais Village, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Sunrise Yoga on the Beach",
        description: "Start your day with peaceful yoga overlooking the Mediterranean",
        images: [
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"
        ],
        coordinates: { lat: 35.3300, lng: 33.3100 },
        category: "wellness",
        type: "experience",
        region: "Kyrenia",
        price: 25,
        currency: "GBP",
        duration: "90 minutes",
        difficulty: "easy",
        included: ["Yoga Mat", "Refreshments", "Guided Session"],
        requirements: ["Comfortable clothing"],
        actions: { allowBooking: true, allowTaxi: true },
        address: "Escape Beach, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Photography Tour of Old Famagusta",
        description: "Capture the beauty of medieval architecture with a pro photographer",
        images: [
            "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800"
        ],
        coordinates: { lat: 35.1200, lng: 33.9400 },
        category: "photography",
        type: "experience",
        region: "Famagusta",
        price: 65,
        currency: "GBP",
        duration: "4 hours",
        difficulty: "medium",
        included: ["Pro Guide", "Tips & Tricks", "Edited Photos"],
        requirements: ["Camera or smartphone"],
        actions: { allowBooking: true, allowTaxi: true },
        address: "Old Town, Famagusta",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    },
    {
        title: "Wine Tasting at Mountain Vineyard",
        description: "Sample local wines and mezze with stunning mountain views",
        images: [
            "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800"
        ],
        coordinates: { lat: 35.3000, lng: 33.3300 },
        category: "culinary",
        type: "experience",
        region: "Kyrenia",
        price: 55,
        currency: "GBP",
        duration: "2 hours",
        difficulty: "easy",
        included: ["Wine Tasting", "Mezze Platter", "Vineyard Tour"],
        requirements: ["Must be 18+"],
        actions: { allowBooking: true, allowTaxi: true },
        address: "Karmi Village, Kyrenia",
        cityId: "north-cyprus",
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    }
];
async function seedDiscoverData() {
    console.log('🌱 Starting Discover data seeding...\n');
    try {
        // Seed Stays
        console.log('📍 Seeding Stays...');
        for (const stay of STAYS) {
            const docRef = db.collection('stays').doc();
            await docRef.set(Object.assign(Object.assign({}, stay), { id: docRef.id }));
            console.log(`  ✅ ${stay.title}`);
        }
        // Seed Activities
        console.log('\n🏄 Seeding Activities...');
        for (const activity of ACTIVITIES) {
            const docRef = db.collection('activities').doc();
            await docRef.set(Object.assign(Object.assign({}, activity), { id: docRef.id }));
            console.log(`  ✅ ${activity.title}`);
        }
        // Seed Events
        console.log('\n🎉 Seeding Events...');
        for (const event of EVENTS) {
            const docRef = db.collection('events').doc();
            await docRef.set(Object.assign(Object.assign({}, event), { id: docRef.id }));
            console.log(`  ✅ ${event.title}`);
        }
        // Seed Places
        console.log('\n🍽️  Seeding Places...');
        for (const place of PLACES) {
            const docRef = db.collection('places').doc();
            await docRef.set(Object.assign(Object.assign({}, place), { id: docRef.id }));
            console.log(`  ✅ ${place.title}`);
        }
        // Seed Experiences
        console.log('\n✨ Seeding Experiences...');
        for (const experience of EXPERIENCES) {
            const docRef = db.collection('experiences').doc();
            await docRef.set(Object.assign(Object.assign({}, experience), { id: docRef.id }));
            console.log(`  ✅ ${experience.title}`);
        }
        console.log('\n✅ Discover seeding complete!');
        console.log(`\n📊 Summary:`);
        console.log(`   ${STAYS.length} Stays`);
        console.log(`   ${ACTIVITIES.length} Activities`);
        console.log(`   ${EVENTS.length} Events`);
        console.log(`   ${PLACES.length} Places`);
        console.log(`   ${EXPERIENCES.length} Experiences`);
        console.log(`   Total: ${STAYS.length + ACTIVITIES.length + EVENTS.length + PLACES.length + EXPERIENCES.length} items\n`);
    }
    catch (error) {
        console.error('❌ Error seeding data:', error);
        throw error;
    }
}
// Run the seeder
seedDiscoverData()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=seedDiscover.js.map