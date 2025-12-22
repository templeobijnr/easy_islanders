import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Get the Business ID owned by a user.
 * This enforces strict 1-to-1 ownership for now.
 * 
 * @param uid The Firebase Auth User ID
 * @returns The businessId if found
 * @throws Error if user does not own a business
 */
export const getBusinessIdForUser = async (uid: string): Promise<string> => {
    try {
        // 1. Check custom claims (Future optimization)
        // If we implement custom claims sync, we could check context.auth.token.businessId here.

        // 2. Query Firestore 'businesses' collection
        // Assumes schema: businesses/{businessId} has field 'ownerId' == uid
        const snapshot = await db.collection('businesses')
            .where('ownerId', '==', uid)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Fallback: Check 'listings' if businesses collection isn't fully migrated
            const listingSnapshot = await db.collection('listings')
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
    } catch (error) {
        logger.error(`[Auth] Error resolving business for user ${uid}:`, error);
        throw error;
    }
};

/**
 * Verify that a user owns the specific businessId they are trying to access.
 * Use this when the request specifies a target businessId.
 */
export const verifyBusinessOwnership = async (uid: string, targetBusinessId: string): Promise<boolean> => {
    const ownedBusinessId = await getBusinessIdForUser(uid);
    return ownedBusinessId === targetBusinessId;
};
