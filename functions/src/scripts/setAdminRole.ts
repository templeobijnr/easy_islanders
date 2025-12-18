import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
// If running locally with 'firebase login', this might pick up ADC.
// Otherwise, you might need to set GOOGLE_APPLICATION_CREDENTIALS.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "easy-islanders",
    // If you have a service account key, you can uncomment and point to it:
    // credential: admin.credential.cert(require('../../service-account.json')),
  });
}

const setAdminRole = async (email: string) => {
  try {
    const user = await admin.auth().getUserByEmail(email);

    // Set admin claim
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: "admin", // Setting both to be safe, as rules checked for role == 'admin'
    });

    logger.debug(
      `Successfully set admin role for user: ${email} (${user.uid})`,
    );
    logger.debug(
      "Metadata refreshed. Please sign out and sign in again in the frontend to refresh the token.",
    );
  } catch (error) {
    console.error("Error setting admin role:", error);
    process.exit(1);
  }
};

// Get email from command line args
const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address as an argument.");
  logger.debug(
    "Usage: npx ts-node -r esbuild-register src/scripts/setAdminRole.ts <email>",
  );
  process.exit(1);
}

setAdminRole(email);
