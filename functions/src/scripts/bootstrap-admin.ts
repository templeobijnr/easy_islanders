import * as logger from "firebase-functions/logger";
import { getErrorMessage } from '../utils/errors';

/**
 * Bootstrap Admin Script
 *
 * This script is used ONE TIME to set up the first admin account.
 * After the first admin exists, they can promote other users via the admin panel.
 *
 * Usage:
 *   cd functions
 *   npx ts-node src/scripts/bootstrap-admin.ts <email>
 *
 * Example:
 *   npx ts-node src/scripts/bootstrap-admin.ts admin@example.com
 */

import * as admin from "firebase-admin";
import * as path from "path";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(
  __dirname,
  "../../serviceAccountKey.json",
);

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  // Fallback to default credentials (for Cloud Shell or environments with GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp();
}

const db = getFirestore(admin.app(), "easy-db");

async function bootstrapAdmin(email: string) {
  logger.debug(`\n🔧 Bootstrapping admin for: ${email}\n`);

  try {
    // 1. Get user by email
    let user: admin.auth.UserRecord;
    try {
      user = await admin.auth().getUserByEmail(email);
      logger.debug(`✅ Found existing user: ${user.uid}`);
    } catch (err: unknown) {
      const code = typeof err === "object" && err && "code" in err ? (err as any).code : undefined;
      if (code === "auth/user-not-found") {
        console.error(
          `❌ User not found. Please sign up first at the app, then run this script.`,
        );
        process.exit(1);
      }
      throw err;
    }

    // 2. Update Firestore document
    const userRef = db.collection("users").doc(user.uid);
    await userRef.set(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "Admin",
        role: "admin",
        type: "admin",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        bootstrapped: true,
        bootstrappedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    logger.debug(`✅ Updated Firestore document with role: admin`);

    // 3. Set Auth custom claims
    const customClaims = {
      admin: true,
      role: "admin",
      accessLevel: 9,
    };
    await admin.auth().setCustomUserClaims(user.uid, customClaims);
    logger.debug(`✅ Set Auth custom claims: admin=true`);

    // 4. Verify claims were set
    const updatedUser = await admin.auth().getUser(user.uid);
    logger.debug(`\n📋 Verification:`);
    logger.debug(`   UID: ${updatedUser.uid}`);
    logger.debug(`   Email: ${updatedUser.email}`);
    logger.debug(`   Claims: ${JSON.stringify(updatedUser.customClaims)}`);

    logger.debug(`\n✅ SUCCESS! ${email} is now an admin.`);
    logger.debug(
      `\n⚠️  IMPORTANT: The user must SIGN OUT and SIGN BACK IN to get the new token.`,
    );
    logger.debug(`   Alternatively, call forceRefreshToken() in the app.\n`);
  } catch (error: unknown) {
    console.error(`\n❌ Error:`, getErrorMessage(error));
    process.exit(1);
  }

  process.exit(0);
}

// Main
const email = process.argv[2];

if (!email) {
  logger.debug(`
╔═══════════════════════════════════════════════════════════════╗
║                    BOOTSTRAP ADMIN SCRIPT                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Usage: npx ts-node src/scripts/bootstrap-admin.ts <email>    ║
║                                                               ║
║  Example:                                                     ║
║    npx ts-node src/scripts/bootstrap-admin.ts admin@test.com  ║
║                                                               ║
║  Prerequisites:                                               ║
║    1. User must have signed up in the app first               ║
║    2. serviceAccountKey.json must be in functions/ folder     ║
╚═══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

if (!email.includes("@")) {
  console.error("❌ Invalid email address");
  process.exit(1);
}

bootstrapAdmin(email);
