/**
 * Social Domain Service — IDENTITY ONLY
 *
 * This service intentionally supports:
 * - User profiles (create, read, update)
 *
 * Explicitly excluded (deprecated product features):
 * - Posts
 * - Comments
 * - Likes
 * - Feeds
 * - Groups / Tribes
 * - Waves / Connections
 * - Check-ins (owned by connectService)
 * - Gamification (stamps, points)
 *
 * Firestore Collection: socialUsers
 *
 * This scope is contractual. Do not add deprecated features.
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

/**
 * User profile type for social identity
 */
export interface SocialUser {
    id: string;
    name: string;
    avatar: string;
    rank?: string;
    points?: number;
    badges?: string[];
    interests?: string[];
    trustScore?: number;
    vouches?: number;
    passportStamps?: Array<{
        id: string;
        locationName: string;
        category: string;
        date: string;
        icon: string;
        imageUrl?: string;
    }>;
}

const USERS_COLLECTION = 'socialUsers';

/**
 * Social Domain Service — Identity Only
 *
 * Provides user profile management.
 * Does NOT handle check-ins, posts, comments, or any social feed features.
 */
export const SocialService = {
    /**
     * Fetch a user profile by ID.
     *
     * @param userId - The user's unique identifier
     * @returns The user profile or null if not found
     *
     * Collection: socialUsers
     * Does NOT: create profiles, trigger side effects
     */
    async getUserProfile(userId: string): Promise<SocialUser | null> {
        try {
            const docRef = doc(db, USERS_COLLECTION, userId);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                return { id: snap.id, ...snap.data() } as SocialUser;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    /**
     * Ensure a user profile exists, creating one if needed.
     *
     * @param user - User object with at least id and optional name/avatar
     * @returns The existing or newly created profile
     *
     * Collection: socialUsers
     * Does NOT: update existing profiles
     */
    async ensureUserProfile(user: {
        id: string;
        name?: string;
        avatar?: string;
        profile?: { interests?: string[] };
    }): Promise<SocialUser> {
        const existing = await this.getUserProfile(user.id);
        if (existing) return existing;

        const newProfile: SocialUser = {
            id: user.id,
            name: user.name || 'Islander',
            avatar:
                user.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`,
            rank: 'Newcomer',
            points: 0,
            badges: ['Newcomer'],
            interests: user.profile?.interests || [],
            trustScore: 10,
            vouches: 0,
            passportStamps: [],
        };

        await setDoc(doc(db, USERS_COLLECTION, user.id), {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return newProfile;
    },

    /**
     * Update an existing user profile.
     *
     * @param userId - The user's unique identifier
     * @param updates - Partial profile data to merge
     *
     * Collection: socialUsers
     * Does NOT: create profiles if missing
     */
    async updateUserProfile(
        userId: string,
        updates: Partial<Omit<SocialUser, 'id'>>
    ): Promise<void> {
        const docRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    },
};
