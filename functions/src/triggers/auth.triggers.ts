import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";

/**
 * BOOTSTRAP EMAILS - Only for initial setup
 * These emails get auto-admin on signup. After that, use Firestore role management.
 * Once you have at least one admin, they can promote others via the admin panel.
 */
const BOOTSTRAP_ADMIN_EMAILS = [
  "temple@easyislanders.com",
  "admin@easyislanders.com",
];

/**
 * Auth Trigger: Process New User Sign-Up
 *
 * Priority order:
 * 1. Check if email is in bootstrap list (for initial setup)
 * 2. Check Firestore document for role (scalable approach)
 */
export const processSignUp = functions.auth.user().onCreate(async (user) => {
  logger.debug(
    `[Auth Trigger] New user signed up: ${user.email} (${user.uid})`,
  );

  try {
    let customClaims: Record<string, any> | null = null;

    // PRIORITY 1: Check explicit bootstrap emails (for initial setup only)
    // SECURITY: Removed domain-based escalation (@easyislanders.com)
    // Use explicit allowlist only - add emails to BOOTSTRAP_ADMIN_EMAILS
    if (user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email)) {
      customClaims = {
        admin: true,
        role: "admin",
        accessLevel: 9,
      };
      logger.debug(
        `[Auth Trigger] Bootstrap: Assigning ADMIN to ${user.email}`,
      );

      // Also update Firestore to keep it in sync
      await db.collection("users").doc(user.uid).set(
        {
          role: "admin",
          bootstrapped: true,
          bootstrappedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      // PRIORITY 2: Check Firestore document for role
      // Wait a moment for Firestore document to be created (if created by client)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const userDoc = await db.collection("users").doc(user.uid).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const role = userData?.role;

        if (role === "admin") {
          customClaims = {
            admin: true,
            role: "admin",
            accessLevel: 9,
          };
          logger.debug(
            `[Auth Trigger] Firestore: Assigning ADMIN to ${user.email}`,
          );
        } else if (role === "business") {
          customClaims = {
            admin: false,
            role: "business",
            accessLevel: 5,
          };
          logger.debug(
            `[Auth Trigger] Firestore: Assigning BUSINESS to ${user.email}`,
          );
        } else if (role) {
          customClaims = {
            admin: false,
            role: role,
            accessLevel: 1,
          };
          logger.debug(
            `[Auth Trigger] Firestore: Assigning ${role} to ${user.email}`,
          );
        }
      }
    }

    // Apply claims if determined
    if (customClaims) {
      await admin.auth().setCustomUserClaims(user.uid, customClaims);

      // Signal client to refresh token (if Realtime DB is configured)
      try {
        const metadataRef = admin.database().ref("metadata/" + user.uid);
        await metadataRef.set({ refreshTime: Date.now() });
      } catch (rtdbErr) {
        console.warn(
          "[Auth Trigger] RTDB not configured, skipping metadata update",
        );
      }

      logger.debug(`[Auth Trigger] Successfully set claims for ${user.email}`);
    } else {
      logger.debug(
        `[Auth Trigger] No role determined for ${user.email}, no claims set`,
      );
    }
  } catch (error) {
    console.error("[Auth Trigger] Error processing signup:", error);
  }
});
