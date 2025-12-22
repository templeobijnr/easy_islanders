/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { CatalogController } from "./catalog.controller";
import type { AuthContext } from "../identity/identity.schema";
import { AppError, isAppError } from "../../utils/errors";

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
 * Get a listing by ID
 */
export const getListing = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const listingId = request.data?.listingId;

        if (!listingId) {
            throw new HttpsError("invalid-argument", "listingId is required");
        }

        const listing = await CatalogController.getListing(ctx, listingId);
        return { success: true, data: listing };
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
 * Get listings by query
 */
export const getListings = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const query = request.data?.query || {};

        const listings = await CatalogController.getListings(ctx, query);
        return { success: true, data: listings };
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
 * Create a new listing
 */
export const createListing = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const listingId = await CatalogController.createListing(ctx, input);
        return { success: true, data: { listingId } };
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
 * Update an existing listing
 */
export const updateListing = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const listingId = request.data?.listingId;
        const updates = request.data?.updates;

        if (!listingId) {
            throw new HttpsError("invalid-argument", "listingId is required");
        }
        if (!updates) {
            throw new HttpsError("invalid-argument", "updates is required");
        }

        const listing = await CatalogController.updateListing(ctx, listingId, updates);
        return { success: true, data: listing };
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
 * Approve a listing (admin only)
 */
export const approveListing = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const listingId = request.data?.listingId;

        if (!listingId) {
            throw new HttpsError("invalid-argument", "listingId is required");
        }

        const listing = await CatalogController.approveListing(ctx, listingId);
        return { success: true, data: listing };
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
 * Reject a listing (admin only)
 */
export const rejectListing = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const listingId = request.data?.listingId;

        if (!listingId) {
            throw new HttpsError("invalid-argument", "listingId is required");
        }

        const listing = await CatalogController.rejectListing(ctx, listingId);
        return { success: true, data: listing };
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
 * Archive a listing (soft delete)
 */
export const archiveListing = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const listingId = request.data?.listingId;

        if (!listingId) {
            throw new HttpsError("invalid-argument", "listingId is required");
        }

        const success = await CatalogController.archiveListing(ctx, listingId);
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
});

/**
 * Get provider's own listings
 */
export const getMyListings = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const query = request.data?.query || {};

        const listings = await CatalogController.getMyListings(ctx, query);
        return { success: true, data: listings };
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
