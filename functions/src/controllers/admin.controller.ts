import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";

/**
 * Bootstrap emails - same as in auth.triggers.ts
 * These users can claim admin even if their Firestore doc doesn't have role set
 */
const BOOTSTRAP_ADMIN_EMAILS = [
  "temple@easyislanders.com",
  "admin@easyislanders.com",
];

/**
 * Sync Admin Claims
 *
 * This endpoint allows a user to sync their Auth claims with their Firestore role.
 * For bootstrap emails, it will also SET the role in Firestore if not already set.
 *
 * Use case: Existing users from old system need to migrate to new Firestore-based system.
 *
 * Authorization: User must be authenticated
 */
export const syncAdminClaims = async (req: Request, res: Response) => {
  try {
    // 1. Verify the ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // 2. Check if this is a bootstrap email (migration path)
    const isBootstrapEmail =
      email &&
      (BOOTSTRAP_ADMIN_EMAILS.includes(email) ||
        email.endsWith("@easyislanders.com"));

    // 3. Get or create user's Firestore document
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    let role = userDoc.data()?.role;

    // If bootstrap email and no admin role set, set it now
    if (isBootstrapEmail && role !== "admin") {
      await userRef.set(
        {
          uid: uid,
          email: email,
          role: "admin",
          bootstrapped: true,
          bootstrappedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      role = "admin";
      logger.debug(`[Admin Controller] Bootstrap: Set admin role for ${email}`);
    }

    if (!role && !isBootstrapEmail) {
      res.status(403).json({
        error: "No role assigned and email is not in bootstrap list",
        email: email,
      });
      return;
    }

    // 4. Determine claims based on role
    let customClaims: Record<string, any>;

    if (role === "admin") {
      customClaims = {
        admin: true,
        role: "admin",
        accessLevel: 9,
      };
    } else if (role === "business") {
      customClaims = {
        admin: false,
        role: "business",
        accessLevel: 5,
      };
    } else {
      customClaims = {
        admin: false,
        role: role || "user",
        accessLevel: 1,
      };
    }

    // 5. Set custom claims
    await admin.auth().setCustomUserClaims(uid, customClaims);

    // 6. Signal client to refresh token
    try {
      const rtdb = admin.database();
      await rtdb.ref(`metadata/${uid}`).set({
        refreshTime: Date.now(),
      });
    } catch (metaErr) {
      console.warn("Skipping metadata refresh (RTDB not configured)");
    }

    logger.debug(`[Admin Controller] Synced claims for ${email}: role=${role}`);

    res.json({
      status: "success",
      message: `Claims synced. Role: ${role}. Please sign out and back in to refresh your token.`,
      role: role,
      claims: customClaims,
    });
  } catch (error: any) {
    console.error("[Admin Controller] Error syncing claims:", error);
    res.status(500).json({ error: error.message || "Failed to sync claims" });
  }
};

/**
 * Promote User to Admin (Admin-Only)
 *
 * Only existing admins can promote other users to admin.
 * This updates both Firestore and Auth claims.
 */
export const promoteToAdmin = async (req: Request, res: Response) => {
  try {
    // 1. Verify the ID token and check if caller is admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if caller is admin
    if (!decodedToken.admin) {
      res
        .status(403)
        .json({ error: "Forbidden: Only admins can promote users" });
      return;
    }

    // 2. Get target user ID from request
    const { targetUid, targetEmail } = req.body;

    let uid = targetUid;

    // If email provided instead of UID, look up the UID
    if (!uid && targetEmail) {
      const userRecord = await admin.auth().getUserByEmail(targetEmail);
      uid = userRecord.uid;
    }

    if (!uid) {
      res.status(400).json({ error: "Must provide targetUid or targetEmail" });
      return;
    }

    // 3. Update Firestore (source of truth)
    await db.collection("users").doc(uid).set(
      {
        role: "admin",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        promotedBy: decodedToken.uid,
      },
      { merge: true },
    );

    // 4. Set Auth custom claims
    const customClaims = {
      admin: true,
      role: "admin",
      accessLevel: 9,
    };
    await admin.auth().setCustomUserClaims(uid, customClaims);

    // 5. Signal token refresh
    try {
      await admin.database().ref(`metadata/${uid}`).set({
        refreshTime: Date.now(),
      });
    } catch (metaErr) {
      console.warn("Skipping metadata refresh (RTDB not configured)");
    }

    logger.debug(
      `[Admin Controller] ${decodedToken.email} promoted ${uid} to admin`,
    );

    res.json({
      status: "success",
      message: `User ${uid} promoted to admin`,
      promotedBy: decodedToken.email,
    });
  } catch (error: any) {
    console.error("[Admin Controller] Error promoting user:", error);
    res.status(500).json({ error: error.message || "Failed to promote user" });
  }
};

/**
 * Demote Admin (Admin-Only)
 *
 * Remove admin privileges from a user.
 */
export const demoteAdmin = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if (!decodedToken.admin) {
      res
        .status(403)
        .json({ error: "Forbidden: Only admins can demote users" });
      return;
    }

    const { targetUid } = req.body;

    if (!targetUid) {
      res.status(400).json({ error: "Must provide targetUid" });
      return;
    }

    // Prevent self-demotion
    if (targetUid === decodedToken.uid) {
      res.status(400).json({ error: "Cannot demote yourself" });
      return;
    }

    // Update Firestore
    await db.collection("users").doc(targetUid).set(
      {
        role: "user",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        demotedBy: decodedToken.uid,
      },
      { merge: true },
    );

    // Update Auth claims
    await admin.auth().setCustomUserClaims(targetUid, {
      admin: false,
      role: "user",
      accessLevel: 1,
    });

    logger.debug(
      `[Admin Controller] ${decodedToken.email} demoted ${targetUid}`,
    );

    res.json({
      status: "success",
      message: `User ${targetUid} demoted to regular user`,
    });
  } catch (error: any) {
    console.error("[Admin Controller] Error demoting user:", error);
    res.status(500).json({ error: error.message || "Failed to demote user" });
  }
};

// Legacy export for backwards compatibility
export const claimAdminRole = syncAdminClaims;
