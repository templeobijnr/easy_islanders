import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Triggers when a user document is updated in Firestore.
 * Syncs the 'role' field to Firebase Auth Custom Claims.
 */
export const onUserUpdate = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;

    // Only proceed if the role has changed
    if (newData.role === oldData.role) {
      return null;
    }

    logger.debug(
      `Syncing role change for user ${userId}: ${oldData.role} -> ${newData.role}`,
    );

    let customClaims = {};

    if (newData.role === "admin") {
      customClaims = {
        admin: true,
        role: "admin",
        accessLevel: 9,
      };
    } else {
      // If role is removed or changed to something else, revoke admin claims
      customClaims = {
        admin: false,
        role: newData.role || "user",
        accessLevel: 1,
      };
    }

    try {
      // 1. Set Custom Claims
      await admin.auth().setCustomUserClaims(userId, customClaims);

      // 2. Force Token Refresh on Client
      // We update a metadata node in Realtime Database (or Firestore) that the client listens to.
      // Here we use the same pattern as auth.triggers.ts (Realtime DB)
      const metadataRef = admin.database().ref("metadata/" + userId);
      await metadataRef.set({
        refreshTime: new Date().getTime(),
        forceRefresh: true,
      });

      logger.debug(`Successfully synced claims for user ${userId}`);
    } catch (error) {
      console.error(`Error syncing claims for user ${userId}:`, error);
    }

    return null;
  });
