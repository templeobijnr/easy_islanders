/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + Permission checks.
 * NO direct Firestore access.
 */

import { IdentityService } from "./identity.service";
import type { AuthContext, UpdateUserInput, User } from "./identity.schema";
import { UpdateUserInputSchema } from "./identity.schema";
import { AppError } from "../../utils/errors";

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const canAccessUser = (ctx: AuthContext, targetUserId: string): boolean => {
    // Admin can access any user
    if (ctx.isAdmin || ctx.role === "admin" || ctx.role === "superadmin") {
        return true;
    }
    // Users can only access their own data
    return ctx.uid === targetUserId;
};

const canModifyUser = (ctx: AuthContext, targetUserId: string): boolean => {
    // Admin can modify any user
    if (ctx.isAdmin || ctx.role === "admin" || ctx.role === "superadmin") {
        return true;
    }
    // Users can only modify their own data
    return ctx.uid === targetUserId;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const IdentityController = {
    /**
     * Get a user by ID
     * - Users can only get their own profile
     * - Admins can get any profile
     */
    async getUser(ctx: AuthContext, userId: string): Promise<User | null> {
        // Permission check
        if (!canAccessUser(ctx, userId)) {
            throw new AppError("PERMISSION_DENIED", "You can only access your own profile");
        }

        return IdentityService.getUser(userId);
    },

    /**
     * Update user profile
     * - Users can only update their own profile
     * - Admins can update any profile
     */
    async updateProfile(
        ctx: AuthContext,
        userId: string,
        updates: UpdateUserInput
    ): Promise<User | null> {
        // Permission check
        if (!canModifyUser(ctx, userId)) {
            throw new AppError("PERMISSION_DENIED", "You can only update your own profile");
        }

        // Validate input
        const validationResult = UpdateUserInputSchema.safeParse(updates);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        // Prevent role escalation by non-admins
        if (updates.role && !ctx.isAdmin) {
            throw new AppError("PERMISSION_DENIED", "Only admins can modify roles");
        }

        return IdentityService.updateUser(userId, validationResult.data);
    },

    /**
     * Get current user's profile
     */
    async getMyProfile(ctx: AuthContext): Promise<User | null> {
        return IdentityService.getUser(ctx.uid);
    },

    /**
     * Deactivate a user (soft delete)
     * - Users can deactivate their own account
     * - Admins can deactivate any account
     */
    async deactivateUser(ctx: AuthContext, userId: string): Promise<boolean> {
        if (!canModifyUser(ctx, userId)) {
            throw new AppError("PERMISSION_DENIED", "You can only deactivate your own account");
        }

        return IdentityService.deactivateUser(userId);
    },
};
