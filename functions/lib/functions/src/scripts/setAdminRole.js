"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
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
const setAdminRole = async (email) => {
    try {
        const user = await admin.auth().getUserByEmail(email);
        // Set admin claim
        await admin.auth().setCustomUserClaims(user.uid, {
            admin: true,
            role: "admin", // Setting both to be safe, as rules checked for role == 'admin'
        });
        logger.debug(`Successfully set admin role for user: ${email} (${user.uid})`);
        logger.debug("Metadata refreshed. Please sign out and sign in again in the frontend to refresh the token.");
    }
    catch (error) {
        console.error("Error setting admin role:", error);
        process.exit(1);
    }
};
// Get email from command line args
const email = process.argv[2];
if (!email) {
    console.error("Please provide an email address as an argument.");
    logger.debug("Usage: npx ts-node -r esbuild-register src/scripts/setAdminRole.ts <email>");
    process.exit(1);
}
setAdminRole(email);
//# sourceMappingURL=setAdminRole.js.map