/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUESTS MODULE — CLOUD FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cloud Function exports only.
 * NO business logic.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { RequestsController } from "./requests.controller";
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
 * Create a new request
 */
export const createRequest = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const input = request.data?.input;

        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const requestId = await RequestsController.createRequest(ctx, input);
        return { success: true, data: { requestId } };
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
 * Get a request by ID
 */
export const getRequest = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const requestId = request.data?.requestId;

        if (!requestId) {
            throw new HttpsError("invalid-argument", "requestId is required");
        }

        const result = await RequestsController.getRequest(ctx, requestId);
        return { success: true, data: result };
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
 * Get user's own requests
 */
export const getMyRequests = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const limit = request.data?.limit;

        const requests = await RequestsController.getMyRequests(ctx, limit);
        return { success: true, data: requests };
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
 * Update request status
 */
export const updateRequestStatus = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const requestId = request.data?.requestId;
        const input = request.data?.input;

        if (!requestId) {
            throw new HttpsError("invalid-argument", "requestId is required");
        }
        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const result = await RequestsController.updateRequestStatus(ctx, requestId, input);
        return { success: true, data: result };
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
 * Assign a request to a provider (admin only)
 */
export const assignRequest = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const requestId = request.data?.requestId;
        const input = request.data?.input;

        if (!requestId) {
            throw new HttpsError("invalid-argument", "requestId is required");
        }
        if (!input) {
            throw new HttpsError("invalid-argument", "input is required");
        }

        const result = await RequestsController.assignRequest(ctx, requestId, input);
        return { success: true, data: result };
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
 * Cancel a request
 */
export const cancelRequest = onCall({ region: "europe-west1" }, async (request) => {
    try {
        const ctx = extractAuthContext(request.auth);
        const requestId = request.data?.requestId;
        const input = request.data?.input || {};

        if (!requestId) {
            throw new HttpsError("invalid-argument", "requestId is required");
        }

        const result = await RequestsController.cancelRequest(ctx, requestId, input);
        return { success: true, data: result };
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
