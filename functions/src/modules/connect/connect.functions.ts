/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECT MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ConnectController } from "./connect.controller";
import type { AuthContext } from "../identity/identity.schema";
import { isAppError } from "../../utils/errors";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (boring, explicit)
// ─────────────────────────────────────────────────────────────────────────────

function errorCodeToHttpsCode(
    code: string
): "not-found" | "permission-denied" | "invalid-argument" | "internal" {
    if (code === "NOT_FOUND") {
        return "not-found";
    }
    if (code === "PERMISSION_DENIED") {
        return "permission-denied";
    }
    if (code === "INVALID_INPUT") {
        return "invalid-argument";
    }
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
 * Check in to a pin
 */
export const checkIn = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const checkIn = await ConnectController.checkIn(ctx, input);
        return { success: true, data: checkIn };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Join an event
 */
export const joinEvent = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const join = await ConnectController.joinEvent(ctx, input);
        return { success: true, data: join };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Leave an event
 */
export const leaveEvent = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const join = await ConnectController.leaveEvent(ctx, input);
        return { success: true, data: join };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Get active feed
 */
export const getActiveFeed = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const query = request.data?.query || {};

        const activities = await ConnectController.getActiveFeed(ctx, query);
        return { success: true, data: activities };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Get live venues
 */
export const getLiveVenues = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const query = request.data?.query || {};

        const venues = await ConnectController.getLiveVenues(ctx, query);
        return { success: true, data: venues };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Get curation items
 */
export const getCurationItems = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);

        const items = await ConnectController.getCurationItems(ctx);
        return { success: true, data: items };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});

/**
 * Upsert curation item (admin only)
 */
export const upsertCurationItem = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const item = await ConnectController.upsertCurationItem(ctx, input);
        return { success: true, data: item };
    } catch (error) {
        if (isAppError(error)) {
            throw new HttpsError(errorCodeToHttpsCode(error.code), error.message);
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred");
    }
});
