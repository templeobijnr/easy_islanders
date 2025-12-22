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
exports.verifyBusinessOwnership = exports.getBusinessIdForUser = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * Get the Business ID owned by a user.
 * This enforces strict 1-to-1 ownership for now.
 *
 * @param uid The Firebase Auth User ID
 * @returns The businessId if found
 * @throws Error if user does not own a business
 */
const getBusinessIdForUser = async (uid) => {
    try {
        // 1. Check custom claims (Future optimization)
        // If we implement custom claims sync, we could check context.auth.token.businessId here.
        // 2. Query Firestore 'businesses' collection
        // Assumes schema: businesses/{businessId} has field 'ownerId' == uid
        const snapshot = await firebase_1.db.collection('businesses')
            .where('ownerId', '==', uid)
            .limit(1)
            .get();
        if (snapshot.empty) {
            // Fallback: Check 'listings' if businesses collection isn't fully migrated
            const listingSnapshot = await firebase_1.db.collection('listings')
                .where('userId', '==', uid) // Listing schema usually has userId
                .limit(1)
                .get();
            if (listingSnapshot.empty) {
                logger.warn(`[Auth] User ${uid} attempted action but owns no business/listing`);
                throw new Error("You do not have permission to manage this business.");
            }
            return listingSnapshot.docs[0].id;
        }
        return snapshot.docs[0].id;
    }
    catch (error) {
        logger.error(`[Auth] Error resolving business for user ${uid}:`, error);
        throw error;
    }
};
exports.getBusinessIdForUser = getBusinessIdForUser;
/**
 * Verify that a user owns the specific businessId they are trying to access.
 * Use this when the request specifies a target businessId.
 */
const verifyBusinessOwnership = async (uid, targetBusinessId) => {
    const ownedBusinessId = await (0, exports.getBusinessIdForUser)(uid);
    return ownedBusinessId === targetBusinessId;
};
exports.verifyBusinessOwnership = verifyBusinessOwnership;
//# sourceMappingURL=auth.utils.js.map