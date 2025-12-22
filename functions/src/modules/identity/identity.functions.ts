/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { IdentityController } from "./identity.controller";
import type { AuthContext } from "./identity.schema";
import { AppError, isAppError } from "../../utils/errors";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const errorCodeToHttpsCode = (code: string): "not-found" | "permission-denied" | "invalid-argument" | "internal" => {
    switch (code) {
        case "NOT_FOUND":
            return "not-found";
        case "PERMISSION_DENIED":
            return "permission-denied";
        case "INVALID_INPUT":
            return "invalid-argument";
        default:
            return "internal";
    }
};

const extractAuthContext = (auth: { uid: string; token?: any } | undefined): AuthContext => {
    if (!auth) {
        throw new HttpsError("unauthenticated", "Authentication required");
    }

    const role = auth.token?.role || "user";
    return {
        uid: auth.uid,
        email: auth.token?.email,
        role,
        isAdmin: role === "admin" || role === "superadmin",
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a user by ID
 */
export const getUser = onCall(
    { region: "europe-west1" },
    async (request) => {
        try {
            const ctx = extractAuthContext(request.auth);
            const userId = request.data?.userId as string;

            if (!userId) {
                throw new HttpsError("invalid-argument", "userId is required");
            }

            const user = await IdentityController.getUser(ctx, userId);
            return { success: true, data: user };
        } catch (error) {
            if (isAppError(error)) {
                throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
            }
            if (error instanceof HttpsError) {
                throw error;
            }
            throw new HttpsError("internal", "An unexpected error occurred");
        }
    }
);

/**
 * Get current user's profile
 */
export const getMyProfile = onCall(
    { region: "europe-west1" },
    async (request) => {
        try {
            const ctx = extractAuthContext(request.auth);
            const user = await IdentityController.getMyProfile(ctx);
            return { success: true, data: user };
        } catch (error) {
            if (isAppError(error)) {
                throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
            }
            if (error instanceof HttpsError) {
                throw error;
            }
            throw new HttpsError("internal", "An unexpected error occurred");
        }
    }
);

/**
 * Update user profile
 */
export const updateProfile = onCall(
    { region: "europe-west1" },
    async (request) => {
        try {
            const ctx = extractAuthContext(request.auth);
            const { userId, updates } = request.data || {};

            if (!userId) {
                throw new HttpsError("invalid-argument", "userId is required");
            }

            const user = await IdentityController.updateProfile(ctx, userId, updates);
            return { success: true, data: user };
        } catch (error) {
            if (isAppError(error)) {
                throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
            }
            if (error instanceof HttpsError) {
                throw error;
            }
            throw new HttpsError("internal", "An unexpected error occurred");
        }
    }
);

/**
 * Deactivate user account (soft delete)
 */
export const deactivateAccount = onCall(
    { region: "europe-west1" },
    async (request) => {
        try {
            const ctx = extractAuthContext(request.auth);
            const userId = request.data?.userId as string;

            if (!userId) {
                throw new HttpsError("invalid-argument", "userId is required");
            }

            const success = await IdentityController.deactivateUser(ctx, userId);
            return { success };
        } catch (error) {
            if (isAppError(error)) {
                throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
            }
            if (error instanceof HttpsError) {
                throw error;
            }
            throw new HttpsError("internal", "An unexpected error occurred");
        }
    }
);
