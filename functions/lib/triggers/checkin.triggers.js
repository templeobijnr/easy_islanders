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
exports.onCheckInDelete = exports.onCheckInCreate = exports.cleanupExpiredCheckIns = void 0;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Scheduled function to clean up expired check-ins
 * Runs every hour to remove check-ins where expiresAt < now
 */
exports.cleanupExpiredCheckIns = functions
    .region('europe-west1')
    .pubsub.schedule('every 60 minutes')
    .onRun(async () => {
    const now = firestore_1.Timestamp.now();
    try {
        const expiredQuery = await firebase_1.db.collection('checkins')
            .where('expiresAt', '<', now)
            .limit(500) // Process in batches
            .get();
        if (expiredQuery.empty) {
            console.log('✅ [CheckIn Cleanup] No expired check-ins found');
            return;
        }
        // Delete in batch
        const batch = firebase_1.db.batch();
        expiredQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ [CheckIn Cleanup] Deleted ${expiredQuery.size} expired check-ins`);
    }
    catch (error) {
        console.error('❌ [CheckIn Cleanup] Error cleaning up check-ins:', error);
    }
});
/**
 * Trigger when a check-in is created
 * Updates denormalized count on the pin document (optional optimization)
 */
exports.onCheckInCreate = functions
    .region('europe-west1')
    .firestore.document('checkins/{checkInId}')
    .onCreate(async (snap, context) => {
    const data = snap.data();
    const pinId = data.pinId;
    const pinType = data.pinType;
    console.log(`📍 [CheckIn] User ${data.userId} checked in to ${pinType}/${pinId}`);
    // Optionally: Update a denormalized counter on the pin document
    // This is a performance optimization for high-traffic pins
    // For V1, the real-time query approach is sufficient
});
/**
 * Trigger when a check-in is deleted (expired or manual)
 */
exports.onCheckInDelete = functions
    .region('europe-west1')
    .firestore.document('checkins/{checkInId}')
    .onDelete(async (snap, context) => {
    const data = snap.data();
    console.log(`📍 [CheckIn] Check-in removed: ${data.userId} from ${data.pinId}`);
});
//# sourceMappingURL=checkin.triggers.js.map