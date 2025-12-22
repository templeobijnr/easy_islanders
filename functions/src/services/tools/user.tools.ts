import { db } from '../../config/firebase';
import { asToolContext, UserIdOrToolContext } from './toolContext';
import { getErrorMessage } from '../../utils/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Typed Arguments
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyArgs {
    // No required args - used for queries that only need userId from context
}

interface UpdateUserProfileArgs {
    persona?: string;
    interests?: string[];
    budget?: string;
    location?: string;
}

interface SaveFavoriteArgs {
    itemId: string;
    title: string;
    domain?: string;
}

interface ListFavoritesArgs {
    limit?: number;
}

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// User Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const userTools = {
    /**
     * Get user profile information
     */
    getUserProfile: async (_args: EmptyArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const ctx = asToolContext(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }

        try {
            const userDoc = await db.collection('users').doc(userId).get();

            if (!userDoc.exists) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            return {
                success: true,
                profile: userDoc.data()
            };
        } catch (err: unknown) {
            console.error("🔴 [UserProfile] Failed:", err);
            return {
                success: false,
                error: getErrorMessage(err) || 'Failed to get user profile'
            };
        }
    },

    /**
     * Update user profile/preferences
     */
    updateUserProfile: async (args: UpdateUserProfileArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const ctx = asToolContext(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }

        try {
            const userRef = db.collection('users').doc(userId);
            await userRef.set({
                persona: args.persona || null,
                interests: args.interests || null,
                budget: args.budget || null,
                location: args.location || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return { success: true };
        } catch (err: unknown) {
            console.error("🔴 [UpdateProfile] Failed:", err);
            return {
                success: false,
                error: getErrorMessage(err) || 'Failed to update profile'
            };
        }
    },

    /**
     * Save an item to favorites
     */
    saveFavoriteItem: async (args: SaveFavoriteArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const ctx = asToolContext(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }

        try {
            const favRef = db.collection('users').doc(userId).collection('favorites').doc(args.itemId);
            await favRef.set({
                itemId: args.itemId,
                title: args.title,
                domain: args.domain || null,
                createdAt: new Date().toISOString()
            });
            return { success: true };
        } catch (err: unknown) {
            console.error("🔴 [SaveFavorite] Failed:", err);
            return {
                success: false,
                error: getErrorMessage(err) || 'Failed to save favorite'
            };
        }
    },

    /**
     * List user favorites
     */
    listFavorites: async (_args: ListFavoritesArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const ctx = asToolContext(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }

        try {
            const snap = await db.collection('users').doc(userId).collection('favorites').limit(50).get();
            return {
                success: true,
                favorites: snap.docs.map(d => d.data())
            };
        } catch (err: unknown) {
            console.error("🔴 [ListFavorites] Failed:", err);
            return {
                success: false,
                error: getErrorMessage(err) || 'Failed to list favorites'
            };
        }
    }
};
