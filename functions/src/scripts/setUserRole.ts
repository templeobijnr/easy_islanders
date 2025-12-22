import { getErrorMessage } from '../utils/errors';
/**
 * Simple script to set a Firebase Auth custom claim `role`
 * for a given user (e.g. 'admin' or 'business').
 *
 * Usage (from project root):
 *   cd functions
 *   npx ts-node -r esbuild-register src/scripts/setUserRole.ts <UID> <role>
 *
 * Example:
 *   npx ts-node -r esbuild-register src/scripts/setUserRole.ts UID_OF_ADMIN admin
 */

import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Admin SDK using default credentials (Functions env or local service account)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function main() {
  const [, , uid, role] = process.argv;

  if (!uid || !role) {
    console.error("Usage: setUserRole <UID> <role>");
    console.error("Example: setUserRole 12345 admin");
    process.exit(1);
  }

  if (!["admin", "business", "user"].includes(role)) {
    console.error("Role must be one of: 'admin', 'business', 'user'");
    process.exit(1);
  }

  try {
    logger.debug(`🔧 Setting role for UID=${uid} to '${role}'...`);

    const user = await admin.auth().getUser(uid);
    const existingClaims = user.customClaims || {};

    const updatedClaims = {
      ...existingClaims,
      role,
    };

    await admin.auth().setCustomUserClaims(uid, updatedClaims);

    logger.debug("✅ Custom claims updated:", updatedClaims);
    logger.debug(
      "ℹ️ User must sign out and sign back in for the new role to take effect in ID tokens.",
    );
    process.exit(0);
  } catch (err: unknown) {
    console.error("❌ Failed to set role:", getErrorMessage(err) || err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
