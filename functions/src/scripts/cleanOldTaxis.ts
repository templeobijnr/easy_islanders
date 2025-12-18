/**
 * Clean up old taxi listings that don't have proper fields
 */

import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";

async function cleanOldTaxis() {
  logger.debug("🧹 Cleaning up old taxi listings...\n");

  const taxis = await db
    .collection("listings")
    .where("domain", "==", "Cars")
    .where("type", "==", "taxi")
    .get();

  logger.debug(`Found ${taxis.size} taxi listings\n`);

  let deleted = 0;
  let kept = 0;

  for (const doc of taxis.docs) {
    const data = doc.data();

    // Check if this is an old/bad taxi listing
    if (!data.agentPhone || !data.vehicleModel || !data.plateNumber) {
      logger.debug(
        `❌ Deleting: ${doc.id} - ${data.title || "Unknown"} (Missing required fields)`,
      );
      await doc.ref.delete();
      deleted++;
    } else {
      logger.debug(
        `✅ Keeping: ${data.title} - ${data.vehicleColor} ${data.vehicleModel} (${data.plateNumber})`,
      );
      kept++;
    }
  }

  logger.debug(`\n📊 Summary:`);
  logger.debug(`   Kept: ${kept} taxi listings`);
  logger.debug(`   Deleted: ${deleted} old/invalid listings`);
  logger.debug(`\n✅ Cleanup complete!`);

  process.exit(0);
}

if (require.main === module) {
  cleanOldTaxis().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}
