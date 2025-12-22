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
exports.onUserUpdate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Triggers when a user document is updated in Firestore.
 * Syncs the 'role' field to Firebase Auth Custom Claims.
 */
exports.onUserUpdate = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;
    // Only proceed if the role has changed
    if (newData.role === oldData.role) {
        return null;
    }
    console.log(`Syncing role change for user ${userId}: ${oldData.role} -> ${newData.role}`);
    let customClaims = {};
    if (newData.role === 'admin') {
        customClaims = {
            admin: true,
            role: 'admin',
            accessLevel: 9
        };
    }
    else {
        // If role is removed or changed to something else, revoke admin claims
        customClaims = {
            admin: false,
            role: newData.role || 'user',
            accessLevel: 1
        };
    }
    try {
        // 1. Set Custom Claims
        await admin.auth().setCustomUserClaims(userId, customClaims);
        // 2. Force Token Refresh on Client
        // We update a metadata node in Realtime Database (or Firestore) that the client listens to.
        // Here we use the same pattern as auth.triggers.ts (Realtime DB)
        const metadataRef = admin.database().ref('metadata/' + userId);
        await metadataRef.set({
            refreshTime: new Date().getTime(),
            forceRefresh: true
        });
        console.log(`Successfully synced claims for user ${userId}`);
    }
    catch (error) {
        console.error(`Error syncing claims for user ${userId}:`, error);
    }
    return null;
});
//# sourceMappingURL=user.triggers.js.map