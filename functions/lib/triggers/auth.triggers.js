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
exports.processSignUp = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
/**
 * BOOTSTRAP EMAILS - Only for initial setup
 * These emails get auto-admin on signup. After that, use Firestore role management.
 * Once you have at least one admin, they can promote others via the admin panel.
 */
const BOOTSTRAP_ADMIN_EMAILS = [
    'temple@easyislanders.com',
    'admin@easyislanders.com'
];
/**
 * Auth Trigger: Process New User Sign-Up
 *
 * Priority order:
 * 1. Check if email is in bootstrap list (for initial setup)
 * 2. Check Firestore document for role (scalable approach)
 */
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
    console.log(`[Auth Trigger] New user signed up: ${user.email} (${user.uid})`);
    try {
        let customClaims = null;
        // PRIORITY 1: Check explicit bootstrap emails (for initial setup only)
        // SECURITY: Removed domain-based escalation (@easyislanders.com)
        // Use explicit allowlist only - add emails to BOOTSTRAP_ADMIN_EMAILS
        if (user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email)) {
            customClaims = {
                admin: true,
                role: 'admin',
                accessLevel: 9
            };
            console.log(`[Auth Trigger] Bootstrap: Assigning ADMIN to ${user.email}`);
            // Also update Firestore to keep it in sync
            await firebase_1.db.collection('users').doc(user.uid).set({
                role: 'admin',
                bootstrapped: true,
                bootstrappedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
        else {
            // PRIORITY 2: Check Firestore document for role
            // Wait a moment for Firestore document to be created (if created by client)
            await new Promise(resolve => setTimeout(resolve, 2000));
            const userDoc = await firebase_1.db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData === null || userData === void 0 ? void 0 : userData.role;
                if (role === 'admin') {
                    customClaims = {
                        admin: true,
                        role: 'admin',
                        accessLevel: 9
                    };
                    console.log(`[Auth Trigger] Firestore: Assigning ADMIN to ${user.email}`);
                }
                else if (role === 'business') {
                    customClaims = {
                        admin: false,
                        role: 'business',
                        accessLevel: 5
                    };
                    console.log(`[Auth Trigger] Firestore: Assigning BUSINESS to ${user.email}`);
                }
                else if (role) {
                    customClaims = {
                        admin: false,
                        role: role,
                        accessLevel: 1
                    };
                    console.log(`[Auth Trigger] Firestore: Assigning ${role} to ${user.email}`);
                }
            }
        }
        // Apply claims if determined
        if (customClaims) {
            await admin.auth().setCustomUserClaims(user.uid, customClaims);
            // Signal client to refresh token (if Realtime DB is configured)
            try {
                const metadataRef = admin.database().ref('metadata/' + user.uid);
                await metadataRef.set({ refreshTime: Date.now() });
            }
            catch (rtdbErr) {
                console.warn('[Auth Trigger] RTDB not configured, skipping metadata update');
            }
            console.log(`[Auth Trigger] Successfully set claims for ${user.email}`);
        }
        else {
            console.log(`[Auth Trigger] No role determined for ${user.email}, no claims set`);
        }
    }
    catch (error) {
        console.error('[Auth Trigger] Error processing signup:', error);
    }
});
//# sourceMappingURL=auth.triggers.js.map