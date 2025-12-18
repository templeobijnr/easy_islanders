/**
 * Import Script: Cyprus Guide Listings
 * Imports real business listings from CSV into Firestore
 */

import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { db } from "../config/firebase";

// Category mapping from CSV to our system
const CATEGORY_MAP: Record<string, string> = {
  // Food & Dining
  Restaurants: "FOOD",
  Cafes: "CAFE",
  Bars: "NIGHTLIFE",
  Clubs: "NIGHTLIFE",
  Casinos: "NIGHTLIFE",

  // Attractions & Activities
  Attractions: "SIGHTS",
  Beaches: "SIGHTS",
  Activities: "ACTIVITIES",
  "See & Do": "SIGHTS",

  // Services
  Hotels: "ACCOMMODATION",
  Accommodation: "ACCOMMODATION",
  "Rent a Car": "CAR_RENTAL",
  Transfers: "TRANSPORT",
  "Estate Agents": "HOUSING",

  // Shopping & Retail
  Fashion: "SHOPPING",
  Jewellery: "SHOPPING",
  Cosmetics: "SHOPPING",
  Electronics: "SHOPPING",
  Furniture: "SHOPPING",
  Supermarket: "SHOPPING",
  Minimarket: "SHOPPING",
  "Car Sales Galleries": "SHOPPING",
  Watches: "SHOPPING",
  "White Goods": "SHOPPING",
  "For Your Home": "SHOPPING",
  "Home Design": "SHOPPING",
  Kitchens: "SHOPPING",
  "Garden Centers": "SHOPPING",
  Florist: "SHOPPING",
  "Curtains & Fabrics": "SHOPPING",

  // Health & Beauty
  "Beauty Salons": "BEAUTY",
  Hairdressers: "BEAUTY",
  Barbers: "BEAUTY",
  "Spa & Wellness": "BEAUTY",
  "Medical Aesthetics": "HEALTH",
  "Plastic Surgeon": "HEALTH",
  Dentists: "HEALTH",
  Hospitals: "HEALTH",
  "IVF Clinics": "HEALTH",
  Laboratories: "HEALTH",
  Glasses: "HEALTH",
  "Gym Centres": "HEALTH",

  // Other Services
  Banks: "SERVICE",
  "Exchange Offices": "SERVICE",
  Insurance: "SERVICE",
  "Car Repairs": "SERVICE",
  "Car Wash": "SERVICE",
  "Car Accessories": "SERVICE",
  Construction: "SERVICE",
  "Print Design": "SERVICE",
  Weddings: "SERVICE",
  Bathrooms: "SERVICE",
};

// Region ID to Area Name mapping (North Cyprus regions)
const REGION_MAP: Record<string, string> = {
  "37": "Kyrenia Center",
  "38": "Alsancak",
  "39": "Lapta",
  "40": "Catalkoy",
  "41": "Esentepe",
  "42": "Girne",
  "45": "Nicosia",
  "46": "Famagusta",
  "63": "Bellapais",
  "68": "Ozankoy",
};

interface CSVRow {
  category_id: string;
  category_name: string;
  category_slug: string;
  parent_category_id: string;
  listing_id: string;
  listing_title: string;
  listing_slug: string;
  listing_url: string;
  region_ids: string;
  maps_url: string;
  latitude: string;
  longitude: string;
}

async function importListings() {
  try {
    // Read CSV file
    const csvPath = path.join(
      __dirname,
      "../../../new_cyprus_guide_listings.csv",
    );
    logger.debug(`📂 Reading CSV from: ${csvPath}`);

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const records: CSVRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    logger.debug(`📊 Found ${records.length} listings to import`);

    // Process in batches
    const batchSize = 500;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const batchRecords = records.slice(
        i,
        Math.min(i + batchSize, records.length),
      );

      for (const record of batchRecords) {
        const lat = parseFloat(record.latitude);
        const lng = parseFloat(record.longitude);

        // Skip if invalid coordinates
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(
            `⚠️  Skipping ${record.listing_title} - invalid coordinates`,
          );
          skipped++;
          continue;
        }

        // Map category
        const category = CATEGORY_MAP[record.category_name] || "OTHER";

        // Get area name from region_ids (use first region if multiple)
        const regionIds = record.region_ids.split(";");
        const areaName = REGION_MAP[regionIds[0]] || "North Cyprus";

        // Decode HTML entities in title
        const title = record.listing_title
          .replace(/&#8217;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&#8211;/g, "-")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"');

        // Create place document (matching v1 Place interface)
        const placeData = {
          // Basic info
          name: title,
          slug: record.listing_slug,
          cityId: "north-cyprus",
          areaName,
          category: category.toLowerCase() as any,
          subcategory: record.category_slug,

          // Location
          coordinates: {
            lat,
            lng,
          },
          address: areaName,

          // Description
          descriptionShort: `${record.category_name} in ${areaName}`,
          descriptionLong: `Visit ${title}, a ${record.category_name.toLowerCase()} located in ${areaName}, North Cyprus.`,

          // Meta
          tags: [record.category_slug, areaName.toLowerCase()],
          source: "cyprus-guide",
          sourceUrl: record.listing_url,
          externalId: record.listing_id,

          // Actions (default actions for all places)
          actions: {
            taxiEnabled: true,
            reservationsEnabled:
              category === "FOOD" ||
              category === "NIGHTLIFE" ||
              category === "CAFE",
            activityBookingEnabled: false,
            serviceTypes: [],
          },

          // Flags
          isFeatured: false,
          isActive: true,

          // Creator
          createdBy: "system",

          // Timestamps
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Use external ID as document ID to prevent duplicates
        const docRef = db
          .collection("places")
          .doc(`cyprus-guide-${record.listing_id}`);
        batch.set(docRef, placeData, { merge: true });
        imported++;
      }

      // Commit batch
      await batch.commit();
      logger.debug(
        `✅ Imported batch ${Math.floor(i / batchSize) + 1} (${imported} places so far)`,
      );
    }

    logger.debug(`\n🎉 Import Complete!`);
    logger.debug(`   ✅ Imported: ${imported}`);
    logger.debug(`   ⚠️  Skipped: ${skipped}`);
    logger.debug(`   📍 Total: ${records.length}`);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

// Run import
importListings()
  .then(() => {
    logger.debug("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
