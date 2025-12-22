/**
 * Domain Service: Stamps (Gamification)
 *
 * Responsibility:
 * - Award stamps for check-ins
 * - Track user credibility scores
 * - Manage user ranks and leaderboards
 *
 * Firestore Collections:
 * - stamps
 * - userProfiles
 * - checkins
 *
 * Layer: Domain Service
 *
 * Dependencies:
 * - firebaseConfig (infrastructure)
 *
 * Notes:
 * - Part of Connect gamification system
 * - Safe to modify in isolation
 * - Well-documented internal functions
 *
 * Stability: Core
 */

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
    limit,
    increment,
    setDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Collections
const STAMPS_COLLECTION = 'stamps';
const USER_PROFILES_COLLECTION = 'userProfiles';
const CHECKINS_COLLECTION = 'checkins';

// Types
export interface Stamp {
    id: string;
    userId: string;
    pinId: string;
    pinType: 'place' | 'event' | 'activity' | 'experience';
    locationName: string;
    locationAddress?: string;
    category?: string;
    region?: string;
    icon?: string;
    earnedAt: Timestamp | Date;
    checkInId?: string; // Reference to the check-in that earned this stamp
}

export interface UserCredibility {
    userId: string;
    credibilityScore: number;
    totalCheckIns: number;
    totalStamps: number;
    rank: 'Explorer' | 'Local' | 'Insider' | 'Ambassador' | 'Legend';
    lastUpdated: Timestamp | Date;
}

// Rank thresholds
const RANK_THRESHOLDS = {
    Explorer: 0,
    Local: 10,
    Insider: 25,
    Ambassador: 50,
    Legend: 100,
};

/**
 * Calculate user rank based on credibility score
 */
export const calculateRank = (credibilityScore: number): UserCredibility['rank'] => {
    if (credibilityScore >= RANK_THRESHOLDS.Legend) return 'Legend';
    if (credibilityScore >= RANK_THRESHOLDS.Ambassador) return 'Ambassador';
    if (credibilityScore >= RANK_THRESHOLDS.Insider) return 'Insider';
    if (credibilityScore >= RANK_THRESHOLDS.Local) return 'Local';
    return 'Explorer';
};

/**
 * Award a stamp to a user for checking in at a location
 * Returns the stamp ID if awarded, null if user already has this stamp
 */
export const awardStamp = async (
    userId: string,
    pinId: string,
    pinType: Stamp['pinType'],
    locationName: string,
    options?: {
        locationAddress?: string;
        category?: string;
        region?: string;
        icon?: string;
        checkInId?: string;
    }
): Promise<string | null> => {
    // Check if user already has a stamp for this location
    const existingStampQuery = query(
        collection(db, STAMPS_COLLECTION),
        where('userId', '==', userId),
        where('pinId', '==', pinId)
    );
    const existingStamps = await getDocs(existingStampQuery);

    if (!existingStamps.empty) {
        // User already has this stamp
        return null;
    }

    // Create new stamp
    const stampData: Omit<Stamp, 'id'> = {
        userId,
        pinId,
        pinType,
        locationName,
        locationAddress: options?.locationAddress,
        category: options?.category,
        region: options?.region,
        icon: options?.icon || getDefaultIcon(pinType),
        earnedAt: serverTimestamp() as Timestamp,
        checkInId: options?.checkInId,
    };

    const stampRef = await addDoc(collection(db, STAMPS_COLLECTION), stampData);

    // Update user's credibility score
    await updateUserCredibility(userId, 1); // +1 point per stamp

    return stampRef.id;
};

/**
 * Get all stamps for a user
 */
export const getUserStamps = async (userId: string): Promise<Stamp[]> => {
    const stampsQuery = query(
        collection(db, STAMPS_COLLECTION),
        where('userId', '==', userId),
        orderBy('earnedAt', 'desc')
    );

    const snapshot = await getDocs(stampsQuery);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Stamp));
};

/**
 * Get user's credibility profile
 */
export const getUserCredibility = async (userId: string): Promise<UserCredibility | null> => {
    const profileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
        return null;
    }

    const data = profileSnap.data();
    return {
        userId,
        credibilityScore: data.credibilityScore || 0,
        totalCheckIns: data.totalCheckIns || 0,
        totalStamps: data.totalStamps || 0,
        rank: data.rank || 'Explorer',
        lastUpdated: data.lastUpdated || new Date(),
    };
};

/**
 * Update user's credibility score and stats
 */
export const updateUserCredibility = async (
    userId: string,
    pointsToAdd: number = 1
): Promise<void> => {
    const profileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
        // Initialize new profile
        const newScore = pointsToAdd;
        await setDoc(profileRef, {
            credibilityScore: newScore,
            totalCheckIns: 0,
            totalStamps: 1,
            rank: calculateRank(newScore),
            lastUpdated: serverTimestamp(),
        });
    } else {
        // Update existing profile
        const currentScore = profileSnap.data().credibilityScore || 0;
        const newScore = currentScore + pointsToAdd;

        await updateDoc(profileRef, {
            credibilityScore: increment(pointsToAdd),
            totalStamps: increment(1),
            rank: calculateRank(newScore),
            lastUpdated: serverTimestamp(),
        });
    }
};

/**
 * Increment user's check-in count
 */
export const incrementCheckInCount = async (userId: string): Promise<void> => {
    const profileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
        await setDoc(profileRef, {
            credibilityScore: 0,
            totalCheckIns: 1,
            totalStamps: 0,
            rank: 'Explorer',
            lastUpdated: serverTimestamp(),
        });
    } else {
        await updateDoc(profileRef, {
            totalCheckIns: increment(1),
            lastUpdated: serverTimestamp(),
        });
    }
};

/**
 * Get stamps count for a user
 */
export const getStampsCount = async (userId: string): Promise<number> => {
    const stampsQuery = query(
        collection(db, STAMPS_COLLECTION),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(stampsQuery);
    return snapshot.size;
};

/**
 * Check if user has a stamp for a specific location
 */
export const hasStamp = async (userId: string, pinId: string): Promise<boolean> => {
    const stampQuery = query(
        collection(db, STAMPS_COLLECTION),
        where('userId', '==', userId),
        where('pinId', '==', pinId),
        limit(1)
    );
    const snapshot = await getDocs(stampQuery);
    return !snapshot.empty;
};

/**
 * Get recently earned stamps (for activity feed)
 */
export const getRecentStamps = async (limitCount: number = 10): Promise<Stamp[]> => {
    const stampsQuery = query(
        collection(db, STAMPS_COLLECTION),
        orderBy('earnedAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(stampsQuery);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Stamp));
};

/**
 * Get stamps by category for a user
 */
export const getStampsByCategory = async (
    userId: string,
    category: string
): Promise<Stamp[]> => {
    const stampsQuery = query(
        collection(db, STAMPS_COLLECTION),
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('earnedAt', 'desc')
    );

    const snapshot = await getDocs(stampsQuery);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Stamp));
};

/**
 * Get default icon for a pin type
 */
const getDefaultIcon = (pinType: Stamp['pinType']): string => {
    switch (pinType) {
        case 'place':
            return '📍';
        case 'event':
            return '🎉';
        case 'activity':
            return '⚡';
        case 'experience':
            return '✨';
        default:
            return '📍';
    }
};

/**
 * Get leaderboard (top users by credibility)
 */
export const getLeaderboard = async (limitCount: number = 10): Promise<UserCredibility[]> => {
    const leaderboardQuery = query(
        collection(db, USER_PROFILES_COLLECTION),
        orderBy('credibilityScore', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(leaderboardQuery);
    return snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
    } as UserCredibility));
};
