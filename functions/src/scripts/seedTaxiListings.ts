/**
 * Seed Taxi Listings for City OS
 *
 * Creates taxi service listings across different cities in North Cyprus.
 * All taxis use the same test phone number for easy testing.
 *
 * Run with:
 * FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" GCLOUD_PROJECT="easy-islanders" \
 * npx ts-node -r esbuild-register src/scripts/seedTaxiListings.ts
 */

import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

const TEST_TAXI_PHONE = "whatsapp:+905488639394";

interface TaxiListing {
  title: string;
  description: string;
  domain: string;
  category: string;
  type: string;
  location: string;
  city: string;
  price: number;
  currency: string;
  imageUrl: string;
  agentPhone: string;
  ownerContact: string;
  plateNumber: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleColor: string;
  capacity: number;
  amenities: string[];
  rating: number;
  isActive: boolean;
  availability: string;
}

const taxiListings: TaxiListing[] = [
  // Kyrenia (Girne) - 4 taxis
  {
    title: "Girne Express Taxi",
    description:
      "24/7 taxi service in Kyrenia. Fast, reliable, and affordable. Air-conditioned vehicles.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Kyrenia Center",
    city: "Kyrenia",
    price: 50,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "GNE-001",
    vehicleType: "Sedan",
    vehicleModel: "Toyota Corolla",
    vehicleColor: "White",
    capacity: 4,
    amenities: ["AC", "GPS", "Clean", "Card Payment"],
    rating: 4.8,
    isActive: true,
    availability: "24/7",
  },
  {
    title: "Kyrenia Premium Taxi",
    description:
      "Premium taxi service with luxury vehicles. Perfect for airport transfers and special occasions.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Kyrenia Marina",
    city: "Kyrenia",
    price: 80,
    currency: "TRY",
    imageUrl: "https://images.unsplash.com/photo-1552345386-4e2e562c4f3c?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "KYR-777",
    vehicleType: "SUV",
    vehicleModel: "Mercedes GLC",
    vehicleColor: "Black",
    capacity: 6,
    amenities: ["AC", "Leather Seats", "WiFi", "Water", "Phone Charger"],
    rating: 4.9,
    isActive: true,
    availability: "24/7",
  },
  {
    title: "Bellapais Taxi Service",
    description:
      "Serving Bellapais village and surrounding areas. Local expert drivers.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Bellapais",
    city: "Kyrenia",
    price: 45,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "BLP-333",
    vehicleType: "Sedan",
    vehicleModel: "Hyundai Accent",
    vehicleColor: "Silver",
    capacity: 4,
    amenities: ["AC", "Clean", "Local Guide"],
    rating: 4.7,
    isActive: true,
    availability: "7am-11pm",
  },
  {
    title: "Lapta Taxi Co.",
    description:
      "Fast taxi service in Lapta and western Kyrenia. English speaking drivers.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Lapta",
    city: "Kyrenia",
    price: 50,
    currency: "TRY",
    imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "LAP-555",
    vehicleType: "Minivan",
    vehicleModel: "Volkswagen Caddy",
    vehicleColor: "Blue",
    capacity: 7,
    amenities: ["AC", "Luggage Space", "Child Seat Available"],
    rating: 4.6,
    isActive: true,
    availability: "6am-midnight",
  },

  // Nicosia (Lefkoşa) - 3 taxis
  {
    title: "Lefkoşa City Taxi",
    description:
      "Capital city taxi service. Quick response, metered fares, professional drivers.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Lefkoşa Center",
    city: "Nicosia",
    price: 55,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "LFK-100",
    vehicleType: "Sedan",
    vehicleModel: "Renault Megane",
    vehicleColor: "Yellow",
    capacity: 4,
    amenities: ["AC", "Meter", "Card Payment", "Receipt"],
    rating: 4.5,
    isActive: true,
    availability: "24/7",
  },
  {
    title: "University Taxi Service",
    description:
      "Serving Near Eastern University and surrounding student areas. Student discounts available.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "NEU Campus",
    city: "Nicosia",
    price: 40,
    currency: "TRY",
    imageUrl: "https://images.unsplash.com/photo-1562620669-c4710467e9c1?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "NEU-888",
    vehicleType: "Hatchback",
    vehicleModel: "Volkswagen Polo",
    vehicleColor: "Red",
    capacity: 4,
    amenities: ["AC", "Affordable", "Student Friendly"],
    rating: 4.4,
    isActive: true,
    availability: "24/7",
  },
  {
    title: "Nicosia Airport Transfer",
    description:
      "Specialized in airport transfers. Fixed rates, meet & greet service.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Ercan Airport",
    city: "Nicosia",
    price: 100,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "ERC-999",
    vehicleType: "Minivan",
    vehicleModel: "Mercedes Vito",
    vehicleColor: "Black",
    capacity: 8,
    amenities: ["AC", "WiFi", "Luggage Space", "Meet & Greet", "Fixed Rates"],
    rating: 4.9,
    isActive: true,
    availability: "24/7",
  },

  // Famagusta (Gazimağusa) - 2 taxis
  {
    title: "Magusa Express Taxi",
    description:
      "Fast and reliable taxi service in Famagusta. Serving old town and university areas.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Gazimağusa Center",
    city: "Famagusta",
    price: 45,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "MAG-200",
    vehicleType: "Sedan",
    vehicleModel: "Fiat Linea",
    vehicleColor: "White",
    capacity: 4,
    amenities: ["AC", "Clean", "GPS"],
    rating: 4.6,
    isActive: true,
    availability: "24/7",
  },
  {
    title: "EMU Campus Taxi",
    description:
      "Serving Eastern Mediterranean University and surrounding areas. Student rates.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "EMU Campus",
    city: "Famagusta",
    price: 40,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1567816442173-425e0bc313cd?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "EMU-456",
    vehicleType: "Sedan",
    vehicleModel: "Peugeot 301",
    vehicleColor: "Grey",
    capacity: 4,
    amenities: ["AC", "Student Rates", "Fast Service"],
    rating: 4.5,
    isActive: true,
    availability: "6am-2am",
  },

  // Iskele (Long Beach) - 2 taxis
  {
    title: "Iskele Beach Taxi",
    description:
      "Serving Long Beach hotels and residential areas. Beach transfers and local tours.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "İskele Long Beach",
    city: "Iskele",
    price: 50,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "ISK-111",
    vehicleType: "SUV",
    vehicleModel: "Dacia Duster",
    vehicleColor: "White",
    capacity: 5,
    amenities: ["AC", "Beach Friendly", "Luggage Space"],
    rating: 4.7,
    isActive: true,
    availability: "7am-midnight",
  },
  {
    title: "Bafra Taxi Service",
    description:
      "Premium taxi service for Bafra hotels and resorts. Luxury vehicles.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Bafra Hotels",
    city: "Iskele",
    price: 70,
    currency: "TRY",
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "BAF-222",
    vehicleType: "Sedan",
    vehicleModel: "BMW 5 Series",
    vehicleColor: "Black",
    capacity: 4,
    amenities: ["AC", "Luxury", "WiFi", "Water", "Hotel Transfers"],
    rating: 4.8,
    isActive: true,
    availability: "24/7",
  },

  // Alsancak - 1 taxi
  {
    title: "Alsancak Taxi",
    description:
      "Local taxi service in Alsancak area. Friendly drivers, good local knowledge.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Alsancak",
    city: "Kyrenia",
    price: 45,
    currency: "TRY",
    imageUrl:
      "https://images.unsplash.com/photo-1591293835293-4ab49d87c1c3?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "ALS-789",
    vehicleType: "Sedan",
    vehicleModel: "Nissan Almera",
    vehicleColor: "Blue",
    capacity: 4,
    amenities: ["AC", "Local Expert", "Affordable"],
    rating: 4.6,
    isActive: true,
    availability: "6am-midnight",
  },

  // Catalkoy - 1 taxi
  {
    title: "Çatalköy Taxi Service",
    description:
      "Serving Çatalköy and eastern Kyrenia villages. 24-hour availability.",
    domain: "Cars",
    category: "Transport",
    type: "taxi",
    location: "Çatalköy",
    city: "Kyrenia",
    price: 50,
    currency: "TRY",
    imageUrl: "https://images.unsplash.com/photo-1552345386-b5d58a7e1e11?w=800",
    agentPhone: TEST_TAXI_PHONE,
    ownerContact: TEST_TAXI_PHONE,
    plateNumber: "CAT-369",
    vehicleType: "Sedan",
    vehicleModel: "Opel Astra",
    vehicleColor: "White",
    capacity: 4,
    amenities: ["AC", "GPS", "Clean"],
    rating: 4.5,
    isActive: true,
    availability: "24/7",
  },
];

