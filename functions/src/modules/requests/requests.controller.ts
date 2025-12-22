/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUESTS MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + Permission checks.
 * NO direct Firestore access.
 *
 * BORING CODE ONLY:
 * - Explicit permission checks
 * - No clever shortcuts
 * - Readable in one pass
 */

import { RequestsService } from "./requests.service";
import type {
    Request,
    CreateRequestInput,
    UpdateRequestStatusInput,
    AssignRequestInput,
    CancelRequestInput,
} from "./requests.schema";
import {
    CreateRequestInputSchema,
    UpdateRequestStatusInputSchema,
    AssignRequestInputSchema,
    CancelRequestInputSchema,
    isValidStatusTransition,
} from "./requests.schema";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../identity/identity.schema";

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION HELPERS (explicit, boring)
// ─────────────────────────────────────────────────────────────────────────────

function isAdmin(ctx: AuthContext): boolean {
    if (ctx.isAdmin === true) {
        return true;
    }
    if (ctx.role === "admin") {
        return true;
    }
    if (ctx.role === "superadmin") {
        return true;
    }
    return false;
}

function isProvider(ctx: AuthContext): boolean {
    if (ctx.role === "provider") {
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const RequestsController = {
    /**
     * Get a request by ID
     * - Users can only view their own requests
     * - Providers can view requests assigned to them
     * - Admins can view any request
     */
    async getRequest(ctx: AuthContext, requestId: string): Promise<Request | null> {
        const request = await RequestsService.getRequest(requestId);

        if (request === null) {
            return null;
        }

        // Admins can view any request
        if (isAdmin(ctx)) {
            return request;
        }

        // Users can view their own requests
        if (request.userId === ctx.uid) {
            return request;
        }

        // Providers can view requests assigned to them
        if (isProvider(ctx) && request.assignedTo === ctx.uid) {
            return request;
        }

        throw new AppError("PERMISSION_DENIED", "You cannot view this request");
    },

    /**
     * Create a new request
     * - Any authenticated user can create a request
     */
    async createRequest(ctx: AuthContext, input: CreateRequestInput): Promise<string> {
        // Validate input
        const validationResult = CreateRequestInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        // Create the request
        const requestId = await RequestsService.createRequest(
            ctx.uid,
            undefined, // userName - could be fetched from Identity if needed
            undefined, // userPhone
            ctx.email, // userEmail
            validationResult.data
        );

        return requestId;
    },

    /**
     * Get user's own requests
     */
    async getMyRequests(ctx: AuthContext, limit?: number): Promise<Request[]> {
        return RequestsService.getRequestsByUser(ctx.uid, limit);
    },

    /**
     * Update request status
     * - Providers can update status of requests assigned to them
     * - Admins can update any request status
     * - Status transitions must be valid
     */
    async updateRequestStatus(
        ctx: AuthContext,
        requestId: string,
        input: UpdateRequestStatusInput
    ): Promise<Request | null> {
        // Validate input
        const validationResult = UpdateRequestStatusInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { status: newStatus, notes } = validationResult.data;

        // Get current request
        const request = await RequestsService.getRequest(requestId);
        if (request === null) {
            throw new AppError("NOT_FOUND", "Request not found");
        }

        // Permission check
        const canUpdate = await this.canUpdateRequestStatus(ctx, request);
        if (!canUpdate) {
            throw new AppError("PERMISSION_DENIED", "You cannot update this request status");
        }

        // Validate status transition
        const isValid = isValidStatusTransition(request.status, newStatus);
        if (!isValid) {
            throw new AppError(
                "INVALID_INPUT",
                `Cannot transition from ${request.status} to ${newStatus}`
            );
        }

        return RequestsService.updateRequestStatus(requestId, newStatus, notes);
    },

    /**
     * Assign a request to a provider
     * - Only admins can assign requests
     */
    async assignRequest(
        ctx: AuthContext,
        requestId: string,
        input: AssignRequestInput
    ): Promise<Request | null> {
        // Permission check
        if (!isAdmin(ctx)) {
            throw new AppError("PERMISSION_DENIED", "Only admins can assign requests");
        }

        // Validate input
        const validationResult = AssignRequestInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { assignedTo, assignedToName } = validationResult.data;

        // Get current request
        const request = await RequestsService.getRequest(requestId);
        if (request === null) {
            throw new AppError("NOT_FOUND", "Request not found");
        }

        // Can only assign pending requests
        if (request.status !== "pending") {
            throw new AppError("INVALID_INPUT", "Can only assign pending requests");
        }

        return RequestsService.assignRequest(requestId, assignedTo, assignedToName);
    },

    /**
     * Cancel a request
     * - Users can cancel their own pending or assigned requests
     * - Admins can cancel any pending or assigned request
     */
    async cancelRequest(
        ctx: AuthContext,
        requestId: string,
        input: CancelRequestInput
    ): Promise<Request | null> {
        // Validate input
        const validationResult = CancelRequestInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { reason } = validationResult.data;

        // Get current request
        const request = await RequestsService.getRequest(requestId);
        if (request === null) {
            throw new AppError("NOT_FOUND", "Request not found");
        }

        // Permission check
        const canCancel = this.canCancelRequest(ctx, request);
        if (!canCancel) {
            throw new AppError("PERMISSION_DENIED", "You cannot cancel this request");
        }

        // Validate status transition
        const isValid = isValidStatusTransition(request.status, "cancelled");
        if (!isValid) {
            throw new AppError("INVALID_INPUT", `Cannot cancel a ${request.status} request`);
        }

        return RequestsService.cancelRequest(requestId, ctx.uid, reason);
    },

    /**
     * Check if user can update request status
     */
    async canUpdateRequestStatus(ctx: AuthContext, request: Request): Promise<boolean> {
        // Admins can update any request
        if (isAdmin(ctx)) {
            return true;
        }

        // Providers can update requests assigned to them
        if (isProvider(ctx) && request.assignedTo === ctx.uid) {
            return true;
        }

        return false;
    },

    /**
     * Check if user can cancel request
     */
    canCancelRequest(ctx: AuthContext, request: Request): boolean {
        // Admins can cancel any request
        if (isAdmin(ctx)) {
            return true;
        }

        // Users can cancel their own requests
        if (request.userId === ctx.uid) {
            return true;
        }

        return false;
    },
};
