/**
 * Check and create taxi drivers in Firestore
 */
import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";

const DRIVERS_COLLECTION = "taxi_drivers";

async function checkDrivers() {
  logger.debug("🔍 Checking taxi_drivers collection...\n");

  // Check all drivers
  const allDrivers = await db.collection(DRIVERS_COLLECTION).get();
  logger.debug(`📊 Total drivers in collection: ${allDrivers.size}`);

  if (allDrivers.empty) {
    logger.debug("⚠️  No drivers found! Creating test drivers...\n");
    await createTestDrivers();
    return;
  }

  // Show all drivers
  logger.debug("\n📋 Current drivers:");
  allDrivers.forEach((doc) => {
    const data = doc.data();
    logger.debug(`\nDriver ID: ${doc.id}`);
    logger.debug(`  Name: ${data.name}`);
    logger.debug(`  Phone: ${data.phone}`);
    logger.debug(`  Status: ${data.status}`);
    logger.debug(`  District: ${data.currentLocation?.district || "MISSING"}`);
    logger.debug(`  Vehicle: ${data.vehicleType}`);
    logger.debug(`  Rating: ${data.rating}`);
  });

  // Check available drivers in Girne
  const girneDrivers = await db
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
    const docRef = await db.collection(DRIVERS_COLLECTION).add(driver);
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
