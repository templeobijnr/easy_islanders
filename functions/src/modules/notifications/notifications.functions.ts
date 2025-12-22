/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 *
 * NOTE: Notifications are primarily internal (called from controllers/triggers).
 * These callable functions provide client access to user notifications.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { NotificationsController } from "./notifications.controller";
import type { AuthContext } from "../identity/identity.schema";
import { isAppError } from "../../utils/errors";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const REGION = "europe-west1";

function errorCodeToHttpsCode(
    code: string
): "not-found" | "permission-denied" | "invalid-argument" | "internal" {
    if (code === "NOT_FOUND") return "not-found";
    if (code === "PERMISSION_DENIED") return "permission-denied";
    if (code === "INVALID_INPUT") return "invalid-argument";
    return "internal";
}

function extractAuthContext(auth: { uid: string; token?: any } | undefined): AuthContext {
    if (!auth) {
        throw new HttpsError("unauthenticated", "Authentication required");
    }

    const role = auth.token?.role || "user";
    const isAdmin = role === "admin" || role === "superadmin";

    return {
        uid: auth.uid,
        email: auth.token?.email,
        role: role,
        isAdmin: isAdmin,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current user's notifications.
 */
export const getMyNotifications = onCall({ region: REGION }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const query = request.data?.query;

        const notifications = await NotificationsController.getMyNotifications(ctx, query);
        return { success: true, data: notifications };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Mark a notification as read.
 */
export const markNotificationRead = onCall({ region: REGION }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const notificationId = request.data?.notificationId;

        if (!notificationId) {
            throw new HttpsError("invalid-argument", "notificationId is required");
        }

        await NotificationsController.markAsRead(ctx, notificationId);
        return { success: true };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Get unread notification count.
 */
export const getUnreadNotificationCount = onCall({ region: REGION }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const count = await NotificationsController.getUnreadCount(ctx);
        return { success: true, data: { count } };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});
