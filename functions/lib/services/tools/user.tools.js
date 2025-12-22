"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userTools = void 0;
const firebase_1 = require("../../config/firebase");
const toolContext_1 = require("./toolContext");
exports.userTools = {
    /**
     * Get user profile information
     */
    getUserProfile: async (_args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        try {
            const userDoc = await firebase_1.db.collection('users').doc(userId).get();
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
        }
        catch (err) {
            console.error("🔴 [UserProfile] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to get user profile'
            };
        }
    },
    /**
     * Update user profile/preferences
     */
    updateUserProfile: async (args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        try {
            const userRef = firebase_1.db.collection('users').doc(userId);
            await userRef.set({
                persona: args.persona || null,
                interests: args.interests || null,
                budget: args.budget || null,
                location: args.location || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return { success: true };
        }
        catch (err) {
            console.error("🔴 [UpdateProfile] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to update profile'
            };
        }
    },
    /**
     * Save an item to favorites
     */
    saveFavoriteItem: async (args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        try {
            const favRef = firebase_1.db.collection('users').doc(userId).collection('favorites').doc(args.itemId);
            await favRef.set({
                itemId: args.itemId,
                title: args.title,
                domain: args.domain || null,
                createdAt: new Date().toISOString()
            });
            return { success: true };
        }
        catch (err) {
            console.error("🔴 [SaveFavorite] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to save favorite'
            };
        }
    },
    /**
     * List user favorites
     */
    listFavorites: async (_args, userIdOrContext) => {
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
        const userId = ctx.userId;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized: User ID required'
            };
        }
        try {
            const snap = await firebase_1.db.collection('users').doc(userId).collection('favorites').limit(50).get();
            return {
                success: true,
                favorites: snap.docs.map(d => d.data())
            };
        }
        catch (err) {
            console.error("🔴 [ListFavorites] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to list favorites'
            };
        }
    }
};
//# sourceMappingURL=user.tools.js.map