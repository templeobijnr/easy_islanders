import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Scheduled function to clean up expired check-ins
 * Runs every hour to remove check-ins where expiresAt < now
 */
export const cleanupExpiredCheckIns = functions
  .region("europe-west1")
  .pubsub.schedule("every 60 minutes")
  .onRun(async () => {
    const now = Timestamp.now();

    try {
      const expiredQuery = await db
        .collection("checkins")
        .where("expiresAt", "<", now)
        .limit(500) // Process in batches
        .get();

      if (expiredQuery.empty) {
        logger.debug("✅ [CheckIn Cleanup] No expired check-ins found");
        return;
      }

      // Delete in batch
      const batch = db.batch();
      expiredQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.debug(
        `✅ [CheckIn Cleanup] Deleted ${expiredQuery.size} expired check-ins`,
      );
    } catch (error) {
      console.error("❌ [CheckIn Cleanup] Error cleaning up check-ins:", error);
    }
  });

/**
 * Trigger when a check-in is created
 * Updates denormalized count on the pin document (optional optimization)
 */
export const onCheckInCreate = functions
  .region("europe-west1")
  .firestore.document("checkins/{checkInId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const pinId = data.pinId;
    const pinType = data.pinType;

    logger.debug(
      `📍 [CheckIn] User ${data.userId} checked in to ${pinType}/${pinId}`,
    );

    // Optionally: Update a denormalized counter on the pin document
    // This is a performance optimization for high-traffic pins
    // For V1, the real-time query approach is sufficient
  });

/**
 * Trigger when a check-in is deleted (expired or manual)
 */
export const onCheckInDelete = functions
  .region("europe-west1")
  .firestore.document("checkins/{checkInId}")
  .onDelete(async (snap, context) => {
    const data = snap.data();
    logger.debug(
      `📍 [CheckIn] Check-in removed: ${data.userId} from ${data.pinId}`,
    );
  });