async function seedTaxis() {
  logger.debug("🚕 Starting Taxi Listings Seeding...");
  logger.debug(`📱 All taxis configured with: ${TEST_TAXI_PHONE}\n`);

  let kyreniaTaxis = 0;
  let nicosiaTaxis = 0;
  let famagustasTaxis = 0;
  let iskeleTaxis = 0;

  for (const taxi of taxiListings) {
    const docRef = await db.collection("listings").add({
      ...taxi,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.debug(`✅ Created: ${taxi.title}`);
    logger.debug(`   📍 Location: ${taxi.location} (${taxi.city})`);
    logger.debug(
      `   🚗 Vehicle: ${taxi.vehicleColor} ${taxi.vehicleModel} (${taxi.plateNumber})`,
    );
    logger.debug(`   💰 Base rate: ${taxi.price} ${taxi.currency}`);
    logger.debug(`   ⭐ Rating: ${taxi.rating}/5`);
    logger.debug(`   🔗 Document ID: ${docRef.id}\n`);

    // Count by city
    switch (taxi.city) {
      case "Kyrenia":
        kyreniaTaxis++;
        break;
      case "Nicosia":
        nicosiaTaxis++;
        break;
      case "Famagusta":
        famagustasTaxis++;
        break;
      case "Iskele":
        iskeleTaxis++;
        break;
    }
  }

  logger.debug("✅ ✅ ✅ Taxi Seeding Complete!\n");
  logger.debug("📊 Summary:");
  logger.debug(`   Total Taxis: ${taxiListings.length}`);
  logger.debug(`   - Kyrenia: ${kyreniaTaxis} taxis`);
  logger.debug(`   - Nicosia: ${nicosiaTaxis} taxis`);
  logger.debug(`   - Famagusta: ${famagustasTaxis} taxis`);
  logger.debug(`   - Iskele: ${iskeleTaxis} taxis`);
  logger.debug(`\n📱 All taxis use: ${TEST_TAXI_PHONE}`);
  logger.debug(
    "\n🎯 The dispatchTaxi tool will now randomly select from these taxis based on:",
  );
  logger.debug('   - domain: "Cars"');
  logger.debug('   - type: "taxi"');
  logger.debug("   - location proximity (future enhancement)");
  logger.debug('\n💡 Test it by saying: "I need a taxi to the harbor"');
}

async function main() {
  try {
    await seedTaxis();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding taxis:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedTaxis };
