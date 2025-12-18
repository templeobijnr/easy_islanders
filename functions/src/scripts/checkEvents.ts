import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";

async function checkEvents() {
  logger.debug("🔍 Checking for Events in Firestore...");
  try {
    const snapshot = await db
      .collection("listings")
      .where("domain", "==", "Events")
      .get();

    if (snapshot.empty) {
      logger.debug("⚠️ No Events found in Firestore.");
      return;
    }

    logger.debug(`✅ Found ${snapshot.size} Events:`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      logger.debug(`\n📄 Event ID: ${doc.id}`);
      logger.debug(`   Title: ${data.title}`);
      logger.debug(`   Location: ${data.location}`);
      logger.debug(`   Date: ${data.date}`);
      logger.debug(`   Venue: ${data.venue}`);
      logger.debug(`   SubCategory: ${data.subCategory}`);
      logger.debug(`   EventType: ${data.eventType}`);
    });
  } catch (error) {
    console.error("❌ Error querying Events:", error);
  }
}

if (require.main === module) {
  checkEvents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
