/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKINGS MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { BookingsController } from "./bookings.controller";
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
 * Create a new booking
 */
export const createBooking = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const bookingId = await BookingsController.createBooking(ctx, input);
        return { success: true, data: { bookingId } };
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
 * Get a booking by ID
 */
export const getBooking = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const bookingId = request.data?.bookingId;

        if (!bookingId) {
            throw new HttpsError("invalid-argument", "bookingId is required");
        }

        const booking = await BookingsController.getBooking(ctx, bookingId);
        return { success: true, data: booking };
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
 * Get user's own bookings
 */
export const getMyBookings = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const query = request.data?.query;

        const bookings = await BookingsController.getMyBookings(ctx, query);
        return { success: true, data: bookings };
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
 * Confirm a booking
 */
export const confirmBooking = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const bookingId = request.data?.bookingId;

        if (!bookingId) {
            throw new HttpsError("invalid-argument", "bookingId is required");
        }

        const booking = await BookingsController.confirmBooking(ctx, bookingId);
        return { success: true, data: booking };
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
 * Complete a booking
 */
export const completeBooking = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const bookingId = request.data?.bookingId;

        if (!bookingId) {
            throw new HttpsError("invalid-argument", "bookingId is required");
        }

        const booking = await BookingsController.completeBooking(ctx, bookingId);
        return { success: true, data: booking };
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
 * Cancel a booking
 */
export const cancelBooking = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const bookingId = request.data?.bookingId;
        const input = request.data?.input || {};

        if (!bookingId) {
            throw new HttpsError("invalid-argument", "bookingId is required");
        }

        const booking = await BookingsController.cancelBooking(ctx, bookingId, input);
        return { success: true, data: booking };
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
