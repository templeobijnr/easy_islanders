#!/usr/bin/env npx ts-node
"use strict";
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
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
catch (err) {
    // Fallback to default credentials (for Cloud Shell or environments with GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
}
const db = (0, firestore_1.getFirestore)(admin.app(), 'easy-db');
async function bootstrapAdmin(email) {
    console.log(`\n🔧 Bootstrapping admin for: ${email}\n`);
    try {
        // 1. Get user by email
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`✅ Found existing user: ${user.uid}`);
        }
        catch (err) {
            if (err.code === 'auth/user-not-found') {
                console.error(`❌ User not found. Please sign up first at the app, then run this script.`);
                process.exit(1);
            }
            throw err;
        }
        // 2. Update Firestore document
        const userRef = db.collection('users').doc(user.uid);
        await userRef.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Admin',
            role: 'admin',
            type: 'admin',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            bootstrapped: true,
            bootstrappedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Updated Firestore document with role: admin`);
        // 3. Set Auth custom claims
        const customClaims = {
            admin: true,
            role: 'admin',
            accessLevel: 9
        };
        await admin.auth().setCustomUserClaims(user.uid, customClaims);
        console.log(`✅ Set Auth custom claims: admin=true`);
        // 4. Verify claims were set
        const updatedUser = await admin.auth().getUser(user.uid);
        console.log(`\n📋 Verification:`);
        console.log(`   UID: ${updatedUser.uid}`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Claims: ${JSON.stringify(updatedUser.customClaims)}`);
        console.log(`\n✅ SUCCESS! ${email} is now an admin.`);
        console.log(`\n⚠️  IMPORTANT: The user must SIGN OUT and SIGN BACK IN to get the new token.`);
        console.log(`   Alternatively, call forceRefreshToken() in the app.\n`);
    }
    catch (error) {
        console.error(`\n❌ Error:`, error.message);
        process.exit(1);
    }
    process.exit(0);
}
// Main
const email = process.argv[2];
if (!email) {
    console.log(`
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
if (!email.includes('@')) {
    console.error('❌ Invalid email address');
    process.exit(1);
}
bootstrapAdmin(email);
//# sourceMappingURL=bootstrap-admin.js.map