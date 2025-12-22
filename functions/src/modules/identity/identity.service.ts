/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Business logic + Firestore access.
 * NO HTTP, NO callable context, NO auth logic.
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { User, CreateUserInput, UpdateUserInput } from "./identity.schema";
import { UserSchema } from "./identity.schema";
import { AppError } from "../../utils/errors";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

const USERS_COLLECTION = "users";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const timestampToDate = (ts: Timestamp | undefined): Date | undefined => {
    return ts ? ts.toDate() : undefined;
};

const docToUser = (doc: FirebaseFirestore.DocumentSnapshot): User | null => {
    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
        id: doc.id,
        email: data.email,
        phone: data.phone,
        displayName: data.displayName,
        photoURL: data.photoURL,
        address: data.address,
        role: data.role || "user",
        userType: data.userType || "personal",
        businessName: data.businessName,
        settings: data.settings,
        profile: data.profile,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
        lastLoginAt: timestampToDate(data.lastLoginAt),
        isActive: data.isActive ?? true,
        isVerified: data.isVerified ?? false,
    } as User;
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const IdentityService = {
    /**
     * Get a user by ID
     */
    async getUser(userId: string): Promise<User | null> {
        const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
        return docToUser(doc);
    },

    /**
     * Create a new user
     */
    async createUser(userId: string, input: CreateUserInput): Promise<User> {
        const now = new Date();
        const userData = {
            ...input,
            createdAt: Timestamp.fromDate(now),
            updatedAt: Timestamp.fromDate(now),
            isActive: true,
            isVerified: false,
        };

        await db.collection(USERS_COLLECTION).doc(userId).set(userData);

        return {
            id: userId,
            ...input,
            createdAt: now,
            updatedAt: now,
            isActive: true,
            isVerified: false,
        } as User;
    },

    /**
     * Update an existing user
     */
    async updateUser(userId: string, updates: UpdateUserInput): Promise<User | null> {
        const docRef = db.collection(USERS_COLLECTION).doc(userId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const updateData = {
            ...updates,
            updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        // Fetch and return updated doc
        const updatedDoc = await docRef.get();
        return docToUser(updatedDoc);
    },

    /**
     * Check if a user exists
     */
    async userExists(userId: string): Promise<boolean> {
        const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
        return doc.exists;
    },

    /**
     * Soft delete a user (set isActive = false)
     */
    async deactivateUser(userId: string): Promise<boolean> {
        const docRef = db.collection(USERS_COLLECTION).doc(userId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return false;
        }

        await docRef.update({
            isActive: false,
            updatedAt: Timestamp.now(),
        });

        return true;
    },

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId: string): Promise<void> {
        await db.collection(USERS_COLLECTION).doc(userId).update({
            lastLoginAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    },
};
